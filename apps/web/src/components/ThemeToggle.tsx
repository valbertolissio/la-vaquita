import { Moon, Sun } from "lucide-react";
import { useTheme } from "../context/ThemeContext";

interface ThemeToggleProps {
  className?: string;
  /** "default" fits light/white surfaces. "onNavy" fits the always-dark navy sidebar/auth backgrounds. */
  variant?: "default" | "onNavy";
}

export function ThemeToggle({ className = "", variant = "default" }: ThemeToggleProps) {
  const { theme, toggleTheme } = useTheme();
  const variantClasses =
    variant === "onNavy"
      ? "border border-white/20 text-white/70 hover:bg-white/5 hover:text-white"
      : "border border-slate-300 text-slate-500 hover:bg-slate-50 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-800";
  return (
    <button
      onClick={toggleTheme}
      title={theme === "dark" ? "Modo claro" : "Modo oscuro"}
      className={`flex h-9 w-9 items-center justify-center rounded-lg transition ${variantClasses} ${className}`}
    >
      {theme === "dark" ? <Sun size={16} strokeWidth={2} /> : <Moon size={16} strokeWidth={2} />}
    </button>
  );
}
