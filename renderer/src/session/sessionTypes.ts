



//TODO: FIX THIS FORMAT INTO A PROPER UNION!!!
//TODO: Update all the ! I put in this file because I didn't have the right union
export type RValueStruct = {
    fmt: string

    data?: any,
    names?: string[]
    colNames?: string[]
    rowNames?: string[]
    dimNames?: string[]
    dimLabels?: string[]
    colTypes?: string[]
    class?: string
    type?: string
    len?: number
    dim?: number[]
    atom?: string
    paramList?: string
    levels?: string[]
    lvlsLen?: number
    
}

export interface DocEnvUpdateData {
    lineId: string,
    cmdIndex: number,
    changes: {
        version: string,
        adds?: Record<string,RValueStruct>
        drops?: string[]
    }
}



export type PkgData = {
    name: string
    path: string
    var: Record<string,RValueStruct>
}

export type VarTable = {
    version: string,
    table: Record<string,RValueStruct>
}

export type CellEnv = Record<string, string>

export function getEmptyVarTable() {
    return {
        version: "",
        table: {}
    }
}

export const EMPTY_CELL_ENV: CellEnv = {}