import { Switch } from "antd";
import { Sun, Moon } from "lucide-react";
import { useThemeMode } from "@/hooks/useThemeMode";

export function ThemeSwitch() {
  const { isDark, toggleMode } = useThemeMode();

  const iconWrap =
    "flex items-center justify-center h-[22px] w-[18px] [&>svg]:block";

  return (
    <Switch
      checked={!isDark}
      onChange={toggleMode}
      checkedChildren={
        <span className={iconWrap}>
          <Sun size={14} />
        </span>
      }
      unCheckedChildren={
        <span className={iconWrap}>
          <Moon size={14} />
        </span>
      }
      title={isDark ? "切换到亮色模式" : "切换到暗色模式"}
    />
  );
}
