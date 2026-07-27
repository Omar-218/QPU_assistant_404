import React, { useState } from "react";
import { submitEventRequest } from "../../lib/studentSubmission.js";

// ⚠️ ملف مملوك لعضو 2 — جديد (خطة الدفعة 5، القسم 2).
// نموذج اقتراح حدث (امتحان/اختبار قصير/واجب/إلخ) لمادة واحدة. يُستهلَك من
// Subject.jsx فقط (زر "اقترح حدثاً"). لا يلمس التوكن المقيَّد مباشرة أبداً —
// كل التواصل مع GitHub يمر عبر studentSubmission.js (عضو 5) حصراً (القسم 4
// بخطة الدفعة 5: عزل التوكن بملف واحد).

// تسمية الأنواع الظاهرة بالنموذج + typeLabel المشتقة تلقائياً لغير "other".
// ⚠️ هذي التسميات اختياري مني (الخطة لم تحدّدها حرفياً بالقسم 1.1) — تحتاج
// اعتماد المدير النهائي، لكنها مطابقة تماماً لقيم type المسموحة بالعقد.
const EVENT_TYPES = [
  { value: "exam", label: "امتحان نهائي" },
  { value: "midterm", label: "امتحان منتصف الفصل" },
  { value: "quiz", label: "اختبار قصير" },
  { value: "homework", label: "واجب" },
  { value: "other", label: "أخرى" },
];

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}


export default function EventRequestForm({ subjectId, subjectName, onCancel, onSubmitted }) {
  const [type, setType] = useState("exam");
  const [customTypeLabel, setCustomTypeLabel] = useState("");
  const [title, setTitle] = useState("");
  const [date, setDate] = useState("");
  const [submittedByLabel, setSubmittedByLabel] = useState("");
  const [status, setStatus] = useState("idle"); // idle | sending | done | error
  const [errorDetail, setErrorDetail] = useState("");

  const selectedType = EVENT_TYPES.find((t) => t.value === type);
  const isOther = type === "other";
  const canSubmit =
    title.trim() && date && (!isOther || customTypeLabel.trim()) && status !== "sending";

  async function handleSubmit(e) {
    e.preventDefault();
    if (!canSubmit) return;
    setStatus("sending");
    try {
      const result = await submitEventRequest({
        subjectId,
        subjectName,
        type,
        typeLabel: isOther ? customTypeLabel.trim() : selectedType?.label ?? type,
        title: title.trim(),
        date,
        submittedByLabel: submittedByLabel.trim(),
      });
      setStatus("done");
      onSubmitted?.(result);
    } catch (err) {
      console.error("submitEventRequest failed:", err);
      setErrorDetail(err?.message || "");
      setStatus("error");
    }
  }

  if (status === "done") {
    return (
      <div className="rounded-md border border-border bg-bg-subtle px-4 py-3 text-sm">
        <p className="text-text-h">تم تجهيز طلبك ✅</p>
        <p className="mt-1 text-text-muted">
          سيظهر للأدمن بطابور المراجعة، وما راح ينشر بصفحة المادة إلا بعد الموافقة.
        </p>
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="flex flex-col gap-3 rounded-md border border-border bg-bg-subtle p-4 text-sm"
    >
      <p className="font-bold text-text-h">اقتراح حدث لمادة {subjectName}</p>

      <label className="flex flex-col gap-1">
        <span className="text-text-muted">نوع الحدث</span>
        <select
          value={type}
          onChange={(e) => setType(e.target.value)}
          className="rounded-md border border-border bg-bg px-2 py-1.5 text-text"
        >
          {EVENT_TYPES.map((t) => (
            <option key={t.value} value={t.value}>
              {t.label}
            </option>
          ))}
        </select>
      </label>

      {isOther && (
        <label className="flex flex-col gap-1">
          <span className="text-text-muted">وصف النوع (لأنك اخترت "أخرى")</span>
          <input
            type="text"
            value={customTypeLabel}
            onChange={(e) => setCustomTypeLabel(e.target.value)}
            className="rounded-md border border-border bg-bg px-2 py-1.5 text-text"
            placeholder="مثال: مراجعة عملية"
          />
        </label>
      )}

      <label className="flex flex-col gap-1">
        <span className="text-text-muted">عنوان الحدث</span>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="rounded-md border border-border bg-bg px-2 py-1.5 text-text"
          placeholder="مثال: امتحان منتصف الفصل — القسم النظري"
          required
        />
      </label>

      <label className="flex flex-col gap-1">
        <span className="text-text-muted">التاريخ</span>
        <input
          type="date"
          value={date}
          min={todayISO()}
          onChange={(e) => setDate(e.target.value)}
          className="rounded-md border border-border bg-bg px-2 py-1.5 text-text"
          required
        />
      </label>

      <label className="flex flex-col gap-1">
        <span className="text-text-muted">توقيعك (اختياري)</span>
        <input
          type="text"
          value={submittedByLabel}
          onChange={(e) => setSubmittedByLabel(e.target.value)}
          className="rounded-md border border-border bg-bg px-2 py-1.5 text-text"
          placeholder="مثال: طالب من الشعبة أ"
        />
      </label>

      {status === "error" && (
        <div>
          <p className="text-danger-text">صار خطأ أثناء الإرسال، حاول مرة ثانية.</p>
          {errorDetail && <p className="mt-1 text-xs text-text-muted">({errorDetail})</p>}
        </div>
      )}

      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={!canSubmit}
          className="rounded-md bg-accent px-3 py-1.5 text-white hover:bg-accent-hover disabled:opacity-50"
        >
          {status === "sending" ? "...جارِ الإرسال" : "إرسال الاقتراح"}
        </button>
        <button type="button" onClick={onCancel} className="text-text-muted hover:text-text">
          إلغاء
        </button>
      </div>
    </form>
  );
}
