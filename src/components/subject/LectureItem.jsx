import React, { useState } from "react";
import { useOfflineFiles } from "../../hooks/useOfflineFiles.js";
import { guessMimeType } from "../../lib/offlineFiles.js";

// ⚠️ ملف مملوك لعضو 2 — عنصر واحد ضمن قسم بصفحة المادة (Subject.jsx).
// يتفرّع بالعرض حسب item.type (عقد عضو 3/5 — التوزيع الجديد):
//   - pdf/image: زر توگل يبلّغ الأب عبر onToggle؛ الأب (Subject.jsx) يملك
//     حالة "أي عنصر مفتوح واحد". هنا نفسه نعرض قائمة منسدلة صغيرة (تنزيل /
//     فتح بتبويب جديد) أسفل الزر مباشرة — بلا عارض ملء شاشة ولا iframe
//     إطلاقاً (2026-07-24: عدّل من فتح FileViewer كامل الشاشة، كان يوهم
//     المستخدم بالهاتف أن الملف = أول صفحة فقط. راجع docs/logs/member-2-log.md).
//   - link: رابط مباشر يفتح بتبويب جديد (target="_blank")، بلا أي توگل
//     ولا عارض إطلاقاً — لا علاقة له بحالة الأب.
//   - note: توگل محلي (حالة داخل هذا المكوّن نفسه فقط، الأب لا يعرف عنها)
//     يعرض item.content inline أسفل الزر مباشرة (white-space: pre-wrap)،
//     بلا عارض منفصل ولا طبقة ملء شاشة.
// عنصر بدون type بالبيانات القديمة يُعامل كـ "pdf" دائماً (توافق عكسي).
//
// ⚠️ تحديث (2026-07-30، طلب مباشر من المستخدم — مهمة "تصفح بدون إنترنت"):
// pdf/image فقط الآن تدعم props إضافية اختيارية: fileId, subjectId,
// subjectName, sectionLabel — إذا مُرِّرت (Subject.jsx يمرّرها دائماً)، يصير
// زر "تنزيل" ذكياً:
//   - غير محمّلة بعد: يجلب الملف، يخزّنه محلياً بـ IndexedDB (useOfflineFiles)
//     *و* يشغّل تنزيل المتصفح العادي بنفس اللحظة (نفس Blob، بلا جلب مضاعف)
//     — الطالب يحصل على النسختين معاً بضغطة واحدة.
//   - محمّلة مسبقاً: **لا تنزيل تلقائي** — يظهر تأكيد صريح (فتح النسخة
//     المحفوظة/بدون نت، أو إعادة التنزيل من الشبكة) بدل استبدال الملف بصمت.
// شارة "📥 محمّلة" تظهر بجانب العنوان دائماً (حتى بالحالة المطوية) لو الملف
// محفوظ محلياً — هذا هو "العلامة بصفحة المادة نفسها" المطلوبة.
// بلا props الجديدة (استخدام مستقبلي محتمل خارج Subject.jsx): يعمل تماماً
// كالسابق (تنزيل مباشر بلا تخزين محلي) — توافق عكسي كامل.

export default function LectureItem({
  item,
  isOpen,
  onToggle,
  src,
  fileId,
  subjectId,
  subjectName,
  sectionLabel,
}) {
  const type = item.type || "pdf";
  const [noteOpen, setNoteOpen] = useState(false);
  const offlineEnabled = Boolean(fileId && subjectId);
  const { isDownloaded, downloadFile, openOffline } = useOfflineFiles();
  const [busy, setBusy] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const downloaded = offlineEnabled && isDownloaded(fileId);

  async function handleNetworkDownload() {
    // تنزيل عادي عبر رابط مؤقت — نفس السلوك القديم بالضبط، مستخدَم أيضاً
    // كخطوة أخيرة بعد التخزين المحلي الناجح (نفس Blob، بلا جلب مضاعف).
    const a = document.createElement("a");
    a.href = src;
    a.download = "";
    document.body.appendChild(a);
    a.click();
    a.remove();
  }

  async function handleFreshDownload() {
    setErrorMsg("");
    if (!offlineEnabled) {
      handleNetworkDownload();
      return;
    }
    setBusy(true);
    try {
      await downloadFile(
        {
          fileId,
          subjectId,
          subjectName,
          sectionLabel,
          title: item.title,
          fileName: item.file,
          mimeType: guessMimeType(item.file),
        },
        src
      );
      handleNetworkDownload();
      setConfirmOpen(false);
    } catch {
      setErrorMsg("تعذّر تنزيل الملف — تحقق من اتصالك بالإنترنت وحاول مجدداً");
    } finally {
      setBusy(false);
    }
  }

  async function handleOpenSaved() {
    setErrorMsg("");
    const ok = await openOffline(fileId);
    if (!ok) setErrorMsg("تعذّر فتح النسخة المحفوظة — جرّب إعادة التنزيل");
    else setConfirmOpen(false);
  }

  function handleDownloadClick() {
    if (downloaded) {
      setConfirmOpen((prev) => !prev);
    } else {
      handleFreshDownload();
    }
  }

  if (type === "link") {
    return (
      <li>
        <a
          href={item.url}
          target="_blank"
          rel="noreferrer"
          className="flex w-full items-center justify-between gap-2 rounded-md border border-border bg-bg-subtle px-3 py-2 text-sm text-text transition-colors hover:bg-bg-elevated"
        >
          <span className="min-w-0 break-words">{item.title}</span>
          <span className="shrink-0 text-text-muted">↗</span>
        </a>
      </li>
    );
  }

  if (type === "note") {
    return (
      <li>
        <button
          type="button"
          onClick={() => setNoteOpen((prev) => !prev)}
          className={`flex w-full items-center justify-between gap-2 rounded-md border px-3 py-2 text-sm transition-colors ${
            noteOpen
              ? "border-accent bg-bg-elevated text-text-h"
              : "border-border bg-bg-subtle text-text hover:bg-bg-elevated"
          }`}
        >
          <span className="min-w-0 break-words">{item.title}</span>
          <span className="shrink-0 text-text-muted">{noteOpen ? "▲" : "▼"}</span>
        </button>
        {noteOpen && (
          <div
            className="mt-2 break-words rounded-md border border-border bg-bg-subtle px-3 py-2 text-sm text-text"
            style={{ whiteSpace: "pre-wrap" }}
          >
            {item.content}
          </div>
        )}
      </li>
    );
  }

  // pdf / image (والحالة الافتراضية بدون type)
  return (
    <li>
      <button
        type="button"
        onClick={onToggle}
        className={`flex w-full items-center justify-between gap-2 rounded-md border px-3 py-2 text-sm transition-colors ${
          isOpen
            ? "border-accent bg-bg-elevated text-text-h"
            : "border-border bg-bg-subtle text-text hover:bg-bg-elevated"
        }`}
      >
        <span className="flex min-w-0 items-center gap-1.5">
          <span className="min-w-0 break-words">{item.title}</span>
          {downloaded && (
            <span
              className="shrink-0 rounded border border-warning-border bg-warning-bg px-1.5 py-0.5 text-[11px] leading-none text-warning-text"
              title="محفوظة للتصفح بدون إنترنت"
            >
              📥 محمّلة
            </span>
          )}
        </span>
        <span className="shrink-0 text-text-muted">{isOpen ? "▲" : "▼"}</span>
      </button>

      {isOpen && src && (
        <div className="mt-2 flex flex-col gap-2">
          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleDownloadClick}
              disabled={busy}
              className="flex-1 rounded-md border border-border bg-bg-subtle px-3 py-2 text-center text-sm text-text transition-colors hover:bg-bg-elevated disabled:opacity-60"
            >
              {busy ? "...جارِ التنزيل" : "⭳ تنزيل"}
            </button>
            <a
              href={src}
              target="_blank"
              rel="noreferrer"
              className="flex-1 rounded-md border border-border bg-bg-subtle px-3 py-2 text-center text-sm text-text transition-colors hover:bg-bg-elevated"
            >
              ↗ فتح بتبويب جديد
            </a>
          </div>

          {/* تأكيد يظهر فقط لملف محمّل مسبقاً — بدل استبدال النسخة المحفوظة
              بصمت عند ضغطة "تنزيل" ثانية. */}
          {confirmOpen && downloaded && (
            <div className="rounded-md border border-warning-border bg-warning-bg px-3 py-2 text-sm text-warning-text">
              <p>هذه المحاضرة محفوظة مسبقاً للتصفح بدون إنترنت. ماذا تريد؟</p>
              <div className="mt-2 flex gap-2">
                <button
                  type="button"
                  onClick={handleOpenSaved}
                  className="flex-1 rounded-md border border-warning-border bg-bg-elevated px-2 py-1.5 text-xs text-text transition-colors hover:bg-bg-subtle"
                >
                  📂 فتح النسخة المحفوظة
                </button>
                <button
                  type="button"
                  onClick={handleFreshDownload}
                  disabled={busy}
                  className="flex-1 rounded-md border border-warning-border bg-bg-elevated px-2 py-1.5 text-xs text-text transition-colors hover:bg-bg-subtle disabled:opacity-60"
                >
                  {busy ? "...جارِ التنزيل" : "⭳ تنزيل مرة أخرى"}
                </button>
              </div>
            </div>
          )}

          {errorMsg && <p className="text-xs text-danger-text">{errorMsg}</p>}
        </div>
      )}
    </li>
  );
}
