
function TackKey(secItem, offset) {
  const KEY_TYPE_LENGTH  = 1;
  const KEY_KEY_LENGTH   = 64;
  const TACK_KEY_LENGTH  = KEY_TYPE_LENGTH + KEY_KEY_LENGTH;

  const KEY_TYPE_OFFSET  = offset;
  const KEY_KEY_OFFSET   = KEY_TYPE_OFFSET + KEY_TYPE_LENGTH;

  if (secItem.len - offset < TACK_KEY_LENGTH)
    throw "Invalid Tack_Pin length: " + secItem.len;

  var data = secItem.data;
  
  this.type  = data[KEY_TYPE_OFFSET];

  dump("Key type: " + this.type + "\n");

  this.key   = NSS.lib.ubuffer(KEY_KEY_LENGTH);
  
  for (var i=0;i<KEY_KEY_LENGTH;i++)
    this.key[i] = data[KEY_KEY_OFFSET + i];
}


TackKey.prototype.getFingerprint = function() {
  var hash = new NSS.lib.ubuffer(32);
  NSS.lib.PK11_HashBuf(NSS.lib.SEC_OID_SHA256, hash, this.key, 64);

  var secItem        = NSS.types.SECItem({'type' : 0, 
					  'data' : hash, 
					  'len' : 32});
  var fingerprintHex = NSS.lib.CERT_Hexify(secItem.address(), 1);

  return fingerprintHex.readString();
};