// ⚠️ ملف عام "جاهز" محايد (بنفس مكانة sectionLabels.js/eventStatus.js) — لا
// يخص عضواً واحداً حصرياً، مشترك بين SubjectForm.jsx (عضو 3، الإدخال) و
// Subject.jsx (عضو 2، العرض)، ويُستخدم أيضاً كمرجع توثيقي بـ githubPublisher.js
// (عضو 5) لشكل subject.json.scheduleDays. أُنشئ بميزة "تحكم الآدمن بأوقات
// المحاضرات" (طلب إدارة مباشر): كانت المواعيد نصاً حراً واحداً فقط لكل من
// نظري/عملي (لا تعدد، لا تعديل إلا بالكود مباشرة) — صارت الآن مصفوفة مواعيد
// هيكلية لكل نوع، تدعم أكثر من موعد بالأسبوع.

// ترتيب أيام الأسبوع الدراسي المعتاد (الأحد أول يوم دراسي بالأردن).
export const WEEK_DAYS = ["الأحد", "الاثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة", "السبت"];

/** موعد فارغ جديد لإضافته بنموذج التحرير. */
export function emptyScheduleEntry() {
  return { day: WEEK_DAYS[0], start: "", end: "", location: "" };
}

/** يحاول تفكيك الصيغة النصية القديمة الشائعة بالمشروع:
 * "<يوم> <بداية> - <نهاية> (<مكان>)" — مثال: "الأحد 08:30 - 11:55 (مخبر دارات)".
 * يرجع كائن موعد هيكلي عند النجاح، أو null لو النص لا يطابق النمط المتوقَّع
 * (عندها يُعامَل كموعد واحد بحقل location فقط، بلا فقدان أي معلومة — راجع
 * normalizeScheduleList أدناه). لا يُستخدَم إطلاقاً لأي غرض غير تهيئة نموذج
 * التحرير بقيمة مبدئية معقولة بدل إجبار الآدمن على إعادة الكتابة كاملة. */
export function parseLegacyScheduleString(text) {
  const raw = String(text || "").trim();
  if (!raw) return null;
  const match = raw.match(
    /^(\S+)\s+(\d{1,2}:\d{2})\s*-\s*(\d{1,2}:\d{2})\s*(?:\((.+)\))?$/
  );
  if (!match) return null;
  const [, day, start, end, location] = match;
  return {
    day: WEEK_DAYS.includes(day) ? day : day,
    start,
    end,
    location: location ? location.trim() : "",
  };
}

/** يطبّع أي قيمة scheduleDays.theory/lab (نص قديم حر، مصفوفة هيكلية، أو
 * غياب تام) إلى مصفوفة مواعيد دائماً — يُستخدَم بكل من نموذج التحرير (لتهيئة
 * الحالة الأولية) وصفحة العرض (لتوحيد مسار الرسم بصرف النظر عن شكل البيانات
 * المخزَّنة فعلياً). لا يفقد أي بيانات: نص لا يطابق النمط القديم المتوقَّع
 * يتحوّل لموعد واحد بحقل location = النص كاملاً بدل تجاهله. */
export function normalizeScheduleList(value) {
  if (Array.isArray(value)) {
    return value.map((entry) => ({
      day: entry?.day || "",
      start: entry?.start || "",
      end: entry?.end || "",
      location: entry?.location || "",
    }));
  }
  if (typeof value === "string" && value.trim()) {
    const parsed = parseLegacyScheduleString(value);
    return [parsed || { day: "", start: "", end: "", location: value.trim() }];
  }
  return [];
}

/** يبني نصاً واحداً قابلاً للعرض من موعد هيكلي واحد — نفس صيغة العرض القديمة
 * بالضبط ("الأحد 08:30 - 11:55 (مخبر دارات)") حتى لا يتغيّر شكل الصفحة
 * للمستخدم، فقط صار كل موعد سطراً مستقلاً بدل جملة واحدة تجمع الكل. */
export function formatScheduleEntry(entry) {
  if (!entry) return "";
  const parts = [];
  if (entry.day) parts.push(entry.day);
  if (entry.start && entry.end) parts.push(`${entry.start} - ${entry.end}`);
  else if (entry.start) parts.push(entry.start);
  let line = parts.join(" ");
  if (entry.location) line = line ? `${line} (${entry.location})` : entry.location;
  return line;
}
