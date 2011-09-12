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
 * This class manages the ctypes bridge to the NSPR libraries
 * distributed with Mozilla.
 **/


function NSPR() {

}

NSPR.initialize = function(nsprPath) {
 
  var sharedLib;

  try {
    sharedLib = ctypes.open(nsprPath);    
  } catch (e) {
    try {
      dump("Failed to find nspr4 in installed directory, checking system paths.\n");
      sharedLib = ctypes.open(ctypes.libraryName("nspr4"));      
    } catch (e) {
      dump("Failed to find nspr4 in system paths, trying explicit FreeBSD path.\n");
      sharedLib = ctypes.open("/usr/local/lib/libnspr4.so");
    }
  }

  NSPR.types = new Object();

  NSPR.types.PRSocketOptionData = ctypes.StructType("PRSocketOptionData",
						   [{'option' : ctypes.int},
                                                    {'value' : ctypes.int}]);


  NSPR.types.PRTimeParameters = ctypes.StructType("PRTimeParameters",
  					   [{'tp_gmt_offset' : ctypes.int32_t},
                                            {'tp_dst_offset' : ctypes.int32_t}]);

  NSPR.types.PRExplodedTime = ctypes.StructType("PRExplodedTime",
    				       [{'tm_usec' : ctypes.int32_t},
                                        {'tm_sec' : ctypes.int32_t},
                                        {'tm_min' : ctypes.int32_t},
                                        {'tm_hour' : ctypes.int32_t},
                                        {'tm_mday' : ctypes.int32_t},
                                        {'tm_month' : ctypes.int32_t},
                                        {'tm_year' : ctypes.int32_t},
                                        {'tm_wday' : ctypes.int32_t},
                                        {'tm_yday' : ctypes.int32_t},
                                        {'tm_params' : NSPR.types.PRTimeParameters}]);

  NSPR.types.PRFileDesc = ctypes.StructType("PRFileDesc");

  NSPR.types.PRFileDescPtrArray = ctypes.ArrayType(NSPR.types.PRFileDesc.ptr);

  NSPR.types.PRThread = ctypes.StructType("PRThread");

  NSPR.types.PRHostEnt = ctypes.StructType("PRHostEnt",
                                [{ 'h_name'      : ctypes.char.ptr                 },
                                 { 'h_aliases'   : ctypes.char.ptr.ptr             },
                                 { 'h_addrtype'  : ctypes.int                      },
                                 { 'h_length'    : ctypes.int                      },
                                 { 'h_addr_list' : ctypes.uint8_t.array(4).ptr.ptr }]);


  NSPR.types.PRLock = ctypes.StructType("PRLock");

  NSPR.types.PRStartFunction = ctypes.FunctionType(ctypes.default_abi, ctypes.void_t, [ctypes.voidptr_t]);

  NSPR.types.PRTimeParamFn = ctypes.FunctionType(ctypes.default_abi, NSPR.types.PRTimeParameters, [NSPR.types.PRExplodedTime.ptr]);

  NSPR.types.PRPollDesc = ctypes.StructType("PRPollDesc",
					   [{'fd' : NSPR.types.PRFileDesc.ptr},
                                            {'in_flags' : ctypes.int16_t},
                                            {'out_flags' : ctypes.int16_t}]);

  NSPR.types.PRNetAddr = ctypes.StructType("PRNetAddr",
                                  [{'family': ctypes.uint16_t},
                                   {'port': ctypes.uint16_t},
                                   {'ip': ctypes.uint32_t},
                                   {'pad' : ctypes.char.array(8)}]);

  NSPR.types.PRAddrInfo = ctypes.StructType("PRAddrInfo");


  NSPR.lib = {
    PR_TRUE : 1,
    PR_FALSE : 0,
    PR_AF_INET : 2,
    PR_AI_ADDRCONFIG : 32,
    PR_IpAddrAny : 1,
    PR_IpAddrLoopback : 2,
    PR_IpAddrNull : 0,
    PR_SockOpt_Nonblocking : 0,
    PR_SockOpt_Reuseaddr: 2,
    PR_SockOpt_NoDelay: 13,
    PR_INTERVAL_NO_WAIT : 0,
    PR_INTERVAL_NO_TMEOUT: ctypes.uint32_t(4294967295),
    PR_INTERVAL_MAX : 100000,
    PR_SYSTEM_THREAD : 1,
    PR_PRIORITY_NORMAL : 1,
    PR_LOCAL_THREAD : 0,
    PR_GLOBAL_THREAD : 1,
    PR_JOINABLE_THREAD : 0,
    PR_UNJOINABLE_THREAD : 1,
    PR_GLOBAL_BOUND_THREAD : 2,
    PR_NETDB_BUF_SIZE: 1024,

    PR_POLL_READ : 1,
    PR_POLL_WRITE : 2,
    PR_POLL_EXCEPT : 4,
    PR_POLL_ERR : 8,
    PR_POLL_NVAL : 16,

    PR_WOULD_BLOCK_ERROR : -5998,
    PR_SockOpt_NoDelay : 13,

    buffer : ctypes.ArrayType(ctypes.char),
    unsigned_buffer : ctypes.ArrayType(ctypes.unsigned_char),

    PR_NewTCPSocketPair : sharedLib.declare("PR_NewTCPSocketPair",
					    ctypes.default_abi,
					    ctypes.int,
					    NSPR.types.PRFileDescPtrArray),

    PR_Malloc : sharedLib.declare("PR_Malloc",
				  ctypes.default_abi,
				  ctypes.voidptr_t,
				  ctypes.int),

    PR_Free : sharedLib.declare("PR_Free",
				ctypes.default_abi,
				ctypes.void_t,
				ctypes.voidptr_t),

    PR_CreatePipe : sharedLib.declare("PR_CreatePipe",
				      ctypes.default_abi,
				      ctypes.int,
				      NSPR.types.PRFileDesc.ptr.ptr,
				      NSPR.types.PRFileDesc.ptr.ptr),				      

    PR_NewPollableEvent :  sharedLib.declare("PR_NewPollableEvent",
					     ctypes.default_abi,
					     NSPR.types.PRFileDesc.ptr),

    PR_SetPollableEvent : sharedLib.declare("PR_SetPollableEvent",
					    ctypes.default_abi,
					    ctypes.int,
					    NSPR.types.PRFileDesc.ptr),

    PR_GMTParameters : sharedLib.declare("PR_GMTParameters",
					 NSPR.types.PRTimeParamFn.ptr),
    					 // ctypes.default_abi,
    					 // PRTimeParameters,
    					 // PRExplodedTime.ptr),

    PR_GetError : sharedLib.declare("PR_GetError",
				    ctypes.default_abi,
				    ctypes.int),

    PR_Now : sharedLib.declare("PR_Now",
    			       ctypes.default_abi,
    			       ctypes.int64_t),
    
    PR_ExplodeTime : sharedLib.declare("PR_ExplodeTime",
    				      ctypes.default_abi,
    				      ctypes.void_t,
    				      ctypes.uint64_t,
    				      NSPR.types.PRTimeParamFn.ptr,
    				      NSPR.types.PRExplodedTime.ptr),

    PR_ImplodeTime : sharedLib.declare("PR_ImplodeTime",
    				       ctypes.default_abi,
    				       ctypes.int64_t,
    				       NSPR.types.PRExplodedTime.ptr),

    PR_GetRandomNoise : sharedLib.declare("PR_GetRandomNoise",
    					  ctypes.default_abi,
    					  ctypes.int,
    					  ctypes.voidptr_t,
    					  ctypes.int),					  

    PR_GetError : sharedLib.declare("PR_GetError",
				    ctypes.default_abi,
				    ctypes.int),

    PR_NewLock : sharedLib.declare("PR_NewLock",
			     ctypes.default_abi,
			     ctypes.void_t),

    PR_Lock : sharedLib.declare("PR_Lock",
			  ctypes.default_abi,
			  ctypes.void_t,
			  NSPR.types.PRLock.ptr),

    PR_UnLock : sharedLib.declare("PR_Unlock",
			    ctypes.default_abi,
			    ctypes.int32_t,
			    NSPR.types.PRLock.ptr),

    PR_CreateThread : sharedLib.declare("PR_CreateThread",
				  ctypes.default_abi,
				  NSPR.types.PRThread.ptr, // PRThread*
				  ctypes.int32_t, //type
				  NSPR.types.PRStartFunction.ptr, //runnable
				  ctypes.voidptr_t, //argument
				  ctypes.int32_t, //priority
				  ctypes.int32_t, //scope
				  ctypes.int32_t, //state
				  ctypes.int32_t), //stackSize

    PR_JoinThread : sharedLib.declare("PR_JoinThread",
				ctypes.default_abi,
				ctypes.int32_t,
				NSPR.types.PRThread.ptr),

    PR_SetNetAddr : sharedLib.declare("PR_SetNetAddr",
				ctypes.default_abi,
				ctypes.int32_t, // really doesn't return anything
				ctypes.int32_t, // val
				ctypes.uint16_t, // af
				ctypes.uint16_t, // port
				NSPR.types.PRNetAddr.ptr),

    PR_GetHostByName : sharedLib.declare("PR_GetHostByName",
					 ctypes.default_abi,
					 ctypes.int,
					 ctypes.char.ptr,
					 ctypes.char.ptr,
					 ctypes.int,
					 NSPR.types.PRHostEnt.ptr),
    
    PR_GetAddrInfoByName : sharedLib.declare("PR_GetAddrInfoByName",
					     ctypes.default_abi,
					     NSPR.types.PRAddrInfo.ptr,
					     ctypes.char.ptr,
					     ctypes.uint16_t,
					     ctypes.int),

    PR_EnumerateAddrInfo : sharedLib.declare("PR_EnumerateAddrInfo",
					     ctypes.default_abi,
					     ctypes.voidptr_t,
					     ctypes.voidptr_t,
					     NSPR.types.PRAddrInfo.ptr,
					     ctypes.uint16_t,
					     NSPR.types.PRNetAddr.ptr),

    PR_FreeAddrInfo : sharedLib.declare("PR_FreeAddrInfo",
					ctypes.default_abi,
					ctypes.void_t,
					NSPR.types.PRAddrInfo.ptr),

    PR_EnumerateHostEnt : sharedLib.declare("PR_EnumerateHostEnt",
					    ctypes.default_abi,
					    ctypes.int,
					    ctypes.int,
					    NSPR.types.PRHostEnt.ptr,
					    ctypes.uint16_t,
					    NSPR.types.PRNetAddr.ptr),

    PR_ntohs : sharedLib.declare("PR_ntohs",
				 ctypes.default_abi,
				 ctypes.uint16_t,
				 ctypes.uint16_t),

    PR_GetSockName : sharedLib.declare("PR_GetSockName",
				       ctypes.default_abi,
				       ctypes.int32_t,
				       NSPR.types.PRFileDesc.ptr,
				       NSPR.types.PRNetAddr.ptr),

    PR_InitializeNetAddr : sharedLib.declare("PR_InitializeNetAddr",
					     ctypes.default_abi,
					     ctypes.int32_t,
					     ctypes.int32_t,
					     ctypes.uint16_t,
					     NSPR.types.PRNetAddr.ptr),

    PR_NewTCPSocket : sharedLib.declare("PR_NewTCPSocket",
					ctypes.default_abi,
					NSPR.types.PRFileDesc.ptr),

    PR_Connect : sharedLib.declare("PR_Connect",
				   ctypes.default_abi,
				   ctypes.int32_t,
				   NSPR.types.PRFileDesc.ptr,
				   NSPR.types.PRNetAddr.ptr,
				   ctypes.uint32_t),

    PR_SecondsToInterval : sharedLib.declare("PR_SecondsToInterval",
					     ctypes.default_abi,
					     ctypes.uint32_t,
					     ctypes.uint32_t),

    PR_OpenTCPSocket : sharedLib.declare("PR_OpenTCPSocket", // symbol name
				   ctypes.default_abi, // cdecl calling convention
				   NSPR.types.PRFileDesc.ptr, // return (PRFileDesc*)
				   ctypes.int32_t), // first arg
                        
    PR_SetSocketOption : sharedLib.declare("PR_SetSocketOption",
				     ctypes.default_abi,
				     ctypes.int32_t,
				     NSPR.types.PRFileDesc.ptr,
				     NSPR.types.PRSocketOptionData.ptr),

    PR_Bind : sharedLib.declare("PR_Bind",
			  ctypes.default_abi,
			  ctypes.int32_t,
			  NSPR.types.PRFileDesc.ptr,
			  NSPR.types.PRNetAddr.ptr),
                        
    PR_Listen : sharedLib.declare("PR_Listen",
			    ctypes.default_abi,
			    ctypes.int32_t,
			    NSPR.types.PRFileDesc.ptr, // fd
			    ctypes.int32_t), // backlog
                          
    PR_Accept : sharedLib.declare("PR_Accept",
			    ctypes.default_abi,
			    NSPR.types.PRFileDesc.ptr, // new socket fd
			    NSPR.types.PRFileDesc.ptr, // rendezvous socket fd
			    NSPR.types.PRNetAddr.ptr, //addr
			    ctypes.uint32_t), // timeout interval
                         
    PR_Close : sharedLib.declare("PR_Close",
			   ctypes.default_abi,
			   ctypes.int32_t,
			   NSPR.types.PRFileDesc.ptr),

    PR_Available : sharedLib.declare("PR_Available",
				     ctypes.default_abi,
				     ctypes.int32_t,
				     NSPR.types.PRFileDesc.ptr),

    PR_Poll : sharedLib.declare("PR_Poll",
				ctypes.default_abi,
				ctypes.int,
				NSPR.types.PRPollDesc.ptr,
				ctypes.int,
				ctypes.int),

    PR_Read : sharedLib.declare("PR_Read",
				ctypes.default_abi,
				ctypes.int32_t,
				NSPR.types.PRFileDesc.ptr,
				ctypes.voidptr_t,
				ctypes.int32_t),

    PR_Write : sharedLib.declare("PR_Write",
				 ctypes.default_abi,
				 ctypes.int32_t,
				 NSPR.types.PRFileDesc.ptr,
				 ctypes.voidptr_t,
				 ctypes.int32_t),
                         
    PR_Recv : sharedLib.declare("PR_Recv",
                          ctypes.default_abi,
                          ctypes.int32_t, // return
                          NSPR.types.PRFileDesc.ptr, // socket
                          ctypes.voidptr_t, // buffer
                          ctypes.int32_t, // buffer length
                          ctypes.int32_t, // must be 0, deprecated
                          ctypes.uint32_t), // timeout interval
                        
    PR_Send : sharedLib.declare("PR_Send",
                          ctypes.default_abi,
                          ctypes.int32_t, // return
                          NSPR.types.PRFileDesc.ptr, // socket
                          ctypes.voidptr_t, // buffer
                          ctypes.int32_t, // buffer length
                          ctypes.int32_t, // must be 0, deprecated
                          ctypes.uint32_t), // timeout interval
  };

};
