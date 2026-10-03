// LIVRE-V1 — Vue de consultation du Tome 1 existant dans `/biographie`.
//
// Gouvernance : STD-005 LIVRE-V1-D1 (LIVRE-P1A-D3 et D5 restent applicables).
//
// La source de vérité du Tome 1 reste `chapitres-tome-1` (ChapitreTome1).
// Ce module ne fait que LIRE : le lecteur de stockage reçu n'expose que
// `getItem`, et aucune donnée n'est créée, réparée, migrée ni synchronisée.
// Le modèle `ProjetNarratif` de la Biographie n'est jamais alimenté d'ici.

import {
  CHAPITRES_TOME_1_STORAGE_KEY,
  TITRE_TOME_1,
  chapitreTome1EstEcrit,
  chapitreTome1EstVerrouillePourEcriture,
  compterMotsChapitreTome1,
  getNumeroChapitreTome1,
  getStatutEditorialChapitreTome1,
  normaliserChapitresTome1,
  type ChapitreTome1,
  type StatutChapitreTome1,
  type StatutEditorialChapitreTome1,
} from "@/lib/tome1-chapters";

// Parcours d'édition protégés (LIVRE-P0.1/P0.1B) du Tome 1.
export const PARCOURS_ECRITURE_TOME_1 = "/ecrire-maintenant";
export const PARCOURS_STRUCTURE_TOME_1 = "/structure-tome-1";

// `/structure-tome-1` ouvre directement un chapitre via `#chapitre-N`.
export function lienEditionChapitreTome1(id: string): string {
  return `${PARCOURS_STRUCTURE_TOME_1}#${id}`;
}

export type EtatSourceTome1 = "absente" | "illisible" | "lue";

export type ChapitreTome1Affiche = {
  id: string;
  numero: number;
  titre: string;
  statut: StatutChapitreTome1;
  statutEditorial: StatutEditorialChapitreTome1;
  verrouille: boolean;
  mots: number;
  lienEdition: string;
};

export type VueTome1Biographie = {
  etat: EtatSourceTome1;
  titre: string;
  chapitres: ChapitreTome1Affiche[];
  totalMots: number;
};

export type LecteurStockageTome1 = Pick<Storage, "getItem">;

// Seuls les emplacements réellement écrits sont des chapitres affichables :
// les 30 emplacements fixes du Tome 1 ne sont pas 30 chapitres.
export function construireChapitresTome1Affiches(chapitres: ChapitreTome1[]): ChapitreTome1Affiche[] {
  return chapitres
    .filter(chapitreTome1EstEcrit)
    .map((chapitre) => ({
      id: chapitre.id,
      numero: getNumeroChapitreTome1(chapitre.id),
      titre: chapitre.titre,
      statut: chapitre.statut,
      statutEditorial: getStatutEditorialChapitreTome1(chapitre),
      verrouille: chapitreTome1EstVerrouillePourEcriture(chapitre),
      mots: compterMotsChapitreTome1(chapitre),
      lienEdition: lienEditionChapitreTome1(chapitre.id),
    }));
}

function vue(etat: EtatSourceTome1, chapitres: ChapitreTome1Affiche[]): VueTome1Biographie {
  return {
    etat,
    titre: TITRE_TOME_1,
    chapitres,
    totalMots: chapitres.reduce((total, chapitre) => total + chapitre.mots, 0),
  };
}

// Même chemin que `lireChapitresTome1DepuisStorage()` (clé et normalisation
// canoniques), en distinguant en plus « absent » de « illisible » : un
// stockage illisible n'est ni réparé, ni écrasé, ni présenté comme vide.
export function lireVueTome1Biographie(stockage: LecteurStockageTome1 | null): VueTome1Biographie {
  if (!stockage) return vue("absente", []);

  let brut: string | null;
  try {
    brut = stockage.getItem(CHAPITRES_TOME_1_STORAGE_KEY);
  } catch {
    return vue("illisible", []);
  }
  if (brut === null) return vue("absente", []);

  let donnees: unknown;
  try {
    donnees = JSON.parse(brut);
  } catch {
    return vue("illisible", []);
  }
  if (!Array.isArray(donnees)) return vue("illisible", []);

  return vue("lue", construireChapitresTome1Affiches(normaliserChapitresTome1(donnees)));
}

// ─── Tomes du ProjetNarratif qui désignent le Tome 1 ───────────────────────
// Un tel tome serait une représentation parallèle du Tome 1 : on n'y propose
// pas « Nouveau chapitre », et on ne l'affiche pas s'il est vide (cas du tome
// par défaut de `creerProjetVide()`). Ses chapitres existants, s'il en a,
// restent visibles : rien n'est masqué de ce qui a déjà été écrit.

type TomeBiographie = { id: string; titre: string; chapitres: readonly unknown[] };

const TITRE_DESIGNANT_TOME_1 = /^\s*tome\s*(?:1|i)(?![0-9a-z])/i;

export function titreDesigneTome1(titre: string): boolean {
  return TITRE_DESIGNANT_TOME_1.test(titre);
}

export function tomeBiographieDesigneTome1(tome: Pick<TomeBiographie, "id" | "titre">): boolean {
  return tome.id === "tome-1" || titreDesigneTome1(tome.titre);
}

export function peutAjouterChapitreDansTomeBiographie(tome: Pick<TomeBiographie, "id" | "titre">): boolean {
  return !tomeBiographieDesigneTome1(tome);
}

export function tomesBiographieAffiches<T extends TomeBiographie>(tomes: T[]): T[] {
  return tomes.filter((tome) => !tomeBiographieDesigneTome1(tome) || tome.chapitres.length > 0);
}
