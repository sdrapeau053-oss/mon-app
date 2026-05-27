"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  StateTile,
  SystemGrid,
  SystemPageShell,
  SystemPanel,
  SystemSectionHeader,
} from "@/components/system-ui";
import { BackLink } from "@/components/ui/back-link";
import { getTodayDecision, type TodayDecision } from "@/lib/centre-intelligent";
import { getContinuitySummary, readContinuity, type ContinuitySummary, type StrateContinuity } from "@/lib/continuity";

export default function CentreIntelligentPage() {
  const [continuity, setContinuity] = useState<StrateContinuity | null>(null);
  const [continuitySummary, setContinuitySummary] = useState<ContinuitySummary | null>(null);
  const [decision, setDecision] = useState<TodayDecision | null>(null);

  useEffect(() => {
    const currentContinuity = readContinuity();
    setContinuity(currentContinuity);
    setContinuitySummary(getContinuitySummary(currentContinuity));
    setDecision(getTodayDecision());
  }, []);

  return (
    <main className="internal-page">
      <SystemPageShell maxWidth={880}>
        <header className="internal-header">
          <BackLink label="Centre" href="/centre-de-controle" />
          <p className="internal-kicker">Centre intelligent</p>
          <h1 className="internal-title">Aujourd’hui</h1>
          <p className="internal-subtitle">Une seule décision pour commencer sans chercher.</p>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 10 }}>
            <Link className="internal-button" href="/guide-strate">
              Besoin d’aide ?
            </Link>
          </div>
        </header>

        <SystemPanel ariaLabel="Action du jour">
          <SystemSectionHeader eyebrow="Action du jour" title={decision?.action || "Chargement local"} />
          {decision ? (
            <>
              <p className="editorial-title" style={{ fontSize: "1.25rem", margin: "0 0 10px" }}>
                → {decision.action}
              </p>
              <p className="editorial-body" style={{ margin: "0 0 18px" }}>
                Temps recommandé : <strong style={{ color: "#f1e7d5" }}>{decision.time}</strong>
              </p>

              <SystemGrid gap={10} min={180}>
                <StateTile label="Énergie" value={decision.metrics.energie} />
                <StateTile label="Surcharge" value={decision.metrics.surcharge} />
                <StateTile label="Progression" value={decision.metrics.progression} />
              </SystemGrid>

              <div style={{ marginTop: 18 }}>
                <h2 className="editorial-title" style={{ fontSize: "1rem", margin: "0 0 8px" }}>
                  Pourquoi cette action ?
                </h2>
                <ul
                  className="editorial-body"
                  style={{
                    display: "grid",
                    gap: 7,
                    listStyle: "none",
                    margin: 0,
                    padding: 0,
                  }}
                >
                  {decision.reasons.map((reason) => (
                    <li key={reason}>✓ {reason}</li>
                  ))}
                </ul>
              </div>

              <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 20 }}>
                <Link className="internal-button-primary" href={decision.href}>
                  Commencer
                </Link>
                <Link className="internal-button" href="/centre-de-controle">
                  Retour Centre
                </Link>
              </div>
            </>
          ) : (
            <p className="editorial-body" style={{ margin: 0 }}>
              Lecture des données locales.
            </p>
          )}
        </SystemPanel>

        {continuitySummary && (continuity?.lastChapter || continuity?.lastChapterId) && (
          <SystemPanel ariaLabel="Continuité manuscrit" compact>
            <SystemSectionHeader title="Continuité" />
            <SystemGrid gap={10} min={180}>
              <StateTile label="Dernier travail" value={continuity.lastChapter || continuitySummary.lastActivity} />
              <StateTile label="Il y a" value={continuitySummary.elapsedLabel} />
            </SystemGrid>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 14 }}>
              <Link className="internal-button-primary" href="/ecrire-maintenant">
                Reprendre
              </Link>
            </div>
          </SystemPanel>
        )}
      </SystemPageShell>
    </main>
  );
}
