import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useColorScheme } from "react-native";

export type ThemeMode = "light" | "dark" | "auto";

export interface Theme {
  mode: ThemeMode;
  isDark: boolean;
  colors: {
    // Primary colors
    primary: string;
    primaryDark: string;
    primaryLight: string;

    // Background colors
    background: string;
    surface: string;
    card: string;

    // Text colors
    text: string;
    textSecondary: string;
    textTertiary: string;

    // Border colors
    border: string;
    borderLight: string;

    // Status colors
    success: string;
    warning: string;
    error: string;
    info: string;

    // UI elements
    shadow: string;
    overlay: string;
    tabBar: string;
    tabBarInactive: string;

    // Special
    white: string;
    black: string;
  };
}

const lightTheme: Theme["colors"] = {
  primary: "#1a8e2d",
  primaryDark: "#146922",
  primaryLight: "#4CAF50",

  background: "#f8f9fa",
  surface: "#ffffff",
  card: "#ffffff",

  text: "#333333",
  textSecondary: "#666666",
  textTertiary: "#999999",

  border: "#e0e0e0",
  borderLight: "#f0f0f0",

  success: "#4CAF50",
  warning: "#FF9800",
  error: "#F44336",
  info: "#2196F3",

  shadow: "#000000",
  overlay: "rgba(0, 0, 0, 0.6)",
  tabBar: "#ffffff",
  tabBarInactive: "#999999",

  white: "#ffffff",
  black: "#000000",
};

const darkTheme: Theme["colors"] = {
  primary: "#4CAF50",
  primaryDark: "#388E3C",
  primaryLight: "#66BB6A",

  background: "#121212",
  surface: "#1E1E1E",
  card: "#2C2C2C",

  text: "#FFFFFF",
  textSecondary: "#B3B3B3",
  textTertiary: "#808080",

  border: "#383838",
  borderLight: "#2C2C2C",

  success: "#66BB6A",
  warning: "#FFA726",
  error: "#EF5350",
  info: "#42A5F5",

  shadow: "#000000",
  overlay: "rgba(0, 0, 0, 0.8)",
  tabBar: "#1E1E1E",
  tabBarInactive: "#808080",

  white: "#FFFFFF",
  black: "#000000",
};

interface ThemeContextType {
  theme: Theme;
  setThemeMode: (mode: ThemeMode) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

const THEME_STORAGE_KEY = "@theme_mode";

export function ThemeProvider({ children }: { children: ReactNode }) {
  const systemColorScheme = useColorScheme();
  const [themeMode, setThemeModeState] = useState<ThemeMode>("auto");

  // Load theme preference on mount
  useEffect(() => {
    loadThemePreference();
  }, []);

  const loadThemePreference = async () => {
    try {
      const saved = await AsyncStorage.getItem(THEME_STORAGE_KEY);
      if (saved && (saved === "light" || saved === "dark" || saved === "auto")) {
        setThemeModeState(saved as ThemeMode);
      }
    } catch (error) {
      console.error("Failed to load theme preference:", error);
    }
  };

  const setThemeMode = async (mode: ThemeMode) => {
    try {
      await AsyncStorage.setItem(THEME_STORAGE_KEY, mode);
      setThemeModeState(mode);
    } catch (error) {
      console.error("Failed to save theme preference:", error);
    }
  };

  // Determine if dark mode should be active
  const isDark = themeMode === "auto"
    ? systemColorScheme === "dark"
    : themeMode === "dark";

  const theme: Theme = {
    mode: themeMode,
    isDark,
    colors: isDark ? darkTheme : lightTheme,
  };

  return (
    <ThemeContext.Provider value={{ theme, setThemeMode }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used within ThemeProvider");
  }
  return context;
}
