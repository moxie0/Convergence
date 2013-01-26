
function PhysicalNotary(serialized) {
  if (typeof serialized == 'undefined') {
    this.host            = null;
    this.httpPort        = -1;
    this.sslPort         = -1;
    this.certificate     = null;
    this.sha1Fingerprint = null;
  } else {
    dump("Deserializing across transport: " + serialized.host + " : " + serialized.http_port +"\n");
    this.host            = serialized.host;
    this.httpPort        = parseInt(serialized.http_port);
    this.sslPort         = parseInt(serialized.ssl_port);
    this.sha1Fingerprint = serialized.fingerprint;
    this.httpProxy       = serialized.http_proxy;
    this.sslProxy        = serialized.ssl_proxy;
  }
}

// It's ridiculous that I have to do this myself, but of course,
// this is Mozilla.
PhysicalNotary.prototype.extractRawCert = function(certificate) {
  var beginIndex = certificate.indexOf("-----BEGIN CERTIFICATE-----");
  beginIndex    += "-----BEGIN CERTIFICATE-----".length + 1;

  var endIndex   = certificate.indexOf("-----END CERTIFICATE-----") - 1;
  var rawCert    = certificate.substring(beginIndex, endIndex);
  rawCert        = rawCert.replace(/^\s*(\S*(\s+\S+)*)\s*$/, "$1");
  rawCert        = rawCert.replace(/\n/g, "");

  return rawCert;
};

PhysicalNotary.prototype.parseSha1Fingerprint = function(certificate) {
  if (certificate == null)
    return null;

  var certDB = Components.classes["@mozilla.org/security/x509certdb;1"]
  .getService(Components.interfaces.nsIX509CertDB);

  var rawCert = this.extractRawCert(certificate);
  var x509    = certDB.constructX509FromBase64(rawCert);
  return x509.sha1Fingerprint;
};

PhysicalNotary.prototype.getSha1Fingerprint = function() {
  return this.sha1Fingerprint;
};

PhysicalNotary.prototype.setCertificate = function(certificate) {
  this.certificate     = certificate;
  this.sha1Fingerprint = this.parseSha1Fingerprint(certificate);
};

PhysicalNotary.prototype.getCertificate = function() {
  return this.certificate;
};

PhysicalNotary.prototype.getHost = function() {
  return this.host;
};

PhysicalNotary.prototype.setHost = function(host) {
  this.host = host;
};

PhysicalNotary.prototype.getSSLPort = function() {
  return this.sslPort;
};

PhysicalNotary.prototype.setSSLPort = function(port) {
  this.sslPort = port;
};

PhysicalNotary.prototype.getHTTPPort = function() {
  return this.httpPort;
};

PhysicalNotary.prototype.setHTTPPort = function(port) {
  this.httpPort = port;
};

PhysicalNotary.prototype.getProxiesForNotary = function(callback) {
  var result = { };
  var ioService = Components.classes["@mozilla.org/network/io-service;1"]
  .getService(Components.interfaces.nsIIOService);
  
  var proxyService = Components.classes["@mozilla.org/network/protocol-proxy-service;1"]
  .getService(Components.interfaces.nsIProtocolProxyService);

  var httpUri             = ioService.newURI("http://" + this.host + ":" + this.httpPort, null, null);
  var sslUri              = ioService.newURI("https://" + this.host + ":" + this.sslPort, null, null);

  proxyService.asyncResolve(httpUri, null, { onProxyAvailable: function(aRequest, anURI, httpProxy, aStatus) {
    result['http_proxy'] = Serialization.serializeProxyInfo(httpProxy);
    if('ssl_proxy' in result) callback(result);
  }});
  proxyService.asyncResolve(sslUri, null, { onProxyAvailable: function(aRequest, anURI, sslProxy, aStatus) {
    result['ssl_proxy'] = Serialization.serializeProxyInfo(sslProxy);
    if('http_proxy' in result) callback(result);
  }});
};

PhysicalNotary.prototype.serializeForTransport = function(callback) {
  var self = this;
  this.getProxiesForNotary(function(proxies) {
    callback({'host'        : self.host,
              'ssl_port'    : self.sslPort,
  		      'http_port'   : self.httpPort,
  		      'fingerprint' : self.sha1Fingerprint,
		      'http_proxy'  : proxies['http_proxy'],
		      'ssl_proxy'   : proxies['ssl_proxy']});
  });
};

PhysicalNotary.prototype.serialize = function(xmlDocument) {
  var proxyElement = xmlDocument.createElement("physical-notary");
  proxyElement.setAttribute("host", this.host);
  proxyElement.setAttribute("ssl-port", this.sslPort);
  proxyElement.setAttribute("http-port", this.httpPort);

  var certificateText = xmlDocument.createTextNode(this.certificate);
  proxyElement.appendChild(certificateText);

  return proxyElement;
};

PhysicalNotary.prototype.deserialize = function(element) {
  this.host            = element.getAttribute("host");
  this.sslPort         = element.getAttribute("ssl-port");
  this.httpPort        = element.getAttribute("http-port");
  var certificateNode  = element.childNodes[0];
  this.certificate     = certificateNode.nodeValue;
  this.sha1Fingerprint = this.parseSha1Fingerprint(this.certificate);

  dump("Deserialized physical notary: " + this.host + " : " + this.httpPort + "\n");
};
