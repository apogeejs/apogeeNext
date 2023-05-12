import type { EditorState, ChangeSet, Text } from '@codemirror/state'
import { CellInfo, newCellInfo, updateCellInfoCode, remapCellInfo, cellInfoNeedsCreate } from "./CellInfo"

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
    remapLength?: number //I need this flag just for propogated cell info (but not parsed cell info)
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


