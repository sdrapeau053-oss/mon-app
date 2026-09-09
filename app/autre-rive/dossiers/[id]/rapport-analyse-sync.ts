import {
  addCanonicalRapportAnalyse,
  readRelationDossierById,
  type Conclusion,
  type CoverageSummary,
  type CriticalSafetyAssessment,
  type NeedSnapshot,
  type OverallConclusionLabel,
  type RapportAnalyse,
  type RelationDossier,
  type AssessmentSnapshot,
} from "@/lib/autre-rive";

// Phase 9E — Intégration produit du rapport d'analyse canonique (SR-D-001,
// Décision 5, « Rôle de RapportAnalyse »).
//
// Raccorde l'écran de fiche dossier au moteur canonique déjà existant et
// déjà considéré correct (lib/autre-rive/rapport-analyse.ts,
// addCanonicalRapportAnalyse, non modifié par cette phase) : ce fichier
// n'implémente aucune règle d'immuabilité ou de stockage propre — il se
// contente de construire un RapportAnalyse à partir de données canoniques
// réellement présentes, puis de le confier à addCanonicalRapportAnalyse.
//
// CONSTAT établi avant ce fichier (inspection complète, cf. échange de
// gouvernance dédié à cette phase) : le produit ne possède aujourd'hui
// aucune source honnête pour observations, hypotheses, conclusions et
// flags — ni le pipeline IA (ia-parsing.ts, texte libre + 3 scores
// nullable), ni l'analyse heuristique locale (tonalite/niveauTension/texte
// libre), ni les rapports legacy (chaînes de caractères sans id ni
// participantId) ne correspondent structurellement à Observation /
// CompetingHypothesis / Conclusion / FlagEntry. Ces quatre tableaux restent
// donc TOUJOURS vides ici — un tableau vide plutôt qu'une invention, tant
// qu'aucune source canonique n'existe (SR-D-001, Décision 5).
//
// Trois champs obligatoires (coverage, overallConfidence,
// overallConclusionLabel) n'avaient de même aucune méthode gouvernée avant
// cette phase. Les règles ci-dessous sont exactement celles validées par
// l'utilisatrice à l'issue du document de préparation de gouvernance dédié
// à la Phase 9E — reproduites ici comme décisions de gouvernance
// documentées dans le code, jamais comme des choix techniques implicites.

// -----------------------------------------------------------------------
// 1. CoverageSummary — Méthode 1 validée : comptage brut avec seuils
//    explicites (aucun ratio, aucun dénominateur implicite, aucun
//    pourcentage de "relation complète", aucune pondération subjective).
// -----------------------------------------------------------------------

export const COVERAGE_CALCULATION_VERSION = "coverage-count-v1";

// Décision de gouvernance (Phase 9E) : la couverture est la somme brute des
// données réellement historisées dans le dossier — preuves, conversations,
// événements, entrées de journal. Les seuils de bascule d'un palier à
// l'autre sont un paramètre opérationnel de cette méthode : la méthode
// elle-même (comptage brut + seuils) a été validée explicitement par
// l'utilisatrice ; les valeurs numériques précises, elles, restent -- comme
// annoncé avant cette implémentation -- du ressort de cette couche produit,
// fixées et documentées ici explicitement (même précédent que
// DEFAULT_DISAGREEMENT_THRESHOLD, lib/autre-rive/assessment.ts, Phase 5/9B).
// Ajustables sans changer la méthode elle-même : toute modification de ces
// seuils reste une décision de gouvernance à documenter au même endroit.
const COVERAGE_THRESHOLDS: ReadonlyArray<{
  readonly maxInclusive: number;
  readonly level: CoverageSummary["coverageLevel"];
}> = [
  { maxInclusive: 0, level: "insuffisante" },
  { maxInclusive: 2, level: "faible" },
  { maxInclusive: 9, level: "partielle" },
  { maxInclusive: 29, level: "bonne" },
  { maxInclusive: Infinity, level: "tres_bonne" },
];

function coverageLevelFor(overallCoverage: number): CoverageSummary["coverageLevel"] {
  const tier = COVERAGE_THRESHOLDS.find((candidate) => overallCoverage <= candidate.maxInclusive);
  // COVERAGE_THRESHOLDS se termine toujours par Infinity : cette branche
  // n'est atteignable que si la table était mal formée.
  return tier ? tier.level : "tres_bonne";
}

// Calcule CoverageSummary uniquement à partir de données réellement
// présentes dans le dossier (SR-D-001, Décision 5) : aucune estimation,
// aucune valeur par défaut, aucune donnée absente comptée comme présente.
export function computeCoverageSummary(dossier: RelationDossier): CoverageSummary {
  const overallCoverage =
    dossier.evidenceIds.length +
    dossier.conversationIds.length +
    dossier.eventIds.length +
    dossier.journalEntryIds.length;

  const missingDataNotes: string[] = [];
  if (dossier.evidenceIds.length === 0) {
    missingDataNotes.push("Aucune preuve historisée (evidenceIds vide).");
  }
  if (dossier.conversationIds.length === 0) {
    missingDataNotes.push("Aucune conversation historisée (conversationIds vide).");
  }
  if (dossier.eventIds.length === 0) {
    missingDataNotes.push("Aucun événement historisé (eventIds vide).");
  }
  if (dossier.journalEntryIds.length === 0) {
    missingDataNotes.push("Aucune entrée de journal historisée (journalEntryIds vide).");
  }

  // Période documentée : bornes réelles des horodatages réellement présents
  // dans le dossier (jamais une période inventée ou estimée).
  const timestamps = [
    dossier.createdAt,
    dossier.updatedAt,
    ...dossier.assessments.map((assessment) => assessment.createdAt),
    ...dossier.needs.map((need) => need.createdAt),
    ...dossier.safetyAssessments.map((safety) => safety.createdAt),
  ].filter((value): value is string => Boolean(value));
  const sortedTimestamps = [...timestamps].sort();

  return {
    overallCoverage,
    coverageLevel: coverageLevelFor(overallCoverage),
    documentedPeriodStart: sortedTimestamps[0],
    documentedPeriodEnd: sortedTimestamps[sortedTimestamps.length - 1],
    missingDataNotes,
    calculationVersion: COVERAGE_CALCULATION_VERSION,
  };
}

// -----------------------------------------------------------------------
// 2. overallConfidence — méthode validée : minimum des confidences
//    lorsque des conclusions structurées existent ; sentinelle documentée
//    sinon. Aucune moyenne, aucune pondération.
// -----------------------------------------------------------------------

// Convention sentinelle documentée (Phase 9E) : tant qu'aucune conclusion
// structurée n'existe, overallConfidence vaut 0 — non pas parce que la
// confiance est mesurée comme nulle, mais parce qu'il n'existe encore rien
// à évaluer. Ne jamais interpréter cette valeur comme une confiance faible
// mesurée.
export const NO_CONCLUSION_CONFIDENCE_SENTINEL = 0;

export function deriveOverallConfidence(conclusions: ReadonlyArray<Conclusion>): number {
  if (conclusions.length === 0) {
    return NO_CONCLUSION_CONFIDENCE_SENTINEL;
  }
  // Minimum, jamais une moyenne (décision de gouvernance validée) : une
  // conclusion peu fiable doit empêcher le rapport global d'afficher
  // artificiellement une forte confiance.
  return Math.min(...conclusions.map((conclusion) => conclusion.confidence));
}

// -----------------------------------------------------------------------
// 3. overallConclusionLabel — méthode validée : "donnees_insuffisantes"
//    tant qu'aucune conclusion structurée n'existe (sens officiel : « aucune
//    conclusion structurée n'a encore été produite », jamais un jugement
//    négatif) ; pire cas parmi les conclusions une fois qu'il en existe.
//    Aucune hiérarchie entre dimensions, aucune moyenne, aucune priorité
//    cachée.
// -----------------------------------------------------------------------

// Ordre de sévérité, dimension-agnostique : ne favorise jamais une
// dimension (Clarté/Réciprocité/Sécurité) par rapport à une autre — seul le
// label le plus sévère parmi toutes les conclusions présentes est retenu,
// quelle que soit sa dimension d'origine.
export const CONCLUSION_SEVERITY_ORDER: ReadonlyArray<OverallConclusionLabel> = [
  "donnees_insuffisantes",
  "probablement_saine",
  "preoccupante",
  "malsaine",
  "risque_critique",
];

export function deriveOverallConclusionLabel(conclusions: ReadonlyArray<Conclusion>): OverallConclusionLabel {
  if (conclusions.length === 0) {
    return "donnees_insuffisantes";
  }

  let worstIndex = -1;
  let worstLabel: OverallConclusionLabel = "donnees_insuffisantes";
  for (const conclusion of conclusions) {
    const index = CONCLUSION_SEVERITY_ORDER.indexOf(conclusion.label);
    if (index > worstIndex) {
      worstIndex = index;
      worstLabel = conclusion.label;
    }
  }
  return worstLabel;
}

// -----------------------------------------------------------------------
// 4. Snapshots — uniquement des pointeurs explicitement désignés ou des
//    entrées canoniques réellement présentes ; jamais "la plus récente" à
//    la place d'un pointeur explicite absent.
// -----------------------------------------------------------------------

// N'utilise que dossier.currentAssessmentRefs (Phase 9C) : si aucune
// évaluation n'a été désignée courante pour une dimension, cette dimension
// n'apparaît simplement pas dans le rapport — jamais remplacée par "la plus
// récente" historisée, ce qui contredirait le principe même de la
// désignation explicite (SR-D-001, Décision 3 §11).
export function buildAssessmentSnapshots(
  dossier: RelationDossier,
  capturedAt: string,
): AssessmentSnapshot[] {
  const snapshots: AssessmentSnapshot[] = [];

  for (const ref of dossier.currentAssessmentRefs) {
    const assessment = dossier.assessments.find(
      (candidate) => candidate.id === ref.assessmentId && candidate.dimension === ref.dimension,
    );
    // Pointeur orphelin (assessment supprimé/introuvable) : ignoré
    // silencieusement plutôt que de substituer une autre évaluation à la
    // place de celle explicitement désignée.
    if (!assessment) continue;

    snapshots.push({
      assessmentId: assessment.id,
      dimension: assessment.dimension,
      normalizedValue: assessment.score.normalizedValue,
      source: assessment.source,
      confidence: assessment.confidence,
      evidenceIds: assessment.evidenceIds,
      capturedAt,
    });
  }

  return snapshots;
}

// N'utilise que les besoins "en tête" (non supersédés) : la version la plus
// récente de chaque chaîne de supersession, jamais les versions historiques
// qu'elle remplace (déjà préservées telles quelles dans dossier.needs, sans
// mutation, Phase 9D). Aucune donnée legacy n'est jamais transformée en
// besoin.
export function buildNeedSnapshots(dossier: RelationDossier, capturedAt: string): NeedSnapshot[] {
  const supersededIds = new Set(
    dossier.needs.filter((need) => need.supersedesNeedId).map((need) => need.supersedesNeedId as string),
  );

  return dossier.needs
    .filter((need) => !supersededIds.has(need.id))
    .map((need) => ({
      needId: need.id,
      label: need.label,
      origin: need.origin,
      status: need.status,
      confidence: need.confidence,
      evidenceIds: need.evidenceIds,
      capturedAt,
    }));
}

// N'utilise que dossier.currentSafetyAssessmentRef (Phase 9A) : si aucune
// évaluation de sécurité n'a été désignée courante, safetySnapshot reste
// absent — jamais remplacé par "la plus récente" ou "la plus critique".
export function buildSafetySnapshot(dossier: RelationDossier): CriticalSafetyAssessment | undefined {
  if (!dossier.currentSafetyAssessmentRef) {
    return undefined;
  }
  return dossier.safetyAssessments.find((assessment) => assessment.id === dossier.currentSafetyAssessmentRef);
}

// -----------------------------------------------------------------------
// 5. Génération du rapport — point d'entrée unique, déclenchement explicite
//    uniquement.
// -----------------------------------------------------------------------

// Version de méthodologie du rapport lui-même (distincte de
// COVERAGE_CALCULATION_VERSION, qui ne couvre que le calcul de coverage) :
// SR-D-001, Décision 5 impose une traçabilité de version pour toute méthode
// de couverture/confiance/compatibilité — celle-ci trace la construction du
// rapport dans son ensemble telle qu'implémentée par cette phase.
export const RAPPORT_METHODOLOGY_VERSION = "9e-snapshot-v1";

function defaultCreateId(): string {
  return `rapport-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export interface RapportSyncOptions {
  now?: () => string;
  createId?: () => string;
}

export type GenerateRapportResult =
  | { status: "applied"; rapport: RapportAnalyse }
  // Aucune version canonique n'existe encore pour ce dossier : aucune
  // migration implicite n'est effectuée ici (même convention que les autres
  // modules de synchronisation de cette série).
  | { status: "skipped_not_canonical" };

// Seul point de création d'un RapportAnalyse dans le produit. Ne se
// déclenche jamais automatiquement : appelé exclusivement par le geste
// humain explicite du bouton "Générer un rapport d'analyse"
// (rapport-analyse-panel.tsx). triggerReason vaut donc toujours
// "manual_request" ici — les trois autres valeurs du type
// ReportTriggerReason (critical_event, scheduled_recommendation,
// initial_analysis) ne sont raccordées à aucune action réelle du produit
// aujourd'hui et ne sont donc jamais utilisées par ce module : les
// introduire sans déclencheur réel serait une invention (hors périmètre de
// cette phase, cf. consigne explicite : ni un changement de score, ni un
// changement de currentAssessmentRef, ni un changement de besoin, ni un
// signalement de sécurité critique, ni un désaccord détecté ne génère
// automatiquement un rapport).
//
// N'appelle jamais addOrUpdateRelationDossier : générer un rapport ne
// modifie jamais le dossier lui-même, uniquement le magasin canonique
// distinct des rapports (autre-rive-rapports-analyse).
export function generateCanonicalRapportAnalyse(
  dossierId: string,
  options: RapportSyncOptions = {},
): GenerateRapportResult {
  const canonicalDossier = readRelationDossierById(dossierId);
  if (!canonicalDossier) {
    return { status: "skipped_not_canonical" };
  }

  const now = options.now ?? (() => new Date().toISOString());
  const createId = options.createId ?? defaultCreateId;
  const capturedAt = now();

  // Toujours vides aujourd'hui : aucune source canonique ne produit
  // d'observation, d'hypothèse, de conclusion ou de flag structuré (cf.
  // constat en tête de fichier). Un tableau vide plutôt qu'une invention.
  const conclusions: Conclusion[] = [];

  const rapport: RapportAnalyse = {
    id: createId(),
    relationDossierId: canonicalDossier.id,
    generatedAt: capturedAt,
    triggerReason: "manual_request",

    assessmentSnapshots: buildAssessmentSnapshots(canonicalDossier, capturedAt),
    needSnapshots: buildNeedSnapshots(canonicalDossier, capturedAt),
    safetySnapshot: buildSafetySnapshot(canonicalDossier),

    observations: [],
    hypotheses: [],
    conclusions,
    flags: [],

    coverage: computeCoverageSummary(canonicalDossier),
    overallConfidence: deriveOverallConfidence(conclusions),
    overallConclusionLabel: deriveOverallConclusionLabel(conclusions),

    // Aucune règle de comparaison n'est gouvernée aujourd'hui : comparison
    // reste absent plutôt que de fabriquer une évolution artificielle
    // (SR-D-001, Décision 5).
    comparison: undefined,

    methodologyVersion: RAPPORT_METHODOLOGY_VERSION,
    aiModelVersion: undefined,
    promptVersion: undefined,
  };

  addCanonicalRapportAnalyse(rapport);

  return { status: "applied", rapport };
}
