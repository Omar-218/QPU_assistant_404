// ⚠️ ملف جديد — مهمة المدير (طلب مباشر من المستخدم، 2026-07-30):
// "صفحات كل المواد المفضّلة قابلة للعرض حتى بدون إنترنت".
//
// الفكرة: sw.js الموجود أصلاً يخزّن أي طلب data/**.json ناجح تلقائياً
// (استراتيجية "الشبكة أولاً، والكاش عند الفشل" — راجع public/sw.js). المشكلة
// الوحيدة: هذا التخزين يحدث فقط لو الطالب *زار* صفحة المادة فعلياً وهو متصل.
// مادة مفضّلة لم تُزَر بعد (أو تغيّر محتواها منذ آخر زيارة) تبقى بلا كاش،
// فتفشل بالكامل عند فتحها بدون نت رغم كونها مفضّلة.
//
// الحل هنا: طلب fetch() عادي صريح لـ subject.json + ملف محاضرات الدكتور
// النشِط فقط (نفس الملفين اللذين useSubjectData.js يجلبهما لعرض الصفحة —
// لا داعٍ لجلب كل professorVariants، الطالب يرى واحداً فقط أصلاً). هذا
// الطلب يمرّ عبر sw.js بنفس مسار أي طلب صفحة عادي فيُخزَّن تلقائياً بلا أي
// حاجة لتعديل sw.js نفسه أو معرفة تفاصيله هنا.
//
// ⚠️ لا يُنزَّل هنا أي ملف pdf/image فعلي داخل المحاضرات — ذاك يبقى اختيارياً
// صراحة عبر زر "⭳ تنزيل" بـ LectureItem.jsx (useOfflineFiles.js)، بمعزل تام.
// هذا الملف يغطي فقط "عنوان المادة + قائمة عناوين محاضراتها" بدون نت،
// بالضبط ما طلبه المستخدم ("صفحات المواد قابلة للعرض").

import { resolveLecturesFile } from "./professorVariants.js";

// يجلب صفحة مادة واحدة بصمت — يُستدعى مرة لكل مادة مفضّلة، لا يرمي أبداً
// (فشل شبكة/عدم اتصال أثناء الاستدعاء نفسه أمر متوقّع وغير حرِج هنا).
export async function prefetchSubjectForOffline(subjectId) {
  const base = import.meta.env.BASE_URL;
  try {
    const subjectRes = await fetch(`${base}data/subjects/${subjectId}/subject.json`);
    if (!subjectRes.ok) return;
    const subject = await subjectRes.json();
    const lecturesFile = resolveLecturesFile(subject);
    await fetch(`${base}data/subjects/${subjectId}/${lecturesFile}`);
  } catch {
    // بلا اتصال أو تعذّر الجلب — لا داعٍ لأي رسالة خطأ، هذا تحديث كاش صامت
    // بالخلفية، ليس إجراءً طلبه المستخدم مباشرة بهذه اللحظة.
  }
}

// يُستدعى بكل المواد المفضّلة معاً (عند تحميل FavoritesSection.jsx، وعند أي
// إضافة/حذف من المفضلة) — Promise.all بلا انتظار تسلسلي غير ضروري.
export async function prefetchFavoriteSubjectsOffline(subjectIds = []) {
  await Promise.all(subjectIds.map((id) => prefetchSubjectForOffline(id)));
}
