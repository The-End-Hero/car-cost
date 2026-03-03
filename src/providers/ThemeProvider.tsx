import { ConfigProvider, theme as antdTheme } from "antd";
import { useEffect } from "react";
import { useThemeStore } from "@/stores/theme";

const ANT_THEME_ATTR = "data-antd-theme";

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const mode = useThemeStore((s) => s.mode);

  useEffect(() => {
    document.documentElement.setAttribute(ANT_THEME_ATTR, mode);
    document.documentElement.classList.toggle("dark", mode === "dark");
  }, [mode]);

  return (
    <ConfigProvider
      theme={{
        algorithm:
          mode === "dark" ? antdTheme.darkAlgorithm : antdTheme.defaultAlgorithm,
      }}
    >
      {children}
    </ConfigProvider>
  );
}
