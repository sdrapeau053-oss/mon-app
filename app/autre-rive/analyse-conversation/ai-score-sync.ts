import {
  addAssessment,
  addOrUpdateRelationDossier,
  createAiScoreAssessment,
  readRelationDossierById,
  type RelationDossier,
  type ScoreAssessment,
} from "@/lib/autre-rive";

// Phase 8bis.3 — Conformité finale SR-D-001 (Décisions 2 et 3).
//
// Fait passer les scores produits par l'analyse IA de cet écran par le
// modèle canonique d'évaluations (ScoreAssessment / addAssessment, déjà
// implémenté Phase 5 d'IMP-001 dans lib/autre-rive/assessment.ts), au lieu
// d'écraser directement les champs plats legacy niveauClarte /
// niveauReciprocite / niveauSecurite (comportement supprimé de page.tsx par
// cette même sous-phase — SR-D-001, Décision 3 : « L'IA ne peut jamais
// écraser automatiquement une valeur »).
//
// Ce module ne touche jamais currentAssessmentRefs : une évaluation IA
// n'est jamais désignée automatiquement comme évaluation courante (Décision
// 3 §11) — addAssessment, qu'il utilise, ne le fait déjà pas. Il ne touche
// jamais non plus StoredDossier, "autre-rive-dossiers" (clé legacy) ni
// LegacyScoreSnapshot : la persistance canonique passe exclusivement par
// readRelationDossierById / addOrUpdateRelationDossier (clé distincte
// "autre-rive-relation-dossiers", storage.ts).
//
// Nomenclature des dimensions ("clarte", "reciprocite", "securite") et
// identifiants techniques (AI_SCORE_SOURCE, AI_SCORE_METHODOLOGY_VERSION)
// repris tels quels de la nomenclature déjà établie par
// lib/autre-rive/assessment.test.ts et rapport-analyse.test.ts — aucune
// nouvelle nomenclature n'est introduite ici.

export const AI_SCORE_SOURCE = "moteur-analyse-v1";
export const AI_SCORE_METHODOLOGY_VERSION = "analyse-conversation-v1";

export interface AiConversationScores {
  clarte?: number;
  reciprocite?: number;
  securite?: number;
}

export interface AiConversationRationales {
  clarte?: string;
  reciprocite?: string;
  securite?: string;
}

export interface BuildAiScoreAssessmentsOptions {
  // Preuve identifiable disponible pour ces scores (Décision 3 §2,
  // evidenceIds) : l'id de l'AnalyseConversation réellement sauvegardée par
  // page.tsx pour ce passage IA. Jamais inventée si absente.
  evidenceId?: string;
  createdAt?: string;
  // Générateur d'id injectable pour des tests déterministes ; par défaut,
  // même schéma que createAnalysisId() dans page.tsx. SR-D-001 ne définit
  // aucune politique de génération d'identifiant pour ScoreAssessment (même
  // principe que dans assessment.ts) : ce module n'en invente donc pas de
  // nouvelle, il réutilise le schéma déjà en usage dans ce dossier de code.
  createId?: (dimension: string) => string;
}

function defaultCreateId(dimension: string): string {
  return "assessment-" + dimension + "-ai-" + Date.now() + "-" + Math.random().toString(36).slice(2, 9);
}

type Dimension = "clarte" | "reciprocite" | "securite";

// Construit un ScoreAssessment source "ai" pour chaque dimension
// réellement fournie dans "scores" — jamais pour une dimension absente
// (SR-D-001, Décision 6, item Évaluations : "aucun changement sur une
// dimension absente de la réponse IA"). Aucune valeur n'est devinée ou
// calculée pour combler une dimension manquante.
export function buildAiScoreAssessments(
  scores: AiConversationScores,
  rationales: AiConversationRationales = {},
  options: BuildAiScoreAssessmentsOptions = {},
): ScoreAssessment[] {
  const createdAt = options.createdAt ?? new Date().toISOString();
  const createId = options.createId ?? defaultCreateId;

  const dimensions: Dimension[] = ["clarte", "reciprocite", "securite"];

  return dimensions
    .filter((dimension) => scores[dimension] !== undefined)
    .map((dimension) =>
      createAiScoreAssessment({
        id: createId(dimension),
        dimension,
        rawValue: scores[dimension] as number,
        rawScale: "0-100",
        createdBy: AI_SCORE_SOURCE,
        createdAt,
        methodologyVersion: AI_SCORE_METHODOLOGY_VERSION,
        // rationale : uniquement si le flux IA existant la fournit
        // réellement (texte déjà produit par parseAnalyseIA pour cette
        // dimension) — jamais inventée.
        rationale: rationales[dimension],
        evidenceIds: options.evidenceId ? [options.evidenceId] : undefined,
      }),
    );
}

export type SyncAiScoresResult =
  | { status: "applied"; dossier: RelationDossier; assessmentIds: string[] }
  // Aucune version canonique n'existe encore pour ce dossier : aucune
  // migration implicite n'est effectuée ici (SR-D-001, Décision 4.3 —
  // "migration explicite et non destructive" ; la bascule réelle de ce
  // dossier relève de la Phase 8bis.4, pas de cette sous-phase). L'analyse
  // de conversation elle-même (tonalite, patterns, texte IA) reste
  // sauvegardée normalement par page.tsx via le chemin legacy, inchangé :
  // seule la création de ScoreAssessment canoniques est différée.
  | { status: "skipped_not_canonical" };

export interface SyncAiScoresOptions {
  now?: () => string;
}

// Point d'entrée appelé par page.tsx après une analyse IA. Vérifie
// explicitement l'existence d'une version canonique du dossier avant
// d'écrire quoi que ce soit.
export function syncAiScoresToCanonicalDossier(
  dossierId: string,
  scores: AiConversationScores,
  rationales: AiConversationRationales = {},
  evidenceId?: string,
  options: SyncAiScoresOptions = {},
): SyncAiScoresResult {
  const canonicalDossier = readRelationDossierById(dossierId);
  if (!canonicalDossier) {
    return { status: "skipped_not_canonical" };
  }

  const now = options.now ?? (() => new Date().toISOString());
  const assessments = buildAiScoreAssessments(scores, rationales, { evidenceId, createdAt: now() });

  let updatedDossier = canonicalDossier;
  for (const assessment of assessments) {
    // addAssessment refuse tout id déjà présent et ne touche jamais
    // currentAssessmentRefs (Décision 3 §3 et §11) : ces garanties sont
    // structurelles, pas répétées ici.
    updatedDossier = addAssessment(updatedDossier, assessment, { now });
  }

  addOrUpdateRelationDossier(updatedDossier);

  return { status: "applied", dossier: updatedDossier, assessmentIds: assessments.map((a) => a.id) };
}
