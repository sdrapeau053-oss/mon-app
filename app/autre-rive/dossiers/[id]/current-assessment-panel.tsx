"use client";

import { SystemPanel } from "@/components/system-ui";
import type { RelationDossier } from "@/lib/autre-rive";

import { formatDate } from "./dossier-data";
import { selectCurrentAssessment } from "./current-assessment-sync";

// Phase 9C — Intégration produit des évaluations courantes (SR-D-001,
// Décision 3 §11). Composant contrôlé, même discipline que
// CriticalSafetyPanel (Phase 9A) et AssessmentDisagreementPanel (Phase 9B) :
// aucun effet interne, aucune lecture locale du dossier canonique — reçu en
// prop, relu par le parent (dossier-screen.tsx) via son effet de montage
// déjà existant. Après toute désignation, ce composant appelle onChange()
// pour demander au parent de relire le dossier canonique.
//
// N'affiche jamais aucune sélection automatique : aucune évaluation n'est
// jamais désignée courante par ce composant lui-même, ni au montage, ni au
// rendu — seul le clic explicite sur "Désigner comme courante" appelle
// selectCurrentAssessment. Une évaluation déjà courante ne propose jamais ce
// bouton (uniquement un badge "★ courante"), pour éviter toute
// re-sélection ambiguë d'elle-même.

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

// Dimensions canoniques couvertes par cette phase, dans un ordre fixe et
// documenté (pas d'ordre implicite dépendant de l'historique) — même liste
// que manual-score-sync.ts / ai-score-sync.ts.
const CANONICAL_DIMENSIONS: Array<{ key: string; label: string }> = [
  { key: "clarte", label: "Clarté" },
  { key: "reciprocite", label: "Réciprocité" },
  { key: "securite", label: "Sécurité" },
];

function formatSourceLabel(source: string): string {
  if (source === "manual") return "Manuel";
  if (source === "ai") return "IA";
  return source;
}

export function CurrentAssessmentPanel({
  dossier,
  onChange,
}: {
  dossier: RelationDossier | null;
  onChange: () => void;
}) {
  if (!dossier) {
    return (
      <SystemPanel ariaLabel="Évaluations courantes" compact>
        <p className="editorial-body" style={{ margin: 0 }}>
          Sélection de l&apos;évaluation courante disponible une fois ce dossier confirmé.
        </p>
      </SystemPanel>
    );
  }

  // Capturé après la garde ci-dessus, même raison que dans
  // CriticalSafetyPanel : TypeScript ne propage pas le rétrécissement dans
  // les fermetures ci-dessous.
  const activeDossierId = dossier.id;

  // Aucun try/catch ici : setCurrentAssessmentRef ne peut lever que si
  // l'assessmentId n'existe pas pour cette dimension dans ce dossier, ce qui
  // ne peut pas arriver via ce bouton (l'id provient toujours d'un
  // assessment déjà présent dans dossier.assessments pour cette dimension
  // précise). Faire échouer bruyamment plutôt qu'avaler silencieusement une
  // incohérence réelle est préférable ici.
  function handleSelect(dimension: string, assessmentId: string) {
    selectCurrentAssessment(activeDossierId, dimension, assessmentId);
    onChange();
  }

  const dimensionsWithAssessments = CANONICAL_DIMENSIONS.filter(({ key }) =>
    dossier.assessments.some((assessment) => assessment.dimension === key),
  );

  if (dimensionsWithAssessments.length === 0) {
    return (
      <SystemPanel ariaLabel="Évaluations courantes" compact>
        <p className="label-meta" style={{ margin: 0 }}>Aucune évaluation historisée pour ce dossier.</p>
      </SystemPanel>
    );
  }

  return (
    <SystemPanel ariaLabel="Évaluations courantes" compact>
      <div style={{ display: "grid", gap: 14 }}>
        <div style={{ display: "grid", gap: 4 }}>
          <h3 style={{ color: "var(--text-main)", fontFamily: "var(--font-serif)", fontSize: 15, margin: 0 }}>
            Évaluations courantes
          </h3>
          <p className="editorial-body" style={{ margin: 0 }}>
            Aucune évaluation n&apos;est courante par défaut. Désignez explicitement celle qui représente la valeur
            actuelle de chaque dimension.
          </p>
        </div>

        {dimensionsWithAssessments.map(({ key, label }) => {
          const currentRef = dossier.currentAssessmentRefs.find((ref) => ref.dimension === key);
          const history = dossier.assessments
            .filter((assessment) => assessment.dimension === key)
            .slice()
            .sort((a, b) => b.createdAt.localeCompare(a.createdAt));

          return (
            <div key={key} style={{ display: "grid", gap: 6 }}>
              <span className="label-meta" style={{ margin: 0 }}>{label}</span>
              {history.map((assessment) => {
                const isCurrent = currentRef?.assessmentId === assessment.id;
                return (
                  <div
                    key={assessment.id}
                    style={{
                      alignItems: "center",
                      background: "rgba(255,250,238,.035)",
                      border: "1px solid rgba(201,168,92,.16)",
                      borderRadius: 8,
                      display: "flex",
                      gap: 8,
                      justifyContent: "space-between",
                      padding: "8px 10px",
                    }}
                  >
                    <span className="editorial-body" style={{ margin: 0 }}>
                      {assessment.score.normalizedValue ?? "—"}/100 ({formatSourceLabel(assessment.source)},{" "}
                      {formatDate(assessment.createdAt)}) {isCurrent ? "· ★ courante" : ""}
                    </span>
                    {!isCurrent ? (
                      <button
                        className="internal-button"
                        onClick={() => handleSelect(key, assessment.id)}
                        style={buttonStyle}
                        type="button"
                      >
                        Désigner comme courante
                      </button>
                    ) : null}
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>
    </SystemPanel>
  );
}
