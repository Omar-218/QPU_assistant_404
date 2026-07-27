import React from "react";
import { Link } from "react-router-dom";
import { useStudyPlan } from "../../hooks/useStudyPlan.js";
import { useRecentlyViewed } from "../../hooks/useRecentlyViewed.js";

// ⚠️ ملف مملوك لعضو 2 — الدفعة 4 (المهمة 4)
// قسم "آخر الزيارات" بالشريط الجانبي. المدير يستورده يدوياً بـ Sidebar.jsx.
// لو فاضي، لا يُعرض القسم إطلاقاً.

export default function RecentlyViewedSection() {
  const { courses, loading } = useStudyPlan();
  const { recent } = useRecentlyViewed();

  if (loading || recent.length === 0) return null;

  const byId = Object.fromEntries(courses.map((c) => [c.id, c]));
  const items = recent.map((id) => byId[id]).filter(Boolean);
  if (items.length === 0) return null;

  return (
    <div className="mt-6">
      <div className="mb-2 px-1 text-xs font-bold text-text-muted">آخر الزيارات</div>
      <nav className="flex flex-col gap-1">
        {items.map((course) => (
          <Link
            key={course.id}
            to={`/subject/${course.id}`}
            className="truncate rounded-md px-3 py-1.5 text-sm text-text hover:bg-bg-elevated"
          >
            {course.name}
          </Link>
        ))}
      </nav>
    </div>
  );
}
