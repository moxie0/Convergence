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

import logging

# This class is responsible for updating the notary's certificate
# cache.  It is initiated on a cache-miss or a cache-mismatch,
# and queries the target, then puts the target certificate's
# fingerprint in the cache, as well as returning it to the caller.

class CacheUpdater:

    def __init__(self, database, verifier):
        self.database = database
        self.verifier = verifier

    def updateRecordsComplete(self, recordRows, code):
        return (code, recordRows)

    def updateRecordsError(self, error, deferred):
        logging.warning("Update records error: " + str(error))
        return error

    def handleVerifyCertificateComplete(self, (responseCode, fingerprint), host, port):
        logging.debug("Got fingerprint: " + str(fingerprint))

        if fingerprint is None:
            return (responseCode, None)
        else:
            deferred = self.database.updateRecordsFor(host, port, fingerprint)
            deferred.addCallback(self.updateRecordsComplete, responseCode)
            deferred.addErrback(self.updateRecordsError)

            return deferred

    def handleVerifyCertificateError(self, error):
        logging.warning("Fetch certificate error: " + str(error))
        return error

    def updateCache(self, host, port, submittedFingerprint):
        deferred = self.verifier.verify(host, port, submittedFingerprint)
        deferred.addCallback(self.handleVerifyCertificateComplete, host, port)
        deferred.addErrback(self.handleVerifyCertificateError)

        return deferred        
