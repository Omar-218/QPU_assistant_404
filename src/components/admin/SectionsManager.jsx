import React from "react";
import { SECTION_LABELS } from "../../lib/sectionLabels.js";

// ⚠️ ملف مملوك لعضو 3 — القسم 4.5 (مستوى "القسم" و"المحاضرة الفردية" من حقل hidden)
// يستورد SECTION_LABELS فقط (ملف نهائي، لا يُعدَّل هنا إطلاقاً — القسم 4.4).

const ALL_SECTION_KEYS = Object.keys(SECTION_LABELS);

/**
 * مكوّن لإدارة أقسام مادة واحدة (theory/lab/extra/exam) وعناصرها:
 * - إخفاء/إظهار قسم كامل
 * - إخفاء/إظهار عنصر (محاضرة) مفرد داخل القسم
 * - إعادة ترتيب الأقسام (أعلى/أسفل)
 * - حذف عنصر، تعديل عنوانه
 * - إضافة قسم جديد من الأنواع المتاحة في SECTION_LABELS
 *
 * يعمل بمعزل عن أي منطق شبكة — بيانات داخل/خارج فقط عبر props.
 *
 * Props:
 *  - sections: [{ section, hidden, items: [{ title, file, hidden }] }]
 *  - onChange(nextSections)
 */
export default function SectionsManager({ sections = [], onChange }) {
  function update(next) {
    onChange?.(next);
  }

  function toggleSectionHidden(index) {
    const next = sections.map((s, i) => (i === index ? { ...s, hidden: !s.hidden } : s));
    update(next);
  }

  function toggleItemHidden(sIndex, iIndex) {
    const next = sections.map((s, i) => {
      if (i !== sIndex) return s;
      return {
        ...s,
        items: s.items.map((it, j) => (j === iIndex ? { ...it, hidden: !it.hidden } : it)),
      };
    });
    update(next);
  }

  function removeItem(sIndex, iIndex) {
    const next = sections.map((s, i) => {
      if (i !== sIndex) return s;
      return { ...s, items: s.items.filter((_, j) => j !== iIndex) };
    });
    update(next);
  }

  function renameItem(sIndex, iIndex, title) {
    const next = sections.map((s, i) => {
      if (i !== sIndex) return s;
      return {
        ...s,
        items: s.items.map((it, j) => (j === iIndex ? { ...it, title } : it)),
      };
    });
    update(next);
  }

  function moveSection(index, dir) {
    const target = index + dir;
    if (target < 0 || target >= sections.length) return;
    const next = [...sections];
    [next[index], next[target]] = [next[target], next[index]];
    update(next);
  }

  function removeSection(index) {
    update(sections.filter((_, i) => i !== index));
  }

  function addSection(key) {
    if (!key || sections.some((s) => s.section === key)) return;
    update([...sections, { section: key, hidden: false, items: [] }]);
  }

  const availableKeys = ALL_SECTION_KEYS.filter(
    (k) => !sections.some((s) => s.section === k)
  );

  return (
    <div className="flex flex-col gap-4">
      {sections.length === 0 && (
        <p className="text-sm text-text-muted">لا توجد أقسام بعد — أضف قسماً من الأسفل.</p>
      )}

      {sections.map((s, sIndex) => (
        <div
          key={s.section}
          className={`rounded-lg border p-3 ${
            s.hidden ? "border-warning-border bg-warning-bg" : "border-border bg-bg-subtle"
          }`}
        >
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="font-medium text-text-h">
                {SECTION_LABELS[s.section] ?? s.section}
              </span>
              {s.hidden && (
                <span className="rounded-full bg-warning-border px-2 py-0.5 text-xs text-warning-text">
                  مخفي
                </span>
              )}
            </div>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => moveSection(sIndex, -1)}
                disabled={sIndex === 0}
                className="rounded-md border border-border px-2 py-1 text-xs text-text hover:bg-bg-elevated disabled:opacity-40"
              >
                ▲ أعلى
              </button>
              <button
                type="button"
                onClick={() => moveSection(sIndex, 1)}
                disabled={sIndex === sections.length - 1}
                className="rounded-md border border-border px-2 py-1 text-xs text-text hover:bg-bg-elevated disabled:opacity-40"
              >
                ▼ أسفل
              </button>
              <button
                type="button"
                onClick={() => toggleSectionHidden(sIndex)}
                className="rounded-md border border-border px-2 py-1 text-xs text-text hover:bg-bg-elevated"
              >
                {s.hidden ? "إظهار القسم" : "إخفاء القسم"}
              </button>
              <button
                type="button"
                onClick={() => removeSection(sIndex)}
                className="rounded-md border border-danger-border bg-danger-bg px-2 py-1 text-xs text-danger-text hover:opacity-80"
              >
                حذف القسم
              </button>
            </div>
          </div>

          <ul className="mt-3 flex flex-col gap-2">
            {(s.items || []).map((item, iIndex) => (
              <li
                key={`${item.file}-${iIndex}`}
                className={`flex flex-wrap items-center gap-2 rounded-md border px-3 py-2 text-sm ${
                  item.hidden ? "border-warning-border bg-warning-bg/60" : "border-border bg-bg"
                }`}
              >
                <input
                  value={item.title}
                  onChange={(e) => renameItem(sIndex, iIndex, e.target.value)}
                  className="min-w-0 flex-1 rounded-md border border-border bg-bg px-2 py-1 text-text"
                />
                <span className="shrink-0 text-xs text-text-muted">{item.file}</span>
                <button
                  type="button"
                  onClick={() => toggleItemHidden(sIndex, iIndex)}
                  className="shrink-0 rounded-md border border-border px-2 py-1 text-xs text-text hover:bg-bg-elevated"
                >
                  {item.hidden ? "إظهار" : "إخفاء"}
                </button>
                <button
                  type="button"
                  onClick={() => removeItem(sIndex, iIndex)}
                  className="shrink-0 rounded-md border border-danger-border bg-danger-bg px-2 py-1 text-xs text-danger-text hover:opacity-80"
                >
                  حذف
                </button>
              </li>
            ))}
            {(s.items || []).length === 0 && (
              <li className="text-xs text-text-muted">لا توجد محاضرات بهذا القسم بعد.</li>
            )}
          </ul>
        </div>
      ))}

      {availableKeys.length > 0 && (
        <div className="flex items-center gap-2">
          <select
            id="add-section-select"
            defaultValue=""
            onChange={(e) => {
              addSection(e.target.value);
              e.target.value = "";
            }}
            className="rounded-md border border-border bg-bg px-3 py-1.5 text-sm text-text"
          >
            <option value="" disabled>
              + إضافة قسم
            </option>
            {availableKeys.map((k) => (
              <option key={k} value={k}>
                {SECTION_LABELS[k]}
              </option>
            ))}
          </select>
        </div>
      )}
    </div>
  );
}
