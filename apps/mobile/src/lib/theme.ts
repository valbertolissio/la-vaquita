export interface ThemeColors {
  navy: string;
  green: string;
  greenDark: string;
  cream: string;
  background: string;
  surface: string;
  border: string;
  text: string;
  muted: string;
  danger: string;
}

export const lightColors: ThemeColors = {
  navy: "#1b1240",
  green: "#2e9e5b",
  greenDark: "#22a559",
  cream: "#faf7f2",
  background: "#f5f3ee",
  surface: "#ffffff",
  border: "#e2e0d8",
  text: "#1e293b",
  muted: "#64748b",
  danger: "#ef4444",
};

export const darkColors: ThemeColors = {
  navy: "#1b1240",
  green: "#2e9e5b",
  greenDark: "#3ecb79",
  cream: "#faf7f2",
  background: "#0f1420",
  surface: "#1a2130",
  border: "#334155",
  text: "#f1f5f9",
  muted: "#94a3b8",
  danger: "#f87171",
};

/** @deprecated Usá useThemeColors() para que la app responda al modo oscuro. Se deja para código que todavía no migró. */
export const colors = lightColors;
