import { TabState, AppFunctions } from "../appTypes"
import { initDoc } from "../session/sessionApi"

import {EditorView, keymap} from "@codemirror/view"
import {oneDark} from "@codemirror/theme-one-dark"

import {setup} from "./setup"
import {javascript} from "../lang-javscript/lang-javascript"

import { repdoc } from "../repdoc/repdoc"
import { docchangedextension } from "./docchangedextension"
import { Editor } from "../appTypes"
import { AppFunctionsFacet, IdFacet } from "./editorConfig"
import { editorKeymap } from "./editorKeymap"

import { apogeeBaseTheme, customScrollerTheme } from "./apogeeBaseTheme";

//=======================
// exports
//=======================

export function getEditorText(editor: Editor) {
    return (editor as EditorView).state.doc.sliceString(0)
}

export function destroyEditor(editor: Editor) {
    (editor as EditorView).destroy()
}

export function getEditor(tabState: TabState, tabFunctions: AppFunctions, data: string, element: HTMLDivElement): Editor {
    initDoc(tabState.id)
    let editor = new EditorView({
        doc: data,
        extensions: [
            apogeeBaseTheme,
            customScrollerTheme,
            setup,
            keymap.of(editorKeymap),
            AppFunctionsFacet.of(tabFunctions),
            IdFacet.of(tabState.id),
            repdoc(),
            javascript(),
            docchangedextension(),
            oneDark
        ],
        parent: element
    })
    return editor
}


