// import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import disableDevtool from "disable-devtool";
import "./index.css";
import App from "./App.tsx";
import { ThemeProvider } from "@/providers/ThemeProvider";

if (import.meta.env.PROD) {
  disableDevtool();
}

const root = createRoot(document.getElementById("root")!);
root.render(
  // <StrictMode>
  <ThemeProvider>
    <App />
  </ThemeProvider>,
  // </StrictMode>,
);
