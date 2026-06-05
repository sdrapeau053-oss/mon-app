"use client";

import { useState } from "react";
import type { MemoireNarrative } from "@/lib/memoire-narrative";
import type { ChapitreTome1 } from "@/lib/tome1-chapters";
import type { DiagnosticEditorialStrategique } from "@/lib/editorial-director";
import type { MotifSnapshot, ChapterSource, PersonnageSuivi, SouvenirOrphelin, ActionNarrative, ProfilAutrice } from "@/lib/livre-companion";
import { CompagnonAujourdhui } from "./CompagnonAujourdhui";
import { CompagnonPortrait } from "./CompagnonPortrait";
import { CompagnonMotifs } from "./CompagnonMotifs";
import { CompagnonPersonnages } from "./CompagnonPersonnages";
import { CompagnonAbsences } from "./CompagnonAbsences";

export type CompagnonData = {
  actions: ActionNarrative[];
  chapters: ChapterSource[];
  diagnostic: DiagnosticEditorialStrategique;
  memoires: MemoireNarrative[];
  personnages: PersonnageSuivi[];
  profil: ProfilAutrice;
  snapshot: MotifSnapshot;
  orphelins: SouvenirOrphelin[];
  tome1Chapters: ChapitreTome1[];
};

const TABS = [
  { id: "aujourd-hui", label: "Aujourd'hui" },
  { id: "portrait", label: "Portrait" },
  { id: "motifs", label: "Motifs" },
  { id: "personnages", label: "Personnages" },
  { id: "absences", label: "Absences" },
] as const;

type TabId = (typeof TABS)[number]["id"];

export function CompagnonLayout({ data }: { data: CompagnonData }) {
  const [activeTab, setActiveTab] = useState<TabId>("aujourd-hui");

  return (
    <div>
      {/* Barre d'onglets */}
      <div
        style={{
          borderBottom: "1px solid rgba(214,178,94,0.12)",
          display: "flex",
          flexWrap: "wrap",
          gap: 4,
          marginBottom: 20,
          paddingBottom: 0,
        }}
      >
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            style={{
              background: "none",
              border: "none",
              borderBottom: activeTab === tab.id
                ? "2px solid #d6b25e"
                : "2px solid transparent",
              color: activeTab === tab.id ? "#f1e7d5" : "#9c8d73",
              cursor: "pointer",
              fontSize: 13,
              fontWeight: activeTab === tab.id ? 600 : 400,
              letterSpacing: "0.04em",
              padding: "8px 14px 10px",
              transition: "color 0.15s",
            }}
            type="button"
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Contenu de l'onglet actif */}
      {activeTab === "aujourd-hui" && <CompagnonAujourdhui data={data} />}
      {activeTab === "portrait" && <CompagnonPortrait data={data} />}
      {activeTab === "motifs" && <CompagnonMotifs data={data} />}
      {activeTab === "personnages" && <CompagnonPersonnages data={data} />}
      {activeTab === "absences" && <CompagnonAbsences data={data} />}
    </div>
  );
}
