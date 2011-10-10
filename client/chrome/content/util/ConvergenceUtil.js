
function ConvergenceUtil() {

}

ConvergenceUtil.getTemporaryFile = function(basename) {
  var file = Components.classes["@mozilla.org/file/directory_service;1"]
             .getService(Components.interfaces.nsIProperties)
             .get("TmpD", Components.interfaces.nsIFile);

  file.append(basename);
  file.createUnique(Components.interfaces.nsIFile.NORMAL_FILE_TYPE, 0644);

  return file;
};

ConvergenceUtil.persistUrl = function(url, callback) {
  var ioService     = Components.classes["@mozilla.org/network/io-service;1"]  
                      .getService(Components.interfaces.nsIIOService);  
  var uri           = ioService.newURI(url, null, null);  
  var temporaryFile = ConvergenceUtil.getTemporaryFile("notary.tmp");      
  var wbp           = Components.classes['@mozilla.org/embedding/browser/nsWebBrowserPersist;1']
                      .createInstance(Components.interfaces.nsIWebBrowserPersist);
      
  wbp.progressListener = {
    onProgressChange: function(aWebProgress, aRequest, 
			       aCurSelfProgress, aMaxSelfProgress, 
			       aCurTotalProgress, aMaxTotalProgress) 
    {},
    onStateChange: function(aWebProgress, aRequest, aStateFlags, aStatus) {
      if ((aStateFlags & Components.interfaces.nsIWebProgressListener.STATE_STOP)) {
	callback(temporaryFile);
      }
    }
  }

  wbp.persistFlags &= ~Components.interfaces.nsIWebBrowserPersist.PERSIST_FLAGS_NO_CONVERSION | 
                       Components.interfaces.nsIWebBrowserPersist.PERSIST_FLAGS_BYPASS_CACHE;


  wbp.saveURI(uri, null, null, null, null, temporaryFile);
};