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

import sys
if sys.version_info < (2, 6):
    print "Sorry, convergence requires at least Python 2.6"
    sys.exit(3)

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

from convergence.verifier.NetworkPerspectiveVerifier import NetworkPerspectiveVerifier
from convergence.verifier.GoogleCatalogVerifier import GoogleCatalogVerifier

from OpenSSL import SSL
from twisted.enterprise import adbapi
from twisted.web import http
from twisted.web.server import Site
from twisted.web.resource import Resource
from twisted.internet import reactor

import sys, string, os, getopt, logging, pwd, grp, convergence.daemonize

gVersion                  = "0.2"

class ServerContextFactory:

    def __init__(self, cert, key):
        self.cert         = cert
        self.key          = key

    def getContext(self):
        ctx = SSL.Context(SSL.SSLv23_METHOD)
        ctx.use_certificate_chain_file(self.cert)
        ctx.use_privatekey_file(self.key)
        ctx.set_options(SSL.OP_NO_SSLv2)

        return ctx

class NotaryConfig:
    pass

def parseOptions(argv):
    cfg = NotaryConfig()
    cfg.logLevel          = logging.INFO
    cfg.logFile           = "/var/log/convergence.log"
    cfg.dbFile            = "/var/lib/convergence/convergence.db"
    cfg.pidFile           = "/var/run/convergence.pid"
    cfg.httpPort          = 80
    cfg.sslPort           = 443
    cfg.incomingInterface = ''
    cfg.certFile          = "/etc/ssl/certs/convergence.pem"
    cfg.keyFile           = "/etc/ssl/private/convergence.key"
    cfg.userName          = "nobody"
    cfg.groupName         = "nogroup"
    cfg.dropPrivileges    = True
    cfg.verifier          = NetworkPerspectiveVerifier()
    cfg.background        = True

    try:
        opts, args = getopt.getopt(argv, "s:p:i:o:c:k:u:g:b:l:D:P:dfh", "no-drop-privileges")
        for opt, arg in opts:
            if opt in ("-p"):
                cfg.httpPort = int(arg)
            elif opt in ("-s"):
                cfg.sslPort = int(arg)
            elif opt in ("-i"):
                cfg.incomingInterface = arg
            elif opt in ("-c"):
                cfg.certFile = arg
            elif opt in ("-k"):
                cfg.keyFile = arg
            elif opt in ("-u"):
                cfg.userName = arg
            elif opt == '--no-drop-privileges':
                cfg.dropPrivileges = False
            elif opt in ("-g"):
                cfg.groupName = arg
            elif opt in ("-d"):
                cfg.logLevel = logging.DEBUG
            elif opt in ("-f"):
                cfg.background = False
            elif opt in ("-b"):
                cfg.verifier = initializeBackend(arg)
            elif opt in ("-l"):
                cfg.logFile = arg
            elif opt in ("-D"):
                cfg.dbFile = arg
            elif opt in ("-P"):
                cfg.pidFile= arg
            elif opt in ("-h"):
                usage()
                sys.exit()
        
        return cfg

    except getopt.GetoptError as error:
        print "Option error: %s" % error
        usage()
        sys.exit(2)

def usage():
    print "\nnotary " + str(gVersion) + " by Moxie Marlinspike"
    print "usage: notary <options>\n"
    print "Options:"
    print "-p <http_port>        HTTP port to listen on (default 80)."
    print "-s <ssl_port>         SSL port to listen on (default 443)."
    print "-i <address>          IP address to listen on for incoming connections (optional)."
    print "-c <cert>             SSL certificate location."
    print "-k <key>              SSL private key location."
    print "-u <username>         Name of user to drop privileges to (defaults to 'nobody')"
    print "-g <group>            Name of group to drop privileges to (defaults to 'nogroup')"
    print "-b <backend>          Verifier backend [perspective|google] (defaults to 'perspective')"
    print "-l <logfile>          Path to logfile"
    print "-D <database>         Path to database"
    print "-P <pidfile>          Path to PID-file"
    print "--no-drop-privileges  Don't drop privileges"
    print "-f                    Run in foreground."
    print "-d                    Debug mode."
    print "-h                    Print this help message."
    print ""

def initializeBackend(backend):
    if   (backend == "perspective"): return NetworkPerspectiveVerifier()
    elif (backend == "google"):      return GoogleCatalogVerifier()
    else:                            raise getopt.GetoptError("Invalid backend: " + backend)
    
def checkPrivileges(userName, groupName):                
    try:
        grp.getgrnam(groupName)
    except KeyError:
        print >> sys.stderr, 'Can not drop group privileges to %s, ' \
              'because it does not exist!' % groupName
        sys.exit(2)

    try:
        pwd.getpwnam(userName)
    except KeyError:
        print >> sys.stderr, 'Can not drop user privilges to %s, ' \
              'because it does not exist!' % userName
        sys.exit(2)            

def writePidFile(pidFileName):
    try:
        pidFileHandle = open(pidFileName, "wb")
        pidFileHandle.write(str(os.getpid()))
        pidFileHandle.close()
    except IOError as error:
        print "Error occurred while writing PID-file: %s" % error
        sys.exit(2)
    
def dropPrivileges(userName, groupName, dbFile):
    try:
        user = pwd.getpwnam(userName)
    except KeyError:
        print >> sys.stderr, 'User ' + userName + ' does not exist, cannot drop privileges'
        sys.exit(2)
    try:
        group = grp.getgrnam(groupName)
    except KeyError:
        print >> sys.stderr, 'Group ' + groupName + ' does not exist, cannot drop privileges'
        sys.exit(2)

    logging.debug("dropping privileges to uid %u (%s) and gid %u (%s)" % 
                         (user.pw_uid, user.pw_name, 
                         group.gr_gid, group.gr_name))
    if os.path.exists(os.path.dirname(dbFile)):
        os.chown(os.path.dirname(dbFile), user.pw_uid, group.gr_gid)

    if os.path.exists(dbFile):
        os.chown(dbFile, user.pw_uid, group.gr_gid)

    os.setgroups([group.gr_gid])

    os.setgid(group.gr_gid)
    os.setuid(user.pw_uid)

def initializeLogging(logLevel, logFile):
    logging.basicConfig(filename=logFile,level=logLevel, 
                        format='%(asctime)s %(message)s',filemode='a')        

    logging.info("Convergence Notary started...")

def initializeFactory(database, privateKey, verifier):
    root = Resource()
    root.putChild("target", TargetPage(database, privateKey, verifier))

    return Site(root)    

def initializeDatabase(dbFile):
    return adbapi.ConnectionPool("sqlite3", dbFile, cp_max=1, cp_min=1)

def initializeKey(keyFile):
    return open(keyFile,'r').read() 

def main(argv):
    cfg = parseOptions(argv)
    privateKey                    = initializeKey(cfg.keyFile)
    database                      = initializeDatabase(cfg.dbFile)
    sslFactory                    = initializeFactory(database, privateKey, cfg.verifier)
    connectFactory                = http.HTTPFactory(timeout=10)
    connectFactory.protocol       = ConnectChannel

    
    reactor.listenSSL(cfg.sslPort, sslFactory, ServerContextFactory(cfg.certFile, cfg.keyFile),
                      interface=cfg.incomingInterface)
    reactor.listenSSL(4242, sslFactory, ServerContextFactory(cfg.certFile, cfg.keyFile),
                      interface=cfg.incomingInterface)
    reactor.listenTCP(port=cfg.httpPort, factory=connectFactory,
                      interface=cfg.incomingInterface)
        

    initializeLogging(cfg.logLevel, cfg.logFile)
    checkPrivileges(cfg.userName, cfg.groupName)

    if cfg.background:
        print "\nconvergence " + str(gVersion) + " by Moxie Marlinspike backgrounding..."
        convergence.daemonize.createDaemon()
    else:
        print "\nconvergence " + str(gVersion) + " by Moxie Marlinspike running..."
    
    logging.debug("writing PID-file to %s" % os.path.abspath(cfg.pidFile))
    writePidFile(cfg.pidFile)
    if cfg.dropPrivileges:
        dropPrivileges(cfg.userName, cfg.groupName, cfg.dbFile)
    reactor.run()

if __name__ == '__main__':
    main(sys.argv[1:])
