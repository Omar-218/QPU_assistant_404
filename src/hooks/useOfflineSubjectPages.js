import { useCallback, useEffect, useState } from "react";
import {
  OFFLINE_SUBJECT_PAGES_CHANGE_EVENT,
  listSavedSubjectPages,
  isSubjectPageSaved,
  prefetchSubjectForOffline,
  removeSavedSubjectPage,
} from "../lib/offlineSubjectPrefetch.js";

// ⚠️ ملف جديد — مهمة المدير (2026-08-01، "طوّر طريقة حفظ الصفحات بلا انترنت").
// عقد الاستهلاك (Subject.jsx للحفظ اليدوي، OfflineDownloads.jsx للعرض/الإزالة):
//
//   const {
//     savedPages,          // [{ subjectId, subjectName, lecturesFile, savedAt }], الأحدث أولاً
//     loading,
//     isSaved(subjectId),  // بحث بالذاكرة فقط
//     savePage(subjectId), // يرجّع true/false — يُستخدَم لعرض نجاح/فشل بالواجهة
//     removePage(subjectId),
//   } = useOfflineSubjectPages();
//
// نفس نمط useOfflineFiles.js/useFavorites.js — مزامنة فورية بنفس التبويب عبر
// CustomEvent، بلا اعتماد على حدث "storage" الطبيعي (لا يُطلَق لنفس التبويب).

export function useOfflineSubjectPages() {
  const [savedPages, setSavedPages] = useState([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(() => {
    try {
      const list = listSavedSubjectPages();
      setSavedPages([...list].sort((a, b) => b.savedAt - a.savedAt));
    } catch {
      setSavedPages([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
    window.addEventListener(OFFLINE_SUBJECT_PAGES_CHANGE_EVENT, refresh);
    return () => window.removeEventListener(OFFLINE_SUBJECT_PAGES_CHANGE_EVENT, refresh);
  }, [refresh]);

  const isSaved = useCallback(
    (subjectId) => savedPages.some((p) => p.subjectId === subjectId),
    [savedPages]
  );

  const savePage = useCallback(async (subjectId) => {
    return prefetchSubjectForOffline(subjectId);
  }, []);

  const removePage = useCallback(async (subjectId) => {
    await removeSavedSubjectPage(subjectId);
  }, []);

  return { savedPages, loading, isSaved, savePage, removePage };
}

// دالة مساعدة مباشرة (بلا React) — تُستخدَم لو احتاج مكوّن فحصاً فورياً بلا
// انتظار دورة render (مثال: عرض أولي قبل أول useEffect). نادراً ما تُحتاج.
export { isSubjectPageSaved };
