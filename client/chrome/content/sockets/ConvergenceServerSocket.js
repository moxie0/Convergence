
function ConvergenceServerSocket(serialized) {
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

ConvergenceServerSocket.prototype.serialize = function() {
  return [Serialization.serializePointer(this.fd), 
	  Serialization.serializeAddress(this.address)];
};

ConvergenceServerSocket.prototype.accept = function() {
  var clientFd = NSPR.lib.PR_Accept(this.fd, this.address.address(), 
				    NSPR.lib.PR_INTERVAL_NO_TMEOUT);
  
  if (clientFd.isNull()) {
    throw "Failed accept()!";
  }
  
  return new ConvergenceSocket(clientFd);
};