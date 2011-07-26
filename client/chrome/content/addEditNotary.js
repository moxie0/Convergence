// Copyright (c) 2010 Moxie Marlinspike <moxie@thoughtcrime.org>

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


function onDialogLoad() {
  var retVal = window.arguments[0];

  if (retVal.notary) {
    var notary = retVal.notary;
    document.getElementById("notary-host").value = notary.getHost();
    document.getElementById("ssl-port").value    = notary.getSSLPort();
    document.getElementById("http-port").value   = notary.getHTTPPort();
    document.getElementById("certificate").value = notary.getCertificate();
  }
}


function onDialogOK() {  
  var host        = document.getElementById("notary-host").value;
  var sslPort     = document.getElementById("ssl-port").value;
  var httpPort    = document.getElementById("http-port").value;
  var certificate = document.getElementById("certificate").value;

  if (!host || !sslPort || !httpPort || !certificate) {
    alert("Sorry, you  must specify a host, ports, and certificate.");
    return false;
  }

  var retVal = window.arguments[0];
  var notary;

  if (retVal.notary) {
    notary = retVal.notary;
  } else {
    var convergence = Components.classes['@thoughtcrime.org/convergence;1']
      .getService().wrappedJSObject;
    notary = convergence.getNewNotary();
  }

  notary.setHost(host);
  notary.setSSLPort(sslPort);
  notary.setHTTPPort(httpPort);

  try {
    notary.setCertificate(certificate);
  } catch (e) {    
    dump(e);
    alert("Sorry, you must specify a correctly formatted certificate.");
    return false;
  }

  retVal.notary = notary;

  return true;
}

