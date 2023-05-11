import * as React from "react"
import { renderAppElement, displayLoadingScreen, initUi } from "./appframe/appUi"
import { DocSession, DocSessionUpdate, TabState, AppFunctions } from "./appTypes"
import { getEditor, getEditorText, destroyEditor } from "./editor/editor"
import { sessionOutputToEditorView } from "./editor/sessionToEditor"
import { addEventListener, EventPayload,SessionOutputEvent} from "./session/sessionApi"


//start app
initUi()
displayLoadingScreen()

//addEventListener("initComplete",onInitComplete)
addEventListener("sessionOutput",onSessionOutput)

// dummy init =================================
setTimeout(onInitComplete,2000)
//=============================================

//===================================
// Types
//===================================
interface OpenFileData {
    data?: string
    filePath?: string
    fileName: string
    fileExtension: string
}

interface SaveFileData {
    filePath: string
    fileName: string
    fileExtension: string
}

//=============================================
// app state 
//=============================================

let activeSessionId: string | null = null
let docSessions: Record<string,DocSession> = {}

function onInitComplete(eventName: string, data: any) {
    console.log("$$$$$$$$$$$$$$$$$$$$$$$$$$$$ INIT COMPLETE")
    console.log("Init complete!")

    //END LOAD SCREEN AND ALLOW USER TO START (or something like that)
    renderApp()
}

function onSessionOutput(eventName: string, data: EventPayload) {
    let sessionOutputEvents = (data as SessionOutputEvent[])
    if(sessionOutputEvents.length > 0) {
        //I SHOULD WRITE ALL THIS DIFFERENTLY WHEN I CAN REFACTOR THE SESSION OUTPUT FOR MULTI SESSIONS
        let docSessionId = sessionOutputEvents[0].session
        if(docSessionId !== null) {
            let docSession = docSessions[docSessionId]
            let editor = docSession.editor
            if(editor !== null) {
                sessionOutputToEditorView(editor, data)
            }
            else {
                console.log("Session event for session with null editor")
            }
        }
        else {
            console.log("Session ID missing for session event")
        }
    }
}

function onDocChanged(docSessionId: string) {
    let docSession = docSessions[docSessionId]
    if(docSession !== undefined) {
        if(!docSession.isDirty) {
            updateDocSession(docSession, {isDirty:true})
        }
    }
}

function updateDocSession(oldDocSession: DocSession, docSessionUpdate: DocSessionUpdate) {
    let newDocSession = Object.assign({}, oldDocSession)
    let updated = false
    //typescript didn't want me to do this
    // for(let key in docSessionUpdate) {
    //     if(docSessionUpdate[key] !== oldDocSession[key]) {
    //         oldDOcSession[key] = docSessionUpdate[key]
    //         updated = true
    //     }
    // }
    if(docSessionUpdate.filePath !== undefined && docSessionUpdate.filePath != oldDocSession.filePath) {
        newDocSession.filePath = docSessionUpdate.filePath
        updated = true
    }
    if(docSessionUpdate.fileName !== undefined && docSessionUpdate.fileName !== oldDocSession.fileName) {
        newDocSession.fileName = docSessionUpdate.fileName
        updated = true
    }
    if(docSessionUpdate.fileExtension !== undefined && docSessionUpdate.fileExtension !== oldDocSession.fileExtension) {
        newDocSession.fileExtension = docSessionUpdate.fileExtension
        updated = true
    }
    if(docSessionUpdate.isDirty !== undefined && docSessionUpdate.isDirty !== oldDocSession.isDirty) {
        newDocSession.isDirty = docSessionUpdate.isDirty
        updated = true
    }
    if(docSessionUpdate.lastSavedText !== undefined && docSessionUpdate.lastSavedText !== oldDocSession.lastSavedText) {
        newDocSession.lastSavedText = docSessionUpdate.lastSavedText
        updated = true
    }

    if(updated) {
        docSessions[newDocSession.id] = newDocSession
        renderApp()
    }
}

//==============================================
// actions
//==============================================

function startDocSession(fileData: OpenFileData) {
    const id = "ds" + getNewInt()
    let docSession: DocSession =  {
        id: id,
        lastSavedText: (fileData.data !== undefined) ? fileData.data : undefined,
        filePath: (fileData.filePath !== undefined) ? fileData.filePath : undefined,
        fileName: fileData.fileName,
        fileExtension: fileData.fileExtension, 
        isDirty: false,
        editor: null
    }
    docSessions[id] = docSession
    activeSessionId = id
    renderApp()
}

function closeDocSession(id: string) {
    if(docSessions[id] !== undefined) {
        let docSession = docSessions[id]
        
        if(docSession.isDirty) {
            window.dialogApi.messageDialog("The file has not been saved.","warning",["Save and Close","Close without Saving","Cancel"],0,2).then(selection => {
                switch(selection) {
                    case 0: //save and close
                        saveFile(id).then(saveSuccess => {
                            if(saveSuccess === true) {
                                closeDocSessionImpl(docSession)
                            }
                        }) 

                    case 1: //close
                        closeDocSessionImpl(docSession)


                    case 2:
                    default: //cancel/no action
                        return
                }
            })
        }
        else {
            closeDocSessionImpl(docSession)
        }
    }
    else {
        console.log("Doc Session ID not found: " + id)
    }
}

function closeDocSessionImpl(docSession: DocSession) {
    let id = docSession.id    

    docSession.editor = null  //we already do this, but do it again, I guess 

    delete docSessions[id]
    //-- DO DELETE HERE --

    if(activeSessionId == id) {
        //clumsy way of reading first key - clean this up
        let firstKey: string | null = null
        for(let key in docSessions) {
            firstKey = key
            break
        }
        activeSessionId = firstKey
    }
    renderApp()
}

function selectDocSession(id: string) {
    if(docSessions[id] !== undefined) {
        activeSessionId = id
        renderApp()
    }
    else {
        console.log("Doc Session ID not found: " + id)
    }
}

function newFile() {
    //for now make it a .R extension
    let fileExtension = "R"
    startDocSession({fileName: createFileName(fileExtension), fileExtension})
}

function openFile() {
    return window.openSaveApi.openFile().then( (fileData: OpenFileData | null) => { 
        if(fileData !== null) {
            let docSessionId = lookupSessionIdForFilePath(fileData.filePath!)
            if(docSessionId !== null) {
                //IMPROVE HANDLING OF TWO WINDOWS OPENED
                const msg = "The file is already opened. The existing opened version will be used."
                window.dialogApi.alertDialog(msg,"info")
                selectDocSession(docSessionId)
            }
            else {
                startDocSession(fileData)
            }
            return true
        } 
        else {
            return false
        }
    }).catch(err => {
        window.dialogApi.errorDialog("Error opening the file!" + String(err))
        return false
    })
}

function saveFileAs(sessionId: string | null = activeSessionId) {
    return saveFile(sessionId, true)
}

function saveFile(sessionId: string | null = activeSessionId, doSaveAs: boolean = false) {
    if(sessionId === null) {
        console.log("Save attempted with no session set")
        return Promise.resolve(false)
    }
    let docSession = docSessions[sessionId]
    if(docSession === undefined) {
        console.log("Session object not found for save")
        return Promise.resolve(false)
    }

    if(docSession.editor === null) {
        console.log("Editor not set for this doc session!")
        return Promise.resolve(false)
    }

    const data = getEditorText(docSession.editor)
    let savePromise = (doSaveAs || docSession.filePath === undefined) ? 
        window.openSaveApi.saveFileAs(data,docSession.filePath) :
        window.openSaveApi.saveFile(data,docSession.filePath!)

    return savePromise.then( (fileData: SaveFileData | null) => { 
        if(fileData !== null) {
            let otherDocSessionId = lookupSessionIdForFilePath(fileData.filePath!,docSession.id)
            if(otherDocSessionId !== null) {
                //IMPORVE HANDLING OF TWO WINDOWS OPENED
                const msg = "The file was saved in the same location as another file opened in the editor. The editor does not enforce these files match and saving one will overwrite the other."
                window.dialogApi.alertDialog(msg,"warning")
            }

            updateDocSession(docSession, {
                filePath: fileData.filePath,
                fileName: fileData.fileName,
                fileExtension: fileData.fileExtension,
                isDirty:false,
                lastSavedText:data
            })

            return true
        } 
        else {
            return false
        }
    }).catch(err => {
        window.dialogApi.errorDialog("Error saving file: " + err.toString())
        return false
    })
  
}

function quitApp() {
    //use the normal close dirty check triggered below
    window.close()
}

//==============================================
// Utilities
//==============================================

let nextIntVal = 1
function getNewInt() {
    return nextIntVal++
}

let nextFileIntValue = 1
function getNewFileInt() {
    return nextFileIntValue++
}

function createFileName(fileExtension: string) {
    return `untitled${getNewFileInt()}.${fileExtension}`
}

/** This function checks the currently opend doc sessions to see if the given file path is already opened.
 * It returns the docSessionId or null. */
function lookupSessionIdForFilePath(filePath: string, excludedId?: string) {
    for(let docSessionId in docSessions) {
        if(docSessionId !== excludedId && docSessions[docSessionId].filePath == filePath) return docSessionId
    }
    return null
}

function getIsDirty() {
    for(let docSessionId in docSessions) {
        if(docSessions[docSessionId].isDirty) return true
    }
    return false
}

//==============================================
// UI
//==============================================

/** This is the lookup function to retrieve a tab element for a given tab state. */
function getTabElement(tabState: TabState, tabFunctions: AppFunctions) {
    return <EditorFrame tabState={tabState} tabFunctions={tabFunctions} />
}

/** This generates an editor tab object. */
function EditorFrame({tabState, tabFunctions}:{tabState: TabState, tabFunctions: AppFunctions}) {
    let tabRef = React.useRef<HTMLDivElement>(null)
    React.useEffect(() => {
        //create editor - (non-react element)
        let element = tabRef.current
        let docSession = docSessions[tabState.id]
        if(element !== null && docSession !== undefined) {
            const data = docSession!.lastSavedText !== undefined ? docSession.lastSavedText! : ''
            docSession.editor = getEditor(tabState,tabFunctions,data,element)
            //destroy
            return () => {
                if(docSession.editor) {
                    destroyEditor(docSession.editor)
                    docSession.editor = null
                }
            }
        }
        else {
            console.log("Error - ref element not found or doc state not found!")

        }
    },[])
    return <div className="app-editor-container" ref={tabRef}></div>
}

function renderApp() {
    renderAppElement(docSessions,activeSessionId,getMenuList(),tabFunctions)
}

//we should improve the menu logic when we add more functionality
function getMenuList() {
    if(activeSessionId !== null) {
        const docSession = docSessions[activeSessionId]
        if(docSession !== undefined) {
            if(docSession.isDirty && (docSession.filePath !== undefined) ) return menuListSave
            else return menuListSaveAs
        }
    }
    return menuListNoSave
}

//---------------------
// other state objects to pass into app element
//---------------------

//I should make the contents dynamic, depending on active file
let menuListSave = [{
    text: "File",
    items: [
        { text: "New", action: newFile },
        { text: "Open", action: openFile },
        { text: "Save", action: saveFile },
        { text: "Save As", action: saveFileAs },
        { text: "Quit", action: quitApp }
    ]
}]

let menuListSaveAs = [{
    text: "File",
    items: [
        { text: "New", action: newFile },
        { text: "Open", action: openFile },
        { text: "Save As", action: saveFileAs },
        { text: "Quit", action: quitApp }
    ]
}]

let menuListNoSave = [{
    text: "File",
    items: [
        { text: "New", action: newFile },
        { text: "Open", action: openFile },
        { text: "Quit", action: quitApp }
    ]
}]

const tabFunctions: AppFunctions = {
    selectTab: selectDocSession,
    closeTab: closeDocSession,
    getTabElement: getTabElement,
    saveFile: saveFile,
    onDocChanged: onDocChanged
}

//=========================
// Is dirty check for closing app
//=========================

window.onbeforeunload = (e) => {
    if(getIsDirty()) {
        window.dialogApi.okCancelDialog("There is unsaved data. Are you sure you want to exit?","warning","Exit","Stay").then( doExit => {
            if(doExit) {
                window.forceCloseBrowserWindow()
            }
        })
        e.returnValue = true //prevent close
    }
    else {
        //allow close
    }
}








