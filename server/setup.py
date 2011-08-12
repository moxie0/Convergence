import sys, os, shutil
from distutils.core import setup, Extension

shutil.copyfile("convergence-notary.py", "convergence/convergence-notary")
shutil.copyfile("convergence-gencert.py", "convergence/convergence-gencert")
shutil.copyfile("convergence-createdb.py", "convergence/convergence-createdb")
shutil.copyfile("convergence-bundle.py", "convergence/convergence-bundle")

setup  (name        = 'convergence-notary',
        version     = '0.01',
        description = 'An agile, distributed, and secure alternative to the Certificate Authority system.',
        author = 'Moxie Marlinspike',
        author_email = 'moxie@thoughtcrime.org',
        url = 'http://convergence.io/',
        license = 'GPL',
        packages  = ["convergence"],
        package_dir = {'convergence' : 'convergence/'},
        scripts = ['convergence/convergence-notary', 'convergence/convergence-gencert', 'convergence/convergence-createdb', 'convergence/convergence-bundle'],
        data_files = [('share/convergence', ['README', 'INSTALL', 'COPYING']),
                      ('/etc/init.d', ['init-script/convergence'])]
       )

print "Cleaning up..."

try:
    removeall("build/")
    os.rmdir("build/")
except:
    pass

try:
    os.remove("convergence/convergence-notary")
    os.remove("convergence/convergence-bundle")
    os.remove('convergence/convergence-createdb')
    os.remove("convergence/convergence-gencert")

except:
    pass

def capture(cmd):
    return os.popen(cmd).read().strip()

def removeall(path):
	if not os.path.isdir(path):
		return

	files=os.listdir(path)

	for x in files:
		fullpath=os.path.join(path, x)
		if os.path.isfile(fullpath):
			f=os.remove
			rmgeneric(fullpath, f)
		elif os.path.isdir(fullpath):
			removeall(fullpath)
			f=os.rmdir
			rmgeneric(fullpath, f)

def rmgeneric(path, __func__):
	try:
		__func__(path)
	except OSError, (errno, strerror):
		pass
