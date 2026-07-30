// ⚠️ ملف جديد — مهمة المدير (2026-07-30). كان منطق "كيلوبايت/ميغابايت"
// مكرَّراً حرفياً بـ OfflineDownloads.jsx فقط سابقاً؛ استُخرج هنا ليُستخدم
// أيضاً بـ LectureItem.jsx (ميزة "حجم الملف + تقدّم التنزيل" الجديدة) بلا
// تكرار ثانٍ لنفس المنطق بالضبط. FileUploaderWidget.jsx (لوحة تحكم الأدمن)
// له تنسيقه الإنجليزي الخاص (KB/MB) عمداً — واجهة مختلفة، لا علاقة له بهذا.
export function formatFileSize(bytes) {
  if (!bytes && bytes !== 0) return "";
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} كيلوبايت`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} ميغابايت`;
}
