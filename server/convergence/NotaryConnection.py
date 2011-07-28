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

import re, string, logging

from twisted.internet.protocol import BaseProtocol

# This class is resonsible for setting up the proxy tunnel to another
# notary.

class NotaryConnection(BaseProtocol):

    def __init__(self, client):
        self.client           = client        

    def connectionMade(self):
        logging.debug("Connection made...")
        self.client.channel.proxyConnection = self
        self.client.channel.setRawMode()
        self.client.transport.write("HTTP/1.0 200 Connection Established\r\n")
        self.client.transport.write("Proxy-Agent: Convergence\r\n\r\n")

    def dataReceived(self, data):
        self.client.transport.write(data)

    def connectionLost(self, reason):
        logging.debug("Connection lost from server: " + str(reason))
        self.client.transport.loseConnection()

