/*
 * Copyright (c) 2011 Moxie Marlinspike
 *
 * This program is free software; you can redistribute it and/or
 * modify it under the terms of the GNU General Public License as
 * published by the Free Software Foundation; either version 2 of the
 * License, or (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful, but
 * WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the GNU
 * General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program; if not, write to the Free Software
 * Foundation, Inc., 59 Temple Place, Suite 330, Boston, MA 02111-1307
 * USA
 */

function SOCKS5Server(clientSocket) {
  this.clientSocket = clientSocket;
}

SOCKS5Server.prototype.readHello = function() {
  var hello = this.clientSocket.readFully(2);

  if (hello[0] != 0x05)
    throw "Connect request is not SOCKS5!";

  var methodCount = hello[1];
  var methods     = this.clientSocket.readFully(methodCount);

  dump("Read: " + methodCount + " methods...\n");

  var response = new NSPR.lib.unsigned_buffer(2);
  response[0]  = 0x05;
  response[1]  = 0x00;

  this.clientSocket.writeBytes(response, 2);
};

SOCKS5Server.prototype.readDestination = function(type) {
  if (type == 0x03) {
    var destinationLength = this.clientSocket.readFully(1);
    var destination       = this.clientSocket.readFully(destinationLength[0]).readString();

    return destination;
  } else {
    throw "Got non-domain destination type!";
  }
};

SOCKS5Server.prototype.readPort = function() {
  var portBytes = this.clientSocket.readFully(2);
  var port      = ctypes.cast(portBytes, ctypes.uint16_t);
  port          = NSPR.lib.PR_ntohs(port);

  return port;
};

SOCKS5Server.prototype.readRequest = function() {
  var header = this.clientSocket.readFully(4);
  
  if (header[0] != 0x05)
    throw "Got SOCKS connect request for non-5!";

  if (header[1] != 0x01)
    throw "Got SOCKS5 connect request for strange command!";

  var destination = this.readDestination(header[3]);
  var port        = this.readPort();

  dump("SOCKS parsed: " + destination + ":" + port + "\n");

  var endpoint    = new Object();
  endpoint.host   = destination;
  endpoint.port   = port;
  
  return endpoint;
};

SOCKS5Server.prototype.getConnectDestination = function() {
  this.readHello();
  return this.readRequest();
};

SOCKS5Server.prototype.sendConnectedResponse = function() {
  var response = NSPR.lib.unsigned_buffer(10);
  response[0] = 0x05;
  response[1] = 0x00;
  response[2] = 0x00;
  response[3] = 0x01;

  response[4] = 0x00;
  response[5] = 0x00;
  response[6] = 0x00;
  response[7] = 0x00;

  response[8] = 0x00;
  response[9] = 0x00;

  clientSocket.writeBytes(response, 10);
};