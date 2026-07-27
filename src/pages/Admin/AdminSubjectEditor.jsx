import React, { useEffect, useState } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import SubjectForm from "../../components/admin/SubjectForm.jsx";
import CurriculumCoursePicker from "../../components/admin/CurriculumCoursePicker.jsx";
import { findCurriculumCourse } from "../../lib/curriculum.js";

// ⚠️ ملف مملوك لعضو 3 — محرر المادة (إضافة/تعديل).
// يجلب subject.json + كل ملفات lectures*.json المرتبطة به مباشرة (بدون
// useSubjectData الخاص بعضو 4، لأن ذاك الـ hook يستبعد العناصر المخفية
// عن قصد للطلاب — لوحة التحكم بالعكس يجب أن تُظهر كل شيء بما فيه المخفي).
//
// ⚠️ تحديث: عند إضافة مادة جديدة (لا id بالرابط)، تُعرض أولاً قائمة اختيار
// من الخطة الدراسية الرسمية (curriculum.json عبر CurriculumCoursePicker) بدل
// نموذج فاضٍ مباشرة. رابط `?course=<id>` (مثلاً من زر بصفحة StudyPlan) يختار
// المادة تلقائياً بلا حاجة للبحث اليدوي. "تجاهل" يرجع لنموذج فاضٍ كالسابق.

// ⚠️ إصلاح حرج (2026-07-24، تقرير مستخدم: إضافة مادة تحذف آخر مادة أُضيفت
// من study-plan.json صامتاً): كانت هذي الدوال تجلب البيانات بـ fetch عادي
// بلا حماية من الكاش، بعكس نسخ StudyPlanEditor.jsx/AdminHome.jsx (نفس الغرض
// بالضبط) اللي عندها cache-busting من زمان. لو المتصفح رجّع نسخة مخزَّنة
// مؤقتاً ناقصة (عادةً أحدث مادة أُضيفت، لأن كاشها لسا ما تحدَّث)، تُبنى
// study-plan.json الجديدة فوق أساس ناقص وتُفقد تلك المادة صامتاً عند النشر.
// نفس الإصلاح بالضبط المطبَّق ببقية الملفات — راجع docs/logs/member-3-log.md.
async function fetchStudyPlan() {
  const res = await fetch(
    `${import.meta.env.BASE_URL}data/study-plan.json?_=${Date.now()}`,
    { cache: "no-store" }
  );
  if (!res.ok) return { courses: [] };
  return res.json();
}

// نفس درجة الحذر (احترازي): تعديل مادة موجودة يعتمد على أحدث نسخة من
// subject.json/lectures*.json — لو الآدمن نشر تعديلاً على المحاضرات ثم فتح
// نفس المادة للتعديل مباشرة، كاش المتصفح قد يرجّع نسخة قبل آخر نشر.
async function fetchSubject(id) {
  const res = await fetch(
    `${import.meta.env.BASE_URL}data/subjects/${id}/subject.json?_=${Date.now()}`,
    { cache: "no-store" }
  );
  if (!res.ok) return null;
  return res.json();
}

async function fetchLecturesFile(id, filename) {
  const res = await fetch(
    `${import.meta.env.BASE_URL}data/subjects/${id}/${filename}?_=${Date.now()}`,
    { cache: "no-store" }
  );
  if (!res.ok) return { sections: [] };
  return res.json();
}

/** يبني { [professorId|"_default"]: { sections } } حسب عقد subject.json (القسم 4.3)
 * — نفس الشكل الذي يتوقعه SubjectForm (initialLecturesByVariant). */
async function fetchAllLectures(id, subject) {
  if (subject?.professorVariants?.length) {
    const entries = await Promise.all(
      subject.professorVariants.map(async (v) => {
        const data = await fetchLecturesFile(id, v.lecturesFile || "lectures.json");
        return [v.professorId, data];
      })
    );
    return Object.fromEntries(entries);
  }
  const data = await fetchLecturesFile(id, "lectures.json");
  return { _default: data };
}

export default function AdminSubjectEditor() {
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const isEditing = Boolean(id);

  const [loading, setLoading] = useState(isEditing);
  const [notFound, setNotFound] = useState(false);
  const [subject, setSubject] = useState(null);
  const [lecturesByVariant, setLecturesByVariant] = useState({});
  const [existingIds, setExistingIds] = useState([]);
  // ⚠️ إصلاح حرج (خسارة بيانات محتملة): كان existingStudyPlan لا يُجلَب ولا
  // يُمرَّر إطلاقاً لـ SubjectForm ← buildSubjectPackage، فكان النشر يكتب
  // study-plan.json من الصفر بمادة واحدة فقط ويفقد كل مادة أخرى موجودة سابقاً.
  const [studyPlan, setStudyPlan] = useState({ courses: [] });

  // undefined = لسا ما اختار (اعرض القائمة) | null = اختار "يدوياً" | object = مادة من الخطة
  const [pickedCourse, setPickedCourse] = useState(undefined);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      const plan = await fetchStudyPlan();
      const ids = (plan?.courses ?? []).map((c) => c.id);
      if (!isEditing) {
        if (!cancelled) {
          setStudyPlan(plan);
          setExistingIds(ids);
          setLoading(false);
        }
        const preselectId = searchParams.get("course");
        if (preselectId && !ids.includes(preselectId)) {
          const course = await findCurriculumCourse(preselectId);
          if (!cancelled && course) setPickedCourse(course);
        }
        return;
      }
      setLoading(true);
      const subj = await fetchSubject(id);
      if (!subj) {
        if (!cancelled) {
          setNotFound(true);
          setLoading(false);
        }
        return;
      }
      const lectures = await fetchAllLectures(id, subj);
      if (!cancelled) {
        setStudyPlan(plan);
        setExistingIds(ids);
        setSubject(subj);
        setLecturesByVariant(lectures);
        setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [id, isEditing, searchParams]);

  if (loading) return <div className="text-text-muted">...جارِ التحميل</div>;
  if (isEditing && notFound) {
    return <div className="text-danger-text">المادة "{id}" غير موجودة.</div>;
  }

  const showPicker = !isEditing && pickedCourse === undefined;

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-xl font-bold text-text-h">
        {isEditing ? `تعديل: ${subject?.name ?? id}` : "إضافة مادة جديدة"}
      </h1>

      {showPicker ? (
        <CurriculumCoursePicker existingIds={existingIds} onPick={setPickedCourse} />
      ) : (
        <SubjectForm
          key={isEditing ? id : pickedCourse?.id ?? "manual"}
          initialSubject={subject}
          initialLecturesByVariant={lecturesByVariant}
          existingIds={existingIds}
          existingStudyPlan={studyPlan}
          prefill={!isEditing ? pickedCourse : null}
        />
      )}
    </div>
  );
}
