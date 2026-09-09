import type { CriticalSafetyAssessment, RelationDossier, ReportTriggerReason } from "./types";

// Phase 7 d'IMP-001 (SR-D-001, Décision 4 « Exception de sécurité » + Décision
// 6, item Sécurité) — mécanisme minimal déclenché par un élément DÉJÀ
// explicitement qualifié critique.
//
// Inspection préalable à l'écriture de ce fichier (dépôt réel) : aucune
// structure d'« événement », de journal ou de preuve ne porte de marqueur
// critique dans le dépôt (EntreeJournal n'a ni champ de gravité ni de
// statut ; RelationDossier.eventIds ne référence aucun type Event défini —
// constat déjà documenté par IMP-001 Phase 7). CriticalSafetyAssessment
// (Phase 2, clarification de gouvernance sur la Décision 4) EST l'objet qui
// peut porter ce statut explicitement, via son champ `level: SafetyLevel`,
// qui inclut déjà la valeur "critical". Aucune nouvelle abstraction n'est
// donc créée ici : ce module reçoit un CriticalSafetyAssessment déjà
// entièrement construit par l'appelant (l'écran, jamais ce module) — c'est
// l'appelant qui décide qu'un élément est critique, jamais ce code
// (SR-D-001, Décision 6 : « absence de fausse équivalence entre comportement
// mineur et critique » ; consigne explicite de cette phase : « ne décide pas
// toi-même qu'un événement est critique »).

export interface TriggerCriticalSafetyReanalysisOptions {
  now?: () => string;
}

export interface CriticalSafetyReanalysisResult {
  // Dossier avec l'évaluation de sécurité ajoutée à l'historique — identique
  // à l'original si l'assessment fourni n'est pas de niveau "critical" (voir
  // ci-dessous).
  dossier: RelationDossier;
  // true uniquement si l'assessment fourni est de niveau "critical" : une
  // réanalyse est alors requise. Ce module ne la réalise jamais lui-même
  // (aucune logique de raisonnement, aucun SR-ENGINE-001) : il ne fait que
  // signaler qu'elle est requise, avec la raison de déclenchement déjà
  // définie par la Décision 5 (ReportTriggerReason = "critical_event") pour
  // qu'un futur RapportAnalyse puisse la porter le moment venu.
  reanalysisRequired: boolean;
  reanalysisTriggerReason?: ReportTriggerReason;
}

// Historise une évaluation de sécurité et signale, si et seulement si elle
// est de niveau "critical", qu'une réanalyse est requise. Ne modifie jamais
// currentSafetyAssessmentRef (SR-D-001, Décision 4 : « Sécurité en
// historique, pas en champ mutable unique » ; consigne de cette phase :
// aucun changement automatique sauf règle de confirmation déjà autorisée,
// qui n'est pas définie pour ce pointeur dans cette phase — donc aucun
// changement). Ne touche à aucun RapportAnalyse, courant ou non : ce module
// n'importe ni storage.ts (rapports) ni rapport-analyse.ts, la garantie est
// donc structurelle.
export function triggerCriticalSafetyReanalysis(
  dossier: RelationDossier,
  assessment: CriticalSafetyAssessment,
  options: TriggerCriticalSafetyReanalysisOptions = {},
): CriticalSafetyReanalysisResult {
  if (assessment.relationDossierId !== dossier.id) {
    throw new Error(
      `L'évaluation de sécurité fournie (relationDossierId "${assessment.relationDossierId}") ne correspond pas au dossier fourni (id "${dossier.id}").`,
    );
  }

  if (assessment.level !== "critical") {
    // Aucune fausse équivalence entre un événement mineur et un événement
    // critique : un niveau non critique ne déclenche strictement rien ici,
    // ni historisation via ce mécanisme, ni réanalyse.
    return { dossier, reanalysisRequired: false };
  }

  if (dossier.safetyAssessments.some((existing) => existing.id === assessment.id)) {
    throw new Error(
      `Une évaluation de sécurité avec l'id "${assessment.id}" existe déjà pour ce dossier : elle ne peut jamais être écrasée, seulement ajoutée à l'historique (SR-D-001, Décision 4).`,
    );
  }

  const now = options.now ?? (() => new Date().toISOString());

  const updatedDossier: RelationDossier = {
    ...dossier,
    safetyAssessments: [...dossier.safetyAssessments, assessment],
    updatedAt: now(),
    // currentSafetyAssessmentRef délibérément absent de ce spread partiel :
    // sa valeur d'origine est préservée telle quelle, sans y toucher.
  };

  return {
    dossier: updatedDossier,
    reanalysisRequired: true,
    reanalysisTriggerReason: "critical_event",
  };
}

export interface SetCurrentSafetyAssessmentRefOptions {
  now?: () => string;
}

// Désigne explicitement une évaluation de sécurité déjà existante de
// l'historique comme l'évaluation de sécurité courante du dossier.
//
// SR-D-001, Décision 4 (« Sécurité en historique, pas en champ mutable
// unique ») définit currentSafetyAssessmentRef comme un pointeur simple
// (string), pas comme une structure de désignation dédiée telle que
// CurrentAssessmentRef pour les scores (Décision 3 §11) : la sécurité n'est
// pas multi-dimensionnelle, un seul pointeur suffit par dossier. Cette
// fonction applique donc le même principe de désignation explicite que
// setCurrentAssessmentRef (assessment.ts), sans introduire de structure ou
// de champ que SR-D-001 ne définit pas (pas de selectedAt/selectedBy propres
// à la sécurité : ces champs n'existent pas dans le type canonique).
//
// C'est la SEULE fonction de ce module qui modifie
// currentSafetyAssessmentRef : triggerCriticalSafetyReanalysis ne le touche
// jamais, y compris pour un événement critique (voir ci-dessus) — aucun
// changement automatique de ce pointeur n'existe ailleurs dans le module.
// L'évaluation désignée doit déjà exister dans safetyAssessments pour ce
// dossier précis : impossible de pointer vers une évaluation inexistante ou
// appartenant à un autre dossier. L'historique safetyAssessments lui-même
// n'est jamais modifié par cette fonction (seul le pointeur change).
export function setCurrentSafetyAssessmentRef(
  dossier: RelationDossier,
  assessmentId: string,
  options: SetCurrentSafetyAssessmentRefOptions = {},
): RelationDossier {
  const now = options.now ?? (() => new Date().toISOString());

  const targetAssessment = dossier.safetyAssessments.find(
    (assessment) => assessment.id === assessmentId && assessment.relationDossierId === dossier.id,
  );
  if (!targetAssessment) {
    throw new Error(
      `Aucune évaluation de sécurité avec l'id "${assessmentId}" n'existe pour le dossier "${dossier.id}" : impossible de la désigner comme évaluation de sécurité courante sans qu'elle existe déjà dans l'historique (SR-D-001, Décision 4).`,
    );
  }

  return {
    ...dossier,
    currentSafetyAssessmentRef: assessmentId,
    updatedAt: now(),
  };
}

