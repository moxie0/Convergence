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
