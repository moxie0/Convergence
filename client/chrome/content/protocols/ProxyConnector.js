
function ProxyConnector(proxyInfo) {
  this.type = proxyInfo.type;
  this.host = proxyInfo.host;
  this.port = proxyInfo.port;
}

ProxyConnector.prototype.makeConnection = function(destinationSocket, host, port) {
  if (this.type == "http") {
    var proxyConnector = new HttpProxyConnector();
    proxyConnector.makeConnection(destinationSocket, host, port);
  } else if (this.type == "socks") {
    var proxyConnector = new SOCKS5Connector();
    proxyConnector.makeConnection(destinationSocket, host, port);
  } else {
    throw "Unsupported proxy type: " + this.type;
  }

  return destinationSocket;
};