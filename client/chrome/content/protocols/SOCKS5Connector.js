function SOCKS5Connector() {

}

SOCKS5Connector.prototype.sendClientHello = function(proxySocket) {
  var clientHello = [String.fromCharCode(0x05), String.fromCharCode(0x01), String.fromCharCode(0x00)];
  proxySocket.writeBytes(NSPR.lib.buffer(clientHello.join('')), 3);
};

SOCKS5Connector.prototype.readServerHello = function(proxySocket) {
  var serverHello = proxySocket.readFully(2);

  // if (serverHello.charCodeAt(1) == 255) 
  if (serverHello[1] == 0xFF)
    throw "Server requires authentication, which we don't support!";
};

SOCKS5Connector.prototype.sendConnectRequest = function(proxySocket, host, port) {
  dump("Sending connect request for: " + host + ":" + port + "\n");
  var request = [String.fromCharCode(0x05), String.fromCharCode(0x01),
		 String.fromCharCode(0x00), String.fromCharCode(0x03),
		 String.fromCharCode(host.length)];

  var status = proxySocket.writeBytes(NSPR.lib.buffer(request.join('')), 5);

  dump("Wrote byets: " + status + "\n");
  var status = proxySocket.writeBytes(NSPR.lib.buffer(host), host.length);
  dump("Wrote bytes: " + status + "\n");

  // var portType = ctypes.ArrayType(ctypes.uint8_t);
  // var portPtr  = portType([((port >> 8) & 0xFF), (port & 0xFF)]);
  // var portPtr = new ctypes.ArrayType(ctypes.uint8_t, 2);
  // portPtr[0]  = ;
  // portPtr[1]  = ;

  var portBytes = [ctypes.unsigned_char((port >> 8) & 0xFF), ctypes.unsigned_char(port & 0xFF)];
  // var portBytes = [String.fromCharCode((port) & 0xFF), String.fromCharCode((port >> 8) & 0xFF)];
  // var buffer = NSPR.lib.buffer(portBytes.join(''));
  
  // dump("Port bytes: " + portBytes[0] + "," + portBytes[1] + "\n");
  // dump("Buffer: " + portPtr + "\n");
  var status = proxySocket.writeBytes(NSPR.lib.unsigned_buffer(portBytes), 2);
  dump("Wrote bytes: " + status + "\n");
};

SOCKS5Connector.prototype.readConnectResponse = function(proxySocket, host) {
  var response = proxySocket.readFully(4);

  dump("Got response: " + response[1] + "\n");

  // if (response.charCodeAt(1) != 0) 
  if (response[1] != 0x00)
    throw "SOCKS Proxy denied connection request (" + response[1] + ")!";

  // if (response.charCodeAt(3) == 1) {
  if (response[3] == 0x01) {
    proxySocket.readFully(6);
  // } else if (response.charCodeAt(3) == 4) {
  } else if (response[3] == 0x04) {
    proxySocket.readFully(18);
  // } else if (response.charCodeAt(3) == 3) {
  } else if (response[3] == 0x03) {
    var domainLength = proxySocket.readFully(1);
    // domainLength     = domainLength.charCodeAt(0);
    domainLength     = ctypes.cast(domainLength[0], ctypes.int32_t);
    proxySocket.readFully(domainLength+2);
  } else {
    throw "Unknown address type in socks connect response.";
  }
};

SOCKS5Connector.prototype.makeConnection = function(proxySocket, host, port) {
  dump("Making SOCKS5 proxy connection...\n");

  this.sendClientHello(proxySocket);
  this.readServerHello(proxySocket)
  this.sendConnectRequest(proxySocket, host, port)
  this.readConnectResponse(proxySocket, host);

  return proxySocket;
};