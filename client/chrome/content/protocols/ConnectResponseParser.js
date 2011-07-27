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
 * This class is responsible for parsing an HTTP CONNECT response,
 * when communicating through an external HTTP proxy.
 *
 **/


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