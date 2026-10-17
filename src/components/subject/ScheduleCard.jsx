import React, { useMemo, useState } from "react";
import { normalizeScheduleList } from "../../lib/scheduleDays.js";

// بطاقة مواعيد الدوام (نظري/عملي) بدل سطور نصية متتالية: جدول مرتّب بأعمدة
// (الشعبة | الوقت | القاعة)، تبويب نظري/عملي، وفلتر حسب الاختصاص لو وُجد أكثر من
// اختصاص. تقرأ نفس بيانات subject.scheduleDays بلا أي تغيير بشكلها: نص location
// بصيغة "<الاختصاص> ش <رقم> · <القاعة>" يُفكَّك هنا للعرض فقط، وأي نص لا يطابقها
// يُعرَض كما هو (توافق كامل مع البيانات القديمة).

const SPEC_KEY = "assistant404:scheduleSpec";
const SPECS = ["معلوماتية", "اتصالات"];

function splitLocation(loc) {
  const text = String(loc || "").trim();
  if (!text) return { group: "", room: "" };
  const idx = text.indexOf(" · ");
  if (idx >= 0) return { group: text.slice(0, idx).trim(), room: text.slice(idx + 3).trim() };
  if (/ش\s*\d|شعب/.test(text)) return { group: text, room: "" };
  return { group: "", room: text };
}

function readSavedSpec() {
  try {
    return localStorage.getItem(SPEC_KEY) || "all";
  } catch {
    return "all";
  }
}

function saveSpec(value) {
  try {
    localStorage.setItem(SPEC_KEY, value);
  } catch {
    /* التخزين غير متاح — يبقى الاختيار للجلسة فقط */
  }
}

const KIND_LABELS = { theory: "📖 النظري", lab: "🧪 العملي" };

export default function ScheduleCard({ scheduleDays }) {
  const lists = useMemo(
    () => ({
      theory: normalizeScheduleList(scheduleDays?.theory).map((e) => ({ ...e, ...splitLocation(e.location) })),
      lab: normalizeScheduleList(scheduleDays?.lab).map((e) => ({ ...e, ...splitLocation(e.location) })),
    }),
    [scheduleDays]
  );
  const kinds = ["theory", "lab"].filter((k) => lists[k].length > 0);
  const [kind, setKind] = useState(kinds[0]);
  const [spec, setSpec] = useState(readSavedSpec);

  if (kinds.length === 0) return null;
  const activeKind = kinds.includes(kind) ? kind : kinds[0];
  const all = lists[activeKind];

  // خيارات الاختصاص المتاحة فعلاً بمواعيد هذي المادة (كلا النوعين).
  const everything = [...lists.theory, ...lists.lab];
  const availableSpecs = SPECS.filter((s) => everything.some((e) => e.group.includes(s)));
  const activeSpec = availableSpecs.includes(spec) ? spec : "all";

  const rows = all
    .filter((e) => activeSpec === "all" || !e.group || e.group.includes(activeSpec))
    .slice()
    .sort((a, b) => (a.start || "99").localeCompare(b.start || "99"));

  const days = [...new Set(rows.map((r) => r.day).filter(Boolean))];
  const singleDay = days.length === 1 ? days[0] : null;
  const hasGroup = rows.some((r) => r.group);
  const hasRoom = rows.some((r) => r.room);

  function chooseSpec(value) {
    setSpec(value);
    saveSpec(value);
  }

  const pill = (active) =>
    `rounded-full border px-3 py-1 text-xs transition-colors ${
      active ? "border-accent bg-accent text-white" : "border-border text-text hover:bg-bg-elevated"
    }`;

  return (
    <div className="mt-3 rounded-lg border border-border bg-bg-subtle p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm font-bold text-text-h">
          🗓️ مواعيد الدوام{singleDay ? ` — ${singleDay}` : ""}
        </p>
        <div className="flex flex-wrap gap-1.5">
          {kinds.length > 1 &&
            kinds.map((k) => (
              <button key={k} type="button" onClick={() => setKind(k)} className={pill(activeKind === k)}>
                {KIND_LABELS[k]}
              </button>
            ))}
        </div>
      </div>

      {availableSpecs.length > 1 && (
        <div className="mt-2 flex flex-wrap items-center gap-1.5">
          <span className="text-xs text-text-muted">اختصاصي:</span>
          <button type="button" onClick={() => chooseSpec("all")} className={pill(activeSpec === "all")}>
            الكل
          </button>
          {availableSpecs.map((s) => (
            <button key={s} type="button" onClick={() => chooseSpec(s)} className={pill(activeSpec === s)}>
              {s}
            </button>
          ))}
        </div>
      )}

      {rows.length === 0 ? (
        <p className="mt-2 text-xs text-text-muted">لا توجد مواعيد لهذا الاختصاص.</p>
      ) : (
        <div className="mt-2 overflow-x-auto">
          <table className="w-full min-w-[260px] border-collapse text-sm">
            <thead>
              <tr className="text-xs text-text-muted">
                {!singleDay && <th className="px-2 py-1 text-start font-medium">اليوم</th>}
                {hasGroup && <th className="px-2 py-1 text-start font-medium">الشعبة</th>}
                <th className="px-2 py-1 text-start font-medium">الوقت</th>
                {hasRoom && <th className="px-2 py-1 text-start font-medium">القاعة</th>}
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={i} className="border-t border-border text-text">
                  {!singleDay && <td className="px-2 py-1.5 whitespace-nowrap">{r.day || "—"}</td>}
                  {hasGroup && <td className="px-2 py-1.5">{r.group || "—"}</td>}
                  <td className="px-2 py-1.5 whitespace-nowrap">
                    {r.start && r.end ? <bdi dir="ltr">{r.start} - {r.end}</bdi> : r.start ? <bdi dir="ltr">{r.start}</bdi> : "—"}
                  </td>
                  {hasRoom && <td className="px-2 py-1.5">{r.room || "—"}</td>}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
