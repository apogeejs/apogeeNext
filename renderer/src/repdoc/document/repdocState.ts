/** This file holds the repdocState extension, which manages the repdoc State, bridging the editor with the R session.  */

import {syntaxTree} from "@codemirror/language"
import {EditorView} from "@codemirror/view"
import type { EditorState, Transaction, ChangeSet, Text } from '@codemirror/state'
import { StateField, StateEffect } from '@codemirror/state'
import {SessionOutputEvent,setMaxEvalLine1,PRE_LINE_ID} from "../../session/sessionApi"
import { isEmptyCell } from "../nodeUtils"
import { DocState, createDocState } from "./docState"
import { CellInfo, updateCellInfoDisplay, cellInfoNeedsCreate, isCodeDirty, getCellInfoByIndex, getCUIFrom, getCUICodeText }  from "./CellInfo"
import { FieldData, FieldInfo, FieldUpdateInfo, FieldAction, getFieldUpdateInfo }  from "./FieldInfo"
import { CellUpdateInfo, Action, actionIsAnEdit, createCellInfos, canDelete } from "./CellInfo"
import { issueSessionCommands } from "./sessionCommands"
import { sessionOutputEffect } from "../../editor/sessionToEditor"
import { getSessionId } from "../../editor/editorConfig"
import { SyntaxNode } from "@lezer/common"


//===============================
// Repdoc Codemirror Extension
//===============================

export const repdocState = StateField.define<DocState>({
    create(editorState) {
        return processDocChanges(editorState)
    },

    update(docState, transaction) {
        if(transaction.effects.length > 0) {
            docState = processSessionMessages(transaction,docState)
        }
        return processDocChanges(transaction.state,transaction,docState)
    },

    provide(docState) {
        return EditorView.decorations.from(docState, docState => docState.decorations)
    },
})

export function getDocState(editorState: EditorState) {
    return editorState.field(repdocState)
}

//===================================
// Data Structures
//===================================

// type PreparseError = {
//     from: number,
//     to: number,
//     msg: string
// }

type ParseErrorInfo = {
    //errors: PreparseError[],
    hasError: boolean
}

const INITIAL_DOCUMENT_VERSION = 1

const INVALID_CELL_INDEX = -1
const INVALID_LINE_NUMBER = -1 //line number is 1 based

//===================================
// Internal Functions
//===================================


//--------------------------
// Process Session Messages
//--------------------------

/** This function processes messages from the R session, which are passed in as transaction effects. 
 * It returns an updated docState. */
function processSessionMessages(transaction: Transaction, docState: DocState) {

    let effects: readonly StateEffect<any>[] = transaction.effects

    for(let i1 = 0; i1 < effects.length; i1++) {
        let effect = effects[i1]
        if(effect.is(sessionOutputEffect)) { 
            let newCellInfos = docState.cellInfos.concat()

            for(let i2 = 0; i2 < effect.value.length; i2++) {
                //we are doing only one session for now
                let sessionOutputEventData = effect.value[i2] as SessionOutputEvent
                if(sessionOutputEventData.lineId !== null) {
                    if(sessionOutputEventData.lineId == PRE_LINE_ID) {
                        //special case - initialization of document
                        newCellInfos = docState.cellInfos
                    }
                    else {
                        let index = getCellInfoByIndex(sessionOutputEventData.lineId,newCellInfos)
                        if(index >= 0) {
                            newCellInfos[index] = updateCellInfoDisplay(transaction.state,newCellInfos[index], sessionOutputEventData.data)
                        }
                        else {
                            console.error("Session output received but line number not found: " + JSON.stringify(sessionOutputEventData))
                        }
                    }
                }
                else {
                    //figure out where we want to print this
                    printNonLineOutput(sessionOutputEventData)
                }
            }

            docState = createDocState(newCellInfos,{},docState.docVersion,docState.parseTreeCurrent,docState.hasParseErrors)
        }
    }

    return docState
}

//fix the type here
function printNonLineOutput(sessionOutputEventData: SessionOutputEvent) {
    //PRINT THIS!!!
}

//--------------------------
// Process Document Changes
//--------------------------


/** This method processes changes from the editor, returning an updated doc state. */
function processDocChanges(editorState: EditorState, transaction: Transaction | undefined = undefined, docState: DocState | undefined = undefined) {
    let docSessionId = getSessionId(editorState)
    let doParseTreeProcess = getProcessParseTree(editorState, transaction, docState) 
    if( (transaction && transaction.docChanged) || doParseTreeProcess ) {
        let docVersion = (docState !== undefined) ? docState.docVersion + 1 : INITIAL_DOCUMENT_VERSION
        let {cellUpdateInfos,cellsToDelete,hasParseErrors,nonCommandIndex,parseTreeUsed} = getCellUpdateInfo(editorState,transaction,docState,doParseTreeProcess)
        let cellInfos = createCellInfos(editorState,cellUpdateInfos,docVersion)
        setMaxEvalLine1(docSessionId,nonCommandIndex) //note - argument here equals to the last commandIndex - 1, but it is also 1-based rather than 0-based
        if( nonCommandIndex > 0 || cellsToDelete!.length > 0 ) {
            cellInfos = issueSessionCommands(docSessionId, editorState,cellInfos,cellsToDelete,docVersion,nonCommandIndex)
        }
        return createDocState(cellInfos,{},docVersion,parseTreeUsed,hasParseErrors)
    }
    else {
        if(docState === undefined) throw new Error("Unexpected: doc state misssing") //this shouldn't happen
        if(docState.hasDirtyCells && !docState.hasParseErrors) {
            //CLEAN THIS UP!!! (lots of repeated code)
            let activeLine = editorState.doc.lineAt(editorState.selection.main.head).number
            let activeCellIndex = docState.cellInfos.findIndex( cellInfo => cellInfo.fromLine >= activeLine && cellInfo.toLine <= activeLine )
            let activeCellInfo = docState.cellInfos[activeCellIndex]
            let nonCommandIndex = (activeCellInfo === undefined || activeCellInfo!.status != "code dirty") ? docState.cellInfos.length : 
                (activeCellInfo.docCode === "") ? activeCellIndex : 0
            setMaxEvalLine1(docSessionId, nonCommandIndex) 
            let docVersion = (docState !== undefined) ? docState.docVersion + 1 : INITIAL_DOCUMENT_VERSION
            let cellInfos = issueSessionCommands(docSessionId, editorState,docState.cellInfos,[],docVersion,nonCommandIndex)
            docState = createDocState(cellInfos,{},docVersion,docState.parseTreeCurrent,docState.hasParseErrors) 
        }
        return docState!
    }
}

function getCellUpdateInfo(editorState: EditorState, 
                            transaction: Transaction | undefined = undefined, 
                            docState: DocState | undefined = undefined,
                            doParseTreeProcess: boolean) {

    let {oldCellUpdateInfos, oldCellsToDelete} = propagateOldCells(editorState, transaction!, docState)
    let oldHasParseError = docState !== undefined ? docState!.hasParseErrors : false
    
    if(doParseTreeProcess) {
        let {newCellUpdateInfos, newCellsToDelete, parseErrorInfo, newActiveEditIndex, newActiveEditType} = 
            parseNewCells(editorState, docState, oldCellUpdateInfos)

        let fallbackDataPresent = docState !== undefined
        return mergeCellUpdateInfos(newCellUpdateInfos,newCellsToDelete,parseErrorInfo,
                                    oldCellUpdateInfos,oldCellsToDelete,oldHasParseError,
                                    fallbackDataPresent, newActiveEditIndex, newActiveEditType)
    }
    else {
        //use old parse info
        return {
            cellUpdateInfos: oldCellUpdateInfos,
            cellsToDelete: oldCellsToDelete,
            hasParseErrors: oldHasParseError,
            nonCommandIndex: 0, //send no commands
            parseTreeUsed: false
        }
    } 

}

function mergeCellUpdateInfos(newCellUpdateInfos: CellUpdateInfo[], newCellsToDelete: CellInfo[], parseErrorInfo: ParseErrorInfo,
                            oldCellUpdateInfos: CellUpdateInfo[], oldCellsToDelete: CellInfo[], oldHasParseError: boolean,
                            fallbackDataPresent: boolean, newActiveEditIndex: number, newActiveEditType: string) {

    //ASSUME old data present == fallbackDataPresent
    
    //if there is no fallback info, use all the parse tree data
    if( !fallbackDataPresent ) {
        return {
            cellUpdateInfos: newCellUpdateInfos,
            cellsToDelete: newCellsToDelete,
            hasParseErrors: parseErrorInfo.hasError,
            nonCommandIndex: newCellUpdateInfos!.length, //for now send them all - we probably want to change this
            parseTreeUsed: true
        }
    }

    //we will not use parse info if there are any parse errors, since this can blow up the tree
    if( parseErrorInfo.hasError === true) {
        return {
            cellUpdateInfos: oldCellUpdateInfos,
            cellsToDelete: oldCellsToDelete,
            hasParseErrors: true,
            nonCommandIndex: 0, //send no commands
            parseTreeUsed: false
        }
    }

    //no active edit - use all the parsed data
    if( newActiveEditIndex == INVALID_CELL_INDEX ) {
        return {
            cellUpdateInfos: newCellUpdateInfos!,
            cellsToDelete: newCellsToDelete!,
            hasParseErrors: parseErrorInfo.hasError,
            nonCommandIndex: newCellUpdateInfos!.length, //for now send them all - TBR
            parseTreeUsed: true
        }
    }

    //!!! UPDATE THIS
    //active edit, with an empty cell active - use up to that cell!!!
    if(isEmptyCell(newActiveEditType)) {
        //UPDATE THIS! go only up to the edit type cell!
        return {
            cellUpdateInfos: newCellUpdateInfos,
            cellsToDelete: newCellsToDelete,
            hasParseErrors: parseErrorInfo.hasError,
            nonCommandIndex: newActiveEditIndex,
            parseTreeUsed: true
        }
    }

    // edit in process (without empty cell) or no new parse info
    return {
        cellUpdateInfos: oldCellUpdateInfos,
        cellsToDelete: oldCellsToDelete,
        hasParseErrors: oldHasParseError,
        nonCommandIndex: 0, //send no commands
        parseTreeUsed: false
    }
}


/** This function decides if we want to use the parse tree, or propogate the old cells ourselves. */
function getProcessParseTree(editorState: EditorState, transaction: Transaction | undefined = undefined, docState: DocState | undefined = undefined) {
    
    if(docState === undefined) {
        //if this is the first pass, use the parse tree
        return true
    }

    if(transaction && transaction.docChanged) {
        //if there are new edits
        //use the parse tree if we are in an empty cell created by adding (rather than deleting)
        //(I think this logic assumes there is on edit included here, to get the result intended)
        if(textAdded(transaction.changes)) { 
            let activeLineObject = editorState.doc.lineAt(editorState.selection.main.head)
            return (activeLineObject.text.trim() == "")
        }
        else return false
    }
    else {
        //if there are no new edits
        //use the parse tree if the document is not current
        //and there is no active edit
        if( !docState.parseTreeCurrent ) {
            let activeLine = editorState.doc.lineAt(editorState.selection.main.head).number
            let activeCellInfo = docState.cellInfos.find( cellInfo => cellInfo.fromLine >= activeLine && cellInfo.toLine <= activeLine )
            return activeCellInfo === undefined || !isCodeDirty(activeCellInfo)
        }
        else return false
    }
}

/** This fucntion returns true if the changes set adds text, rather than just deletes. */
function textAdded(changes: ChangeSet) {
    let textAdded = false
    changes.iterChanges( (oldFrom,oldT,newFrom,newTo,text) => { if(text.length > 0) textAdded = true })
    return textAdded
}

/** This function gets update data for the cells from the previous doc state based on text changes. It
 * does not use the new parse tree. */
function propagateOldCells(editorState: EditorState, transaction: Transaction, docState?: DocState) {
    let cellUpdateInfos: CellUpdateInfo[] = []
    let cellsToDelete: CellInfo[] = []

    let docText = editorState.doc

    //get the update info for each cell
    if(docState !== undefined) {
        if(transaction.docChanged) {
            let changes = transaction.changes
            let prevUpdateInfo: CellUpdateInfo | undefined
            docState.cellInfos.forEach( (cellInfo, index) => {
                let remappedFrom = changes.mapPos(cellInfo.from,-1)
                let newFromLineObject = docText.lineAt(remappedFrom)
                let newFromLine = newFromLineObject.number
                let newFrom = newFromLineObject.from

                let remappedTo = changes.mapPos(cellInfo.to,1)
                let newToLineObject = docText.lineAt(remappedTo)
                let newToLine = newToLineObject.number  
                let newTo = newToLineObject.to

                let codeText = docText.sliceString(newFrom,newTo).trim()

                let fieldInfoIds = cellInfo.fieldInfoIds

                let updateInfo: CellUpdateInfo | undefined
                if(codeText !== cellInfo.docCode) {
                    //update
                    updateInfo = {action: Action.update, cellInfo, newFrom, newFromLine, newTo, newToLine, codeText, fieldInfoIds}
                }
                else if(newFrom == cellInfo.from && newTo == cellInfo.to && newFromLine == cellInfo.fromLine && newToLine == cellInfo.toLine) {
                    //reuse
                    updateInfo = {action: Action.reuse, cellInfo, newFromLine, newToLine, fieldInfoIds}
                }
                else {
                    //remap
                    updateInfo = {action: Action.remap, cellInfo, newFrom, newFromLine, newTo, newToLine, fieldInfoIds}
                }

                //compare to previous update info!!!
                if(prevUpdateInfo !== undefined) {
                    if(updateInfo.newFromLine = prevUpdateInfo.newToLine + 1) {
                        //no overlap or gap
                        cellUpdateInfos.push(prevUpdateInfo)
                    }
                    else if(updateInfo.newFromLine > prevUpdateInfo.newToLine + 1) {
                        //add gap!
                        cellUpdateInfos.push(prevUpdateInfo)
                        let newFromLine = prevUpdateInfo.newToLine + 1
                        let newToLine = updateInfo.newFromLine - 1
                        let newFrom = docText.line(newFromLine).from
                        let newTo = docText.line(newToLine).to
                        let gapUpdateInfo = {
                            action: Action.create, 
                            newFrom,
                            newFromLine,
                            newTo,
                            newToLine,
                            codeText: docText.sliceString(newFrom,newTo).trim(),
                            fieldInfoIds: []
                        }
                        cellUpdateInfos.push(gapUpdateInfo)
                    }
                    else {
                        /////////////////////////////////////////////////////////////
                        //overlap - merge into one update info
                        //////////////////////////////////////////////////////////////
                        if(updateInfo.newFromLine != prevUpdateInfo.newFromLine) {
                            updateInfo.newFrom = prevUpdateInfo.newFrom
                            updateInfo.newFromLine = prevUpdateInfo.newFromLine
                            updateInfo.codeText = docText.sliceString(newFrom,newTo).trim()
                        }
                        updateInfo.fieldInfoIds = prevUpdateInfo.fieldInfoIds.concat(updateInfo.fieldInfoIds)

                        if(prevUpdateInfo.cellInfo !== undefined) cellsToDelete.push(prevUpdateInfo.cellInfo)
                    }
                }

                //update prev
                prevUpdateInfo = updateInfo
            })

            //check for end gap!!!
            if(prevUpdateInfo !== undefined) {
                cellUpdateInfos.push(prevUpdateInfo)
                if(prevUpdateInfo.newToLine < docText.lines) {
                    //add end gap
                    let newFromLine = prevUpdateInfo.newToLine + 1
                    let newToLine = docText.lines
                    let newFrom = docText.line(newFromLine).from
                    let newTo = docText.line(newToLine).to
                    let gapUpdateInfo = {
                        action: Action.create, 
                        newFrom,
                        newFromLine,
                        newTo,
                        newToLine,
                        codeText: docText.sliceString(newFrom,newTo).trim(),
                        fieldInfoIds: []
                    }
                    cellUpdateInfos.push(gapUpdateInfo)
                }
            }
        }
        else {
            //if we have no changes return "reuse" cell update infos
            cellUpdateInfos.push(...docState!.cellInfos.map( cellInfo => { return {
                action: Action.reuse, 
                cellInfo,
                newFromLine: cellInfo.fromLine,
                newToLine: cellInfo.toLine,
                fieldInfoIds: cellInfo.fieldInfoIds
            } })) 
        }
    }

    return {
        oldCellUpdateInfos: cellUpdateInfos, 
        oldCellsToDelete: cellsToDelete
    }
}

/** This function creates new cells based on the updatede document parse tree. */
function parseNewCells(editorState: EditorState, 
    oldDocState: DocState | undefined = undefined, 
    propCellUpdateInfos: CellUpdateInfo[]) {
    
    //these are the output cell infos
    const newCellUpdateInfos: CellUpdateInfo[] = []
    const oldFieldInfoMap = oldDocState !== undefined ? oldDocState.fieldInfoMap : {}
    let fieldUpdateInfoMap: Record<string,FieldUpdateInfo> = {}

    //we use these variables to progress through the cell update info as we process the new parse tree.
    let currentPropIndex = 0
    let propCellUpdateInfo: CellUpdateInfo | undefined = undefined
    let currentPropFromLine = 0
    let propCellUsed = Array(propCellUpdateInfos.length).fill(false)

    let prevToLine = 0 //one less than first line
    let prevToPos = -1 //one less than first pos
    let prevCellUpdateInfo: CellUpdateInfo | null = null

    //record if there is a parse error
    let parseErrorInfo: ParseErrorInfo = {
        //errors: [],
        hasError: false
    }

    //this is the index of a cell that is actively being edited
    let activeCellIndex = INVALID_CELL_INDEX
    let activeCellType = "" //TEMPORARY - while we work on emtpy cell detection


    //used to read line nubers from positions
    let docText = editorState.doc

    let selectionLine = docText.lineAt(editorState.selection.main.head).number

    //walk through the new parse tree
    //and craete new cell infos

    let state = "OUTSIDE"
    let level = 0
    syntaxTree(editorState).iterate({
        enter: (node) => {
            level += 1
            //console.log("Entering node " + node.name)

            //once we reach a parse error, stop processing the tree
            //if( parseErrorInfo.hasError ) return
            if(state == "error") return false

            switch(node.name) {

                case "Script": {
                    state = "script"
                    console.log("script entered")
                    break
                }

                case "\u26A0": {
                    console.log("Parse Error!")
                    state = "error"
                    parseErrorInfo.hasError = true
                    //below is commented out in repdoc
                    //let e = {from: node.from, to: node.to, msg: "Preparse error"}
                    //parseErrorInfo.errors.push(e)
                    return false;
                }

                default: {
                    if(state == "script") {
                        state = "statement"
                        console.log("top level statement entered: " + node.type.name)
                        ///////////////////////////////////////////////////////////////////////////////////////////////////////////////
                        {
                            //get the parameters for the current new cell
                            let startLine = docText.lineAt(node.from)
                            let endLine = docText.lineAt(node.to)
                            
                            let fromPos = startLine.from
                            let toPos = endLine.to
                            let fromLine = startLine.number
                            let toLine = endLine.number
                            let newCellUpdateInfo: CellUpdateInfo | undefined 

                            if(fromLine > prevToLine + 1) {
                                // add a gap cell, with no fields
                                let gapFrom = prevToPos + 1
                                let gapFromLine = prevToLine + 1
                                let gapTo = fromPos - 1
                                let gapToLine = fromLine - 1
                                let gapCodeText = docText.sliceString(gapFrom,gapTo).trim()

                                let gapCellUpdateInfo = createCellUpdateInfo(gapFrom,gapFromLine,gapTo,gapToLine,gapCodeText,
                                    propCellUpdateInfos)

                                newCellUpdateInfos.push(gapCellUpdateInfo)
                            }

                            if(fromLine <= prevToLine && prevCellUpdateInfo !== null) {
                                //merge in with previous cell
                                let mergeFrom = getCUIFrom(prevCellUpdateInfo)
                                let mergeFromLine = prevCellUpdateInfo.newFromLine
                                let mergeTo = toPos
                                let mergeToLine = toLine
                                let mergeCodeText = docText.sliceString(mergeFrom,mergeTo).trim()

                                newCellUpdateInfo = createCellUpdateInfo(mergeFrom,mergeFromLine,mergeTo,mergeToLine,mergeCodeText,
                                    propCellUpdateInfos,prevCellUpdateInfo.fieldInfoIds)

                            }
                            else {
                                //create new cell
                                let codeText = editorState.doc.sliceString(fromPos,toPos).trim()
                                newCellUpdateInfo = createCellUpdateInfo(fromPos,fromLine,toPos,toLine,codeText,
                                    propCellUpdateInfos)
                            }

                            // // add fields for cell update info
                            // if(newCellUpdateInfo.action == Action.reuse || newCellUpdateInfo.action == Action.remap) {
                            //     //no change to fields!
                            // }
                            // else {
                            //     //analyze for field change
                            //     let fieldData = processStatementNode(node.node, docText)

                            //     if(fieldData.valid) {
                            //         if(fieldUpdateInfoMap[fieldData.fieldName] !== undefined) {
                            //             //name already exists!
                            //             throw new Error("Repeat name in field creation not handled!!!")
                            //         }
                            //         else {
                            //             let oldFieldInfo = oldFieldInfoMap[fieldData.fieldName]
                            //             if(oldFieldInfo !== undefined) {
                            //                 let fieldUpdateInfo = getFieldUpdateInfo(oldFieldInfo,fieldData)
                            //                 fieldUpdateInfoMap[fieldData.fieldName] = fieldUpdateInfo

                            //                 newCellUpdateInfo.fieldInfoIds.push(oldFieldInfo.id)
                            //             }
                            //             else {
                            //                 //for now no rename handling!!!

                            //                 //create new field info
                            //                 let newFieldId = 'ADD THIS!!'
                            //                 let fieldUpdateInfo = {
                            //                     action: FieldAction.create,
                            //                     id: newFieldId,
                            //                     fieldData
                            //                 }
                            //                 fieldUpdateInfoMap[fieldData.fieldName] = fieldUpdateInfo

                            //                 newCellUpdateInfo.fieldInfoIds.push(newFieldId)
                            //             }
                            //         }
                            //     }
                            //     else {
                            //         //DOH!!! What do I do when invalid?
                            //         //I DON'T OAVE THIS WORKED OUT RIGHT
                            //     }

                                
                            //     //apply

                            // }
                            
                            //add code to track deletes for cell and field


                            prevToLine = toLine
                            prevToPos = toPos
                            prevCellUpdateInfo = newCellUpdateInfo!

                        }
                        /////////////////////////////////////////////////////////////////////////////////////////////////////////////////
                    }
                    else if(state == "statement") {
                        console.log(" - child node entered: " + node.type.name)
                    }
                    else {
                        console.log(`Unknown state in process: ${state}; node type = ${node.type.name} `)
                    }
                    break
                }
            }
        },

        leave: (node) => {
            level -= 1
            if(level == 2) {
                state = "statement"
            }
            else if(level == 1) {
                state = "script"
            }
            else if(level < 1) {
                state = "OUTSIDE"
            } 
        }
    })

    //get active edit info
    let activeEditIndex = INVALID_CELL_INDEX
    let activeEditType = ""
    if(activeCellIndex != INVALID_CELL_INDEX) {
        let cellUpdateInfo = newCellUpdateInfos[activeCellIndex] 
        if( actionIsAnEdit(cellUpdateInfo.action) || (cellUpdateInfo.cellInfo !== undefined && isCodeDirty(cellUpdateInfo.cellInfo!)) ) {
            activeEditIndex = activeCellIndex
            activeEditType = activeCellType
        }
    }

    //get cells to delete - IMPROVE THIS!!!
    let cellsToDelete: CellInfo[] = (oldDocState === undefined) ? [] : oldDocState.cellInfos.filter(oldCellInfo => {
        return !newCellUpdateInfos.some(updateCellInfo => updateCellInfo.cellInfo == oldCellInfo)
    })

    return {
        newCellUpdateInfos: newCellUpdateInfos,
        newCellsToDelete: cellsToDelete,
        parseErrorInfo: parseErrorInfo,
        newActiveEditIndex: activeEditIndex,
        newActiveEditType: activeEditType
    }
}

function createCellUpdateInfo(fromPos: number, fromLine: number, 
        toPos: number, toLine: number,
        codeText: string, propCellUpdateInfos?: CellUpdateInfo[], fieldInfoIds: string[] = []) {
    
    if(propCellUpdateInfos !== undefined) {
        for(let index = 0; index < propCellUpdateInfos.length; index++) {
            let propCellUpdateInfo = propCellUpdateInfos[index]
            let cellFromLine = propCellUpdateInfo.newFromLine
            if(cellFromLine == fromLine && propCellUpdateInfo.newToLine == toLine) {
                let oldCellInfo = propCellUpdateInfo.cellInfo
                if(oldCellInfo !== undefined && oldCellInfo.docCode == codeText) {
                    if(oldCellInfo.from == fromPos && oldCellInfo.fromLine == fromLine && oldCellInfo.to == toPos && oldCellInfo.toLine == toLine) {
                        //reuse
                        return {
                            action: Action.reuse, 
                            cellInfo: oldCellInfo, 
                            newFromLine: fromLine, 
                            newToLine: toLine, 
                            fieldInfoIds
                        }
                    }
                    else {
                        //remap
                        return {
                            action: Action.remap, 
                            cellInfo: oldCellInfo, 
                            newFrom: fromPos, 
                            newFromLine: fromLine, 
                            newTo: toPos, 
                            newToLine: toLine, 
                            fieldInfoIds
                        }
                    }
                }
                else {
                    //update
                    return {
                        action: Action.update, 
                        cellInfo: oldCellInfo, 
                        newFrom: fromPos, 
                        newFromLine: fromLine, 
                        newTo: toPos, 
                        newToLine: toLine, 
                        fieldInfoIds
                    }
                }
            }
            else if(cellFromLine >= fromLine) {
                //make a new cell
                return {
                    action: Action.create,  
                    newFrom: fromPos, 
                    newFromLine: fromLine, 
                    newTo: toPos, 
                    newToLine: toLine, 
                    fieldInfoIds
                }
            }
            //keep looking
        }
    }
    //cell not found - make a new cell
    return {
        action: Action.create,  
        newFrom: fromPos, 
        newFromLine: fromLine, 
        newTo: toPos, 
        newToLine: toLine, 
        fieldInfoIds
    }
}

/** her we break from the tree and process the true node */
//FIX THIS! This was written for dev
// to do: add comments LineComment, BlockComment
function processStatementNode(statementNode: SyntaxNode, docText: Text) {
    let fieldData: FieldData = {
        valid: true,
        declarationType: "",
        fieldName: "",
        body: "",
        startPos: statementNode.node.from,
        endPos: statementNode.node.to
    }
    let topLevelType = statementNode.type.name
    if(topLevelType == "VariableDeclaration") {
        let decNode = statementNode.firstChild
        if(decNode !== null) {
            fieldData.declarationType = decNode.type.name
            let varNameNode = decNode.nextSibling
            if(varNameNode !== null && varNameNode.name == "VariableDefinition") {
                fieldData.fieldName = docText.sliceString(varNameNode.from,varNameNode.to)
                let equalsNode = varNameNode.nextSibling
                if(equalsNode !== null && equalsNode.type.name == "Equals") {
                    let nextNode = equalsNode.nextSibling
                    if(nextNode !== null) {
                        switch(nextNode.type.name) {
                            case "ArrowFunction": 
                                let paramNode = nextNode.firstChild
                                if(paramNode !== null) {
                                    fieldData.paramList = docText.sliceString(paramNode.from,paramNode.to)

                                    let arrowNode = paramNode.nextSibling
                                    if(arrowNode !== null && arrowNode.type.name == "Arrow") {
                                        let bodyNode = arrowNode.nextSibling
                                        if(bodyNode !== null) {
                                            fieldData.body = docText.sliceString(bodyNode.from,bodyNode.to)
                                        }
                                        else {
                                            fieldData.valid = false
                                            fieldData.errorMsg = "Body node missing"
                                        }
                                    }
                                    else {
                                        fieldData.valid = false
                                        fieldData.errorMsg = "Arrow node missing"
                                    }
                                }
                                else {
                                    fieldData.valid = false
                                    fieldData.errorMsg = 'Param list missing'
                                }
                                break

                            case "FunctionExpression":
                                let keywordNode = nextNode.firstChild
                                if(keywordNode !== null && keywordNode.type.name == "function") {
                                    let paramNode = keywordNode.nextSibling
                                    if(paramNode !== null) {
                                        fieldData.paramList = docText.sliceString(paramNode.from,paramNode.to)
            
                                        let bodyNode = paramNode.nextSibling
                                        if(bodyNode !== null) {
                                            fieldData.body = docText.sliceString(bodyNode.from,bodyNode.to)
                                        }
                                        else {
                                            fieldData.valid = false
                                            fieldData.errorMsg = "Body node missing"
                                        }
                                    }
                                    else {
                                        fieldData.valid = false
                                        fieldData.errorMsg = 'Param list missing'
                                    }
                                }
                                else {
                                    fieldData.valid = false
                                    fieldData.errorMsg = "Keyword node missing"
                                }
                                break

                            default: 
                                if(fieldData.declarationType == "var") {
                                    fieldData.body = docText.sliceString(nextNode.from,nextNode.to)
                                }
                                else {
                                    fieldData.valid = false
                                    fieldData.errorMsg = "Non-function variable declarations are only possible with the 'var' type declaration"
                                }
                                break
                        }
                    }
                    else {
                        fieldData.valid = false
                        fieldData.errorMsg = "Unexpected statement format: no sibling node after equals"
                    }
                }
                else {
                    fieldData.valid = false
                    fieldData.errorMsg = "Unexpected statement format: equals not after variable definition"
                }
            }
            else {
                fieldData.valid = false
                fieldData.errorMsg = "Unexpected statement format in variable definition"
            }
        }
        else {
            fieldData.valid = false
            fieldData.errorMsg = "Unexpected statement format: declaration type missing"
        }

    }   
    else {
        fieldData.valid = false
        fieldData.errorMsg = `Invalid statement type: ${topLevelType}. Only VariableDeclaration supported.`
    }

    return fieldData
}