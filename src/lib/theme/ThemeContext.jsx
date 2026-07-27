import React, { createContext, useContext, useEffect, useState } from "react";

// ⚠️ ملف مملوك لعضو 1 — يطبّق عقد useTheme() (القسم 4.2 من team-plan-v2.md):
//   const { theme, toggleTheme } = useTheme(); // theme: "light" | "dark"
// القيمة تُخزَّن بـ localStorage، وتُستخدم prefers-color-scheme كافتراضي أول فقط.

const STORAGE_KEY = "theme";
const ThemeContext = createContext(null);

function getInitialTheme() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved === "light" || saved === "dark") return saved;
  } catch {
    // localStorage قد يكون غير متاح (وضع خاص، إلخ) — نتجاهل ونكمل بالافتراضي
  }
  if (typeof window !== "undefined" && window.matchMedia) {
    return window.matchMedia("(prefers-color-scheme: dark)").matches
      ? "dark"
      : "light";
  }
  return "light";
}

export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState(getInitialTheme);

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    try {
      localStorage.setItem(STORAGE_KEY, theme);
    } catch {
      // فشل الحفظ لا يجب أن يكسر التبديل نفسه بالجلسة الحالية
    }
  }, [theme]);

  const toggleTheme = () =>
    setTheme((current) => (current === "light" ? "dark" : "light"));

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useThemeContext() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useThemeContext يجب أن يُستخدم داخل ThemeProvider");
  return ctx;
}
