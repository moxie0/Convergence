
function NotaryProxyConnector() {

}

NotaryProxyConnector.prototype.makeConnection = function(clientSocket, destinations) {
  var request = 
  "CONNECT " + destinations[0].host + ":" + destinations[0].port + " HTTP/1.1\r\n" + 
  "Host: " + destinations[0].host + "\r\n";
  
  for (var i=1;i<destinations.length;i++) {
    request += ("X-Convergence-Notary: " + destinations[i].host + "+" + destinations[i].port + "\r\n");
  }
  
  request += "\r\n";

  dump("Sending bounce request: " + request + "\n");

  clientSocket.writeBytes(NSPR.lib.buffer(request), request.length);
  
  var headers = new ConnectResponseParser(clientSocket);
  
  if (headers.getResponseCode() != 200) {
    clientSocket.close();
    throw "Proxy connect failed! " + headers.getResponseCode();
  }
};