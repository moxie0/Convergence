
function ConvergenceNotarySocket(destinations, proxy) {
  if (typeof proxy == 'undefined' || proxy == null) {
    var multiConnector = new MultiDestinationConnector();
    this.connection    = multiConnector.makeConnection(destinations);
  } else {
    var proxyConnector = new ProxyConnector(proxy);
    this.connection    = proxyConnector.makeMultiConnection(destinations);
  }
}

ConvergenceNotarySocket.prototype.negotiateSSL = function() {
  return this.connection.negotiateSSL();
};

ConvergenceNotarySocket.prototype.available = function() {
  return this.connection.available();
};

ConvergenceNotarySocket.prototype.writeBytes = function(buffer, length) {
  return this.connection.writeBytes(buffer, length);
};

ConvergenceNotarySocket.prototype.readString = function(length) {
  return this.connection.readString(length);
};

ConvergenceNotarySocket.prototype.readFully = function(length) {
  return this.connection.readFully(length);
};

ConvergenceNotarySocket.prototype.close = function() {
  return this.connection.close();
};
