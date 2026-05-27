"use client";

import { getCopy } from "@/app/lib/copy";
import type { HistoryEntry } from "@/app/lib/types";
import { readLocal } from "@/app/lib/storage";
import { AppShell, PatternCard } from "@/app/components/autre-rive/ui";
import { useLang } from "@/app/components/autre-rive/useLang";

export default function PatternsPage() {
  const { lang, setLang } = useLang();
  const t = getCopy(lang).patterns;
  const history = readLocal<HistoryEntry[]>("history", []);

  return (
    <AppShell lang={lang} onLangChange={setLang}>
      <h1 className="mb-6 text-3xl font-semibold leading-tight tracking-[-0.04em]">{t.title}</h1>
      <div className="mb-6 grid grid-cols-1 gap-3">
        {t.cards.map((item) => <PatternCard key={item} text={item} />)}
      </div>
      <p className="mb-6 rounded-3xl bg-[#2a231e] p-5 text-lg font-semibold leading-8">{t.punchline}</p>
      <section className="space-y-3">
        {history.length === 0 ? (
          <p className="text-sm text-[#c8b898]">{t.empty}</p>
        ) : (
          history.map((entry) => (
            <article key={entry.id} className="rounded-3xl border border-[#3d342e] bg-[#211c18] p-4">
              <p className="mb-2 text-[11px] text-[#9f8f82]">{entry.date}</p>
              <p className="text-sm font-semibold">{entry.result.signal} · {entry.result.risk}</p>
              <p className="mt-2 text-sm leading-6 text-[#c8b898]">{entry.result.userPattern}</p>
            </article>
          ))
        )}
      </section>
    </AppShell>
  );
}
