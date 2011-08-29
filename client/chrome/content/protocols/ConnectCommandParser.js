// Copyright (c) 2011 Moxie Marlinspike <moxie@thoughtcrime.org>
// This program is free software; you can redistribute it and/or
// modify it under the terms of the GNU General Public License as
// published by the Free Software Foundation; either version 3 of the
// License, or (at your option) any later version.

// This program is distributed in the hope that it will be useful, but
// WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the GNU
// General Public License for more details.

// You should have received a copy of the GNU General Public License
// along with this program; if not, write to the Free Software
// Foundation, Inc., 59 Temple Place, Suite 330, Boston, MA 02111-1307
// USA


/**
 * This class is responsible for parsing an HTTP CONNECT request,
 * which the local browser will send to us (the internal proxy server).
 * From here, we get the actual destination the client is trying to
 * connect to, and begin the MITM process.
 *
 **/


function ConnectCommandParser(clientSocket) {
  this.wrappedJSObject = this;
  this.clientSocket    = clientSocket;
}

ConnectCommandParser.prototype.readHttpHeaders = function() {
  var headers = "";

  for (;;) {
    var buf = this.clientSocket.readString();

    if (buf == null)
      throw "Socket closed while reading local HTTP CONNECT request.";

    headers  += buf;

    dump("Total headers: " + headers + "\n");
    
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

