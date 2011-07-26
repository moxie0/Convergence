const TYPE_INITIALIZE = 1;
const TYPE_CONNECTION = 2;

function ConnectionManager(serverSocket, nssFile, sslFile, nsprFile, sqliteFile, 
			   cacheFile, certificateManager, settingsManager) 
{
  this.certificateManager    = certificateManager;
  this.settingsManager       = settingsManager;
  this.nsprFile              = nsprFile;
  this.nssFile               = nssFile;
  this.sslFile               = sslFile;
  this.sqliteFile            = sqliteFile;
  this.cacheFile             = cacheFile;
  this.serverSocket          = serverSocket;
  this.proxyInfo             = null;
  this.buffer                = new NSPR.lib.buffer(5);

  this.workerFactory         = this.initializeWorkerFactory();
  this.shuffleWorker         = this.initializeShuffleWorker();
}

ConnectionManager.prototype.shutdown = function() {
  NSPR.lib.PR_Write(this.wakeupWrite, this.buffer, 5);
  this.shuffleWorker.terminate();
};

ConnectionManager.prototype.setProxyTunnel = function(proxyInfo) {
  if (proxyInfo == null) {
    this.proxyInfo = null;
    return;
  }

  this.proxyInfo = {'host' : proxyInfo.host,
		    'port' : proxyInfo.port,
		    'type' : proxyInfo.type};
};

ConnectionManager.prototype.initializeWorkerFactory = function() {
  return Components.classes["@mozilla.org/threads/workerfactory;1"]
  .createInstance(Components.interfaces.nsIWorkerFactory);
};

ConnectionManager.prototype.spawnConnection = function(clientSocket) {
  dump("Spawning connectionworker...\n");

  var worker            = this.workerFactory.newChromeWorker("chrome://convergence/content/workers/ConnectionWorker.js");
  var connectionManager = this;
  worker.onmessage      = function(event) {
    connectionManager.shuffleWorker.postMessage({'type' : TYPE_CONNECTION, 
      	                                         'client' : event.data.clientFd,
      	                                         'server' : event.data.serverFd});

    NSPR.lib.PR_Write(connectionManager.wakeupWrite, connectionManager.buffer, 5);
  };

  worker.postMessage({'nsprFile' : this.nsprFile.path, 
  	              'nssFile' : this.nssFile.path, 
	              'sslFile' : this.sslFile.path,
	              'sqliteFile' : this.sqliteFile.path,
	              'cacheFile' : this.cacheFile.path,
  	              'notaries' : this.settingsManager.getSerializedNotaryList(), 
  	              'clientSocket' : clientSocket, 
	              'settings' : this.settingsManager.getSerializedSettings(),
	              'proxy' : this.proxyInfo,
  	              'certificates' : this.certificateManager.serialize()});

  dump("Posted message to ConnectionWorker!\n");  
};

ConnectionManager.prototype.initializeShuffleWorker = function() {
  dump("Initializing shuffleworker...\n");
  this.wakeupRead  = NSPR.types.PRFileDesc.ptr(0);
  this.wakeupWrite = NSPR.types.PRFileDesc.ptr(0);
  
  var status = NSPR.lib.PR_CreatePipe(this.wakeupRead.address(), this.wakeupWrite.address());
  
  if (status == -1) {
    throw "Error constructing pipe!";
  }
  
  var connectionManager = this;
  var shuffleWorker     = this.workerFactory
  .newChromeWorker("chrome://convergence/content/workers/ShuffleWorker.js");

  shuffleWorker.onmessage = function(event) {
    dump("ShuffleWorker accepted connection: " + event.data.clientSocket + "\n");
    connectionManager.spawnConnection(event.data.clientSocket);
  };

  shuffleWorker.postMessage({'type' : TYPE_INITIALIZE, 
  	                     'fd' : Serialization.serializePointer(this.wakeupRead),
  	                     'serverSocket' : this.serverSocket.serialize(),
  	                     'nssFile' : this.nssFile.path,
	                     'sslFile' : this.sslFile.path,
  	                     'nsprFile' : this.nsprFile.path});

  return shuffleWorker;
};