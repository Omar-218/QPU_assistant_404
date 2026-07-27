import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

// ⚠️ مصحَّح إدارياً (دعم إنتاج): كان "./" لا يعمل بشكل موثوق مع مسارات
// react-router الفرعية على GitHub Pages تحت /QPU_assistant_404/. صار مطلقاً
// ومطابقاً لاسم الريبو الفعلي (حُدِّث بعد نقل الريبو إلى QPU_assistant_404).
export default defineConfig({
  plugins: [react(), tailwindcss()],
  base: "/QPU_assistant_404/",
});
