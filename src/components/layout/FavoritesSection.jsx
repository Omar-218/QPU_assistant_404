import React, { useEffect } from "react";
import { Link } from "react-router-dom";
import { useStudyPlan } from "../../hooks/useStudyPlan.js";
import { useFavorites } from "../../hooks/useFavorites.js";
import { useEvents } from "../../hooks/useEvents.js";
import { useNotifySubscriptions } from "../../hooks/useNotifySubscriptions.js";
import { isEventActive } from "../../lib/eventStatus.js";
import { prefetchFavoriteSubjectsOffline } from "../../lib/offlineSubjectPrefetch.js";

// ⚠️ ملف مملوك لعضو 2 — الدفعة 4 (المهمة 4)
// قسم "المفضلة" بالشريط الجانبي. المدير يستورده يدوياً بـ Sidebar.jsx
// (بنفس نمط حجز مكان ThemeToggleButton بـ Header.jsx) — لا يلمس عضو 2 ذلك الملف.
// لو ما فيه مواد مفضّلة، لا يُعرض القسم إطلاقاً.
//
// ⚠️ تحديث (2026-07-27، طلب مباشر من المستخدم، خطة الدفعة 5): نقطة صغيرة
// بجانب اسم أي مادة مفضّلة فيها حدث نشِط الآن (isEventActive — نفس منطق
// شريط الأحداث بصفحة المادة نفسها، مُشتقّ لحظياً، بلا أي تخزين إضافي).
//
// ⚠️ تحديث (2026-07-29، طلب مباشر من المستخدم): زر جرس صغير بجانب كل مادة
// مفضّلة يبدّل الاشتراك بإشعاراتها (useNotifySubscriptions.js) — نفس السؤال
// اللي يظهر لحظة الإضافة للمفضلة بـ SubjectCard.jsx، لكن هنا بلا "سؤال"
// (تبديل مباشر بضغطة، بما إن المستخدم هنا أصلاً بقسم إدارة مفضلته الواعي).
// يفيد بالذات المواد اللي أُضيفت للمفضلة *قبل* وجود هذي الميزة، واللي ما
// شافت أي سؤال أصلاً.

export default function FavoritesSection() {
  const { courses, loading } = useStudyPlan();
  const { favorites } = useFavorites();
  const { events } = useEvents();
  const { isSubscribed, toggleSubscribed } = useNotifySubscriptions();

  // ⚠️ جديد (2026-07-30، طلب مباشر من المستخدم): يخزّن صفحات كل المواد
  // المفضّلة (subject.json + ملف المحاضرات النشِط) بكاش sw.js بصمت — يغطي
  // حالتين معاً: المواد المفضّلة أصلاً من قبل (عند تحميل هذا المكوّن أول
  // مرة)، والمواد المضافة/المحذوفة من المفضلة حديثاً (favorites يتغيّر).
  // لا علاقة له بتنزيل ملفات pdf/image الفعلية — ذاك اختياري بالكامل ويبقى
  // من مسؤولية LectureItem.jsx/useOfflineFiles.js فقط. راجع
  // src/lib/offlineSubjectPrefetch.js للتفاصيل والتعليل الكامل.
  useEffect(() => {
    if (favorites.length > 0) {
      prefetchFavoriteSubjectsOffline(favorites);
    }
  }, [favorites]);

  if (loading) return null;

  const items = courses.filter((c) => favorites.includes(c.id));
  if (items.length === 0) return null;

  return (
    <div className="mt-6">
      <div className="mb-2 px-1 text-xs font-bold text-text-muted">⭐ المفضلة</div>
      <nav className="flex flex-col gap-1">
        {items.map((course) => {
          const hasActiveEvent = events.some(
            (ev) => ev.subjectId === course.id && isEventActive(ev)
          );
          const subscribed = isSubscribed(course.id);
          return (
            <div key={course.id} className="flex items-center gap-1 rounded-md hover:bg-bg-elevated">
              <Link
                to={`/subject/${course.id}`}
                className="flex min-w-0 flex-1 items-center gap-1.5 truncate px-3 py-1.5 text-sm text-text"
              >
                <span className="truncate">{course.name}</span>
                {hasActiveEvent && (
                  <span
                    className="inline-block h-1.5 w-1.5 shrink-0 rounded-full bg-danger-text"
                    title="فيه حدث نشِط بهذي المادة"
                  />
                )}
              </Link>
              <button
                type="button"
                onClick={() => toggleSubscribed(course.id)}
                aria-label={subscribed ? "إيقاف إشعارات هذي المادة" : "تفعيل إشعارات هذي المادة"}
                title={subscribed ? "إشعارات هذي المادة مفعَّلة" : "إشعارات هذي المادة متوقفة"}
                className={`shrink-0 px-2 py-1.5 text-sm ${
                  subscribed ? "text-warning-text" : "text-text-muted hover:text-text"
                }`}
              >
                {subscribed ? "🔔" : "🔕"}
              </button>
            </div>
          );
        })}
      </nav>
    </div>
  );
}
