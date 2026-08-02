import React from "react";

// ⚠️ ملف جديد — مهمة المدير (2026-08-02، طلب مباشر من المستخدم: "الرجوع
// للخلف بعد قطع النت يعرض صفحة بيضاء، يضطر لإعادة تحميل يدوياً").
//
// السبب الجذري الأرجح: بدون نت، بعض مكوّنات الصفحة تعتمد على بيانات قد لا
// تكون مخزَّنة بكاش sw.js بعد (مثال حقيقي أصلحته بنفس الجلسة:
// fetchFlatCurriculum بـlib/curriculum.js كانت ترمي استثناءً غير مُمسوك عند
// فشل الشبكة). أي استثناء غير مُمسوك أثناء العرض (render) يوقف React عن عرض
// أي شيء بالكامل — هذا "الشاشة البيضاء" حرفياً، وهو السلوك الافتراضي لـ React
// عند غياب حاجز أخطاء، بصرف النظر عن مصدر الاستثناء بالضبط.
//
// حاجز الأخطاء هذا يغلّف كل التطبيق (main.jsx، خارج BrowserRouter لضمان
// تغطية حتى استثناءات الراوتر نفسه) — بدل الشاشة البيضاء الصامتة، يظهر
// للطالب رسالة واضحة + زر "إعادة المحاولة" بضغطة واحدة، بلا حاجة يفتش بنفسه
// عن طريقة لإعادة تحميل المتصفح. **لا يمنع سبب الخطأ نفسه** (ذاك يُعالَج
// حالة بحالة بمصدره الفعلي كلما اكتُشف، كما بالإصلاح أعلاه) — فقط يضمن أن أي
// خطأ مستقبلي غير متوقَّع، مهما كان مصدره، يبقى قابلاً للتعافي بضغطة واحدة
// بدل شاشة بيضاء مربِكة تتطلب معرفة مسبقة بزر تحديث المتصفح.
//
// Class Component وليس دالة: حواجز الأخطاء (componentDidCatch) لا تدعم Hooks
// بعد بـ React — قيد إطار العمل نفسه، لا خيار تصميم هنا.
//
// أنماط inline صراحة (لا Tailwind): لو سبب الخطأ فشل تحميل CSS نفسه (احتمال
// حقيقي بدون نت لو ملف الأنماط لم يُخزَّن بالكاش)، صنوف Tailwind قد لا تُطبَّق
// إطلاقاً — الأنماط المضمَّنة هنا تضمن ظهور الرسالة والزر بشكل مقروء بكل
// الأحوال، بمعزل تام عن نجاح/فشل تحميل أي ملف CSS خارجي.

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, info) {
    // لا رصد خارجي (Sentry إلخ) بهذا المشروع أصلاً — تسجيل بالكونسول يكفي
    // للتشخيص المحلي (أدوات المطوّر)، بلا إرسال أي بيانات لأي طرف ثالث.
    console.error("ErrorBoundary caught:", error, info);
  }

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <div
        dir="rtl"
        style={{
          position: "fixed",
          inset: 0,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: "14px",
          padding: "24px",
          textAlign: "center",
          fontFamily: "system-ui, sans-serif",
          background: "#0b0b0c",
          color: "#e5e5e5",
          zIndex: 999999,
        }}
      >
        <p style={{ fontSize: "16px", maxWidth: "320px", lineHeight: 1.6 }}>
          حدث خطأ غير متوقّع بعرض الصفحة (قد يكون بسبب انقطاع الاتصال بالإنترنت)
        </p>
        <button
          type="button"
          onClick={() => window.location.reload()}
          style={{
            padding: "10px 22px",
            borderRadius: "8px",
            border: "1px solid #666",
            background: "#1c1c1e",
            color: "#e5e5e5",
            fontSize: "14px",
            cursor: "pointer",
          }}
        >
          🔄 إعادة المحاولة
        </button>
      </div>
    );
  }
}
