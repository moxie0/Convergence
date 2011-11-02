
import os, sys, shutil

conv			= 'convergence'
install_convergence	= 'python ./setup.py install'

class Msg:
	def __init__(self):
		self.name	= conv + '-installer'

	def msg(self, s):
		print >> sys.stderr, s + '\n';

	def err(self, s):
		self.msg(': '.join([self.name, 'Error', s]))

	def info(self, s):
		self.msg(': '.join([self.name, 'Info', s]))

class Installer():

	def __init__(self, unpack_dir, name):
		Msg.__init__(self)
		self.unpack_dir			= unpack_dir
		self.name			= name

class Core(Installer, Msg):

	def __init__(self, unpack_dir, name):
		Installer.__init__(self, unpack_dir, name)
		# NON-PORTABLE
		self.install_dir		= '/usr/bin'
		self.util_prefix		= os.path.join(
			self.install_dir, conv 
		)
		self.core_gencert		= self.util_prefix + '-gencert'
		self.core_bundle		= self.util_prefix + '-bundle'
		self.core_createdb		= self.util_prefix + '-createdb'
		self.core_notary		= self.util_prefix + '-notary'

	def cd_staging_and(self, cmd):
		staging = os.path.join(self.unpack_dir, self.name)
		return '( cd ' + staging + ' && ' + cmd + ' )'

	def make_staging_dir(self):
		stage = os.path.join(self.unpack_dir, self.name)
		retval = 1
		if ( not os.path.isdir(stage) ):
			os.mkdir(stage)
		if ( not os.path.isdir(stage) ):
			self.err("Cant make staging directory " + stage);
			retval = 0
		return retval

	def cert_warning(self):
		print "\nYou have specified the name\n\n\t" + self.name + "\n"
		print "as the DNS name for your notary site.  \n"
		print "Now we generate the Certificate for the site:"
		print "You'll need to enter >> THAT NAME AGAIN<< !!\n"
		print "I.e the correct answer to the 6'th question looks like\n"
		print "Common Name (eg, your name or your server's hostname) []: " + self.name + "\n"

	def gen_cert(self):
		self.cert_warning()
		cmd = self.cd_staging_and(self.core_gencert)
		retval = ( 0 == os.system(cmd) )
		if ( not retval ):
			self.err("Error generating certificates")
		return retval

	def install_convergence_software(self):
		cmd = '( cd ' +self.unpack_dir+' && '+ install_convergence +')'
		retval = ( 0 == os.system(cmd) )
		if ( not retval ):
			self.err("Install of " + conv + " failed");
		return retval	

class OS(Installer, Msg):

	def __init__(self, unpack_dir, name):
		Installer.__init__(self, unpack_dir, name)
		# to be overridden/defined by child classes, as required
		# lots of NON-PORTABLE
		self.data_dir			= '/etc/' + conv
		self.service_defn_dir		= '/etc/rc.d/init.d'
		self.service_defn_src_file	= ''
		self.service_config_file	= ''
		self.service_init_script	= ''
		self.service_start_cmd		= ''
		self.depend_packages		= []
		self.depend_install_cmd		= 'yum -y install'

	def depend_install(self):
		cmd = self.depend_install_cmd + ' ' + ' '.join([self.depend_packages])
		print cmd
		#if ( 0 != os.system(cmd) ):
			#self.err('Failure installing dependencies')

	def staging_to_data():
		if ( not shutil.move(self.staging_dir, self.data_dir) ):
			self.err('Cant move staging to data dir')

	def mk_service():
		if ( not shutil.copy2(
			self.service_init_script, self.service_defn_dir
		) ):
			self.err('Cant copy to service definition dir')

