
function HttpParser(socket) {
  var response      = this.readFully(socket);
  this.responseCode = this.parseResponseCode(response);
  this.responseBody = this.parseResponseBody(response);
}

HttpParser.prototype.getResponseCode = function() {
  return this.responseCode;
};

HttpParser.prototype.getResponseBody = function() {
  return this.responseBody;
};

HttpParser.prototype.getResponseBodyJson = function() {
  return JSON.parse(this.responseBody);
};

HttpParser.prototype.parseResponseBody = function(response) {
  var headerDelimeter = response.indexOf("\r\n\r\n");

  if (headerDelimeter == -1) {
    return "";
  }

  return response.substring(headerDelimeter+4);
};

HttpParser.prototype.parseResponseCode = function(response) {
  var firstLineDelimiter = response.indexOf("\r\n");

  if (firstLineDelimiter == -1) {
    return 500;
  }

  var firstLine = response.substring(0, firstLineDelimiter);
  var firstLineComponents = firstLine.split(" ");

  if (firstLineComponents[0].indexOf("HTTP") != 0) {
    return 500;
  }

  return parseInt(firstLineComponents[1]);
};

HttpParser.prototype.readFully = function(socket) {
  var response = "";
  var buf      = null;

  while ((buf = socket.readString()) != null) {
    response += buf;
    dump("Read: " + buf + "\n");
  }

  return response;
};