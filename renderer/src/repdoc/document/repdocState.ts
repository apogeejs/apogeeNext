/** This file holds the repdocState extension, which manages the repdoc State, bridging the editor with the R session.  */

import {syntaxTree} from "@codemirror/language"
import {EditorView} from "@codemirror/view"
import type { EditorState, Transaction, ChangeSet, Text } from '@codemirror/state'
import { StateField, StateEffect } from '@codemirror/state'
import {SessionOutputEvent,setMaxEvalLine1,PRE_LINE_ID} from "../../session/sessionApi"
import { DocState, createDocState, findStatementInfo } from "./docState"
import { CellInfo, StatementInfo, updateCellInfoDisplay, cellInfoNeedsCreate, isCodeDirty, getCellInfoByIndex, 
        CellUpdateInfo, Action, actionIsAnEdit, createCellInfos, StatementUpdateInfo, StatementAction,
        getCUIFromLine, getCUIToLine, getCUIFrom, getCUITo, getCUICodeText, cellHasCodeStatement } from "./CellInfo"
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
const ONE_BEFORE_FIRST_LINE_NUMBER = 0 //line number is 1 based

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

            docState = createDocState(newCellInfos,docState.docVersion,docState.parseTreeCurrent,docState.hasParseErrors)
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
        let cellInfos = createCellInfos(editorState,docState,cellUpdateInfos,docVersion)
        // setMaxEvalLine1(docSessionId,nonCommandIndex) //note - argument here equals to the last commandIndex - 1, but it is also 1-based rather than 0-based
        // if( nonCommandIndex > 0 || cellsToDelete!.length > 0 ) {
        //     cellInfos = issueSessionCommands(docSessionId, editorState,cellInfos,cellsToDelete,docVersion,nonCommandIndex)
        // }
        return createDocState(cellInfos,docVersion,parseTreeUsed,hasParseErrors)
    }
    else {
        // if(docState === undefined) throw new Error("Unexpected: doc state misssing") //this shouldn't happen
        // if(docState.hasDirtyCells && !docState.hasParseErrors) {
        //     //CLEAN THIS UP!!! (lots of repeated code)
        //     let activeLine = editorState.doc.lineAt(editorState.selection.main.head).number
        //     let activeCellIndex = docState.cellInfos.findIndex( cellInfo => cellInfo.fromLine >= activeLine && cellInfo.toLine <= activeLine )
        //     let activeCellInfo = docState.cellInfos[activeCellIndex]
        //     let nonCommandIndex = (activeCellInfo === undefined || activeCellInfo!.status != "code dirty") ? docState.cellInfos.length : 
        //         (activeCellInfo.docCode === "") ? activeCellIndex : 0
        //     setMaxEvalLine1(docSessionId, nonCommandIndex) 
        //     let docVersion = (docState !== undefined) ? docState.docVersion + 1 : INITIAL_DOCUMENT_VERSION
        //     let cellInfos = issueSessionCommands(docSessionId, editorState,docState.cellInfos,[],docVersion,nonCommandIndex)
        //     docState = createDocState(cellInfos,docVersion,docState.parseTreeCurrent,docState.hasParseErrors) 
        // }
        return docState!
    }
}

function getCellUpdateInfo(editorState: EditorState, 
                            transaction: Transaction | undefined = undefined, 
                            docState: DocState | undefined = undefined,
                            doParseTreeProcess: boolean) {

    let {oldCellUpdateInfos, oldCellsToDelete} = updateOldCells(editorState, transaction!, docState)
    let oldHasParseError = docState !== undefined ? docState!.hasParseErrors : false
    
    if(doParseTreeProcess) {
        let {newCellUpdateInfos, newCellsToDelete, parseErrorInfo, newActiveEditIndex, newActiveEditType} = 
            parseNewCells(editorState, docState, oldCellUpdateInfos, oldCellsToDelete)

        let fallbackDataPresent = docState !== undefined
        let TEMP_RESULT = mergeCellUpdateInfos(newCellUpdateInfos,newCellsToDelete,parseErrorInfo,
                                    oldCellUpdateInfos,oldCellsToDelete,oldHasParseError,
                                    fallbackDataPresent, newActiveEditIndex, newActiveEditType)

        ///////////////////////////////////////////////
        console.log("===================================================")
        if(TEMP_RESULT.parseTreeUsed) {
            printCellUpdateInfos("parsed",newCellUpdateInfos,docState)
        }
        printCellUpdateInfos("propagated",oldCellUpdateInfos,docState)
        ///////////////////////////////////////////

        return TEMP_RESULT

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

///////////////////////////////////////////////
function printCellUpdateInfos(label: string, cellUpdateInfos: CellUpdateInfo[],docState: DocState | undefined) {
    console.log("CellUpdateInfos " + label + ":")
    cellUpdateInfos.forEach( cui => {
        console.log(`lines: [${getCUIFromLine(cui)},${getCUIToLine(cui)}] pos: [${getCUIFrom(cui)},${getCUITo(cui)}] code: ${getCUICodeText(cui)}`)
        cui.statementUpdateInfos.forEach(sui => {
            printStatementUpdateInfo(sui,docState)
        })
    })
}

function printStatementUpdateInfo(sui: StatementUpdateInfo, docState: DocState | undefined) {
    let si: StatementInfo | undefined
    if(sui.action != StatementAction.create && docState !== undefined) {
        si = findStatementInfo(docState,sui.id!)
    }
    let fromPos = sui.fromPos != undefined ? sui.fromPos : si !== undefined ? si.fromPos : "-"
    let toPos = sui.toPos != undefined ? sui.toPos : si !== undefined ? si.toPos : "-"
    let codeText = sui.docCode != undefined ? sui.docCode : si !== undefined ? si.docCode : "-"
    console.log(`    field: ${codeText} range: [${fromPos},${toPos}]`)
}


///////////////////////////////////////////////////

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
    if(newActiveEditType == "noncode") {
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
function updateOldCells(editorState: EditorState, transaction: Transaction, docState?: DocState) {
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

                //compare to previous update info for gap for overlap
                //submit prev update info if needed
                let prevStatementUpdateInfos: StatementUpdateInfo[] | undefined
                if(prevUpdateInfo !== undefined) {
                    if(newFromLine == prevUpdateInfo.newToLine + 1) {
                        //no overlap or gap
                        cellUpdateInfos.push(prevUpdateInfo)
                    }
                    else if(newFromLine > prevUpdateInfo.newToLine + 1) {
                        //add gap!
                        cellUpdateInfos.push(prevUpdateInfo)
                        let newFromLine = prevUpdateInfo.newToLine + 1
                        let newToLine = newFromLine - 1
                        let newFrom = docText.line(newFromLine).from
                        let newTo = docText.line(newToLine).to
                        let gapUpdateInfo = {
                            action: Action.create, 
                            newFrom,
                            newFromLine,
                            newTo,
                            newToLine,
                            codeText: docText.sliceString(newFrom,newTo).trim(),
                            statementUpdateInfos: []
                        }
                        cellUpdateInfos.push(gapUpdateInfo)
                    }
                    else {
                        /////////////////////////////////////////////////////////////
                        //overlap - merge into one update info
                        //////////////////////////////////////////////////////////////
                        if(newFromLine != prevUpdateInfo.newFromLine) {
                            newFromLine = getCUIFromLine(prevUpdateInfo)
                            newFrom = getCUIFrom(prevUpdateInfo)
                        }

                        //copy on contents from previous to current
                        if(prevUpdateInfo.cellInfo !== undefined) {
                            prevStatementUpdateInfos = prevUpdateInfo.statementUpdateInfos
                        }

                        //delete previous
                        if(prevUpdateInfo.cellInfo !== undefined && !cellInfoNeedsCreate(prevUpdateInfo.cellInfo)) {
                            cellsToDelete.push(prevUpdateInfo.cellInfo)
                        }
                    }
                }

                let codeText = docText.sliceString(newFrom,newTo).trim()

                let updateInfo: CellUpdateInfo | undefined
                if(codeText !== cellInfo.docCode) {
                    //recalc statement and update
                    let statementUpdateInfos: StatementUpdateInfo[] = cellInfo.statementInfos.map(statementInfo => {
                        let stmtFrom = changes.mapPos(statementInfo.fromPos)
                        let stmtTo = changes.mapPos(statementInfo.toPos)
                        return {
                            action: StatementAction.update,
                            id: statementInfo.id,
                            docCode: docText.sliceString(stmtFrom,stmtTo).trim(),
                            fromPos: stmtFrom,
                            toPos: stmtTo,
                            isCode: statementInfo.isCode
                        }
                    })

                    if(prevStatementUpdateInfos !== undefined) statementUpdateInfos = prevStatementUpdateInfos.concat(statementUpdateInfos)

                    updateInfo = {action: Action.update, cellInfo, newFrom, newFromLine, newTo, newToLine, codeText, statementUpdateInfos}
                }
                else if(newFrom == cellInfo.from && newTo == cellInfo.to && newFromLine == cellInfo.fromLine && newToLine == cellInfo.toLine) {
                    //reuse
                    let statementUpdateInfos: StatementUpdateInfo[] = cellInfo.statementInfos.map(statementInfo => {
                        return {
                            action: StatementAction.reuse,
                            id: statementInfo.id
                        }
                    })
                    if(prevStatementUpdateInfos !== undefined) statementUpdateInfos = prevStatementUpdateInfos.concat(statementUpdateInfos)

                    updateInfo = {action: Action.reuse, cellInfo, newFromLine, newToLine, statementUpdateInfos}
                }
                else {
                    //remap
                    let statementUpdateInfos: StatementUpdateInfo[] = cellInfo.statementInfos.map(statementInfo => {
                        //on cell remap, the statements don't need to be remapped
                        let stmtFrom = changes.mapPos(statementInfo.fromPos)
                        let stmtTo = changes.mapPos(statementInfo.toPos)
                        return {
                            action: StatementAction.remap,
                            id: statementInfo.id,
                            fromPos: stmtFrom,
                            toPos: stmtTo,
                        }
                    })
                    if(prevStatementUpdateInfos !== undefined) statementUpdateInfos = prevStatementUpdateInfos.concat(statementUpdateInfos)

                    updateInfo = {action: Action.remap, cellInfo, newFrom, newFromLine, newTo, newToLine, statementUpdateInfos}
                }

                //update prev
                prevUpdateInfo = updateInfo
            })

            //check for end gap!!!
            let lastToLine = ONE_BEFORE_FIRST_LINE_NUMBER
            if(prevUpdateInfo !== undefined) {
                cellUpdateInfos.push(prevUpdateInfo)
                lastToLine = prevUpdateInfo.newToLine
            }
            if(lastToLine < docText.lines) {
                //add end gap
                let newFromLine = lastToLine + 1
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
                    statementUpdateInfos: []
                }
                cellUpdateInfos.push(gapUpdateInfo)
            }
        }
        else {
            //if we have no changes return "reuse" cell update infos
            cellUpdateInfos.push(...docState!.cellInfos.map( cellInfo => { return {
                action: Action.reuse, 
                cellInfo,
                newFromLine: cellInfo.fromLine,
                newToLine: cellInfo.toLine,
                statementUpdateInfos: cellInfo.statementInfos.map(si => {
                    return {
                        action: StatementAction.reuse,
                        id: si.id
                    }
                })
            } })) 
        }
    }

    return {
        oldCellUpdateInfos: cellUpdateInfos, 
        oldCellsToDelete: cellsToDelete
    }
}

/** This function creates new cells based on the updatede document parse tree. */
function parseNewCells(editorState: EditorState, docState: DocState | undefined, oldCellUpdateInfos: CellUpdateInfo[], cellsToDelete: CellInfo[] = []) {
    
    //these are the output cell infos
    const newCellUpdateInfos: CellUpdateInfo[] = []

    //record if there is a parse error
    let parseErrorInfo: ParseErrorInfo = {
        //errors: [],
        hasError: false
    }

    //this is the index of a cell that is actively being edited
    // let activeCellIndex = INVALID_CELL_INDEX
    // let activeCellType = "" //TEMPORARY - while we work on emtpy cell detection
 
    // //we use these variables to progress through the cell update info as we process the new parse tree.
    // let currentOldIndex = INVALID_CELL_INDEX
    // let oldCellUpdateInfo: CellUpdateInfo | undefined = undefined
    // let currentOldFromLine = ONE_BEFORE_FIRST_LINE_NUMBER
    // let oldCellUsed = Array(oldCellUpdateInfos.length).fill(false)

    ////////////////////////
    let prevToLine = 0 // one less than first line
    let prevCellUpdateInfo: CellUpdateInfo | undefined
    //////////////////////

    //used to read line nubers from positions
    let docText = editorState.doc

    

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
                            let stmtFrom = node.from
                            let stmtTo = node.to

                            let startLine = docText.lineAt(stmtFrom)
                            let endLine = docText.lineAt(stmtTo)
                            
                            let fromPos = startLine.from
                            let toPos = endLine.to
                            let fromLine = startLine.number
                            let toLine = endLine.number

                            let isCode = isNodeTypeCode(node.type.name)

                            if(fromLine > prevToLine + 1) {

                                if(prevCellUpdateInfo !== undefined) {
                                    newCellUpdateInfos.push(prevCellUpdateInfo)
                                    prevCellUpdateInfo = undefined
                                }

                                //empty gap cell
                                let newFromLine = prevToLine + 1
                                let newToLine = fromLine - 1
                                let newFrom = docText.line(newFromLine).from
                                let newTo = docText.line(newToLine).to
                                let gapCellUpdateInfo = {
                                    action: Action.create,
                                    newFromLine,newToLine, newFrom, newTo,
                                    codeText: editorState.doc.sliceString(newFrom,newTo),
                                    statementUpdateInfos: []
                                }
                                newCellUpdateInfos.push(gapCellUpdateInfo)
                            }

                            let statementUpdateInfo = {
                                action: StatementAction.create,
                                docCode: editorState.doc.sliceString(stmtFrom,stmtTo),
                                fromPos: stmtFrom,
                                toPos: stmtTo,
                                isCode: isCode
                            }
                            
                            if(fromLine <= prevToLine && prevCellUpdateInfo !== undefined && prevCellUpdateInfo.statementUpdateInfos !== undefined) { //prevCellUpdateInfo is supposed to exist if we need to merge
                                //merge with previous
                                if(prevToLine < toLine) {
                                    prevCellUpdateInfo.newToLine = toLine
                                    prevCellUpdateInfo.newTo = toPos
                                    prevCellUpdateInfo.codeText = editorState.doc.sliceString(fromPos,toPos) 
                                }
                                
                                prevCellUpdateInfo.statementUpdateInfos.push(statementUpdateInfo)
                            }
                            else {
                                if(prevCellUpdateInfo !== undefined) newCellUpdateInfos.push(prevCellUpdateInfo)
                                
                                //new cell
                                let newCellUpdateInfo = {
                                    action: Action.create,
                                    newFrom: fromPos,
                                    newTo: toPos,
                                    newFromLine: fromLine,
                                    newToLine: toLine,
                                    codeText: editorState.doc.sliceString(fromPos,toPos),
                                    statementUpdateInfos: [statementUpdateInfo]
                                }
                                
                                prevCellUpdateInfo = newCellUpdateInfo
                                prevToLine = prevCellUpdateInfo.newToLine
                            }

                            //add deletes later!!!

                            ///////////////////////
                            //let cellData = processStatementNode(node.node, docText)
                            //console.log(JSON.stringify(cellData))
                            ///////////////////////
        
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

    //check for an end gap
    let lastToLine = ONE_BEFORE_FIRST_LINE_NUMBER
    if(prevCellUpdateInfo !== undefined) {
        newCellUpdateInfos.push(prevCellUpdateInfo)
        lastToLine = prevCellUpdateInfo.newToLine
    }
    if(lastToLine < docText.lines) {
        //add end gap
        let newFromLine = lastToLine + 1
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
            statementUpdateInfos: []
        }
        newCellUpdateInfos.push(gapUpdateInfo)
    }

    //get active edit info
    // let activeEditIndex = INVALID_CELL_INDEX
    // let activeEditType = ""
    // if(activeCellIndex != INVALID_CELL_INDEX) {
    //     let cellUpdateInfo = newCellUpdateInfos[activeCellIndex] 
    //     if( actionIsAnEdit(cellUpdateInfo.action) || (cellUpdateInfo.cellInfo !== undefined && isCodeDirty(cellUpdateInfo.cellInfo!)) ) {
    //         activeEditIndex = activeCellIndex
    //         activeEditType = activeCellType
    //     }
    // }
    let activeEditIndex = INVALID_CELL_INDEX
    let activeEditType = ""
    let activeLine = editorState.doc.lineAt(editorState.selection.main.head).number
    newCellUpdateInfos.forEach( (cellUpdateInfo, index) => {
        if(getCUIFromLine(cellUpdateInfo) <= activeLine && getCUIToLine(cellUpdateInfo) >= activeLine) {
            if(actionIsAnEdit(cellUpdateInfo.action) || (cellUpdateInfo.cellInfo !== undefined && isCodeDirty(cellUpdateInfo.cellInfo!)) ) {
                activeEditIndex = index
                activeEditType = cellHasCodeStatement(cellUpdateInfo) ? "code" : "noncode"
            }
        }
    })

    //additional cells we need to delete
    // let unusedOldCells: CellInfo[] = []
    // oldCellUsed.forEach( (cellUsed,index) => {
    //     if(!cellUsed) {
    //         let cellInfo = oldCellUpdateInfos![index].cellInfo
    //         if(cellInfo !== undefined && !cellInfoNeedsCreate(cellInfo) ) {
    //             unusedOldCells.push(cellInfo)
    //         }
    //     }
    // })
    // if(unusedOldCells.length > 0) {
    //     cellsToDelete = cellsToDelete.concat(unusedOldCells)
    // }
    //for now, we are make all new cells - THIS WILL CHANGE
    cellsToDelete = docState !== undefined ? docState.cellInfos : []

    return {
        newCellUpdateInfos: newCellUpdateInfos,
        newCellsToDelete: cellsToDelete,
        parseErrorInfo: parseErrorInfo,
        newActiveEditIndex: activeEditIndex,
        newActiveEditType: activeEditType
    }
}

function isNodeTypeCode(type: string) {
    return type !== "LineComment" && type != "BlockComment"
}

type CellStructureData = {
    valid: boolean,
    errorMsg?: string,
    declarationType: string,
    varName: string,
    paramList?: string
    body: string
}


/** her we break from the tree and process the true node */
//FIX THIS! This was written for dev
// to do: add comments LineComment, BlockComment
function processStatementNode(statementNode: SyntaxNode, docText: Text) {
    let cellData: CellStructureData = {
        valid: true,
        declarationType: "",
        varName: "",
        body: ""
    }
    let topLevelType = statementNode.type.name
    if(topLevelType == "VariableDeclaration") {
        let decNode = statementNode.firstChild
        if(decNode !== null) {
            cellData.declarationType = decNode.type.name
            let varNameNode = decNode.nextSibling
            if(varNameNode !== null && varNameNode.name == "VariableDefinition") {
                cellData.varName = docText.sliceString(varNameNode.from,varNameNode.to)
                let equalsNode = varNameNode.nextSibling
                if(equalsNode !== null && equalsNode.type.name == "Equals") {
                    let nextNode = equalsNode.nextSibling
                    if(nextNode !== null) {
                        switch(nextNode.type.name) {
                            case "ArrowFunction": 
                                let paramNode = nextNode.firstChild
                                if(paramNode !== null) {
                                    cellData.paramList = docText.sliceString(paramNode.from,paramNode.to)

                                    let arrowNode = paramNode.nextSibling
                                    if(arrowNode !== null && arrowNode.type.name == "Arrow") {
                                        let bodyNode = arrowNode.nextSibling
                                        if(bodyNode !== null) {
                                            cellData.body = docText.sliceString(bodyNode.from,bodyNode.to)
                                        }
                                        else {
                                            cellData.valid = false
                                            cellData.errorMsg = "Body node missing"
                                        }
                                    }
                                    else {
                                        cellData.valid = false
                                        cellData.errorMsg = "Arrow node missing"
                                    }
                                }
                                else {
                                    cellData.valid = false
                                    cellData.errorMsg = 'Param list missing'
                                }
                                break

                            case "FunctionExpression":
                                let keywordNode = nextNode.firstChild
                                if(keywordNode !== null && keywordNode.type.name == "function") {
                                    let paramNode = keywordNode.nextSibling
                                    if(paramNode !== null) {
                                        cellData.paramList = docText.sliceString(paramNode.from,paramNode.to)
            
                                        let bodyNode = paramNode.nextSibling
                                        if(bodyNode !== null) {
                                            cellData.body = docText.sliceString(bodyNode.from,bodyNode.to)
                                        }
                                        else {
                                            cellData.valid = false
                                            cellData.errorMsg = "Body node missing"
                                        }
                                    }
                                    else {
                                        cellData.valid = false
                                        cellData.errorMsg = 'Param list missing'
                                    }
                                }
                                else {
                                    cellData.valid = false
                                    cellData.errorMsg = "Keyword node missing"
                                }
                                break

                            default: 
                                if(cellData.declarationType == "var") {
                                    cellData.body = docText.sliceString(nextNode.from,nextNode.to)
                                }
                                else {
                                    cellData.valid = false
                                    cellData.errorMsg = "Non-function variable declarations are only possible with the 'var' type declaration"
                                }
                                break
                        }
                    }
                    else {
                        cellData.valid = false
                        cellData.errorMsg = "Unexpected statement format: no sibling node after equals"
                    }
                }
                else {
                    cellData.valid = false
                    cellData.errorMsg = "Unexpected statement format: equals not after variable definition"
                }
            }
            else {
                cellData.valid = false
                cellData.errorMsg = "Unexpected statement format in variable definition"
            }
        }
        else {
            cellData.valid = false
            cellData.errorMsg = "Unexpected statement format: declaration type missing"
        }

    }   
    else {
        cellData.valid = false
        cellData.errorMsg = `Invalid statement type: ${topLevelType}. Only VariableDeclaration supported.`
    }

    return cellData
}