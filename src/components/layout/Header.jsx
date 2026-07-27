import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import ThemeToggleButton from "../theme/ThemeToggleButton.jsx";
import { useNotifications } from "../../hooks/useNotifications.js";

// ⚠️ ملف مملوك للمدير — لا يُعدَّل من قبل أي عضو.
// مكان زر الثيم محجوز هنا مسبقاً باستيراد ثابت — عضو 1 يبني محتوى
// ThemeToggleButton.jsx فقط، لا يحتاج يلمس هذا الملف إطلاقاً.
//
// ⚠️ تحديث إداري: زر هامبرجر (☰) لفتح الشريط الجانبي كقائمة منسدلة على
// الجوال فقط (md:hidden) — الحالة تُدار بـ App.jsx وتُمرَّر onMenuClick هنا.
//
// ⚠️ تحديث إداري (خطة الدفعة 5، القسم 2): زر جرس بجانب زر الثيم يفتح
// /notifications. نقطة "جديد" بسيطة محسوبة محلياً (localStorage فقط، بلا
// أي خادم — الموقع بلا خادم أصلاً): نقارن decidedAt لآخر إشعار مع آخر وقت
// فتح الصفحة المخزَّن محلياً. تُحدَّث القيمة المخزَّنة فور الضغط على الزر.

const SEEN_KEY = "notifications_last_seen_at";

export default function Header({ onMenuClick }) {
  const { items } = useNotifications();
  const [hasUnseen, setHasUnseen] = useState(false);

  useEffect(() => {
    if (items.length === 0) return;
    const lastSeen = localStorage.getItem(SEEN_KEY);
    const latestDecidedAt = items[0]?.decidedAt;
    setHasUnseen(Boolean(latestDecidedAt) && (!lastSeen || new Date(latestDecidedAt) > new Date(lastSeen)));
  }, [items]);

  function markSeen() {
    localStorage.setItem(SEEN_KEY, new Date().toISOString());
    setHasUnseen(false);
  }

  return (
    <header className="flex items-center justify-between border-b border-border bg-bg px-4 py-3 md:px-6">
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onMenuClick}
          className="text-xl text-text-h md:hidden"
          aria-label="فتح القائمة"
        >
          ☰
        </button>
        <div className="text-sm text-text-muted">أرشيف المحاضرات والمقررات</div>
      </div>
      <div className="flex items-center gap-2">
        <Link
          to="/notifications"
          onClick={markSeen}
          className="relative rounded-md p-2 text-text-muted hover:bg-bg-elevated hover:text-text"
          aria-label="الإشعارات"
        >
          🔔
          {hasUnseen && (
            <span className="absolute end-1 top-1 h-2 w-2 rounded-full bg-danger-text" />
          )}
        </Link>
        <ThemeToggleButton />
      </div>
    </header>
  );
}
