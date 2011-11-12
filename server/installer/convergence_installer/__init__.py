
import os, sys, shutil, json, grp, pwd

# the name of the product
conv_name		= 'Convergence'
# the name of the service
conv_svc		= 'convergence'

# Should not need to know this (we're creating bundles and shouldn't be)
# notary 'bundle' file version number
bundle_version		= '1'

# Simple messaging tool, and basic file operations (super-class of all)
class Base:
	def __init__(self, ME):
		self.me		= ME

	def msg(self, s):
		print >> sys.stderr, s;

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
		return status

	def run_and_report(self, cmd, msg):
		return self.report( ( 0 == os.system(cmd) ), msg)

	# convenience function; make a dir
	def make_dir(self, d):
		retval = 1
		if ( not os.path.isdir(d) ):
			os.mkdir(d)
		if ( not os.path.isdir(d) ):
			self.err("Cant make directory: " + d);
			retval = 0
		return retval

	# convenience function; copy a file
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
# i.e all the things that we need to know to perform an install
#
# also supplies some simple functions needed both by Core and OS
# (as they both have a Config object)
class Config(Base):
	def __init__(self, ME, unpack_dir, http, ssl, uname, gname, 
		interf, name, os, org_name, bundle_url, auto_create):
		Base.__init__(self, ME)
		# Not config, but needed in various places
		self.unpack_dir		= unpack_dir
		# the config data
		self.org_name		= org_name
		self.bundle_url		= bundle_url
		self.http		= http
		self.ssl		= ssl
		self.auto_create	= auto_create
		self.uname		= uname
		self.uname_exists	= 0
		self.gname		= gname
		self.gname_exists	= 0
		self.interf		= interf
		self.name		= name
		# The 'string' describing the os by the user
		self.os			= os
		# the actual 'string' for the os that is need for the install
		# see OS.translate_supported_os()
		self.os_install 	= ''

	# helper routines
	def key_file(self):
		return self.name + '.key'

	def cert_file(self):
		return self.name + '.pem'

	def bundle_file(self):
		return self.name + '.notary'

	# We use a staging dir to create the stuff we need and then later
	# move it to its destination.  The staging dir is under the 
	# unpack_dir and has the name of the DNS name of the convergence site
	def staging(self):
		return os.path.join(self.unpack_dir, self.name)

	# Convenvience function: cd to 'directory' and do something
	def cd_dir_and(self, directory, cmd):
		return '( cd ' + directory + ' && ' + cmd + ' )'

	# Convenvience function: cd to staging and do something
	def cd_staging_and(self, cmd):
		return self.cd_dir_and(self.staging(), cmd)

	#
	# Verify config entries
	#
	def is_port(self, port):
		return ( 0 < port and port < 65536 )

	def looks_like_IPv4(self, addr):
		split = addr.split('.')
		return ( 4 == len(split) )

	def looks_like_DNS(self, domain):
		split = domain.split('.')
		return ( 1 < len(split) )

	def group_exists(self, uname):
		retval = 1
		try:
			grp.getgrnam(self.gname)
		except KeyError:
			retval = 0
		return retval

	def user_exists(self, uname):
		retval = 1
		try:
			pwd.getpwnam(self.uname)
		except KeyError:
			retval = 0
		return retval

	# check those elements of the config as best we can
	def verify(self):
		# Check port numbers
		msg_port = " is not a valid port"
		retval = 1
		if ( not self.is_port(self.http) ):
			self.err("httpPort value " + self.http + msg_port)
			retval = 0
		if ( not self.is_port(self.ssl) ):
			self.err("sslPort value " + self.ssl + msg_port)
			retval = 0
		# Check about user and group
		msg_not_exist = "' does not exist."
		help_auto = "Use -a to auto create missing user/group(s)"
		if ( not self.user_exists(self.uname) ):
			self.err("User '" + self.uname + msg_not_exist)
			if ( not self.auto_create ):
				self.info(help_auto)
		else:
			self.uname_exists = 1
		if ( not self.group_exists(self.gname) ):
			self.err("Group '" + self.gname + msg_not_exist)
			if ( not self.auto_create ):
				self.info(help_auto)
		else:
			self.gname_exists = 1
		# Incoming interface
		if ( 0 < len(self.interf) and not self.looks_like_IPv4(self.interf) ):
			self.err("incomingInterface does not look like IPv4")
			retval = 0
		if ( not self.looks_like_DNS(self.name) ):
			self.err("site name does not look like a DNS domain")
			retval = 0
		# requested os is known ??
		os = OS(self.me, self)
		self.os_install = os.translate_supported_os(self.os)
		retval = ( self.os_install is not None )
		# the bundle_url should be checked in some way
		return retval

# The class that knows about Convergence tools and how to use them for install
class Core(Base):

	def __init__(self, ME, config):
		Base.__init__(self, ME)
		self.core_gencert		= conv_svc + '-gencert'
		self.core_bundle		= conv_svc + '-bundle'
		self.core_createdb		= conv_svc + '-createdb'
		self.core_notary		= conv_svc + '-notary'
		# install script
		self.install_convergence	= 'python ./setup.py install'
		# database path (*nix type, unknown elsewhere)
		self.conv_db_path		= '/var/lib/convergence/convergence.db'
		# Our copy of the config
		self.config			= config

	# We stuff data into the staging area during the install.  Create it.
	def make_staging_dir(self):
		msg = "Create staging dir"
		retval = self.make_dir(self.config.staging())
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
		msg = "Generating certificate and key files"
		cmd_args = ' -c ' + self.config.cert_file() + \
			' -k ' + self.config.key_file()
		cmd = self.config.cd_staging_and(self.core_gencert + cmd_args)
		return self.config.run_and_report(cmd, msg)

	# Install the base software
	def install_convergence_software(self):
		msg = "Installing " + conv_name + " software"
		cmd = self.config.cd_dir_and(
			self.config.unpack_dir, self.install_convergence
		)
		return self.config.run_and_report(cmd, msg)

	# Create the convergence DB
	def createdb(self):
		msg = conv_name + " DB shall exist"
		exists = os.path.isfile(self.conv_db_path)
		retval = 1
		if ( exists ):
			self.info(conv_name  + " DB already exists, leaving")
		else:
			retval = self.config.run_and_report(self.core_createdb, msg)
		return retval	

# Parent for all OS variants.  Provides services for the OS specific
# components of the installer (e.g where to put things).  To be sub-classed
# for each OS variant.
class OS(Base):

	def __init__(self, ME, config):
		Base.__init__(self, ME)
		# to be overridden/defined by child classes, as required
		# lots of NON-PORTABLE
		#
		# The place where we put the cert, key and bundle
		self.data_dir			= '/etc/' + conv_svc
		# The path to the init script (e.g /etc/rc.d/init.d/convergence)
		self.service_init_path		= ''
		# Were in the unpack location is the source file init script
		self.service_defn_src_file	= ''
		# Where do we write a loadable config for the init script
		self.service_config_file	= ''
		# What command will make the service auto start
		self.service_auto_start_cmd	= ''
		# What packages are required
		self.depend_packages		= []
		# How do we install the packages
		self.depend_install_cmd		= ''
		# Here we stash the config
		self.config			= config

		# Map of os type to the single definition of how to do it
		# e.g rhel6 and fc14 are the same.
		self.supported_os	= {
			'rhel6': 	'rhel6',
			'fc14':  	'rhel6',
			'ubu10':	'ubu11',
			'ubu11':	'ubu11',
		}

	# where is the final location of the cert
	def cert_path(self):
		return os.path.join(self.data_dir, self.config.cert_file())

	# where is the final location of the key
	def key_path(self):
		return os.path.join(self.data_dir, self.config.key_file())

	# Where is the bundle after successful install
	def bundle_path_final(self):
		return os.path.join(self.service_data_dir, self.config.bundle_file())

	# Return a list of supported OS's
	def get_supported_os(self):
		return ','.join(self.supported_os.keys())

	# translate a supported OS to its installer type 
	# i.e some are the same: e.g rhel6 and fc14 are both 'rhel6' for install
	def translate_supported_os(self, os):
		retval = None
		try:
			retval = self.supported_os[os]
		except KeyError:
			self.err("OS type '" + os + "' is unsupported")
		return  retval

	# please install my software dependencies
	def depend_install(self):
		msg = "Installing " + conv_name + " dependencies"
		cmd = self.depend_install_cmd + ' ' + ' '.join(self.depend_packages)
		return self.config.run_and_report(cmd, msg)

	# To be overridden by a child class
	def create_nonpriv_user_cmd(self, uname, gname):
		return 'echo "Dont know how to create users" && test 1 -eq 0'

	# To be overridden by a child class
	def create_group_cmd(self, gname):
		return 'echo "Dont know how to create groups" && test 1 -eq 0'

	def create_nonpriv_user(self, uname, gname):
		msg = "Create non-priviledged user '" + uname + "'"
		cmd = self.create_nonpriv_user_cmd(uname, gname)
		return self.run_and_report(cmd, msg)

	# Same as above.  Abstract better
	def create_group(self, gname):
		msg = "Create group '" + gname + "'"
		cmd = self.create_group_cmd(gname)
		return self.run_and_report(cmd, msg)

	# auto-create any missing user/group
	#
	# This requires that the create_{group,user} is implemented for 
	# all child classes (!!!!!!)
	def auto_create_user_group(self):
		msg = "Auto-creating User and/or Group"
		retval = 1
		if ( not self.config.gname_exists ):
			retval = self.create_group(self.config.gname)
		if ( not self.config.uname_exists and retval ):
			retval = self.create_nonpriv_user(
				self.config.uname, self.config.gname
			)
		self.report(retval, msg)
		return retval

	# Use the OS specific service definition, and create the init file
	def make_service(self):
		msg = conv_name + " service launch script exists"
		src = self.service_init_src
		dst = self.service_init_path
		retval = 0
		try:
			shutil.copy2(src, dst)
			retval = 1
		except IOError:
			self.err("Failure copying " + src + ' to ' + dst)
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

	# Start the service using the generated service (init script) file
	def service_start(self):
		msg = "Service is just started"
		cmd = self.service_start_cmd()
		return self.run_and_report(cmd, msg)

	# Configure service auto start
	def service_auto_start(self):
		msg = "Service will auto-start"
		cmd = self.service_auto_start_cmd
		return self.run_and_report(cmd, msg)

	def get_cert(self):
		cfg = self.config # shorthand
		cert = os.path.join(cfg.staging(), cfg.cert_file())
		f = open(cert, 'r')
		data = f.read()
		f.close()
		return data

	# Create the bundle.  Bad plan.  Re-implements the bundle creator.
	# But no choice as the new version is entirely interactive  ....
	# Could do an echo blah | convergence-bundle.py, but that will break
	# just as easily if things change.  Need a fully parameterised bundle
	# creation script (or a library call).
	def bundle_host(self):
		return {"host": self.config.name, "http_port": self.config.http , "ssl_port": self.config.ssl, "certificate": self.get_cert() }

	def make_bundle(self):
		return {"version": bundle_version, "hosts": [ self.bundle_host() ], "name": self.config.org_name , "bundle_location": self.config.bundle_url }

	def create_bundle(self):
		msg = "Notary bundle exists (in staging dir)"
		bundle = self.make_bundle()
		dst = os.path.join(self.config.staging(), self.config.bundle_file())
		f = open(dst, 'w')
		retval = 0
		f.write(json.dumps(bundle))
		f.close()
		retval = os.path.isfile(dst)
		self.report(retval, msg)
		return retval	

# First OS sub-class: things that should be generally the same for SysV type
# Unixes
class sysv_nix(OS):

	def __init__(self, ME, config):
		OS.__init__(self, ME, config)
		self.service_data_dir		= '/etc/' + conv_svc
		self.depend_packages		= [
			'python-twisted-web', 
			'python-twisted-names', 
			'm2crypto'
			]

	def service_start_cmd(self):
		return self.service_init_path + ' start'

	def create_nonpriv_user_cmd(self, uname, gname):
		return 'useradd -d /tmp -g ' + gname + ' -M -N -s /sbin/false ' + uname

	def create_group_cmd(self, gname):
		return 'groupadd ' + gname


# OS specifics for RedHat Enterprise Linux 6 (and recent Fedora Core releases)
class UBU11(sysv_nix):

	def __init__(self, ME, config):
		sysv_nix.__init__(self, ME, config)
		# override
		self.service_init_path		= '/etc/init.d/' + conv_svc
		self.service_init_src		= os.path.join(self.config.unpack_dir, 'init-script', conv_svc + '.ubu11')
		self.service_config_file	= '/etc/default/' + conv_svc
		self.depend_install_cmd		= 'apt-get -y install'
		self.service_auto_start_cmd	= 'update-rc.d ' + conv_svc + ' defaults'

	def make_service_config(self):
		msg = "Service configuration exists"
		config = self.config # shorthand
		dst = self.service_config_file 
		f = open(dst, "w")
		param = ["-p " + str(config.http), "-s " + str(config.ssl), "-c " + self.cert_path(), "-k " + self.key_path(), "-u " + config.uname, "-g " + config.gname]
		if ( '' != config.interf ):
			param.append('-i ' + config.interf)
		f.write('ARGS="' + ' '.join(param) + '"')
		f.close()
		retval = os.path.isfile(dst)
		self.report(retval, msg)
		return retval

# OS specifics for RedHat Enterprise Linux 6 (and recent Fedora Core releases)
class RHEL6(sysv_nix):

	def __init__(self, ME, config):
		sysv_nix.__init__(self, ME, config)
		self.service_init_path		= '/etc/rc.d/init.d/' + conv_svc
		self.service_init_src		= os.path.join(self.config.unpack_dir, 'init-script', conv_svc + '.rhel6')
		self.service_config_file	= '/etc/sysconfig/' + conv_svc
		self.depend_install_cmd		= 'yum -y install'
		self.service_auto_start_cmd	= 'chkconfig ' + conv_svc + ' on'

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

