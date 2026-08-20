import React, { useRef, useState } from "react";
import { submitUploadRequest } from "../../lib/studentSubmission.js";

// ⚠️ ملف مملوك لعضو 2 — جديد ("رفع دورات" — أسئلة/نماذج امتحانية سابقة).
// نموذج مخصَّص لرفع "دورة" (ورقة أسئلة/نموذج امتحان حقيقي سابق لنفس المادة
// والدكتور) — الهدف: يفهم الطالب نمط أسئلة الدكتور، وربما تتكرر نفس الأسئلة
// بالعام الدارسي الجديد. القسم مثبَّت دائماً على "exam" (❓ أسئلة) — لا يختاره
// الطالب — وهذا الفرق الوحيد عن UploadRequestForm.jsx العام (الذي يسمح باختيار
// أي قسم). يعيد استخدام submitUploadRequest (عضو 5) حرفياً بلا أي تعديل على
// studentSubmission.js أو عقد lectures.json — كل بيانات الدورة (نوعها، سنتها،
// الدكتور، ملاحظة نمط الأسئلة) تُطوى داخل requestedTitle كنص عرض واحد، فتظهر
// كعنوان العنصر مباشرة بصفحة المادة بعد قبول الأدمن. الملف نفسه PDF أو صورة
// (png/jpeg/webp — محدَّث بطلب إدارة مباشر) — النوع (pdf/image) يُكتشَف من
// studentSubmission.js حسب نوع الملف الفعلي ويُحفَظ بحقل fileType بالطلب،
// يقرأه buildUploadDecision (عضو 5) ليبني عنصر lectures.json بالنوع الصحيح.

const EXAM_KINDS = [
  { value: "final", label: "نهائي" },
  { value: "midterm", label: "نصفي" },
  { value: "quiz", label: "كويز" },
  { value: "other", label: "أخرى" },
];

// ⚠️ محدَّث بطلب إدارة مباشر: PDF أو صورة (png/jpeg/webp — لا SVG) الآن، لا
// PDF فقط كسابقاً — نفس القيد بالضبط المطبَّق بـ studentSubmission.js (عضو 5).
const ALLOWED_MIME = ["application/pdf", "image/png", "image/jpeg", "image/webp"];
const ACCEPT_ATTR = ALLOWED_MIME.join(",");

function isAllowedFile(f) {
  return ALLOWED_MIME.includes(f?.type);
}

/** يبني عنوان عرض واحد من حقول الدورة — هذا ما يظهر فعلياً كعنوان العنصر
 * بصفحة المادة بعد القبول (title بعقد §13.1)، بلا أي حقل إضافي بـ lectures.json. */
function buildTitle({ kindLabel, year, professorName, notes }) {
  const parts = [`دورة ${kindLabel}`];
  if (year.trim()) parts.push(year.trim());
  if (professorName.trim()) parts.push(`د. ${professorName.trim()}`);
  let title = parts.join(" — ");
  if (notes.trim()) title += ` (${notes.trim()})`;
  return title;
}

export default function PastExamRequestForm({ subjectId, subjectName, onCancel, onSubmitted }) {
  const [kind, setKind] = useState("final");
  const [customKindLabel, setCustomKindLabel] = useState("");
  const [year, setYear] = useState("");
  const [professorName, setProfessorName] = useState("");
  const [notes, setNotes] = useState("");
  const [file, setFile] = useState(null);
  const [fileError, setFileError] = useState("");
  const [submittedByLabel, setSubmittedByLabel] = useState("");
  const [status, setStatus] = useState("idle"); // idle | sending | done | error
  const [errorDetail, setErrorDetail] = useState("");
  const inputRef = useRef(null);

  const isOther = kind === "other";
  const selectedKind = EXAM_KINDS.find((k) => k.value === kind);
  const kindLabel = isOther ? customKindLabel.trim() : selectedKind?.label ?? kind;
  const canSubmit =
    file && !fileError && (!isOther || customKindLabel.trim()) && status !== "sending";

  function handleFileChange(e) {
    const picked = e.target.files?.[0] || null;
    if (picked && !isAllowedFile(picked)) {
      setFile(null);
      setFileError("يُقبل PDF أو صورة (PNG/JPEG/WEBP) فقط");
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
      const requestedTitle = buildTitle({ kindLabel, year, professorName, notes });
      const result = await submitUploadRequest({
        subjectId,
        subjectName,
        section: "exam",
        requestedTitle,
        file,
        submittedByLabel: submittedByLabel.trim(),
      });
      setStatus("done");
      onSubmitted?.(result);
    } catch (err) {
      console.error("submitUploadRequest (past exam) failed:", err);
      setErrorDetail(err?.message || "");
      setStatus("error");
    }
  }

  if (status === "done") {
    return (
      <div className="rounded-md border border-border bg-bg-subtle px-4 py-3 text-sm">
        <p className="text-text-h">تم إرسال الدورة بنجاح ✅</p>
        <p className="mt-1 text-text-muted">
          سيُحال طلبك، مرفقًا بالملف، إلى المشرف لمراجعته، وستظهر ضمن قسم "❓ أسئلة" بعد الموافقة
          عليها ليستفيد منها بقية الطلاب.
        </p>
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="flex flex-col gap-3 rounded-md border border-border bg-bg-subtle p-4 text-sm"
    >
      <p className="font-bold text-text-h">رفع دورة امتحانية سابقة لمادة {subjectName}</p>
      <p className="text-xs text-text-muted">
        شارك ورقة أسئلة أو نموذج امتحان حقيقي سابق (نهائي/نصفي/كويز) لنفس المادة والدكتور — يساعد
        بقية الطلاب على فهم نمط الأسئلة، وربما تتكرر نفسها بالعام الدارسي الجديد.
      </p>

      <label className="flex flex-col gap-1">
        <span className="text-text-muted">نوع الدورة</span>
        <select
          value={kind}
          onChange={(e) => setKind(e.target.value)}
          className="rounded-md border border-border bg-bg px-2 py-1.5 text-text"
        >
          {EXAM_KINDS.map((k) => (
            <option key={k.value} value={k.value}>
              {k.label}
            </option>
          ))}
        </select>
      </label>

      {isOther && (
        <label className="flex flex-col gap-1">
          <span className="text-text-muted">وصف النوع (لأنك اخترت "أخرى")</span>
          <input
            type="text"
            value={customKindLabel}
            onChange={(e) => setCustomKindLabel(e.target.value)}
            className="rounded-md border border-border bg-bg px-2 py-1.5 text-text"
            placeholder="مثال: امتحان تعويضي"
          />
        </label>
      )}

      <label className="flex flex-col gap-1">
        <span className="text-text-muted">السنة/الفصل الدراسي (اختياري)</span>
        <input
          type="text"
          value={year}
          onChange={(e) => setYear(e.target.value)}
          className="rounded-md border border-border bg-bg px-2 py-1.5 text-text"
          placeholder="مثال: الفصل الأول 2024/2025"
        />
      </label>

      <label className="flex flex-col gap-1">
        <span className="text-text-muted">اسم الدكتور (اختياري)</span>
        <input
          type="text"
          value={professorName}
          onChange={(e) => setProfessorName(e.target.value)}
          className="rounded-md border border-border bg-bg px-2 py-1.5 text-text"
          placeholder="مثال: أحمد"
        />
      </label>

      <label className="flex flex-col gap-1">
        <span className="text-text-muted">ملف الدورة (PDF أو صورة)</span>
        <input
          ref={inputRef}
          type="file"
          accept={ACCEPT_ATTR}
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
        <span className="text-text-muted">ملاحظة عن نمط الأسئلة (اختياري)</span>
        <input
          type="text"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          className="rounded-md border border-border bg-bg px-2 py-1.5 text-text"
          placeholder="مثال: أغلب الأسئلة من الفصل 3 و5"
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
          {status === "sending" ? "...جارِ الإرسال" : "إرسال الدورة"}
        </button>
        <button type="button" onClick={onCancel} className="text-text-muted hover:text-text">
          إلغاء
        </button>
      </div>
    </form>
  );
}
