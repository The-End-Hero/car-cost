# 车辆总拥有成本计算器

一款全面的车辆总拥有成本计算应用，帮助用户分析购车的真实财务成本。

[![English](https://img.shields.io/badge/-English-blue?style=flat-square)](README.md)

---

## 功能特点

### 成本分析
- **全面拥有成本** - 覆盖 3/5/8 年周期
- **折旧计算** - 包含电动车和燃油车参考数据
- **保险计算** - 含无赔款优待折扣（NCD）
- **能源费用** - 电费/油费追踪
- **每公里成本**明细

### 财务分析
- **现金流分析** - 详细追踪资金流出
- **机会成本模型** - 对比购车与投资回报
- **贷款分期** - 等额本息计算
- **期末贷款余额**
- **净财富影响**计算

### 可视化
- **财富曲线图** - 折线图展示财务状况变化
- **费用构成图** - 饼图展示费用分布
- **报告导出** - 将分析报告保存为 PNG 图片

---

## 技术栈

| 类别 | 技术 |
|----------------|-------------------|
| 框架 | React 19, TypeScript, Vite |
| UI | Ant Design 6, Tailwind CSS 4, ECharts 6 |
| 状态管理 | Zustand |
| 数学计算 | mathjs |
| 路由 | React Router 7 |

---

## 快速开始

```bash
# 安装依赖
pnpm install

# 启动开发服务器
pnpm dev

# 构建生产版本
pnpm build
```

---

## 项目结构

```
src/
├── main.tsx              # 入口文件
├── App.tsx               # 路由配置
├── pages/home/
│   └── Home.tsx          # 主计算器界面
├── components/
│   ├── ThemeSwitch.tsx   # 主题切换
│   └── Footer.tsx        # 页脚
├── utils/
│   ├── carCost.ts        # 拥有成本计算
│   └── carFinancialAnalyzer.ts  # 机会成本分析
└── providers/
    └── ThemeProvider.tsx # 主题配置
```
