
function BaseProxyConnector(proxy) {
  this.proxy = proxy;
  var self = this;

  this.waitForConnection = function(clientSockets, destinations) {
    var pollfds_t   = ctypes.ArrayType(NSPR.types.PRPollDesc);
    var pollfds     = new pollfds_t(clientSockets.length);
    var activeCount = clientSockets.length;

    for (var i=0;i<pollfds.length;i++) {
      pollfds[i].fd        = clientSockets[i].fd;
      pollfds[i].in_flags  = NSPR.lib.PR_POLL_READ | NSPR.lib.PR_POLL_EXCEPT;
      pollfds[i].out_flags = 0;
    }

    while (true) {
      var eventCount = NSPR.lib.PR_Poll(pollfds, pollfds.length, 5000);

      if (eventCount == -1) {
        dump("BaseProxy Poll failed!\n");
        return -1;
      }

      if (eventCount == 0) {
        dump("BaseProxy Poll timeout!\n");
        return -1;
      }

      for (var i=0;i<pollfds.length;i++) {
        if (pollfds[i].out_flags != 0) {
          try {
            self.readMultiConnectResponse(clientSockets[i], destinations[i].host);
            return i;
          } catch (e) {
            dump("Got BaseProxy connection error...\n");
            if (--activeCount <= 0) {
              dump("All BaseProxy connections failed...\n");
              return -1;
            }
            pollfds[i].in_flags = 0;
          }
        }
      }
    }    
  };

  this.makeMultiConnection = function(destinations) {
    dump("Proxy host: " + self.proxy.host + " , port: " + self.proxy.port + "\n");
    var clientSockets = new Array();

    for (var i=0;i<destinations.length;i++) {
      dump("Sending connection request for: " + destinations[i].host + "\n");
      var clientSocket = new ConvergenceClientSocket(self.proxy.host, self.proxy.port, null);
      self.sendMultiConnectRequest(clientSocket, destinations[i].host, destinations[i].port);
      clientSockets[i] = clientSocket;
    }

    var readyIndex = self.waitForConnection(clientSockets, destinations);

    dump("Got connection: " + readyIndex + "\n");

    for (var i=0;i<clientSockets.length;i++) {
      if (readyIndex != i) {
        clientSockets[i].close();
      }
    }

    if (readyIndex != -1) return clientSockets[readyIndex];
    else                  throw "All SOCKS5 Connection failed!\n";    
  };

}