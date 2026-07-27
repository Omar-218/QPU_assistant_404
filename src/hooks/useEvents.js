import { useEffect, useState } from "react";

// ⚠️ ملف مملوك لعضو 4 (منطق البيانات) — خطة الدفعة 5، القسم 2.
// عقد موحّد لاستهلاك public/data/events.json (سجل الأحداث المقرَّرة فقط —
// approved/rejected، لا pending إطلاقاً هنا، راجع §1.1 بخطة الدفعة 5).
// يُستهلَك من Subject.jsx (عضو 2 — يفلتر بـ subjectId + isEventActive محلياً)
// ومن AdminEventsLog.jsx (عضو 3 — يعرض كل السجل بلا فلترة) وHeader.jsx (عبر
// useNotifications.js — عداد الإشعارات، يُعرَض بكل صفحة).
//
// شكل القيمة المُرجَعة (نفس نمط useStudyPlan): { events, loading } — قائمة
// خامة كاملة بلا فلترة هنا، الفلترة مسؤولية المستهلِك (isEventActive من
// lib/eventStatus.js لصفحة المادة، أو بلا فلترة لسجل الأدمن).
//
// الملف قد لا يكون موجوداً بعد أول حدث مقبول فعلياً — 404 يُعامَل كقائمة
// فارغة، لا خطأ (نفس قرار useStudyPlan عند فشل الجلب).
//
// ⚠️ إصلاح تكرار الطلب (2026-07-26، تشخيص مستخدم عبر Network tab): Header.jsx
// (عبر useNotifications) وSubject.jsx يستدعيان useEvents() كل واحد بشكل
// مستقل — بدون هذا التجميع، كل واحد ينشئ useState/useEffect خاص به، فيصير
// طلب events.json مرتين بنفس تحميل صفحة مادة (واحد من الهيدر، وواحد من
// الصفحة). الحل: تجميع الطلبات المتزامنة (request de-duplication) بوعد
// (promise) واحد مشترك على مستوى الموديول — لا تخزين مؤقت دائم (بعكس
// fetchFlatCurriculum بـ curriculum.js)، لأن AdminEventsLog.jsx يحتاج بيانات
// طازجة دائماً بعد كل قرار جديد؛ نفرّغ الوعد المشترك فور اكتماله (نجاحاً أو
// فشلاً) عشان أي طلب لاحق (حتى لو بعد جزء من الثانية) يبدأ fetch جديد فعلي،
// ويشارك فقط الطلبات المتزامنة الفعلية بنفس اللحظة.
let inflightEventsPromise = null;

function fetchEventsShared() {
  if (inflightEventsPromise) return inflightEventsPromise;
  inflightEventsPromise = fetch(`${import.meta.env.BASE_URL}data/events.json`, {
    cache: "no-store",
  })
    .then((res) => {
      if (!res.ok) throw new Error("fetch-failed");
      return res.json();
    })
    .then((data) => (Array.isArray(data?.events) ? data.events : []))
    .catch(() => [])
    .finally(() => {
      inflightEventsPromise = null;
    });
  return inflightEventsPromise;
}

export function useEvents() {
  const [state, setState] = useState({ events: [], loading: true });

  useEffect(() => {
    let cancelled = false;
    fetchEventsShared().then((events) => {
      if (!cancelled) setState({ events, loading: false });
    });
    return () => {
      cancelled = true;
    };
  }, []);

  return state;
}
