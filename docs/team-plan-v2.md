# خطة بناء من الصفر — assistant404-v2

**دور "الإدارة" بهذي الوثيقة:** أنا (Claude) بصفتي مدير المشروع، أحدد هنا **كل** العقود (contracts) — أسماء الملفات، أسماء المتغيرات، شكل الـ JSON، توقيعات الدوال/الـ hooks — **قبل** ما يبدأ أي عضو بالعمل. هذا هو الفرق الجوهري عن المشروع السابق: هناك كانت التعارضات تُكتشف أثناء التنفيذ، هنا يجب أن تُحل **قبله**.

---

## 0. الدرس الأهم من المشروع السابق (ولماذا هذي الخطة مختلفة)

المشروع السابق فشل (تعارضين فعليين على `Subject.jsx`) لأن أكثر من عضو احتاج يعدّل **نفس الملف** بمعزل عن بعض. الحل هنا ليس "تنسيق أفضل" — التنسيق فشل مرتين فعلاً. الحل معماري:

> **قاعدة صارمة واحدة: كل ملف له مالك واحد فقط، أبداً، بدون استثناء. إذا احتاج عضو شيئاً من منطقة عضو آخر، يستورده عبر عقد محدد سلفاً — لا يعدّله ولا يطلب من غيره تعديله أثناء التنفيذ المتوازي.**

كيف نحقق هذا عملياً رغم أن صفحات مثل `Subject.jsx` تحتاج: ثيم + منطق دكاترة + hidden + عارض ملفات + تصميم عام؟
- **كل "قدرة" تُبنى كملف/hook مستقل يُستورد**، لا كتعديل مباشر داخل ملف الصفحة.
- **الغلاف العام (Shell: التوجيه + الشريط الجانبي) أبنيه أنا الآن، جاهزاً بمساراته الكاملة من اليوم الأول** (بما فيها `/admin`) — لا ينتظر أحداً، ولا يحتاج أحد يعدّله لاحقاً.
- **كل القيم المشتركة (توكنز الثيم، شكل JSON، أسماء الحقول) محسومة بهذي الوثيقة الآن**، مو أثناء العمل.

---

## 1. البنية التقنية (ثابتة، لا نقاش فيها)

- React + Vite + react-router-dom + Tailwind (عبر `@theme`) + Fuse.js للبحث
- GitHub Pages — **Static بالكامل**، لا خادم، لا قاعدة بيانات
- الريبو المقترح: `Omar-218x-collab/assistant404-v2` (أو فرع جديد بنفس الريبو — قرارك)

---

## 2. هيكل المجلدات الكامل (محدد الآن، لا يتغير)

```
src/
  App.jsx                      ← أملكه أنا (المدير) — جاهز من اليوم الأول بكل المسارات
  main.jsx                     ← أملكه أنا
  index.css                    ← عضو 1 (الثيم)

  lib/
    theme/
      ThemeContext.jsx         ← عضو 1
    professorVariants.js       ← عضو 4 (منطق البيانات)
    hiddenFilter.js            ← عضو 4
    idSlug.js                  ← عضو 4
    sectionLabels.js           ← ملف بيانات ثابت، أسلّمه أنا جاهزاً (القسم 4.4) — الكل يستورد منه فقط
    githubPublisher.js         ← عضو 5 (النشر المباشر عبر GitHub API)

  hooks/
    useTheme.js                ← عضو 1
    useSubjectData.js          ← عضو 4 (يغلّف قراءة subject.json/lectures*.json + تطبيق hidden + النسخة الفعّالة للدكتور)

  components/
    layout/
      Sidebar.jsx              ← أملكه أنا (Shell) — جاهز بكل الروابط من اليوم الأول
      Header.jsx               ← أملكه أنا، بمكان محجوز ثابت لزر الثيم (انظر 5.1)
    theme/
      ThemeToggleButton.jsx    ← عضو 1
    subject/
      SubjectCard.jsx
      LectureItem.jsx
      FileViewer.jsx           ← (iframe) — كل هذي عضو 2
    admin/
      SubjectForm.jsx
      SectionsManager.jsx
      FileUploaderWidget.jsx   ← عضو 3
      PublishPanel.jsx         ← عضو 5 (واجهة النشر فقط، يستدعي lib/githubPublisher.js)

  pages/
    SubjectList.jsx
    Subject.jsx
    StudyPlan.jsx               ← كل هذي عضو 2
    Admin/
      AdminHome.jsx
      AdminSubjectEditor.jsx
      AdminSectionsManager.jsx  ← كل هذي عضو 3

public/data/
  study-plan.json               ← بيانات بذرة (seed)، أزوّدها أنا جاهزة من اليوم الأول
  subjects/{slug}/
    subject.json
    lectures.json
    lectures-{professorId}.json (اختياري)

docs/
  data-schema.md                ← عضو 6 (QA) يوثّقه اعتماداً على هذي الوثيقة
  logs/member-X-log.md          ← كل عضو يملك سجله فقط
```

**القاعدة:** أي ملف غير مذكور هنا وتحتاجه أثناء العمل → توقف وأبلغني قبل إنشائه، لا تخترع ملفات مشتركة جديدة بمعزل عني.

---

## 3. الفريق — 6 أعضاء (قابل للزيادة عند الحاجة)

| # | العضو | المسؤولية | الملفات المملوكة حصرياً |
|---|---|---|---|
| 1 | **الثيم ونظام التصميم** | الوضع الفاتح/المظلم مع **زر تبديل يدوي** (نحسم اللغز من المشروع الأول بحسم: يوجد زر هذي المرة) + كل توكنز الألوان | `index.css`, `lib/theme/ThemeContext.jsx`, `hooks/useTheme.js`, `components/theme/ThemeToggleButton.jsx` |
| 2 | **صفحات الطالب (الواجهة العامة)** | عرض المواد، المحاضرات، عارض iframe، البحث، الخطة الدراسية | `pages/SubjectList.jsx`, `pages/Subject.jsx`, `pages/StudyPlan.jsx`, `components/subject/*` |
| 3 | **لوحة التحكم — الواجهة** | شاشات: قائمة المواد، إضافة/تعديل مادة، إدارة الأقسام، مربع رفع الملفات (UI فقط) | `pages/Admin/*`, `components/admin/SubjectForm.jsx`, `components/admin/SectionsManager.jsx`, `components/admin/FileUploaderWidget.jsx` |
| 4 | **منطق البيانات المتقدم** | تعدد الدكاترة، فلترة hidden (بكل المستويات بما فيها القسم)، توليد/تحقق slugs، hook موحّد لقراءة بيانات المادة | `lib/professorVariants.js`, `lib/hiddenFilter.js`, `lib/idSlug.js`, `hooks/useSubjectData.js` |
| 5 | **خط أنابيب النشر (Upload → Publish)** | تحويل ملفات الجهاز المرفوعة + بيانات النموذج إلى حزمة JSON/ملفات صحيحة، ثم نشرها مباشرة لـ GitHub عبر API أو تصديرها كـ ZIP | `lib/githubPublisher.js`, `components/admin/PublishPanel.jsx` |
| 6 | **الجودة، التكامل، التوثيق** | مراجعة كل تسليم مقابل العقود بهذي الوثيقة، اختبار المتصفح/الجوال، توثيق `data-schema.md` | `docs/data-schema.md`, `docs/logs/member-6-qa-log.md` |

**أملكها أنا شخصياً (المدير) — لا تُعطى لأي عضو:**
`src/App.jsx`, `src/main.jsx`, `src/components/layout/Sidebar.jsx`, `src/components/layout/Header.jsx`, `public/data/study-plan.json` (البذرة الأولية فقط)

---

## 4. العقود المُحسومة الآن (كل عضو يبني ضدها حرفياً)

### 4.1 توكنز الثيم (عضو 1 يطبّقها، البقية يستوردونها فقط باستخدام Tailwind classes — ممنوع أي `#hex` أو inline color)

```css
--bg, --bg-subtle, --bg-elevated
--text, --text-h, --text-muted
--border
--accent, --accent-hover
--warning-bg, --warning-border, --warning-text
--danger-bg, --danger-border, --danger-text   /* جديد: لأزرار الحذف بلوحة التحكم */
```
Tailwind classes المقابلة: `bg-bg`, `bg-bg-subtle`, `text-text`, `text-text-muted`, `border-border`, `text-accent`, `bg-accent`, `bg-warning-bg`... إلخ.

### 4.2 `useTheme()` — عقد الـ hook (عضو 1 يبنيه، الجميع يستهلكه إن احتاج)
```js
const { theme, toggleTheme } = useTheme(); // theme: "light" | "dark"
```
يُخزَّن التفضيل بـ localStorage، ويحترم `prefers-color-scheme` كقيمة افتراضية أولى فقط.

### 4.3 شكل `subject.json`
```json
{
  "id": "circuits",
  "name": "الدارات الكهربائية",
  "code": "1130700",
  "hidden": false,
  "professorVariants": [
    { "professorId": "prof-ahmad", "professorName": "د. أحمد", "active": true, "lecturesFile": "lectures-prof-ahmad.json" }
  ]
}
```
`professorVariants` اختياري تماماً — غيابه يعني القراءة من `lectures.json` مباشرة (توافق عكسي إلزامي).

### 4.4 `sectionLabels.js` — أسلّمه جاهزاً الآن (لا عضو يبنيه)
```js
export const SECTION_LABELS = {
  theory: "📖 نظري",
  lab: "🧪 عملي",
  extra: "📄 ملفات إضافية",
  exam: "❓ أسئلة",
};
```

### 4.5 حقل `hidden` — على **3 مستويات** هذي المرة (إصلاح نقص المشروع الأول)
- مستوى المادة: `subject.json` أو `study-plan.json`
- مستوى القسم: داخل كائن القسم نفسه بـ `lectures.json`: `{ "section": "lab", "hidden": true, "items": [...] }`
- مستوى المحاضرة الفردية: `{ "title": "...", "hidden": true }`

`lib/hiddenFilter.js` (عضو 4) يصدّر دالة واحدة تُطبَّق بالترتيب: مادة → قسم → عنصر:
```js
filterVisible(subjectOrPlanEntry) // boolean
filterVisibleSections(lecturesData) // يستبعد الأقسام المخفية وعناصرها
```

### 4.6 `useSubjectData(id)` — عقد الـ hook (عضو 4 يبنيه، عضو 2 يستهلكه فقط)
```js
const { subject, activeProfessor, lectures, loading, notFound } = useSubjectData(id);
// notFound = true إذا المادة غير موجودة أو hidden (نفس الرسالة، بدون تسريب معلومة الإخفاء)
```
**هذا العقد هو ما يلغي حاجة عضو 2 لمعرفة أي تفصيل عن professorVariants أو hidden داخلياً — يستهلك hook جاهز فقط.**

### 4.7 معرّفات (id)
- دائماً slug إنجليزي وصفي (`circuits`, `database`, `math-1`)
- الرقم الرسمي (إن وجد) بحقل `code` منفصل، لا يُستخدم بالروابط أبداً
- توليد slug تلقائي من الاسم العربي (بلوحة التحكم) بمسؤولية `lib/idSlug.js` (عضو 4)، قابل للتعديل اليدوي قبل الحفظ

### 4.8 `components/layout/Sidebar.jsx` — أبنيه جاهزاً بكل الروابط من اليوم الأول
يتضمن من البداية: الرئيسية، الخطة الدراسية، البحث، **رابط لوحة التحكم `/admin`**، ومكان محجوز ثابت داخل `Header.jsx` لـ `<ThemeToggleButton />` (عضو 1 يملأه باستيراد بسيط أنا أضعه، لا يحتاج يلمس Header.jsx نفسه لاحقاً — أنا أستورد مكوّنه فيه من اليوم الأول بمجرد ما يسلّم اسم الملف).

---

## 5. آلية النشر السهلة للمدير — رفع من الجهاز ← تسمية ← نشر مباشر (عضو 5)

بما إن الموقع Static (بدون خادم)، فيه **مساران** يبنيهما عضو 5 معاً، والمدير يختار أيهما يستخدم لحظتها:

### المسار أ — النشر المباشر عبر GitHub API (الأسرع، بدون Git يدوي)
1. لوحة التحكم فيها حقل لإدخال **GitHub Personal Access Token** (صلاحية `contents` فقط على هذا الريبو تحديداً — fine-grained token) — يُخزَّن بذاكرة المتصفح **فقط** لمدة الجلسة، لا يُحفظ ولا يُرفع أبداً بأي ملف
2. المدير يسحب/يختار ملفات PDF من جهازه + يعبّي نموذج (اسم المادة، الدكتور، القسم theory/lab...)
3. `lib/githubPublisher.js` يبني تلقائياً:
   - slug المادة (قابل للتعديل)
   - مسار الملفات الصحيح `public/pdf/{slug}/...` وتسمية موحّدة (`lecture-01.pdf`...)
   - يحدّث/يُنشئ `subject.json` و `lectures.json` بنفس المجلد
4. زر **"نشر"**: يستخدم GitHub Contents API (`PUT /repos/{owner}/{repo}/contents/{path}`) لإنشاء commit مباشر على فرع جديد (`content/{slug}-{timestamp}`)، ثم يفتح رابط Pull Request جاهز تلقائياً للمراجعة قبل الدمج بـ `main`
5. **لا دمج تلقائي بـ `main`** — أي نشر يمر عبر PR لمراجعتك أنت كمدير، هذا مقصود كطبقة أمان

### المسار ب — تصدير حزمة (Fallback بدون توكن)
- زر **"تنزيل الحزمة"**: يولّد ZIP يحتوي بنية المجلدات والملفات جاهزة للسحب اليدوي داخل الريبو المحلي ثم commit عادي — نفس فكرة المشروع الأول لكن كملف واحد جاهز بدل نسخ يدوي حقل بحقل

**ملاحظة أمان أوضحها للمدير داخل الواجهة نفسها:** التوكن يُستخدم من متصفحك مباشرة للاتصال بـ GitHub، Anthropic/الموقع لا يخزّنه ولا يراه أي عضو آخر — هذا جزء من تصميم عضو 5 ويجب اختباره جيداً قبل الاعتماد عليه فعلياً.

---

## 6. الميزات الكاملة المطلوبة هذي المرة (تشمل كل ناقص من المشروع الأول)

- [x] وضع مظلم تلقائي **+ زر تبديل يدوي فعلي** (حسم نهائي، لا لغز `ThemeContext` هذي المرة)
- [x] لوحة تحكم كاملة: إضافة/تعديل/إخفاء/حذف مادة، إدارة الأقسام (تسمية + ترتيب + **إخفاء قسم كامل**)
- [x] `hidden` على 3 مستويات (مادة/قسم/محاضرة) من اليوم الأول
- [x] تعدد الدكاترة لكل مادة، مع توافق عكسي كامل
- [x] عارض ملفات iframe داخل الصفحة
- [x] رفع مباشر من الجهاز + تسمية تلقائية + نشر مباشر لـ GitHub (أو تصدير حزمة)
- [x] مسار `/admin` مسجَّل من اليوم الأول (ليس مؤجّلاً كالمشروع الأول)
- [x] `docs/data-schema.md` موثّق من بداية المشروع، لا يُكتب لاحقاً

---

## 7. تسلسل العمل الفعلي

```
اليوم 0 (أنا فقط):
  - تجهيز الغلاف: App.jsx, main.jsx, Sidebar.jsx, Header.jsx (بمساحات فارغة محجوزة)
  - تجهيز public/data/study-plan.json + subjects/{2-3 مواد تجريبية} كبيانات بذرة
  - توزيع هذي الوثيقة + الملفات الفارغة/الهيكلية على كل عضو كنقطة بداية موحّدة

الأيام 1-N (الأعضاء 1-5، بالتوازي الكامل):
  - كل عضو يبني ملفاته المملوكة فقط، ضد العقود بالقسم 4
  - أي حاجة غير موجودة بالعقد → يوقف ويسألني، لا يفترض ولا يعدّل ملف غيره

بعد التسليم:
  - عضو 6 (QA) يراجع كل تسليم مقابل العقود
  - أنا أدمج ميكانيكياً فقط (إضافة import + احتمال سطر <Route> واحد لكل صفحة جديدة إن لزم — وهذا أصلاً محسوم باليوم 0)
  - رفع لفرع `integration/v2`، مراجعة نهائية، دمج بـ `main`
```

---

## 8. سجلات الأعضاء

كل عضو يحدّث `docs/logs/member-X-log.md` الخاص به فقط بعد كل جلسة (نفس صيغة المشروع الأول: ما تم إنجازه / مشكلات / قرارات / هل احتجت تعديل ملف مشترك — والجواب المتوقع دائماً هنا هو **لا**، لأن لا وجود لملفات مشتركة تُلمس أثناء التنفيذ المتوازي).

---

هل تريد أن أجهّز الآن ملفات "اليوم 0" فعلياً (App.jsx, Sidebar.jsx, Header.jsx, study-plan.json المبدئي) لتكون نقطة الانطلاق الموحّدة لكل الأعضاء؟
