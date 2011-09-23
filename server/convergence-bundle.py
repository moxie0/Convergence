#!/usr/bin/env python
"""convergence-bundle produces notary 'bundles', which can be easily
imported to a web browser."""

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

import sys, getopt

def parseOptions(argv):
    httpPort   = 80
    sslPort    = 443
    notaryName = "notary.example.com"
    certFile   = "/etc/ssl/certs/convergence.pem"
    outputFile = "mynotarybundle.notary"

    try:
        opts, args = getopt.getopt(argv, "p:s:n:c:o:h")

        for opt, arg in opts:
            if opt in("-p"):
                httpPort = int(arg)
            elif opt in ("-s"):
                sslPort = int(arg)
            elif opt in ("-n"):
                notaryName = arg
            elif opt in ("-c"):
                certFile = arg
            elif opt in ("-o"):
                outputFile = arg
            elif opt in ("-h"):
                usage()
                sys.exit()

        return (httpPort, sslPort, notaryName, certFile, outputFile)

    except getopt.GetoptError:
        usage()
        sys.exit(2)

def usage():
    print "usage: bundle <options>\n"
    print "Options:"
    print "-p <http_port> HTTP port your notary is listening on (default: 80)."
    print "-s <ssl_port>  SSL port your notary is listening on (default: 443)."
    print "-n <hostname>  Notary hostname (default: notary.thoughtcrime.org)."
    print "-c <cert>      SSL cert (default: /etc/ssl/certs/convergence.pem)."
    print "-o <outfile>   Notary bundle file (default: mynotarybundle.notary)."
    print "-h             Print this help message."
    print ""

def loadCertificate(path):
    fd       = open(path, "r")
    contents = fd.read()
    contents = contents.replace("\n", r"\n")

    return contents

def main(argv):
    (httpPort, sslPort, notaryName,
     certFile, outputFile) = parseOptions(argv)

    certificate     = loadCertificate(certFile)

    bundle = open(outputFile, "w")
    bundle.write('{\n'\
                 '"host" : "' + notaryName + '",\n'\
                 '"ssl_port" : ' + str(sslPort) + ',\n'\
                 '"http_port" : ' + str(httpPort) + ',\n'\
                 '"certificate" : "' + certificate + '"\n}')
    bundle.close()

    print "Bundle generated in %s" % outputFile

if __name__ == '__main__':
    main(sys.argv[1:])
