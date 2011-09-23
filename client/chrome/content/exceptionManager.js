var status;

function initializeExceptionDialog() {
  status = window.arguments[0];
  document.getElementById("locationLabel").value = "https://" + status.target;
  setText("headerDescription", new ConvergenceResponseStatus(status.details).toString());
}

function viewCertButtonClick() {
  var certificateDialog   = Components.classes["@mozilla.org/nsCertificateDialogs;1"]
                            .getService(Components.interfaces.nsICertificateDialogs);
  var certificateDatabase = Components.classes["@mozilla.org/security/x509certdb;1"]
                            .getService(Components.interfaces.nsIX509CertDB);
  var x509                = certificateDatabase.constructX509FromBase64(status.certificate);

  certificateDialog.viewCert(this, x509);
}

function addException() {
  var certificateDialog   = Components.classes["@mozilla.org/nsCertificateDialogs;1"]
                            .getService(Components.interfaces.nsICertificateDialogs);
  var certificateDatabase = Components.classes["@mozilla.org/security/x509certdb;1"]
                            .getService(Components.interfaces.nsIX509CertDB);
  var x509                = certificateDatabase.constructX509FromBase64(status.certificate);

  var convergence = Components.classes['@thoughtcrime.org/convergence;1'].getService().wrappedJSObject;
  var cache       = convergence.getNativeCertificateCache();
  var host        = status.target.split(":")[0];
  var port        = status.target.split(":")[1];

  cache.cacheFingerprint(host, port, x509.sha1Fingerprint);
  dump("Cached: " + x509.sha1Fingerprint + " for host: " + host + " and port: " + port + "\n");

  document.documentElement.acceptDialog();
}

function setText(id, value) {
  var element = document.getElementById(id);
  if (!element) return;
     if (element.hasChildNodes())
       element.removeChild(element.firstChild);
  var textNode = document.createTextNode(value);
  element.appendChild(textNode);
}
