"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import type { AppLanguage } from "@/lib/i18n";

type LanguageContextValue = {
  lang: AppLanguage;
  setLang: (lang: AppLanguage) => void;
};

const LANGUAGE_KEY = "app-language";
const LanguageContext = createContext<LanguageContextValue | null>(null);

function normalizeLanguage(value: string | null): AppLanguage {
  return value === "en" ? "en" : "fr";
}

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = useState<AppLanguage>("fr");

  useEffect(() => {
    try {
      setLangState(normalizeLanguage(localStorage.getItem(LANGUAGE_KEY)));
    } catch {
      setLangState("fr");
    }
  }, []);

  const setLang = (nextLang: AppLanguage) => {
    setLangState(nextLang);
    try {
      localStorage.setItem(LANGUAGE_KEY, nextLang);
    } catch {
      // localStorage can be unavailable in private or restricted browser modes.
    }
  };

  const value = useMemo(() => ({ lang, setLang }), [lang]);

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) {
    return { lang: "fr" as AppLanguage, setLang: () => undefined };
  }
  return context;
}
