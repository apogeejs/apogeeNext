/** This file contains a class which manages the state for a cell object. */
import {Decoration} from "@codemirror/view"
import type {Range, EditorState} from '@codemirror/state'
import { ErrorInfoStruct, SessionOutputData } from "../../session/sessionApi"
import { RValueStruct } from "../../session/sessionTypes"
import OutputDisplay from "./OutputDisplay"

const INVALID_VERSION_NUMBER = -1

type VarInfo = {
    label: string,
    value: RValueStruct
}

interface CellInfoParams {
    // status?: string
    //--------------
    // location
    from?: number
    to?: number
    fromLine?: number
    toLine?: number
    //--------
    // code
    // docCode?: string
    // docVersion?: number
    // modelCode?: string | null
    // modelVersion?: number
    // inputVersion?: number
    //--------------
    // output
    // errorInfo?: ErrorInfoStruct | null
    // varInfo?: VarInfo | null
    //--------------
    // outputVersion?: number
}

interface FieldInfoParams {
    status?: string
    // code
    docCode?: string
    docVersion?: number
    modelCode?: string | null
    modelVersion?: number
    inputVersion?: number
    //--------------
    // output
    errorInfo?: ErrorInfoStruct | null
    varInfo?: VarInfo | null
    //--------------
    outputVersion?: number
}

export class CellInfo {
    
    readonly from: number = 0 //this used to be set in the constructor, but typescript doesn't acknowledge the current code
    readonly to: number = 0 //this used to be set in the constructor, but typescript doesn't acknowledge the current code
    readonly fromLine: number = 1 //this used to be set in the constructor, but typescript doesn't acknowledge the current code
    readonly toLine: number = 1 //this used to be set in the constructor, but typescript doesn't acknowledge the current code

    readonly lineShading: Decoration | null = null
    readonly lineShadingsRng: Range<Decoration>[] | null = null

    readonly outputDecorationRng: Range<Decoration> | null = null

    readonly fieldInfo: FieldInfo

    //======================
    // Methods
    //======================

    constructor(editorState: EditorState, refCellInfo: CellInfo | null, cellInfoParams?: CellInfoParams, fieldInfoParams?: FieldInfoParams) {

        if(refCellInfo !== null) {
           Object.assign(this,refCellInfo!)
        }
        Object.assign(this,cellInfoParams)

        //get change flags
        let cellMoved = refCellInfo === null ? true :
            this.from != refCellInfo!.from ||
            this.fromLine != refCellInfo!.fromLine ||
            this.to != refCellInfo!.to ||
            this.toLine != refCellInfo!.toLine

        //------------------------------------
        // ref field
        //------------------------------------
        let refFieldInfo = refCellInfo !== null ? refCellInfo.fieldInfo : null
        if(fieldInfoParams !== undefined || refFieldInfo === null) {
            if(fieldInfoParams === undefined) fieldInfoParams = {}
            this.fieldInfo = new FieldInfo(refFieldInfo, fieldInfoParams) 
        }
        else {
            this.fieldInfo = refFieldInfo
        }

        let statusChanged = refFieldInfo !== null ? this.fieldInfo.status != refFieldInfo.status : true
        let outputDisplayChanged = refFieldInfo !== null ? this.fieldInfo.outputDecoration != refFieldInfo.outputDecoration : true

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

export class FieldInfo {

    readonly id: string = "INVALID" //this used to be set in the constructor, but typescript doesn't acknowledge the current code
    readonly status: string
    
    //--------
    // code
    readonly docCode: string = "" //this used to be set in the constructor, but typescript doesn't acknowledge the current code
    readonly docVersion: number = 0 //this used to be set in the constructor, but typescript doesn't acknowledge the current code
    readonly modelCode: string | null = null
    readonly modelVersion: number = INVALID_VERSION_NUMBER
    readonly inputVersion: number = INVALID_VERSION_NUMBER
    //--------------
    // output data
    readonly errorInfo: ErrorInfoStruct | null = null
    readonly varInfo: VarInfo | null = null
    readonly outputVersion: number = INVALID_VERSION_NUMBER
    //--------------
    // output display
    readonly outputDisplay: OutputDisplay | null = null
    readonly outputDecoration: Decoration | null = null

    readonly instanceVersion: number

    constructor(refFieldInfo: FieldInfo | null, fieldInfoParams: FieldInfoParams) {

        if(refFieldInfo === null) {
            this.id = getId()
            this.instanceVersion = 1

            //require
            //from
            //fo
            //fromLine
            //toLine
            //docCode
            //docVersion
            //if(cellInfoParams.docVersion == undefined) throw new Error("Unexpected: doc version not set for new cellinfo")
        }
        else {
           Object.assign(this,refFieldInfo!)
           this.instanceVersion = refFieldInfo!.instanceVersion + 1
        }
        Object.assign(this,fieldInfoParams)

        this.status = determineStatus(this)
        let statusChanged = refFieldInfo === null ? true : 
            this.status !== refFieldInfo!.status

        //------------------------------------
        // handle display change
        //------------------------------------

        //we probably want to udpate how this is done - but this is from my old code
        if(this.outputDisplay !== null) this.outputDisplay.setFieldInfo(this)

        let outputChanged = fieldInfoParams.errorInfo !== undefined || fieldInfoParams.varInfo !== undefined || statusChanged
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


//====================================
// internal functions
//====================================

//for now we make a dummy id here
let nextId = 1
function getId() {
    return "l" + String(nextId++)
}

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