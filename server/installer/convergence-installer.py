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

version		= "0.1"
ME 		= os.path.basename(sys.argv[0])
CONV_DIR	= os.path.join(os.path.dirname(sys.argv[0]), '..')

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
	orgName			= ''
	bundleUrl		= ''
	auto_create		= 0

	try:
		opts, args = getopt.getopt(argv, "N:b:p:s:i:u:g:n:o:ha")

		for opt, arg in opts:
			if opt in("-n"):
				siteName = arg
			if opt in("-N"):
				orgName = arg
			if opt in("-b"):
				bundleUrl = arg
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
			elif opt in ("-a"):
				auto_create = 1 # auto-create user/group
			elif opt in ("-h"):
				usage()
				sys.exit()
		
		if ( '' == siteName or '' == osType or '' == orgName ):
			sys.exit("siteName, orgName and osType are mandatory args")
		if ( '' == bundleUrl ):
			bundleUrl = 'https://' + siteName + '/' + siteName + '.notary'
		config = convergence_installer.Config(
			ME, CONV_DIR, httpPort, sslPort, 
			uname, gname, incomingInterface, 
			siteName, osType, orgName, bundleUrl,
			auto_create)
		if ( not config.verify() ):
			sys.exit("Config looks bad")
		return config

	except getopt.GetoptError:
		usage()
		sys.exit(2)

def usage():
	# Bit of a kludge to get the supported os's
	os = convergence_installer.OS(ME, '')
	print "\nconvergence-installer.py " + str(version) + "\n"
	print "usage: " + ME + " <options>\n"
	print "Options: "
	print
	print "Mandatory args:"
	print "-n <sitename>  The DNS name of the host to run the service"
	print "-N <orgname>   The name of the organisation or person who hosts the service"
	print "-o <ostype>    The type of OS into which to install"
	print "\nOptional args: (with [default])\n"
	print "-b <bundle-url> The URL at which the bundle file will be published [https://<sitename>/<sitename>.notary]"
	print "-p <http_port> HTTP port to listen on [80]."
	print "-s <ssl_port>  SSL port to listen on [443]."
	print "-i <address>   IP address to listen on for incoming connections [all]."
	# These options are ignored until ready to integrate them into 
	# the service config
	print "-u <username>  Name of user to drop privileges to ['nobody']"
	print "-g <group>     Name of group to drop privileges to ['nogroup']"
	print "-a             Auto-create user and/or group if they dont exist [no]"
	print "\nor\n"
	print "-h	       Print this help message."
	print ""
	print "Suppored os types are:\n\n\t" + os.get_supported_os() + "\n"

def make_os_installer(config):
	retval = 0;
	# Generic OS, needed to check support
	os = convergence_installer.OS(ME, config)
	# Check os install suppport
	config.os_install = os.translate_supported_os(config.os)
	# Create the real OS installer
	if ( config.os_install == 'rhel6' ):
		retval = convergence_installer.RHEL6(ME, config)
	else:
		sys.exit('Unsupported OS')
	return retval

def report(core, os):
	service_defn = os.service_init_dst
	service_data = os.service_data_dir
	service_config = os.service_config_file
	conv_db = core.conv_db_dst
	bundle = os.bundle_path_final()
	key = os.key_path_final()
	print "\nINSTALL REPORT\n=============\n"
	print "\nInstallation is complete, and the service is actually running"
	print "\nService:\n"
	print "* init script = " + service_defn
	print "* data (cert, key and bundle) in " + service_data
	print "* config = " + service_config
	print "* database = " + conv_db + "\n"
	print "You still need to:\n"
	print "* copy the notary file to the publish location:"
	print "  E.g cp " + bundle + " /some/web-site/location/"
	print "* check the security on the service data location which has the key and cert"
	print "  E.g chown -R root:root " + service_data + " ; chmod -R 644 " + service_data + " ;\n      chmod 400 " + key

# Use the core and OS (child) objects to do all the things that need be done
def main(argv):
	config = parseOptions(argv)
	core = convergence_installer.Core(ME, config)
	os_inst = make_os_installer(config)
	if ( config.auto_create ):
		retval = os_inst.auto_create_user_group()
	if ( retval ):
		retval = core.make_staging_dir() and \
			core.install_convergence_software() and \
			core.gen_cert() and \
			os_inst.depend_install() and \
			core.createdb() and \
			os_inst.create_bundle() and \
			os_inst.make_service() and \
			os_inst.install_service_data() and \
			os_inst.make_service_config() and \
			os_inst.service_start() and \
			os_inst.service_auto_start()
	if ( retval ):
		report(core, os_inst)
	return retval

if __name__ == '__main__':
	sys.exit(not main(sys.argv[1:]))
