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

import hashlib, json, base64, logging
from M2Crypto import BIO, RSA

# This class is responsible for formatting verification response
# data into JSON, and signing it.

class NotaryResponse:
    
    def __init__(self, request, privateKey):
        self.request    = request
        self.privateKey = privateKey

    def signResponse(self, response):
        digest = hashlib.sha1()
        digest.update(json.dumps(response))

        bio                   = BIO.MemoryBuffer(self.privateKey)
        key                   = RSA.load_key_bio(bio)
        signature             = key.sign(digest.digest(), 'sha1')
        response['signature'] = base64.standard_b64encode(signature)

        return json.dumps(response)

    def sendResponse(self, code, recordRows):
        self.request.setHeader("Content-Type", "application/json")
        self.request.setResponseCode(code)

        fingerprintList = []

        if recordRows is not None:
            for row in recordRows:
                timestamp   = {'start' : str(row[1]), 'finish' : str(row[2])}
                fingerprint = {'fingerprint' : str(row[0]),
                               'timestamp' : timestamp }

                fingerprintList.append(fingerprint)

        result = {'fingerprintList' : fingerprintList}

        self.request.write(self.signResponse(result))
        self.request.finish()        
        
