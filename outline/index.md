# Apogee Next Project Outline

Apogee is a functional, reactive devepolpment envrionment for javascript code.

## Architecture

- main
    - Opens the electron browser window
    - With context isolation, serves as a gateway for protected resources
- renderer
    - Application code executing in the browser window

### Main Process

- This process is the startup processs for the application.
- The main function is to open the browser window which holds the application's user functionality.
- It also exposes protected resources to the application, using context isolation.


### Renderer Process

This is the process running in the browser, containg the main application and UI.

- Main UI
    - Title Bar - 
        - Menu
            - New - Create a new file
            - Open - Open an existing File
            - Save - Save the current file 
            - Save As - Save the current file with a given name and location
            - Quit - Quit the application
        - Window Controls
            - Minimize
            - Maximinz
            - Close
        - Draggable Target - used to move window
    - Main Panel
        - This is a application panel where editing take place.
        - Allows opening multiple tabs, each representing a file. The tab contains a text edit component
    - Text Edit Component - This is a text edit component where the file editing takes place

#### Editor Component

The editor component is a Code Mirror editor component. This provides general edit functionality and allows
the addition of plugins for more specific functionality.

Extensions:

- editorBaseTheme - This is the base theme for apogee, including for example styling of apogee specific components.
- customScrollerTheme - This is styling for the custom scroll bars, which is included if needed.
- setup - This provides some basic, general edit functionality. It is a series of plugins.
- keymap.of(editorKeymap) - This maps keys to editor commands
- AppFunctionsFacet.of(tabFunctions) - This facet stores functions for the editor to interact with the application.
- IdFacet.of(tabState.id) - This facet stores the document ID for the document being edited.
- repdoc() - This plugin provides the apogee functionality. It should probably be called apogee.
- javascript() - This is javascript language support for the editor.
- docchangedextension() - This extension provides the interface for the editor to call application functions as needed.
- oneDark - This is a CSS theme. It styles, mainly colors, the editor and code highlights as well as apogee specific elements.

Potential Modifications:

- Rename the component to apogee. This was copied over from argonaut/repdoc.
- I can probably clean up the setup. That is mostly the default for codemirror with a few changes. I should customize
it more to get rid of extra stuff.


##### Repdoc Extension

This extension gives the editor the apogee functionality. It is complsed of the following extensions

Extensions:

- repdocBaseTheme - This is a base theme for some apogee specific elements
- repdocState - This is the main state element for the editor
- repdocLint - This is a linter for the javascript code

### Session

This is the (TEMPORARY) name for the code that controls the running code state for an editor sesssion.
The project has a single model object. (LATER MULTIPLE SESSIONS CAN BE IN A SINGLE MODEL.) 
The model holds that value of each varaible defined
in the code. As the code is updated, the value of the varaibles is also updated, keeping the values
up to date, similar to how cell values are automatically calculated in a spreadsheet.

The session interacts with the editor in the following ways:

- When a main document (code file) is created, a new session is created for that main document.
- The session takes commands to modify the model. For example, if the code is changed to update the definition
of a variable, this new definition is sent into the model  with a command.
- The editor subscribes to events from the model for updates.

#### Sessions and Documents

- We want a single session to apply to multiple documents.
    - I guess we can to this with a project config file (sort of a packgae.json equivelent?) 
        - This can tell which files are "top level" documents.
        - Maybe for starters I allow just one per session.
        - And if needed hard code it to a name like index.jsr? But I should be able to do a config file.
- Maybe we have a docSessionId, which could possibly match the doc ID for the main document in the session.

     
