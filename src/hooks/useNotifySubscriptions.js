import { useCallback, useEffect, useState } from "react";

// ⚠️ ملف مملوك لعضو 2 — ميزة جديدة (طلب مباشر من المستخدم، 2026-07-29):
// "متابعة إشعارات مادة مفضّلة" — اختيار مستقل تماماً عن useFavorites.js
// (مادة تقدر تكون مفضّلة بلا متابعة إشعارات، والعكس تقنياً ممكن أيضاً رغم
// إن الواجهة تعرض الخيار فقط للمواد المفضّلة أصلاً — راجع FavoritesSection.jsx
// وSubjectCard.jsx).
//
// نفس آلية useFavorites.js بالضبط (localStorage + CustomEvent محلي للمزامنة
// الفورية بين نسخ الهوك بمكوّنات مختلفة بنفس التبويب) — لا داعي لإعادة اختراع
// نمط جديد، نفس المشكلة (حدث "storage" الطبيعي لا يُطلَق لنفس التبويب) ونفس
// الحل بالضبط.
//
// الموقع بلا خادم/حسابات طلاب أصلاً (نفس ملاحظة NotificationsPage.jsx) —
// "الإشعار" الفعلي هنا هو تمييز عناصر NotificationsPage.jsx الخاصة بمواد
// المستخدم المتابَعة (قسم منفصل بأعلى الصفحة)، لا إشعار نظام تشغيل حقيقي
// (يحتاج service worker + خادم push، غير متاح بموقع static بهذا الشكل).

const STORAGE_KEY = "assistant404:notify-subscriptions";
const CHANGE_EVENT = "assistant404:notify-subscriptions-changed";

function readStored() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeStored(next) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    // localStorage قد يكون غير متاح (وضع خاص، إلخ) — تجاهل بصمت
  }
  window.dispatchEvent(new CustomEvent(CHANGE_EVENT));
}

export function useNotifySubscriptions() {
  const [subscriptions, setSubscriptions] = useState(() => readStored());

  useEffect(() => {
    function handleChange() {
      setSubscriptions(readStored());
    }
    window.addEventListener(CHANGE_EVENT, handleChange);
    return () => window.removeEventListener(CHANGE_EVENT, handleChange);
  }, []);

  const isSubscribed = useCallback((id) => subscriptions.includes(id), [subscriptions]);

  const setSubscribed = useCallback((id, subscribed) => {
    const current = readStored();
    const next = subscribed
      ? current.includes(id)
        ? current
        : [...current, id]
      : current.filter((x) => x !== id);
    writeStored(next);
    setSubscriptions(next);
  }, []);

  const toggleSubscribed = useCallback((id) => {
    const current = readStored();
    const next = current.includes(id)
      ? current.filter((x) => x !== id)
      : [...current, id];
    writeStored(next);
    setSubscriptions(next);
  }, []);

  return { subscriptions, isSubscribed, setSubscribed, toggleSubscribed };
}
