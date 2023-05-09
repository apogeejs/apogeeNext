# Argonaut Editor Electron Renderer Process

This portion of the argonaut project creates the electron renderer process.
It also includes a web test page (and server) for use during the codemirror/parser development.

## Build
The following build scripts are available:

 - "prepare-lezer" - This script should be run whenever the parser files are updated, It converts the grammar file 
   to javascript and it also bundles the javascript files for running the unit tests.
 - "test-lezer" - This script runs the unit tests for the parser.
 - "bld-dev" - This bundles the dev web application, which can be used for development of the parser.
 - "bld-app" - This bundles the renderer process for the app. It needs to be run before running the app if any of the
   renderer app files change.

## Parser Development

The web page to that includes a dev editor is at the folllowing url:

http://localhost:8888/renderer/parserdev/web/index.html
   