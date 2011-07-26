
function ConnectResponseParser(convergenceSocket) {
  this.convergenceSocket = convergenceSocket;
  
  var headers       = this.readHeaders();
  this.responseCode = this.parseResponseCode(headers);
}

ConnectResponseParser.prototype.getResponseCode = function() {
  return this.responseCode;
};

ConnectResponseParser.prototype.parseResponseCode = function(response) {
  var firstLineDelimiter = response.indexOf("\r\n");

  if (firstLineDelimiter == -1) {
    return 500;
  }

  var firstLine           = response.substring(0, firstLineDelimiter);
  var firstLineComponents = firstLine.split(" ");

  if (firstLineComponents[0].indexOf("HTTP") != 0) {
    return 500;
  }

  return parseInt(firstLineComponents[1]);
};


ConnectResponseParser.prototype.readHeaders = function() {
  var headers = "";
  var buf     = null;

  while ((buf = this.convergenceSocket.readString()) != null) {
    headers += buf;

    if (headers.indexOf("\r\n\r\n") != -1) {
      return headers;
    }
  }

  return headers;
};