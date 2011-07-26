import hashlib, json, base64, logging
from M2Crypto import BIO, RSA

from twisted.web.resource import Resource
from twisted.protocols.basic import FileSender
from twisted.python.log import err
from twisted.web.server import NOT_DONE_YET

from FingerprintDatabase import FingerprintDatabase
from CertificateFetcher import CertificateFetcher
from CacheUpdater import CacheUpdater
from NotaryResponse import NotaryResponse

class TargetPage(Resource):

    isLeaf = True

    def __init__(self, databaseConnection, privateKey):
        self.database     = FingerprintDatabase(databaseConnection)
        self.cacheUpdater = CacheUpdater(self.database)
        self.privateKey   = privateKey

    def cacheUpdateComplete(self, (code, recordRows), request):
        self.sendResponse(request, code, recordRows)

    def cacheUpdateError(self, error, request):
        logging.warning("Cache update error: " + str(error))
        self.sendErrorResponse(request, 503, "Error")

    def handleCacheMiss(self, request, host, port, submittedFingerprint):
        logging.debug("Handling cache miss...")
        deferred = self.cacheUpdater.updateCache(host, port, submittedFingerprint)
        deferred.addCallback(self.cacheUpdateComplete, request)
        deferred.addErrback(self.cacheUpdateError, request)
        
    def isCacheMiss(self, recordRows, fingerprint):
        if (recordRows == None or len(recordRows) == 0):
            return True

        if (fingerprint == None):
            return False

        for row in recordRows:
            if row[0] == fingerprint:
                return False

        return True

    def sendErrorResponse(self, request, code, message):
        request.setResponseCode(code)
        request.write('<html><body>' + message + '</body></html>')
        request.finish()

    def sendResponse(self, request, code, recordRows):
        response = NotaryResponse(request, self.privateKey)
        response.sendResponse(code, recordRows)

    def getRecordsComplete(self, recordRows, request, host, port, fingerprint):
        if (self.isCacheMiss(recordRows, fingerprint)):
            self.handleCacheMiss(request, host, port, fingerprint)
            return

        self.sendResponse(request, 200, recordRows)

    def getRecordsError(self, error, request):
        logging.warning("Get records error: " + str(error))
        self.sendErrorResponse(request, 503, "Error retrieving records.")

    def render(self, request):
        if request.method != "POST" and request.method != "GET":
            self.sendErrorResponse(request, 405, "Unsupported method.")
            return

        if len(request.postpath) == 0:
            self.sendErrorResponse(request, 400, "You must specify a target.")
            return

        target = request.postpath[0]

        if target.find("+") == -1:
            self.sendErrorResponse(request, 400, "You must specify a destination port.")
            return
        
        (host, port) = target.split("+")
        fingerprint  = None
        
        if (('fingerprint' not in request.args) and (request.method == "POST")):
            self.sendErrorResponse(request, 400, "You must specify a fingerprint.")
            return
        elif request.method == "POST":
            fingerprint = request.args['fingerprint'][0]
            logging.debug("Fingerprint: " + str(fingerprint))

        deferred = self.database.getRecordsFor(host, port)
        deferred.addCallback(self.getRecordsComplete, request, host, port, fingerprint)
        deferred.addErrback(self.getRecordsError, request)

        return NOT_DONE_YET
