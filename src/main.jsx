import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App.jsx";
import "./index.css";

// ⚠️ ملف مملوك للمدير — لا يُعدَّل من قبل أي عضو
// basename مصحَّح إدارياً (دعم إنتاج): بدونه، كل الروابط الداخلية كانت
// تتولّد بدون بادئة /assistant_404/ فتؤدي لروابط 404 حقيقية على GitHub Pages.
// import.meta.env.BASE_URL يُقرأ تلقائياً من "base" بـ vite.config.js.

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <BrowserRouter basename={import.meta.env.BASE_URL}>
      <App />
    </BrowserRouter>
  </React.StrictMode>
);
