import React from "react";
import { Link } from "react-router-dom";
import { useOfflineFiles } from "../hooks/useOfflineFiles.js";
import { useOfflineSubjectPages } from "../hooks/useOfflineSubjectPages.js";
import { formatFileSize } from "../lib/formatFileSize.js";

// ⚠️ ملف جديد — مهمة المدير (ميزة "تصفح المواد بدون إنترنت"، طلب مباشر من
// المستخدم، 2026-07-30). صفحة عامة (لا حسابات طلاب، نفس افتراض NotificationsPage.jsx)
// تعرض كل ما هو محفوظ محلياً للتصفح بدون اتصال، بقسمين:
//   1. ملفات محاضرات فعلية (pdf/image) — IndexedDB، useOfflineFiles.js.
//   2. صفحات مواد كاملة (عنوان + قائمة محاضرات، بلا الملفات نفسها) — Cache
//      Storage عبر sw.js، متتبَّعة بـ useOfflineSubjectPages.js (جديد،
//      2026-08-01). راجع src/lib/offlineSubjectPrefetch.js للتفاصيل الكاملة.
// كلا القسمين يعملان بالكامل بدون اتصال إنترنت طالما public/sw.js سجَّل
// نفسه بزيارة سابقة متصلة (راجع تعليق public/sw.js).
//
// المسار المسجَّل بـ App.jsx: /offline (مسؤولية المدير).
// رابط بالشريط الجانبي (Sidebar.jsx، مسؤولية المدير) — قسم دائم الظهور، لا
// يختفي عند الفراغ (بخلاف FavoritesSection) لأنه صفحة ميزة أساسية، لا تخصيص.

// ⚠️ 2026-07-30: formatSize كانت مُعرَّفة هنا محلياً — انتقلت لـ
// src/lib/formatFileSize.js (formatFileSize) لتُستخدم أيضاً بـ LectureItem.jsx
// بلا تكرار. الاسم المحلي أدناه أُبقي كـ alias فقط لتفادي تعديل كل الاستدعاءات
// أسفل هذا الملف بلا داعٍ.
const formatSize = formatFileSize;

function formatDate(ts) {
  try {
    return new Date(ts).toLocaleDateString("ar", { day: "numeric", month: "short" });
  } catch {
    return "";
  }
}

export default function OfflineDownloads() {
  const { loading, openOffline, removeOffline, groupedBySubject, files } = useOfflineFiles();
  const { savedPages, loading: pagesLoading, savePage, removePage } = useOfflineSubjectPages();
  const grouped = groupedBySubject();
  const subjectIds = Object.keys(grouped);
  const totalSize = files.reduce((sum, f) => sum + (f.sizeBytes || 0), 0);

  return (
    <div>
      <h1 className="text-xl font-bold text-text-h">📥 المواد بدون إنترنت</h1>
      <p className="mt-1 text-sm text-text-muted">
        صفحات المواد والملفات التي حفظتها تظهر هنا، وتبقى متاحة حتى بدون اتصال بالإنترنت.
      </p>

      {/* قسم صفحات المواد المحفوظة (عنوان + قائمة محاضرات، بلا ملفات pdf/image نفسها) */}
      <section className="mt-6">
        <h2 className="mb-2 text-sm font-bold text-text-h">📄 صفحات المواد المحفوظة</h2>
        {pagesLoading && <p className="text-sm text-text-muted">...جارِ التحميل</p>}
        {!pagesLoading && savedPages.length === 0 && (
          <div className="rounded-md border border-border bg-bg-subtle px-4 py-4 text-center text-sm text-text-muted">
            لا توجد صفحات محفوظة بعد. افتح صفحة أي مادة واضغط "📥 حفظ هذه الصفحة بدون إنترنت"، أو
            ثبّت المادة (⭐) من قائمة المواد ليُحفظ حفظها تلقائياً.
          </div>
        )}
        {!pagesLoading && savedPages.length > 0 && (
          <ul className="space-y-2">
            {savedPages.map((p) => (
              <li
                key={p.subjectId}
                className="flex items-center justify-between gap-2 rounded-md border border-border bg-bg-subtle px-3 py-2 text-sm"
              >
                <div className="min-w-0">
                  <Link to={`/subject/${p.subjectId}`} className="break-words text-text hover:text-accent">
                    {p.subjectName}
                  </Link>
                  <p className="mt-0.5 text-xs text-text-muted">محفوظة منذ {formatDate(p.savedAt)}</p>
                </div>
                <div className="flex shrink-0 gap-2">
                  <button
                    type="button"
                    onClick={() => savePage(p.subjectId)}
                    className="rounded-md border border-border bg-bg-elevated px-2 py-1.5 text-xs text-text transition-colors hover:bg-bg"
                    title="إعادة جلب أحدث نسخة وتحديث الحفظ"
                  >
                    تحديث
                  </button>
                  <button
                    type="button"
                    onClick={() => removePage(p.subjectId)}
                    className="rounded-md border border-danger-border bg-danger-bg px-2 py-1.5 text-xs text-danger-text transition-colors hover:opacity-90"
                  >
                    إزالة
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* قسم ملفات المحاضرات المحمّلة فعلياً (pdf/image) */}
      <section className="mt-8">
        <h2 className="mb-2 text-sm font-bold text-text-h">🗂️ ملفات المحاضرات المحمّلة</h2>

        {loading && <p className="text-text-muted">...جارِ التحميل</p>}

        {!loading && subjectIds.length === 0 && (
          <div className="rounded-md border border-border bg-bg-subtle px-4 py-6 text-center text-sm text-text-muted">
            لا توجد ملفات محمّلة بعد. افتح أي محاضرة بصفحة مادتك واضغط "⭳ تنزيل" لتُحفظ هنا.
          </div>
        )}

        {!loading && subjectIds.length > 0 && (
          <>
            <p className="mb-2 text-xs text-text-muted">
              {files.length} ملف محفوظ — {formatSize(totalSize)} إجمالاً
            </p>
            <div className="flex flex-col gap-6">
              {subjectIds.map((subjectId) => {
                const group = grouped[subjectId];
                return (
                  <div key={subjectId}>
                    <div className="mb-2 flex items-center justify-between">
                      <Link
                        to={`/subject/${subjectId}`}
                        className="text-sm font-bold text-text-h hover:text-accent"
                      >
                        {group.subjectName}
                      </Link>
                      <span className="text-xs text-text-muted">{group.files.length} ملف</span>
                    </div>
                    <ul className="space-y-2">
                      {group.files.map((f) => (
                        <li
                          key={f.fileId}
                          className="flex items-center justify-between gap-2 rounded-md border border-border bg-bg-subtle px-3 py-2 text-sm"
                        >
                          <div className="min-w-0">
                            <p className="break-words text-text">{f.title}</p>
                            <p className="mt-0.5 text-xs text-text-muted">
                              {f.sectionLabel ? `${f.sectionLabel} — ` : ""}
                              {formatSize(f.sizeBytes)}
                            </p>
                          </div>
                          <div className="flex shrink-0 gap-2">
                            <button
                              type="button"
                              onClick={() => openOffline(f.fileId)}
                              className="rounded-md border border-border bg-bg-elevated px-2 py-1.5 text-xs text-text transition-colors hover:bg-bg"
                            >
                              فتح
                            </button>
                            <button
                              type="button"
                              onClick={() => removeOffline(f.fileId)}
                              className="rounded-md border border-danger-border bg-danger-bg px-2 py-1.5 text-xs text-danger-text transition-colors hover:opacity-90"
                            >
                              حذف
                            </button>
                          </div>
                        </li>
                      ))}
                    </ul>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </section>
    </div>
  );
}
