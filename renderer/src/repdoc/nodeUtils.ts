/** This document provides some utility functions for manipulating nodes of the parsed document tree. */

import { SyntaxNode, NodeProp } from "@lezer/common"

//========================================================
// Syntax Node Helper Functions
//========================================================

//------------------
// name based
//------------------

export function isContentCell(nodeName: string) {
    return nodeName == "Cell" || nodeName == "EndCell"
}

export function isEmptyCell(nodeName: string) {
    return nodeName == "EmptyCell" || nodeName == "EmptyEnd"
}

export function isCell(nodeName: string) {
    return nodeName == "Cell" || nodeName == "EndCell" || nodeName == "EmptyCell" || nodeName == "EmptyEnd"
}

//----------------
// node based
//----------------

export function isCellNode(node: SyntaxNode) {
    let groupVal = node.type.prop(NodeProp.group)
    return (groupVal && groupVal[0] == "cell")
}

/** This function gets the cell assocaited with the given node. The node may be a child
 * node of the cell or the cell node itself.  */
export function getAssociatedCellNode(node: SyntaxNode) {
    let cellNode: SyntaxNode | null = node
    while (cellNode !== null && !isCellNode(cellNode)) {
        cellNode = cellNode.parent
    }
    return cellNode
}

export function getPrevCellNode(cellNode: SyntaxNode) {
    //WILL BE NULL FOR FIRST LINE
    return cellNode.prevSibling
}

/** Returns the index of the child node in the parent. Returns -1 if the child is not in the parent. */
export function getChildIndex(childNode: SyntaxNode) {
    let parentNode = childNode.parent
    let childFrom = childNode.from
    if(parentNode !== null) {
        let sibling = parentNode.firstChild
        let index = 0
        while(sibling != null && sibling.from != childFrom) {
            index += 1
            sibling = sibling.nextSibling
        }
        if(sibling != null) {
            return index
        }
    }
    return -1
}

/** This function gets the cell assocaited with the given node. The node may be a child
 * node of the cell or the cell node itself.  */
export function getParentCellNodes(node: SyntaxNode | null) {
    let cellNodes: SyntaxNode[] = []
    while (node !== null) {
        if(isCellNode(node)) cellNodes.push(node)
        node = node.parent
    }
    return cellNodes
}
