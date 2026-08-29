import { ConfigProvider, theme as antdTheme } from "antd";
import { useEffect } from "react";
import { useThemeStore } from "@/stores/theme";
import { useThemeMode } from "@/hooks/useThemeMode";

const ANT_THEME_ATTR = "data-antd-theme";

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const { mode, isDark, urlMode } = useThemeMode();
  const storeMode = useThemeStore((s) => s.mode);
  const setStoreMode = useThemeStore((s) => s.setMode);

  // Apply to <html>: drives Tailwind `dark:` variants and antd color-scheme.
  useEffect(() => {
    document.documentElement.setAttribute(ANT_THEME_ATTR, mode);
    document.documentElement.classList.toggle("dark", isDark);
  }, [mode, isDark]);

  // Mirror URL → store so consumers that only read the store (e.g. ECharts init) stay aligned.
  useEffect(() => {
    if (urlMode !== null && urlMode !== storeMode) {
      setStoreMode(urlMode);
    }
  }, [urlMode, storeMode, setStoreMode]);

  return (
    <ConfigProvider
      theme={{
        algorithm: isDark ? antdTheme.darkAlgorithm : antdTheme.defaultAlgorithm,
      }}
    >
      {children}
    </ConfigProvider>
  );
}
