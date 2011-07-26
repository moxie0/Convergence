
function SQLITE() {

}

SQLITE.initialize = function(sqlitePath) {  
  var sharedLib = ctypes.open(sqlitePath);

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
