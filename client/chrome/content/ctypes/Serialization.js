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
 * You're only allowed to pass JSON-compatible types across
 * the ChromeWorker boundary.  This class manages serializing
 * things like ctype pointers and other structures into
 * JSON-compatible objects that can be marshalled across and
 * deserialized back into native types on the other side.
 *
 **/

function Serialization() {

}

Serialization.serializeAddress = function(addr) {
  return [addr.family, addr.port, addr.ip];
};

Serialization.deserializeAddress = function(serializedAddress) {
  return NSPR.types.PRNetAddr({'family' : serializedAddress[0], 
  			       'port' : serializedAddress[1], 
  			       'ip' : serializedAddress[2], 
  			       'pad' : [0,0,0,0,0,0,0,0]});
};

// XXX Address 32bit systems!
Serialization.serializePointer = function(fd) {
  var fdString     = fd.toString();
  var addressStart = fdString.indexOf("0x");
  var addressEnd   = fdString.indexOf("\"", addressStart);
  var address      = fdString.substring(addressStart, addressEnd);
  
  return address;
};

// XXX Address 32bit systems!
Serialization.deserializeDescriptor = function(serializedFd) {
  var int64 = new ctypes.UInt64(serializedFd);
  return NSPR.types.PRFileDesc.ptr(int64);
};

Serialization.deserializeCERTCertificate = function(serializedCertificate) {
  var int64 = new ctypes.UInt64(serializedCertificate);
  return NSS.types.CERTCertificate.ptr(int64);
};

Serialization.deserializeSECKEYPublicKey = function(serializedKey) {
  var int64 = new ctypes.UInt64(serializedKey);
  return NSS.types.SECKEYPublicKey.ptr(int64);
};

Serialization.deserializeSECKEYPrivateKey = function(serializedKey) {
  var int64 = new ctypes.UInt64(serializedKey);
  return NSS.types.SECKEYPrivateKey.ptr(int64);
};

Serialization.serializeProxyInfo = function(proxyInfo) {
  if (proxyInfo == null) {
    return null;
  }

  var serializedProxyInfo = {};
  serializedProxyInfo['host'] = proxyInfo.host;
  serializedProxyInfo['port'] = proxyInfo.port;
  serializedProxyInfo['type'] = proxyInfo.type;

  return serializedProxyInfo;
};