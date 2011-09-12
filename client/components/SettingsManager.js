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
 * This class manages the current Convergence settings, including the
 * information about configured notaries.  It serializes settings 
 * to and from disk, and hands out configuration information to the
 * running process.
 *
 **/


function SettingsManager() {
  this.enabled                      = true;
  this.shortStatus                  = false;
  this.cacheCertificatesEnabled     = true;
  this.notaryBounceEnabled          = true;
  this.connectivityIsFailureEnabled = true;
  this.verificationThreshold        = "majority";
  this.notaries                     = new Array();
  this.loadPreferences();
}

SettingsManager.prototype.isEnabled = function() {
  return this.enabled;
};

SettingsManager.prototype.setEnabled = function(val) {
  this.enabled = val;
};

SettingsManager.prototype.setNotaryBounce = function(val) {
  this.notaryBounceEnabled = val;
};

SettingsManager.prototype.getNotaryBounce = function() {
  return this.notaryBounceEnabled;
};

SettingsManager.prototype.setConnectivityErrorIsFailure = function(val) {
  this.connectivityIsFailureEnabled = val;
};

SettingsManager.prototype.getConnectivityErrorIsFailure = function() {
  return this.connectivityIsFailureEnabled;
};

SettingsManager.prototype.setVerificationThreshold = function(val) {
  this.verificationThreshold = val;
};

SettingsManager.prototype.getVerificationThreshold = function() {
  return this.verificationThreshold;
};

SettingsManager.prototype.setCacheCertificates = function(val) {
  this.cacheCertificatesEnabled = val;
};

SettingsManager.prototype.getCacheCertificates = function() {
  return this.cacheCertificatesEnabled;
};

SettingsManager.prototype.getNotaryList = function() {
  return this.notaries.slice(0);
};

SettingsManager.prototype.setNotaryList = function(notaries) {
  this.notaries = notaries.slice(0);
};

SettingsManager.prototype.hasEnabledNotary = function() {
  for (var i=0;i<this.notaries.length;i++) {
    if (this.notaries[i].getEnabled()) {
      return true;
    }
  }

  return false;
};

SettingsManager.prototype.getSerializedNotaryList = function() {
  var serialized = new Array();
  
  for (var i in this.notaries) {
    if (this.notaries[i].enabled) {
      serialized.push(this.notaries[i].serializeForTransport());
    }
  }

  return serialized;
};

SettingsManager.prototype.getSerializedSettings = function() {
  return {
    'cacheCertificatesEnabled'     : this.cacheCertificatesEnabled,
    'notaryBounceEnabled'          : this.notaryBounceEnabled,
    'connectivityIsFailureEnabled' : this.connectivityIsFailureEnabled,
    'verificationThreshold'        : this.verificationThreshold
  };
};

SettingsManager.prototype.getSettingsFile = function() {
  var directoryService = Components.classes["@mozilla.org/file/directory_service;1"].
  getService(Components.interfaces.nsIProperties);

  var file = directoryService.get("ProfD", Components.interfaces.nsIFile);
  file.append("convergence.xml");
  
  return file;
};

SettingsManager.prototype.getSettingsInputStream = function(file) {
  var inputStream = Components.classes["@mozilla.org/network/file-input-stream;1"]
  .createInstance(Components.interfaces.nsIFileInputStream);
  inputStream.init(file, -1, -1, Components.interfaces.nsIFileInputStream.CLOSE_ON_EOF);

  return inputStream;
};

SettingsManager.prototype.getSettingsOutputStream = function() {
  var file         = this.getSettingsFile();
  var outputStream = Components.classes["@mozilla.org/network/file-output-stream;1"].
  createInstance(Components.interfaces.nsIFileOutputStream);
  outputStream.init(file, 0x02 | 0x08 | 0x20, 0664, 0);
  return outputStream;
};

SettingsManager.prototype.getInputSettingsObject = function() {
  var file        = this.getSettingsFile();
  if (!file.exists()) return null;
    
  var inputStream = this.getSettingsInputStream(file);
  var parser      = Components.classes["@mozilla.org/xmlextras/domparser;1"]
  .createInstance(Components.interfaces.nsIDOMParser);
  var object      = parser.parseFromStream(inputStream, null, file.fileSize, "text/xml");  
  if (!object || object.documentElement.nodeName == "parsererror") return null;

  return object;
};

SettingsManager.prototype.savePreferences = function() {
  var outputStream = this.getSettingsOutputStream();
  var serializer   = Components.classes["@mozilla.org/xmlextras/xmlserializer;1"]
  .createInstance(Components.interfaces.nsIDOMSerializer);
  var xmlDocument  = Components.classes["@mozilla.org/xml/xml-document;1"]
  .createInstance(Components.interfaces.nsIDOMDocument);

  var rootElement    = xmlDocument.createElement("convergence");
  rootElement.setAttribute("enabled", this.enabled);
  rootElement.setAttribute("shortStatus", this.shortStatus);
  rootElement.setAttribute("cache_certificates", this.cacheCertificatesEnabled);
  rootElement.setAttribute("notary_bounce", this.notaryBounceEnabled);
  rootElement.setAttribute("connectivity_failure", this.connectivityIsFailureEnabled);
  rootElement.setAttribute("threshold", this.verificationThreshold);

  var notariesElement = xmlDocument.createElement("notaries");
  rootElement.appendChild(notariesElement);

  for (key in this.notaries) {
    var notaryElement = this.notaries[key].serialize(xmlDocument);
    notariesElement.appendChild(notaryElement);
  }

  outputStream.write("<?xml version=\"1.0\" encoding=\"UTF-8\"?>\n", 39);
  serializer.serializeToStream(rootElement, outputStream, "UTF-8");
};

SettingsManager.prototype.getDefaultNotaryList = function() {
  var notaryList = new Array();
  var notaryOne  = new Notary();

  notaryOne.setHost("notary.thoughtcrime.org");
  notaryOne.setSSLPort(443);
  notaryOne.setHTTPPort(80);
  notaryOne.setEnabled(true);
  notaryOne.setCertificate("-----BEGIN CERTIFICATE-----\nMIIDkjCCAnoCCQCiafEhF0D5qzANBgkqhkiG9w0BAQUFADCBiTELMAkGA1UEBhMC\nVVMxEzARBgNVBAgTCkNhbGlmb3JuaWExFjAUBgNVBAcTDVNhbiBGcmFuY2lzY28x\nGjAYBgNVBAoTEVRob3VnaHRjcmltZSBMYWJzMQ8wDQYDVQQLEwZOb3RhcnkxIDAe\nBgNVBAMTF25vdGFyeS50aG91Z2h0Y3JpbWUub3JnMCAXDTExMDYyOTIwNTc0OVoY\nDzE5MTUwNTE0MTQyOTMzWjCBiTELMAkGA1UEBhMCVVMxEzARBgNVBAgTCkNhbGlm\nb3JuaWExFjAUBgNVBAcTDVNhbiBGcmFuY2lzY28xGjAYBgNVBAoTEVRob3VnaHRj\ncmltZSBMYWJzMQ8wDQYDVQQLEwZOb3RhcnkxIDAeBgNVBAMTF25vdGFyeS50aG91\nZ2h0Y3JpbWUub3JnMIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAt02q\nTwZFohBLbOPzo+DN+EMTYpF9l23lmGlKzoM3W2c7CCosZhg8bRscmzl0SOAALbVK\nRrogrqhghnv03psqb2oznyD16rrF6R2rhYOT/u9XPkuw+l5o11JFt5YSthLobTtt\n7BHGXcpHCtsd6rvZn/bWVg9s1cV+5Q+wZ8saDEJbKkt2MoswnzueP/cslAYOIeDs\nxXQHOiGMlNYG/RLHUw1ISFXmVGE2qq+riwTcneglngqjfi7AEnXjPsc++bnZ5aCe\nT168ViLrhyj2UYep+U30vuKyO26Nv/SJWSY2Ax/nGbr2COOCiFTAdkGJSsM+bmd9\n02BarFZqIbl+y/Iy+wIDAQABMA0GCSqGSIb3DQEBBQUAA4IBAQASDKkpnPMSfhAA\nnjvkNJFlFjYHGGZ1ZCFPEbyD7ABhSebT/yv33cw3bmO+1X0ZSQ11yAXBS7vIv8OR\nE8hOtvS6GHtwP3OYblYOW+aRNjPNqQ1xzuPvKo8MHZfSu8dBgCVUMzjYxg0vVNAl\nVh6pqDaLecNDjHdCTLOESycKuy9sd5nnI96zfy9PWk+4pesuUOqNPend17DyXB4J\nkETvCnMQfxH9LDg6dm+AtFCAfcdoQGzalwvKG8YIZbAYVS3/rZGa4oYbYcr15ae5\nRia17mALrWOZTMpXys2x+OfIc2lB/B56Wm9fLhQYfznCKXpHtrIhSE0N4tuTgu0s\nIY42yv8q\n-----END CERTIFICATE-----\n");

  var notaryTwo = new Notary();
  notaryTwo.setHost("notary2.thoughtcrime.org");
  notaryTwo.setSSLPort(443);
  notaryTwo.setHTTPPort(80);
  notaryTwo.setEnabled(true);
  notaryTwo.setCertificate("-----BEGIN CERTIFICATE-----\nMIIDlDCCAnwCCQDVML1LmT7cuTANBgkqhkiG9w0BAQUFADCBijELMAkGA1UEBhMC\nVVMxEzARBgNVBAgTCkNhbGlmb3JuaWExFjAUBgNVBAcTDVNhbiBGcmFuY2lzY28x\nGjAYBgNVBAoTEVRob3VnaHRjcmltZSBMYWJzMQ8wDQYDVQQLEwZOb3RhcnkxITAf\nBgNVBAMTGG5vdGFyeTIudGhvdWdodGNyaW1lLm9yZzAgFw0xMTA2MjkyMDUyMjda\nGA8xOTE1MDUxNDE0MjQxMVowgYoxCzAJBgNVBAYTAlVTMRMwEQYDVQQIEwpDYWxp\nZm9ybmlhMRYwFAYDVQQHEw1TYW4gRnJhbmNpc2NvMRowGAYDVQQKExFUaG91Z2h0\nY3JpbWUgTGFiczEPMA0GA1UECxMGTm90YXJ5MSEwHwYDVQQDExhub3RhcnkyLnRo\nb3VnaHRjcmltZS5vcmcwggEiMA0GCSqGSIb3DQEBAQUAA4IBDwAwggEKAoIBAQCx\nEMacdrL4/CM6BAekH0TA0ca4A694svZwdz8igwSuqlBpFTgkJ4iLgL0gizuQy1Iz\nhz5Xpp7Ucu83OeSxEc+RudcSJWi+3rV2RwdX9oDOlhy2XTFqxITWNM9PATBupSVo\n1pQfEh6mjB5BJmu5ISk6YB/wqGP7Tqkdh2OoimgUwfNaK/jon5GI7G3OWPivdFKT\nCUiQBm798NlChdlUu6+VSbFDX/2Nsu6dk2RP3oR4zYKFIOQ701gxfh4CugS+C/hx\n50D9BkSvUax7glq3aB3W3qwLMBiqY4xFoF+vybrU05ZLmYsBOl7hAnfHG/ArP75t\nkvyJE88GXqg4lJSP3/d5AgMBAAEwDQYJKoZIhvcNAQEFBQADggEBAEGsjvWJLMgI\nKqybiE+yGB6qBjGMnMDTdznLy0dNBGjBv122MgSSK9GWbrKK/5JIia66qMZ9qEVL\n1aV4E/cr0EQfBh5vJe+9K43WVpQ/fqZ/e+s7AfGCQE900svWRaLc9ZBCGxQ/R6+B\nDnPS3foxaS3kp8i+Jc0DA51/S/ErohR2J8iXMZrRJsGkyBe62CwQ5i4Ik9Z6WL3e\nfKZMCOvpl6u1V4ZumT6Em6KGR9USeeKfh0iKZf61/SJVxj07D7gxUqEBPIkI1BEL\nbOEOvOATvHEM4WqMi9eki5wsjyK7a5xJBwcnJoSzDdTHiXqiKD7NjVRKD1tId0Cp\nRhWdypCXL8c=\n-----END CERTIFICATE-----\n");

  notaryList.push(notaryOne);
  notaryList.push(notaryTwo);

  return notaryList;
};

SettingsManager.prototype.loadPreferences = function() {
  var settings = this.getInputSettingsObject();

  if (!settings) {
    this.notaries = this.getDefaultNotaryList();
    return;
  }

  var rootElement                   = settings.getElementsByTagName("convergence");
  this.enabled                      = (rootElement.item(0).getAttribute("enabled") == "true");
  this.cacheCertificatesEnabled     = (rootElement.item(0).getAttribute("cache_certificates") == "true");
  this.notaryBounceEnabled          = (rootElement.item(0).getAttribute("notary_bounce") == "true");
  this.connectivityIsFailureEnabled = (rootElement.item(0).getAttribute("connectivity_failure") == "true");
  this.verificationThreshold        = rootElement.item(0).getAttribute("threshold");

  dump("Settings loaded threshold: " + this.verificationThreshold + "\n");

  this.shortStatus                  = (rootElement.item(0).getAttribute("shortStatus") == "true");

  if (!rootElement.item(0).hasAttribute("cache_certificates")) {
    this.cacheCertificatesEnabled = true;
  }

  if (!rootElement.item(0).hasAttribute("notary_bounce")) {
    this.notaryBounceEnabled = true;
  }

  if (!rootElement.item(0).hasAttribute("connectivity_failure")) {
    this.connectivityIsFailureEnabled = true;
  }

  if (!rootElement.item(0).hasAttribute("threshold")) {
    this.verificationThreshold = "majority";
  }  

  var notaryElements = settings.getElementsByTagName("notary");

  for (var i=0;i<notaryElements.length;i++) {
    var element = notaryElements.item(i);
    element.QueryInterface(Components.interfaces.nsIDOMElement);

    var notary = new Notary();
    notary.deserialize(element);

    this.notaries.push(notary);
  }
};
