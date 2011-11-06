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

from twisted.web.http import HTTPChannel
from ConnectRequest import ConnectRequest

import logging

# The HTTPChannel for incoming CONNECT requests to other notaries.

class ConnectChannel(HTTPChannel):
    requestFactory = ConnectRequest

    def __init__(self):
        self.proxyConnection = None
        self.requestFactory.getVerifier = lambda _: self.factory.verifier
        HTTPChannel.__init__(self)

    def rawDataReceived(self, data):
        logging.debug("Shuffling raw data...")
        self.proxyConnection.transport.write(data)

    def connectionLost(self, reason):
        logging.debug("Connection lost from client: " + str(reason))
        if (self.proxyConnection is not None):
            self.proxyConnection.transport.loseConnection()

        HTTPChannel.connectionLost(self, reason)
