import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

import { IDBFactory, IDBKeyRange } from "fake-indexeddb";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  ContenuChapitreEcritureError,
  SeanceEditionInvalideError,
  ajouterChapitreCanonique,
  archiverContenusCanoniquesAvantRestaurationComplete,
  cleContenuChapitre,
  cleEcritureLegacy,
  lireChapitresCanoniquesDuTome,
  lireContenuChapitre,
  lireHistoriqueChapitre,
  lireTextesLegacyNonAttribues,
  migrerChapitresLegacyP1A,
  ouvrirSeanceEdition,
  ouvrirSeanceEditionChapitre,
  renommerChapitreCanonique,
  reordonnerChapitresCanoniques,
  restaurerVersionChapitre,
  sauvegarderContenuChapitre,
  sauvegarderTexteChapitre,
  supprimerChapitreCanonique,
  lireChapitresStructureParTome,
} from "./manuscript-chapters";
import {
  DELAI_CHECKPOINT_MS,
  HistoriqueChapitreError,
  __definirDepotHistoriquePourTests,
  deciderArchivageAvantEcriture,
  depotHistoriqueIndexedDB,
  type DepotHistoriqueChapitres,
} from "./manuscript-chapters-history";
import { STRUCTURE_CHAPITRES_STORAGE_KEY } from "./manuscript-structure";
import { CHAPITRES_TOME_1_STORAGE_KEY } from "./tome1-chapters";

function createMemoryLocalStorage(): Storage {
  const store = new Map<string, string>();
  return {
    get length() {
      return store.size;
    },
    clear: () => store.clear(),
    getItem: (key: string) => (store.has(key) ? (store.get(key) as string) : null),
    key: (index: number) => Array.from(store.keys())[index] ?? null,
    removeItem: (key: string) => {
      store.delete(key);
    },
    setItem: (key: string, value: string) => {
      store.set(key, value);
    },
  };
}

function source(relativePath: string) {
  return readFileSync(fileURLToPath(new URL(`../${relativePath}`, import.meta.url)), "utf8");
}

const T0 = Date.parse("2026-10-03T10:00:00.000Z");
const MINUTE = 60 * 1000;

function a(ms: number) {
  vi.setSystemTime(T0 + ms);
}

function erreurQuota() {
  return new DOMException("Quota dépassé", "QuotaExceededError");
}

// Dépôt réel (IndexedDB simulé) instrumenté : compte les écritures.
function depotEspion(base: DepotHistoriqueChapitres = depotHistoriqueIndexedDB) {
  const appels = { lister: 0, ajouter: 0 };
  const depot: DepotHistoriqueChapitres = {
    listerVersions: (id) => {
      appels.lister += 1;
      return base.listerVersions(id);
    },
    ajouterVersion: (id, contenu, motif) => {
      appels.ajouter += 1;
      return base.ajouterVersion(id, contenu, motif);
    },
  };
  return { depot, appels };
}

function chapitre(titre = "Chapitre P1B") {
  return ajouterChapitreCanonique(2, titre);
}

// Contenu courant déjà présent avant la séance (ex. importé par P1A).
function contenuExistant(id: string, texte: string) {
  localStorage.setItem(cleContenuChapitre(id), texte);
}

async function contenus(id: string) {
  return (await lireHistoriqueChapitre(id)).map((v) => v.contenu);
}

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["Date"] });
  a(0);
  (globalThis as { indexedDB?: unknown }).indexedDB = new IDBFactory();
  (globalThis as { IDBKeyRange?: unknown }).IDBKeyRange = IDBKeyRange;
  __definirDepotHistoriquePourTests(null);
  const memoryLocalStorage = createMemoryLocalStorage();
  (globalThis as { window?: unknown }).window = { localStorage: memoryLocalStorage };
  (globalThis as { localStorage?: unknown }).localStorage = memoryLocalStorage;
});

afterEach(() => {
  vi.useRealTimers();
  __definirDepotHistoriquePourTests(null);
  delete (globalThis as { window?: unknown }).window;
  delete (globalThis as { localStorage?: unknown }).localStorage;
  delete (globalThis as { indexedDB?: unknown }).indexedDB;
});

describe("LIVRE-P1B — versions et séances (D1)", () => {
  it("1. A→B : le début de séance protège A avant de l'écraser", async () => {
    const c = chapitre();
    contenuExistant(c.id, "A");
    const resultat = await sauvegarderContenuChapitre(c.id, "B", ouvrirSeanceEdition(c.id));
    expect(lireContenuChapitre(c.id)).toBe("B");
    expect(resultat.version).toMatchObject({ chapitreId: c.id, contenu: "A", motif: "debut-seance" });
    expect(await contenus(c.id)).toEqual(["A"]);
  });

  it("2. B→C : les versions précédentes sont conservées", async () => {
    const c = chapitre();
    contenuExistant(c.id, "A");
    const s = ouvrirSeanceEdition(c.id);
    await sauvegarderContenuChapitre(c.id, "B", s);
    a(5 * MINUTE);
    await sauvegarderContenuChapitre(c.id, "C", s);
    expect(lireContenuChapitre(c.id)).toBe("C");
    expect(await contenus(c.id)).toEqual(["A", "B"]);
  });

  it("3. contenu inchangé → aucune version, aucune écriture d'historique", async () => {
    const c = chapitre();
    contenuExistant(c.id, "A");
    const { depot, appels } = depotEspion();
    __definirDepotHistoriquePourTests(depot);
    const resultat = await sauvegarderContenuChapitre(c.id, "A", ouvrirSeanceEdition(c.id));
    expect(resultat).toEqual({ ecrit: false, version: null, historiqueIndisponible: false });
    expect(appels.ajouter).toBe(0);
    expect(await contenus(c.id)).toEqual([]);
  });

  it("4. sauvegardes automatiques rapprochées (600 ms) → pas une version par sauvegarde", async () => {
    const c = chapitre();
    contenuExistant(c.id, "départ");
    const s = ouvrirSeanceEdition(c.id);
    for (let i = 1; i <= 100; i += 1) {
      a(i * 600); // 100 sauvegardes sur 60 s
      await sauvegarderContenuChapitre(c.id, `texte ${i}`, s);
    }
    expect(lireContenuChapitre(c.id)).toBe("texte 100");
    expect(await contenus(c.id)).toEqual(["départ"]);
  });

  it("5. checkpoint après 5 minutes lorsque le contenu a changé", async () => {
    const c = chapitre();
    contenuExistant(c.id, "A");
    const s = ouvrirSeanceEdition(c.id);
    await sauvegarderContenuChapitre(c.id, "B", s); // début de séance (A) à T0
    a(DELAI_CHECKPOINT_MS - 1);
    await sauvegarderContenuChapitre(c.id, "C", s);
    expect(await contenus(c.id)).toEqual(["A"]);
    a(DELAI_CHECKPOINT_MS);
    const r = await sauvegarderContenuChapitre(c.id, "D", s);
    expect(r.version).toMatchObject({ contenu: "C", motif: "checkpoint" });
    expect(await contenus(c.id)).toEqual(["A", "C"]);
  });

  it("6. pas de checkpoint temporel si le contenu à protéger est déjà la dernière version, ni si rien ne change", async () => {
    const c = chapitre();
    contenuExistant(c.id, "A");
    const s = ouvrirSeanceEdition(c.id);
    await sauvegarderContenuChapitre(c.id, "B", s);
    await sauvegarderContenuChapitre(c.id, "A", s); // courant = A = dernière version
    a(10 * MINUTE);
    await sauvegarderContenuChapitre(c.id, "A", s); // inchangé
    await sauvegarderContenuChapitre(c.id, "Z", s); // A déjà archivé → aucun doublon
    expect(await contenus(c.id)).toEqual(["A"]);
  });

  it("7/8. la règle des 5 minutes lit l'horodatage persisté : un rechargement ne la réinitialise pas", async () => {
    const c = chapitre();
    contenuExistant(c.id, "A");
    const s1 = ouvrirSeanceEdition(c.id);
    await sauvegarderContenuChapitre(c.id, "B", s1); // version A, archivée à T0
    a(1 * MINUTE);
    await sauvegarderContenuChapitre(c.id, "A", s1); // courant redevient A (déjà archivé)

    // « Rechargement » : nouvelle séance, connexion IndexedDB rouverte.
    __definirDepotHistoriquePourTests(null);
    a(2 * MINUTE);
    const s2 = ouvrirSeanceEdition(c.id);
    await sauvegarderContenuChapitre(c.id, "E", s2); // A déjà archivé → aucune version
    a(3 * MINUTE);
    await sauvegarderContenuChapitre(c.id, "F", s2);
    expect(await contenus(c.id)).toEqual(["A"]);
    // 5 min après T0 (horodatage persisté), et non 5 min après la nouvelle séance.
    a(5 * MINUTE + 30 * 1000);
    const r = await sauvegarderContenuChapitre(c.id, "G", s2);
    expect(r.version).toMatchObject({ contenu: "F", motif: "checkpoint" });
    expect(await contenus(c.id)).toEqual(["A", "F"]);
  });

  it("nouvelle séance (rechargement, changement de chapitre) : l'état laissé par la séance précédente est protégé", async () => {
    const c = chapitre();
    contenuExistant(c.id, "A");
    const s1 = ouvrirSeanceEdition(c.id);
    await sauvegarderContenuChapitre(c.id, "B", s1);
    a(1 * MINUTE);
    const s2 = ouvrirSeanceEdition(c.id);
    const r = await sauvegarderContenuChapitre(c.id, "C", s2);
    expect(r.version).toMatchObject({ contenu: "B", motif: "debut-seance" });
    expect(await contenus(c.id)).toEqual(["A", "B"]);
  });

  it("chapitre vide au départ : aucune version du vide ; le premier état écrit est protégé à la sauvegarde suivante", async () => {
    const c = chapitre();
    const s = ouvrirSeanceEdition(c.id);
    await sauvegarderContenuChapitre(c.id, "premiers mots", s);
    expect(await contenus(c.id)).toEqual([]);
    a(600);
    await sauvegarderContenuChapitre(c.id, "premiers mots, suite", s);
    expect(await contenus(c.id)).toEqual(["premiers mots"]);
    a(1200);
    await sauvegarderContenuChapitre(c.id, "premiers mots, suite encore", s);
    expect(await contenus(c.id)).toEqual(["premiers mots"]);
  });

  it("recul de l'horloge système → checkpoint (écart négatif)", async () => {
    const c = chapitre();
    contenuExistant(c.id, "A");
    const s = ouvrirSeanceEdition(c.id);
    await sauvegarderContenuChapitre(c.id, "B", s);
    a(-1 * MINUTE);
    const r = await sauvegarderContenuChapitre(c.id, "C", s);
    expect(r.version).toMatchObject({ contenu: "B", motif: "checkpoint" });
  });

  it("écriture concurrente (autre séance) → l'état écrit par l'autre est archivé avant d'être remplacé", async () => {
    const c = chapitre();
    contenuExistant(c.id, "A");
    const s1 = ouvrirSeanceEdition(c.id);
    const s2 = ouvrirSeanceEdition(c.id);
    await sauvegarderContenuChapitre(c.id, "B", s1);
    a(10 * 1000);
    await sauvegarderContenuChapitre(c.id, "X", s2); // début de séance s2 : archive B
    a(20 * 1000);
    const r = await sauvegarderContenuChapitre(c.id, "C", s1);
    expect(r.version).toMatchObject({ contenu: "X", motif: "conflit" });
    expect(await contenus(c.id)).toEqual(["A", "B", "X"]);
  });

  it("écritures non attendues d'un même chapitre : sérialisées, dans l'ordre", async () => {
    const c = chapitre();
    contenuExistant(c.id, "A");
    const s = ouvrirSeanceEdition(c.id);
    await Promise.all([
      sauvegarderContenuChapitre(c.id, "B", s),
      sauvegarderContenuChapitre(c.id, "C", s),
      sauvegarderContenuChapitre(c.id, "D", s),
    ]);
    expect(lireContenuChapitre(c.id)).toBe("D");
    expect(await contenus(c.id)).toEqual(["A"]);
  });

  it("séance absente, inconnue ou d'un autre chapitre → écriture refusée, rien n'est écrit", async () => {
    const c = chapitre();
    const autre = chapitre("Autre");
    contenuExistant(c.id, "A");
    await expect(sauvegarderContenuChapitre(c.id, "B", "jeton-inconnu")).rejects.toBeInstanceOf(SeanceEditionInvalideError);
    await expect(sauvegarderContenuChapitre(c.id, "B", ouvrirSeanceEdition(autre.id))).rejects.toBeInstanceOf(
      SeanceEditionInvalideError,
    );
    const lu = lireChapitresStructureParTome()[2].find((x) => x.id === c.id)!;
    await expect(sauvegarderTexteChapitre(lu, "B", null)).rejects.toBeInstanceOf(SeanceEditionInvalideError);
    expect(lireContenuChapitre(c.id)).toBe("A");
    expect(await contenus(c.id)).toEqual([]);
  });

  it("règle pure : aucune version pour un contenu absent ou vide", () => {
    const seance = { premiereModificationFaite: false, dernierContenuEcrit: null };
    expect(deciderArchivageAvantEcriture({ contenuCourant: null, nouveauContenu: "x", derniereVersion: undefined, seance, maintenant: T0 })).toBeNull();
    expect(deciderArchivageAvantEcriture({ contenuCourant: "", nouveauContenu: "x", derniereVersion: undefined, seance, maintenant: T0 })).toBeNull();
  });
});

describe("LIVRE-P1B — identité par chapterId", () => {
  it("9. renommer ne fait perdre aucune version", async () => {
    const c = chapitre("Avant");
    contenuExistant(c.id, "A");
    await sauvegarderContenuChapitre(c.id, "B", ouvrirSeanceEdition(c.id));
    renommerChapitreCanonique(c.id, "Après");
    expect(await contenus(c.id)).toEqual(["A"]);
    a(1 * MINUTE);
    await sauvegarderContenuChapitre(c.id, "C", ouvrirSeanceEdition(c.id));
    expect(await contenus(c.id)).toEqual(["A", "B"]);
  });

  it("10. réordonner ne fait perdre aucune version", async () => {
    const c = chapitre();
    contenuExistant(c.id, "A");
    await sauvegarderContenuChapitre(c.id, "B", ouvrirSeanceEdition(c.id));
    const ids = lireChapitresCanoniquesDuTome(2).map((x) => x.id);
    reordonnerChapitresCanoniques(2, [...ids].reverse());
    expect(await contenus(c.id)).toEqual(["A"]);
  });

  it("11. versions indexées par chapterId, sans titre stocké", async () => {
    const c = chapitre("Titre visible");
    contenuExistant(c.id, "A");
    await sauvegarderContenuChapitre(c.id, "B", ouvrirSeanceEdition(c.id));
    const [version] = await lireHistoriqueChapitre(c.id);
    expect(Object.keys(version).sort()).toEqual(["archiveLe", "chapitreId", "contenu", "id", "motif"]);
    expect(version.chapitreId).toBe(c.id);
    expect(version.id.startsWith(`${c.id}#`)).toBe(true);
    expect(JSON.stringify(version)).not.toContain("Titre visible");
  });

  it("12. deux chapitres de même titre (homonymes legacy) gardent des historiques indépendants", async () => {
    localStorage.setItem(STRUCTURE_CHAPITRES_STORAGE_KEY, JSON.stringify({ 2: ["Doublon", "Doublon"] }));
    const [d1, d2] = lireChapitresCanoniquesDuTome(2);
    expect(d1.titre).toBe(d2.titre);
    contenuExistant(d1.id, "texte 1");
    contenuExistant(d2.id, "texte 2");
    await sauvegarderContenuChapitre(d1.id, "texte 1 bis", ouvrirSeanceEdition(d1.id));
    expect(await contenus(d1.id)).toEqual(["texte 1"]);
    expect(await contenus(d2.id)).toEqual([]);
    await sauvegarderContenuChapitre(d2.id, "texte 2 bis", ouvrirSeanceEdition(d2.id));
    expect(await contenus(d1.id)).toEqual(["texte 1"]);
    expect(await contenus(d2.id)).toEqual(["texte 2"]);
  });

  it("24. isolation complète : écrire et restaurer un chapitre ne touche jamais l'historique d'un autre", async () => {
    const x = chapitre("X");
    const y = chapitre("Y");
    contenuExistant(x.id, "x0");
    contenuExistant(y.id, "y0");
    await sauvegarderContenuChapitre(y.id, "y1", ouvrirSeanceEdition(y.id));
    const avantY = await lireHistoriqueChapitre(y.id);
    const sx = ouvrirSeanceEdition(x.id);
    await sauvegarderContenuChapitre(x.id, "x1", sx);
    a(6 * MINUTE);
    await sauvegarderContenuChapitre(x.id, "x2", sx);
    const [vx] = await lireHistoriqueChapitre(x.id);
    await restaurerVersionChapitre(x.id, vx.id);
    expect(await lireHistoriqueChapitre(y.id)).toEqual(avantY);
    expect(lireContenuChapitre(y.id)).toBe("y1");
    await expect(restaurerVersionChapitre(y.id, vx.id)).rejects.toThrow();
    expect(lireContenuChapitre(y.id)).toBe("y1");
  });

  it("23. ordre historique déterministe (séquence d'insertion), même à horodatage identique", async () => {
    const c = chapitre();
    contenuExistant(c.id, "v0");
    for (let i = 1; i <= 5; i += 1) {
      // Nouvelle séance à chaque fois, sans avancer l'horloge.
      await sauvegarderContenuChapitre(c.id, `v${i}`, ouvrirSeanceEdition(c.id));
    }
    const premiere = await lireHistoriqueChapitre(c.id);
    expect(premiere.map((v) => v.contenu)).toEqual(["v0", "v1", "v2", "v3", "v4"]);
    expect(new Set(premiere.map((v) => v.archiveLe)).size).toBe(1);
    __definirDepotHistoriquePourTests(null);
    expect(await lireHistoriqueChapitre(c.id)).toEqual(premiere);
    expect(premiere.map((v) => v.id)).toEqual([...premiere.map((v) => v.id)].sort());
  });
});

describe("LIVRE-P1B — legacy et P1A", () => {
  it("13. un chapitre sans historique reste lisible", async () => {
    const c = chapitre();
    contenuExistant(c.id, "texte existant");
    expect(lireContenuChapitre(c.id)).toBe("texte existant");
    expect(await lireHistoriqueChapitre(c.id)).toEqual([]);
  });

  it("14. migration legacy : aucune version inventée ; seul un état réellement observé est archivé à la première modification", async () => {
    localStorage.setItem(STRUCTURE_CHAPITRES_STORAGE_KEY, JSON.stringify({ 2: ["Les amis"], 3: ["Doublon", "Doublon"] }));
    localStorage.setItem(cleEcritureLegacy(2, "Les amis"), "Texte des amis");
    localStorage.setItem(cleEcritureLegacy(3, "Doublon"), "Texte ambigu");
    const { depot, appels } = depotEspion();
    __definirDepotHistoriquePourTests(depot);
    const etat = migrerChapitresLegacyP1A()!;
    expect(appels).toEqual({ lister: 0, ajouter: 0 });
    for (const c of etat.chapitres) expect(await lireHistoriqueChapitre(c.id)).toEqual([]);

    const amis = etat.chapitres.find((c) => c.titre === "Les amis")!;
    await sauvegarderContenuChapitre(amis.id, "édité", ouvrirSeanceEdition(amis.id));
    expect(await contenus(amis.id)).toEqual(["Texte des amis"]);
    // Texte ambigu : jamais rattaché à un historique, toujours lisible tel quel.
    const doublons = etat.chapitres.filter((c) => c.titre === "Doublon");
    for (const d of doublons) expect(await lireHistoriqueChapitre(d.id)).toEqual([]);
    expect(lireTextesLegacyNonAttribues().map((t) => t.texte)).toEqual(["Texte ambigu"]);
    expect(localStorage.getItem(cleEcritureLegacy(2, "Les amis"))).toBe("Texte des amis");
  });

  it("21. opérations de structure seules (ajout, renommage, réordonnancement, suppression) → aucune version", async () => {
    const { depot, appels } = depotEspion();
    __definirDepotHistoriquePourTests(depot);
    const c = chapitre("Structure");
    contenuExistant(c.id, "A");
    renommerChapitreCanonique(c.id, "Structure 2");
    const ids = lireChapitresCanoniquesDuTome(2).map((x) => x.id);
    reordonnerChapitresCanoniques(2, [...ids].reverse());
    supprimerChapitreCanonique(c.id);
    expect(appels).toEqual({ lister: 0, ajouter: 0 });
    expect(lireContenuChapitre(c.id)).toBe("A");
  });

  it("Tome 1 : écriture legacy inchangée, sans séance ni historique", async () => {
    localStorage.setItem(CHAPITRES_TOME_1_STORAGE_KEY, JSON.stringify([{ id: "chapitre-1", contenu: "Canon T1" }]));
    const { depot, appels } = depotEspion();
    __definirDepotHistoriquePourTests(depot);
    const maison = lireChapitresStructureParTome()[1][0];
    expect(ouvrirSeanceEditionChapitre(maison)).toBeNull();
    await sauvegarderTexteChapitre(maison, "texte T1", null);
    expect(localStorage.getItem(cleEcritureLegacy(1, maison.titre))).toBe("texte T1");
    expect(localStorage.getItem(CHAPITRES_TOME_1_STORAGE_KEY)).toBe(JSON.stringify([{ id: "chapitre-1", contenu: "Canon T1" }]));
    expect(appels).toEqual({ lister: 0, ajouter: 0 });
  });
});

describe("LIVRE-P1B — restauration non destructive", () => {
  async function chapitreABC() {
    const c = chapitre();
    contenuExistant(c.id, "A");
    const s = ouvrirSeanceEdition(c.id);
    await sauvegarderContenuChapitre(c.id, "B", s);
    a(5 * MINUTE);
    await sauvegarderContenuChapitre(c.id, "C", s);
    return c; // historique [A, B], courant C
  }

  it("15/16. restaurer A depuis C : C est archivé, toutes les versions restent (y compris A)", async () => {
    const c = await chapitreABC();
    const [versionA] = await lireHistoriqueChapitre(c.id);
    const r = await restaurerVersionChapitre(c.id, versionA.id);
    expect(lireContenuChapitre(c.id)).toBe("A");
    expect(r.version).toMatchObject({ contenu: "C", motif: "restauration" });
    const apres = await lireHistoriqueChapitre(c.id);
    expect(apres.map((v) => v.contenu)).toEqual(["A", "B", "C"]);
    expect(apres[0]).toEqual(versionA);
  });

  it("17. restaurations répétées : rien n'est perdu, et une restauration peut être annulée", async () => {
    const c = await chapitreABC();
    const [versionA, versionB] = await lireHistoriqueChapitre(c.id);
    await restaurerVersionChapitre(c.id, versionA.id); // courant A, archive C
    const sansEffet = await restaurerVersionChapitre(c.id, versionA.id); // déjà courant
    expect(sansEffet).toEqual({ ecrit: false, version: null, historiqueIndisponible: false });
    await restaurerVersionChapitre(c.id, versionB.id); // courant B ; A est déjà la…
    expect(lireContenuChapitre(c.id)).toBe("B");
    const historique = await lireHistoriqueChapitre(c.id);
    // A n'est pas dupliqué (déjà présent comme première version ? non : dernière version = C).
    expect(historique.map((v) => v.contenu)).toEqual(["A", "B", "C", "A"]);
    // Annuler : restaurer l'état courant d'avant (C).
    const versionC = historique[2];
    await restaurerVersionChapitre(c.id, versionC.id);
    expect(lireContenuChapitre(c.id)).toBe("C");
    expect((await contenus(c.id)).slice(0, 4)).toEqual(["A", "B", "C", "A"]);
  });

  it("une restauration recommence la séance : la sauvegarde suivante protège l'état restauré", async () => {
    const c = chapitre();
    contenuExistant(c.id, "A");
    const s = ouvrirSeanceEdition(c.id);
    await sauvegarderContenuChapitre(c.id, "B", s);
    const [versionA] = await lireHistoriqueChapitre(c.id);
    await restaurerVersionChapitre(c.id, versionA.id); // archive B
    a(30 * 1000);
    await sauvegarderContenuChapitre(c.id, "après restauration", s);
    // Nouvelle séance : l'état restauré A (dernière version = B) est archivé avant d'être remplacé.
    expect(await contenus(c.id)).toEqual(["A", "B", "A"]);
  });

  it("restauration refusée pour une version inconnue ou un chapitre absent de la structure", async () => {
    const c = await chapitreABC();
    await expect(restaurerVersionChapitre(c.id, "inconnue")).rejects.toThrow();
    expect(lireContenuChapitre(c.id)).toBe("C");
    const [versionA] = await lireHistoriqueChapitre(c.id);
    supprimerChapitreCanonique(c.id);
    await expect(restaurerVersionChapitre(c.id, versionA.id)).rejects.toThrow();
    expect(lireContenuChapitre(c.id)).toBe("C");
  });
});

describe("LIVRE-P1B — fail-closed (D2)", () => {
  it("18. IndexedDB indisponible alors qu'une archive est requise → courant non écrasé, erreur explicite", async () => {
    const c = chapitre();
    contenuExistant(c.id, "A protéger");
    delete (globalThis as { indexedDB?: unknown }).indexedDB;
    __definirDepotHistoriquePourTests(null);
    await expect(sauvegarderContenuChapitre(c.id, "nouveau", ouvrirSeanceEdition(c.id))).rejects.toBeInstanceOf(
      HistoriqueChapitreError,
    );
    expect(lireContenuChapitre(c.id)).toBe("A protéger");
  });

  it("aucune archive requise (chapitre vide) → l'écriture n'exige pas IndexedDB", async () => {
    const c = chapitre();
    delete (globalThis as { indexedDB?: unknown }).indexedDB;
    __definirDepotHistoriquePourTests(null);
    await sauvegarderContenuChapitre(c.id, "premiers mots", ouvrirSeanceEdition(c.id));
    expect(lireContenuChapitre(c.id)).toBe("premiers mots");
  });

  it("19. QuotaExceededError à l'archivage → courant non écrasé, erreur de quota explicite, aucune version supprimée", async () => {
    const c = chapitre();
    contenuExistant(c.id, "A");
    const s = ouvrirSeanceEdition(c.id);
    await sauvegarderContenuChapitre(c.id, "B", s);
    const avant = await lireHistoriqueChapitre(c.id);
    __definirDepotHistoriquePourTests({
      listerVersions: (id) => depotHistoriqueIndexedDB.listerVersions(id),
      ajouterVersion: async () => {
        throw new HistoriqueChapitreError("Écriture de l'historique impossible.", erreurQuota());
      },
    });
    a(6 * MINUTE);
    const echec = sauvegarderContenuChapitre(c.id, "C", s);
    await expect(echec).rejects.toBeInstanceOf(HistoriqueChapitreError);
    await expect(echec).rejects.toMatchObject({ estQuota: true });
    expect(lireContenuChapitre(c.id)).toBe("B");
    expect(await depotHistoriqueIndexedDB.listerVersions(c.id)).toEqual(avant);
  });

  it("20. archive réussie puis écriture courante en échec → archive conservée, erreur explicite, nouvelle tentative sans doublon", async () => {
    const c = chapitre();
    contenuExistant(c.id, "A");
    const storage = localStorage;
    const setItem = storage.setItem.bind(storage);
    storage.setItem = (key: string, value: string) => {
      if (key === cleContenuChapitre(c.id)) throw erreurQuota();
      setItem(key, value);
    };
    const s = ouvrirSeanceEdition(c.id);
    const echec = sauvegarderContenuChapitre(c.id, "B", s);
    await expect(echec).rejects.toBeInstanceOf(ContenuChapitreEcritureError);
    await expect(echec).rejects.toMatchObject({ estQuota: true });
    expect(lireContenuChapitre(c.id)).toBe("A");
    expect(await contenus(c.id)).toEqual(["A"]);
    storage.setItem = setItem;
    await sauvegarderContenuChapitre(c.id, "B", s);
    expect(lireContenuChapitre(c.id)).toBe("B");
    expect(await contenus(c.id)).toEqual(["A"]);
  });

  it("contenu modifié pendant l'archivage (autre onglet) → règle réévaluée, rien n'est écrasé sans archive", async () => {
    const c = chapitre();
    contenuExistant(c.id, "A");
    let interferer = true;
    __definirDepotHistoriquePourTests({
      listerVersions: (id) => depotHistoriqueIndexedDB.listerVersions(id),
      ajouterVersion: async (id, contenu, motif) => {
        const v = await depotHistoriqueIndexedDB.ajouterVersion(id, contenu, motif);
        if (interferer) {
          interferer = false;
          localStorage.setItem(cleContenuChapitre(id), "écrit par un autre onglet");
        }
        return v;
      },
    });
    await sauvegarderContenuChapitre(c.id, "mon texte", ouvrirSeanceEdition(c.id));
    expect(lireContenuChapitre(c.id)).toBe("mon texte");
    expect(await contenus(c.id)).toEqual(["A", "écrit par un autre onglet"]);
  });
});

describe("LIVRE-P1B — BackupManager (D2)", () => {
  it("archive le contenu courant de chaque chapitre canonique avant restauration complète, sans doublon", async () => {
    const x = chapitre("X");
    const y = chapitre("Y");
    const vide = chapitre("Vide");
    contenuExistant(x.id, "x courant");
    contenuExistant(y.id, "y0");
    contenuExistant(vide.id, "");
    await sauvegarderContenuChapitre(y.id, "y1", ouvrirSeanceEdition(y.id));
    await restaurerVersionChapitre(y.id, (await lireHistoriqueChapitre(y.id))[0].id); // courant y0, dernière version y1
    expect(await archiverContenusCanoniquesAvantRestaurationComplete()).toBe(2);
    expect((await lireHistoriqueChapitre(x.id)).map((v) => [v.contenu, v.motif])).toEqual([["x courant", "restauration-complete"]]);
    expect((await lireHistoriqueChapitre(y.id)).at(-1)).toMatchObject({ contenu: "y0", motif: "restauration-complete" });
    expect(await lireHistoriqueChapitre(vide.id)).toEqual([]);
    // Répété : rien de plus (déjà la dernière version).
    expect(await archiverContenusCanoniquesAvantRestaurationComplete()).toBe(0);
  });

  it("échec d'archivage → rejet (BackupManager annule), contenus intacts", async () => {
    const x = chapitre("X");
    contenuExistant(x.id, "x courant");
    delete (globalThis as { indexedDB?: unknown }).indexedDB;
    __definirDepotHistoriquePourTests(null);
    await expect(archiverContenusCanoniquesAvantRestaurationComplete()).rejects.toBeInstanceOf(HistoriqueChapitreError);
    expect(lireContenuChapitre(x.id)).toBe("x courant");
  });

  it("l'historique survit à une restauration complète de localStorage (clear + setItem)", async () => {
    const c = chapitre();
    contenuExistant(c.id, "A");
    await sauvegarderContenuChapitre(c.id, "B", ouvrirSeanceEdition(c.id));
    const sauvegarde: Record<string, string> = {};
    for (let i = 0; i < localStorage.length; i += 1) {
      const k = localStorage.key(i) as string;
      sauvegarde[k] = localStorage.getItem(k) as string;
    }
    await archiverContenusCanoniquesAvantRestaurationComplete();
    localStorage.clear();
    Object.entries(sauvegarde).forEach(([k, v]) => localStorage.setItem(k, v));
    expect(lireContenuChapitre(c.id)).toBe("B");
    expect(await contenus(c.id)).toEqual(["A", "B"]);
  });
});

describe("LIVRE-P1B — writers applicatifs (22)", () => {
  const FICHIERS = [
    "app/vue-double/page.tsx",
    "app/structure/page.tsx",
    "app/fragments/page.tsx",
    "app/lecture/page.tsx",
    "app/tableau/page.tsx",
    "lib/narrative-relations.ts",
    "lib/livre-companion.ts",
    "components/ControleEditorial.tsx",
    "components/SilenceNarratif.tsx",
    "components/Dashboard.tsx",
    "components/BackupManager.tsx",
    "app/biographie/inventaire/page.tsx",
    "app/biographie/strategie/page.tsx",
  ];

  it("aucun consommateur n'écrit directement le contenu canonique ni n'ouvre IndexedDB", () => {
    FICHIERS.forEach((fichier) => {
      const contenu = source(fichier);
      expect(contenu, fichier).not.toMatch(/setItem\([^)]*(cleContenuChapitre|CONTENU_CHAPITRE_PREFIX|contenu-chapitre-manuscrit)/);
      expect(contenu, fichier).not.toMatch(/indexedDB|strate-livre-historique/);
    });
  });

  it("le module central n'a qu'un seul point d'écriture du contenu courant (hors copie de migration si absent)", () => {
    const centrale = source("lib/manuscript-chapters.ts");
    expect(centrale.match(/localStorage\.setItem\(cleContenuChapitre\(/g)).toHaveLength(1);
    expect(centrale).toContain("if (texte !== null && localStorage.getItem(cle) === null) localStorage.setItem(cle, texte);");
    const history = source("lib/manuscript-chapters-history.ts");
    expect(history).not.toMatch(/localStorage\./);
    expect(history).not.toMatch(/\.put\(|\.delete\(|\.clear\(/);
  });

  it("/vue-double écrit via la primitive centrale avec une séance d'édition", () => {
    const vue = source("app/vue-double/page.tsx");
    expect(vue).toContain("ouvrirSeanceEditionChapitre(chapitreActifLu)");
    expect(vue).toMatch(/sauvegarderTexteChapitre\(chapitre, texte, jetonSeance\)/);
    expect(vue).toContain("Non sauvegardé");
  });

  it("BackupManager archive avant localStorage.clear() et annule en cas d'échec", () => {
    const backup = source("components/BackupManager.tsx");
    const archive = backup.indexOf("await archiverContenusCanoniquesAvantRestaurationComplete()");
    const clear = backup.indexOf("localStorage.clear()");
    expect(archive).toBeGreaterThan(-1);
    expect(archive).toBeLessThan(clear);
  });
});
