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

os.environ['PATH'] = os.environ['PATH'] + os.pathsep.join(['/usr/bin/', '/usr/local/bin'])

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
				sys.exit(0)
		
		if ( '' == siteName or '' == osType or '' == orgName ):
			print "siteName, orgName and osType are mandatory args"
			print "for help use: " + ME + " -h"
			sys.exit(2)
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
	supported = os.get_supported_os() 
	s = ["convergence-installer.py " + str(version) + "\n",
	"Usage: " + ME + " <options>\n",
	"The convergence-installer.py attempts to help you get a notary",
	"running quickly.  Software is installed, a certificate, key ",
	"and bundle are created, and a service is create, lauched and ",
	"configured for later auto-launch (amongst other things).\n",
	"A report is produced after a successful install telling you ",
	"where things are and anything else that needs be done.\n",
	"Please read the Options carefully and choose what you need.\n",
	"Options:\n",
	"Mandatory:\n",
	"\t-n <sitename>   The DNS name of the host to run the service",
	"\t-N <orgname>    The name of the org or person who hosts the service",
	"\t\t\t(Informational, but required)",
	"\t-o <ostype>     The type of OS into which to install",
	"\t\t\t(See 'Supported os types' below)",
	"\nOptional: (with [default])\n",
	"\t-b <bundle-url> The URL at which the bundle file will be published",
	"\t\t\t[https://<sitename>/<sitename>.notary]",
	"\t-p <http_port>  HTTP port to listen on [80]",
	"\t-s <ssl_port>   SSL port to listen on [443]",
	"\t-i <address>    IP address to listen on for incoming connections [all]",
	"\t-u <username>   Name of user to drop privileges to [nobody]",
	"\t-g <group>      Name of group to drop privileges to [nogroup]",
	"\t-a              Auto-create user and/or group if they dont exist [no]",
	"\nor",
	"\t-h	        Print this help message.\n",
	"Suppored os types are:\n\n\t" + supported + "\n",
	"More information is available at: https://github.com/moxie0/Convergence/wiki\n" ]
	print "\n".join(s)
	return 1

def make_os_installer(config):
	retval = 0;
	# Create the real OS installer
	if ( config.os_install == 'rhel6' ):
		retval = convergence_installer.RHEL6(ME, config)
	elif ( config.os_install == 'ubu11' ):
		retval = convergence_installer.UBU11(ME, config)
	else:
		# UNREACHED: should never happen as the config verifies the OS
		sys.exit('Unsupported OS')
	return retval

def report(core, os):
	service_defn = os.service_init_path
	service_data = os.service_data_dir
	service_config = os.service_config_file
	conv_db = core.conv_db_path
	bundle = os.bundle_path_final()
	key = os.key_path()
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
	retval = 1
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
