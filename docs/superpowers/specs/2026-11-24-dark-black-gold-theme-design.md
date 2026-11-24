# 深色主题黑金化（方案 A）

## Intent

保留 car-cost 现有亮/暗切换；仅将深色视觉与 token 架构对齐 xi-desktop 的「黑金」暗色实现。

## Goals

- 深色模式下背景、边框、文字、主色与 xi-desktop 黑金一致
- 引入 `tokens.ts` + `html.dark` CSS 变量 + Ant Design dark token 映射（与 xi-desktop 同构）
- 亮色模式行为与视觉保持现状

## Non-goals

- 不做固定暗色、不移除 ThemeSwitch / URL / Zustand 切换
- 不重做亮色 token / 亮色 Ant Design 自定义
- 不引入 next-themes；不改 PWA `theme_color`（除非后续单独要求）

## Anti-goals

- 亮色被连带改坏或出现闪烁回归
- 只改 ConfigProvider、留下 body / 表格 / 图表 / 截图硬编码色不一致

## Constraints

- 继续用 `html.dark` class 驱动 Tailwind `dark:`
- 色值以 xi-desktop `DESIGN_TOKENS` / `:root` 为准（`#0a0a0a`、`#171512`、`#201c16`、`#3d3423`、`#d4af37` 等）
- Ant Design 6 + Tailwind v4 现有栈不变

## Approaches

| 方案 | 要点 | 取舍 |
|------|------|------|
| **A（已选）** | 仅 `html.dark` 挂黑金变量；dark 时注入自定义 antd token；亮色不动 | 对齐目标、改动面可控 |
| B | 整站双套 token，顺带清 `dark:` | 超出「只重做深色」 |
| C | 只改 ConfigProvider | 快但不彻底，硬编码色会漂移 |

选定 **A**，因目标明确为「保留切换 + 深色黑金」。

## Design

1. **新增** `src/theme/tokens.ts`：复制 xi-desktop `DESIGN_TOKENS`（色值、radius、motion）。
2. **新增** `src/theme/antd.ts`：导出 `APP_ANTD_DARK_THEME`（`darkAlgorithm` + token 映射，与 xi-desktop `antd.ts` 对齐）；亮色继续用默认 `defaultAlgorithm`（无自定义 token）。
3. **改** `src/index.css`：在 `html.dark` 定义黑金 CSS 变量；`html.dark body` 背景/文字改为 `var(--bg-deep)` / `var(--text-primary)`。
4. **改** `ThemeProvider`：`isDark` 时 `theme={APP_ANTD_DARK_THEME}`，否则仅 `defaultAlgorithm`。
5. **改零散深色硬编码**（最小必要）：
   - `Home.tsx` 截图背景：暗色用 `--bg-deep`（`#0a0a0a`），非纯黑
   - 表格/辅助文案的 `dark:border-gray-*` / `dark:bg-gray-*` / `dark:text-gray-*`：改为引用黑金变量（Tailwind 任意值或等价 class）
   - `Footer.tsx` 同上
   - ECharts：仍可用内置 `"dark"`，若背景与页面明显违和，再按 token 微调（实现时以肉眼一致为准）
6. **不改**：`useThemeMode`、`theme` store、`ThemeSwitch`、`index.html` 首屏脚本逻辑（仍默认 dark）。

## Builder calls

- Progress 等 antd 组件级覆盖：与 xi-desktop 一并带上（`Progress.defaultColor` 等），成本低、观感一致。
- ECharts 不强制自建完整主题；优先保证页面壳与 antd 一致，图表仅在必要处跟色。

## Approval

待确认后进入实现计划与编码。
