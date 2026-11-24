# Dark Black-Gold Theme Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Keep car-cost light/dark switching; make dark mode use xi-desktop’s black-gold design tokens (CSS variables + Ant Design dark theme).

**Architecture:** Dark-only tokens live in `src/theme/tokens.ts` and are mirrored under `html.dark` in `index.css`. `APP_ANTD_DARK_THEME` maps those tokens into Ant Design; `ThemeProvider` applies it only when `isDark`. Light mode stays on stock `defaultAlgorithm`. Scattered `dark:` gray utilities and screenshot/chart hardcodes are retargeted to the same variables.

**Tech Stack:** React 19, Ant Design 6, Tailwind CSS 4, Zustand theme store (unchanged), Vitest (node).

**Spec:** `docs/superpowers/specs/2026-11-24-dark-black-gold-theme-design.md`

## Global Constraints

- Preserve light/dark toggle: do not remove `ThemeSwitch`, `useThemeMode`, Zustand persist, or `index.html` FOUC script.
- Dark palette values must match xi-desktop exactly: `bgDeep #0a0a0a`, `bgElevated #171512`, `bgSurface #201c16`, `borderDefault #3d3423`, `accent #d4af37`, `accentMuted rgba(212, 175, 55, 0.2)`, `textPrimary/Secondary/Tertiary` as in xi-desktop `DESIGN_TOKENS`.
- Ant Design dark `fontFamily` must stay car-cost’s Noto Sans SC stack (`'Noto Sans SC', system-ui, -apple-system, sans-serif`), not Inter.
- Vitest is node-only (`src/**/*.test.ts`); do not add React Testing Library for this plan.
- Do not create git commits unless the user explicitly asks.

## Review Focus

- Toggling to light still shows white body / default antd (no black-gold bleed).
- First paint with default dark still applies `html.dark` before React (FOUC script unchanged).
- URL `?theme=light` still overrides store and leaves light visuals.
- Snapdom export background in dark is `#0a0a0a`, not `#000000`.
- Primary / link / Progress accents in dark are `#d4af37`.

---

## File Structure

| File | Responsibility |
|------|----------------|
| `src/theme/tokens.ts` | SSOT for black-gold values (JS) |
| `src/theme/antd.ts` | `APP_ANTD_DARK_THEME` for ConfigProvider |
| `src/theme/tokens.test.ts` | Pin palette + antd mapping |
| `src/index.css` | `html.dark` CSS variables + body colors |
| `src/providers/ThemeProvider.tsx` | Wire dark theme object |
| `src/pages/home/Home.tsx` | Dark table/text utilities + snapdom bg |
| `src/components/Footer.tsx` | Dark secondary text via token var |

---

### Task 1: Design tokens + Ant Design dark theme

**Files:**
- Create: `src/theme/tokens.ts`
- Create: `src/theme/antd.ts`
- Create: `src/theme/tokens.test.ts`
- Modify: `src/providers/ThemeProvider.tsx`

**Interfaces:**
- Consumes: `antd` `theme.darkAlgorithm` / `theme.defaultAlgorithm`; `useThemeMode().isDark`
- Produces: `DESIGN_TOKENS` (const object); `APP_ANTD_DARK_THEME` (ConfigProvider `theme` prop shape)

- [ ] **Step 1: Write the failing test**

In `src/theme/tokens.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { DESIGN_TOKENS } from "./tokens";
import { APP_ANTD_DARK_THEME } from "./antd";

describe("DESIGN_TOKENS", () => {
  it("matches xi-desktop black-gold palette", () => {
    expect(DESIGN_TOKENS.bgDeep).toBe("#0a0a0a");
    expect(DESIGN_TOKENS.bgElevated).toBe("#171512");
    expect(DESIGN_TOKENS.bgSurface).toBe("#201c16");
    expect(DESIGN_TOKENS.borderDefault).toBe("#3d3423");
    expect(DESIGN_TOKENS.accent).toBe("#d4af37");
    expect(DESIGN_TOKENS.accentMuted).toBe("rgba(212, 175, 55, 0.2)");
    expect(DESIGN_TOKENS.textPrimary).toBe("rgba(255, 255, 255, 0.85)");
    expect(DESIGN_TOKENS.textSecondary).toBe("rgba(255, 255, 255, 0.65)");
    expect(DESIGN_TOKENS.textTertiary).toBe("rgba(255, 255, 255, 0.45)");
    expect(DESIGN_TOKENS.radius).toBe(8);
  });
});

describe("APP_ANTD_DARK_THEME", () => {
  it("maps DESIGN_TOKENS into antd dark tokens", () => {
    expect(APP_ANTD_DARK_THEME.token.colorBgBase).toBe(DESIGN_TOKENS.bgDeep);
    expect(APP_ANTD_DARK_THEME.token.colorBgContainer).toBe(DESIGN_TOKENS.bgElevated);
    expect(APP_ANTD_DARK_THEME.token.colorBgElevated).toBe(DESIGN_TOKENS.bgSurface);
    expect(APP_ANTD_DARK_THEME.token.colorBorder).toBe(DESIGN_TOKENS.borderDefault);
    expect(APP_ANTD_DARK_THEME.token.colorPrimary).toBe(DESIGN_TOKENS.accent);
    expect(APP_ANTD_DARK_THEME.token.colorLink).toBe(DESIGN_TOKENS.accent);
    expect(APP_ANTD_DARK_THEME.token.colorText).toBe(DESIGN_TOKENS.textPrimary);
    expect(APP_ANTD_DARK_THEME.token.colorTextSecondary).toBe(DESIGN_TOKENS.textSecondary);
    expect(APP_ANTD_DARK_THEME.token.colorTextTertiary).toBe(DESIGN_TOKENS.textTertiary);
    expect(APP_ANTD_DARK_THEME.token.borderRadius).toBe(DESIGN_TOKENS.radius);
    expect(APP_ANTD_DARK_THEME.components.Progress.defaultColor).toBe(DESIGN_TOKENS.accent);
    expect(APP_ANTD_DARK_THEME.components.Progress.remainingColor).toBe(
      "rgba(255, 255, 255, 0.12)",
    );
    expect(APP_ANTD_DARK_THEME.token.fontFamily).toContain("Noto Sans SC");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test -- src/theme/tokens.test.ts`
Expected: FAIL (module not found / export missing)

- [ ] **Step 3: Implement `DESIGN_TOKENS` and `APP_ANTD_DARK_THEME`**

- `tokens.ts`: export `DESIGN_TOKENS` with the values asserted above, plus `motionFast: '150ms'`, `motionNormal: '250ms'`, `motionEasing: 'cubic-bezier(0.16, 1, 0.3, 1)'` (same as xi-desktop).
- `antd.ts`: export `APP_ANTD_DARK_THEME` with `algorithm: theme.darkAlgorithm`, token mapping from `DESIGN_TOKENS`, Progress overrides as in the test; `fontFamily: "'Noto Sans SC', system-ui, -apple-system, sans-serif"`.

- [ ] **Step 4: Wire ThemeProvider**

In `ThemeProvider.tsx`, when `isDark` use `theme={APP_ANTD_DARK_THEME}`; when light use `theme={{ algorithm: antdTheme.defaultAlgorithm }}` only.

- [ ] **Step 5: Run test to verify it passes**

Run: `pnpm test -- src/theme/tokens.test.ts`
Expected: PASS

---

### Task 2: CSS variables under `html.dark`

**Files:**
- Modify: `src/index.css`

**Interfaces:**
- Consumes: same palette as `DESIGN_TOKENS` (manual mirror; no CSS-from-TS codegen)
- Produces: CSS custom properties on `html.dark`: `--bg-deep`, `--bg-elevated`, `--bg-surface`, `--border-default`, `--accent`, `--accent-muted`, `--text-primary`, `--text-secondary`, `--text-tertiary`, `--radius`, `--motion-fast`, `--motion-normal`, `--motion-easing`

- [ ] **Step 1: Add variables and retarget body**

Under `html.dark { ... }` define the CSS variables with the exact hex/rgba values from Task 1. Change `html.dark body` to:

```css
background-color: var(--bg-deep);
color: var(--text-primary);
```

Leave light `body` rules unchanged (`#ffffff` / `rgba(0, 0, 0, 0.88)`).

- [ ] **Step 2: Verify light body unchanged**

Confirm by reading `src/index.css`: light `body` still uses `#ffffff` and `rgba(0, 0, 0, 0.88)`; only `html.dark body` uses the new vars. (Manual check; no automated CSS test in this repo.)

---

### Task 3: Retarget dark hardcodes in Home + Footer

**Files:**
- Modify: `src/pages/home/Home.tsx`
- Modify: `src/components/Footer.tsx`
- Modify: `src/theme/tokens.test.ts` (add snapdom color constant export assertion if you extract one; optional)

**Interfaces:**
- Consumes: CSS vars `--bg-deep`, `--bg-elevated`, `--border-default`, `--text-secondary` / `--text-tertiary`
- Produces: dark UI surfaces that read from the same palette as Task 1–2

- [ ] **Step 1: Update snapdom background**

In `Home.tsx`, change dark branch of `snapdom` `backgroundColor` from `"#000000"` to `DESIGN_TOKENS.bgDeep` (import from `@/theme/tokens`).

- [ ] **Step 2: Replace dark gray utilities**

In `Home.tsx` and `Footer.tsx`, replace deep-color Tailwind grays with token vars, for example:

- `dark:border-gray-600` → `dark:border-[var(--border-default)]`
- `dark:bg-gray-700` → `dark:bg-[var(--bg-elevated)]`
- `dark:text-gray-400` → `dark:text-[var(--text-tertiary)]` (or `--text-secondary` for slightly stronger secondary copy; pick tertiary for current `gray-400` role)

Do not change light-mode classes (`border-gray-300`, `bg-gray-100`, `text-gray-500`).

- [ ] **Step 3: ECharts**

Keep `echarts.init(..., isDark ? "dark" : undefined)`. If the chart canvas background clashes with `--bg-deep` after Task 1–2, set chart `backgroundColor` to `'transparent'` in both option builders (line + bar). Do not invent a full custom ECharts theme unless transparent is insufficient.

- [ ] **Step 4: Smoke check**

Run: `pnpm test` and `pnpm build`
Expected: all existing tests pass; TypeScript/Vite build succeeds.

---

## Spec coverage (self-review)

| Spec item | Task |
|-----------|------|
| `tokens.ts` SSOT | Task 1 |
| `antd.ts` dark theme | Task 1 |
| `ThemeProvider` dark-only injection | Task 1 |
| `html.dark` CSS vars + body | Task 2 |
| Home/Footer/snapdom hardcodes | Task 3 |
| Light untouched; switch/store/FOUC unchanged | Global Constraints + Task 1–2 |
| Progress accent | Task 1 |
| ECharts minimal follow | Task 3 |

## Review Focus → owning checks

| Focus | Check |
|-------|--------|
| Light no bleed | Task 2 Step 2 + ThemeProvider light branch |
| FOUC script | unchanged by plan (no edit) |
| `?theme=light` | unchanged hooks/store |
| Snapdom `#0a0a0a` | Task 3 Step 1 |
| Accent `#d4af37` | Task 1 test |
