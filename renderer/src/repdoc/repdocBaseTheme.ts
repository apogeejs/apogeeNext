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

export const customScrollerTheme = EditorView.theme({
  "& .cm-scroller::-webkit-scrollbar": {
      "width": "20px",
  },
  ".cm-scroller::-webkit-scrollbar-corner": {
      "background": "rgba(0,0,0,0)"
  },
  "& .cm-scroller::-webkit-scrollbar-thumb": {
      "border-radius": "6px",
      "background-clip": "content-box",
      "min-width": "32px",
      "min-height": "32px",
      "border": "4px solid #393939",
      "background-color": "#424242"
  },
  ".cm-scroller::-webkit-scrollbar-track": {
      "background-color": "#1e1e1e"
  }
})

export const repdocBaseTheme = EditorView.baseTheme({

  "&": {height: "100%"},
  ".cm-scroller": {overflow: "auto"},

  //".cm-activeLine": {outline: "1px solid #808080", backgroundColor: "transparent"},

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