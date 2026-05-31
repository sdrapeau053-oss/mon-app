"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  StatusChip,
  SystemGrid,
  SystemPageShell,
  SystemPanel,
  SystemSectionHeader,
} from "@/components/system-ui";
import { BackLink } from "@/components/ui/back-link";

type TierKey = "essentiel" | "intermediaire" | "premium";
type TierTone = "neutral" | "accent" | "premium";

interface AutreRiveProgression {
  essentiel: number;
  intermediaire: number;
  premium: number;
}

type RelationModule = {
  href?: string;
  label: string;
};

type ModuleTier = {
  badge: string;
  key: TierKey;
  modules: RelationModule[];
  objective: string;
  title: string;
  tone: TierTone;
};

const DOSSIERS_STORAGE_KEY = "autre-rive-dossiers";
const PROGRESSION_STORAGE_KEY = "autre-rive-progression";

const defaultProgression: AutreRiveProgression = {
  essentiel: 0,
  intermediaire: 0,
  premium: 0,
};

const tiers: ModuleTier[] = [
  {
    badge: "Essentiel",
    key: "essentiel",
    objective: "Comprendre la relation.",
    title: "Essentiel",
    tone: "neutral",
    modules: [
      { href: "/autre-rive/dossiers", label: "Dossier relationnel central" },
      { label: "Centre d'importation relationnelle" },
      { href: "/analyze", label: "Analyse de conversation" },
      { label: "Baromètre de réalité" },
      { label: "Radar relationnel" },
      { label: "Red flags" },
      { label: "Green flags" },
      { label: "Décodage de messages" },
      { label: "Niveau de certitude" },
      { href: "/module/decision", label: "Centre de décision simplifié" },
    ],
  },
  {
    badge: "Intermédiaire",
    key: "intermediaire",
    objective: "Comprendre ses propres schémas.",
    title: "Intermédiaire",
    tone: "accent",
    modules: [
      { label: "Historique relationnel" },
      { href: "/patterns", label: "Repérage des patterns" },
      { label: "Énergie émotionnelle" },
      { label: "Journal relationnel" },
      { label: "Analyse des conflits" },
      { label: "Besoins activés" },
      { label: "Mes valeurs" },
      { label: "Mes limites" },
      { label: "Synthèse hebdomadaire" },
      { label: "Assistant réponse avancé" },
      { label: "Scanner de progression" },
      { label: "Comparaison de relations" },
    ],
  },
  {
    badge: "★ Premium",
    key: "premium",
    objective: "Relations complexes et sécurité.",
    title: "Premium",
    tone: "premium",
    modules: [
      { label: "Centre rupture" },
      { href: "/module/safety", label: "Sécurité relationnelle" },
      { label: "Thermomètre de sécurité" },
      { label: "Journal des incidents" },
      { label: "Risque d'escalade" },
      { label: "Simulateur de conséquences" },
      { label: "Dossier familial" },
      { label: "Familles recomposées" },
      { label: "Coparentalité" },
      { label: "Loyautés familiales" },
      { label: "Sécurité émotionnelle des enfants" },
      { label: "Observatoire familial" },
      { label: "Ressources spécialisées" },
      { label: "Plan de sécurité" },
      { label: "Intelligence relationnelle globale" },
    ],
  },
];

function badgeStyle(tone: TierTone) {
  if (tone === "neutral") return { borderColor: "rgba(201,168,92,.16)", color: "var(--text-soft)" };
  if (tone === "accent") return { borderColor: "rgba(201,168,92,.34)", color: "var(--accent-gold)" };
  return { borderColor: "rgba(201,168,92,.48)", boxShadow: "0 0 0 1px rgba(201,168,92,.08)", color: "var(--accent-gold)" };
}

function readDossierCount() {
  if (typeof window === "undefined") return 0;

  try {
    const raw = window.localStorage.getItem(DOSSIERS_STORAGE_KEY);
    if (!raw) return 0;
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.length : 0;
  } catch {
    return 0;
  }
}

function readProgression(): AutreRiveProgression {
  if (typeof window === "undefined") return defaultProgression;

  try {
    const raw = window.localStorage.getItem(PROGRESSION_STORAGE_KEY);
    if (!raw) return defaultProgression;
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return defaultProgression;

    const source = parsed as Partial<Record<TierKey, unknown>>;

    return {
      essentiel: Number.isFinite(Number(source.essentiel)) ? Number(source.essentiel) : 0,
      intermediaire: Number.isFinite(Number(source.intermediaire)) ? Number(source.intermediaire) : 0,
      premium: Number.isFinite(Number(source.premium)) ? Number(source.premium) : 0,
    };
  } catch {
    return defaultProgression;
  }
}

function dossierCountLabel(count: number) {
  if (count === 1) return "1 relation en cours";
  if (count > 1) return `${count} relations en cours`;
  return "Aucun dossier créé";
}

const goldButtonStyle = {
  alignItems: "center",
  borderRadius: 999,
  display: "inline-flex",
  fontSize: 12.5,
  justifyContent: "center",
  lineHeight: 1,
  minHeight: 36,
  padding: "8px 13px",
  textAlign: "center",
  whiteSpace: "nowrap",
} as const;

export default function AutreRivePage() {
  const [activeTierKey, setActiveTierKey] = useState<TierKey>("essentiel");
  const [dossierCount, setDossierCount] = useState(0);
  const [progression, setProgression] = useState<AutreRiveProgression>(defaultProgression);
  const [unavailableModule, setUnavailableModule] = useState("");

  useEffect(() => {
    setDossierCount(readDossierCount());
    setProgression(readProgression());
  }, []);

  const activeTier = useMemo(() => {
    return tiers.find((tier) => tier.key === activeTierKey) || tiers[0];
  }, [activeTierKey]);

  return (
    <main className="internal-page">
      <SystemPageShell maxWidth={1180}>
        <header className="internal-header">
          <BackLink href="/centre-de-controle" label="Centre" />
          <p className="internal-kicker">Relationnel</p>
          <h1 className="internal-title">L&apos;Autre Rive</h1>
          <p className="internal-subtitle">
            L&apos;Autre Rive aide à comprendre une relation, repérer les patterns,
            clarifier les décisions et identifier les situations relationnelles préoccupantes.
          </p>
        </header>

        <SystemPanel
          ariaLabel="Créer un dossier relationnel"
          compact
          style={{
            background: "linear-gradient(135deg, rgba(201,168,92,.16), rgba(255,250,238,.035))",
            borderColor: "rgba(201,168,92,.48)",
            boxShadow: "0 18px 60px rgba(0,0,0,.22)",
          }}
        >
          <div style={{ alignItems: "center", display: "grid", gap: 16, gridTemplateColumns: "minmax(0, 1fr) auto" }}>
            <div style={{ display: "grid", gap: 7, minWidth: 0 }}>
              <p className="internal-kicker" style={{ margin: 0 }}>Première action</p>
              <h2 style={{ color: "var(--text-main)", fontFamily: "var(--font-serif)", fontSize: 24, margin: 0 }}>
                Étape 1 — Créez votre premier dossier relationnel
              </h2>
              <p className="editorial-body" style={{ margin: 0, maxWidth: 760 }}>
                Tout commence ici. Chaque relation importante mérite son propre dossier. Vous pourrez ensuite suivre son évolution,
                ajouter des observations et accéder aux futures analyses.
              </p>
            </div>
            <Link className="internal-button-primary" href="/autre-rive/dossiers" style={goldButtonStyle}>
              Créer un dossier
            </Link>
          </div>
        </SystemPanel>

        <SystemPanel ariaLabel="Résumé des dossiers relationnels" compact>
          <div style={{ alignItems: "center", display: "flex", flexWrap: "wrap", gap: 12, justifyContent: "space-between" }}>
            <div style={{ display: "grid", gap: 4 }}>
              <p className="internal-kicker" style={{ margin: 0 }}>Dossiers existants</p>
              <strong style={{ color: "var(--text-main)", fontFamily: "var(--font-serif)", fontSize: 22 }}>
                {dossierCountLabel(dossierCount)}
              </strong>
            </div>
            <StatusChip tone={dossierCount > 0 ? "success" : "neutral"}>
              {dossierCount > 0 ? "Socle commencé" : "Prêt à commencer"}
            </StatusChip>
          </div>
        </SystemPanel>

        <SystemPanel ariaLabel="Volets L'Autre Rive" compact>
          <SystemSectionHeader
            eyebrow="Socle du module"
            title="Trois niveaux de clarté relationnelle"
            actions={<StatusChip tone={activeTier.tone === "neutral" ? "neutral" : "warning"}>{activeTier.objective}</StatusChip>}
          />

          <div
            aria-label="Volets disponibles"
            role="tablist"
            style={{
              display: "flex",
              gap: 8,
              marginBottom: 16,
              overflowX: "auto",
              paddingBottom: 2,
              WebkitOverflowScrolling: "touch",
            }}
          >
            {tiers.map((tier) => {
              const active = tier.key === activeTierKey;

              return (
                <button
                  aria-selected={active}
                  key={tier.key}
                  onClick={() => setActiveTierKey(tier.key)}
                  role="tab"
                  style={{
                    background: active ? "rgba(201,168,92,0.18)" : "rgba(255,250,238,.055)",
                    border: active ? "1px solid rgba(201,168,92,.72)" : "1px solid rgba(201,168,92,.22)",
                    borderRadius: 999,
                    color: active ? "#fff7e8" : "#d8caa8",
                    cursor: "pointer",
                    flex: "0 0 auto",
                    fontSize: 13,
                    fontWeight: 750,
                    lineHeight: 1,
                    minHeight: 38,
                    padding: "9px 14px",
                    transition: "background .18s ease, border-color .18s ease, color .18s ease",
                    whiteSpace: "nowrap",
                  }}
                  type="button"
                >
                  {tier.title}
                </button>
              );
            })}
          </div>

          <section aria-labelledby={`tier-${activeTier.key}`} role="tabpanel" style={{ display: "grid", gap: 14 }}>
            <div style={{ alignItems: "start", display: "flex", flexWrap: "wrap", gap: 10, justifyContent: "space-between" }}>
              <div style={{ display: "grid", gap: 5, minWidth: 0 }}>
                <div style={{ alignItems: "center", display: "flex", flexWrap: "wrap", gap: 9 }}>
                  <h2 id={`tier-${activeTier.key}`} style={{ color: "var(--text-main)", fontFamily: "var(--font-serif)", fontSize: 24, margin: 0 }}>
                    {activeTier.title}
                  </h2>
                  <span
                    style={{
                      border: "1px solid",
                      borderRadius: 999,
                      fontSize: 12,
                      lineHeight: 1,
                      padding: "6px 9px",
                      whiteSpace: "nowrap",
                      ...badgeStyle(activeTier.tone),
                    }}
                  >
                    {activeTier.badge}
                  </span>
                </div>
                <p className="editorial-body" style={{ margin: 0 }}>{activeTier.objective}</p>
              </div>
              <StatusChip tone="neutral">
                {progression[activeTier.key]} / {activeTier.modules.length} modules complétés
              </StatusChip>
            </div>

            <SystemGrid gap={10} min={320}>
              {activeTier.modules.map((module) => {
                const cardStyle = {
                  alignItems: "center",
                  background: "rgba(255, 250, 238, 0.035)",
                  borderColor: "rgba(201, 168, 92, 0.12)",
                  display: "flex",
                  gap: 10,
                  justifyContent: "space-between",
                  marginBottom: 0,
                  minHeight: 52,
                  padding: "10px 12px",
                  textAlign: "left",
                  width: "100%",
                } as const;

                if (module.href) {
                  return (
                    <Link className="chapter-card" href={module.href} key={module.label} style={cardStyle}>
                      <span style={{ color: "var(--text-main)", fontSize: 13.5, fontWeight: 650 }}>{module.label}</span>
                      <span className="label-meta">ouvrir</span>
                    </Link>
                  );
                }

                return (
                  <button
                    className="chapter-card"
                    key={module.label}
                    onClick={() => setUnavailableModule(module.label)}
                    style={{ ...cardStyle, cursor: "pointer" }}
                    type="button"
                  >
                    <span style={{ color: "var(--text-main)", fontSize: 13.5, fontWeight: 650 }}>{module.label}</span>
                    <span className="label-meta">ouvrir</span>
                  </button>
                );
              })}
            </SystemGrid>
          </section>
        </SystemPanel>
      </SystemPageShell>

      {unavailableModule ? (
        <div
          aria-modal="true"
          role="dialog"
          style={{
            alignItems: "center",
            background: "rgba(5, 4, 2, .72)",
            display: "flex",
            inset: 0,
            justifyContent: "center",
            padding: 20,
            position: "fixed",
            zIndex: 80,
          }}
        >
          <div
            className="chapter-card"
            style={{
              background: "rgba(24, 19, 12, .98)",
              borderColor: "rgba(201,168,92,.28)",
              display: "grid",
              gap: 12,
              marginBottom: 0,
              maxWidth: 420,
              padding: 18,
              width: "100%",
            }}
          >
            <p className="internal-kicker" style={{ margin: 0 }}>{unavailableModule}</p>
            <h2 style={{ color: "var(--text-main)", fontFamily: "var(--font-serif)", fontSize: 24, margin: 0 }}>
              Bientôt disponible
            </h2>
            <p className="editorial-body" style={{ margin: 0 }}>Ce module arrive bientôt.</p>
            <button
              className="internal-button-primary"
              onClick={() => setUnavailableModule("")}
              style={{ ...goldButtonStyle, justifySelf: "start" }}
              type="button"
            >
              Fermer
            </button>
          </div>
        </div>
      ) : null}
    </main>
  );
}
