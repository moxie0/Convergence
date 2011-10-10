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

Components.utils.import("resource://gre/modules/NetUtil.jsm");

function onDialogLoad() {
}

function onBrowse() {
  var nsIFilePicker = Components.interfaces.nsIFilePicker;
  var fp            = Components.classes["@mozilla.org/filepicker;1"].createInstance(nsIFilePicker);
  fp.init(window, "Select a .notary bundle", nsIFilePicker.modeOpen);
  fp.appendFilter("Notary Bundles", "*.notary");
  
  var res = fp.show();
  if (res == nsIFilePicker.returnOK){
    document.getElementById("notary-local").value = fp.file.path;
  }
}


function handleLocalNotaryBundle(bundlePath) {
  var convergence = Components.classes['@thoughtcrime.org/convergence;1']
                    .getService().wrappedJSObject;

  var retvalue    = window.arguments[0];

  try {
    retvalue.notary = convergence.getNewNotaryFromBundle(bundlePath);
  } catch (exception) {
    dump("Got exception: " + exception + " , " + exception.stack + "\n");
    alert("Unknown Notary bundle version: " + exception.version + "!");
    return false;
  }

  return true;
}

function handleRemoteNotaryBundle(bundleUrl) {
  var dialog = document.getElementById("convergence-add-notary");

  ConvergenceUtil.persistUrl(bundleUrl, function(temporaryFile) {
      dialog.asyncInProgress = false;
      handleLocalNotaryBundle(temporaryFile.path);
      dialog.asyncComplete   = true;
      dialog.acceptDialog();
    });

  return false;
}

function onDialogOK() {  
  if (document.getElementById("convergence-add-notary").asyncComplete)
    return true;

  if (document.getElementById("convergence-add-notary").asyncInProgress)
    return false;
  
  var localNotaryPath = document.getElementById("notary-local").value.replace(/^\s+|\s+$/g, "");
  var remoteNotaryUrl = document.getElementById("notary-remote").value.replace(/^\s+|\s+$/g, "");

  if (localNotaryPath.length != 0) {
    return handleLocalNotaryBundle(localNotaryPath);
  } else if (remoteNotaryUrl.length != 0) {
    return handleRemoteNotaryBundle(remoteNotaryUrl);
  } else {
    alert("Whoops, you must specify a local or remote path!");    
    return false;
  }
}

