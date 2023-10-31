"use client"
import peg from 'pegjs'
import { useRef } from 'react'
import Editor, {useMonaco} from '@monaco-editor/react';

const parser = peg.generate(`
{
  function buildBinaryExpr(head, tail) {
  	return tail.reduce(function(result, element) {
      return {
        type: "BinaryExpression",
        operator: element[0],
        left: result,
        right: element[1]
      };
    }, head);
  }
}

program = p:(binaryExpr/columnName/functionCallExpr) {
  return {
    type: "Script",
    body: [
      {
        type: "ExpressionStatement",
        expression: p,
      }
    ]
  }
}

functionCallExpr = fn:$chars beginBracket head:paramType? tail:(comma restP:paramType {return restP})* endBracket {
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
paramType = binaryExpr/string/number/columnName/functionCallExpr

// 二元表达式
binaryExpr = head:term tail:(("==" / ">" / "<" / "!=" / "<=" / ">=" / "+" / "-") term)* {
  console.log(tail)
  if (!tail.length) {
    return head
  }
  
  return buildBinaryExpr(head, tail)
}
term = head:factor tail:(("*" / "/") factor)* {
  if (!tail?.length) {
    return head
  }
  
  return buildBinaryExpr(head, tail)
}
factor = "(" b:binaryExpr ")" {
  return {
    type: "ParenthesisExpression",
    expression: b
  }
} / string/number/columnName/functionCallExpr
// end 二元表达式

parenthesisExpr = "(" b:binaryExpr ")" {
  return {
    type: "ParenthesisExpression",
    expression: b
  }
}
string = doubleQuotationMark s:chars doubleQuotationMark {
  return {
    type: "StringLiteral",
    value: s
  }
}
chars = c:[a-z\u4e00-\u9fa5]i+ {
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
    <Editor 
      height="90vh" 
      defaultLanguage="javascript"
      defaultValue='`金额`+(SUM(IF(`活动名称`=="办案计划书",`金额`))-AVG(IF(`活动名称`=="立案信息",`金额`)))*COUNT(IF(`活动名称`=="立案信息",`金额`))'
      onChange={handleChange}
      onMount={(editor) => editorRef.current = editor}
    />
  )
}
