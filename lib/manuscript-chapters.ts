// LIVRE-P1A — Identité stable et accès canonique aux chapitres des Tomes 2–4.
//
// Gouvernance : STD-005 LIVRE-P1A-D1 à D5, STD-008 (dettes LIVRE-P1A).
//
// Option B (D4) : représentation canonique ADDITIVE, distincte de la clé
// legacy `structure-chapitres`. Après migration, la clé canonique est la
// seule source de vérité des Tomes 2–4 ; la clé legacy est conservée telle
// quelle (compatibilité / récupération) et n'est plus écrite pour ces tomes.
//
// - Structure : CHAPITRES_MANUSCRIT_STORAGE_KEY (un seul document JSON).
// - Contenu   : une clé par chapitre, CONTENU_CHAPITRE_PREFIX + id. Le contenu
//   n'est jamais indexé par titre : renommer ou réordonner ne le touche pas.
//
// Hors périmètre (D3, D5, STD-008) : Tome 1 (`chapitres-tome-1`, entrées
// Tome 1 de `structure-chapitres`, clés `ecriture_1_*`), tomes > 4, modèle
// `Chapitre` de la Biographie, `fragment.chapitre` (reste une référence par
// titre). Aucun historique de versions (LIVRE-P1B).

import {
  CHAPITRES_DEFAUT,
  STRUCTURE_CHAPITRES_STORAGE_KEY,
  lireChapitres,
  sauvegarderChapitres,
  type ManuscriptChapitres,
} from "@/lib/manuscript-structure";

export const CHAPITRES_MANUSCRIT_STORAGE_KEY = "chapitres-manuscrit-tomes-2-4";
export const CONTENU_CHAPITRE_PREFIX = "contenu-chapitre-manuscrit:";
export const TOMES_P1A = [2, 3, 4] as const;

export const STATUT_LEGACY_IMPORTE = "LEGACY — IMPORTÉ";
export const STATUT_LEGACY_INDETERMINABLE = "LEGACY — IDENTITÉ INDÉTERMINABLE";
export const STATUT_LEGACY_SANS_CHAPITRE = "LEGACY — AUCUN CHAPITRE CORRESPONDANT";

export type TomeP1A = (typeof TOMES_P1A)[number];

export type ChapitreManuscrit = {
  id: string;
  tomeId: TomeP1A;
  titre: string;
  ordre: number;
};

export type StatutImportLegacy =
  | typeof STATUT_LEGACY_IMPORTE
  | typeof STATUT_LEGACY_INDETERMINABLE
  | typeof STATUT_LEGACY_SANS_CHAPITRE;

// Constat figé au moment de la migration, pour chaque clé `ecriture_{2|3|4}_*`
// présente. La clé legacy elle-même n'est jamais modifiée ni supprimée.
export type ImportLegacy = {
  cleLegacy: string;
  tomeId: TomeP1A;
  titreLegacy: string;
  statut: StatutImportLegacy;
  chapitreId?: string;
  candidats?: string[];
};

export type StructureManuscritCanonique = {
  version: 1;
  migreLe: string;
  chapitres: ChapitreManuscrit[];
  importsLegacy: ImportLegacy[];
};

export class StructureCanoniqueIllisibleError extends Error {
  constructor() {
    super(
      `La structure canonique (${CHAPITRES_MANUSCRIT_STORAGE_KEY}) est illisible : aucune écriture n'est faite pour ne pas l'écraser.`,
    );
    this.name = "StructureCanoniqueIllisibleError";
  }
}

export class TitreChapitreDejaUtiliseError extends Error {
  constructor(titre: string) {
    super(`Un chapitre « ${titre} » existe déjà dans ce tome.`);
    this.name = "TitreChapitreDejaUtiliseError";
  }
}

export function estTomeP1A(tomeId: unknown): tomeId is TomeP1A {
  return typeof tomeId === "number" && (TOMES_P1A as readonly number[]).includes(tomeId);
}

// Clé de texte legacy (`/vue-double` avant P1A). Seuls usages autorisés :
// migration des Tomes 2–4 et accès Tome 1 / tomes hors P1A, inchangés.
export function cleEcritureLegacy(tomeId: number, titre: string) {
  return `ecriture_${tomeId}_${encodeURIComponent(titre)}`;
}

export function cleContenuChapitre(id: string) {
  return `${CONTENU_CHAPITRE_PREFIX}${id}`;
}

// L'identifiant n'est jamais dérivé du titre, de l'index ou de l'ordre.
export function genererIdChapitre(): string {
  const cryptoGlobal = (globalThis as { crypto?: { randomUUID?: () => string } }).crypto;
  if (cryptoGlobal?.randomUUID) return `chap-${cryptoGlobal.randomUUID()}`;
  return `chap-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`;
}

function storageDisponible() {
  return typeof window !== "undefined" && typeof localStorage !== "undefined";
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

function normaliserChapitreManuscrit(value: unknown): ChapitreManuscrit | null {
  if (!isRecord(value)) return null;
  if (typeof value.id !== "string" || !value.id) return null;
  if (!estTomeP1A(value.tomeId)) return null;
  if (typeof value.titre !== "string") return null;
  const ordre = typeof value.ordre === "number" && Number.isFinite(value.ordre) ? value.ordre : 0;
  return { id: value.id, tomeId: value.tomeId, titre: value.titre, ordre };
}

function trierChapitres(chapitres: ChapitreManuscrit[]) {
  return [...chapitres].sort((a, b) => a.tomeId - b.tomeId || a.ordre - b.ordre);
}

type LectureBrute =
  | { etat: "absente" }
  | { etat: "invalide" }
  | { etat: "ok"; structure: StructureManuscritCanonique };

function lireStructureBrute(): LectureBrute {
  const raw = localStorage.getItem(CHAPITRES_MANUSCRIT_STORAGE_KEY);
  if (raw === null) return { etat: "absente" };
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!isRecord(parsed) || parsed.version !== 1 || !Array.isArray(parsed.chapitres)) return { etat: "invalide" };
    return {
      etat: "ok",
      structure: {
        version: 1,
        migreLe: typeof parsed.migreLe === "string" ? parsed.migreLe : "",
        chapitres: trierChapitres(
          parsed.chapitres
            .map(normaliserChapitreManuscrit)
            .filter((chapitre): chapitre is ChapitreManuscrit => Boolean(chapitre)),
        ),
        importsLegacy: Array.isArray(parsed.importsLegacy) ? (parsed.importsLegacy as ImportLegacy[]) : [],
      },
    };
  } catch {
    return { etat: "invalide" };
  }
}

function ecrireStructure(structure: StructureManuscritCanonique) {
  localStorage.setItem(CHAPITRES_MANUSCRIT_STORAGE_KEY, JSON.stringify(structure));
  return structure;
}

// Lecture brute (non normalisée) de `structure-chapitres` pour les Tomes 2–4 :
// mêmes valeurs que `normaliserChapitres` (défauts si absente, illisible ou
// sans entrée pour le tome), doublons de titre conservés tels quels.
function lireTitresLegacyP1A(): Record<TomeP1A, string[]> {
  let parsed: unknown = null;
  try {
    const raw = localStorage.getItem(STRUCTURE_CHAPITRES_STORAGE_KEY);
    parsed = raw ? JSON.parse(raw) : null;
  } catch {
    parsed = null;
  }
  const result = {} as Record<TomeP1A, string[]>;
  TOMES_P1A.forEach((tomeId) => {
    const value = isRecord(parsed) ? parsed[String(tomeId)] : undefined;
    result[tomeId] = Array.isArray(value)
      ? value.filter((titre): titre is string => typeof titre === "string")
      : [...(CHAPITRES_DEFAUT[tomeId] || [])];
  });
  return result;
}

function clesEcritureLegacyP1A(): string[] {
  const cles: string[] = [];
  for (let index = 0; index < localStorage.length; index += 1) {
    const key = localStorage.key(index);
    if (key && /^ecriture_[234]_/.test(key)) cles.push(key);
  }
  return cles.sort();
}

function decoderTitreLegacy(cle: string) {
  const encoded = cle.replace(/^ecriture_\d+_/, "");
  try {
    return decodeURIComponent(encoded);
  } catch {
    return encoded;
  }
}

// Migration initiale — additive, déterministe, non destructive, exécutée une
// seule fois : si la clé canonique existe (même illisible), rien n'est fait.
// Rattachement legacy : uniquement par égalité exacte de clé
// (`ecriture_{tome}_{encodeURIComponent(titre)}`) avec UN SEUL chapitre du
// tome. Plusieurs candidats → INDÉTERMINABLE ; aucun → SANS CHAPITRE. Les
// clés legacy ne sont jamais modifiées ni supprimées.
export function migrerChapitresLegacyP1A(): StructureManuscritCanonique | null {
  if (!storageDisponible()) return null;
  const existante = lireStructureBrute();
  if (existante.etat === "ok") return existante.structure;
  if (existante.etat === "invalide") return null;

  const titresLegacy = lireTitresLegacyP1A();
  const chapitres: ChapitreManuscrit[] = TOMES_P1A.flatMap((tomeId) =>
    titresLegacy[tomeId].map((titre, ordre) => ({ id: genererIdChapitre(), tomeId, titre, ordre })),
  );

  const importsLegacy: ImportLegacy[] = clesEcritureLegacyP1A().map((cleLegacy) => {
    const tomeId = Number(cleLegacy.split("_")[1]) as TomeP1A;
    const titreLegacy = decoderTitreLegacy(cleLegacy);
    const candidats = chapitres.filter(
      (chapitre) => chapitre.tomeId === tomeId && cleEcritureLegacy(tomeId, chapitre.titre) === cleLegacy,
    );
    if (candidats.length === 0) return { cleLegacy, tomeId, titreLegacy, statut: STATUT_LEGACY_SANS_CHAPITRE };
    if (candidats.length > 1) {
      return {
        cleLegacy,
        tomeId,
        titreLegacy,
        statut: STATUT_LEGACY_INDETERMINABLE,
        candidats: candidats.map((chapitre) => chapitre.id),
      };
    }
    return { cleLegacy, tomeId, titreLegacy, statut: STATUT_LEGACY_IMPORTE, chapitreId: candidats[0].id };
  });

  // Contenu d'abord (copie), structure ensuite : une interruption entre les
  // deux laisse la structure absente et les clés legacy intactes.
  importsLegacy.forEach((entree) => {
    if (entree.statut !== STATUT_LEGACY_IMPORTE || !entree.chapitreId) return;
    const cle = cleContenuChapitre(entree.chapitreId);
    const texte = localStorage.getItem(entree.cleLegacy);
    if (texte !== null && localStorage.getItem(cle) === null) localStorage.setItem(cle, texte);
  });

  return ecrireStructure({ version: 1, migreLe: new Date().toISOString(), chapitres, importsLegacy });
}

export type EtatStructureCanonique = {
  invalide: boolean;
  chapitres: ChapitreManuscrit[];
  importsLegacy: ImportLegacy[];
};

// Point d'entrée de lecture : migre au premier accès, puis relit toujours la
// même structure persistée (mêmes identifiants).
export function lireEtatStructureCanonique(): EtatStructureCanonique {
  if (!storageDisponible()) return { invalide: false, chapitres: [], importsLegacy: [] };
  const structure = migrerChapitresLegacyP1A();
  if (!structure) return { invalide: true, chapitres: [], importsLegacy: [] };
  return { invalide: false, chapitres: structure.chapitres, importsLegacy: structure.importsLegacy };
}

export function lireChapitresCanoniques(): ChapitreManuscrit[] {
  return lireEtatStructureCanonique().chapitres;
}

export function lireChapitresCanoniquesDuTome(tomeId: TomeP1A): ChapitreManuscrit[] {
  return lireChapitresCanoniques().filter((chapitre) => chapitre.tomeId === tomeId);
}

function modifierStructure(
  mutation: (structure: StructureManuscritCanonique) => ChapitreManuscrit[],
): ChapitreManuscrit[] {
  if (!storageDisponible()) return [];
  const structure = migrerChapitresLegacyP1A();
  if (!structure) throw new StructureCanoniqueIllisibleError();
  const chapitres = trierChapitres(mutation(structure));
  ecrireStructure({ ...structure, chapitres });
  return chapitres;
}

function renumeroter(chapitres: ChapitreManuscrit[], tomeId: TomeP1A) {
  let ordre = 0;
  return chapitres.map((chapitre) => (chapitre.tomeId === tomeId ? { ...chapitre, ordre: ordre++ } : chapitre));
}

function titreDejaUtilise(chapitres: ChapitreManuscrit[], tomeId: TomeP1A, titre: string, saufId?: string) {
  return chapitres.some((chapitre) => chapitre.tomeId === tomeId && chapitre.titre === titre && chapitre.id !== saufId);
}

function ajouterChapitre(tomeId: TomeP1A, titre: string): ChapitreManuscrit {
  const id = genererIdChapitre();
  const chapitres = modifierStructure(({ chapitres }) => {
    if (titreDejaUtilise(chapitres, tomeId, titre)) throw new TitreChapitreDejaUtiliseError(titre);
    const ordre = chapitres.filter((chapitre) => chapitre.tomeId === tomeId).length;
    return [...chapitres, { id, tomeId, titre, ordre }];
  });
  return chapitres.find((chapitre) => chapitre.id === id) as ChapitreManuscrit;
}

export function ajouterChapitreCanonique(tomeId: TomeP1A, titre: string): ChapitreManuscrit {
  const trimmed = titre.trim();
  if (!trimmed) throw new Error("Titre de chapitre vide.");
  return ajouterChapitre(tomeId, trimmed);
}

export function renommerChapitreCanonique(id: string, nouveauTitre: string): ChapitreManuscrit[] {
  const trimmed = nouveauTitre.trim();
  if (!trimmed) throw new Error("Titre de chapitre vide.");
  return modifierStructure(({ chapitres }) => {
    const cible = chapitres.find((chapitre) => chapitre.id === id);
    if (!cible) throw new Error(`Chapitre introuvable : ${id}`);
    if (titreDejaUtilise(chapitres, cible.tomeId, trimmed, id)) throw new TitreChapitreDejaUtiliseError(trimmed);
    return chapitres.map((chapitre) => (chapitre.id === id ? { ...chapitre, titre: trimmed } : chapitre));
  });
}

// Retire le chapitre de la structure uniquement : son contenu canonique est
// conservé dans le stockage (aucune suppression de texte).
export function supprimerChapitreCanonique(id: string): ChapitreManuscrit[] {
  return modifierStructure(({ chapitres }) => {
    const cible = chapitres.find((chapitre) => chapitre.id === id);
    if (!cible) return chapitres;
    return renumeroter(
      chapitres.filter((chapitre) => chapitre.id !== id),
      cible.tomeId,
    );
  });
}

// `idsOrdonnes` doit être une permutation exacte des chapitres du tome.
export function reordonnerChapitresCanoniques(tomeId: TomeP1A, idsOrdonnes: string[]): ChapitreManuscrit[] {
  return modifierStructure(({ chapitres }) => {
    const duTome = chapitres.filter((chapitre) => chapitre.tomeId === tomeId);
    const attendus = new Set(duTome.map((chapitre) => chapitre.id));
    if (idsOrdonnes.length !== duTome.length || new Set(idsOrdonnes).size !== idsOrdonnes.length || !idsOrdonnes.every((id) => attendus.has(id))) {
      throw new Error("Réordonnancement refusé : la liste ne correspond pas exactement aux chapitres du tome.");
    }
    const position = new Map(idsOrdonnes.map((id, ordre) => [id, ordre]));
    return chapitres.map((chapitre) =>
      chapitre.tomeId === tomeId ? { ...chapitre, ordre: position.get(chapitre.id) as number } : chapitre,
    );
  });
}

export type ResolutionChapitreParTitre =
  | { statut: "existant"; chapitre: ChapitreManuscrit }
  | { statut: "cree"; chapitre: ChapitreManuscrit }
  | { statut: typeof STATUT_LEGACY_INDETERMINABLE; candidats: string[] };

// D2 — passe 2 de `/fragments` et `envoyerAuManuscrit` : un `fragment.chapitre`
// (référence par titre) ne crée un chapitre que si aucun chapitre du tome ne
// porte exactement ce titre ; un chapitre existant garde son identifiant ;
// plusieurs homonymes → aucun choix.
// Le titre est repris tel quel (comme l'ajout legacy d'avant P1A) pour que la
// référence par titre du fragment continue de désigner ce chapitre.
export function assurerChapitreCanoniquePourTitre(tomeId: TomeP1A, titre: string): ResolutionChapitreParTitre {
  if (!titre.trim()) throw new Error("Titre de chapitre vide.");
  const correspondances = lireChapitresCanoniquesDuTome(tomeId).filter((chapitre) => chapitre.titre === titre);
  if (correspondances.length === 1) return { statut: "existant", chapitre: correspondances[0] };
  if (correspondances.length > 1) {
    return { statut: STATUT_LEGACY_INDETERMINABLE, candidats: correspondances.map((chapitre) => chapitre.id) };
  }
  return { statut: "cree", chapitre: ajouterChapitre(tomeId, titre) };
}

export function lireContenuChapitre(id: string): string {
  if (!storageDisponible()) return "";
  return localStorage.getItem(cleContenuChapitre(id)) ?? "";
}

export function sauvegarderContenuChapitre(id: string, texte: string) {
  if (!storageDisponible()) return;
  const etat = lireEtatStructureCanonique();
  if (etat.invalide) throw new StructureCanoniqueIllisibleError();
  if (!etat.chapitres.some((chapitre) => chapitre.id === id)) throw new Error(`Chapitre introuvable : ${id}`);
  localStorage.setItem(cleContenuChapitre(id), texte);
}

export type TexteLegacyNonAttribue = ImportLegacy & { texte: string };

// Textes legacy des Tomes 2–4 non rattachés à la migration (indéterminables ou
// sans chapitre) : toujours lisibles, jamais attribués automatiquement.
export function lireTextesLegacyNonAttribues(): TexteLegacyNonAttribue[] {
  if (!storageDisponible()) return [];
  return lireEtatStructureCanonique()
    .importsLegacy.filter((entree) => entree.statut !== STATUT_LEGACY_IMPORTE)
    .map((entree) => ({ ...entree, texte: localStorage.getItem(entree.cleLegacy) ?? "" }))
    .filter((entree) => entree.texte.trim().length > 0);
}

// ─── Vue unifiée pour les consommateurs ───────────────────────────────────
// Tomes 2–4 : structure et contenu canoniques (par identifiant).
// Autres tomes (Tome 1 legacy, tomes > 4) : comportement legacy inchangé, à
// partir de la base legacy que le consommateur lisait déjà.

export type ChapitreStructureLu = {
  tomeId: number;
  titre: string;
  index: number;
  id: string | null;
  source: "canonique" | "legacy";
};

export type ChapitresStructureParTome = Record<number, ChapitreStructureLu[]>;

export function composerChapitresParTome(
  legacyParTome: Record<number, string[]>,
  canoniques: ChapitreManuscrit[] = lireChapitresCanoniques(),
): ChapitresStructureParTome {
  const result: ChapitresStructureParTome = {};
  Object.entries(legacyParTome).forEach(([key, titres]) => {
    const tomeId = Number(key);
    if (estTomeP1A(tomeId) || !Array.isArray(titres)) return;
    result[tomeId] = titres.map((titre, index) => ({ tomeId, titre, index, id: null, source: "legacy" }));
  });
  TOMES_P1A.forEach((tomeId) => {
    result[tomeId] = canoniques
      .filter((chapitre) => chapitre.tomeId === tomeId)
      .map((chapitre, index) => ({ tomeId, titre: chapitre.titre, index, id: chapitre.id, source: "canonique" }));
  });
  return result;
}

export function lireChapitresStructureParTome(): ChapitresStructureParTome {
  return composerChapitresParTome(lireChapitres());
}

export function titresParTome(chapitres: ChapitresStructureParTome): Record<number, string[]> {
  return Object.fromEntries(
    Object.entries(chapitres).map(([tomeId, liste]) => [Number(tomeId), liste.map((chapitre) => chapitre.titre)]),
  );
}

export function lireTexteChapitre(chapitre: ChapitreStructureLu): string {
  if (!storageDisponible()) return "";
  if (chapitre.source === "canonique" && chapitre.id) return lireContenuChapitre(chapitre.id);
  return localStorage.getItem(cleEcritureLegacy(chapitre.tomeId, chapitre.titre)) ?? "";
}

export function sauvegarderTexteChapitre(chapitre: ChapitreStructureLu, texte: string) {
  if (!storageDisponible()) return;
  if (chapitre.source === "canonique" && chapitre.id) {
    sauvegarderContenuChapitre(chapitre.id, texte);
    return;
  }
  if (estTomeP1A(chapitre.tomeId)) throw new Error("Écriture legacy refusée pour un tome canonique.");
  localStorage.setItem(cleEcritureLegacy(chapitre.tomeId, chapitre.titre), texte);
}

// Écritures legacy hors P1A (Tome 1, tomes > 4) — comportement d'avant P1A,
// sans jamais réécrire les Tomes 2–4 de `structure-chapitres` à partir de la
// représentation canonique (aucune double écriture).
export function sauvegarderChapitresLegacyHorsP1A(tomeId: number, titres: string[]): ManuscriptChapitres {
  if (estTomeP1A(tomeId)) throw new Error("Les Tomes 2–4 passent par la structure canonique.");
  return sauvegarderChapitres({ ...lireChapitres(), [tomeId]: titres });
}

// Suppression d'un tome hors P1A dans `/structure` : même écriture qu'avant P1A
// (entrée retirée puis structure legacy normalisée).
export function retirerTomeLegacyHorsP1A(tomeId: number): ManuscriptChapitres {
  if (estTomeP1A(tomeId)) throw new Error("Les Tomes 2–4 passent par la structure canonique.");
  const restants = Object.fromEntries(
    Object.entries(lireChapitres()).filter(([key]) => Number(key) !== tomeId),
  ) as ManuscriptChapitres;
  return sauvegarderChapitres(restants);
}

// Passe 2 / envoi au manuscrit pour un tome hors P1A : identique à l'écriture
// brute faite par `/fragments` avant P1A (ajout si absent).
export function ajouterChapitreLegacyBrutHorsP1A(tomeId: number, titre: string) {
  if (estTomeP1A(tomeId)) throw new Error("Les Tomes 2–4 passent par la structure canonique.");
  let structure: Record<string, unknown>;
  try {
    const raw = localStorage.getItem(STRUCTURE_CHAPITRES_STORAGE_KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : CHAPITRES_DEFAUT;
    structure = isRecord(parsed) ? { ...parsed } : { ...CHAPITRES_DEFAUT };
  } catch {
    return false;
  }
  const actuels = Array.isArray(structure[String(tomeId)]) ? (structure[String(tomeId)] as unknown[]) : [];
  if (actuels.includes(titre)) return false;
  structure[String(tomeId)] = [...actuels, titre];
  localStorage.setItem(STRUCTURE_CHAPITRES_STORAGE_KEY, JSON.stringify(structure));
  return true;
}

// ─── `/fragments` (D1, D2) ──────────────────────────────────────────────────
// Passe 3 supprimée (D1) : aucune fonction de ce module ne retire un chapitre
// parce qu'il n'a pas de fragment. Passe 2 conservée (D2) via les primitives.

export type ResultatChapitreFragment =
  | ResolutionChapitreParTitre
  | { statut: "legacy-hors-p1a"; ajoute: boolean }
  | { statut: "ignore" }
  | { statut: "erreur"; message: string };

export function assurerChapitrePourFragment(
  tomeId: number | null | undefined,
  titre: string | null | undefined,
): ResultatChapitreFragment {
  if (!storageDisponible() || !tomeId || !titre || !titre.trim()) return { statut: "ignore" };
  try {
    if (estTomeP1A(tomeId)) return assurerChapitreCanoniquePourTitre(tomeId, titre);
    return { statut: "legacy-hors-p1a", ajoute: ajouterChapitreLegacyBrutHorsP1A(tomeId, titre) };
  } catch (error) {
    return { statut: "erreur", message: error instanceof Error ? error.message : String(error) };
  }
}

export function synchroniserChapitresDepuisFragments(
  fragments: Array<{ manuscrit?: boolean; tomeId?: number | null; chapitre?: string | null }>,
): ResultatChapitreFragment[] {
  return fragments
    .filter((fragment) => fragment.manuscrit && fragment.tomeId && fragment.chapitre)
    .map((fragment) => assurerChapitrePourFragment(fragment.tomeId, fragment.chapitre));
}
