"use client";
import peg from "pegjs";
import { useRef } from "react";
import Editor, { useMonaco } from "@monaco-editor/react";
import { table, functions } from "./mock";

const DATA_TYPE = {
  StringLiteral: "string",
  NumberLiteral: "number",
  ColumnLiteral: "column",
};

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
chars = c:[0-9a-z\u4e00-\u9fa5]i+ {
  return c.join("")
}
number = n:[0-9]+ {
  return {
    type: "NumberLiteral",
    value: Number(n.join("")),
  }
}
columnName = "\`" c:chars "\`" {

  const error = options.validateColumnName(c)
  if (error) {
    return expected(error)
  }
  
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
  `);

export const isNotTableColumnType = (columnName, columnTypes, table) => {
  return !table.some(
    (el) => el.name === columnName && columnTypes.includes(el.valueType)
  );
};

export const isNotTableColumnName = (columnName, table) => {
  return !table.some((el) => el.name === columnName);
};

export const isNotDefineDataType = (stringType, dataTypes) => {
  return !dataTypes.includes(stringType);
};

export const getParamLen = (params) => {
  return params.filter((el) => !el.optional).length;
};

export default function Home() {
  const monaco = useMonaco();
  const editorRef = useRef();
  function handleChange(value) {
    try {
      const res = parser.parse(value, {
        validateFunctionName(funName, params) {
          // 参数是否可选走长度校验

          console.log(funName, params, "params");
          if (!functions[funName]) {
            return `不存在函数${funName}`;
          }
          const paramLen = getParamLen(functions[funName].params);

          for (let i = 0; i < params.length; i++) {
            if (i + 1 > paramLen) {
              return `${funName}函数参数不超过${paramLen}个`;
            }

            const param = params[i];
            const columnTypes = functions[funName].params[i].valueType.column,
              constantTypes = functions[funName].params[i].valueType.constant;
            let isNotTrueType = false;
            if (columnTypes && constantTypes) {
              isNotTrueType =
                isNotTableColumnType(param.value, columnTypes, table) &&
                isNotDefineDataType(DATA_TYPE[param.type], constantTypes);
              if (isNotTrueType) {
                return `参数类型应该是column或者是${constantTypes.join(",")}`;
              }
            } else if (columnTypes) {
              isNotTrueType = isNotTableColumnType(
                param.value,
                columnTypes,
                table
              );
              if (isNotTrueType) {
                return `参数类型应该是column`;
              }
            } else {
              isNotTrueType = isNotDefineDataType(
                DATA_TYPE[param.type],
                constantTypes
              );
              if (isNotTrueType) {
                return `参数类型应该是${constantTypes.join(",")}`;
              }
            }
          }
        },
        validateColumnName(columnName) {
          if (isNotTableColumnName(columnName, table)) {
            return `没有该列名：${columnName}`;
          }
        },
      });
      console.log(res);
      monaco.editor.setModelMarkers(editorRef.current.getModel(), "owner", []);
    } catch (e) {
      monaco.editor.setModelMarkers(editorRef.current.getModel(), "owner", [
        {
          message: e.message,
          severity: monaco.MarkerSeverity.Error,
          startLineNumber: e.location.start.line,
          startColumn: e.location.start.column,
          endLineNumber: e.location.end.line,
          endColumn: e.location.end.column,
        },
      ]);
    }
  }

  return (
    <Editor
      height="90vh"
      defaultLanguage="javascript"
      // defaultValue='`金额`+(SUM(IF(`活动名称`=="办案计划书",`金额`))-AVG(IF(`活动名称`=="立案信息",`金额`)))*COUNT(IF(`活动名称`=="立案信息",`金额`))'
      onChange={handleChange}
      onMount={(editor) => (editorRef.current = editor)}
    />
  );
}
