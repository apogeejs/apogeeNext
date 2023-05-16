/** This is the main file for the extensions that implements the repdoc functionality. */

import type { Extension} from '@codemirror/state'

import { repdocLint } from './document/repdocLint'
import { repdocState } from './document/repdocState'
import { repdocBaseTheme } from './repdocBaseTheme'

/** This is the extension to interface with the reactive code model and display the output in the editor */
export const repdoc = (): Extension =>  [
    repdocBaseTheme,
    repdocState,
    repdocLint
]
