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
 * This class is responsible for the logic required to initiate a tunnel
 * through an external HTTP proxy.
 *
 **/


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
    proxySocket.close();
    throw "Proxy connect failed! " + headers.getResponseCode();
  }

  return proxySocket;
};