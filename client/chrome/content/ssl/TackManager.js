
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

function TackManager(databaseLocation) {
  this.connection = SQLITE.types.sqlite3.ptr(0);

  var status = SQLITE.lib.sqlite3_open(SQLITE.lib.buffer(databaseLocation), 
				       this.connection.address());

  if (status != SQLITE.lib.SQLITE_OK) {
    throw "Unable to open database at: " + databaseLocation;
  }
}

TackManager.prototype.close = function() {
  SQLITE.lib.sqlite3_close(this.connection);  
};

TackManager.prototype.updateTackActivation = function(host, tackCertificate) {
  var insertStatement = "UPDATE tack SET lastSeen = ? WHERE host = ? AND tackKey = ? ";
  var preparedStatement = SQLITE.types.sqlite3_stmt.ptr(0);
  var unused            = ctypes.char.ptr(0);
  var staticData        = SQLITE.types.bind_free_function.ptr(0);

  var status = SQLITE.lib.sqlite3_prepare_v2(this.connection, SQLITE.lib.buffer(insertStatement),
					     -1, preparedStatement.address(), unused.address());

  if (status != SQLITE.lib.SQLITE_OK) {
    throw "Unable to create prepared statement: " + status;
  }

  var timestamp = new ctypes.Int64(new Date().getTime() / 1000);
  var status = SQLITE.lib.sqlite3_bind_text(preparedStatement, 1, 
					    SQLITE.lib.buffer(timestamp.toString()), 
					    -1, staticData);

  if (status != SQLITE.lib.SQLITE_OK) {
    throw "Unable to bind timestamp param: " + status;
  }

  var status = SQLITE.lib.sqlite3_bind_text(preparedStatement, 2, 
					    SQLITE.lib.buffer(host), 
					    -1, staticData);

  if (status != SQLITE.lib.SQLITE_OK) {
    throw "Unable to bind host param: " + status;
  }

  var status = SQLITE.lib.sqlite3_bind_text(preparedStatement, 3, 
					    SQLITE.lib.buffer(tackCertificate.getTackKeyFingerprint()), 
					    -1, staticData);

  if (status != SQLITE.lib.SQLITE_OK) {
    throw "Unable to bind fingerprint param: " + status;
  }

  SQLITE.lib.sqlite3_step(preparedStatement);
  SQLITE.lib.sqlite3_finalize(preparedStatement);
};

TackManager.prototype.cacheTackInfo = function(host, tackCertificate) {
  var insertStatement = "INSERT INTO tack (host, activationTime, lastSeen, tackKey, generation) " + 
                        "VALUES (?, ?, ?, ?, ?)";
  var preparedStatement = SQLITE.types.sqlite3_stmt.ptr(0);
  var unused            = ctypes.char.ptr(0);
  var staticData        = SQLITE.types.bind_free_function.ptr(0);

  var status = SQLITE.lib.sqlite3_prepare_v2(this.connection, SQLITE.lib.buffer(insertStatement),
					     -1, preparedStatement.address(), unused.address());

  if (status != SQLITE.lib.SQLITE_OK) {
    throw "Unable to create prepared statement: " + status;
  }

  var status = SQLITE.lib.sqlite3_bind_text(preparedStatement, 1, 
					    SQLITE.lib.buffer(host), 
					    -1, staticData);

  if (status != SQLITE.lib.SQLITE_OK) {
    throw "Unable to bind host param: " + status;
  }

  var timestamp = new ctypes.Int64(new Date().getTime() / 1000);
  var status = SQLITE.lib.sqlite3_bind_text(preparedStatement, 2, 
					    SQLITE.lib.buffer(timestamp.toString()), 
					    -1, staticData);

  if (status != SQLITE.lib.SQLITE_OK) {
    throw "Unable to bind activationTime param: " + status;
  }

  // var status = SQLITE.lib.sqlite3_bind_int64(preparedStatement, 3,
  //                                           new Date().getTime());


  var status    = SQLITE.lib.sqlite3_bind_text(preparedStatement, 3, 
					       SQLITE.lib.buffer(timestamp), 
					       -1, staticData);

  if (status != SQLITE.lib.SQLITE_OK) {
    throw "Unable to bind activationDuration param: " + status;
  }

  var fingerprint = tackCertificate.getTackKeyFingerprint();
  var status    = SQLITE.lib.sqlite3_bind_text(preparedStatement, 4, 
					       SQLITE.lib.buffer(fingerprint), 
					       -1, staticData);

  if (status != SQLITE.lib.SQLITE_OK) {
    throw "Unable to bind fingerprint param: " + status;
  }

  var generation = tackCertificate.getTackGeneration() + "";
  var status    = SQLITE.lib.sqlite3_bind_text(preparedStatement, 5, 
					       SQLITE.lib.buffer(generation), 
					       -1, staticData);

  if (status != SQLITE.lib.SQLITE_OK) {
    throw "Unable to bind fingerprint param: " + status;
  }

  SQLITE.lib.sqlite3_step(preparedStatement);
  SQLITE.lib.sqlite3_finalize(preparedStatement);
};

TackManager.prototype.getTackInfo = function(host) {
  var queryStatement    = "SELECT activationTime, lastSeen, tackKey, generation FROM tack WHERE host = ?";  
  var preparedStatement = SQLITE.types.sqlite3_stmt.ptr(0);
  var unused            = ctypes.char.ptr(0);
  var staticData        = SQLITE.types.bind_free_function.ptr(0);

  var status = SQLITE.lib.sqlite3_prepare_v2(this.connection, SQLITE.lib.buffer(queryStatement),
					     -1, preparedStatement.address(), unused.address());

  if (status != SQLITE.lib.SQLITE_OK) {
    throw "Unable to create prepared statement: " + status;
  }

  var status = SQLITE.lib.sqlite3_bind_text(preparedStatement, 1, SQLITE.lib.buffer(host), -1, staticData);

  if (status != SQLITE.lib.SQLITE_OK) {
    throw "Unable to bind parameter to prepared statement: " + status;  
  }

  var results;

  if (SQLITE.lib.sqlite3_step(preparedStatement) == SQLITE.lib.SQLITE_ROW) {
    results = {
      activationTime: new Date(SQLITE.lib.sqlite3_column_int64(preparedStatement, 0)),
      lastSeen : SQLITE.lib.sqlite3_column_int64(preparedStatement, 1),
      tackKey : SQLITE.lib.sqlite3_column_text(preparedStatement, 2).readString(),
      generation : SQLITE.lib.sqlite3_column_int(preparedStatement, 3)
    };
  } else {
    results = null;
  }

  SQLITE.lib.sqlite3_finalize(preparedStatement);

  return results;
};



TackManager.prototype.clear = function() {
  var queryStatement    = "DELETE FROM tack";
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

