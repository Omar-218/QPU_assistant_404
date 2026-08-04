// ⚠️ ملف جديد — مهمة المدير (اقتراح #10: "جدولة نشر"، 2026-08-04).
// راجع docs/scheduled-publish.md للتصميم الكامل. يُشغَّل حصراً من
// .github/workflows/scheduled-publish.yml (Node عادي، بلا أي اعتمادية npm
// إضافية عمداً — سكربت بسيط جداً، إضافة اعتمادية له غير مبرَّرة).
//
// المسؤولية الوحيدة: يقرأ public/data/scheduled-publishes.json، يطبّق أي
// إدخال حان موعده على public/data/study-plan.json، ويزيله من قائمة الانتظار.
// **لا يعمل أي commit/push بنفسه** — الـ workflow نفسه يتولى ذلك بعد تشغيل
// هذا السكربت (git add/commit/push بخطوات منفصلة)، فيكفي هذا السكربت يكتب
// الملفين على القرص فقط ثم يخرج بصمت.

import { readFileSync, writeFileSync, existsSync } from "node:fs";

const QUEUE_PATH = "public/data/scheduled-publishes.json";
const STUDY_PLAN_PATH = "public/data/study-plan.json";

function readJson(path, fallback) {
  if (!existsSync(path)) return fallback;
  try {
    return JSON.parse(readFileSync(path, "utf8"));
  } catch (err) {
    console.error(`تعذّر قراءة ${path} كـJSON صالح: ${err.message}`);
    return fallback;
  }
}

function main() {
  const queueData = readJson(QUEUE_PATH, { scheduled: [] });
  const scheduled = Array.isArray(queueData.scheduled) ? queueData.scheduled : [];

  if (scheduled.length === 0) {
    console.log("لا توجد عناصر بقائمة انتظار النشر المجدوَل — لا شيء لعمله.");
    return;
  }

  const now = Date.now();
  const due = scheduled.filter((e) => {
    const t = Date.parse(e.publishAt);
    return !Number.isNaN(t) && t <= now;
  });
  const remaining = scheduled.filter((e) => !due.includes(e));

  if (due.length === 0) {
    console.log(`لا يوجد عنصر حان موعده بعد (${scheduled.length} عنصر بانتظار مواعيدها).`);
    return;
  }

  // ⚠️ لو أكثر من عنصر حان موعده بنفس هذي الدورة (مثلاً الأدمن جدول أكثر من
  // تغيير قريبين من بعض، أو تأخّرت الدورة السابقة): نطبّقهم بترتيب الموعد
  // (الأقدم أولاً)، كل واحد يُطبَّق فوق نتيجة سابقه مباشرة — "آخر واحد
  // يفوز" لو تعارضا على نفس المادة (نفس منطق "آخر تعديل يفوز" المعتمَد
  // بباقي أنحاء هذا المشروع، لا شيء جديد هنا).
  due.sort((a, b) => Date.parse(a.publishAt) - Date.parse(b.publishAt));

  let latestCourses = null;
  for (const entry of due) {
    if (Array.isArray(entry.courses)) {
      latestCourses = entry.courses;
      console.log(`✅ طُبِّق العنصر المجدوَل: "${entry.description || entry.id}" (موعده: ${entry.publishAt})`);
    } else {
      console.warn(`⚠️ العنصر ${entry.id} بلا حقل courses صالح — تجاهلته بلا تطبيق.`);
    }
  }

  if (latestCourses) {
    writeFileSync(STUDY_PLAN_PATH, JSON.stringify({ courses: latestCourses }, null, 2) + "\n", "utf8");
  }

  writeFileSync(QUEUE_PATH, JSON.stringify({ scheduled: remaining }, null, 2) + "\n", "utf8");
  console.log(`تم تطبيق ${due.length} عنصر، وتبقّى ${remaining.length} عنصر بالقائمة.`);
}

main();
