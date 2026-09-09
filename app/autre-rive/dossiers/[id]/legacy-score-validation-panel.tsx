"use client";

import { useState } from "react";

import { SystemPanel } from "@/components/system-ui";
import { suggestLikelyScale, type KnownScoreScale, type LegacyScoreSnapshot, type RelationDossier } from "@/lib/autre-rive";

import { formatDate } from "./dossier-data";
import { confirmLegacyScoreSnapshotInDossier, excludeLegacyScoreSnapshotInDossier } from "./legacy-score-validation-sync";

// Écran de validation des données historiques (SR-D-001, Décision 2 §6).
// Composant contrôlé, même discipline que CriticalSafetyPanel (9A),
// CurrentAssessmentPanel (9C), NeedsPanel (9D) et RapportAnalysePanel (9E) :
// le dossier canonique est lu UNE SEULE fois par le parent
// (dossier-screen.tsx) et transmis en prop — jamais relu localement par un
// effet propre à ce panneau. Après toute action, ce composant appelle
// onChange() pour redemander au parent de relire le dossier canonique.
//
// N'affiche jamais aucune confirmation ou exclusion automatique : chaque
// snapshot ne change de statut que par un geste explicite (bouton), jamais
// par un effet ou au rendu. La suggestion d'échelle (suggestLikelyScale)
// est affichée comme un texte informatif, jamais pré-sélectionnée dans un
// contrôle : confirmer 1-10 ou confirmer 0-100 sont deux actions explicites
// et équivalentes, aucune des deux n'est mise en avant visuellement.
//
// N'affiche et ne fait évoluer que dossier.legacyScoreSnapshots,
// exclusivement — aucune donnée legacy plate (niveauClarte, etc.) n'est lue
// ni modifiée directement ici.

const buttonStyle = {
  alignItems: "center",
  borderRadius: 999,
  display: "inline-flex",
  fontSize: 12.5,
  gap: 6,
  justifyContent: "center",
  lineHeight: 1,
  minHeight: 26,
  padding: "3px 8px",
  textAlign: "center",
  whiteSpace: "nowrap",
} as const;

function formatMetricLabel(metricKey: string): string {
  if (metricKey === "niveauClarte") return "Clarté";
  if (metricKey === "niveauReciprocite") return "Réciprocité";
  if (metricKey === "niveauSecurite") return "Sécurité";
  if (metricKey === "energieEmotionnelle") return "Énergie émotionnelle";
  return metricKey;
}

function formatStatusLabel(status: LegacyScoreSnapshot["migrationStatus"]): string {
  if (status === "pending_review") return "À revoir";
  if (status === "confirmed") return "Confirmé";
  if (status === "excluded") return "Exclu";
  return status;
}

const CANONICAL_METRIC_KEYS = new Set(["niveauClarte", "niveauReciprocite", "niveauSecurite"]);

export function LegacyScoreValidationPanel({
  dossier,
  onChange,
}: {
  dossier: RelationDossier | null;
  onChange: () => void;
}) {
  const [error, setError] = useState("");

  if (!dossier) {
    return (
      <SystemPanel ariaLabel="Validation des données historiques" compact>
        <p className="editorial-body" style={{ margin: 0 }}>
          Validation des données historiques disponible une fois ce dossier confirmé.
        </p>
      </SystemPanel>
    );
  }

  const snapshots = dossier.legacyScoreSnapshots ?? [];
  if (snapshots.length === 0) {
    return null;
  }

  // Capturé après la garde ci-dessus, même raison que dans les panneaux
  // précédents (9A, 9C, 9D).
  const activeDossierId = dossier.id;

  function handleConfirm(snapshotId: string, scale: KnownScoreScale) {
    setError("");
    const result = confirmLegacyScoreSnapshotInDossier(activeDossierId, snapshotId, scale);
    if (result.status !== "applied") {
      setError(
        result.status === "skipped_no_canonical_dimension"
          ? "Cette valeur n'a pas de dimension canonique : elle ne peut être qu'exclue, jamais confirmée."
          : "Cette valeur a déjà été revue.",
      );
      return;
    }
    onChange();
  }

  function handleExclude(snapshotId: string) {
    setError("");
    const result = excludeLegacyScoreSnapshotInDossier(activeDossierId, snapshotId);
    if (result.status !== "applied") {
      setError("Cette valeur a déjà été revue.");
      return;
    }
    onChange();
  }

  const sortedSnapshots = [...snapshots].sort((a, b) => a.importedAt.localeCompare(b.importedAt));
  const pendingCount = snapshots.filter((s) => s.migrationStatus === "pending_review").length;

  return (
    <SystemPanel ariaLabel="Validation des données historiques" compact>
      <div style={{ display: "grid", gap: 14 }}>
        <div style={{ display: "grid", gap: 4 }}>
          <h3 style={{ color: "var(--text-main)", fontFamily: "var(--font-serif)", fontSize: 15, margin: 0 }}>
            Validation des données historiques
          </h3>
          <p className="editorial-body" style={{ margin: 0 }}>
            Ces valeurs proviennent de l&apos;ancien système, sans échelle enregistrée à l&apos;époque. Pour chacune,
            confirmez l&apos;échelle réelle si vous la connaissez, ou excluez-la si vous ne pouvez pas le déterminer.
            {pendingCount > 0 ? ` ${pendingCount} valeur${pendingCount > 1 ? "s" : ""} en attente.` : ""}
          </p>
        </div>

        <div style={{ display: "grid", gap: 6 }}>
          {sortedSnapshots.map((snapshot) => {
            const isPending = snapshot.migrationStatus === "pending_review";
            const hasCanonicalDimension = CANONICAL_METRIC_KEYS.has(snapshot.metricKey);
            const suggestion = suggestLikelyScale(snapshot.rawValue);

            return (
              <div
                key={snapshot.id}
                style={{
                  background: "rgba(255,250,238,.035)",
                  border: "1px solid rgba(201,168,92,.16)",
                  borderRadius: 8,
                  display: "grid",
                  gap: 6,
                  opacity: isPending ? 1 : 0.6,
                  padding: "8px 10px",
                }}
              >
                <div style={{ alignItems: "center", display: "flex", flexWrap: "wrap", gap: 8, justifyContent: "space-between" }}>
                  <span className="label-meta" style={{ margin: 0 }}>
                    {formatMetricLabel(snapshot.metricKey)} · {formatStatusLabel(snapshot.migrationStatus)} ·{" "}
                    {formatDate(snapshot.importedAt)}
                  </span>
                </div>

                <p className="editorial-body" style={{ margin: 0 }}>
                  Valeur originale : <strong>{snapshot.rawValue}</strong>
                </p>

                {isPending ? (
                  hasCanonicalDimension ? (
                    <>
                      <p className="label-meta" style={{ margin: 0 }}>
                        Échelle supposée (suggestion non appliquée) : {suggestion === "1-10" ? "1 à 10" : "0 à 100"}
                      </p>
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                        <button className="internal-button" onClick={() => handleConfirm(snapshot.id, "1-10")} style={buttonStyle} type="button">
                          Confirmer comme 1–10
                        </button>
                        <button className="internal-button" onClick={() => handleConfirm(snapshot.id, "0-100")} style={buttonStyle} type="button">
                          Confirmer comme 0–100
                        </button>
                        <button className="internal-button" onClick={() => handleExclude(snapshot.id)} style={buttonStyle} type="button">
                          Exclure
                        </button>
                      </div>
                    </>
                  ) : (
                    <>
                      <p className="label-meta" style={{ margin: 0 }}>
                        Cette valeur n&apos;a pas de dimension canonique correspondante : elle ne peut pas devenir une
                        évaluation, seulement être exclue de la revue.
                      </p>
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                        <button className="internal-button" onClick={() => handleExclude(snapshot.id)} style={buttonStyle} type="button">
                          Exclure
                        </button>
                      </div>
                    </>
                  )
                ) : null}
              </div>
            );
          })}
        </div>

        {error ? <p style={{ color: "#d79a8f", fontSize: 12.5, margin: 0 }}>{error}</p> : null}
      </div>
    </SystemPanel>
  );
}
