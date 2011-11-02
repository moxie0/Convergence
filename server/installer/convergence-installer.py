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

def is_port(x):
	return ( 0 < x and x < 65536 )

# Check sanity of command-line arguments
def verifyArgs(httpPort, sslPort, uname, gname, incomingInterface, siteName, osType):
	# testing comes soon
	# ports are easy (numbers)
	# uname/gname need to exist on the system
	# incoming interface is IPv4 || IPv6 ??
	# siteName is either . separated or localhost(4|6)
	# os type needs checking against available options
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
		
		if ( '' == siteName or '' == osType ):
			sys.exit("siteName and osType are mandatory args")
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

def make_os_installer(os_type, convDir, siteName):
	retval = 0;
	if ( os_type == 'rhel6' ):
		retval = convergence_installer.RHEL6(ME, convDir, siteName)
	else:
		sys.exit('Unsupported OS for installer: ' + os_type)
	return retval

# Use the core and OS (child) objects to do all the things that need be done
def main(argv):
	(sslPort, httpPort, uname, gname, 
		incomingInterface, siteName, osType) = parseOptions(argv)
	config = convergence_installer.Config(ME, httpPort, sslPort, uname, gname,
		incomingInterface, siteName, osType)
	if ( not config.verify() ):
		sys.exit('Config looks bad')
	core = convergence_installer.Core(ME, CONV_DIR, siteName)
	os_inst = make_os_installer(osType, CONV_DIR, siteName)
	# We dont create the bundle because its a prompted interface
	# core.create_bundle()
	retval = core.make_staging_dir() and core.gen_cert() and core.install_convergence_software() and os_inst.depend_install() and core.createdb() and os_inst.make_service() and os_inst.install_service_data() and os_inst.make_service_config(config) and os_inst.service_start() and os_inst.service_auto_start()
	# report(retval)
	return retval

if __name__ == '__main__':
	sys.exit(not main(sys.argv[1:]))
