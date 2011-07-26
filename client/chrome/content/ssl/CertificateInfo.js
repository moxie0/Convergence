
function CertificateInfo(certificate, serialized) {
  if (!(typeof serialized == 'undefined')) {
    this.deserialize(serialized);
    return;
  }

  // XXX uhm, free this?
  this.arena       = NSS.lib.PORT_NewArena(2048);
  this.commonName  = NSS.lib.CERT_GetCommonName(certificate.contents.subject.address());
  this.orgUnitName = NSS.lib.CERT_GetOrgUnitName(certificate.contents.subject.address());
  this.altNames    = NSS.lib.CERT_GetCertificateNames(certificate, this.arena);

  this.md5         = this.calculateFingerprint(certificate, NSS.lib.SEC_OID_MD5, 16);
  this.sha1        = this.calculateFingerprint(certificate, NSS.lib.SEC_OID_SHA1, 20);
}

CertificateInfo.prototype.encodeVerificationDetails = function(details) {
  // this.orgUnitName = NSS.lib.buffer("Foo~Bar");
  var encodedDetails = "";

  for (var i in details) {
    encodedDetails += (details[i].notary + ":" + details[i].status + "*");
  }

  dump("Encoded details: " + encodedDetails + "\n");

  this.orgUnitName = NSS.lib.buffer(encodedDetails);
};

CertificateInfo.prototype.deserialize = function(serialized) {
  this.destination      = new Object();
  this.destination.host = serialized.host;
  this.destination.port = serialized.port;
  this.commonName       = serialized.commonName;
  this.altNames         = Serialization.deserializeCERTGeneralName(serialized.altNames),
  this.md5              = serialized.md5;
  this.sha1             = serialized.sha1;
};

CertificateInfo.prototype.serialize = function() {
  return {'host' : this.destination.host,
	  'port' : this.destination.port,
	  'commonName' : this.commonName,
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


