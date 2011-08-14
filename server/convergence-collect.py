#!/usr/bin/env python
"""certificate-collector collects certificates from annoying sites that have more than one."""

__author__ = "Moxie Marlinspike"
__email__  = "moxie@thoughtcrime.org"
__license__= """
Copyright (c) 2010 Moxie Marlinspike <moxie@thoughtcrime.org>

This program is free software; you can redistribute it and/or
modify it under the terms of the GNU General Public License as
published by the Free Software Foundation; either version 3 of the
License, or (at your option) any later version.

This program is distributed in the hope that it will be useful, but
WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the GNU
General Public License for more details.

You should have received a copy of the GNU General Public License
along with this program; if not, write to the Free Software
Foundation, Inc., 59 Temple Place, Suite 330, Boston, MA 02111-1307
USA

"""

# BSD and Mac OS X, kqueue
try:
    from twisted.internet import kqreactor as event_reactor
except:
    # Linux 2.6 and newer, epoll
    try:
        from twisted.internet import epollreactor as event_reactor
    except:
        # Linux pre-2.6, poll
        from twisted.internet import pollreactor as event_reactor

event_reactor.install()

from twisted.enterprise import adbapi
from twisted.internet import reactor

from convergence.FingerprintDatabase import FingerprintDatabase
from convergence.CertificateFetcher import CertificateFetcher

import sys, string, os, logging

def updateRecordsError(error, host, port, database):
    print "DB Error!"
    issueQuery(host, port, database)

def updateRecordsComplete(recordRows, host, port, database):
    print "Inserted fingerprint."
    issueQuery(host, port, database)

def handleFetchCertificateComplete(fingerprint, host, port, database):
    print "Fetch certificate complete."
    deferred = database.updateRecordsFor(host, port, fingerprint)
    deferred.addCallback(updateRecordsComplete, host, port, database)
    deferred.addErrback(updateRecordsError, host, port, database)

def handleFetchCertificateError(error, host, port, database):
    print "Error retrieving fingerprint: " + str(error)
    issueQuery(host, port, database)

def issueQuery(host, port, database):
    certificateFetcher = CertificateFetcher(host, port)
    deferred           = certificateFetcher.fetchCertificate();
    deferred.addCallback(handleFetchCertificateComplete, host, port, database)
    deferred.addErrback(handleFetchCertificateError, host, port, database)

def initializeDatabase():
    databaseConnection = adbapi.ConnectionPool("sqlite3", '/var/lib/convergence/convergence.db', cp_max=1, cp_min=1)
    return FingerprintDatabase(databaseConnection);
    
def main(argv):

    if len(argv) < 1:
        print "Usage: certificate-collector <hostname>"
        return

    database = initializeDatabase()
    issueQuery(argv[0], 443, database)
    reactor.run()

if __name__ == '__main__':
    main(sys.argv[1:])
