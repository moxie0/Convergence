
importScripts("chrome://convergence/content/ctypes/NSPR.js",
	      "chrome://convergence/content/ctypes/NSS.js",
	      "chrome://convergence/content/ctypes/SSL.js",
	      "chrome://convergence/content/ctypes/SQLITE.js",
	      "chrome://convergence/content/ctypes/Serialization.js",
	      "chrome://convergence/content/sockets/ConvergenceSocket.js",
	      "chrome://convergence/content/sockets/ConvergenceDestinationSocket.js",	      
	      "chrome://convergence/content/protocols/ConnectCommandParser.js",
	      "chrome://convergence/content/protocols/ConnectResponseParser.js",
	      "chrome://convergence/content/protocols/HttpRequestBuilder.js",
	      "chrome://convergence/content/protocols/HttpParser.js",
	      "chrome://convergence/content/protocols/HttpProxyConnector.js",
	      "chrome://convergence/content/protocols/SOCKS5Connector.js",
	      "chrome://convergence/content/protocols/ProxyConnector.js",
	      "chrome://convergence/content/ssl/CertificateInfo.js",
	      "chrome://convergence/content/ssl/NotaryResponse.js",
	      "chrome://convergence/content/ssl/Notary.js",
	      "chrome://convergence/content/ssl/NativeCertificateCache.js",
	      "chrome://convergence/content/ssl/ActiveNotaries.js",
	      "chrome://convergence/content/ssl/CertificateManager.js");

function sendClientResponse(clientSocket, certificateManager, certificateInfo) {
  clientSocket.writeBytes(NSPR.lib.buffer("HTTP/1.0 200 OK\r\n\r\n"), 23);
  clientSocket.negotiateSSL(certificateManager, certificateInfo);
};

function checkCertificateValidity(certificateCache, activeNotaries, host, port, certificateInfo) {
  dump("Checking certificate cache: " + certificateInfo.sha1 + "\n");

  if (certificateCache.isCached(host, port, certificateInfo.sha1)) 
    return {'status' : true, 'details' : [{'notary' : 'Certificate Cache', 'status' : 1}]};

  dump("Not cached, checking notaries: " + certificateInfo.sha1 + "\n");
  var results = activeNotaries.checkValidity(host, port, certificateInfo);

  if (results['status'] == true) {
    dump("Caching notary result: " + certificateInfo.sha1 + "\n");
    certificateCache.cacheFingerprint(host, port, certificateInfo.sha1);
    return results;
  } else {
    return results;
  }  
};

onmessage = function(event) {
  dump("ConnectionWorker got message...\n");
  var clientSocket = null;
  var serverSocket = null;

  try {
    NSPR.initialize(event.data.nsprFile);
    NSS.initialize(event.data.nssFile);
    SSL.initialize(event.data.sslFile);
    SQLITE.initialize(event.data.sqliteFile);

    var certificateManager = new CertificateManager(event.data.certificates);
    var activeNotaries     = new ActiveNotaries(event.data.settings, event.data.notaries);
    clientSocket           = new ConvergenceSocket(null, event.data.clientSocket);
    var destination        = new ConnectCommandParser(clientSocket).getConnectDestination();
    serverSocket           = new ConvergenceDestinationSocket(destination.host, 
							       destination.port, 
							       event.data.proxy);
    var certificate        = serverSocket.negotiateSSL();
    var certificateInfo    = new CertificateInfo(certificate);
    var certificateCache   = new NativeCertificateCache(event.data.cacheFile, 
							event.data.settings['cacheCertificatesEnabled']);
    
    dump("Checking validity...\n");

    var results = this.checkCertificateValidity(certificateCache, activeNotaries,
						destination.host, destination.port,
						certificateInfo);

    if (results['status'] == false) {
      certificateInfo.commonName = new NSS.lib.buffer("Invalid Certificate");
      certificateInfo.altNames   = null;      
    }
    
    certificateInfo.encodeVerificationDetails(results.details);

    this.sendClientResponse(clientSocket, certificateManager, certificateInfo);

    postMessage({'clientFd' : Serialization.serializePointer(clientSocket.fd), 
    	         'serverFd' : Serialization.serializePointer(serverSocket.fd)});

    certificateCache.close();

    dump("ConnectionWorker moving on!\n");
  } catch (e) {
    dump("ConnectionWorker exception : " + e + " , " + e.stack + "\n");
    if (clientSocket != null) clientSocket.close();
    if (serverSocket != null) serverSocket.close();
  }
};