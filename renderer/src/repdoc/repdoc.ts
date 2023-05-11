/** This is the main file for the extensions that implements the repdoc functionality. */

import type { Extension} from '@codemirror/state'

import { repdocLint } from './document/repdocLint'
import { repdocState } from './document/repdocState'
import { repdocBaseTheme, customScrollerTheme } from './repdocBaseTheme'

/** This is the extension to interface with the reactive code model and display the output in the editor */
export const repdoc = (): Extension => {

    //For mac we use the native scroll bar. For others we use a custom scroll bar, with customScrollerTheme
    let mainData = window.electronAPI.getMainData()
    let isMac = mainData !== undefined ? mainData.isMac : false
    
    if(isMac) {
        return [
            repdocBaseTheme,
            repdocState,
            repdocLint
        ]
    }
    else {
        return [
            repdocBaseTheme,
            customScrollerTheme,
            repdocState,
            repdocLint
        ]
    }
}
