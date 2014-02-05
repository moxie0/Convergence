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

import hashlib, simplejson as json, base64, logging
from M2Crypto import BIO, RSA

from twisted.web.resource import Resource
from twisted.protocols.basic import FileSender
from twisted.python.log import err
from twisted.web.server import NOT_DONE_YET

from FingerprintDatabase import FingerprintDatabase
from CacheUpdater import CacheUpdater
from NotaryResponse import NotaryResponse

# This class is responsible for responding to actions
# on the REST noun "target," which results in triggering
# verification or returning certificate histories for
# a destination target.

class TargetPage(Resource):

    isLeaf = True

    def __init__(self, databaseConnection, privateKey, verifier):
        self.database     = FingerprintDatabase(databaseConnection)
        self.cacheUpdater = CacheUpdater(self.database, verifier)
        self.privateKey   = privateKey

    def cacheUpdateComplete(self, (code, recordRows), request):
        self.sendResponse(request, code, recordRows)

    def cacheUpdateError(self, error, request):
        logging.warning("Cache update error: " + str(error))
        self.sendErrorResponse(request, 503, "Internal Error")

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
