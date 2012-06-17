#!/usr/bin/env python

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

"""convergence-createdb constructs the Convergence Notary database."""

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

from sqlite3 import *
import sys, os.path, os

def main(argv):

    convergencePath = "/var/lib/convergence/"
    convergencedb   = convergencePath + "convergence.db"

    if len(argv) > 0:
        convergencePath, filename  = os.path.split(argv[0])
        convergencedb = argv[0]

    if not os.path.exists(convergencePath):
        os.makedirs(convergencePath)
        
    connection = connect(convergencedb)
    cursor     = connection.cursor()

    cursor.execute("CREATE TABLE fingerprints (id integer primary key, location TEXT, fingerprint TEXT, timestamp_start INTEGER, timestamp_finish INTEGER)")
    connection.commit()
    cursor.close()


if __name__ == '__main__':
    main(sys.argv[1:])
