// ⚠️ ملف جديد — مهمة المدير (إكمال ميزة "تصفح المواد بدون إنترنت"، 2026-07-30).
// يحل السبب الجذري الحقيقي: بدون Service Worker، لا يقدر أي متصفح يفتح
// الصفحة إطلاقاً بلا اتصال (لا React يبدأ حتى) — تخزين IndexedDB لملفات
// المحاضرات (offlineFiles.js) كان يعمل صحيحاً، لكن لا فائدة منه ما دام
// التطبيق نفسه لا يُحمَّل من الأساس.
//
// الاستراتيجية: "الشبكة أولاً، والكاش عند الفشل" (network-first, fallback
// to cache) لكل طلب GET من نفس الأصل (same-origin) — بلا أي مكتبة/اعتمادية
// جديدة (اتساقاً مع قرار offlineFiles.js: IndexedDB خام بلا مكتبة idb).
// كل صفحة/بيانات (JS/CSS/HTML + public/data/**.json) يزورها الطالب أثناء
// اتصاله بالإنترنت تُخزَّن تلقائياً بصمت؛ عند انقطاع الاتصال لاحقاً، تُقرأ
// من هذا الكاش بدل فشل الشبكة — بلا أي تعديل مطلوب بـ useSubjectData.js أو
// أي fetch() آخر بالتطبيق (اعتراض شفّاف على مستوى الشبكة).
//
// ما لا يُخزَّن أبداً (متعمَّد):
//   - أي طلب غير GET (نشر/حذف الأدمن كلها POST/PUT/DELETE لـ api.github.com)
//   - أي طلب لأصل مختلف (api.github.com) — لا نتدخل بخط أنابيب النشر إطلاقاً
//   - طلبات بها `cache: "no-store"`/معامل `?_=` (كسر كاش متعمَّد من
//     AdminSectionsManager.jsx لقراءات الأدمن الحديثة دائماً) — نتجاهلها
//     بالكامل ونمررها للشبكة مباشرة بلا اعتراض، حفاظاً على نيّة "أحدث نسخة
//     فعلياً" الصريحة بذاك الكود.

const CACHE_NAME = "assistant404-shell-v1";

self.addEventListener("install", (event) => {
  // لا قائمة تثبيت مسبقة (precache) هنا عمداً — أسماء ملفات JS/CSS بعد
  // البناء تحمل hash متغيّر بكل نشر، وبناء قائمة تثبيت ثابتة يحتاج خطوة
  // بناء إضافية (مثل vite-plugin-pwa) وهذا اعتماد جديد لم نقرره. بدلاً من
  // ذلك: التخزين "أثناء التصفح" (runtime caching) أدناه يغطي نفس الهدف
  // بلا أي تعقيد بناء إضافي.
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      // تنظيف أي كاش قديم من نسخة سابقة لهذا الـSW (رفع CACHE_NAME عند أي
      // تغيير مستقبلي بمنطق التخزين يكفي لإجبار تحديث نظيف).
      const keys = await caches.keys();
      await Promise.all(
        keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))
      );
      await self.clients.claim();
    })()
  );
});

function isNoStoreRequest(request) {
  return request.cache === "no-store" || request.url.includes("?_=");
}

self.addEventListener("fetch", (event) => {
  const { request } = event;

  if (request.method !== "GET") return; // نشر/حذف الأدمن — لا نتدخل إطلاقاً
  if (new URL(request.url).origin !== self.location.origin) return; // api.github.com إلخ
  if (isNoStoreRequest(request)) return; // قراءات الأدمن الحديثة دائماً — نيّة صريحة بالكود

  event.respondWith(
    (async () => {
      try {
        const networkResponse = await fetch(request);
        // ننسخ وننخزّن فقط الردود الناجحة (200) — لا نخزّن 404/أخطاء بالغلط.
        if (networkResponse && networkResponse.ok) {
          const cache = await caches.open(CACHE_NAME);
          cache.put(request, networkResponse.clone());
        }
        return networkResponse;
      } catch {
        // فشل الشبكة (بلا اتصال) — نرجع لآخر نسخة مخزَّنة من زيارة سابقة.
        const cached = await caches.match(request);
        if (cached) return cached;
        // لا كاش ولا شبكة: لا يوجد شيء نقدر نعرضه لهذا الطلب تحديداً
        // (مثلاً أول زيارة لصفحة لم تُفتَح قط أثناء اتصال) — نترك الفشل
        // الطبيعي يظهر بدل اختلاق رد وهمي.
        throw new Error("offline-and-not-cached");
      }
    })()
  );
});
