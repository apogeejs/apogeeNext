import type { EditorState } from '@codemirror/state'
import {CodeCommand,evaluateSessionCmds } from "../../session/sessionApi"
import { CellInfo, FieldInfo, cellInfoNeedsCreate, isCodeDirty, updateCellInfoForInputVersion, updateCellInfoForCommand }  from "./CellInfo"

//--------------------------
// Issue Session Commands
//--------------------------

/** This method issues any needed session commands from the current state. */
export function issueSessionCommands(docSessionId: string, editorState: EditorState, activeCellInfos: CellInfo[], cellInfosToDelete: CellInfo[], docVersion: number, nonCommandIndex: number) {
    let commands:CodeCommand[] = []
    let updatedCellInfos: CellInfo[] = []

    //send all the delete commands if there are any
    cellInfosToDelete.forEach(cellInfo => {
        commands.push(createDeleteAction(cellInfo.fieldInfo)) 
    })     

    //send create/update commands for any cell with code dirty beneat the non-command index
    //for(let index = 0; index < nonCommandIndex; index++) {
    let cellCommandCreated = false
    activeCellInfos.forEach( (cellInfo,index) => {
        if( isCodeDirty(cellInfo) && index < nonCommandIndex ) {
            let {newCellInfo,command} = createAddUpdateAction(editorState,cellInfo,index,docVersion)
            updatedCellInfos.push(newCellInfo)
            commands.push(command) 
            cellCommandCreated = true
        }
        else if(cellCommandCreated) {
            updatedCellInfos.push(updateCellInfoForInputVersion(editorState,cellInfo,docVersion))
        }
        else {
            updatedCellInfos.push(cellInfo)
        }
    })

    //send commands
    if(commands.length > 0) {
        sendCommands(docSessionId,commands,docVersion)
    }

    //return modified cell infos
    return updatedCellInfos
}

/** This function creates a delete command object. */
function createDeleteAction(fieldInfo: FieldInfo) {
    //console.log("Delete command: id = " + cellInfo.id)
    let command: CodeCommand = {
        type:"delete",
        lineId: fieldInfo.id
    }
    return command
}

/** This function creates an add or update command for the cell Info and returns
 * the updated cell infos associated with sending the command. */
function createAddUpdateAction(editorState: EditorState, cellInfo: CellInfo, zeroBasedIndex: number, docVersion: number) {
    let command: CodeCommand = {
        type: "",
        lineId: cellInfo.fieldInfo.id,
        code: cellInfo.fieldInfo.docCode
        
    }
    if(cellInfoNeedsCreate(cellInfo)) {
        command.type = "add"
        command.after = zeroBasedIndex //NOTE: the after value is 1-based index - 1, which is just the zero based index
    }
    else {
        command.type = "update"
    }

    let newCellInfo: CellInfo = updateCellInfoForCommand(editorState,cellInfo,docVersion)

    return {command,newCellInfo}
}

/** This function sends a list of commands. */
function sendCommands(docSessionId: string, commands: CodeCommand[],docVersion: number) {
    //console.log("Commands to send:")
    //console.log(JSON.stringify(commands))
    evaluateSessionCmds(docSessionId,commands,docVersion)
}

