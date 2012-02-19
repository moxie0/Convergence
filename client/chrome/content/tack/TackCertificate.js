
function TackCertificate(certificate) {
//  var certificate   = this.loadCertificateFromFile();
  var extensionData = this.getTackExtensionData(certificate);

  if (extensionData == null)
    throw "No TACK extensions found!";
  
  this.tackExtension = new TackExtension(extensionData);
};

TackCertificate.prototype.isTackExtension = function(secItemOid) {
  var TACK_OID = [0x2B, 0x06, 0x01, 0x04, 0x01, 0x82, 0xB0, 0x34, 0x01];
  
  var oidData  = ctypes.cast(secItemOid.data, ctypes.ArrayType(ctypes.unsigned_char, secItemOid.len).ptr).contents;

  if (oidData.length != TACK_OID.length)
    return false;

  for (var i=0;i<oidData.length;i++) {
    if (TACK_OID[i] != oidData[i])
      return false;
  }

  return true;
};

TackCertificate.prototype.getTackExtensionData = function(tackCertificate) {
  var tackExtensions   = tackCertificate.contents.extensions;
  var currentExtension = tackExtensions.contents;

  while (!currentExtension.isNull()) {
    if (this.isTackExtension(currentExtension.contents.id))
      return currentExtension.contents.value;
    
    var incrementedPointer = Serialization.incrementPointer(tackExtensions, 8);
    tackExtensions         = NSS.types.CERTCertExtension.ptr.ptr(incrementedPointer);
    currentExtension       = tackExtensions.contents;
  }

  return null;
};

// TackCertificate.prototype.loadCertificateFromFile = function() {
//   Components.utils.import("resource://gre/modules/NetUtil.jsm");

//   var ios = Components.classes["@mozilla.org/network/io-service;1"].  
//     getService(Components.interfaces.nsIIOService);  

//   var url = ios.newURI("file:///home/moxie/Downloads/tack.der", null, null);  
      
//   if (!url || !url.schemeIs("file")) throw "Expected a file URL.";  
      
//   var pngFile = url.QueryInterface(Components.interfaces.nsIFileURL).file;  
      
//   var istream = Components.classes["@mozilla.org/network/file-input-stream;1"].  
//     createInstance(Components.interfaces.nsIFileInputStream);  
//   istream.init(pngFile, -1, -1, false);  
      
//   var bstream = Components.classes["@mozilla.org/binaryinputstream;1"].  
//     createInstance(Components.interfaces.nsIBinaryInputStream);  
//   bstream.setInputStream(istream);  
      
//   var tackCertificateLength = bstream.available();
//   var tackCertificateBytes = bstream.readBytes(tackCertificateLength);  
  
//   var tackData = NSS.lib.ubuffer(tackCertificateLength+1);

//   for (var i=0;i<tackCertificateLength;i++) {
//     tackData[i] = tackCertificateBytes.charCodeAt(i);
//   }

//   var derItem              = NSS.types.SECItem();
//   derItem.data             = tackData;//ctypes.cast(tackData, ctypes.unsigned_char.ptr);
//   derItem.len              = tackCertificateLength;

//   return NSS.lib.CERT_DecodeDERCertificate(derItem.address(), 1, null);
// };
