import hashlib, json, base64, logging
from M2Crypto import BIO, RSA

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

        for row in recordRows:
            timestamp   = {'start' : str(row[1]), 'finish' : str(row[2])}
            fingerprint = {'fingerprint' : str(row[0]),
                           'timestamp' : timestamp }

            fingerprintList.append(fingerprint)

        result = {'fingerprintList' : fingerprintList}

        self.request.write(self.signResponse(result))
        self.request.finish()        
        
