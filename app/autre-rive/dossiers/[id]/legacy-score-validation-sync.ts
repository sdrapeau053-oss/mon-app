import {
  confirmLegacyScoreSnapshot,
  createImportedScoreAssessment,
  excludeLegacyScoreSnapshot,
  readRelationDossierById,
  addOrUpdateRelationDossier,
  type KnownScoreScale,
  type RelationDossier,
} from "@/lib/autre-rive";

// Phase suivant 9E — Écran de validation des données historiques (SR-D-001,
// Décision 2 §6). Raccorde l'écran de fiche dossier au moteur canonique déjà
// existant (createImportedScoreAssessment / confirmLegacyScoreSnapshot /
// excludeLegacyScoreSnapshot, lib/autre-rive/assessment.ts) : ce fichier
// n'implémente AUCUNE règle métier propre — même répartition des
// responsabilités que critical-safety-sync.ts (9A), needs-sync.ts (9D) et
// rapport-analyse-sync.ts (9E). Les seules lectures effectuées ici
// (recherche du snapshot par id, correspondance de dimension) servent à
// PRÉPARER les paramètres du moteur, jamais à réimplémenter une validation
// que le moteur ferait déjà (aucun .find() ici ne duplique un throw déjà
// garanti ailleurs, contrairement à ce que current-assessment-sync.test.ts
// vérifie pour selectCurrentAssessment, dont la signature ne nécessite
// aucune lecture préalable).
//
// Nomenclature des dimensions ("clarte", "reciprocite", "securite") et
// exclusion structurelle d'"energieEmotionnelle" reprises À L'IDENTIQUE de
// manual-score-sync.ts (Phase 8bis.5) — aucune nouvelle nomenclature n'est
// introduite ici. energieEmotionnelle ne peut donc jamais être confirmé
// (aucune dimension canonique), seulement exclu.

export type LegacyScoreMetricKey =
  | "niveauClarte"
  | "niveauReciprocite"
  | "niveauSecurite"
  | "energieEmotionnelle";

const LEGACY_SCORE_VALIDATION_DIMENSIONS: Partial<Record<LegacyScoreMetricKey, string>> = {
  niveauClarte: "clarte",
  niveauReciprocite: "reciprocite",
  niveauSecurite: "securite",
  // energieEmotionnelle : volontairement absent, voir commentaire d'en-tête.
};

export interface LegacyScoreValidationOptions {
  now?: () => string;
  createId?: (dimension: string) => string;
  createdBy?: string;
}

function defaultCreateId(dimension: string): string {
  return "assessment-" + dimension + "-imported-" + Date.now() + "-" + Math.random().toString(36).slice(2, 9);
}

export type ConfirmLegacyScoreResult =
  | { status: "applied"; dossier: RelationDossier; assessmentId: string }
  // Aucune version canonique n'existe encore pour ce dossier (même
  // convention que tous les modules -sync.ts précédents).
  | { status: "skipped_not_canonical" }
  // L'id fourni ne correspond à aucun snapshot du dossier — jamais
  // d'invention d'un snapshot, jamais de correction silencieuse de l'id.
  | { status: "skipped_snapshot_not_found" }
  // Aucune dimension canonique autorisée pour ce metricKey
  // (energieEmotionnelle) : aucune tentative n'est même faite, aucune
  // dimension n'est inventée (même garde que manual-score-sync.ts).
  | { status: "skipped_no_canonical_dimension" }
  // Ce snapshot a déjà été revu (confirmed ou excluded) : une nouvelle
  // confirmation créerait une seconde évaluation à partir de la même
  // valeur brute, ce que rien dans le moteur canonique n'empêche
  // structurellement (chaque appel génère un nouvel id). Cette garde
  // protège contre un double geste (double clic, ré-ouverture d'écran),
  // jamais contre une correction légitime : corriger une confirmation déjà
  // faite n'est pas un cas prévu par SR-D-001 Décision 2 §6, qui ne décrit
  // qu'un parcours à sens unique (voir → confirmer/corriger → tracer).
  | { status: "skipped_already_reviewed" };

export type ExcludeLegacyScoreResult =
  | { status: "applied"; dossier: RelationDossier }
  | { status: "skipped_not_canonical" }
  | { status: "skipped_snapshot_not_found" }
  | { status: "skipped_already_reviewed" };

// Confirme (ou corrige) l'échelle d'un LegacyScoreSnapshot identifié par son
// id : confirmedScale est TOUJOURS un choix explicite de l'utilisatrice
// (bouton dédié par échelle dans legacy-score-validation-panel.tsx), jamais
// une valeur par défaut ni la suggestion produite par suggestLikelyScale
// (Décision 2 §5 : la suggestion ne peut « jamais modifier définitivement
// la donnée sans validation humaine explicite »).
export function confirmLegacyScoreSnapshotInDossier(
  dossierId: string,
  snapshotId: string,
  confirmedScale: KnownScoreScale,
  options: LegacyScoreValidationOptions = {},
): ConfirmLegacyScoreResult {
  const canonicalDossier = readRelationDossierById(dossierId);
  if (!canonicalDossier) {
    return { status: "skipped_not_canonical" };
  }

  const snapshot = (canonicalDossier.legacyScoreSnapshots ?? []).find((item) => item.id === snapshotId);
  if (!snapshot) {
    return { status: "skipped_snapshot_not_found" };
  }

  if (snapshot.migrationStatus !== "pending_review") {
    return { status: "skipped_already_reviewed" };
  }

  const dimension = LEGACY_SCORE_VALIDATION_DIMENSIONS[snapshot.metricKey as LegacyScoreMetricKey];
  if (!dimension) {
    return { status: "skipped_no_canonical_dimension" };
  }

  const now = options.now ?? (() => new Date().toISOString());
  const createId = options.createId ?? defaultCreateId;
  const createdBy = options.createdBy ?? "utilisatrice";

  const assessment = createImportedScoreAssessment({
    id: createId(dimension),
    dimension,
    rawValue: snapshot.rawValue,
    rawScale: confirmedScale,
    createdBy,
    createdAt: now(),
  });

  const updatedDossier = confirmLegacyScoreSnapshot(canonicalDossier, snapshotId, assessment, { now });
  addOrUpdateRelationDossier(updatedDossier);

  return { status: "applied", dossier: updatedDossier, assessmentId: assessment.id };
}

// Exclut définitivement un LegacyScoreSnapshot de toute promotion future,
// sans jamais produire d'évaluation (Décision 2 §5 : l'incertitude n'est
// jamais résolue par une déduction silencieuse — elle peut seulement être
// tracée comme non résolue).
export function excludeLegacyScoreSnapshotInDossier(
  dossierId: string,
  snapshotId: string,
  options: LegacyScoreValidationOptions = {},
): ExcludeLegacyScoreResult {
  const canonicalDossier = readRelationDossierById(dossierId);
  if (!canonicalDossier) {
    return { status: "skipped_not_canonical" };
  }

  const snapshot = (canonicalDossier.legacyScoreSnapshots ?? []).find((item) => item.id === snapshotId);
  if (!snapshot) {
    return { status: "skipped_snapshot_not_found" };
  }

  if (snapshot.migrationStatus !== "pending_review") {
    return { status: "skipped_already_reviewed" };
  }

  const now = options.now ?? (() => new Date().toISOString());
  const updatedDossier = excludeLegacyScoreSnapshot(canonicalDossier, snapshotId, { now });
  addOrUpdateRelationDossier(updatedDossier);

  return { status: "applied", dossier: updatedDossier };
}
