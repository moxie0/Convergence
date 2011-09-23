# Copyright (c) 2011 Moxie Marlinspike <moxie@thoughtcrime.org>
# This program is free software; you can redistribute it and/or
# modify it under the terms of the GNU General Public License as
# published by the Free Software Foundation; either version 3 of the
# License, or (at your option) any later version.

# This program is distributed in the hope that it will be useful, but
# WITHOUT ANY WARRANTY; without even the implied warranty of
# MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the GNU
# General Public License for more details.

# You should have received a copy of the GNU General Public License
# along with this program; if not, write to the Free Software
# Foundation, Inc., 59 Temple Place, Suite 330, Boston, MA 02111-1307
# USA

import os, shutil
from distutils.core import setup, Extension

shutil.copyfile("convergence-notary.py", "convergence/convergence-notary")
shutil.copyfile("convergence-gencert.py", "convergence/convergence-gencert")
shutil.copyfile("convergence-createdb.py", "convergence/convergence-createdb")
shutil.copyfile("convergence-bundle.py", "convergence/convergence-bundle")

REQUIRES = ['twisted.web', 
            'twisted.enterprise', 
            'twisted.internet',
            'twisted.names',
            'OpenSSL', 
            'sqlite3'
           ]

setup  (name             = 'convergence-notary',
        version          = '0.2',
        description      = 'An agile, distributed, and secure alternative to the Certificate Authority system.',
        author           = 'Moxie Marlinspike',
        author_email     = 'moxie@thoughtcrime.org',
        url              = 'http://convergence.io/',
        license          = 'GPL',
        packages         = ["convergence", "convergence.verifier"],
        package_dir      = {'convergence' : 'convergence/', 'convergence.verifier' : 'convergence/verifier'},
        scripts          = ['convergence/convergence-notary',
                            'convergence/convergence-gencert',
                            'convergence/convergence-createdb',
                            'convergence/convergence-bundle'],
        install_requires = REQUIRES,
        data_files       = [('share/convergence', ['README', 'INSTALL', 'COPYING']),
                            ('/etc/init.d', ['init-script/convergence']),
                            ('/etc/default', ['init-script/default/convergence'])]
       )

print "Cleaning up..."
if os.path.exists("build/"):
    shutil.rmtree("build/")

try:
    os.remove("convergence/convergence-notary")
    os.remove("convergence/convergence-bundle")
    os.remove('convergence/convergence-createdb')
    os.remove("convergence/convergence-gencert")
except:
    pass

def capture(cmd):
    return os.popen(cmd).read().strip()
