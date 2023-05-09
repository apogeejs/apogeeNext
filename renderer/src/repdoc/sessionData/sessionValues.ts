/** This file provides functions to read data values from the document and cells in the document. */
import { RValueStruct, DocEnvUpdateData, VarTable, CellEnv } from "../../session/sessionTypes"

export function getUpdatedVarTable(varTable: VarTable, update: DocEnvUpdateData) {
    if(!update.changes) return varTable
    
    let newTable: Record<string,RValueStruct> = {}
    Object.assign(newTable,varTable.table)
    if(update.changes.adds !== undefined) {
        for(let key in update.changes.adds) {
            newTable[key] = update.changes.adds[key]
        }
    }
    if(update.changes.drops !== undefined) {
        update.changes.drops.forEach(key => delete newTable[key])
    }
    return {
        version: getVersion(update),
        table: newTable
    }
}

function getVersion(update: DocEnvUpdateData) {
    return update.lineId + "|" + update.cmdIndex
}

export function lookupDocValue(key: string, varTable: VarTable): RValueStruct | undefined {
    return varTable.table[key]
}

export function lookupCellValue(varName: string, cellEnv: CellEnv, varTable: VarTable, functionOnly: boolean): RValueStruct | undefined {
    let versionedVarName = cellEnv[varName]
    if (versionedVarName !== undefined) {
        let varValue = varTable.table[versionedVarName]
        if (varValue !== undefined && (!functionOnly || varValue.fmt == "function")) {
            return varValue
        }
    }
    return undefined
}

/** This gets the child names from a list-type object */
export function getListNames(callerValue: RValueStruct): string[] | null {
    if (callerValue.fmt == "list" && callerValue.names !== undefined) {
        return callerValue.names.filter((name: string) => name !== "")
    }
    else if (callerValue.fmt == "data.frame" && callerValue.colNames !== undefined) {
        return callerValue.colNames.filter((name: string) => name !== "")
    }
    return null
}
