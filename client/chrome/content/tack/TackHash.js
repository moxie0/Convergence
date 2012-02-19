
function TackHash(secItem, offset, length) {
  var input = new NSS.lib.ubuffer(length);
  this.hash = new NSS.lib.ubuffer(32);

  for (var i=0;i<length;i++) {
    input[i] = secItem.data[offset + i];
  }

  NSS.lib.PK11_HashBuf(NSS.lib.SEC_OID_SHA256, this.hash, input, length);
}