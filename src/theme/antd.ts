import { theme } from "antd";
import { DESIGN_TOKENS } from "./tokens";

/** 深色黑金主题；亮色仍用 defaultAlgorithm */
export const APP_ANTD_DARK_THEME = {
  algorithm: theme.darkAlgorithm,
  token: {
    colorBgBase: DESIGN_TOKENS.bgDeep,
    colorBgContainer: DESIGN_TOKENS.bgElevated,
    colorBgElevated: DESIGN_TOKENS.bgSurface,
    colorBorder: DESIGN_TOKENS.borderDefault,
    colorText: DESIGN_TOKENS.textPrimary,
    colorTextSecondary: DESIGN_TOKENS.textSecondary,
    colorTextTertiary: DESIGN_TOKENS.textTertiary,
    borderRadius: DESIGN_TOKENS.radius,
    colorPrimary: DESIGN_TOKENS.accent,
    colorLink: DESIGN_TOKENS.accent,
    fontFamily: "'Noto Sans SC', system-ui, -apple-system, sans-serif",
  },
  components: {
    Progress: {
      defaultColor: DESIGN_TOKENS.accent,
      remainingColor: "rgba(255, 255, 255, 0.12)",
    },
  },
};
