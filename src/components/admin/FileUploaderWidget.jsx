import React, { useCallback, useRef, useState } from "react";

// ⚠️ ملف مملوك لعضو 3 — واجهة اختيار/سحب ملفات من الجهاز فقط (UI).
// التحويل الفعلي لبنية الملفات والنشر مسؤولية عضو 5 عبر lib/githubPublisher.js
// المُستدعى من components/admin/PublishPanel.jsx (عضو 5) — لا تكرّر منطقه هنا.

// أنواع الملفات المقبولة فعلياً (يُطبَّق كفلترة حقيقية، وليس فقط بصفة accept
// التي لا تُلزم إفلات السحب drag & drop بالمتصفح). عمداً بلا SVG.
const ACCEPTED_MIME_TYPES = [
  "application/pdf",
  "image/png",
  "image/jpeg",
  "image/webp",
];
const DEFAULT_ACCEPT = ACCEPTED_MIME_TYPES.join(",");

function isAcceptedFile(f) {
  return ACCEPTED_MIME_TYPES.includes(f.type);
}

/**
 * مربع رفع ملفات (drag & drop + زر اختيار عادي).
 * لا يلمس أي منطق نشر — فقط يجمع كائنات File ويبلّغ الأب عبر onFilesSelected.
 * يقبل PDF وصور (png/jpeg/webp) — بلا SVG.
 *
 * Props:
 *  - onFilesSelected(files: File[]) — يُستدعى بكامل قائمة الملفات الحالية كل ما تتغيّر
 *  - accept?: string — نوع الملفات المقبولة بصفة input[accept] (افتراضياً PDF + الصور المدعومة)
 *  - multiple?: boolean — افتراضياً true
 */
export default function FileUploaderWidget({
  onFilesSelected,
  accept = DEFAULT_ACCEPT,
  multiple = true,
}) {
  const [files, setFiles] = useState([]);
  const [isDragging, setIsDragging] = useState(false);
  const [rejected, setRejected] = useState([]); // أسماء ملفات رُفضت (نوع غير مدعوم)
  const inputRef = useRef(null);

  const commit = useCallback(
    (nextFiles) => {
      setFiles(nextFiles);
      onFilesSelected?.(nextFiles);
    },
    [onFilesSelected]
  );

  function addFiles(fileList) {
    const incoming = Array.from(fileList || []);
    if (incoming.length === 0) return;

    // فلترة حقيقية بالنوع — drag & drop لا يلتزم بصفة accept بالمتصفح،
    // فلازم نتحقق يدوياً هنا حتى ما يمر SVG أو أي نوع غير مدعوم.
    const accepted = incoming.filter(isAcceptedFile);
    const rejectedNow = incoming.filter((f) => !isAcceptedFile(f));
    if (rejectedNow.length > 0) {
      setRejected(rejectedNow.map((f) => f.name));
    } else {
      setRejected([]);
    }
    if (accepted.length === 0) return;

    // دمج مع تفادي تكرار نفس الاسم + الحجم
    setFiles((prev) => {
      const merged = [...prev];
      for (const f of accepted) {
        const exists = merged.some((m) => m.name === f.name && m.size === f.size);
        if (!exists) merged.push(f);
      }
      onFilesSelected?.(merged);
      return merged;
    });
  }

  function removeFile(index) {
    setFiles((prev) => {
      const next = prev.filter((_, i) => i !== index);
      onFilesSelected?.(next);
      return next;
    });
  }

  function clearAll() {
    commit([]);
    setRejected([]);
    if (inputRef.current) inputRef.current.value = "";
  }

  function handleDrop(e) {
    e.preventDefault();
    setIsDragging(false);
    addFiles(e.dataTransfer.files);
  }

  function formatSize(bytes) {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  return (
    <div>
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") inputRef.current?.click();
        }}
        className={`cursor-pointer rounded-lg border-2 border-dashed p-6 text-center transition-colors ${
          isDragging
            ? "border-accent bg-bg-elevated"
            : "border-border bg-bg-subtle hover:bg-bg-elevated"
        }`}
      >
        <p className="text-sm text-text">
          اسحب ملفات PDF أو صور هنا، أو{" "}
          <span className="text-accent underline">اختر من جهازك</span>
        </p>
        <p className="mt-1 text-xs text-text-muted">
          PDF أو صور (PNG/JPEG/WEBP فقط، بلا SVG) — يمكن اختيار عدة ملفات دفعة واحدة
        </p>
        <input
          ref={inputRef}
          type="file"
          accept={accept}
          multiple={multiple}
          className="hidden"
          onChange={(e) => addFiles(e.target.files)}
        />
      </div>

      {rejected.length > 0 && (
        <p className="mt-2 text-xs text-danger-text">
          تم تجاهل ({rejected.length}) بصيغة غير مدعومة: {rejected.join("، ")}
        </p>
      )}

      {files.length > 0 && (
        <ul className="mt-3 flex flex-col gap-2">
          {files.map((f, i) => (
            <li
              key={`${f.name}-${f.size}-${i}`}
              className="flex items-center justify-between rounded-md border border-border bg-bg px-3 py-2 text-sm"
            >
              <div className="min-w-0">
                <p className="truncate text-text">{f.name}</p>
                <p className="text-xs text-text-muted">{formatSize(f.size)}</p>
              </div>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  removeFile(i);
                }}
                className="shrink-0 rounded-md border border-danger-border bg-danger-bg px-2 py-1 text-xs text-danger-text hover:opacity-80"
              >
                إزالة
              </button>
            </li>
          ))}
          <li>
            <button
              type="button"
              onClick={clearAll}
              className="text-xs text-text-muted underline hover:text-text"
            >
              إزالة الكل
            </button>
          </li>
        </ul>
      )}
    </div>
  );
}
