/** This file provides functions to get display information for value objects from the session. */
import { RValueStruct } from "../../session/sessionTypes"

//TODO - cleanup type info and exclamation marks

interface LineInfo {
    dataLabel?: string
    data?: string
}

interface TableArgs {
    headerRows?: ( string | (string | null)[]) []
    headerCols?: ( string | (string | null)[]) []
    body: (number | string | boolean | null)[][]
    moreRows?: boolean
    moreCols?: boolean
    rowTypes: string | string[] //"character" | "numeric" | "integer" | "logical" | "complex"
    addedElements?: HTMLElement[] 
}

export function getShortDisplay(label: string, valueJson: RValueStruct): HTMLElement {
    let typeInfo: string | undefined
    let lineInfo: LineInfo | undefined

    switch(valueJson.fmt) {
        case "vector":
            typeInfo = getTypeInfoVector(valueJson)
            lineInfo = getVectorLineInfo(valueJson)
            break

        case "factor":
            typeInfo = getTypeInfoVector(valueJson)
            lineInfo = getFactorLineInfo(valueJson)
            break

        case "function":
            typeInfo = getTypeInfoFunction(valueJson)
            break

        case "matrix":
        case "array":
            typeInfo = getTypeInfoArray(valueJson)
            break

        case "list":
            typeInfo = getTypeInfoVector(valueJson)
            lineInfo = getListLineInfo(valueJson)
            break

        case "data.frame":
            typeInfo =  getTypeInfoDataFrame(valueJson)
            lineInfo = getDataFrameLineInfo(valueJson)
            break

        case "atomic":
        case "recursive":
        default:
            typeInfo = getTypeInfoOther(valueJson)
            break
    }

    return getOneLinerElement(label,typeInfo,lineInfo)
}

export function getFullDisplay(label: string, valueJson: RValueStruct): HTMLElement {
    let typeInfo: string | undefined
    let tableArgs: TableArgs | undefined
    let lineElements: HTMLElement[] | undefined
    switch(valueJson.fmt) {
        case "vector":
            typeInfo = getTypeInfoVector(valueJson)
            tableArgs = getVectorFullInfo(valueJson)
            break

        case "factor":
            typeInfo = getTypeInfoVector(valueJson)
            tableArgs = getFactorFullInfo(valueJson)
            lineElements = getFactorExtraElements(valueJson)
            break

        case "function":
            typeInfo = getTypeInfoFunction(valueJson)
            break

        case "matrix":
            typeInfo = getTypeInfoArray(valueJson)
            tableArgs = getMatrixFullInfo(valueJson)
            break

        case "array":
            typeInfo = getTypeInfoArray(valueJson)
            break

        case "list":
            typeInfo = getTypeInfoVector(valueJson)
            lineElements = getListExtraElements(valueJson)
            break

        case "data.frame":
            typeInfo = getTypeInfoDataFrame(valueJson)
            tableArgs = getDataFrameFullInfo(valueJson)
            break

        case "atomic":
        case "recursive":
        default:
            typeInfo = getTypeInfoOther(valueJson)
            break
    }

    return createFullElement(label,typeInfo,tableArgs,lineElements)
}

//================================
// Internal Functions
//================================

function getSerializedClass(valueJson: RValueStruct) {
    if(valueJson.class) return valueJson.class
    else if(valueJson.fmt == "vector") {
        return valueJson.type
    }
    else {
        return valueJson.fmt
    }
}

function getTypeInfoVector(valueJson: RValueStruct) {
    return `${getSerializedClass(valueJson)}[${valueJson.len}]`
}

function getTypeInfoArray(valueJson: RValueStruct) {
    return `${getSerializedClass(valueJson)} ${valueJson.type}[${valueJson.dim!.join(", ")}]`
}

function getTypeInfoDataFrame(valueJson: RValueStruct) {
    return `${getSerializedClass(valueJson)}[${valueJson.dim!.join(", ")}]`
}

function getTypeInfoFunction(valueJson: RValueStruct) {
    return `function${valueJson.paramList}`
}

function getTypeInfoOther(valueJson: RValueStruct) {
    return valueJson.class!
}

/** This creates a span element with the object name, type, dimension and optionally an a key-value pair */
function getOneLinerElement(label: string, typeInfo: string, lineInfo?: LineInfo) {
    let element = document.createElement("span")
    element.className = "cm-vd-wrapperSpan"

    let nameSpan = document.createElement("span")
    nameSpan.className = "cm-vd-varName"
    nameSpan.textContent = label + ":"
    element.appendChild(nameSpan)

    element.appendChild(document.createTextNode(" "))

    let typeSpan = document.createElement("span")
    typeSpan.className = "cm-vd-varType"
    typeSpan.textContent = typeInfo
    element.appendChild(typeSpan)

    if(lineInfo !== undefined) {
        if(lineInfo.dataLabel !== undefined) {
            element.appendChild(document.createTextNode(" "))

            let listLabelSpan = document.createElement("span")
            listLabelSpan.className = "cm-vd-shortKeyLabel cm-vd-notFirst"
            listLabelSpan.textContent = lineInfo.dataLabel + ":"
            element.appendChild(listLabelSpan)
        }
        if(lineInfo.data !== undefined) {
            element.appendChild(document.createTextNode(" "))

            let listValuesSpan = document.createElement("span")
            listValuesSpan.className = "cm-vd-shortKeyBody"
            listValuesSpan.textContent = lineInfo.data
            element.appendChild(listValuesSpan)
        }
    }

    return element
}

/** This creates a span element with a key-value pair */
function getKeyValueLineElement(label: string, data: string) {
    let element = document.createElement("span")
    element.className = "cm-vd-wrapperSpan"

    let labelSpan = document.createElement("span")
    labelSpan.className = "cm-vd-shortKeyLabel"
    labelSpan.textContent = label + ":"
    element.appendChild(labelSpan)

    element.appendChild(document.createTextNode(" "))

    let dataSpan = document.createElement("span")
    dataSpan.className = "cm-vd-shortKeyBody"
    dataSpan.textContent = data
    element.appendChild(dataSpan)
    
    return element
}

/** This creates a div element containing a full element value */
function createFullElement(label: string, typeInfo: string, tableArgs?: TableArgs, lineElements?: HTMLElement[]) {
    let element = document.createElement("div")
    element.className = "cm-vd-fullContainer"
    element.appendChild(getFullTitleElement(label, typeInfo))
    if(tableArgs !== undefined) {
        element.appendChild(createTable(tableArgs))
    } 
    if(lineElements !== undefined) {
        element.appendChild(getExtraElements(lineElements))
    }

    return element
}

function getFullTitleElement(label: string, typeInfo: string) {
    let element = document.createElement("div")
    element.className = "cm-vd-titleContainer"
    element.appendChild(getOneLinerElement(label, typeInfo))
    return element
}

function getExtraElements(lineElements: HTMLElement[]) {
    let element = document.createElement("div")
    element.className = "cm-vd-extraContainer"
    lineElements.forEach(lineElement => {
        let wrapperElement = document.createElement("div")
        wrapperElement.className = "cm-vd-linesContainer"
        wrapperElement.appendChild(lineElement)
        element.appendChild(wrapperElement)
    })
    return element
}


// let wrapperElement = document.createElement("div")
// wrapperElement.appendChild()
// wrapperElement.className = "cm-vd-lineElementsContainer"
// return wrapperElement

//element.className = "cm-vd-lineElementsContainer"
//return [element]

function createTable({headerRows, headerCols, body, moreRows, moreCols, rowTypes}: TableArgs) {
    const numberHeaderCols = (headerCols !== undefined) ? headerCols.length : 0
    const numberHeaderRows = (headerRows !== undefined) ? headerRows.length : 0
    const numBodyCols = body[0].length
    const numBodyRows = body.length 

    const headerRowCells = getHeaderCells(headerRows,true,numBodyCols,moreCols)
    const headerColCells = getHeaderCells(headerCols,false,numBodyRows,moreRows)

    const tableElement = document.createElement('table')
    tableElement.className = "cm-vd-varTable"

    //header rows
    headerRowCells.forEach( (headerRow: HTMLTableCellElement[],index: number) => {
        const row = document.createElement('tr')
        
        //corner cell
        if(index == 0 && numberHeaderCols > 0) {
            const cell = document.createElement('td')
            if(numberHeaderRows > 1) cell.rowSpan = numberHeaderRows
            if(numberHeaderCols > 1) cell.colSpan = numberHeaderCols
            cell.className = "cm-vd-tableCornerCell"
            row.appendChild(cell)
        }

        headerRow.forEach( (headerCell: HTMLTableCellElement) => {
            row.appendChild(headerCell)
        })

        tableElement.appendChild(row)
    })

    //body rows
    body.forEach( (bodyValueRow: (number | string | boolean | null)[], index: number) => {
        const row = document.createElement('tr')

        headerColCells.forEach( (headerColArray: HTMLTableCellElement[]) =>  {
            if(index < headerColArray.length) {
                row.appendChild(headerColArray[index])
            }
        })

        const rowType = Array.isArray(rowTypes) ? rowTypes[index] : rowTypes
        bodyValueRow.forEach( (bodyValue: (number | string | boolean | null),index: number) => {
            row.appendChild(getBodyCell(bodyValue,rowType))
        })

        if(index == 0 && moreCols) {
            const cell = document.createElement('td')
            cell.textContent = "..."
            cell.className = "cm-vd-tableValueCell"
            row.appendChild(cell)
        }

        tableElement.appendChild(row)
    })

    //"more" row - if applicable
    if(moreRows) {
        const row = document.createElement('tr')
        
        headerColCells.forEach( (headerColArray: HTMLTableCellElement[]) =>  {
            if(headerColArray.length == numBodyRows) {
                const cell = document.createElement('td')
                cell.textContent = "..."
                cell.className = "cm-vd-tableIndexCell"
                row.appendChild(cell)
            }
        })

        const cell = document.createElement('td')
        cell.textContent = "..."
        cell.className = "cm-vd-tableValueCell"
        row.appendChild(cell)

        tableElement.appendChild(row)
    }

    return tableElement

}

/** This allows for rows to be a single string or an array of strings/nulls. For any nulls, or is the
 * array is shorter than the length specified, the given index is printed instead
 * Theme styles used: "cm-vd-tableNameCell", "cm-vd-tableIndexCell" */
function getHeaderCells(headerEntryArray: ( string | (string | null)[]) [] | undefined,
        isRow: boolean, 
        dimLength: number, 
        incomplete: boolean | undefined): HTMLTableCellElement[][] {
    if(headerEntryArray === undefined) return []

    return headerEntryArray.map(headerEntry => {
        if(Array.isArray(headerEntry)) {
            //this is an array of names
            let cells: HTMLTableCellElement[] = []
            for(let i = 0; i < dimLength; i++) {
                let value = i < headerEntry.length ? headerEntry[i] : null
                const cell = document.createElement('td')
                if(value !== null) {
                    cell.textContent = value
                    cell.className = "cm-vd-tableNameCell"
                }
                else {
                    //we replace any missing name with an index
                    //this is good for name rows. Not good for var type rows.
                    //for those there should be no missing values.
                    cell.textContent = String(i+1)
                    cell.className = "cm-vd-tableIndexCell"
                }
                cells.push(cell)
            }
            if(incomplete) {
                //"..." entry
                const cell = document.createElement('td')
                cell.textContent = "..."
                cell.className = "cm-vd-tableIndexCell"
                cells.push(cell)
            }
            return cells
        }
        else {
            //this is a single name to span the whole row
            const cell = document.createElement('td')
            cell.textContent = headerEntry
            
            if(isRow) {
                cell.colSpan = dimLength + (incomplete ? 1 : 0) 
                cell.className = "cm-vd-tableNameCell"
            }
            else {
                cell.rowSpan = dimLength + (incomplete ? 1 : 0) 
                cell.className = "cm-vd-tableNameCell cm-vd-verticalText"
            }
            return [cell]
        }
    })
}

function getBodyCell(value: any, type: string) {
    const cell = document.createElement('td')
    if(value === null) {
        value = "NA"
    }
    else if(type == "character") {
        value = `"${value}"`
    }
    else if(type == "logical") {
        value = (value === true) ? "TRUE" : (value === false) ? "FALSE" : value
    }
    cell.textContent = value
    cell.className = "cm-vd-tableValueCell"
    return cell
}

//----------------------------
// Short Display
//----------------------------

function getVectorLineInfo(valueJson: RValueStruct) {
    let valueList = getListValue(valueJson.data,valueJson.len!)
    return {dataLabel: "Value",data: valueList}
}

function getFactorLineInfo(valueJson: RValueStruct) {
    let valueList = getListValue(valueJson.data,valueJson.len!)
    return {dataLabel: "Value",data: valueList}
}

function getListLineInfo(valueJson: RValueStruct) {
    if(valueJson.names === undefined) {
        return {data:"unnamed list"}
    }
    else { 
        let names = getNameListValue(valueJson.names,valueJson.len!)
        return {dataLabel: "Names",data: names}
    }
}

function getDataFrameLineInfo(valueJson: RValueStruct) {
    if(valueJson.colNames === undefined) {
        return {data:"unnamed columns"}
    }
    else { 
        let colNames = getNameListValue(valueJson.colNames,valueJson.dim![1])
        return {dataLabel: "Col names",data: colNames}
    }
}

function getListValue(listJson: any[], realLength: number) {
    let valueList = listJson.join("  ")
    if(listJson.length < realLength) {
        valueList += "..."
    }
    return valueList
}

function getNameListValue(nameListJson: string[],realLength: number) {
    let names = nameListJson.map((name: string) => (name !== "" && name !== null) ? name : "(no name)" ).join("  ")
    if(names.length <realLength) names += "..."
    return names
}

//----------------------------
// Full Display
//----------------------------

    // headerRows?: ( string | (string | null)[]) []
    // headerCols?: ( string | (string | null)[]) []
    // body: (number | string | boolean | null)[][]
    // moreRows?: boolean
    // moreCols?: boolean
    // type: "character" | "numeric" | "integer" | "logical" | "complex" 

function getVectorFullInfo(valueJson: RValueStruct) {
    let tableArgs: TableArgs = {
        body: [valueJson.data],
        moreCols: valueJson.len! > valueJson.data.length,
        rowTypes: valueJson.type!
    } 
    tableArgs.headerRows = (valueJson.names !== undefined) ? [valueJson.names] : [[]]
    return tableArgs
}

function getFactorFullInfo(valueJson: RValueStruct) {
    let tableArgs: TableArgs = {
        body: [valueJson.data],
        moreCols: valueJson.len! > valueJson.data.length,
        rowTypes: valueJson.type!
    } 
    tableArgs.headerRows = [[]] //this will label with index values
    return tableArgs
}

function getFactorExtraElements(valueJson: RValueStruct) {
    return [getKeyValueLineElement("Levels", getListValue(valueJson.levels!, valueJson.lvlsLen!))]
}

function getMatrixFullInfo(valueJson: RValueStruct) {
    let tableArgs: TableArgs = {
        body: valueJson.data,
        moreCols: valueJson.dim![1] > valueJson.data[0].length,
        moreRows: valueJson.dim![0] > valueJson.data.length,
        rowTypes: valueJson.type!
    }
    tableArgs.headerRows = []
    tableArgs.headerRows[0] = (valueJson.dimLabels != undefined && valueJson.dimLabels[1]) ?  valueJson.dimLabels[1] : "cols"
    tableArgs.headerRows[1] = (valueJson.dimNames != undefined && valueJson.dimNames.length > 1 && valueJson.dimNames[1] !== null) ? valueJson.dimNames[1] : []

    tableArgs.headerCols = []
    tableArgs.headerCols[0] = (valueJson.dimLabels != undefined && valueJson.dimLabels[0]) ?  valueJson.dimLabels[0] : "rows"
    tableArgs.headerCols[1] = (valueJson.dimNames != undefined && valueJson.dimNames.length > 0 && valueJson.dimNames[0] !== null ) ? valueJson.dimNames[0] : []
    
    return tableArgs
}

function getListExtraElements(valueJson: RValueStruct) {
    return valueJson.data.map( (dataElement: RValueStruct, index: number) => {
        let name = (valueJson.names !== undefined && valueJson.names.length > index) ? valueJson.names[index] : String(index + 1)
        if(name == '') name = String(index + 1)

        return getShortDisplay(name,dataElement)
    })
}

function getDataFrameFullInfo(valueJson: RValueStruct) {
    //We are plotting this TRANSPOSED, so data frame rows will be displayed as columns
    let tableArgs: TableArgs = {
        body: valueJson.data,
        moreCols: valueJson.dim![0] > valueJson.data[0].length,
        moreRows: valueJson.dim![1] > valueJson.data.length,
        rowTypes: valueJson.colTypes!
    }

    const dispColTypes = valueJson.colTypes!.map( typeName => {
        switch(typeName) {
            case "character": return "char"
            case "numeric": return "num"
            case "integer": return "int"
            case "logical": return "log"
            case "complex": return "cmplx"
            case "factor": return "fctr"
            default: return typeName
        }
    })

    tableArgs.headerRows = valueJson.rowNames !== undefined ? [valueJson.rowNames] : [[]]
    tableArgs.headerCols = valueJson.colNames !== undefined ? [valueJson.colNames,dispColTypes] : [[],dispColTypes]
    return tableArgs
}


