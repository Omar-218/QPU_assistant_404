import React from "react";

// ⚠️ ملف مملوك للمدير — لا يُعدَّل من قبل أي عضو.
//
// قسم "تواصل مع المشرفين" — مثبَّت دائماً أسفل القائمة الجانبية (Sidebar.jsx)،
// لا يتحرك مع تمرير المحتوى فوقه (Favorites/RecentlyViewed).
//
// 🔧 للتعديل: غيّر فقط قيم href/label بمصفوفة CONTACTS أدناه — لا حاجة للمس
// أي شي ثاني بالملف. احذف أي عنصر بالكامل من المصفوفة لو ما تحتاجه.
//   - واتساب: الصيغة "https://wa.me/<رقم دولي بلا + أو أصفار بالبداية>"
//     مثال لرقم سوري 09xxxxxxxx → "https://wa.me/9639xxxxxxxx"
//   - تيليجرام: "https://t.me/<اسم المستخدم أو القناة بلا @>"
//   - اتصال مباشر: "tel:+9639xxxxxxxx"
const CONTACTS = [
  {
    id: "whatsapp",
    label: "واتساب",
    href: "https://wa.me/212766403599", // 🔧 عدّل الرقم
    icon: ChatIcon,
  },
  {
    id: "telegram",
    label: "تيليجرام",
    href: "https://t.me/AskEnger6598bot?start=40b6a3c36db2b8be370a183d0c5663246111560", // 🔧 عدّل المعرّف
    icon: SendIcon,
  },
];

function ChatIcon(props) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" {...props}>
      <path d="M12 3C7 3 3 6.6 3 11c0 2.2 1 4.2 2.6 5.7L5 21l4.4-1.5c.8.2 1.7.3 2.6.3 5 0 9-3.6 9-8.5S17 3 12 3Z" />
    </svg>
  );
}

function SendIcon(props) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" {...props}>
      <path d="M3 11 20 3l-8 17-2-7-7-2Z" />
    </svg>
  );
}

function PhoneIcon(props) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" {...props}>
      <path d="M6.6 10.8c1.4 2.8 3.8 5.2 6.6 6.6l2.2-2.2c.3-.3.7-.4 1-.2 1.1.4 2.3.6 3.5.6.6 0 1 .4 1 1v3.4c0 .6-.4 1-1 1C10.3 21 3 13.7 3 4.9c0-.6.4-1 1-1h3.4c.6 0 1 .4 1 1 0 1.2.2 2.4.6 3.5.1.3 0 .7-.2 1L6.6 10.8Z" />
    </svg>
  );
}

export default function ContactSection() {
  if (CONTACTS.length === 0) return null;

  return (
    <div className="mt-4 shrink-0 border-t border-border pt-3">
      <p className="mb-2 px-1 text-xs font-semibold text-text-muted">
        تواصل مع المشرفين
      </p>
      <div className="flex flex-col gap-1">
        {CONTACTS.map(({ id, label, href, icon: Icon }) => (
          <a
            key={id}
            href={href}
            {...(href.startsWith("http")
              ? { target: "_blank", rel: "noopener noreferrer" }
              : {})}
            className="flex items-center gap-2 rounded-md px-3 py-2 text-sm text-text
              transition-colors hover:bg-bg-elevated"
          >
            <Icon className="h-4 w-4 shrink-0 text-text-muted" />
            <span>{label}</span>
          </a>
        ))}
      </div>
    </div>
  );
}