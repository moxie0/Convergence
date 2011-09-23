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

Components.utils.import("resource://gre/modules/ctypes.jsm");

/**
 * This class pulls out the notary vote results for the currently
 * rendered page.
 *
 **/

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
    var marker  = false;

    for (var i=0;i<asArray.length;i++) {
      if (marker) {
	encoded += String.fromCharCode(asArray[i]);
      } else if (asArray[i] == 0x00) {
	marker = true;
      }
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

