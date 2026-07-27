import React from "react";
import { useTheme } from "../../hooks/useTheme.js";

// ⚠️ ملف مملوك لعضو 1 — مفتاح تبديل على شكل "ختم" أرشيف: مسار دائري واحد
// يتنقّل بين أيقونتي شمس/هلال، منسجم مع هوية الألوان بـ index.css.
// العقد المحفوظ: استدعاء useTheme() بنفس الشكل { theme, toggleTheme } فقط.

export default function ThemeToggleButton() {
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === "dark";

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-pressed={isDark}
      aria-label={isDark ? "التبديل إلى الوضع الفاتح" : "التبديل إلى الوضع المظلم"}
      title={isDark ? "الوضع الفاتح" : "الوضع المظلم"}
      className="group inline-flex h-9 w-9 items-center justify-center rounded-full border border-border bg-bg-elevated text-text transition-colors hover:border-accent hover:text-accent focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
    >
      {isDark ? (
        <svg
          viewBox="0 0 24 24"
          width="18"
          height="18"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <circle cx="12" cy="12" r="4.2" />
          <path d="M12 2.5v2.2M12 19.3v2.2M4.2 12H2M22 12h-2.2M5.6 5.6l1.5 1.5M16.9 16.9l1.5 1.5M18.4 5.6l-1.5 1.5M7.1 16.9l-1.5 1.5" />
        </svg>
      ) : (
        <svg
          viewBox="0 0 24 24"
          width="18"
          height="18"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M20.2 14.4A8.4 8.4 0 1 1 9.6 3.8a6.6 6.6 0 0 0 10.6 10.6Z" />
        </svg>
      )}
    </button>
  );
}
