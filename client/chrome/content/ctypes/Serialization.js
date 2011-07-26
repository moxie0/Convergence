function Serialization() {

}

Serialization.serializeAddress = function(addr) {
  return [addr.family, addr.port, addr.ip];
};

Serialization.deserializeAddress = function(serializedAddress) {
  return NSPR.types.PRNetAddr({'family' : serializedAddress[0], 
  			       'port' : serializedAddress[1], 
  			       'ip' : serializedAddress[2], 
  			       'pad' : [0,0,0,0,0,0,0,0]});
};

// XXX Address 32bit systems!
Serialization.serializePointer = function(fd) {
  var fdString     = fd.toString();
  var addressStart = fdString.indexOf("0x");
  var addressEnd   = fdString.indexOf("\"", addressStart);
  var address      = fdString.substring(addressStart, addressEnd);
  
  return address;
};

// XXX Address 32bit systems!
Serialization.deserializeDescriptor = function(serializedFd) {
  var int64 = new ctypes.UInt64(serializedFd);
  return NSPR.types.PRFileDesc.ptr(int64);
};

Serialization.deserializeCERTCertificate = function(serializedCertificate) {
  var int64 = new ctypes.UInt64(serializedCertificate);
  return NSS.types.CERTCertificate.ptr(int64);
};

Serialization.deserializeSECKEYPublicKey = function(serializedKey) {
  var int64 = new ctypes.UInt64(serializedKey);
  return NSS.types.SECKEYPublicKey.ptr(int64);
};

Serialization.deserializeSECKEYPrivateKey = function(serializedKey) {
  var int64 = new ctypes.UInt64(serializedKey);
  return NSS.types.SECKEYPrivateKey.ptr(int64);
};

Serialization.serializeProxyInfo = function(proxyInfo) {
  if (proxyInfo == null) {
    return null;
  }

  var serializedProxyInfo = {};
  serializedProxyInfo['host'] = proxyInfo.host;
  serializedProxyInfo['port'] = proxyInfo.port;
  serializedProxyInfo['type'] = proxyInfo.type;

  return serializedProxyInfo;
};