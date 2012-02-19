
function BreakSignature(data, offset) {
  this.tackKey     = new TackKey(data, offset);
  this.signature   = this.parseSignature(data, 73 + offset);
  this.tackKeyHash = new TackHash(data, offset, 73).hash;  
}

BreakSignature.prototype.parseSignature = function(data, offset) {
  const SIGNATURE_SIZE = 64;
  var signature        = NSS.lib.ubuffer(SIGNATURE_SIZE);
  
  if (data.len - offset < SIGNATURE_SIZE)
    throw "Not enough data remaining for signature: " + signature;

  for (var i=0;i<SIGNATURE_SIZE;i++)
    signature[i] = data.data[offset + i];

  return signature;
};

BreakSignature.getSignatures = function(data) {
  const BREAK_SIG_SIZE = 73 + 64;

  var breaks = new Array();

  for (var i=0;i<data.len;i+=BREAK_SIG_SIZE) {
    var breakSignature = new BreakSignature(data, i);
    var publicKey      = new ECCPublicKey(breakSignature.tackKey.key)    
    var sigStatus      = publicKey.verifySignature(breakSignature.signature, breakSignature.tackKeyHash);
  
    dump("Break sig status: " + sigStatus + '\n');
  
    if (sigStatus == 0) {
      breaks.push(breakSignature);
    }
  }

  return breaks;
};