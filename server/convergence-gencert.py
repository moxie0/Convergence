#!/usr/bin/env python
"""convergence-gencert generates certificates."""

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

import os, tempfile, sys, getopt


def parseOptions(argv):
    certFile   = "mynotary.pem"
    keyFile    = "mynotary.key"
    subject    = None

    try:
        opts, args = getopt.getopt(argv, "c:k:s:h")

        for opt, arg in opts:
            if opt in ("-c"):
                certFile = arg
            elif opt in ("-k"):
                keyFile = arg
            elif opt in ("-s"):
                subject = arg
            elif opt in ("-h"):
                usage()
                sys.exit()

        return (certFile, keyFile, subject)

    except getopt.GetoptError:
        usage()
        sys.exit(2)


def usage():
    print "usage: bundle <options>\n"
    print "Options:"
    print "-c <cert>  SSL cert (default: mynotary.pem)."
    print "-k <key>   SSL key (default: mynotary.key)."
    print "-s <subj>  SSL subject (default: interactive)."
    print "-h         Print this help message."
    print ""


def existsInPath(command):
    def isExe(fpath):
        return os.path.exists(fpath) and os.access(fpath, os.X_OK)

    for path in os.environ["PATH"].split(os.pathsep):
        exeFile = os.path.join(path, command)
        if isExe(exeFile):
            return exeFile

    return None


def main(argv):
    openssl = existsInPath("openssl")

    if openssl is None:
        print "You must install OpenSSL first!"
        os._exit(1)

    (certFile, keyFile, subject) = parseOptions(argv)

    csrFd, csrPath = tempfile.mkstemp(dir='.')

    cmd = [openssl, "genrsa", "-out", keyFile, "2048"]
    os.system(" ".join(cmd))
    cmd = [openssl, "req", "-new", "-key", keyFile, "-out", csrPath]
    if subject is not None:
        cmd.extend(["-subj", "\'" + subject + "\'"])
    os.system(" ".join(cmd))
    cmd = [openssl, "x509", "-req", "-days", "14600", "-in", csrPath,
           "-signkey", keyFile, "-out", certFile]
    os.system(" ".join(cmd))

    os.remove(csrPath)

    print "Certificate and key generated in " + certFile + " and " + keyFile

if __name__ == '__main__':
    main(sys.argv[1:])
