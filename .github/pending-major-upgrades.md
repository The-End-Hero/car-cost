# 待处理的主版本升级

本文件由依赖巡检自动化维护。主版本（x）更新不会自动升级，需人工评估后再处理。

最后检查日期：2026-10-01

## typescript `~6.0.3` → `7.0.2`

| 项 | 内容 |
| --- | --- |
| 包名 | `typescript` |
| 当前版本 | 6.0.3（声明为 `~6.0.3`） |
| 最新版本 | 7.0.2 |
| 依赖类型 | devDependencies |
| 首次记录 | 2026-08-14 |
| 状态 | 暂缓 |

### 为何未自动升级

- 属于 **x 主版本** 更新（6 → 7），按策略不自动升级。
- TypeScript 7 将编译器移植为 Go 原生实现，并收紧/移除一批 6.x 已弃用的 `tsconfig` 选项；`strict`、`types`、`rootDir` 等默认值也与 6.x 不同。
- 7.0 尚未提供稳定的 Compiler API（计划 7.1）。`typescript-eslint`、Vite/插件等若通过 API 驱动编译器，可能需要 `@typescript/typescript6` 兼容层或等待生态跟进。
- 当前规格使用 `~`，即使出现 6.1.x 也不会自动跨次版本。

### 建议人工评估

1. 对照 [TypeScript 7.0 公告](https://devblogs.microsoft.com/typescript/announcing-typescript-7-0/) 与迁移指南，检查 `tsconfig.app.json` / `tsconfig.node.json` 中是否仍有 7.0 会报硬错误的选项。
2. 确认 `typescript-eslint`、`vite`、`@vitejs/plugin-react` 对 TypeScript 7 的支持情况。
3. 在独立分支将 `typescript` 升到 7.0.2，跑 `pnpm lint`、`pnpm test`、`pnpm build` 后再合入。

### 参考

- https://www.npmjs.com/package/typescript
- https://github.com/microsoft/typescript-go/releases/tag/typescript/v7.0.2

## @zumer/snapdom `^2.24.18` → `3.2.0`

| 项 | 内容 |
| --- | --- |
| 包名 | `@zumer/snapdom` |
| 当前版本 | 2.24.18（声明为 `^2.24.18`） |
| 最新版本 | 3.2.0 |
| 依赖类型 | dependencies |
| 首次记录 | 2026-10-01 |
| 状态 | 暂缓 |

### 为何未自动升级

- 属于 **x 主版本** 更新（2 → 3），按策略不自动升级。
- v3 为新的浏览器捕获引擎架构，API 与 v2 有差异（例如导出路径、`result.download` 参数形态、插件体系等）；官方提供 [v2 → v3 迁移指南](https://snapdom.dev/) 与独立 v2 文档。
- 项目内在 `src/pages/home/Home.tsx` 使用 `snapdom(element, options)` 与 `result.download({ filename })` 保存报表截图，升级需对照 v3 API 调整并回归截图样式（含 InputNumber suffix 防换行相关 CSS）。

### 建议人工评估

1. 阅读 snapdom v3 迁移说明与 [FEATURES.md](https://github.com/zumerlab/snapdom/blob/main/FEATURES.md)。
2. 在分支将依赖升至 `^3.2.0`，按 v3 改写 `handleSaveReport` 中的调用方式。
3. 在明暗主题下手动验证报表 PNG 导出尺寸与布局，再跑 `pnpm test`、`pnpm build`。

### 参考

- https://www.npmjs.com/package/@zumer/snapdom
- https://snapdom.dev/
- https://github.com/zumerlab/snapdom/tree/v2
