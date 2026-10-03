// LIVRE-P1B — Historique non destructif du contenu canonique des chapitres
// des Tomes 2–4.
//
// Gouvernance : STD-005 LIVRE-P1B-D1 (granularité) et LIVRE-P1B-D2 (stockage),
// STD-008 (dettes LIVRE-P1B).
//
// - Le contenu courant reste dans `localStorage` (LIVRE-P1A, seule source de
//   vérité du contenu courant). Ce module ne le lit ni ne l'écrit.
// - L'historique vit dans IndexedDB, une entrée par version, identifiée par
//   `chapitreId` (jamais par titre). Aucune version n'est jamais modifiée ni
//   supprimée : aucune purge, aucune rétention (D2).
// - Ordre déterministe : `id` = `${chapitreId}#${séquence}`, la séquence étant
//   attribuée dans la transaction d'écriture (insertion `add`, jamais `put`).

export const BASE_HISTORIQUE_NOM = "strate-livre-historique";
export const BASE_HISTORIQUE_VERSION = 1;
export const MAGASIN_VERSIONS = "versionsChapitre";
export const INDEX_CHAPITRE_DATE = "chapitreId_archiveLe";

// D1 — granularité des checkpoints.
export const DELAI_CHECKPOINT_MS = 5 * 60 * 1000;

export type MotifVersionChapitre =
  | "debut-seance"
  | "checkpoint"
  | "conflit"
  | "restauration"
  | "restauration-complete";

export type VersionChapitreManuscrit = {
  id: string;
  chapitreId: string;
  contenu: string;
  archiveLe: string;
  motif: MotifVersionChapitre;
};

export class HistoriqueChapitreError extends Error {
  readonly estQuota: boolean;

  constructor(message: string, cause?: unknown) {
    super(message, { cause });
    this.name = "HistoriqueChapitreError";
    this.estQuota = estErreurQuota(cause);
  }
}

export function estErreurQuota(error: unknown): boolean {
  return Boolean(
    error && typeof error === "object" && "name" in error && (error as { name?: unknown }).name === "QuotaExceededError",
  );
}

// ─── Dépôt (IndexedDB natif) ───────────────────────────────────────────────

export type DepotHistoriqueChapitres = {
  listerVersions(chapitreId: string): Promise<VersionChapitreManuscrit[]>;
  ajouterVersion(chapitreId: string, contenu: string, motif: MotifVersionChapitre): Promise<VersionChapitreManuscrit>;
};

const LARGEUR_SEQUENCE = 10;

function idVersion(chapitreId: string, sequence: number) {
  return `${chapitreId}#${String(sequence).padStart(LARGEUR_SEQUENCE, "0")}`;
}

function sequenceDepuisId(id: string): number {
  const sequence = Number(id.slice(id.lastIndexOf("#") + 1));
  return Number.isFinite(sequence) ? sequence : -1;
}

export function trierVersions(versions: VersionChapitreManuscrit[]): VersionChapitreManuscrit[] {
  return [...versions].sort((a, b) => sequenceDepuisId(a.id) - sequenceDepuisId(b.id) || (a.id < b.id ? -1 : 1));
}

function plageChapitre(chapitreId: string) {
  return IDBKeyRange.bound([chapitreId, ""], [chapitreId, "￿"]);
}

function versionValide(value: unknown): value is VersionChapitreManuscrit {
  if (!value || typeof value !== "object") return false;
  const v = value as Record<string, unknown>;
  return (
    typeof v.id === "string" &&
    typeof v.chapitreId === "string" &&
    typeof v.contenu === "string" &&
    typeof v.archiveLe === "string"
  );
}

let baseOuverte: Promise<IDBDatabase> | null = null;

function ouvrirBase(): Promise<IDBDatabase> {
  if (baseOuverte) return baseOuverte;
  const tentative = new Promise<IDBDatabase>((resolve, reject) => {
    const fabrique = (globalThis as { indexedDB?: IDBFactory }).indexedDB;
    if (!fabrique) {
      reject(new HistoriqueChapitreError("IndexedDB indisponible : l'historique ne peut pas être enregistré."));
      return;
    }
    let requete: IDBOpenDBRequest;
    try {
      requete = fabrique.open(BASE_HISTORIQUE_NOM, BASE_HISTORIQUE_VERSION);
    } catch (error) {
      reject(new HistoriqueChapitreError("Ouverture de la base d'historique impossible.", error));
      return;
    }
    requete.onupgradeneeded = () => {
      const base = requete.result;
      if (!base.objectStoreNames.contains(MAGASIN_VERSIONS)) {
        const magasin = base.createObjectStore(MAGASIN_VERSIONS, { keyPath: "id" });
        magasin.createIndex(INDEX_CHAPITRE_DATE, ["chapitreId", "archiveLe"]);
      }
    };
    requete.onsuccess = () => {
      const base = requete.result;
      base.onversionchange = () => {
        base.close();
        baseOuverte = null;
      };
      base.onclose = () => {
        baseOuverte = null;
      };
      resolve(base);
    };
    requete.onerror = () => reject(new HistoriqueChapitreError("Ouverture de la base d'historique impossible.", requete.error));
    requete.onblocked = () => reject(new HistoriqueChapitreError("Base d'historique bloquée par un autre onglet."));
  });
  baseOuverte = tentative;
  tentative.catch(() => {
    if (baseOuverte === tentative) baseOuverte = null;
  });
  return tentative;
}

export const depotHistoriqueIndexedDB: DepotHistoriqueChapitres = {
  async listerVersions(chapitreId) {
    const base = await ouvrirBase();
    return new Promise((resolve, reject) => {
      let transaction: IDBTransaction;
      try {
        transaction = base.transaction(MAGASIN_VERSIONS, "readonly");
      } catch (error) {
        reject(new HistoriqueChapitreError("Lecture de l'historique impossible.", error));
        return;
      }
      const requete = transaction.objectStore(MAGASIN_VERSIONS).index(INDEX_CHAPITRE_DATE).getAll(plageChapitre(chapitreId));
      requete.onsuccess = () => resolve(trierVersions((requete.result as unknown[]).filter(versionValide)));
      transaction.onerror = () => reject(new HistoriqueChapitreError("Lecture de l'historique impossible.", transaction.error));
      transaction.onabort = () => reject(new HistoriqueChapitreError("Lecture de l'historique interrompue.", transaction.error));
    });
  },

  // Résout uniquement à l'achèvement (`complete`) de la transaction : la
  // version est alors persistée. Toute erreur (dont QuotaExceededError)
  // rejette la promesse ; rien n'est simulé.
  async ajouterVersion(chapitreId, contenu, motif) {
    const base = await ouvrirBase();
    return new Promise((resolve, reject) => {
      let transaction: IDBTransaction;
      try {
        transaction = base.transaction(MAGASIN_VERSIONS, "readwrite", { durability: "strict" });
      } catch (error) {
        reject(new HistoriqueChapitreError("Écriture de l'historique impossible.", error));
        return;
      }
      const magasin = transaction.objectStore(MAGASIN_VERSIONS);
      let version: VersionChapitreManuscrit | null = null;
      const cles = magasin.index(INDEX_CHAPITRE_DATE).getAllKeys(plageChapitre(chapitreId));
      cles.onsuccess = () => {
        const sequenceMax = (cles.result as IDBValidKey[]).reduce<number>(
          (max, cle) => (typeof cle === "string" ? Math.max(max, sequenceDepuisId(cle)) : max),
          -1,
        );
        version = {
          id: idVersion(chapitreId, sequenceMax + 1),
          chapitreId,
          contenu,
          archiveLe: new Date().toISOString(),
          motif,
        };
        magasin.add(version);
      };
      transaction.oncomplete = () => {
        if (version) resolve(version);
        else reject(new HistoriqueChapitreError("Écriture de l'historique non confirmée."));
      };
      transaction.onerror = () => reject(new HistoriqueChapitreError("Écriture de l'historique impossible.", transaction.error));
      transaction.onabort = () => reject(new HistoriqueChapitreError("Écriture de l'historique interrompue.", transaction.error));
    });
  },
};

let depotActif: DepotHistoriqueChapitres = depotHistoriqueIndexedDB;

export function depotHistorique(): DepotHistoriqueChapitres {
  return depotActif;
}

// Tests uniquement : injecter un dépôt (ex. défaillant) ou revenir au dépôt
// IndexedDB réel, et oublier la connexion ouverte.
export function __definirDepotHistoriquePourTests(depot: DepotHistoriqueChapitres | null) {
  depotActif = depot ?? depotHistoriqueIndexedDB;
  baseOuverte = null;
}

// ─── Règle D1 (pure) ───────────────────────────────────────────────────────

export type EtatSeanceEdition = {
  premiereModificationFaite: boolean;
  dernierContenuEcrit: string | null;
};

// Décide si le contenu courant persisté doit être archivé AVANT d'être
// remplacé par `nouveauContenu`. `null` = aucune version.
//
// - Aucun contenu à protéger (absent ou vide) ou contenu inchangé → aucune version.
// - Contenu déjà identique à la dernière version persistée → jamais dupliqué.
// - Première modification réelle de la séance → `debut-seance`.
// - Contenu persisté différent de ce que la séance a écrit → `conflit`.
// - Checkpoint : ≥ 5 min depuis l'`archiveLe` de la dernière version persistée,
//   ou écart négatif (recul d'horloge), ou horodatage illisible, ou aucune
//   version persistée (aucune référence temporelle : interprétation protectrice).
export function deciderArchivageAvantEcriture(params: {
  contenuCourant: string | null;
  nouveauContenu: string;
  derniereVersion: VersionChapitreManuscrit | undefined;
  seance: EtatSeanceEdition;
  maintenant: number;
}): MotifVersionChapitre | null {
  const { contenuCourant, nouveauContenu, derniereVersion, seance, maintenant } = params;
  if (!contenuCourant) return null;
  if (contenuCourant === nouveauContenu) return null;
  if (derniereVersion && derniereVersion.contenu === contenuCourant) return null;
  if (!seance.premiereModificationFaite) return "debut-seance";
  if (seance.dernierContenuEcrit !== contenuCourant) return "conflit";
  if (!derniereVersion) return "checkpoint";
  const ecart = maintenant - Date.parse(derniereVersion.archiveLe);
  if (!Number.isFinite(ecart) || ecart < 0 || ecart >= DELAI_CHECKPOINT_MS) return "checkpoint";
  return null;
}

// STD-005 LIVRE-P1B-D1 (`T_confirmé`) et D2 (« Échec de lecture de
// l'historique ») — repli autorisé lorsque la lecture IndexedDB échoue.
// `tConfirme` : horodatage (ms) de la dernière version persistée confirmée
// pendant la séance courante (lecture réussie ou archive `complete`), `null`
// si aucun. Ne sert qu'à prouver qu'un checkpoint n'est PAS ENCORE requis :
// toute condition manquante ou tout écart non fiable → `false` (blocage).
export function repliLectureHistoriqueAutorise(params: {
  contenuCourant: string | null;
  nouveauContenu: string;
  seance: EtatSeanceEdition & { tConfirme: number | null };
  maintenant: number;
}): boolean {
  const { contenuCourant, nouveauContenu, seance, maintenant } = params;
  if (!contenuCourant || contenuCourant === nouveauContenu) return false;
  if (!seance.premiereModificationFaite) return false;
  if (seance.dernierContenuEcrit !== contenuCourant) return false;
  if (seance.tConfirme === null) return false;
  const ecart = maintenant - seance.tConfirme;
  return Number.isFinite(ecart) && ecart >= 0 && ecart < DELAI_CHECKPOINT_MS;
}

// Archivage hors règle de temps (restauration, restauration complète) :
// uniquement un contenu non vide, jamais en double de la dernière version.
export function doitArchiverEtatCourant(
  contenuCourant: string | null,
  derniereVersion: VersionChapitreManuscrit | undefined,
): contenuCourant is string {
  return Boolean(contenuCourant) && derniereVersion?.contenu !== contenuCourant;
}
