function ConvergenceDestinationSocket(host, port, proxy) {
  var addrInfo = NSPR.lib.PR_GetAddrInfoByName(proxy == null ? host : proxy.host, 
					       NSPR.lib.PR_AF_INET, 
					       NSPR.lib.PR_AI_ADDRCONFIG);

  if (addrInfo == null || addrInfo.isNull()) {
    throw "DNS lookup failed: " + NSPR.lib.PR_GetError() + "\n";
  }

  var netAddressBuffer = NSPR.lib.PR_Malloc(1024);
  var netAddress       = ctypes.cast(netAddressBuffer, NSPR.types.PRNetAddr.ptr);

  NSPR.lib.PR_EnumerateAddrInfo(null, addrInfo, 0, netAddress);
  NSPR.lib.PR_SetNetAddr(NSPR.lib.PR_IpAddrNull, NSPR.lib.PR_AF_INET, 
			 proxy == null ? port : proxy.port, netAddress);

  this.fd = NSPR.lib.PR_OpenTCPSocket(NSPR.lib.PR_AF_INET);

  if (this.fd == null) {
    throw "Unable to construct socket!\n";
  }

  var status = NSPR.lib.PR_Connect(this.fd, netAddress, NSPR.lib.PR_SecondsToInterval(5));

  if (status != 0) {
    throw "Failed to connect to " + host + " : " + port + " -- " + NSPR.lib.PR_GetError();
  }

  if (proxy != null) {
    dump("Making proxied connection...\n");
    var proxyConnector = new ProxyConnector(proxy);
    proxyConnector.makeConnection(this, host, port);
  }

  NSPR.lib.PR_Free(netAddressBuffer);
  NSPR.lib.PR_FreeAddrInfo(addrInfo);

  this.host = host;
  this.port = port;  
}

function allGoodAuth(arg, fd, foo, bar) {
  return 0;
}

ConvergenceDestinationSocket.prototype.negotiateSSL = function() {
  this.fd              = SSL.lib.SSL_ImportFD(null, this.fd);
  var callbackFunction = SSL.types.SSL_AuthCertificate(allGoodAuth);
  var status           = SSL.lib.SSL_AuthCertificateHook(this.fd, callbackFunction, null);

  if (status == -1) {
    throw "Error setting auth certificate hook!";
  }

  var status = SSL.lib.SSL_ResetHandshake(this.fd, NSPR.lib.PR_FALSE);

  if (status == -1) {
    throw "Error resetting handshake!";
  }

  var status = SSL.lib.SSL_ForceHandshakeWithTimeout(this.fd, NSPR.lib.PR_SecondsToInterval(10));
  // var status = NSS.lib.SSL_ForceHandshake(this.fd);

  if (status == -1) {
    throw "SSL handshake failed!";
  }

  return SSL.lib.SSL_PeerCertificate(this.fd);
};

ConvergenceDestinationSocket.prototype.available = function() {
  return NSPR.lib.PR_Available(this.fd);
};

ConvergenceDestinationSocket.prototype.writeBytes = function(buffer, length) {
  return NSPR.lib.PR_Write(this.fd, buffer, length);
};

ConvergenceDestinationSocket.prototype.readString = function() {
  var buffer = new NSPR.lib.buffer(4096);
  var read   = NSPR.lib.PR_Read(this.fd, buffer, 4095);

  if (read <= 0) {
    return null;
  }

  buffer[read] = 0;
  return buffer.readString();
};

ConvergenceDestinationSocket.prototype.readFully = function(length) {
  var buffer = new NSPR.lib.buffer(length);
  var read   = NSPR.lib.PR_Read(this.fd, buffer, length);

  if (read != length) {
    throw "Assertion error on read fully (" + read + ", " + length + ")!";
  }

  return buffer;
};

ConvergenceDestinationSocket.prototype.close = function() {
  NSPR.lib.PR_Close(this.fd);
};