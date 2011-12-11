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
 * This XPCOM Component is the main entrypoint for the convergence
 * backend processing.  This initializes the backend system (registers
 * the local proxy, sets up the local CA certificate, initializes the
 * database, etc...) and then dispatches outgoing HTTPS requests to the
 * local proxy.
 *
 **/

Components.utils.import("resource://gre/modules/XPCOMUtils.jsm");
Components.utils.import("resource://gre/modules/ctypes.jsm");

function Convergence() { 
  try {
    this.wrappedJSObject = this;
    this.initializeCtypes();

    this.initializeSettingsManager();
    this.initializeCertificateManager();
    this.initializeCertificateCache();

    this.initializeLocalProxy();
    this.initializeConnectionManager();
    this.initializeRegularExpressions();
    this.registerProxyObserver();
    this.registerObserverService();

    this.initializeNotaryUpdateTimer(false);
    dump("Convergence Setup Complete.\n");
  } catch (e) {
    dump("Initializing error: " + e + " , " + e.stack + "\n");
  }
}

Convergence.prototype = {
  classDescription:   "Convergence Javascript Component",
  classID:            Components.ID("{ec13aa86-9da1-41f0-b37e-331a0435fb18}"),
  contractID:         "@thoughtcrime.org/convergence;1",
  QueryInterface:     XPCOMUtils.generateQI([Components.interfaces.nsIClassInfo]),
  extensionVersion:   "0.0",
  enabled:            true, 
  localProxy:         null,
  flags:              Components.interfaces.nsIClassInfo.THREADSAFE,
  nsprFile:           null,
  nssFile:            null,
  sslFile:            null,
  sqliteFile:         null,
  cacheFile:          null,
  certificateManager: null,
  rfc1918:            null,
  timer:              Components.classes["@mozilla.org/timer;1"].createInstance(Components.interfaces.nsITimer),

  initializeCtypes: function() {
    try {
      Components.utils.import("resource://gre/modules/Services.jsm");
      Components.utils.import("resource://gre/modules/ctypes.jsm");

      this.nsprFile = Services.dirsvc.get("GreD", Components.interfaces.nsILocalFile);
      this.nsprFile.append(ctypes.libraryName("nspr4"));

      this.nssFile = Services.dirsvc.get("GreD", Components.interfaces.nsILocalFile);
      this.nssFile.append(ctypes.libraryName("nss3"));

      this.sslFile = Services.dirsvc.get("GreD", Components.interfaces.nsILocalFile);
      this.sslFile.append(ctypes.libraryName("ssl3"));

      this.sqliteFile = Services.dirsvc.get("GreD", Components.interfaces.nsILocalFile);
      this.sqliteFile.append(ctypes.libraryName("mozsqlite3"));

      NSPR.initialize(this.nsprFile.path);
      NSS.initialize(this.nssFile.path);
      SSL.initialize(this.sslFile.path);
      SQLITE.initialize(this.sqliteFile.path);
    } catch (e) {
      dump("Error initializing ctypes: " + e + ", " + e.stack + "\n");
      throw e;
    }
  },

  initializeConnectionManager : function() {
    if (this.certificateManager != null) {
      this.connectionManager = new ConnectionManager(this.localProxy.getListenSocket(),
						     this.nssFile,
						     this.sslFile,
						     this.nsprFile,
						     this.sqliteFile,
						     this.cacheFile,
						     this.certificateManager,
						     this.settingsManager);
    }
  },

  initializeRegularExpressions: function() {
    this.rfc1918 = new RegExp("(^10\\.\\d{1,3}\\.\\d{1,3}\\.\\d{1,3}$)|" +
			      "(^172\\.1[6-9]\\.\\d{1,3}\\.\\d{1,3}$)|"  +
			      "(^172\\.2[0-9]\\.\\d{1,3}\\.\\d{1,3}$)|"  +
			      "(^172\\.3[0-1]\\.\\d{1,3}\\.\\d{1,3}$)|"  +
			      "(^192\\.168\\.\\d{1,3}\\.\\d{1,3}$)");
  },
  
  initializeLocalProxy: function() {
    this.localProxy = new LocalProxy();
  },

  initializeSettingsManager: function() {
    try {
      this.settingsManager   = new SettingsManager();
      this.enabled           = this.settingsManager.isEnabled();
    } catch (e) {
      dump("Error initializing notary manager: " + e + "\n");
      throw e;
    }
  },

  initializeCertificateManager: function() {
    dump("Configuring cache...\n");
    SSL.lib.SSL_ConfigServerSessionIDCache(1000, 60, 60, null); 

    try {
      this.certificateManager = new CertificateManager();
    } catch (e) {
      dump("User declined password entry, disabling convergence...\n");
      this.certificateManager = null;
      this.enabled            = false;
      return false;
    }
    
    if (this.certificateManager.needsReboot) {
      Components.classes["@mozilla.org/toolkit/app-startup;1"].getService(Components.interfaces.nsIAppStartup)
      .quit(Components.interfaces.nsIAppStartup.eRestart | Components.interfaces.nsIAppStartup.eAttemptQuit);
    }

    return true;
  },

  initializeCertificateCache: function() {
    this.cacheFile = Components.classes["@mozilla.org/file/directory_service;1"]  
    .getService(Components.interfaces.nsIProperties)  
    .get("ProfD", Components.interfaces.nsIFile);  
  
    this.cacheFile.append("convergence.sqlite");

    var databaseHelper = new DatabaseHelper(this.cacheFile);

    databaseHelper.initialize();
    databaseHelper.close();
  },

  initializeNotaryUpdateTimer: function(reschedule) {
    var prefs = Components.classes["@mozilla.org/preferences-service;1"]
                .getService(Components.interfaces.nsIPrefService)
                .getBranch("extensions.convergence.");

    var updateBundleTime = 0;

    try {
      if (!reschedule)
	updateBundleTime = parseInt(prefs.getCharPref("updateBundleTime"));
    } catch (e) {}

    if (updateBundleTime == 0) {
      updateBundleTime = Date.now() + (24 * 60 * 60 * 1000) + Math.floor((Math.random() * (12 * 60 * 60 *1000)));
      // updateBundleTime = Date.now() + 10000;
      prefs.setCharPref("updateBundleTime", updateBundleTime + "");
    }

    var difference = Math.max(1, updateBundleTime - Date.now());
    this.timer.init(this, difference, 0);

    dump("Timer will fire in: " + difference + "\n");
  },

  setEnabled: function(value) {
    if (value && (this.certificateManager == null)) {      
      if (this.initializeCertificateManager())
	this.initializeConnectionManager();
      else 
	return;
    }

    this.enabled = value;
    this.settingsManager.setEnabled(value);
    this.settingsManager.savePreferences();
  },

  isEnabled: function() {
    return this.enabled;
  },

  getNewNotary: function() {
    return new Notary();
  },

  getNewNotaryFromBundle: function(bundlePath) {
    return Notary.constructFromBundle(bundlePath);
  },

  getSettingsManager: function() {
    return this.settingsManager;
  },

  getCertificateManager: function() {
    return this.certificateManager;
  },

  getCertificateCache: function() {
    return this.certificateCache;
  },

  registerObserverService: function() {
    var observerService = Components.classes["@mozilla.org/observer-service;1"]
    .getService(Components.interfaces.nsIObserverService);
    observerService.addObserver(this, "quit-application", false);
    observerService.addObserver(this, "network:offline-status-changed", false);
    observerService.addObserver(this, "convergence-notary-updated", false);
  },

  registerProxyObserver: function() {
    var protocolService = Components.classes["@mozilla.org/network/protocol-proxy-service;1"]
    .getService(Components.interfaces.nsIProtocolProxyService);

    protocolService.unregisterFilter(this);
    protocolService.registerFilter(this, 9999);
  },

  observe: function(subject, topic, data) {
    if (topic == 'quit-application') {
      dump("Got application shutdown request...\n");
      if (this.connectionManager != null)
	this.connectionManager.shutdown();      
    } else if (topic == 'network:offline-status-changed') {
      if (data == 'online') {
	dump("Got network state change, shutting down listensocket...\n");
	if (this.connectionManager != null)
	  this.connectionManager.shutdown();
	dump("Initializing listensocket...\n");
	this.initializeConnectionManager();
      }
    } else if (topic == 'timer-callback') {
      dump("Got timer update...\n");
      this.handleNotaryUpdates();
    } else if (topic == 'convergence-notary-updated') {
      dump("Got update callback...\n");
      this.settingsManager.savePreferences();
    }
  },

  handleNotaryUpdates: function() {
    var notaries = this.settingsManager.getNotaryList();
    
    for (var i in notaries) {
      notaries[i].update();
    }

    this.initializeNotaryUpdateTimer(true);
  },

  isNotaryUri: function(uri) {
    var notaries = this.settingsManager.getNotaryList();
    var uriPort  = uri.port;

    if (uriPort == -1)
      uriPort = 443;

    for (var i in notaries) {
      if ((notaries[i].host == uri.host) && 
	  ((notaries[i].httpPort == uriPort) || 
	   (notaries[i].sslPort == uriPort)))
      {
	return true;
      }
    }

    return false;
  },

  isWhitelisted: function(uri) {
    return uri.host == "localhost"        ||
           uri.host == "127.0.0.1"        ||
           uri.host == "aus3.mozilla.org" ||
           (this.settingsManager.getPrivateIpExempt() && 
	    this.rfc1918.test(uri.host));
  },
  
  applyFilter : function(protocolService, uri, proxy) {
    if (!this.enabled)
      return proxy;

    if ((uri.scheme == "https") && (!this.isNotaryUri(uri)) && (!this.isWhitelisted(uri))) {
      this.connectionManager.setProxyTunnel(proxy);

      return this.localProxy.getProxyInfo();
    } else {
      return proxy;
    }
  },

  getInterfaces: function(countRef) {
    var interfaces = [Components.interfaces.nsIClassInfo];
    countRef.value = interfaces.length;
    return interfaces;
  },

  getHelperForLanguage: function getHelperForLanguage(aLanguage) {
    return null;
  },

  getNativeCertificateCache: function() {
    return new NativeCertificateCache(this.cacheFile.path, this.settingsManager.getCacheCertificates());
  },

};

var components = [Convergence];

/**
 * XPCOMUtils.generateNSGetFactory was introduced in Mozilla 2 (Firefox 4).
 * XPCOMUtils.generateNSGetModule is for Mozilla 1.9.2 (Firefox 3.6).
 */
if (XPCOMUtils.generateNSGetFactory)
  var NSGetFactory = XPCOMUtils.generateNSGetFactory(components);
else
  var NSGetModule = XPCOMUtils.generateNSGetModule(components);

/** Component Loading **/

var loadScript = function(isChrome, subdir, filename) {
  try {
    var path = __LOCATION__.parent.clone();

    if (isChrome) {
      path = path.parent.clone();
      path.append("chrome");
      path.append("content");
    }

    if (subdir != null) {
      path.append(subdir);      
    }

    path.append(filename);

    dump("Loading: " + path.path + "\n");

    var fileProtocol = Components.classes["@mozilla.org/network/protocol;1?name=file"]
    .getService(Components.interfaces["nsIFileProtocolHandler"]);
    var loader       = Components.classes["@mozilla.org/moz/jssubscript-loader;1"]
    .getService(Components.interfaces["mozIJSSubScriptLoader"]);
        
    loader.loadSubScript(fileProtocol.getURLSpecFromFile(path));

    dump("Loaded!\n");
  } catch (e) {
    dump("Error loading component script: " + path.path + " : " + e + " , " + e.stack + "\n");
  }
};

loadScript(true, "ctypes", "NSPR.js");
loadScript(true, "ctypes", "NSS.js");
loadScript(true, "ctypes", "SSL.js");
loadScript(true, "ctypes", "SQLITE.js");

loadScript(true, "sockets", "ConvergenceListenSocket.js");
loadScript(true, "sockets", "ConvergenceClientSocket.js");
loadScript(true, "sockets", "ConvergenceServerSocket.js");
loadScript(true, "ctypes", "Serialization.js");
loadScript(true, "ssl", "CertificateManager.js");
loadScript(true, "ssl", "CertificateInfo.js");
loadScript(true, "proxy", "HttpProxyServer.js");

loadScript(false, null, "LocalProxy.js");

loadScript(true, "ssl", "PhysicalNotary.js");
loadScript(true, "ssl", "Notary.js");
loadScript(false, null, "SettingsManager.js");
loadScript(false, null, "ConnectionManager.js");
loadScript(true, "ssl", "NativeCertificateCache.js");
loadScript(false, null, "DatabaseHelper.js");
loadScript(true, "util", "ConvergenceUtil.js");