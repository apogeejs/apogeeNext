# Argonaut Editor

This is an interactive editor for R.

## Running the App

To run the app, both the main process and the renderer process must be built. See the build instructions for 
each of those sections.

Then start the app by running:  

_npm run start-app_

## Development

For development of the parser, see _parserdev_ under renderer. When the parser dev web page is built, the server can be 
run to serve it. Note that the root of the server is the project root, and it runs on the port 8888.

_npm run start-server_