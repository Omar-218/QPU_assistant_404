import React, { useState } from "react";
import { SECTION_LABELS } from "../../lib/sectionLabels.js";
import { useEvents } from "../../hooks/useEvents.js";
import { useUploadRequestsLog } from "../../hooks/useUploadRequestsLog.js";
import { isEventActive } from "../../lib/eventStatus.js";

// ⚠️ ملف مملوك لعضو 3 — جديد (خطة الدفعة 5، `/admin/events-log`).
// يعرض السجل الكامل (كل الحالات: approved/rejected) لكل من الأحداث وطلبات رفع
// الملفات المقرَّرة — راجع docs/team-plan-batch5.md §1.1/§1.3 لعقد الملفين.

function StatusBadge({ status }) {
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

const EVENT_TYPE_LABELS = {
  exam: "امتحان",
  quiz: "كويز",
  midterm: "منتصف الفصل",
  homework: "واجب",
  other: "أخرى",
};

export default function AdminEventsLog() {
  const { events, loading: eventsLoading } = useEvents();
  const { requests, loading: requestsLoading } = useUploadRequestsLog();
  const [tab, setTab] = useState("events");

  const sortedEvents = [...events].sort((a, b) => (b.decidedAt ?? "").localeCompare(a.decidedAt ?? ""));
  const sortedRequests = [...requests].sort((a, b) => (b.decidedAt ?? "").localeCompare(a.decidedAt ?? ""));

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
