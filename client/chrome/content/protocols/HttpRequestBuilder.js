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
 * This class builds a Notary HTTP request. It's probably misnamed.
 *
 **/


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
};