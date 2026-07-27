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
        <p className="text-text-muted text-sm">
          {pkg.subjectJson.name} ({pkg.slug}) — {pkg.pdfFiles.length} ملف
        </p>
      </div>

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
        <button
          type="button"
          onClick={handleDownload}
          disabled={disabled}
          className="bg-bg-elevated hover:bg-bg-subtle disabled:opacity-50 text-text border border-border rounded-md px-4 py-2 text-sm font-medium"
        >
          {status === "zipping" ? "جارٍ التجهيز…" : "تنزيل حزمة (ZIP)"}
        </button>
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
