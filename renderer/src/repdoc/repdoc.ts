/** This is the main file for the extensions that implements the repdoc functionality. */

import type { Extension} from '@codemirror/state'

import { repdocLint } from './document/repdocLint'
import { mainCompletions, packageCompletions, keywordCompletions, cleanupExtension } from "./contextInfo/repdocCompletions"
import { repdocHover } from "./contextInfo/repdocHover"
import { repdocCursorContext } from "./contextInfo/repdocCursorContext"
import { repdocBaseTheme, customScrollerTheme } from "./repdocBaseTheme"

import { repdocState } from "./document/repdocState"

/** This is the extension to interface with the reactive code model and display the output in the editor */
export const repdoc = (): Extension => {

    //For mac we use the native scroll bar. For others we use a custom scroll bar, with customScrollerTheme
    let mainData = window.electronAPI.getMainData()
    let isMac = mainData !== undefined ? mainData.isMac : false
    
    if(isMac) {
        return [
            repdocBaseTheme,
            repdocState,
            repdocLint,
            mainCompletions,
            packageCompletions,
            keywordCompletions,
            repdocCursorContext(),
            repdocHover,
            cleanupExtension
        ]
    }
    else {
        return [
            repdocBaseTheme,
            customScrollerTheme,
            repdocState,
            repdocLint,
            mainCompletions,
            packageCompletions,
            keywordCompletions,
            repdocCursorContext(),
            repdocHover,
            cleanupExtension
        ]
    }
}
