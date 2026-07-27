import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { isVisible } from "../lib/hiddenFilter.js";

// ⚠️ ملف مملوك لعضو 2 — صفحة الخطة الدراسية.
//
// ⚠️ تحديث إداري (تنفيذ مباشر بطلب صريح من المدير الحقيقي للمشروع، منفَّذ
// خارج دورة تسليم الفريق المعتادة — يُوثَّق هنا كاستثناء بدل ما يمر بصمت):
// استُبدلت القائمة المسطّحة السابقة (اللي كانت تعتمد على useStudyPlan العام
// نفسه المستخدم بالمفضلة/آخر الزيارات) بعرض الخطة الدراسية **الحقيقية**
// الكاملة لأربع سنوات (منقولة من مشروع value0xx-collab/assistant404 الأصلي)، بنفس أسلوب
// العرض هناك (أكورديون سنة ← مستوى ← [تبويب تخصص] ← جدول مواد)، مع تكييفه
// لتوكنز الثيم الحالية بدل الألوان الثابتة، ومسار fetch آمن مع base path،
// وفلترة hidden على مستوى المادة (نفس عقد isVisible المعتمد بالمشروع).
//
// مصدر البيانات مختلف عمداً عن useStudyPlan(): هذا الملف (curriculum.json)
// ببنية متداخلة (سنوات ← مستويات ← مواد/تخصصات) خاصة بعرض الخطة فقط، بينما
// study-plan.json يبقى كما هو (قائمة مسطّحة) لأنه مستخدم فعلياً من عضو 4
// (useStudyPlan) وعضو 2 (SubjectList/المفضلة/آخر الزيارات) — لا يجوز دمجهما
// بدون تنسيق مع عضو 4 لاحقاً.
//
// ⚠️ إضافة (بطلب مباشر من المدير): بعض متطلبات الخطة (مثل "متطلبات الجامعة
// الاختيارية") غير مرتبطة بسنة/مستوى محدد — الطالب يختار منها بحرية ضمن حدّ
// ساعات معتمدة معيّن. هذي تُخزَّن بمفتاح جديد top-level بـ curriculum.json:
// `electiveGroups: [{ id, label, creditHours, courses: [...] }]`، وتُعرض هنا
// بقسم منفصل تماماً عن أكورديون السنوات (لا تُدمج داخل أي سنة/مستوى).

function CoursesTable({ courses }) {
  const visible = courses.filter(isVisible);
  if (visible.length === 0) {
    return <p className="p-3 text-sm text-text-muted">لا توجد مواد ظاهرة بهذا القسم</p>;
  }
  return (
    <table className="mt-2 w-full border-collapse overflow-hidden rounded-md border border-border text-sm">
      <thead>
        <tr className="bg-bg-elevated">
          <th className="border border-border p-2 text-right">اسم المقرر</th>
          <th className="border border-border p-2 text-right">رمز المقرر</th>
          <th className="border border-border p-2 text-right">الساعات</th>
        </tr>
      </thead>
      <tbody>
        {visible.map((course) => (
          <tr key={course.id}>
            <td className="border border-border p-2">
              <Link to={`/subject/${course.id}`} className="text-accent hover:text-accent-hover">
                {course.name}
              </Link>
            </td>
            <td className="border border-border p-2 text-text-muted">{course.code || "-"}</td>
            <td className="border border-border p-2 text-text-muted">{course.hours}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function LevelBlock({ lvl }) {
  const [open, setOpen] = useState(false);
  const [activeTrack, setActiveTrack] = useState(
    lvl.hasSpecializations ? Object.keys(lvl.tracks)[0] : null
  );

  return (
    <div className="mb-2 overflow-hidden rounded-md border border-border">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex w-full items-center justify-between bg-bg-subtle px-3 py-2 text-sm text-text hover:bg-bg-elevated"
      >
        <span>{lvl.semesterLabel} — {lvl.totalHours} ساعة</span>
        <span className="text-text-muted">{open ? "▲" : "▼"}</span>
      </button>

      {open && (
        <div className="p-3">
          {lvl.hasSpecializations ? (
            <>
              <div className="mb-3 flex flex-wrap gap-2">
                {Object.keys(lvl.tracks).map((trackName) => (
                  <button
                    key={trackName}
                    type="button"
                    onClick={() => setActiveTrack(trackName)}
                    className={`rounded-md border border-border px-3 py-1.5 text-xs ${
                      activeTrack === trackName
                        ? "bg-accent text-white"
                        : "bg-bg text-text hover:bg-bg-elevated"
                    }`}
                  >
                    {trackName}
                  </button>
                ))}
              </div>
              <CoursesTable courses={lvl.tracks[activeTrack]} />
            </>
          ) : (
            <CoursesTable courses={lvl.courses} />
          )}
        </div>
      )}
    </div>
  );
}

function ElectiveGroupBlock({ group }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="mb-3 overflow-hidden rounded-lg border border-border">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex w-full items-center justify-between bg-bg-elevated px-4 py-3 text-sm font-bold text-text-h hover:bg-bg-subtle"
      >
        <span>
          {group.label}
          {group.creditHours ? ` — ${group.creditHours} ساعات معتمدة` : ""}
        </span>
        <span className="text-text-muted">{open ? "▲" : "▼"}</span>
      </button>

      {open && (
        <div className="p-2">
          <CoursesTable courses={group.courses} />
        </div>
      )}
    </div>
  );
}

export default function StudyPlan() {
  const [plan, setPlan] = useState(null);
  const [openYear, setOpenYear] = useState(null);

  useEffect(() => {
    let cancelled = false;
    fetch(`${import.meta.env.BASE_URL}data/curriculum.json`)
      .then((res) => res.json())
      .then((data) => {
        if (!cancelled) setPlan(data);
      })
      .catch(() => {
        if (!cancelled) setPlan({ years: [] });
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (!plan) return <div className="text-text-muted">...جارِ التحميل</div>;

  return (
    <div>
      <h1 className="mb-4 text-xl font-bold text-text-h">📋 الخطة الدراسية</h1>

      {plan.years.length === 0 ? (
        <p className="text-text-muted">تعذّر تحميل الخطة الدراسية</p>
      ) : (
        plan.years.map((y) => (
          <div key={y.year} className="mb-3 overflow-hidden rounded-lg border border-border">
            <button
              type="button"
              onClick={() => setOpenYear(openYear === y.year ? null : y.year)}
              className="flex w-full items-center justify-between bg-bg-elevated px-4 py-3 text-sm font-bold text-text-h hover:bg-bg-subtle"
            >
              <span>السنة {y.year}</span>
              <span className="text-text-muted">{openYear === y.year ? "▲" : "▼"}</span>
            </button>

            {openYear === y.year && (
              <div className="p-2">
                {y.levels.map((lvl) => (
                  <LevelBlock key={lvl.level} lvl={lvl} />
                ))}
              </div>
            )}
          </div>
        ))
      )}

      {Array.isArray(plan.electiveGroups) && plan.electiveGroups.length > 0 && (
        <div className="mt-6">
          <h2 className="mb-3 text-lg font-bold text-text-h">🗂️ المواد الاختيارية</h2>
          {plan.electiveGroups.map((group) => (
            <ElectiveGroupBlock key={group.id} group={group} />
          ))}
        </div>
      )}
    </div>
  );
}