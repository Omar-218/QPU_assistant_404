import React, { useState } from "react";
import { getAllVariants } from "../../lib/professorVariants.js";
import { SECTION_LABELS } from "../../lib/sectionLabels.js";

// ⚠️ ملف جديد — مهمة المدير (طلب مباشر من المستخدم، 2026-08-02، اقتراح #7 من
// مراجعة خبير للوحة التحكم: "فاحص روابط مكسورة"). صفحة `/admin/link-checker`.
//
// الفكرة: يفحص كل مادة → كل ملف محاضرات لديها (كل professorVariants، لا الدكتور
// النشِط فقط — فحص شامل حقيقي) → كل عنصر pdf/image بداخله → طلب HEAD صريح
// لرابط الملف الفعلي المنشور (public/pdf/{slug}/{file}، نفس نمط بناء الرابط
// المستخدَم بالضبط بـ Subject.jsx/fileSrc). أي رد غير 200 (غالباً 404) = رابط
// مكسور، يظهر بقائمة واحدة مجمَّعة حسب المادة.
//
// ⚠️ بلا GitHub API إطلاقاً هنا (خلافاً لـ AdminRequestsQueue.jsx) — الفحص عبر
// الموقع المنشور نفسه فقط (نفس ما يراه الطالب فعلياً)، فلا حاجة لتوكن حتى لو
// AdminAuthGate يحمي الصفحة أصلاً بحكم كونها ضمن /admin/*.
//
// دفعات (batching) من 8 طلبات متزامنة بدل Promise.all لكل الملفات دفعة واحدة —
// تفادياً لضغط مئات الطلبات على GitHub Pages/CDN بنفس اللحظة لمشروع فيه عشرات
// المواد وربما مئات الملفات.

function noStoreUrl(path) {
  return `${import.meta.env.BASE_URL}${path}?_=${Date.now()}`;
}

function pdfUrl(subjectId, filename) {
  // نفس دالة fileSrc بـ Subject.jsx بالضبط — لا إعادة اختراع لمنطق بناء الرابط.
  return `${import.meta.env.BASE_URL}pdf/${subjectId}/${filename}`;
}

async function fetchJson(path) {
  try {
    const res = await fetch(noStoreUrl(path), { cache: "no-store" });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

async function fileExists(url) {
  try {
    const res = await fetch(url, { method: "HEAD", cache: "no-store" });
    return res.ok;
  } catch {
    // فشل شبكة أثناء الفحص نفسه (لا أثناء نشر الطالب) — نعامله كـ"غير مؤكَّد"
    // لا "مكسور جزماً"، لتفادي نتائج كاذبة لو انقطع نت الأدمن لحظياً أثناء الفحص.
    return "unknown";
  }
}

const BATCH_SIZE = 8;

export default function AdminLinkChecker() {
  const [status, setStatus] = useState("idle"); // idle | running | done | error
  const [progress, setProgress] = useState({ done: 0, total: 0 });
  const [broken, setBroken] = useState([]);
  const [unknown, setUnknown] = useState([]);
  const [scannedFilesCount, setScannedFilesCount] = useState(0);
  const [error, setError] = useState(null);

  async function runCheck() {
    setStatus("running");
    setError(null);
    setBroken([]);
    setUnknown([]);
    setProgress({ done: 0, total: 0 });

    try {
      const studyPlan = await fetchJson("data/study-plan.json");
      const courses = studyPlan?.courses ?? [];

      // مرحلة 1: اجمع كل عناصر pdf/image من كل المواد وكل ملفات محاضراتها أولاً
      // (بلا فحص شبكة بعد) — حتى نعرف العدد الكلي مقدَّماً لشريط التقدّم.
      const tasks = [];
      for (const course of courses) {
        const subject = await fetchJson(`data/subjects/${course.id}/subject.json`);
        if (!subject) continue;
        const variants = getAllVariants(subject);
        const lecturesFiles =
          variants.length > 0
            ? [...new Set(variants.map((v) => v.lecturesFile || "lectures.json"))]
            : ["lectures.json"];

        for (const lecturesFile of lecturesFiles) {
          const lectures = await fetchJson(`data/subjects/${course.id}/${lecturesFile}`);
          if (!lectures) continue;
          for (const section of lectures.sections ?? []) {
            for (const item of section.items ?? []) {
              if (!item.file) continue; // link/note لا ملف فعلي لها
              tasks.push({
                subjectId: course.id,
                subjectName: subject.name || course.name,
                sectionKey: section.section,
                title: item.title,
                file: item.file,
                url: pdfUrl(course.id, item.file),
              });
            }
          }
        }
      }

      setScannedFilesCount(tasks.length);
      setProgress({ done: 0, total: tasks.length });

      const brokenResults = [];
      const unknownResults = [];
      for (let i = 0; i < tasks.length; i += BATCH_SIZE) {
        const batch = tasks.slice(i, i + BATCH_SIZE);
        const outcomes = await Promise.all(
          batch.map(async (t) => ({ ...t, exists: await fileExists(t.url) }))
        );
        for (const o of outcomes) {
          if (o.exists === false) brokenResults.push(o);
          else if (o.exists === "unknown") unknownResults.push(o);
        }
        setProgress({ done: Math.min(i + BATCH_SIZE, tasks.length), total: tasks.length });
      }

      setBroken(brokenResults);
      setUnknown(unknownResults);
      setStatus("done");
    } catch (err) {
      setError(err.message || "تعذّر إتمام الفحص");
      setStatus("error");
    }
  }

  const groupedBroken = broken.reduce((acc, item) => {
    (acc[item.subjectId] ??= { subjectName: item.subjectName, items: [] }).items.push(item);
    return acc;
  }, {});

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-xl font-bold text-text-h">فاحص الروابط المكسورة</h1>
        <button
          type="button"
          onClick={runCheck}
          disabled={status === "running"}
          className="rounded-md bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-accent-hover disabled:opacity-50"
        >
          {status === "running" ? "...جارِ الفحص" : "🔍 ابدأ الفحص"}
        </button>
      </div>

      <p className="text-xs text-text-muted">
        يفحص كل ملفات pdf/image بكل المواد (كل الدكاترة، لا الدكتور النشِط فقط) — يتأكَّد أن كل ملف
        مذكور بـ lectures.json موجود فعلاً بالموقع المنشور حالياً. لا يعدّل أي شيء، فحص فقط.
      </p>

      {status === "running" && (
        <div className="flex flex-col gap-1.5 rounded-lg border border-border bg-bg-subtle p-4">
          <div className="h-2 w-full overflow-hidden rounded-full bg-bg-elevated">
            <div
              className="h-full rounded-full bg-accent transition-all"
              style={{
                width: progress.total ? `${Math.round((progress.done / progress.total) * 100)}%` : "5%",
              }}
            />
          </div>
          <p className="text-xs text-text-muted">
            {progress.done} / {progress.total} ملف
          </p>
        </div>
      )}

      {status === "error" && (
        <p className="text-sm text-danger-text">{error}</p>
      )}

      {status === "done" && (
        <div className="flex flex-col gap-3">
          <p className="text-sm text-text-muted">
            فُحِص {scannedFilesCount} ملف بكل المواد.{" "}
            {broken.length === 0
              ? "✅ لا روابط مكسورة."
              : `🔴 ${broken.length} رابط مكسور بـ ${Object.keys(groupedBroken).length} مادة.`}
            {unknown.length > 0 && ` ⚠️ ${unknown.length} ملف تعذّر التأكّد منه (تحقّق من اتصالك وأعد الفحص).`}
          </p>

          {Object.entries(groupedBroken).map(([subjectId, group]) => (
            <div key={subjectId} className="rounded-lg border border-danger-border bg-danger-bg p-4">
              <p className="mb-2 font-medium text-danger-text">
                {group.subjectName} <span className="text-xs">({subjectId})</span>
              </p>
              <ul className="flex flex-col gap-1 text-xs text-danger-text">
                {group.items.map((it) => (
                  <li key={`${it.sectionKey}::${it.file}`}>
                    {SECTION_LABELS[it.sectionKey] || it.sectionKey} — {it.title} —{" "}
                    <code className="break-all">{it.file}</code>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
