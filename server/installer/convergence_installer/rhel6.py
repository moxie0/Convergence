
import convergence_install

class RHEL6(OS):

	def __init__(self, staging_dir):
		OS.__init__(self, staging_dir)
		convergence_install.OS(self, staging_dir)
		self.service_defn_src_file	= os.path.join(
			self.staging_dir, 'install-script', 'rhel6-init'
		)
		self.service_config_file	= '/etc/sysconfig/' + conv
		self.service_init_script	= '/etc/rc.d/init.d/' + conv
		self.service_start_cmd		= 'service ' + conv + ' start'
		self.depend_packages		= [
			'python-twisted-web', 
			'm2crypto'
			]
		self.depend_install_cmd		= 'yum -y install'

