import { AppFunctions } from "../appTypes"
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

import { editorBaseTheme, customScrollerTheme } from "./editorBaseTheme";

//=======================
// exports
//=======================

export function getEditorText(editor: Editor) {
    return (editor as EditorView).state.doc.sliceString(0)
}

export function destroyEditor(editor: Editor) {
    (editor as EditorView).destroy()
}

export function getEditor(docId: string, tabFunctions: AppFunctions, data: string, element: HTMLDivElement): Editor {
    initDoc(docId)
    let editor = new EditorView({
        doc: data,
        extensions: getExtensions(docId,tabFunctions),
        parent: element
    })
    return editor
}

/** retrieves editor extensions specific to the platform */
function getExtensions(docId: string, tabFunctions: AppFunctions) {
    let mainData = window.electronAPI.getMainData()
    let isMac = mainData !== undefined ? mainData.isMac : false

    return isMac ? [
        editorBaseTheme,
        setup,
        keymap.of(editorKeymap),
        AppFunctionsFacet.of(tabFunctions),
        IdFacet.of(docId),
        repdoc(),
        javascript(),
        docchangedextension(),
        oneDark
    ] : [
        editorBaseTheme,
        customScrollerTheme,
        setup,
        keymap.of(editorKeymap),
        AppFunctionsFacet.of(tabFunctions),
        IdFacet.of(docId),
        repdoc(),
        javascript(),
        docchangedextension(),
        oneDark
    ]

}


