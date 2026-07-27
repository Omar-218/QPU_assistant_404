// ⚠️ ملف مملوك لعضو 4 (منطق البيانات) — القسم 4.5
// يُطبَّق على 3 مستويات: مادة → قسم → عنصر محاضرة

/**
 * true إذا الكائن (مادة، عنصر خطة دراسية، قسم، أو محاضرة) يجب أن يظهر.
 * الاسم الرسمي المعتمد إدارياً بمراجعة الجولة 2 (§2.1) — team-plan-v2.md §4.5
 * صُحِّح ليطابق هذا الاسم فعلياً.
 */
export function isVisible(subjectOrPlanEntry) {
  return !subjectOrPlanEntry?.hidden;
}

/**
 * يستبعد الأقسام المخفية وعناصرها المخفية من بيانات lectures.json
 * الشكل الفعلي المعتمد (مطابق لـ docs/data-schema.md §2 وبيانات البذرة):
 * { sections: [{ section, hidden, items: [{ title, file, hidden }] }] }
 */
export function filterVisibleSections(lecturesData) {
  if (!lecturesData?.sections) return lecturesData;
  return {
    ...lecturesData,
    sections: lecturesData.sections
      .filter((s) => isVisible(s))
      .map((s) => ({
        ...s,
        items: (s.items || []).filter((item) => isVisible(item)),
      })),
  };
}
