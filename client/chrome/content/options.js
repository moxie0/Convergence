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

function getNotaryTree() {
  return document.getElementById("notaryTree");
}

function onOptionsLoad() {
  convergence     = Components.classes['@thoughtcrime.org/convergence;1'].getService().wrappedJSObject;
  settingsManager = convergence.getSettingsManager();
  notaries        = settingsManager.getNotaryList();
  update();
}

function onOptionsSave() {
  settingsManager.setCacheCertificates(document.getElementById("cache-certificates").checked);
  settingsManager.setNotaryBounce(document.getElementById("notary-bounce").checked);
  settingsManager.setConnectivityErrorIsFailure(document.getElementById("connectivity-failure").checked);
  settingsManager.setVerificationThreshold(document.getElementById("threshold").selectedItem.id);

  settingsManager.setNotaryList(notaries);
  settingsManager.savePreferences();  
  issuePreferencesChangedNotification();

  return true;
}

function onRemoveNotary() {
  var tree = getNotaryTree();
  notaries.splice(tree.currentIndex, 1);
  // notaryManager.removeNotaryAtIndex(tree.currentIndex);
  update();
}

function onEditNotary() {
  var tree   = getNotaryTree();
  // var notary  = notaryManager.getNotaryAtIndex(tree.currentIndex);
  var notary = notaries[tree.currentIndex];
  var retVal = {notary: notary};

  window.openDialog("chrome://convergence/content/addEditNotary.xul", "dialog2", "modal", retVal);
  update();
}

function onAddNotary() {
  var retVal = {notary: null};
  window.openDialog("chrome://convergence/content/addEditNotary.xul", "dialog2", "modal", retVal).focus();

  if (retVal.notary) {
    notaries.push(retVal.notary);
    // notaryManager.addNotary(retVal.notary);
    update();
  }
}

function update() {
  var cacheCertificatesEnabled     = convergence.getSettingsManager().getCacheCertificates();
  var notaryBounceEnabled          = convergence.getSettingsManager().getNotaryBounce();
  var connectivityIsFailureEnabled = convergence.getSettingsManager().getConnectivityErrorIsFailure();
  var verificationThreshold        = convergence.getSettingsManager().getVerificationThreshold();

  dump("threshold: " + verificationThreshold + "\n");
  dump("Currently selected: " + document.getElementById("threshold").selectedItem + "\n");

  document.getElementById("cache-certificates").checked   = cacheCertificatesEnabled;
  document.getElementById("notary-bounce").checked        = notaryBounceEnabled;
  document.getElementById("connectivity-failure").checked = connectivityIsFailureEnabled;
  document.getElementById("threshold").selectedItem       = document.getElementById(verificationThreshold);

  var notaryTree = getNotaryTree();

  notaryTree.view = {  
    rowCount : notaries.length, //notaryManager.getNotaryCount(),  
    
    getCellText : function(row, column) {
      var notary = notaries[row];
      // var notary = notaryManager.getNotaryAtIndex(row);

      if      (column.id == "notaryHost")     return notary.getHost();
      else if (column.id == "notaryHTTPPort") return notary.getHTTPPort();
      else if (column.id == "notarySSLPort")  return notary.getSSLPort();
    },  

    getCellValue: function(row, col) {
      return notaries[row].getEnabled();
      // return notaryManager.getNotaryAtIndex(row).getEnabled();
    },

    setCellValue: function(row, col, val) {
      // notaryManager.getNotaryAtIndex(row).setEnabled(val == "true");
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


