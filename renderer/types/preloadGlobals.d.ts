export interface IRSessionApi {
  sendRpcRequest: (scope: string, method: string, params: Array<any>) => Promise<Object>
  getBinary: (fileName: string) => Promise<Object>
}

export interface IOpenSaveApi {
  saveFileAs: (data: string, filePath: string | undefined) => Promise<{filePath: string, fileName: string, fileExtension: string} | null>,
  saveFile: (data: string, filePath: string) => Promise<{filePath: string, fileName: string, fileExtension: string} | null>,
  openFile: () => Promise<{data: string, filePath: string, fileName: string, fileExtension: string} | null>,
}

export interface IDialogApi {
  alertDialog: (body: string, type?: string, okText?: string) => Promise<void>,
  okCancelDialog: (body: string, type?: string, okText?: string, cancelText?: string) => Promise<boolean>,
  messageDialog: (body: string, type: string, buttons: string[], defaultId?: number, cancelId?: number) => Promise<number>,
  errorDialog: (body: string, title?: string) => Promise<void>
}

export interface IUtilApi {
  getFilePath: (relPath: string) => Promise<string>
}

export interface IElectronAPI {
  setPosition: (newX: number, newY: number) => Promise<void>;
  minimizeWindow: () => Promise<void>;
  toggleMaximizeWindow: () => Promise<void>;
  maximizeWindow: () => Promise<void>;
  unmaximizeWindow: () => Promise<void>;
  closeWindow: () => Promise<void>;
  getMainData: () => any;
}


declare global {
  interface Window {
    rSessionApi: IRSessionApi,
    openSaveApi: IOpenSaveApi,
    dialogApi: IDialogApi,
    electronAPI: IElectronAPI
    forceCloseBrowserWindow: () => void
  }
}