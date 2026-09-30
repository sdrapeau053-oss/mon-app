"use client";

import Link from "next/link";
import { StateTile, SystemGrid, SystemPanel, SystemSectionHeader } from "@/components/system-ui";
import type { StrateContinuity } from "@/lib/continuity";

type DisplayedContinuity = {
  elapsedLabel: string;
  lastActivity: string;
  lastPageLabel: string;
  suggestedResume: string;
};

type ManuscriptStats = {
  activeChapter: string;
  progress: number;
  repetitionAlerts: number;
  repetitionLevel: string;
  weeklyGoal: string;
};

type AiApplicationStats = {
  count: number;
  mainStatus: string;
  nextAction: string;
};

type UxStats = {
  advanced: number;
  essential: number;
  overlaps: number;
  totalRoutes: number;
};

type QuickLink = {
  href: string;
  label: string;
};

type CentreStatusPanelsProps = {
  aiApplicationStats: AiApplicationStats;
  continuity: StrateContinuity | null;
  displayedContinuity: DisplayedContinuity;
  manuscriptStats: ManuscriptStats;
  uxStats: UxStats;
  visibleQuickLinks: QuickLink[];
};

export function CentreStatusPanels({
  aiApplicationStats,
  continuity,
  displayedContinuity,
  manuscriptStats,
  uxStats,
  visibleQuickLinks,
}: CentreStatusPanelsProps) {
  return (
    <>
      <SystemPanel compact style={{ marginBottom: 7, padding: 7 }}>
        <SystemSectionHeader title="Continuité" />
        <SystemGrid gap={6} min={220}>
          <StateTile label="Dernière activité" value={displayedContinuity.lastActivity} />
          <StateTile label="Dernière page" value={displayedContinuity.lastPageLabel} />
          <StateTile label="Temps écoulé" value={displayedContinuity.elapsedLabel} />
          <StateTile label="Prochaine reprise suggérée" value={displayedContinuity.suggestedResume} />
        </SystemGrid>
      </SystemPanel>

      {(continuity?.lastChapter || continuity?.lastChapterId) && (
        <SystemPanel compact style={{ marginBottom: 7, padding: 7 }}>
          <SystemSectionHeader title="Dernière activité manuscrit" />
          <SystemGrid gap={6} min={220}>
            <StateTile label="Chapitre" value={continuity.lastChapter || "Chapitre récent"} />
            <StateTile label="Date" value={continuity.writingUpdatedAt ? new Date(continuity.writingUpdatedAt).toLocaleDateString("fr-CA") : "Non renseignée"} />
            <StateTile label="Temps écoulé" value={displayedContinuity.elapsedLabel} />
          </SystemGrid>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 10 }}>
            <Link className="internal-button-primary" href="/ecrire-maintenant">
              Continuer
            </Link>
          </div>
        </SystemPanel>
      )}

      <SystemPanel compact style={{ marginBottom: 7, padding: 7 }}>
        <SystemSectionHeader title="Auteur" />
        <SystemGrid gap={6} min={220}>
          <StateTile label="Progression tome" value={`${manuscriptStats.progress}%`} />
          <StateTile label="Chapitre actif" value={manuscriptStats.activeChapter} />
          <StateTile label="Objectif semaine" value={manuscriptStats.weeklyGoal || "Non défini"} />
        </SystemGrid>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 10 }}>
          <Link className="internal-button-primary" href="/tableau-auteur">
            Ouvrir Tableau Auteur
          </Link>
        </div>
      </SystemPanel>

      <SystemPanel compact style={{ marginBottom: 7, padding: 7 }}>
        <SystemSectionHeader title="Candidature IA" />
        <SystemGrid gap={6} min={220}>
          <StateTile label="Candidatures" value={String(aiApplicationStats.count)} />
          <StateTile label="Statut principal" value={aiApplicationStats.mainStatus} />
          <StateTile label="Prochaine action" value={aiApplicationStats.nextAction} />
        </SystemGrid>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 10 }}>
          <Link className="internal-button" href="/freelance-candidature-ia">
            Ouvrir Candidature IA
          </Link>
        </div>
      </SystemPanel>

      <SystemPanel compact style={{ marginBottom: 7, padding: 7 }}>
        <SystemSectionHeader title="Répétitions" />
        <SystemGrid gap={6} min={220}>
          <StateTile label="Alertes critiques" value={String(manuscriptStats.repetitionAlerts)} />
          <StateTile label="Niveau global" value={manuscriptStats.repetitionLevel} />
        </SystemGrid>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 10 }}>
          <Link className="internal-button" href="/audit-repetitions">
            Ouvrir Audit Répétitions
          </Link>
        </div>
      </SystemPanel>

      <SystemPanel compact style={{ marginBottom: 7, padding: 7 }}>
        <SystemSectionHeader title="UX" />
        <SystemGrid gap={6} min={180}>
          <StateTile label="Routes totales" value={String(uxStats.totalRoutes)} />
          <StateTile label="Essentielles" value={String(uxStats.essential)} />
          <StateTile label="Avancées" value={String(uxStats.advanced)} />
          <StateTile label="Chevauchements" value={String(uxStats.overlaps)} />
        </SystemGrid>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 10 }}>
          <Link className="internal-button" href="/consolidation-ux">
            Ouvrir Consolidation UX
          </Link>
        </div>
      </SystemPanel>

      <SystemPanel compact style={{ marginBottom: 7, padding: 7 }}>
        <SystemSectionHeader title="Accès rapides" />
        <SystemGrid gap={5} min={140}>
          {visibleQuickLinks.map((link) => (
            <Link
              className="internal-button"
              href={link.href}
              key={link.href}
              style={{
                borderRadius: 9,
                display: "flex",
                fontSize: 11.5,
                justifyContent: "center",
                lineHeight: 1.15,
                minHeight: 27,
                padding: "6px 8px",
                textAlign: "center",
              }}
            >
              {link.label}
            </Link>
          ))}
        </SystemGrid>
      </SystemPanel>
    </>
  );
}
