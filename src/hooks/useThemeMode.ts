import { useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import { useThemeStore, type ThemeMode } from "@/stores/theme";

const THEME_QUERY_KEY = "theme";

function parseTheme(v: string | null): ThemeMode | null {
  return v === "dark" || v === "light" ? v : null;
}

function readSearchTheme(): ThemeMode | null {
  if (typeof window === "undefined") return null;
  try {
    return parseTheme(
      new URLSearchParams(window.location.search).get(THEME_QUERY_KEY),
    );
  } catch {
    return null;
  }
}

function readHashTheme(searchParams: URLSearchParams): ThemeMode | null {
  return parseTheme(searchParams.get(THEME_QUERY_KEY));
}

/**
 * Read & write the effective theme.
 *
 * Priority: URL `?theme=...` (if present and valid) > zustand store (localStorage) > default.
 *
 * The URL is read from BOTH `window.location.search` (e.g. `https://x.com/?theme=light`)
 * and the hash query (e.g. `https://x.com/#/?theme=light`, the HashRouter-managed path).
 * `search` wins if both are set, because it's typically what users paste/bookmark.
 *
 * `setMode` updates the store and — if the URL already has a `theme` param — keeps the URL in
 * sync via `replaceState` (search) or `setSearchParams` (hash), so toggling doesn't pollute
 * history. If the URL has no `theme` param, the URL is left alone so the link stays clean.
 *
 * The store is NOT auto-synced from the URL here. ThemeProvider owns that effect so non-router
 * consumers (e.g. ECharts) also see the URL value.
 */
export function useThemeMode() {
  const [searchParams, setSearchParams] = useSearchParams();
  const storeMode = useThemeStore((s) => s.mode);
  const setStoreMode = useThemeStore((s) => s.setMode);

  const searchTheme = readSearchTheme();
  const hashTheme = readHashTheme(searchParams);
  const urlMode = searchTheme ?? hashTheme;
  const urlSource =
    searchTheme !== null ? "search" : hashTheme !== null ? "hash" : null;

  const mode = urlMode ?? storeMode;
  const isDark = mode === "dark";

  const setMode = useCallback(
    (next: ThemeMode) => {
      setStoreMode(next);
      if (urlSource === "search") {
        try {
          const url = new URL(window.location.href);
          url.searchParams.set(THEME_QUERY_KEY, next);
          window.history.replaceState({}, "", url);
        } catch {
          /* no-op: URL update is best-effort */
        }
      } else if (urlSource === "hash") {
        setSearchParams(
          (prev) => {
            prev.set(THEME_QUERY_KEY, next);
            return prev;
          },
          { replace: true },
        );
      }
    },
    [setStoreMode, setSearchParams, urlSource],
  );

  const toggleMode = useCallback(() => {
    setMode(isDark ? "light" : "dark");
  }, [setMode, isDark]);

  return { mode, isDark, urlMode, urlSource, setMode, toggleMode };
}
