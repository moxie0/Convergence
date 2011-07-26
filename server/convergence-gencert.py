#!/usr/bin/env python

import os, tempfile, sys

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

    csrFd, csrPath = tempfile.mkstemp(dir='.')

    os.system(openssl + " genrsa -out mynotary.key 2048")
    os.system(openssl + " req -new -key mynotary.key -out " + csrPath)
    os.system(openssl + " x509 -req -days 14600 -in " + csrPath + " -signkey mynotary.key -out mynotary.pem")
    os.remove(csrPath)

    print "Certificate and key generated in mynotary.pem and mynotary.key"

if __name__ == '__main__':
    main(sys.argv[1:])
