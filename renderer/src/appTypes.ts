

export type DocSession = {
    id: string
    lastSavedText?: string
    filePath?: string
    fileName: string
    fileExtension: string
    isDirty: boolean
    editor: Editor | null
}

export interface DocSessionUpdate {
    lastSavedText?: string
    filePath?: string
    fileName?: string
    fileExtension?: string
    isDirty?: boolean
}


export interface Editor {
    //getData: () => string,
    //destroy: () => void
}

export interface TabState {
    id: string
    label: string
    isDirty: boolean
    type: string
}

/** Note - we make tabId = docId. For now doc is the only tab. */
export interface AppFunctions {
    selectTab: (tabId: string) => void
    closeTab: (tabId: string) => void
    getTabElement: (tabId: string, tabFunctions: AppFunctions) => React.ReactNode,
    saveFile: (docId?: string, doSaveAs?: boolean) => Promise<boolean>,
    onDocChanged: (docId: string) => void
}
