// -----------------------------------------------
// ENUMS ET UNIONS
// -----------------------------------------------

export type SourceImport = "txt" | "json" | "copier-coller";

export type AuteurMessage = "moi" | "autre" | "inconnu";

export type NiveauConfiance = "élevé" | "moyen" | "faible";

export type StatutValidation = "rouge" | "orange" | "jaune" | "validé";

export type StatutConversation =
  | "importé"
  | "en_validation"
  | "validé"
  | "analysé";

export type NiveauAnalyse =
  | "données_insuffisantes"
  | "exploratoire"
  | "partielle"
  | "complète";

// -----------------------------------------------
// MESSAGE
// -----------------------------------------------

export type Message = {
  id: string;
  conversationId: string;
  dossierId: string;
  auteur: AuteurMessage;
  nomAuteur: string;
  texte: string;
  textOriginal: string;
  date: string;
  dateOriginale: string;
  source: SourceImport;
  niveauConfiance: NiveauConfiance;
  valide: boolean;
  corrigéManuellement: boolean;
  statutValidation: StatutValidation;
  dateImport: string;
  hash: string;
  // Phase 2 OCR — optionnels
  ocrScore?: number;
  sourceImageId?: string;
  captureSource?: string;
  facteursConfiance?: string[];
};

// -----------------------------------------------
// CONVERSATION IMPORTÉE
// -----------------------------------------------

export type ConversationImportée = {
  id: string;
  dossierId: string;
  source: SourceImport;
  nomFichier: string;
  messages: Message[];
  nombreMessages: number;
  nombreMessagesValidés: number;
  nombreMessagesRouge: number;
  nombreMessagesOrange: number;
  nombreMessagesJaune: number;
  statut: StatutConversation;
  prêtPourAnalyse: boolean;
  niveauAnalyse: NiveauAnalyse;
  hash: string;
  version: string;
  dateImport: string;
  dateModification: string;
  langue: string;
};

// -----------------------------------------------
// IMPORT VALIDATION
// -----------------------------------------------

export type ImportValidation = {
  id: string;
  conversationId: string;
  dateValidation: string;
  totalMessages: number;
  messagesValidés: number;
  messagesRestantsRouge: number;
  progression: number;
  corrections: CorrectionManuelle[];
  complète: boolean;
  sauvegardéeÀ: string;
};

export type CorrectionManuelle = {
  messageId: string;
  champCorrigé: string;
  ancienneValeur: string;
  nouvelleValeur: string;
  dateCorrection: string;
};

// -----------------------------------------------
// RAPPORT ANALYSE — TYPE LEGACY
// -----------------------------------------------
//
// Phase 6 d'IMP-001 (SR-D-001, Décision 5) : ce type est celui utilisé
// jusqu'ici par le dépôt (lié à conversationId/dossierId, indicateurs/radar
// en tableaux plats). Il est renommé explicitement — jamais supprimé, jamais
// converti automatiquement — pour laisser place au type canonique
// `RapportAnalyse` défini plus bas (Décision 5). Les rapports déjà générés
// sous cette forme restent lisibles via les fonctions "Legacy" de storage.ts.

export type LegacyRapportAnalyse = {
  id: string;
  conversationId: string;
  dossierId: string;
  dateAnalyse: string;
  niveauAnalyse: NiveauAnalyse;
  indicateurs: IndicateurRelationnel[];
  certitudeGlobale: NiveauConfiance;
  radar: RadarRelationnel;
  redFlags: string[];
  greenFlags: string[];
  chronologie: ÉvénementChronologie[];
  résumé: string;
  limitations: string[];
};

export type IndicateurRelationnel = {
  nom: string;
  valeur: number;
  description: string;
};

export type RadarRelationnel = {
  axes: RadarAxe[];
};

export type RadarAxe = {
  nom: string;
  score: number;
};

export type ÉvénementChronologie = {
  date: string;
  description: string;
  messageId?: string;
};

// -----------------------------------------------
// CLÉS LOCALSTORAGE AUTORISÉES PHASE 1
// -----------------------------------------------

// Clé existante — NE JAMAIS MODIFIER
// 'autre-rive-dossiers'

// Nouvelles clés autorisées Phase 1 :
// 'autre-rive-imports'
// 'autre-rive-conversations'
// 'autre-rive-messages'
// 'autre-rive-validations'
// 'autre-rive-rapports'

// -----------------------------------------------
// TYPES CANONIQUES — SR-D-001, DÉCISION 4
// Phase 2 d'IMP-001 : types ajoutés uniquement, non branchés sur un écran,
// aucune donnée existante ni aucun localStorage modifié, aucune migration.
// -----------------------------------------------
//
// RelationType, RelationStatus et CriticalSafetyAssessment sont nommés par
// SR-D-001 (notamment dans le "Type canonique recommandé" de la Décision 4)
// sans que leur structure exacte y soit donnée. Plutôt que d'être inventées,
// ces structures ont fait l'objet d'une clarification de gouvernance minimale
// (validée séparément, en complément de SR-D-001, avant reprise de la Phase 2)
// qui les fixe explicitement, sans ajouter de fonctionnalité : pas de
// diagnostic, pas de détection automatique de risque, pas de taxonomie de
// violence, pas de scoring. Cette clarification est la source des unions et
// de l'interface CriticalSafetyAssessment ci-dessous.

// ---- Besoins évolutifs et historisés (Décision 4, section 1) ----

export type NeedOrigin = "expressed" | "observed" | "user_confirmed";

export type NeedStatus = "active" | "evolving" | "inactive" | "contradicted";

export interface NeedStatement {
  id: string;
  label: string;
  description?: string;

  origin: NeedOrigin;
  status: NeedStatus;

  confidence?: number;
  evidenceIds: string[];

  validFrom: string;
  validTo?: string;

  createdAt: string;
  updatedAt: string;

  // supersedesNeedId — clarification de gouvernance minimale validée par
  // l'utilisatrice pour la Phase 8bis.2, par stricte analogie avec
  // ScoreAssessment.supersedesAssessmentId, que SR-D-001 définit déjà
  // explicitement (Décision 3 §2) pour le même besoin de traçabilité entre
  // une nouvelle entrée et celle qu'elle confirme, corrige ou rejette.
  // SR-D-001 (Décision 6, item Besoins) nomme "NeedValidation" comme
  // mécanisme de confirmation/correction/rejet sans en donner la structure
  // exacte ; ce champ est le seul ajout nécessaire pour l'implémenter sans
  // inventer de nouvelle entité séparée : confirmer, corriger ou rejeter un
  // besoin crée toujours un nouveau NeedStatement (jamais une modification
  // en place, SR-D-001 Décision 4 §1 : "elle n'écrase jamais la version
  // antérieure"), relié explicitement au besoin qu'il supersède.
  supersedesNeedId?: string;
}

// ---- Échelle canonique et représentation des scores (Décision 2, section 1) ----

export type ScoreSource = "manual" | "ai" | "hybrid" | "imported" | "unknown";

export type ScoreScale = "1-10" | "0-100" | "unknown";

export interface ScoreValue {
  rawValue: number | null;
  rawScale: ScoreScale;
  normalizedValue: number | null; // Valeur canonique 0-100
  source: ScoreSource;
}

// ---- Réconciliation score manuel / score IA (Décision 3, sections 2 et 11) ----

export type AssessmentSource = "manual" | "ai" | "user_confirmed" | "derived";

export interface ScoreAssessment {
  id: string;
  dimension: string;

  score: ScoreValue;

  source: AssessmentSource;
  createdAt: string;
  createdBy: string;

  effectiveFrom?: string;
  effectiveTo?: string;

  evidenceIds: string[];
  rationale?: string;

  confidence?: number;
  confidenceSource?: "user_declared" | "system_estimated" | "derived";

  methodologyVersion?: string;
  supersedesAssessmentId?: string;
}

export interface CurrentAssessmentRef {
  dimension: string;
  assessmentId: string;
  selectedAt: string;
  selectedBy: string;
}

// ---- Signalement de désaccord manuel / IA (Décision 3 §6) ----
//
// Complément de Phase 5 (IMP-001) : SR-D-001 définit la règle en prose
// (« Écart absolu ≥ 20 points sur 100 (configurable). Déclenche une demande
// d'examen, jamais une modification automatique. ») sans fournir de structure
// TypeScript, contrairement à ScoreValue/ScoreAssessment/CurrentAssessmentRef.
// La structure ci-dessous a été explicitement validée par l'utilisatrice
// avant implémentation, strictement limitée à ce besoin : constater et
// tracer un écart à examiner, jamais le résoudre (pas de moyenne, pas
// d'arbitrage, pas de score dérivé automatique — Décision 3 §5-§8).

export type AssessmentDisagreementStatus = "open" | "reviewed" | "dismissed";

export interface AssessmentDisagreement {
  id: string;
  relationDossierId: string;
  dimension: string;
  assessmentIdA: string;
  assessmentIdB: string;
  absoluteDifference: number;
  threshold: number;
  status: AssessmentDisagreementStatus;
  createdAt: string;
  reviewedAt?: string;
  reviewedBy?: string;
}

// ---- Migration explicite et non destructive des scores hérités (Décision 4, section 3) ----

export interface LegacyScoreSnapshot {
  id: string;
  metricKey: string;
  rawValue: number;
  rawScale?: string;
  originalField: string;
  importedAt: string;
  provenance: "legacy_unknown";
  migrationStatus: "pending_review" | "confirmed" | "excluded";
}

// ---- Identité et sécurité — clarification de gouvernance minimale (complément à SR-D-001, Décision 4) ----
//
// STRATE reste volontairement générique (pas seulement les relations
// amoureuses) sans implémenter les fonctionnalités du Backlog Vision. Pour la
// sécurité, seul ce que STRATE doit déjà savoir est modélisé : le niveau de
// risque évalué, sur quelles preuves, quand, avec quelle confiance et
// pourquoi — pas de diagnostic, pas de catégorisation détaillée de violence,
// pas de calcul automatique de danger, pas de scoring sophistiqué.

export type RelationType = "romantic" | "family" | "friendship" | "professional" | "other";

export type RelationStatus = "active" | "paused" | "ended";

export type SafetyLevel = "none_identified" | "concern" | "high_risk" | "critical";

export interface CriticalSafetyAssessment {
  id: string;
  relationDossierId: string;

  level: SafetyLevel;

  participantIds: string[];
  evidenceIds: string[];

  rationale: string;
  confidence?: number;

  createdAt: string;
  createdBy: string;

  methodologyVersion?: string;
}

// ---- RelationDossier — type canonique (Décision 4, « Type canonique recommandé ») ----
//
// Emplacement canonique unique conforme à SR-D-001 : ce type vit dans
// lib/autre-rive/types.ts et n'est exposé qu'via lib/autre-rive/index.ts.
// Non branché sur un écran à ce stade (Phase 2 d'IMP-001) : les quatre
// définitions locales existantes (app/autre-rive/**) ne sont ni modifiées ni
// supprimées ici — cela relève de la Phase 4.

export interface RelationDossier {
  // Identité
  id: string;
  name: string;
  relationType: RelationType;
  status: RelationStatus;

  // Personnes
  participantIds: string[];
  primaryUserParticipantId: string;

  // Besoins évolutifs et historisés
  needs: NeedStatement[];

  // Évaluations canoniques
  assessments: ScoreAssessment[];
  currentAssessmentRefs: CurrentAssessmentRef[];

  // Sécurité avec historique
  safetyAssessments: CriticalSafetyAssessment[];
  currentSafetyAssessmentRef?: string;

  // Contestations
  contestationIds: string[];

  // Contenu source
  conversationIds: string[];
  eventIds: string[];
  evidenceIds: string[];
  journalEntryIds: string[];

  // Documentation libre
  notes: string;
  tags: string[];

  // Migration
  legacyScoreSnapshots?: LegacyScoreSnapshot[];

  // Gouvernance des données
  schemaVersion: number;
  createdAt: string;
  updatedAt: string;
}

// Invariant métier que le système de types de TypeScript ne peut pas exprimer
// structurellement (SR-D-001, Décision 4) : primaryUserParticipantId doit
// être un des participantIds. Fonction minimale, volontairement limitée à
// cette seule vérification — ce n'est pas un validateur complet du dossier
// (branchement, lecture/écriture réelles : Phase 4).
export function isPrimaryParticipantValid(
  dossier: Pick<RelationDossier, "participantIds" | "primaryUserParticipantId">,
): boolean {
  return dossier.participantIds.includes(dossier.primaryUserParticipantId);
}

// -----------------------------------------------
// RapportAnalyse — TYPE CANONIQUE (Décision 5, « Rôle de RapportAnalyse »)
// -----------------------------------------------
//
// Phase 6 d'IMP-001. Transcription littérale de la structure de SR-D-001 —
// aucun champ ajouté, renommé ou omis par rapport au texte de la Décision 5.
// « Instantané analytique immuable » : chaque champ est `readonly` et chaque
// collection `ReadonlyArray`, conformément à la Décision 5 elle-même
// (« Instantané immuable, garanti par type Readonly, stockage append-only,
// et tests — pas par un simple champ déclaratif »). L'immuabilité de type ne
// protège que la référence exposée par ce module ; l'append-only réel (aucun
// remplacement d'un rapport existant) est garanti par le stockage, voir
// rapport-analyse.ts.

// ---- Snapshots des objets vivants au moment de la génération ----

export interface AssessmentSnapshot {
  readonly assessmentId: string;
  readonly dimension: string;
  readonly normalizedValue: number | null;
  readonly source: AssessmentSource;
  readonly confidence?: number;
  readonly evidenceIds: ReadonlyArray<string>;
  readonly capturedAt: string;
}

export interface NeedSnapshot {
  readonly needId: string;
  readonly label: string;
  readonly origin: NeedOrigin;
  readonly status: NeedStatus;
  readonly confidence?: number;
  readonly evidenceIds: ReadonlyArray<string>;
  readonly capturedAt: string;
}

// ---- Structure canonique complète ----

export type ReportTriggerReason =
  | "manual_request"
  | "critical_event"
  | "scheduled_recommendation"
  | "initial_analysis";

export type OverallConclusionLabel =
  | "donnees_insuffisantes"
  | "probablement_saine"
  | "preoccupante"
  | "malsaine"
  | "risque_critique";

export type CompatibilityLevel = "faible" | "moderee" | "elevee";

// Référence à une preuve : la preuve complète n'est jamais dupliquée dans le
// rapport (Décision 5, « Preuves complètes non dupliquées par défaut ») —
// seuls une référence, un résumé/extrait et un hash éventuel sont conservés.
export interface EvidenceReference {
  readonly evidenceId: string;
  readonly sourceType: "message" | "event" | "manual_entry" | "document";
  readonly excerptOrSummary: string;
  readonly occurredAt?: string;
  readonly sourceHash?: string;
  readonly capturedAt: string;
}

export interface Observation {
  readonly id: string;
  readonly label: string;
  readonly participantId: string;
  readonly evidenceIds: ReadonlyArray<string>;
  readonly isFactual: true;
}

export interface CompetingHypothesis {
  readonly id: string;
  readonly label: string;
  // analyticTermUsed, jamais clinicalTermUsed (Décision 5) : les concepts
  // comme le love bombing ou le gaslighting ne sont jamais présentés comme
  // des diagnostics cliniques.
  readonly analyticTermUsed?: string;
  readonly supportingObservationIds: ReadonlyArray<string>;
  readonly contradictingObservationIds: ReadonlyArray<string>;
  readonly compatibilityLevel: CompatibilityLevel;
  // Facultatif tant qu'aucune méthode versionnée et testée ne le calcule
  // (Décision 5) — seul compatibilityLevel qualitatif est obligatoire.
  readonly compatibilityScore?: number;
  readonly methodologyVersion?: string;
  readonly methodologyNote: string;
}

export interface Conclusion {
  readonly id: string;
  readonly dimension: string;
  readonly label: OverallConclusionLabel;
  readonly narrativeSummary: string;
  readonly retainedHypothesisId?: string;
  readonly confidence: number;
  readonly confidenceExplanation: string;
  readonly supportingEvidenceIds: ReadonlyArray<string>;
  readonly contradictingEvidenceIds: ReadonlyArray<string>;
  readonly limitations: ReadonlyArray<string>;
}

export interface FlagEntry {
  readonly id: string;
  readonly participantId: string;
  readonly type: "red" | "green";
  readonly label: string;
  readonly analyticTermUsed?: string;
  readonly severity?: 1 | 2 | 3 | 4 | 5;
  readonly supportingEvidenceIds: ReadonlyArray<string>;
  readonly confidence: number;
}

export interface CoverageSummary {
  readonly overallCoverage: number;
  readonly coverageLevel: "insuffisante" | "faible" | "partielle" | "bonne" | "tres_bonne";
  readonly documentedPeriodStart?: string;
  readonly documentedPeriodEnd?: string;
  readonly missingDataNotes: ReadonlyArray<string>;
  // Toute méthode de couverture/confiance/compatibilité conserve une version
  // (Décision 5) — jamais une valeur calculée sans traçabilité de méthode.
  readonly calculationVersion: string;
}

export interface ReportComparison {
  readonly previousReportId?: string;
  readonly whatChanged: ReadonlyArray<string>;
  readonly whyItChanged: string;
}

// Métadonnées administratives, séparées du contenu analytique (Décision 5) :
// ce type n'apparaît jamais imbriqué à l'intérieur de RapportAnalyse
// lui-même, il l'accompagne comme un enregistrement distinct.
export interface RapportAnalyseMetadata {
  readonly reportId: string;
  readonly archivedAt?: string;
  readonly supersededByReportId?: string;
  readonly relatedContestationIds: ReadonlyArray<string>;
}

export interface RapportAnalyse {
  // Identité
  readonly id: string;
  readonly relationDossierId: string;
  readonly generatedAt: string;
  readonly triggerReason: ReportTriggerReason;

  // Snapshots des données vivantes au moment de la génération
  readonly assessmentSnapshots: ReadonlyArray<AssessmentSnapshot>;
  readonly needSnapshots: ReadonlyArray<NeedSnapshot>;
  readonly safetySnapshot?: CriticalSafetyAssessment;

  // Raisonnement — les trois couches
  readonly observations: ReadonlyArray<Observation>;
  readonly hypotheses: ReadonlyArray<CompetingHypothesis>;
  readonly conclusions: ReadonlyArray<Conclusion>;

  // Flags équilibrés
  readonly flags: ReadonlyArray<FlagEntry>;

  // Couverture et confiance globales
  readonly coverage: CoverageSummary;
  readonly overallConfidence: number;
  readonly overallConclusionLabel: OverallConclusionLabel;

  // Comparaison avec le rapport précédent
  readonly comparison?: ReportComparison;

  // Traçabilité méthodologique
  readonly methodologyVersion: string;
  readonly aiModelVersion?: string;
  readonly promptVersion?: string;
}

// ---- Disponibilité des preuves (hors du rapport, calculée dynamiquement) ----
//
// Décision 5 : la disponibilité actuelle d'une preuve (supprimée,
// inaccessible, altérée) est une donnée vivante, jamais figée dans le
// rapport immuable — elle est calculée séparément, à la demande.
export interface EvidenceAvailability {
  readonly evidenceId: string;
  readonly status: "available" | "deleted" | "inaccessible" | "integrity_mismatch";
  readonly checkedAt: string;
}
