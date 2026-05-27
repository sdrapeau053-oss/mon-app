"use client";

import { useLanguage } from "@/lib/LanguageContext";
import { t } from "@/lib/i18n";

export default function LanguageToggle() {
  const { lang, setLang } = useLanguage();
  const nextLang = lang === "fr" ? "en" : "fr";

  return (
    <button
      aria-label="Changer la langue / Change language"
      className="fixed bottom-3 left-2 z-50 rounded-full border border-[#d6b25e]/18 bg-[#13110f]/92 px-2.5 py-1 text-[10px] font-bold text-[#d6b25e] shadow-[0_8px_22px_rgba(0,0,0,0.22)] backdrop-blur transition hover:border-[#d6b25e]/32 hover:text-[#f1e7d5] sm:bottom-4 sm:left-4 sm:text-[11px]"
      onClick={() => setLang(nextLang)}
      type="button"
    >
      {t("language.toggle", lang)}
    </button>
  );
}
