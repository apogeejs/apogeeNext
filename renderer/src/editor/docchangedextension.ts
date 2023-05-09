import { StateField} from '@codemirror/state'
import type { Extension } from '@codemirror/state'
import { getSessionId, getAppFunctions } from './editorConfig'

//===============================
// Repdoc Codemirror Extension
//===============================

export const OnChangeField = StateField.define<void>({
    create(editorState) {},
    update(dummy, transaction) {
        if(transaction.docChanged) {
            let appFunctions = getAppFunctions(transaction.state)
            appFunctions.onDocChanged(getSessionId(transaction.state))
        }
    }
})

export const docchangedextension = (): Extension => {
    return [
        OnChangeField
    ]
}

