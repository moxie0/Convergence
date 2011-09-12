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
 * This class manages the ctypes bridge to the sqlite libraries
 * distributed with Mozilla.
 *
 **/

function SQLITE() {

}

SQLITE.initialize = function(sqlitePath) {  
  var sharedLib;

  try {
    sharedLib = ctypes.open(sqlitePath);    
  } catch (e) {
    try {
      dump("Failed to find mozsqlite3 in installed directory, checking system paths for sqlite3.\n");
      sharedLib = ctypes.open(ctypes.libraryName("sqlite3"));      
    } catch (e) {
      dump("Failed to find standard sqlite3 permutations, checking debian-specific libsqlite3.so.0.\n");
      sharedLib = ctypes.open("libsqlite3.so.0");
    }
  }

  SQLITE.types = new Object();

  SQLITE.types.sqlite3 = ctypes.StructType("sqlite3");

  SQLITE.types.sqlite3_stmt = ctypes.StructType("sqlite3_stmt");

  SQLITE.types.bind_free_function = ctypes.FunctionType(ctypes.default_abi, ctypes.void_t, [ctypes.voidptr_t]);
  

  SQLITE.lib = {
    SEC_OID_MD5 : 3,
    SEC_OID_SHA1 : 4,
    SEC_OID_X509_KEY_USAGE : 81,
    CKM_RSA_PKCS_KEY_PAIR_GEN : 0,
    SQLITE_OK : 0,
    SQLITE_ROW : 100,
    buffer : ctypes.ArrayType(ctypes.char),

    sqlite3_open : sharedLib.declare("sqlite3_open",
    				     ctypes.default_abi,
    				     ctypes.int,
				     ctypes.char.ptr,
				     SQLITE.types.sqlite3.ptr.ptr),

    sqlite3_prepare_v2 : sharedLib.declare("sqlite3_prepare_v2",
					   ctypes.default_abi,
					   ctypes.int,
					   SQLITE.types.sqlite3.ptr,
					   ctypes.char.ptr,
					   ctypes.int,
					   SQLITE.types.sqlite3_stmt.ptr.ptr,
					   ctypes.char.ptr.ptr),

    sqlite3_bind_text : sharedLib.declare("sqlite3_bind_text",
					  ctypes.default_abi,
					  ctypes.int,
					  SQLITE.types.sqlite3_stmt.ptr,
					  ctypes.int,
					  ctypes.char.ptr,
					  ctypes.int,
					  SQLITE.types.bind_free_function.ptr),


    sqlite3_bind_int64 : sharedLib.declare("sqlite3_bind_int",
					 ctypes.default_abi,
					 ctypes.int,
					 SQLITE.types.sqlite3_stmt.ptr,
					 ctypes.int, 
					 ctypes.int64_t),
					  
    sqlite3_step : sharedLib.declare("sqlite3_step",
				     ctypes.default_abi,
				     ctypes.int,
				     SQLITE.types.sqlite3_stmt.ptr),
    
    sqlite3_column_text : sharedLib.declare("sqlite3_column_text",
					    ctypes.default_abi,
					    ctypes.unsigned_char.ptr,
					    SQLITE.types.sqlite3_stmt.ptr,
					    ctypes.int),

    sqlite3_column_int64 : sharedLib.declare("sqlite3_column_int64",
					    ctypes.default_abi,
					    ctypes.int64_t,
					    SQLITE.types.sqlite3_stmt.ptr,
					    ctypes.int),

    sqlite3_finalize : sharedLib.declare("sqlite3_finalize",
					 ctypes.default_abi,
					 ctypes.int,
					 SQLITE.types.sqlite3_stmt.ptr),

    sqlite3_close : sharedLib.declare("sqlite3_close",
				      ctypes.default_abi,
				      ctypes.int,
				      SQLITE.types.sqlite3.ptr),

  };

};
