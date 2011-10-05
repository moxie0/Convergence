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
 * Now that we have to operate in ChromeWorker land, this does nothing
 * but initialize the local ServerSocket, and maintain the nsIProxyInfo
 * instance that describes its address and port.
 *
 **/


function LocalProxy() {
  this.wrappedJSObject   = this;
  this.listenSocket      = null;
  this.proxyInfo         = null;

  this.constructListenSocket();
  this.initializeProxyInfo();
}

LocalProxy.prototype.getProxyInfo = function() {
  return this.proxyInfo;
};

LocalProxy.prototype.getListenSocket = function() {
  return this.listenSocket;
};

LocalProxy.prototype.constructListenSocket = function() {
    this.listenSocket = new ConvergenceListenSocket();  
};

LocalProxy.prototype.initializeProxyInfo = function() {
  var proxyService = Components.classes["@mozilla.org/network/protocol-proxy-service;1"].getService(Components.interfaces.nsIProtocolProxyService);
  this.proxyInfo   = proxyService.newProxyInfo("http", "localhost", this.listenSocket.listenPort, 1, 0, null);
};


