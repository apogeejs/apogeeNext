/** This file holds the code completions extensions for repdoc */

import { RLanguage } from "../../../argonaut-lezer-r/src"
import { syntaxTree } from "@codemirror/language"
import { CompletionContext } from "@codemirror/autocomplete"
import { SyntaxNode } from "@lezer/common"
import { StateField } from "@codemirror/state"
import { OptionsInfo, TRIGGER_FUNCTION_MAP, getIdentifierNodeOptions, getGlblStdComps } from "./nodeOptions"
import { libCompletionVarNames, libCompletionVarTypes } from "../sessionData/sessionPackageData"



//=================================
// Fields and Contstants
//=================================

const KEYWORDS = ["if", "else", "for", "in", "while", "repeat", "function"]
const KEYWORD_TYPES = new Array(KEYWORDS.length).fill("keyword")

type CompletionCacheInfo = {
    useStdOptions: boolean,
    functionOnly?: boolean,
    from: number
}

let savedContext: CompletionContext | null
let savedData: CompletionCacheInfo | null

//=================================
// Completions Extensions
//=================================
export const mainCompletions = RLanguage.data.of({
    autocomplete: getMainCompletions
})
export const packageCompletions = RLanguage.data.of({
    autocomplete: getPkgCompletions
})
export const keywordCompletions = RLanguage.data.of({
    autocomplete: getKeywordCompletions
})

export const cleanupExtension = StateField.define<null>({
    create(editorState) {
        return null
    },

    update(docState, transaction) {
        savedContext = null
        savedData = null
       return null
    }
})

function getMainCompletions(context: CompletionContext) {
     //cache data for other completion calls 
     savedContext = context
     savedData = null
 
     let containingNode: SyntaxNode | null = syntaxTree(context.state).resolve(context.pos, -1)
     if (containingNode !== null) {
        let nodeName = containingNode.type.name
        let optionsInfo: OptionsInfo | null = null
        let startPos: number | undefined 

        let triggerFunction = TRIGGER_FUNCTION_MAP[nodeName]
        if(triggerFunction !== undefined) {
            //handle completions from "trigger nodes" (things like the "$" operator)
            let parentNode = containingNode.parent
            if(parentNode !== null) {
                optionsInfo = triggerFunction(parentNode!,context.state)
            }
            //start after the trigger node
            startPos = containingNode.to
        }
        else  if(nodeName == "Identifier") {
            //handle identifier node completions
            optionsInfo = getIdentifierNodeOptions(containingNode, context.state)
            //start at the start of the identifier node
            startPos = containingNode.from
        }
        
        //construct the completions
        if(optionsInfo != null) {
            if(optionsInfo.nonStdOptions !== undefined) {
                //TODO: NEED TO CHECK STD FLAG!!!
                let valueList = optionsInfo.nonStdOptions.names
                let valueTypeInfo = optionsInfo.nonStdOptions.typeInfo 
                return makeWordListResponse(valueList,valueTypeInfo,startPos!)
            }
            else if(optionsInfo.useStdOptions) {
                //--------------------------
                // this is cahced data
                //--------------------------
                savedData = {
                    useStdOptions: optionsInfo.useStdOptions,
                    functionOnly: optionsInfo.functionOnly,
                    from: startPos!
                }
                
                let optionList = getGlblStdComps(containingNode!, context.state, optionsInfo.functionOnly)
                if(optionList !== null) {
                    let valueList = optionList.names
                    let valueTypeInfo = optionList.typeInfo 
                    return makeWordListResponse(valueList,valueTypeInfo,startPos!)
                }
            }
        }
     }
     return undefined
}

function getPkgCompletions(context: CompletionContext) {
    if(libCompletionVarNames.length == 0) return undefined

    if(savedContext && context.state.doc == savedContext?.state.doc && context.pos == savedContext.pos) { 
        //TODO: IMPLEMENT FUNCTION OPTION!? 
        if(savedData && savedData.useStdOptions) {
            return makeWordListResponse(libCompletionVarNames, libCompletionVarTypes, savedData.from)
        }
    }
    else {
        return undefined
    }
}

function getKeywordCompletions(context: CompletionContext) {
    if(savedContext && context.state.doc == savedContext?.state.doc && context.pos == savedContext.pos) {
        //TODO: IMPLEMENT FUNCTION OPTION!? 
        if(savedData && savedData.useStdOptions) {
            return makeWordListResponse(KEYWORDS, KEYWORD_TYPES, savedData.from)
        }
    }
    else {
        return undefined
    }    
}

/** This makees a autocompletion word list
 * - valueList - the string values
 * - valueTypeInfo - this is either a single type or an array of types matching the value list
 * - startPos - where the identifier starts
 */
function makeWordListResponse(valueList: string[], valueTypeInfo: string | string[], startPos: number) {
    let wordOptions = valueList.map((value: string, index: number) => {
        let valueType = Array.isArray(valueTypeInfo) ? valueTypeInfo[index] : valueTypeInfo
        return { label: value, type: valueType }
    })
    return {
        from: startPos,
        options: wordOptions,
        validFor: /^[a-zA-Z][.0-9a-zA-Z]*$|^\.([\.a-zA-Z][\.0-9a-zA-Z]*)?$/ 
    }

    // this is checking if it is in a word: /^(\w)$/

    //note add detail and info:
    //detail could be the type and other into (appears in dropdown entry)
    //info could be a description (is an extension of dropdown entry)
}
