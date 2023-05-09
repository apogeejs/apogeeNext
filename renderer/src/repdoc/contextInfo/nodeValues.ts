/** This file provides functions to look up values based on parsed document nodes. */

import { SyntaxNode } from "@lezer/common"
import { EditorState } from "@codemirror/state"
import { RValueStruct } from "../../session/sessionTypes"
import { getParentCellNodes, getPrevCellNode, getChildIndex  } from "../nodeUtils"
import { getDocState } from "../document/repdocState"
import { cellInfoUpToDate, getCellInfoByFrom } from "../document/CellInfo"
import { lookupCellValue } from "../sessionData/sessionValues"
import { libVarData } from "../sessionData/sessionPackageData"

//========================================================
// Value Lookup Functions
//========================================================

/** This returns the value object assocated with an identifier node, which can either
 * represent a variable directly or a child of a variable through an expression,
 * such as the $ expeession. 
 * It returns a vlue structure if the value can be determined and null if not */
export function getIdentifierNodeValue(identifierNode: SyntaxNode, state: EditorState, functionOnly: boolean) {
    let parentNode = identifierNode.parent
    if(parentNode !== null) {
        let lookupFunc = parentToValueFuncMap[parentNode.name]
        if(lookupFunc) {
            return lookupFunc(identifierNode,state,functionOnly)
        } 
    }
    return null
}

/** This returns the value object associatee with an evaluated expression.
 * IMPLEMENT THIS!?
 */
export function getExprNodeValue(exprNode: SyntaxNode, state: EditorState, functionOnly = false) {
    if(exprNode.type.name == "Identifier") {
        return getIdentifierNodeValue(exprNode,state,functionOnly)
    }
    return null
}

//========================================================
// Internal Value Lookup Helper Functions
//========================================================

/** This function returns the value for the given variable name, where the variable is sourced from the "associatedNode". This
 * node should be the identifier giving the variable name, of an parent node up to the containing cell node. 
 * The functionOnly argument indicates if the return value should be limited to functions.
 * The fromInput argument indicates if the avlue should be taken from the cell inputs (as opposed to cell outputs). */
function getVarValueForCell(varName: string, associatedNode: SyntaxNode, state: EditorState, functionOnly=false, fromInput=true): RValueStruct | undefined {
    //ONLY IMPLMENTED FOR SCRIPT LEVEL CELL NODES AND THEIR DIRECT CHILDREN!
    let cellNodes = getParentCellNodes(associatedNode)
    if(cellNodes.length == 1) {
        let docState = getDocState(state)
        let cellNode = cellNodes[0]
        let lookupNode = fromInput ? getPrevCellNode(cellNode) : cellNode
        //NOTE - I NEED TO HANDLE FIRST LINE. IT WILL TAKE A DIFFERENT LOOKUP
        if(lookupNode !== null) {
            //lokup value from cell (must update when we process functions blocks)
            let reqCellInfo = getCellInfoByFrom(lookupNode.from, docState.cellInfos)
            if (reqCellInfo !== null && cellInfoUpToDate(reqCellInfo!)) {
                let varValue = lookupCellValue(varName, reqCellInfo.cellEnv, docState.varTable, functionOnly)
                if(varValue) {
                    return varValue
                }
            }

            //look up value from packages
            for(let i=0; i< libVarData.length; i++) {
                let varValue = libVarData[i].var[varName]
                if(varValue != undefined && (!functionOnly || varValue.fmt == "function")) {
                    return varValue
                }
            }

        }
    }

    return undefined
}

//====================================================
// NODE VALUE LOOKUP FUNCTIONS
//====================================================

type ValueLookupFunction = (identifierNode: SyntaxNode, state: EditorState, functionOnly: boolean) => {name: string, valueData: RValueStruct} | null


/** STANDRD VALUE LOOKUP CASE - This lookup takes an identifier node and returns the value of the variable with that name for that cell.
 * Optional flags:
 * - fromInput - If true, the variable value is read from the cell input. Otherwise the variable value is read from the cell output.
 * - functionOnly - The value for the name is restricted to being a function
 */
function getVarNodeValue(identifierNode: SyntaxNode, state: EditorState, functionOnly = false, fromInput = true) {
    let name = state.doc.sliceString(identifierNode.from,identifierNode.to)
    let valueData = getVarValueForCell(name, identifierNode, state, functionOnly, fromInput)
    if(valueData != undefined) {
        return {name, valueData}
    }
    return null
}

/** STD CALL CASE II - This function takes an identifier node that appears inside an ArgValueNode. It checks if this is
 * a name node, for which it returns no value, or a "default" node, which returns an in-scope matching variable name, if applicable. */
function getArgValueNodeValue(identifierNode: SyntaxNode, state: EditorState, functionOnly = false) {
    let childIndex = getChildIndex(identifierNode)
    if(childIndex == 0 && identifierNode.nextSibling !== null) {
        //name node
        return null
    }
    
    //value node
    return getVarNodeValue(identifierNode,state,functionOnly)
}

/** FUNCTION DEFINITION - This is an identifier that appears in a parameter list for a function definition. The first node
 * in a parameter value is a name node. The value of this comes from the calling function (call stack).
 * If there is a third node, it is a standard expression for a default value. It is evaluated in the function environment, not the
 * parent/cell environmment.
 * IMPLEMENT FIRST VALUE WHEN WE DIVE INTO FUNCTIONS.
 */
function getParamValueNodeValue(identifierNode: SyntaxNode, state: EditorState, functionOnly = false) {
    return null
}

/** ASSIGN EXPRESSION - This is for an identifier node in an assignment expression. It wil be looked up as a normal value, but from
 * two different places depending on the side of the assignment. The in or out side of the expression takes the value from the
 * in or out variables of the cell.
 * WE ARE NOT ACCOMODATING ASSIGNMENTS EMBEDDED INSIDE A CELL, such as x <- x + (x <- 10) + x.  In this case the value of x 
 * depends on where in the expression it is. Here, the last two instances of x take a value different from the cell in or out value.
 * FOR NOW we will return the wrong value here.
 * NOTE - We ignore the input value of fromInput. It is calculated based on the assign statement.
 */
function getAssignVarNodeValue(identifierNode: SyntaxNode, state: EditorState, functionOnly = false) {
    let childIndex = getChildIndex(identifierNode)
    let isLeftIdentifier = childIndex == 0
    let assignNode = isLeftIdentifier ? identifierNode.nextSibling : identifierNode.prevSibling
    if(assignNode === null) return null

    let assignChars = assignNode.type.name
    let isRhsOp = assignChars == "->" || assignChars == "->>" 

    let fromInput = (isLeftIdentifier == isRhsOp)
    return getVarNodeValue(identifierNode,state,functionOnly,fromInput)
}

/** DOLLAR EXPR - This returns the value for an identifier as it appears in a dollar expression. If it is the first
 * node, the nromal value will be returned. if it is the second node, it is the child of the value given by the first node.
 */
function getDollarVarNodeValue(identifierNode: SyntaxNode, state: EditorState, functionOnly = false) {
    let childIndex = getChildIndex(identifierNode)
    if(childIndex == 0) {
        //norm expression identifier
        return getVarNodeValue(identifierNode,state,functionOnly)
    }
    else if(childIndex == 3) {
        //ADD THIS WHEN WE IMPLMENET GET EXPR NODE VALUE
        // let exprNode = identifierNode.parent
        // if(exprNode !== null) {
        //     return getExprNodeValue(exprNode, state, fromInput, functionOnly)
        // }
    }
    return null
}
   
/** NAMESPACE EXPRESSION NODE - ADD THIS LATER */
function getNamespaceVarNodeValue(identifierNode: SyntaxNode, state: EditorState, functionOnly = false) {
    return null
}

/** SLOT EXPRESSION NODE - ADD THIS LATER */
function getSlotVarNodeValue(identifierNode: SyntaxNode, state: EditorState, functionOnly = false) {
    return null
}

const parentToValueFuncMap: Record<string,ValueLookupFunction> = {
    //identifier can be standard variable
    "UnaryExpr": getVarNodeValue,
    "BinaryExpr": getVarNodeValue,
    "ParenExpr": getVarNodeValue,
    "Block": getVarNodeValue,
    "IfExpr": getVarNodeValue,
    "RepeatExpr": getVarNodeValue,
    "WhileExpr": getVarNodeValue,
    "Cell": getVarNodeValue,
    "EndCell": getVarNodeValue,

    //StdCall
    //first identifier can be standard variable
    //other identifiers are in arg value - standard variables EXCEPT first node of three, which is a name
    "StdCall": getVarNodeValue, //this will only be the function name
    "ArgValue":  getArgValueNodeValue, //this is other elements in a StdCall

    //Brck and DblBrck
    //all as normal for now
    "BrckExpr": getVarNodeValue, //this will only be the variable being subset
    "DblBrckExpr": getVarNodeValue, //this will only be the variable being subset
    "SubsetArgValue": getVarNodeValue, //CHNAGE THIS??

    //FuncDef
    //FuncDef node: contains no identifier
    //Param list - Param Value contains name as first node (no value) and a next node is a normal expression
    "ParamValue": getParamValueNodeValue, //this contains all identifiers for the function definition
    
    //Assign
    //Both the first and third node can be normal variables, HOWEVER, the "out" side
    //gets the value from somwhere else. In a standard assing expression, the assign-to variable wil be
    //from the cell output. The assign=from side will be from the cell input. 
    //If we have a assignment embedded in the expression, it may be some intermediate value.
    //FOR NOW, we will assume the assign-to side reads the value read value from cell output and the
    //assign-from reads from cell input 
    "AssignExpr": getAssignVarNodeValue,

    //Dollar
    //The first node is a standard case, the second node is a child of the first node, as given by the name
    "DollarExpr": getDollarVarNodeValue,

    //Namespsace
    //The first identifier is a package name. The second identifier is a member of the package.
    "NamespaceExpr": getNamespaceVarNodeValue,
    
    //Slot expression
    "SlotExpr": getSlotVarNodeValue

}

  


