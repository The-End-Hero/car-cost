// import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { HashRouter } from "react-router-dom";
import disableDevtool from "disable-devtool";
// 思源黑体简体：按字重按需引入，便于 Vite tree-shake
import "@fontsource/noto-sans-sc/400.css";
import "@fontsource/noto-sans-sc/500.css";
import "@fontsource/noto-sans-sc/700.css";
import "./index.css";
import App from "./App.tsx";
import { ThemeProvider } from "@/providers/ThemeProvider";

const LOCALHOST_HOSTS = new Set(["localhost", "127.0.0.1", "::1"]);

const isFileProtocol = window.location.protocol === "file:";
const isCurrentHostLocalhost = LOCALHOST_HOSTS.has(window.location.hostname);

const isParentHostLocalhost = (() => {
  const topWindow = window.top;
  if (!topWindow || window.self === topWindow) return false;

  try {
    return LOCALHOST_HOSTS.has(topWindow.location.hostname);
  } catch {
    if (!document.referrer) return false;
    try {
      return LOCALHOST_HOSTS.has(new URL(document.referrer).hostname);
    } catch {
      return false;
    }
  }
})();

// 生产环境默认启用；但 file 协议或 localhost 容器下不启用；被 iframe 嵌入时也不启用
if (
  import.meta.env.PROD &&
  !isFileProtocol &&
  !isCurrentHostLocalhost &&
  !isParentHostLocalhost &&
  window.self === window.top
) {
  disableDevtool();
}

const root = createRoot(document.getElementById("root")!);
root.render(
  // <StrictMode>
  <HashRouter>
    <ThemeProvider>
      <App />
    </ThemeProvider>
  </HashRouter>,
  // </StrictMode>,
);
