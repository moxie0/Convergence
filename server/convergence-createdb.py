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
import sys, os.path, os, getopt, pwd, grp

def main(argv):	
    uname             = "nobody"
    gname             = "nogroup"

   try:
        opts, args = getopt.getopt(argv, "u:g:h")
		
		for opt, arg in opts:
			if opt in("-u"):
                uname = arg
			elif opt in("g"):
				gname = arg
            elif opt in ("-h"):
                usage()
                sys.exit()

    convergencePath = "/var/lib/convergence/"
    convergencedb   = convergencePath + "convergence.db"

    if not os.path.exists(convergencePath):
        os.makedirs(convergencePath)
		
	
    connection = connect(convergencedb)
    cursor     = connection.cursor()

    cursor.execute("CREATE TABLE fingerprints (id integer primary key, location TEXT, fingerprint TEXT, timestamp_start INTEGER, timestamp_finish INTEGER)")
    connection.commit()
    cursor.close()
	
	setPerms(convergencedb, uname, gname)
	
def setPerms(path, uname, gname):
    try:
        user = pwd.getpwnam(uname)
    except KeyError:
        print >> sys.stderr, 'User ' + uname + ' does not exist, cannot set permission'
        sys.exit(2)
    try:
        group = grp.getgrnam(gname)
    except KeyError:	
        print >> sys.stderr, 'Group ' + gname + ' does not exist, cannot set permissions'
        sys.exit(2)
	
	os.chown(path,nobody.user_uid,group.gr_gid);

def usage():
    print "\nConvergence create notary database script.\n"
    print "usage: convergence-createdb <options>\n"
    print "Options:"
    print "-u <username>  Name of user to set database file permissions to (optional, defaults to 'nobody')"
    print "-g <group>     Name of group to set database file permissions to (optional, defaults to 'nogroup')"
    print "-h             Print this help message."
    print ""

	
if __name__ == '__main__':
    main(sys.argv[1:])
