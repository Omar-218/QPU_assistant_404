import React, { useEffect, useState } from "react";
import SectionsManager from "../../components/admin/SectionsManager.jsx";
import PublishPanel from "../../components/admin/PublishPanel.jsx";
import { buildSubjectPackage } from "../../lib/githubPublisher.js";

// ⚠️ ملف مملوك لعضو 3 — إدارة الأقسام (القسم 4.5: مستوى "القسم" من حقل hidden).
// ملاحظة: SECTION_LABELS نفسه ملف نهائي جاهز (القسم 4.4) ولا يُعدَّل هنا —
// هذه الصفحة فقط تدير أي الأقسام ظاهرة/مخفية وترتيبها لكل مادة.
//
// ملاحظة تكامل (بانتظار تأكيد عضو 5/المدير): buildSubjectPackage() يعيد بناء
// lecturesJson بترتيب أقسام ثابت دائماً (SECTION_ORDER بالكود)، بصرف النظر عن
// ترتيب sections الممرَّر بـ existingLectures. أي: تعديل الإخفاء/العنوان/الحذف
// هنا يُنشَر فعلياً، لكن زري "أعلى/أسفل" بـ SectionsManager لإعادة الترتيب لن
// يظهر أثرهما بالحزمة المنشورة فعلياً — قيد معروف بتطبيق عضو 5 الحالي، ذكرته
// بسجلي (member-3-log.md) للمراجعة.
//
// ⚠️ إصلاح (تقرير عضو 6 — نفس السبب الجذري الموثَّق بـ AdminSubjectEditor.jsx):
// `studyPlan`/`subjectDetail`/`sections` هنا كلها أساس كتابة (existingStudyPlan/
// existingSubject/existingLectures) لأي نشر من هذي الصفحة. `fetch()` العادي قابل
// لإرجاع نسخة مخزَّنة مؤقتاً بدل الأحدث فعلياً على main، فتُفقَد إضافات/تعديلات
// سابقة عند أول نشر لاحق من هنا. كل القراءات الآن `cache: "no-store"` + كسر كاش.

function noStoreUrl(path) {
  return `${import.meta.env.BASE_URL}${path}?_=${Date.now()}`;
}

async function fetchStudyPlan() {
  const res = await fetch(noStoreUrl("data/study-plan.json"), { cache: "no-store" });
  if (!res.ok) return { courses: [] };
  return res.json();
}

async function fetchSubjectDetail(id) {
  const res = await fetch(noStoreUrl(`data/subjects/${id}/subject.json`), { cache: "no-store" });
  if (!res.ok) return null;
  return res.json();
}

async function fetchLectures(id, filename) {
  const res = await fetch(noStoreUrl(`data/subjects/${id}/${filename}`), { cache: "no-store" });
  if (!res.ok) return { sections: [] };
  return res.json();
}

export default function AdminSectionsManager() {
  const [studyPlan, setStudyPlan] = useState({ courses: [] });
  const subjects = studyPlan.courses;
  const [selectedId, setSelectedId] = useState("");
  const [subjectDetail, setSubjectDetail] = useState(null);
  const [activeVariant, setActiveVariant] = useState(null); // كائن professorVariants الحالي أو null
  const [sections, setSections] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchStudyPlan().then(setStudyPlan);
  }, []);

  useEffect(() => {
    if (!selectedId) {
      setSubjectDetail(null);
      setSections([]);
      setActiveVariant(null);
      return;
    }
    let cancelled = false;
    setLoading(true);
    fetchSubjectDetail(selectedId).then(async (subj) => {
      if (cancelled || !subj) {
        setLoading(false);
        return;
      }
      const firstVariant = subj.professorVariants?.[0] ?? null;
      const filename = firstVariant?.lecturesFile ?? "lectures.json";
      const lecturesData = await fetchLectures(selectedId, filename);
      if (!cancelled) {
        setSubjectDetail(subj);
        setActiveVariant(firstVariant);
        setSections(lecturesData.sections ?? []);
        setLoading(false);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [selectedId]);

  async function switchVariant(professorId) {
    if (!subjectDetail) return;
    const variant = subjectDetail.professorVariants?.find((v) => v.professorId === professorId) ?? null;
    const filename = variant?.lecturesFile ?? "lectures.json";
    setLoading(true);
    const lecturesData = await fetchLectures(selectedId, filename);
    setActiveVariant(variant);
    setSections(lecturesData.sections ?? []);
    setLoading(false);
  }

  let pkg = null;
  if (subjectDetail && selectedId) {
    try {
      pkg = buildSubjectPackage({
        subjectMeta: {
          id: selectedId,
          name: subjectDetail.name,
          code: subjectDetail.code,
          hidden: subjectDetail.hidden,
          ...(activeVariant
            ? {
                professorId: activeVariant.professorId,
                professorName: activeVariant.professorName,
                // نحافظ على نفس حالة "نشِط" الحالية للدكتور تحديداً (لا نغيّرها من هنا)
                setActive: activeVariant.active,
              }
            : {}),
          existingSubject: subjectDetail,
          existingLectures: { sections },
          existingStudyPlan: studyPlan,
        },
        files: [],
      });
    } catch (err) {
      pkg = null;
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-xl font-bold text-text-h">إدارة الأقسام</h1>

      <div className="rounded-lg border border-border bg-bg-subtle p-4">
        <label className="flex flex-col gap-1 text-sm text-text">
          اختر مادة
          <select
            value={selectedId}
            onChange={(e) => setSelectedId(e.target.value)}
            className="rounded-md border border-border bg-bg px-3 py-1.5 text-text"
          >
            <option value="">— اختر —</option>
            {subjects.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name} ({s.id})
              </option>
            ))}
          </select>
        </label>

        {subjectDetail?.professorVariants?.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1">
            {subjectDetail.professorVariants.map((v) => (
              <button
                key={v.professorId}
                type="button"
                onClick={() => switchVariant(v.professorId)}
                className={`rounded-md px-3 py-1 text-xs ${
                  activeVariant?.professorId === v.professorId
                    ? "bg-accent text-white"
                    : "border border-border text-text hover:bg-bg-elevated"
                }`}
              >
                {v.professorName}
              </button>
            ))}
          </div>
        )}
      </div>

      {loading && <div className="text-text-muted">...جارِ التحميل</div>}

      {!loading && selectedId && (
        <>
          <div className="rounded-lg border border-border bg-bg-subtle p-4">
            <p className="mb-3 text-xs text-text-muted">
              ملاحظة: إعادة ترتيب الأقسام (▲/▼) للمعاينة فقط حالياً — الترتيب المنشور فعلياً
              ثابت (نظري ← عملي ← إضافي ← أسئلة) بحسب تطبيق عضو 5 الحالي.
            </p>
            <SectionsManager sections={sections} onChange={setSections} />
          </div>
          <div className="rounded-lg border border-border bg-bg-subtle p-4">
            <PublishPanel pkg={pkg} />
          </div>
        </>
      )}
    </div>
  );
}
