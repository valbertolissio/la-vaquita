import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { useColorScheme } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { darkColors, lightColors, ThemeColors } from "../Utilidades/tema";

type ThemeMode = "light" | "dark";

interface ThemeContextValue {
  mode: ThemeMode;
  colors: ThemeColors;
  toggleTheme: () => void;
}

const THEME_KEY = "la-vaquita-theme";
const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

export function ProveedorDeTema({ children }: { children: ReactNode }) {
  const systemScheme = useColorScheme();
  const [mode, setMode] = useState<ThemeMode>(systemScheme === "dark" ? "dark" : "light");

  useEffect(() => {
    AsyncStorage.getItem(THEME_KEY).then((stored) => {
      if (stored === "light" || stored === "dark") setMode(stored);
    });
  }, []);

  function toggleTheme() {
    setMode((prev) => {
      const next = prev === "dark" ? "light" : "dark";
      AsyncStorage.setItem(THEME_KEY, next);
      return next;
    });
  }

  const colors = mode === "dark" ? darkColors : lightColors;

  return <ThemeContext.Provider value={{ mode, colors, toggleTheme }}>{children}</ThemeContext.Provider>;
}

export function useColoresDelTema() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useColoresDelTema debe usarse dentro de ProveedorDeTema");
  return ctx;
}
