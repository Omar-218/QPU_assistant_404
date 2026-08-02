import { useEffect, useState } from "react";
import { getStoredToken, DEFAULT_OWNER, DEFAULT_REPO } from "../lib/adminAuth.js";

// ⚠️ ملف جديد — مهمة المدير (طلب مباشر من المستخدم، 2026-08-02، اقتراح #3 من
// مراجعة خبير للوحة التحكم): "تنبيه بعدد الطلبات المعلّقة" على AdminHome.jsx.
//
// نسخة أبسط عمداً من fetchPendingPRs بـ AdminRequestsQueue.jsx (ملف صفحة، لا
// مكتبة قابلة لإعادة الاستخدام — لم أستورد منه مباشرة تفادياً لأي تعارض
// ملكية). هنا فقط العدّ (لا حاجة لقراءة/تحليل جسم كل PR)، فاستدعاء واحد خفيف
// لنفس GitHub Pulls API المستخدَم أصلاً بتلك الصفحة (نفس حدود معدَّل GitHub).
//
// يتطلب توكن دخول محفوظ فعلاً (getStoredToken) — بلا توكن، count يبقى null
// (لا يُعرَض أي شارة، لا رسالة خطأ مزعجة؛ الأدمن أصلاً لن يصل هذي الصفحة بلا
// دخول ناجح بحسب AdminAuthGate.jsx).
function isRequestPr(title) {
  return typeof title === "string" && (title.startsWith("[event]") || title.startsWith("[upload]"));
}

export function usePendingRequestsCount() {
  const [count, setCount] = useState(null); // null = لسه ما وصل رد (أو بلا توكن)
  const [error, setError] = useState(false);

  useEffect(() => {
    const token = getStoredToken();
    if (!token) return undefined;
    let cancelled = false;
    fetch(
      `https://api.github.com/repos/${DEFAULT_OWNER}/${DEFAULT_REPO}/pulls?state=open&per_page=100`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/vnd.github+json",
          "X-GitHub-Api-Version": "2022-11-28",
        },
      }
    )
      .then((res) => (res.ok ? res.json() : Promise.reject(new Error("fetch-failed"))))
      .then((all) => {
        if (cancelled) return;
        const n = Array.isArray(all) ? all.filter((pr) => isRequestPr(pr.title)).length : 0;
        setCount(n);
      })
      .catch(() => {
        if (!cancelled) setError(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return { count, error };
}
