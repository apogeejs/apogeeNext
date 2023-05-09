import {rlangsupport} from "../../argonaut-lezer-r/src"
import { EditorView } from "@codemirror/view"
import { setup } from "./setup"

import { images } from "./blockWidget"


declare global {
    interface Window {
        view:any
    }
}

window.view = new EditorView({
    doc: 'while(TRUE) 5 + 6 * 5',
    extensions: [
        setup,
        images(),
        rlangsupport()
    ],
    parent: document.querySelector("#editorMD")!
});

