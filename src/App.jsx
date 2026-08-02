import React, { Suspense, lazy, useState } from "react";
import { Routes, Route } from "react-router-dom";
import { ThemeProvider } from "./lib/theme/ThemeContext.jsx";
import Sidebar from "./components/layout/Sidebar.jsx";
import Header from "./components/layout/Header.jsx";
import AdminAuthGate from "./components/admin/AdminAuthGate.jsx";

// ⚠️ ملف مملوك للمدير — لا يُعدَّل من قبل أي عضو أثناء مرحلة العمل المتوازي.
// كل المسارات مسجَّلة من اليوم الأول (بما فيها /admin) — لا حاجة لأي عضو
// يرجع يعدّل هذا الملف لاحقاً لإضافة مسار.
//
// الصفحات مستوردة بـ lazy() من مسارات ثابتة (القسم 2 بخطة البناء).
// كل عضو يسلّم ملف صفحته بنفس المسار والاسم المتفق عليه بالضبط.
//
// ⚠️ تحديث إداري (خطة الدفعة 4، المهمة 1): كل مسارات /admin الآن مغلَّفة
// بـ AdminAuthGate (عضو 3) — لا تُعرض أي صفحة إدارية بدون توكن GitHub صالح.
//
// ⚠️ تحديث إداري: حالة فتح/إغلاق القائمة الجانبية على الجوال تعيش هنا (أب
// مشترك لـ Header وSidebar، وهما إخوة لا أحدهما ابن الآخر).
//
// ⚠️ تحديث إداري (2026-07-30، مهمة "تصفح بدون إنترنت"): مسار عام جديد
// /offline (OfflineDownloads.jsx) — نفس مستوى /notifications، بلا AdminAuthGate.
//
// ⚠️ تحديث إداري (2026-08-02، اقتراح #7 من مراجعة خبير للوحة التحكم): مسار
// إداري جديد /admin/link-checker (AdminLinkChecker.jsx) — نفس نمط بقية
// /admin/* (مغلَّف بـ AdminAuthGate).
//
// ⚠️ تحديث إداري (2026-08-02، اقتراح #5 من نفس المراجعة): مسار إداري جديد
// /admin/audit-log (AdminAuditLog.jsx) — نفس نمط بقية /admin/* أيضاً.

const SubjectList = lazy(() => import("./pages/SubjectList.jsx"));
const Subject = lazy(() => import("./pages/Subject.jsx"));
const StudyPlan = lazy(() => import("./pages/StudyPlan.jsx"));
const NotificationsPage = lazy(() => import("./pages/NotificationsPage.jsx"));
const OfflineDownloads = lazy(() => import("./pages/OfflineDownloads.jsx"));
const AdminHome = lazy(() => import("./pages/Admin/AdminHome.jsx"));
const AdminSubjectEditor = lazy(() => import("./pages/Admin/AdminSubjectEditor.jsx"));
const AdminSectionsManager = lazy(() => import("./pages/Admin/AdminSectionsManager.jsx"));
const AdminRequestsQueue = lazy(() => import("./pages/Admin/AdminRequestsQueue.jsx"));
const AdminEventsLog = lazy(() => import("./pages/Admin/AdminEventsLog.jsx"));
const AdminLinkChecker = lazy(() => import("./pages/Admin/AdminLinkChecker.jsx"));
const AdminAuditLog = lazy(() => import("./pages/Admin/AdminAuditLog.jsx"));

function PageFallback() {
  return <div className="p-6 text-text-muted">...جارِ التحميل</div>;
}

export default function App() {
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  return (
    <ThemeProvider>
      <div className="flex min-h-screen bg-bg text-text" dir="rtl">
        <Sidebar open={mobileNavOpen} onClose={() => setMobileNavOpen(false)} />
        <div className="flex-1 flex flex-col min-w-0">
          <Header onMenuClick={() => setMobileNavOpen(true)} />
          <main className="flex-1 p-4 md:p-6">
            <Suspense fallback={<PageFallback />}>
              <Routes>
                <Route path="/" element={<SubjectList />} />
                <Route path="/subject/:id" element={<Subject />} />
                <Route path="/study-plan" element={<StudyPlan />} />
                <Route path="/notifications" element={<NotificationsPage />} />
                <Route path="/offline" element={<OfflineDownloads />} />
                <Route
                  path="/admin"
                  element={
                    <AdminAuthGate>
                      <AdminHome />
                    </AdminAuthGate>
                  }
                />
                <Route
                  path="/admin/subject/:id?"
                  element={
                    <AdminAuthGate>
                      <AdminSubjectEditor />
                    </AdminAuthGate>
                  }
                />
                <Route
                  path="/admin/sections"
                  element={
                    <AdminAuthGate>
                      <AdminSectionsManager />
                    </AdminAuthGate>
                  }
                />
                <Route
                  path="/admin/requests"
                  element={
                    <AdminAuthGate>
                      <AdminRequestsQueue />
                    </AdminAuthGate>
                  }
                />
                <Route
                  path="/admin/events-log"
                  element={
                    <AdminAuthGate>
                      <AdminEventsLog />
                    </AdminAuthGate>
                  }
                />
                <Route
                  path="/admin/link-checker"
                  element={
                    <AdminAuthGate>
                      <AdminLinkChecker />
                    </AdminAuthGate>
                  }
                />
                <Route
                  path="/admin/audit-log"
                  element={
                    <AdminAuthGate>
                      <AdminAuditLog />
                    </AdminAuthGate>
                  }
                />
                <Route path="*" element={<NotFound />} />
              </Routes>
            </Suspense>
          </main>
        </div>
      </div>
    </ThemeProvider>
  );
}

function NotFound() {
  return (
    <div className="p-10 text-center text-text-muted">
      الصفحة غير موجودة
    </div>
  );
}
