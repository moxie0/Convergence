
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
 * This class is a holder for the information we pull out of a certificate,
 * such as its fingerprint.
 *
 **/


function CertificateInfo(certificate, serialized) {
  if (!(typeof serialized == 'undefined')) {
    this.deserialize(serialized);
    return;
  }

  // XXX uhm, free this?
  this.arena               = NSS.lib.PORT_NewArena(2048);
  this.commonName          = NSS.lib.CERT_GetCommonName(certificate.contents.subject.address());
  this.orgUnitName         = NSS.lib.CERT_GetOrgUnitName(certificate.contents.subject.address());
  this.altNames            = NSS.lib.CERT_GetCertificateNames(certificate, this.arena);
  this.verificationDetails = null;
  this.status 		   = NSS.lib.CERT_VerifyCertNow(NSS.lib.CERT_GetDefaultCertDB(),
					  certificate, 1, 1, null);

  this.md5         = this.calculateFingerprint(certificate, NSS.lib.SEC_OID_MD5, 16);
  this.sha1        = this.calculateFingerprint(certificate, NSS.lib.SEC_OID_SHA1, 20);
  dump("Calculating PKI root...\n");
  this.isLocalPki  = this.calculateTrustedPkiRoot(certificate);
  this.original    = this.encodeOriginalCertificate(certificate);
}

CertificateInfo.prototype.calculateTrustedPkiRoot = function(certificate) {
  dump("Certificate signature status: " + this.status + "\n");

  var certificateChain   = NSS.lib.CERT_CertChainFromCert(certificate, 0, 1);

  dump("Certificate chain length: " + certificateChain.contents.len + "\n");

  var derCertificateArray = ctypes.cast(certificateChain.contents.certs, 
					ctypes.ArrayType(NSS.types.SECItem, certificateChain.contents.len).ptr).contents;

  var rootDerCertificate = derCertificateArray[certificateChain.contents.len-1];

  dump("Root DER certificate: " + rootDerCertificate + "\n");

  var rootCertificate    = NSS.lib.CERT_FindCertByDERCert(NSS.lib.CERT_GetDefaultCertDB(),
							  rootDerCertificate.address());
  
  dump("Root certificate: " + rootCertificate + "\n");

  var rootName         = NSS.lib.CERT_GetOrgUnitName(rootCertificate.contents.subject.address());

  if (!rootName.isNull()) {
    dump("Root name: " + rootName.readString() + "\n");
  }

  var slots    = NSS.lib.PK11_GetAllSlotsForCert(rootCertificate, null);

  dump("Got slots: " + slots + "\n");

  var slotNode      = slots.isNull() ? null : slots.contents.head;
  var softwareToken = false;

  dump("SlotNode: " + slotNode + "\n");

  while (slotNode != null && !slotNode.isNull()) {
    var tokenName = NSS.lib.PK11_GetTokenName(slotNode.contents.slot).readString();

    dump("Token: " + tokenName + "\n");

    if (tokenName == "Software Security Device") {
      softwareToken = true;
      break;
    }

    slotNode = slotNode.contents.next;
  }

  NSS.lib.CERT_DestroyCertificate(rootCertificate);
  NSS.lib.CERT_DestroyCertificateList(certificateChain);

  return softwareToken;
};

CertificateInfo.prototype.encodeOriginalCertificate = function(certificate) {
  var derCert = certificate.contents.derCert;
  var asArray = ctypes.cast(derCert.data, ctypes.ArrayType(ctypes.unsigned_char, derCert.len).ptr).contents;
  var encoded = '';

  for (var i=0;i<asArray.length;i++) {
    encoded += String.fromCharCode(asArray[i]);
  }

  return btoa(encoded);
};

CertificateInfo.prototype.encodeVerificationDetails = function(details) {
  this.verificationDetails = JSON.stringify(details);
};

CertificateInfo.prototype.deserialize = function(serialized) {
  this.destination      = new Object();
  this.destination.host = serialized.host;
  this.destination.port = serialized.port;
  this.commonName       = serialized.commonName;
  this.orgUnitName      = serialized.orgUnitName;
  this.altNames         = Serialization.deserializeCERTGeneralName(serialized.altNames),
  this.md5              = serialized.md5;
  this.sha1             = serialized.sha1;
};

CertificateInfo.prototype.serialize = function() {
  return {'host' : this.destination.host,
	  'port' : this.destination.port,
	  'commonName' : this.commonName,
	  'orgUnitName' : this.orgUnitName,
	  'altNames' : Serialization.serializePointer(this.altNames),
	  'md5' : this.md5,
	  'sha1' : this.sha1};
};

CertificateInfo.prototype.calculateFingerprint = function(certificate, type, length) {
  var fingerprint = new NSS.lib.ubuffer(20);
  
  NSS.lib.PK11_HashBuf(type, fingerprint, 
		       certificate.contents.derCert.data, 
		       certificate.contents.derCert.len);

  var secItem        = NSS.types.SECItem({'type' : 0, 
					  'data' : fingerprint, 
					  'len' : length});
  var fingerprintHex = NSS.lib.CERT_Hexify(secItem.address(), 1);

  return fingerprintHex.readString();
};



