import React, { useEffect, useState } from "react";
import { isValidSlug } from "../../lib/idSlug.js";
import PublishPanel from "./PublishPanel.jsx";

// ⚠️ ملف مملوك لعضو 3 — جديد (مهمة "تحرير خطة المواد + حذف مباشر"، معتمدة
// من المدير 2026-07-20). يحرّر **بيانات القائمة الوصفية فقط** بـ study-plan.json
// (اسم/رمز/ترتيب/إخفاء/إضافة أو حذف سطر) — بمعزل تام عن محتوى المادة الفعلي
// (محاضرات/دكاترة)، حسب توضيح المدير الصريح. لتحرير المحتوى الفعلي استخدم
// SubjectForm.jsx كالمعتاد.
//
// ⚠️ ملاحظة فرق مهمة عن زر "حذف" بـ AdminHome.jsx:
// - حذف سطر من هنا (buildStudyPlanUpdate) = يزيل المادة من القائمة العامة فقط.
//   ملفات subject.json/lectures*.json/pdf تبقى موجودة على GitHub بلا حذف —
//   المادة تصبح "غير مُدرَجة" لا "محذوفة"، ويمكن إرجاعها لاحقاً بإضافة سطر بنفس id.
// - حذف مادة بالكامل من AdminHome.jsx (buildSubjectDeletion) = حذف تدميري كامل
//   (الملفات + السطر من القائمة معاً)، لا رجعة عنه إلا بإعادة رفع المحتوى من الصفر.
//
// ⚠️ عقد مؤقت (mock) بانتظار تسليم عضو 5 (معتمَد بخطة المدير 2026-07-20):
// buildStudyPlanUpdate(courses) → pkg — يكتب public/data/study-plan.json كاملاً
// بقائمة courses الجديدة. عند التسليم الفعلي، استبدل الاستيراد أدناه بـ:
//   import { buildStudyPlanUpdate } from "../../lib/githubPublisher.js";
// واحذف mockBuildStudyPlanUpdate كاملاً — بقية هذا الملف لا يحتاج أي تعديل آخر
// (يتحقق من `pkg?.__mock` فقط ليعرض معاينة بدل PublishPanel الحقيقي).

// ✅ تم التبديل — 2026-07-22: عضو 5 سلَّم buildStudyPlanUpdate فعلياً بـ
// githubPublisher.js (نفس شكل pkg الموثَّق أعلاه بالضبط). استبدلت الاستيراد
// كما أوصى تعليقي القديم مباشرة، وحذفت mockBuildStudyPlanUpdate — بقية الملف
// لم يحتج أي تعديل إضافي (فرع else بعرض pkg الحقيقي كان جاهزاً وينتظر هذا فقط).
import { buildStudyPlanUpdate } from "../../lib/githubPublisher.js";

async function fetchStudyPlan() {
  const res = await fetch(`${import.meta.env.BASE_URL}data/study-plan.json?_=${Date.now()}`, {
    cache: "no-store",
  });
  if (!res.ok) return { courses: [] };
  return res.json();
}

function emptyRow() {
  return { id: "", name: "", code: "", hidden: false };
}

export default function StudyPlanEditor() {
  const [original, setOriginal] = useState(null); // النسخة كما جُلبت، لمقارنة existingIds
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newRow, setNewRow] = useState(emptyRow());
  const [addError, setAddError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    fetchStudyPlan().then((plan) => {
      if (cancelled) return;
      setOriginal(plan);
      setCourses(plan.courses ?? []);
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  function updateRow(index, patch) {
    setCourses((prev) => prev.map((c, i) => (i === index ? { ...c, ...patch } : c)));
  }

  function removeRow(index) {
    setCourses((prev) => prev.filter((_, i) => i !== index));
  }

  function moveRow(index, dir) {
    const target = index + dir;
    if (target < 0 || target >= courses.length) return;
    setCourses((prev) => {
      const next = [...prev];
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  }

  function addRow() {
    setAddError(null);
    const id = newRow.id.trim();
    const existingIds = courses.map((c) => c.id);
    if (!isValidSlug(id, existingIds)) {
      setAddError("المعرّف (id) غير صالح أو مستخدَم مسبقاً (أحرف إنجليزية صغيرة وأرقام وشرطات فقط)");
      return;
    }
    if (!newRow.name.trim()) {
      setAddError("اسم المادة مطلوب");
      return;
    }
    setCourses((prev) => [...prev, { ...newRow, id }]);
    setNewRow(emptyRow());
  }

  const changed = original ? JSON.stringify(original.courses ?? []) !== JSON.stringify(courses) : false;
  const pkg = changed ? buildStudyPlanUpdate(courses) : null;

  if (loading) return <div className="text-text-muted">...جارِ التحميل</div>;

  return (
    <div className="flex flex-col gap-4">
      <p className="text-xs text-text-muted">
        هذا التبويب يحرّر قائمة المواد الوصفية فقط (اسم/رمز/ترتيب/إخفاء) — لا يلمس محتوى أي
        مادة. حذف سطر من هنا يزيل المادة من القائمة العامة فقط، ويبقي ملفاتها كما هي على
        GitHub (راجع الفرق مع زر "حذف" بتبويب "قائمة المواد").
      </p>

      <div className="overflow-x-auto rounded-lg border border-border bg-bg-subtle p-3">
        <table className="w-full min-w-[560px] text-sm">
          <thead>
            <tr className="text-start text-xs text-text-muted">
              <th className="p-2 text-start">الترتيب</th>
              <th className="p-2 text-start">id</th>
              <th className="p-2 text-start">الاسم</th>
              <th className="p-2 text-start">الرمز</th>
              <th className="p-2 text-start">مخفي</th>
              <th className="p-2 text-start"></th>
            </tr>
          </thead>
          <tbody>
            {courses.map((c, i) => (
              <tr key={c.id} className="border-t border-border">
                <td className="p-2">
                  <div className="flex gap-1">
                    <button
                      type="button"
                      onClick={() => moveRow(i, -1)}
                      disabled={i === 0}
                      className="rounded border border-border px-1.5 text-xs text-text hover:bg-bg-elevated disabled:opacity-40"
                    >
                      ▲
                    </button>
                    <button
                      type="button"
                      onClick={() => moveRow(i, 1)}
                      disabled={i === courses.length - 1}
                      className="rounded border border-border px-1.5 text-xs text-text hover:bg-bg-elevated disabled:opacity-40"
                    >
                      ▼
                    </button>
                  </div>
                </td>
                <td className="p-2 text-xs text-text-muted">{c.id}</td>
                <td className="p-2">
                  <input
                    value={c.name}
                    onChange={(e) => updateRow(i, { name: e.target.value })}
                    className="w-full rounded-md border border-border bg-bg px-2 py-1 text-text"
                  />
                </td>
                <td className="p-2">
                  <input
                    value={c.code ?? ""}
                    onChange={(e) => updateRow(i, { code: e.target.value })}
                    className="w-full rounded-md border border-border bg-bg px-2 py-1 text-text"
                  />
                </td>
                <td className="p-2">
                  <input
                    type="checkbox"
                    checked={Boolean(c.hidden)}
                    onChange={(e) => updateRow(i, { hidden: e.target.checked })}
                    className="h-4 w-4"
                  />
                </td>
                <td className="p-2">
                  <button
                    type="button"
                    onClick={() => removeRow(i)}
                    className="rounded-md border border-danger-border bg-danger-bg px-2 py-1 text-xs text-danger-text hover:opacity-80"
                  >
                    إزالة من القائمة
                  </button>
                </td>
              </tr>
            ))}
            {courses.length === 0 && (
              <tr>
                <td colSpan={6} className="p-3 text-center text-xs text-text-muted">
                  لا توجد مواد بالقائمة.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="rounded-lg border border-border bg-bg-subtle p-3">
        <h3 className="mb-2 text-sm font-semibold text-text-h">+ إضافة سطر يدوياً</h3>
        <div className="flex flex-wrap gap-2">
          <input
            value={newRow.id}
            onChange={(e) => setNewRow((r) => ({ ...r, id: e.target.value }))}
            placeholder="id (مثال: math-1)"
            className="min-w-0 flex-1 rounded-md border border-border bg-bg px-2 py-1 text-sm text-text"
          />
          <input
            value={newRow.name}
            onChange={(e) => setNewRow((r) => ({ ...r, name: e.target.value }))}
            placeholder="اسم المادة"
            className="min-w-0 flex-1 rounded-md border border-border bg-bg px-2 py-1 text-sm text-text"
          />
          <input
            value={newRow.code}
            onChange={(e) => setNewRow((r) => ({ ...r, code: e.target.value }))}
            placeholder="الرمز (اختياري)"
            className="min-w-0 flex-1 rounded-md border border-border bg-bg px-2 py-1 text-sm text-text"
          />
          <button
            type="button"
            onClick={addRow}
            className="rounded-md border border-border px-3 py-1 text-sm text-text hover:bg-bg-elevated"
          >
            إضافة
          </button>
        </div>
        {addError && <p className="mt-2 text-xs text-danger-text">{addError}</p>}
        <p className="mt-2 text-xs text-text-muted">
          ملاحظة: إضافة سطر هنا لا ينشئ صفحة/محتوى فعلياً للمادة — فقط سطراً بالقائمة. لإضافة
          مادة بمحتوى كامل استخدم "+ إضافة مادة جديدة" بتبويب "قائمة المواد".
        </p>
      </div>

      {changed && (
        <div className="rounded-lg border border-border bg-bg-subtle p-4">
          <PublishPanel pkg={pkg} />
        </div>
      )}
    </div>
  );
}
