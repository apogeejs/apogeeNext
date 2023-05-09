import { Decoration} from "@codemirror/view"
import type { Range } from '@codemirror/state'
import { RangeSet } from '@codemirror/state'
import { VarTable } from "../../session/sessionTypes" 
import { CellInfo, pushDecorations, isCodeDirty }  from "./CellInfo"

export type DocState = {
    docVersion: number
    cellInfos: CellInfo[]
    varTable: VarTable
    parseTreeCurrent: boolean
    hasParseErrors: boolean
    hasDirtyCells: boolean
    decorations: RangeSet<Decoration>
}

/** This function creates a docState object. */
export function createDocState(cellInfos: CellInfo[], varTable: VarTable, docVersion: number,parseTreeUsed: boolean, hasParseErrors: boolean): DocState {
    let decorations: Range<Decoration>[] = []
    if(cellInfos.length > 0) {
        cellInfos.forEach(cellInfo => pushDecorations(cellInfo,decorations))
    }

    return {
        docVersion: docVersion,
        cellInfos: cellInfos,
        varTable: varTable,
        parseTreeCurrent: parseTreeUsed,
        hasParseErrors: hasParseErrors,
        hasDirtyCells: cellInfos.some(cellInfo => isCodeDirty(cellInfo) ),
        decorations: (decorations.length > 0) ? 
            RangeSet.of(decorations) : Decoration.none
    }
}

