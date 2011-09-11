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

# The base class for all verifier backends.  You get the host, port,
# and fingerprint of the target to verify, and return a Deferred.

# Callback on the Deferred with a (statusCode, fingerprintToCache) tuple,
# indicating the status code to return to the client as well as what fingerprint
# to cache for this target, where fingerprintToCache can be None if the cache
# should not be updated.

class Verifier:

    def __init__(self):
        pass

    def verify(self, host, port, fingerprint):
        raise NotImplementedError("Abstract method!")
