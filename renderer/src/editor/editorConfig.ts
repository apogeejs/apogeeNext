import { AppFunctions } from "../appTypes"
import {Facet} from "@codemirror/state"
import type { EditorState } from '@codemirror/state'

//=========================
// App Functions
//=========================

export const AppFunctionsFacet = Facet.define<AppFunctions>({})

export function getAppFunctions(editorState: EditorState) {
    let values = editorState.facet(AppFunctionsFacet)
    if(values.length > 0) {
        return values[0]
     }
     else {
        throw new Error("Unexpected: Doc session Id missing!")
     }
}

//=========================
// Session ID
//=========================

//I don't quite know how this is supposed to work yet
export const IdFacet = Facet.define<string>({
    // combine: values => {
    //     if (values.length == 1) return values[0]
    //     else if (values.length > 1) throw new Error("Unexpected: multiple values for docSessionid!")
    //     else return ""
    // }
})

export function getSessionId(editorState: EditorState) {
    let values = editorState.facet(IdFacet)
    if(values.length > 0) {
        return values[0]
     }
     else {
        throw new Error("Unexpected: Doc session Id missing!")
     }
}