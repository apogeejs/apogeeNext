import {parser} from "./syntax.grammar"
import {LRLanguage, LanguageSupport, indentNodeProp, foldNodeProp, foldInside, delimitedIndent} from "@codemirror/language"
import {styleTags, tags as t} from "@lezer/highlight"

export const RLanguage = LRLanguage.define({
  parser: parser.configure({
    props: [
      indentNodeProp.add({
        Block: delimitedIndent({closing: "}", align: false})
      }),
      foldNodeProp.add({
        Block: foldInside
      }),
      styleTags({
        //"if else repeat while function for in next break": t.keyword,
        "if else repeat while function for in next break": t.keyword,
        SpecialValue: t.literal,
        Numeric: t.float,
        Integer: t.integer,
        Complex: t.float,
        Logical: t.bool,
        Character: t.string,
        Comment: t.comment,
        Identifier: t.variableName
      })
    ]
  }),
  languageData: {
    commentTokens: {line: "#"},
    closeBrackets: {brackets: ["(", "[", "[[", "{", "'", '"', "`"]}
  }
})

export function rlangsupport() {
  return new LanguageSupport(RLanguage)
}


