
function NotaryResponse(reply) {
  // this.signatureType = reply.attributes.getNamedItem("sig_type").value;

  // if (this.signatureType != "rsa-md5") 
  //   throw "Invalid Signature Type";

  // this.signature  = reply.attributes.getNamedItem("sig").value;
  this.keyObjects = this.parseKeyObjects(reply);
}

NotaryResponse.prototype.getCurrentFingerprint = function() {
  return this.keyObjects[0].key;
};

NotaryResponse.prototype.hasFingerprint = function(fingerprint) {
  for (var i=0;i<this.keyObjects.length;i++) {
    if (this.keyObjects[i].key == fingerprint) {
      return true;
    }
  }

  return false;
}

NotaryResponse.prototype.parseKeyNode = function(keyNode) {
  var keyInfo = {
    "key"        : keyNode.attributes.getNamedItem("fp").value,
    // "keyType"    : keyNode.attributes.getNamedItem("type").value,
    "timestamps" : []
  };

  for (var i=0;i<keyNode.childNodes.length;i++) {
    var timestampNode = keyNode.childNodes[i];

    if (timestampNode.nodeName != "timestamp")
      continue;

    var timestampInfo = {
      "start" : timestampNode.attributes.getNamedItem("start").value,
      "end"   : timestampNode.attributes.getNamedItem("end").value
    };        
  }

  return keyInfo;
};

NotaryResponse.prototype.parseKeyObjects = function(reply) {
  var keyObjects = new Array();

  for (var i=0;i<reply.childNodes.length;i++) {
    var keyNode = reply.childNodes[i];

    if (keyNode.nodeName != "key")
      continue;

    keyObjects.push(this.parseKeyNode(keyNode));
  }

  return keyObjects;
};