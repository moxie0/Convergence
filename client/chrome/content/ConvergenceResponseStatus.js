
function ConvergenceResponseStatus(details) {
  this.details = details;
}

ConvergenceResponseStatus.VERIFICATION_INCONCLUSIVE = -2;
ConvergenceResponseStatus.ANONYMIZATION_RELAY       = -1;
ConvergenceResponseStatus.VERIFICATION_SUCCESS      = 0;
ConvergenceResponseStatus.VERIFICATION_FAILURE      = 1;
ConvergenceResponseStatus.CONNECTIVITY_FAILURE      = 2;

ConvergenceResponseStatus.prototype.toString = function() {
  var result = "";

  for (var i in this.details) {
    result += (this.details[i].notary + " : " + this.stringifyResponseCode(this.details[i].status) + "\n");
  }

  return result;
};

ConvergenceResponseStatus.prototype.stringifyResponseCode = function(responseCode) {
  switch (responseCode) {
  case ConvergenceResponseStatus.VERIFICATION_INCONCLUSIVE: return "Verification Inconclusive.";
  case ConvergenceResponseStatus.ANONYMIZATION_RELAY:       return "Anonymization Relay.";
  case ConvergenceResponseStatus.VERIFICATION_SUCCESS:      return "Verification Success.";
  case ConvergenceResponseStatus.VERIFICATION_FAILURE:      return "Verification Failure.";
  case ConvergenceResponseStatus.CONNECTIVITY_FAILURE:      return "Connectivity Failure.";
  }

  return "Unknown";
};


