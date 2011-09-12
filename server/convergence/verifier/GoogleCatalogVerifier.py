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

import twisted.names.client
import logging

from Verifier import Verifier

class GoogleCatalogVerifier(Verifier):
    """
    This class is responsible for checking a certificate fingerprint
    in the Google Certificate Catalog.
    """

    CATALOG_HOST = "certs.googlednstest.com"
    
    def __init__(self):
        Verifier.__init__(self)

    def _dnsLookupComplete(self, result, fingerprint):
        logging.debug("Catalog result: " + str(result[0][0].payload.data[0]))
        return (200, fingerprint)

    def _dnsLookupError(self, error):
        logging.debug("Catalog resolution failure: " + str(error))
        return (409, None)

    def verify(self, host, port, fingerprint):
        formatted = "".join(fingerprint.split(":")).lower()
        deferred  = twisted.names.client.lookupText("%s.%s" % (formatted, self.CATALOG_HOST))

        deferred.addCallback(self._dnsLookupComplete, fingerprint)
        deferred.addErrback(self._dnsLookupError)

        return deferred
