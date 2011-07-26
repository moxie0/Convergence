
function HttpProxyConnector() {
  
}

HttpProxyConnector.prototype.makeConnection = function(proxySocket, host, port) {
  dump("Making HTTP proxy connection...\n");

  var request = 
  "CONNECT " + host + ":" + port + " HTTP/1.1\r\n" + 
  "Host: " + host + "\r\n\r\n";

  proxySocket.writeBytes(NSPR.lib.buffer(request), request.length);

  var headers = new ConnectResponseParser(proxySocket);
  
  if (headers.getResponseCode() != 200) {
      throw "Proxy connect failed! " + headers.getResponseCode();
  }

  return proxySocket;
};