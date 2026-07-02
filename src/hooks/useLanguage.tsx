"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import type { Locale, LocalizedText } from "@/types/catalog";

type LanguageContextValue = {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  pick: (value: LocalizedText) => string;
};

const LanguageContext = createContext<LanguageContextValue | null>(null);

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>("en");

  useEffect(() => {
    queueMicrotask(() => {
      const stored = window.localStorage.getItem("famfood-locale");
      if (stored === "en" || stored === "zh") setLocaleState(stored);
    });
  }, []);

  function setLocale(nextLocale: Locale) {
    setLocaleState(nextLocale);
    window.localStorage.setItem("famfood-locale", nextLocale);
  }

  const value = useMemo(
    () => ({
      locale,
      setLocale,
      pick: (localized: LocalizedText) => localized[locale] || localized.en,
    }),
    [locale],
  );

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) throw new Error("useLanguage must be used inside LanguageProvider");
  return context;
}
