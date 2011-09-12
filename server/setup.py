import os, shutil, sys
from distutils.core import setup, Extension

cmd = ''
if len(sys.argv) > 1:
    cmd = sys.argv[1]

if cmd in ['build', 'install']:
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

if cmd in ['install', 'clean']:
    try:
        os.remove("convergence/convergence-notary")
        os.remove("convergence/convergence-bundle")
        os.remove('convergence/convergence-createdb')
        os.remove("convergence/convergence-gencert")
    except:
        pass

if cmd in ['install', 'clean'] and os.path.exists('build'):
    shutil.rmtree('build')
