#!/usr/bin/env python
"""convergence-notary implements the Convergence Notary System."""

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

from convergence.TargetPage import TargetPage
from convergence.ConnectChannel import ConnectChannel
from convergence.ConnectRequest import ConnectRequest


from OpenSSL import SSL
from twisted.enterprise import adbapi
from twisted.web import http
from twisted.web.server import Site
from twisted.web.resource import Resource
from twisted.internet import reactor

import sys, string, os, getopt, logging, pwd, grp, convergence.daemonize

gVersion = "0.01"

class ServerContextFactory:

    def __init__(self, cert, key):
        self.cert         = cert
        self.key          = key

    def getContext(self):
        ctx = SSL.Context(SSL.SSLv3_METHOD)
        ctx.use_certificate_chain_file(self.cert)
        ctx.use_privatekey_file(self.key)

        return ctx

def parseOptions(argv):
    logLevel   = logging.INFO
    httpPort   = 80
    sslPort    = 443
    incomingInterface = ''
    outgoingInterface = None
    certFile   = "/etc/ssl/certs/convergence.pem"
    keyFile    = "/etc/ssl/private/convergence.key"
    background = True

    try:
        opts, args = getopt.getopt(argv, "s:p:i:o:c:k:fdh")

        for opt, arg in opts:
            if opt in("-p"):
                httpPort = int(arg)
            elif opt in ("-s"):
                sslPort = int(arg)
            elif opt in ("-i"):
                incomingInterface = arg
            elif opt in ("-o"):
                outgoingInterface = (arg, 0)
            elif opt in ("-c"):
                certFile = arg
            elif opt in ("-k"):
                keyFile = arg
            elif opt in ("-d"):
                logLevel = logging.DEBUG
            elif opt in ("-f"):
                background = False
            elif opt in ("-h"):
                usage()
                sys.exit()
        
        return (logLevel, sslPort, httpPort,
                certFile, keyFile, background,
                incomingInterface, outgoingInterface)

    except getopt.GetoptError:
        usage()
        sys.exit(2)
                
def usage():
    print "\nnotary " + str(gVersion) + " by Moxie Marlinspike"
    print "usage: notary <options>\n"
    print "Options:"
    print "-p <http_port> HTTP port to listen on."
    print "-s <ssl_port>  SSL port to listen on."
    print "-i <address>   IP address to listen on for incoming connections (optional)."
    print "-o <address>   IP address to bind to for making outgoing connections (optional)."
    print "-c <cert>      SSL certificate location."
    print "-k <key>       SSL private key location."
    print "-f             Run in foreground."
    print "-d             Debug mode."
    print "-h             Print this help message."
    print ""

def writePidFile():
    pidFile = open("/var/run/convergence.pid", "wb")
    pidFile.write(str(os.getpid()))
    pidFile.close()
    
def dropPrivileges():
    nobody = pwd.getpwnam('nobody')
    adm    = grp.getgrnam('nogroup')
    
    os.setgroups([adm.gr_gid])
    os.setgid(adm.gr_gid)
    os.setuid(nobody.pw_uid)

def initializeLogging(logLevel):
    logging.basicConfig(filename="/var/log/convergence.log",level=logLevel, 
                        format='%(asctime)s %(message)s',filemode='a')        

    logging.info("Convergence Notary started...")

def initializeFactory(database, privateKey):
    root = Resource()
    root.putChild("target", TargetPage(database, privateKey))

    return Site(root)    

def initializeDatabase():
    return adbapi.ConnectionPool("sqlite3", '/var/lib/convergence/convergence.db', cp_max=1, cp_min=1)

def initializeKey(keyFile):
    return open(keyFile,'r').read() 

def main(argv):
    (logLevel, sslPort, httpPort,
     certFile, keyFile, background,
     incomingInterface, outgoingInterface) = parseOptions(argv)
    privateKey                             = initializeKey(keyFile)
    database                               = initializeDatabase()
    sslFactory                             = initializeFactory(database, privateKey)
    connectFactory                         = http.HTTPFactory(timeout=10)
    connectFactory.protocol                = ConnectChannel
    connectFactory.outgoingInterface       = outgoingInterface
    
    reactor.listenSSL(sslPort, sslFactory,
        ServerContextFactory(certFile, keyFile), interface=incomingInterface)
    reactor.listenSSL(4242, sslFactory,
        ServerContextFactory(certFile, keyFile), interface=incomingInterface)
    reactor.listenTCP(port=httpPort, factory=connectFactory,
        interface=incomingInterface)

        
    initializeLogging(logLevel)

    if background:
        print "\nconvergence " + str(gVersion) + " by Moxie Marlinspike backgrounding..."
        convergence.daemonize.createDaemon()
    else:
        print "\nconvergence " + str(gVersion) + " by Moxie Marlinspike running..."

    writePidFile()
#    dropPrivileges()                

    reactor.run()

if __name__ == '__main__':
    main(sys.argv[1:])
