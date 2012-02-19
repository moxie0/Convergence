
function TackExtension(secItem) {
  this.tack            = null;
  this.breakSignatures = null;

  var data = ctypes.cast(secItem.data, ctypes.ArrayType(ctypes.unsigned_char, 
                                                        secItem.len).ptr).contents;

  if (secItem.len < 4) {
    throw "Invalid extension length: " + secItem.len;
  }
  
  this.type = data[0];

  if (this.type != 1)
    throw "Unknown TACK Extension Type: " + this.type;

  var tackData            = this.parseVector(data, 1, 1);
  var breakSignaturesData = this.parseVector(data, 1 + tackData.len + 1, 2);

  if (tackData.len > 0) {
    this.tack = new Tack(tackData);
  }

  if (breakSignaturesData.len > 0) {
    this.breakSignatures = BreakSignature.getSignatures(breakSignaturesData);
  }
};

TackExtension.prototype.parseVector = function(data, offset, size) {
  var length;
  
  if (size == 1) {
    length = data[offset] & 0xFF;
  } else {
    length = ((data[offset] & 0xFF) << 8 | (data[offset + 1] & 0xFF));
  }

  dump("Vector data length: " + length + "\n");

  var vectorData = NSS.lib.ubuffer(length);

  for (var i=0;i<length;i++)
    vectorData[i] = data[offset + size + i];

  return {'data' : vectorData, 'len' : length};
};