# assistant404-v2 — نقطة انطلاق اليوم 0

هذا الهيكل جاهز للتشغيل مباشرة (`npm install && npm run dev`) ويعمل فعلياً من الآن بمكوّنات "Placeholder" لكل عضو، حتى لا ينكسر أي شيء قبل التسليمات الفعلية.

## كيف تبدأ
```bash
npm install
npm run dev
```

## ملاحظات مهمة لكل عضو
- **افتح `docs/team-plan-v2.md` أولاً** — فيه كل العقود (أسماء الحقول، شكل JSON، توقيعات الـ hooks) التي يجب البناء ضدها حرفياً.
- **افتح `docs/logs/member-X-log.md` الخاص بك فقط** وحدّثه بعد كل جلسة عمل.
- كل ملف بهذا الهيكل يحمل تعليقاً بالأعلى يوضّح لمن هو مملوك. **لا تعدّل ملفاً مملوكاً لغيرك أبداً** — إذا احتجت شيئاً غير موجود بالعقود، توقف وأبلغ المدير.
- الملفات المعلّمة "⚠️ Placeholder" هي نقطة بداية بسيطة فقط لتشتغل عليها بحرية كاملة — استبدلها بمحتواك النهائي بشرط الحفاظ على نفس اسم الملف والمسار والـ default export.
- الملف المعلّم "✅ نهائي جاهز" (`sectionLabels.js`) لا يُعدَّل إطلاقاً، فقط يُستورد.

## من يملك ماذا (ملخص سريع — التفاصيل الكاملة بـ team-plan-v2.md)
| العضو | المجلدات/الملفات |
|---|---|
| المدير | `App.jsx`, `main.jsx`, `components/layout/*`, `public/data/study-plan.json` (البذرة فقط) |
| 1 — الثيم | `index.css`, `lib/theme/*`, `hooks/useTheme.js`, `components/theme/*` |
| 2 — صفحات الطالب | `pages/SubjectList.jsx`, `pages/Subject.jsx`, `pages/StudyPlan.jsx`, `components/subject/*` |
| 3 — لوحة التحكم | `pages/Admin/*`, `components/admin/SubjectForm.jsx`, `SectionsManager.jsx`, `FileUploaderWidget.jsx` |
| 4 — منطق البيانات | `lib/professorVariants.js`, `lib/hiddenFilter.js`, `lib/idSlug.js`, `hooks/useSubjectData.js` |
| 5 — النشر | `lib/githubPublisher.js`, `components/admin/PublishPanel.jsx` |
| 6 — QA | `docs/data-schema.md`, `docs/logs/member-6-log.md` |
"# QPU_assistant_404" 
"# QPU_assistant_404" 
"# QPU_assistant_404" 
"# QPU_assistant_404" 
"# QPU_assistant_404" 
