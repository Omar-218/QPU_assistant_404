import React, { useEffect, useMemo, useState } from "react";
import Fuse from "fuse.js";
import { useStudyPlan } from "../hooks/useStudyPlan.js";
import { useFavorites } from "../hooks/useFavorites.js";
import SubjectCard from "../components/subject/SubjectCard.jsx";
import { fetchFlatCurriculum } from "../lib/curriculum.js";

// ⚠️ ملف مملوك لعضو 2 — قائمة المواد + بحث Fuse.js.
// الدفعة 4: يستهلك useStudyPlan() (عضو 4) بدل fetch مباشر لـ study-plan.json —
// يحل ازدواجية الجلب بين هذا الملف وStudyPlan.jsx، ويضمن مسار fetch صحيح
// تحت أي base (مسؤولية عضو 4 داخل الـ hook).
//
// 2026-07-25: ترتيب المواد بالسنة/الفصل (طلب مستخدم) — بدل ترتيب الإدراج
// الخام بـ study-plan.json (اللي يعتمد على وقت إضافة كل مادة، بلا معنى
// أكاديمي). نستخدم fetchFlatCurriculum() الجاهزة أصلاً (lib/curriculum.js،
// نفس المصدر اللي يستخدمه CurriculumCoursePicker بلوحة التحكم) بدل تكرار
// منطق تسطيح curriculum.json من الصفر. المواد اللي بلا سنة/مستوى محدَّد
// (متطلبات الجامعة الاختيارية بـ electiveGroups، مثل الصحة العامة والعربي 2)
// تُوضَع بنهاية القائمة دائماً — لا سنة فعلية لها بالخطة الرسمية أصلاً.
// الترتيب يُطبَّق على العرض الافتراضي فقط؛ نتائج البحث تبقى مرتَّبة حسب
// درجة التطابق (Fuse.js) لأنها أفيد بسياق البحث.
//
// ⚠️ تحديث إداري (2026-07-31، طلب مباشر من المستخدم — ميزة "تثبيت المواد"):
// بدل بناء نظام تخزين مستقل جديد لـ "تثبيت"، أعدت استخدام useFavorites.js
// الموجود أصلاً (نفس مفتاح localStorage، نفس زر ⭐ بـ SubjectCard.jsx) — قرار
// مقصود لتفادي وجود آليتين متشابهتين (⭐ مفضلة + 📌 تثبيت منفصل) تربكان
// الطالب بلا داعٍ حقيقي، ولتجنّب أي تعارض مع ميزة "سؤال الإشعارات" المبنية
// أصلاً فوق نفس زر المفضلة بـ SubjectCard.jsx (جلسة 2026-07-29). الإضافة
// الفعلية هنا فقط: قسم "📌 مثبّتة" منفصل أعلى الصفحة (بترتيب التثبيت نفسه،
// الأحدث تثبيتاً أولاً)، يظهر فقط بالعرض الافتراضي (بلا بحث نشِط) — يطابق
// نفس استثناء "ترتيب السنة/الفصل" أعلاه تماماً بنفس المنطق (نتائج البحث
// تبقى بترتيب التطابق فقط، بلا تمييز تثبيت).

export default function SubjectList() {
  const { courses, loading } = useStudyPlan();
  const { favorites } = useFavorites();
  const [query, setQuery] = useState("");
  const [orderMap, setOrderMap] = useState(null); // Map<id, {year, level}> | null (لسا ما تحمّل)

  useEffect(() => {
    let cancelled = false;
    fetchFlatCurriculum().then((flat) => {
      if (cancelled) return;
      setOrderMap(new Map(flat.map((c) => [c.id, { year: c.year, level: c.level }])));
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const sortedCourses = useMemo(() => {
    if (!orderMap) return courses; // لسا ما توفّر ترتيب الخطة، اعرض بترتيب study-plan.json مؤقتاً
    return [...courses].sort((a, b) => {
      const oa = orderMap.get(a.id);
      const ob = orderMap.get(b.id);
      // Infinity لأي مادة بلا سنة/مستوى (غير موجودة بالخطة، أو ضمن
      // electiveGroups بلا سنة محدَّدة) — تُدفَع دائماً لآخر القائمة.
      const ya = oa?.year ?? Infinity;
      const yb = ob?.year ?? Infinity;
      if (ya !== yb) return ya - yb;
      const la = oa?.level ?? Infinity;
      const lb = ob?.level ?? Infinity;
      return la - lb;
    });
  }, [courses, orderMap]);

  const fuse = useMemo(
    () => new Fuse(sortedCourses, { keys: ["name", "code"], threshold: 0.35 }),
    [sortedCourses]
  );

  const isSearching = query.trim().length > 0;
  const results = isSearching ? fuse.search(query).map((r) => r.item) : sortedCourses;

  // "مثبّتة" = مفضّلة (نفس القائمة، راجع التعليق أعلى الملف)، بترتيب التثبيت
  // نفسه (آخر ما ثُبِّت يظهر أولاً — الأقرب لتوقّع الطالب من "التثبيت").
  const pinnedResults = isSearching
    ? []
    : [...favorites].reverse().map((id) => sortedCourses.find((c) => c.id === id)).filter(Boolean);
  const pinnedIds = new Set(pinnedResults.map((c) => c.id));
  const restResults = isSearching ? results : results.filter((c) => !pinnedIds.has(c.id));

  if (loading) return <div className="text-text-muted">...جارِ التحميل</div>;

  return (
    <div>
      <h1 className="mb-4 text-xl font-bold text-text-h">المواد الدراسية</h1>

      <input
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="ابحث عن مادة بالاسم أو الرمز..."
        className="mb-6 w-full max-w-sm rounded-md border border-border bg-bg-subtle px-3 py-2 text-sm text-text placeholder:text-text-muted focus:border-accent focus:outline-none"
      />

      {results.length === 0 ? (
        <p className="text-text-muted">لا توجد نتائج مطابقة</p>
      ) : (
        <>
          {pinnedResults.length > 0 && (
            <div className="mb-6">
              <div className="mb-2 flex items-center gap-1.5 text-sm font-bold text-text-h">
                <span>📌</span>
                <span>المواد المثبّتة</span>
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {pinnedResults.map((course) => (
                  <SubjectCard key={course.id} subject={course} />
                ))}
              </div>
            </div>
          )}

          {pinnedResults.length > 0 && restResults.length > 0 && (
            <div className="mb-2 text-sm font-bold text-text-h">كل المواد</div>
          )}

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {restResults.map((course) => (
              <SubjectCard key={course.id} subject={course} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
