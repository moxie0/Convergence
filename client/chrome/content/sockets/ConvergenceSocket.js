
function ConvergenceSocket(fd, serialized) {
  if (typeof serialized != 'undefined') {
    this.fd = Serialization.deserializeDescriptor(serialized);
  } else {
    this.fd = fd;
  }  
}

ConvergenceSocket.prototype.negotiateSSL = function(certificateManager, certificateInfo) {
  var material = certificateManager.generatePeerCertificate(certificateInfo);

  this.fd      = SSL.lib.SSL_ImportFD(null, this.fd); 

  if (this.fd  == null || this.fd.isNull()) {
    throw "Bad SSL FD!";
  }
 
  var status   = SSL.lib.SSL_ConfigSecureServer(this.fd, material.certificate, material.key,
						SSL.lib.NSS_FindCertKEAType(material.certificate));

  if (status == -1) {
    throw "Error on SSL_ConfigSecureServer!";
  }
  
  var status = SSL.lib.SSL_ResetHandshake(this.fd, NSPR.lib.PR_TRUE);
  
  if (status == -1) {
    throw "Error on SSL_RestHandshake!";
  }

  // var status = NSS.lib.SSL_ForceHandshake(this.fd);

  var status = SSL.lib.SSL_ForceHandshakeWithTimeout(this.fd, NSPR.lib.PR_SecondsToInterval(10));

  if (status == -1) {
    throw "Error completing SSL handshake!";
  }
};

ConvergenceSocket.prototype.available = function() {
  return NSPR.lib.PR_Available(this.fd);
};

ConvergenceSocket.prototype.writeBytes = function(buffer, length) {
  return NSPR.lib.PR_Write(this.fd, buffer, length);
};

// ConvergenceSocket.prototype.readBytes = function(buffer) {
//   var read   = NSPR.lib.PR_Read(this.fd, buffer, 4096);

//   if (read == -1) {
//     if (NSPR.lib.PR_GetError() == NSPR.lib.PR_WOULD_BLOCK_ERROR) {
//       return -1;
//     } else {
//       dump("Read error: " + NSPR.lib.PR_GetError() + "\n");
//       return 0;
//     }
//   }

//   return read;
// };

ConvergenceSocket.prototype.readString = function(length) {
  var buffer = new NSPR.lib.buffer(length);
  var read   = NSPR.lib.PR_Read(this.fd, buffer, length);

  if (read != length) { // Calling code always calls available() first.
    throw "Expected: " + length + " got: " + read;
  }

  return buffer.readString();
};

ConvergenceSocket.prototype.serialize = function() {
  return Serialization.serializePointer(this.fd);
};

ConvergenceSocket.prototype.close = function() {
  NSPR.lib.PR_Close(this.fd);
};