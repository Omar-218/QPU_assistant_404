import React, { useState } from "react";
import { Link } from "react-router-dom";
import { useFavorites } from "../../hooks/useFavorites.js";
import { useNotifySubscriptions } from "../../hooks/useNotifySubscriptions.js";

// ⚠️ ملف مملوك لعضو 2 — بطاقة عرض مادة واحدة بصفحة قائمة المواد (SubjectList.jsx).
// الدفعة 4 (المهمة 4): زر "⭐ تفضيل" مضاف هنا (قرار: هنا وليس بـ Subject.jsx،
// لأن القائمة/البطاقات هي سياق التصفح والتفضيل الطبيعي).
//
// ⚠️ ميزة جديدة (طلب مباشر من المستخدم، 2026-07-29): فور إضافة مادة للمفضلة
// (مو عند الإزالة)، تظهر لحظة سؤال صغيرة أسفل البطاقة: "تريد إشعارات
// بتحديثات هذي المادة؟" — هذا هو "سؤال المستخدم" المطلوب حرفياً بالطلب، بمكان
// وزمان طبيعيين (لحظة الإضافة نفسها، لا نافذة منبثقة مزعجة). يمكن تغيير
// الاختيار لاحقاً بأي وقت من نفس النقطة (زر جرس) بقسم "⭐ المفضلة" بالشريط
// الجانبي (FavoritesSection.jsx) — راجع تعليقه.
//
// ⚠️ تحديث إداري (2026-07-31، ميزة "تثبيت المواد"): نفس زر/تخزين المفضلة
// هذا صار له تأثير مضاعف أيضاً — يضيف المادة لقسم "📌 المثبّتة" أعلى
// SubjectList.jsx (راجع تعليق ذلك الملف). عدّلت هنا فقط aria-label/title
// ليعكسا المعنى الجديد بوضوح للطالب — بلا أي تغيير بمنطق الإشعارات أعلاه.

export default function SubjectCard({ subject }) {
  const { isFavorite, toggleFavorite } = useFavorites();
  const { isSubscribed, setSubscribed } = useNotifySubscriptions();
  const favorite = isFavorite(subject.id);
  const subscribed = isSubscribed(subject.id);
  // true فقط أثناء "لحظة السؤال" (بعد إضافة فعلية للمفضلة بهذا التفاعل، لا
  // عند كل عرض للبطاقة) — تُغلَق فور اختيار المستخدم أو بالضغط خارجها.
  const [askingNotify, setAskingNotify] = useState(false);

  function handleToggleFavorite(e) {
    e.preventDefault();
    e.stopPropagation();
    const willBeFavorite = !favorite;
    toggleFavorite(subject.id);
    if (willBeFavorite && !subscribed) {
      setAskingNotify(true);
    } else {
      setAskingNotify(false);
    }
  }

  function answerNotify(e, wantsNotify) {
    e.preventDefault();
    e.stopPropagation();
    setSubscribed(subject.id, wantsNotify);
    setAskingNotify(false);
  }

  return (
    <div className="relative rounded-lg border border-border bg-bg-elevated p-4 transition-colors hover:border-accent">
      <button
        type="button"
        onClick={handleToggleFavorite}
        aria-label={favorite ? "إلغاء تثبيت المادة" : "تثبيت المادة بأعلى القائمة"}
        title={favorite ? "إلغاء تثبيت المادة" : "تثبيت المادة بأعلى القائمة"}
        className={`absolute left-3 top-3 text-lg leading-none ${
          favorite ? "text-warning-text" : "text-text-muted hover:text-text"
        }`}
      >
        {favorite ? "★" : "☆"}
      </button>
      <Link to={`/subject/${subject.id}`} className="block pl-2">
        <h3 className="break-words pr-6 font-bold text-text-h">{subject.name}</h3>
        {subject.code && (
          <p className="mt-1 text-xs text-text-muted">{subject.code}</p>
        )}
      </Link>

      {askingNotify && (
        <div className="mt-3 flex items-center justify-between gap-2 rounded-md border border-accent bg-bg-subtle px-3 py-2 text-xs">
          <span className="text-text">🔔 تريد إشعارات بتحديثات هذي المادة؟</span>
          <div className="flex shrink-0 gap-1">
            <button
              type="button"
              onClick={(e) => answerNotify(e, true)}
              className="rounded-md border border-accent px-2 py-1 text-text-h hover:bg-bg-elevated"
            >
              نعم
            </button>
            <button
              type="button"
              onClick={(e) => answerNotify(e, false)}
              className="rounded-md border border-border px-2 py-1 text-text-muted hover:bg-bg-elevated"
            >
              لا شكراً
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
