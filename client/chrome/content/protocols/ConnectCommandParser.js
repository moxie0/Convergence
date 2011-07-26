
function ConnectCommandParser(clientSocket) {
  this.wrappedJSObject = this;
  this.clientSocket    = clientSocket;
}

ConnectCommandParser.prototype.readHttpHeaders = function() {
  var headers = "";

  for (;;) {
    var count = this.clientSocket.available();
    var buf   = this.clientSocket.readString(count);

    headers  += buf;

    if (headers.indexOf("\r\n\r\n") != -1)
      return headers;
  }
};

ConnectCommandParser.prototype.parseDestination = function(httpHeaders) {
  if (httpHeaders.indexOf("CONNECT ") != 0) {
    throw "Not a connect request!";
  }

  var destination = httpHeaders.substring(8, httpHeaders.indexOf(" ", 9));
  var splitIndex  = destination.indexOf(":");

  if (splitIndex == -1) {
    throw "Not a well formatted destination: " + destination;
  }

  var endpoint  = new Object();
  endpoint.host = destination.substring(0, splitIndex);
  endpoint.port = parseInt(destination.substring(splitIndex+1));

  return endpoint;
};

ConnectCommandParser.prototype.getConnectDestination = function() {
  dump("Reading http headers...\n");
  httpHeaders = this.readHttpHeaders();

  dump("Read http headers: " + httpHeaders + "\n");
  return this.parseDestination(httpHeaders);
};

