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


function onDialogLoad() {
}


function onDialogOK() {  
  var host        = document.getElementById("host").value;
  var port        = document.getElementById("port").value;
  var fingerprint = document.getElementById("fingerprint").value;

  if (!host || !port || !fingerprint) {
    alert("Sorry, you must specify a host, port, and fingerprint.");
    return false;
  }

  var formatFailure = false;
  if (fingerprint.length != 59) {
    formatFailure = true;
  } else {
    for (var i = 0; i < fingerprint.length; i++) {
      if ((i+1) % 3 == 0) {
        if (fingerprint[i] != ':') {
          formatFailure = true;
          break;
        }
      } else {
        if (!(fingerprint[i] >= '0' && fingerprint[i] <= '9') &&
            !(fingerprint[i] >= 'A' && fingerprint[i] <= 'F'))
        {
          formatFailure = true;
          break;
        }
      }
    }
  }
  if (formatFailure) {
    alert("Sorry, you must specify a correctly formatted fingerprint.");
    return false;
  }

  var retVal = window.arguments[0];
  var notary;

  retVal.fingerprint = {
    host: host,
    port: port,
    fingerprint: fingerprint
  };

  return true;
}

