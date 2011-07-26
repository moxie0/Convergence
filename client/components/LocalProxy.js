// Copyright (c) 2010 Moxie Marlinspike <moxie@thoughtcrime.org>


// T modify it under the terms of the GNU General Public License as
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

function LocalProxy() {
  this.wrappedJSObject   = this;
  this.serverSocket      = null;
  this.proxyInfo         = null;

  this.constructServerSocket();
  this.initializeProxyInfo();
}

LocalProxy.prototype.getProxyInfo = function() {
  return this.proxyInfo;
};

LocalProxy.prototype.getServerSocket = function() {
  return this.serverSocket;
};

LocalProxy.prototype.constructServerSocket = function() {
    this.serverSocket = new ConvergenceServerSocket();  
};

LocalProxy.prototype.initializeProxyInfo = function() {
  var proxyService = Components.classes["@mozilla.org/network/protocol-proxy-service;1"].getService(Components.interfaces.nsIProtocolProxyService);
  this.proxyInfo   = proxyService.newProxyInfo("http", "localhost", this.serverSocket.listenPort, 1, 0, null);
};


