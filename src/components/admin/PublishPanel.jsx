import React, { useState } from "react";
// ⚠️ ملف مملوك لعضو 5 — واجهة النشر فقط، يستدعي lib/githubPublisher.js.
// يُستدعى من داخل SubjectForm.jsx (عضو 3) بالنهاية، بدون أن يحتاج عضو 3
// يعرف أي تفاصيل عن GitHub API.
//
// عقد الاستخدام: <PublishPanel pkg={pkg} /> حيث pkg = buildSubjectPackage(...)
// (عضو 3 يستدعي buildSubjectPackage بنفسه من lib/githubPublisher.js ليبني pkg
// من بيانات النموذج + الملفات، ثم يمرره هنا كما هو).

import { publishToGitHub, exportPackageAsZip } from "../../lib/githubPublisher.js";
import { getStoredToken, DEFAULT_OWNER, DEFAULT_REPO } from "../../lib/adminAuth.js";

// ⚠️ جديد (2026-08-02، طلب مباشر من المستخدم — اقتراح #2 من مراجعة خبير
// للوحة التحكم: "معاينة قبل النشر"). ملخّص بسيط لما سيتغيّر فعلياً قبل ضغط
// "نشر" — نُشتَق من شكل pkg نفسه (بلا أي طلب شبكة إضافي، البيانات موجودة
// أصلاً بالحزمة). ثلاثة أشكال pkg معروفة تصل PublishPanel فعلاً (تحقّقتُ من
// كل نقاط الاستدعاء الثلاث: SubjectForm.jsx/AdminSectionsManager.jsx كلاهما
// buildSubjectPackage بلا حقل kind، StudyPlanEditor.jsx buildStudyPlanUpdate
// كـ kind="study-plan-update"، AdminHome.jsx buildSubjectDeletion كـ
// kind="subject-deletion" — راجع lib/githubPublisher.js لتوثيق كل شكل):
//   - subject-deletion: حذف نهائي — يُعرَض بتحذير أحمر صريح.
//   - study-plan-update: تحديث ملف قائمة المواد فقط.
//   - (بلا kind، أي buildSubjectPackage): إنشاء/تحديث مادة — pkg لا يحمل
//     معلومة "جديد أم تعديل" لكل ملف على حدة (subject.json/lectures.json قد
//     يكونان أياً منهما)، فنعرضهما بصياغة محايدة "سيُكتب" بدل الجزم بأحدهما.
function describePackage(pkg) {
  if (!pkg) return null;
  if (pkg.kind === "subject-deletion") {
    return {
      danger: true,
      write: [pkg.studyPlanPath],
      del: [...pkg.filesToDelete, `${pkg.pdfDir}/* (كل ملفات هذي المادة)`],
    };
  }
  if (pkg.kind === "study-plan-update") {
    return { danger: false, write: [pkg.studyPlanPath], del: [] };
  }
  // buildSubjectPackage (بلا kind)
  const write = [pkg.subjectPath, pkg.lecturesPath, pkg.studyPlanPath].filter(Boolean);
  const uploads = Array.isArray(pkg.pdfFiles) ? pkg.pdfFiles.map((f) => f.path) : [];
  return { danger: false, write, uploads, del: [] };
}

export default function PublishPanel({ pkg, onPublishSuccess }) {
  // خطة الدفعة 4، المهمة 1: نفس توكن دخول لوحة التحكم (AdminAuthGate، عضو 3) يُستخدم
  // هنا مباشرة لو موجود ومصادَق عليه مسبقاً — يتخطى حقل الإدخال كلياً بهذي الحالة.
  const storedToken = getStoredToken();
  const [token, setToken] = useState(storedToken || "");
  const [showTokenField, setShowTokenField] = useState(!storedToken);
  const [owner, setOwner] = useState(DEFAULT_OWNER);
  const [repo, setRepo] = useState(DEFAULT_REPO);
  const [reviewOnly, setReviewOnly] = useState(false); // خطة الدفعة 4، المهمة 2: افتراضياً دمج تلقائي
  const [status, setStatus] = useState("idle"); // idle | publishing | zipping | success | error
  const [error, setError] = useState(null);
  const [result, setResult] = useState(null); // { prUrl, merged, mergeError }

  const disabled = !pkg || status === "publishing" || status === "zipping";
  const preview = describePackage(pkg);
  // ⚠️ إصلاح خلل حرج ثانٍ من نفس المراجعة (2026-08-02): exportPackageAsZip
  // بـ lib/githubPublisher.js يفترض هو الآخر شكل buildSubjectPackage حصراً
  // (`for (const pdf of pkg.pdfFiles)` بلا أي حارس) — كان سيرمي استثناءً
  // فوراً لو ضُغط "تنزيل حزمة (ZIP)" مع pkg حذف/تحديث خطة دراسية. الإصلاح
  // هنا بمستوى الواجهة فقط (لا تعديل على lib/githubPublisher.js، ملف عضو 5):
  // الزر لا معنى له أصلاً بهاتين الحالتين (لا ملفات فعلية لتُجمَّع بـ ZIP)،
  // فيُخفى بدل تعطيله بلا تفسير.
  const canZip = Boolean(pkg && !pkg.kind);

  async function handlePublish() {
    setError(null);
    setResult(null);
    setStatus("publishing");
    try {
      const res = await publishToGitHub({
        token,
        owner,
        repo,
        pkg,
        autoMerge: !reviewOnly,
      });
      setResult(res);
      setStatus("success");
      // ⚠️ الملفات فعلياً وصلت GitHub (دُمجت أو بانتظار مراجعة PR) — لازم تصفير
      // القائمة هنا لمنع نشر نفس الملفات مرة ثانية بالغلط لو ضُغط "نشر" مجدداً.
      onPublishSuccess?.();
    } catch (err) {
      setError(err.message || "فشل النشر");
      setStatus("error");
    }
  }

  async function handleDownload() {
    setError(null);
    setStatus("zipping");
    try {
      await exportPackageAsZip(pkg);
      setStatus("idle");
    } catch (err) {
      setError(err.message || "فشل تصدير الحزمة");
      setStatus("error");
    }
  }

  if (!pkg) {
    return (
      <div className="text-text-muted text-sm">
        لا توجد حزمة جاهزة للنشر بعد — عبّئ النموذج وارفع الملفات أولاً.
      </div>
    );
  }

  return (
    <div className="border border-border rounded-lg p-4 bg-bg-subtle space-y-4">
      <div>
        <h3 className="text-text-h font-semibold mb-1">النشر</h3>
        {/* ⚠️ إصلاح خلل حرج اكتشفته أثناء بناء المعاينة أعلاه (2026-08-02، ليس
            جزءاً من الاقتراح #2 نفسه — عثرت عليه بالصدفة بمراجعة هذا السطر):
            الكود القديم كان يفترض دائماً {pkg.subjectJson.name}/{pkg.pdfFiles.length}
            بصرف النظر عن نوع pkg — يعمل فقط مع buildSubjectPackage. أي استدعاء
            من AdminHome.jsx (حذف مادة، buildSubjectDeletion) أو StudyPlanEditor.jsx
            (buildStudyPlanUpdate) كان يجب أن يُسقِط هذا المكوّن بخطأ JS كامل
            (subjectJson undefined) بمجرد ظهور pkg — أي أن شاشتي "حذف مادة" و"تحرير
            خطة المواد" كانتا معطَّلتين كلياً بمجرد وصول مرحلة النشر. الآن يتفرّع
            حسب pkg.kind بدل الافتراض الأعمى. */}
        <p className="text-text-muted text-sm">
          {pkg.kind === "subject-deletion"
            ? `حذف نهائي للمادة — ${pkg.slug}`
            : pkg.kind === "study-plan-update"
            ? "تحديث قائمة المواد (study-plan.json) فقط"
            : `${pkg.subjectJson?.name ?? pkg.slug} (${pkg.slug}) — ${pkg.pdfFiles?.length ?? 0} ملف`}
        </p>
      </div>

      {preview && (
        <div
          className={`rounded-md border p-3 text-xs space-y-1.5 ${
            preview.danger
              ? "border-danger-border bg-danger-bg text-danger-text"
              : "border-border bg-bg text-text"
          }`}
        >
          <p className="font-medium">سيحدث عند النشر:</p>
          {preview.write.length > 0 && (
            <p>
              📝 سيُكتب/يُحدَّث ({preview.write.length}): {preview.write.join("، ")}
            </p>
          )}
          {preview.uploads?.length > 0 && (
            <p>
              ⭳ سيُرفَع ({preview.uploads.length} ملف): {preview.uploads.join("، ")}
            </p>
          )}
          {preview.del.length > 0 && (
            <p className="font-medium">
              🗑️ سيُحذَف نهائياً ({preview.del.length}): {preview.del.join("، ")}
            </p>
          )}
        </div>
      )}

      <div className="bg-warning-bg border border-warning-border text-warning-text text-xs rounded-md p-3">
        التوكن يُستخدم من متصفحك مباشرة للاتصال بـ GitHub فقط (api.github.com) — لا يُخزَّن
        بأي مكان دائم (sessionStorage فقط، يُمسح بإغلاق التبويب) ولا يراه أي عضو آخر.
        استخدم fine-grained token بصلاحية <code>contents</code> و<code>pull requests</code>{" "}
        على هذا الريبو تحديداً.
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <label className="text-sm text-text flex flex-col gap-1">
          Owner
          <input
            className="bg-bg border border-border rounded-md px-2 py-1 text-text"
            value={owner}
            onChange={(e) => setOwner(e.target.value)}
          />
        </label>
        <label className="text-sm text-text flex flex-col gap-1">
          Repo
          <input
            className="bg-bg border border-border rounded-md px-2 py-1 text-text"
            value={repo}
            onChange={(e) => setRepo(e.target.value)}
          />
        </label>
      </div>

      {showTokenField ? (
        <label className="text-sm text-text flex flex-col gap-1">
          GitHub Personal Access Token (fine-grained)
          <input
            type="password"
            className="bg-bg border border-border rounded-md px-2 py-1 text-text"
            value={token}
            onChange={(e) => setToken(e.target.value)}
            placeholder="github_pat_..."
            autoComplete="off"
          />
        </label>
      ) : (
        <div className="flex items-center justify-between text-sm text-text-muted bg-bg-elevated border border-border rounded-md px-3 py-2">
          <span>مستخدَم توكن الدخول المحفوظ لهذي الجلسة (نفس توكن لوحة التحكم).</span>
          <button
            type="button"
            onClick={() => setShowTokenField(true)}
            className="text-accent underline text-xs shrink-0 ms-2"
          >
            تغيير
          </button>
        </div>
      )}

      <label className="flex items-center gap-2 text-sm text-text">
        <input
          type="checkbox"
          checked={reviewOnly}
          onChange={(e) => setReviewOnly(e.target.checked)}
        />
        لا تدمج تلقائياً، اترك Pull Request للمراجعة
      </label>

      <div className="flex flex-wrap gap-3">
        <button
          type="button"
          onClick={handlePublish}
          disabled={disabled || !token}
          className="bg-accent hover:bg-accent-hover disabled:opacity-50 text-white rounded-md px-4 py-2 text-sm font-medium"
        >
          {status === "publishing" ? "جارٍ النشر…" : "نشر"}
        </button>
        {canZip && (
          <button
            type="button"
            onClick={handleDownload}
            disabled={disabled}
            className="bg-bg-elevated hover:bg-bg-subtle disabled:opacity-50 text-text border border-border rounded-md px-4 py-2 text-sm font-medium"
          >
            {status === "zipping" ? "جارٍ التجهيز…" : "تنزيل حزمة (ZIP)"}
          </button>
        )}
      </div>

      {status === "success" && result && (
        <div className="bg-bg-elevated border border-border rounded-md p-3 text-sm text-text space-y-1">
          {result.merged ? (
            <p>✅ تم النشر ودمج التعديلات مباشرة بـ main.</p>
          ) : (
            <p>
              تم رفع الملفات وفتح Pull Request
              {result.mergeError ? " — لكن الدمج التلقائي فشل، يحتاج دمجاً يدوياً" : " للمراجعة"}:
            </p>
          )}
          <a href={result.prUrl} target="_blank" rel="noreferrer" className="text-accent underline break-all">
            {result.prUrl}
          </a>
          {result.mergeError && (
            <p className="text-warning-text text-xs">{result.mergeError}</p>
          )}
        </div>
      )}

      {status === "error" && error && (
        <div className="bg-danger-bg border border-danger-border text-danger-text text-sm rounded-md p-3">
          {error}
        </div>
      )}
    </div>
  );
}
