"use client"
import peg from 'pegjs'
import { useRef } from 'react'
import Editor, {useMonaco} from '@monaco-editor/react';

const parser = peg.generate(`
program = functionCall

functionCall = fn:$chars beginBracket head:paramType? tail:(comma restP:paramType {return restP})* endBracket {
  let params = ""
  const paramList = []
  if (head) {
    params += head
    paramList.push(head)
  }
  if (tail) {
    tail.forEach(s => {
      params += "," + s
      paramList.push(s)
    })
  }
  const error = options.validateFunctionName(fn, paramList)
  if (error) {
    return expected(error)
  }
  return {
    type: "CallExpression",
    callee: {
      type: "Identifier",
      value: fn
    },
    arguments: paramList
  }
}
paramType = binaryExpr/string/number/columnName/functionCall
binaryExpr = l:(string/number/columnName/functionCall) o:operType r:(string/number/columnName/functionCall) {
  return {
    type: "BinaryExpression",
    operator: o,
    left: l,
    right: r
  }
}
operType = "=="/">"/"<"/"!="/"<="/">="
string = doubleQuotationMark s:chars doubleQuotationMark {
  return {
    type: "StringLiteral",
    value: s
  }
}
chars = c:[a-z]i+ {
  return c.join("")
}
number = n:[0-9]+ {
  return {
    type: "NumberLiteral",
    value: Number(n.join("")),
  }
}
columnName = "\`" c:chars "\`" {
  return {
  	type: "ColumnLiteral",
    value: c
  }
}

doubleQuotationMark = '"'
beginBracket = '('
endBracket = ')'
beginBrace = '{'
endBrace = '}'
ws = " "
comma = ","
  `)
  
export default function Home() {
  const monaco = useMonaco()
  const editorRef = useRef()
  function handleChange(value) {
    try {
      const res = parser.parse(value, {
        validateFunctionName(funName, params) {
          console.log(funName, params)
          if (funName !== "ADD") {
            return "没有该函数"
          }
        }
      })
      console.log(res)
      monaco.editor.setModelMarkers(editorRef.current.getModel(), "owner", [])
    } catch(e) {
      monaco.editor.setModelMarkers(editorRef.current.getModel(), "owner", [{
        message: e.message,
				severity: monaco.MarkerSeverity.Error,
				startLineNumber: e.location.start.line,
				startColumn: e.location.start.column,
				endLineNumber: e.location.end.line,
				endColumn: e.location.end.column,
      }])
    }
  }

  return (
    <Editor height="90vh" defaultLanguage="javascript"
      onChange={handleChange}
      onMount={(editor) => editorRef.current = editor}
    />
  )
}
