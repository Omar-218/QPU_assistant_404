// ⚠️ ملف مملوك لعضو 4 (منطق البيانات) — القسم 4.3
// انتقل شبه جاهز من المشروع الأول (professorVariants.js) — أعد استخدام نفس
// المنطق مع تكييفه على عقد useSubjectData الجديد.

export function hasProfessorVariants(subject) {
  return Array.isArray(subject?.professorVariants) && subject.professorVariants.length > 0;
}

export function getActiveVariant(subject) {
  if (!hasProfessorVariants(subject)) return null;
  return (
    subject.professorVariants.find((v) => v.active) ||
    subject.professorVariants[0]
  );
}

export function getAllVariants(subject) {
  return hasProfessorVariants(subject) ? subject.professorVariants : [];
}

export function resolveLecturesFile(subject) {
  const active = getActiveVariant(subject);
  return active?.lecturesFile || "lectures.json";
}
