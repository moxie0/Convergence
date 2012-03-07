
function Tack(secItem) {
  const EXTENSION_HASH_LENGTH = 104;

  var tackKey   = new TackKey(secItem, 0);
  var tackSig   = new TackSignature(secItem);
  var tackHash  = new TackHash(secItem, 0, EXTENSION_HASH_LENGTH);
  var publicKey = new ECCPublicKey(tackKey.key);
  var sigStatus = publicKey.verifySignature(tackSig.signature, tackHash.hash);

  if (sigStatus == 0) {
    dump("TACK Signature Success!\n");
    this.tackKey = tackKey;
    this.tackSig = tackSig;
  } else {
    dump("TACK Signature Failed!\n");
    this.tackKey = null;
    this.tackSig = null;
  }
}