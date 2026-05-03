"use client";

import { useParams } from "next/navigation";
import { runDecisionModule, runSafetyModule, runUnderstandModule } from "@/app/lib/ai";
import { getCopy } from "@/app/lib/copy";
import type { ModuleType, SessionContext, UserProfile } from "@/app/lib/types";
import { readLocal, writeLocal } from "@/app/lib/storage";
import { AppShell, ModuleCard, PrimaryButton } from "@/app/components/autre-rive/ui";
import { useLang } from "@/app/components/autre-rive/useLang";

const fallbackSession: SessionContext = {
  signal: "unclear",
  intent: "uncertain",
  risk: "medium",
  confidence: "low",
  userPattern: "tu analyses pour te rassurer",
  modulesRun: [],
  summary: "",
};

function isModuleType(value: string): value is ModuleType {
  return ["understand", "decision", "safety"].includes(value);
}

export default function ModulePage() {
  const params = useParams<{ type: string }>();
  const { lang, setLang } = useLang();
  const type = isModuleType(params.type) ? params.type : "understand";
  const session = readLocal<SessionContext>("session_context", fallbackSession);
  const profile = readLocal<UserProfile | null>("user_profile", null);
  const conversation = readLocal<string>("lr_conversation", "");
  const result = type === "decision"
    ? runDecisionModule(conversation, session, profile)
    : type === "safety"
      ? runSafetyModule(conversation, session, profile)
      : runUnderstandModule(conversation, session, profile);
  const sections = result.sections as [string, string[]][];

  if (!session.modulesRun.includes(type)) {
    writeLocal<SessionContext>("session_context", {
      ...session,
      modulesRun: [...session.modulesRun, type],
    });
  }

  const title = lang === "fr" ? result.title : getCopy(lang).modules[type].title;

  return (
    <AppShell lang={lang} onLangChange={setLang}>
      <h1 className="mb-6 text-3xl font-semibold tracking-[-0.04em]">{title}</h1>
      <div className="space-y-3">
        {sections.map(([section, items]) => (
          <ModuleCard key={section} title={section} items={items} />
        ))}
      </div>
      <div className="mt-6">
        <PrimaryButton href="/patterns">{lang === "fr" ? "Voir mes patterns" : "See my patterns"}</PrimaryButton>
      </div>
    </AppShell>
  );
}
