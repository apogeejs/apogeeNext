import {app, BrowserWindow, ipcMain, nativeTheme} from 'electron'
import process from 'process'
import {saveFileAs, saveFile, openFile} from './fileAccess'
import {alertDialog, okCancelDialog, messageDialog, errorDialog} from './dialogs'
import path from 'path'

let windows = []

const APP_FILE = "./renderer/web/index.html"

//platform data
const isMac = process.platform === 'darwin'
const isWindows = process.platform === "win32"
const isOther = !isMac && !isWindows

//=============================================
// App/Electron Code
//=============================================

function createWindow(fileName) {
    let browserOptions: Electron.BrowserWindowConstructorOptions = {
        //Use custom title bar, with native control overlay
        width: 800, 
        height: 600,
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
			preload: path.join(__dirname, "preload.js")
        }
    }

    if(isWindows) {
        //Use custom title bar, with native control overlay
        browserOptions.titleBarStyle = 'hidden'
        browserOptions.titleBarOverlay = {
            color: '#3c3c3c',
            symbolColor: '#b9b9b9',
            //height: 60
        }
    }
    else if(isOther) {
        //linux/other - custom title bar
        browserOptions.frame = false
    }

    // Create the browser window.
    let win = new BrowserWindow(browserOptions)
    win.setMenu(null)

    // Open the DevTools.
    win.webContents.openDevTools() 

    //===================
    //send settings data
    //===================
    win.webContents.send('main-data',{
        isMac: isMac,
        isWindows: isWindows,
        isOther: isOther
    });

    // and load the index.html of the app.
    win.loadFile(fileName);  

    // Emitted when the window is closed.
    win.on('closed', () => {
        let index = windows.indexOf(win);
        windows.splice(index,1);
    })

    windows.push(win);

    win.on('unmaximize', () => {
        console.log("unmaximize!")
      });
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.on('ready', () => {

    ipcMain.handle('fileAccess:saveFileAs',saveFileAs)
    ipcMain.handle('fileAccess:saveFile',saveFile)
    ipcMain.handle('fileAccess:openFile',openFile)

    ipcMain.handle('dialog:alertDialog',alertDialog)
    ipcMain.handle('dialog:okCancelDialog',okCancelDialog)
    ipcMain.handle('dialog:messageDialog',messageDialog)
    ipcMain.handle('dialog:errorDialog',errorDialog)

    ipcMain.handle('forceCloseBrowserWindow',forceCloseBrowserWindow)

    ipcMain.handle('utilapi:getfilepath',getFilePath)

    ipcMain.on('set-window-position', (_, { x, y }) => {
        let win = windows[0]
        //note -this does't work. It doesn't seem to unmaximize while the user id dragging.
        // if (win.isMaximized()) {
        //     win.unmaximize()
        // }
        win.setPosition(x, y);
    });


    ipcMain.on('minimize-window', () => {
        let win = windows[0]
        win.minimize();
    });

    ipcMain.on('toggle-maximize-window', () => {
        let win = windows[0]
        if (win.isMaximized()) {
            win.unmaximize();
        } else {
            win.maximize();
        }
    });

    ipcMain.on('maximize-window', () => {
        let win = windows[0]
        if (!win.isMaximized()) {
            win.maximize();
        }
    });

    ipcMain.on('unmaximize-window', () => {
        let win = windows[0]
        if (win.isMaximized()) {
            win.unmaximize();
        }
    });

    ipcMain.on('close-window', () => {
        let win = windows[0]
        win.close();
    });

    //========================
    // mac theme handling
    //For always dark, do I need this?
    if(isMac) {
        ipcMain.handle('dark-mode:toggle', () => {
            // if (nativeTheme.shouldUseDarkColors) {
            //   nativeTheme.themeSource = 'light'
            // } else {
            //   nativeTheme.themeSource = 'dark'
            // }
            // return nativeTheme.shouldUseDarkColors
            return true;
        })
    }
    //===========================

    //========================
    // mac theme handling
    if(isMac) {
        nativeTheme.themeSource = 'dark'
    }
    //============================

    createWindow(APP_FILE)
})

// Quit when all windows are closed.
app.on('window-all-closed', () => {
    // On macOS it is common for applications and their menu bar
    // to stay active until the user quits explicitly with Cmd + Q
    if (!isMac) {
        app.quit()
    }
})

app.on('activate', () => {
    // On macOS it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (windows.length == 0) {
        createWindow(APP_FILE)
    }
})

function getFilePath(event: any,relPath: string) {
    return path.join(__dirname,relPath)
}

function forceCloseBrowserWindow(event: any) {
    if(event && event.sender && event.sender.destroy) event.sender.destroy()
}

