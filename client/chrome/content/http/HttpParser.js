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
 * This class is responsible for parsing a normal HTTP response.
 * It is used, for instance, to parse the HTTP response a Notary
 * returns.
 *
 **/


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
  var length   = null;

  while ((buf = socket.readString(length)) != null) {
    response += buff;

    // Try to limit reads according to content-length header
    if (length != null) length -= buff.length;
    else {
      var headers_end = response.indexOf('\r\n\r\n');
      if (headers_end != -1) {
        var match = /(^|\r\n)content-length:\s+(\d+)\r\n/i
          .exec(response.substring(0, headers_end+2));
        if (match) {
          length = (headers_end + 4 + parseInt(match[2])) - response.length;
        }
      }
    }
  }

  return response;
};
