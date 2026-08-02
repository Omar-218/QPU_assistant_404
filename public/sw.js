// ⚠️ ملف جديد — مهمة المدير (إكمال ميزة "تصفح المواد بدون إنترنت"، 2026-07-30).
// ⚠️ إصلاح 2026-07-31: النسخة الأولى فشلت فعلياً بالاستخدام الحي — السبب
// الحقيقي مختلف عمّا افترضته أول مرة. راجع الشرح الكامل أسفل دالة fetch.
// ⚠️ تطوير 2026-08-02 (طلب مباشر من المستخدم — تشخيص "صفحة بيضاء عند الرجوع
// للخلف بدون إنترنت"): احتمال جذري لم يكن مغطّى بالإصلاح السابق: الغلاف
// المخزَّن (APP_SHELL_KEY) هو مستند HTML يشير لأسماء ملفات JS/CSS محدَّدة
// (بـhash فريد لكل بناء Vite) — لكن تلك الملفات نفسها كانت تُخزَّن فقط
// "عضوياً" (لو الطالب فعلاً طلبها أثناء تصفّحه). لو لأي سبب لم تُطلَب/تُخزَّن
// (مثال: نشر جديد غيّر الأسماء بعد آخر تخزين للغلاف، أو ترتيب تحميل غير
// متوقَّع)، الغلاف المخزَّن يشير لملفات غير موجودة بالكاش — فشل صامت يمنع
// React من العمل إطلاقاً بدون نت. الحل: cacheShellAndAssets أدناه تفحص نص
// الغلاف كل مرة يُخزَّن (تثبيت أو تنقّل ناجح) وتجلب/تخزّن أي <script>/<link>
// مذكور بداخله صراحة — الغلاف وأصوله يُخزَّنون دائماً كمجموعة متطابقة واحدة،
// لا اعتماداً على تصفّح عضوي منفصل قد لا يغطي كل شيء.

const CACHE_NAME = "assistant404-shell-v3"; // ⚠️ رُفِع الرقم لإبطال كاش v2 تلقائياً
const APP_SHELL_KEY = "app-shell"; // مفتاح كاش ثابت لصفحة index.html نفسها، بمعزل عن أي مسار

// يستخرج روابط <script src="..."> و<link href="...css/js"> من نص HTML خام.
// لا DOMParser بسياق Service Worker (متاح فقط بسياق Window) — regex بسيط
// كافٍ هنا لأن بنية مخرجات Vite قابلة للتوقّع تماماً (وسوم src/href صريحة).
function extractAssetUrls(html, baseUrl) {
  const urls = new Set();
  const re = /(?:src|href)="([^"]+\.(?:js|css))"/g;
  let m;
  while ((m = re.exec(html))) {
    try {
      urls.add(new URL(m[1], baseUrl).href);
    } catch {
      // رابط غير صالح (نادر) — تجاهل هذا الملف فقط، أكمل الباقي
    }
  }
  return [...urls];
}

// يخزّن الغلاف نفسه + كل أصوله المذكورة بداخله، كمجموعة واحدة متطابقة دائماً.
// أفضل جهد بالكامل: فشل جلب أصل واحد لا يوقف تخزين البقية ولا الغلاف نفسه.
async function cacheShellAndAssets(networkResponse, shellUrl) {
  const cache = await caches.open(CACHE_NAME);
  const forCache = networkResponse.clone();
  const forText = networkResponse.clone();
  await cache.put(APP_SHELL_KEY, forCache);
  try {
    const html = await forText.text();
    const assetUrls = extractAssetUrls(html, shellUrl);
    await Promise.all(
      assetUrls.map(async (url) => {
        try {
          const res = await fetch(url);
          if (res && res.ok) await cache.put(url, res.clone());
        } catch {
          // بلا اتصال/تعذّر جلب أصل واحد — أفضل جهد، لا نوقف البقية
        }
      })
    );
  } catch {
    // تعذّر قراءة نص الغلاف (نادر جداً) — الغلاف نفسه مخزَّن أصلاً أعلاه، يكفي
  }
}

self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      // ⚠️ تخزين صريح لصفحة index.html (جذر الموقع) + كل أصولها وقت التثبيت
      // — هذا هو "قشرة التطبيق" (app shell) التي سنعيدها لأي تنقّل فاشل بلا
      // اتصال، بصرف النظر عن المسار المطلوب.
      try {
        const shellUrl = self.registration.scope; // مثال: https://x.github.io/QPU_assistant_404/
        const res = await fetch(shellUrl);
        if (res && res.ok) {
          await cacheShellAndAssets(res, shellUrl);
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
          // تحديث "القشرة" وأصولها بصمت من أي تنقّل ناجح متصل — يبقيها
          // محدَّثة مع كل نشر جديد بلا انتظار حدث install فقط. event.waitUntil
          // (لا await مباشر) لأنها قد تشمل عدة طلبات أصول إضافية — لا داعي
          // تأخير الرد للطالب بانتظارها، لكن يجب إبقاء الـ Service Worker حياً
          // لإتمامها فعلاً بالخلفية.
          if (networkResponse && networkResponse.ok) {
            event.waitUntil(cacheShellAndAssets(networkResponse.clone(), request.url));
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
