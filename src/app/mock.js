export const functions = {
  SUM: {
    desc: "总和",
    params: [
      {
        name: "`列名`",
        valueType: { column: ["number"], constant: ["string"] },
        desc: "数值列",
      },
    ],
    result: { number: "single" },
  },
};
// 数据的改变
// 数据的增加

export const table = [
  { name: "column1", valueType: "number" },
  { name: "column2", valueType: "string" },
  { name: "column3", valueType: "number" },
  { name: "column4", valueType: "time" },
];
