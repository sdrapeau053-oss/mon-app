// Vue liste des dossiers relationnels (Phase 8bis.4a — Conformité finale
// SR-D-001).
//
// Objectif de ce module : séparer clairement deux responsabilités qui
// vivaient auparavant mélangées dans app/autre-rive/dossiers/page.tsx —
// (a) la structure et le stockage strictement LEGACY des dossiers affichés
// par cette page (clé "autre-rive-dossiers"), et (b) la construction d'une
// identité d'affichage qui donne priorité aux données canoniques
// (lib/autre-rive, SR-D-001 Décision 4) lorsqu'un dossier a déjà été
// confirmé/migré.
//
// Règle fondamentale respectée ici (validée avant exécution de la
// Phase 8bis.4a) : aucune valeur canonique obligatoire (relationType,
// status, participantIds, primaryUserParticipantId) n'est jamais déduite ou
// inventée à partir des données legacy par ce module. Un dossier créé ou
// modifié par le formulaire de app/autre-rive/dossiers/page.tsx reste un
// dossier LEGACY tant qu'il n'a pas été explicitement confirmé via
// DossierMigrationPanel (déjà construit en Phase 4bis d'IMP-001, voir
// app/autre-rive/dossiers/[id]/dossier-migration-panel.tsx) : ce module ne
// construit, n'appelle et ne duplique aucun mécanisme de migration —
// aucune référence à addOrUpdateRelationDossier ni à
// finalizeLegacyMigration n'existe dans ce fichier.

import {
  LEGACY_DOSSIER_STORAGE_KEY,
  type RelationDossier as CanonicalRelationDossier,
  type RelationStatus,
  type RelationType,
} from "@/lib/autre-rive";

// Type strictement scopé à cet écran et à son stockage legacy
// ("autre-rive-dossiers") : ce n'est PAS le type métier canonique
// RelationDossier (SR-D-001, Décision 4), qui vit exclusivement dans
// lib/autre-rive/types.ts et n'est jamais redéfini localement ailleurs
// dans le domaine Relation. Nommage explicite pour éviter toute confusion
// (contrainte de la Phase 8bis.4a).
export interface LegacyDossierListItem {
  id: string;
  nom: string;
  statut: string;
  dateCreation: string;
  typeRelation?: string;
  derniereInteraction?: string;
  notes?: string;
  tags?: string[];
  energieEmotionnelle?: number;
  niveauClarte?: number;
  niveauReciprocite?: number;
  niveauSecurite?: number;
}

export function isLegacyDossierListItem(value: unknown): value is LegacyDossierListItem {
  if (!value || typeof value !== "object") return false;
  const item = value as Partial<LegacyDossierListItem>;
  return (
    typeof item.id === "string" &&
    typeof item.nom === "string" &&
    typeof item.statut === "string" &&
    typeof item.dateCreation === "string"
  );
}

// Lecture/écriture de la clé legacy uniquement (LEGACY_DOSSIER_STORAGE_KEY,
// importée depuis @/lib/autre-rive plutôt que redéfinie localement — c'est
// la même clé littérale "autre-rive-dossiers" que lib/autre-rive/legacy-adapter.ts
// lit déjà en lecture seule pour l'adaptation partielle). Aucune écriture
// vers la clé canonique n'a lieu ici.
export function readLegacyDossierList(): LegacyDossierListItem[] {
  if (typeof window === "undefined") return [];

  try {
    const raw = window.localStorage.getItem(LEGACY_DOSSIER_STORAGE_KEY);
    const data: unknown = raw ? JSON.parse(raw) : [];
    return Array.isArray(data) ? data.filter(isLegacyDossierListItem) : [];
  } catch {
    return [];
  }
}

export function saveLegacyDossierList(list: LegacyDossierListItem[]) {
  try {
    window.localStorage.setItem(LEGACY_DOSSIER_STORAGE_KEY, JSON.stringify(list));
  } catch {
    return;
  }
}

export function updateLegacyDossierList(
  updater: (current: LegacyDossierListItem[]) => LegacyDossierListItem[],
): LegacyDossierListItem[] {
  const current = readLegacyDossierList();
  const next = updater(current);
  saveLegacyDossierList(next);
  return next;
}

// Index des dossiers canoniques par id, pour un lookup en O(1) depuis la
// liste legacy (un dossier legacy et son équivalent canonique partagent
// toujours le même id — voir lib/autre-rive/legacy-adapter.ts,
// adaptLegacyRelationDossierPartially, qui préserve l'id source lors de la
// finalisation). Fonction pure, ne lit ni n'écrit aucun stockage.
export function buildCanonicalIndex(
  canonicalDossiers: CanonicalRelationDossier[],
): Map<string, CanonicalRelationDossier> {
  return new Map(canonicalDossiers.map((dossier) => [dossier.id, dossier] as const));
}

// Libellés d'affichage pour les valeurs canoniques (SR-D-001, Décision 4).
// Duplication volontaire et minimale des libellés déjà utilisés par
// DossierMigrationPanel (app/autre-rive/dossiers/[id]/dossier-migration-panel.tsx,
// non exportés depuis ce composant, et ce composant n'est pas modifié par
// la Phase 8bis.4a) : deux très petites tables de correspondance valeur ->
// libellé français, sans aucune logique métier.
const RELATION_TYPE_LABELS: Record<RelationType, string> = {
  romantic: "Romantique",
  family: "Familiale",
  friendship: "Amicale",
  professional: "Professionnelle",
  other: "Autre",
};

const RELATION_STATUS_LABELS: Record<RelationStatus, string> = {
  active: "Active",
  paused: "En pause",
  ended: "Terminée",
};

// Identité d'affichage d'un dossier de la liste. Ne couvre QUE nom / statut
// / type de relation — jamais les indicateurs de score (Clarté/Réciprocité/
// Sécurité) : ceux-ci restent volontairement lus depuis la structure legacy
// directement dans page.tsx. Leur équivalent canonique (ScoreAssessment via
// currentAssessmentRefs, échelle 0-100) n'est pas une simple
// correspondance 1:1 avec les niveaux legacy 0-10 affichés aujourd'hui, et
// construire cette correspondance serait une fonctionnalité nouvelle non
// demandée par cette sous-phase (voir rapport de fin de Phase 8bis.4a) —
// et surtout, cela reviendrait à convertir silencieusement une ancienne
// valeur de score, ce que la Phase 8bis.4a interdit explicitement.
export interface DossierDisplayIdentity {
  nom: string;
  statut: string;
  typeRelation?: string;
  isCanonical: boolean;
}

// Construit l'identité affichée pour un dossier de la liste : donne
// priorité aux valeurs canoniques lorsqu'un RelationDossier canonique
// existe déjà pour cet id (dossier déjà confirmé/migré via
// DossierMigrationPanel), sinon retombe telle quelle sur les valeurs
// legacy. Fonction pure : ne lit, n'écrit et ne construit jamais elle-même
// un RelationDossier canonique — elle se contente de lire un dossier déjà
// existant, fourni par l'appelant.
export function buildDossierDisplayIdentity(
  legacy: LegacyDossierListItem,
  canonical: CanonicalRelationDossier | null,
): DossierDisplayIdentity {
  if (!canonical) {
    return {
      nom: legacy.nom,
      statut: legacy.statut,
      typeRelation: legacy.typeRelation,
      isCanonical: false,
    };
  }

  return {
    nom: canonical.name,
    statut: RELATION_STATUS_LABELS[canonical.status],
    typeRelation: RELATION_TYPE_LABELS[canonical.relationType],
    isCanonical: true,
  };
}
