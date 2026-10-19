import React from "react";
import { Moon, Sun } from "lucide-react";
import { useTheme } from "../../context/ThemeContext";

interface ThemeToggleProps {
  className?: string;
}

export const ThemeToggle: React.FC<ThemeToggleProps> = ({ className = "" }) => {
  const { theme, toggleTheme } = useTheme();

  return (
    <button
      type="button"
      onClick={toggleTheme}
      className={`relative flex h-9 w-9 items-center justify-center rounded-md border border-slate-200 bg-white text-slate-600 shadow-2xs transition-all duration-150 hover:bg-slate-50 hover:text-slate-900 dark:border-slate-700 dark:bg-slate-800/80 dark:text-amber-400 dark:hover:bg-slate-700 dark:hover:text-amber-300 cursor-pointer ${className}`}
      title={theme === "dark" ? "Chuyển sang chế độ sáng (Light Mode)" : "Chuyển sang chế độ tối (Dark Mode)"}
      aria-label={theme === "dark" ? "Chuyển sang chế độ sáng" : "Chuyển sang chế độ tối"}
    >
      {theme === "dark" ? (
        <Sun className="h-4 w-4 transition-transform duration-200 rotate-0 hover:rotate-45" strokeWidth={1.75} />
      ) : (
        <Moon className="h-4 w-4 transition-transform duration-200 -rotate-12 hover:rotate-0" strokeWidth={1.75} />
      )}
    </button>
  );
};

export default ThemeToggle;
