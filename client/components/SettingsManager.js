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
 * This class manages the current Convergence settings, including the
 * information about configured notaries.  It serializes settings 
 * to and from disk, and hands out configuration information to the
 * running process.
 *
 **/


function SettingsManager() {
  this.enabled                      = true;
  this.cacheCertificatesEnabled     = true;
  this.notaryBounceEnabled          = true;
  this.connectivityIsFailureEnabled = true;
  this.privateIpExempt              = true;
  this.privatePkiExempt             = true;
  this.maxNotaryQuorum              = 3;
  this.verificationThreshold        = "majority";
  this.notaries                     = new Array();

  this.loadPreferences();
  this.upgradeIfNecessary();
}

SettingsManager.prototype.isEnabled = function() {
  return this.enabled;
};

SettingsManager.prototype.setEnabled = function(val) {
  this.enabled = val;
};

SettingsManager.prototype.setNotaryBounce = function(val) {
  this.notaryBounceEnabled = val;
};

SettingsManager.prototype.getNotaryBounce = function() {
  return this.notaryBounceEnabled;
};

SettingsManager.prototype.setConnectivityErrorIsFailure = function(val) {
  this.connectivityIsFailureEnabled = val;
};

SettingsManager.prototype.getConnectivityErrorIsFailure = function() {
  return this.connectivityIsFailureEnabled;
};

SettingsManager.prototype.setPrivateIpExempt = function(val) {
  this.privateIpExempt = val;
};

SettingsManager.prototype.getPrivateIpExempt = function() {
  return this.privateIpExempt;
};

SettingsManager.prototype.setPrivatePkiExempt = function(val) {
  this.privatePkiExempt = val;
};

SettingsManager.prototype.getPrivatePkiExempt = function() {
  return this.privatePkiExempt;
};

SettingsManager.prototype.setVerificationThreshold = function(val) {
  this.verificationThreshold = val;
};

SettingsManager.prototype.getVerificationThreshold = function() {
  return this.verificationThreshold;
};

SettingsManager.prototype.getMaxNotaryQuorum = function() {
  return this.maxNotaryQuorum;
};

SettingsManager.prototype.setMaxNotaryQuorum = function(val) {
  this.maxNotaryQuorum = val;
}

SettingsManager.prototype.setCacheCertificates = function(val) {
  this.cacheCertificatesEnabled = val;
};

SettingsManager.prototype.getCacheCertificates = function() {
  return this.cacheCertificatesEnabled;
};

SettingsManager.prototype.getNotaryList = function() {
  return this.notaries.slice(0);
};

SettingsManager.prototype.setNotaryList = function(notaries) {
  this.notaries = notaries.slice(0);
};

SettingsManager.prototype.addNotary = function(notary) {
  for (var i=0;i<this.notaries.length;i++) {
    if (this.notaries[i].getName() == notary.getName()) {
      dump("Duplicate notary!\n");
      return;
    }
  }

  this.notaries.push(notary);
};

SettingsManager.prototype.hasEnabledNotary = function() {
  for (var i=0;i<this.notaries.length;i++) {
    if (this.notaries[i].getEnabled()) {
      return true;
    }
  }

  return false;
};

SettingsManager.prototype.getSerializedNotaryList = function(callback) {
  var serialized = new Array();
  var count = 0;
  
  for (var i in this.notaries) {
    if (this.notaries[i].enabled) {
      count++;
      this.notaries[i].serializeForTransport(function(sn) {
        serialized.push(sn);
        count--;
        if(count === 0) callback(serialized);
      });
    }
  }
};

SettingsManager.prototype.getSerializedSettings = function() {
  return {
    'cacheCertificatesEnabled'     : this.cacheCertificatesEnabled,
    'notaryBounceEnabled'          : this.notaryBounceEnabled,
    'connectivityIsFailureEnabled' : this.connectivityIsFailureEnabled,
    'verificationThreshold'        : this.verificationThreshold,
    'maxNotaryQuorum'              : this.maxNotaryQuorum,
    'privatePkiExempt'             : this.privatePkiExempt
  };
};

SettingsManager.prototype.getSettingsFile = function() {
  var directoryService = Components.classes["@mozilla.org/file/directory_service;1"].
  getService(Components.interfaces.nsIProperties);

  var file = directoryService.get("ProfD", Components.interfaces.nsIFile);
  file.append("convergence.xml");
  
  return file;
};

SettingsManager.prototype.getSettingsInputStream = function(file) {
  var inputStream = Components.classes["@mozilla.org/network/file-input-stream;1"]
  .createInstance(Components.interfaces.nsIFileInputStream);
  inputStream.init(file, -1, -1, Components.interfaces.nsIFileInputStream.CLOSE_ON_EOF);

  return inputStream;
};

SettingsManager.prototype.getSettingsOutputStream = function() {
  var file         = this.getSettingsFile();
  var outputStream = Components.classes["@mozilla.org/network/file-output-stream;1"].
  createInstance(Components.interfaces.nsIFileOutputStream);
  outputStream.init(file, 0x02 | 0x08 | 0x20, 0664, 0);
  return outputStream;
};

SettingsManager.prototype.getInputSettingsObject = function() {
  var file        = this.getSettingsFile();
  if (!file.exists()) return null;
    
  var inputStream = this.getSettingsInputStream(file);
  var parser      = Components.classes["@mozilla.org/xmlextras/domparser;1"]
  .createInstance(Components.interfaces.nsIDOMParser);
  var object      = parser.parseFromStream(inputStream, null, file.fileSize, "text/xml");  
  if (!object || object.documentElement.nodeName == "parsererror") return null;

  return object;
};

SettingsManager.prototype.removeNotaries = function(notaryNames) {
  var removed = false;

  for (var i=this.notaries.length-1;i>=0;i--) {
    for (var j in notaryNames) {
      if (this.notaries[i].name == notaryNames[j]) {
	this.notaries.splice(i, 1);
	removed = true;
	break;
      }
    }
  }

  return removed;
};

SettingsManager.prototype.upgradeIfNecessary = function() {
  if (this.version < 1) {
    if (this.removeNotaries(["notary.thoughtcrime.org", "notary2.thoughtcrime.org"])) {
      dump("Upgrading notaries\n");

      this.removeNotaries(["notary-us.convergence.qualys.com",
			   "notary-eu.convergence.qualys.com"]);

      // this.removeNotaries(["convergence.crypto.is",
      // 	                   "convergence2.crypto.is"]);      

      this.notaries = this.getDefaultNotaryList().concat(this.notaries);
    } else {
      if (this.removeNotaries(["notary-us.convergence.qualys.com", 
    			       "notary-eu.convergence.qualys.com"])) {
    	this.notaries = this.getDefaultQualysInc().concat(this.notaries);
      }

      // if (this.removeNotaries(["convergence.crypto.is",
      // 			       "convergence2.crypto.is"])) {
      // 	this.notaries = this.getDefaultCryptoProject().concat(this.notaries);
      // }
    }
  }
};

SettingsManager.prototype.savePreferences = function() {
  var outputStream = this.getSettingsOutputStream();
  var serializer   = Components.classes["@mozilla.org/xmlextras/xmlserializer;1"]
  .createInstance(Components.interfaces.nsIDOMSerializer);
  var xmlDocument  = Components.classes["@mozilla.org/xml/xml-document;1"]
  .createInstance(Components.interfaces.nsIDOMDocument);

  var rootElement    = xmlDocument.createElement("convergence");
  rootElement.setAttribute("enabled", this.enabled);
  rootElement.setAttribute("cache_certificates", this.cacheCertificatesEnabled);
  rootElement.setAttribute("notary_bounce", this.notaryBounceEnabled);
  rootElement.setAttribute("connectivity_failure", this.connectivityIsFailureEnabled);
  rootElement.setAttribute("private_pki_exempt", this.privatePkiExempt);
  rootElement.setAttribute("private_ip_exempt", this.privateIpExempt);
  rootElement.setAttribute("threshold", this.verificationThreshold);
  rootElement.setAttribute("max_notary_quorum", this.maxNotaryQuorum);
  rootElement.setAttribute("version", 1);
  
  var notariesElement = xmlDocument.createElement("notaries");
  rootElement.appendChild(notariesElement);

  for (key in this.notaries) {
    var notaryElement = this.notaries[key].serialize(xmlDocument);
    notariesElement.appendChild(notaryElement);
  }

  outputStream.write("<?xml version=\"1.0\" encoding=\"UTF-8\"?>\n", 39);
  serializer.serializeToStream(rootElement, outputStream, "UTF-8");
};

SettingsManager.prototype.getDefaultThoughtcrimeLabs = function() {
  var thoughtcrime      = new Notary();
  var thoughtcrimeNodes = new Array();
  
  var notaryOne = new PhysicalNotary();
  notaryOne.setHost("notary.thoughtcrime.org");
  notaryOne.setSSLPort(443);
  notaryOne.setHTTPPort(80);
  notaryOne.setCertificate("-----BEGIN CERTIFICATE-----\nMIIDkjCCAnoCCQCiafEhF0D5qzANBgkqhkiG9w0BAQUFADCBiTELMAkGA1UEBhMC\nVVMxEzARBgNVBAgTCkNhbGlmb3JuaWExFjAUBgNVBAcTDVNhbiBGcmFuY2lzY28x\nGjAYBgNVBAoTEVRob3VnaHRjcmltZSBMYWJzMQ8wDQYDVQQLEwZOb3RhcnkxIDAe\nBgNVBAMTF25vdGFyeS50aG91Z2h0Y3JpbWUub3JnMCAXDTExMDYyOTIwNTc0OVoY\nDzE5MTUwNTE0MTQyOTMzWjCBiTELMAkGA1UEBhMCVVMxEzARBgNVBAgTCkNhbGlm\nb3JuaWExFjAUBgNVBAcTDVNhbiBGcmFuY2lzY28xGjAYBgNVBAoTEVRob3VnaHRj\ncmltZSBMYWJzMQ8wDQYDVQQLEwZOb3RhcnkxIDAeBgNVBAMTF25vdGFyeS50aG91\nZ2h0Y3JpbWUub3JnMIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAt02q\nTwZFohBLbOPzo+DN+EMTYpF9l23lmGlKzoM3W2c7CCosZhg8bRscmzl0SOAALbVK\nRrogrqhghnv03psqb2oznyD16rrF6R2rhYOT/u9XPkuw+l5o11JFt5YSthLobTtt\n7BHGXcpHCtsd6rvZn/bWVg9s1cV+5Q+wZ8saDEJbKkt2MoswnzueP/cslAYOIeDs\nxXQHOiGMlNYG/RLHUw1ISFXmVGE2qq+riwTcneglngqjfi7AEnXjPsc++bnZ5aCe\nT168ViLrhyj2UYep+U30vuKyO26Nv/SJWSY2Ax/nGbr2COOCiFTAdkGJSsM+bmd9\n02BarFZqIbl+y/Iy+wIDAQABMA0GCSqGSIb3DQEBBQUAA4IBAQASDKkpnPMSfhAA\nnjvkNJFlFjYHGGZ1ZCFPEbyD7ABhSebT/yv33cw3bmO+1X0ZSQ11yAXBS7vIv8OR\nE8hOtvS6GHtwP3OYblYOW+aRNjPNqQ1xzuPvKo8MHZfSu8dBgCVUMzjYxg0vVNAl\nVh6pqDaLecNDjHdCTLOESycKuy9sd5nnI96zfy9PWk+4pesuUOqNPend17DyXB4J\nkETvCnMQfxH9LDg6dm+AtFCAfcdoQGzalwvKG8YIZbAYVS3/rZGa4oYbYcr15ae5\nRia17mALrWOZTMpXys2x+OfIc2lB/B56Wm9fLhQYfznCKXpHtrIhSE0N4tuTgu0s\nIY42yv8q\n-----END CERTIFICATE-----\n");

  var notaryTwo = new PhysicalNotary();
  notaryTwo.setHost("notary2.thoughtcrime.org");
  notaryTwo.setSSLPort(443);
  notaryTwo.setHTTPPort(80);
  notaryTwo.setCertificate("-----BEGIN CERTIFICATE-----\nMIIDlDCCAnwCCQDVML1LmT7cuTANBgkqhkiG9w0BAQUFADCBijELMAkGA1UEBhMC\nVVMxEzARBgNVBAgTCkNhbGlmb3JuaWExFjAUBgNVBAcTDVNhbiBGcmFuY2lzY28x\nGjAYBgNVBAoTEVRob3VnaHRjcmltZSBMYWJzMQ8wDQYDVQQLEwZOb3RhcnkxITAf\nBgNVBAMTGG5vdGFyeTIudGhvdWdodGNyaW1lLm9yZzAgFw0xMTA2MjkyMDUyMjda\nGA8xOTE1MDUxNDE0MjQxMVowgYoxCzAJBgNVBAYTAlVTMRMwEQYDVQQIEwpDYWxp\nZm9ybmlhMRYwFAYDVQQHEw1TYW4gRnJhbmNpc2NvMRowGAYDVQQKExFUaG91Z2h0\nY3JpbWUgTGFiczEPMA0GA1UECxMGTm90YXJ5MSEwHwYDVQQDExhub3RhcnkyLnRo\nb3VnaHRjcmltZS5vcmcwggEiMA0GCSqGSIb3DQEBAQUAA4IBDwAwggEKAoIBAQCx\nEMacdrL4/CM6BAekH0TA0ca4A694svZwdz8igwSuqlBpFTgkJ4iLgL0gizuQy1Iz\nhz5Xpp7Ucu83OeSxEc+RudcSJWi+3rV2RwdX9oDOlhy2XTFqxITWNM9PATBupSVo\n1pQfEh6mjB5BJmu5ISk6YB/wqGP7Tqkdh2OoimgUwfNaK/jon5GI7G3OWPivdFKT\nCUiQBm798NlChdlUu6+VSbFDX/2Nsu6dk2RP3oR4zYKFIOQ701gxfh4CugS+C/hx\n50D9BkSvUax7glq3aB3W3qwLMBiqY4xFoF+vybrU05ZLmYsBOl7hAnfHG/ArP75t\nkvyJE88GXqg4lJSP3/d5AgMBAAEwDQYJKoZIhvcNAQEFBQADggEBAEGsjvWJLMgI\nKqybiE+yGB6qBjGMnMDTdznLy0dNBGjBv122MgSSK9GWbrKK/5JIia66qMZ9qEVL\n1aV4E/cr0EQfBh5vJe+9K43WVpQ/fqZ/e+s7AfGCQE900svWRaLc9ZBCGxQ/R6+B\nDnPS3foxaS3kp8i+Jc0DA51/S/ErohR2J8iXMZrRJsGkyBe62CwQ5i4Ik9Z6WL3e\nfKZMCOvpl6u1V4ZumT6Em6KGR9USeeKfh0iKZf61/SJVxj07D7gxUqEBPIkI1BEL\nbOEOvOATvHEM4WqMi9eki5wsjyK7a5xJBwcnJoSzDdTHiXqiKD7NjVRKD1tId0Cp\nRhWdypCXL8c=\n-----END CERTIFICATE-----\n");

  thoughtcrimeNodes.push(notaryOne);
  thoughtcrimeNodes.push(notaryTwo);

  thoughtcrime.setName("Thoughtcrime Labs");
  thoughtcrime.setBundleLocation("https://ssl.thoughtcrime.org/convergence/thoughtcrime.notary");
  thoughtcrime.setEnabled(true);
  thoughtcrime.setPhysicalNotaries(thoughtcrimeNodes);

  return thoughtcrime;
};

SettingsManager.prototype.getDefaultQualysInc = function() {
  var qualys      = new Notary();
  var qualysNodes = new Array();
  
  var notaryOne = new PhysicalNotary();
  notaryOne.setHost("notary-us.convergence.qualys.com");
  notaryOne.setSSLPort(443);
  notaryOne.setHTTPPort(80);
  notaryOne.setCertificate("-----BEGIN CERTIFICATE-----\nMIID5DCCAswCCQDk5GX3iSXEeTANBgkqhkiG9w0BAQUFADCBsjELMAkGA1UEBhMC\nVVMxEzARBgNVBAgTCkNhbGlmb3JuaWExFzAVBgNVBAcTDlJlZHdvb2QgU2hvcmVz\nMQ8wDQYDVQQKEwZRdWFseXMxCzAJBgNVBAsTAklUMSkwJwYDVQQDEyBub3Rhcnkt\ndXMuY29udmVyZ2VuY2UucXVhbHlzLmNvbTEsMCoGCSqGSIb3DQEJARYdY29udmVy\nZ2VuY2Utbm90YXJ5QHF1YWx5cy5jb20wIBcNMTEwOTI0MDQyNTAzWhgPMTkxNTA4\nMDgyMTU2NDdaMIGyMQswCQYDVQQGEwJVUzETMBEGA1UECBMKQ2FsaWZvcm5pYTEX\nMBUGA1UEBxMOUmVkd29vZCBTaG9yZXMxDzANBgNVBAoTBlF1YWx5czELMAkGA1UE\nCxMCSVQxKTAnBgNVBAMTIG5vdGFyeS11cy5jb252ZXJnZW5jZS5xdWFseXMuY29t\nMSwwKgYJKoZIhvcNAQkBFh1jb252ZXJnZW5jZS1ub3RhcnlAcXVhbHlzLmNvbTCC\nASIwDQYJKoZIhvcNAQEBBQADggEPADCCAQoCggEBAMsiuEKxT/sgYgI0beDXK4hV\nllooTQGvWGjKyEO/oJQs/ir2Ew/Ke8W4ymObPSNp1kGcTMQhcQRACyiQn2KWWsTy\nhfkpV05IczsK7QwuhCunnWeSNMpWgb4on0G+QfDdHm5guZ15cU8KXh5FiU4kGiMo\nLjPBeRPtWhfQqmlqqjo6DnXHrZOlWu1tygocW82AfHCxwZjdG7wFAqInLsTdK9g7\nrRf5no0282mLsUziNg6GkBbwR0O+Vt8UL2hpc/fSbRaJpUQMzY6YfB7nbN5cyxJI\nf+k/Mjsf87cKSHXdnDbtDCWflrWDAPvgLYwzx84G0bCNEMmzndpVS5GaWJCQ8TcC\nAwEAATANBgkqhkiG9w0BAQUFAAOCAQEAsTAQEjVbvOXf1cvOB/uqFMvWB8Kx/Lmr\nXtoYw8wYOggVvCPTeTyO5cgs6qjMjn2FiGEYlKanwQsQrlqyfPA7kJox08Pang8G\nX1VdZbnkSjKCbDvqxg+p2qs8KCRQTJLewRLZ7I6JUGbzgZTjwhG90IJCCI86u2Yv\nNvzVbZVNTywpHwHi9TfFQKocbsOfr8XTpDMhNq239qh2qbH/VpiobXAUVAWj21ST\npM0mVQaml29cq8hv1uKul09HdbEpSAt6GdIaQ/xdPiuIhBKqPp6AMOIuDyIuAr4Q\nVbXqPUxKaPZhadsRBUkmE0S3CB46nOi8i5DJqVi0ueWGvGpS57a1Og==\n-----END CERTIFICATE-----\n");

  var notaryTwo = new PhysicalNotary();
  notaryTwo.setHost("notary-eu.convergence.qualys.com");
  notaryTwo.setSSLPort(443);
  notaryTwo.setHTTPPort(80);
  notaryTwo.setCertificate("-----BEGIN CERTIFICATE-----\nMIID5DCCAswCCQCGY/88ipJh3jANBgkqhkiG9w0BAQUFADCBsjELMAkGA1UEBhMC\nVVMxEzARBgNVBAgTCkNhbGlmb3JuaWExFzAVBgNVBAcTDlJlZHdvb2QgU2hvcmVz\nMQ8wDQYDVQQKEwZRdWFseXMxCzAJBgNVBAsTAklUMSkwJwYDVQQDEyBub3Rhcnkt\nZXUuY29udmVyZ2VuY2UucXVhbHlzLmNvbTEsMCoGCSqGSIb3DQEJARYdY29udmVy\nZ2VuY2Utbm90YXJ5QHF1YWx5cy5jb20wIBcNMTEwOTI0MDUzMDA5WhgPMTkxNTA4\nMDgyMzAxNTNaMIGyMQswCQYDVQQGEwJVUzETMBEGA1UECBMKQ2FsaWZvcm5pYTEX\nMBUGA1UEBxMOUmVkd29vZCBTaG9yZXMxDzANBgNVBAoTBlF1YWx5czELMAkGA1UE\nCxMCSVQxKTAnBgNVBAMTIG5vdGFyeS1ldS5jb252ZXJnZW5jZS5xdWFseXMuY29t\nMSwwKgYJKoZIhvcNAQkBFh1jb252ZXJnZW5jZS1ub3RhcnlAcXVhbHlzLmNvbTCC\nASIwDQYJKoZIhvcNAQEBBQADggEPADCCAQoCggEBALakouPXkNYssEYPfH0aQUHW\n/SnIK0s4xqxqdAqpCT3PZmm1mPnCHzgSA/MXh1C/fR31CStiZaOQgNe6H/6k+yWf\nOF4JECe+lHl7Xzr7YiSDDREyO5T727KAz/eC8Kr8h0VnqVOXdFvao5DtTBCJcVMr\nTEDaOJr3JZzRR61ayby0OuIuc76WmmowBZQi8k8xdU6oKEBCWwIQFYt8pezgsnTd\nRiP91Psdol6m9uh2gtkos2l5qLE8dU/touH0RWRC2eqF0IcNjMvLMOFxm86bQytI\n0h1WCG6mC+lGk81hGlMggU4EpqJf+1jsTomSyCwgBnbtyt9UVzoKHBcbiCJblWEC\nAwEAATANBgkqhkiG9w0BAQUFAAOCAQEABJzLjzpRy8rRhtfZ1WcFHsrqDiMAGc2k\nCaK92IcawCM0PAVoRbcU9q3hLxXyrORY86nWUZ4+E2jBRpHhW3eJ4RkNJa+ZacJi\nv6fnLmzPsMe7IRpwLa5nZj4TuJl47RoxZf/tIvpKciBKQdenXPaqRxSqJd2oDb5s\nDxYOUihUqsFi5jZc3gBAMs0MavSPsy86bJLqYyx5J5cYv1aLMElb7w7AcE+buA5f\nA5bSKPOTKi66+jojWk16cMxm/NPr6Be95npsJGi+3wlJWR7sVYL1J51VEfpUpf+J\nL5YZ/g8xufype+syY1wtJnJ8PZ1EG+ZzXFrM7hlqLtp4ElNFf1JIfg==\n-----END CERTIFICATE-----\n");

  qualysNodes.push(notaryOne);
  qualysNodes.push(notaryTwo);

  qualys.setName("Qualys, Inc.");
  qualys.setBundleLocation("https://www.ssllabs.com/convergence/qualys-ha-convergence-bundle.notary");
  qualys.setEnabled(true);
  qualys.setPhysicalNotaries(qualysNodes);

  return qualys;
};

// SettingsManager.prototype.getDefaultCryptoProject = function() {
//   var crypto      = new Notary();
//   var cryptoNodes = new Array();
  
//   var notaryOne = new PhysicalNotary();
//   notaryOne.setHost("convergence.crypto.is");
//   notaryOne.setSSLPort(8843);
//   notaryOne.setHTTPPort(8080);
//   notaryOne.setCertificate("-----BEGIN CERTIFICATE-----\nMIIDcjCCAloCCQCCUQAv7kG09zANBgkqhkiG9w0BAQUFADB6MQswCQYDVQQGEwJV\nUzETMBEGA1UECBMKU29tZS1TdGF0ZTEbMBkGA1UEChMSVGhlIENyeXB0byBQcm9q\nZWN0MRUwEwYDVQQDEwxTaXIgVmFsaWFuY2UxIjAgBgkqhkiG9w0BCQEWE3NpckBz\naXJ2YWxpYW5jZS5jb20wIBcNMTEwODI0MDQxMTUyWhgPMjA1MTA4MTQwNDExNTJa\nMHoxCzAJBgNVBAYTAlVTMRMwEQYDVQQIEwpTb21lLVN0YXRlMRswGQYDVQQKExJU\naGUgQ3J5cHRvIFByb2plY3QxFTATBgNVBAMTDFNpciBWYWxpYW5jZTEiMCAGCSqG\nSIb3DQEJARYTc2lyQHNpcnZhbGlhbmNlLmNvbTCCASIwDQYJKoZIhvcNAQEBBQAD\nggEPADCCAQoCggEBANZfJ7HP+4nHifL6PD4JQK8+Ez9SlQ3k9WTGg6Nz0mTsEpIo\nXi6p5z+A63wiZop/bs1arw1tH9l84If0d6/lFYhybP4Db5b2nzekcFu9P90y7FRQ\nOyF+AbZuZ9dL5D2p0BcEVeKBkAGNSl4HiT5f0dMKwKPeFbIFwm16XvgXyWa3TKZq\nCZeQQrCj5zWxDnHYAw19/lf0nnqbgX1+nXfXS+bz91eksMeSDWM55s1ZzWATTBg9\nL49v1AtEN6iUtXjwh/VTqHEtCuzggHNaOKM38lbzTG6k1GmhGyVGACQI0eWBPGUN\nrmrXvSwDCWIHK5G74meAYjS5rpyKjoceOHz9WAsCAwEAATANBgkqhkiG9w0BAQUF\nAAOCAQEAB8eMbmfzp1YzYcS9WRS4Rz+tnKxnOfFW2V+M2s93G4aJ1rf+RchYoMzV\n6EcnXRB+HD7S4cmnhFnxlDRwtqrMmQU1gtpBNc6R26fNVe4dtXnSnkCXaEpQSfvh\nZ1HXrddykcwBGq2OIUFV7GjikfNGbgxP5yuKE4Sw2HOnn2s384u4VBxvtIwVrq4x\n6kUavGQy+iTTHsR76r5SOhsST+rvWC51OuNrkVLYmTLNgV+AX8p8bljdPhlkU+nD\nZ0ciklPV/4z+RHVAacbrrIUJEjjJrJTnxLcKVL7+gIP5CW2xaUpkfuA7GjAhGe+u\nwGOoe/3KEU/yBaWXMiOyYduFoog8IQ==\n-----END CERTIFICATE-----\n");

//   var notaryTwo = new PhysicalNotary();
//   notaryTwo.setHost("convergence2.crypto.is");
//   notaryTwo.setSSLPort(8843);
//   notaryTwo.setHTTPPort(8080);
//   notaryTwo.setCertificate("-----BEGIN CERTIFICATE-----\nMIIDcjCCAloCCQDSQ8OiEi68cDANBgkqhkiG9w0BAQUFADB6MQswCQYDVQQGEwJV\nUzETMBEGA1UECBMKU29tZS1TdGF0ZTEbMBkGA1UEChMSVGhlIENyeXB0byBQcm9q\nZWN0MRUwEwYDVQQDEwxTaXIgVmFsaWFuY2UxIjAgBgkqhkiG9w0BCQEWE3NpckBz\naXJ2YWxpYW5jZS5jb20wIBcNMTExMDA3MDM0OTIzWhgPMjA1MTA5MjcwMzQ5MjNa\nMHoxCzAJBgNVBAYTAlVTMRMwEQYDVQQIEwpTb21lLVN0YXRlMRswGQYDVQQKExJU\naGUgQ3J5cHRvIFByb2plY3QxFTATBgNVBAMTDFNpciBWYWxpYW5jZTEiMCAGCSqG\nSIb3DQEJARYTc2lyQHNpcnZhbGlhbmNlLmNvbTCCASIwDQYJKoZIhvcNAQEBBQAD\nggEPADCCAQoCggEBANU7sEfoDCKlwsZI+wisdNOfVx5tfBWaGAegpMvlYif3ffPQ\n1djT5Fw+13V/q2FJ7L8Nmu04nXKfxD/E+hhPtnTf/Qlae6QC1wnb0T1Vd4uBDaXw\n5NBMRkkvtLTQf3OJn0TMklDa86r7okuqiBxq4k5GC3rQlnBZPjvMXZ1h/lC/SZrL\nRkNOcybdf+NZLTaQ/zx4evrDaiE9TWN77x2oEbadfQWU7GRy8wwHZdEWgzzIXvUU\nMJx+o3hVy9O60peruZd2lEM9VNMMXA/hU7Xe/o2Q1+hs/qQoSk7Dltl4QsBKkVMn\nv3wWZIR0onP/3rVv2VjQ+Vijm5nXWgC1TvkovFECAwEAATANBgkqhkiG9w0BAQUF\nAAOCAQEAvLisHoqZdJQwZpA33h7lC5LGRgSPliJNzAFXB0DnKMWnHyPCBQ8a+wUB\nOpYZpbgfD6XKuVVZtJ28b8j6BoE8YP8N7BZea/7HDU3iyK9c0uxsPMn2cov02e1l\nZeqXMPGT8eR43Df0K/3z1v6J5bYTxOpmz1zCJV9crH9beKUtJXDPVzUgduqY0bB6\nDiTOK0jDsfEm4YaUg7NoOVgRzsY37zDOfoLsq6bA/Goa6k4FLveFYPCa4UzdA5pz\nVFt0he9+eNGQsZJKd2kguXmxMyVTRECF95Vpmodzudr6/fuMkc2FZS3NsfFAb1bx\nHI+1To2Tg55xtUxpf+yGHodxdrgbCg==\n-----END CERTIFICATE-----\n");

//   cryptoNodes.push(notaryOne);
//   cryptoNodes.push(notaryTwo);

//   crypto.setName("The Crypto Project");
//   crypto.setBundleLocation("https://crypto.is/static/files/cryptoproject.notary");
//   crypto.setEnabled(true);
//   crypto.setPhysicalNotaries(cryptoNodes);

//   return crypto;
// };

SettingsManager.prototype.getDefaultNotaryList = function() {
  var notaryList   = new Array();
  var thoughtcrime = this.getDefaultThoughtcrimeLabs();
  var qualys       = this.getDefaultQualysInc();
  // var crypto       = this.getDefaultCryptoProject();

  notaryList.push(thoughtcrime);
  notaryList.push(qualys);
  // notaryList.push(crypto);

  return notaryList;
};

SettingsManager.prototype.loadPreferences = function() {
  var settings = this.getInputSettingsObject();

  if (!settings) {
    this.notaries = this.getDefaultNotaryList();
    return;
  }

  var rootElement                   = settings.getElementsByTagName("convergence");
  this.enabled                      = (rootElement.item(0).getAttribute("enabled") == "true");
  this.cacheCertificatesEnabled     = (rootElement.item(0).getAttribute("cache_certificates") == "true");
  this.notaryBounceEnabled          = (rootElement.item(0).getAttribute("notary_bounce") == "true");
  this.connectivityIsFailureEnabled = (rootElement.item(0).getAttribute("connectivity_failure") == "true");
  this.privateIpExempt              = (rootElement.item(0).getAttribute("private_ip_exempt") == "true");
  this.privatePkiExempt             = (rootElement.item(0).getAttribute("private_pki_exempt") == "true");
  this.verificationThreshold        = rootElement.item(0).getAttribute("threshold");
  this.maxNotaryQuorum              = rootElement.item(0).getAttribute("max_notary_quorum");
  this.version                      = rootElement.item(0).getAttribute("version");

  if (!rootElement.item(0).hasAttribute("cache_certificates")) {
    this.cacheCertificatesEnabled = true;
  }

  if (!rootElement.item(0).hasAttribute("notary_bounce")) {
    this.notaryBounceEnabled = true;
  }

  if (!rootElement.item(0).hasAttribute("connectivity_failure")) {
    this.connectivityIsFailureEnabled = true;
  }

  if (!rootElement.item(0).hasAttribute("private_pki_exempt")) {
    this.privatePkiExempt = true;
  }

  if (!rootElement.item(0).hasAttribute("private_ip_exempt")) {
    this.privateIpExempt = true;
  }

  if (!rootElement.item(0).hasAttribute("threshold")) {
    this.verificationThreshold = "majority";
  }  

  if (!rootElement.item(0).hasAttribute("max_notary_quorum")) {
    this.maxNotaryQuorum = 3;
  }

  if (!rootElement.item(0).hasAttribute("version")) {
    this.version = 0;
  }

  var notaryElements;

  if (this.version > 0) {
    notaryElements = settings.getElementsByTagName("logical-notary");
  } else {
    notaryElements = settings.getElementsByTagName("notary");    
  }

  for (var i=0;i<notaryElements.length;i++) {
    var element = notaryElements.item(i);
    element.QueryInterface(Components.interfaces.nsIDOMElement);

    var notary = new Notary();
    notary.deserialize(element, this.version);

    this.notaries.push(notary);
  }
};
