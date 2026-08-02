import React, { useEffect, useMemo, useRef, useState } from "react";
import { suggestSlug, suggestProfessorId, isValidSlug } from "../../lib/idSlug.js";
import { SECTION_LABELS } from "../../lib/sectionLabels.js";
import {
  WEEK_DAYS,
  emptyScheduleEntry,
  normalizeScheduleList,
} from "../../lib/scheduleDays.js";
import { buildSubjectPackage } from "../../lib/githubPublisher.js";
import SectionsManager from "./SectionsManager.jsx";
import FileUploaderWidget from "./FileUploaderWidget.jsx";
import PublishPanel from "./PublishPanel.jsx";
import { useUnsavedChangesWarning } from "../../hooks/useUnsavedChangesWarning.js";

// ⚠️ ملف مملوك لعضو 3 — نموذج إضافة/تعديل مادة كامل.
//
// عقد التكامل الفعلي (موثّق أعلى lib/githubPublisher.js وبـ docs/data-schema.md §4،
// عضو 5/6): buildSubjectPackage({ subjectMeta, items }) → pkg، ثم <PublishPanel pkg={pkg} />
// كما هو، بدون أي معرفة بتفاصيل GitHub API. النقطة المهمة: نشرة واحدة (submit واحد)
// تخص دكتوراً واحداً كحد أقصى (professorId واحد) — إن كانت المادة متعددة الدكاترة،
// يختار المدير هنا "أي دكتور" يعدّل/يضيف له بهذه النشرة تحديداً.
//
// كل عنصر بمصفوفة items: { type, title, section, hidden, file? | url? | content? }
// — type: "pdf" | "image" | "link" | "note". file لـ pdf/image، url لـ link (يجب أن
// يبدأ http:// أو https://)، content لـ note (نص خام فقط، بلا Markdown/HTML).

const SECTION_KEYS = Object.keys(SECTION_LABELS);
const NEW_PROFESSOR_VALUE = "__new__";

function fileKey(f) {
  return `${f.name}-${f.size}`;
}

function slugifyTitle(name) {
  return name.replace(/\.(pdf|png|jpe?g|webp)$/i, "");
}

function fileType(f) {
  return f.type && f.type.startsWith("image/") ? "image" : "pdf";
}

function makeId() {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function isValidUrl(u) {
  return /^https?:\/\//i.test((u || "").trim());
}

/**
 * Props:
 *  - initialSubject?: subject.json كما هو (القسم 4.3، يشمل الآن description؟ الاختياري) — غيابه يعني "مادة جديدة"
 *  - initialLecturesByVariant?: { [professorId|"_default"]: { sections: [...] } }
 *      بيانات lectures.json/lectures-{prof}.json الحالية، بلا فلترة hidden (لوحة تحكم).
 *  - existingIds?: string[] — لتفادي تكرار الـ id عند مادة جديدة
 *  - prefill?: { id, name, code } | null — تعبئة مبدئية من CurriculumCoursePicker
 *      (مادة جديدة مرتبطة بعنصر من الخطة الدراسية الرسمية). لا تأثير لها عند التعديل.
 */
export default function SubjectForm({
  initialSubject = null,
  initialLecturesByVariant = {},
  existingIds = [],
  existingStudyPlan = null,
  prefill = null,
}) {
  const isEditing = Boolean(initialSubject?.id);
  const existingVariants = initialSubject?.professorVariants ?? [];

  const [name, setName] = useState(initialSubject?.name ?? prefill?.name ?? "");
  const [code, setCode] = useState(initialSubject?.code ?? prefill?.code ?? "");
  const [hidden, setHidden] = useState(initialSubject?.hidden ?? false);
  // ⚠️ جديد: نبذة/رسالة عن المادة تُعرَض أعلى صفحة المادة للطالب — نص خام
  // فقط (بلا Markdown/HTML)، بمعزل تام عن أي منطق آخر (نفس نمط سطري
  // theoryProfessorLabel/labProfessorLabel أدناه).
  const [description, setDescription] = useState(initialSubject?.description ?? "");
  // ⚠️ جديد (ميزة تحكم الآدمن بأوقات المحاضرات): مصفوفتا مواعيد مستقلتان
  // لكل من نظري/عملي — تدعم أكثر من موعد بالأسبوع لنفس النوع. normalizeScheduleList
  // تتكفّل بتحويل الشكل النصي القديم (لو موجود بمادة لم تُعدَّل بعد) لصف
  // مبدئي بدل نموذج فارغ يجبر إعادة الكتابة كاملة.
  const [theorySchedule, setTheorySchedule] = useState(() =>
    normalizeScheduleList(initialSubject?.scheduleDays?.theory)
  );
  const [labSchedule, setLabSchedule] = useState(() =>
    normalizeScheduleList(initialSubject?.scheduleDays?.lab)
  );
  const [slug, setSlug] = useState(initialSubject?.id ?? prefill?.id ?? "");
  // slug من الخطة (prefill.id) مؤكَّد وصحيح أصلاً (نفس id بالخطة الرسمية)، فلا داعي
  // لإعادة اقتراحه تلقائياً من الاسم كما لو كُتب يدوياً.
  const [slugTouched, setSlugTouched] = useState(isEditing || Boolean(prefill));

  const [multiProfessor, setMultiProfessor] = useState(existingVariants.length > 0);

  // اختيار الدكتور المستهدف بهذه النشرة: id لدكتور موجود، أو NEW_PROFESSOR_VALUE
  const [professorChoice, setProfessorChoice] = useState(
    () => existingVariants.find((v) => v.active)?.professorId ?? existingVariants[0]?.professorId ?? NEW_PROFESSOR_VALUE
  );
  const [newProfessorId, setNewProfessorId] = useState("");
  // نفس نمط slugTouched: لو الآدمن عدّل professorId يدوياً، نتوقف عن استبداله
  // تلقائياً عند كتابة اسم دكتور جديد (خطة إصلاح ASCII §4.7 المحدَّثة، §4.1).
  const [newProfessorIdTouched, setNewProfessorIdTouched] = useState(false);
  const [newProfessorName, setNewProfessorName] = useState("");
  const existingProfessorIds = useMemo(
    () => existingVariants.map((v) => v.professorId),
    [existingVariants]
  );

  function handleNewProfessorNameChange(value) {
    setNewProfessorName(value);
    if (!newProfessorIdTouched) {
      setNewProfessorId(suggestProfessorId(value, existingProfessorIds));
    }
  }

  function handleNewProfessorIdChange(value) {
    setNewProfessorId(value);
    setNewProfessorIdTouched(true);
  }
  const [setActive, setSetActive] = useState(
    () => existingVariants.find((v) => v.professorId === professorChoice)?.active ?? true
  );

  // تسمية "نظري/عملي" وصفية فقط — مستقلة تماماً عن professorVariants (راجع
  // توثيق العقد بـ githubPublisher.js). لا تتحكم بأي محتوى أو ملف، فقط تُعرَض
  // أعلى صفحة المادة للطالب.
  const [theoryProfessorLabel, setTheoryProfessorLabel] = useState(
    () => initialSubject?.sectionProfessors?.theory ?? ""
  );
  const [labProfessorLabel, setLabProfessorLabel] = useState(
    () => initialSubject?.sectionProfessors?.lab ?? ""
  );

  // ⚠️ جديد: دوال مساعدة عامة لإدارة صفوف المواعيد (نظري/عملي) — نفس
  // المنطق بالضبط لكلا النوعين، فرق واحد فقط: أي setState تُستدعى.
  function updateScheduleRow(setList, index, patch) {
    setList((prev) => prev.map((row, i) => (i === index ? { ...row, ...patch } : row)));
  }
  function addScheduleRow(setList) {
    setList((prev) => [...prev, emptyScheduleEntry()]);
  }
  function removeScheduleRow(setList, index) {
    setList((prev) => prev.filter((_, i) => i !== index));
  }
  // صف غير مكتمل (يوم/بداية/نهاية ناقصة أثناء التعبئة) يُستبعد بصمت من
  // النشرة النهائية بدل رفض الحفظ كاملاً — نفس التسامح المعتمَد بحقول أخرى
  // اختيارية بهذا النموذج (location اختياري تماماً).
  function isCompleteScheduleRow(row) {
    return Boolean(row.day && row.start && row.end);
  }

  const isNewProfessor = multiProfessor && professorChoice === NEW_PROFESSOR_VALUE;
  const effectiveProfessorId = isNewProfessor ? newProfessorId.trim() : professorChoice;
  const selectedExistingVariant = existingVariants.find((v) => v.professorId === professorChoice);
  const [professorNameOverride, setProfessorNameOverride] = useState(
    () => selectedExistingVariant?.professorName ?? ""
  );

  function selectProfessor(id) {
    setProfessorChoice(id);
    const v = existingVariants.find((x) => x.professorId === id);
    setProfessorNameOverride(v?.professorName ?? "");
    setSetActive(v?.active ?? existingVariants.length === 0);
    setNewProfessorId("");
    setNewProfessorName("");
    setNewProfessorIdTouched(false);
  }

  // مفتاح بيانات المحاضرات الحالية المعروضة/القابلة للتعديل بـ SectionsManager
  const lecturesKey = multiProfessor
    ? isNewProfessor
      ? null // دكتور جديد: لا محاضرات سابقة
      : professorChoice
    : "_default";

  const [sections, setSections] = useState(
    () => initialLecturesByVariant[lecturesKey ?? "_default"]?.sections ?? []
  );

  function switchLecturesContext(nextKey) {
    setSections(initialLecturesByVariant[nextKey ?? "_default"]?.sections ?? []);
  }

  const [rawFiles, setRawFiles] = useState([]);
  const [fileMeta, setFileMeta] = useState({}); // key(fileKey) -> { title, section, hidden }
  // عناصر link/note — بدون ملف، تُكتب مباشرة بعنصر lectures.json عبر عضو 5.
  const [extraItems, setExtraItems] = useState([]); // [{ id, type, title, section, hidden, url, content }]
  // يتغيّر بعد كل نشر ناجح لإجبار FileUploaderWidget على إعادة التركيب (remount)
  // فيصفر قائمته الداخلية — يمنع نشر نفس الملفات مرة ثانية بالغلط.
  const [uploaderResetKey, setUploaderResetKey] = useState(0);

  function handlePublishSuccess() {
    setRawFiles([]);
    setFileMeta({});
    setExtraItems([]);
    setUploaderResetKey((k) => k + 1);
    // ⚠️ جديد (2026-08-02، اقتراح #6): نشر ناجح = "أُنقِذ العمل" فعلياً —
    // نصفّر بصمة "الأصل" على الحالة الحالية فوراً حتى لا يبقى تحذير مغادرة
    // الصفحة معلَّقاً على تغييرات نُشرت بالفعل.
    initialSnapshotRef.current = watchedSnapshot;
    setDirty(false);
  }

  // ⚠️ جديد (2026-08-02، طلب مباشر من المستخدم — اقتراح #6 من مراجعة الخبير):
  // تحذير عند مغادرة الصفحة بتعديلات غير منشورة. النموذج هنا مجزَّأ لعشرات
  // متغيّرات useState منفصلة (بلا كائن حالة موحَّد)، فبدل تعديل كل معالِج
  // onChange على حدة، نلتقط "بصمة" (snapshot) نصية لكل الحقول المحتوى الفعلي
  // (لا الحقول المساعدة كـ slugTouched/uploaderResetKey) ونقارنها بالبصمة
  // الأصلية عبر useEffect واحد فقط. rawFiles.length لا محتواه (File objects
  // غير قابلة للتسلسل JSON بأمان) — كافٍ لاكتشاف "اختار ملفات جديدة".
  const watchedSnapshot = JSON.stringify({
    name,
    code,
    hidden,
    description,
    theorySchedule,
    labSchedule,
    slug,
    sections,
    extraItems,
    fileMeta,
    rawFilesCount: rawFiles.length,
  });
  const initialSnapshotRef = useRef(watchedSnapshot);
  const [dirty, setDirty] = useState(false);
  useEffect(() => {
    if (watchedSnapshot !== initialSnapshotRef.current) setDirty(true);
  }, [watchedSnapshot]);
  useUnsavedChangesWarning(dirty);

  function handleFilesSelected(files) {
    setRawFiles(files);
    setFileMeta((prev) => {
      const next = {};
      for (const f of files) {
        const k = fileKey(f);
        next[k] = prev[k] ?? { title: slugifyTitle(f.name), section: "theory", hidden: false };
      }
      return next;
    });
  }

  function updateFileMeta(key, patch) {
    setFileMeta((prev) => ({ ...prev, [key]: { ...prev[key], ...patch } }));
  }

  function addExtraItem(type) {
    setExtraItems((prev) => [
      ...prev,
      { id: makeId(), type, title: "", section: "theory", hidden: false, url: "", content: "" },
    ]);
  }

  function updateExtraItem(id, patch) {
    setExtraItems((prev) => prev.map((it) => (it.id === id ? { ...it, ...patch } : it)));
  }

  function removeExtraItem(id) {
    setExtraItems((prev) => prev.filter((it) => it.id !== id));
  }

  const otherIds = useMemo(
    () => existingIds.filter((id) => id !== initialSubject?.id),
    [existingIds, initialSubject]
  );

  function handleNameChange(value) {
    setName(value);
    if (!slugTouched) setSlug(suggestSlug(value));
  }

  function handleSlugChange(value) {
    setSlug(value);
    setSlugTouched(true);
  }

  const slugValid = slug.length > 0 && isValidSlug(slug, otherIds);
  // دكتور موجود مسبقاً: معرّفه صالح أصلاً بحكم وجوده (لا حاجة لإعادة تحقق).
  // دكتور جديد: نفس تحقق isValidSlug المطبَّق على id المادة بالضبط — يرفض
  // أي حرف غير ASCII، ويرفض تصادماً مع دكتور موجود مسبقاً بنفس المادة
  // (خطة إصلاح ASCII §4.7 المحدَّثة، §4.2 — لا نسخة موازية من منطق التحقق).
  const professorIdValid =
    !multiProfessor ||
    (!isNewProfessor
      ? Boolean(effectiveProfessorId)
      : effectiveProfessorId.length > 0 && isValidSlug(effectiveProfessorId, existingProfessorIds));
  const extraItemsValid = extraItems.every((it) => {
    if (!it.title.trim()) return false;
    if (it.type === "link") return isValidUrl(it.url);
    if (it.type === "note") return it.content.trim().length > 0;
    return false;
  });
  const canBuildPackage = slugValid && name.trim().length > 0 && professorIdValid && extraItemsValid;

  const { pkg, buildError } = useMemo(() => {
    if (!canBuildPackage) return { pkg: null, buildError: null };
    try {
      const filesForPackage = rawFiles.map((f) => {
        const meta = fileMeta[fileKey(f)] ?? {};
        return {
          type: fileType(f),
          title: meta.title || slugifyTitle(f.name),
          section: SECTION_KEYS.includes(meta.section) ? meta.section : "theory",
          hidden: Boolean(meta.hidden),
          file: f,
        };
      });

      const linkNoteForPackage = extraItems.map((it) => ({
        type: it.type,
        title: it.title.trim(),
        section: SECTION_KEYS.includes(it.section) ? it.section : "theory",
        hidden: Boolean(it.hidden),
        ...(it.type === "link" ? { url: it.url.trim() } : { content: it.content }),
      }));

      const itemsForPackage = [...filesForPackage, ...linkNoteForPackage];

      const subjectMeta = {
        id: slug,
        name,
        code,
        hidden,
        description: description.trim(),
        scheduleDays: {
          theory: theorySchedule.filter(isCompleteScheduleRow),
          lab: labSchedule.filter(isCompleteScheduleRow),
        },
        sectionProfessors: {
          theory: theoryProfessorLabel.trim(),
          lab: labProfessorLabel.trim(),
        },
        ...(multiProfessor
          ? {
              professorId: effectiveProfessorId,
              professorName: isNewProfessor ? newProfessorName || effectiveProfessorId : professorNameOverride,
              setActive,
            }
          : {}),
        ...(initialSubject ? { existingSubject: initialSubject } : {}),
        existingLectures: { sections },
        // ⚠️ إصلاح حرج: بدون هذا الحقل، buildSubjectPackage يبني study-plan.json
        // من الصفر بمادة واحدة فقط ويفقد كل مادة أخرى موجودة سابقاً بالملف.
        existingStudyPlan: existingStudyPlan || { courses: [] },
      };

      const built = buildSubjectPackage({ subjectMeta, items: itemsForPackage });
      return { pkg: built, buildError: null };
    } catch (err) {
      return { pkg: null, buildError: err.message || String(err) };
    }
  }, [
    canBuildPackage,
    rawFiles,
    fileMeta,
    extraItems,
    slug,
    name,
    code,
    hidden,
    description,
    multiProfessor,
    effectiveProfessorId,
    isNewProfessor,
    newProfessorName,
    professorNameOverride,
    setActive,
    theoryProfessorLabel,
    labProfessorLabel,
    theorySchedule,
    labSchedule,
    sections,
    initialSubject,
    existingStudyPlan,
  ]);

  return (
    <div className="flex flex-col gap-6">
      <section className="rounded-lg border border-border bg-bg-subtle p-4">
        <h2 className="mb-3 text-sm font-semibold text-text-h">بيانات المادة</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="flex flex-col gap-1 text-sm text-text">
            اسم المادة
            <input
              value={name}
              onChange={(e) => handleNameChange(e.target.value)}
              className="rounded-md border border-border bg-bg px-3 py-1.5 text-text"
              placeholder="مثال: الدارات الكهربائية"
            />
          </label>

          <label className="flex flex-col gap-1 text-sm text-text">
            الرقم الرسمي (code)
            <input
              value={code}
              onChange={(e) => setCode(e.target.value)}
              className="rounded-md border border-border bg-bg px-3 py-1.5 text-text"
              placeholder="مثال: 1130700"
            />
          </label>

          <label className="flex flex-col gap-1 text-sm text-text">
            المعرّف (slug)
            <input
              value={slug}
              onChange={(e) => handleSlugChange(e.target.value)}
              disabled={isEditing}
              className="rounded-md border border-border bg-bg px-3 py-1.5 text-text disabled:opacity-60"
              placeholder="circuits"
            />
            {!slugValid && slug.length > 0 && (
              <span className="text-xs text-danger-text">
                slug غير صالح أو مستخدم مسبقاً (أحرف إنجليزية صغيرة وأرقام وشرطات فقط)
              </span>
            )}
          </label>

          <label className="flex items-center gap-2 text-sm text-text">
            <input
              type="checkbox"
              checked={hidden}
              onChange={(e) => setHidden(e.target.checked)}
              className="h-4 w-4"
            />
            إخفاء المادة بالكامل عن الطلاب
          </label>

          <label className="flex flex-col gap-1 text-sm text-text sm:col-span-2">
            نبذة أو رسالة عن المادة (اختياري)
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className="rounded-md border border-border bg-bg px-3 py-1.5 text-text"
              placeholder="مثال: يُفضَّل إحضار الآلة الحاسبة كل محاضرة، والمراجعة أسبوعياً بدل التجميع قبل الامتحان."
            />
            <span className="text-xs text-text-muted">
              نص خام فقط (بلا Markdown أو HTML) — يظهر أعلى صفحة المادة للطالب مباشرة.
            </span>
          </label>
        </div>
      </section>

      <section className="rounded-lg border border-border bg-bg-subtle p-4">
        <h2 className="mb-1 text-sm font-semibold text-text-h">تسمية دكتور النظري/العملي (اختياري)</h2>
        <p className="mb-3 text-xs text-text-muted">
          تسمية عرض فقط تظهر أعلى صفحة المادة للطالب — لا علاقة لها بـ "متعددة الدكاترة"
          أسفل ولا تتحكم بأي محتوى. اتركهما فارغين لو دكتور واحد يكفي (يظهر بالطريقة
          القديمة)، أو لو المادة تُدرَّس بنفس الدكتور للنظري والعملي معاً.
        </p>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="flex flex-col gap-1 text-sm text-text">
            دكتور النظري
            <input
              value={theoryProfessorLabel}
              onChange={(e) => setTheoryProfessorLabel(e.target.value)}
              className="rounded-md border border-border bg-bg px-3 py-1.5 text-text"
              placeholder="مثال: د. علاء سرحان"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm text-text">
            دكتور العملي
            <input
              value={labProfessorLabel}
              onChange={(e) => setLabProfessorLabel(e.target.value)}
              className="rounded-md border border-border bg-bg px-3 py-1.5 text-text"
              placeholder="مثال: م. عبدو غزالي (يقبل أكثر من اسم بنفس الحقل)"
            />
          </label>
        </div>
      </section>

      <section className="rounded-lg border border-border bg-bg-subtle p-4">
        <h2 className="mb-1 text-sm font-semibold text-text-h">أوقات المحاضرات (اختياري)</h2>
        <p className="mb-3 text-xs text-text-muted">
          يظهر كل موعد كسطر مستقل أعلى صفحة المادة للطالب. يمكن إضافة أكثر من موعد
          بالأسبوع لنفس النوع (نظري يومَي الأحد والثلاثاء مثلاً) — حقل عرض فقط، لا
          يتحكم بأي محتوى أو ملف.
        </p>

        <ScheduleTypeEditor
          label="مواعيد النظري"
          rows={theorySchedule}
          onAdd={() => addScheduleRow(setTheorySchedule)}
          onChange={(i, patch) => updateScheduleRow(setTheorySchedule, i, patch)}
          onRemove={(i) => removeScheduleRow(setTheorySchedule, i)}
        />
        <div className="mt-4">
          <ScheduleTypeEditor
            label="مواعيد العملي"
            rows={labSchedule}
            onAdd={() => addScheduleRow(setLabSchedule)}
            onChange={(i, patch) => updateScheduleRow(setLabSchedule, i, patch)}
            onRemove={(i) => removeScheduleRow(setLabSchedule, i)}
          />
        </div>
      </section>

      <section className="rounded-lg border border-border bg-bg-subtle p-4">
        <label className="mb-3 flex items-center gap-2 text-sm font-semibold text-text-h">
          <input
            type="checkbox"
            checked={multiProfessor}
            onChange={(e) => setMultiProfessor(e.target.checked)}
            className="h-4 w-4"
          />
          هذه المادة متعددة الدكاترة
        </label>

        {multiProfessor && (
          <>
            <p className="mb-2 text-xs text-text-muted">
              كل نشرة (submit) تخص دكتوراً واحداً — اختر دكتوراً موجوداً لتحديث محاضراته، أو
              أضف دكتوراً جديداً.
            </p>
            <div className="flex flex-wrap items-center gap-2">
              <select
                value={professorChoice}
                onChange={(e) => {
                  selectProfessor(e.target.value);
                  switchLecturesContext(
                    e.target.value === NEW_PROFESSOR_VALUE ? null : e.target.value
                  );
                }}
                className="rounded-md border border-border bg-bg px-3 py-1.5 text-sm text-text"
              >
                {existingVariants.map((v) => (
                  <option key={v.professorId} value={v.professorId}>
                    {v.professorName} {v.active ? "(نشِط حالياً)" : ""}
                  </option>
                ))}
                <option value={NEW_PROFESSOR_VALUE}>+ دكتور جديد</option>
              </select>

              {isNewProfessor && (
                <>
                  <input
                    value={newProfessorName}
                    onChange={(e) => handleNewProfessorNameChange(e.target.value)}
                    placeholder="اسم الدكتور (مثال: د. أحمد)"
                    className="min-w-0 flex-1 rounded-md border border-border bg-bg px-2 py-1 text-sm text-text"
                  />
                  <div className="flex min-w-0 flex-1 flex-col gap-1">
                    <input
                      value={newProfessorId}
                      onChange={(e) => handleNewProfessorIdChange(e.target.value)}
                      placeholder="professorId (مثال: prof-ahmad) — يُقترَح تلقائياً من الاسم"
                      dir="ltr"
                      className="rounded-md border border-border bg-bg px-2 py-1 text-sm text-text"
                    />
                    {newProfessorId.length > 0 &&
                      !isValidSlug(newProfessorId, existingProfessorIds) && (
                        <span className="text-xs text-danger-text">
                          professorId غير صالح أو مستخدم مسبقاً بهذه المادة (أحرف إنجليزية
                          صغيرة وأرقام وشرطات فقط)
                        </span>
                      )}
                  </div>
                </>
              )}

              {!isNewProfessor && professorChoice !== NEW_PROFESSOR_VALUE && (
                <input
                  value={professorNameOverride}
                  onChange={(e) => setProfessorNameOverride(e.target.value)}
                  className="min-w-0 flex-1 rounded-md border border-border bg-bg px-2 py-1 text-sm text-text"
                />
              )}

              <label className="flex items-center gap-1 text-xs text-text">
                <input
                  type="checkbox"
                  checked={setActive}
                  onChange={(e) => setSetActive(e.target.checked)}
                />
                اجعله الدكتور النشِط (المعروض افتراضياً للطلاب)
              </label>
            </div>
            {!professorIdValid && (
              <p className="mt-1 text-xs text-danger-text">
                أدخل professorId صالح للدكتور الجديد (ASCII، فريد ضمن هذه المادة).
              </p>
            )}
          </>
        )}
      </section>

      <section className="rounded-lg border border-border bg-bg-subtle p-4">
        <h2 className="mb-1 text-sm font-semibold text-text-h">المحاضرات والأقسام الحالية</h2>
        <p className="mb-3 text-xs text-text-muted">
          تعديل هنا (إخفاء/تسمية/حذف) يُحفظ كجزء من هذه النشرة حتى لو لم ترفع ملفات جديدة.
        </p>
        {isNewProfessor ? (
          <p className="text-xs text-text-muted">دكتور جديد — لا توجد محاضرات سابقة له بعد.</p>
        ) : (
          <SectionsManager sections={sections} onChange={setSections} />
        )}
      </section>

      <section className="rounded-lg border border-border bg-bg-subtle p-4">
        <h2 className="mb-3 text-sm font-semibold text-text-h">رفع ملفات PDF أو صور جديدة</h2>
        <FileUploaderWidget key={uploaderResetKey} onFilesSelected={handleFilesSelected} />

        {rawFiles.length > 0 && (
          <div className="mt-4 flex flex-col gap-2">
            <p className="text-xs text-text-muted">حدّد قسم وعنوان كل ملف قبل النشر:</p>
            {rawFiles.map((f) => {
              const key = fileKey(f);
              const meta = fileMeta[key] ?? {};
              return (
                <div
                  key={key}
                  className="flex flex-wrap items-center gap-2 rounded-md border border-border bg-bg px-3 py-2 text-sm"
                >
                  <span className="shrink-0 text-xs text-text-muted">{f.name}</span>
                  <input
                    value={meta.title ?? ""}
                    onChange={(e) => updateFileMeta(key, { title: e.target.value })}
                    className="min-w-0 flex-1 rounded-md border border-border bg-bg px-2 py-1 text-text"
                    placeholder="عنوان المحاضرة"
                  />
                  <select
                    value={meta.section ?? "theory"}
                    onChange={(e) => updateFileMeta(key, { section: e.target.value })}
                    className="rounded-md border border-border bg-bg px-2 py-1 text-text"
                  >
                    {SECTION_KEYS.map((k) => (
                      <option key={k} value={k}>
                        {SECTION_LABELS[k]}
                      </option>
                    ))}
                  </select>
                  <label className="flex items-center gap-1 text-xs text-text">
                    <input
                      type="checkbox"
                      checked={Boolean(meta.hidden)}
                      onChange={(e) => updateFileMeta(key, { hidden: e.target.checked })}
                    />
                    مخفي
                  </label>
                </div>
              );
            })}
          </div>
        )}
      </section>

      <section className="rounded-lg border border-border bg-bg-subtle p-4">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-sm font-semibold text-text-h">روابط وملاحظات (بلا رفع ملف)</h2>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => addExtraItem("link")}
              className="rounded-md border border-border bg-bg px-3 py-1.5 text-xs text-text hover:bg-bg-elevated"
            >
              + إضافة رابط
            </button>
            <button
              type="button"
              onClick={() => addExtraItem("note")}
              className="rounded-md border border-border bg-bg px-3 py-1.5 text-xs text-text hover:bg-bg-elevated"
            >
              + إضافة ملاحظة
            </button>
          </div>
        </div>

        {extraItems.length === 0 ? (
          <p className="text-xs text-text-muted">لا يوجد روابط أو ملاحظات مضافة بهذه النشرة.</p>
        ) : (
          <div className="flex flex-col gap-3">
            {extraItems.map((it) => {
              const urlInvalid = it.type === "link" && it.url.length > 0 && !isValidUrl(it.url);
              return (
                <div
                  key={it.id}
                  className="flex flex-col gap-2 rounded-md border border-border bg-bg px-3 py-2 text-sm"
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="shrink-0 rounded-md border border-border bg-bg-subtle px-2 py-0.5 text-xs text-text-muted">
                      {it.type === "link" ? "رابط" : "ملاحظة"}
                    </span>
                    <input
                      value={it.title}
                      onChange={(e) => updateExtraItem(it.id, { title: e.target.value })}
                      className="min-w-0 flex-1 rounded-md border border-border bg-bg px-2 py-1 text-text"
                      placeholder="العنوان"
                    />
                    <select
                      value={it.section}
                      onChange={(e) => updateExtraItem(it.id, { section: e.target.value })}
                      className="rounded-md border border-border bg-bg px-2 py-1 text-text"
                    >
                      {SECTION_KEYS.map((k) => (
                        <option key={k} value={k}>
                          {SECTION_LABELS[k]}
                        </option>
                      ))}
                    </select>
                    <label className="flex items-center gap-1 text-xs text-text">
                      <input
                        type="checkbox"
                        checked={it.hidden}
                        onChange={(e) => updateExtraItem(it.id, { hidden: e.target.checked })}
                      />
                      مخفي
                    </label>
                    <button
                      type="button"
                      onClick={() => removeExtraItem(it.id)}
                      className="shrink-0 rounded-md border border-danger-border bg-danger-bg px-2 py-1 text-xs text-danger-text hover:opacity-80"
                    >
                      إزالة
                    </button>
                  </div>

                  {it.type === "link" ? (
                    <div>
                      <input
                        value={it.url}
                        onChange={(e) => updateExtraItem(it.id, { url: e.target.value })}
                        className="w-full rounded-md border border-border bg-bg px-2 py-1 text-text"
                        placeholder="https://..."
                        dir="ltr"
                      />
                      {urlInvalid && (
                        <p className="mt-1 text-xs text-danger-text">
                          الرابط يجب أن يبدأ بـ http:// أو https://
                        </p>
                      )}
                    </div>
                  ) : (
                    <textarea
                      value={it.content}
                      onChange={(e) => updateExtraItem(it.id, { content: e.target.value })}
                      className="w-full rounded-md border border-border bg-bg px-2 py-1 text-text"
                      rows={3}
                      placeholder="نص الملاحظة (بدون Markdown أو HTML)"
                    />
                  )}
                </div>
              );
            })}
          </div>
        )}
      </section>

      <section className="rounded-lg border border-border bg-bg-subtle p-4">
        {!canBuildPackage && (
          <p className="mb-3 text-xs text-danger-text">
            أكمل اسم المادة ومعرّفاً صالحاً{multiProfessor ? " ومعرّف الدكتور" : ""}
            {!extraItemsValid ? " وبيانات الروابط/الملاحظات (عنوان صحيح، ورابط http/https أو نص ملاحظة)" : ""}{" "}
            قبل النشر.
          </p>
        )}
        {buildError && (
          <p className="mb-3 text-xs text-danger-text">تعذّر تجهيز حزمة النشر: {buildError}</p>
        )}
        <PublishPanel pkg={pkg} onPublishSuccess={handlePublishSuccess} />
      </section>
    </div>
  );
}

/** مكوّن فرعي محلي — صف/صفوف مواعيد لنوع واحد (نظري أو عملي). لا حالة داخلية
 * خاصة به؛ كل الحالة تعيش بـ SubjectForm (theorySchedule/labSchedule) وتُمرَّر
 * بالكامل عبر props، حتى يبقى مصدر الحقيقة الوحيد بمكان واحد (نفس نمط
 * extraItems/fileMeta أعلاه بهذا الملف). */
function ScheduleTypeEditor({ label, rows, onAdd, onChange, onRemove }) {
  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <h3 className="text-sm font-medium text-text">{label}</h3>
        <button
          type="button"
          onClick={onAdd}
          className="rounded-md border border-border bg-bg px-2 py-1 text-xs text-text hover:bg-bg-elevated"
        >
          + إضافة موعد
        </button>
      </div>

      {rows.length === 0 ? (
        <p className="text-xs text-text-muted">لا مواعيد مضافة.</p>
      ) : (
        <div className="flex flex-col gap-2">
          {rows.map((row, i) => (
            <div
              key={i}
              className="grid grid-cols-2 gap-2 rounded-md border border-border bg-bg p-2 sm:grid-cols-[minmax(0,1fr)_auto_auto_minmax(0,1fr)_auto]"
            >
              <select
                value={row.day}
                onChange={(e) => onChange(i, { day: e.target.value })}
                className="rounded-md border border-border bg-bg-elevated px-2 py-1 text-sm text-text"
              >
                {WEEK_DAYS.map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>

              <input
                type="time"
                value={row.start}
                onChange={(e) => onChange(i, { start: e.target.value })}
                className="rounded-md border border-border bg-bg-elevated px-2 py-1 text-sm text-text"
              />

              <input
                type="time"
                value={row.end}
                onChange={(e) => onChange(i, { end: e.target.value })}
                className="rounded-md border border-border bg-bg-elevated px-2 py-1 text-sm text-text"
              />

              <input
                value={row.location}
                onChange={(e) => onChange(i, { location: e.target.value })}
                placeholder="المكان (اختياري) — مثال: ق 7"
                className="col-span-2 rounded-md border border-border bg-bg-elevated px-2 py-1 text-sm text-text sm:col-span-1"
              />

              <button
                type="button"
                onClick={() => onRemove(i)}
                aria-label="حذف الموعد"
                className="col-span-2 rounded-md border border-danger-border bg-danger-bg px-2 py-1 text-xs text-danger-text hover:opacity-90 sm:col-span-1"
              >
                حذف
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
