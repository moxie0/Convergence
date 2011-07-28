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

from twisted.internet import defer

from CertificateFetcher import CertificateFetcher
import logging

# This class is responsible for updating the notary's certificate
# cache.  It is initiated on a cache-miss or a cache-mismatch,
# and queries the target, then puts the target certificate's
# fingerprint in the cache, as well as returning it to the caller.

class CacheUpdater:

    def __init__(self, database):
        self.database = database

    def updateRecordsComplete(self, recordRows, deferred, code):
        deferred.callback((code, recordRows))

    def updateRecordsError(self, error, deferred):
        logging.warning("Update records error: " + str(error))
        deferred.errback("Error updating database.")

    def handleFetchCertificateComplete(self, fingerprint, deferred,
                                       host, port, submittedFingerprint):
        logging.debug("Got fingerprint: " + fingerprint)
        responseCode = None

        if fingerprint == submittedFingerprint:
            responseCode = 200
        else:
            responseCode = 409

        databaseDeferred = self.database.updateRecordsFor(host, port, fingerprint)
        databaseDeferred.addCallback(self.updateRecordsComplete, deferred, responseCode)
        databaseDeferred.addErrback(self.updateRecordsError, deferred)

    def handleFetchCertificateError(self, error, deferred):
        logging.warning("Fetch certificate error: " + str(error))
        deferred.errback("Error fetching certificate.")

    def updateCache(self, host, port, submittedFingerprint):
        deferred = defer.Deferred()

        certificateFetcher = CertificateFetcher(host, port)
        fetcherDeferred    = certificateFetcher.fetchCertificate()
        fetcherDeferred.addCallback(self.handleFetchCertificateComplete,
                                    deferred, host, port, submittedFingerprint)
        fetcherDeferred.addErrback(self.handleFetchCertificateError, deferred)

        return deferred
