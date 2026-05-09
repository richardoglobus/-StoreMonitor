import { createContext, useContext, useEffect, useState, ReactNode } from "react";

type DarkMode = "light" | "dark";

export type AppTheme = "indigo" | "blue" | "green" | "rose" | "orange" | "purple" | "teal" | "slate";
export type AppLogo = "Building2" | "Heart" | "Shield" | "Star" | "Cross" | "Stethoscope" | "Hospital" | "Pill" | "Activity" | "Leaf";

export const THEMES: Record<AppTheme, { label: string; primary: string; cssVars: Record<string, string> }> = {
  indigo:  { label: "Indigo",  primary: "#6366f1", cssVars: { "--primary": "239 84% 67%", "--primary-foreground": "0 0% 100%", "--ring": "239 84% 67%" } },
  blue:    { label: "Blue",    primary: "#3b82f6", cssVars: { "--primary": "217 91% 60%", "--primary-foreground": "0 0% 100%", "--ring": "217 91% 60%" } },
  green:   { label: "Green",   primary: "#16a34a", cssVars: { "--primary": "142 71% 45%", "--primary-foreground": "0 0% 100%", "--ring": "142 71% 45%" } },
  rose:    { label: "Rose",    primary: "#e11d48", cssVars: { "--primary": "347 77% 50%", "--primary-foreground": "0 0% 100%", "--ring": "347 77% 50%" } },
  orange:  { label: "Orange",  primary: "#ea580c", cssVars: { "--primary": "21 90% 48%", "--primary-foreground": "0 0% 100%", "--ring": "21 90% 48%" } },
  purple:  { label: "Purple",  primary: "#9333ea", cssVars: { "--primary": "270 91% 55%", "--primary-foreground": "0 0% 100%", "--ring": "270 91% 55%" } },
  teal:    { label: "Teal",    primary: "#0d9488", cssVars: { "--primary": "174 72% 32%", "--primary-foreground": "0 0% 100%", "--ring": "174 72% 32%" } },
  slate:   { label: "Slate",   primary: "#475569", cssVars: { "--primary": "217 19% 35%", "--primary-foreground": "0 0% 100%", "--ring": "217 19% 35%" } },
};

export const LOGOS: Record<AppLogo, { label: string; emoji: string }> = {
  Building2:    { label: "Hospital Building", emoji: "🏥" },
  Heart:        { label: "Heart",             emoji: "❤️" },
  Shield:       { label: "Shield",            emoji: "🛡️" },
  Star:         { label: "Star",              emoji: "⭐" },
  Cross:        { label: "Medical Cross",     emoji: "➕" },
  Stethoscope:  { label: "Stethoscope",       emoji: "🩺" },
  Hospital:     { label: "H Symbol",          emoji: "🏨" },
  Pill:         { label: "Pill",              emoji: "💊" },
  Activity:     { label: "Activity",          emoji: "📈" },
  Leaf:         { label: "Leaf",              emoji: "🌿" },
};

interface ThemeContextValue {
  darkMode: DarkMode;
  toggleDarkMode: () => void;
  appTheme: AppTheme;
  setAppTheme: (t: AppTheme) => void;
  appLogo: AppLogo;
  setAppLogo: (l: AppLogo) => void;
}

const ThemeContext = createContext<ThemeContextValue>({
  darkMode: "light",
  toggleDarkMode: () => {},
  appTheme: "indigo",
  setAppTheme: () => {},
  appLogo: "Building2",
  setAppLogo: () => {},
});

function applyTheme(theme: AppTheme) {
  const vars = THEMES[theme]?.cssVars || {};
  const root = document.documentElement;
  for (const [key, value] of Object.entries(vars)) {
    root.style.setProperty(key, value);
  }
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [darkMode, setDarkMode] = useState<DarkMode>(() =>
    (typeof window !== "undefined" && localStorage.getItem("darkMode") as DarkMode) || "light"
  );
  const [appTheme, setAppThemeState] = useState<AppTheme>(() =>
    (typeof window !== "undefined" && localStorage.getItem("appTheme") as AppTheme) || "indigo"
  );
  const [appLogo, setAppLogoState] = useState<AppLogo>(() =>
    (typeof window !== "undefined" && localStorage.getItem("appLogo") as AppLogo) || "Building2"
  );

  useEffect(() => {
    const root = document.documentElement;
    darkMode === "dark" ? root.classList.add("dark") : root.classList.remove("dark");
    localStorage.setItem("darkMode", darkMode);
  }, [darkMode]);

  useEffect(() => {
    applyTheme(appTheme);
    localStorage.setItem("appTheme", appTheme);
  }, [appTheme]);

  useEffect(() => {
    localStorage.setItem("appLogo", appLogo);
  }, [appLogo]);

  // Load from server settings on mount
  useEffect(() => {
    fetch("/api/settings/public").then(r => r.json()).then(s => {
      if (s.appTheme && THEMES[s.appTheme as AppTheme]) {
        setAppThemeState(s.appTheme as AppTheme);
      }
      if (s.appLogo && LOGOS[s.appLogo as AppLogo]) {
        setAppLogoState(s.appLogo as AppLogo);
      }
    }).catch(() => {});
  }, []);

  const toggleDarkMode = () => setDarkMode(d => d === "light" ? "dark" : "light");
  const setAppTheme = (t: AppTheme) => setAppThemeState(t);
  const setAppLogo = (l: AppLogo) => setAppLogoState(l);

  return (
    <ThemeContext.Provider value={{ darkMode, toggleDarkMode, appTheme, setAppTheme, appLogo, setAppLogo }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}
