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
 * This class is responsible for listening for incoming connections.
 * It's what the "local proxy" uses to accept outbound connections
 * and MITM.
 *
 **/


function ConvergenceListenSocket(serialized) {
  if (typeof serialized != 'undefined') {
    this.fd         = Serialization.deserializeDescriptor(serialized[0]);
    this.address    = Serialization.deserializeAddress(serialized[1]);
    this.listenPort = this.address.port;

    dump("Restored FD: " + this.fd + "\n");
    dump("Restored Address: " + this.address + "\n");
  } else {
    var addr = NSPR.types.PRNetAddr();
    NSPR.lib.PR_SetNetAddr(NSPR.lib.PR_IpAddrLoopback, 
			   NSPR.lib.PR_AF_INET, 
			   0, addr.address());
    
    var fd     = NSPR.lib.PR_OpenTCPSocket(NSPR.lib.PR_AF_INET);
    var status = NSPR.lib.PR_Bind(fd, addr.address());
    
    if (status != 0)
      throw "ServerSocket failed to bind!";

    var status = NSPR.lib.PR_GetSockName(fd, addr.address());
    
    if (status != 0)
      throw "Unable to get socket information!";
    
    var status = NSPR.lib.PR_Listen(fd, -1);
    
    if (status != 0)
      throw "ServerSocket failed to listen!";

    this.fd         = fd;
    this.address    = addr;
    this.listenPort = NSPR.lib.PR_ntohs(this.address.port);

    dump("LISTEN PORT: " + this.listenPort + "\n");
  }
}

ConvergenceListenSocket.prototype.serialize = function() {
  return [Serialization.serializePointer(this.fd), 
	  Serialization.serializeAddress(this.address)];
};

ConvergenceListenSocket.prototype.accept = function() {
  var clientFd = NSPR.lib.PR_Accept(this.fd, this.address.address(), 
				    NSPR.lib.PR_INTERVAL_NO_TMEOUT);
  
  if (clientFd.isNull()) {
    throw "Failed accept()!";
  }
  
  return new ConvergenceServerSocket(clientFd);
};