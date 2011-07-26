from twisted.internet import defer

from CertificateFetcher import CertificateFetcher
import logging

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
