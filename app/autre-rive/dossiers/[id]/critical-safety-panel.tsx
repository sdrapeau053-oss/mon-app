"use client";

import { useState } from "react";

import { SystemPanel } from "@/components/system-ui";
import type { RelationDossier } from "@/lib/autre-rive";

import { formatDate } from "./dossier-data";
import { reportCriticalSafetyEvent, selectCurrentSafetyAssessment } from "./critical-safety-sync";

// Phase 9A — Intégration produit de la sécurité critique (SR-D-001,
// Décision 4). Ce composant est la SEULE origine, dans tout le produit, à
// partir de laquelle un CriticalSafetyAssessment peut être créé : il ne
// s'appuie sur aucun score, aucun mot-clé, aucune sortie IA — uniquement
// sur le geste explicite de l'utilisatrice (bouton dédié ci-dessous).
//
// N'apparaît (formulaire actif) que si une version canonique du dossier
// existe déjà : aucune migration implicite n'est jamais déclenchée depuis
// ce panneau (voir rendu conditionnel plus bas).
//
// Composant contrôlé délibérément : le dossier canonique est lu UNE SEULE
// fois, par le parent (dossier-screen.tsx, dans son effet de montage déjà
// existant), et transmis ici en prop — jamais relu localement par un effet
// propre à ce panneau. Après toute action (signalement, désignation
// courante), ce composant appelle `onChange()` pour demander au parent de
// relire le dossier canonique et de retransmettre la version à jour, sans
// dupliquer la lecture ni introduire un second point de synchronisation.

const fieldStyle = { display: "grid", gap: 4 } as const;
const controlStyle = { boxSizing: "border-box", fontSize: 13, minHeight: 36, padding: "6px 10px", width: "100%" } as const;
const buttonStyle = {
  alignItems: "center",
  borderRadius: 999,
  display: "inline-flex",
  fontSize: 12.5,
  gap: 6,
  justifyContent: "center",
  lineHeight: 1,
  minHeight: 36,
  padding: "7px 12px",
  textAlign: "center",
  whiteSpace: "nowrap",
} as const;

// Affichage sans invention : l'identifiant est déjà dérivé, de façon
// transparente et déterministe, du libellé saisi par l'utilisatrice lors
// de la confirmation du dossier (generateStableParticipantIds). Seule une
// mise en forme cosmétique (tirets -> espaces) est appliquée ; aucun nom
// n'est ajouté ou deviné.
function formatParticipantLabel(participantId: string): string {
  return participantId.replace(/-/g, " ");
}

export function CriticalSafetyPanel({
  dossier,
  onChange,
}: {
  dossier: RelationDossier | null;
  onChange: () => void;
}) {
  const [selectedParticipantIds, setSelectedParticipantIds] = useState<string[]>([]);
  const [rationale, setRationale] = useState("");
  const [error, setError] = useState("");
  const [feedback, setFeedback] = useState("");

  if (!dossier) {
    return (
      <SystemPanel ariaLabel="Sécurité" compact>
        <p className="editorial-body" style={{ margin: 0 }}>
          Sécurité : disponible une fois ce dossier confirmé (voir « Confirmer ce dossier » ci-dessus).
        </p>
      </SystemPanel>
    );
  }

  // Capturé après la garde ci-dessus : TypeScript ne propage pas le
  // rétrécissement de type d'une fermeture (dossier.id resterait vu comme
  // possiblement null dans handleReport/handleSelectCurrent sinon), mais la
  // valeur elle-même reste évidemment celle du dossier déjà présent.
  const activeDossierId = dossier.id;

  function toggleParticipant(participantId: string) {
    setSelectedParticipantIds((current) =>
      current.includes(participantId) ? current.filter((id) => id !== participantId) : [...current, participantId],
    );
  }

  function handleReport() {
    setError("");
    setFeedback("");
    try {
      const result = reportCriticalSafetyEvent(activeDossierId, selectedParticipantIds, rationale.trim());
      if (result.status === "skipped_not_canonical") {
        setError("Ce dossier n'a pas (ou plus) de version confirmée.");
        return;
      }

      setSelectedParticipantIds([]);
      setRationale("");
      onChange();
      setFeedback(
        result.reanalysisRequired
          ? "Signalement enregistré. Une réanalyse est recommandée."
          : "Signalement enregistré.",
      );
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "Une erreur est survenue.");
    }
  }

  function handleSelectCurrent(assessmentId: string) {
    setError("");
    setFeedback("");
    try {
      const result = selectCurrentSafetyAssessment(activeDossierId, assessmentId);
      if (result.status === "skipped_not_canonical") {
        setError("Ce dossier n'a pas (ou plus) de version confirmée.");
        return;
      }
      onChange();
      setFeedback("Évaluation désignée comme courante.");
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "Une erreur est survenue.");
    }
  }

  const canReport = selectedParticipantIds.length > 0 && rationale.trim().length > 0;
  const history = [...dossier.safetyAssessments].sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  return (
    <SystemPanel ariaLabel="Sécurité" compact>
      <div style={{ display: "grid", gap: 12 }}>
        <div style={{ display: "grid", gap: 4 }}>
          <h3 style={{ color: "var(--text-main)", fontFamily: "var(--font-serif)", fontSize: 15, margin: 0 }}>
            Sécurité
          </h3>
          <p className="editorial-body" style={{ margin: 0 }}>
            Aucune détection automatique. Un événement n&apos;est enregistré ici que si vous le signalez vous-même.
          </p>
        </div>

        {history.length > 0 ? (
          <div style={{ display: "grid", gap: 6 }}>
            {history.map((assessment) => {
              const isCurrent = dossier.currentSafetyAssessmentRef === assessment.id;
              return (
                <div
                  key={assessment.id}
                  style={{
                    background: "rgba(255,250,238,.035)",
                    border: "1px solid rgba(201,168,92,.16)",
                    borderRadius: 8,
                    display: "grid",
                    gap: 4,
                    padding: "8px 10px",
                  }}
                >
                  <div style={{ alignItems: "center", display: "flex", gap: 8, justifyContent: "space-between" }}>
                    <span className="label-meta" style={{ margin: 0 }}>
                      {formatDate(assessment.createdAt)} {isCurrent ? "· ★ courante" : ""}
                    </span>
                    {!isCurrent ? (
                      <button
                        className="internal-button"
                        onClick={() => handleSelectCurrent(assessment.id)}
                        style={{ ...buttonStyle, minHeight: 26, padding: "3px 8px" }}
                        type="button"
                      >
                        Désigner comme courante
                      </button>
                    ) : null}
                  </div>
                  <p className="editorial-body" style={{ margin: 0 }}>{assessment.rationale}</p>
                  {assessment.participantIds.length > 0 ? (
                    <p className="label-meta" style={{ margin: 0 }}>
                      Concerne : {assessment.participantIds.map(formatParticipantLabel).join(", ")}
                    </p>
                  ) : null}
                </div>
              );
            })}
          </div>
        ) : (
          <p className="label-meta" style={{ margin: 0 }}>Aucun événement signalé pour ce dossier.</p>
        )}

        <div style={fieldStyle}>
          <span className="label-meta">Participant(s) concerné(s)</span>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {dossier.participantIds.map((participantId) => (
              <label
                key={participantId}
                style={{ alignItems: "center", display: "flex", fontSize: 13, gap: 6 }}
              >
                <input
                  checked={selectedParticipantIds.includes(participantId)}
                  onChange={() => toggleParticipant(participantId)}
                  type="checkbox"
                />
                {formatParticipantLabel(participantId)}
              </label>
            ))}
          </div>
        </div>

        <label style={fieldStyle}>
          <span className="label-meta">Justification</span>
          <textarea
            onChange={(e) => setRationale(e.target.value)}
            placeholder="Décrivez ce qui s'est passé, dans vos mots."
            rows={3}
            style={controlStyle}
            value={rationale}
          />
        </label>

        {error ? <p style={{ color: "#d79a8f", fontSize: 12.5, margin: 0 }}>{error}</p> : null}
        {feedback ? <p className="label-meta" style={{ margin: 0 }}>{feedback}</p> : null}

        <div>
          <button
            className="internal-button-primary"
            disabled={!canReport}
            onClick={handleReport}
            style={{ ...buttonStyle, opacity: canReport ? 1 : 0.5 }}
            type="button"
          >
            Signaler un événement de sécurité critique
          </button>
        </div>
      </div>
    </SystemPanel>
  );
}
