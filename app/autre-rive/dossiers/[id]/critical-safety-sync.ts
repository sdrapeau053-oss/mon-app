import {
  addOrUpdateRelationDossier,
  readRelationDossierById,
  setCurrentSafetyAssessmentRef,
  triggerCriticalSafetyReanalysis,
  type CriticalSafetyAssessment,
  type RelationDossier,
  type ReportTriggerReason,
} from "@/lib/autre-rive";

// Phase 9A — Intégration produit de la sécurité critique (SR-D-001,
// Décision 4 « Exception de sécurité »).
//
// Raccorde l'écran de fiche dossier au moteur canonique déjà existant et
// déjà considéré correct (lib/autre-rive/critical-safety.ts) : ce fichier
// n'implémente AUCUNE règle métier de sécurité, il se contente de lire le
// dossier canonique, d'appeler triggerCriticalSafetyReanalysis /
// setCurrentSafetyAssessmentRef, puis de persister le résultat — même
// répartition des responsabilités que manual-score-sync.ts (Phase 8bis.5)
// et ai-score-sync.ts (Phase 8bis.3).
//
// Point capital du moteur existant, vérifié avant d'écrire ce fichier :
// triggerCriticalSafetyReanalysis n'historise l'assessment dans
// safetyAssessments QUE si assessment.level === "critical". Pour tout autre
// niveau, elle ne fait rien (dossier inchangé, reanalysisRequired: false).
// C'est pourquoi ce module ne propose qu'un seul chemin de création,
// toujours de niveau "critical" — jamais un score, un mot-clé ou une sortie
// IA ne peut le déclencher : level: "critical" n'est jamais qu'une
// conséquence directe de l'appel explicite à reportCriticalSafetyEvent par
// l'écran, lui-même déclenché uniquement par un geste humain dédié
// (bouton « Signaler un événement de sécurité critique », voir
// critical-safety-panel.tsx).
//
// Correction de gouvernance validée avant implémentation : participantIds
// n'est JAMAIS déduit automatiquement de dossier.participantIds. L'écran
// doit recueillir une sélection explicite, non présélectionnée, parmi les
// participants déjà confirmés du dossier canonique ; ce module valide que
// chaque participant fourni appartient bien à ce dossier, sans jamais en
// inventer ni en compléter la liste.

export interface ReportCriticalSafetyEventOptions {
  now?: () => string;
  createId?: () => string;
  createdBy?: string;
}

function defaultCreateId(): string {
  return "safety-critical-" + Date.now() + "-" + Math.random().toString(36).slice(2, 9);
}

export type ReportCriticalSafetyEventResult =
  | {
      status: "applied";
      dossier: RelationDossier;
      assessmentId: string;
      reanalysisRequired: boolean;
      reanalysisTriggerReason?: ReportTriggerReason;
    }
  // Aucune version canonique n'existe encore pour ce dossier : aucune
  // migration implicite n'est effectuée ici (SR-D-001, Décision 4 §3).
  | { status: "skipped_not_canonical" };

// Signale un événement de sécurité critique déjà qualifié comme tel par un
// geste humain explicite (jamais par ce module). participantIds doit être
// la sélection EXACTE faite par l'utilisatrice à l'écran — jamais
// dossier.participantIds au complet, pour ne jamais attribuer
// implicitement l'événement à des personnes qu'elle n'a pas désignées.
export function reportCriticalSafetyEvent(
  dossierId: string,
  participantIds: string[],
  rationale: string,
  options: ReportCriticalSafetyEventOptions = {},
): ReportCriticalSafetyEventResult {
  const canonicalDossier = readRelationDossierById(dossierId);
  if (!canonicalDossier) {
    return { status: "skipped_not_canonical" };
  }

  if (participantIds.length === 0) {
    throw new Error(
      "Au moins un participant concerné doit être sélectionné explicitement pour signaler un événement de sécurité critique.",
    );
  }

  const unknownParticipant = participantIds.find((id) => !canonicalDossier.participantIds.includes(id));
  if (unknownParticipant) {
    throw new Error(`Le participant "${unknownParticipant}" n'appartient pas à ce dossier.`);
  }

  if (!rationale.trim()) {
    throw new Error("Une justification est obligatoire pour signaler un événement de sécurité critique.");
  }

  const now = options.now ?? (() => new Date().toISOString());
  const createId = options.createId ?? defaultCreateId;
  const createdBy = options.createdBy ?? "utilisatrice";

  const assessment: CriticalSafetyAssessment = {
    id: createId(),
    relationDossierId: canonicalDossier.id,
    level: "critical",
    participantIds,
    // Aucun sélecteur de preuves n'existe encore dans le produit : en
    // construire un serait un nouveau sous-système, hors périmètre de
    // cette phase (accepté explicitement comme tel avant implémentation).
    evidenceIds: [],
    rationale,
    createdAt: now(),
    createdBy,
  };

  // triggerCriticalSafetyReanalysis refuse tout id déjà présent et ne
  // touche jamais currentSafetyAssessmentRef : garanties structurelles du
  // moteur existant, non répétées ici.
  const result = triggerCriticalSafetyReanalysis(canonicalDossier, assessment, { now });
  addOrUpdateRelationDossier(result.dossier);

  return {
    status: "applied",
    dossier: result.dossier,
    assessmentId: assessment.id,
    reanalysisRequired: result.reanalysisRequired,
    reanalysisTriggerReason: result.reanalysisTriggerReason,
  };
}

export type SelectCurrentSafetyAssessmentResult =
  | { status: "applied"; dossier: RelationDossier }
  | { status: "skipped_not_canonical" };

// Désigne explicitement une évaluation de sécurité déjà historisée comme
// l'évaluation courante du dossier. Action strictement distincte de
// reportCriticalSafetyEvent : créer un signalement ne rend jamais une
// évaluation courante automatiquement (SR-D-001, même principe que
// currentAssessmentRefs pour les scores). setCurrentSafetyAssessmentRef
// lève une exception si l'id n'existe pas dans l'historique de ce dossier
// précis : cette fonction ne l'intercepte pas, laissant l'appelant (l'écran)
// la traiter, même convention que dossier-migration-panel.tsx pour
// finalizeLegacyMigration.
export function selectCurrentSafetyAssessment(
  dossierId: string,
  assessmentId: string,
  options: { now?: () => string } = {},
): SelectCurrentSafetyAssessmentResult {
  const canonicalDossier = readRelationDossierById(dossierId);
  if (!canonicalDossier) {
    return { status: "skipped_not_canonical" };
  }

  const now = options.now ?? (() => new Date().toISOString());
  const updatedDossier = setCurrentSafetyAssessmentRef(canonicalDossier, assessmentId, { now });
  addOrUpdateRelationDossier(updatedDossier);

  return { status: "applied", dossier: updatedDossier };
}
