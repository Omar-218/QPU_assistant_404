import { useEffect, useState } from "react";
import { getActiveVariant, resolveLecturesFile } from "../lib/professorVariants.js";
import { isVisible, filterVisibleSections } from "../lib/hiddenFilter.js";

// ⚠️ ملف مملوك لعضو 4 — القسم 4.6
// هذا هو العقد الذي يستهلكه عضو 2 (صفحات الطالب) دون أي معرفة بتفاصيل
// professorVariants أو hidden. لا تغيّر شكل القيمة المُرجَعة بدون تنسيق مع المدير.

export function useSubjectData(id) {
  const [state, setState] = useState({
    subject: null,
    activeProfessor: null,
    lectures: null,
    loading: true,
    notFound: false,
  });

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setState((s) => ({ ...s, loading: true, notFound: false }));
      try {
        const subjectRes = await fetch(`${import.meta.env.BASE_URL}data/subjects/${id}/subject.json`);
        if (!subjectRes.ok) throw new Error("not-found");
        const subject = await subjectRes.json();

        if (!isVisible(subject)) throw new Error("not-found");

        const activeProfessor = getActiveVariant(subject);
        const lecturesFile = resolveLecturesFile(subject);
        const lecturesRes = await fetch(`${import.meta.env.BASE_URL}data/subjects/${id}/${lecturesFile}`);
        const rawLectures = lecturesRes.ok ? await lecturesRes.json() : null;
        const lectures = rawLectures ? filterVisibleSections(rawLectures) : null;

        if (!cancelled) {
          setState({ subject, activeProfessor, lectures, loading: false, notFound: false });
        }
      } catch {
        if (!cancelled) {
          setState({ subject: null, activeProfessor: null, lectures: null, loading: false, notFound: true });
        }
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [id]);

  return state;
}
