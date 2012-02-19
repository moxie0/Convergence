function ECCPublicKey(pointData) {
  var spkiDer  = this.buildSpkiData(pointData);
  var spki     = NSS.lib.SECKEY_DecodeDERSubjectPublicKeyInfo(spkiDer.address());

  if (spki.isNull())
    throw "Failed to parse EC public key!";

  this.publicKey = NSS.lib.SECKEY_ExtractPublicKey(spki);
  NSS.lib.SECKEY_DestroySubjectPublicKeyInfo(spki);
};

ECCPublicKey.prototype.verifySignature = function(signature, hash) {
  var signatureItem  = NSS.types.SECItem();
  signatureItem.data = signature;
  signatureItem.len  = 64;

  var hashItem  = NSS.types.SECItem();
  hashItem.data = hash;
  hashItem.len  = 32;

  return NSS.lib.PK11_Verify(this.publicKey, signatureItem.address(), 
                             hashItem.address(), null);
};

ECCPublicKey.prototype.buildSpkiData = function(pointData) {
  const SPKI_P256 = [0x30, 0x59, 0x30, 0x13, 0x06, 0x07, 0x2a, 0x86,
                     0x48, 0xce, 0x3d, 0x02, 0x01, 0x06, 0x08, 0x2a,
                     0x86, 0x48, 0xce, 0x3d, 0x03, 0x01, 0x07, 0x03,
                     0x42, 0x00];

  var spki = NSS.lib.ubuffer(SPKI_P256.length + 1 + 64);

  for (var i=0;i<SPKI_P256.length;i++)
    spki[i] = SPKI_P256[i];

  spki[SPKI_P256.length] = 0x04;

  for (var i=0;i<64;i++)
    spki[SPKI_P256.length + 1 + i] = pointData[i];

  var spkiDer  = NSS.types.SECItem();
  spkiDer.data = spki;
  spkiDer.len  = SPKI_P256.length + 1 + 64;

  return spkiDer;
};


/*
ECCPublicKey.prototype.setP256Parameters = function(ecPublicKey) {
  var oidData         = NSS.lib.SECOID_FindOIDByTag(NSS.lib.SEC_OID_SECG_EC_SECP256K1);
  var encodedEcParams = NSS.lib.SECITEM_AllocItem(null, null, (2 + oidData.contents.oid.len));

  encodedEcParams.contents.data[0] = NSS.lib.SEC_ASN1_OBJECT_ID;
  encodedEcParams.contents.data[1] = oidData.contents.oid.len;

  for (var i=0;i<oidData.contents.oid.len;i++)
    encodedEcParams.contents.data[2+i] = oidData.contents.oid.data[i];

  var status = SOFTOKN.lib.EC_DecodeParams(encodedEcParams, ecPublicKey.ecParams.address().address());

  dump("ECDecoded: " + status + "\n");

  NSS.lib.SECItem_FreeItem(encodedEcParams, 1);
};*/