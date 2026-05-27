"use client";

import { getCopy } from "@/app/lib/copy";
import type { AnalysisResult } from "@/app/lib/types";
import { readLocal } from "@/app/lib/storage";
import { AppShell, PrimaryButton, ResultCard } from "@/app/components/autre-rive/ui";
import { useLang } from "@/app/components/autre-rive/useLang";

const emptyResult: AnalysisResult = {
  signal: "flou",
  intent: "incertaine",
  risk: "modéré",
  userPattern: "tu analyses pour te rassurer",
  action: "ralentis, observe ses actes, ne comble pas le flou",
  confidence: "low",
};

export default function ResultPage() {
  const { lang, setLang } = useLang();
  const t = getCopy(lang).result;
  const result = readLocal<AnalysisResult>("lr_last_result", emptyResult);

  return (
    <AppShell lang={lang} onLangChange={setLang}>
      <h1 className="mb-5 text-3xl font-semibold tracking-[-0.04em]">{t.title}</h1>
      <div className="space-y-3">
        <ResultCard label={t.labels.signal} value={lang === "en" && result.signal === "incohérent" ? "inconsistent" : result.signal} />
        <ResultCard label={t.labels.intent} value={lang === "en" ? "uncertain" : result.intent} />
        <ResultCard label={t.labels.risk} value={lang === "en" ? (result.risk === "élevé" ? "high" : "medium") : result.risk} />
        <ResultCard label={t.labels.userPattern} value={lang === "en" ? "you analyze to feel safe" : result.userPattern} />
        <ResultCard label={t.labels.action} value={lang === "en" ? "slow down, watch actions, do not fill the silence" : result.action} />
      </div>
      <p className="my-7 rounded-3xl bg-[#2a231e] p-5 text-xl font-semibold leading-8 text-[#f7efe4]">
        {t.punchline}
      </p>
      <PrimaryButton href="/deeper">{t.cta}</PrimaryButton>
    </AppShell>
  );
}
