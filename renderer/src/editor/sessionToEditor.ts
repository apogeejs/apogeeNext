/** This file holds the code to link the session output back to the document editor. */

import { SessionOutputEvent } from "../session/sessionApi"
import { StateEffect } from '@codemirror/state'

//==============================
// Sesssion Event Processing
//==============================

export const sessionOutputEffect = StateEffect.define<[SessionOutputEvent]>()

/** This function dispatches a document transaction for a incoming session event. */
export function sessionOutputToEditorView(view: any, eventList: any) {
    if(view !== null) {
        let effects: StateEffect<any>[] = [sessionOutputEffect.of(eventList)]
        view.dispatch({effects: effects})
    }
}