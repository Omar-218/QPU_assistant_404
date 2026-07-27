import { useCallback, useEffect, useState } from "react";

// ⚠️ ملف مملوك لعضو 2 — الدفعة 4 (المهمة 4)
// آخر المواد التي زارها الطالب (حد أقصى 8)، localStorage أيضاً.
// addVisit(id) يُستدعى من Subject.jsx عند نجاح تحميل المادة.
//
// ⚠️ إصلاح عضو 6 (مراجعة الدفعة 4): نفس خلل المزامنة الموثَّق بـ useFavorites.js —
// زيارة مادة بـ Subject.jsx (نسخة هوك مستقلة) كانت لا تنعكس بـ
// RecentlyViewedSection.jsx بالشريط الجانبي (نسخة هوك أخرى) بلا إعادة تحميل
// كاملة للصفحة. نفس حل CustomEvent محلي بالصفحة.

const STORAGE_KEY = "assistant404:recently-viewed";
const MAX_ITEMS = 8;
const CHANGE_EVENT = "assistant404:recently-viewed-changed";

function readStored() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function useRecentlyViewed() {
  const [recent, setRecent] = useState(() => readStored());

  useEffect(() => {
    function handleChange() {
      setRecent(readStored());
    }
    window.addEventListener(CHANGE_EVENT, handleChange);
    return () => window.removeEventListener(CHANGE_EVENT, handleChange);
  }, []);

  const addVisit = useCallback((id) => {
    const next = [id, ...readStored().filter((x) => x !== id)].slice(0, MAX_ITEMS);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {
      // تجاهل بصمت
    }
    setRecent(next);
    window.dispatchEvent(new CustomEvent(CHANGE_EVENT));
  }, []);

  return { recent, addVisit };
}
