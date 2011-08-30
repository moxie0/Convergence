
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
 * This class is responsible for maintaing the local cache of certificates
 * we've seen and approved.  It currently stores this information in a
 * local sqlite database.
 *
 **/


function NativeCertificateCache(cacheLocation, useCache) {
  dump("Initializing certificate cache...\n");
  this.useCache   = useCache;
  this.connection = SQLITE.types.sqlite3.ptr(0);

  var status = SQLITE.lib.sqlite3_open(SQLITE.lib.buffer(cacheLocation), 
				       this.connection.address());

  if (status != SQLITE.lib.SQLITE_OK) {
    throw "Unable to open database at: " + cacheLocation;
  }
}

NativeCertificateCache.prototype.close = function() {
  SQLITE.lib.sqlite3_close(this.connection);  
};

NativeCertificateCache.prototype.cacheFingerprint = function(host, port, fingerprint) {
  if (!this.useCache)
    return;

  var insertStatement = "INSERT INTO fingerprints (location, fingerprint, timestamp) " + 
                        "VALUES (?, ?, ?)";
  var preparedStatement = SQLITE.types.sqlite3_stmt.ptr(0);
  var unused            = ctypes.char.ptr(0);
  var destination       = host + ":" + port;
  var staticData        = SQLITE.types.bind_free_function.ptr(0);

  var status = SQLITE.lib.sqlite3_prepare_v2(this.connection, SQLITE.lib.buffer(insertStatement),
					     -1, preparedStatement.address(), unused.address());

  if (status != SQLITE.lib.SQLITE_OK) {
    throw "Unable to create prepared statement: " + status;
  }

  var status = SQLITE.lib.sqlite3_bind_text(preparedStatement, 1, 
					    SQLITE.lib.buffer(destination), 
					    -1, staticData);

  if (status != SQLITE.lib.SQLITE_OK) {
    throw "Unable to bind destination param: " + status;
  }

  var status = SQLITE.lib.sqlite3_bind_text(preparedStatement, 2, 
					    SQLITE.lib.buffer(fingerprint), 
					    -1, staticData);

  if (status != SQLITE.lib.SQLITE_OK) {
    throw "Unable to bind fingerprint param: " + status;
  }

  var status = SQLITE.lib.sqlite3_bind_int64(preparedStatement, 3,
					     new Date().getTime());

  if (status != SQLITE.lib.SQLITE_OK) {
    throw "Unable to bind timestamp param: " + status;
  }

  SQLITE.lib.sqlite3_step(preparedStatement);
  SQLITE.lib.sqlite3_finalize(preparedStatement);
};

NativeCertificateCache.prototype.isCached = function(host, port, fingerprint) {
  if (!this.useCache) {
    dump("Ignoring cache...\n");
    return false;
  }

  var queryStatement    = "SELECT * FROM fingerprints WHERE location = ? AND fingerprint = ?";  
  var preparedStatement = SQLITE.types.sqlite3_stmt.ptr(0);
  var unused            = ctypes.char.ptr(0);
  var destination       = host + ":" + port;
  var staticData        = SQLITE.types.bind_free_function.ptr(0);

  var status = SQLITE.lib.sqlite3_prepare_v2(this.connection, SQLITE.lib.buffer(queryStatement),
					     -1, preparedStatement.address(), unused.address());

  if (status != SQLITE.lib.SQLITE_OK) {
    throw "Unable to create prepared statement: " + status;
  }

  var status = SQLITE.lib.sqlite3_bind_text(preparedStatement, 1, destination, -1, staticData);

  if (status != SQLITE.lib.SQLITE_OK) {
    throw "Unable to bind parameter to prepared statement: " + status;
  }

  var status = SQLITE.lib.sqlite3_bind_text(preparedStatement, 2, fingerprint, -1, staticData);

  if (status != SQLITE.lib.SQLITE_OK) {
    throw "Unable to bind parameter to prepared statement: " + status;
  }

  var result;

  if (SQLITE.lib.sqlite3_step(preparedStatement) == SQLITE.lib.SQLITE_ROW) {
    result = true;
  } else {
    result = false;
  }

  SQLITE.lib.sqlite3_finalize(preparedStatement);

  return result;
};

NativeCertificateCache.prototype.fetchAll = function() {
  var queryStatement    = "SELECT id,location,fingerprint,timestamp FROM fingerprints";
  var preparedStatement = SQLITE.types.sqlite3_stmt.ptr(0);
  var unused            = ctypes.char.ptr(0);

  var status = SQLITE.lib.sqlite3_prepare_v2(this.connection, SQLITE.lib.buffer(queryStatement),
                                             -1, preparedStatement.address(), unused.address());

  if (status != SQLITE.lib.SQLITE_OK) {
    throw "Unable to create prepared statement: " + status;
  }

  var result = new Array();
  while (SQLITE.lib.sqlite3_step(preparedStatement) == SQLITE.lib.SQLITE_ROW) {
    result.push({
      id: SQLITE.lib.sqlite3_column_int64(preparedStatement, 0),
      location: SQLITE.lib.sqlite3_column_text(preparedStatement, 1).readString(),
      fingerprint: SQLITE.lib.sqlite3_column_text(preparedStatement, 2).readString(),
      timestamp: new Date(SQLITE.lib.sqlite3_column_int64(preparedStatement, 3)),
    });
  }

  SQLITE.lib.sqlite3_finalize(preparedStatement);

  return result;
}

NativeCertificateCache.prototype.deleteCertificate = function(id) {
  var queryStatement    = "DELETE FROM fingerprints WHERE id = ?";
  var preparedStatement = SQLITE.types.sqlite3_stmt.ptr(0);
  var unused            = ctypes.char.ptr(0);

  var status = SQLITE.lib.sqlite3_prepare_v2(this.connection, SQLITE.lib.buffer(queryStatement),
                                             -1, preparedStatement.address(), unused.address());

  if (status != SQLITE.lib.SQLITE_OK) {
    throw "Unable to create prepared statement: " + status;
  }

  status = SQLITE.lib.sqlite3_bind_int64(preparedStatement, 1, id);

  if (status != SQLITE.lib.SQLITE_OK) {
    throw "Unable to bind id param: " + status;
  }

  SQLITE.lib.sqlite3_step(preparedStatement);
  SQLITE.lib.sqlite3_finalize(preparedStatement);
}

NativeCertificateCache.prototype.clearCache = function() {
  var queryStatement    = "DELETE FROM fingerprints";
  var preparedStatement = SQLITE.types.sqlite3_stmt.ptr(0);
  var unused            = ctypes.char.ptr(0);

  var status = SQLITE.lib.sqlite3_prepare_v2(this.connection, SQLITE.lib.buffer(queryStatement),
                                             -1, preparedStatement.address(), unused.address());

  if (status != SQLITE.lib.SQLITE_OK) {
    throw "Unable to create prepared statement: " + status;
  }

  SQLITE.lib.sqlite3_step(preparedStatement);
  SQLITE.lib.sqlite3_finalize(preparedStatement);
}

