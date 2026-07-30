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
//     downloadFile(meta, src, onProgress?),  // meta: { fileId, subjectId, subjectName, sectionLabel, title, fileName, mimeType }
//                                             // onProgress?(loadedBytes, totalBytes) — راجع تعليق downloadFile أسفل الملف
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
  //
  // ⚠️ تحديث (2026-07-30، طلب مباشر من المستخدم — ميزة "حجم الملف وتقدّم
  // التنزيل"): onProgress اختياري: `(loadedBytes, totalBytes) => void`،
  // يُستدعى مع كل دفعة (chunk) أثناء القراءة، لا مرة واحدة بالنهاية فقط.
  // totalBytes من رأس Content-Length لرد الشبكة — قد يكون 0 لو الخادم لا
  // يرسله (نادر بملفات ثابتة على GitHub Pages)؛ المستدعي يتعامل مع 0 كـ
  // "الحجم الكلي غير معروف" بدل قسمة على صفر.
  // بديل خطة ب: لو المتصفح لا يدعم ReadableStream على body (نادر جداً
  // اليوم)، نرجع لـ res.blob() المباشرة بلا أي تتبع تقدّم تدريجي — الملف
  // يُحفظ بنجاح بكل الأحوال، فقط بلا شريط تقدّم حي.
  const downloadFile = useCallback(async (meta, src, onProgress) => {
    const res = await fetch(src);
    if (!res.ok) throw new Error("fetch-failed");
    const totalBytes = Number(res.headers.get("content-length")) || 0;

    if (!res.body || typeof res.body.getReader !== "function") {
      const blob = await res.blob();
      onProgress?.(blob.size, totalBytes || blob.size);
      await saveOfflineFile(meta, blob);
      return;
    }

    const reader = res.body.getReader();
    const chunks = [];
    let loaded = 0;
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      chunks.push(value);
      loaded += value.length;
      onProgress?.(loaded, totalBytes);
    }
    const blob = new Blob(chunks, {
      type: meta.mimeType || res.headers.get("content-type") || undefined,
    });
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
