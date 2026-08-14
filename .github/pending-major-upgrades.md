# 待处理的主版本升级

本文件由依赖巡检自动化维护。主版本（x）更新不会自动升级，需人工评估后再处理。

最后检查日期：2026-08-14

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
