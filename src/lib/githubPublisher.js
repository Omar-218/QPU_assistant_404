// ⚠️ ملف مملوك لعضو 5 (خط أنابيب النشر) — القسم 5 من خطة البناء
//
// عقد هذا الملف (للتوثيق فقط، ينسخه عضو 6 لاحقاً إلى docs/data-schema.md):
//
// buildSubjectPackage({ subjectMeta, items }) → pkg
//   subjectMeta: {
//     id: string,                 // slug نهائي (من lib/idSlug.js، عضو 4)
//     name: string,               // الاسم العربي
//     code: string,
//     hidden?: boolean,
//     professorId?: string,       // إن وُجد → وضع تعدد الدكاترة (القسم 4.3)
//     professorName?: string,
//     setActive?: boolean,        // هل يصبح هذا الدكتور النشِط؟ إن لم تُمرَّر صراحة:
//                                  // دكتور موجود مسبقاً يحافظ على حالة active السابقة كما هي،
//                                  // ودكتور جديد كلياً يصير active فقط لو كان الأول إطلاقاً
//     existingSubject?: object,   // subject.json الحالي (عند التعديل، لحفظ باقي الدكاترة)
//     existingLectures?: object,  // lectures*.json الحالي (عند الإضافة على مادة موجودة)
//     existingStudyPlan?: object, // public/data/study-plan.json الحالي كاملاً — لازم يُمرَّر
//                                  // بأحدث نسخة معروفة (نفس نمط existingSubject/existingLectures)
//                                  // وإلا ستُفقَد مواد أخرى غير مادة هذا النشر من courses
//     sectionProfessors?: { theory?: string, lab?: string }, // تسمية عرض فقط —
//                                  // "نظري: X / عملي: Y" بصفحة المادة (Subject.jsx). لا علاقة
//                                  // لها بـ professorVariants/lecturesFile إطلاقاً: لا تُغيّر
//                                  // أي محتوى ولا تتحكم بأي ملف — نص وصفي بحت يوضَع أعلى
//                                  // المحتوى المشترك (نفس sections لكل الطلاب). سبب وجودها:
//                                  // professorVariants صُمّم أصلاً لتبديل كامل لمحتوى بديل
//                                  // (شعبتين مختلفتين بمحاضرات مختلفة)، وهذا غير مناسب إطلاقاً
//                                  // لحالة "دكتور نظري + دكتور عملي" الشائعة (نفس المحتوى،
//                                  // فقط تسمية من يُدرّس كل قسم) — قرار المدير بعد ملاحظة
//                                  // المستخدم أن صفحة المادة كانت تُظهر دكتوراً واحداً فقط
//                                  // ("الدكتور: X") مهما أُضيف professorVariants إضافي.
//                                  // يُحفَظ كما هو حرفياً بلا معالجة (يدعم أي نص، مثلاً دكتورين
//                                  // معاً بحقل واحد: "د. أحمد العريفي، م. سليمان محمد").
//   }
//     scheduleDays?: { theory?: string, lab?: string }, // ⚠️ جديد: أيام الدوام الأسبوعي —
//                                  // بنفس نمط sectionProfessors تماماً حرفياً (وصف عرض بحت،
//                                  // بمعزل تام عن professorVariants/lecturesFile/sectionProfessors
//                                  // نفسها). "دوام النظري: السبت / دوام العملي: الأحد" بصفحة
//                                  // المادة. مصدره جدول دوام رسمي أرسله المستخدم مباشرة، لا
//                                  // نموذج SubjectForm.jsx بعد (يُضاف يدوياً/بجلسة تحديث دفعة).
//     description?: string, // ⚠️ جديد: نبذة/رسالة عن المادة تُعرَض أعلى صفحة
//                                  // المادة (Subject.jsx)، نص خام فقط (بلا Markdown/HTML —
//                                  // نفس قيد content بعنصر note). نفس نمط الحفظ التلقائي
//                                  // لـ sectionProfessors/scheduleDays: تُحفَظ القيمة الحالية
//                                  // لو لم تُمرَّر بهذه النشرة، وتُحذَف فقط لو مُرِّر نص فارغ
//                                  // صراحة (بعد trim).
//   items: Array<{
//     type?: "pdf"|"image"|"link"|"note",  // غيابه = "pdf" دائماً (توافق عكسي)
//     title: string,
//     section: "theory"|"lab"|"extra"|"exam", // مفاتيح SECTION_LABELS (عضو 1/التسليم الثابت)
//     hidden?: boolean,
//     file?: File,   // pdf/image فقط — كائن File فعلي من المتصفح.
//                     // اسم الملف الفعلي يُشتق من title (بعد تنظيف الرموز غير
//                     // الصالحة) + امتداد يطابق النوع (.pdf لـ pdf، أو
//                     // .png/.jpg/.webp لـ image حسب file.type) — مع لاحقة
//                     // رقمية (_2, _3...) تلقائياً عند تكرار نفس الاسم.
//                     // صيغ image المقبولة: png/jpeg/webp فقط — لا SVG.
//     url?: string,   // link فقط — يجب أن يبدأ http:// أو https:// (يُتحقَّق
//                      // منه هنا أيضاً، إضافة لتحقق واجهة عضو 3 — كلا الطرفين معاً)
//     content?: string, // note فقط — نص خام فقط (بلا Markdown/HTML)
//   }>
//
//   → pkg: {
//     slug, subjectPath, lecturesPath, pdfDir, studyPlanPath,
//     subjectJson, lecturesJson, studyPlanJson,
//     pdfFiles: [{ path, file, name }],  // فقط لعناصر pdf/image (name = اسم الملف الفعلي)
//   }
//
// buildSubjectDeletion(slug, { existingSubject, existingStudyPlan }) → pkg
//   حذف تدميري كامل لمادة: subject.json + كل lectures*.json المرتبطة (بحسب
//   professorVariants إن وُجدت، وإلا lectures.json وحدها) + مجلد public/pdf/{slug}
//   بالكامل (يُحلَّل وقت النشر عبر listDirectory — لا نعرف أسماء ملفاته هنا مقدّماً)،
//   ويُزال سطر المادة من public/data/study-plan.json بنفس الحزمة/الـ PR.
//   → pkg: { kind: "subject-deletion", slug, filesToDelete: [...], pdfDir, studyPlanPath, studyPlanJson }
//
// buildStudyPlanUpdate(courses) → pkg
//   يكتب public/data/study-plan.json كاملاً بقائمة courses الجديدة فقط — بمعزل
//   تام عن محتوى أي مادة (subject.json/lectures*.json/pdf غير متأثرة إطلاقاً).
//   → pkg: { kind: "study-plan-update", studyPlanPath, studyPlanJson }
//
// publishToGitHub({ token, owner, repo, pkg, baseBranch?, autoMerge? }) → { prUrl, branch, merged, mergeError? }
//   autoMerge: افتراضي true — يدمج الـ PR تلقائياً بنفس التوكن (خطة الدفعة 4، المهمة 2).
//   مرّر false لترك الـ PR للمراجعة اليدوية بدون دمج.
//   ⚠️ قرار المدير الأمني الصريح (جلسة 4): لأي pkg من kind "subject-deletion"،
//   الدمج التلقائي مرفوض دائماً بلا استثناء — يُفرَض autoMerge=false داخلياً هنا
//   بصرف النظر عمّا يُمرَّر بالمعامل، فلا يقدر أي طرف يتجاوز هذي القاعدة بالغلط.
//   يدعم أيضاً pkg من kind "event-decision"/"upload-decision" (راجع أدناه) —
//   يُستخدَم لمسار "رفض" فقط (يفتح فرعاً/PR جديداً مستقلاً تماماً عن فرع
//   الطالب الأصلي، بلا لمسه إطلاقاً — راجع خطة الدفعة 5 §0 خطوة 6).
// exportPackageAsZip(pkg) → Blob (ويُنزَّل تلقائياً بالمتصفح — pdf/image فقط pkg.subject-package)
//
// --- خطة الدفعة 5 (طلبات الطلاب: أحداث + رفع ملفات) ---
// فتح فرع/PR الطلب الأصلي بتوكن الطالب المقيَّد ليس من هذا الملف إطلاقاً —
// راجع lib/studentSubmission.js (ملف معزول تماماً، يحمل التوكن المقيَّد وحده).
// هذا الملف (بتوكن الأدمن الكامل) يبني فقط "قرار" الأدمن على طلب قائم:
//
// buildEventDecision(request, { decision, adminNote?, existingEvents }) → pkg
//   request: بيانات الطلب المعلَّق كما كُتبت بفرع الطالب (id, subjectId,
//   subjectName, type, typeLabel, title, date, submittedByLabel, createdAt).
//   decision: "approved" | "rejected". يبني/يحدّث سطر public/data/events.json
//   (السجل النهائي — لا حالة "pending" هنا إطلاقاً، راجع عقد §1.1).
//   → pkg: { kind: "event-decision", decision, subjectId, eventsPath, eventsJson }
//
// buildUploadDecision(request, { decision, adminNote?, existingLectures?,
//   existingUploadsLog, lecturesFileName? }) → pkg
//   request: بيانات طلب الرفع المعلَّق (id, subjectId, subjectName, section,
//   requestedTitle, fileName, submittedByLabel, createdAt) — الملف الفعلي مرفوع
//   أصلاً على فرع الطالب بـ studentSubmission.js، هذي الدالة لا ترفع شيئاً، فقط
//   تُسجّله. عند decision="approved" فقط: يُضاف عنصر عادي بنفس عقد أنواع
//   المحتوى (جلسة 5، type:"pdf") لقسم lectures*.json المناسب، بحقل إضافي
//   `requestOrigin: "student-upload"` (تتبّع فقط، لا يؤثر على العرض).
//   → pkg: { kind: "upload-decision", decision, subjectId, uploadsLogPath,
//            uploadsLogJson, lecturesPath?, lecturesJson? } (الأخيران فقط لو approved)
//
// mergeExistingPR({ token, owner, repo, branch, prNumber, pkg }) → { merged, mergeError? }
//   مسار "قبول" حصراً: يكتب ملفات pkg (events.json أو lectures*.json+
//   upload-requests-log.json) مباشرة على فرع الطالب *الموجود مسبقاً* (لا فرع
//   جديد، لا PR جديد)، ثم يدمج PR الطالب نفسه (prNumber) — دمج واحد يحمل
//   المحتوى (الملف الذي رفعه الطالب مسبقاً على نفس الفرع) وتسجيل القرار معاً،
//   بالضبط كما ينص عقد خطة الدفعة 5 §0 خطوة 5.
//
// closePendingRequestPR({ token, owner, repo, prNumber, comment? }) → { closed }
//   مسار "رفض": يُقفل PR الطالب بلا أي دمج ولا أي كتابة على فرعه — الفرع يبقى
//   موجوداً كما هو تماماً (خطوة 6). تسجيل حالة "rejected" بملفات السجل يتم
//   بمسار منفصل تماماً عبر publishToGitHub (راجع أعلاه)، ثم يُستدعى هذا
//   لإقفال PR الطالب الأصلي — الاثنان معاً يكوّنان "الرفض" الكامل.

// استيراد أدوات ASCII slug من عضو 4 — إلزامي لكل من اسم ملف lectures*.json
// (professorId) وأسماء ملفات المحتوى الفعلية (pdf/image)، حسب خطة إصلاح
// ASCII §4.7 المحدَّثة، القسم 3 (مهام عضو 5).
import { transliterateToSlug, isValidSlug } from "./idSlug.js";

const SECTION_ORDER = ["theory", "lab", "extra", "exam"];

// عناصر pdf/image فقط تنتج ملفاً فعلياً؛ link/note تُكتب مباشرة بالـ JSON بلا رفع.
const FILE_BACKED_TYPES = new Set(["pdf", "image"]);

// صيغ الصور المقبولة حصراً — لا SVG (خطر تنفيذ سكربت داخل الصورة).
const IMAGE_MIME_TO_EXT = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/webp": "webp",
};

/** يحوّل الاسم اللي يكتبه الآدمن إلى اسم ملف فعلي — ASCII إلزامي دائماً
 * (خطة إصلاح ASCII §4.7 المحدَّثة، §3.1: عبر transliterateToSlug عضو 4)،
 * بصرف النظر عن لغة العنوان المعروض. العنوان العربي الأصلي يبقى محفوظاً
 * حرفياً بحقل title بالـ JSON — هذا التحويل يخص اسم الملف على القرص فقط.
 * يشيل امتداد معروف (pdf/png/jpg/jpeg/webp) لو كتبه الآدمن بنفسه قبل
 * التحويل (تفادي title.pdf.pdf)، ثم يحوّل شرطات transliterateToSlug إلى
 * "_" للحفاظ على نفس نمط التسمية المعتمَد سابقاً بالمشروع
 * ("دارات_نظري_1" بدل "drt-nzry-1"). */
function sanitizeFileTitle(title) {
  const withoutExt = String(title || "")
    .trim()
    .replace(/\.(pdf|png|jpe?g|webp)$/i, "");
  return transliterateToSlug(withoutExt).replace(/-/g, "_");
}

/** يتحقق أن الرابط يبدأ http:// أو https:// — يُطبَّق هنا إضافة لتحقق واجهة
 * عضو 3 (كلا الطرفين معاً حسب العقد المشترك)، لأن buildSubjectPackage قد
 * تُستدعى من مسارات أخرى غير الواجهة (اختبارات، سكربتات) لاحقاً. */
function isValidHttpUrl(url) {
  return typeof url === "string" && /^https?:\/\//i.test(url.trim());
}

/** يبني حزمة الملفات الجاهزة (subject.json, lectures.json, مسارات PDF)
 * من بيانات نموذج المادة + الملفات المرفوعة. */
export function buildSubjectPackage({ subjectMeta, items = [] }) {
  if (!subjectMeta?.id) {
    throw new Error("buildSubjectPackage: subjectMeta.id (slug) مطلوب");
  }

  const slug = subjectMeta.id;
  const multiProfessor = Boolean(subjectMeta.professorId);

  // خط دفاع أخير (خطة إصلاح ASCII §4.7 المحدَّثة، §3.2): حتى لو مرّ professorId
  // غير ASCII من كل الطبقات السابقة (نموذج عضو 3، أو أي مسار استدعاء آخر
  // مستقبلاً غير الواجهة)، لا نبني اسم ملف تالفاً بصمت — نرفض النشر برسالة
  // واضحة. لا نعتمد فقط على تحقق الواجهة أو استخدام suggestProfessorId.
  if (multiProfessor && !isValidSlug(subjectMeta.professorId, [])) {
    throw new Error(
      `buildSubjectPackage: professorId "${subjectMeta.professorId}" غير صالح — ` +
        `يجب أن يكون ASCII slug (أحرف إنجليزية صغيرة/أرقام/شرطات فقط، مثل "prof-alaa"). ` +
        `استخدم suggestProfessorId من idSlug.js لتوليده تلقائياً من اسم الدكتور.`
    );
  }

  const lecturesFileName = multiProfessor
    ? `lectures-${subjectMeta.professorId}.json`
    : "lectures.json";

  // --- بناء subject.json (يحافظ على professorVariants الأخرى إن وُجدت) ---
  const subjectJson = {
    id: slug,
    name: subjectMeta.name,
    code: subjectMeta.code,
    hidden: Boolean(subjectMeta.hidden),
  };

  // تسمية "نظري/عملي" وصفية فقط — بمعزل تام عن professorVariants (راجع توثيق
  // العقد أعلى الملف). نحافظ على القيمة الحالية تلقائياً لو ما مُرِّرت بهذي
  // النشرة تحديداً (نفس نمط professorVariants مع existingSubject)، وتُحذَف
  // كلياً فقط لو مُرِّر كائن فارغ صراحة {} لكلا الحقلين.
  const incomingSectionProfessors = subjectMeta.sectionProfessors;
  const prevSectionProfessors = subjectMeta.existingSubject?.sectionProfessors;
  const nextSectionProfessors = incomingSectionProfessors !== undefined
    ? incomingSectionProfessors
    : prevSectionProfessors;
  if (nextSectionProfessors && (nextSectionProfessors.theory || nextSectionProfessors.lab)) {
    subjectJson.sectionProfessors = {
      ...(nextSectionProfessors.theory ? { theory: nextSectionProfessors.theory } : {}),
      ...(nextSectionProfessors.lab ? { lab: nextSectionProfessors.lab } : {}),
    };
  }

  // ⚠️ جديد: أيام الدوام الأسبوعي (scheduleDays) — نفس النمط الحرفي لـ
  // sectionProfessors أعلاه بلا أي فرق (وصف عرض فقط، بمعزل تام عن أي منطق
  // آخر). أُضيف مباشرة على بيانات المواد الموجودة (لا يمر بالضرورة عبر
  // SubjectForm.jsx بعد — النموذج لا يعرض له حقلاً بعد، فقط الكتابة
  // المباشرة/الجلسات اليدوية تملأه حالياً).
  const incomingScheduleDays = subjectMeta.scheduleDays;
  const prevScheduleDays = subjectMeta.existingSubject?.scheduleDays;
  const nextScheduleDays = incomingScheduleDays !== undefined ? incomingScheduleDays : prevScheduleDays;
  if (nextScheduleDays && (nextScheduleDays.theory || nextScheduleDays.lab)) {
    subjectJson.scheduleDays = {
      ...(nextScheduleDays.theory ? { theory: nextScheduleDays.theory } : {}),
      ...(nextScheduleDays.lab ? { lab: nextScheduleDays.lab } : {}),
    };
  }

  // ⚠️ جديد: نبذة/رسالة وصفية للمادة (description) — نص خام فقط، بلا
  // Markdown/HTML (نفس قيد content بعنصر note، القسم 13.1 بـ data-schema.md).
  // نفس نمط sectionProfessors/scheduleDays أعلاه حرفياً: تُحفظ القيمة
  // الحالية تلقائياً لو لم تُمرَّر بهذه النشرة تحديداً، ولا تُحذَف إلا لو
  // مُرِّر نص فارغ صراحة.
  const incomingDescription = subjectMeta.description;
  const prevDescription = subjectMeta.existingSubject?.description;
  const nextDescription =
    incomingDescription !== undefined ? incomingDescription : prevDescription;
  if (typeof nextDescription === "string" && nextDescription.trim()) {
    subjectJson.description = nextDescription.trim();
  }

  if (multiProfessor) {
    const prevVariants = Array.isArray(subjectMeta.existingSubject?.professorVariants)
      ? [...subjectMeta.existingSubject.professorVariants]
      : [];

    const idx = prevVariants.findIndex((v) => v.professorId === subjectMeta.professorId);
    const setActiveExplicit = typeof subjectMeta.setActive === "boolean";
    // إصلاح (مراجعة الجولة 2، القسم 2.2): لو setActive لم تُمرَّر صراحة ولدكتور
    // موجود مسبقاً (idx >= 0)، يجب الحفاظ على حالة active السابقة كما هي، لا
    // افتراض false — وإلا يُصفَّر الدكتور النشِط عند مجرد تعديل محتواه.
    let shouldBeActive;
    if (setActiveExplicit) {
      shouldBeActive = subjectMeta.setActive;
    } else if (idx >= 0) {
      shouldBeActive = prevVariants[idx].active;
    } else {
      shouldBeActive = prevVariants.length === 0;
    }

    const newVariant = {
      professorId: subjectMeta.professorId,
      professorName: subjectMeta.professorName || subjectMeta.professorId,
      active: shouldBeActive,
      lecturesFile: lecturesFileName,
    };

    let variants;
    if (idx >= 0) {
      variants = prevVariants.map((v, i) => (i === idx ? { ...v, ...newVariant } : v));
    } else {
      variants = [...prevVariants, newVariant];
    }
    // لو صار هذا الدكتور نشطاً، نطفئ البقية (نشِط واحد فقط في كل لحظة)
    if (shouldBeActive) {
      variants = variants.map((v) =>
        v.professorId === subjectMeta.professorId ? v : { ...v, active: false }
      );
    }
    subjectJson.professorVariants = variants;
  } else if (subjectMeta.existingSubject?.professorVariants) {
    // توافق عكسي: لو المادة كانت أصلاً بدون تعدد دكاترة نتركها كذلك
    subjectJson.professorVariants = subjectMeta.existingSubject.professorVariants;
  }

  // --- بناء lectures.json (دمج مع الموجود سابقاً إن وُجد) ---
  const existingSections = Array.isArray(subjectMeta.existingLectures?.sections)
    ? subjectMeta.existingLectures.sections.map((s) => ({ ...s, items: [...(s.items || [])] }))
    : [];

  // --- تسمية الملف: تُشتق من الاسم اللي يختاره الآدمن للعرض (title) ---
  // (تعديل بطلب المدير: لا ترقيم تلقائي lecture-NN — الاسم الظاهر بقسم المادة
  // هو نفسه اسم الملف الفعلي على GitHub، مع فرض امتداد يطابق النوع: .pdf
  // لعناصر pdf، أو .png/.jpg/.webp لعناصر image حسب صيغتها الفعلية).
  const usedNames = new Set();
  existingSections.forEach((s) =>
    (s.items || []).forEach((it) => {
      if (it.file) usedNames.add(it.file);
    })
  );

  function uniqueFileName(title, fallback, ext) {
    const base = sanitizeFileTitle(title) || sanitizeFileTitle(fallback) || "ملف";
    let fileName = `${base}.${ext}`;
    let i = 2;
    while (usedNames.has(fileName)) {
      fileName = `${base}_${i}.${ext}`;
      i += 1;
    }
    usedNames.add(fileName);
    return fileName;
  }

  const pdfFiles = [];
  const sectionsBySection = new Map(existingSections.map((s) => [s.section, s]));

  for (const entry of items) {
    // غياب type بالبيانات = "pdf" دائماً (توافق عكسي — العقد المشترك مع عضو 3).
    const type = entry.type || "pdf";
    const sectionKey = entry.section || "theory";
    if (!sectionsBySection.has(sectionKey)) {
      const fresh = { section: sectionKey, hidden: false, items: [] };
      sectionsBySection.set(sectionKey, fresh);
    }
    const target = sectionsBySection.get(sectionKey);

    if (FILE_BACKED_TYPES.has(type)) {
      // --- pdf / image: نفس منطق رفع الملف الحالي، بامتداد يطابق النوع ---
      let ext = "pdf";
      if (type === "image") {
        ext = IMAGE_MIME_TO_EXT[entry.file?.type];
        if (!ext) {
          throw new Error(
            `buildSubjectPackage: صيغة صورة غير مدعومة للعنصر "${
              entry.title || entry.file?.name || ""
            }" — المسموح فقط png/jpeg/webp (لا SVG)`
          );
        }
      }
      const displayTitle = entry.title || entry.file?.name || "ملف";
      // مجلد الملفات الفعلية يبقى public/pdf/{slug}/ بلا تغيير، حتى لملفات image.
      const fileName = uniqueFileName(entry.title, entry.file?.name, ext);
      const path = `public/pdf/${slug}/${fileName}`;

      target.items.push({
        type,
        title: displayTitle,
        file: fileName,
        hidden: Boolean(entry.hidden),
      });

      pdfFiles.push({ path, file: entry.file, name: fileName });
    } else if (type === "link") {
      // --- link: بلا رفع ملف — تحقق الرابط مطبَّق هنا أيضاً (كلا الطرفين معاً) ---
      if (!isValidHttpUrl(entry.url)) {
        throw new Error(
          `buildSubjectPackage: رابط غير صالح للعنصر "${
            entry.title || ""
          }" — يجب أن يبدأ بـ http:// أو https://`
        );
      }
      target.items.push({
        type: "link",
        title: entry.title || entry.url.trim(),
        url: entry.url.trim(),
        hidden: Boolean(entry.hidden),
      });
    } else if (type === "note") {
      // --- note: بلا رفع ملف — نص خام فقط ---
      target.items.push({
        type: "note",
        title: entry.title || "ملاحظة",
        content: String(entry.content ?? ""),
        hidden: Boolean(entry.hidden),
      });
    } else {
      throw new Error(`buildSubjectPackage: نوع عنصر غير معروف "${type}"`);
    }
  }

  const sections = SECTION_ORDER.filter((k) => sectionsBySection.has(k)).map((k) =>
    sectionsBySection.get(k)
  );
  // أي قسم غير قياسي (احتياط) يُضاف بالنهاية بدل ما يُفقد
  for (const [key, val] of sectionsBySection) {
    if (!SECTION_ORDER.includes(key)) sections.push(val);
  }

  const lecturesJson = { sections };

  // --- تحديث public/data/study-plan.json (إصلاح تقرير عضو 6، 2026-07-19) ---
  // النشر كان يكتب subject.json/lectures.json فقط، وما كان يلمس study-plan.json
  // إطلاقاً — فالمادة الجديدة/المعدَّلة كانت تبقى غير مرئية بصفحتي "المواد" و"الخطة
  // الدراسية" (كلاهما يقرآن من study-plan.json حصراً) حتى لو نُشرت بنجاح فعلياً.
  const existingCourses = Array.isArray(subjectMeta.existingStudyPlan?.courses)
    ? [...subjectMeta.existingStudyPlan.courses]
    : [];
  const courseEntry = {
    id: slug,
    name: subjectJson.name,
    code: subjectJson.code,
    hidden: Boolean(subjectJson.hidden),
  };
  const courseIdx = existingCourses.findIndex((c) => c.id === slug);
  const courses =
    courseIdx >= 0
      ? existingCourses.map((c, i) => (i === courseIdx ? { ...c, ...courseEntry } : c)) // تعديل — لا تكرار
      : [...existingCourses, courseEntry]; // إنشاء جديد
  const studyPlanJson = { ...(subjectMeta.existingStudyPlan || {}), courses };

  return {
    slug,
    subjectPath: `public/data/subjects/${slug}/subject.json`,
    lecturesPath: `public/data/subjects/${slug}/${lecturesFileName}`,
    studyPlanPath: "public/data/study-plan.json",
    studyPlanJson,
    pdfDir: `public/pdf/${slug}`,
    subjectJson,
    lecturesJson,
    pdfFiles,
  };
}

/** يبني حزمة حذف تدميري كامل لمادة — راجع توثيق العقد أعلى الملف.
 * تُبقي الدالة نفسها متزامنة (بلا شبكة) بنفس نمط buildSubjectPackage؛ تحليل
 * محتويات مجلد public/pdf/{slug} الفعلية يحصل لاحقاً وقت النشر (publishToGitHub)
 * لأننا لا نعرف أسماء الملفات بداخله من الطرف اللي يستدعي هذي الدالة. */
export function buildSubjectDeletion(slug, { existingSubject, existingStudyPlan } = {}) {
  if (!slug) throw new Error("buildSubjectDeletion: slug مطلوب");

  const lectureFiles = existingSubject?.professorVariants?.length
    ? existingSubject.professorVariants.map((v) => v.lecturesFile || `lectures-${v.professorId}.json`)
    : ["lectures.json"];

  const filesToDelete = [
    `public/data/subjects/${slug}/subject.json`,
    ...lectureFiles.map((f) => `public/data/subjects/${slug}/${f}`),
  ];

  const remainingCourses = (existingStudyPlan?.courses ?? []).filter((c) => c.id !== slug);

  return {
    kind: "subject-deletion",
    slug,
    filesToDelete,
    pdfDir: `public/pdf/${slug}`, // يُحلَّل ويُحذَف ملفاً ملفاً وقت النشر
    studyPlanPath: "public/data/study-plan.json",
    studyPlanJson: { ...(existingStudyPlan || {}), courses: remainingCourses },
  };
}

/** يبني حزمة تحديث لقائمة المواد الوصفية فقط — بمعزل عن محتوى أي مادة. */
export function buildStudyPlanUpdate(courses) {
  return {
    kind: "study-plan-update",
    studyPlanPath: "public/data/study-plan.json",
    studyPlanJson: { courses },
  };
}

// تسميات الأنواع القياسية — تُشتق تلقائياً، بلا حاجة الآدمن يكتبها يدوياً.
// "other" فقط يعتمد على typeLabel حر كتبه الطالب/عدّله الآدمن (عقد §1.1).
const EVENT_TYPE_LABELS = {
  exam: "امتحان",
  quiz: "كويز",
  midterm: "امتحان منتصف الفصل",
  homework: "واجب",
};

/** يبني/يحدّث سطر public/data/events.json بقرار الأدمن على طلب حدث معلَّق —
 * راجع توثيق العقد أعلى الملف (خطة الدفعة 5). لا حالة "pending" هنا إطلاقاً:
 * هذي الدالة تُستدعى فقط بعد قرار فعلي (قبول أو رفض)، لا قبله. */
export function buildEventDecision(request, { decision, adminNote = "", existingEvents } = {}) {
  if (!request?.id) throw new Error("buildEventDecision: request.id مطلوب");
  if (decision !== "approved" && decision !== "rejected") {
    throw new Error('buildEventDecision: decision يجب أن يكون "approved" أو "rejected"');
  }

  const events = Array.isArray(existingEvents?.events) ? [...existingEvents.events] : [];
  const idx = events.findIndex((e) => e.id === request.id);

  const type = request.type || "other";
  const typeLabel = type === "other" ? request.typeLabel || "" : EVENT_TYPE_LABELS[type] || type;

  const entry = {
    id: request.id,
    subjectId: request.subjectId,
    subjectName: request.subjectName || request.subjectId,
    type,
    typeLabel,
    title: request.title,
    date: request.date,
    submittedByLabel: request.submittedByLabel || "",
    status: decision,
    adminNote,
    prUrl: request.prUrl || "",
    createdAt: request.createdAt || new Date().toISOString(),
    decidedAt: new Date().toISOString(),
  };

  const nextEvents = idx >= 0 ? events.map((e, i) => (i === idx ? entry : e)) : [...events, entry];

  return {
    kind: "event-decision",
    decision,
    subjectId: request.subjectId,
    eventsPath: "public/data/events.json",
    eventsJson: { events: nextEvents },
  };
}

/** يبني/يحدّث سطر public/data/upload-requests-log.json بقرار الأدمن على طلب
 * رفع ملف معلَّق، ويضيف عنصر lectures*.json فعلي فقط عند decision="approved"
 * (الملف نفسه مرفوع أصلاً على فرع الطالب بـ studentSubmission.js — هذي
 * الدالة لا ترفع أي ملف، فقط تُسجّله). راجع توثيق العقد أعلى الملف. */
export function buildUploadDecision(
  request,
  { decision, adminNote = "", existingLectures, existingUploadsLog, lecturesFileName = "lectures.json" } = {}
) {
  if (!request?.id) throw new Error("buildUploadDecision: request.id مطلوب");
  if (decision !== "approved" && decision !== "rejected") {
    throw new Error('buildUploadDecision: decision يجب أن يكون "approved" أو "rejected"');
  }

  const requests = Array.isArray(existingUploadsLog?.requests) ? [...existingUploadsLog.requests] : [];
  const idx = requests.findIndex((r) => r.id === request.id);

  const logEntry = {
    id: request.id,
    subjectId: request.subjectId,
    subjectName: request.subjectName || request.subjectId,
    section: request.section || "theory",
    requestedTitle: request.requestedTitle,
    fileName: request.fileName,
    submittedByLabel: request.submittedByLabel || "",
    status: decision,
    adminNote,
    prUrl: request.prUrl || "",
    createdAt: request.createdAt || new Date().toISOString(),
    decidedAt: new Date().toISOString(),
  };

  const nextRequests = idx >= 0 ? requests.map((r, i) => (i === idx ? logEntry : r)) : [...requests, logEntry];

  const pkg = {
    kind: "upload-decision",
    decision,
    subjectId: request.subjectId,
    uploadsLogPath: "public/data/upload-requests-log.json",
    uploadsLogJson: { requests: nextRequests },
  };

  if (decision === "approved") {
    // إعادة استخدام حرفية لعقد أنواع المحتوى الموجود (جلسة 5، §1.2) — بلا أي
    // تمديد. requestOrigin حقل تتبّع فقط لسجل الأدمن، لا يؤثر على العرض.
    const sections = Array.isArray(existingLectures?.sections)
      ? existingLectures.sections.map((s) => ({ ...s, items: [...(s.items || [])] }))
      : [];
    const sectionKey = request.section || "theory";
    let target = sections.find((s) => s.section === sectionKey);
    if (!target) {
      target = { section: sectionKey, hidden: false, items: [] };
      sections.push(target);
    }
    target.items.push({
      type: "pdf",
      title: request.requestedTitle,
      file: request.fileName,
      hidden: false,
      requestOrigin: "student-upload",
    });

    pkg.lecturesPath = `public/data/subjects/${request.subjectId}/${lecturesFileName}`;
    pkg.lecturesJson = { sections };
  }

  return pkg;
}

// --- أدوات GitHub API الداخلية ---

function ghHeaders(token) {
  return {
    Authorization: `Bearer ${token}`,
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
  };
}

async function fileToBase64(file) {
  const buf = await file.arrayBuffer();
  let binary = "";
  const bytes = new Uint8Array(buf);
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(binary);
}

function textToBase64(text) {
  return btoa(unescape(encodeURIComponent(text)));
}

async function getExistingSha({ owner, repo, path, ref, token }) {
  const res = await fetch(
    `https://api.github.com/repos/${owner}/${repo}/contents/${path}?ref=${encodeURIComponent(ref)}`,
    { headers: ghHeaders(token) }
  );
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`تعذّر التحقق من ${path}: ${res.status}`);
  const data = await res.json();
  return data.sha || null;
}

async function putFile({ owner, repo, path, branch, token, message, base64Content }) {
  const sha = await getExistingSha({ owner, repo, path, ref: branch === undefined ? "main" : branch, token }).catch(
    () => null
  );
  const res = await fetch(`https://api.github.com/repos/${owner}/${repo}/contents/${path}`, {
    method: "PUT",
    headers: { ...ghHeaders(token), "Content-Type": "application/json" },
    body: JSON.stringify({
      message,
      content: base64Content,
      branch,
      ...(sha ? { sha } : {}),
    }),
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`فشل رفع ${path}: ${res.status} ${body}`);
  }
  return res.json();
}

/** يحذف ملفاً إن كان موجوداً فعلاً على الفرع؛ يتجاهل بهدوء لو غير موجود أصلاً
 * (لا نُفشل عملية الحذف كاملة بسبب ملف ناقص مسبقاً — قد يحدث لو تعديل يدوي سابق
 * على الريبو أزاله، أو مادة بلا كل ملفات lectures*.json المتوقعة). */
async function deleteFileIfExists({ owner, repo, path, branch, token, message }) {
  const sha = await getExistingSha({ owner, repo, path, ref: branch, token });
  if (!sha) return;
  const res = await fetch(`https://api.github.com/repos/${owner}/${repo}/contents/${path}`, {
    method: "DELETE",
    headers: { ...ghHeaders(token), "Content-Type": "application/json" },
    body: JSON.stringify({ message, sha, branch }),
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`فشل حذف ${path}: ${res.status} ${body}`);
  }
}

/** يسرد ملفات مجلد عبر Contents API — لازمة لحذف public/pdf/{slug}/ بالكامل،
 * لأن GitHub لا يوفّر endpoint يحذف مجلداً دفعة واحدة (قرار/ملاحظة المدير، جلسة 4). */
async function listDirectory({ owner, repo, path, ref, token }) {
  const res = await fetch(
    `https://api.github.com/repos/${owner}/${repo}/contents/${path}?ref=${encodeURIComponent(ref)}`,
    { headers: ghHeaders(token) }
  );
  if (res.status === 404) return []; // المجلد غير موجود أصلاً (مادة بلا ملفات مرفوعة قط)
  if (!res.ok) throw new Error(`تعذّر قراءة محتويات ${path}: ${res.status}`);
  const data = await res.json();
  return Array.isArray(data) ? data.filter((it) => it.type === "file") : [];
}

/** المسار أ: نشر مباشر عبر GitHub Contents API.
 * token: GitHub Personal Access Token (fine-grained, صلاحية contents فقط على هذا الريبو)
 * يُستخدم من الذاكرة فقط، لا يُخزَّن ولا يُرسَل لأي مكان غير api.github.com */
export async function publishToGitHub({
  token,
  owner,
  repo,
  pkg,
  baseBranch = "main",
  autoMerge = true, // خطة الدفعة 4، المهمة 2: افتراضياً يدمج تلقائياً بلا مراجعة يدوية
}) {
  if (!token) throw new Error("مطلوب GitHub token");
  if (!owner || !repo) throw new Error("مطلوب owner/repo");

  const isDeletion = pkg.kind === "subject-deletion";
  const isStudyPlanOnly = pkg.kind === "study-plan-update";
  const isEventDecision = pkg.kind === "event-decision";
  const isUploadDecision = pkg.kind === "upload-decision";

  // خط دفاع: قرارات "قبول" يجب أن تمر حصراً عبر mergeExistingPR (تكتب على
  // فرع الطالب الموجود مسبقاً، حيث يعيش الملف/الحدث الفعلي). لو مُرِّرت هنا
  // بالغلط، النتيجة فرع/PR جديد لا يحتوي الملف الأصلي إطلاقاً — بيانات تالفة
  // بصمت. نرفض صراحة بدل نشر مرجع مكسور.
  if ((isEventDecision || isUploadDecision) && pkg.decision === "approved") {
    throw new Error(
      `publishToGitHub: pkg.kind="${pkg.kind}" بحالة decision="approved" يجب أن يمر عبر ` +
        `mergeExistingPR (على فرع طلب الطالب الأصلي)، لا عبر publishToGitHub — راجع توثيق العقد أعلى الملف.`
    );
  }

  // ⚠️ قرار المدير الأمني الصريح (جلسة 4): حذف = بلا دمج تلقائي أبداً، بصرف
  // النظر عمّا يُمرَّر بمعامل autoMerge — استثناء دائم لا يقدر أي طرف يتجاوزه.
  const effectiveAutoMerge = isDeletion ? false : autoMerge;

  // 1) sha الفرع الأساسي
  const refRes = await fetch(
    `https://api.github.com/repos/${owner}/${repo}/git/ref/heads/${baseBranch}`,
    { headers: ghHeaders(token) }
  );
  if (!refRes.ok) throw new Error(`تعذّر قراءة الفرع الأساسي (${baseBranch}): ${refRes.status}`);
  const refData = await refRes.json();
  const baseSha = refData.object.sha;

  // 2) فرع جديد للمحتوى
  const branch = `content/${pkg.slug || pkg.subjectId || "study-plan"}-${Date.now()}`;
  const createRefRes = await fetch(`https://api.github.com/repos/${owner}/${repo}/git/refs`, {
    method: "POST",
    headers: { ...ghHeaders(token), "Content-Type": "application/json" },
    body: JSON.stringify({ ref: `refs/heads/${branch}`, sha: baseSha }),
  });
  if (!createRefRes.ok) {
    const body = await createRefRes.text();
    throw new Error(`تعذّر إنشاء الفرع: ${createRefRes.status} ${body}`);
  }

  // 3) تنفيذ التغييرات — يختلف حسب نوع الحزمة
  if (isDeletion) {
    // حذف subject.json + كل lectures*.json المرتبطة
    for (const path of pkg.filesToDelete) {
      await deleteFileIfExists({ owner, repo, path, branch, token, message: `حذف ${path} — ${pkg.slug}` });
    }
    // حذف مجلد public/pdf/{slug} بالكامل — ملفاً ملفاً (لا endpoint لحذف مجلد دفعة واحدة)
    if (pkg.pdfDir) {
      const pdfFiles = await listDirectory({ owner, repo, path: pkg.pdfDir, ref: branch, token });
      for (const f of pdfFiles) {
        await deleteFileIfExists({
          owner,
          repo,
          path: f.path,
          branch,
          token,
          message: `حذف ${f.path} — ${pkg.slug}`,
        });
      }
    }
    await putFile({
      owner,
      repo,
      path: pkg.studyPlanPath,
      branch,
      token,
      message: `إزالة ${pkg.slug} من خطة المواد`,
      base64Content: textToBase64(JSON.stringify(pkg.studyPlanJson, null, 2)),
    });
  } else if (isStudyPlanOnly) {
    // تحديث القائمة الوصفية فقط — لا لمس لأي محتوى مادة
    await putFile({
      owner,
      repo,
      path: pkg.studyPlanPath,
      branch,
      token,
      message: "تحديث خطة المواد",
      base64Content: textToBase64(JSON.stringify(pkg.studyPlanJson, null, 2)),
    });
  } else if (isEventDecision) {
    // مسار "رفض" فقط (راجع توثيق العقد أعلى الملف) — فرع/PR جديد ومستقل تماماً
    // عن فرع طلب الطالب الأصلي، الذي يبقى بلا أي لمس (يُقفَل منفصلاً عبر
    // closePendingRequestPR). مسار "قبول" لا يمر من هنا إطلاقاً — يمر عبر
    // mergeExistingPR على فرع الطالب مباشرة.
    await putFile({
      owner,
      repo,
      path: pkg.eventsPath,
      branch,
      token,
      message: `تسجيل قرار حدث (${pkg.decision}) — ${pkg.subjectId || ""}`,
      base64Content: textToBase64(JSON.stringify(pkg.eventsJson, null, 2)),
    });
  } else if (isUploadDecision) {
    // نفس ملاحظة isEventDecision أعلاه — مسار "رفض" حصراً.
    await putFile({
      owner,
      repo,
      path: pkg.uploadsLogPath,
      branch,
      token,
      message: `تسجيل قرار رفع ملف (${pkg.decision}) — ${pkg.subjectId || ""}`,
      base64Content: textToBase64(JSON.stringify(pkg.uploadsLogJson, null, 2)),
    });
    if (pkg.lecturesPath) {
      await putFile({
        owner,
        repo,
        path: pkg.lecturesPath,
        branch,
        token,
        message: `تحديث بيانات المحاضرات — ${pkg.subjectId || ""}`,
        base64Content: textToBase64(JSON.stringify(pkg.lecturesJson, null, 2)),
      });
    }
  } else {
    // النشر العادي (إضافة/تعديل مادة) — subject.json + lectures.json + كل PDF
    await putFile({
      owner,
      repo,
      path: pkg.subjectPath,
      branch,
      token,
      message: `تحديث subject.json — ${pkg.slug}`,
      base64Content: textToBase64(JSON.stringify(pkg.subjectJson, null, 2)),
    });

    await putFile({
      owner,
      repo,
      path: pkg.lecturesPath,
      branch,
      token,
      message: `تحديث بيانات المحاضرات — ${pkg.slug}`,
      base64Content: textToBase64(JSON.stringify(pkg.lecturesJson, null, 2)),
    });

    await putFile({
      owner,
      repo,
      path: pkg.studyPlanPath,
      branch,
      token,
      message: `تحديث خطة المواد — ${pkg.slug}`,
      base64Content: textToBase64(JSON.stringify(pkg.studyPlanJson, null, 2)),
    });

    for (const pdf of pkg.pdfFiles) {
      const base64Content = await fileToBase64(pdf.file);
      await putFile({
        owner,
        repo,
        path: pdf.path,
        branch,
        token,
        message: `إضافة ${pdf.name} — ${pkg.slug}`,
        base64Content,
      });
    }
  }

  // 4) فتح Pull Request
  const prTitle = isDeletion
    ? `حذف مادة: ${pkg.slug}`
    : isStudyPlanOnly
    ? "تحديث خطة المواد"
    : isEventDecision
    ? `تسجيل قرار حدث (مرفوض) — ${pkg.subjectId || ""}`
    : isUploadDecision
    ? `تسجيل قرار رفع ملف (مرفوض) — ${pkg.subjectId || ""}`
    : `نشر محتوى: ${pkg.subjectJson.name} (${pkg.slug})`;

  const prBody = isDeletion
    ? `تم إنشاء هذا الطلب تلقائياً من لوحة التحكم لحذف المادة "${pkg.slug}" وكل ملفاتها المرتبطة (بيانات + PDF) وإزالتها من خطة المواد.\n\n⚠️ هذا حذف تدميري — يُترك دائماً للمراجعة اليدوية قبل الدمج، بلا استثناء دمج تلقائي مهما كان إعداد النشر.`
    : isStudyPlanOnly
    ? `تم إنشاء هذا الطلب تلقائياً من لوحة التحكم لتحديث قائمة المواد الوصفية (public/data/study-plan.json) فقط — لا لمس لمحتوى أي مادة.\n\n${
        effectiveAutoMerge
          ? "سيُدمَج تلقائياً بـ " + baseBranch + " مباشرة."
          : "يرجى المراجعة قبل الدمج بـ " + baseBranch + " (تم اختيار عدم الدمج التلقائي)."
      }`
    : isEventDecision || isUploadDecision
    ? `تم إنشاء هذا الطلب تلقائياً من لوحة التحكم لتسجيل قرار "رفض" على طلب طالب معلَّق (${pkg.subjectId || ""}) — تسجيل حالة الرفض بملف السجل فقط، بمعزل تام عن فرع طلب الطالب الأصلي الذي يُقفَل منفصلاً بلا دمج.\n\n${
        effectiveAutoMerge
          ? "سيُدمَج تلقائياً بـ " + baseBranch + " مباشرة."
          : "يرجى المراجعة قبل الدمج بـ " + baseBranch + " (تم اختيار عدم الدمج التلقائي)."
      }`
    : `تم إنشاء هذا الطلب تلقائياً من لوحة النشر.\n\n- المادة: ${pkg.subjectJson.name} (${pkg.slug})\n- ملفات مضافة: ${pkg.pdfFiles.length}\n\n${
        effectiveAutoMerge
          ? "سيُدمَج تلقائياً بـ " + baseBranch + " مباشرة."
          : "يرجى المراجعة قبل الدمج بـ " + baseBranch + " (تم اختيار عدم الدمج التلقائي)."
      }`;

  const prRes = await fetch(`https://api.github.com/repos/${owner}/${repo}/pulls`, {
    method: "POST",
    headers: { ...ghHeaders(token), "Content-Type": "application/json" },
    body: JSON.stringify({
      title: prTitle,
      head: branch,
      base: baseBranch,
      body: prBody,
    }),
  });
  if (!prRes.ok) {
    const body = await prRes.text();
    throw new Error(`تم رفع/حذف الملفات لكن فشل فتح الـ PR: ${prRes.status} ${body}`);
  }
  const prData = await prRes.json();

  // 5) دمج تلقائي (خطة الدفعة 4، المهمة 2) — اختياري عبر autoMerge=false لمن يحتاج
  // مراجعة يدوية استثنائية، ومفروض false دائماً لعمليات الحذف (effectiveAutoMerge
  // أعلاه). لو فشل الدمج (تعارضات، حماية فرع...) لا نُفشل العملية كاملة — الملفات
  // مرفوعة/محذوفة والـ PR مفتوح فعلاً، فقط نُبلغ بأن الدمج يحتاج تدخّلاً يدوياً.
  if (!effectiveAutoMerge) {
    return { prUrl: prData.html_url, branch, merged: false };
  }

  const mergeRes = await fetch(
    `https://api.github.com/repos/${owner}/${repo}/pulls/${prData.number}/merge`,
    {
      method: "PUT",
      headers: { ...ghHeaders(token), "Content-Type": "application/json" },
      body: JSON.stringify({
        commit_title: prTitle,
        merge_method: "squash",
      }),
    }
  );

  if (!mergeRes.ok) {
    const body = await mergeRes.text();
    return {
      prUrl: prData.html_url,
      branch,
      merged: false,
      mergeError: `تم فتح الـ PR لكن فشل الدمج التلقائي (${mergeRes.status}) — يحتاج دمجاً يدوياً: ${body}`,
    };
  }

  return { prUrl: prData.html_url, branch, merged: true };
}

/** مسار "قبول" لطلب طالب معلَّق (حدث أو رفع ملف) — خطة الدفعة 5 §0 خطوة 5.
 * يكتب ملفات pkg (من buildEventDecision/buildUploadDecision) مباشرة على فرع
 * الطالب *الموجود مسبقاً* بتوكن الأدمن الكامل، ثم يدمج PR الطالب نفسه —
 * دمج واحد يحمل المحتوى (الملف الذي رفعه الطالب مسبقاً على نفس الفرع
 * بتوكنه المقيَّد) وتسجيل القرار معاً. لا يفتح فرعاً ولا PR جديدين إطلاقاً. */
export async function mergeExistingPR({ token, owner, repo, branch, prNumber, pkg }) {
  if (!token) throw new Error("مطلوب GitHub token");
  if (!owner || !repo) throw new Error("مطلوب owner/repo");
  if (!branch || !prNumber) {
    throw new Error("مطلوب branch وprNumber (فرع ورقم PR طلب الطالب الأصلي)");
  }
  if (pkg?.decision && pkg.decision !== "approved") {
    throw new Error('mergeExistingPR: مخصَّصة لمسار "قبول" فقط — استخدم closePendingRequestPR للرفض');
  }

  const writes = [];
  if (pkg.eventsPath) {
    writes.push([pkg.eventsPath, `تسجيل قرار الحدث — ${pkg.subjectId || ""}`, pkg.eventsJson]);
  }
  if (pkg.uploadsLogPath) {
    writes.push([pkg.uploadsLogPath, `تسجيل قرار رفع الملف — ${pkg.subjectId || ""}`, pkg.uploadsLogJson]);
  }
  if (pkg.lecturesPath) {
    writes.push([pkg.lecturesPath, `تسجيل الملف بالمحاضرات — ${pkg.subjectId || ""}`, pkg.lecturesJson]);
  }
  if (writes.length === 0) {
    throw new Error(
      "mergeExistingPR: pkg لا يحتوي أي ملف للكتابة — ابنِه عبر buildEventDecision/buildUploadDecision أولاً"
    );
  }

  for (const [path, message, json] of writes) {
    await putFile({
      owner,
      repo,
      path,
      branch,
      token,
      message,
      base64Content: textToBase64(JSON.stringify(json, null, 2)),
    });
  }

  // ⚠️ إصلاح (2026-07-27، خطأ حي رصده المستخدم): جيتهاب يحسب حقل mergeable
  // بشكل غير متزامن بعد أي كوميت جديد على الفرع — استدعاء الدمج فوراً أحياناً
  // يرجّع 405 "Pull Request is not mergeable" حتى لو الـ PR قابل للدمج فعلياً
  // خلال ثوانٍ قليلة (سباق موثَّق بمجتمع جيتهاب، لا علاقة له بتعارض حقيقي).
  // نستطلع حالة mergeable بمهلة قصيرة قبل محاولة الدمج الفعلية، بدل الفشل فوراً.
  let mergeableState = null;
  for (let attempt = 0; attempt < 5; attempt++) {
    const prRes = await fetch(`https://api.github.com/repos/${owner}/${repo}/pulls/${prNumber}`, {
      headers: ghHeaders(token),
    });
    if (prRes.ok) {
      const prData = await prRes.json();
      if (prData.mergeable !== null) {
        mergeableState = prData.mergeable;
        break;
      }
    }
    await new Promise((resolve) => setTimeout(resolve, 1500));
  }

  const mergeRes = await fetch(`https://api.github.com/repos/${owner}/${repo}/pulls/${prNumber}/merge`, {
    method: "PUT",
    headers: { ...ghHeaders(token), "Content-Type": "application/json" },
    body: JSON.stringify({
      commit_title: `قبول طلب طالب — ${pkg.subjectId || ""}`,
      merge_method: "squash",
    }),
  });

  if (!mergeRes.ok) {
    const body = await mergeRes.text();
    // نفس منطق التسامح بفشل الدمج بـ publishToGitHub — الملفات وصلت فعلاً
    // للفرع، فقط الدمج نفسه يحتاج تدخّلاً يدوياً (تعارض حقيقي/حماية فرع).
    const reason =
      mergeableState === false
        ? "تعارض حقيقي بين فرع الطالب وmain (على الأغلب قرار آخر لُمس نفس الملف بالتزامن)"
        : "جيتهاب لسه يحسب قابلية الدمج، أو حماية الفرع تمنعه — أعد المحاولة خلال ثوانٍ أو ادمج يدوياً من GitHub";
    return {
      merged: false,
      mergeError: `تم تحديث فرع الطالب لكن فشل الدمج التلقائي (${mergeRes.status}) — ${reason}: ${body}`,
    };
  }

  return { merged: true };
}

/** مسار "رفض" لطلب طالب معلَّق — خطة الدفعة 5 §0 خطوة 6. يُقفل PR الطالب
 * بلا أي دمج ولا أي كتابة على فرعه؛ الفرع يبقى موجوداً كما هو بلا تعديل
 * (حذفه لاحقاً يدوي اختياري بحت). تسجيل حالة "rejected" بملفات السجل يتم
 * بمسار منفصل تماماً عبر publishToGitHub — استدعِ الاثنين معاً لرفض كامل. */
export async function closePendingRequestPR({ token, owner, repo, prNumber, comment = "" }) {
  if (!token) throw new Error("مطلوب GitHub token");
  if (!owner || !repo) throw new Error("مطلوب owner/repo");
  if (!prNumber) throw new Error("مطلوب prNumber");

  if (comment) {
    await fetch(`https://api.github.com/repos/${owner}/${repo}/issues/${prNumber}/comments`, {
      method: "POST",
      headers: { ...ghHeaders(token), "Content-Type": "application/json" },
      body: JSON.stringify({ body: comment }),
    });
  }

  const res = await fetch(`https://api.github.com/repos/${owner}/${repo}/pulls/${prNumber}`, {
    method: "PATCH",
    headers: { ...ghHeaders(token), "Content-Type": "application/json" },
    body: JSON.stringify({ state: "closed" }),
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`فشل إقفال PR الطلب: ${res.status} ${body}`);
  }
  return { closed: true };
}

/** المسار ب: تصدير الحزمة كملف ZIP للتنزيل والوضع اليدوي بالريبو (Fallback بدون توكن). */
export async function exportPackageAsZip(pkg) {
  const { default: JSZip } = await import("jszip");
  const zip = new JSZip();

  zip.file(pkg.subjectPath, JSON.stringify(pkg.subjectJson, null, 2));
  zip.file(pkg.lecturesPath, JSON.stringify(pkg.lecturesJson, null, 2));
  zip.file(pkg.studyPlanPath, JSON.stringify(pkg.studyPlanJson, null, 2));
  for (const pdf of pkg.pdfFiles) {
    zip.file(pdf.path, pdf.file);
  }

  // طبقة حماية إضافية (خطة إصلاح ASCII §4.7 المحدَّثة، §3.3): platform: "UNIX"
  // يفرض ترميز UTF-8 القياسي بحقول ZIP metadata (بدل الترميز الافتراضي
  // المرتبط بـ DOS الذي كان سبب تلف "lectures-الدكتورة.json" أصلاً عند فك
  // الضغط على أنظمة مختلفة). طبقة أخيرة فقط — أسماء الملفات نفسها أصلاً
  // ASCII الآن بفضل sanitizeFileTitle/lecturesFileName أعلاه، حتى لو تسرَّب
  // نص غير متوقَّع مستقبلاً من مسار لم يُغطَّ بالتحقق.
  const blob = await zip.generateAsync({ type: "blob", platform: "UNIX" });

  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${pkg.slug}-package.zip`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);

  return blob;
}