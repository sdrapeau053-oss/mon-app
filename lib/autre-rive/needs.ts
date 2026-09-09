import type { NeedOrigin, NeedStatement, NeedStatus, RelationDossier } from "./types";

// Phase 8bis.2 (SR-D-001, Décision 4 §1 « Besoins évolutifs et historisés » +
// Décision 6, item Besoins) — cycle de vie minimal des besoins. Fonctions
// pures uniquement : aucune n'accède à localStorage, ni ne branche un écran.
// L'appelant reste responsable de la persistance via storage.ts, comme pour
// assessment.ts (Phase 5) et critical-safety.ts (Phase 7).
//
// SR-D-001 nomme "NeedValidation" comme mécanisme de confirmation,
// correction et rejet (Décision 6, item Besoins) sans jamais en définir la
// structure exacte. Clarification de gouvernance minimale validée par
// l'utilisatrice avant l'écriture de ce fichier (8bis.2) : "NeedValidation"
// n'est pas une entité stockée séparément, mais le nom donné au mécanisme
// implémenté ici. Une confirmation, une correction ou un rejet ne modifie
// jamais un NeedStatement existant : chacun crée toujours un nouveau
// NeedStatement, relié au précédent par supersedesNeedId (champ ajouté à
// NeedStatement par cette même clarification, par stricte analogie avec
// ScoreAssessment.supersedesAssessmentId que SR-D-001 définit déjà,
// Décision 3 §2). L'ancien NeedStatement n'est jamais modifié, y compris
// son champ validTo : aucune règle de SR-D-001 n'exige sa fermeture
// automatique, et une telle mutation en place contredirait le principe de
// non-écrasement (Décision 4 §1 : "elle n'écrase jamais la version
// antérieure").

export interface CreateNeedInput {
  // Identifiant fourni par l'appelant : SR-D-001 ne définit aucune politique
  // de génération d'identifiant pour NeedStatement, ce module n'en invente
  // donc aucune (même principe que CreateScoreAssessmentInput.id).
  id: string;
  label: string;
  description?: string;

  // Statut initial du besoin. Par défaut "active" : un besoin nouvellement
  // exprimé ou observé est présumé actif tant que rien n'indique le
  // contraire (aucune règle de SR-D-001 n'impose un autre statut par défaut).
  status?: NeedStatus;

  confidence?: number;
  evidenceIds?: string[];

  // Horodatages injectables pour des tests déterministes ; par défaut
  // l'heure réelle (même convention que assessment.ts et critical-safety.ts).
  validFrom?: string;
  createdAt?: string;
}

function buildNeedStatement(input: CreateNeedInput, origin: NeedOrigin): NeedStatement {
  const createdAt = input.createdAt ?? new Date().toISOString();

  return {
    id: input.id,
    label: input.label,
    description: input.description,
    origin,
    status: input.status ?? "active",
    confidence: input.confidence,
    evidenceIds: input.evidenceIds ?? [],
    validFrom: input.validFrom ?? createdAt,
    createdAt,
    updatedAt: createdAt,
  };
}

// Besoin exprimé : l'utilisatrice l'a formulé elle-même (Décision 4 §1,
// NeedOrigin "expressed").
export function createExpressedNeed(input: CreateNeedInput): NeedStatement {
  return buildNeedStatement(input, "expressed");
}

// Besoin observé : hypothèse déduite par STRATE à partir des faits
// disponibles, jamais formulée telle quelle par l'utilisatrice (Décision 4
// §1, NeedOrigin "observed"). Ni cette fonction ni addNeed ci-dessous ne
// peuvent produire ou faire passer un besoin à l'origine "user_confirmed" :
// seule une confirmation explicite (confirmNeed) le fait.
export function createObservedNeed(input: CreateNeedInput): NeedStatement {
  return buildNeedStatement(input, "observed");
}

export interface NeedActionOptions {
  now?: () => string;
}

// Ajoute un besoin à l'historique du dossier. N'écrase, ne modifie ni ne
// supprime jamais un besoin existant : une nouvelle entrée est toujours
// ajoutée (Décision 4 §1, "elle n'écrase jamais la version antérieure").
export function addNeed(
  dossier: RelationDossier,
  need: NeedStatement,
  options: NeedActionOptions = {},
): RelationDossier {
  const now = options.now ?? (() => new Date().toISOString());

  if (dossier.needs.some((existing) => existing.id === need.id)) {
    throw new Error(
      `Un besoin avec l'id "${need.id}" existe déjà pour ce dossier : un besoin ne peut jamais en écraser un autre, il doit recevoir un identifiant distinct (SR-D-001, Décision 4 §1).`,
    );
  }

  return {
    ...dossier,
    needs: [...dossier.needs, need],
    updatedAt: now(),
  };
}

// Crée un nouveau NeedStatement qui supersède un besoin existant, sans
// jamais modifier ce dernier. Fonction interne partagée par confirmNeed,
// correctNeed et rejectNeed : seuls les champs qui distinguent chacune de
// ces trois actions varient (voir "overrides" à chaque appel).
function supersedeNeed(
  dossier: RelationDossier,
  needId: string,
  newNeedId: string,
  overrides: Partial<Pick<NeedStatement, "origin" | "status" | "label" | "description" | "evidenceIds" | "confidence">>,
  options: NeedActionOptions,
): RelationDossier {
  const target = dossier.needs.find((need) => need.id === needId);
  if (!target) {
    throw new Error(
      `Aucun besoin avec l'id "${needId}" n'existe dans l'historique de ce dossier : impossible de le confirmer, corriger ou rejeter sans qu'il existe déjà (SR-D-001, Décision 6, item Besoins).`,
    );
  }

  const now = options.now ?? (() => new Date().toISOString());
  const nowValue = now();

  const nextNeed: NeedStatement = {
    ...target,
    ...overrides,
    id: newNeedId,
    supersedesNeedId: needId,
    validFrom: nowValue,
    validTo: undefined,
    createdAt: nowValue,
    updatedAt: nowValue,
  };

  return addNeed(dossier, nextNeed, { now });
}

// Confirmation explicite (Décision 4 §1, Décision 6 item Besoins) : geste
// volontaire de l'utilisatrice qui fait passer un besoin — exprimé ou
// observé — à l'origine "user_confirmed". Ne modifie jamais le besoin
// d'origine, qui reste dans l'historique avec son origin d'origine intacte.
export function confirmNeed(
  dossier: RelationDossier,
  needId: string,
  newNeedId: string,
  options: NeedActionOptions = {},
): RelationDossier {
  return supersedeNeed(dossier, needId, newNeedId, { origin: "user_confirmed" }, options);
}

export interface NeedCorrections {
  label?: string;
  description?: string;
  evidenceIds?: string[];
  confidence?: number;
}

// Correction explicite (Décision 6, item Besoins) : remplace label,
// description, evidenceIds et/ou confidence sur une nouvelle entrée, sans
// jamais modifier l'entrée corrigée. L'origine du besoin n'est jamais
// modifiée par une correction (seule confirmNeed la modifie) ; seuls les
// champs explicitement fournis dans "corrections" changent, tous les autres
// sont conservés depuis le besoin corrigé.
export function correctNeed(
  dossier: RelationDossier,
  needId: string,
  newNeedId: string,
  corrections: NeedCorrections,
  options: NeedActionOptions = {},
): RelationDossier {
  return supersedeNeed(dossier, needId, newNeedId, corrections, options);
}

// Rejet explicite (Décision 6, item Besoins) : fait passer le besoin au
// statut "inactive" (valeur déjà définie par NeedStatus, Décision 4 §1 —
// aucune valeur supplémentaire n'est introduite pour représenter un rejet).
// Ne supprime jamais le besoin rejeté, qui reste visible dans l'historique.
export function rejectNeed(
  dossier: RelationDossier,
  needId: string,
  newNeedId: string,
  options: NeedActionOptions = {},
): RelationDossier {
  return supersedeNeed(dossier, needId, newNeedId, { status: "inactive" }, options);
}
