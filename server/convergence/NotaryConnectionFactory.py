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

from twisted.internet.protocol import ClientFactory
import logging

class NotaryConnectionFactory(ClientFactory):

    def __init__(self, client):
        self.client = client

    def buildProtocol(self, addr):
        logging.debug("Building protocol...")
        
        protocol = self.protocol(self.client)

        return protocol
    
    def clientConnectionFailed(self, connector, reason):
        logging.warning("Connection to notary failed!")
        self.client.setResponseCode(int(404), "Unable to connect")
        self.client.setHeader("Connection", "close")
        self.client.write("<html><body>Unable to connect to notary!</body></html>")
        self.client.finish()

