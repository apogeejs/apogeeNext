import {syntaxTree} from "@codemirror/language"
import {CompletionContext} from "@codemirror/autocomplete"
import { SyntaxNode, NodeType } from "@lezer/common"
import { getAutocomplete } from "../session/sessionApi"
import { getDocState } from "./interactiveCode"
import { getSessionId } from "../editor/editorConfig"
import CellInfo from "./CellInfo"

import {RLanguage} from "../../argonaut-lezer-r/src"

// const tagOptions = [
//   "constructor", "deprecated", "link", "param", "returns", "type"
// ].map(tag => ({label: "@" + tag, type: "keyword"}))

export const rsessioncompletions = RLanguage.data.of({
    autocomplete: getSessionAutocompletions
});

function getSessionAutocompletions(context: CompletionContext) {
  let containingNode: SyntaxNode | null = syntaxTree(context.state).resolve(context.pos,-1)
  if(containingNode !== null) {
    //check this is a symbol of interest
    if(isMemberSymbol(containingNode.type)) {
      let parentNode = containingNode.parent
      //check the chain up to the bineary expression we are checking
      if(parentNode !== null && parentNode.name == "MemberOp") {
        let grandParentNode = parentNode.parent
        if(grandParentNode !== null && grandParentNode.name == "BinaryExpr") {
          //get the expression/identifier on which member is called and get the complete line up the the current point
          let calleeNode = grandParentNode.firstChild
          if(calleeNode !== null) {
            let calleeText = context.state.doc.sliceString(calleeNode.from,calleeNode.to)
            let cellNode = getCellNode(grandParentNode)
            if(cellNode !== null) {
              let lineText = context.state.doc.sliceString(cellNode.from,containingNode.to)

              /////////////////////////////////////////////
              let sessionId = getSessionId(context.state)

              let docState = getDocState(context.state)
              let prevCellNode = cellNode.prevSibling
              let prevLineId: string | null = null
              if(prevCellNode !== null) {
                let prevCellInfo = docState.cellInfos.find(cellInfo => cellInfo.from == prevCellNode!.from)
                //DOH! I probably need to check if the new editor state matches the doc state 
                if(prevCellInfo !== undefined) {
                  if(isUpToDate(prevCellInfo)) {
                    prevLineId = prevCellInfo!.id
                  }
                  else {
                    //don't call autocomplete because the prev line is not up to date
                    return null
                  }
                }
                else {
                  //no autocomplete - prev line not found
                  return null
                }
              } 
              else {
                //use NULL for prev line id
              }

              /////////////////////////////////////////////////
              //check autocomplete here!
              return getAutocompleteResult(sessionId,prevLineId,calleeText,lineText,containingNode.to)
            }
          }
        }
      }
    }
  }
  return null
  // if (nodeBefore.name != "BlockComment" ||
  //     context.state.sliceDoc(nodeBefore.from, nodeBefore.from + 3) != "/**")
  //   return null
  // let textBefore = context.state.sliceDoc(nodeBefore.from, context.pos)
  // let tagBefore = /@\w*$/.exec(textBefore)
  // if (!tagBefore && !context.explicit) return null
  // return {
  //   from: tagBefore ? nodeBefore.from + tagBefore.index : context.pos,
  //   options: tagOptions,
  //   validFor: /^(@\w*)?$/
  // }
}

function isUpToDate(cellInfo: CellInfo) {
  return ( cellInfo.modelVersion >= cellInfo.docVersion &&
    cellInfo.outputVersion >= cellInfo.docVersion && 
    cellInfo.outputVersion >= cellInfo.inputVersion )
}

function getAutocompleteResult(docSessionId: string, prevLineId: string | null, calleeText: string, lineText: string, memberStartPosition: number) {
  console.log(`Check autocomplete: callee: ${calleeText}, line: ${lineText}`)
  return getAutocomplete(docSessionId,prevLineId!,calleeText,lineText).then( (data: any) => {
    if(data !== null && data.data !== null && data.data.result !== null && data.data.result.results !== null && data.data.result.results.length > 0) {
      let formattedOptions = data.data.result.results.map( (option: string) => {
        return {label: option, type: "Identifier"}
      })

      return {
        from: memberStartPosition,
        options: formattedOptions,
        validFor: /^(@\w*)?$/
      }
    }
    else {
      return null
    }
  })
  // return Promise.resolve({
  //   from: memberStartPosition,
  //   options: [
  //     {label: "a", type: "something"},
  //     {label: "bb", type: "something"},
  //     {label: "ccc", type: "something"}
  //   ],
  //   validFor: /^(@\w*)?$/
  // })
}

function isMemberSymbol(nodeType: NodeType) {
  return (nodeType.name == "$" || nodeType.name == "@" || nodeType.name == "::" || nodeType.name == ":::")
}


function isCell(nodeType: NodeType) {
  return nodeType.name == "Cell" || nodeType.name == "EndCell"  || nodeType.name == "EmptyCell" || nodeType.name == "EmptyEnd" //the last two will not happen here becoase of the resolve statement
}

function getCellNode(node: SyntaxNode | null) {
  while(node !== null) {
    if(isCell(node.type)) {
      return node
    }
    node = node.parent
  }
  return null
}