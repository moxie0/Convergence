
function TackKey(secItem, offset) {
  const KEY_TYPE_LENGTH  = 1;
  const KEY_KEY_LENGTH   = 64;
  const KEY_NONCE_LENGTH = 8;
  const TACK_KEY_LENGTH  = KEY_TYPE_LENGTH + KEY_KEY_LENGTH + KEY_NONCE_LENGTH;

  const KEY_TYPE_OFFSET  = offset;
  const KEY_KEY_OFFSET   = KEY_TYPE_OFFSET + KEY_TYPE_LENGTH;
  const KEY_NONCE_OFFSET = KEY_KEY_OFFSET + KEY_KEY_LENGTH;

  if (secItem.len - offset < TACK_KEY_LENGTH)
    throw "Invalid Tack_Pin length: " + secItem.len;

  var data = secItem.data;
  
  this.type  = data[KEY_TYPE_OFFSET];

  dump("Key type: " + this.type + "\n");

  this.key   = NSS.lib.ubuffer(KEY_KEY_LENGTH);
  this.nonce = NSS.lib.ubuffer(KEY_NONCE_LENGTH);
  
  for (var i=0;i<KEY_KEY_LENGTH;i++)
    this.key[i] = data[KEY_KEY_OFFSET + i];

  for (var i=0;i<KEY_NONCE_LENGTH;i++)
    this.nonce[i] = data[KEY_NONCE_OFFSET + i];

}