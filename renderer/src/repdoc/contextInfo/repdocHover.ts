/** This extension provides hover functionality for the editor. */

import { syntaxTree } from "@codemirror/language"
import { SyntaxNode } from "@lezer/common"
import { EditorView, Tooltip, hoverTooltip } from "@codemirror/view"
import { RValueStruct } from "../../session/sessionTypes"
import { getIdentifierNodeValue } from "./nodeValues"
import { getFullDisplay } from "../sessionData/displayValues"

//========================================================
// Hover Tooltip
//========================================================


export const repdocHover = hoverTooltip((view: EditorView, pos: number, side: 1|-1) => {
    let containingNode: SyntaxNode | null = syntaxTree(view.state).resolve(pos, side)
    if (containingNode !== null) {
        let nodeName = containingNode.name
        if (nodeName == "Identifier") {
            //use general var names
            let functionOnly = false //is this oko?
            let result = getIdentifierNodeValue(containingNode, view.state, functionOnly)
            if(result !== null) {
                return getTooltipInfo(result.name, result.valueData, containingNode.from, containingNode.to)
            }
        }
    }
    return null
})


function getTooltipInfo(varName: string, value: RValueStruct, startPos: number, endPos: number): Tooltip {
  return {
      pos: startPos,
      end: endPos,
      above: true,
      create(view: EditorView) {
          let dom = document.createElement("div")
          dom.appendChild(getFullDisplay(varName,value)) 
          return {dom}
      }
  }
}
