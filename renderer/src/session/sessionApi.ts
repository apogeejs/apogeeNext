import { DocEnvUpdateData, RValueStruct, CellEnv, PkgData } from "./sessionTypes" 

const ERROR_REGEX = /^<text>:[0-9]?:[0-9]?:/

//===========================
// Type Definitions
//===========================

/** This is the format for a command argument in the function sendCmd and multiCmd */
export type CodeCommand = {
    type: string,
    lineId: string,
    code?: string,
    after?: number
}

export interface LineDisplayData  {
    label: string
    lookupKey?: string
    value?: RValueStruct
}

export type SessionOutputData = {
    newStatusUpdate?: boolean
    cellEvalStarted?: boolean
    addedConsoleLines?: [string,string][]
    addedPlots?: string[]
    addedValues?: string[]
    addedErrorInfos?: ErrorInfoStruct[]
    cellEvalCompleted?: boolean
    outputVersion?: number
    lineDisplayDatas?: LineDisplayData[]
    cellEnv?: CellEnv
    docEnvUpdate?: DocEnvUpdateData
    docEvalCompleted?: boolean
    nextLineIndex1?: number
}

//This is the line ID that is sent corresponding to a dos variable table update before any lines are added
export const PRE_LINE_ID = ""

//event messages to client
export type SessionOutputEvent = {
    session: string | null,
    lineId: string | null
    data: SessionOutputData,
    nextId?: string
}

export type ErrorInfoStruct = {
    line: number,
    charNum: number,
    msg: string
}

export type EventPayload = SessionOutputEvent[]  /* sessionOutput */ | 
                            PkgData  /* DOH! fix this*/ |
                            null /* initComplete */

type SessionLineInfo = {
    maxEvalLine1: number | null 
    pendingLineIndex1: number | null
    docSessionId: string 
}

//===========================
// Fields
//===========================



let listeners: Record<string,((eventName: string, data: any) => void)[]>  = {}

let sessionLineInfoMap: Record<string,SessionLineInfo> = {}

function addSessionLineInfo(docSessionId: string) {
    sessionLineInfoMap[docSessionId] = {
        docSessionId: docSessionId,
        maxEvalLine1:  null,
        pendingLineIndex1:  null
    }
}

//===========================
// Main Functions
//===========================

//CLIENT LISTENER

export function addEventListener(eventName: string, callback: (eventName: string, data: EventPayload) => void ) {
    let listenerList = listeners[eventName]
    if(listenerList === undefined) {
        listenerList = []
        listeners[eventName] = listenerList
    }
    listenerList.push(callback)
}


export function randomIdString() {
    //Make the biggest positive int random number possible (it doesn't have to be positive really)
    //and express it as a string in the largest base possible
    //Prefix with a letter ("f" for field) so we can use this as a field name symbol in R (as in data$f4j543k45) 
    return "f" + Math.floor(Math.random() * Number.MAX_SAFE_INTEGER).toString(32)
}

export function setMaxEvalLine1(docSessionId: string, maxLine1: number) {
    let sessionLineInfo = sessionLineInfoMap[docSessionId]
    if(sessionLineInfo !== undefined) {
        sessionLineInfo.maxEvalLine1 = maxLine1
        requestEvaluateSessionCheck(docSessionId)
    }
    else {
        console.log("Trying to set max eval line on unknown session: " + docSessionId)
    }
}

export function clearMaxEvalLine1(docSessionId: string) {
    let sessionLineInfo = sessionLineInfoMap[docSessionId]
    if(sessionLineInfo !== undefined) {
        sessionLineInfo.maxEvalLine1 = null
        requestEvaluateSessionCheck(docSessionId)
    }
    else {
        console.log("Trying to clear max eval line on unknown session: " + docSessionId)
    }
}


//---------------------------
// Commands
//---------------------------

//TODO - I need to work on session and cmd queue startup
//cmdQueue notes
// - One reason to do this is so I can decide to sent the eval cmd or just send a new cmd
// - There might also be trouble tracking cmds or sending too many to R (probably not that though)
// - I would like to merge multiple session cmds into one if they are in the queue
// - Right now it is not robust to failed commands - fix that!
// - I have to manage fialed commands better generally

export function initDoc(docSessionId: string) {
    addSessionLineInfo(docSessionId)
    //IMPLEMENT
}

export function closeDoc(docSessionId: string) {
    console.log("IMPLEMENT CLOSE DOC IN SessionApi!")
}

export function evaluateSessionCmds(docSessionId: string, cmds: CodeCommand[], cmdIndex: number) {
    //IMPLEMENT!
}


export function setActiveCell(docSessionId: string, prevLineId: string, force = false) {
    //DO WE NEED THIS?
}

                

//============================
// Internal Functions
//============================

function requestEvaluateSessionCheck(docSessionId: string) {
    // setTimeout(() => {
    //     //this code assumes pendingCommand will act in place of a evaluate command
    //     if( !pendingCommand && sessionEvaluateNeeded(docSessionId) ) {
    //         evaluateSessionUpdateImpl(docSessionId)
    //     }
    // },0)
}