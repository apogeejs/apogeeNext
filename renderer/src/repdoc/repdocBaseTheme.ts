//===================================
// Theme
//===================================

import {EditorView} from "@codemirror/view"

export const customScrollerTheme = EditorView.theme({
  "& .cm-scroller::-webkit-scrollbar": {
      "width": "20px",
  },
  //".cm-scroller::-webkit-scrollbar-corner": {
      //"background": "rgba(0,0,0,0)"
  //},
  "& .cm-scroller::-webkit-scrollbar-thumb": {
      //"background-color": "#424242",  
      "border-radius": "6px",
      //"border": "4px solid #393939",
      "background-clip": "content-box",
      "min-width": "32px",
      "min-height": "32px"
  },
  //".cm-scroller::-webkit-scrollbar-track": {
      //"background-color": "#1e1e1e"
  //},
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

  //=================
  // Output Display
  //=================

  ".cm-outputdisplay-base": {
    //"border": "1px solid #606060",
    "padding": "5px",
    "borderRadius": "3px",
    "marginRight": "5px" 
  },

  //==================
  // Var Display CSS
  //==================

  ".cm-vardisplay-main": { 
    "marginLeft": "15px",
    "paddingLeft": "5px",
    "paddingRight": "5px",
    "borderRadius": "3px",
    //"backgroundColor": "#303030",
    //"border": "1px solid #606060",
  },
  ".cm-vd-fullContainer": {
    "backgroundColor": "transparent"
  },

  ".cm-vd-wrapperSpan": {
    "fontFamily": "monospace",
  },

  ".cm-vd-varTable": {
    "borderCollapse": "collapse",
    "fontFamily": "monospace",
    "margin": "5px",
    //"outline": "1px solid #383838"
  },

  // ".cm-vd-varName": {
  //   "color": "#5294E2"
  // },
  // ".cm-vd-varType": {
  //   "color": "#A9A9F2"
  // },
  // ".cm-vd-shortKeyLabel": {
  //   "color": "#CCCCCC",
  // },
  ".cm-vd-notFirst": {
    "marginLeft": "5px"
  },
  ".cm-vd-shortKeyBody": {
    "marginLeft": "5px",
    //"color": "#FFFFFF",
  },

  ".cm-vd-titleContainer": {
    "margin": "5px",
  },
  ".cm-vd-extraContainer": {
    "margin": "5px",
    //"backgroundColor": "#383838"
  },
  ".cm-vd-linesContainer": {
    "padding": "5px",
  },

  ".cm-vd-tableNameCell": {
    "padding": "1px 3px",
    "textAlign": "center",
    //"color": "#888888",
    //"backgroundColor": "#383838"
  },
  ".cm-vd-verticalText": {
    "writingMode": "vertical-rl",
    "textOrientation": "upright"
  },
  ".cm-vd-tableIndexCell": {
    "padding": "1px 3px",
    "textAlign": "center",
    "fontStyle": "italic",
    //"color": "#888888",
    //"backgroundColor": "#383838"
  },
  ".cm-vd-tableCornerCell": {
    "padding": "1px 3px",
    //"backgroundColor": "#383838"
  },
  ".cm-vd-tableValueCell": {
    "padding": "2px 5px",
    "textAlign": "center",
    //"color": "#FFFFFF",
    //"backgroundColor": "transparent"
  }
})