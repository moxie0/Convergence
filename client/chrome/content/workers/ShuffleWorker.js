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
 * This ChromeWorker is responsible for two things:
 *
 * 1) Listening to the ServerSocket FD for incoming connection requests,
 * which it then hands off to its parent.
 *
 * 2) Shuffling data between pairs of established SSL connections, 
 * effectively moving data across the MITM bridge.
 *
 * It is setup by the ConnectionManager in components.
 *
 **/

importScripts("chrome://convergence/content/ctypes/NSPR.js",
	      "chrome://convergence/content/ctypes/NSS.js",
	      "chrome://convergence/content/ctypes/SSL.js",
	      "chrome://convergence/content/sockets/ConvergenceSocket.js",
	      "chrome://convergence/content/sockets/ConvergenceServerSocket.js",
	      "chrome://convergence/content/ctypes/Serialization.js");

const TYPE_INITIALIZE = 1;
const TYPE_CONNECTION = 2;

function ShuffleWorker() {
  this.wakeup      = null;
  this.connections = new Array();
}

ShuffleWorker.prototype.initializeDescriptors = function() {
  var descriptors       = new Object();
  var connectionsLength = this.connections.length;
  var pollfds_t         = ctypes.ArrayType(NSPR.types.PRPollDesc);
  var pollfds           = new pollfds_t(connectionsLength + 2);

  for (var i=0;i<connectionsLength;i++) {
    pollfds[i].fd        = this.connections[i];
    pollfds[i].in_flags  = NSPR.lib.PR_POLL_READ | NSPR.lib.PR_POLL_EXCEPT | NSPR.lib.PR_POLL_ERR;
    pollfds[i].out_flags = 0;
  }

  pollfds[connectionsLength].fd        = this.wakeup;
  pollfds[connectionsLength].in_flags  = NSPR.lib.PR_POLL_READ;
  pollfds[connectionsLength].out_flags = 0;

  pollfds[connectionsLength + 1].fd        = this.serverSocket.fd;
  pollfds[connectionsLength + 1].in_flags  = NSPR.lib.PR_POLL_READ;
  pollfds[connectionsLength + 1].out_flags = 0;

  descriptors.pollfds           = pollfds;
  descriptors.connectionsLength = connectionsLength;

  return descriptors;
};

ShuffleWorker.prototype.initialize = function(data) {
  NSPR.initialize(data.nsprFile);
  NSS.initialize(data.nssFile);
  SSL.initialize(data.sslFile);

  this.buffer       = new NSPR.lib.buffer(4096);
  this.wakeup       = Serialization.deserializeDescriptor(data.fd);
  this.serverSocket = new ConvergenceServerSocket(data.serverSocket);
};

ShuffleWorker.prototype.addConnection = function(data) {
  var socketOption = NSPR.types.PRSocketOptionData({'option' : 0, 'value' : 1});
  var client       = Serialization.deserializeDescriptor(data.client);
  var server       = Serialization.deserializeDescriptor(data.server);

  NSPR.lib.PR_SetSocketOption(client, socketOption.address());
  NSPR.lib.PR_SetSocketOption(server, socketOption.address());

  this.connections.push(client);
  this.connections.push(server);
};

ShuffleWorker.prototype.shuffleIfReady = function(flags, fromIndex, toIndex) {
  if ((flags & NSPR.lib.PR_POLL_READ) > 0) {
    // dump("Shuffling from: "  + fromIndex + " to " + toIndex + "\n");
    var read = NSPR.lib.PR_Read(this.connections[fromIndex], this.buffer, 4095);
    
    if (read == -1) {
      if (NSPR.lib.PR_GetError() == NSPR.lib.PR_WOULD_BLOCK_ERROR) {
	return true;
      } else {
	dump("Read error: " + NSPR.lib.PR_GetError() + "\n");
	return false;
      }
    } else if (read == 0) {
      dump("ShuffleWorker: EOF!!!!\n");
      return false;
    }

    this.buffer[read] = 0x00;
    // dump("ShuffleWorker: " + this.buffer.readString() + "\n");
    
    NSPR.lib.PR_Write(this.connections[toIndex], this.buffer, read);
  }
  
  return true;
};

ShuffleWorker.prototype.isSocketClosed = function(flags) {
  return 
  ((flags & NSPR.lib.PR_POLL_EXCEPT) != 0) ||
  ((flags & NSPR.lib.PR_POLL_ERR) != 0)    ||
  ((flags & NSPR.lib.PR_POLL_NVAL) != 0);
};

ShuffleWorker.prototype.removeSocketPair = function(clientIndex, serverIndex) {
  NSPR.lib.PR_Close(this.connections[clientIndex]);
  NSPR.lib.PR_Close(this.connections[serverIndex]);

  this.connections.splice(clientIndex, 2);
};

ShuffleWorker.prototype.isWakeupEvent = function(flags) {
  if ((flags & NSPR.lib.PR_POLL_READ) != 0) {
    var amount = NSPR.lib.PR_Read(this.wakeup, this.buffer, 5);
    return true;
  }
  
  return false;
};

ShuffleWorker.prototype.isAcceptEvent = function(flags) {
  return (flags & NSPR.lib.PR_POLL_READ) != 0;
};

ShuffleWorker.prototype.handleAcceptEvent = function() {
  var clientSocket = this.serverSocket.accept();
  postMessage({'clientSocket' : clientSocket.serialize()});
};

ShuffleWorker.prototype.processConnections = function() {
  var descriptors       = this.initializeDescriptors();
  var pollfds           = descriptors.pollfds;
  var connectionsLength = descriptors.connectionsLength;

  while (NSPR.lib.PR_Poll(pollfds, pollfds.length, -1) != -1) {
    var modified = false;

    if (this.isWakeupEvent(pollfds[connectionsLength].out_flags)) {
      dump("Bailing out for wakeup...\n");
      return;
    }

    if (this.isAcceptEvent(pollfds[connectionsLength + 1].out_flags)) {
      dump("Handling accept event...\n");
      this.handleAcceptEvent();	
    }

    // dump("ConnectionsLength: " + connectionsLength + "\n");

    for (var i=connectionsLength-2;i>=0;i-=2) {
      // dump("Checking pair: " + i + " , " + (i+1) + "\n");
      if (this.isSocketClosed(pollfds[i].out_flags) ||
	  this.isSocketClosed(pollfds[i+1].out_flags)) 
      {
	dump("Detected socket closed...\n");
	this.removeSocketPair(i, i+1);
	modified = true;
      } else if (!this.shuffleIfReady(pollfds[i].out_flags, i, i+1)) {
	this.removeSocketPair(i, i+1);
	modified = true;
      } else if (!this.shuffleIfReady(pollfds[i+1].out_flags, i+1, i)) {
	this.removeSocketPair(i, i+1);
	modified = true;
      }
    }
    
    if (modified) {
      descriptors       = this.initializeDescriptors();
      pollfds           = descriptors.pollfds;
      connectionsLength = descriptors.connectionsLength;
    }
  }
};

var shuffleWorker = new ShuffleWorker();

onmessage = function(event) {
  try {
    switch (event.data.type) {
    case TYPE_INITIALIZE:
      dump("Initializing ShuffleWorker...\n");
      shuffleWorker.initialize(event.data);
      break;
    case TYPE_CONNECTION:
      dump("Adding ShuffleWorker connection...\n");
      shuffleWorker.addConnection(event.data);
      break;
    }

    shuffleWorker.processConnections();
    dump("ShuffleWorker complete!\n");
  } catch (e) {
    dump("ShuffleWorker exception: " + e + " , " + e.stack + "\n");
  }  
};