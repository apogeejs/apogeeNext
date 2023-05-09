
// import {startListener,addListener,initDoc,addCmd,updateCmd,deleteCmd,evaluateCmd} from "../session/sessionApi"

// export function runTest() {
//     addListener("initComplete",onInitComplete)
//     addListener("stdout", onStdOut)
//     addListener("stderr", onStdErr)
//     addListener("plotReceived",onPlotReceived)
//     addListener("docStatus",onSessionMessage)
//     addListener("evalStart",onSessionMessage)
//     startListener()
// }

// function onStdOut(eventName: string, data: any) {
//     console.log("$$$$$$$$$$$$$$$$$$$$$$$$$$$$ CONSOLE:")
//     console.log(data)
// }

// function onStdErr(eventName: string, data: any) {
//     console.log("$$$$$$$$$$$$$$$$$$$$$$$$$$$$ ERROR:")
//     console.log(data)
// }

// function onPlotReceived(eventName: string, data: any) {
//     console.log("$$$$$$$$$$$$$$$$$$$$$$$$$$$$ PLOT:")
//     console.log(JSON.stringify(data,null,4))
// }

// function onInitComplete(eventName: string, data: any) {
//     console.log("$$$$$$$$$$$$$$$$$$$$$$$$$$$$ INIT COMPLETE")
//     console.log("Init complete!")
//     setTimeout(doTest,2000)
// }

// function onSessionMessage(eventName: string, data: any) {
//     console.log("$$$$$$$$$$$$$$$$$$$$$$$$$$$$ SESSION MESSAGE")
//     console.log(JSON.stringify(data,null,4))
// }


// let index = 0
// let commands = [
//     () => initDoc("ds1"),
//     () => addCmd("ds1","l1","set.seed(123)",0),
//     () => addCmd("ds1","l2","n <- 100",1),
//     () => addCmd("ds1","l3","x <- rnorm(n)",2),
//     () => addCmd("ds1","l4","x",3),
//     () => addCmd("ds1","l5","hist(x)",4),
//     () => updateCmd("ds1","l2","n <- 10"),
//     () => evaluateCmd("ds1"),
//     () => evaluateCmd("ds1"),
//     () => evaluateCmd("ds1"),
//     () => evaluateCmd("ds1"),
//     () => deleteCmd("ds1","l1"),
//     () => evaluateCmd("ds1"),
//     () => evaluateCmd("ds1"),
//     () => evaluateCmd("ds1"),
//     () => evaluateCmd("ds1")
// ]

// function doTest() {
//     xcmd()
// }

// function xcmd() {
//     if(index < commands.length) {
//         console.log("Executing command: " + index)
//         commands[index]()
//         index++
//         setTimeout(xcmd,1000)
//     }
// }