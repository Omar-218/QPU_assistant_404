// ⚠️ ملف جديد — مهمة المدير (اقتراح #10: "جدولة نشر"، 2026-08-04).
// راجع docs/scheduled-publish.md للتصميم الكامل. هذا الملف يغطي فقط الجزء
// اللي يعمل من المتصفح (جلب القائمة الحالية، بناء إدخال جديد/إلغاء إدخال) —
// **لا يطبّق أي تغيير مجدوَل فعلياً**، ذاك عمل GitHub Action منفصلة تماماً
// (.github/workflows/scheduled-publish.yml + .github/scripts/process-scheduled-publishes.mjs).

import { buildScheduledQueueUpdate } from "./githubPublisher.js";

const QUEUE_URL_PATH = "data/scheduled-publishes.json";

// يجلب قائمة الانتظار الحالية (بلا كاش — نفس نمط useEvents.js: بيانات
// تتغيّر بعد كل قرار جدولة/إلغاء، لازم تبقى طازجة دائماً بلوحة التحكم).
export async function fetchScheduledQueue() {
  try {
    const res = await fetch(`${import.meta.env.BASE_URL}${QUEUE_URL_PATH}`, { cache: "no-store" });
    if (!res.ok) return [];
    const data = await res.json();
    return Array.isArray(data?.scheduled) ? data.scheduled : [];
  } catch {
    return [];
  }
}

function generateId() {
  return `sch_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

// يبني حزمة نشر (pkg) تُضيف إدخالاً جديداً لقائمة الانتظار — commit فوري
// عادي بتوكن الأدمن الحالي (راجع buildScheduledQueueUpdate بـgithubPublisher.js
// لماذا هذا مختلف تماماً عن "تطبيق" التغيير المجدوَل نفسه).
//
// courses: اللقطة الكاملة لـ study-plan.json المطلوب كتابتها *وقت التنفيذ*
// (نفس شكل courses الذي يقبله buildStudyPlanUpdate — أي أنه يجب أن يشمل كل
// المواد، لا المتغيّرة فقط، تماماً كما لو كان نشراً فورياً عادياً).
export function buildScheduleEntry({ existingQueue, publishAt, description, courses }) {
  const entry = {
    id: generateId(),
    publishAt, // ISO string — يُقارَن بـUTC بالسكربت (راجع docs/scheduled-publish.md)
    description: description.trim(),
    courses,
    createdAt: new Date().toISOString(),
  };
  return buildScheduledQueueUpdate([...existingQueue, entry]);
}

// يبني حزمة إلغاء إدخال مجدوَل — نفس آلية الإضافة، فقط بمصفوفة مُصفّاة.
export function buildScheduleCancellation(existingQueue, entryId) {
  return buildScheduledQueueUpdate(existingQueue.filter((e) => e.id !== entryId));
}
