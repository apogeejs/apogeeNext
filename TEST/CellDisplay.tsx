// import CellInfo from "./CellInfo"
// import {WidgetType} from "@codemirror/view"
// import * as React from "react"
// import {createRoot} from "react-dom/client" 

// export default class CellDisplay extends WidgetType {
//     cellInfo: CellInfo

//     constructor(cellInfo: CellInfo) { 
//         super() 
//         this.cellInfo = cellInfo
//     }

//     eq(other: CellDisplay) { return (other.cellInfo.modelCode == this.cellInfo.modelCode) &&
//                                     (other.cellInfo.id == this.cellInfo.id) &&
//                                     (other.cellInfo.status == this.cellInfo.status) }

//     toDOM() {
//         let wrapper = document.createElement("div")

//         let backgroundColor = this.cellInfo.status == "code dirty" ? "beige" :
//                                 this.cellInfo.status == "inputs dirty" ? "lightblue" :
//                                 this.cellInfo.status == "value pending" ? "lightblue" : "white"
//         let border = "1px solid black"
//         let cellContent = this.cellInfo.id + ": " + (this.cellInfo.modelCode != null ? this.cellInfo.modelCode : "")

//         let rc = <div style={{backgroundColor: backgroundColor, border: border}}>
//             {cellContent}
//         </div>

//         let root = createRoot(wrapper)
//         root.render(rc)

//         return wrapper
//     }

//     ignoreEvent() { return true }
// }
