
function DatabaseHelper(path) {
  var storageService = Components.classes["@mozilla.org/storage/service;1"]  
                       .getService(Components.interfaces.mozIStorageService);  
  this.database      = storageService.openDatabase(path);
};

DatabaseHelper.prototype.close = function() {
  this.database.close();
};

DatabaseHelper.prototype.initialize = function() {
  if (!this.database.tableExists("fingerprints")) {
    this.database.executeSimpleSQL("CREATE TABLE fingerprints "                  + 
				   "(id integer primary key, location TEXT, "    + 
				   "fingerprint TEXT, timestamp INTEGER)");
  }

  if (!this.database.indexExists("location_fingerprint")) {
    this.database.executeSimpleSQL("DELETE FROM fingerprints WHERE id NOT IN " + 
				   "(SELECT id FROM fingerprints GROUP BY location, fingerprint)");
    this.database.executeSimpleSQL("CREATE UNIQUE INDEX location_fingerprint ON fingerprints(location, fingerprint)");
  }
};