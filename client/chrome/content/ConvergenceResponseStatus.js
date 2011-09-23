
function ConvergenceResponseStatus(details) {
  this.details = details;
}

ConvergenceResponseStatus.prototype.toString = function() {
  var result = "";

  for (var i in this.details) {
    result += (this.details[i].notary + " : " + this.stringifyResponseCode(this.details[i].status) + "\n");
  }

  return result;
};

ConvergenceResponseStatus.prototype.stringifyResponseCode = function(responseCode) {
  if (responseCode < 0) 
    return "Connectivity Failure";

  switch (responseCode) {
  case 0: return "Verification Failure.";
  case 1: return "Verification Success.";
  case 3: return "Anonymization Relay.";
  }

  return "Unknown";
};