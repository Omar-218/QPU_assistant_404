import { useCallback, useEffect, useState } from "react";

// ⚠️ ملف مملوك لعضو 2 — الدفعة 4 (المهمة 4)
// مواد الطالب المفضّلة، مخزَّنة بـ localStorage (تبقى بعد إغلاق المتصفح،
// بخلاف توكن الأدمن بالمهمة 1 اللي لازم يُخزَّن sessionStorage).
//
// ⚠️ إصلاح عضو 6 (مراجعة الدفعة 4): كل استدعاء لـ useFavorites() كان يحتفظ
// بنسخة useState مستقلة تماماً عن أي استدعاء آخر لنفس الهوك بمكوّن مختلف.
// النتيجة المؤكَّدة تجريبياً (اختبار React معزول، لا افتراض نظري): الضغط على
// زر المفضلة بـ SubjectCard.jsx يحدّث localStorage فعلياً، لكن FavoritesSection.jsx
// بالشريط الجانبي (مكوّن آخر، مُحمَّل بالتوازي) لا يعرف بالتغيير إطلاقاً حتى
// يُعاد تحميل الصفحة كاملة — لأن كل مكوّن يقرأ localStorage مرة واحدة فقط عند
// أول تحميل له. الحل: حدث CustomEvent محلي بالصفحة يُطلَق بعد كل كتابة، وكل
// نسخة من الهوك (بأي مكوّن) تستمع له لتحديث حالتها فوراً — يعمل بنفس التبويب
// (حدث "storage" الطبيعي بالمتصفح لا يُطلَق أصلاً لنفس التبويب اللي غيّر القيمة).

const STORAGE_KEY = "assistant404:favorites";
const CHANGE_EVENT = "assistant404:favorites-changed";

function readStored() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function useFavorites() {
  const [favorites, setFavorites] = useState(() => readStored());

  // مزامنة: أي نسخة أخرى من الهوك (بمكوّن آخر) تكتب تغييراً → نعيد القراءة هنا.
  useEffect(() => {
    function handleChange() {
      setFavorites(readStored());
    }
    window.addEventListener(CHANGE_EVENT, handleChange);
    return () => window.removeEventListener(CHANGE_EVENT, handleChange);
  }, []);

  const isFavorite = useCallback((id) => favorites.includes(id), [favorites]);

  const toggleFavorite = useCallback((id) => {
    const next = readStored().includes(id)
      ? readStored().filter((x) => x !== id)
      : [...readStored(), id];
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {
      // localStorage قد يكون غير متاح (وضع خاص، إلخ) — تجاهل بصمت
    }
    setFavorites(next);
    window.dispatchEvent(new CustomEvent(CHANGE_EVENT));
  }, []);

  return { favorites, isFavorite, toggleFavorite };
}
