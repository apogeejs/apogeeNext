import { KeyBinding } from "@codemirror/view"
import { StateCommand } from "@codemirror/state"
import { getAppFunctions, getSessionId } from "./editorConfig"

/// Command that implements deleting a pair of matching brackets when
/// the cursor is between them.
export const saveCommand: StateCommand = ({ state, dispatch }) => {
    if (state.readOnly) return false

    let appFunctions = getAppFunctions(state)
    let docSessionId = getSessionId(state)
    appFunctions.saveFile(docSessionId)
    
    console.log("Save done!")
    return true

}

/// Close-brackets related key bindings. Binds Backspace to
/// [`deleteBracketPair`](#autocomplete.deleteBracketPair).
export const editorKeymap: readonly KeyBinding[] = [
    { key: "Mod-s", run: saveCommand }
]