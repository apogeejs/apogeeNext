/** This file provides functions to give completion options based on nodes of the parsed document tree. */

import { SyntaxNode } from "@lezer/common"
import { EditorState } from "@codemirror/state"
import { getChildIndex, getPrevCellNode, getParentCellNodes } from "../nodeUtils"
import { getDocState } from "../document/repdocState"
import { cellInfoUpToDate, getCellInfoByFrom } from "../document/CellInfo"
import { getListNames } from "../sessionData/sessionValues"
import { getExprNodeValue } from "./nodeValues"

//ADD INFO AND DETAIL?
export type OptionsInfo = {
    useStdOptions: boolean,
    functionOnly?: boolean
    nonStdOptions?: OptionList
}

export type OptionList = {
    names: string[],
    typeInfo: string[] | string
}

const STANDARD_OPTIONS: OptionsInfo = {
    useStdOptions: true
}

const STANDARD_FUNCTION_OPTIONS: OptionsInfo = {
    useStdOptions: true,
    functionOnly: true
}


/** This returns the value object assocated with an identifier node, which can either
 * represent a variable directly or a child of a variable through an expression,
 * such as the $ expeession. 
 * It returns a vlue structure if the value can be determined and null if not */
export function getIdentifierNodeOptions(identifierNode: SyntaxNode, state: EditorState) {
    let parentNode = identifierNode.parent
    if(parentNode !== null) {
        let lookupFunc = parentToOptionsFuncMap[parentNode.name]
        if(lookupFunc) {
            return lookupFunc(identifierNode,state)
        } 
    }
    return null
}

export function getGlblStdComps(identifierNode: SyntaxNode, state: EditorState, functionOnly = false) {
    let cellNodes = getParentCellNodes(identifierNode)
    if (cellNodes.length == 1) {
        let cellNode = cellNodes[0]
        let docState = getDocState(state)

        //We only need to consider inputs. We don't predict outputs yet
        //if we have a LHS context completion, we might want different results?
        let prevCellNode = getPrevCellNode(cellNode)
        if(prevCellNode !== null) {
            //WE DON'T HANDLE FIRST LINE PROPERLY!
            let prevCellInfo = getCellInfoByFrom(prevCellNode.from, docState.cellInfos)
            if (prevCellInfo !== null && cellInfoUpToDate(prevCellInfo!)) {
                let names = Object.keys(prevCellInfo.cellEnv)
                let typeInfo = new Array(names.length).fill("variable")

                return {names, typeInfo}
            }
        }
    }
    return null
}

/** This map has the key value being a trigger node name string and a value being the 
 * option lookup function to get the completion options for the node after the trigger node.
 * The function should be passed the parent node that contains the trigger node, and the editor state. */
export const TRIGGER_FUNCTION_MAP: Record<string,OptionsLookupFunction> = {
    "$": getDollarChildOptions
}

//====================================================
// NODE VALUE LOOKUP FUNCTIONS
//====================================================

type OptionsLookupFunction = (identifierNode: SyntaxNode, state: EditorState) => OptionsInfo | null

/** STANDRD OPTIONS LOOKUP CASE - This flags the options for a standard variable */
function getStdOptions(identifierNode: SyntaxNode, state: EditorState) {
    return STANDARD_OPTIONS
}

/** STANDARD OPTIONS LOOKUP CASE, LIMITED TO FUNCTIONS */
function getStdFuncOptions(identifierNode: SyntaxNode, state: EditorState) {
    return STANDARD_FUNCTION_OPTIONS
}

/** STD CALL CASE II - This function takes an identifier node that appears inside an ArgValueNode. It checks if this is
 * a name node, for which it returns no value, or a "default" node, which returns an in-scope matching variable name, if applicable. */
function getArgValueNodeOptions(identifierNode: SyntaxNode, state: EditorState) {
    let childIndex = getChildIndex(identifierNode)
    if(childIndex == 0) {
        //ADD THE PARAMETER NAMES AS OPTIONS!!!
        return STANDARD_OPTIONS
    }
    
    //value node
    return STANDARD_OPTIONS
}

function getParamValueNodeOptions(identifierNode: SyntaxNode, state: EditorState) {
    let childIndex = getChildIndex(identifierNode)
    if(childIndex == 0) {
        //this is a parameter name
        return null
    }

    //otherwise, just return standard options for now
    //this should include the parameter names defined so far in the paremeter list
    return STANDARD_OPTIONS
}

function getDollarVarNodeOptions(identifierNode: SyntaxNode, state: EditorState) {
    let childIndex = getChildIndex(identifierNode)
    if(childIndex == 0) {
        //this is a parameter name
        return STANDARD_OPTIONS
    }
    else if(childIndex == 2) {
        return getDollarChildOptions(identifierNode.parent!,state)
    }
    return null
}

export function getDollarChildOptions(dollarExprNode: SyntaxNode, state: EditorState): OptionsInfo | null {
    let callerNode = dollarExprNode.firstChild
    if(callerNode !== null) {
        let callerValue = getExprNodeValue(callerNode, state)
        if(callerValue !== null) {
            let nameList = getListNames(callerValue!.valueData)
            if (nameList !== null) {
                return {
                    useStdOptions: false,
                    nonStdOptions: {
                        names: nameList,
                        typeInfo: "property"
                    }
                }
            }
        }
    }
    return null
}


/** ADD THIS */
function getNamespaceVarNodeOptions(identifierNode: SyntaxNode, state: EditorState) {
    return null
}  

/** ADD THIS */
function getSlotVarNodeOptions(identifierNode: SyntaxNode, state: EditorState) {
    return null
}


const parentToOptionsFuncMap: Record<string,OptionsLookupFunction> = {
    //identifier can be standard variable
    "UnaryExpr": getStdOptions,
    "BinaryExpr": getStdOptions,
    "ParenExpr": getStdOptions,
    "Block": getStdOptions,
    "IfExpr": getStdOptions,
    "RepeatExpr": getStdOptions,
    "WhileExpr": getStdOptions,
    "Cell": getStdOptions,
    "EndCell": getStdOptions,

    //StdCall
    //first identifier can be standard variable
    //other identifiers are in arg value - standard variables EXCEPT first node of three, which is a name
    "StdCall": getStdFuncOptions, //this will only be the function name
    "ArgValue":  getArgValueNodeOptions, //this is other elements in a StdCall

    //Brck and DblBrck
    //all as normal for now
    "BrckExpr": getStdOptions, //this will only be the variable being subset
    "DblBrckExpr": getStdOptions, //this will only be the variable being subset
    "SubsetArgValue": getStdOptions, //CHNAGE THIS??

    //FuncDef
    //FuncDef node: contains no identifier
    //Param list - Param Value contains name as first node (no value) and a next node is a normal expression
    "ParamValue": getParamValueNodeOptions, //this contains all identifiers for the function definition
    
    //Assign
    //Just provide standard options for input and output
    "AssignExpr": getStdOptions,

    //Dollar
    //The first node is a standard case, the second node is a child of the first node, as given by the name
    "DollarExpr": getDollarVarNodeOptions,

    //Namespsace
    //The first identifier is a package name. The second identifier is a member of the package.
    "NamespaceExpr": getNamespaceVarNodeOptions,
    
    //Slot expression
    "SlotExpr": getSlotVarNodeOptions

}

  


