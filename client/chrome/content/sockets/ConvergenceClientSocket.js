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
 * This class is responsible for making an SSL connection to the
 * destination server the client is trying to reach.  This is the
 * first time we see the destination certificate, the validation of
 * which is what this entire game is about.
 *
 **/

function ConvergenceClientSocket(host, port, proxy, fd) {
  if (typeof fd != 'undefined') {
    this.fd = fd;
    return;
  }

  var addrInfo = NSPR.lib.PR_GetAddrInfoByName(proxy == null ? host : proxy.host, 
					       NSPR.lib.PR_AF_INET, 
					       NSPR.lib.PR_AI_ADDRCONFIG);

  if (addrInfo == null || addrInfo.isNull()) {
    throw "DNS lookup failed: " + NSPR.lib.PR_GetError() + "\n";
  }

  var netAddressBuffer = NSPR.lib.PR_Malloc(1024);
  var netAddress       = ctypes.cast(netAddressBuffer, NSPR.types.PRNetAddr.ptr);

  NSPR.lib.PR_EnumerateAddrInfo(null, addrInfo, 0, netAddress);
  NSPR.lib.PR_SetNetAddr(NSPR.lib.PR_IpAddrNull, NSPR.lib.PR_AF_INET, 
			 proxy == null ? port : proxy.port, netAddress);

  this.fd = NSPR.lib.PR_OpenTCPSocket(NSPR.lib.PR_AF_INET);

  if (this.fd == null) {
    throw "Unable to construct socket!\n";
  }

  var status = NSPR.lib.PR_Connect(this.fd, netAddress, NSPR.lib.PR_SecondsToInterval(5));

  if (status != 0) {
    NSPR.lib.PR_Free(netAddressBuffer);
    NSPR.lib.PR_FreeAddrInfo(addrInfo);
    NSPR.lib.PR_Close(this.fd);
    throw "Failed to connect to " + host + " : " + port + " -- " + NSPR.lib.PR_GetError();
  }

  if (proxy != null) {
    dump("Making proxied connection...\n");
    var proxyConnector = new ProxyConnector(proxy);
    proxyConnector.makeConnection(this, host, port);
  }

  NSPR.lib.PR_Free(netAddressBuffer);
  NSPR.lib.PR_FreeAddrInfo(addrInfo);

  this.host = host;
  this.port = port;  
}

function allGoodAuth(arg, fd, foo, bar) {
  return 0;
}

ConvergenceClientSocket.prototype.negotiateSSL = function() {
  this.fd              = SSL.lib.SSL_ImportFD(null, this.fd);
  var callbackFunction = SSL.types.SSL_AuthCertificate(allGoodAuth);
  var status           = SSL.lib.SSL_AuthCertificateHook(this.fd, callbackFunction, null);

  if (status == -1) {
    throw "Error setting auth certificate hook!";
  }

  var status = SSL.lib.SSL_ResetHandshake(this.fd, NSPR.lib.PR_FALSE);

  if (status == -1) {
    throw "Error resetting handshake!";
  }

  var status = SSL.lib.SSL_ForceHandshakeWithTimeout(this.fd, NSPR.lib.PR_SecondsToInterval(10));
  // var status = NSS.lib.SSL_ForceHandshake(this.fd);

  if (status == -1) {
    throw "SSL handshake failed!";
  }

  return SSL.lib.SSL_PeerCertificate(this.fd);
};

ConvergenceClientSocket.prototype.available = function() {
  return NSPR.lib.PR_Available(this.fd);
};

ConvergenceClientSocket.prototype.writeBytes = function(buffer, length) {
  return NSPR.lib.PR_Write(this.fd, buffer, length);
};

ConvergenceClientSocket.prototype.readString = function() {
  var buffer = new NSPR.lib.buffer(4096);
  var read   = NSPR.lib.PR_Read(this.fd, buffer, 4095);

  if (read <= 0) {
    return null;
  }

  buffer[read] = 0;
  return buffer.readString();
};

ConvergenceClientSocket.prototype.readFully = function(length) {
  var buffer = new NSPR.lib.buffer(length);
  var read   = NSPR.lib.PR_Read(this.fd, buffer, length);

  if (read != length) {
    throw "Assertion error on read fully (" + read + ", " + length + ")!";
  }

  return buffer;
};

ConvergenceClientSocket.prototype.close = function() {
  NSPR.lib.PR_Close(this.fd);
};