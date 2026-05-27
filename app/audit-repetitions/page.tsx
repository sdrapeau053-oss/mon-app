"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  StateTile,
  StatusChip,
  SystemGrid,
  SystemPageShell,
  SystemPanel,
  SystemSectionHeader,
} from "@/components/system-ui";
import { BackLink } from "@/components/ui/back-link";
import { analyserRepetitionsAvancees, type AdvancedRepetitionAudit } from "@/lib/editorial-repetitions";
import { lireChapitresTome1DepuisStorage, type ChapitreTome1 } from "@/lib/tome1-chapters";

function toneForLevel(level: string) {
  if (level === "élevé") return "danger" as const;
  if (level === "moyen") return "warning" as const;
  return "neutral" as const;
}

function EmptyLine({ children }: { children: string }) {
  return <p className="editorial-body" style={{ margin: 0 }}>{children}</p>;
}

export default function AuditRepetitionsPage() {
  const [chapters, setChapters] = useState<ChapitreTome1[]>([]);

  useEffect(() => {
    setChapters(lireChapitresTome1DepuisStorage());
  }, []);

  const audit: AdvancedRepetitionAudit = useMemo(() => analyserRepetitionsAvancees(chapters), [chapters]);

  return (
    <main className="internal-page">
      <SystemPageShell maxWidth={1120}>
        <header className="internal-header">
          <BackLink label="Centre" href="/centre-de-controle" />
          <p className="internal-kicker">Audit manuscrit</p>
          <h1 className="internal-title">Audit anti-répétition avancé</h1>
          <p className="internal-subtitle">
            Signaler les répétitions lexicales, structurelles et de motifs sans modifier le texte.
          </p>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 10 }}>
            <Link className="internal-button" href="/tableau-auteur">
              Tableau Auteur
            </Link>
            <Link className="internal-button" href="/ecrire-maintenant">
              Écrire maintenant
            </Link>
          </div>
        </header>

        <SystemPanel ariaLabel="Alertes prioritaires" compact>
          <SystemSectionHeader
            actions={<StatusChip tone={toneForLevel(audit.globalLevel)}>niveau {audit.globalLevel}</StatusChip>}
            title="Alertes prioritaires"
          />
          {audit.alerts.length > 0 ? (
            <div style={{ display: "grid", gap: 8 }}>
              {audit.alerts.map((alert) => (
                <p className="editorial-body" key={alert} style={{ margin: 0 }}>
                  Attention : {alert}
                </p>
              ))}
            </div>
          ) : (
            <EmptyLine>Aucune alerte prioritaire détectée.</EmptyLine>
          )}
        </SystemPanel>

        <SystemPanel ariaLabel="Répétitions lexicales">
          <SystemSectionHeader title="Répétitions lexicales" />
          {audit.lexical.length > 0 ? (
            <SystemGrid gap={8} min={230}>
              {audit.lexical.map((item) => (
                <article className="chapter-card" key={item.word} style={{ marginBottom: 0, padding: 12 }}>
                  <div style={{ alignItems: "center", display: "flex", gap: 8, justifyContent: "space-between" }}>
                    <h2 style={{ color: "var(--text-main)", fontSize: 15, margin: 0 }}>{item.word}</h2>
                    <StatusChip tone={toneForLevel(item.level)}>{item.level}</StatusChip>
                  </div>
                  <p className="editorial-body" style={{ fontSize: 12.5, margin: "8px 0 0" }}>
                    {item.count} occurrences · {item.chapters.join(", ")}
                  </p>
                </article>
              ))}
            </SystemGrid>
          ) : (
            <EmptyLine>Aucune répétition lexicale significative détectée.</EmptyLine>
          )}
        </SystemPanel>

        <SystemPanel ariaLabel="Expressions récurrentes">
          <SystemSectionHeader title="Expressions récurrentes" />
          {audit.expressions.length > 0 ? (
            <SystemGrid gap={8} min={260}>
              {audit.expressions.map((item) => (
                <StateTile
                  key={item.expression}
                  label={`${item.count} occurrences`}
                  value={`"${item.expression}" · ${item.chapters.join(", ")}`}
                />
              ))}
            </SystemGrid>
          ) : (
            <EmptyLine>Aucune expression récurrente forte à signaler.</EmptyLine>
          )}
        </SystemPanel>

        <SystemGrid gap={14} min={300}>
          <SystemPanel ariaLabel="Ouvertures de chapitre">
            <SystemSectionHeader title="Ouvertures de chapitre" />
            {audit.openings.length > 0 ? (
              <div style={{ display: "grid", gap: 8 }}>
                {audit.openings.map((item) => (
                  <StateTile key={`${item.chapters}-opening`} label={item.level} value={`${item.chapters} · ${item.suggestion}`} />
                ))}
              </div>
            ) : (
              <EmptyLine>Ouvertures variées.</EmptyLine>
            )}
          </SystemPanel>

          <SystemPanel ariaLabel="Fermetures de chapitre">
            <SystemSectionHeader title="Fermetures de chapitre" />
            {audit.closings.length > 0 ? (
              <div style={{ display: "grid", gap: 8 }}>
                {audit.closings.map((item) => (
                  <StateTile key={`${item.chapters}-closing`} label={item.level} value={`${item.chapters} · ${item.suggestion}`} />
                ))}
              </div>
            ) : (
              <EmptyLine>Fermetures assez distinctes.</EmptyLine>
            )}
          </SystemPanel>
        </SystemGrid>

        <SystemPanel ariaLabel="Structures répétitives">
          <SystemSectionHeader title="Structures répétitives" />
          {audit.structures.length > 0 ? (
            <SystemGrid gap={8} min={230}>
              {audit.structures.map((item) => (
                <StateTile key={item.structure} label={`${item.count} chapitres · ${item.frequency}`} value={item.structure} />
              ))}
            </SystemGrid>
          ) : (
            <EmptyLine>Aucune structure dominante détectée.</EmptyLine>
          )}
        </SystemPanel>

        <SystemPanel ariaLabel="Répétitions par motif">
          <SystemSectionHeader title="Répétitions par motif" />
          {audit.motifs.length > 0 ? (
            <SystemGrid gap={8} min={230}>
              {audit.motifs.map((item) => (
                <StateTile key={item.motif} label={`${item.count} chapitres`} value={`${item.motif} · ${item.repartition}`} />
              ))}
            </SystemGrid>
          ) : (
            <EmptyLine>Aucun motif récurrent lisible.</EmptyLine>
          )}
        </SystemPanel>

        <SystemPanel ariaLabel="Points forts" compact>
          <SystemSectionHeader title="Points forts" />
          {audit.strengths.length > 0 ? (
            <div style={{ display: "flex", flexWrap: "wrap", gap: 7 }}>
              {audit.strengths.map((strength) => (
                <StatusChip key={strength} tone="success">
                  ✓ {strength}
                </StatusChip>
              ))}
            </div>
          ) : (
            <EmptyLine>Les points forts apparaîtront quand davantage de chapitres écrits seront disponibles.</EmptyLine>
          )}
        </SystemPanel>
      </SystemPageShell>
    </main>
  );
}
