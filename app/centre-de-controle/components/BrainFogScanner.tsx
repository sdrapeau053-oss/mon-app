"use client";

import { useState } from "react";
import { StateTile, StatusChip, SystemActionRow, SystemGrid, SystemPanel } from "@/components/system-ui";
import { analyzeBrainFog } from "../brain-fog-engine";
import { generateBrainFogEntryId, saveBrainFogEntry } from "../brain-fog-storage";
import {
  BRAIN_FOG_CAUSE_LABELS,
  BRAIN_FOG_SIGNAL_LABELS,
  type BrainFogAnalysis,
  type BrainFogEntry,
  type BrainFogSignal,
  type BrainFogSignalKey,
} from "../brain-fog-types";

const questions: { help: string; key: BrainFogSignalKey }[] = [
  { key: "sommeil", help: "Sommeil insuffisant ou non récupérateur" },
  { key: "stress", help: "Stress ou pression actuelle" },
  { key: "anxiete", help: "Anxiété ressentie dans le corps" },
  { key: "surcharge_emotionnelle", help: "Trop d'émotions à porter" },
  { key: "rumination", help: "Pensées qui tournent en boucle" },
  { key: "tache_evitee", help: "Quelque chose évité aujourd'hui" },
  { key: "tristesse", help: "Tristesse, vide ou lourdeur" },
  { key: "douleur_physique", help: "Douleur, tension ou inconfort" },
  { key: "hydratation", help: "Soif, peu d'eau, bouche sèche" },
  { key: "alimentation", help: "Repas sauté ou énergie basse" },
  { key: "medication", help: "Médication oubliée ou ajustée" },
  { key: "urgence_presente", help: "Situation urgente ou activante" },
];

const defaultValues = questions.reduce<Record<BrainFogSignalKey, number>>((values, question) => {
  values[question.key] = 0;
  return values;
}, {} as Record<BrainFogSignalKey, number>);

function relativeHours(createdAt: string) {
  const timestamp = new Date(createdAt).getTime();
  if (!Number.isFinite(timestamp)) return "date inconnue";
  const hours = Math.max(0, Math.floor((Date.now() - timestamp) / (1000 * 60 * 60)));
  return hours < 1 ? "moins d’1h" : `${hours}h`;
}

export function BrainFogScanner({
  latestEntry,
  onEntrySaved,
}: {
  latestEntry?: BrainFogEntry;
  onEntrySaved?: (entry: BrainFogEntry) => void;
}) {
  const [open, setOpen] = useState(false);
  const [values, setValues] = useState(defaultValues);
  const [analysis, setAnalysis] = useState<BrainFogAnalysis | null>(null);
  const [saved, setSaved] = useState(false);

  function updateValue(key: BrainFogSignalKey, value: number) {
    setValues((current) => ({ ...current, [key]: value }));
  }

  function submitScan() {
    const signals: BrainFogSignal[] = questions.map((question) => ({
      key: question.key,
      value: values[question.key],
    }));
    const nextAnalysis = analyzeBrainFog(signals);
    const entry: BrainFogEntry = {
      analysis: nextAnalysis,
      createdAt: new Date().toISOString(),
      id: generateBrainFogEntryId(),
      signals,
    };
    saveBrainFogEntry(entry);
    onEntrySaved?.(entry);
    setAnalysis(nextAnalysis);
    setSaved(true);
  }

  function resetScan() {
    setAnalysis(null);
    setOpen(false);
    setSaved(false);
  }

  return (
    <SystemPanel compact style={{ marginBottom: 0, padding: "6px 8px" }}>
      <div style={{ alignItems: "center", display: "flex", gap: 8, justifyContent: "space-between", marginBottom: 6 }}>
        <p className="editorial-label" style={{ margin: 0 }}>
          Brain Fog Scanner
        </p>
        {analysis ? <StatusChip tone={analysis.score >= 7 ? "warning" : "neutral"}>{analysis.score}/10</StatusChip> : null}
      </div>

      {!open && !analysis && (
        <div style={{ display: "grid", gap: 8 }}>
          {latestEntry ? (
            <article
              style={{
                background: "rgba(255, 250, 238, 0.035)",
                border: "1px solid rgba(201, 168, 92, 0.12)",
                borderRadius: 10,
                padding: "7px 8px",
              }}
            >
              <p className="editorial-label" style={{ margin: "0 0 5px" }}>
                Dernier scan
              </p>
              <div style={{ alignItems: "baseline", display: "flex", flexWrap: "wrap", gap: 8 }}>
                <strong style={{ color: "#f1e7d5", fontSize: 18, fontWeight: 720 }}>{latestEntry.analysis.score}/10</strong>
                <span style={{ color: "#c9bea9", fontSize: 12.5 }}>{BRAIN_FOG_CAUSE_LABELS[latestEntry.analysis.causePrincipale]}</span>
              </div>
              <p className="editorial-body" style={{ fontSize: 11.5, margin: "4px 0 0" }}>
                Il y a {relativeHours(latestEntry.createdAt)}
              </p>
              <p className="editorial-body" style={{ fontSize: 12, margin: "5px 0 0" }}>{latestEntry.analysis.intervention.label}</p>
            </article>
          ) : (
            <div style={{ alignItems: "center", display: "flex", flexWrap: "wrap", gap: 10 }}>
              <button
                className="internal-button-primary"
                onClick={() => setOpen(true)}
                style={{ flex: "0 0 auto", fontSize: 12.5, padding: "6px 14px" }}
                type="button"
              >
                Je suis dans le brouillard
              </button>
              <span className="editorial-body" style={{ flex: "1 1 160px", fontSize: 12, minWidth: 0 }}>
                Scan rapide, prudent, local.
              </span>
            </div>
          )}
          {latestEntry ? (
            <button
              className="internal-button-primary"
              onClick={() => setOpen(true)}
              style={{ fontSize: 12.5, padding: "6px 14px" }}
              type="button"
            >
              Nouveau scan
            </button>
          ) : null}
        </div>
      )}

      {open && !analysis && (
        <>
          <p className="editorial-body" style={{ fontSize: 12.5, margin: "1px 0 7px" }}>
            Répondez de 0 à 4. 0 = pas du tout, 4 = très présent.
          </p>
          <div style={{ display: "grid", gap: 6 }}>
            {questions.map((question) => (
              <div
                key={question.key}
                style={{
                  alignItems: "center",
                  display: "grid",
                  gap: 8,
                  gridTemplateColumns: "minmax(170px, 1fr) auto",
                }}
              >
                <div>
                  <p style={{ color: "#f1e7d5", fontSize: 12.5, fontWeight: 650, margin: 0 }}>
                    {BRAIN_FOG_SIGNAL_LABELS[question.key]}
                  </p>
                  <p style={{ color: "#9a9080", fontSize: 11, margin: "1px 0 0" }}>{question.help}</p>
                </div>
                <div style={{ display: "flex", gap: 4 }}>
                  {[0, 1, 2, 3, 4].map((score) => (
                    <button
                      className={values[question.key] === score ? "internal-button-primary" : "internal-button"}
                      key={score}
                      onClick={() => updateValue(question.key, score)}
                      style={{ minHeight: 26, minWidth: 29, padding: "3px 7px" }}
                      type="button"
                    >
                      {score}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
          <SystemActionRow>
            <button className="internal-button-primary" onClick={submitScan} type="button">
              Analyser
            </button>
            <button className="internal-button" onClick={resetScan} type="button">
              Réévaluer plus tard
            </button>
          </SystemActionRow>
        </>
      )}

      {analysis && (
        <>
          <SystemGrid gap={6} min={180}>
            <StateTile label="Score brain fog" value={`${analysis.score}/10`} />
            <StateTile label="Cause principale probable" value={BRAIN_FOG_CAUSE_LABELS[analysis.causePrincipale]} />
            <StateTile label="Confiance" value={analysis.confiance} />
          </SystemGrid>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 8 }}>
            {analysis.causesSecondaires.length ? (
              analysis.causesSecondaires.map((cause) => <StatusChip key={cause}>{BRAIN_FOG_CAUSE_LABELS[cause]}</StatusChip>)
            ) : (
              <StatusChip tone="neutral">Aucune cause secondaire dominante</StatusChip>
            )}
          </div>
          <article
            style={{
              background: "rgba(255, 250, 238, 0.035)",
              border: "1px solid rgba(201, 168, 92, 0.14)",
              borderRadius: 10,
              marginTop: 8,
              padding: "8px 9px",
            }}
          >
            <p className="editorial-label" style={{ margin: "0 0 4px" }}>
              Intervention recommandée
            </p>
            <p style={{ color: "#f1e7d5", fontSize: 13.5, fontWeight: 700, margin: 0 }}>{analysis.intervention.label}</p>
            <p className="editorial-body" style={{ fontSize: 12.5, margin: "5px 0 0" }}>
              {analysis.intervention.explication} · {analysis.intervention.dureeEstimee}
            </p>
            <p style={{ color: "#9a9080", fontSize: 11.5, margin: "6px 0 0" }}>Ce n’est pas un diagnostic médical.</p>
          </article>
          <SystemActionRow>
            {saved ? <StatusChip tone="success">Analyse enregistrée</StatusChip> : null}
            <button className="internal-button" onClick={resetScan} type="button">
              Réévaluer plus tard
            </button>
          </SystemActionRow>
        </>
      )}
    </SystemPanel>
  );
}
