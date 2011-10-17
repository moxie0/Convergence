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
 * This class uses the ContentPolicy API to redirect outbound requests
 * for files with a ".notary" extension back to the Convergence addon,
 * to be inspected as an import bundle.
 *
 **/


Components.utils.import("resource://gre/modules/XPCOMUtils.jsm");

function ConvergenceContentPolicy() { 
  this.wrappedJSObject    = this;
  this.notaryExpression   = new RegExp("http[s]?:\/\/.+\\.notary");
  this.convergenceManager = Components.classes['@thoughtcrime.org/convergence;1'].getService().wrappedJSObject;  
}

ConvergenceContentPolicy.prototype = {
  classDescription:  "Convergence NotaryWatcherComponent",
  classID:           Components.ID("{6B065D8C-9B68-11E0-8355-062C4924019B}"),
  contractID:        "@thoughtcrime.org/convergence-contentpolicy;1",
  QueryInterface:    XPCOMUtils.generateQI([Components.interfaces.nsIContentPolicy]),
  _xpcom_categories: [{category: "content-policy"}],

  shouldLoad: function(aContentType, aContentLocation, aRequestOrigin, aContext, aMimeTypeGuess, aExtra) {
    if (this.notaryExpression.test(aContentLocation.spec)) {
      dump("********* DETECTED NOTARY FILE ***************\n");

      ConvergenceUtil.persistUrl(aContentLocation.spec, function(temporaryFile) {
	  var observerService = Components.classes["@mozilla.org/observer-service;1"]
	                        .getService(Components.interfaces.nsIObserverService);  
	  observerService.notifyObservers(observerService, "convergence-add-notary", temporaryFile.path);
	});

      return Components.interfaces.nsIContentPolicy.REJECT_REQUEST;
    }

    return Components.interfaces.nsIContentPolicy.ACCEPT;
  },

  shouldProcess: function(aContentType, aContentLocation, aRequestOrigin, aContext, aMimeType, aExtra) {
    return true;
  },
};

var components = [ConvergenceContentPolicy];
/**
 * XPCOMUtils.generateNSGetFactory was introduced in Mozilla 2 (Firefox 4).
 * XPCOMUtils.generateNSGetModule is for Mozilla 1.9.2 (Firefox 3.6).
 */
if (XPCOMUtils.generateNSGetFactory)
  var NSGetFactory = XPCOMUtils.generateNSGetFactory(components);
else
  var NSGetModule = XPCOMUtils.generateNSGetModule(components);

/** Component Loading **/

var loadScript = function(isChrome, subdir, filename) {
  try {
    var path = __LOCATION__.parent.clone();

    if (isChrome) {
      path = path.parent.clone();
      path.append("chrome");
      path.append("content");
    }

    if (subdir != null) {
      path.append(subdir);      
    }

    path.append(filename);

    dump("Loading: " + path.path + "\n");

    var fileProtocol = Components.classes["@mozilla.org/network/protocol;1?name=file"]
    .getService(Components.interfaces["nsIFileProtocolHandler"]);
    var loader       = Components.classes["@mozilla.org/moz/jssubscript-loader;1"]
    .getService(Components.interfaces["mozIJSSubScriptLoader"]);
        
    loader.loadSubScript(fileProtocol.getURLSpecFromFile(path));

    dump("Loaded!\n");
  } catch (e) {
    dump("Error loading component script: " + path.path + " : " + e + " , " + e.stack + "\n");
  }
};

loadScript(true, "util", "ConvergenceUtil.js");