import { useEffect, useState } from "react";
import { getStoredToken, DEFAULT_OWNER, DEFAULT_REPO } from "../lib/adminAuth.js";

// ⚠️ ملف جديد — مهمة المدير (طلب مباشر من المستخدم، 2026-08-02). يكمل نقطة
// تركتها الجلسة السابقة صراحة معلَّقة: اقتراح #9 ("لوحة إحصائيات") أراد
// "آخر تاريخ نشر" لكن لا مصدر بيانات موثوق له بلا GitHub Commits API —
// أُجِّل وقتها لحين تنفيذ #5 ("سجل تدقيق مرئي"، AdminAuditLog.jsx). بعد
// تنفيذ #5 بهذي الجلسة، هذا الهوك يوفّر نفس البيانات (commit واحد فقط،
// نفس نمط usePendingRequestsCount.js) لعرضها بشريط إحصائيات AdminHome.jsx.
//
// بلا توكن محفوظ أو فشل الجلب: date تبقى null (لا "آخر نشر" يُعرَض إطلاقاً،
// لا تخمين ولا قيمة نائبة مضلِّلة).

export function useLastPublishDate() {
  const [date, setDate] = useState(null);

  useEffect(() => {
    const token = getStoredToken();
    if (!token) return undefined;
    let cancelled = false;
    fetch(`https://api.github.com/repos/${DEFAULT_OWNER}/${DEFAULT_REPO}/commits?per_page=1`, {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
      },
    })
      .then((res) => (res.ok ? res.json() : Promise.reject(new Error("fetch-failed"))))
      .then((commits) => {
        if (cancelled) return;
        const iso = Array.isArray(commits) && commits[0]?.commit?.author?.date;
        setDate(iso || null);
      })
      .catch(() => {
        if (!cancelled) setDate(null);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return { date };
}
