/** This file contains a class to give the DOM element for a cell output display, which displays essentially
 * the console output for a cell inline with the document. */

import { WidgetType } from "@codemirror/view"
import { ErrorInfoStruct } from "../../session/sessionApi"
import { FieldInfo } from "./CellInfo"

export default class OutputDisplay extends WidgetType {
    fieldInfo: FieldInfo
    activeStatus: string = ""
    isVisible = false
    statusClass = "cm-outdisplay-clean"

    element: HTMLElement | null = null
    errorElement: HTMLElement | null = null
    valueElement: HTMLElement | null = null

    //============================
    // Public Methods
    //============================

    constructor(fieldInfo: FieldInfo) { 
        super() 
        this.fieldInfo = fieldInfo
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

    setFieldInfo(fieldInfo: FieldInfo) {
        this.fieldInfo = fieldInfo
    }

    eq(other: OutputDisplay) { 
        return (other.fieldInfo.id == this.fieldInfo.id) &&
                (other.fieldInfo.instanceVersion == this.fieldInfo.instanceVersion)
    }

    ignoreEvent() { 
        return true 
    }

    update() {
        //////////////////
        this.isVisible = true
        //this.isVisible = (this.fieldInfo.errorInfos.length > 0)||(this.fieldInfo.consoleLines.length > 0)||(this.fieldInfo.plots.length > 0)
        this.updateStatus()
        this.updateError()
        this.updateValue()
    }

    toDOM() {
        if(this.element === null) {
            this.element = document.createElement("div")
            this.element.className = this.getCssName()
            this.updateStatus()

            this.element.textContent = "Cell " + this.fieldInfo.id

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
        if((this.element !== null)&&(this.activeStatus != this.fieldInfo.status)) {
            this.activeStatus = this.fieldInfo.status
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

