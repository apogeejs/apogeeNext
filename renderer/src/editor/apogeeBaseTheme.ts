//===================================
// Theme
//===================================

import {EditorView} from "@codemirror/view"

export const customScrollerTheme = EditorView.theme({
  "& .cm-scroller::-webkit-scrollbar": {
      "width": "20px",
  },
  ".cm-scroller::-webkit-scrollbar-corner": {
      "background": "rgba(0,0,0,0)"
  },
  "& .cm-scroller::-webkit-scrollbar-thumb": {
      "background-color": "#424242",  
      "border-radius": "6px",
      "border": "4px solid #393939",
      "background-clip": "content-box",
      "min-width": "32px",
      "min-height": "32px"
  },
  ".cm-scroller::-webkit-scrollbar-track": {
      "background-color": "#1e1e1e"
  },
})

export const apogeeBaseTheme = EditorView.baseTheme({
  "&": {height: "100%"},
  ".cm-scroller": {overflow: "auto"}
})