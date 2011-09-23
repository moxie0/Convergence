# Variables
EXTENSION_NAME=Convergence
XPI_NAME=$(EXTENSION_NAME).xpi
ZIP_NAME=$(EXTENSION_NAME).zip

# Targets
default: build

clean:
	find . -name '~*' -delete
	find . -name '*.swp' -delete
	rm -f $(XPI_NAME)
	rm -f $(ZIP_NAME)

build: clean
	zip -r $(ZIP_NAME) ./chrome
	zip -r $(ZIP_NAME) ./chrome.manifest
	zip -r $(ZIP_NAME) ./components
	zip -r $(ZIP_NAME) ./style
	zip -r $(ZIP_NAME) ./install.rdf
	zip -r $(ZIP_NAME) ./update.rdf
	zip -r $(ZIP_NAME) ./icon.png
	zip -r $(ZIP_NAME) ./icon64.png
	mv $(ZIP_NAME) $(XPI_NAME)
