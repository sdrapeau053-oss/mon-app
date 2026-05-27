"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  StateTile,
  StatusChip,
  SystemActionRow,
  SystemDividerBlock,
  SystemGrid,
  SystemPageShell,
  SystemPanel,
  SystemSectionHeader,
} from "@/components/system-ui";
import {
  emptyCentreQuickSettings,
  readCentreQuickSettings,
  readStoredOrchestratorState,
  type CentreQuickSettings,
  type SystemOrchestratorState,
} from "@/lib/system-orchestrator";

type TimelineMoment = "matin" | "apres-ecole" | "apres-midi" | "soir" | "recuperation" | "focus" | "crise" | "essentiel";

type TimelineEntry = {
  id: string;
  text: string;
  createdAt: string;
};

type TimelineData = Partial<Record<TimelineMoment, TimelineEntry[]>>;

type TimelineSection = {
  id: TimelineMoment;
  title: string;
  hint: string;
};

const STORAGE_KEY = "strate-timeline-daily";

const defaultSections: TimelineSection[] = [
  { id: "matin", title: "Matin", hint: "Démarrage, maison, ancrage simple." },
  { id: "apres-ecole", title: "Après école", hint: "Transition familiale, retour au calme." },
  { id: "apres-midi", title: "Après-midi", hint: "Travail, manuscrit ou tâche concrète." },
  { id: "soir", title: "Soir", hint: "Fermeture douce de la journée." },
  { id: "recuperation", title: "Récupération", hint: "Repos, corps, réduction de charge." },
  { id: "focus", title: "Focus", hint: "Une priorité, trois actions maximum." },
  { id: "crise", title: "Crise", hint: "Stabilisation, sécurité, action immédiate." },
];

const reducedSections: TimelineSection[] = [
  { id: "matin", title: "Matin", hint: "Un démarrage simple." },
  { id: "recuperation", title: "Récupération", hint: "Revenir au calme avant d’ajouter." },
  { id: "essentiel", title: "Essentiel", hint: "Seulement ce qui protège la journée." },
  { id: "soir", title: "Soir", hint: "Fermer sans rajouter de charge." },
];

function readTimeline(): TimelineData {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    const parsed = saved ? JSON.parse(saved) : {};

    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : {};
  } catch {
    return {};
  }
}

function saveTimeline(data: TimelineData) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

function compactValue(value: string, fallback = "Non renseigné") {
  return value.trim() || fallback;
}

function isHardDay(systemState: SystemOrchestratorState | null, quickSettings: CentreQuickSettings) {
  const energy = quickSettings.energie.toLowerCase();

  return Boolean(systemState?.journeeDifficile) ||
    systemState?.surcharge === "Haute" ||
    energy.includes("fatigue") ||
    energy.includes("basse") ||
    energy.includes("épuis") ||
    energy.includes("epuis") ||
    energy.includes("difficile");
}

export default function TimelinePage() {
  const [timeline, setTimeline] = useState<TimelineData>({});
  const [drafts, setDrafts] = useState<Partial<Record<TimelineMoment, string>>>({});
  const [systemState, setSystemState] = useState<SystemOrchestratorState | null>(null);
  const [quickSettings, setQuickSettings] = useState<CentreQuickSettings>(emptyCentreQuickSettings);

  useEffect(() => {
    setTimeline(readTimeline());
    setSystemState(readStoredOrchestratorState());
    setQuickSettings(readCentreQuickSettings());
  }, []);

  useEffect(() => {
    saveTimeline(timeline);
  }, [timeline]);

  const reducedDay = isHardDay(systemState, quickSettings);
  const sections = useMemo(() => {
    const base = reducedDay ? reducedSections : defaultSections;

    if (!systemState?.urgenceActive) return base;

    const crisis = defaultSections.find((section) => section.id === "crise");
    const withoutCrisis = base.filter((section) => section.id !== "crise");

    return crisis ? [crisis, ...withoutCrisis] : base;
  }, [reducedDay, systemState?.urgenceActive]);
  const energy = compactValue(quickSettings.energie, systemState?.energie || "");
  const priority = compactValue(quickSettings.priorite, systemState?.focusPriority || "");

  function addEntry(sectionId: TimelineMoment) {
    const text = (drafts[sectionId] || "").trim();

    if (!text) return;

    const entry: TimelineEntry = {
      id: `${sectionId}-${Date.now()}`,
      text,
      createdAt: new Date().toLocaleString("fr-CA"),
    };

    setTimeline((current) => ({
      ...current,
      [sectionId]: [entry, ...(current[sectionId] || [])].slice(0, 6),
    }));
    setDrafts((current) => ({ ...current, [sectionId]: "" }));
  }

  return (
    <main className="internal-page">
      <SystemPageShell as="section" maxWidth={1040}>
        <header className="internal-header" style={{ marginBottom: 12, paddingBottom: 12 }}>
          <p className="internal-kicker">Centre · Timeline</p>
          <h1 className="internal-title">Timeline quotidienne</h1>
          <p className="internal-subtitle" style={{ maxWidth: 320 }}>
            Organiser la journée par moments, sans calendrier lourd ni surcharge.
          </p>
        </header>

        <SystemPanel ariaLabel="État du jour" compact>
          <SystemSectionHeader eyebrow="État du jour" title="Timeline quotidienne" />
          <SystemGrid gap={8} min={260}>
            <StateTile label="Énergie" value={energy} />
            <StateTile label="Surcharge" value={systemState?.surcharge || "Basse"} />
            <StateTile label="Priorité" value={priority} />
            {quickSettings.prochaineAction.trim() && (
              <StateTile label="Prochaine action" value={quickSettings.prochaineAction.trim()} />
            )}
          </SystemGrid>

          {reducedDay && (
            <SystemDividerBlock>
              <p style={{ color: "var(--primary)", fontSize: 13, lineHeight: 1.5, margin: 0 }}>
                Aujourd’hui, la journée est réduite à l’essentiel.
              </p>
            </SystemDividerBlock>
          )}

          {systemState?.urgenceActive && (
            <SystemDividerBlock>
              <SystemActionRow>
                <span style={{ color: "var(--text-soft)", fontSize: 13 }}>
                  Priorité du moment transmise au Centre.
                </span>
                <Link className="internal-button" href="/urgence-malika" style={{ fontSize: 12, padding: "7px 12px" }}>
                  Ouvrir Urgence Malika
                </Link>
              </SystemActionRow>
            </SystemDividerBlock>
          )}
        </SystemPanel>

        <SystemGrid gap={10} min={240}>
          {sections.map((section) => (
            <article
              className="internal-panel"
              key={section.id}
              style={{
                borderColor: section.id === "crise" && systemState?.urgenceActive
                  ? "rgba(201, 168, 92, 0.52)"
                  : "rgba(201, 168, 92, 0.15)",
                padding: 12,
              }}
            >
              <div style={{ alignItems: "start", display: "flex", gap: 10, justifyContent: "space-between" }}>
                <div>
                  <p className="editorial-label" style={{ margin: "0 0 4px" }}>
                    {section.id === "crise" && systemState?.urgenceActive ? "Priorité" : "Moment"}
                  </p>
                  <h2 className="editorial-title" style={{ fontSize: "1rem", margin: 0 }}>
                    {section.title}
                  </h2>
                </div>
                <StatusChip>{(timeline[section.id] || []).length}</StatusChip>
              </div>

              <p style={{ color: "var(--text-muted)", fontSize: 12, lineHeight: 1.45, margin: "8px 0 10px" }}>
                {section.hint}
              </p>

              <div style={{ display: "flex", gap: 7 }}>
                <input
                  className="internal-control"
                  onChange={(event) => setDrafts((current) => ({ ...current, [section.id]: event.target.value }))}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") addEntry(section.id);
                  }}
                  placeholder="Tâche ou note rapide"
                  style={{ flex: 1, fontSize: 13, padding: "8px 10px" }}
                  value={drafts[section.id] || ""}
                />
                <button
                  className="internal-button-primary"
                  onClick={() => addEntry(section.id)}
                  style={{ fontSize: 12, padding: "8px 11px" }}
                  type="button"
                >
                  Ajouter
                </button>
              </div>

              <div style={{ display: "grid", gap: 6, marginTop: 10 }}>
                {(timeline[section.id] || []).length ? (
                  (timeline[section.id] || []).map((entry) => (
                    <div
                      key={entry.id}
                      style={{
                        background: "rgba(255, 250, 238, 0.035)",
                        border: "1px solid rgba(201, 168, 92, 0.1)",
                        borderRadius: 10,
                        padding: "7px 9px",
                      }}
                    >
                      <p style={{ color: "var(--text-main)", fontSize: 13, lineHeight: 1.35, margin: 0 }}>
                        {entry.text}
                      </p>
                      <p style={{ color: "var(--text-muted)", fontSize: 10.5, margin: "4px 0 0" }}>
                        {entry.createdAt}
                      </p>
                    </div>
                  ))
                ) : (
                  <p style={{ color: "var(--text-muted)", fontSize: 12, margin: 0 }}>Rien à porter ici pour l’instant.</p>
                )}
              </div>
            </article>
          ))}
        </SystemGrid>
      </SystemPageShell>
    </main>
  );
}
