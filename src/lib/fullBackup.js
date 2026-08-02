import { getAllVariants } from "./professorVariants.js";

// ⚠️ ملف جديد — مهمة المدير (طلب مباشر من المستخدم، 2026-08-02، اقتراح #8 من
// مراجعة خبير للوحة التحكم: "تصدير/استيراد نسخة احتياطية كاملة"). توسيع مباشر
// على مبدأ exportPackageAsZip الموجود بـ lib/githubPublisher.js (لمادة واحدة
// فقط ضمن نشر معلَّق)، لكن هنا بمعزل تام عنه: يجمع كل public/data/** الحالية
// المنشورة فعلياً (لا حزمة نشر معلَّقة) بملف ZIP واحد للتنزيل.
//
// ⚠️ نطاق متعمَّد (بالضبط كما اقترح الخبير حرفياً — "يصدّر كل data/**"):
// ملفات JSON فقط (public/data/**)، لا public/pdf/** الفعلية. تحميل عشرات/مئات
// ملفات pdf ثقيلة الحجم دفعة واحدة عبر المتصفح غير عملي هنا، وأصلاً كل ملف pdf
// له نسخة احتياطية طبيعية بتاريخ commits الريبو على GitHub نفسه (خلافاً لملفات
// data/**، اللي فقدانها بالكامل بالغلط أخطر لأنها المصدر الوحيد لبناء كل صفحة).
//
// لا يستخدم GitHub API إطلاقاً — يقرأ نفس ما يقرأه أي طالب فعلياً (نسخة "الآن"
// المنشورة)، بلا حاجة لتوكن حتى لو AdminHome.jsx نفسها محمية أصلاً بـ AdminAuthGate.

function noStoreUrl(path) {
  return `${import.meta.env.BASE_URL}${path}?_=${Date.now()}`;
}

async function fetchJsonOrNull(path) {
  try {
    const res = await fetch(noStoreUrl(path), { cache: "no-store" });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

/** يجمع كل public/data/** الحالية بكائن واحد { path: parsedJson } — بلا أي كتابة
 * على القرص، الاستدعاء (exportFullBackupZip أدناه) هو من يحوّلها لـ ZIP فعلياً. */
async function collectAllDataFiles() {
  const files = {};

  const topLevel = ["study-plan.json", "curriculum.json", "events.json", "upload-requests-log.json"];
  for (const name of topLevel) {
    const data = await fetchJsonOrNull(`data/${name}`);
    if (data) files[`public/data/${name}`] = data;
  }

  const studyPlan = files["public/data/study-plan.json"];
  const courses = studyPlan?.courses ?? [];

  for (const course of courses) {
    const subject = await fetchJsonOrNull(`data/subjects/${course.id}/subject.json`);
    if (!subject) continue;
    files[`public/data/subjects/${course.id}/subject.json`] = subject;

    const variants = getAllVariants(subject);
    const lecturesFiles =
      variants.length > 0
        ? [...new Set(variants.map((v) => v.lecturesFile || "lectures.json"))]
        : ["lectures.json"];

    for (const lecturesFile of lecturesFiles) {
      const lectures = await fetchJsonOrNull(`data/subjects/${course.id}/${lecturesFile}`);
      if (lectures) {
        files[`public/data/subjects/${course.id}/${lecturesFile}`] = lectures;
      }
    }
  }

  return files;
}

/** ينفّذ الجمع أعلاه ثم يبني ويُنزِّل ZIP واحد — onProgress?(doneCount, totalUnknown)
 * اختياري: نعرف العدد الكلي فقط بعد جلب study-plan.json (المواد غير معروفة قبلها)،
 * فالاستدعاء الأول لـ onProgress يكون بـ total=null دائماً (لا شريط تقدّم دقيق قبلها). */
export async function exportFullBackupZip(onProgress) {
  onProgress?.(0, null);
  const files = await collectAllDataFiles();
  onProgress?.(Object.keys(files).length, Object.keys(files).length);

  const { default: JSZip } = await import("jszip");
  const zip = new JSZip();
  for (const [path, data] of Object.entries(files)) {
    zip.file(path, JSON.stringify(data, null, 2));
  }
  // نفس طبقة الحماية المطبَّقة بـ exportPackageAsZip (githubPublisher.js) —
  // platform: "UNIX" يفرض ترميز UTF-8 القياسي بحقول ZIP metadata، مهم هنا
  // تحديداً لأن أسماء ملفات lectures-{اسم-عربي}.json موجودة فعلاً بالمشروع.
  const blob = await zip.generateAsync({ type: "blob", platform: "UNIX" });

  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `assistant404-data-backup-${new Date().toISOString().slice(0, 10)}.zip`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);

  return { fileCount: Object.keys(files).length, blob };
}
