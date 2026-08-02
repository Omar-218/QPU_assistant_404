import React, { useEffect, useRef, useState } from "react";
import SectionsManager from "../../components/admin/SectionsManager.jsx";
import PublishPanel from "../../components/admin/PublishPanel.jsx";
import { buildSubjectPackage } from "../../lib/githubPublisher.js";
import { useUnsavedChangesWarning } from "../../hooks/useUnsavedChangesWarning.js";

// ⚠️ ملف مملوك لعضو 3 — إدارة الأقسام (القسم 4.5: مستوى "القسم" من حقل hidden).
// ملاحظة: SECTION_LABELS نفسه ملف نهائي جاهز (القسم 4.4) ولا يُعدَّل هنا —
// هذه الصفحة فقط تدير أي الأقسام ظاهرة/مخفية وترتيبها، ترتيب/نقل عناصرها،
// واستبدال الملف الفعلي وراء أي عنصر pdf/image — لكل مادة.
//
// ⚠️ إصلاح خلل حرج (تأكَّد بالفحص المباشر لـ githubPublisher.js، لا افتراضاً):
// إعادة ترتيب الأقسام (▲/▼) كانت تُمحى صامتاً عند النشر — buildSubjectPackage
// كان يفرض SECTION_ORDER الثابت دائماً بصرف النظر عن ترتيب existingLectures
// الفعلي الممرَّر من هنا. أُصلِح جذرياً بـ githubPublisher.js نفسه (عضو 5) —
// الترتيب اليدوي يُحفَظ فعلياً بالنشر الآن، لا معاينة فقط.
//
// ⚠️ جديد: استبدال ملف — لا يُخزَّن كـ state ضمن `sections` (الملف الفعلي
// ليس جزءاً من JSON قابل للتسلسل بأمان)، بل بخريطة منفصلة `replacements`
// (مفتاح `${section}::${file}` → File)، تُمرَّر لـ buildSubjectPackage عبر
// معامل `fileReplacements` مستقل تماماً عن `items`/`existingLectures`.
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
  // ⚠️ جديد: خريطة استبدالات الملفات المعلَّقة (لم تُنشَر بعد) — مفتاح
  // `${section}::${file}` → File. تُصفَّر عند تغيير المادة/الدكتور النشِط حتى
  // لا يُعاد استخدام ملف اختير لمادة/شعبة مختلفة بالغلط.
  const [replacements, setReplacements] = useState({});
  // ⚠️ جديد (2026-08-02، اقتراح #6): بصمة الأقسام كما جاءت من الشبكة — تُحدَّث
  // بكل مرة تُجلَب/تُعاد تحميل sections فعلياً (التحميل الأول، وتبديل الدكتور
  // النشِط)، لا عند أي تعديل يدوي — هذا بالضبط ما نقارن ضده لمعرفة "هل عدَّل
  // المدير شيئاً لم يُنشَر بعد؟".
  const initialSectionsRef = useRef([]);

  function handleReplaceFile(sectionKey, fileName, file) {
    setReplacements((prev) => ({ ...prev, [`${sectionKey}::${fileName}`]: file }));
  }

  useEffect(() => {
    fetchStudyPlan().then(setStudyPlan);
  }, []);

  useEffect(() => {
    if (!selectedId) {
      setSubjectDetail(null);
      setSections([]);
      setActiveVariant(null);
      setReplacements({});
      initialSectionsRef.current = [];
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
        initialSectionsRef.current = lecturesData.sections ?? [];
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
    initialSectionsRef.current = lecturesData.sections ?? [];
    setReplacements({});
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
        items: [],
        // ⚠️ جديد: تحويل خريطة الاستبدالات المعلَّقة لمصفوفة العقد المتوقَّعة
        // بـ buildSubjectPackage (عضو 5) — { section, file, newFile }.
        fileReplacements: Object.entries(replacements).map(([key, newFile]) => {
          const [section, file] = key.split("::");
          return { section, file, newFile };
        }),
      });
    } catch (err) {
      pkg = null;
    }
  }

  // ⚠️ جديد (2026-08-02، اقتراح #6): "عدَّل" = ترتيب/محتوى الأقسام تغيّر عن
  // آخر تحميل فعلي من الشبكة، أو يوجد استبدال ملف معلَّق واحد على الأقل.
  const dirty =
    JSON.stringify(sections) !== JSON.stringify(initialSectionsRef.current) ||
    Object.keys(replacements).length > 0;
  useUnsavedChangesWarning(dirty);

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
              التغييرات هنا (الإخفاء/العنوان/الترتيب/النقل بين الأقسام/استبدال الملف) لا تُطبَّق
              فعلياً إلا بعد الضغط على "نشر" بالأسفل.
            </p>
            <SectionsManager
              sections={sections}
              onChange={setSections}
              onReplaceFile={handleReplaceFile}
              pendingReplacements={replacements}
            />
          </div>
          <div className="rounded-lg border border-border bg-bg-subtle p-4">
            <PublishPanel pkg={pkg} />
          </div>
        </>
      )}
    </div>
  );
}
