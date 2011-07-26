# Copyright (c) 2010 Moxie Marlinspike
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

from twisted.web.http import Request
from twisted.internet import reactor

from NotaryConnectionFactory import NotaryConnectionFactory
from NotaryConnection import NotaryConnection

import re, logging

class ConnectRequest(Request):

    def __init__(self, channel, queued, reactor=reactor):
        Request.__init__(self, channel, queued)
        self.reactor          = reactor

    def isValidConnectRequest(self, method, uri):
        if (method is None or uri is None):
            return False

        if (uri.find(":") != -1) and (not uri.endswith(":4242")):
            return False
            
        return method.strip() == "CONNECT"    

    def process(self):
        logging.debug("Got connect request: " + self.uri)
        
        if (self.isValidConnectRequest(self.method, self.uri)):
            logging.debug("Got connect request...")
            self.proxyRequest(self.uri);
        else:
            logging.debug("Denying request...")
            self.denyRequest()            

    def proxyRequest(self, uri):
        connectionFactory          = NotaryConnectionFactory(self)
        connectionFactory.protocol = NotaryConnection

        if (uri.find(":") != -1):
            uri = uri.split(":")[0]

        logging.debug("Connecting to: " + uri)

        self.reactor.connectTCP(uri, 4242, connectionFactory)

    def denyRequest(self):
        self.setResponseCode(403, "Access Denied")
        self.setHeader("Connection", "close")
        self.write('<html>The request you issued is not an authorized Convergence Notary request.\n')
        self.finish()
