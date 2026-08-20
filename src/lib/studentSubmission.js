// ⚠️ ملف مملوك لعضو 5 (خط أنابيب النشر) — خطة الدفعة 5، القسم 2
//
// معزول بالكامل عمداً: يحمل التوكن المقيَّد الوحيد المخصَّص لطلبات الطالب
// (اقتراح حدث أو طلب رفع ملف). راجع خطة الدفعة 5 §0/§4 لتفاصيل التصميم
// الأمني الكامل ("لماذا آمن رغم إن التوكن قابل للاستخراج من الكود العام").
//
// قواعد صارمة لهذا الملف (§4 من الخطة):
// - لا يستورد ولا يُصدِّر أي شيء يخص توكن الأدمن الكامل. لا يستورد
//   githubPublisher.js ولا adminAuth.js إطلاقاً — كل ما يحتاجه (رفع فرع/ملف/PR)
//   مكرَّر هنا بشكل مستقل عمداً، حتى لو كان هذا يعني تكرار بعض المنطق مع
//   githubPublisher.js. الاستيراد الوحيد المسموح هو idSlug.js (ملف عضو 4،
//   عام بلا أي علاقة بتوكن أو صلاحيات).
// - لا توجد هنا أي دالة دمج (merge) ولا أي استدعاء لـ /pulls/{n}/merge —
//   بصرف النظر عن أي طارئ. الدمج حصراً بتوكن الأدمن الكامل، وحصراً بعد فعل
//   "قبول" صريح بلوحة التحكم (راجع buildEventDecision/buildUploadDecision +
//   mergeExistingPR بـ githubPublisher.js).
// - كل طلب يفتح فرعاً جديداً + PR يستهدف main فقط — لا كتابة مباشرة على main
//   إطلاقاً بهذا التوكن مهما كانت الحالة.
//
// submitEventRequest({ subjectId, subjectName, type, typeLabel?, title, date,
//   submittedByLabel? }) → { prUrl, prNumber, branch }
//   يفتح فرع event-request/{slug}-{timestamp}، يكتب بيانات الطلب كملف JSON
//   staging (public/data/_pending/events/{id}.json — لا يُقرأ من صفحات الطالب
//   إطلاقاً، فقط بلوحة سجل الأدمن لاحقاً)، ويفتح PR بعنوان
//   "[event] {subjectName} — {type} — {date}" (عقد §1.4).
//
// submitUploadRequest({ subjectId, subjectName, section, requestedTitle,
//   file, submittedByLabel? }) → { prUrl, prNumber, branch }
//   يفتح فرع upload-request/{slug}-{timestamp}، يرفع ملف الطالب فعلياً
//   على نفس المسار النهائي (public/pdf/{subjectId}/{fileName}) — القرار
//   المعتمَد صراحة (⚠️ محدَّث بطلب إدارة مباشر: PDF أو صورة الآن، لا PDF
//   فقط كسابقاً — لا رابط خارجي بأي الحالتين)، يكتب بيانات الطلب كملف JSON
//   staging (public/data/_pending/uploads/{id}.json)، ويفتح PR بعنوان
//   "[upload] {subjectName} — {section} — {requestedTitle}" (عقد §1.4).
//   requestData يحمل الآن `fileType: "pdf"|"image"` أيضاً — يقرأه
//   buildUploadDecision (عضو 5، githubPublisher.js) ليبني عنصر lectures.json
//   بنوع صحيح بدل افتراض pdf دائماً (توافق عكسي: غيابه لدى طلبات قديمة قبل
//   هذا التحديث يُعامَل كـ "pdf").
//   ⚠️ الملف غير مرئي بالموقع الحي رغم رفعه الفعلي: هو بفرع منفصل عن main،
//   وحتى بعد القبول لن يظهر إلا بعد إضافة عنصر يشير له بـ lectures*.json
//   (تفعله buildUploadDecision بتوكن الأدمن — راجع githubPublisher.js).

import { transliterateToSlug, sanitizeFileName } from "./idSlug.js";

// أنواع الملفات المسموحة لرفع الطالب: PDF أو صورة (png/jpeg/webp — لا SVG،
// نفس القيد الأمني بالضبط المطبَّق برافع الأدمن، githubPublisher.js
// IMAGE_MIME_TO_EXT). خريطة مكرَّرة عمداً هنا (لا استيراد من githubPublisher.js
// — عزل التوكن أعلى الملف)، تُستخدَم أيضاً بامتدادات معروفة لتفادي تكرارها
// بعنوان الملف (مثال: "عنوان.png.png").
const ALLOWED_UPLOAD_MIME = {
  "application/pdf": { ext: "pdf", type: "pdf" },
  "image/png": { ext: "png", type: "image" },
  "image/jpeg": { ext: "jpg", type: "image" },
  "image/webp": { ext: "webp", type: "image" },
};
const KNOWN_EXT_PATTERN = /\.(pdf|png|jpe?g|webp)$/i;

// خطة الدفعة 5 §0.1: يُقرأ من متغير بيئة وقت البناء فقط — لا قيمة افتراضية
// مكتوبة هنا. صلاحياته المطلوبة حصراً: Contents: Write + Pull requests:
// Write، على هذا الريبو وحده — بلا صلاحية دمج أو إدارة إطلاقاً.
const STUDENT_TOKEN = import.meta.env.VITE_UPLOAD_TOKEN || "";

// مكرَّرة عمداً هنا (لا استيراد من adminAuth.js) — راجع ملاحظة العزل أعلى الملف.
const OWNER = "Omar-218";
const REPO = "QPU_assistant_404";
const BASE_BRANCH = "main";

function ghHeaders() {
  return {
    Authorization: `Bearer ${STUDENT_TOKEN}`,
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
  };
}

function textToBase64(text) {
  return btoa(unescape(encodeURIComponent(text)));
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

/** لأسماء الفروع/refs فقط — لازم ASCII (git ref لا يقبل كل يونيكود بأمان
 * بكل الأدوات). لا علاقة لها باسم الملف الفعلي المرفوع (راجع sanitizeFileName
 * المستورَدة من idSlug.js أدناه لتلك الحالة — تحديث بطلب إدارة مباشر: اسم
 * الملف الفعلي يطابق الآن ما يكتبه الطالب/الآدمن بالضبط، بلا تحويل لاتيني). */
function sanitizeBranchSlug(text) {
  const withoutExt = String(text || "").trim().replace(/\.pdf$/i, "");
  return transliterateToSlug(withoutExt).replace(/-/g, "_");
}

/** يبني مسار GitHub API آمناً بترميز كل جزء على حدة — نفس السبب بالضبط
 * الموثَّق بـ githubPublisher.js (عضو 5): أسماء الملفات صارت تحتوي عربي/
 * مسافات فعلياً الآن، ومسار fetch() الخام لا يقبلها بدون ترميز. */
function encodeGitHubPath(path) {
  return String(path)
    .split("/")
    .map((segment) => encodeURIComponent(segment))
    .join("/");
}

function makeId(prefix) {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
}

function assertTokenConfigured(fnName) {
  if (!STUDENT_TOKEN) {
    throw new Error(
      `${fnName}: توكن طلبات الطلاب غير مُهيَّأ (VITE_UPLOAD_TOKEN) — راجع خطة الدفعة 5 §0.1`
    );
  }
}

async function createRequestBranch(branchName) {
  const refRes = await fetch(
    `https://api.github.com/repos/${OWNER}/${REPO}/git/ref/heads/${BASE_BRANCH}`,
    { headers: ghHeaders() }
  );
  if (!refRes.ok) throw new Error(`تعذّر قراءة الفرع الأساسي: ${refRes.status}`);
  const baseSha = (await refRes.json()).object.sha;

  const createRes = await fetch(`https://api.github.com/repos/${OWNER}/${REPO}/git/refs`, {
    method: "POST",
    headers: { ...ghHeaders(), "Content-Type": "application/json" },
    body: JSON.stringify({ ref: `refs/heads/${branchName}`, sha: baseSha }),
  });
  if (!createRes.ok) {
    const body = await createRes.text();
    throw new Error(`تعذّر إنشاء فرع الطلب: ${createRes.status} ${body}`);
  }
}

async function putRequestFile(path, branch, message, base64Content) {
  const res = await fetch(
    `https://api.github.com/repos/${OWNER}/${REPO}/contents/${encodeGitHubPath(path)}`,
    {
      method: "PUT",
      headers: { ...ghHeaders(), "Content-Type": "application/json" },
      body: JSON.stringify({ message, content: base64Content, branch }),
    }
  );
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`فشل رفع ${path}: ${res.status} ${body}`);
  }
}

async function openRequestPR(branch, title, body) {
  const res = await fetch(`https://api.github.com/repos/${OWNER}/${REPO}/pulls`, {
    method: "POST",
    headers: { ...ghHeaders(), "Content-Type": "application/json" },
    body: JSON.stringify({ title, head: branch, base: BASE_BRANCH, body }),
  });
  if (!res.ok) {
    const body2 = await res.text();
    throw new Error(`تم إنشاء الفرع لكن فشل فتح طلب الدمج: ${res.status} ${body2}`);
  }
  const data = await res.json();
  return { prUrl: data.html_url, prNumber: data.number, branch };
}

/** يقدّم طلب اقتراح حدث جديد من طالب — بلا أي دمج، فقط فرع + PR بالطابور. */
export async function submitEventRequest({
  subjectId,
  subjectName,
  type,
  typeLabel = "",
  title,
  date,
  submittedByLabel = "",
}) {
  assertTokenConfigured("submitEventRequest");
  if (!subjectId || !title || !date) {
    throw new Error("submitEventRequest: subjectId وtitle وdate مطلوبة");
  }
  const validTypes = ["exam", "quiz", "midterm", "homework", "other"];
  const finalType = validTypes.includes(type) ? type : "other";
  if (finalType === "other" && !typeLabel.trim()) {
    throw new Error('submitEventRequest: typeLabel مطلوب عند type="other"');
  }

  const id = makeId("evt");
  const slug = sanitizeBranchSlug(subjectId) || subjectId;
  const branch = `event-request/${slug}-${Date.now()}`;
  await createRequestBranch(branch);

  const requestData = {
    id,
    subjectId,
    subjectName: subjectName || subjectId,
    type: finalType,
    typeLabel: finalType === "other" ? typeLabel.trim() : "",
    title,
    date,
    submittedByLabel,
    createdAt: new Date().toISOString(),
  };

  await putRequestFile(
    `public/data/_pending/events/${id}.json`,
    branch,
    `طلب حدث جديد — ${requestData.subjectName}`,
    textToBase64(JSON.stringify(requestData, null, 2))
  );

  const prTitle = `[event] ${requestData.subjectName} — ${requestData.type} — ${requestData.date}`;
  const prBody = "```json\n" + JSON.stringify(requestData, null, 2) + "\n```";
  return openRequestPR(branch, prTitle, prBody);
}

/** يقدّم طلب رفع ملف PDF جديد من طالب — يرفع الملف فعلياً على الفرع، بلا أي
 * دمج (الملف غير مرئي بالموقع الحي حتى يقبله الأدمن — راجع توثيق أعلى الملف). */
export async function submitUploadRequest({
  subjectId,
  subjectName,
  section,
  requestedTitle,
  file,
  submittedByLabel = "",
}) {
  assertTokenConfigured("submitUploadRequest");
  if (!subjectId || !requestedTitle || !file) {
    throw new Error("submitUploadRequest: subjectId وrequestedTitle وfile مطلوبة");
  }
  // ⚠️ محدَّث بطلب إدارة مباشر: PDF أو صورة (png/jpeg/webp) الآن، لا PDF فقط
  // كسابقاً — لا رابط خارجي ولا أي نوع محتوى آخر لطلبات الطلاب.
  const allowed = ALLOWED_UPLOAD_MIME[file.type];
  if (!allowed) {
    throw new Error("submitUploadRequest: مسموح فقط برفع PDF أو صورة (PNG/JPEG/WEBP)");
  }
  const { ext, type: fileType } = allowed;

  const id = makeId("upl");
  const slug = sanitizeBranchSlug(subjectId) || subjectId;
  const branch = `upload-request/${slug}-${Date.now()}`;
  await createRequestBranch(branch);

  // ⚠️ تحديث (طلب إدارة مباشر): اسم الملف الفعلي يطابق العنوان الذي كتبه
  // الطالب بالضبط (بلا تحويل لاتيني) — نفس القرار المطبَّق بـ githubPublisher.js
  // (عضو 5). نشيل أي امتداد معروف لو الطالب كتبه بنفسه بالعنوان لتفادي
  // "عنوان.png.png"، ثم نضيف امتداد الملف الفعلي المكتشَف من نوعه (لا من
  // النص المكتوب — يمنع عنواناً يوهم بامتداد مختلف عن المحتوى الحقيقي).
  const titleWithoutExt = String(requestedTitle || "").trim().replace(KNOWN_EXT_PATTERN, "");
  const fallbackWithoutExt = String(file.name || "").trim().replace(KNOWN_EXT_PATTERN, "");
  const baseName = sanitizeFileName(titleWithoutExt) || sanitizeFileName(fallbackWithoutExt) || "file";
  const fileName = `${baseName}.${ext}`;
  const filePath = `public/pdf/${subjectId}/${fileName}`;
  const base64Content = await fileToBase64(file);
  await putRequestFile(filePath, branch, `رفع ملف مقترح — ${fileName}`, base64Content);

  const requestData = {
    id,
    subjectId,
    subjectName: subjectName || subjectId,
    section: section || "theory",
    requestedTitle,
    fileName,
    fileType,
    submittedByLabel,
    createdAt: new Date().toISOString(),
  };

  await putRequestFile(
    `public/data/_pending/uploads/${id}.json`,
    branch,
    `بيانات طلب رفع — ${requestData.subjectName}`,
    textToBase64(JSON.stringify(requestData, null, 2))
  );

  const prTitle = `[upload] ${requestData.subjectName} — ${requestData.section} — ${requestedTitle}`;
  const prBody = "```json\n" + JSON.stringify(requestData, null, 2) + "\n```";
  return openRequestPR(branch, prTitle, prBody);
}
