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
  var pollfds_t = ctypes.ArrayType(NSPR.types.PRPollDesc);
  var pollfds   = new pollfds_t(this.connections.length + 2);

  for (var i in this.connections) {
    pollfds[i].fd        = this.connections[i];
    pollfds[i].in_flags  = NSPR.lib.PR_POLL_READ | NSPR.lib.PR_POLL_EXCEPT | NSPR.lib.PR_POLL_ERR;
    pollfds[i].out_flags = 0;
  }

  pollfds[this.connections.length].fd        = this.wakeup;
  pollfds[this.connections.length].in_flags  = NSPR.lib.PR_POLL_READ;
  pollfds[this.connections.length].out_flags = 0;

  pollfds[this.connections.length + 1].fd        = this.serverSocket.fd;
  pollfds[this.connections.length + 1].in_flags  = NSPR.lib.PR_POLL_READ;
  pollfds[this.connections.length + 1].out_flags = 0;

  return pollfds;
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
    var read = NSPR.lib.PR_Read(this.connections[fromIndex], this.buffer, 4096);
    
    if (read == -1) {
      if (NSPR.lib.PR_GetError() == NSPR.lib.PR_WOULD_BLOCK_ERROR) {
	return true;
      } else {
	dump("Read error: " + NSPR.lib.PR_GetError() + "\n");
	return false;
      }
    } else if (read == 0) {
      return false;
    }
    
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
  return this.initializeDescriptors();
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
  var pollfds     = this.initializeDescriptors();
  var changeCount = 0;

  while (NSPR.lib.PR_Poll(pollfds, pollfds.length, -1) != -1) {

      if (this.isWakeupEvent(pollfds[this.connections.length].out_flags)) {
	dump("Bailing out for wakeup...\n");
	return;
      }

      if (this.isAcceptEvent(pollfds[this.connections.length + 1].out_flags)) {
	dump("Handling accept event...\n");
	this.handleAcceptEvent();	
      }

      var i;

      for (i=0;i<this.connections.length;i+=2) {
	if (this.isSocketClosed(pollfds[i].out_flags) ||
	    this.isSocketClosed(pollfds[i+1].out_flags)) 
	{
	  dump("Detected socket closed...\n");
	  pollfds = this.removeSocketPair(i, i+1);
	  continue;
	}

	if (!this.shuffleIfReady(pollfds[i].out_flags, i, i+1)) {
	  pollfds = this.removeSocketPair(i, i+1);
	  continue;
	}

	if (!this.shuffleIfReady(pollfds[i+1].out_flags, i+1, i)) {
	  pollfds = this.removeSocketPair(i, i+1);
	  continue;
	}
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