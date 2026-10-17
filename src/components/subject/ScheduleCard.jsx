import React, { useMemo, useState } from "react";
import { normalizeScheduleList } from "../../lib/scheduleDays.js";

// بطاقة مواعيد الدوام (نظري/عملي): جدول مدمج بأعمدة (الشعبة | الوقت | القاعة) مع
// تبويب نظري/عملي. تقرأ نفس بيانات subject.scheduleDays بلا أي تغيير بشكلها: نص
// location بصيغة "<الاختصاص> ش <رقم> · <القاعة>" يُفكَّك هنا للعرض فقط، وأي نص لا
// يطابقها يُعرَض كما هو (توافق كامل مع البيانات القديمة).

function splitLocation(loc) {
  const text = String(loc || "").trim();
  if (!text) return { group: "", room: "" };
  const idx = text.indexOf(" · ");
  if (idx >= 0) return { group: text.slice(0, idx).trim(), room: text.slice(idx + 3).trim() };
  if (/ش\s*\d|شعب/.test(text)) return { group: text, room: "" };
  return { group: "", room: text };
}

// "معلوماتية + اتصالات ش 1" → { spec: "معلوماتية + اتصالات", shu3ba: "ش 1" }
function splitGroup(group) {
  const m = group.match(/^(.*?)\s*(ش\s*\d+.*|شعب.*)$/);
  return m ? { spec: m[1].trim(), shu3ba: m[2].trim() } : { spec: "", shu3ba: group };
}

const KIND_LABELS = { theory: "📖 النظري", lab: "🧪 العملي" };

export default function ScheduleCard({ scheduleDays }) {
  const lists = useMemo(() => {
    const prep = (v) =>
      normalizeScheduleList(v).map((e) => {
        const { group, room } = splitLocation(e.location);
        return { ...e, room, ...splitGroup(group) };
      });
    return { theory: prep(scheduleDays?.theory), lab: prep(scheduleDays?.lab) };
  }, [scheduleDays]);
  const kinds = ["theory", "lab"].filter((k) => lists[k].length > 0);
  const [kind, setKind] = useState(kinds[0]);

  if (kinds.length === 0) return null;
  const activeKind = kinds.includes(kind) ? kind : kinds[0];
  const rows = lists[activeKind]
    .slice()
    .sort((a, b) => (a.start || "99").localeCompare(b.start || "99"));

  const days = [...new Set(rows.map((r) => r.day).filter(Boolean))];
  const singleDay = days.length === 1 ? days[0] : null;
  const hasGroup = rows.some((r) => r.shu3ba);
  const hasRoom = rows.some((r) => r.room);
  // الشعبة وحدها تكفي (ش 1، ش 2...) — إلا لو تكرر نفس رقم الشعبة باختصاصين مختلفين
  // (مثل رياضيات 1: معلوماتية ش 1 واتصالات ش 1)، عندها يُضاف الاختصاص منعاً للّبس.
  const specs = new Set(rows.map((r) => r.spec).filter(Boolean));
  const showSpec = specs.size > 1;

  const pill = (active) =>
    `rounded-full border px-2.5 py-0.5 text-xs transition-colors ${
      active ? "border-accent bg-accent text-white" : "border-border text-text hover:bg-bg-elevated"
    }`;
  const th = "px-2 py-0.5 text-start text-xs font-medium text-text-muted";
  const td = "px-2 py-1 whitespace-nowrap";

  return (
    <div className="mt-2 inline-block max-w-full rounded-md border border-border bg-bg-subtle px-2.5 py-2">
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1">
        <p className="text-sm font-bold text-text-h">
          🗓️ مواعيد الدوام{singleDay ? ` — ${singleDay}` : ""}
        </p>
        {kinds.length > 1 && (
          <div className="flex gap-1">
            {kinds.map((k) => (
              <button key={k} type="button" onClick={() => setKind(k)} className={pill(activeKind === k)}>
                {KIND_LABELS[k]}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="mt-1 overflow-x-auto">
        <table className="border-collapse text-sm">
          <thead>
            <tr>
              {!singleDay && <th className={th}>اليوم</th>}
              {hasGroup && <th className={th}>الشعبة</th>}
              <th className={th}>الوقت</th>
              {hasRoom && <th className={th}>القاعة</th>}
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={i} className="border-t border-border text-text">
                {!singleDay && <td className={td}>{r.day || "—"}</td>}
                {hasGroup && (
                  <td className={td}>{r.shu3ba ? (showSpec && r.spec ? `${r.spec} ${r.shu3ba}` : r.shu3ba) : "—"}</td>
                )}
                <td className={td}>
                  {r.start && r.end ? (
                    <bdi dir="ltr">{r.start} - {r.end}</bdi>
                  ) : r.start ? (
                    <bdi dir="ltr">{r.start}</bdi>
                  ) : (
                    "—"
                  )}
                </td>
                {hasRoom && <td className={td}>{r.room || "—"}</td>}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
