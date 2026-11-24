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
    expect(APP_ANTD_DARK_THEME.token.colorBgContainer).toBe(
      DESIGN_TOKENS.bgElevated,
    );
    expect(APP_ANTD_DARK_THEME.token.colorBgElevated).toBe(
      DESIGN_TOKENS.bgSurface,
    );
    expect(APP_ANTD_DARK_THEME.token.colorBorder).toBe(
      DESIGN_TOKENS.borderDefault,
    );
    expect(APP_ANTD_DARK_THEME.token.colorPrimary).toBe(DESIGN_TOKENS.accent);
    expect(APP_ANTD_DARK_THEME.token.colorLink).toBe(DESIGN_TOKENS.accent);
    expect(APP_ANTD_DARK_THEME.token.colorText).toBe(DESIGN_TOKENS.textPrimary);
    expect(APP_ANTD_DARK_THEME.token.colorTextSecondary).toBe(
      DESIGN_TOKENS.textSecondary,
    );
    expect(APP_ANTD_DARK_THEME.token.colorTextTertiary).toBe(
      DESIGN_TOKENS.textTertiary,
    );
    expect(APP_ANTD_DARK_THEME.token.borderRadius).toBe(DESIGN_TOKENS.radius);
    expect(APP_ANTD_DARK_THEME.components.Progress.defaultColor).toBe(
      DESIGN_TOKENS.accent,
    );
    expect(APP_ANTD_DARK_THEME.components.Progress.remainingColor).toBe(
      "rgba(255, 255, 255, 0.12)",
    );
    expect(APP_ANTD_DARK_THEME.token.fontFamily).toContain("Noto Sans SC");
  });
});
