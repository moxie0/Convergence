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

from twisted.web.http import Request
from twisted.internet import reactor
from twisted.internet.protocol import BaseProtocol, ClientFactory

import re, logging

# This class is responsible for parsing incoming requests
# on the HTTP port.  The only method it supports is CONNECT,
# and will only setup a proxy tunnel to a destination port
# of 4242.

class ConnectRequest(Request):

    def __init__(self, channel, queued, reactor=reactor):
        Request.__init__(self, channel, queued)
        self.reactor          = reactor

    def isValidConnectRequest(self, method, destinations):
        if (method is None or destinations is None or len(destinations) == 0):
            return False

        for destination in destinations:
            if ((destination.find(":") != -1) and (not destination.endswith(":4242"))):
                return False

            if ((destination.find("+") != -1) and (not destination.endswith("+4242"))):
                return False
            
        return method.strip() == "CONNECT"    

    def getDestinations(self):
        destinations = []

        if not self.uri is None:
            destinations.append(self.uri)

        headers            = self.getAllHeaders()
        destinationHeaders = self.requestHeaders.getRawHeaders("x-convergence-notary")

        if destinationHeaders is None:
            return destinations
        else:
            destinations.extend(destinationHeaders)
            return destinations

    def process(self):
        logging.debug("Got connect request: " + self.uri)

        destinations = self.getDestinations()
        
        if (self.isValidConnectRequest(self.method, destinations)):
            logging.debug("Got connect request...")
            self.proxyRequest(destinations);
        else:
            logging.debug("Denying request...")
            self.denyRequest()            

    def proxyRequest(self, destinations):
        factory          = NotaryConnectionFactory(self)
        factory.protocol = NotaryConnection
        
        for destination in destinations:            
            if (destination.find(":") != -1):
                destination = destination.split(":")[0]
            elif (destination.find("+") != -1):
                destination = destination.split("+")[0]

            logging.debug("Connecting to: " + destination)

            connector = self.reactor.connectTCP(destination, 4242, factory)
            factory.addConnector(connector, destination)

    def denyRequest(self):
        self.setResponseCode(403, "Access Denied")
        self.setHeader("Connection", "close")
        self.write('<html>The request you issued is not an authorized Convergence Notary request.\n')
        self.finish()


# This class is resonsible for setting up the proxy tunnel to another
# notary.
class NotaryConnection(BaseProtocol):

    def __init__(self, client, host):
        self.client = client
        self.host   = host

    def connectionMade(self):
        logging.debug("Connection made to : " + self.host + "...")
        self.client.channel.proxyConnection = self
        self.client.channel.setRawMode()
        self.client.transport.write("HTTP/1.0 200 Connection Established\r\n")
        self.client.transport.write("Proxy-Agent: Convergence\r\n")
        self.client.transport.write("X-Convergence-Notary: " + self.host + "\r\n\r\n");

    def dataReceived(self, data):
        self.client.transport.write(data)

    def connectionLost(self, reason):
        logging.debug("Connection lost from server: " + str(reason))
        self.client.transport.loseConnection()

# The ConnectionFactory for a proxy tunnel to another notary.
class NotaryConnectionFactory(ClientFactory):
    def __init__(self, client):
        self.client             = client
        self.connectors         = []
        self.connectorHosts     = {}
        self.connectedConnector = None

    def buildProtocol(self, addr):
        if self.connectedConnector is None:            
            for connector in self.connectors[:]:
                if connector.state == "connected":
                    self.connectedConnector = connector
                else:
                    self.connectors.remove(connector)
                    del self.connectorHosts[connector]
                    connector.disconnect()

            host = self.connectorHosts[self.connectedConnector]
            return NotaryConnection(self.client, host)

    def addConnector(self, connector, host):
        self.connectors.append(connector)
        self.connectorHosts[connector] = host
    
    def clientConnectionFailed(self, connector, reason):
        if connector in self.connectors:
            logging.debug("Connection to notary failed: " + self.connectorHosts[connector] + " , " + str(reason))
            self.connectors.remove(connector)
            del self.connectorHosts[connector]

        if len(self.connectors) == 0:
            logging.warning("Connection to notary failed!")
            self.client.setResponseCode(int(404), "Unable to connect")
            self.client.setHeader("Connection", "close")
            self.client.write("<html><body>Unable to connect to notary!</body></html>")
            self.client.finish()

