import { useEffect, useState } from "react";

// ⚠️ ملف مملوك لعضو 4 (منطق البيانات) — خطة الدفعة 5، القسم 2.
// عقد موحّد لاستهلاك public/data/upload-requests-log.json (سجل قرارات رفع
// الملفات فقط — راجع §1.3 بخطة الدفعة 5). يُستهلَك من AdminEventsLog.jsx
// (عضو 3) وuseNotifications.js (أدناه). لا تُستهلَك هذي مباشرة من أي صفحة
// طالب — السجل لوحة أدمن فقط بنص الخطة.
//
// شكل القيمة المُرجَعة (نفس نمط useEvents/useStudyPlan): { requests, loading }.
//
// ⚠️ نفس إصلاح تكرار الطلب المطبَّق على useEvents.js (2026-07-26) — راجع
// التعليق المفصَّل هناك. تجميع (de-duplication) للطلبات المتزامنة فقط، بلا
// تخزين مؤقت دائم (AdminEventsLog.jsx يحتاج بيانات طازجة دائماً).
let inflightUploadsPromise = null;

function fetchUploadsShared() {
  if (inflightUploadsPromise) return inflightUploadsPromise;
  inflightUploadsPromise = fetch(
    `${import.meta.env.BASE_URL}data/upload-requests-log.json`,
    { cache: "no-store" }
  )
    .then((res) => {
      if (!res.ok) throw new Error("fetch-failed");
      return res.json();
    })
    .then((data) => (Array.isArray(data?.requests) ? data.requests : []))
    .catch(() => [])
    .finally(() => {
      inflightUploadsPromise = null;
    });
  return inflightUploadsPromise;
}

export function useUploadRequestsLog() {
  const [state, setState] = useState({ requests: [], loading: true });

  useEffect(() => {
    let cancelled = false;
    fetchUploadsShared().then((requests) => {
      if (!cancelled) setState({ requests, loading: false });
    });
    return () => {
      cancelled = true;
    };
  }, []);

  return state;
}
