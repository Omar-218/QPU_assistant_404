import React from "react";
import { Link } from "react-router-dom";
import { useStudyPlan } from "../../hooks/useStudyPlan.js";
import { useFavorites } from "../../hooks/useFavorites.js";
import { useEvents } from "../../hooks/useEvents.js";
import { isEventActive } from "../../lib/eventStatus.js";

// ⚠️ ملف مملوك لعضو 2 — الدفعة 4 (المهمة 4)
// قسم "المفضلة" بالشريط الجانبي. المدير يستورده يدوياً بـ Sidebar.jsx
// (بنفس نمط حجز مكان ThemeToggleButton بـ Header.jsx) — لا يلمس عضو 2 ذلك الملف.
// لو ما فيه مواد مفضّلة، لا يُعرض القسم إطلاقاً.
//
// ⚠️ تحديث (2026-07-27، طلب مباشر من المستخدم، خطة الدفعة 5): نقطة صغيرة
// بجانب اسم أي مادة مفضّلة فيها حدث نشِط الآن (isEventActive — نفس منطق
// شريط الأحداث بصفحة المادة نفسها، مُشتقّ لحظياً، بلا أي تخزين إضافي).

export default function FavoritesSection() {
  const { courses, loading } = useStudyPlan();
  const { favorites } = useFavorites();
  const { events } = useEvents();

  if (loading) return null;

  const items = courses.filter((c) => favorites.includes(c.id));
  if (items.length === 0) return null;

  return (
    <div className="mt-6">
      <div className="mb-2 px-1 text-xs font-bold text-text-muted">⭐ المفضلة</div>
      <nav className="flex flex-col gap-1">
        {items.map((course) => {
          const hasActiveEvent = events.some(
            (ev) => ev.subjectId === course.id && isEventActive(ev)
          );
          return (
            <Link
              key={course.id}
              to={`/subject/${course.id}`}
              className="flex items-center gap-1.5 truncate rounded-md px-3 py-1.5 text-sm text-text hover:bg-bg-elevated"
            >
              <span className="truncate">{course.name}</span>
              {hasActiveEvent && (
                <span
                  className="inline-block h-1.5 w-1.5 shrink-0 rounded-full bg-danger-text"
                  title="فيه حدث نشِط بهذي المادة"
                />
              )}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
