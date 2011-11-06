# Copyright (c) 2011 Moxie Marlinspike
#
# This program is free software; you can redistribute it and/or
# modify it under the terms of the GNU General Public License as
# published by the Free Software Foundation; either version 3 of the
# License, or (at your option) any later version.
#
# This program is distributed in the hope that it will be useful, but
# WITHOUT ANY WARRANTY; without even the implied warranty of
# MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the GNU
# General Public License for more details.
#
# You should have received a copy of the GNU General Public License
# along with this program; if not, write to the Free Software
# Foundation, Inc., 59 Temple Place, Suite 330, Boston, MA 02111-1307
# USA
#

import os, logging

class Verifier:
    """The base class for all verifier back ends."""

    def __init__(self):
        pass

    def verify(self, host, port, fingerprint):
        """
        Verify whether are fingerprint is valid for a given target.

        This is an asynchronous call, and implementations return a Deferred
        object.  The callback is a (responseCode, fingerprintToCache) tuple,
        where fingerprintToCache can be None if the responseCode is 409 and
        the implementation does not know of any valid fingerprint.

        :Parameters:
          - `host` (str) - The target's host name.
          - `port` (int) - The target's port.
          - `fingerpring` (str) - The fingerprint in question for this target.

        :Returns Type:
          Deferred

        """
        raise NotImplementedError("Abstract method!")

    def getDescription(self):
        """
        getDescription is called if a GET request is received on the unencrypted port.
        The purpose of this is to inform the user about the notary.

        :Returns Type:
            String
        """
        try:
            self.htmlFile = os.path.join(os.path.dirname(os.path.abspath(__file__)), self.__class__.__name__ + ".html")
            logging.debug("Trying to serve file: " + self.htmlFile + "...")
            self.fh = open(self.htmlFile)
            self.content = self.fh.read()
            self.fh.close()
            return self.content
        except IOError:
            logging.debug("Did not find file, serving class name")
            return None
