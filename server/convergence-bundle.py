#!/usr/bin/env python
"""convergence-bundle produces notary 'bundles', which can be easily imported to a web browser."""

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

def loadCertificate(path):
    fd       = open(path, "r")
    contents = fd.read()
    contents = contents.replace("\n", r"\n")

    return contents

def main(argv):
    host            = raw_input("Notary hostname (eg: 'notary.thoughtcrime.org'): ")
    sslPort         = raw_input("Notary SSL listen port (eg: 443): ")
    httpPort        = raw_input("Notary HTTP listen port (eg: 80): ")
    certificatePath = raw_input("Path to PEM encoded certificate: ")

    certificate     = loadCertificate(certificatePath)

    bundle = open("mynotarybundle.notary", "w")
    bundle.write('{\n'\
                 '"host" : "' + host + '",\n'\
                 '"ssl_port" : ' + sslPort + ',\n'\
                 '"http_port" : ' + httpPort + ',\n'\
                 '"certificate" : "' + certificate + '"\n}')
    bundle.close()

    print "Bundle generated in mynotarybundle.notary"

if __name__ == '__main__':
    main(sys.argv[1:])
