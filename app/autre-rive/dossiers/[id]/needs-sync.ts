import {
  addNeed,
  addOrUpdateRelationDossier,
  confirmNeed,
  correctNeed,
  createExpressedNeed,
  readRelationDossierById,
  rejectNeed,
  type NeedCorrections,
  type RelationDossier,
} from "@/lib/autre-rive";

// Phase 9D — Intégration produit du cycle de vie des besoins (SR-D-001,
// Décision 4 §1 « Besoins évolutifs et historisés » + Décision 6, item
// Besoins). Raccorde l'écran de fiche dossier au moteur canonique déjà
// existant et déjà considéré correct (createExpressedNeed / createObservedNeed
// / addNeed / confirmNeed / correctNeed / rejectNeed, lib/autre-rive/needs.ts,
// non modifié par cette phase) : ce fichier n'implémente AUCUNE règle
// métier propre, il se contente de lire le dossier canonique, d'appeler le
// moteur, puis de persister le résultat — même répartition des
// responsabilités que critical-safety-sync.ts (9A) et
// current-assessment-sync.ts (9C).
//
// CONSTAT établi avant ce fichier (recherche globale effectuée) : aucune
// donnée existante du produit (notes, journal, décisions, red/green flags
// des rapports legacy) n'est structurellement un NeedStatement — toutes
// restent du texte libre sans origin/status/id métier. Aucune n'est donc
// convertie automatiquement ici, conformément à la consigne de cette phase.
// De même, aucune origine réelle et gouvernée n'existe encore dans le
// produit pour produire un besoin observé (createObservedNeed) : ce fichier
// n'expose donc qu'un chemin de création pour un besoin EXPRIMÉ ; un besoin
// observé ne peut être qu'affiché et confirmé/corrigé/rejeté s'il existe déjà
// dans dossier.needs (créé par un canal hors du périmètre de cette phase).

export interface NeedSyncOptions {
  now?: () => string;
  createId?: () => string;
}

function defaultCreateId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export type NeedSyncResult =
  | { status: "applied"; dossier: RelationDossier }
  // Aucune version canonique n'existe encore pour ce dossier : aucune
  // migration implicite n'est effectuée ici (même convention que
  // critical-safety-sync.ts, manual-score-sync.ts, current-assessment-sync.ts).
  | { status: "skipped_not_canonical" };

// Ajoute un besoin EXPRIMÉ par l'utilisatrice elle-même, à partir d'un texte
// libre qu'elle a saisi. Ce texte n'est jamais inventé ni pré-rempli par ce
// module ou par l'écran : il provient exclusivement du champ de saisie que
// l'utilisatrice a rempli à la main.
export function addExpressedNeedToDossier(
  dossierId: string,
  label: string,
  description: string | undefined,
  options: NeedSyncOptions = {},
): NeedSyncResult {
  const canonicalDossier = readRelationDossierById(dossierId);
  if (!canonicalDossier) {
    return { status: "skipped_not_canonical" };
  }

  if (!label.trim()) {
    throw new Error("Un besoin exprimé doit comporter un texte.");
  }

  const now = options.now ?? (() => new Date().toISOString());
  const createId = options.createId ?? (() => defaultCreateId("need-expressed"));

  const need = createExpressedNeed({
    id: createId(),
    label: label.trim(),
    description: description?.trim() || undefined,
    createdAt: now(),
  });

  const updatedDossier = addNeed(canonicalDossier, need, { now });
  addOrUpdateRelationDossier(updatedDossier);

  return { status: "applied", dossier: updatedDossier };
}

// Confirme explicitement un besoin déjà historisé (typiquement observé) :
// crée une nouvelle version d'origine "user_confirmed", ne modifie jamais
// l'entrée confirmée. Aucune confirmation automatique n'est possible par ce
// chemin : needId doit toujours provenir d'un geste explicite à l'écran.
export function confirmObservedNeedInDossier(
  dossierId: string,
  needId: string,
  options: NeedSyncOptions = {},
): NeedSyncResult {
  const canonicalDossier = readRelationDossierById(dossierId);
  if (!canonicalDossier) {
    return { status: "skipped_not_canonical" };
  }

  const now = options.now ?? (() => new Date().toISOString());
  const createId = options.createId ?? (() => defaultCreateId("need-confirmed"));

  const updatedDossier = confirmNeed(canonicalDossier, needId, createId(), { now });
  addOrUpdateRelationDossier(updatedDossier);

  return { status: "applied", dossier: updatedDossier };
}

// Corrige explicitement un besoin déjà historisé : crée une nouvelle
// version portant les champs corrigés, sans jamais modifier l'entrée
// corrigée. corrections provient exclusivement d'un formulaire pré-rempli
// avec le texte déjà existant du besoin (édition, pas invention) et modifié
// à la main par l'utilisatrice.
export function correctNeedInDossier(
  dossierId: string,
  needId: string,
  corrections: NeedCorrections,
  options: NeedSyncOptions = {},
): NeedSyncResult {
  const canonicalDossier = readRelationDossierById(dossierId);
  if (!canonicalDossier) {
    return { status: "skipped_not_canonical" };
  }

  if (corrections.label !== undefined && !corrections.label.trim()) {
    throw new Error("La correction d'un besoin doit conserver un texte non vide.");
  }

  const now = options.now ?? (() => new Date().toISOString());
  const createId = options.createId ?? (() => defaultCreateId("need-corrected"));

  const updatedDossier = correctNeed(canonicalDossier, needId, createId(), corrections, { now });
  addOrUpdateRelationDossier(updatedDossier);

  return { status: "applied", dossier: updatedDossier };
}

// Rejette explicitement un besoin déjà historisé : crée une nouvelle
// version au statut "inactive", sans jamais modifier ni supprimer l'entrée
// rejetée (SR-D-001, Décision 4 §1 : aucune suppression physique).
export function rejectNeedInDossier(
  dossierId: string,
  needId: string,
  options: NeedSyncOptions = {},
): NeedSyncResult {
  const canonicalDossier = readRelationDossierById(dossierId);
  if (!canonicalDossier) {
    return { status: "skipped_not_canonical" };
  }

  const now = options.now ?? (() => new Date().toISOString());
  const createId = options.createId ?? (() => defaultCreateId("need-rejected"));

  const updatedDossier = rejectNeed(canonicalDossier, needId, createId(), { now });
  addOrUpdateRelationDossier(updatedDossier);

  return { status: "applied", dossier: updatedDossier };
}
