
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

PhysicalNotary.prototype.getProxiesForNotary = function() {
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

PhysicalNotary.prototype.serializeForTransport = function() {
  var proxies    = this.getProxiesForNotary();

  var serialized = {'host'        : this.host,
  		    'ssl_port'    : this.sslPort,
  		    'http_port'   : this.httpPort,
  		    'fingerprint' : this.sha1Fingerprint,
		    'http_proxy'  : proxies['http_proxy'],
		    'ssl_proxy'   : proxies['ssl_proxy']};

  return serialized;
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