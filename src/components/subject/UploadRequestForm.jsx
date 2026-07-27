import React, { useRef, useState } from "react";
import { SECTION_LABELS } from "../../lib/sectionLabels.js";
import { submitUploadRequest } from "../../lib/studentSubmission.js";

// ⚠️ ملف مملوك لعضو 2 — جديد (خطة الدفعة 5، القسم 2).
// نموذج طلب رفع ملف PDF فعلي لقسم معيّن بمادة واحدة. القرار المعتمَد صراحة
// بخطة الدفعة 5 (القسم 0): الطالب يرفع PDF مباشرة، لا رابط خارجي — لذا هذا
// النموذج يقبل PDF فقط (لا صور)، بخلاف رافع الأدمن (FileUploaderWidget.jsx،
// عضو 3) اللي يقبل صور أيضاً لمحتوى منشور مباشرة. لا يلمس التوكن المقيَّد
// مباشرة أبداً — كل التواصل مع GitHub يمر عبر studentSubmission.js (عضو 5).

const SECTION_KEYS = Object.keys(SECTION_LABELS);

function isPdfFile(f) {
  return f?.type === "application/pdf";
}

export default function UploadRequestForm({ subjectId, subjectName, onCancel, onSubmitted }) {
  const [section, setSection] = useState(SECTION_KEYS[0] ?? "theory");
  const [requestedTitle, setRequestedTitle] = useState("");
  const [file, setFile] = useState(null);
  const [fileError, setFileError] = useState("");
  const [submittedByLabel, setSubmittedByLabel] = useState("");
  const [status, setStatus] = useState("idle"); // idle | sending | done | error
  const [errorDetail, setErrorDetail] = useState("");
  const inputRef = useRef(null);

  const canSubmit = requestedTitle.trim() && file && !fileError && status !== "sending";

  function handleFileChange(e) {
    const picked = e.target.files?.[0] || null;
    if (picked && !isPdfFile(picked)) {
      setFile(null);
      setFileError("يُقبل PDF فقط");
      return;
    }
    setFileError("");
    setFile(picked);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!canSubmit) return;
    setStatus("sending");
    try {
      const result = await submitUploadRequest({
        subjectId,
        subjectName,
        section,
        requestedTitle: requestedTitle.trim(),
        file,
        submittedByLabel: submittedByLabel.trim(),
      });
      setStatus("done");
      onSubmitted?.(result);
    } catch (err) {
      console.error("submitUploadRequest failed:", err);
      setErrorDetail(err?.message || "");
      setStatus("error");
    }
  }

  if (status === "done") {
    return (
      <div className="rounded-md border border-border bg-bg-subtle px-4 py-3 text-sm">
        <p className="text-text-h">تم تجهيز طلب الرفع ✅</p>
        <p className="mt-1 text-text-muted">
          سيظهر للأدمن بطابور المراجعة مع الملف المرفق، وما راح يُنشَر إلا بعد الموافقة.
        </p>
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="flex flex-col gap-3 rounded-md border border-border bg-bg-subtle p-4 text-sm"
    >
      <p className="font-bold text-text-h">طلب رفع ملف لمادة {subjectName}</p>

      <label className="flex flex-col gap-1">
        <span className="text-text-muted">القسم</span>
        <select
          value={section}
          onChange={(e) => setSection(e.target.value)}
          className="rounded-md border border-border bg-bg px-2 py-1.5 text-text"
        >
          {SECTION_KEYS.map((key) => (
            <option key={key} value={key}>
              {SECTION_LABELS[key]}
            </option>
          ))}
        </select>
      </label>

      <label className="flex flex-col gap-1">
        <span className="text-text-muted">عنوان الملف المقترح</span>
        <input
          type="text"
          value={requestedTitle}
          onChange={(e) => setRequestedTitle(e.target.value)}
          className="rounded-md border border-border bg-bg px-2 py-1.5 text-text"
          placeholder="مثال: حل تمارين الأسبوع 5"
          required
        />
      </label>

      <label className="flex flex-col gap-1">
        <span className="text-text-muted">ملف PDF</span>
        <input
          ref={inputRef}
          type="file"
          accept="application/pdf"
          onChange={handleFileChange}
          className="text-text file:mr-2 file:rounded-md file:border file:border-border file:bg-bg-elevated file:px-2 file:py-1 file:text-text"
          required
        />
        {fileError && <span className="text-xs text-danger-text">{fileError}</span>}
        {file && !fileError && (
          <span className="text-xs text-text-muted">تم اختيار: {file.name}</span>
        )}
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
          {status === "sending" ? "...جارِ الإرسال" : "إرسال الطلب"}
        </button>
        <button type="button" onClick={onCancel} className="text-text-muted hover:text-text">
          إلغاء
        </button>
      </div>
    </form>
  );
}
