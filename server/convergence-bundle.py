#!/usr/bin/env python
"""convergence-bundle produces notary 'bundles', which can be easily
imported to a web browser."""

__author__ = "Moxie Marlinspike"
__email__  = "moxie@thoughtcrime.org"
__license__= """
Copyright (c) 2010 Moxie Marlinspike <moxie@thoughtcrime.org>

This program is free software; you can redistribute it and/or
modify it under the terms of the GNU General Public License as
published by the Free Software Foundation; either version 3 of the
License, or (at your option) any later version.

This program is distributed in the hope that it will be useful, but
WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the GNU
General Public License for more details.

You should have received a copy of the GNU General Public License
along with this program; if not, write to the Free Software
Foundation, Inc., 59 Temple Place, Suite 330, Boston, MA 02111-1307
USA

"""

import sys, getopt, textwrap, json

def loadCertificate(path):
    fd       = open(path, "r")
    contents = fd.read()
    contents = contents.replace("\n", r"\n")

    return contents

def loopingPrompt(message):
    value = ""
    while value == "":
        value = raw_input(message).strip()

    return value

def promptForLogicalInfo():
    bundle = {"name" : "", "hosts" : [], "bundle_location" : "", "version" : 1}
    
    print "\n" + textwrap.fill("A notary is a 'logical' entity that represents an " \
                                 "arbitrary number of physical hosts.  To create a " \
                                 "notary bundle, this script will prompt you for general " \
                                 "information about the logical notary entity, and then for " \
                                 "information about the physical notary hosts.", 78)


    print "\n\n" + textwrap.fill("First, please enter the name of the entity managing this notary. " \
                                 "For an individual, this would be an individual's " \
                                 "name (eg: John Smith). For an organization, this " \
                                 "would be the organization's name (eg: Acme).", 78) + "\n"

    bundle['name'] = loopingPrompt("Notary name: ")

    print "\n\n" + textwrap.fill("Next, please enter the complete URL for where this bundle will " \
                                 "be hosted (eg: https://thoughtcrime.org/thoughtcrime.notary).  It must " \
                                 "be an https URL, and the file must have a '.notary' " \
                                 "extension. This location will be periodically checked by clients for " \
                                 "updates to your notary configuration.", 78) + "\n"

    bundle['bundle_location'] = loopingPrompt("Bundle location: ")

    while (not bundle['bundle_location'].startswith("https://")) or (not bundle['bundle_location'].endswith(".notary")):
        print textwrap.fill("Sorry, the bundle location must be an HTTPS URL and have a '.notary' file extension.", 78)
        bundle['bundle_location'] = loopingPrompt("Bundle location: ")
    
    return bundle
    
def promptForPhysicalInfo(count):
    print "\n" + textwrap.fill("Please enter the hostname for physical host #" + str(count) +
                               " (eg: notary" + str(count) + ".thoughtcrime.org), or leave empty " \
                               "if there are no more hosts.", 78) + "\n"
    host = raw_input("Hostname: ").strip()
    
    if len(host.strip()) == 0:
        return None
    
    sslPort         = int(loopingPrompt(textwrap.fill(host + " SSL listen port (eg: 443):", 78) + " "))
    httpPort        = int(loopingPrompt(textwrap.fill(host + " HTTP listen port (eg: 80):", 78) + " "))
    certificatePath = loopingPrompt(textwrap.fill("Path to PEM encoded certificate for "
                                                  + host + ":", 78) + " ")
    certificate     = loadCertificate(certificatePath)
    count          += 1
    
    return {"host" : host, "ssl_port" : sslPort, "http_port" : httpPort, "certificate" : certificate}

def promptForBundleInfo():
    count  = 1    
    bundle = promptForLogicalInfo()

    while True:
        host = promptForPhysicalInfo(count)

        if host is not None:
            bundle['hosts'].append(host)
        else:
            break
        
        count = count + 1
    
    return bundle

def writeBundle(bundle):
    bundleFile = open("mynotarybundle.notary", "w")
    bundleFile.write(json.dumps(bundle))
    bundleFile.close()

    print "\n\nBundle saved in 'mynotarybundle.notary'"


def main(argv):
    bundle = promptForBundleInfo()
    writeBundle(bundle)

if __name__ == '__main__':
    main(sys.argv[1:])
