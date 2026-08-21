import React, { useState } from "react";
import { SECTION_LABELS } from "../../lib/sectionLabels.js";
import { useEvents } from "../../hooks/useEvents.js";
import { useUploadRequestsLog } from "../../hooks/useUploadRequestsLog.js";
import { isEventActive } from "../../lib/eventStatus.js";
import { getStoredToken, DEFAULT_OWNER, DEFAULT_REPO } from "../../lib/adminAuth.js";
import { buildUndoEventDecision, buildUndoUploadDecision, publishToGitHub } from "../../lib/githubPublisher.js";

// ⚠️ ملف مملوك لعضو 3 — جديد (خطة الدفعة 5، `/admin/events-log`).
// يعرض السجل الكامل (كل الحالات: approved/rejected/reverted) لكل من الأحداث
// وطلبات رفع الملفات المقرَّرة — راجع docs/team-plan-batch5.md §1.1/§1.3
// لعقد الملفين.
//
// ⚠️ جديد (طلب إدارة مباشر): زر "↩️ تراجع" لأي صف بحالة "مقبول" — يغطّي
// السيناريو اللي ما يُكتشَف فيه الخطأ إلا بعد مغادرة لوحة "طلبات الطلاب
// المعلَّقة" (تلك اللوحة تعرض قبولاً "فورياً" فقط — راجع AdminRequestsQueue.jsx).
// هذي الصفحة تقرأ من public/data/*.json المنشور فعلياً (useEvents/
// useUploadRequestsLog — عبر fetch عادي، لا GitHub API)، فبعد التراجع لن
// ينعكس هنا تلقائياً إلا بعد اكتمال النشر (قد يستغرق دقائق) — لذلك overrides
// محلية أدناه تعكس الحالة فوراً بالواجهة بمعزل عن ذلك.

function StatusBadge({ status }) {
  if (status === "reverted") {
    return (
      <span className="rounded-full bg-warning-bg px-2 py-0.5 text-xs text-warning-text">
        تمّ التراجع عنه
      </span>
    );
  }
  const isApproved = status === "approved";
  return (
    <span
      className={`rounded-full px-2 py-0.5 text-xs ${
        isApproved
          ? "bg-accent/10 text-accent"
          : "bg-danger-bg text-danger-text"
      }`}
    >
      {isApproved ? "مقبول" : "مرفوض"}
    </span>
  );
}

/** زر تراجع بتأكيد صريح (نفس نمط confirming/undoing/done/error بـ
 * AdminRequestsQueue.jsx) — id هو معرّف الحدث/الطلب بسجله، onConfirm يبني
 * الحزمة وينشرها فعلياً، onDone يُحدِّث override محلي فور النجاح. */
function UndoButton({ id, onConfirm, onDone, warningText }) {
  const [state, setState] = useState({ status: "idle", message: "" });

  if (state.status === "idle") {
    return (
      <button
        type="button"
        onClick={() => setState({ status: "confirming", message: "" })}
        className="rounded-md border border-danger-border bg-danger-bg px-2 py-1 text-xs text-danger-text hover:opacity-80"
      >
        ↩️ تراجع
      </button>
    );
  }

  if (state.status === "confirming") {
    return (
      <div className="flex flex-col gap-1 rounded-md border border-danger-border bg-danger-bg p-2">
        <p className="text-xs text-danger-text">متأكد؟ {warningText}</p>
        <div className="flex gap-1">
          <button
            type="button"
            onClick={async () => {
              setState({ status: "undoing", message: "" });
              try {
                const res = await onConfirm();
                setState({ status: "done", message: "", prUrl: res.prUrl });
                onDone(id, res);
              } catch (err) {
                setState({ status: "error", message: err.message });
              }
            }}
            className="rounded-md bg-danger-text px-2 py-1 text-xs text-white hover:opacity-90"
          >
            تأكيد
          </button>
          <button
            type="button"
            onClick={() => setState({ status: "idle", message: "" })}
            className="rounded-md border border-border px-2 py-1 text-xs text-text hover:bg-bg-elevated"
          >
            إلغاء
          </button>
        </div>
      </div>
    );
  }

  if (state.status === "undoing") return <p className="text-xs text-text-muted">...جارِ التراجع</p>;

  if (state.status === "done") {
    return (
      <div className="text-xs">
        <p className="text-text-h">تم إرسال التراجع.</p>
        {state.prUrl && (
          <a href={state.prUrl} target="_blank" rel="noreferrer" className="text-accent underline">
            عرض الطلب
          </a>
        )}
      </div>
    );
  }

  return <p className="text-xs text-danger-text">تعذّر التراجع: {state.message}</p>;
}

const EVENT_TYPE_LABELS = {
  exam: "امتحان",
  quiz: "كويز",
  midterm: "منتصف الفصل",
  homework: "واجب",
  other: "أخرى",
};

/** قراءة ملف JSON من main عبر Contents API — null لو 404. نسخة محلية مطابقة
 * لـ AdminRequestsQueue.jsx (لا استيراد مشترك — نفس نمط الملف الأصلي). */
async function fetchJsonFromMain(token, owner, repo, path) {
  const res = await fetch(`https://api.github.com/repos/${owner}/${repo}/contents/${path}?ref=main`, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
    },
  });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`تعذّر قراءة ${path}: ${res.status}`);
  const data = await res.json();
  return JSON.parse(decodeURIComponent(escape(atob(data.content.replace(/\n/g, "")))));
}

/** يحدّد اسم ملف المحاضرات الصحيح لمادة معيّنة — نسخة محلية مطابقة لـ
 * AdminRequestsQueue.jsx (راجع هناك للتوثيق الكامل). */
async function resolveLecturesFileName(token, owner, repo, subjectId) {
  const subject = await fetchJsonFromMain(token, owner, repo, `public/data/subjects/${subjectId}/subject.json`);
  const variants = subject?.professorVariants;
  if (Array.isArray(variants) && variants.length > 0) {
    const active = variants.find((v) => v.active) || variants[0];
    return active?.lecturesFile || "lectures.json";
  }
  return "lectures.json";
}

export default function AdminEventsLog() {
  const { events, loading: eventsLoading } = useEvents();
  const { requests, loading: requestsLoading } = useUploadRequestsLog();
  const [tab, setTab] = useState("events");
  // ⚠️ جديد: بعد نجاح التراجع، الحدث/الطلب يبقى "approved" بالبيانات المجلوبة
  // (useEvents/useUploadRequestsLog يقرآن public/data المنشور فعلياً، ولن
  // ينعكس التراجع هناك إلا بعد اكتمال النشر) — override محلي يعكس النتيجة
  // فوراً بالواجهة فقط، لمنع تكرار الضغط على "تراجع" لنفس الصف.
  const [revertedIds, setRevertedIds] = useState(() => new Set());

  const token = getStoredToken();
  const owner = DEFAULT_OWNER;
  const repo = DEFAULT_REPO;

  function markReverted(id) {
    setRevertedIds((prev) => new Set(prev).add(id));
  }

  const sortedEvents = [...events]
    .map((e) => (revertedIds.has(e.id) ? { ...e, status: "reverted" } : e))
    .sort((a, b) => (b.decidedAt ?? "").localeCompare(a.decidedAt ?? ""));
  const sortedRequests = [...requests]
    .map((r) => (revertedIds.has(r.id) ? { ...r, status: "reverted" } : r))
    .sort((a, b) => (b.decidedAt ?? "").localeCompare(a.decidedAt ?? ""));

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-xl font-bold text-text-h">سجل الأحداث وطلبات الرفع</h1>

      <div className="flex gap-1 border-b border-border">
        <button
          type="button"
          onClick={() => setTab("events")}
          className={`px-3 py-2 text-sm ${
            tab === "events"
              ? "border-b-2 border-accent font-medium text-text-h"
              : "text-text-muted hover:text-text"
          }`}
        >
          الأحداث ({events.length})
        </button>
        <button
          type="button"
          onClick={() => setTab("uploads")}
          className={`px-3 py-2 text-sm ${
            tab === "uploads"
              ? "border-b-2 border-accent font-medium text-text-h"
              : "text-text-muted hover:text-text"
          }`}
        >
          طلبات رفع الملفات ({requests.length})
        </button>
      </div>

      {tab === "events" && (
        <div className="overflow-x-auto rounded-lg border border-border bg-bg-subtle p-3">
          {eventsLoading ? (
            <p className="text-sm text-text-muted">...جارِ التحميل</p>
          ) : sortedEvents.length === 0 ? (
            <p className="text-sm text-text-muted">لا يوجد سجل أحداث بعد.</p>
          ) : (
            <table className="w-full min-w-[640px] text-sm">
              <thead>
                <tr className="text-start text-xs text-text-muted">
                  <th className="p-2 text-start">المادة</th>
                  <th className="p-2 text-start">النوع</th>
                  <th className="p-2 text-start">العنوان</th>
                  <th className="p-2 text-start">التاريخ</th>
                  <th className="p-2 text-start">الحالة</th>
                  <th className="p-2 text-start">نشِط الآن؟</th>
                  <th className="p-2 text-start">PR</th>
                  <th className="p-2 text-start">إجراء</th>
                </tr>
              </thead>
              <tbody>
                {sortedEvents.map((ev) => (
                  <tr key={ev.id} className="border-t border-border">
                    <td className="p-2">{ev.subjectName}</td>
                    <td className="p-2">{ev.type === "other" ? ev.typeLabel : EVENT_TYPE_LABELS[ev.type] ?? ev.type}</td>
                    <td className="p-2">{ev.title}</td>
                    <td className="p-2 text-xs text-text-muted">{ev.date}</td>
                    <td className="p-2">
                      <StatusBadge status={ev.status} />
                    </td>
                    <td className="p-2 text-xs">
                      {isEventActive(ev) ? (
                        <span className="text-accent">نعم</span>
                      ) : (
                        <span className="text-text-muted">لا</span>
                      )}
                    </td>
                    <td className="p-2">
                      {ev.prUrl && (
                        <a href={ev.prUrl} target="_blank" rel="noreferrer" className="text-xs text-accent underline">
                          عرض
                        </a>
                      )}
                    </td>
                    <td className="p-2">
                      {ev.status === "approved" && (
                        <UndoButton
                          id={ev.id}
                          warningText="الحدث سيختفي فوراً من أي عرض نشِط بالموقع."
                          onConfirm={async () => {
                            const existingEvents = (await fetchJsonFromMain(
                              token,
                              owner,
                              repo,
                              "public/data/events.json"
                            )) || { events: [] };
                            const pkg = buildUndoEventDecision(ev.id, {
                              existingEvents,
                              adminNote: "تراجع الآدمن عن قبول سابق (خطأ) — من سجل الأحداث",
                            });
                            return publishToGitHub({ token, owner, repo, pkg });
                          }}
                          onDone={markReverted}
                        />
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {tab === "uploads" && (
        <div className="overflow-x-auto rounded-lg border border-border bg-bg-subtle p-3">
          {requestsLoading ? (
            <p className="text-sm text-text-muted">...جارِ التحميل</p>
          ) : sortedRequests.length === 0 ? (
            <p className="text-sm text-text-muted">لا يوجد سجل طلبات رفع بعد.</p>
          ) : (
            <table className="w-full min-w-[640px] text-sm">
              <thead>
                <tr className="text-start text-xs text-text-muted">
                  <th className="p-2 text-start">المادة</th>
                  <th className="p-2 text-start">القسم</th>
                  <th className="p-2 text-start">العنوان المقترَح</th>
                  <th className="p-2 text-start">الملف</th>
                  <th className="p-2 text-start">الحالة</th>
                  <th className="p-2 text-start">ملاحظة الأدمن</th>
                  <th className="p-2 text-start">PR</th>
                  <th className="p-2 text-start">إجراء</th>
                </tr>
              </thead>
              <tbody>
                {sortedRequests.map((r) => (
                  <tr key={r.id} className="border-t border-border">
                    <td className="p-2">{r.subjectName}</td>
                    <td className="p-2">{SECTION_LABELS[r.section] ?? r.section}</td>
                    <td className="p-2">{r.requestedTitle}</td>
                    <td className="p-2 text-xs text-text-muted">{r.fileName}</td>
                    <td className="p-2">
                      <StatusBadge status={r.status} />
                    </td>
                    <td className="p-2 text-xs text-text-muted">{r.adminNote}</td>
                    <td className="p-2">
                      {r.prUrl && (
                        <a href={r.prUrl} target="_blank" rel="noreferrer" className="text-xs text-accent underline">
                          عرض
                        </a>
                      )}
                    </td>
                    <td className="p-2">
                      {r.status === "approved" && (
                        <UndoButton
                          id={r.id}
                          warningText="الملف/الصورة سيُزال من صفحة المادة، ويُحذَف فعلياً من الريبو — لا يمكن التراجع عنه تلقائياً بعد ذلك."
                          onConfirm={async () => {
                            const lecturesFileName = await resolveLecturesFileName(token, owner, repo, r.subjectId);
                            const [existingUploadsLog, existingLectures] = await Promise.all([
                              fetchJsonFromMain(token, owner, repo, "public/data/upload-requests-log.json"),
                              fetchJsonFromMain(
                                token,
                                owner,
                                repo,
                                `public/data/subjects/${r.subjectId}/${lecturesFileName}`
                              ),
                            ]);
                            const pkg = buildUndoUploadDecision(r.id, {
                              existingUploadsLog: existingUploadsLog || { requests: [] },
                              existingLectures: existingLectures || { sections: [] },
                              lecturesFileName,
                              adminNote: "تراجع الآدمن عن قبول سابق (خطأ) — من سجل الأحداث",
                            });
                            return publishToGitHub({ token, owner, repo, pkg });
                          }}
                          onDone={markReverted}
                        />
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  );
}
