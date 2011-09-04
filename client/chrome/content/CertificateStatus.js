Components.utils.import("resource://gre/modules/ctypes.jsm");

function CertificateStatus(convergenceManager) {
  dump("CertificateStatus constructor called : " + convergenceManager.nssFile.path + "\n");
  NSS.initialize(convergenceManager.nssFile.path);
  dump("Constructed!\n");
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

CertificateStatus.prototype.getVerificationStatus = function(certificate) {
  var len                 = {};
  var derEncoding         = certificate.getRawDER(len);

  var derItem             = NSS.types.SECItem();
  derItem.data            = NSS.lib.ubuffer(derEncoding);
  derItem.len             = len.value;

  var completeCertificate = NSS.lib.CERT_DecodeDERCertificate(derItem.address(), 1, null);

  var extItem = NSS.types.SECItem();
  var status  = NSS.lib.CERT_FindCertExtension(completeCertificate, 
					       NSS.lib.SEC_OID_NS_CERT_EXT_COMMENT, 
					       extItem.address());

  if (status != -1) {
    var encoded = '';
    var asArray = ctypes.cast(extItem.data, ctypes.ArrayType(ctypes.unsigned_char, extItem.len).ptr).contents;

    for (var i=3;i<asArray.length;i++) {
      encoded += String.fromCharCode(asArray[i]);
    }

    dump("Parsed encoded details: " + encoded + "\n");
    return JSON.parse(encoded);
  }
};

CertificateStatus.prototype.getCurrentTabStatus = function() {
  dump("Getting current tab status...\n");
  var certificate = this.getCertificateForCurrentTab();  

  if (certificate != null) {
    return this.getVerificationStatus(certificate);
  }

  return null;
};

