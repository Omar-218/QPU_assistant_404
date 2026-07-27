import React, { useEffect, useState } from "react";
import { getStoredToken, DEFAULT_OWNER, DEFAULT_REPO } from "../../lib/adminAuth.js";
import { SECTION_LABELS } from "../../lib/sectionLabels.js";
import {
  buildEventDecision,
  buildUploadDecision,
  mergeExistingPR,
  publishToGitHub,
  closePendingRequestPR,
} from "../../lib/githubPublisher.js";

// ⚠️ ملف مملوك لعضو 3 — جديد (خطة الدفعة 5، `/admin/requests`).
// طابور مراجعة طلبات الطلاب (حدث مقترَح أو طلب رفع ملف) = قائمة PRs مفتوحة على
// main بعنوان يبدأ بـ [event] أو [upload]، مفتوحة بتوكن الطالب المقيَّد (عضو 5،
// studentSubmission.js). راجع docs/team-plan-batch5.md §0/§1.4 للعقد الكامل.
//
// ⚠️ تصحيح إداري بعد المراجعة (لا mock بعد الآن — كل هذا حقيقي):
// المسودة الأولى كانت تخطط لإعادة استخدام PublishPanel.jsx لمسار "قبول"، لكن
// PublishPanel مبني حصراً حول pkg من buildSubjectPackage (يقرأ pkg.subjectJson/
// pkg.pdfFiles مباشرة) ويستدعي publishToGitHub — وكلاهما غير متوافق مع قرارات
// عضو 5 المعتمَدة: "قبول" لـ event/upload-decision يمر حصراً عبر mergeExistingPR
// (يكتب على فرع الطالب الموجود مسبقاً ثم يدمج نفس الـ PR)، و"رفض" يحتاج تسجيل
// الحالة أولاً عبر publishToGitHub (فرع/PR جديد مستقل لتحديث ملف السجل على main)
// ثم إقفال PR الطالب الأصلي منفصلاً عبر closePendingRequestPR. لذلك هذا الملف
// يبني منطق العرض والقبول/الرفض بنفسه هنا مباشرة (بلا PublishPanel إطلاقاً).

function ghHeaders(token) {
  return {
    Authorization: `Bearer ${token}`,
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
  };
}

/** قراءة ملف JSON من main عبر Contents API — null لو 404 (الملف لسه ما انكتب
 * أول مرة، مثلاً قبل أول قرار أدمن على الإطلاق). ليست دالة نشر، قراءة فقط. */
async function fetchJsonFromMain(token, owner, repo, path) {
  const res = await fetch(
    `https://api.github.com/repos/${owner}/${repo}/contents/${path}?ref=main`,
    { headers: ghHeaders(token) }
  );
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`تعذّر قراءة ${path}: ${res.status}`);
  const data = await res.json();
  return JSON.parse(decodeURIComponent(escape(atob(data.content.replace(/\n/g, "")))));
}

/** يحدّد اسم ملف المحاضرات الصحيح لمادة معيّنة (يدعم تعدد الدكاترة —
 * professorVariants — بنفس منطق SubjectForm.jsx: الدكتور النشِط، وإلا الأول،
 * وإلا lectures.json الافتراضي لو المادة بدكتور واحد بلا تعدد). */
async function resolveLecturesFileName(token, owner, repo, subjectId) {
  const subject = await fetchJsonFromMain(
    token,
    owner,
    repo,
    `public/data/subjects/${subjectId}/subject.json`
  );
  const variants = subject?.professorVariants;
  if (Array.isArray(variants) && variants.length > 0) {
    const active = variants.find((v) => v.active) || variants[0];
    return active?.lecturesFile || "lectures.json";
  }
  return "lectures.json";
}

/** يفكّك عنوان PR بصيغة القسم 1.4 لمعرفة النوع (event/upload) */
function classifyTitle(title) {
  if (title.startsWith("[event]")) return "event";
  if (title.startsWith("[upload]")) return "upload";
  return null;
}

/** يفكّك جسم الـ PR (كتلة JSON، بمفردها أو داخل ```) حسب القسم 1.4 */
function parsePrBody(body) {
  if (!body) return null;
  const fenced = body.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const raw = fenced ? fenced[1] : body;
  try {
    return JSON.parse(raw.trim());
  } catch {
    return null;
  }
}

async function fetchPendingPRs(token, owner, repo) {
  const res = await fetch(
    `https://api.github.com/repos/${owner}/${repo}/pulls?state=open&per_page=100`,
    { headers: ghHeaders(token) }
  );
  if (!res.ok) throw new Error(`تعذّر جلب طلبات المراجعة (${res.status})`);
  const all = await res.json();
  return all
    .map((pr) => ({ pr, kind: classifyTitle(pr.title), data: parsePrBody(pr.body) }))
    .filter((r) => r.kind !== null);
}

function EventEditForm({ edits, setEdits }) {
  return (
    <div className="grid gap-2 sm:grid-cols-2">
      <label className="flex flex-col gap-1 text-xs text-text">
        المادة
        <input
          value={edits.subjectName ?? ""}
          onChange={(e) => setEdits((p) => ({ ...p, subjectName: e.target.value }))}
          className="rounded-md border border-border bg-bg px-2 py-1 text-sm text-text"
        />
      </label>
      <label className="flex flex-col gap-1 text-xs text-text">
        subjectId
        <input
          value={edits.subjectId ?? ""}
          onChange={(e) => setEdits((p) => ({ ...p, subjectId: e.target.value }))}
          className="rounded-md border border-border bg-bg px-2 py-1 text-sm text-text"
        />
      </label>
      <label className="flex flex-col gap-1 text-xs text-text">
        النوع
        <select
          value={edits.type ?? "other"}
          onChange={(e) => setEdits((p) => ({ ...p, type: e.target.value }))}
          className="rounded-md border border-border bg-bg px-2 py-1 text-sm text-text"
        >
          {["exam", "quiz", "midterm", "homework", "other"].map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
      </label>
      <label className="flex flex-col gap-1 text-xs text-text">
        وصف النوع (لو "other")
        <input
          value={edits.typeLabel ?? ""}
          onChange={(e) => setEdits((p) => ({ ...p, typeLabel: e.target.value }))}
          className="rounded-md border border-border bg-bg px-2 py-1 text-sm text-text"
        />
      </label>
      <label className="flex flex-col gap-1 text-xs text-text sm:col-span-2">
        العنوان
        <input
          value={edits.title ?? ""}
          onChange={(e) => setEdits((p) => ({ ...p, title: e.target.value }))}
          className="rounded-md border border-border bg-bg px-2 py-1 text-sm text-text"
        />
      </label>
      <label className="flex flex-col gap-1 text-xs text-text">
        التاريخ
        <input
          type="date"
          value={edits.date ?? ""}
          onChange={(e) => setEdits((p) => ({ ...p, date: e.target.value }))}
          className="rounded-md border border-border bg-bg px-2 py-1 text-sm text-text"
        />
      </label>
      <label className="flex flex-col gap-1 text-xs text-text">
        ملاحظة الأدمن (اختياري)
        <input
          value={edits.adminNote ?? ""}
          onChange={(e) => setEdits((p) => ({ ...p, adminNote: e.target.value }))}
          className="rounded-md border border-border bg-bg px-2 py-1 text-sm text-text"
        />
      </label>
    </div>
  );
}

function UploadEditForm({ edits, setEdits }) {
  const sectionKeys = Object.keys(SECTION_LABELS);
  return (
    <div className="grid gap-2 sm:grid-cols-2">
      <label className="flex flex-col gap-1 text-xs text-text">
        المادة
        <input
          value={edits.subjectName ?? ""}
          onChange={(e) => setEdits((p) => ({ ...p, subjectName: e.target.value }))}
          className="rounded-md border border-border bg-bg px-2 py-1 text-sm text-text"
        />
      </label>
      <label className="flex flex-col gap-1 text-xs text-text">
        subjectId
        <input
          value={edits.subjectId ?? ""}
          onChange={(e) => setEdits((p) => ({ ...p, subjectId: e.target.value }))}
          className="rounded-md border border-border bg-bg px-2 py-1 text-sm text-text"
        />
      </label>
      <label className="flex flex-col gap-1 text-xs text-text">
        القسم
        <select
          value={edits.section ?? "theory"}
          onChange={(e) => setEdits((p) => ({ ...p, section: e.target.value }))}
          className="rounded-md border border-border bg-bg px-2 py-1 text-sm text-text"
        >
          {sectionKeys.map((k) => (
            <option key={k} value={k}>
              {SECTION_LABELS[k]}
            </option>
          ))}
        </select>
      </label>
      <label className="flex flex-col gap-1 text-xs text-text">
        اسم الملف (كما رُفع)
        <input
          value={edits.fileName ?? ""}
          readOnly
          className="rounded-md border border-border bg-bg-elevated px-2 py-1 text-sm text-text-muted"
        />
      </label>
      <label className="flex flex-col gap-1 text-xs text-text sm:col-span-2">
        عنوان المحاضرة
        <input
          value={edits.requestedTitle ?? ""}
          onChange={(e) => setEdits((p) => ({ ...p, requestedTitle: e.target.value }))}
          className="rounded-md border border-border bg-bg px-2 py-1 text-sm text-text"
        />
      </label>
      <label className="flex flex-col gap-1 text-xs text-text sm:col-span-2">
        ملاحظة الأدمن (اختياري)
        <input
          value={edits.adminNote ?? ""}
          onChange={(e) => setEdits((p) => ({ ...p, adminNote: e.target.value }))}
          className="rounded-md border border-border bg-bg px-2 py-1 text-sm text-text"
        />
      </label>
    </div>
  );
}

function RequestCard({ item, onResolved }) {
  const { pr, kind, data } = item;
  const [edits, setEdits] = useState(() => ({ ...(data ?? {}) }));
  const [busy, setBusy] = useState(false); // "accepting" | "rejecting" | false
  const [result, setResult] = useState(null); // { merged, mergeError, prUrl } | null
  const [error, setError] = useState(null);

  const token = getStoredToken();
  const owner = DEFAULT_OWNER;
  const repo = DEFAULT_REPO;

  async function handleAccept() {
    setError(null);
    setBusy("accepting");
    try {
      const request = { ...(data ?? {}), ...edits, prUrl: pr.html_url };

      if (kind === "event") {
        const existingEvents = (await fetchJsonFromMain(token, owner, repo, "public/data/events.json")) || {
          events: [],
        };
        const pkg = buildEventDecision(request, {
          decision: "approved",
          adminNote: edits.adminNote || "",
          existingEvents,
        });
        const res = await mergeExistingPR({ token, owner, repo, branch: pr.head.ref, prNumber: pr.number, pkg });
        setResult({ ...res, prUrl: pr.html_url });
        if (res.merged) onResolved(pr.number);
      } else {
        const [existingUploadsLog, lecturesFileName] = await Promise.all([
          fetchJsonFromMain(token, owner, repo, "public/data/upload-requests-log.json"),
          resolveLecturesFileName(token, owner, repo, request.subjectId),
        ]);
        const existingLectures = await fetchJsonFromMain(
          token,
          owner,
          repo,
          `public/data/subjects/${request.subjectId}/${lecturesFileName}`
        );
        const pkg = buildUploadDecision(request, {
          decision: "approved",
          adminNote: edits.adminNote || "",
          existingLectures: existingLectures || { sections: [] },
          existingUploadsLog: existingUploadsLog || { requests: [] },
          lecturesFileName,
        });
        const res = await mergeExistingPR({ token, owner, repo, branch: pr.head.ref, prNumber: pr.number, pkg });
        setResult({ ...res, prUrl: pr.html_url });
        if (res.merged) onResolved(pr.number);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function handleReject() {
    setError(null);
    setBusy("rejecting");
    try {
      const request = { ...(data ?? {}), ...edits, prUrl: pr.html_url };

      // 1) تسجيل حالة "rejected" بملف السجل أولاً (فرع/PR جديد مستقل تماماً
      //    عن فرع الطالب — لا لمس لفرعه إطلاقاً، تماماً كما ينص عقد §0 خطوة 6).
      let decisionPkg;
      if (kind === "event") {
        const existingEvents = (await fetchJsonFromMain(token, owner, repo, "public/data/events.json")) || {
          events: [],
        };
        decisionPkg = buildEventDecision(request, {
          decision: "rejected",
          adminNote: edits.adminNote || "",
          existingEvents,
        });
      } else {
        const existingUploadsLog = (await fetchJsonFromMain(
          token,
          owner,
          repo,
          "public/data/upload-requests-log.json"
        )) || { requests: [] };
        decisionPkg = buildUploadDecision(request, {
          decision: "rejected",
          adminNote: edits.adminNote || "",
          existingUploadsLog,
        });
      }
      await publishToGitHub({ token, owner, repo, pkg: decisionPkg });

      // 2) إقفال PR الطالب الأصلي بلا أي دمج ولا لمس لفرعه (منفصل تماماً عن
      //    الخطوة أعلاه — الاثنان معاً يكوّنان "الرفض" الكامل حسب توثيق عضو 5).
      await closePendingRequestPR({
        token,
        owner,
        repo,
        prNumber: pr.number,
        comment: edits.adminNote ? `تم الرفض: ${edits.adminNote}` : "تم رفض هذا الطلب.",
      });

      onResolved(pr.number);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="rounded-lg border border-border bg-bg-subtle p-4">
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <div>
          <span className="rounded bg-bg-elevated px-2 py-0.5 text-xs text-text-muted">
            {kind === "event" ? "طلب حدث" : "طلب رفع ملف"}
          </span>
          <a
            href={pr.html_url}
            target="_blank"
            rel="noreferrer"
            className="ms-2 text-xs text-accent underline"
          >
            عرض على GitHub (#{pr.number})
          </a>
        </div>
        <span className="text-xs text-text-muted">{new Date(pr.created_at).toLocaleString("ar")}</span>
      </div>

      <p className="mb-2 text-sm text-text-h">{pr.title}</p>

      {!data ? (
        <p className="text-xs text-danger-text">
          تعذّر قراءة بيانات الطلب من جسم الـ PR (تنسيق غير متوقَّع) — راجع الطلب مباشرة عبر رابط
          GitHub أعلاه، أو ارفضه لو غير صالح.
        </p>
      ) : kind === "event" ? (
        <EventEditForm edits={edits} setEdits={setEdits} />
      ) : (
        <UploadEditForm edits={edits} setEdits={setEdits} />
      )}

      {error && <p className="mt-2 text-xs text-danger-text">{error}</p>}

      {!result && (
        <div className="mt-3 flex gap-2">
          <button
            type="button"
            onClick={handleAccept}
            disabled={!data || Boolean(busy)}
            className="rounded-md bg-accent px-3 py-1.5 text-sm text-white hover:bg-accent-hover disabled:opacity-50"
          >
            {busy === "accepting" ? "...جارِ القبول" : "قبول"}
          </button>
          <button
            type="button"
            onClick={handleReject}
            disabled={Boolean(busy)}
            className="rounded-md border border-danger-border bg-danger-bg px-3 py-1.5 text-sm text-danger-text hover:opacity-80 disabled:opacity-50"
          >
            {busy === "rejecting" ? "...جارِ الرفض" : "رفض"}
          </button>
        </div>
      )}

      {result && (
        <div className="mt-3 rounded-md border border-border bg-bg p-3 text-sm">
          {result.merged ? (
            <p className="text-text-h">✅ تم القبول والدمج بـ main مباشرة.</p>
          ) : (
            <div className="text-warning-text">
              <p>تم تحديث فرع الطلب لكن الدمج التلقائي فشل — يحتاج دمجاً يدوياً من GitHub مباشرة:</p>
              {result.mergeError && <p className="mt-1 text-xs">{result.mergeError}</p>}
            </div>
          )}
          <a href={result.prUrl} target="_blank" rel="noreferrer" className="mt-1 block text-xs text-accent underline">
            عرض الطلب
          </a>
        </div>
      )}
    </div>
  );
}

export default function AdminRequestsQueue() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const token = getStoredToken();
      const list = await fetchPendingPRs(token, DEFAULT_OWNER, DEFAULT_REPO);
      setItems(list);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  function handleResolved(number) {
    setItems((prev) => prev.filter((it) => it.pr.number !== number));
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-text-h">طلبات الطلاب المعلَّقة</h1>
        <button
          type="button"
          onClick={load}
          className="rounded-md border border-border px-3 py-1.5 text-sm text-text hover:bg-bg-elevated"
        >
          تحديث
        </button>
      </div>

      <p className="text-xs text-text-muted">
        قائمة PRs مفتوحة على main بعنوان يبدأ بـ <code>[event]</code> أو <code>[upload]</code> —
        غير مرئية بالموقع الحي إطلاقاً حتى تُقبَل من هنا.
      </p>

      {loading && <p className="text-sm text-text-muted">...جارِ التحميل</p>}
      {error && <p className="text-sm text-danger-text">{error}</p>}
      {!loading && !error && items.length === 0 && (
        <p className="text-sm text-text-muted">لا توجد طلبات معلَّقة حالياً.</p>
      )}

      <div className="flex flex-col gap-3">
        {items.map((item) => (
          <RequestCard key={item.pr.id} item={item} onResolved={handleResolved} />
        ))}
      </div>
    </div>
  );
}
