"use client";

import { useState } from "react";
import { runCandidateAnalysis } from "@/app/lib/ai";
import { getCopy } from "@/app/lib/copy";
import type { CandidateResult, UserProfile } from "@/app/lib/types";
import { readLocal } from "@/app/lib/storage";
import { AppShell, PrimaryButton, ResultCard } from "@/app/components/autre-rive/ui";
import { useLang } from "@/app/components/autre-rive/useLang";

export default function CandidatePage() {
  const { lang, setLang } = useLang();
  const t = getCopy(lang).candidate;
  const [fields, setFields] = useState<string[]>(Array(t.fields.length).fill(""));
  const [result, setResult] = useState<CandidateResult | null>(null);

  function update(index: number, value: string) {
    setFields((current) => current.map((item, i) => (i === index ? value : item)));
  }

  function analyze() {
    const profile = readLocal<UserProfile | null>("user_profile", null);
    setResult(runCandidateAnalysis(fields.join("\n"), profile));
  }

  return (
    <AppShell lang={lang} onLangChange={setLang}>
      <h1 className="mb-5 text-3xl font-semibold leading-tight tracking-[-0.04em]">{t.title}</h1>
      <div className="space-y-3">
        {t.fields.map((label, index) => (
          <label key={label} className="block rounded-3xl border border-[#3d342e] bg-[#211c18] p-4">
            <span className="mb-2 block text-[11px] font-bold uppercase tracking-[0.16em] text-[#9f8f82]">{label}</span>
            <textarea
              value={fields[index]}
              onChange={(event) => update(index, event.target.value)}
              className="min-h-20 w-full resize-none bg-transparent text-sm leading-6 text-[#f7efe4] outline-none placeholder:text-[#82746a]"
            />
          </label>
        ))}
      </div>
      <div className="my-5">
        <PrimaryButton onClick={analyze}>{t.cta}</PrimaryButton>
      </div>
      {result && (
        <div className="space-y-3">
          <ResultCard label={t.labels.compatibility} value={`${result.compatibility}/10`} />
          <ResultCard label={t.labels.emotionalRisk} value={lang === "fr" ? result.emotionalRisk : "moderate"} />
          <ResultCard label={t.labels.triggeredPattern} value={lang === "fr" ? result.triggeredPattern : "fear of inconsistency"} />
          <ResultCard label={t.labels.verdict} value={lang === "fr" ? result.verdict : "observe this candidate"} />
          <ResultCard label={t.labels.action} value={lang === "fr" ? result.action : "wait for proof of consistency before investing"} />
        </div>
      )}
    </AppShell>
  );
}
