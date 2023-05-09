/** This file holds a cursor context extension, which gives context regarding the cursor position as a tooltip. */

import { SyntaxNode } from "@lezer/common"
import { syntaxTree } from "@codemirror/language"
import { EditorView, Tooltip, showTooltip } from "@codemirror/view"
import { EditorState, StateField } from "@codemirror/state"
import { isCellNode } from "../nodeUtils"
import { getIdentifierNodeValue } from "./nodeValues"
import { getFullDisplay } from "../sessionData/displayValues"

//========================================================
// Cursor Tooltip
//========================================================

type TooltipInfo = {
    name: string
    line: number
    tooltip: Tooltip
} 

export function repdocCursorContext() {
    return [cursorTooltipField/*, cursorTooltipBaseTheme*/]
}

const cursorTooltipBaseTheme = EditorView.baseTheme({
    ".cm-tooltip.cm-tooltip-cursor": {
        backgroundColor: "#66b",
        color: "white",
        border: "none",
        padding: "2px 7px",
        borderRadius: "4px",
        "& .cm-tooltip-arrow:before": {
            borderTopColor: "#66b"
        },
        "& .cm-tooltip-arrow:after": {
            borderTopColor: "transparent"
        }
    }
});

const cursorTooltipField = StateField.define<TooltipInfo | null>({
    create(state: EditorState) {
        return null 
    },

    update(tooltipInfo, tr) {
        if (tr.docChanged || tr.selection) {
            return getCursorTooltip(tooltipInfo,tr.state)
        }
        else {
            return tooltipInfo
        }
    },

    provide: f => showTooltip.computeN([f], state => {
        let tooltipInfo = state.field(f)
        return tooltipInfo ? [tooltipInfo.tooltip] : []
    })
})

function getCursorTooltip(tooltipInfo: TooltipInfo | null, state: EditorState): TooltipInfo | null {
    if(state.selection.main.empty) {
        let pos = state.selection.main.head
        let node: SyntaxNode | null = syntaxTree(state).resolve(pos, -1)
        while(node !== null && !isCellNode(node)) {
            if(node.name == "StdCall") {
                return getFuncSigTooltipInfo(node,tooltipInfo,state)
            }
            node = node.parent
        }
    }
    return null
}

function getFuncSigTooltipInfo(stdCallNode: SyntaxNode, tooltipInfo: TooltipInfo | null, state: EditorState) {
    let calleeNode = stdCallNode.firstChild
    //for now just do identifiers
    if(calleeNode !== null && calleeNode.name == "Identifier") {
        let name = state.doc.sliceString(calleeNode.from,calleeNode.to)
        let line = state.doc.lineAt(calleeNode.to).number
        if(tooltipInfo !== null && tooltipInfo.name == name && tooltipInfo.line == line) {
            //keep same tooltip
            return tooltipInfo
        }

        //new tooltip
        let functionOnly = true
        let result = getIdentifierNodeValue(calleeNode, state, functionOnly)
        if(result !== null && result.valueData.fmt == "function") {
            let tooltip =  {
                pos: calleeNode.from,
                above: true,
                strictSide: true,
                arrow: false,
                create: () => {
                    let dom = document.createElement("div")
                    dom.className = "cm-tooltip-cursor"
                    dom.appendChild(getFullDisplay(result!.name,result!.valueData)) 
                    return { dom }
                }
            }

            return { name, line, tooltip } 
        }
    }
    return null
}
