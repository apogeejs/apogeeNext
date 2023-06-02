/** This file contains a class to give the DOM element for a cell output display, which displays essentially
 * the console output for a cell inline with the document. */

import { WidgetType } from "@codemirror/view"
import { ErrorInfoStruct } from "../../session/sessionApi"
import { CellInfo } from "./CellInfo"

export default class OutputDisplay extends WidgetType {
    cellInfo: CellInfo
    activeStatus: string = ""
    isVisible = false
    statusClass = "cm-outdisplay-clean"

    element: HTMLElement | null = null
    errorElement: HTMLElement | null = null
    valueElement: HTMLElement | null = null

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
        console.log("OUTPUT DISPLAY DESTROYED!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!")
        this.element = null
        this.errorElement = null
        this.valueElement = null
        this.clearActiveValues()
    }

    setFieldInfo(cellInfo: CellInfo) {
        this.cellInfo = cellInfo
    }

    eq(other: OutputDisplay) { 
        return (other.cellInfo.id == this.cellInfo.id) &&
                (other.cellInfo.instanceVersion == this.cellInfo.instanceVersion)
    }

    ignoreEvent() { 
        return true 
    }

    update() {
        //////////////////
        this.isVisible = true
        //this.isVisible = (this.cellInfo.errorInfos.length > 0)||(this.cellInfo.consoleLines.length > 0)||(this.cellInfo.plots.length > 0)
        this.updateStatus()
        this.updateError()
        this.updateValue()
    }

    toDOM() {
        if(this.element === null) {
            this.element = document.createElement("div")
            this.element.className = this.getCssName()
            this.updateStatus()

            this.element.textContent = "Cell " + this.cellInfo.id

            this.errorElement = document.createElement("div")
            this.element.appendChild(this.errorElement)
            this.updateError()

            this.valueElement = document.createElement("div")
            this.element.appendChild(this.valueElement)
            this.updateValue()
        }
        return this.element
    }

    //==============================
    // Internal Methods
    //==============================
    
    private updateStatus() {
        if((this.element !== null)&&(this.activeStatus != this.cellInfo.status)) {
            this.activeStatus = this.cellInfo.status
            this.statusClass = this.activeStatus == "code dirty" ? "cm-outdisplay-code-dirty" :
                                    this.activeStatus == "inputs dirty" ? "cm-outdisplay-inputs-dirty" : 
                                    this.activeStatus == "value pending" ? "cm-outdisplay-pending" : "cm-outdisplay-clean"
                                     
            this.element!.className = this.getCssName() 
        }
    }

    private getCssName() {
        return "cm-outputdisplay-base " + this.statusClass
    }

    private updateError() {
        //display error!
    }

    private updateValue() {
        //display value!
    }


    clearActiveValues() {
        this.activeStatus = ""
    }

    removeAllElements(element:HTMLElement | null) {
        if(element !== null) {
            while(element.childElementCount > 0) {
                element.removeChild(element.lastChild!)
            }
        }
    }
}

