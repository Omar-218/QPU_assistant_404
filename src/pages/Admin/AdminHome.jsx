import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import PublishPanel from "../../components/admin/PublishPanel.jsx";
import StudyPlanEditor from "../../components/admin/StudyPlanEditor.jsx";

// ⚠️ ملف مملوك لعضو 3 (لوحة التحكم — الواجهة).
//
// ملاحظة مصدر البيانات (ليست بالعقود الأصلية، قرار عضو 3):
// لا يوجد "فهرس" ثابت لكل المواد بهذا المشروع، فقط public/data/study-plan.json
// و public/data/subjects/{slug}/subject.json المتفرقة. بانتظار وجود endpoint/فهرس
// مخصص، استخدمت study-plan.json كمصدر لقائمة المواد بلوحة التحكم لأنه أنسب
// مصدر موجود فعلاً من اليوم الأول (يحوي id/name/code/hidden لكل مادة).
// إن أنشأ المدير أو عضو 4 فهرساً مخصصاً لاحقاً، هذا الملف فقط من يحتاج تعديل
// نقطة الجلب أدناه (fetchSubjects) وبقية الصفحة تبقى كما هي.
//
// ⚠️ إصلاح (تقرير عضو 6، 2026-07-19: "المواد المضافة لا تظهر بصفحة المواد" —
// تكرّر رغم إصلاح buildSubjectPackage السابق): تأكّدت فعلياً من الريبو المنشور
// أن مادة "1110501" منشورة (subject.json + lectures موجودان) لكنها غائبة كلياً
// عن study-plan.json. السبب: `fetch()` العادي لملف ثابت كهذا قابل لأن يرجع نسخة
// مخزَّنة مؤقتاً (كاش المتصفح أو GitHub Pages/CDN) بدل أحدث نسخة فعلية على main.
// أي شاشة بلوحة التحكم تقرأ study-plan.json **كأساس لدمج/كتابة** لاحقة (هنا
// وبـ AdminSubjectEditor.jsx وAdminSectionsManager.jsx) يجب أن تقرأ نسخة طازجة
// دائماً، وإلا فأي إضافة سابقة غير موجودة بالنسخة المخزَّنة تُفقَد عند أول نشر
// لاحق يُعيد كتابة الملف كاملاً بناءً عليها. لذلك أضفت `cache: "no-store"` +
// معامل رابط لكسر أي كاش وسيط (CDN) لا يحترم رؤوس الطلب نفسها.
//
// ⚠️ تحديث (2026-07-20، معتمَد بخطة المدير): حذف مادة مباشر من هذي الشاشة، بدل
// الاضطرار للدخول لصفحة تعديل المادة، + تبويب جديد "تحرير خطة المواد"
// (StudyPlanEditor.jsx، ملفي أيضاً) لتعديلات القائمة الوصفية (اسم/رمز/ترتيب/
// إخفاء/إضافة أو إزالة سطر) بمعزل عن محتوى المادة الفعلي.
//
// ⚠️ عقد مؤقت (mock) بانتظار تسليم عضو 5 (معتمَد بخطة المدير 2026-07-20):
// buildSubjectDeletion(slug, { existingSubject, existingStudyPlan }) → pkg —
// يحذف subject.json + كل lectures*.json المرتبطة (بحسب professorVariants) +
// مجلد public/pdf/{slug} بالكامل، ويزيل سطر المادة من study-plan.json — بنفس
// الـ PR (بلا دمج تلقائي أبداً لعمليات الحذف، بحسب قرار المدير الأمني الصريح).
// عند التسليم الفعلي، استبدل الاستيراد أدناه بـ:
//   import { buildSubjectDeletion } from "../../lib/githubPublisher.js";
// واحذف mockBuildSubjectDeletion كاملاً — بقية هذا الملف لا يحتاج أي تعديل آخر.

// ✅ تم التبديل — 2026-07-22: عضو 5 سلَّم buildSubjectDeletion فعلياً بـ
// githubPublisher.js (تحقّقت من التطابق الحرفي مع العقد الموثَّق أعلاه: نفس
// شكل pkg، نفس filesToDelete/pdfDir/studyPlanJson). استبدلت mockBuildSubjectDeletion
// بالاستيراد الحقيقي كما أوصى التعليق أعلاه بالضبط — بقية الملف لم تحتج أي تعديل
// إضافي (فرع else بعرض pkg الحقيقي عبر PublishPanel كان جاهزاً مسبقاً وينتظر هذا
// فقط).
import { buildSubjectDeletion } from "../../lib/githubPublisher.js";

async function fetchStudyPlan() {
  const res = await fetch(`${import.meta.env.BASE_URL}data/study-plan.json?_=${Date.now()}`, {
    cache: "no-store",
  });
  if (!res.ok) throw new Error("تعذّر تحميل قائمة المواد");
  return res.json();
}

async function fetchSubjectDetail(id) {
  const res = await fetch(`${import.meta.env.BASE_URL}data/subjects/${id}/subject.json?_=${Date.now()}`, {
    cache: "no-store",
  });
  if (!res.ok) return null;
  return res.json();
}

const TABS = {
  LIST: "list",
  STUDY_PLAN: "studyplan",
};

export default function AdminHome() {
  const [tab, setTab] = useState(TABS.LIST);
  const [studyPlan, setStudyPlan] = useState({ courses: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  // إخفاء هنا محلي فقط بواجهة العرض (معاينة) — التطبيق الفعلي يمر عبر محرر
  // المادة (checkbox "إخفاء") ← PublishPanel، لأن الموقع Static بلا خادم.
  const [localOverrides, setLocalOverrides] = useState({});

  // تدفّق الحذف: id → "confirming" | "building" | pkg الناتج
  const [deleteState, setDeleteState] = useState({});

  useEffect(() => {
    let cancelled = false;
    fetchStudyPlan()
      .then((plan) => {
        if (!cancelled) setStudyPlan(plan);
      })
      .catch((err) => {
        if (!cancelled) setError(err.message);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const subjects = studyPlan.courses ?? [];

  function toggleLocalHidden(id) {
    setLocalOverrides((prev) => ({
      ...prev,
      [id]: !(prev[id] ?? subjects.find((s) => s.id === id)?.hidden ?? false),
    }));
  }

  function askDelete(id) {
    setDeleteState((prev) => ({ ...prev, [id]: "confirming" }));
  }

  function cancelDelete(id) {
    setDeleteState((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
  }

  async function confirmDelete(id) {
    setDeleteState((prev) => ({ ...prev, [id]: "building" }));
    const existingSubject = await fetchSubjectDetail(id);
    const pkg = buildSubjectDeletion(id, { existingSubject, existingStudyPlan: studyPlan });
    setDeleteState((prev) => ({ ...prev, [id]: pkg }));
  }

  if (loading) return <div className="text-text-muted">...جارِ التحميل</div>;
  if (error) return <div className="text-danger-text">{error}</div>;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-text-h">لوحة التحكم</h1>
        <div className="flex items-center gap-2">
          <Link
            to="/admin/requests"
            className="rounded-md border border-border px-3 py-1.5 text-sm text-text hover:bg-bg-elevated"
          >
            طلبات الطلاب
          </Link>
          <Link
            to="/admin/events-log"
            className="rounded-md border border-border px-3 py-1.5 text-sm text-text hover:bg-bg-elevated"
          >
            سجل الأحداث
          </Link>
          <Link
            to="/admin/sections"
            className="rounded-md border border-border px-3 py-1.5 text-sm text-text hover:bg-bg-elevated"
          >
            إدارة الأقسام
          </Link>
          <Link
            to="/admin/subject"
            className="rounded-md bg-accent px-3 py-1.5 text-sm text-white hover:bg-accent-hover"
          >
            + إضافة مادة جديدة
          </Link>
        </div>
      </div>

      <div className="flex gap-1 border-b border-border">
        <button
          type="button"
          onClick={() => setTab(TABS.LIST)}
          className={`px-3 py-2 text-sm ${
            tab === TABS.LIST
              ? "border-b-2 border-accent font-medium text-text-h"
              : "text-text-muted hover:text-text"
          }`}
        >
          قائمة المواد
        </button>
        <button
          type="button"
          onClick={() => setTab(TABS.STUDY_PLAN)}
          className={`px-3 py-2 text-sm ${
            tab === TABS.STUDY_PLAN
              ? "border-b-2 border-accent font-medium text-text-h"
              : "text-text-muted hover:text-text"
          }`}
        >
          تحرير خطة المواد
        </button>
      </div>

      {tab === TABS.STUDY_PLAN && <StudyPlanEditor />}

      {tab === TABS.LIST && (
        <>
          {subjects.length === 0 && (
            <p className="text-sm text-text-muted">لا توجد مواد بعد.</p>
          )}

          <ul className="flex flex-col gap-2">
            {subjects.map((s) => {
              const hiddenNow = localOverrides[s.id] ?? s.hidden;
              const del = deleteState[s.id];
              const confirming = del === "confirming";
              const building = del === "building";
              const pkg = del && typeof del === "object" ? del : null;

              return (
                <li
                  key={s.id}
                  className={`flex flex-col gap-2 rounded-lg border px-4 py-3 ${
                    del
                      ? "border-danger-border bg-danger-bg"
                      : hiddenNow
                      ? "border-warning-border bg-warning-bg"
                      : "border-border bg-bg-subtle"
                  }`}
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <p className="font-medium text-text-h">
                        {s.name}{" "}
                        {hiddenNow && !del && (
                          <span className="ms-2 rounded-full bg-warning-border px-2 py-0.5 text-xs text-warning-text">
                            مخفي
                          </span>
                        )}
                      </p>
                      <p className="text-xs text-text-muted">
                        {s.id} {s.code ? `· ${s.code}` : ""}
                      </p>
                    </div>

                    {!del && (
                      <div className="flex items-center gap-2">
                        <Link
                          to={`/admin/subject/${s.id}`}
                          className="rounded-md border border-border px-3 py-1 text-xs text-text hover:bg-bg-elevated"
                        >
                          تعديل
                        </Link>
                        <button
                          type="button"
                          onClick={() => toggleLocalHidden(s.id)}
                          className="rounded-md border border-border px-3 py-1 text-xs text-text hover:bg-bg-elevated"
                        >
                          {hiddenNow ? "إظهار" : "إخفاء"}
                        </button>
                        <button
                          type="button"
                          onClick={() => askDelete(s.id)}
                          className="rounded-md border border-danger-border bg-danger-bg px-3 py-1 text-xs text-danger-text hover:opacity-80"
                        >
                          حذف
                        </button>
                      </div>
                    )}
                  </div>

                  {confirming && (
                    <div className="flex flex-wrap items-center gap-2 rounded-md border border-danger-border bg-bg p-3 text-sm">
                      <span className="text-danger-text">
                        ⚠️ هذا حذف نهائي: سيُزال subject.json وكل ملفات المحاضرات وكل PDF
                        المرتبطة بهذي المادة، ويُخرَج سطرها من قائمة المواد. لا رجعة عنه إلا
                        بإعادة رفع المحتوى من الصفر. متأكد؟
                      </span>
                      <div className="ms-auto flex gap-2">
                        <button
                          type="button"
                          onClick={() => confirmDelete(s.id)}
                          className="rounded-md bg-danger-border px-3 py-1 text-xs font-medium text-white hover:opacity-90"
                        >
                          نعم، احذف نهائياً
                        </button>
                        <button
                          type="button"
                          onClick={() => cancelDelete(s.id)}
                          className="rounded-md border border-border px-3 py-1 text-xs text-text hover:bg-bg-elevated"
                        >
                          إلغاء
                        </button>
                      </div>
                    </div>
                  )}

                  {building && (
                    <p className="text-xs text-text-muted">...جارِ تجهيز الحذف</p>
                  )}

                  {pkg && (
                    <div className="flex flex-col gap-2 rounded-md border border-border bg-bg p-3">
                      <button
                        type="button"
                        onClick={() => cancelDelete(s.id)}
                        className="self-start rounded-md border border-border px-3 py-1 text-xs text-text hover:bg-bg-elevated"
                      >
                        إلغاء الحذف وإغلاق
                      </button>
                      <PublishPanel pkg={pkg} />
                    </div>
                  )}
                </li>
              );
            })}
          </ul>

          {Object.keys(localOverrides).length > 0 && (
            <p className="text-xs text-text-muted">
              ⚠️ تغييرات الإخفاء أعلاه محلية بالمتصفح فقط للمعاينة (الموقع Static بلا خادم) —
              افتح "تعديل" على كل مادة وانشر التغيير فعلياً عبر لوحة النشر ليتم حفظه.
            </p>
          )}
        </>
      )}
    </div>
  );
}
