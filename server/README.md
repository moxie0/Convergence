Installation
============

 * Install the dependencies: `$ sudo apt-get install python python-twisted-web python-m2crypto python-openssl python-json`
 * Download the notary source: `$ wget http://convergence.io/releases/server/convergence-notary-current.tar.gz`
 * Unpack the source: `$ tar zxvf convergence-notary-current.tar.gz`
 * Enter the directory: `$ cd convergence-notary-<version>`
 * Run the install script: `$ sudo python ./setup.py install`

Configuration
=============

 * Generate a key pair: `$ convergence-gencert`
 * Create database: `$ sudo convergence-createdb`
 * Start the server: `$ sudo convergence-notary -p 80 -s 443 -c path/to/certificate.pem -k path/to/key.key`

Publish
=======

 * Generate a notary bundle: `$ convergence-bundle`
 * Publish the resulting file on your website, with a .notary extension.
 * You're done! Anyone can use your notary by clicking on the link to your .notary file.


