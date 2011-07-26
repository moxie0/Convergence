function CertificateStatus() {

}

CertificateStatus.prototype.getInvalidCertificate = function(destination) {
  dump("Getting invalid certificate for: " + destination + "\n");

  var badCertService = Components.classes["@mozilla.org/security/recentbadcerts;1"]
  .getService(Components.interfaces.nsIRecentBadCertsService);

  if (!badCertService)
    return null;

  var badCertStatus = badCertService.getRecentBadCert(destination);

  if (badCertStatus != null) {
    return badCertStatus.serverCert;
  } else {
    return null;
  }
};

CertificateStatus.prototype.getCertificateForCurrentTab = function() {
  var browser = gBrowser.selectedBrowser;

  if (browser.currentURI.scheme != "https")
    return null;

  var securityProvider = browser.securityUI.QueryInterface(Components.interfaces.nsISSLStatusProvider);
    
  if (securityProvider.SSLStatus != null) {
    return securityProvider.SSLStatus.serverCert;
  } else {
    var port = browser.currentURI.port == -1 ? 443 : browser.currentURI.port;
    return this.getInvalidCertificate(browser.currentURI.host + ":" + port);
  }
};

CertificateStatus.prototype.parseStatus = function(status) {
  var notaries = status.split("*");
  var results  = new Array();

  for (var i in notaries) {
    if (notaries[i].length == 0)
      continue;

    var notaryResponse = notaries[i].split(":");
    var notary         = notaryResponse[0];
    var status;

    if (notaryResponse[1] < 0)
      status = "Connectivity Failure.";
    else if (notaryResponse[1] == 0)
      status = "Verification Failure.";
    else if (notaryResponse[1] == 1)
      status = "Verification Success.";
    else if (notaryResponse[1] == 3)
      status = "Anonymization Relay.";

    results.push({'notary' : notary, 'status' : status});
  }

  return results;
};

CertificateStatus.prototype.getCurrentTabStatus = function() {
  dump("Getting current tab status...\n");
  var certificate = this.getCertificateForCurrentTab();  

  if (certificate != null)
    return this.parseStatus(certificate.organizationalUnit);

  return null;
};

