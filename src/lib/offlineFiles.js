// ⚠️ ملف جديد — مهمة المدير (ميزة "تصفح المواد بدون إنترنت"، طلب مباشر من
// المستخدم، 2026-07-30). طبقة تخزين محلية خام (IndexedDB، بلا مكتبة idb —
// لا اعتماديات جديدة بـ package.json) لملفات pdf/image التي يحمّلها الطالب
// من صفحة المادة (LectureItem.jsx) ليتصفحها لاحقاً بدون اتصال.
//
// عقد المخزن: قاعدة "assistant404-offline" > object store "files"
// (keyPath: fileId، فهرس ثانوي bySubject على subjectId).
// شكل السجل الكامل (مع Blob):
//   { fileId, subjectId, subjectName, sectionLabel, title, fileName,
//     mimeType, blob, sizeBytes, downloadedAt }
//
// عقد المزامنة داخل نفس التبويب (نفس نمط useFavorites.js/useRecentlyViewed.js
// الحاليين): كل كتابة/حذف تبعث CustomEvent باسم OFFLINE_CHANGE_EVENT، وكل
// نسخة من useOfflineFiles.js (بأي مكوّن) تستمع له لتحديث حالتها فوراً.
//
// fileId المُتَّفق عليه (يُبنى من طرف المستهلك — LectureItem.jsx):
//   `${subjectId}::${item.file}`

const DB_NAME = "assistant404-offline";
const DB_VERSION = 1;
const STORE = "files";

export const OFFLINE_CHANGE_EVENT = "assistant404:offline-files-changed";

let dbPromise = null;

function openDatabase() {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    if (typeof indexedDB === "undefined") {
      reject(new Error("indexeddb-unsupported"));
      return;
    }
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) {
        const store = db.createObjectStore(STORE, { keyPath: "fileId" });
        store.createIndex("bySubject", "subjectId");
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
  return dbPromise;
}

function notifyChange() {
  try {
    window.dispatchEvent(new CustomEvent(OFFLINE_CHANGE_EVENT));
  } catch {
    // بيئة بلا window (لن تحدث فعلياً بهذا المشروع) — تجاهل بصمت
  }
}

// meta: كل الحقول عدا blob/sizeBytes/downloadedAt (تُضاف هنا تلقائياً).
export async function saveOfflineFile(meta, blob) {
  const db = await openDatabase();
  await new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    tx.objectStore(STORE).put({
      ...meta,
      blob,
      sizeBytes: blob.size,
      downloadedAt: Date.now(),
    });
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
  notifyChange();
}

// يرجّع السجل كاملاً (يشمل الـ Blob) — للفتح الفعلي فقط، لا للقوائم.
export async function getOfflineFile(fileId) {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, "readonly");
    const req = tx.objectStore(STORE).get(fileId);
    req.onsuccess = () => resolve(req.result || null);
    req.onerror = () => reject(req.error);
  });
}

export async function deleteOfflineFile(fileId) {
  const db = await openDatabase();
  await new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    tx.objectStore(STORE).delete(fileId);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
  notifyChange();
}

// بيانات وصفية فقط (بلا Blob) لكل الملفات المحفوظة — تكفي لشارات "محمّلة"
// وصفحة "التنزيلات"، بلا تحميل كل الملفات الثقيلة إلى الذاكرة دفعة واحدة.
export async function listOfflineFilesMeta() {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, "readonly");
    const req = tx.objectStore(STORE).openCursor();
    const results = [];
    req.onsuccess = () => {
      const cursor = req.result;
      if (cursor) {
        const { blob, ...meta } = cursor.value;
        results.push(meta);
        cursor.continue();
      } else {
        resolve(results);
      }
    };
    req.onerror = () => reject(req.error);
  });
}

// تخمين نوع الملف من الامتداد — تحتاجه فقط pdf/image (النوعان القابلان
// للتنزيل أصلاً بـ LectureItem.jsx، القسم 4.6 من team-plan-v2.md).
export function guessMimeType(fileName = "") {
  const ext = fileName.split(".").pop()?.toLowerCase();
  const map = {
    pdf: "application/pdf",
    png: "image/png",
    jpg: "image/jpeg",
    jpeg: "image/jpeg",
    gif: "image/gif",
    webp: "image/webp",
  };
  return map[ext] || "application/octet-stream";
}
