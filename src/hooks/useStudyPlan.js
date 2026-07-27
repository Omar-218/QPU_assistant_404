import { useEffect, useState } from "react";
import { isVisible } from "../lib/hiddenFilter.js";

// ⚠️ ملف مملوك لعضو 4 (منطق البيانات) — الدفعة 4، المهمة 4.
// عقد موحّد لاستهلاك study-plan.json، يحل ازدواجية fetch الموجودة حالياً
// بـ SubjectList.jsx و StudyPlan.jsx (كل واحد يجيب البيانات ويطبّق isVisible
// بنفسه بشكل منفصل ومكرَّر). عضو 2 يستهلك هذا الهوك مباشرة بدل التكرار.
//
// شكل القيمة المُرجَعة محسوم بخطة التعديل (الدفعة 4، المهمة 4):
// { courses, loading } — لا تُغيَّر بدون تنسيق مع المدير.
//
// عند فشل الجلب: courses ترجع مصفوفة فارغة (لا حقل error منفصل بالعقد) —
// هذا يتماشى فعلياً مع سلوك "أخفِ القسم كاملاً لو فاضي" المطلوب من
// FavoritesSection/RecentlyViewedSection (عضو 2).
//
// ⚠️ إصلاح تكرار الطلب (2026-07-26، نفس نمط useEvents.js/useUploadRequestsLog.js
// — تشخيص مستخدم عبر Network tab: 3 طلبات متزامنة لـstudy-plan.json بتحميل
// الصفحة الرئيسية وحدها، لأن SubjectList.jsx وFavoritesSection.jsx و
// RecentlyViewedSection.jsx (الثلاثة تُعرَض معاً دائماً) يستدعي كل واحد منها
// useStudyPlan() بشكل مستقل تماماً). نفس الحل: تجميع الطلبات المتزامنة بوعد
// مشترك يُفرَّغ فور الاكتمال — لا تخزين مؤقت دائم عمداً (لو الأدمن نشر مادة
// جديدة بالتو، أول تحميل صفحة لاحق لازم يجيب النسخة الطازجة، لا نسخة قديمة
// من ذاكرة متبقّية من جلسة تصفّح سابقة بنفس التبويب).
let inflightStudyPlanPromise = null;

function fetchStudyPlanShared() {
  if (inflightStudyPlanPromise) return inflightStudyPlanPromise;
  inflightStudyPlanPromise = fetch(`${import.meta.env.BASE_URL}data/study-plan.json`)
    .then((res) => {
      if (!res.ok) throw new Error("fetch-failed");
      return res.json();
    })
    .then((data) => (Array.isArray(data?.courses) ? data.courses.filter(isVisible) : []))
    .catch(() => [])
    .finally(() => {
      inflightStudyPlanPromise = null;
    });
  return inflightStudyPlanPromise;
}

export function useStudyPlan() {
  const [state, setState] = useState({ courses: [], loading: true });

  useEffect(() => {
    let cancelled = false;
    fetchStudyPlanShared().then((courses) => {
      if (!cancelled) setState({ courses, loading: false });
    });
    return () => {
      cancelled = true;
    };
  }, []);

  return state;
}
