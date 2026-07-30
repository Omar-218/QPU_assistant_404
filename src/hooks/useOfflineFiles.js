import { useCallback, useEffect, useState } from "react";
import {
  OFFLINE_CHANGE_EVENT,
  saveOfflineFile,
  getOfflineFile,
  deleteOfflineFile,
  listOfflineFilesMeta,
} from "../lib/offlineFiles.js";

// ⚠️ ملف جديد — مهمة المدير (ميزة "تصفح المواد بدون إنترنت"، 2026-07-30).
// عقد الاستهلاك لبقية الملفات (LectureItem.jsx و OfflineDownloads.jsx الجديدة):
//
//   const {
//     files,            // بيانات وصفية فقط (بلا Blob) — كل الملفات المحفوظة، أحدثها أولاً
//     loading,
//     isDownloaded(fileId),      // بحث مباشر بالذاكرة، بلا استعلام IndexedDB إضافي
//     downloadFile(meta, src),   // meta: { fileId, subjectId, subjectName, sectionLabel, title, fileName, mimeType }
//     openOffline(fileId),       // يفتح النسخة المحفوظة بتبويب جديد (يعمل بدون نت)
//     removeOffline(fileId),
//     groupedBySubject(),        // { [subjectId]: { subjectName, files: [...] } }
//   } = useOfflineFiles();
//
// كل نسخة (بأي مكوّن) تستمع لـ OFFLINE_CHANGE_EVENT فتتزامن فوراً بنفس التبويب
// (نفس نمط useFavorites.js — window.CustomEvent، لا حدث "storage" الطبيعي
// لأنه لا يُطلَق أصلاً لنفس التبويب اللي غيّر القيمة).

export function useOfflineFiles() {
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const meta = await listOfflineFilesMeta();
      meta.sort((a, b) => b.downloadedAt - a.downloadedAt);
      setFiles(meta);
    } catch {
      // IndexedDB غير مدعوم أو تعذّر الفتح (وضع خاص بالمتصفح، إلخ) — نتعامل
      // مع الحالة كـ "لا ملفات محفوظة" بدل كسر الصفحة.
      setFiles([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
    window.addEventListener(OFFLINE_CHANGE_EVENT, refresh);
    return () => window.removeEventListener(OFFLINE_CHANGE_EVENT, refresh);
  }, [refresh]);

  const isDownloaded = useCallback(
    (fileId) => files.some((f) => f.fileId === fileId),
    [files]
  );

  // يجلب الملف من الشبكة ويخزّنه محلياً. يرمي استثناءً عند فشل الشبكة —
  // المستدعي (LectureItem.jsx) مسؤول عن عرض رسالة خطأ مناسبة.
  const downloadFile = useCallback(async (meta, src) => {
    const res = await fetch(src);
    if (!res.ok) throw new Error("fetch-failed");
    const blob = await res.blob();
    await saveOfflineFile(meta, blob);
  }, []);

  // يفتح النسخة المحفوظة محلياً بتبويب جديد (لا يحتاج شبكة إطلاقاً).
  // يرجّع false لو الملف غير موجود فعلياً بالمخزن (حالة نادرة: حُذف من تبويب آخر).
  const openOffline = useCallback(async (fileId) => {
    const record = await getOfflineFile(fileId);
    if (!record) return false;
    const url = URL.createObjectURL(record.blob);
    window.open(url, "_blank", "noopener,noreferrer");
    return true;
  }, []);

  const removeOffline = useCallback(async (fileId) => {
    await deleteOfflineFile(fileId);
  }, []);

  const groupedBySubject = useCallback(() => {
    return files.reduce((acc, f) => {
      if (!acc[f.subjectId]) acc[f.subjectId] = { subjectName: f.subjectName, files: [] };
      acc[f.subjectId].files.push(f);
      return acc;
    }, {});
  }, [files]);

  return { files, loading, isDownloaded, downloadFile, openOffline, removeOffline, groupedBySubject };
}
