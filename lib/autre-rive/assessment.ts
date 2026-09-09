import type {
  AssessmentDisagreement,
  AssessmentSource,
  CurrentAssessmentRef,
  RelationDossier,
  ScoreAssessment,
  ScoreScale,
  ScoreSource,
  ScoreValue,
} from "./types";

// Phase 5 d'IMP-001 (SR-D-001, Décisions 2 et 3) — moteur d'évaluations
// canoniques. Fonctions pures uniquement : aucune n'accède à localStorage, ni
// ne branche un écran. L'appelant reste responsable de la persistance via
// storage.ts (addOrUpdateRelationDossier).
//
// Portée strictement limitée à ce que SR-D-001 définit pour les sources
// "manual" et "ai" : pas de score consolidé/dérivé (Décision 3 §7-8, qui
// exige une politique de pondération non définie ici). Le signalement de
// désaccord au seuil de 20 points (Décision 3 §6) est implémenté ci-dessous,
// selon la structure minimale validée explicitement par l'utilisatrice en
// complément de Phase 5 (voir AssessmentDisagreement dans types.ts).

// -----------------------------------------------
// Construction d'une évaluation (Décision 2 §1-2, Décision 3 §2)
// -----------------------------------------------

// L'échelle d'entrée d'une évaluation nouvellement créée est toujours connue
// (1-10 ou 0-100) : "unknown" est réservé aux valeurs historiques sans
// provenance (LegacyScoreSnapshot, Décision 2 §4) et ne peut jamais être
// choisi ici — inventer une évaluation "unknown" reviendrait à fabriquer une
// provenance qui n'existe pas.
export type KnownScoreScale = Exclude<ScoreScale, "unknown">;

export interface CreateScoreAssessmentInput {
  // Identifiant fourni par l'appelant : SR-D-001 ne définit aucune politique
  // de génération d'identifiant pour ScoreAssessment, ce module n'en invente
  // donc aucune (même principe que ConfirmedLegacyIdentity.participantIds).
  id: string;
  dimension: string;

  rawValue: number;
  rawScale: KnownScoreScale;

  createdBy: string;
  // Horodatage injectable pour des tests déterministes ; par défaut l'heure
  // réelle (même convention que legacy-adapter.ts).
  createdAt?: string;

  effectiveFrom?: string;
  effectiveTo?: string;

  evidenceIds?: string[];
  rationale?: string;

  confidence?: number;
  confidenceSource?: "user_declared" | "system_estimated" | "derived";

  methodologyVersion?: string;
  supersedesAssessmentId?: string;
}

// Règle de conversion exacte de la Décision 2 §2 : 1-10 → ×10, 0-100 → valeur
// telle quelle. Aucune autre règle (arrondi, plafonnement) n'est appliquée.
function normalizeScoreValue(rawValue: number, rawScale: KnownScoreScale): number {
  return rawScale === "1-10" ? rawValue * 10 : rawValue;
}

function buildScoreAssessment(
  input: CreateScoreAssessmentInput,
  scoreSource: ScoreSource,
  assessmentSource: AssessmentSource,
): ScoreAssessment {
  const score: ScoreValue = {
    rawValue: input.rawValue,
    rawScale: input.rawScale,
    normalizedValue: normalizeScoreValue(input.rawValue, input.rawScale),
    source: scoreSource,
  };

  return {
    id: input.id,
    dimension: input.dimension,
    score,
    source: assessmentSource,
    createdAt: input.createdAt ?? new Date().toISOString(),
    createdBy: input.createdBy,
    effectiveFrom: input.effectiveFrom,
    effectiveTo: input.effectiveTo,
    evidenceIds: input.evidenceIds ?? [],
    rationale: input.rationale,
    confidence: input.confidence,
    confidenceSource: input.confidenceSource,
    methodologyVersion: input.methodologyVersion,
    supersedesAssessmentId: input.supersedesAssessmentId,
  };
}

// Évaluation manuelle : source "manual" à la fois pour le score et pour
// l'évaluation (Décision 3 §2).
export function createManualScoreAssessment(input: CreateScoreAssessmentInput): ScoreAssessment {
  return buildScoreAssessment(input, "manual", "manual");
}

// Évaluation IA : source "ai" à la fois pour le score et pour l'évaluation.
// Ne devient jamais automatiquement l'évaluation courante — voir addAssessment
// ci-dessous, qui ne touche jamais currentAssessmentRefs.
export function createAiScoreAssessment(input: CreateScoreAssessmentInput): ScoreAssessment {
  return buildScoreAssessment(input, "ai", "ai");
}

// -----------------------------------------------
// Historisation (Décision 3 §3, §11)
// -----------------------------------------------

export interface AddAssessmentOptions {
  now?: () => string;
}

// Ajoute une évaluation à l'historique du dossier. N'écrase, ne modifie ni ne
// supprime jamais une évaluation existante : une nouvelle entrée est
// toujours ajoutée (Décision 3 §3). Ne modifie jamais currentAssessmentRefs :
// une nouvelle évaluation — manuelle ou IA — ne devient jamais automatiquement
// l'évaluation courante (Décision 3 §11). Seul un appel explicite à
// setCurrentAssessmentRef() peut désigner une évaluation comme courante.
export function addAssessment(
  dossier: RelationDossier,
  assessment: ScoreAssessment,
  options: AddAssessmentOptions = {},
): RelationDossier {
  const now = options.now ?? (() => new Date().toISOString());

  if (dossier.assessments.some((existing) => existing.id === assessment.id)) {
    throw new Error(
      `Une évaluation avec l'id "${assessment.id}" existe déjà pour ce dossier : une évaluation ne peut jamais en écraser une autre, elle doit recevoir un identifiant distinct (SR-D-001, Décision 3 §3).`,
    );
  }

  return {
    ...dossier,
    assessments: [...dossier.assessments, assessment],
    updatedAt: now(),
  };
}

// -----------------------------------------------
// Pointeur explicite vers l'évaluation courante (Décision 3 §11)
// -----------------------------------------------

// Retourne l'évaluation actuellement désignée pour une dimension, ou null si
// aucun pointeur n'existe pour cette dimension, ou si le pointeur ne
// correspond plus à aucune évaluation de l'historique (situation anormale,
// traitée sans lever d'exception : l'absence de valeur courante est un état
// valide, jamais déduit implicitement de la date ou de la source la plus
// récente — Décision 3, « Formulation finale entérinée »).
export function getCurrentAssessment(dossier: RelationDossier, dimension: string): ScoreAssessment | null {
  const ref = dossier.currentAssessmentRefs.find((item) => item.dimension === dimension);
  if (!ref) return null;

  return dossier.assessments.find((assessment) => assessment.id === ref.assessmentId) ?? null;
}

export interface SetCurrentAssessmentRefOptions {
  now?: () => string;
}

// Désigne explicitement une évaluation existante comme l'évaluation courante
// d'une dimension. C'est la SEULE fonction de ce module qui modifie
// currentAssessmentRefs : aucune autre fonction (notamment addAssessment) ne
// le fait implicitement. L'évaluation désignée doit déjà exister dans
// l'historique du dossier pour cette dimension — impossible de pointer vers
// une évaluation inexistante ou vers une autre dimension.
//
// Un seul pointeur par dimension (Décision 3 §11, « Pointeur unique par
// dimension préférable à isCurrent: boolean ») : tout pointeur existant pour
// la même dimension est remplacé, jamais dupliqué.
export function setCurrentAssessmentRef(
  dossier: RelationDossier,
  dimension: string,
  assessmentId: string,
  selectedBy: string,
  options: SetCurrentAssessmentRefOptions = {},
): RelationDossier {
  const now = options.now ?? (() => new Date().toISOString());

  const targetAssessment = dossier.assessments.find(
    (assessment) => assessment.id === assessmentId && assessment.dimension === dimension,
  );
  if (!targetAssessment) {
    throw new Error(
      `Aucune évaluation avec l'id "${assessmentId}" n'existe pour la dimension "${dimension}" dans l'historique de ce dossier : impossible de la désigner comme évaluation courante sans qu'elle existe déjà (SR-D-001, Décision 3 §11).`,
    );
  }

  const nowValue = now();
  const nextRef: CurrentAssessmentRef = {
    dimension,
    assessmentId,
    selectedAt: nowValue,
    selectedBy,
  };

  return {
    ...dossier,
    currentAssessmentRefs: [
      ...dossier.currentAssessmentRefs.filter((ref) => ref.dimension !== dimension),
      nextRef,
    ],
    updatedAt: nowValue,
  };
}

// -----------------------------------------------
// Signalement de désaccord manuel / IA (Décision 3 §6)
// -----------------------------------------------

export const DEFAULT_DISAGREEMENT_THRESHOLD = 20;

export interface DetectAssessmentDisagreementInput {
  // Identifiant fourni par l'appelant, même convention que pour
  // ScoreAssessment : aucune politique de génération n'est inventée ici.
  id: string;
  relationDossierId: string;
  assessmentA: ScoreAssessment;
  assessmentB: ScoreAssessment;
  // Seuil configurable (Décision 3 §6, « (configurable) »). Par défaut 20
  // points sur 100.
  threshold?: number;
  createdAt?: string;
}

// Constate un écart entre deux évaluations d'une même dimension et, s'il
// atteint le seuil, produit un AssessmentDisagreement à l'état "open". Ne
// modifie jamais les évaluations comparées, aucun RelationDossier, ni aucun
// CurrentAssessmentRef : cette fonction ne prend en paramètre et ne retourne
// qu'un AssessmentDisagreement isolé, indépendant de tout dossier — la
// garantie de non-mutation est donc structurelle, pas seulement
// comportementale. Ne fait ni moyenne, ni arbitrage, ni score dérivé : elle
// signale uniquement qu'un examen explicite par l'utilisatrice est requis
// (Décision 3 §5-§6).
export function detectAssessmentDisagreement(
  input: DetectAssessmentDisagreementInput,
): AssessmentDisagreement | null {
  const { assessmentA, assessmentB } = input;

  // Seules deux évaluations comparables d'une même dimension peuvent
  // produire un signalement : une comparaison inter-dimensions n'a pas de
  // sens métier et ne constitue pas une anomalie — elle ne produit
  // simplement aucun signalement, plutôt qu'une erreur.
  if (assessmentA.dimension !== assessmentB.dimension) return null;

  // Comparable suppose une valeur canonique connue des deux côtés : une
  // évaluation dont la valeur normalisée est absente (rattachée à une
  // source encore "unknown", par construction jamais produite par
  // createManualScoreAssessment/createAiScoreAssessment mais possible si
  // l'appelant construit lui-même un ScoreAssessment à partir d'une source
  // externe) ne peut pas être comparée chiffré à chiffré.
  if (assessmentA.score.normalizedValue === null || assessmentB.score.normalizedValue === null) {
    return null;
  }

  const threshold = input.threshold ?? DEFAULT_DISAGREEMENT_THRESHOLD;
  const absoluteDifference = Math.abs(assessmentA.score.normalizedValue - assessmentB.score.normalizedValue);

  if (absoluteDifference < threshold) return null;

  return {
    id: input.id,
    relationDossierId: input.relationDossierId,
    dimension: assessmentA.dimension,
    assessmentIdA: assessmentA.id,
    assessmentIdB: assessmentB.id,
    absoluteDifference,
    threshold,
    status: "open",
    createdAt: input.createdAt ?? new Date().toISOString(),
  };
}

// -----------------------------------------------
// Validation des données historiques (Décision 2 §6)
// -----------------------------------------------
//
// SR-D-001, Décision 2 §6 (« Processus de validation des données
// historiques ») : « Voir la valeur originale ; voir l'échelle supposée ;
// confirmer ou corriger l'échelle ; identifier la source si connue ;
// produire la valeur normalisée ; conserver une trace de cette validation.
// Aucune valeur source: "unknown" ne contribue automatiquement à un score
// consolidé. »
//
// Les deux fonctions ci-dessous implémentent ce processus pour un
// LegacyScoreSnapshot déjà attaché à un dossier canonique (produit,
// lecture seule, par legacy-adapter.ts, Décision 4 §3) : confirmer (avec
// ou sans correction de l'échelle supposée) produit une évaluation
// canonique ; exclure ne produit jamais d'évaluation. Aucune des deux ne
// modifie ou ne supprime le LegacyScoreSnapshot original au-delà de son
// champ migrationStatus — la valeur brute (rawValue) reste intacte et
// consultable indéfiniment (même principe de non-destruction que
// addAssessment et addNeed).

// Suggestion PUREMENT INFORMATIVE de l'échelle probable (Décision 2 §5 :
// « valeur <= 10 → 1-10, valeur > 10 → 0-100 »), explicitement autorisée
// par SR-D-001 « pour proposer une interprétation probable » mais jamais
// pour « modifier définitivement la donnée sans validation humaine
// explicite ». Cette fonction ne modifie jamais un ScoreValue ou un
// LegacyScoreSnapshot ; son seul usage légitime est l'affichage d'une
// suggestion que l'utilisatrice doit confirmer ou corriger elle-même via
// confirmLegacyScoreSnapshot ci-dessous — jamais appliquée automatiquement.
export function suggestLikelyScale(rawValue: number): KnownScoreScale {
  return rawValue <= 10 ? "1-10" : "0-100";
}

// Évaluation issue d'une valeur historique validée par l'utilisatrice :
// source "imported" pour le score (valeur qui provient d'une donnée
// existante, pas d'une nouvelle saisie manuelle ni d'une analyse IA) et
// "user_confirmed" pour l'évaluation elle-même (la validation humaine
// explicite EST l'acte qui produit cette évaluation — Décision 2 §6).
// Ces deux valeurs d'énumération existent déjà dans types.ts
// (ScoreSource, AssessmentSource) depuis leur définition d'origine, sans
// qu'aucune fonction ne les utilise avant celle-ci : ce n'est donc pas une
// nouvelle décision de gouvernance, seulement l'implémentation d'un chemin
// déjà prévu.
export function createImportedScoreAssessment(input: CreateScoreAssessmentInput): ScoreAssessment {
  return buildScoreAssessment(input, "imported", "user_confirmed");
}

// Confirme (ou corrige) l'échelle d'un LegacyScoreSnapshot déjà attaché au
// dossier et produit l'évaluation canonique correspondante en un seul
// mouvement cohérent : migrationStatus passe à "confirmed" ET l'évaluation
// est ajoutée à l'historique (jamais l'un sans l'autre, pour qu'un
// snapshot marqué "confirmed" ait toujours une évaluation correspondante
// traçable — Décision 2 §6, « conserver une trace de cette validation »).
// L'appelant construit l'évaluation lui-même (via createImportedScoreAssessment)
// : cette fonction ne décide d'aucune dimension ni d'aucune échelle, elle
// se contente d'appliquer atomiquement les deux effets déjà décidés par
// l'appelant, même répartition des responsabilités qu'ailleurs dans ce
// fichier (buildScoreAssessment ne décide pas non plus de la source, reçue
// en paramètre).
export function confirmLegacyScoreSnapshot(
  dossier: RelationDossier,
  snapshotId: string,
  assessment: ScoreAssessment,
  options: AddAssessmentOptions = {},
): RelationDossier {
  const now = options.now ?? (() => new Date().toISOString());
  const snapshots = dossier.legacyScoreSnapshots ?? [];

  if (!snapshots.some((snapshot) => snapshot.id === snapshotId)) {
    throw new Error(
      `Aucun LegacyScoreSnapshot avec l'id "${snapshotId}" n'existe pour ce dossier : impossible de le confirmer sans qu'il existe déjà (SR-D-001, Décision 2 §6).`,
    );
  }

  const dossierWithAssessment = addAssessment(dossier, assessment, { now });

  return {
    ...dossierWithAssessment,
    legacyScoreSnapshots: snapshots.map((snapshot) =>
      snapshot.id === snapshotId ? { ...snapshot, migrationStatus: "confirmed" } : snapshot,
    ),
  };
}

// Exclut définitivement un LegacyScoreSnapshot de toute promotion future,
// sans jamais produire d'évaluation : c'est l'issue légitime lorsque
// l'échelle réelle ne peut pas être déterminée (Décision 2 §5 :
// l'incertitude ne doit jamais être résolue par une déduction silencieuse)
// ou lorsque la dimension n'a aucune correspondance canonique
// (energieEmotionnelle — voir manual-score-sync.ts, Phase 8bis.5). La
// valeur brute reste conservée dans le snapshot, jamais supprimée : seul
// migrationStatus change, de "pending_review" à "excluded".
export function excludeLegacyScoreSnapshot(
  dossier: RelationDossier,
  snapshotId: string,
  options: AddAssessmentOptions = {},
): RelationDossier {
  const now = options.now ?? (() => new Date().toISOString());
  const snapshots = dossier.legacyScoreSnapshots ?? [];

  if (!snapshots.some((snapshot) => snapshot.id === snapshotId)) {
    throw new Error(
      `Aucun LegacyScoreSnapshot avec l'id "${snapshotId}" n'existe pour ce dossier : impossible de l'exclure sans qu'il existe déjà (SR-D-001, Décision 2 §6).`,
    );
  }

  return {
    ...dossier,
    legacyScoreSnapshots: snapshots.map((snapshot) =>
      snapshot.id === snapshotId ? { ...snapshot, migrationStatus: "excluded" } : snapshot,
    ),
    updatedAt: now(),
  };
}
