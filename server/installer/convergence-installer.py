#!/usr/bin/env python
"""convergence-install.py installs the Convergence Notary System."""

__author__ = "Hugo Connery"
__email__  = "hmco@env.dtu.dk"
__credit__ = "Moxie Marlinspike"
__license__= """
Copyright (c) 2011 Hugo Connery <hmco@env.dtu.dk>

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

import sys,os

if sys.version_info < (2, 6):
	print "Sorry, convergence requires at least Python 2.6"
	sys.exit(1)

import convergence_installer
import sys, string, os, getopt, pwd

version		= "0.3"
ME 		= os.path.basename(sys.argv[0])
CONV_DIR	= os.path.join(os.path.dirname(sys.argv[0]), '..')

def verifyArgs(httpPort, sslPort, uname, gname, incomingInterface, siteName, osType):
	# testing comes soon
	return True

def parseOptions(argv):
	# ignore for now: needs to be written into the service config
	uname			= 'nobody'
	gname			= 'nogroup'
	# core data for install
	sslPort			= 443
	httpPort		= 80
	incomingInterface	= ''
	siteName		= ''
	osType			= ''

	try:
		opts, args = getopt.getopt(argv, "p:s:i:u:g:n:o:h")

		for opt, arg in opts:
			if opt in("-n"):
				siteName = arg
			if opt in("-o"):
				osType = arg
			if opt in("-p"):
				httpPort = int(arg)
			elif opt in ("-s"):
				sslPort = int(arg)
			elif opt in ("-i"):
				incomingInterface = arg # IP address
			elif opt in ("-u"):
				uname = arg # user name
			elif opt in ("-g"):
				gname = arg # group name
			elif opt in ("-h"):
				usage()
				sys.exit()
		
		if ( verifyArgs(sslPort, httpPort, uname, gname, incomingInterface, siteName, osType) ):
			return ( sslPort, httpPort, uname, gname, incomingInterface, siteName, osType )

	except getopt.GetoptError:
		usage()
		sys.exit(2)

def usage():
	print "\nconvergence-installer.py " + str(version) + "\n"
	print "usage: " + ME + " <options>\n"
	print "Options:"
	print "-n <sitename>  The DNS name of the host to run the service"
	print "-o <ostype>    The type of OS into which to install"
	print "-p <http_port> HTTP port to listen on (default 80)."
	print "-s <ssl_port>  SSL port to listen on (default 443)."
	print "-i <address>   IP address to listen on for incoming connections (optional)."
	# These options are ignored until ready to integrate them into 
	# the service config
	print "-u <username>  Name of user to drop privileges to (defaults to 'nobody')"
	print "-g <group>     Name of group to drop privileges to (defaults to 'nogroup')"
	print "-h	       Print this help message."
	print ""

# 
# The plan
#
# (OS)
# 3. install dependencies
#
# (Core)
# 4. create database
#
# (Core)
# 5. create the bundle
#
# (OS)
# 6. move the certs and bundle to the 'data dir'
#
# (OS)
# 7. create the service and service definition
#
# (OS)
# 8. launch the service and test
#
#
#  Thus, the following objects:
#
# Core
#
# knows about the required convergence scripts and their
# path, and how to install them (python setup.py install) and call them
#
# OS
#
# handles dependencies and their install, and the service creation and defn,
# and launching
#

#
# Becomes:
#
# convergence_install/__init__.py (Core)
# convergence_install/os.py (OS -- base)
# convergence_install/rhel6.py (OS child of base)


def main(argv):
	(sslPort, httpPort, uname, gname, 
		incomingInterface, siteName, osType) = parseOptions(argv)
	core = convergence_installer.Core(CONV_DIR, siteName)
	os_inst = convergence_installer.OS(CONV_DIR, siteName)
	status = ( core.make_staging_dir() and core.gen_cert() and core.install_convergence_software() )
	if ( status ):
		os_inst.depend_install()

if __name__ == '__main__':
	main(sys.argv[1:])
