import os, shutil
from distutils.core import setup, Extension

# Name of convergence directory
DIR = "convergence"
# List of scripts to install
SCRIPTS = ["convergence-notary",
            "convergence-gencert",
            "convergence-createdb",
            "convergence-bundle"]

# Copy and rename python scripts
for s in SCRIPTS:
    shutil.copyfile(s + ".py", os.path.join(DIR, s))

setup  (name        = 'convergence-notary',
        version     = '0.01',
        description = 'An agile, distributed, and secure alternative to the Certificate Authority system.',
        author = 'Moxie Marlinspike',
        author_email = 'moxie@thoughtcrime.org',
        url = 'http://convergence.io/',
        license = 'GPL',
        packages  = ["convergence"],
        package_dir = {'convergence' : 'convergence/'},
        scripts = [os.path.join(DIR, s) for s in SCRIPTS],
        data_files = [('share/convergence', ['README', 'INSTALL', 'COPYING']),
                      ('/etc/init.d', ['init-script/convergence'])]
       )

print "Cleaning up..."
if os.path.exists("build/"):
    shutil.rmtree("build/")

# remove renamed scripts from temporary location
for s in SCRIPTS:
    try:
        os.remove(os.path.join(DIR, s))
    except:
        pass

def capture(cmd):
    return os.popen(cmd).read().strip()
