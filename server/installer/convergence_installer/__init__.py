
import os, sys, shutil

# Shorthand
conv			= 'convergence'
install_convergence	= 'python ./setup.py install'
conv_db			= '/var/lib/convergence/convergence.db'

# Simple messaging tool (super-class of all)
class Msg:
	def __init__(self, ME):
		self.me		= ME

	def msg(self, s):
		print >> sys.stderr, s + '\n';

	def err(self, s):
		self.msg(': '.join([self.me, 'Error', s]))

	def info(self, s):
		self.msg(': '.join([self.me, 'Info', s]))

# Data that every class needs
class Installer():

	def __init__(self, ME, unpack_dir, name):
		Msg.__init__(self, ME)
		self.unpack_dir			= unpack_dir
		self.name			= name

	def staging(self):
		return os.path.join(self.unpack_dir, self.name)

# The config supplied to the installer for verification and access
class Config(Msg):
	def __init__(self, ME, http, ssl, uname, gname, interf, name, os):
		# the config data
		self.http	= http
		self.ssl	= ssl
		self.uname	= uname
		self.gname	= gname
		self.interf	= interf
		self.name	= name
		self.os		= os

	def is_port(self, port):
		return ( 0 < port and port < 65536 )

	def looks_like_IPv4(self, addr):
		split = addr.split('.')
		return ( 4 == len(split) )

	def looks_like_DNS(self, domain):
		split = domain.split('.')
		return ( 1 < len(split) )

	def verify(self):
		msg_port = " is not a valid port"
		retval = 1
		if ( not self.is_port(self.http) ):
			self.err("httpPort value " + self.http + msg_port)
			retval = 0
		if ( not self.is_port(self.ssl) ):
			self.err("sslPort value " + self.ssl + msg_port)
			retval = 0
		# would like to check uname / gname but dont have a 
		# platform independent mechanism (getent passwd | grep 'uname:'
		if ( 0 < len(self.interf) and not self.looks_like_IPv4(self.interf) ):
			self.err("incomingInterface does not look like IPv4")
			retval = 0
		if ( not self.looks_like_DNS(self.name) ):
			self.err("site name does not look like a DNS domain")
			retval = 0
		return retval

	# would love to check 'os' but am not sure of the correct way to do it

# Non-OS specific actions required for the full install
class Core(Installer, Msg):

	def __init__(self, ME, unpack_dir, name):
		Installer.__init__(self, ME, unpack_dir, name)
		# NON-PORTABLE
		self.install_dir		= '/usr/bin'
		self.util_prefix		= os.path.join(
			self.install_dir, conv 
		)
		self.core_gencert		= self.util_prefix + '-gencert'
		self.core_bundle		= self.util_prefix + '-bundle'
		self.core_createdb		= self.util_prefix + '-createdb'
		self.core_notary		= self.util_prefix + '-notary'

	# Convenvience function
	def cd_staging_and(self, cmd):
		return '( cd ' + self.staging() + ' && ' + cmd + ' )'

	# We stuff data into the staging area during the install.  Create it.
	def make_staging_dir(self):
		stage = self.staging()
		retval = 1
		if ( not os.path.isdir(stage) ):
			os.mkdir(stage)
		if ( not os.path.isdir(stage) ):
			self.err("Cant make staging directory " + stage);
			retval = 0
		return retval

	# May be too verbose.
	def cert_warning(self):
		print "\nYou have specified the name\n\n\t" + self.name + "\n"
		print "as the DNS name for your notary site.  \n"
		print "Now we generate the Certificate for the site:"
		print "You'll need to enter >> THAT NAME AGAIN<< !!\n"
		print "I.e the correct answer to the 6'th question looks like\n"
		print "Common Name (eg, your name or your server's hostname) []: " + self.name + "\n"

	# Generate the certs using the convergence-gencert tool
	def gen_cert(self):
		self.cert_warning()
		cmd = self.cd_staging_and(self.core_gencert)
		retval = ( 0 == os.system(cmd) )
		if ( not retval ):
			self.err("Error generating certificates")
		return retval

	# Install the base software
	def install_convergence_software(self):
		cmd = '( cd ' +self.unpack_dir+' && '+ install_convergence +')'
		retval = ( 0 == os.system(cmd) )
		if ( not retval ):
			self.err("Install of " + conv + " failed");
		return retval	

	# Create the convergence DB
	def createdb(self):
		exists = os.path.isfile(conv_db)
		retval = 1
		if ( exists ):
			self.info(conv  + " DB already exists, leaving")
		else:
			retval = ( 0 == os.system(self.core_createdb) )
			if ( not retval ):
				self.err("Creation of " + conv + " DB failed")
			else:
				self.info(conv + "DB created")
		return retval	

	# Create the bundle (actually not used, as the bundle thing is
	# all human bound 'prompt' type)
	def create_bundle(self):
		cmd = self.cd_staging_and(self.core_bundle)
		retval = ( 0 == os.system(cmd) )
		if ( not retval ):
			self.err("Creation of " + conv + " bundle failed")
		else:
			self.info(conv + " bundle created in " + self.staging())
		return retval	

# Parent for all OS variants.  Provides services for the OS specific
# components of the installer (e.g where to do things).  To be sub-classed
# for each OS variant.
class OS(Installer, Msg):

	def __init__(self, ME, unpack_dir, name):
		Installer.__init__(self, ME, unpack_dir, name)
		# to be overridden/defined by child classes, as required
		# lots of NON-PORTABLE
		self.data_dir			= '/etc/' + conv
		self.service_defn_dir		= '/etc/rc.d/init.d'
		self.service_defn_src_file	= ''
		self.service_config_file	= ''
		self.service_init_script	= ''
		self.service_start_cmd		= ''
		self.service_auto_start_cmd	= ''
		self.depend_packages		= []
		self.depend_install_cmd		= ''

	# where is the final location of the cert
	def cert_path(self):
		return os.path.join(self.data_dir, self.name + '.pem')

	# where is the final location of the key
	def key_path(self):
		return os.path.join(self.data_dir, self.name + '.key')

	# please install my software dependencies
	def depend_install(self):
		cmd = self.depend_install_cmd + ' ' + ' '.join(self.depend_packages)
		print cmd
		retval = 1
		#if ( 0 != os.system(cmd) ):
			#self.err('Failure installing dependencies')
		return retval

	# Use the OS specific service definition, and create the init file
	def make_service(self):
		src = self.service_init_script 
		dst = self.service_defn_dir
		msg = " create service launch script in " + dst
		retval = 0
		exists = os.path.isfile(os.path.join(dst, conv))
		if ( exists ):
			self.info(conv  + " service already exists, leaving")
			retval = 1
		else:
			if ( shutil.copy2(src, dst) ):
				self.into('Did' + msg)
				retval = 1
			else:
				self.err('Failed to' + msg)
		return retval

	# after building all the useful data in the staging area
	# we move it to a system directory from which its data can
	# be used by the service itself.
	def install_service_data(self):
		dst = self.data_dir
		msg = "certs and bundle to: " + dst
		retval = 1
		exists = os.path.isdir(dst)
		if ( exists ):
			self.info("Service data exists at " + dst + ", pass")
		else:
			if ( shutil.move(self.staging(), dst) ):
				self.info("Installed " + msg)
			else:
				self.err("Cant install " + msg + ' from ' + self.staging())
				retval = 0
		return retval

	# Standard practice is to have all args passed to the daemon
	# from the init script to be defined in a 'config' file.
	# This creates that.  It may not be so useful here, as a 
	# change of most values requires a regeneration of the bundle 
	# and its re-publication.
	def make_service_config(self, config):
		f = open(self.service_config_file, "w")
		retval = 0
		if ( f is not None ):
			param = ["PORT=" + str(config.http), "SSL=" + str(config.ssl), "CERT=" + self.cert_path(), "KEY=" + self.key_path(), "USER=" + config.uname, "GROUP=" + config.gname, "INTERFACE=" + config.interf]
			f.write('\n'.join(param))
			self.info(conv + " service configuration created")
			retval = 1
		else:
			self.err("Could not create service configuration file")
		return retval

	# Start the service using the generated service (init script) file
	def service_start(self):
		cmd = self.service_start_cmd
		retval = ( 0 == os.system(cmd) )
		if ( retval ):
			self.info("Service start succeeded")
		else:
			self.err("Service start failed")
		return retval	

	# Configure service auto start
	def service_auto_start(self):
		cmd = self.service_auto_start_cmd
		retval = ( 0 == os.system(cmd) )
		if ( retval ):
			self.info("Service auto start configured")
		else:
			self.err("Service auto start setting failed")
		return retval	

# OS specifics for RedHat Enterprise Linux 6 (and recent Fedora Core releases)
class RHEL6(OS):

	def __init__(self, ME, staging, name):
		OS.__init__(self, ME, staging, name)
		self.service_source_file	= os.path.join([self.staging, 'init-script', conv + '.rhel6'])
		self.service_config_file	= '/etc/sysconfig/' + conv
		self.service_init_script	= '/etc/rc.d/init.d/' + conv
		self.service_start_cmd		= 'service ' + conv + ' start'
		self.service_auto_start_cmd	= 'chkconfig ' + conv + ' on'
		self.depend_packages		= [
			'python-twisted-web', 
			'm2crypto'
			]
		self.depend_install_cmd		= 'yum -y install'

