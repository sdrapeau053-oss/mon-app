import {
  addAssessment,
  addOrUpdateRelationDossier,
  createManualScoreAssessment,
  readRelationDossierById,
  type RelationDossier,
} from "@/lib/autre-rive";

// Phase 8bis.5 — Conformité finale SR-D-001 (Décisions 2 et 3).
//
// Fait passer les quatre curseurs manuels de la fiche dossier
// (dossier-screen.tsx) par le modèle canonique d'évaluations
// (ScoreAssessment / addAssessment / createManualScoreAssessment, déjà
// implémenté Phase 5 d'IMP-001 dans lib/autre-rive/assessment.ts) lorsque
// c'est réellement possible, en plus — jamais à la place — de l'écriture
// legacy plate existante (niveauClarte, niveauReciprocite, niveauSecurite,
// energieEmotionnelle), qui reste strictement inchangée par cette
// sous-phase (voir dossier-screen.tsx).
//
// Nomenclature des dimensions ("clarte", "reciprocite", "securite") reprise
// telle quelle de la nomenclature déjà établie par
// lib/autre-rive/assessment.test.ts et app/autre-rive/analyse-conversation/
// ai-score-sync.ts — aucune nouvelle nomenclature n'est introduite ici.
//
// "energieEmotionnelle" ne possède AUCUNE dimension canonique autorisée :
// lib/autre-rive/relation-dossier.test.ts vérifie explicitement, au niveau
// des types, que RelationDossier canonique n'a jamais eu ce champ
// (NotHasKey<RelationDossier, "energieEmotionnelle">). En inventer une ici
// serait une invention de champ canonique, explicitement interdite par
// cette sous-phase : ce curseur reste donc une écriture legacy pure, jamais
// synchronisée vers le canonique (voir "skipped_no_canonical_dimension"
// ci-dessous).
//
// Ce module ne touche jamais currentAssessmentRefs. SR-D-001, Décision 3
// §11 (« Formulation finale entérinée ») est explicite et sans exception
// pour la source manuelle : « Une nouvelle évaluation [...] ne modifie pas
// automatiquement le pointeur courant » et « aucune nouvelle évaluation ne
// devient automatiquement actuelle ». addAssessment, utilisé ici, ne le
// fait déjà pas — cette garantie est structurelle, pas répétée ici.
// setCurrentAssessmentRef reste un mécanisme distinct, à appeler
// explicitement par une action de désignation dédiée qui n'existe pas
// encore dans le produit (hors périmètre de cette sous-phase : « aucune
// nouvelle fonctionnalité produit »).

export type ManualIndicatorKey =
  | "niveauClarte"
  | "niveauReciprocite"
  | "niveauSecurite"
  | "energieEmotionnelle";

const MANUAL_SCORE_DIMENSIONS: Partial<Record<ManualIndicatorKey, string>> = {
  niveauClarte: "clarte",
  niveauReciprocite: "reciprocite",
  niveauSecurite: "securite",
  // energieEmotionnelle : volontairement absent, voir commentaire d'en-tête.
};

export interface SyncManualScoreOptions {
  now?: () => string;
  createId?: (dimension: string) => string;
  createdBy?: string;
}

function defaultCreateId(dimension: string): string {
  return "assessment-" + dimension + "-manual-" + Date.now() + "-" + Math.random().toString(36).slice(2, 9);
}

export type SyncManualScoreResult =
  | { status: "applied"; dossier: RelationDossier; assessmentId: string }
  // Aucune dimension canonique autorisée pour cette clé legacy
  // (energieEmotionnelle) : aucune tentative de synchronisation n'est même
  // faite, aucune dimension n'est inventée.
  | { status: "skipped_no_canonical_dimension" }
  // Aucune version canonique n'existe encore pour ce dossier : aucune
  // migration implicite n'est effectuée ici (SR-D-001, Décision 4.3 —
  // « migration explicite et non destructive »). La valeur legacy plate
  // reste sauvegardée normalement par dossier-screen.tsx, inchangée : seule
  // la création du ScoreAssessment canonique est différée.
  | { status: "skipped_not_canonical" };

// Synchronise une saisie manuelle (échelle d'affichage 1-10) vers le modèle
// canonique d'évaluations, uniquement lorsque c'est réellement possible.
// Ne modifie et n'invente jamais une valeur : rawValue est conservée telle
// que saisie, rawScale est toujours "1-10", et normalizedValue = rawValue
// x10 est calculée par createManualScoreAssessment lui-même (Décision 2
// §2), pas par ce module.
export function syncManualScoreToCanonicalDossier(
  dossierId: string,
  indicatorKey: ManualIndicatorKey,
  rawValue: number,
  options: SyncManualScoreOptions = {},
): SyncManualScoreResult {
  const dimension = MANUAL_SCORE_DIMENSIONS[indicatorKey];
  if (!dimension) {
    return { status: "skipped_no_canonical_dimension" };
  }

  const canonicalDossier = readRelationDossierById(dossierId);
  if (!canonicalDossier) {
    return { status: "skipped_not_canonical" };
  }

  const now = options.now ?? (() => new Date().toISOString());
  const createId = options.createId ?? defaultCreateId;
  const createdBy = options.createdBy ?? "utilisatrice";

  const assessment = createManualScoreAssessment({
    id: createId(dimension),
    dimension,
    rawValue,
    rawScale: "1-10",
    createdBy,
    createdAt: now(),
  });

  // addAssessment refuse tout id déjà présent et ne touche jamais
  // currentAssessmentRefs (Décision 3 §3 et §11) : garanties structurelles,
  // pas répétées ici.
  const updatedDossier = addAssessment(canonicalDossier, assessment, { now });
  addOrUpdateRelationDossier(updatedDossier);

  return { status: "applied", dossier: updatedDossier, assessmentId: assessment.id };
}
