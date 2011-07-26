
function HttpRequestBuilder(host, port, fingerprint) {
  this.host        = host; 
  this.port        = port;
  this.fingerprint = fingerprint;
  dump("Constructed!\n");
}

HttpRequestBuilder.prototype.buildRequest = function() {
  dump("Building request!\n");

  postData = ("fingerprint=" + this.fingerprint)

  return "POST /target/" + this.host + "+" + this.port + " HTTP/1.0\r\n" +
  "Content-Type: application/x-www-form-urlencoded\r\n" +
  "Connection: close\r\n" +
  "Content-Length: " + postData.length + "\r\n\r\n" +
  postData;
  // return "GET /verify?host=" + this.host + 
  // "&port=" + this.port +
  // "&service_type=ssl&fingerprint=" + this.fingerprint +
  // " HTTP/1.0\r\n" +
  // "Connection: close\r\n\r\n";
};