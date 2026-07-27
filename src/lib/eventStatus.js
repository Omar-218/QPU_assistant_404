// ⚠️ ملف مملوك لعضو 4 (منطق البيانات) — خطة الدفعة 5، القسم 1.1/§2.
// مصدر الحقيقة الوحيد لسؤال "هل الحدث نشِط الآن؟" — يُستهلَك من useEvents.js
// (هنا)، ومن Subject.jsx (عضو 2) عند فلترة الأحداث الظاهرة بصفحة المادة.
//
// مُشتقّة دائماً وقت الاستدعاء، لا تُخزَّن أبداً بأي ملف — القرار المعتمَد
// صراحة بخطة الدفعة 5 (§0): لا مهمة خادم مجدولة (الموقع بلا خادم أصلاً)،
// ولا حاجة لكتابة حالة "expired" لاحقة. أي مكان يعرض الأحداث يستدعي هذي
// الدالة وقت العرض مباشرة.

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

/** event.status === "approved" && event.date >= اليوم (مقارنة نصية ISO تكفي،
 * لا حاجة لتحويل Date كامل بما إن الصيغة دائماً YYYY-MM-DD). */
export function isEventActive(event) {
  if (!event || event.status !== "approved") return false;
  return event.date >= todayISO();
}
