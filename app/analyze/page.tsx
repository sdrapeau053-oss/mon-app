"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createSessionContext, routeInput, runCoreAnalysis } from "@/app/lib/ai";
import { getCopy } from "@/app/lib/copy";
import type { HistoryEntry, UserProfile } from "@/app/lib/types";
import { readLocal, writeLocal } from "@/app/lib/storage";
import { AppShell, PrimaryButton, TextAreaInput } from "@/app/components/autre-rive/ui";
import { useLang } from "@/app/components/autre-rive/useLang";

export default function AnalyzePage() {
  const router = useRouter();
  const { lang, setLang } = useLang();
  const t = getCopy(lang).input;
  const [conversation, setConversation] = useState("");
  const [context, setContext] = useState<string>(t.options[0]);

  function analyze() {
    const profile = readLocal<UserProfile | null>("user_profile", null);
    const recommended = routeInput(`${context}\n${conversation}`, profile);
    const result = runCoreAnalysis(conversation, profile);
    const sessionContext = createSessionContext(result, recommended);
    const history = readLocal<HistoryEntry[]>("history", []);

    writeLocal("lr_conversation", conversation);
    writeLocal("session_context", sessionContext);
    writeLocal("lr_last_result", result);
    writeLocal("lr_recommended_module", recommended);
    writeLocal<HistoryEntry[]>("history", [
      {
        id: Date.now(),
        date: new Date().toLocaleString("fr-CA"),
        conversation,
        result,
        sessionContext,
        recommendedModule: recommended,
      },
      ...history,
    ].slice(0, 20));
    router.push("/result");
  }

  return (
    <AppShell lang={lang} onLangChange={setLang}>
      <h1 className="mb-4 text-3xl font-semibold tracking-[-0.04em]">{t.title}</h1>
      <p className="mb-6 text-sm leading-6 text-[#c8b898]">{t.helper}</p>
      <div className="mb-4 grid grid-cols-2 gap-2">
        {t.options.map((option) => (
          <button
            key={option}
            type="button"
            onClick={() => setContext(option)}
            className={`rounded-2xl border px-3 py-3 text-left text-xs ${
              context === option ? "border-[#c6a96b] bg-[#2a231e]" : "border-[#3d342e] bg-[#211c18]"
            }`}
          >
            {option}
          </button>
        ))}
      </div>
      <TextAreaInput value={conversation} onChange={setConversation} placeholder={t.placeholder} />
      <div className="mt-4">
        <PrimaryButton onClick={analyze} disabled={!conversation.trim()}>{t.cta}</PrimaryButton>
      </div>
    </AppShell>
  );
}
