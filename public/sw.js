// ⚠️ ملف جديد — مهمة المدير (إكمال ميزة "تصفح المواد بدون إنترنت"، 2026-07-30).
// ⚠️ إصلاح 2026-07-31: النسخة الأولى فشلت فعلياً بالاستخدام الحي — السبب
// الحقيقي مختلف عمّا افترضته أول مرة. راجع الشرح الكامل أسفل دالة fetch.
//
// الاستراتيجية: "الشبكة أولاً، والكاش عند الفشل" لكل الأصول/البيانات
// (JS/CSS/JSON)، لكن **معاملة خاصة صريحة لطلبات التصفح (navigation)** —
// راجع لماذا أسفل.

const CACHE_NAME = "assistant404-shell-v2"; // ⚠️ رُفِع الرقم لإبطال كاش v1 الفاسد تلقائياً
const APP_SHELL_KEY = "app-shell"; // مفتاح كاش ثابت لصفحة index.html نفسها، بمعزل عن أي مسار

self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      // ⚠️ جديد: تخزين صريح لصفحة index.html (جذر الموقع) وقت التثبيت —
      // هذا هو "قشرة التطبيق" (app shell) التي سنعيدها لأي تنقّل فاشل بلا
      // اتصال، بصرف النظر عن المسار المطلوب. لا قائمة تثبيت كاملة لكل
      // JS/CSS (أسماؤها متغيّرة بـhash لكل بناء، تحتاج خطوة بناء إضافية
      // كـvite-plugin-pwa وهذا اعتماد جديد لم نقرره) — يكفي تخزين المستند
      // الرئيسي فقط هنا؛ باقي الأصول تُخزَّن أثناء التصفح العادي أدناه.
      try {
        const shellUrl = self.registration.scope; // مثال: https://x.github.io/QPU_assistant_404/
        const res = await fetch(shellUrl);
        if (res && res.ok) {
          const cache = await caches.open(CACHE_NAME);
          await cache.put(APP_SHELL_KEY, res.clone());
        }
      } catch {
        // بلا اتصال وقت أول تثبيت (نادر) — التخزين أثناء التصفح لاحقاً يكفي.
      }
      self.skipWaiting();
    })()
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
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

  // ⚠️ الإصلاح الجوهري: طلبات التصفح (تنقّل مباشر لمسار مثل
  // /subject/computer-skills، أو فتح رابط/تحديث الصفحة) يجب أن تُعامَل
  // بمعزل عن باقي الطلبات. لماذا فشلت النسخة السابقة تحديداً هنا:
  // GitHub Pages تُرجع محتوى index.html فعلياً لأي مسار غير موجود (بفضل
  // نسخ index.html→404.html بسكربت البناء) — لكنها تُرجعه بحالة HTTP 404
  // حرفياً (فقط المحتوى تغيّر، لا رمز الحالة). شرط `response.ok` بالنسخة
  // الأولى كان يرفض تخزين أي رد بحالة 404 — أي إن أي مسار SPA فرعي
  // (أي شيء غير الجذر "/") **لم يُخزَّن إطلاقاً بأي كاش قط**، حتى بعد
  // زيارته بنجاح أثناء الاتصال. بلا اتصال لاحقاً: فشل الشبكة، لا كاش
  // لذاك المسار بالتحديد، فشل كامل — بالضبط العرَض المُبلَّغ.
  // الحل: لطلبات mode:"navigate" تحديداً، لا نعتمد على تخزين كل مسار على
  // حدة إطلاقاً — نعيد دائماً "قشرة التطبيق" المخزَّنة وقت install (أو
  // آخر رد شبكي ناجح إن وُجد)، بصرف النظر عن المسار المطلوب. React Router
  // (BrowserRouter) يقرأ location.pathname بعد التحميل ويعرض المكوّن
  // الصحيح تلقائياً — نفس ما يحدث فعلياً بالنشر الحي أونلاين.
  if (request.mode === "navigate") {
    event.respondWith(
      (async () => {
        try {
          const networkResponse = await fetch(request);
          // تحديث "القشرة" بصمت من أي تنقّل ناجح متصل — يبقيها محدَّثة مع
          // كل نشر جديد بلا انتظار حدث install فقط.
          if (networkResponse && networkResponse.ok) {
            const cache = await caches.open(CACHE_NAME);
            cache.put(APP_SHELL_KEY, networkResponse.clone());
          }
          return networkResponse; // متصل: نترك الشبكة/GitHub Pages تتصرف طبيعياً
        } catch {
          const cache = await caches.open(CACHE_NAME);
          const shell = await cache.match(APP_SHELL_KEY);
          if (shell) return shell;
          throw new Error("offline-and-no-shell-cached");
        }
      })()
    );
    return;
  }

  // باقي الطلبات (JS/CSS/JSON بـ data/**) — هذي فعلاً تُرجَع بحالة 200
  // حقيقية عند النجاح، فشرط response.ok هنا صحيح وآمن (بعكس حالة التصفح
  // أعلاه)، فالتخزين أثناء التصفح يعمل كما هو مخطَّط أصلاً.
  event.respondWith(
    (async () => {
      try {
        const networkResponse = await fetch(request);
        if (networkResponse && networkResponse.ok) {
          const cache = await caches.open(CACHE_NAME);
          cache.put(request, networkResponse.clone());
        }
        return networkResponse;
      } catch {
        const cached = await caches.match(request);
        if (cached) return cached;
        throw new Error("offline-and-not-cached");
      }
    })()
  );
});
