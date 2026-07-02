"use client";

import { LanguageProvider } from "@/hooks/useLanguage";

export function ClientProviders({ children }: { children: React.ReactNode }) {
  return <LanguageProvider>{children}</LanguageProvider>;
}
