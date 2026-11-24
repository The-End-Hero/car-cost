/** 设计 token 单一数据源，与 index.css html.dark 变量保持一致 */
export const DESIGN_TOKENS = {
  bgDeep: "#0a0a0a",
  bgElevated: "#171512",
  bgSurface: "#201c16",
  borderDefault: "#3d3423",
  accent: "#d4af37",
  accentMuted: "rgba(212, 175, 55, 0.2)",
  textPrimary: "rgba(255, 255, 255, 0.85)",
  textSecondary: "rgba(255, 255, 255, 0.65)",
  textTertiary: "rgba(255, 255, 255, 0.45)",
  radius: 8,
  motionFast: "150ms",
  motionNormal: "250ms",
  motionEasing: "cubic-bezier(0.16, 1, 0.3, 1)",
} as const;
