import {
  detectAssessmentDisagreement,
  type AssessmentDisagreement,
  type RelationDossier,
  type ScoreAssessment,
} from "@/lib/autre-rive";

// Phase 9B — Intégration produit du désaccord manuel / IA (SR-D-001,
// Décision 3 §6). Raccorde l'écran de fiche dossier au moteur canonique
// déjà existant et déjà considéré correct (detectAssessmentDisagreement,
// lib/autre-rive/assessment.ts, non modifié par cette phase) : ce fichier
// n'implémente AUCUNE règle de signalement, il se contente de choisir QUELS
// assessments comparer, puis d'appeler le moteur.
//
// Donnée dérivée, jamais persistée (décision prise avant codage, conforme à
// la consigne de cette phase) : AssessmentDisagreement n'a pas de champ
// correspondant sur RelationDossier, et rien dans SR-D-001 n'exige de
// l'historiser — un désaccord se recalcule entièrement, à chaque lecture, à
// partir des ScoreAssessment déjà historisés. Aucune nouvelle clé
// localStorage, aucun nouveau tableau sur RelationDossier.
//
// RÈGLE DE SÉLECTION — point de gouvernance explicitement tranché par
// l'utilisatrice avant implémentation (Phase 9B), après présentation de
// trois options et de leurs conséquences respectives :
//
//   Pour chaque dimension présente dans dossier.assessments, comparer le
//   DERNIER assessment de source "manual" et le DERNIER assessment de
//   source "ai" (le plus récent de chaque source, par createdAt).
//
// Alternative écartée explicitement : comparer les évaluations désignées
// "courantes" via currentAssessmentRefs — vide pour tout dossier réel
// aujourd'hui (aucune UI ne l'alimente encore, Phase 9C non intégrée),
// cette règle ne produirait jamais aucun signalement en pratique.
// Alternative écartée également : comparer toutes les paires manuel×IA
// existantes — retenue comme plus neutre en théorie, mais non choisie par
// l'utilisatrice au profit de la lisibilité d'un signal unique par
// dimension. Ce choix ne désigne jamais l'une des deux évaluations comme
// "fonctionnellement actuelle" au sens de la Décision 3 (aucun pointeur
// n'est créé ou modifié) : il ne sert qu'à sélectionner quoi comparer pour
// un signal d'examen, jamais à trancher quelle valeur fait autorité.

export interface AssessmentDisagreementView {
  disagreement: AssessmentDisagreement;
  manualAssessment: ScoreAssessment;
  aiAssessment: ScoreAssessment;
}

export interface ComputeAssessmentDisagreementsOptions {
  now?: () => string;
  threshold?: number;
}

// Le plus récent d'une source donnée, par createdAt (chaînes ISO 8601,
// comparables lexicalement).
//
// CORRECTION (Phase 9B, post-validation) : la version précédente retenait,
// en cas d'égalité stricte de createdAt, "le premier rencontré dans l'ordre
// d'insertion" — ce qui rendait le résultat dépendant de l'ordre de
// dossier.assessments, en contradiction directe avec l'exigence que la
// sélection soit indépendante de cet ordre. Corrigé ici par un
// départage (tie-break) explicite, déterministe et indépendant de l'ordre :
// à createdAt strictement égal, l'assessment dont l'`id` est
// lexicographiquement le plus grand (comparaison de chaînes standard) est
// retenu. Ce choix ne repose sur aucun critère métier supplémentaire prévu
// par SR-D-001 (qui ne traite pas ce cas) ; il ne fait que garantir la
// reproductibilité technique de la sélection — inverser l'ordre des
// éléments dans dossier.assessments ne change jamais le résultat, puisque
// la comparaison (createdAt, id) est un ordre total sur les assessments et
// ne dépend en rien de la position dans le tableau.
//
// Ce départage ne signifie jamais que l'assessment retenu est "plus vrai"
// qu'un autre : il ne crée, ne modifie ni ne sélectionne aucun
// CurrentAssessmentRef, ne mute aucun ScoreAssessment, et ne change rien au
// seuil de désaccord ni à la règle de sélection déjà validée (dernier
// manuel + dernier IA par dimension, Option B).
function latestBySource(assessments: ScoreAssessment[], source: "manual" | "ai"): ScoreAssessment | null {
  let latest: ScoreAssessment | null = null;
  for (const assessment of assessments) {
    if (assessment.source !== source) continue;
    if (
      !latest ||
      assessment.createdAt > latest.createdAt ||
      (assessment.createdAt === latest.createdAt && assessment.id > latest.id)
    ) {
      latest = assessment;
    }
  }
  return latest;
}

// Calcule, sans rien persister ni muter, les désaccords manuel/IA
// actuellement ouverts pour ce dossier. Ne compare jamais deux assessments
// de la même source (manual/manual ou ai/ai) : detectAssessmentDisagreement
// n'est appelé que pour une paire manual + ai d'une même dimension, et
// uniquement lorsque les deux existent réellement dans l'historique.
export function computeAssessmentDisagreements(
  dossier: RelationDossier,
  options: ComputeAssessmentDisagreementsOptions = {},
): AssessmentDisagreementView[] {
  const dimensions = Array.from(new Set(dossier.assessments.map((assessment) => assessment.dimension)));
  const views: AssessmentDisagreementView[] = [];

  for (const dimension of dimensions) {
    const forDimension = dossier.assessments.filter((assessment) => assessment.dimension === dimension);
    const manualAssessment = latestBySource(forDimension, "manual");
    const aiAssessment = latestBySource(forDimension, "ai");
    if (!manualAssessment || !aiAssessment) continue;

    // Identifiant déterministe (pas de hasard ni d'horodatage dans l'id) :
    // reproductible pour la même paire d'assessments, sans inventer d'
    // identité indépendante de la donnée source — même principe que
    // buildLegacyScoreSnapshots (legacy-adapter.ts).
    const disagreement = detectAssessmentDisagreement({
      id: `disagreement-${dimension}-${manualAssessment.id}-${aiAssessment.id}`,
      relationDossierId: dossier.id,
      assessmentA: manualAssessment,
      assessmentB: aiAssessment,
      threshold: options.threshold,
      createdAt: options.now?.(),
    });

    if (disagreement) {
      views.push({ disagreement, manualAssessment, aiAssessment });
    }
  }

  return views;
}
