/** This file contains a class which manages the state for a cell object. */
import {Decoration} from "@codemirror/view"
import type {Range, EditorState, ChangeSet, Text} from '@codemirror/state'
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

export type CellUpdateInfo = {
    action: Action
    cellInfo?: CellInfo
    newFrom?: number
    newTo?: number
    newFromLine: number //we require this one
    newToLine: number //I ADDED REQUIRING THIS, just to make my implementation easier
    codeText?: string
    fieldInfoIds: string[]
}

interface CellInfoParams {
    from?: number
    to?: number
    fromLine?: number
    toLine?: number
    docCode?: string
    docCodeVersion?: number
    modelCode?: string | null
    modelCodeVersion?: number
    fieldInfoIds?: string[]
    parseError?: boolean //TBR
    errorMsg?: string //TBR
}


export class CellInfo {

    readonly status: string

    // we need a way to store and display cell level error info, use for parse errors.
    
    // doc code is active code during edits
    // model code (get better name?) is code submitted with fields
    // after submission, not in edit state. read state from fieldInfo (there should be just one at submit, I don't know if I need to rely on that)
    readonly docCode: string = ""  //code in the document
    readonly docCodeVersion: number = INVALID_VERSION_NUMBER
    readonly modelCode: string | null = null //code from last field submission?
    readonly modelCodeVersion: number = INVALID_VERSION_NUMBER

    readonly parseError: boolean = false
    readonly errorMsg: string | null = null

    readonly from: number = 0 // this used to be set in the constructor, but typescript doesn't acknowledge the current code
    readonly to: number = 0 // this used to be set in the constructor, but typescript doesn't acknowledge the current code
    readonly fromLine: number = 1 // this used to be set in the constructor, but typescript doesn't acknowledge the current code
    readonly toLine: number = 1 // this used to be set in the constructor, but typescript doesn't acknowledge the current code

    // maybe I should store a reference rather than the id?
    readonly fieldInfoIds: string[] = []

    //line shading
    readonly lineShading: Decoration | null = null
    readonly lineShadingsRng: Range<Decoration>[] | null = null

    //ADD CELL-LEVEL ERROR DISPLAY! To be used when there is a parse error that does not allow field creation

    //output displays w/location from fieldInfos
    readonly outputDecorationRng: Range<Decoration> | null = null

    //======================
    // Methods
    //======================

    constructor(editorState: EditorState, refCellInfo: CellInfo | null, cellInfoParams?: CellInfoParams) {

        if(refCellInfo !== null) {
           Object.assign(this,refCellInfo!)
        }
        else {
            //id
            //status
            //CLEAN UP INITIALIZATION
        }
        Object.assign(this,cellInfoParams)

        //get change flags
        let cellMoved = refCellInfo === null ? true :
            this.from != refCellInfo!.from ||
            this.fromLine != refCellInfo!.fromLine ||
            this.to != refCellInfo!.to ||
            this.toLine != refCellInfo!.toLine

        //! measure the status from all the fieldInfos
        this.status = getStatus(this,)

        //let statusChanged = refFieldInfo !== null ? this.fieldInfo.status != refFieldInfo.status : true
        //let outputDisplayChanged = refFieldInfo !== null ? this.fieldInfo.outputDecoration != refFieldInfo.outputDecoration : true

        //------------------------------------
        // handle status change / shading change
        //------------------------------------
        let lineShadingChanged = false  //I could detect shading change, instead I just follow the status change
        if( statusChanged ) {
            let className = getLineShadingClass(this.fieldInfo)
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
            if(this.fieldInfo.outputDecoration !== null) {
                this.outputDecorationRng = this.fieldInfo.outputDecoration!.range(this.to) 
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
    return (cellInfo.fieldInfo.modelCode == null)
}

export function cellInfoUpToDate(cellInfo: CellInfo) {
    return cellInfo.fieldInfo.status == "value clean"
}

export function isCodeDirty(cellInfo: CellInfo) {
    return ( cellInfo.fieldInfo.status == "code dirty" )
}

/** This function finds the cell info with the given line ID. */
export function getCellInfoByIndex(lineId: string, cellInfos: CellInfo[]) {
    return cellInfos.findIndex(cellInfo => cellInfo.fieldInfo.id == lineId)
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
export function newCellInfo(editorState: EditorState, from: number,to: number, fromLine: number, toLine:number,docCode: string, docVersion: number) {
    return new CellInfo(editorState,null,{from,to,fromLine,toLine},{docCode,docVersion})
}

/** This function creates an updated cell for when the code changes. */
export function  updateCellInfoCode(editorState: EditorState, cellInfo: CellInfo, from: number, to:number, fromLine: number, toLine:number, docCode: string, docVersion: number) {
    return new CellInfo(editorState,cellInfo,{from,to,fromLine,toLine},{docCode,docVersion})
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

    let params: FieldInfoParams = {}

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

    return new CellInfo(editorState,cellInfo,undefined,params)
}

/** This function creates a update cell info for when session commands are sent (to craete or update the cell) */
export function  updateCellInfoForCommand(editorState: EditorState, cellInfo: CellInfo, currentDocVersion: number): CellInfo {
    return new CellInfo(editorState,cellInfo,undefined,{
        modelCode: cellInfo.fieldInfo.docCode,
        modelVersion: cellInfo.fieldInfo.docVersion,
        inputVersion: currentDocVersion
    })
}

export function  updateCellInfoForInputVersion(editorState: EditorState, cellInfo: CellInfo, currentDocVersion: number): CellInfo {
    return new CellInfo(editorState,cellInfo,undefined,{inputVersion: currentDocVersion})
}



//=============================
// Accessors for the above types
//=============================

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
/*
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
*/


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
export function createCellInfos(editorState: EditorState, cellUpdateInfos: CellUpdateInfo[],docVersion:number) {

    return cellUpdateInfos.map( cui => {
        switch(cui.action) {
            case Action.create: 
                return newCellInfo(editorState,cui.newFrom!,cui.newTo!,cui.newFromLine,cui.newToLine!,cui.codeText!,docVersion) 

            case Action.update: 
                return updateCellInfoCode(editorState,cui.cellInfo!,cui.newFrom!,cui.newTo!,cui.newFromLine,cui.newToLine!,cui.codeText!,docVersion) 

            case Action.remap: 
                return remapCellInfo(editorState,cui.cellInfo!,cui.newFrom!,cui.newTo!,cui.newFromLine,cui.newToLine!)

            case Action.reuse: 
                return  cui.cellInfo!

            case Action.delete:
                throw new Error("Unexpected delete action")
        }
    })
}




//====================================
// internal functions
//====================================


function getLineShadingClass(fieldInfo: FieldInfo) {
    if(fieldInfo.status == "code dirty") {
        return "cm-rd-codeDirtyShade"
    }
    else if(fieldInfo.status == "value clean" || fieldInfo.docCode == "") {
        return null
    }
    else {
        //non-empty "value pending" or "inputs dirty"
        return "cm-rd-valuePendingShade"
    }
}



function determineStatus(fieldInfo: FieldInfo) {
    if( fieldInfo.docVersion > fieldInfo.modelVersion ) return "code dirty"
    else if( fieldInfo.inputVersion > fieldInfo.outputVersion ) return "inputs dirty"
    else if( fieldInfo.modelVersion > fieldInfo.outputVersion ) return "value pending"
    else return "value clean"
}