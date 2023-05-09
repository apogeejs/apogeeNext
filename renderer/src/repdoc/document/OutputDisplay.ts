/** This file contains a class to give the DOM element for a cell output display, which displays essentially
 * the console output for a cell inline with the document. */

import { WidgetType } from "@codemirror/view"
import { ErrorInfoStruct } from "../../session/sessionApi"
import { CellInfo } from "./CellInfo"

export default class OutputDisplay extends WidgetType {
    cellInfo: CellInfo
    activeStatus: string = ""
    activeErrorCount: number = 0
    activeConsoleCount: number = 0
    activePlotCount: number = 0
    activeValueCount: number = 0
    isVisible = false
    statusClass = "cm-outdisplay-clean"

    element: HTMLElement | null = null
    errorElement: HTMLElement | null = null
    consoleElement: HTMLElement | null = null
    plotsElement: HTMLElement | null = null

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
        this.consoleElement = null
        this.plotsElement = null
        this.clearActiveValues()
    }

    setCellInfo(cellInfo: CellInfo) {
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
        this.isVisible = (this.cellInfo.errorInfos.length > 0)||(this.cellInfo.consoleLines.length > 0)||(this.cellInfo.plots.length > 0)
        this.updateStatus()
        this.updateErrors()
        this.updateConsole()
        this.updatePlots()
    }

    toDOM() {
        if(this.element === null) {
            this.element = document.createElement("div")
            this.element.className = this.getCssName()
            this.updateStatus()

            this.errorElement = document.createElement("div")
            this.element.appendChild(this.errorElement)
            this.updateErrors()


            this.consoleElement = document.createElement("div")
            this.element.appendChild(this.consoleElement)
            this.updateConsole()

            this.plotsElement = document.createElement("div")
            this.element.appendChild(this.plotsElement)
            this.updatePlots()
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

    private updateErrors() {
        if(this.element !== null && (this.activeErrorCount !== 0 || this.cellInfo.errorInfos.length !== 0) ) {
            this.removeAllElements(this.errorElement)
            for(let index = 0; index < this.cellInfo.errorInfos.length; index++) {
                let spanElement = document.createElement("span")
                spanElement.className = "cm-rd-errText"
                spanElement.innerHTML = createErrorMessage(this.cellInfo.errorInfos[index])
                if(index > 0) {
                    this.errorElement!.appendChild(document.createElement("br"))
                }
                this.errorElement!.appendChild(spanElement)
            }
            this.activeErrorCount = this.cellInfo.errorInfos.length
        }
    }

    private updateConsole() {
        if(this.element !== null) {
            let index = 0
            if(this.activeConsoleCount < this.cellInfo.consoleLines.length) {
                index = this.activeConsoleCount
            }
            else if(this.activeConsoleCount != this.cellInfo.consoleLines.length) {
                index = 0
                this.removeAllElements(this.consoleElement)
            }
            else return

            for(; index < this.cellInfo.consoleLines.length; index++) {
                let spanElement = document.createElement("span")
                let msgType = this.cellInfo.consoleLines[index][0]
                spanElement.innerHTML = this.cellInfo.consoleLines[index][1]
                if(msgType == "stderr") {
                    spanElement.className = "cm-rd-errText"
                }
                else if(msgType == "stdwrn") {
                    spanElement.className = "cm-rd-wrnText"
                }
                else if(msgType == "stdmsg") {
                    spanElement.className = "cm-rd-msgText"
                }
                // else {
                //     spanElement.className = "cm-rd-outText"
                // }
                if(index > 0) {
                    this.consoleElement!.appendChild(document.createElement("br"))
                }
                this.consoleElement!.appendChild(spanElement)
            }
            this.activeConsoleCount = this.cellInfo.consoleLines.length
        }
    }

    private updatePlots() {
        if(this.element !== null) {
            let index = 0
            if(this.activePlotCount < this.cellInfo.plots.length) {
                index = this.activePlotCount
            }
            else if(this.activePlotCount != this.cellInfo.plots.length) {
                index = 0
                this.removeAllElements(this.plotsElement)
            }
            else return

            for(; index < this.cellInfo.plots.length; index++) {
                let plotElement = document.createElement("img")
                plotElement.src = "data:image/png;base64," + this.cellInfo.plots[index]
                if(index > 0) {
                    this.plotsElement!.appendChild(document.createElement("br"))
                }
                this.plotsElement!.appendChild(plotElement)
            }
            this.activePlotCount = this.cellInfo.plots.length
        }
    }

    // private updateValues() {
    //     //not implemented
    // }

    clearActiveValues() {
        this.activeStatus = ""
        this.activeConsoleCount = 0
        this.activePlotCount = 0
        this.activeValueCount = 0
    }

    removeAllElements(element:HTMLElement | null) {
        if(element !== null) {
            while(element.childElementCount > 0) {
                element.removeChild(element.lastChild!)
            }
        }
    }
}

function createErrorMessage(errorInfo: ErrorInfoStruct) {
    return `Error: ${errorInfo.msg}`
}
