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
 * This class is responsible for initializing the local CA certificate
 * used for the local MITM, as well as generating and signing target
 * certificates as appropriate.
 *
 **/


function CertificateManager(serialized) {
  if (typeof serialized != 'undefined') {
    this.deserialize(serialized);
    return;
  }

  this.caCertificate = NSS.lib.CERT_FindCertByNickname(NSS.lib.CERT_GetDefaultCertDB(), 
						       "Convergence");
  
  if (!this.caCertificate.isNull()) {
    dump("Found existing certificate!\n");
    this.updateCertificateTrust(this.caCertificate);
    this.caKey       = NSS.lib.PK11_FindKeyByAnyCert(this.caCertificate, null);   
    this.needsReboot = false;
  } else {
    dump("Generating new ca certificate..\n");
    var keys           = this.generateKeyPair(true, "Convergence Local Private");
    this.caKey         = keys.privateKey;
    this.caCertificate = this.generateCaCertificate(keys.privateKey, keys.publicKey);
    this.needsReboot   = true;
    
    this.signCertificate(this.caCertificate);
    this.importCertificate(this.caCertificate);
  }
  
  this.peerKeys = this.generateKeyPair(false, "Convergence Peer Private");      
}

CertificateManager.prototype.getPeerKeys = function() {
  return this.peerKeys;
};

CertificateManager.prototype.getCaMaterial = function() {
  return {'certificate' : this.caCertificate, 'key' : this.caKey};
};

CertificateManager.prototype.signCertificate = function(certificate) {
  var algorithmId = NSS.lib.SEC_GetSignatureAlgorithmOidTag(this.caKey.contents.keyType, 191);
  
  NSS.lib.SECOID_SetAlgorithmID(certificate.contents.arena, 
				certificate.contents.signature.address(), 
				algorithmId, null);
  certificate.contents.version.data.contents = 2;
  certificate.contents.version.len           = 1;

  var der = NSS.types.SECItem();

  // NSS.lib.SEC_ASN1EncodeItem(certificate.contents.arena, der.address(), 
  // 			     certificate, NSS.lib.CERT_CertificateTemplate.address());

  NSS.lib.SEC_ASN1EncodeItem(certificate.contents.arena, der.address(), 
  			     certificate, NSS.lib.NSS_Get_CERT_CertificateTemplate());

  NSS.lib.SEC_DerSignData(certificate.contents.arena, 
			  certificate.contents.derCert.address(), 
			  der.data, der.len, this.caKey, algorithmId);

};

CertificateManager.prototype.importCertificate = function(certificate) {
  var certdb     = NSS.lib.CERT_GetDefaultCertDB();
  var derCert    = certificate.contents.derCert.address();
  var derCertPtr = derCert.address();
  var results    = NSS.types.CERTCertificate.ptr().address();

  var status     = NSS.lib.CERT_ImportCerts(certdb, 3, 1, derCertPtr, results.address(), 1, 1, "Convergence");


  this.updateCertificateTrust(certificate);
};

CertificateManager.prototype.generateCaCertificate = function(privateKey, publicKey) {
  return this.generateCertificate(privateKey, publicKey,
				  "CN=Convergence Local CA,OU=Convergence,O=Convergence,C=US",
				  "CN=Convergence Local CA,OU=Convergence,O=Convergence,C=US", 
				  true, null, null);
};

CertificateManager.prototype.generatePeerCertificate = function(certificateInfo) {
  var commonName  = certificateInfo.commonName.readString();

  if (commonName.indexOf(",") != -1) 
    commonName = '"' + commonName + '"';

  var certificateName = 
  "CN=" + commonName + ",OU=Convergence,O=Convergence,C=US";

  var certificate = this.generateCertificate(this.peerKeys.privateKey, this.peerKeys.publicKey,
  					     certificateName, 
  					     "CN=Convergence Local CA,OU=Convergence,O=Convergence,C=US",
  					     false, certificateInfo.altNames, 
					     certificateInfo.verificationDetails);

  this.signCertificate(certificate);

  return {'certificate' : certificate, 'key' : this.peerKeys.privateKey};
};

CertificateManager.prototype.generateRandomSerial = function() {
  var serial    = ctypes.uint32_t();
  var serialPtr = ctypes.cast(serial.address(), ctypes.voidptr_t);
  NSPR.lib.PR_GetRandomNoise(serialPtr, 4);

  return serial;
};

CertificateManager.prototype.createValidity = function() {
  var now      = NSPR.lib.PR_Now();
  var then     = ctypes.Int64(0);
  var exploded = NSPR.types.PRExplodedTime();

  NSPR.lib.PR_ExplodeTime(now, NSPR.lib.PR_GMTParameters, exploded.address());

  exploded.tm_year -= 1;

  now = NSPR.lib.PR_ImplodeTime(exploded.address());
  
  exploded.tm_year += 6;

  then = NSPR.lib.PR_ImplodeTime(exploded.address());

  return NSS.lib.CERT_CreateValidity(now, then);
};

CertificateManager.prototype.addCaExtensions = function(certificate, extensionHandle) {
  var basicConstraint = NSS.types.CERTBasicConstraints({'isCA' : 1, 'pathLenConstraint' : 3});
  var encodedValue    = NSS.types.SECItem();

  var status          = NSS.lib.CERT_EncodeBasicConstraintValue(null, basicConstraint.address(), encodedValue.address());
  var status          = NSS.lib.CERT_AddExtension(extensionHandle, 85, encodedValue.address(), 1, 1);

  var keyUsageItem    = NSS.types.SECItem();
  var keyUsage        = new ctypes.unsigned_char(0x04);
  
  keyUsageItem.data = keyUsage.address();
  keyUsageItem.len  = 1;

  var status = NSS.lib.CERT_EncodeAndAddBitStrExtension(extensionHandle, NSS.lib.SEC_OID_X509_KEY_USAGE, keyUsageItem.address(), 1);
};

CertificateManager.prototype.addVerificationDetails = function(certificate, extensionHandle, verificationDetails) {
  var commentItem     = NSS.types.SECItem();
  var comment         = NSPR.lib.unsigned_buffer(verificationDetails);
  
  commentItem.data    = comment;
  commentItem.len     = verificationDetails.length;

  var status = NSS.lib.CERT_EncodeAndAddBitStrExtension(extensionHandle, 
							NSS.lib.SEC_OID_NS_CERT_EXT_COMMENT, 
							commentItem.address(), 0);

  dump("COMMENT v3 extension result: " + status + "\n");
};

CertificateManager.prototype.addAltNames = function(certificate, extensionHandle, altNames) {
  var arena           = NSS.lib.PORT_NewArena(2048);
  var secItem         = NSS.types.SECItem();
  
  NSS.lib.CERT_EncodeAltNameExtension(arena, altNames, secItem.address());
  NSS.lib.CERT_AddExtension(extensionHandle, 83, secItem.address(), 0, 1);
  NSS.lib.PORT_FreeArena(arena, 0);
};

CertificateManager.prototype.generateCertificate = function(privateKey, publicKey, subject, issuer, isCa, 
							    altNames, verificationDetails) 
{
  var subjectName        = NSS.lib.CERT_AsciiToName(subject);

  if (subjectName == null || subjectName.isNull()) {
    throw "Could not construct subject name: " + subject;
  }

  var issuerName         = NSS.lib.CERT_AsciiToName(issuer);

  if (issuerName == null || issuerName.isNull()) {
    throw "Could not construct issuer name!";
  }
  
  var publicKeyInfo      = NSS.lib.SECKEY_CreateSubjectPublicKeyInfo(publicKey);

  if (publicKeyInfo == null || publicKeyInfo.isNull()) {
    throw "Could not construct public key info!";
  }

  var certificateRequest = NSS.lib.CERT_CreateCertificateRequest(subjectName, publicKeyInfo, null);

  if (certificateRequest == null || certificateRequest.isNull()) {
    throw "Could not construct certificate request!";
  }

  var serial             = this.generateRandomSerial();
  var validity           = this.createValidity();
  var certificate        = NSS.lib.CERT_CreateCertificate(serial, issuerName, validity, certificateRequest);

  if (certificate == null || certificate.isNull()) {
    throw "Could not construct certificate!";
  }

  var extensionHandle = NSS.lib.CERT_StartCertExtensions(certificate);

  if (isCa) {
    this.addCaExtensions(certificate, extensionHandle);
  }

  if (altNames != null && !altNames.isNull()) {
    this.addAltNames(certificate, extensionHandle, altNames);
  }

  if (verificationDetails != null) {
    this.addVerificationDetails(certificate, extensionHandle, verificationDetails);
  }

  NSS.lib.CERT_FinishExtensions(extensionHandle);

  return certificate;
};

CertificateManager.prototype.generateKeyPair = function(permanent, nick) {
  var slot       = NSS.lib.PK11_GetInternalKeySlot();
  var publicKey  = NSS.types.SECKEYPublicKey.ptr(0);
  var rsaParams  = NSS.types.PK11RSAGenParams({'keySizeInBits' : 1024, 'pe' : 65537});
  // Get nsIPK11Token for Master Password
  var myToken = Components.classes["@mozilla.org/security/pk11tokendb;1"].getService(Components.interfaces.nsIPK11TokenDB).findTokenByName("");
  if (! myToken.isLoggedIn()) {
    myToken.login(true);
  }
  var privateKey = NSS.lib.PK11_GenerateKeyPair(slot, NSS.lib.CKM_RSA_PKCS_KEY_PAIR_GEN, 
						rsaParams.address(), 
						publicKey.address(), 
						permanent ? 1 : 0, 1, null);
  
  if (privateKey == null || privateKey.isNull()) {
    dump("KeyPair generation error: " + NSPR.lib.PR_GetError() + "\n");
    throw "Error generating keypair!";
  }

  if (publicKey == null || publicKey.isNull()) {
    dump("KeyPair generation error: " + NSPR.lib.PR_GetError() + "\n");
    throw "Error generating keypair (pub)!"
  }

  NSS.lib.PK11_SetPrivateKeyNickname(privateKey, nick);

  return {'publicKey' : publicKey, 'privateKey' : privateKey};  
};

CertificateManager.prototype.updateCertificateTrust = function(certificate) {
  var certificateTrust = NSS.types.CERTCertTrust({'sslFlags' : ((1<<7) | (1<<4)), 
						  'emailFlags' : 0, 
						  'objectSigningFlags' : 0});
  NSS.lib.CERT_ChangeCertTrust(NSS.lib.CERT_GetDefaultCertDB(), 
			       certificate, certificateTrust.address());
};

CertificateManager.prototype.serialize = function() {
  return {'caCertificate'  : Serialization.serializePointer(this.caCertificate),
	  'caKey'          : Serialization.serializePointer(this.caKey),
	  'peerKeyPublic'  : Serialization.serializePointer(this.peerKeys.publicKey),
	  'peerKeyPrivate' : Serialization.serializePointer(this.peerKeys.privateKey)};
};

CertificateManager.prototype.deserialize = function(serialized) {
  this.caCertificate = Serialization.deserializeCERTCertificate(serialized.caCertificate);
  this.caKey         = Serialization.deserializeSECKEYPrivateKey(serialized.caKey);
  this.peerKeys      = {'publicKey'  : Serialization.deserializeSECKEYPublicKey(serialized.peerKeyPublic),
			'privateKey' : Serialization.deserializeSECKEYPrivateKey(serialized.peerKeyPrivate)};
};
