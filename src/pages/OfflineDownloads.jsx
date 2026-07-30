import React from "react";
import { Link } from "react-router-dom";
import { useOfflineFiles } from "../hooks/useOfflineFiles.js";
import { formatFileSize } from "../lib/formatFileSize.js";

// ⚠️ ملف جديد — مهمة المدير (ميزة "تصفح المواد بدون إنترنت"، طلب مباشر من
// المستخدم، 2026-07-30). صفحة عامة (لا حسابات طلاب، نفس افتراض NotificationsPage.jsx)
// تعرض كل الملفات المحفوظة محلياً بـ IndexedDB (useOfflineFiles.js)، مقسّمة
// حسب المادة. تعمل بالكامل بدون اتصال إنترنت (كل البيانات من الجهاز نفسه) —
// الاستثناء الوحيد: أول تحميل لـ shell الموقع نفسه يحتاج نتاً (لا Service
// Worker بهذي المرحلة، القسم 0 من خطة "team-plan-downloads-notifications.md").
//
// المسار المسجَّل بـ App.jsx: /offline (مسؤولية المدير).
// رابط بالشريط الجانبي (Sidebar.jsx، مسؤولية المدير) — قسم دائم الظهور، لا
// يختفي عند الفراغ (بخلاف FavoritesSection) لأنه صفحة ميزة أساسية، لا تخصيص.

// ⚠️ 2026-07-30: formatSize كانت مُعرَّفة هنا محلياً — انتقلت لـ
// src/lib/formatFileSize.js (formatFileSize) لتُستخدم أيضاً بـ LectureItem.jsx
// بلا تكرار. الاسم المحلي أدناه أُبقي كـ alias فقط لتفادي تعديل كل الاستدعاءات
// أسفل هذا الملف بلا داعٍ.
const formatSize = formatFileSize;

export default function OfflineDownloads() {
  const { loading, openOffline, removeOffline, groupedBySubject, files } = useOfflineFiles();
  const grouped = groupedBySubject();
  const subjectIds = Object.keys(grouped);
  const totalSize = files.reduce((sum, f) => sum + (f.sizeBytes || 0), 0);

  return (
    <div>
      <h1 className="text-xl font-bold text-text-h">📥 المواد بدون إنترنت</h1>
      <p className="mt-1 text-sm text-text-muted">
        الملفات التي حمّلتها من صفحات المواد تظهر هنا، وتبقى متاحة للتصفح حتى بدون اتصال بالإنترنت.
      </p>

      {loading && <p className="mt-6 text-text-muted">...جارِ التحميل</p>}

      {!loading && subjectIds.length === 0 && (
        <div className="mt-6 rounded-md border border-border bg-bg-subtle px-4 py-6 text-center text-sm text-text-muted">
          لا توجد ملفات محمّلة بعد. افتح أي محاضرة بصفحة مادتك واضغط "⭳ تنزيل" لتُحفظ هنا.
        </div>
      )}

      {!loading && subjectIds.length > 0 && (
        <>
          <p className="mt-4 text-xs text-text-muted">
            {files.length} ملف محفوظ — {formatSize(totalSize)} إجمالاً
          </p>
          <div className="mt-4 flex flex-col gap-6">
            {subjectIds.map((subjectId) => {
              const group = grouped[subjectId];
              return (
                <section key={subjectId}>
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
                </section>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
