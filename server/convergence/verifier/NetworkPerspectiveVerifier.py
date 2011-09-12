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

from twisted.internet import reactor, defer
from twisted.internet import ssl, reactor
from twisted.internet.protocol import ClientFactory, Protocol
from twisted.internet.ssl import ContextFactory

from OpenSSL.SSL import Context, SSLv23_METHOD, TLSv1_METHOD, VERIFY_PEER, VERIFY_FAIL_IF_NO_PEER_CERT, OP_NO_SSLv2
from Verifier import Verifier
import logging

class NetworkPerspectiveVerifier(Verifier):
    """
    This class is responsible for verifying a target fingerprint
    by connecting to the same target and checking if the fingerprints
    match across network perspective.
    """

    def __init__(self):
        Verifier.__init__(self)

    def verify(self, host, port, fingerprint):
        deferred       = defer.Deferred()
        factory        = CertificateFetcherClientFactory(deferred)
        contextFactory = CertificateContextFactory(deferred, fingerprint)

        logging.debug("Fetching certificate from: " + host + ":" + str(port))
        
        reactor.connectSSL(host, int(port), factory, contextFactory)
        return deferred
        
class CertificateFetcherClient(Protocol):
    def __init__(self):
        pass
        
    def connectionMade(self):
        logging.debug("Connection made...")

class CertificateFetcherClientFactory(ClientFactory):

    def __init__(self, deferred):
        self.deferred = deferred

    def buildProtocol(self, addr):
        return CertificateFetcherClient()

    def clientConnectionFailed(self, connector, reason):
        logging.warning("Connection to destination failed...")
        self.deferred.errback(Exception("Connection failed"))
    
    def clientConnectionLost(self, connector, reason):
        logging.debug("Connection lost...")
        
        if not self.deferred.called:
            logging.warning("Lost before verification callback...")
            self.deferred.errback(Exception("Connection lost"))

class CertificateContextFactory(ContextFactory):
    isClient = True

    def __init__(self, deferred, fingerprint):
        self.deferred    = deferred
        self.fingerprint = fingerprint
    
    def getContext(self):
        ctx = Context(SSLv23_METHOD)
        ctx.set_verify(VERIFY_PEER | VERIFY_FAIL_IF_NO_PEER_CERT, self.verifyCertificate)
        ctx.set_options(OP_NO_SSLv2)
        return ctx
    
    def verifyCertificate(self, connection, x509, errno, depth, preverifyOK):
        logging.debug("Verifying certificate...")
        
        if depth != 0:
            return True

        fingerprintSeen = x509.digest("sha1")

        if fingerprintSeen == self.fingerprint:
            self.deferred.callback((200, fingerprintSeen))
        else:
            self.deferred.callback((409, fingerprintSeen))

        return False
