/** This file contains a class which manages the state for a cell object. */
import {Decoration} from "@codemirror/view"
import type {Range, EditorState, ChangeSet, Text } from '@codemirror/state'
import { ErrorInfoStruct, SessionOutputData } from "../../session/sessionApi"
import { RValueStruct } from "../../session/sessionTypes"
import OutputDisplay from "./OutputDisplay"

const INVALID_VERSION_NUMBER = -1

type VarInfo = {
    label: string,
    value: RValueStruct
}

export enum Action {
    create,
    update,
    delete,
    remap,
    reuse
}

export enum StatementAction {
    create,
    update,
    delete,
    reuse
}


export type CellUpdateInfo = {
    action: Action
    cellInfo?: CellInfo
    newFrom?: number
    newTo?: number
    newFromLine: number //we require this one
    newToLine: number //I ADDED REQUIRING THIS, just to make my implementation easier
    codeText?: string
    statementUpdateInfos?: StatementUpdateInfo[]
}

export type StatementUpdateInfo = {
    action: StatementAction,
    id?: string,
    docCode: string,
    fromOffset: number,
    toOffset: number
}

interface CellInfoParams {

    status?: string

    from?: number
    to?: number
    fromLine?: number
    toLine?: number
    docCode?: string
    docVersion?: number

    savedCode?: string | null
    savedVersion?: number
    inputVersion?: number

    statementInfos?: StatementInfo[]

    errorInfo?: ErrorInfoStruct | null
    varInfo?: VarInfo | null

    outputVersion?: number
}

export type StatementInfo = {
    readonly id: string

    readonly fromOffset: number
    readonly toOffset: number
    readonly docCode: string  //code in document
    
    readonly savedCode: string | null //saved code - passed to statement layer    
}

export class CellInfo {

    readonly id: string = "INVALID"
    readonly status: string
    readonly instanceVersion: number
    
    readonly from: number = 0
    readonly to: number = 0 
    readonly fromLine: number = 1
    readonly toLine: number = 1 
    
    //--------
    // code
    readonly docCode: string = "" 
    readonly docVersion: number = 0 
    readonly savedCode: string | null = null
    readonly savedVersion: number = INVALID_VERSION_NUMBER

    readonly statementInfos: StatementInfo[] = []


    //--------------
    // output data
    readonly errorInfo: ErrorInfoStruct | null = null
    readonly varInfo: VarInfo | null = null
    readonly outputVersion: number = INVALID_VERSION_NUMBER
    //--------------
    // output display
    readonly outputDisplay: OutputDisplay | null = null
    readonly outputDecoration: Decoration | null = null

    readonly lineShading: Decoration | null = null
    readonly lineShadingsRng: Range<Decoration>[] | null = null

    readonly outputDecorationRng: Range<Decoration> | null = null

    //======================
    // Methods
    //======================

    constructor(editorState: EditorState, refCellInfo: CellInfo | null, cellInfoParams: CellInfoParams) {

        if(refCellInfo === null) {
            this.id = getCellId()
            this.instanceVersion = 1
        }
        else {
           Object.assign(this,refCellInfo!)
           this.instanceVersion = refCellInfo!.instanceVersion + 1
        }
        Object.assign(this,cellInfoParams)

        this.status = determineStatus(this)
        let statusChanged = refCellInfo !== null ? this.status != refCellInfo.status : true

        //------------------------------------
        // handle display change
        //------------------------------------

        //we probably want to udpate how this is done - but this is from my old code
        if(this.outputDisplay !== null) this.outputDisplay.setFieldInfo(this)

        let outputChanged = cellInfoParams.errorInfo !== undefined || cellInfoParams.varInfo !== undefined || statusChanged
        if(outputChanged) {
            if(this.outputDisplay == null) {
                this.outputDisplay = new OutputDisplay(this)
            }
            this.outputDisplay!.update()

            if(this.outputDisplay!.getIsVisible()) {
                this.outputDecoration = Decoration.widget({
                    widget: this.outputDisplay!,
                    block: true,
                    side: 1
                })
            }
            else {
                this.outputDecoration = null
            }
        }

        //get change flags
        let cellMoved = refCellInfo === null ? true :
            this.from != refCellInfo!.from ||
            this.fromLine != refCellInfo!.fromLine ||
            this.to != refCellInfo!.to ||
            this.toLine != refCellInfo!.toLine


        
        let outputDisplayChanged = refCellInfo !== null ? this.outputDecoration != refCellInfo.outputDecoration : true

        //------------------------------------
        // handle status change / shading change
        //------------------------------------
        let lineShadingChanged = false  //I could detect shading change, instead I just follow the status change
        if( statusChanged ) {
            let className = getLineShadingClass(this)
            if(className !== null) {
                this.lineShading = Decoration.line({attributes: {class: className}})
            }
            else {
                this.lineShading = null
            }
            lineShadingChanged = true
        }
        if(lineShadingChanged || cellMoved) {
            this.lineShadingsRng = []
            if(this.lineShading !== null) {
                for(let lineNum = this.fromLine; lineNum <= this.toLine; lineNum++) {
                    let lineStartPos = -1
                    if(lineNum == this.fromLine) {
                        lineStartPos = this.from
                    }
                    else {
                        //we pass the editor state just so we can read the line start here when there are multiple lines in the cell
                        lineStartPos = editorState.doc.line(lineNum).from
                    }
                    this.lineShadingsRng.push(this.lineShading!.range(lineStartPos,lineStartPos))
                }
            }
        }


        if(outputDisplayChanged || cellMoved) {
            if(this.outputDecoration !== null) {
                this.outputDecorationRng = this.outputDecoration!.range(this.to) 
            }
            else {
                this.outputDecorationRng = null
            }
        }
    }

    pushDecorations(container: Range<Decoration>[]) {
        if(this.lineShadingsRng !== null) {
            container.push(...this.lineShadingsRng)
        }
        if(this.outputDecorationRng != null) {
            container.push(this.outputDecorationRng)
        } 
    }
}


//=================================
// Exported Functions
//=================================

export function cellInfoNeedsCreate(cellInfo: CellInfo) {
    return (cellInfo.savedCode == null)
}

export function cellInfoUpToDate(cellInfo: CellInfo) {
    return cellInfo.status == "value clean"
}

export function isCodeDirty(cellInfo: CellInfo) {
    return ( cellInfo.status == "code dirty" )
}

/** This function finds the cell info with the given line ID. */
export function getCellInfoByIndex(lineId: string, cellInfos: CellInfo[]) {
    return cellInfos.findIndex(cellInfo => cellInfo.id == lineId)
}

/** This function finds the a cell info from a list by from position. */
export function getCellInfoByFrom(fromPos:number, cellInfos: CellInfo[]) {
    let prevCellInfo = cellInfos.find(cellInfo => cellInfo.from == fromPos)
    if (prevCellInfo !== undefined) {
        return prevCellInfo
    }
    return null
}

/** This function creates a new cell */
export function newCellInfo(editorState: EditorState,
        from: number,to: number, fromLine: number, toLine:number,
        docCode: string, 
        statementUpdateInfos: StatementUpdateInfo[], // FOR NOW, ALL CREATE!!!
        docVersion: number) {

    let statementInfos: StatementInfo[] = statementUpdateInfos.map( sui => {
        if(sui.action != StatementAction.create) throw new Error("For now we only support create statement actions for create cell info!!!")
        return {
            id: getStatementId(),
            fromOffset: sui.fromOffset,
            toOffset: sui.toOffset,
            docCode: sui.docCode,
            savedCode: null
        }
    })

    return new CellInfo(editorState,null,{from,to,fromLine,toLine,docCode,statementInfos,docVersion})
}

/** This function creates an updated cell for when the code changes. */
export function  updateCellInfoCode(editorState: EditorState, cellInfo: CellInfo, 
        from: number, to:number, fromLine: number, toLine:number, 
        docCode: string, 
        statementUpdateInfos: StatementUpdateInfo[], //FOR NOW, ALL UPDATE AND ALIGNED WITH EXISTING!!!
        docVersion: number) {

    let statementInfos: StatementInfo[] = statementUpdateInfos.map( (sui,index) => {
        if(sui.action != StatementAction.update) throw new Error("For now we only support update statement actions for update cell info!!!")
        let prevSi = cellInfo.statementInfos[index]  // we require alignment here for now!
        return {
            id: prevSi.id,
            fromOffset: sui.fromOffset,
            toOffset: sui.toOffset,
            docCode: sui.docCode,
            savedCode: prevSi.savedCode
        }
    })
    
    return new CellInfo(editorState,cellInfo,{from,to,fromLine,toLine,docCode,docVersion})
}

/** This function creates a remapped cell info for when only the position changes */
export function  remapCellInfo(editorState: EditorState, cellInfo: CellInfo, from: number,to: number, fromLine: number, toLine:number) {
    return new CellInfo(editorState,cellInfo,{from,to,fromLine,toLine})
}

/** This function creates an updated cell for status and or output (console or plot) changes. */
export function  updateCellInfoDisplay(editorState: EditorState, cellInfo: CellInfo, 
    {cellEvalStarted, errorInfo, varInfoANY, outputVersion}: SessionOutputData) {
    
    //output version required if evalStarted or evalCompleted is set
    
    if(cellEvalStarted === true) {
        //FOR NOW, UPDATE CELL INFO HERE SO WE CLEAR THE DISPLAY VALUES
        cellInfo = new CellInfo(editorState,cellInfo,{})
    }

    let params: CellInfoParams = {}

    //error info and value are reset on each eval
    if(cellEvalStarted) {
        params.errorInfo = (errorInfo !== undefined) ? errorInfo : null
        params.varInfo = (varInfoANY !== undefined) ? varInfoANY as VarInfo : null
    }
    else {
        if(errorInfo !== undefined) params.errorInfo = errorInfo
        if(varInfoANY !== undefined) params.varInfo = varInfoANY as VarInfo
    }

    if(outputVersion !== undefined) params.outputVersion = outputVersion

    return new CellInfo(editorState,cellInfo,params)
}

/** This function creates a update cell info for when session commands are sent (to craete or update the cell) */
export function  updateCellInfoForCommand(editorState: EditorState, cellInfo: CellInfo, currentDocVersion: number): CellInfo {
    return new CellInfo(editorState,cellInfo,{
        savedCode: cellInfo.savedCode,
        savedVersion: cellInfo.savedVersion,
        inputVersion: currentDocVersion
    })
}

export function  updateCellInfoForInputVersion(editorState: EditorState, cellInfo: CellInfo, currentDocVersion: number): CellInfo {
    return new CellInfo(editorState,cellInfo,{inputVersion: currentDocVersion})
}

//=======================
// cell update info
//===========================


export function canDelete(cellUpdateInfo: CellUpdateInfo) {
    return ( cellUpdateInfo.cellInfo !== undefined && !cellInfoNeedsCreate(cellUpdateInfo.cellInfo!) )
}


export function getModUpdateInfo(cellInfo: CellInfo, docText: Text,changes: ChangeSet) {
    let mappedFrom = changes.mapPos(cellInfo.from,-1) 
    let newFromLineObject = docText.lineAt(mappedFrom)
    let newFromLine = newFromLineObject.number
    let newFrom = newFromLineObject.from
    let mappedTo = changes.mapPos(cellInfo.to,1)
    let newToLineObject = docText.lineAt(mappedTo)
    let newToLine = newToLineObject.number  
    let newTo = newToLineObject.to
    let codeText = docText.sliceString(newFrom,newTo).trim()
    if(codeText !== cellInfo.docCode) {
        return {action: Action.update, cellInfo, newFrom, newFromLine, newTo, newToLine,codeText}
    }
    else {
        return  {action: Action.remap, cellInfo, newFrom, newFromLine, newTo, newToLine}
    }
}

export function getNewUpdateInfo(newFrom: number, newFromLine: number, newTo: number, newToLine: number, docText: Text) {
    let codeText = docText.sliceString(newFrom,newTo).trim()
    return {action: Action.create, newFrom, newFromLine, newTo, newToLine, codeText}
} 

export function getRemapUpdateInfo(cellInfo: CellInfo, docText: Text, changes: ChangeSet) {
    let mappedFrom = changes.mapPos(cellInfo.from,1) //"1" means map to the right of insert text at this point
    let newFromLineObject = docText.lineAt(mappedFrom)
    let newFromLine = newFromLineObject.number
    let newFrom = newFromLineObject.from
    let mappedTo = changes.mapPos(cellInfo.to,-1) //"-1" means map to the left of insert text at this point
    let newToLineObject = docText.lineAt(mappedTo)
    let newToLine = newToLineObject.number  
    let newTo = newToLineObject.to
    return {action: Action.remap, cellInfo, newFrom, newFromLine, newTo, newToLine}
}

export function getReuseUpdateInfo(cellInfo: CellInfo) {
    return {action: Action.reuse, cellInfo, newFromLine: cellInfo.fromLine}
}

export function actionIsAnEdit(action: Action) {
    return action == Action.create || action == Action.update || action == Action.delete
}


export function getCUIFrom(cui: CellUpdateInfo) {
    if(cui.newFrom !== undefined) return cui.newFrom
    else if(cui.cellInfo !== undefined) return cui.cellInfo!.from
    else throw new Error("Unexpected: position not found in cell update info")
}

export function getCUIFromLine(cui: CellUpdateInfo) {
    return cui.newFromLine
}

export function getCUITo(cui: CellUpdateInfo) {
    if(cui.newTo !== undefined) return cui.newTo
    else if(cui.cellInfo !== undefined) return cui.cellInfo!.to
    else throw new Error("Unexpected: position not found in cell update info")
}

export function getCUIToLine(cui: CellUpdateInfo) {
    if(cui.newToLine !== undefined) return cui.newToLine
    else if(cui.cellInfo !== undefined) return cui.cellInfo!.toLine
    else throw new Error("Unexpected: position not found in cell update info")
}

export  function getCUICodeText(cui: CellUpdateInfo) {
    if(cui.codeText !== undefined) return cui.codeText
    else if(cui.cellInfo !== undefined) return cui.cellInfo!.docCode
    else throw new Error("Unexpected: code text not found in cell update info")
}

/** This function creates a CellInfo object from a CellUpdateInfo. */
export function createCellInfos(editorState: EditorState, cellUpdateInfos: CellUpdateInfo[], docVersion:number) {

    return cellUpdateInfos.map( cui => {
        switch(cui.action) {
            case Action.create: 
                //FOR NOW - STATEMENTS UPDATE INFO ARE ALL CREATE!!!
                if(cui.statementUpdateInfos === undefined) throw new Error("we require statement update infos here for now!")
                return newCellInfo(editorState,cui.newFrom!,cui.newTo!,cui.newFromLine,cui.newToLine!,cui.codeText!,cui.statementUpdateInfos!,docVersion) 

            case Action.update: 
                //FOR NOW - STATEMENTS UDPATE INFOS INCLUDES ALL STATEMENTS, IN ORDER!!!
                if(cui.statementUpdateInfos === undefined) throw new Error("we require statement update infos here for now!")
                return updateCellInfoCode(editorState,cui.cellInfo!,cui.newFrom!,cui.newTo!,cui.newFromLine,cui.newToLine!,cui.codeText!,cui.statementUpdateInfos!,docVersion) 

            case Action.remap: 
                //NO CHANGE TO STATEMENT UPDATE INFOS
                return remapCellInfo(editorState,cui.cellInfo!,cui.newFrom!,cui.newTo!,cui.newFromLine,cui.newToLine!)

            case Action.reuse: 
                //NO CHANGE TO STATEMENT UPDATE INFOS
                return  cui.cellInfo!

            case Action.delete:
                throw new Error("Unexpected delete action")
        }
    })
}


export function cellHasCodeStatement(cellUpdateInfo: CellUpdateInfo) {
    return true
}


//====================================
// internal functions
//====================================

//for now we make a dummy id here
let nextCellId = 1
function getCellId() {
    return "c" + String(nextCellId++)
}

let nextStatementId = 1
function getStatementId() {
    return "l" + String(nextStatementId++)
}

function getLineShadingClass(cellInfo: CellInfo) {
    if(cellInfo.status == "code dirty") {
        return "cm-rd-codeDirtyShade"
    }
    else if(cellInfo.status == "value clean" || cellInfo.docCode == "") {
        return null
    }
    else {
        //non-empty "value pending" or "inputs dirty"
        return "cm-rd-valuePendingShade"
    }
}



function determineStatus(cellInfo: CellInfo) {
    if( cellInfo.docVersion > cellInfo.savedVersion ) return "code dirty"
    else if( cellInfo.savedVersion > cellInfo.outputVersion ) return "value pending"
    else return "value clean"
}