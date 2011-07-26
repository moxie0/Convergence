function SSL() {

}

SSL.initialize = function(sslPath) {  
  var sharedLib = ctypes.open(sslPath);

  SSL.types = new Object();

  SSL.types.SSL_AuthCertificate = ctypes.FunctionType(ctypes.default_abi, 
						      ctypes.int32_t, 
						      [ctypes.voidptr_t,
						       NSPR.types.PRFileDesc.ptr,
						       ctypes.int32_t,
						       ctypes.int32_t]).ptr;

  SSL.lib = {
    SSL_ConfigServerSessionIDCache : sharedLib.declare("SSL_ConfigServerSessionIDCache",
						       ctypes.default_abi,
						       ctypes.int,
						       ctypes.int,
						       ctypes.uint32_t,
						       ctypes.uint32_t,
						       ctypes.char.ptr),

    SSL_ImportFD : sharedLib.declare("SSL_ImportFD",
    				     ctypes.default_abi,
    				     NSPR.types.PRFileDesc.ptr,
    				     NSPR.types.PRFileDesc.ptr,
    				     NSPR.types.PRFileDesc.ptr),

    SSL_ConfigSecureServer : sharedLib.declare("SSL_ConfigSecureServer",
					       ctypes.default_abi,
					       ctypes.int,
					       NSPR.types.PRFileDesc.ptr,
					       NSS.types.CERTCertificate.ptr,
					       NSS.types.SECKEYPrivateKey.ptr,
					       ctypes.int),
    
    SSL_AuthCertificateHook : sharedLib.declare("SSL_AuthCertificateHook",
    						ctypes.default_abi,
    						ctypes.int32_t,
    						NSPR.types.PRFileDesc.ptr,
    						SSL.types.SSL_AuthCertificate,
    						ctypes.voidptr_t),

    SSL_ResetHandshake : sharedLib.declare("SSL_ResetHandshake",
    					   ctypes.default_abi,
    					   ctypes.int32_t,
    					   NSPR.types.PRFileDesc.ptr,
    					   ctypes.int),

    SSL_ForceHandshake : sharedLib.declare("SSL_ForceHandshake",
    					   ctypes.default_abi,
    					   ctypes.int32_t,
    					   NSPR.types.PRFileDesc.ptr),

    SSL_ForceHandshakeWithTimeout : sharedLib.declare("SSL_ForceHandshakeWithTimeout",
						      ctypes.default_abi,
						      ctypes.int32_t,
						      NSPR.types.PRFileDesc.ptr,
						      ctypes.uint32_t),

    SSL_PeerCertificate : sharedLib.declare("SSL_PeerCertificate",
    					    ctypes.default_abi,
    					    NSS.types.CERTCertificate.ptr,
    					    NSPR.types.PRFileDesc.ptr),

    NSS_FindCertKEAType : sharedLib.declare("NSS_FindCertKEAType",
					    ctypes.default_abi,
					    ctypes.int,
					    NSS.types.CERTCertificate.ptr),

  }
};