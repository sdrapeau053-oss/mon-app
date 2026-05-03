"use client";

import { getCopy, modulePath } from "@/app/lib/copy";
import type { ModuleType, RecommendedModule } from "@/app/lib/types";
import { readLocal } from "@/app/lib/storage";
import { AppShell, ChoiceCard } from "@/app/components/autre-rive/ui";
import { useLang } from "@/app/components/autre-rive/useLang";

const recommendationMap: Record<RecommendedModule, ModuleType> = {
  CLARITY: "understand",
  UNDERSTANDING: "understand",
  DECISION: "decision",
  SAFETY: "safety",
};

export default function DeeperPage() {
  const { lang, setLang } = useLang();
  const t = getCopy(lang).deeper;
  const recommended = readLocal<RecommendedModule>("lr_recommended_module", "CLARITY");
  const recommendedType = recommendationMap[recommended];

  return (
    <AppShell lang={lang} onLangChange={setLang}>
      <h1 className="mb-7 text-3xl font-semibold leading-tight tracking-[-0.04em]">{t.title}</h1>
      <div className="space-y-3">
        {(["understand", "decision", "safety"] as ModuleType[]).map((type) => {
          const [title, subtitle] = t.cards[type];
          return (
            <ChoiceCard
              key={type}
              title={title}
              subtitle={subtitle}
              href={modulePath(type)}
              recommended={recommendedType === type ? t.recommended : undefined}
            />
          );
        })}
      </div>
    </AppShell>
  );
}
