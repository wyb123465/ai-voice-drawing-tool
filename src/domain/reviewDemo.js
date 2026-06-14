const REVIEW_DEMO_STEPS = [
  {
    id: "scene",
    label: "复合场景",
    command: "画一个太阳，下面有两座山，山前面有一棵树"
  },
  {
    id: "title",
    label: "文字定位",
    command: "在左上角写上XEngineer"
  },
  {
    id: "background",
    label: "背景控制",
    command: "把背景改成浅蓝色"
  },
  {
    id: "red-circle",
    label: "红色圆",
    command: "画一个红色圆"
  },
  {
    id: "blue-circle",
    label: "蓝色圆",
    command: "画一个蓝色圆"
  },
  {
    id: "green-circle",
    label: "绿色圆",
    command: "画一个绿色圆"
  },
  {
    id: "ordinal-delete",
    label: "序号选择",
    command: "删除第二个圆"
  },
  {
    id: "llm-fallback",
    label: "云端兜底",
    command: "画一只猫"
  },
  {
    id: "undo",
    label: "撤销",
    command: "撤销上一步"
  },
  {
    id: "redo",
    label: "重做",
    command: "重做"
  },
  {
    id: "export",
    label: "导出",
    command: "导出图片"
  }
];

export function getReviewDemoSteps() {
  return REVIEW_DEMO_STEPS.map((step) => ({ ...step }));
}

export function getReviewDemoCommands() {
  return REVIEW_DEMO_STEPS.map((step) => step.command);
}
