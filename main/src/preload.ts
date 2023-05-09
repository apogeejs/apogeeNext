const {contextBridge, ipcRenderer} = require('electron')

//=========================
// Pass data from main
//=========================

let mainData: any

ipcRenderer.on('main-data', (event, dataFromMain) => {
	mainData = dataFromMain
});

//==========================
// apis
//==========================

contextBridge.exposeInMainWorld('openSaveApi', {
	saveFileAs: ( data: string, filePath: string) => ipcRenderer.invoke("fileAccess:saveFileAs",data,filePath),
	saveFile: ( data: string, filePath: string) => ipcRenderer.invoke("fileAccess:saveFile",data,filePath),
	openFile: () => ipcRenderer.invoke("fileAccess:openFile"),
})

contextBridge.exposeInMainWorld('dialogApi', {
	alertDialog: (body: string, type?: string, okText?: string) => ipcRenderer.invoke("dialog:alertDialog",body, type, okText),
	okCancelDialog: (body: string, type?: string, okText?: string, cancelText?: string) => ipcRenderer.invoke("dialog:okCancelDialog",body, type, okText, cancelText),
	messageDialog: (body: string, type: string, buttons: [string], defaultId?: number, cancelId?: number) => ipcRenderer.invoke("dialog:messageDialog",body, type, buttons, defaultId, cancelId),
	errorDialog: (title: string, body: string) => ipcRenderer.invoke("dialog:errorDialog",title, body)
})

contextBridge.exposeInMainWorld('forceCloseBrowserWindow', () => ipcRenderer.invoke('forceCloseBrowserWindow'))

contextBridge.exposeInMainWorld('utilApi', {
	getFilePath: relPath => ipcRenderer.invoke("utilapi:getfilepath",relPath)
	
})

contextBridge.exposeInMainWorld('electronAPI', {
	setPosition: (x, y) => {
		ipcRenderer.send('set-window-position', { x, y });
	},
	minimizeWindow: () => {
		ipcRenderer.send('minimize-window');
	},
	toggleMaximizeWindow: () => {
		ipcRenderer.send('toggle-maximize-window');
	},
	maximizeWindow: () => {
		ipcRenderer.send('maximize-window');
	},
	unmaximizeWindow: () => {
		ipcRenderer.send('unmaximize-window');
	},
	closeWindow: () => {
		ipcRenderer.send('close-window');
	},
	getMainData: () => mainData
});


