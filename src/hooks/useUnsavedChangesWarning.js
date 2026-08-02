import { useEffect } from "react";

// ⚠️ ملف جديد — مهمة المدير (طلب مباشر من المستخدم، 2026-08-02، اقتراح #6 من
// مراجعة خبير للوحة التحكم): تحذير عند مغادرة الصفحة بتعديلات غير منشورة.
// hook عام بسيط بمعزل عن أي منطق نموذج محدَّد — كل مستهلك (SubjectForm.jsx,
// AdminSectionsManager.jsx, StudyPlanEditor.jsx) يحسب "warn" بنفسه (تعريف
// "تغيير" يختلف بكل نموذج) ويمرّره هنا فقط.
//
// ملاحظة: كل المتصفحات الحديثة تتجاهل أي نص رسالة مخصَّص بـ beforeunload لأسباب
// أمنية (منع خداع المستخدم برسائل مزيّفة) وتعرض حوارها القياسي الخاص بها دائماً
// — لذلك `e.returnValue` هنا قيمة شكلية فقط (بعض المتصفحات القديمة تتطلبها
// لتفعيل الحوار)، لا يوجد نص عربي مخصَّص ممكن فعلياً هنا.
export function useUnsavedChangesWarning(warn) {
  useEffect(() => {
    if (!warn) return undefined;
    function handleBeforeUnload(e) {
      e.preventDefault();
      e.returnValue = "";
      return "";
    }
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [warn]);
}
