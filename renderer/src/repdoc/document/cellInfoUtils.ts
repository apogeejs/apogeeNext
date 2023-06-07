/** This file contains a class which manages the state for a cell object. */
import {CellUpdateInfo, StatementUpdateInfo, CellInfo, StatementInfo, Action, StatementAction, getStatementId } from "./CellInfo"
import { DocState, findStatementInfo } from "./docState"
import type { EditorState } from '@codemirror/state'


/** This function creates a CellInfo object from a CellUpdateInfo. */
export function createCellInfos(editorState: EditorState, docState: DocState | undefined, cellUpdateInfos: CellUpdateInfo[], docVersion:number) {

    return cellUpdateInfos.map( cui => {
        switch(cui.action) {
            case Action.create: 
                //FOR NOW - STATEMENTS UPDATE INFO ARE ALL CREATE!!!
                if(cui.statementUpdateInfos === undefined) throw new Error("we require statement update infos here for now!")
                return newCellInfo(editorState,docState,cui.newFrom!,cui.newTo!,cui.newFromLine,cui.newToLine!,cui.codeText!,cui.statementUpdateInfos!,docVersion) 

            case Action.update: 
                //FOR NOW - STATEMENTS UDPATE INFOS INCLUDES ALL STATEMENTS, IN ORDER!!!
                if(cui.statementUpdateInfos === undefined) throw new Error("we require statement update infos here for now!")
                return updateCellInfoCode(editorState,docState,cui.cellInfo!,cui.newFrom!,cui.newTo!,cui.newFromLine,cui.newToLine!,cui.codeText!,cui.statementUpdateInfos!,docVersion) 

            case Action.remap: 
                //NO CHANGE TO STATEMENT UPDATE INFOS
                return remapCellInfo(editorState,cui.cellInfo!,cui.newFrom!,cui.newTo!,cui.newFromLine,cui.newToLine!,cui.statementUpdateInfos)

            case Action.reuse: 
                //NO CHANGE TO STATEMENT UPDATE INFOS
                return  cui.cellInfo!

            case Action.delete:
                throw new Error("Unexpected delete action")
        }
    })
}



/** This function creates a new cell */
export function newCellInfo(editorState: EditorState, docState: DocState | undefined,
    from: number,to: number, fromLine: number, toLine:number,
    docCode: string, 
    statementUpdateInfos: StatementUpdateInfo[], // FOR NOW, ALL CREATE!!!
    docVersion: number) {

let statementInfos: StatementInfo[] = makeStatementInfos(statementUpdateInfos,docState)

return new CellInfo(editorState,null,{from,to,fromLine,toLine,docCode,statementInfos,docVersion})
}

/** This function creates an updated cell for when the code changes. */
export function  updateCellInfoCode(editorState: EditorState, docState: DocState | undefined, cellInfo: CellInfo, 
    from: number, to:number, fromLine: number, toLine:number, 
    docCode: string, 
    statementUpdateInfos: StatementUpdateInfo[], //FOR NOW, ALL UPDATE AND ALIGNED WITH EXISTING!!!
    docVersion: number) {

let statementInfos: StatementInfo[] = makeStatementInfos(statementUpdateInfos,docState)

return new CellInfo(editorState,cellInfo,{from,to,fromLine,toLine,docCode,statementInfos,docVersion})
}

function makeStatementInfos(statementUpdateInfos: StatementUpdateInfo[], docState: DocState | undefined) {
return statementUpdateInfos.map(sui => {
    switch (sui.action) {
        case StatementAction.create: {
            return {
                id: sui.id !== undefined ? sui.id : getStatementId(),
                fromPos: sui.fromPos!,
                toPos: sui.toPos!,
                docCode: sui.docCode!,  
                isCode: sui.isCode!
            }
        }

        case StatementAction.update: {
            if(docState === undefined) throw new Error("Doc state missing when required!")
            let prevSi = findStatementInfo(docState, sui.id!)
            if(prevSi === undefined) throw new Error("Statement input to update not found!")
            return {
                id: sui.id!,
                fromPos: sui.fromPos !== undefined ? sui.fromPos : prevSi.fromPos,
                toPos: sui.toPos !== undefined ? sui.toPos : prevSi.toPos,
                docCode: sui.docCode !== undefined ? sui.docCode : prevSi.docCode,
                isCode: prevSi.isCode
            }

        }

        case StatementAction.remap: {
            if(docState === undefined) throw new Error("Doc state missing when required!")
            let prevSi = findStatementInfo(docState, sui.id!)
            if(prevSi === undefined) throw new Error("Statement input to update not found!")
            return {
                id: prevSi.id!,
                fromPos: sui.fromPos !== undefined ? sui.fromPos : prevSi.fromPos,
                toPos: sui.toPos !== undefined ? sui.toPos : prevSi.toPos,
                docCode: prevSi.docCode,
                isCode: prevSi.isCode
            }
        }

        case StatementAction.reuse: {
            if(docState === undefined) throw new Error("Doc state missing when required!")
            let prevSi = findStatementInfo(docState, sui.id!)
            if(prevSi === undefined) throw new Error("Statement input to update not found!")
            return prevSi
        }

        default:
            throw new Error("Unexpected statement update instruction type!")
    }
})
}

/** This function creates a remapped cell info for when only the position changes */
export function  remapCellInfo(editorState: EditorState, cellInfo: CellInfo, 
    from: number,to: number, fromLine: number, toLine:number,
    statementUpdateInfos: StatementUpdateInfo[]) {

let statementInfos: StatementInfo[] = statementUpdateInfos.map( (sui,index) => {
    let prevSi = cellInfo.statementInfos[index]  // we require alignment here for now!
    if(prevSi.id != sui.id) throw new Error("missalignment in statement info update!")
    return {
        id: sui.id,
        fromPos: sui.fromPos!,
        toPos: sui.toPos!,
        docCode: prevSi.docCode,
        isCode: prevSi.isCode
    }
})
return new CellInfo(editorState,cellInfo,{from,to,fromLine,toLine,statementInfos})
}