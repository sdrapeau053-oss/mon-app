import {
  addOrUpdateRelationDossier,
  readRelationDossierById,
  setCurrentAssessmentRef,
  type RelationDossier,
} from "@/lib/autre-rive";

// Phase 9C — Intégration produit des évaluations courantes (SR-D-001,
// Décision 3 §11 « Pointeur explicite par dimension »).
//
// Raccorde l'écran de fiche dossier au moteur canonique déjà existant et
// déjà considéré correct (setCurrentAssessmentRef / getCurrentAssessment,
// lib/autre-rive/assessment.ts, non modifiés par cette phase) : ce fichier
// n'implémente AUCUNE règle métier de sélection, il se contente de lire le
// dossier canonique, d'appeler setCurrentAssessmentRef, puis de persister le
// résultat — même répartition des responsabilités que
// critical-safety-sync.ts (Phase 9A) et manual-score-sync.ts (Phase 8bis.5).
//
// setCurrentAssessmentRef reste l'unique source de vérité pour la
// validation : il refuse déjà toute évaluation inexistante, toute évaluation
// d'une autre dimension, et — puisqu'il n'opère que sur les assessments du
// dossier canonique effectivement lu ici — toute évaluation qui
// n'appartient pas à ce dossier précis. Ce module ne duplique aucun de ces
// invariants, conformément à la consigne de cette phase.
//
// Convention pour selectedBy : même littéral que createdBy dans
// manual-score-sync.ts et critical-safety-sync.ts ("utilisatrice"), faute
// d'un système d'identité utilisateur global dans le produit — aucune
// identité fictive plus détaillée n'est inventée ici.

export interface SelectCurrentAssessmentOptions {
  now?: () => string;
  selectedBy?: string;
}

export type SelectCurrentAssessmentResult =
  | { status: "applied"; dossier: RelationDossier }
  // Aucune version canonique n'existe encore pour ce dossier : aucune
  // migration implicite n'est effectuée ici (même convention que
  // critical-safety-sync.ts et manual-score-sync.ts).
  | { status: "skipped_not_canonical" };

// Désigne explicitement une évaluation déjà historisée comme l'évaluation
// courante d'une dimension, pour un dossier déjà canonique. Action
// strictement distincte de toute création d'évaluation (Décision 3 §11) :
// ni la saisie manuelle, ni la synchronisation IA, ni la détection de
// désaccord (Phase 9B) n'appellent jamais cette fonction — seul un geste
// explicite à l'écran (bouton "Désigner comme courante") le fait.
export function selectCurrentAssessment(
  dossierId: string,
  dimension: string,
  assessmentId: string,
  options: SelectCurrentAssessmentOptions = {},
): SelectCurrentAssessmentResult {
  const canonicalDossier = readRelationDossierById(dossierId);
  if (!canonicalDossier) {
    return { status: "skipped_not_canonical" };
  }

  const selectedBy = options.selectedBy ?? "utilisatrice";

  // setCurrentAssessmentRef lève une exception si assessmentId n'existe pas
  // pour cette dimension dans l'historique de CE dossier précis (donc aussi
  // pour un id appartenant à un autre dossier, ou à une autre dimension) :
  // cette fonction ne l'intercepte pas, laissant l'appelant (l'écran) la
  // traiter — même convention que selectCurrentSafetyAssessment.
  const updatedDossier = setCurrentAssessmentRef(canonicalDossier, dimension, assessmentId, selectedBy, {
    now: options.now,
  });
  addOrUpdateRelationDossier(updatedDossier);

  return { status: "applied", dossier: updatedDossier };
}
