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
  primary: "#10B981",
  primaryDark: "#059669",
  primaryLight: "#34D399",

  background: "#F6F7F9",
  surface: "#FFFFFF",
  card: "#FFFFFF",

  text: "#0F172A",
  textSecondary: "#64748B",
  textTertiary: "#94A3B8",

  border: "#E7EAEE",
  borderLight: "#F1F3F5",

  success: "#10B981",
  warning: "#F59E0B",
  error: "#F43F5E",
  info: "#0EA5E9",

  shadow: "#0F172A",
  overlay: "rgba(15, 23, 42, 0.5)",
  tabBar: "#FFFFFF",
  tabBarInactive: "#94A3B8",

  white: "#FFFFFF",
  black: "#000000",
};

const darkTheme: Theme["colors"] = {
  primary: "#34D399",
  primaryDark: "#10B981",
  primaryLight: "#6EE7B7",

  background: "#0B0F14",
  surface: "#141A21",
  card: "#161D25",

  text: "#F1F5F9",
  textSecondary: "#94A3B8",
  textTertiary: "#64748B",

  border: "#232B35",
  borderLight: "#1A222C",

  success: "#34D399",
  warning: "#FBBF24",
  error: "#FB7185",
  info: "#38BDF8",

  shadow: "#000000",
  overlay: "rgba(0, 0, 0, 0.7)",
  tabBar: "#141A21",
  tabBarInactive: "#64748B",

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
