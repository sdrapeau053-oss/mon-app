"use client";

import { SystemPanel } from "@/components/system-ui";
import type { RelationDossier } from "@/lib/autre-rive";

import { formatDate } from "./dossier-data";
import { computeAssessmentDisagreements } from "./assessment-disagreement-view";

// Phase 9B — Intégration produit du désaccord manuel / IA (SR-D-001,
// Décision 3 §6). Composant strictement en lecture : n'appelle jamais un
// moteur d'écriture, ne crée ni ne modifie aucun ScoreAssessment, aucun
// CurrentAssessmentRef, aucun désaccord persistant (il n'en existe pas —
// voir assessment-disagreement-view.ts). Se contente d'afficher le résultat
// de computeAssessmentDisagreements, recalculé à chaque rendu à partir du
// dossier canonique transmis par le parent.
//
// Composant contrôlé, même discipline que CriticalSafetyPanel (Phase 9A) :
// aucun effet interne, aucune lecture locale du dossier canonique — reçu en
// prop, relu par le parent (dossier-screen.tsx) via son effet de montage
// déjà existant. Aucun onChange n'est nécessaire ici : ce panneau ne modifie
// jamais rien, il n'y a donc rien à faire relire au parent.
//
// Vocabulaire imposé avant implémentation : présente le désaccord comme un
// signal à examiner, jamais comme un verdict. N'affirme jamais que l'IA a
// raison, que l'utilisatrice a tort, qu'une moyenne devrait être calculée,
// ou qu'une valeur devrait remplacer l'autre. Les deux valeurs sont
// toujours affichées côte à côte, avec leur source et leur date, sans
// hiérarchie visuelle entre elles.

const dimensionLabels: Record<string, string> = {
  clarte: "Clarté",
  reciprocite: "Réciprocité",
  securite: "Sécurité",
};

function formatDimensionLabel(dimension: string): string {
  return dimensionLabels[dimension] ?? dimension;
}

export function AssessmentDisagreementPanel({ dossier }: { dossier: RelationDossier | null }) {
  if (!dossier) {
    return (
      <SystemPanel ariaLabel="Désaccords manuel / IA" compact>
        <p className="editorial-body" style={{ margin: 0 }}>
          Comparaison disponible une fois ce dossier confirmé.
        </p>
      </SystemPanel>
    );
  }

  const views = computeAssessmentDisagreements(dossier);

  return (
    <SystemPanel ariaLabel="Désaccords manuel / IA" compact>
      <div style={{ display: "grid", gap: 12 }}>
        <div style={{ display: "grid", gap: 4 }}>
          <h3 style={{ color: "var(--text-main)", fontFamily: "var(--font-serif)", fontSize: 15, margin: 0 }}>
            Désaccords manuel / IA
          </h3>
          <p className="editorial-body" style={{ margin: 0 }}>
            Comparaison factuelle entre votre dernière évaluation et la dernière analyse IA, dimension par dimension.
            Aucune des deux valeurs n&apos;est désignée comme correcte.
          </p>
        </div>

        {views.length === 0 ? (
          <p className="label-meta" style={{ margin: 0 }}>Aucun désaccord constaté pour le moment.</p>
        ) : (
          <div style={{ display: "grid", gap: 8 }}>
            {views.map(({ disagreement, manualAssessment, aiAssessment }) => (
              <div
                key={disagreement.id}
                style={{
                  background: "rgba(255,250,238,.035)",
                  border: "1px solid rgba(201,168,92,.16)",
                  borderRadius: 8,
                  display: "grid",
                  gap: 6,
                  padding: "8px 10px",
                }}
              >
                <span className="label-meta" style={{ margin: 0 }}>
                  {formatDimensionLabel(disagreement.dimension)}
                </span>
                <p className="editorial-body" style={{ margin: 0 }}>
                  Votre évaluation et l&apos;analyse IA diffèrent sensiblement sur cette dimension.
                </p>
                <div style={{ display: "grid", gap: 2 }}>
                  <span className="editorial-body" style={{ margin: 0 }}>
                    Votre évaluation : {manualAssessment.score.normalizedValue}/100 (manuel, {formatDate(manualAssessment.createdAt)})
                  </span>
                  <span className="editorial-body" style={{ margin: 0 }}>
                    Analyse IA : {aiAssessment.score.normalizedValue}/100 (IA, {formatDate(aiAssessment.createdAt)})
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </SystemPanel>
  );
}
