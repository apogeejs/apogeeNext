import { dialog } from 'electron'

/** This shows a dialog with a single button, which defaults to "OK".
 * The type options are: "none", "info", "error", "question" (which won't make sense here) and "warning"
 */
export function alertDialog(event: any, body: string, type: string = "info", okText = "OK") {
    dialog.showMessageBox({message: body, type: type, buttons: [okText]})
}

/** This shows a dialog with two buttons, which defaults to "OK" and "Cancel".
 * The return value is true for the "OK" button and false for the "Cancel" button or any other response.
 * The type options are: "none", "info", "error", "question" (which won't make sense here) and "warning"
 */
export function okCancelDialog(event: any, body: string, type: string = "info", okText = "OK", cancelText = "Cancel") {
    return dialog.showMessageBox({message: body, type, buttons: [okText, cancelText], defaultId: 0, cancelId: 1}).
        then(result => result.response == 0 ? true : false)
}

/** This shows a dialog with a set of buttons buttons, The response is the index of the button selected.
 * The type options are: "none", "info", "error", "question" (which won't make sense here) and "warning"
 */
export function messageDialog(event: any, body: string, type: string, buttons: string[], defaultId: number, cancelId: number) {
    return dialog.showMessageBox({message: body, type, buttons, defaultId, cancelId}).
        then(result => result.response)
}

export function errorDialog(event: any, body: string, title: string = "Error!" ) {
    dialog.showErrorBox(title, body)
}