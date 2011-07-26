#!/usr/bin/env python
"""convergence-createdb constructs the Convergence Notary database."""

__author__ = "Moxie Marlinspike"
__email__  = "moxie@thoughtcrime.org"
__license__= """
Copyright (c) 2010 Moxie Marlinspike. All rights reserved.
"""

from sqlite3 import *
import sys, os.path, os

def main(argv):

    convergencePath = "/var/lib/convergence/"
    convergencedb   = convergencePath + "convergence.db"

    if not os.path.exists(convergencePath):
        os.makedirs(convergencePath)
        
    connection = connect(convergencedb)
    cursor     = connection.cursor()

    cursor.execute("CREATE TABLE fingerprints (id integer primary key, location TEXT, fingerprint TEXT, timestamp_start INTEGER, timestamp_finish INTEGER)")
    connection.commit()
    cursor.close()


if __name__ == '__main__':
    main(sys.argv[1:])
