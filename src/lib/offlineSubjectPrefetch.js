// ⚠️ ملف مملوك لمهمة المدير — "صفحات كل المواد المفضّلة قابلة للعرض حتى بدون
// إنترنت" (2026-07-30)، طُوِّر لاحقاً (2026-08-01، طلب مباشر من المستخدم:
// "طوّر طريقة حفظ الصفحات بلا انترنت") لسد فجوتين حقيقيتين بالنسخة الأولى:
//
//   1. **لا تحكّم يدوي**: الحفظ كان مربوطاً حصراً بالتفضيل/التثبيت (⭐) —
//      طالب يريد حفظ مادة *واحدة* مهمة بدون تثبيتها دائماً لم يقدر.
//   2. **لا رؤية إطلاقاً**: الحفظ كان صامتاً بالكامل (Promise بلا أي أثر
//      مرئي) — الطالب ما عنده أي طريقة يعرف فيها "هل هذي الصفحة فعلاً محفوظة
//      بدون نت أم لا؟" قبل ما يجرّب فعلياً بدون اتصال.
//
// الحل: طبقة تتبّع صريحة بـ localStorage (نفس نمط useFavorites.js/
// useRecentlyViewed.js تماماً — قراءة/كتابة متزامنة + CustomEvent للمزامنة
// الفورية بين المكوّنات بنفس التبويب)، فوق نفس آلية الجلب الأصلية بلا تغيير
// بجوهرها: طلب fetch() عادي صريح لـ subject.json + ملف محاضرات الدكتور
// النشِط فقط، يمرّ عبر sw.js (الاستراتيجية "شبكة أولاً، كاش عند النجاح")
// فيُخزَّن تلقائياً بلا أي حاجة لتعديل sw.js نفسه أو معرفة تفاصيله هنا.
//
// ⚠️ لا يُنزَّل هنا أي ملف pdf/image فعلي داخل المحاضرات — ذاك يبقى اختيارياً
// صراحة عبر زر "⭳ تنزيل" بـ LectureItem.jsx (useOfflineFiles.js)، بمعزل تام.
// هذا الملف يغطي فقط "عنوان المادة + قائمة عناوين محاضراتها" بدون نت.
//
// نقطتا استدعاء الحفظ الآن:
//   - ضمنياً: FavoritesSection.jsx (كل مادة مثبَّتة/مفضّلة — بلا تغيير بالسلوك).
//   - صراحة: زر "📥 حفظ هذه الصفحة بدون إنترنت" بصفحة أي مادة (Subject.jsx) —
//     جديد، يعمل لأي مادة بصرف النظر عن حالة التثبيت.
// كلا المسارين يسجّلان بنفس قائمة التتبّع أدناه، فتظهر بصفحة "/offline"
// (OfflineDownloads.jsx) بقسم واحد موحَّد بغض النظر عن مصدر الحفظ.

import { resolveLecturesFile } from "./professorVariants.js";

const STORAGE_KEY = "assistant404:offline-subject-pages";
export const OFFLINE_SUBJECT_PAGES_CHANGE_EVENT = "assistant404:offline-subject-pages-changed";

// ⚠️ يجب أن يطابق CACHE_NAME بـ public/sw.js حرفياً — الملفان لا يشتركان
// بوحدة استيراد واحدة (sw.js سكربت خام خارج نظام وحدات Vite بالكامل)، فهذا
// تكرار مقصود موثَّق. أي رفع لرقم إصدار الكاش بـ sw.js (v2 → v3...) يجب أن
// يُرفَق برفع مطابق هنا، وإلا ستفشل removeSavedSubjectPage صامتاً (أثر محدود:
// إدخالات كاش قديمة صغيرة الحجم تبقى محجوزة بلا ضرر فعلي، فقط تتبّع القائمة
// يبقى صحيحاً دائماً بصرف النظر).
const SW_CACHE_NAME = "assistant404-shell-v3";

function readStored() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeStored(list) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
  } catch {
    // localStorage قد يكون غير متاح (وضع خاص، إلخ) — تجاهل بصمت
  }
  try {
    window.dispatchEvent(new CustomEvent(OFFLINE_SUBJECT_PAGES_CHANGE_EVENT));
  } catch {
    // تجاهل بصمت — لا window (لن يحدث فعلياً بهذا المشروع)
  }
}

export function listSavedSubjectPages() {
  return readStored();
}

export function isSubjectPageSaved(subjectId) {
  return readStored().some((r) => r.subjectId === subjectId);
}

function recordSaved({ subjectId, subjectName, lecturesFile }) {
  const list = readStored().filter((r) => r.subjectId !== subjectId);
  list.unshift({ subjectId, subjectName, lecturesFile, savedAt: Date.now() });
  writeStored(list);
}

// يجلب صفحة مادة واحدة، ويسجّلها بقائمة التتبّع عند النجاح فقط. يرجّع
// true/false (بدل رمي استثناء دائماً) — الاستدعاء الصامت من FavoritesSection.jsx
// يتجاهل القيمة المرجَعة، لكن الاستدعاء اليدوي الجديد من Subject.jsx يحتاجها
// لعرض رسالة نجاح/فشل واضحة للطالب (نفس مبدأ handleFreshDownload بـ LectureItem.jsx).
export async function prefetchSubjectForOffline(subjectId) {
  const base = import.meta.env.BASE_URL;
  try {
    const subjectRes = await fetch(`${base}data/subjects/${subjectId}/subject.json`);
    if (!subjectRes.ok) return false;
    const subject = await subjectRes.json();
    const lecturesFile = resolveLecturesFile(subject);
    const lecturesRes = await fetch(`${base}data/subjects/${subjectId}/${lecturesFile}`);
    if (!lecturesRes.ok) return false;
    recordSaved({ subjectId, subjectName: subject.name, lecturesFile });
    return true;
  } catch {
    return false;
  }
}

// يُستدعى بكل المواد المفضّلة معاً (عند تحميل FavoritesSection.jsx، وعند أي
// إضافة/حذف من المفضلة) — Promise.all بلا انتظار تسلسلي غير ضروري. صامت
// بالكامل (لا يُستخدَم من طرف يحتاج معرفة النتيجة فرداً بفرد).
export async function prefetchFavoriteSubjectsOffline(subjectIds = []) {
  await Promise.all(subjectIds.map((id) => prefetchSubjectForOffline(id)));
}

// إزالة مادة من قائمة التتبّع + أفضل جهد لحذف إدخالات الكاش الفعلية المرتبطة
// بها (لن يفشل بصمت لو تعذّر — القائمة تبقى صحيحة دائماً بصرف النظر عن نجاح
// حذف الكاش نفسه، راجع تعليق SW_CACHE_NAME أعلاه).
export async function removeSavedSubjectPage(subjectId) {
  const list = readStored();
  const entry = list.find((r) => r.subjectId === subjectId);
  writeStored(list.filter((r) => r.subjectId !== subjectId));
  if (!entry || typeof caches === "undefined") return;
  try {
    const base = import.meta.env.BASE_URL;
    const cache = await caches.open(SW_CACHE_NAME);
    await cache.delete(`${base}data/subjects/${subjectId}/subject.json`);
    if (entry.lecturesFile) {
      await cache.delete(`${base}data/subjects/${subjectId}/${entry.lecturesFile}`);
    }
  } catch {
    // أفضل جهد فقط — تجاهل بصمت
  }
}
