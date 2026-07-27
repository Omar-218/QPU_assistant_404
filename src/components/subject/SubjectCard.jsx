import React from "react";
import { Link } from "react-router-dom";
import { useFavorites } from "../../hooks/useFavorites.js";

// ⚠️ ملف مملوك لعضو 2 — بطاقة عرض مادة واحدة بصفحة قائمة المواد (SubjectList.jsx).
// الدفعة 4 (المهمة 4): زر "⭐ تفضيل" مضاف هنا (قرار: هنا وليس بـ Subject.jsx،
// لأن القائمة/البطاقات هي سياق التصفح والتفضيل الطبيعي).

export default function SubjectCard({ subject }) {
  const { isFavorite, toggleFavorite } = useFavorites();
  const favorite = isFavorite(subject.id);

  return (
    <div className="relative rounded-lg border border-border bg-bg-elevated p-4 transition-colors hover:border-accent">
      <button
        type="button"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          toggleFavorite(subject.id);
        }}
        aria-label={favorite ? "إزالة من المفضلة" : "إضافة للمفضلة"}
        className={`absolute left-3 top-3 text-lg leading-none ${
          favorite ? "text-warning-text" : "text-text-muted hover:text-text"
        }`}
      >
        {favorite ? "★" : "☆"}
      </button>
      <Link to={`/subject/${subject.id}`} className="block pl-2">
        <h3 className="pr-6 font-bold text-text-h">{subject.name}</h3>
        {subject.code && (
          <p className="mt-1 text-xs text-text-muted">{subject.code}</p>
        )}
      </Link>
    </div>
  );
}
