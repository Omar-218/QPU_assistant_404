import React, { useEffect, useMemo, useState } from "react";
import { fetchUnlinkedCurriculumCourses } from "../../lib/curriculum.js";

// يظهر فقط عند إضافة مادة جديدة (لا يظهر عند التعديل). يعرض كل مواد الخطة
// الدراسية الرسمية (curriculum.json) اللي لسا ما إلها صفحة/محتوى فعلي، مع
// بحث بسيط بالاسم/الرمز. اختيار مادة يمرّرها لـ SubjectForm كتعبئة مسبقة.
//
// Props:
//  - existingIds: string[] — مواد موجودة فعلياً (تُستبعد من القائمة)
//  - onPick(course | null): يُستدعى بالمادة المختارة، أو null لو ضغط "تجاهل"

export default function CurriculumCoursePicker({ existingIds, onPick }) {
  const [courses, setCourses] = useState(null);
  const [query, setQuery] = useState("");

  useEffect(() => {
    let cancelled = false;
    fetchUnlinkedCurriculumCourses(existingIds).then((list) => {
      if (!cancelled) setCourses(list);
    });
    return () => {
      cancelled = true;
    };
  }, [existingIds]);

  const filtered = useMemo(() => {
    if (!courses) return [];
    const q = query.trim();
    if (!q) return courses;
    return courses.filter((c) => c.name.includes(q) || (c.code && c.code.includes(q)));
  }, [courses, query]);

  const grouped = useMemo(() => {
    // ⚠️ إصلاح: مواد بلا year (مثل المتطلبات الاختيارية) كانت تُجمَّع تحت
    // مفتاح year=null فتظهر بعنوان "السنة null" وترتيب غير صحيح. الآن تُجمَّع
    // تحت semesterLabel الخاص بها (مثلاً "متطلبات الجامعة الاختيارية")،
    // وتُعرض بعد كل السنوات المرقَّمة.
    const byGroup = new Map();
    for (const c of filtered) {
      const key = c.year != null ? `year-${c.year}` : `group-${c.semesterLabel}`;
      if (!byGroup.has(key)) {
        byGroup.set(key, {
          label: c.year != null ? `السنة ${c.year}` : c.semesterLabel,
          sortKey: c.year != null ? c.year : Infinity,
          items: [],
        });
      }
      byGroup.get(key).items.push(c);
    }
    return Array.from(byGroup.values()).sort((a, b) => a.sortKey - b.sortKey);
  }, [filtered]);

  if (courses === null) {
    return <div className="text-sm text-text-muted">...جارِ تحميل الخطة الدراسية</div>;
  }

  return (
    <section className="rounded-lg border border-border bg-bg-subtle p-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h2 className="text-sm font-semibold text-text-h">اختر مادة من الخطة الدراسية</h2>
        <button
          type="button"
          onClick={() => onPick(null)}
          className="shrink-0 text-xs text-accent underline hover:text-accent-hover"
        >
          تجاهل، أنشئ مادة يدوياً
        </button>
      </div>

      <input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="ابحث بالاسم أو الرمز..."
        className="mb-3 w-full rounded-md border border-border bg-bg px-3 py-1.5 text-sm text-text"
      />

      {filtered.length === 0 ? (
        <p className="text-sm text-text-muted">
          {courses.length === 0
            ? "كل مواد الخطة الدراسية مرتبطة بمحتوى فعلياً — ما فيه شيء متبقٍّ للإضافة من هنا."
            : "لا نتائج مطابقة للبحث."}
        </p>
      ) : (
        <div className="flex max-h-80 flex-col gap-3 overflow-y-auto">
          {grouped.map((g) => (
            <div key={g.label}>
              <div className="mb-1 text-xs font-bold text-text-muted">{g.label}</div>
              <div className="flex flex-col gap-1">
                {g.items.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => onPick(c)}
                    className="flex items-center justify-between rounded-md border border-border bg-bg px-3 py-2 text-start text-sm text-text hover:border-accent hover:bg-bg-elevated"
                  >
                    <span className="truncate">
                      {c.name}
                      {c.tracks.length > 0 && (
                        <span className="text-text-muted"> — {c.tracks.join(" / ")}</span>
                      )}
                    </span>
                    <span className="shrink-0 text-xs text-text-muted">{c.code || "-"}</span>
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
