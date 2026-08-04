import React, { useEffect, useState } from "react";
import { fetchScheduledQueue, buildScheduleCancellation } from "../../lib/scheduledPublish.js";
import PublishPanel from "../../components/admin/PublishPanel.jsx";

// ⚠️ ملف جديد — مهمة المدير (اقتراح #10: "جدولة نشر"، 2026-08-04).
// راجع docs/scheduled-publish.md للتصميم الكامل. تعرض قائمة انتظار النشر
// المجدوَل الحالية (public/data/scheduled-publishes.json) وتتيح الإلغاء —
// **لا تطبّق أي تغيير مجدوَل يدوياً من هنا**، فقط تدير القائمة نفسها. التطبيق
// الفعلي يحدث تلقائياً بمعزل تام عبر GitHub Action مجدولة كل 15 دقيقة.
// المسار: /admin/scheduled-publishes (مسؤولية المدير بـApp.jsx).

function formatDate(iso) {
  try {
    return new Date(iso).toLocaleString("ar", {
      day: "numeric",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

export default function AdminScheduledPublishes() {
  const [queue, setQueue] = useState([]);
  const [loading, setLoading] = useState(true);
  const [cancelId, setCancelId] = useState(null); // الإدخال الجاري تأكيد إلغاؤه حالياً

  async function refresh() {
    setLoading(true);
    const q = await fetchScheduledQueue();
    // الأقرب موعداً أولاً — الأكثر أهمية للأدمن يشوفه فوراً
    q.sort((a, b) => new Date(a.publishAt) - new Date(b.publishAt));
    setQueue(q);
    setLoading(false);
  }

  useEffect(() => {
    refresh();
  }, []);

  const cancelPkg = cancelId ? buildScheduleCancellation(queue, cancelId) : null;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-text-h">🕓 النشر المجدوَل</h1>
        <button
          type="button"
          onClick={refresh}
          className="rounded-md border border-border px-3 py-1.5 text-sm text-text hover:bg-bg-elevated"
        >
          تحديث
        </button>
      </div>

      <p className="text-sm text-text-muted">
        التغييرات المجدوَلة هنا تُطبَّق تلقائياً بموعدها (تفحص GitHub Action كل ~15 دقيقة، فقد
        يتأخر التنفيذ الفعلي عن الموعد المحدَّد ببضع دقائق — GitHub لا يضمن دقة أعلى من هذا
        للمهام المجدوَلة). راجع صفحة "🕓 سجل النشر" لتأكيد التنفيذ الفعلي بعد الموعد.
      </p>

      {loading && <p className="text-text-muted">...جارِ التحميل</p>}

      {!loading && queue.length === 0 && (
        <div className="rounded-md border border-border bg-bg-subtle px-4 py-6 text-center text-sm text-text-muted">
          لا توجد عناصر مجدوَلة حالياً. الجدولة تتم من "🕓 جدولة لاحقاً" ضمن الإجراءات الجماعية
          بالصفحة الرئيسية للوحة التحكم.
        </div>
      )}

      {!loading && queue.length > 0 && (
        <ul className="flex flex-col gap-2">
          {queue.map((entry) => (
            <li
              key={entry.id}
              className="flex items-center justify-between gap-2 rounded-md border border-border bg-bg-subtle px-4 py-3 text-sm"
            >
              <div className="min-w-0">
                <p className="text-text-h">{entry.description || "(بلا وصف)"}</p>
                <p className="mt-0.5 text-xs text-text-muted">
                  موعد التنفيذ: {formatDate(entry.publishAt)} — {entry.courses?.length ?? 0} مادة
                  بالقائمة المجدوَلة
                </p>
              </div>
              <button
                type="button"
                onClick={() => setCancelId(entry.id)}
                className="shrink-0 rounded-md border border-danger-border bg-danger-bg px-3 py-1.5 text-xs text-danger-text hover:opacity-90"
              >
                إلغاء
              </button>
            </li>
          ))}
        </ul>
      )}

      {cancelPkg && (
        <div className="rounded-lg border border-border bg-bg-subtle p-4">
          <p className="mb-2 text-sm text-text">
            تأكيد إلغاء الجدولة — هذا ينشر تحديثاً فورياً لقائمة الانتظار (يُزال هذا العنصر منها،
            لن يُنفَّذ إطلاقاً).
          </p>
          <PublishPanel
            pkg={cancelPkg}
            onPublishSuccess={() => {
              setCancelId(null);
              refresh();
            }}
          />
        </div>
      )}
    </div>
  );
}
