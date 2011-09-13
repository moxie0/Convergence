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
 * This class represents a configured notary.  It is responsible for
 * remembering the notary settings (serializing and deserializing them
 * for the SettingsManager), as well as actively talking to the Notary
 * to validate certificates.  It is accessed from both the XPCOM as well
 * as the ChromeWorker contexts, and is serialized across the boundary.
 *
 **/


function Notary(serialized) {
  if (typeof serialized == 'undefined') {
    this.name              = null;
    this.host              = null;
    this.httpPort          = -1;
    this.sslPort           = -1;  
    this.certificate       = null;
    this.enabled           = false;
    this.sha1Fingerprint   = null;    
  } else {
    this.name            = serialized.name;
    this.host            = serialized.host;
    this.httpPort        = serialized.http_port;
    this.sslPort         = serialized.ssl_port;
    this.enabled         = serialized.enabled;
    this.sha1Fingerprint = serialized.fingerprint;
    this.httpProxy       = serialized.http_proxy;
    this.sslProxy        = serialized.ssl_proxy;
  }
}

// It's ridiculous that I have to do this myself, but of course,
// this is Mozilla.
Notary.prototype.extractRawCert = function(certificate) {
  var beginIndex = certificate.indexOf("-----BEGIN CERTIFICATE-----");
  beginIndex    += "-----BEGIN CERTIFICATE-----".length + 1;

  var endIndex   = certificate.indexOf("-----END CERTIFICATE-----") - 1;
  var rawCert    = certificate.substring(beginIndex, endIndex);
  rawCert        = rawCert.replace(/^\s*(\S*(\s+\S+)*)\s*$/, "$1");
  rawCert        = rawCert.replace(/\n/g, "");

  return rawCert;
};

Notary.prototype.parseSha1Fingerprint = function(certificate) {
  if (certificate == null)
    return null;

  var certDB = Components.classes["@mozilla.org/security/x509certdb;1"]
  .getService(Components.interfaces.nsIX509CertDB);

  var rawCert = this.extractRawCert(certificate);
  var x509    = certDB.constructX509FromBase64(rawCert);
  return x509.sha1Fingerprint;
};

Notary.prototype.getSha1Fingerprint = function() {
  return this.sha1Fingerprint;
};

Notary.prototype.makeConnection = function(proxy) {
  var notarySocket;

  if (typeof proxy != 'undefined' && proxy != null) {
    dump("HTTP proxy for notary: " + this.httpProxy + "\n");
    dump("Bouncing request through: " + proxy.host + " to: " + this.host + "\n");
    notarySocket       = new ConvergenceDestinationSocket(proxy.host, parseInt(proxy.httpPort), this.httpProxy);
    var proxyConnector = new HttpProxyConnector();
    proxyConnector.makeConnection(notarySocket, this.host, 4242);
  } else {
    dump("Making unbounced request...\n");
    dump("SSL proxy for notary: " + this.sslProxy + "\n");
    notarySocket = new ConvergenceDestinationSocket(this.host, parseInt(this.sslPort), this.sslProxy);
  }

  return notarySocket;
};

Notary.prototype.makeSSLConnection = function(proxy) {
  var notarySocket          = this.makeConnection(proxy);
  var notaryCertificate     = notarySocket.negotiateSSL();
  var notaryCertificateInfo = new CertificateInfo(notaryCertificate);

  if (!(notaryCertificateInfo.sha1 == this.sha1Fingerprint)) {
    dump("Notary certificate did not match local copy...\n");
    return null;    
  }

  return notarySocket;
};


Notary.prototype.sendRequest = function(notarySocket, host, port, certificate) {
  var requestBuilder = new HttpRequestBuilder(host, port, certificate.sha1);
  var request        = requestBuilder.buildRequest();
  
  dump("Sending request: " + request + "\n");

  notarySocket.writeBytes(NSS.lib.buffer(request), request.length);
};

Notary.prototype.checkFingerprintList = function(response, certificate) {
  var fingerprintList = response.fingerprintList;

  for (var i in fingerprintList) {
    dump("Checking fingerprint: "  + fingerprintList[i].fingerprint + " == " + certificate.sha1 + "\n");
    if (fingerprintList[i].fingerprint == certificate.sha1) {
      dump("Returning success...\n");
      return 0;
    }
  }

  dump("Nothing matched!\n");
  return -1;
};

Notary.prototype.checkValidity = function(host, port, certificate, proxy, connectivityIsFailure) {
  var notarySocket = null;

  try {
    notarySocket = this.makeSSLConnection(proxy);

    if (notarySocket == null) {
      dump("Failed to construct socket to notary...\n");

      if (connectivityIsFailure) return -2;
      else                       return 3;
    }

    this.sendRequest(notarySocket, host, port, certificate);
    var response = new HttpParser(notarySocket);
    dump("Got Notary response: " + response.getResponseBody() + "\n");

    switch (response.getResponseCode()) {
    case 303: 
      dump("Notary response was inconclusive...\n");
      return 1;
    case 409: 
      dump("Notary failed to find matching fingerprint!\n");
      return -1;
    case 200:
      dump("Notary indicates match, checking...\n");
      return this.checkFingerprintList(response.getResponseBodyJson(), 
				       certificate);
    default:
      dump("Got error notary response code: " + response.getResponseCode() + "\n");
      if (connectivityIsFailure) return -2;
      else                       return 3;      
    }
  } catch (e) {
    dump(e + " , " + e.stack);
    if (connectivityIsFailure) return -2;
    else                       return 3;
  } finally {
    if (notarySocket != null) {
      notarySocket.close();
    }
  }
};

Notary.prototype.getHost = function() {
  return this.host;
};

Notary.prototype.setHost = function(host) {
  this.host = host;
};

Notary.prototype.getSSLPort = function() {
  return this.sslPort;
};

Notary.prototype.setSSLPort = function(port) {
  this.sslPort = port;
};

Notary.prototype.getHTTPPort = function() {
  return this.httpPort;
};

Notary.prototype.setHTTPPort = function(port) {
  this.httpPort = port;
};

Notary.prototype.getName = function() {
  return this.name;
};

Notary.prototype.setName = function(name) {
  this.name = name;
};

Notary.prototype.getEnabled = function() {
  return this.enabled;
};

Notary.prototype.setEnabled = function(value) {
  this.enabled = value;
};

Notary.prototype.setCertificate = function(certificate) {
  this.certificate     = certificate;
  this.sha1Fingerprint = this.parseSha1Fingerprint(certificate);
};

Notary.prototype.getCertificate = function() {
  return this.certificate;
};

// This should only be called from within XPCOM,
// so we can get away with using XPCOM compoenents
// at this point.
Notary.prototype.getProxiesForNotary = function() {
  var ioService = Components.classes["@mozilla.org/network/io-service;1"]
  .getService(Components.interfaces.nsIIOService);
  
  var proxyService = Components.classes["@mozilla.org/network/protocol-proxy-service;1"]
  .getService(Components.interfaces.nsIProtocolProxyService);

  var httpUri             = ioService.newURI("http://" + this.host + ":" + this.httpPort, null, null);
  var sslUri              = ioService.newURI("https://" + this.host + ":" + this.sslPort, null, null);

  var httpProxy           = proxyService.resolve(httpUri, null);
  var sslProxy            = proxyService.resolve(sslUri, null);

  var serializedHttpProxy = Serialization.serializeProxyInfo(httpProxy);
  var serializedSslProxy  = Serialization.serializeProxyInfo(sslProxy);

  return {'http_proxy' : serializedHttpProxy, 'ssl_proxy' : serializedSslProxy};
};

Notary.prototype.serializeForTransport = function() {
  var proxies    = this.getProxiesForNotary();

  var serialized = {'name' : this.name,
  		    'host' : this.host,
  		    'ssl_port' : this.sslPort,
  		    'http_port' : this.httpPort,
  		    'enabled' : this.enabled,
  		    'fingerprint' : this.sha1Fingerprint,
		    'http_proxy' : proxies['http_proxy'],
		    'ssl_proxy' : proxies['ssl_proxy']};

  return serialized;
};

Notary.prototype.serialize = function(xmlDocument) {
  var proxyElement = xmlDocument.createElement("notary");
  proxyElement.setAttribute("name", this.name);
  proxyElement.setAttribute("host", this.host);
  proxyElement.setAttribute("ssl-port", this.sslPort);
  proxyElement.setAttribute("http-port", this.httpPort);
  proxyElement.setAttribute("enabled", this.enabled);

  var certificateText = xmlDocument.createTextNode(this.certificate);
  proxyElement.appendChild(certificateText);

  return proxyElement;
};

Notary.prototype.deserialize = function(element) {
  this.name            = element.getAttribute("name");
  this.host            = element.getAttribute("host");
  this.sslPort         = element.getAttribute("ssl-port");
  this.httpPort        = element.getAttribute("http-port");
  this.enabled         = (element.getAttribute("enabled") == "true");
  var certificateNode  = element.childNodes[0];
  this.certificate     = certificateNode.nodeValue;
  this.sha1Fingerprint = this.parseSha1Fingerprint(this.certificate);
};

