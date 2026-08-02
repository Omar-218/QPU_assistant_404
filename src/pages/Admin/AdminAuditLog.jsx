import React, { useEffect, useState } from "react";
import { getStoredToken, DEFAULT_OWNER, DEFAULT_REPO } from "../../lib/adminAuth.js";

// ⚠️ ملف جديد — مهمة المدير (طلب مباشر من المستخدم، 2026-08-02، اقتراح #5 من
// مراجعة خبير للوحة التحكم: "سجل تدقيق مرئي"). صفحة `/admin/audit-log`.
//
// GitHub نفسه يحتفظ بتاريخ كل commit فعلياً (كما لاحظ الخبير حرفياً) — هذي
// الصفحة فقط واجهة عرض تلخيصية فوق GitHub Commits API لنفس الريبو، بلا أي
// تخزين/بيانات إضافية من طرفنا. commit واحد لكل نشر ناجح (merge)، بعنوانه
// الأصلي كما كُتب وقت `publishToGitHub` — نفس نمط `usePendingRequestsCount.js`
// (نفس رأس Authorization/Accept/X-GitHub-Api-Version، نفس التوكن المحفوظ).
//
// ⚠️ نطاق متعمَّد: لا فلترة بحسب "نوع" العملية (حذف/نشر مادة/قرار حدث..) —
// عنوان الـcommit نفسه (رسالة الـcommit التي يبنيها publishToGitHub لكل حزمة)
// يحمل كل التفاصيل المفيدة أصلاً؛ إعادة تصنيفها هنا برمجياً تخمين هش (نفس
// نص الرسالة يتغيّر بحرية بكود عضو 5 بلا عقد صريح لشكله). بدل ذلك: عرض نصي
// كامل + رابط مباشر لصفحة الـcommit على GitHub لمن يريد التفاصيل الكاملة
// (diff الملفات الفعلي) — لا حاجة لإعادة بناء ذلك هنا.
//
// صفحة قراءة فقط بالكامل (GET حصراً) — لا تُعدِّل أي شيء بالريبو.

const PER_PAGE = 30;

function formatDate(iso) {
  try {
    return new Date(iso).toLocaleString("ar", {
      dateStyle: "medium",
      timeStyle: "short",
    });
  } catch {
    return iso;
  }
}

export default function AdminAuditLog() {
  const [status, setStatus] = useState("loading"); // loading | done | error | no-token
  const [commits, setCommits] = useState([]);
  const [error, setError] = useState(null);
  const [page, setPage] = useState(1);

  useEffect(() => {
    const token = getStoredToken();
    if (!token) {
      setStatus("no-token");
      return;
    }
    let cancelled = false;
    setStatus("loading");
    setError(null);
    fetch(
      `https://api.github.com/repos/${DEFAULT_OWNER}/${DEFAULT_REPO}/commits?per_page=${PER_PAGE}&page=${page}`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/vnd.github+json",
          "X-GitHub-Api-Version": "2022-11-28",
        },
      }
    )
      .then((res) => (res.ok ? res.json() : Promise.reject(new Error("fetch-failed"))))
      .then((data) => {
        if (cancelled) return;
        setCommits(Array.isArray(data) ? data : []);
        setStatus("done");
      })
      .catch(() => {
        if (!cancelled) {
          setError("تعذّر تحميل سجل التغييرات — تحقق من اتصالك وحاول مجدداً");
          setStatus("error");
        }
      });
    return () => {
      cancelled = true;
    };
  }, [page]);

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-xl font-bold text-text-h">سجل التدقيق</h1>
        <p className="mt-1 text-xs text-text-muted">
          كل commit فعلي على الريبو (كل نشر ناجح من لوحة التحكم يُصدر واحداً) — من مباشرة، لا
          تخزين إضافي. اضغط أي سطر لعرض التفاصيل الكاملة (الملفات المتغيّرة) على GitHub.
        </p>
      </div>

      {status === "no-token" && (
        <p className="text-sm text-danger-text">
          يحتاج هذا السجل توكن دخول محفوظاً — سجّل الدخول للوحة التحكم أولاً.
        </p>
      )}

      {status === "loading" && <p className="text-sm text-text-muted">...جارِ التحميل</p>}

      {status === "error" && <p className="text-sm text-danger-text">{error}</p>}

      {status === "done" && commits.length === 0 && (
        <p className="text-sm text-text-muted">لا يوجد سجل تغييرات بهذه الصفحة.</p>
      )}

      {status === "done" && commits.length > 0 && (
        <ul className="flex flex-col gap-2">
          {commits.map((c) => {
            const message = c.commit?.message?.split("\n")[0] || "(بلا رسالة)";
            const author = c.commit?.author?.name || c.author?.login || "غير معروف";
            const date = c.commit?.author?.date;
            return (
              <li key={c.sha}>
                <a
                  href={c.html_url}
                  target="_blank"
                  rel="noreferrer"
                  className="flex flex-col gap-1 rounded-md border border-border bg-bg-subtle px-3 py-2 text-sm hover:bg-bg-elevated"
                >
                  <span className="break-words text-text">{message}</span>
                  <span className="text-xs text-text-muted">
                    {author} — {date ? formatDate(date) : ""} —{" "}
                    <code className="text-[11px]">{c.sha?.slice(0, 7)}</code>
                  </span>
                </a>
              </li>
            );
          })}
        </ul>
      )}

      {status === "done" && (
        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            className="rounded-md border border-border px-3 py-1.5 text-xs text-text hover:bg-bg-elevated disabled:opacity-40"
          >
            الأحدث
          </button>
          <span className="text-xs text-text-muted">صفحة {page}</span>
          <button
            type="button"
            onClick={() => setPage((p) => p + 1)}
            disabled={commits.length < PER_PAGE}
            className="rounded-md border border-border px-3 py-1.5 text-xs text-text hover:bg-bg-elevated disabled:opacity-40"
          >
            أقدم
          </button>
        </div>
      )}
    </div>
  );
}
