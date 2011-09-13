
// Copyright (c) 2011 Moxie Marlinspike <moxie@thoughtcrime.org>
// This program is free software; you can redistribute it and/or
// modify it under the terms of the GNU General Public License as
// published by the Free Software Foundation; either version 3 of the
// License, or (at your option) any later version.

// This program is distributed in the hope that it will be useful, but
// WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the GNU
// General Public License for more details.

// You should have received a copy of the GNU General Public License
// along with this program; if not, write to the Free Software
// Foundation, Inc., 59 Temple Place, Suite 330, Boston, MA 02111-1307
// USA


/**
 * This class is responsible for taking the actively configured notaries,
 * talking to all of them about a certificate, and then returning aggregated
 * results.
 *
 **/


function ActiveNotaries(settings, serializedNotaries) {
  this.settings = settings;
  this.notaries = this.deserializeNotaries(serializedNotaries);
}

ActiveNotaries.prototype.isConnectivityErrorFailure = function() {
  return this.settings['connectivityIsFailureEnabled'];
};

ActiveNotaries.prototype.isThresholdConsensus = function() {
  return this.settings['verificationThreshold'] == 'consensus';
};

ActiveNotaries.prototype.isThresholdMinority = function() {
  return this.settings['verificationThreshold'] == 'minority';
};

ActiveNotaries.prototype.isNotaryBounceEnabled = function() {
  return this.settings['notaryBounceEnabled'];
};

ActiveNotaries.prototype.deserializeNotaries = function(serializedNotaries) {
  var notaries = new Array();

  for (var i in serializedNotaries) {
    notaries.push(new Notary(serializedNotaries[i]));
  }

  return notaries;
};

ActiveNotaries.prototype.checkNotaryValidity = function(host, port, certificate) {
  var notary            = this.getNotary(host, port); 
  var notaryFingerprint = notary.getSha1Fingerprint();

  return certificate.sha1 == notaryFingerprint;
};

ActiveNotaries.prototype.buildCheckNotaries = function() {
  if (this.notaries.length > 1 && this.isNotaryBounceEnabled()) {
    dump("Setting bounce notary: " + this.notaries + "\n");
    var bounceNotaryIndex = Math.floor(Math.random()* this.notaries.length);
    var checkNotaries     = this.notaries.slice(0);
    var bounceNotary      = this.notaries[bounceNotaryIndex];
    checkNotaries.splice(bounceNotaryIndex, 1);    

    return [bounceNotary, checkNotaries];
  } else {
    dump("Not setting bounce notary...\n");
    return [null, this.notaries];
  }
};

// XXX This function disgusts me, and I wrote it.

ActiveNotaries.prototype.checkHostValidity = function(host, port, certificate) {
  dump("Checking host validity...\n");
  var results             = this.buildCheckNotaries();
  var bounceNotary        = results[0];
  var checkNotaries       = results[1];
  var verdictDetail       = new Array();

  var status              = false;
  var successCount        = 0;
  var checkedNotaryCount  = 0;

  if (bounceNotary != null)
    verdictDetail.push({'notary' : bounceNotary.host, 
	                'status' : 2});

  for (var i in checkNotaries) {
    dump("Checking checknotary: " + i + "\n");
    var status         = null;
    var notaryResponse = checkNotaries[i].checkValidity(host, port, certificate, bounceNotary, 
							this.isConnectivityErrorFailure());

    if (notaryResponse == 0) {
      successCount++;
    } else if (notaryResponse > 0) {
      checkedNotaryCount--;
    }

    checkedNotaryCount++;
    verdictDetail.push({'notary' : checkNotaries[i].host, 'status' : notaryResponse});
  }

  if (this.isThresholdMinority() && (successCount > 0)) {
    status = true;
  } else if (successCount <= 0 || 
	     (this.isThresholdConsensus() && 
	      (successCount < checkedNotaryCount))) 
  {
    status = false;
  } else {
    var majority = Math.floor(checkedNotaryCount / 2);

    if ((checkedNotaryCount % 2) != 0)
      majority++;

    status = (successCount >= majority);
  }

  return {'status' : status, 'details' : verdictDetail};
};

ActiveNotaries.prototype.getNotary = function(host, port) {
  for (var i in this.notaries) {
    if (host == this.notaries[i].getHost()     &&
	(port == this.notaries[i].getSSLPort() ||
	 port == this.notaries[i].getHTTPPort()))
      {
	return this.notaries[i];
      }
  }

  return null;
};

ActiveNotaries.prototype.isNotary = function(host, port) {
  return this.getNotary(host, port) != null;
};

ActiveNotaries.prototype.checkValidity = function(host, port, certificate) {
  if (this.isNotary(host, port)) {
    return this.checkNotaryValidity(host, port, certificate);
  } else {
    return this.checkHostValidity(host, port, certificate);
  }
};


