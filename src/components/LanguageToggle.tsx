"use client";

import { useLanguage } from "@/hooks/useLanguage";

export function LanguageToggle({ compact = false }: { compact?: boolean }) {
  const { locale, setLocale } = useLanguage();
  const labels = { en: "EN", zh: "中文" } as const;

  return (
    <div className={`inline-flex overflow-hidden border border-white/25 ${compact ? "h-9" : "h-10"}`}>
      {(["en", "zh"] as const).map((item) => (
        <button
          key={item}
          type="button"
          onClick={() => setLocale(item)}
          className={`px-3 text-xs font-black uppercase transition ${
            locale === item ? "bg-white text-[#07586b]" : "bg-transparent text-current hover:bg-white/10"
          }`}
          aria-label={item === "en" ? "Use English" : "使用中文"}
        >
          {labels[item]}
        </button>
      ))}
    </div>
  );
}
