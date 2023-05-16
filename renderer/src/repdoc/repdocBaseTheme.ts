//===================================
// Theme
//===================================

import {EditorView} from "@codemirror/view"



const outputBackground = "#303030",
outputBorder = "1px solid #606060",
dirtyCodeBackground = "#0d0e2f",
pendingCodeBackground = "#3a3417",
pendingOutputBackground = "#564a10",
pendingOutputOpacity = "0.5"

//-------------------
//repdoc specific
//-------------------

export const repdocBaseTheme = EditorView.baseTheme({

  //======================
  // Repdoc Display CSS
  //======================
  "&light .cm-rd-errText": {color: "red", fontWeight: "bold"},
  "&light .cm-rd-wrnText": {color: "orange", fontWeight: "bold"},
  "&light .cm-rd-msgText": {color: "blue"},
  "&dark .cm-rd-errText": {color: "red", fontWeight: "bold"},
  "&dark .cm-rd-wrnText": {color: "orange", fontWeight: "bold"},
  "&dark .cm-rd-msgText": {color: "lightblue"},

  ".cm-rd-codeDirtyShade": {backgroundColor: dirtyCodeBackground},
  ".cm-rd-valuePendingShade": {backgroundColor: pendingCodeBackground},

  //=================
  // Output Display
  //=================

  ".cm-outputdisplay-base": {
    "border": outputBorder,
    "padding": "5px",
    "borderRadius": "3px",
    "marginRight": "5px" 
  },

  ".cm-outdisplay-code-dirty": {backgroundColor: outputBackground},
  ".cm-outdisplay-inputs-dirty": {backgroundColor: pendingOutputBackground, opacity: pendingOutputOpacity}, 
  ".cm-outdisplay-pending": {backgroundColor: pendingOutputBackground, opacity: pendingOutputOpacity},
  ".cm-outdisplay-clean": {backgroundColor: outputBackground},

})