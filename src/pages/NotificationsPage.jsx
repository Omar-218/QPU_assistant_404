import React from "react";
import { Link } from "react-router-dom";
import { useNotifications } from "../hooks/useNotifications.js";
import { useNotifySubscriptions } from "../hooks/useNotifySubscriptions.js";

// ⚠️ ملف مملوك لعضو 2 — جديد (خطة الدفعة 5، القسم 2). صفحة عامة لكل الزوار
// (لا حسابات طلاب أصلاً — القسم "افتراضان إضافيان" بخطة الدفعة). المسار
// نفسه (/notifications) والتسجيل بـ App.jsx من مسؤولية المدير (القسم 2 من
// الجدول) — هذا الملف فقط، بلا تعديل على App.jsx/Header.jsx.
//
// الإشعارات مُشتقّة بالكامل (القسم 1.5): events.json + upload-requests-log.json
// مرتَّبة حسب decidedAt تنازلياً، آخر 20 عنصراً فقط — مبنية بـ useNotifications
// (عضو 4)، لا ملف تخزين خاص بها.
//
// ⚠️ تحديث (2026-07-27، طلب مباشر من المستخدم):
// - useNotifications الآن يرجّع المقبول فقط (لا حاجة لشارة حالة إطلاقاً هنا).
// - كل عنصر يفتح صفحة المادة مباشرة بضغطة (subjectId مضاف بعقد الهوك).
//
// ⚠️ تحديث (2026-07-29، طلب مباشر من المستخدم): قسم مميَّز بالأعلى "🔔 مواد
// تتابعها" — فلترة محلية بحتة لنفس قائمة useNotifications() حسب
// useNotifySubscriptions() (اختيار المستخدم بـ SubjectCard.jsx/
// FavoritesSection.jsx). لا مصدر بيانات إضافي، لا طلب شبكة إضافي — نفس
// items بالضبط، فلترة/فرز عرض فقط. لو المستخدم ما اشترك بأي مادة، القسم لا
// يظهر إطلاقاً (نفس قرار "لو فاضي لا يُعرض" المعتمَد بباقي المشروع).

const KIND_ICON = { event: "📌", upload: "📎" };

function NotificationItem({ item }) {
  return (
    <li>
      <Link
        to={`/subject/${item.subjectId}`}
        className="block rounded-md border border-border bg-bg-subtle px-4 py-3 text-sm transition-colors hover:bg-bg-elevated"
      >
        <p className="text-text-h">
          {KIND_ICON[item.kind]} {item.subjectName} — {item.label}
        </p>
        <p className="mt-1 text-xs text-text-muted">
          {new Date(item.decidedAt).toLocaleDateString("ar")}
        </p>
      </Link>
    </li>
  );
}

export default function NotificationsPage() {
  const { items, loading } = useNotifications();
  const { subscriptions } = useNotifySubscriptions();

  const subscribedItems = items.filter((item) => subscriptions.includes(item.subjectId));

  return (
    <div>
      <h1 className="text-xl font-bold text-text-h">الإشعارات</h1>
      <p className="mt-1 text-sm text-text-muted">
        آخر ما اعتُمد من طلبات الطلاب (أحداث وطلبات رفع ملفات) — عام لكل الزوار.
      </p>

      <div className="mt-6">
        {loading && <p className="text-text-muted">...جارِ التحميل</p>}

        {!loading && subscribedItems.length > 0 && (
          <div className="mb-6">
            <h2 className="mb-2 text-sm font-bold text-text-h">🔔 مواد تتابعها</h2>
            <ul className="flex flex-col gap-2">
              {subscribedItems.map((item) => (
                <NotificationItem key={`sub-${item.kind}-${item.id}`} item={item} />
              ))}
            </ul>
          </div>
        )}

        {!loading && items.length === 0 && (
          <p className="text-text-muted">لا توجد إشعارات بعد</p>
        )}

        {!loading && items.length > 0 && (
          <>
            {subscribedItems.length > 0 && (
              <h2 className="mb-2 text-sm font-bold text-text-h">كل الإشعارات</h2>
            )}
            <ul className="flex flex-col gap-2">
              {items.map((item) => (
                <NotificationItem key={`${item.kind}-${item.id}`} item={item} />
              ))}
            </ul>
          </>
        )}
      </div>
    </div>
  );
}
