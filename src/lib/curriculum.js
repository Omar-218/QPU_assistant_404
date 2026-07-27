// ⚠️ يقرأ من public/data/curriculum.json (الخطة الدراسية الكاملة لأربع سنوات،
// منقولة من المشروع الأصلي) — منفصل تماماً عن public/data/study-plan.json
// (قائمة المواد اللي لها فعلياً صفحة/محتوى، يستهلكها useStudyPlan.js).
//
// الغرض: تمكين لوحة التحكم من "ربط" مادة جديدة بعنصر موجود مسبقاً بالخطة
// الرسمية (بدل كتابة الاسم/الرمز يدوياً من الصفر في كل مرة).

let cachedFlat = null;

/**
 * يسطّح curriculum.json لقائمة مواد واحدة عبر كل السنوات/المستويات/التخصصات.
 * المواد المكرَّرة بنفس id (تظهر بأكثر من تخصص بنفس المستوى) تُدمج بعنصر واحد.
 * يرجع: [{ id, name, code, hours, year, level, semesterLabel, tracks: string[] }]
 */
export async function fetchFlatCurriculum() {
  if (cachedFlat) return cachedFlat;

  const res = await fetch(`${import.meta.env.BASE_URL}data/curriculum.json`);
  if (!res.ok) return [];
  const data = await res.json();

  const byId = new Map();

  for (const y of data?.years ?? []) {
    for (const lvl of y.levels ?? []) {
      const base = { year: y.year, level: lvl.level, semesterLabel: lvl.semesterLabel };

      if (lvl.hasSpecializations) {
        for (const [trackName, courses] of Object.entries(lvl.tracks ?? {})) {
          for (const c of courses) {
            addOrMergeCourse(byId, c, base, trackName);
          }
        }
      } else {
        for (const c of lvl.courses ?? []) {
          addOrMergeCourse(byId, c, base, null);
        }
      }
    }
  }

  // ⚠️ إصلاح: مواد "المتطلبات الاختيارية" (electiveGroups بـ curriculum.json)
  // غير مرتبطة بسنة/مستوى، فما كانت تُسطَّح هنا إطلاقاً — يعني لا تظهر أبداً
  // بمنتقي المقررات بلوحة التحكم (AdminSubjectEditor → CurriculumCoursePicker)
  // رغم وجودها فعلياً بـ curriculum.json. year/level هنا null عمداً (لا ينطبقان)،
  // وsemesterLabel = اسم المجموعة (مثلاً "متطلبات الجامعة الاختيارية").
  for (const group of data?.electiveGroups ?? []) {
    const base = { year: null, level: null, semesterLabel: group.label };
    for (const c of group.courses ?? []) {
      addOrMergeCourse(byId, c, base, null);
    }
  }

  cachedFlat = Array.from(byId.values());
  return cachedFlat;
}

function addOrMergeCourse(byId, course, base, trackName) {
  const existing = byId.get(course.id);
  if (existing) {
    if (trackName && !existing.tracks.includes(trackName)) existing.tracks.push(trackName);
    return;
  }
  byId.set(course.id, {
    id: course.id,
    name: course.name,
    code: course.code,
    hours: course.hours,
    year: base.year,
    level: base.level,
    semesterLabel: base.semesterLabel,
    tracks: trackName ? [trackName] : [],
  });
}

/** مواد الخطة اللي ما عندها صفحة/محتوى فعلي بعد (id مو موجود بـ existingIds). */
export async function fetchUnlinkedCurriculumCourses(existingIds = []) {
  const all = await fetchFlatCurriculum();
  const existing = new Set(existingIds);
  return all.filter((c) => !existing.has(c.id));
}

/** إيجاد مادة واحدة بالخطة عبر id — تُستخدم للتعبئة المسبقة من رابط مباشر. */
export async function findCurriculumCourse(id) {
  const all = await fetchFlatCurriculum();
  return all.find((c) => c.id === id) ?? null;
}
