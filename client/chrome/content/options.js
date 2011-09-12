// Copyright (c) 2010 Moxie Marlinspike <moxie@thoughtcrime.org>

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

var convergence;
var settingsManager;
var notaries;
var cachedCerts;

function getNotaryTree() {
  return document.getElementById("notaryTree");
}

function onOptionsLoad() {
  convergence     = Components.classes['@thoughtcrime.org/convergence;1'].getService().wrappedJSObject;
  settingsManager = convergence.getSettingsManager();
  notaries        = settingsManager.getNotaryList();

  updateAdvancedSettings();
  updateNotarySettings();
  updateCacheSettings();
}

function onOptionsSave() {
  settingsManager.setCacheCertificates(document.getElementById("cache-certificates").checked);
  settingsManager.setNotaryBounce(document.getElementById("notary-bounce").checked);
  settingsManager.setConnectivityErrorIsFailure(document.getElementById("connectivity-failure").checked);
  settingsManager.setVerificationThreshold(document.getElementById("threshold").selectedItem.id);

  settingsManager.setNotaryList(notaries);
  settingsManager.savePreferences();  
  issuePreferencesChangedNotification();

  if (isAllNotariesDisabled()) {
    alert("No configured notaries are enabled, disabling Convergence.");
    convergence.setEnabled(false);
    issueConvergenceDisabledNotification();
  }

  return true;
}

function onRemoveNotary() {
  var tree = getNotaryTree();
  notaries.splice(tree.currentIndex, 1);
  updateNotarySettings();
}

function onEditNotary() {
  var tree   = getNotaryTree();
  var notary = notaries[tree.currentIndex];
  var retVal = {notary: notary};

  window.openDialog("chrome://convergence/content/addEditNotary.xul", "dialog2", "modal", retVal);
  updateNotarySettings();
}

function onAddNotary() {
  var retVal = {notary: null};
  window.openDialog("chrome://convergence/content/addEditNotary.xul", "dialog2", "modal", retVal).focus();

  if (retVal.notary) {
    notaries.push(retVal.notary);
    updateNotarySettings();
  }
}

function isAllNotariesDisabled() {
  for (var i=0;i<notaries.length;i++) {
    if (notaries[i].getEnabled()) {
      return false;
    }
  }

  return true;
};

function updateAdvancedSettings() {
  var cacheCertificatesEnabled     = convergence.getSettingsManager().getCacheCertificates();
  var notaryBounceEnabled          = convergence.getSettingsManager().getNotaryBounce();
  var connectivityIsFailureEnabled = convergence.getSettingsManager().getConnectivityErrorIsFailure();
  var verificationThreshold        = convergence.getSettingsManager().getVerificationThreshold();

  document.getElementById("cache-certificates").checked   = cacheCertificatesEnabled;
  document.getElementById("notary-bounce").checked        = notaryBounceEnabled;
  document.getElementById("connectivity-failure").checked = connectivityIsFailureEnabled;
  document.getElementById("threshold").selectedItem       = document.getElementById(verificationThreshold);
};

function updateCacheSettings() {
  var certificateCache = convergence.getNativeCertificateCache();
  cachedCerts          = certificateCache.fetchAll();
  certificateCache.close();

  var cacheTree = document.getElementById("cacheTree");

  cacheTree.view = {
    rowCount: cachedCerts.length,

    getCellText : function(row, column) {
      var cachedCert = cachedCerts[row];

      if      (column.id == "cacheLocation")    return cachedCert.location;
      else if (column.id == "cacheFingerprint") return cachedCert.fingerprint;
      else if (column.id == "cacheTimestamp")   return formatDate(cachedCert.timestamp);
    },

    setTree: function(treebox){this.treebox = treebox; },
    isContainer: function(row){return false;},
    isSeparator: function(row){ return false; },
    isSorted: function(){ return false; },
    isEditable: function(row, column) {return false;},
    getLevel: function(row){ return 0; },
    getImageSrc: function(row,col){ return null; },
    getRowProperties: function(row,props){},
    getCellProperties: function(row,col,props){},
    getColumnProperties: function(colid,col,props){}
  };
};

function updateNotarySettings() {
  var notaryTree = getNotaryTree();

  notaryTree.view = {  
    rowCount : notaries.length,
    
    getCellText : function(row, column) {
      var notary = notaries[row];

      if      (column.id == "notaryHost")     return notary.getHost();
      else if (column.id == "notaryHTTPPort") return notary.getHTTPPort();
      else if (column.id == "notarySSLPort")  return notary.getSSLPort();
    },  

    getCellValue: function(row, col) {
      return notaries[row].getEnabled();
    },

    setCellValue: function(row, col, val) {
      notaries[row].setEnabled(val == "true");
      update();
    },

    setTree: function(treebox){this.treebox = treebox; },  
    isContainer: function(row){return false;},  
    isSeparator: function(row){ return false; },  
    isSorted: function(){ return false; },  
    isEditable: function(row, column) {
      if (column.id == "notaryEnabled") return true;
      else                              return false;
    },
    getLevel: function(row){ return 0; },  
    getImageSrc: function(row,col){ return null; },  
    getRowProperties: function(row,props){},  
    getCellProperties: function(row,col,props){},  
    getColumnProperties: function(colid,col,props){}  
  };    
}

function issuePreferencesChangedNotification() {  
  // convergence.update();
}

function issueConvergenceDisabledNotification() {
  var observerService = Components.classes["@mozilla.org/observer-service;1"]
    .getService(Components.interfaces.nsIObserverService);  
  observerService.notifyObservers(observerService, "convergence-disabled", null);
}

function onRemoveCertificate() {
  var tree             = document.getElementById("cacheTree");
  var id               = cachedCerts[tree.currentIndex].id;
  var certificateCache = convergence.getNativeCertificateCache();

  certificateCache.deleteCertificate(id);
  certificateCache.close();
  updateCacheSettings();
}

function onClearCache() {
  var certificateCache = convergence.getNativeCertificateCache();
  certificateCache.clearCache();
  certificateCache.close();
  updateCacheSettings();
}

function onAddCertificate() {
  var retVal = {fingerprint: null};
  window.openDialog("chrome://convergence/content/addCertificate.xul", "dialog2", "modal", retVal).focus();

  if (retVal.fingerprint) {
    var certificateCache = convergence.getNativeCertificateCache();
    certificateCache.cacheFingerprint(retVal.fingerprint.host, retVal.fingerprint.port, retVal.fingerprint.fingerprint);
    certificateCache.close();
    updateCacheSettings();
  }
}

function formatDate(date) {
  var year  = date.getFullYear();
  var month = date.getMonth()+1;
  var dom   = date.getDate();
  var hour  = date.getHours();
  var min   = date.getMinutes();
  var sec   = date.getSeconds();

  if (month < 10) month = "0" + month;
  if (dom < 10)   dom   = "0" + dom;
  if (hour < 10)  hour  = "0" + hour;
  if (min < 10)   min   = "0" + min;
  if (sec < 10)   sec   = "0" + sec;

  return year + "-" + month + "-" + dom + " " + hour + ":" + min + ":" + sec;
}

