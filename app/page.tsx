"use client";

import { getCopy } from "@/app/lib/copy";
import { AppShell, PrimaryButton, SecondaryButton } from "@/app/components/autre-rive/ui";
import { useLang } from "@/app/components/autre-rive/useLang";

export default function HomePage() {
  const { lang, setLang } = useLang();
  const t = getCopy(lang).home;

  return (
    <AppShell lang={lang} onLangChange={setLang}>
      <div className="flex min-h-[70vh] flex-col justify-center">
        <p className="mb-4 text-[11px] font-bold uppercase tracking-[0.22em] text-[#c6a96b]">L’autre rive</p>
        <h1 className="mb-5 text-4xl font-semibold leading-tight tracking-[-0.04em] text-[#f7efe4]">
          {t.title}
        </h1>
        <p className="mb-9 text-base leading-7 text-[#c8b898]">{t.subtitle}</p>
        <div className="space-y-3">
          <SecondaryButton href="/autre-rive">L’autre rive</SecondaryButton>
          <PrimaryButton href="/analyze">{t.primary}</PrimaryButton>
          <SecondaryButton href="/candidate">{t.secondary}</SecondaryButton>
        </div>
      </div>
    </AppShell>
  );
}
