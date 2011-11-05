
import os, sys, shutil

# the name of the service
conv_svc		= 'convergence'
# the name of the product
conv_name		= 'Convergence'
# install script
install_convergence	= 'python ./setup.py install'
# database path (*nix type, unknown elsewhere)
conv_db			= '/var/lib/convergence/convergence.db'
# notary 'bundle' file version number
bundle_version		= '1'

# Simple messaging tool, and basic file operations (super-class of all)
class Base:
	def __init__(self, ME):
		self.me		= ME

	def msg(self, s):
		print >> sys.stderr, s + '\n';

	def err(self, s):
		self.msg(': '.join([self.me, 'Error', s]))

	def info(self, s):
		self.msg(': '.join([self.me, 'Info', s]))

	def ok(self, s):
		self.msg(': '.join([self.me, 'SUCCESS', s]))

	def fail(self, s):
		self.msg(': '.join([self.me, 'FAILURE', s]))

	def report(self, status, msg):
		if ( status ):
			self.ok(msg)
		else:
			self.fail(msg)

	# convenience function; make a dir
	def make_dir(self, d):
		retval = 1
		if ( not os.path.isdir(d) ):
			os.mkdir(d)
		if ( not os.path.isdir(d) ):
			self.err("Cant make directory: " + d);
			retval = 0
		return retval

	# convenience function; make a dir
	def copy_file(self, src_dir, dst_dir, f):
		src_path = os.path.join(src_dir, f)
		if ( os.path.isdir(src_dir) and os.path.isdir(dst_dir)):
			shutil.copy2(src_path, dst_dir)
		retval = os.path.isfile(os.path.join(dst_dir, f))
		if ( not retval ):
			dst_path = os.path.join(dst_dir, f)
			self.err("Failure copying " + src_path + ' to ' + dst_path)
		return retval

# The config supplied to the installer for verification and access
class Config(Base):
	def __init__(self, ME, unpack_dir, http, ssl, uname, gname, 
		interf, name, os, org_name, bundle_url):
		Base.__init__(self, ME)
		# Not config, but needed everywhere
		self.unpack_dir	= unpack_dir
		# the config data
		self.org_name	= org_name
		self.bundle_url	= bundle_url
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

	def key_file(self):
		return self.name + '.key'

	def cert_file(self):
		return self.name + '.pem'

	def bundle_file(self):
		return self.name + '.notary'

	def staging(self):
		return os.path.join(self.unpack_dir, self.name)

	# Convenvience function
	def cd_staging_and(self, cmd):
		return '( cd ' + self.staging() + ' && ' + cmd + ' )'

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
		# the bundle_url should be checked in some way
		return retval

	# would love to check 'os' but am not sure of the correct way to do it

# Non-OS specific actions required for the full install
class Core(Base):

	def __init__(self, ME, config):
		Base.__init__(self, ME)
		# NON-PORTABLE
		self.install_dir		= '/usr/bin'
		self.util_prefix		= os.path.join(
			self.install_dir, conv_svc 
		)
		self.core_gencert		= self.util_prefix + '-gencert'
		self.core_bundle		= self.util_prefix + '-bundle'
		self.core_createdb		= self.util_prefix + '-createdb'
		self.core_notary		= self.util_prefix + '-notary'
		self.config			= config

	# We stuff data into the staging area during the install.  Create it.
	def make_staging_dir(self):
		retval = self.make_dir(self.config.staging())
		msg = "Create staging dir"
		self.report(retval, msg)
		return retval

	# May be too verbose.
	def cert_warning(self):
		print "\nYou have specified the name\n\n\t" + self.config.name + "\n"
		print "as the DNS name for your notary site.  \n"
		print "Now we generate the Certificate for the site:"
		print "You'll need to enter >> THAT NAME AGAIN<< !!\n"
		print "I.e the correct answer to the 6'th question looks like\n"
		print "Common Name (eg, your name or your server's hostname) []: " + self.config.name + "\n"

	# Generate the certs using the convergence-gencert tool
	def gen_cert(self):
		# self.cert_warning()
		cmd_args = ' -c ' + self.config.cert_file() + ' -k ' + self.config.key_file()
		cmd = self.config.cd_staging_and(self.core_gencert + cmd_args)
		retval = ( 0 == os.system(cmd) )
		if ( not retval ):
			self.err("Error generating certificates")
		return retval

	# Install the base software
	def install_convergence_software(self):
		cmd = '( cd ' + self.config.unpack_dir+' && '+ install_convergence + ')'
		retval = ( 0 == os.system(cmd) )
		if ( not retval ):
			self.err("Install of " + conv_svc + " failed");
		return retval	

	# Create the convergence DB
	def createdb(self):
		msg = conv_name + " DB exists"
		exists = os.path.isfile(conv_db)
		retval = 1
		if ( exists ):
			self.info(conv_name  + " DB already exists, leaving")
		else:
			retval = ( 0 == os.system(self.core_createdb) )
		self.report(retval, msg)
		return retval	

# Parent for all OS variants.  Provides services for the OS specific
# components of the installer (e.g where to do things).  To be sub-classed
# for each OS variant.
class OS(Base):

	def __init__(self, ME, config):
		Base.__init__(self, ME)
		# to be overridden/defined by child classes, as required
		# lots of NON-PORTABLE
		self.data_dir			= '/etc/' + conv_svc
		self.service_init_dir		= '/etc/rc.d/init.d'
		self.service_defn_src_file	= ''
		self.service_config_file	= ''
		self.service_init_script	= ''
		self.service_start_cmd		= ''
		self.service_auto_start_cmd	= ''
		self.depend_packages		= []
		self.depend_install_cmd		= ''
		self.config			= config

		# Map of os type to the single definition of how to do it
		# e.g rhel6 and fc14 are the same.
		self.supported_os	= {
			'rhel6': 'rhel6',
			'fc14':  'rhel6'
		}

	def get_supported_os(self):
		return ','.join(self.supported_os.keys())

	# where is the final location of the cert
	def cert_path(self):
		return os.path.join(self.data_dir, self.config.cert_file())

	# where is the final location of the key
	def key_path(self):
		return os.path.join(self.data_dir, self.config.key_file())

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
		msg = conv_name + " service launch script exists"
		src = self.service_init_src
		dst = self.service_init_dst
		retval = 0
		exists = os.path.isfile(dst)
		if ( exists ):
			self.info(conv_name  + " service exists, leaving")
			retval = 1
		else:
			shutil.copy2(src, dst)
		retval = os.path.isfile(dst)
		self.report(retval, msg)
		return retval

	# after building all the useful data in the staging area
	# we move it to a system directory from which its data can
	# be used by the service itself.
	def install_service_data(self):
		msg = "Key, cert and bundle installed for service"
		dst = self.service_data_dir
		if ( self.make_dir(dst) ):
			# dirs
			src = self.config.staging()
			dst = self.service_data_dir
			# files
			key = self.config.key_file()
			cert = self.config.cert_file()
			bundle = self.config.bundle_file()
			for f in [ key, cert, bundle ]:
				self.copy_file(src, dst, f)
		retval = ( os.path.isfile(os.path.join(dst,key)) and os.path.isfile(os.path.join(dst,cert)) and os.path.isfile(os.path.join(dst,bundle)) )
		self.report(retval, msg)
		return retval

	# Standard practice is to have all args passed to the daemon
	# from the init script to have be defined in a 'config' file
	# which the init script loads.
	# This creates that 'config' file for the init script to load.  
	# It may not be so useful here, as a change of most values i
	# requires a regeneration of the bundle and thus its re-publication.
	def make_service_config(self):
		msg = "Service configuration exists"
		config = self.config # shorthand
		dst = self.service_config_file 
		f = open(dst, "w")
		param = ["PORT=" + str(config.http), "SSL=" + str(config.ssl), "CERT=" + self.cert_path(), "KEY=" + self.key_path(), "USER=" + config.uname, "GROUP=" + config.gname, "INTERFACE=" + config.interf]
		f.write('\n'.join(param))
		f.close()
		retval = os.path.isfile(dst)
		self.report(retval, msg)
		return retval

	# Start the service using the generated service (init script) file
	def service_start(self):
		msg = "Service is just started"
		cmd = self.service_start_cmd
		retval = ( 0 == os.system(cmd) )
		self.report(retval, msg)
		return retval	

	# Configure service auto start
	def service_auto_start(self):
		msg = "Service will auto-start"
		cmd = self.service_auto_start_cmd
		retval = ( 0 == os.system(cmd) )
		self.report(retval, msg)
		return retval	

	def get_pem_transformed(self):
		return 'cert--\\nfoobar\\n--cert'

	def bundle_host_format(self):
		pem_transformed = self.get_pem_transformed()
		return '{"host": "' + self.config.name + '", ' + '"http_port": ' + str(self.config.http) + ', ' + '"ssl_port": ' + str(self.config.ssl) + ', ' + '"certificate": ' + pem_transformed + '"}'

	def bundle_format(self):
		return '{"version": ' + bundle_version + ', ' + '"hosts": [' + self.bundle_host_format() + '], ' + '"name": "' + self.config.org_name + '", ' + '"bundle_location": "' + self.config.bundle_url + '"}'

	# Create the bundle.  Bad plan.  Re-implements the bundle creator.
	# But no choice as the new version is entirely interactive  ....
	# Could do an echo blah | convergence-bundle.py, but that will break
	# just as easily if things change.  Need a fully parameterised bundle
	# creation script (or a library call).
	def create_bundle(self):
		msg = "Notary bundle exists (in staging dir)"
		dst = os.path.join(self.config.staging(), self.config.bundle_file())
		f = open(dst, 'w')
		retval = 0
		f.write(self.bundle_format())
		f.close()
		retval = os.path.isfile(dst)
		self.report(retval, msg)
		return retval	

# OS specifics for RedHat Enterprise Linux 6 (and recent Fedora Core releases)
class RHEL6(OS):

	def __init__(self, ME, config):
		OS.__init__(self, ME, config)
		self.service_init_src		= os.path.join([self.config.staging, 'init-script', conv_svc + '.rhel6'])
		self.service_init_dst		= '/etc/rc.d/init.d/' + conv_svc
		self.service_config_file	= '/etc/sysconfig/' + conv_svc
		self.service_start_cmd		= 'service ' + conv_svc + ' start'
		self.service_auto_start_cmd	= 'chkconfig ' + conv_svc + ' on'
		self.service_data_dir		= '/etc/' + conv_svc
		self.depend_packages		= [
			'python-twisted-web', 
			'm2crypto'
			]
		self.depend_install_cmd		= 'yum -y install'

