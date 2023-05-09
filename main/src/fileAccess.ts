/////////////////////////////////////////////////////////////////////////////////////////////////////

import {dialog} from 'electron'
import path from 'path'

//================================
// File Access API
//================================

export function saveFileAs(event: any, data: string, filePath: string | undefined) {
	let options = filePath !== undefined ? {defaultPath: filePath} : {}
	var fileSavePromise = dialog.showSaveDialog(options)
	return fileSavePromise.then( dialogResult => {
		if((!dialogResult.canceled)&&(dialogResult.filePath)) {
			const {writeFile} = require('node:fs/promises')
			return writeFile(dialogResult.filePath, data).then( data => {
				let filePath = dialogResult.filePath
				let fileName = path.basename(filePath)
				let fileExtension = path.extname(filePath)
				return {filePath,fileName,fileExtension}
			})
		}
		else {
			return Promise.resolve(null)
		}
	})
}

export function saveFile(event: any, data: string, filePath: string)  {
	const {writeFile} = require('node:fs/promises')
	return writeFile(filePath, data).then( data => {
		let fileName = path.basename(filePath)
		let fileExtension = path.extname(filePath)
		return {filePath,fileName,fileExtension}
	})
}


export function openFile(event: any) {
	var fileOpenPromise = dialog.showOpenDialog({properties: ['openFile']})
	return fileOpenPromise.then( fileOpenResult => {
		if((!fileOpenResult.canceled)&&(fileOpenResult.filePaths.length > 0)) {
			const filePath = fileOpenResult.filePaths[0]
			const {readFile} = require('node:fs/promises')
			return readFile(filePath,'utf8').then( data => {
				let fileName = path.basename(filePath)
				let fileExtension = path.extname(filePath)
				return {data, filePath,fileName,fileExtension}
			})
		}
		else {
			return Promise.resolve(null)
		}
	})	
}


