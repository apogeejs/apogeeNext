/** This file contains a class to give the DOM element for a cell variable display, which displays a single
 * line output for a cell/line , similar to what a debugger might do.. */

import {WidgetType} from "@codemirror/view"
import {getShortDisplay} from "../sessionData/displayValues"
//import {getFullDisplay} from "../sessionData/displayValues"
import { CellInfo } from "./CellInfo"

export default class VarDisplay extends WidgetType {
    cellInfo: CellInfo
    labelText: string = ""
    valueText: string = ""
    addedText: string = ""
    outputVersion: number = -1
    isVisible = false

    element: HTMLElement | null = null
    contentElement: HTMLElement | null = null

    //============================
    // Public Methods
    //============================

    constructor(cellInfo: CellInfo) { 
        super() 
        this.cellInfo = cellInfo
        this.clearActiveValues()
    }

    getIsVisible() {
        return this.isVisible
    }

    destroy(dom: HTMLElement): void {
        console.log("VAR DISPLAY DESTROYED!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!")
        this.element = null
        this.contentElement = null
        this.clearActiveValues()
    }

    setCellInfo(cellInfo: CellInfo) {
        this.cellInfo = cellInfo
    }

    eq(other: VarDisplay) { 
        return (other.cellInfo.id == this.cellInfo.id) &&
                (other.cellInfo.instanceVersion == this.cellInfo.instanceVersion)
    }

    ignoreEvent() { 
        return true 
    }

    update() {
        let varInfos = this.cellInfo.varInfos
        this.isVisible = varInfos !== null && varInfos.length > 0
        if((this.element !== null)&&(this.outputVersion != this.cellInfo.outputVersion)) {
            if(this.isVisible) {
                //only do first element for now
                let firstVar = varInfos![0]
                this.contentElement = getShortDisplay(firstVar.label,firstVar.value)
                //this.contentElement = getFullDisplay(firstVar.label,firstVar.value)

                if(this.contentElement !== null) {
                    while(this.element.firstChild) this.element.removeChild(this.element.firstChild)
                    this.element.appendChild(this.contentElement!)
                }
            }
            else {
                this.contentElement = null
            }
        }
    }

    toDOM() {
        if(this.element === null) {
            this.element = document.createElement("span")
            this.element.className = "cm-vardisplay-main"
            this.update()
        }
        return this.element
    }

    //==============================
    // Internal Methods
    //==============================

    clearActiveValues() {
        this.outputVersion = -1
    }

}