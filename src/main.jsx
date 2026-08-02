import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App.jsx";
import ErrorBoundary from "./components/ErrorBoundary.jsx";
import "./index.css";

// ⚠️ ملف مملوك للمدير — لا يُعدَّل من قبل أي عضو
// basename مصحَّح إدارياً (دعم إنتاج): بدونه، كل الروابط الداخلية كانت
// تتولّد بدون بادئة /assistant_404/ فتؤدي لروابط 404 حقيقية على GitHub Pages.
// import.meta.env.BASE_URL يُقرأ تلقائياً من "base" بـ vite.config.js.
//
// ⚠️ تحديث إداري (2026-08-02، إصلاح "صفحة بيضاء عند الرجوع للخلف بدون
// إنترنت"): ErrorBoundary يغلّف التطبيق كاملاً، خارج BrowserRouter عمداً
// (تغطية حتى استثناءات الراوتر نفسه، لا فقط مكوّنات الصفحات). راجع تعليق
// ErrorBoundary.jsx الكامل للتشخيص والتعليل.

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <ErrorBoundary>
      <BrowserRouter basename={import.meta.env.BASE_URL}>
        <App />
      </BrowserRouter>
    </ErrorBoundary>
  </React.StrictMode>
);

// ⚠️ جديد (إكمال ميزة "تصفح المواد بدون إنترنت"، 2026-07-30): تسجيل
// Service Worker لتخزين أصول التطبيق وبيانات data/**.json أثناء التصفح
// المتصل، ليعمل فتح الصفحات المُزارة سابقاً بلا اتصال لاحقاً — راجع
// public/sw.js للاستراتيجية الكاملة والتعليل. import.meta.env.BASE_URL
// (لا "/sw.js" مباشرة) لأن الموقع يُنشَر بمسار فرعي (/QPU_assistant_404/)
// بـGitHub Pages — نفس السبب بالضبط الموثَّق أعلاه لـ basename.
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker
      .register(`${import.meta.env.BASE_URL}sw.js`)
      .catch(() => {
        // فشل التسجيل (متصفح قديم/وضع خاص لا يدعمه، إلخ) — نتجاهل بصمت،
        // الموقع يستمر يعمل عادياً بالاتصال، فقط بلا دعم أوفلاين للصفحة.
      });
  });
}
