"use client";

import { getCopy } from "@/app/lib/copy";
import { AppShell } from "@/app/components/autre-rive/ui";
import { ProfileForm } from "@/app/components/autre-rive/ProfileModal";
import { useLang } from "@/app/components/autre-rive/useLang";

export default function ProfilePage() {
  const { lang, setLang } = useLang();
  const t = getCopy(lang).profile;

  return (
    <AppShell lang={lang} onLangChange={setLang}>
      <h1 className="mb-3 text-3xl font-semibold tracking-[-0.04em]">{t.title}</h1>
      <p className="mb-6 text-sm leading-6 text-[#c8b898]">{t.subtitle}</p>
      <ProfileForm lang={lang} />
    </AppShell>
  );
}
