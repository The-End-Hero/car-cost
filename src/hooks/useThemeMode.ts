import { useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import { useThemeStore, type ThemeMode } from "@/stores/theme";

const THEME_QUERY_KEY = "theme";

function parseTheme(v: string | null): ThemeMode | null {
  return v === "dark" || v === "light" ? v : null;
}

/**
 * Read & write the effective theme.
 *
 * Priority: URL `?theme=...` (if present and valid) > zustand store (localStorage) > default.
 *
 * `setMode` updates the store and — if the URL already has a `theme` param — keeps the URL in
 * sync (using `replace: true` so toggling doesn't pollute history). If the URL has no `theme`
 * param, the URL is left alone so the link stays clean.
 *
 * The store is NOT auto-synced from the URL here. ThemeProvider owns that effect so non-router
 * consumers (e.g. ECharts) also see the URL value.
 */
export function useThemeMode() {
  const [searchParams, setSearchParams] = useSearchParams();
  const storeMode = useThemeStore((s) => s.mode);
  const setStoreMode = useThemeStore((s) => s.setMode);

  const urlMode = parseTheme(searchParams.get(THEME_QUERY_KEY));
  const mode = urlMode ?? storeMode;
  const isDark = mode === "dark";

  const setMode = useCallback(
    (next: ThemeMode) => {
      setStoreMode(next);
      if (urlMode !== null) {
        setSearchParams(
          (prev) => {
            prev.set(THEME_QUERY_KEY, next);
            return prev;
          },
          { replace: true },
        );
      }
    },
    [setStoreMode, setSearchParams, urlMode],
  );

  const toggleMode = useCallback(() => {
    setMode(isDark ? "light" : "dark");
  }, [setMode, isDark]);

  return { mode, isDark, urlMode, setMode, toggleMode };
}
