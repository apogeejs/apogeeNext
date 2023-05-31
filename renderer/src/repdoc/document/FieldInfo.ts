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

export enum FieldAction {
    create,
    update,
    delete,
    keep
}

export interface FieldUpdateInfo {
    action: FieldAction
    fieldInfo?: FieldInfo
    fieldData?: FieldData
    id?: string //this is for create, if we want to set the ID
}

export function getFieldUpdateInfo(oldFieldInfo: FieldInfo, newFieldData: FieldData) {
    let oldFieldData = oldFieldInfo.docFieldData
    if(oldFieldData !== null && fieldDataEqual(oldFieldData,newFieldData)) {
        return {
            action: FieldAction.keep,
            fieldInfo: oldFieldInfo
        }
    }
    else {
        return {
            action: FieldAction.update,
            fieldInfo: oldFieldInfo,
            fieldData: newFieldData
        }
    }
}

function fieldDataEqual(fieldData1: FieldData, fieldData2: FieldData) {
    return fieldData1.valid == fieldData2.valid &&
        fieldData1.errorMsg == fieldData2.errorMsg &&
        fieldData1.fieldName == fieldData2.fieldName &&
        fieldData1.declarationType == fieldData2.declarationType &&
        fieldData1.paramList == fieldData2.paramList &&
        fieldData1.body == fieldData2.body &&
}

interface FieldInfoParams {
    // code
    docFieldData?: FieldData
    docVersion?: number
    modelFieldData?: FieldData | null
    modelVersion?: number
    inputVersion?: number
    //--------------
    // output
    errorInfo?: ErrorInfoStruct | null
    varInfo?: VarInfo | null
    outputVersion?: number
    fieldStatus?: string
    //--------------
    
}

export type FieldData = {
    valid: boolean,
    errorMsg?: string,
    declarationType: string,
    fieldName: string,
    paramList?: string
    body: string
    startPos: number
    endPos: number
}



export class FieldInfo {

    readonly id: string = "INVALID"
    readonly instanceVersion: number
    
    //--------
    // code
    // - change names? 
    // - for synchronous commands, the doc and model versions will be the same
    readonly docFieldData: FieldData | null = null
    readonly docVersion: number = INVALID_VERSION_NUMBER //version of 

    readonly modelFieldData: FieldData | null = null
    readonly modelVersion: number = INVALID_VERSION_NUMBER
    //--------------
    // output data
    // - out updates chage from fieldData or inputs 
    readonly errorInfo: ErrorInfoStruct | null = null
    readonly varInfo: VarInfo | null = null
    readonly outVersion: number = INVALID_VERSION_NUMBER
    readonly fieldStatus: string // this gives normal/pending/error/invalid
    //--------------
    // output display
    readonly outputDisplay: OutputDisplay | null = null
    readonly outputDecoration: Decoration | null = null 

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



//for now we make a dummy id here
let nextFieldInfoId = 1
function getId() {
    return "l" + String(nextFieldInfoId++)
}

function determineStatus(fieldInfo: FieldInfo) {
    if( fieldInfo.docVersion > fieldInfo.modelVersion ) return "code dirty"
    else if( fieldInfo.inputVersion > fieldInfo.outputVersion ) return "inputs dirty"
    else if( fieldInfo.modelVersion > fieldInfo.outputVersion ) return "value pending"
    else return "value clean"
}