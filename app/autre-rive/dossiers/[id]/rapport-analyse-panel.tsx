"use client";

import { SystemPanel } from "@/components/system-ui";
import type { OverallConclusionLabel, RapportAnalyse, RelationDossier } from "@/lib/autre-rive";

import { formatDate } from "./dossier-data";
import { generateCanonicalRapportAnalyse } from "./rapport-analyse-sync";

// Phase 9E — Intégration produit du rapport d'analyse canonique (SR-D-001,
// Décision 5). Composant contrôlé, même discipline que CriticalSafetyPanel
// (9A), AssessmentDisagreementPanel (9B), CurrentAssessmentPanel (9C) et
// NeedsPanel (9D) : aucun effet interne, aucune lecture locale du dossier
// ou des rapports canoniques — reçus en props, relus par le parent
// (dossier-screen.tsx) via son effet de montage déjà existant. Après
// génération, ce composant appelle onChange() pour demander au parent de
// relire les rapports canoniques.
//
// Aucune génération automatique : un rapport n'est jamais créé au montage
// ni au rendu, uniquement par le clic explicite sur "Générer un rapport
// d'analyse". Aucune modification, suppression ou régénération n'est
// proposée pour un rapport déjà généré : un RapportAnalyse est un
// instantané immuable une fois stocké (SR-D-001, Décision 5).
//
// Règle de gouvernance ajoutée par l'utilisatrice pour cette phase (point 4
// de sa décision de gouvernance validée) : lorsque overallConclusionLabel
// vaut "donnees_insuffisantes", l'interface doit toujours afficher
// explicitement que cela signifie seulement qu'aucune conclusion
// structurée n'a encore été produite — jamais un jugement négatif sur la
// relation. NO_CONCLUSIONS_DISCLAIMER porte ce texte mot pour mot.
const NO_CONCLUSIONS_DISCLAIMER = "Aucune conclusion structurée n'a encore été produite pour ce dossier.";

const conclusionLabels: Record<OverallConclusionLabel, string> = {
  donnees_insuffisantes: "Données insuffisantes",
  probablement_saine: "Probablement saine",
  preoccupante: "Préoccupante",
  malsaine: "Malsaine",
  risque_critique: "Risque critique",
};

const coverageLevelLabels: Record<string, string> = {
  bonne: "Bonne",
  faible: "Faible",
  insuffisante: "Insuffisante",
  partielle: "Partielle",
  tres_bonne: "Très bonne",
};

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

export function RapportAnalysePanel({
  dossier,
  rapports,
  onChange,
}: {
  dossier: RelationDossier | null;
  rapports: RapportAnalyse[];
  onChange: () => void;
}) {
  if (!dossier) {
    return (
      <SystemPanel ariaLabel="Rapport d'analyse" compact>
        <p className="editorial-body" style={{ margin: 0 }}>
          Rapport d&apos;analyse disponible une fois ce dossier confirmé.
        </p>
      </SystemPanel>
    );
  }

  // Capturé après la garde ci-dessus, même raison que dans les panneaux
  // précédents (9A, 9C, 9D) : TypeScript ne propage pas le rétrécissement
  // dans la fermeture ci-dessous.
  const activeDossierId = dossier.id;

  function handleGenerate() {
    generateCanonicalRapportAnalyse(activeDossierId);
    onChange();
  }

  const sortedRapports = [...rapports].sort((a, b) => b.generatedAt.localeCompare(a.generatedAt));

  return (
    <SystemPanel ariaLabel="Rapport d'analyse" compact>
      <div style={{ display: "grid", gap: 14 }}>
        <div style={{ display: "grid", gap: 4 }}>
          <h3 style={{ color: "var(--text-main)", fontFamily: "var(--font-serif)", fontSize: 15, margin: 0 }}>
            Rapport d&apos;analyse
          </h3>
          <p className="editorial-body" style={{ margin: 0 }}>
            Un rapport est un instantané des données canoniques réellement disponibles au moment de sa génération. Les
            rapports précédents ne sont jamais modifiés ni remplacés.
          </p>
        </div>

        {sortedRapports.length === 0 ? (
          <p className="label-meta" style={{ margin: 0 }}>Aucun rapport d&apos;analyse généré pour ce dossier.</p>
        ) : (
          <div style={{ display: "grid", gap: 6 }}>
            {sortedRapports.map((rapport) => (
              <div
                key={rapport.id}
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
                  {formatDate(rapport.generatedAt)} · {conclusionLabels[rapport.overallConclusionLabel]}
                </span>

                {rapport.overallConclusionLabel === "donnees_insuffisantes" ? (
                  <p className="editorial-body" style={{ margin: 0 }}>{NO_CONCLUSIONS_DISCLAIMER}</p>
                ) : null}

                <p className="editorial-body" style={{ margin: 0 }}>
                  Couverture : {coverageLevelLabels[rapport.coverage.coverageLevel] ?? rapport.coverage.coverageLevel} (
                  {rapport.coverage.overallCoverage})
                </p>
                <p className="label-meta" style={{ margin: 0 }}>
                  {rapport.assessmentSnapshots.length} évaluation(s) courante(s) · {rapport.needSnapshots.length} besoin(s)
                  actif(s) au moment du rapport
                </p>
              </div>
            ))}
          </div>
        )}

        <div>
          <button className="internal-button-primary" onClick={handleGenerate} style={buttonStyle} type="button">
            Générer un rapport d&apos;analyse
          </button>
        </div>
      </div>
    </SystemPanel>
  );
}
