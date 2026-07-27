import { useMemo } from "react";
import { useEvents } from "./useEvents.js";
import { useUploadRequestsLog } from "./useUploadRequestsLog.js";

// ⚠️ ملف مملوك لعضو 4 (منطق البيانات) — خطة الدفعة 5، القسم 1.5/§2.
// الإشعارات مُشتقّة بالكامل من events.json + upload-requests-log.json —
// لا ملف تخزين خاص بها، لا كتابة إضافية (§1.5 بالخطة). يُستهلَك من
// NotificationsPage.jsx (عضو 2) فقط.
//
// ⚠️ تحديث (2026-07-27، طلب مباشر من المستخدم): الإشعارات العامة تُظهر
// المقبول فقط — لا فائدة عامة من عرض طلب مرفوض لزائر مجهول (لا نظام هوية
// يربط الطالب بطلبه أصلاً)، فيبقى "مرفوض" معلومة داخلية بلوحة سجل الأدمن
// فقط (AdminEventsLog.jsx يعرض كل الحالات كما هو).
//
// شكل القيمة المُرجَعة: { items, loading } حيث كل عنصر:
//   { id, kind: "event"|"upload", subjectId, subjectName, label, status, decidedAt }
// مرتَّبة حسب decidedAt تنازلياً، آخر MAX_ITEMS فقط. status هنا دائماً
// "approved" فقط (أُبقيَ الحقل لسهولة العرض/التوافق، لا لأنه متغيّر فعلياً).

const MAX_ITEMS = 20;

export function useNotifications() {
  const { events, loading: eventsLoading } = useEvents();
  const { requests, loading: requestsLoading } = useUploadRequestsLog();

  const items = useMemo(() => {
    const eventItems = events
      .filter((ev) => ev.status === "approved" && ev.decidedAt)
      .map((ev) => ({
        id: ev.id,
        kind: "event",
        subjectId: ev.subjectId,
        subjectName: ev.subjectName,
        label: `${ev.typeLabel}: ${ev.title}`,
        status: ev.status,
        decidedAt: ev.decidedAt,
      }));

    const uploadItems = requests
      .filter((up) => up.status === "approved" && up.decidedAt)
      .map((up) => ({
        id: up.id,
        kind: "upload",
        subjectId: up.subjectId,
        subjectName: up.subjectName,
        label: up.requestedTitle,
        status: up.status,
        decidedAt: up.decidedAt,
      }));

    return [...eventItems, ...uploadItems]
      .sort((a, b) => new Date(b.decidedAt) - new Date(a.decidedAt))
      .slice(0, MAX_ITEMS);
  }, [events, requests]);

  return { items, loading: eventsLoading || requestsLoading };
}
