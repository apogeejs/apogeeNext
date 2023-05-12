/** This extension provides a code liniting extension for the editor. */

import {syntaxTree} from "@codemirror/language"
import { linter, Diagnostic } from "@codemirror/lint"
import { EditorState } from "@codemirror/state"
import { ErrorInfoStruct } from "../../session/sessionApi"
import { CellInfo } from "./CellInfo"
import { getDocState } from "./repdocState"

export const repdocLint = linter(view => {
  let diagnostics: Diagnostic[] = []

  let docState = getDocState(view.state)
  docState.cellInfos.forEach(cellInfo => {
    // cellInfo.errorInfos.forEach(errorInfo => {
    //   let pos = getPosition(view.state,cellInfo,errorInfo)
    //   diagnostics.push({
    //     from: pos,
    //     to: pos,
    //     severity: "error",
    //     message: errorInfo.msg,
    //   })
    // })
  })
  syntaxTree(view.state).cursor().iterate(node => {
    //don't mark node if it is too close to cursor
    if (node.name == "\u26A0") {
      diagnostics.push({
        from: node.from,
        to: node.to,
        severity: "error",
        message: "Preparser error",
      })
  }})
  return diagnostics
})

function getPosition(editorState: EditorState,cellInfo: CellInfo, errorInfo: ErrorInfoStruct) {
  return editorState.doc.line(cellInfo.fromLine + errorInfo.line - 1).from + (errorInfo.charNum - 1)
}