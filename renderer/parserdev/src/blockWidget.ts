import {syntaxTree} from "@codemirror/language"
import {EditorView, Decoration, DecorationSet} from "@codemirror/view"


import type { EditorState, Extension, Range } from '@codemirror/state'
import { RangeSet, StateField } from '@codemirror/state'


export const images = (): Extension => {

    const decorate = (state: EditorState) => {
        const widgets: Range<Decoration>[] = []

        let stack: any[] = []
        let prevTo = 0
        let parsedDocument = ""
        syntaxTree(state).iterate({
            enter: (node) => {
                let extra = ""
                prevTo = node.to

                while(stack.length > 0 && stack[stack.length - 1].to < node.to) {
                    let previous = stack[stack.length-1]
                    if(previous.childCount > 0) {
                        extra += ")"           
                    }
                    if([/*"Cell","SEndCell","BEndCell",*/"Block","Script"].indexOf(previous.name) >= 0) {
                        extra += "\n" + "    ".repeat(previous.blockDepth)
                    }
                    stack.pop()
                }

                let blockDepth
                if(stack.length > 0) {
                    let parent = stack[stack.length-1]
                    if(parent.childCount == 0) {
                        extra += "(" // first child, add paren
                    }
                        
                    if((parent.name == "Script")||(parent.name == "Block")) {
                        //increment block depth and add a newline 
                        blockDepth = parent.blockDepth + 1
                        extra += "\n" + "    ".repeat(blockDepth)
                    }
                    else {
                        blockDepth = parent.blockDepth
                        if(parent.childCount > 0) {
                            extra += ","
                        }
                    }

                    parent.childCount += 1
                }
                else {
                    blockDepth = 0
                }

                stack.push({
                    to: node.to,
                    childCount: 0,
                    name: node.name,
                    blockDepth: blockDepth
                    
                })
                parsedDocument += extra + node.name + `[${node.from},${node.to}]`
            }
        })

        while(stack.length > 0) {
            let parent = stack[stack.length-1]
            if([/*"Cell","SEndCell","BEndCell",*/"Block","Script"].indexOf(parent.name) >= 0) {
                parsedDocument += "\n" + "    ".repeat(parent.blockDepth)
            }
            if(parent.childCount > 0) {
                parsedDocument += ")" 
            }
            stack.pop()
        }

        console.log(">--------------------")
        console.log(parsedDocument)
        console.log("--------------------<")

        return widgets.length > 0 ? RangeSet.of(widgets) : Decoration.none
    }

    const imagesField = StateField.define<DecorationSet>({
        create(state) {
            return decorate(state)
        },
        update(images, transaction) {
            if (transaction.docChanged)
                return decorate(transaction.state)

            return images.map(transaction.changes)
        },
        provide(field) {
            return EditorView.decorations.from(field)
        },
    })

    return [
        imagesField,
    ]
}
