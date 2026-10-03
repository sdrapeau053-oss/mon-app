// LIVRE-P1B READ-FAILURE — repli sur échec de lecture de l'historique gouverné
// par `T_confirmé` (STD-005 LIVRE-P1B-D1 « `T_confirmé` », D2 « Échec de
// lecture de l'historique »).

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

import { IDBFactory, IDBKeyRange } from "fake-indexeddb";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  ContenuChapitreConcurrentError,
  ajouterChapitreCanonique,
  archiverContenusCanoniquesAvantRestaurationComplete,
  cleContenuChapitre,
  lireContenuChapitre,
  lireHistoriqueChapitre,
  ouvrirSeanceEdition,
  restaurerVersionChapitre,
  sauvegarderContenuChapitre,
} from "./manuscript-chapters";
import {
  BASE_HISTORIQUE_NOM,
  BASE_HISTORIQUE_VERSION,
  DELAI_CHECKPOINT_MS,
  HistoriqueChapitreError,
  MAGASIN_VERSIONS,
  __definirDepotHistoriquePourTests,
  depotHistoriqueIndexedDB,
  repliLectureHistoriqueAutorise,
  type DepotHistoriqueChapitres,
  type VersionChapitreManuscrit,
} from "./manuscript-chapters-history";

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

const T0 = Date.parse("2026-10-03T10:00:00.000Z");
const MINUTE = 60 * 1000;

function a(ms: number) {
  vi.setSystemTime(T0 + ms);
}

// Dépôt réel (IndexedDB simulé) piloté : lectures et/ou écritures en échec,
// action avant lecture (autre onglet), transformation des versions lues.
function depotPilote() {
  const etat = {
    lectureEnEchec: false,
    ecritureEnEchec: false,
    lecturesReussies: 0,
    avantLecture: null as null | (() => void),
    transformer: null as null | ((versions: VersionChapitreManuscrit[]) => VersionChapitreManuscrit[]),
  };
  const depot: DepotHistoriqueChapitres = {
    listerVersions: async (id) => {
      etat.avantLecture?.();
      if (etat.lectureEnEchec) throw new HistoriqueChapitreError("Lecture de l'historique impossible.");
      const versions = await depotHistoriqueIndexedDB.listerVersions(id);
      etat.lecturesReussies += 1;
      return etat.transformer ? etat.transformer(versions) : versions;
    },
    ajouterVersion: async (id, contenu, motif) => {
      if (etat.ecritureEnEchec) throw new HistoriqueChapitreError("Écriture de l'historique impossible.");
      return depotHistoriqueIndexedDB.ajouterVersion(id, contenu, motif);
    },
  };
  __definirDepotHistoriquePourTests(depot);
  return etat;
}

function chapitre(titre = "Chapitre RF") {
  return ajouterChapitreCanonique(2, titre);
}

function contenuExistant(id: string, texte: string) {
  localStorage.setItem(cleContenuChapitre(id), texte);
}

async function contenus(id: string) {
  return (await depotHistoriqueIndexedDB.listerVersions(id)).map((v) => v.contenu);
}

// Séance qui a déjà écrit, avec `T_confirmé` = T0 (archive `debut-seance` de A).
async function seanceConfirmee(etat: ReturnType<typeof depotPilote>) {
  const c = chapitre();
  contenuExistant(c.id, "A");
  const s = ouvrirSeanceEdition(c.id);
  await sauvegarderContenuChapitre(c.id, "B", s);
  expect(etat.lecturesReussies).toBe(1);
  return { c, s };
}

function ouvrirBaseBrute(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const requete = indexedDB.open(BASE_HISTORIQUE_NOM, BASE_HISTORIQUE_VERSION);
    requete.onsuccess = () => resolve(requete.result);
    requete.onerror = () => reject(requete.error);
  });
}

async function ecrireEntreeBrute(entree: Record<string, unknown>) {
  const base = await ouvrirBaseBrute();
  await new Promise<void>((resolve, reject) => {
    const tx = base.transaction(MAGASIN_VERSIONS, "readwrite");
    tx.objectStore(MAGASIN_VERSIONS).add(entree);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
  base.close();
}

async function lireEntreeBrute(id: string): Promise<unknown> {
  const base = await ouvrirBaseBrute();
  const valeur = await new Promise<unknown>((resolve, reject) => {
    const requete = base.transaction(MAGASIN_VERSIONS, "readonly").objectStore(MAGASIN_VERSIONS).get(id);
    requete.onsuccess = () => resolve(requete.result);
    requete.onerror = () => reject(requete.error);
  });
  base.close();
  return valeur;
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

describe("READ-FAILURE — repli autorisé par T_confirmé (< 5 min)", () => {
  it("1. lecture réussie + version récente : sauvegarde normale, aucune archive artificielle", async () => {
    const etat = depotPilote();
    const { c, s } = await seanceConfirmee(etat);
    a(30 * 1000);
    const r = await sauvegarderContenuChapitre(c.id, "C", s);
    expect(r).toEqual({ ecrit: true, version: null, historiqueIndisponible: false });
    expect(await contenus(c.id)).toEqual(["A"]);
  });

  it("2. lecture en échec + T_confirmé valide < 5 min : écriture autorisée, aucune version, panne signalée", async () => {
    const etat = depotPilote();
    const { c, s } = await seanceConfirmee(etat);
    a(1 * MINUTE);
    await sauvegarderContenuChapitre(c.id, "C", s); // lecture réussie : T_confirmé = T0 (A)
    etat.lectureEnEchec = true;
    a(2 * MINUTE);
    const r = await sauvegarderContenuChapitre(c.id, "D", s);
    expect(r).toEqual({ ecrit: true, version: null, historiqueIndisponible: true });
    expect(lireContenuChapitre(c.id)).toBe("D");
    expect(await contenus(c.id)).toEqual(["A"]);
  });

  it("4. borne des 5 minutes : autorisé juste avant, bloqué à 5 min et au-delà, contenu intact", async () => {
    const etat = depotPilote();
    const { c, s } = await seanceConfirmee(etat);
    etat.lectureEnEchec = true;
    a(DELAI_CHECKPOINT_MS - 1);
    await sauvegarderContenuChapitre(c.id, "C", s);
    a(DELAI_CHECKPOINT_MS);
    await expect(sauvegarderContenuChapitre(c.id, "D", s)).rejects.toBeInstanceOf(HistoriqueChapitreError);
    a(DELAI_CHECKPOINT_MS + 10 * MINUTE);
    await expect(sauvegarderContenuChapitre(c.id, "D", s)).rejects.toBeInstanceOf(HistoriqueChapitreError);
    expect(lireContenuChapitre(c.id)).toBe("C");
    expect(await contenus(c.id)).toEqual(["A"]);
  });

  it("9. une archive confirmée `complete` établit T_confirmé sans relecture", async () => {
    const etat = depotPilote();
    const { c, s } = await seanceConfirmee(etat); // seule lecture : aucune version ; T_confirmé vient de l'archive
    etat.lectureEnEchec = true;
    a(1 * MINUTE);
    const r = await sauvegarderContenuChapitre(c.id, "C", s);
    expect(r.historiqueIndisponible).toBe(true);
    expect(etat.lecturesReussies).toBe(1);
  });

  it("20. contenu inchangé pendant la panne : aucune lecture, aucune version", async () => {
    const etat = depotPilote();
    etat.lectureEnEchec = true;
    const c = chapitre();
    contenuExistant(c.id, "A");
    const r = await sauvegarderContenuChapitre(c.id, "A", ouvrirSeanceEdition(c.id));
    expect(r).toEqual({ ecrit: false, version: null, historiqueIndisponible: false });
    etat.lectureEnEchec = false;
    expect(await contenus(c.id)).toEqual([]);
  });
});

describe("READ-FAILURE — blocage (fail-closed)", () => {
  it("3. lecture en échec sans T_confirmé : écriture refusée", async () => {
    const etat = depotPilote();
    const c = chapitre();
    const s = ouvrirSeanceEdition(c.id);
    await sauvegarderContenuChapitre(c.id, "X", s); // chapitre vide : aucune lecture
    etat.lectureEnEchec = true;
    await expect(sauvegarderContenuChapitre(c.id, "XY", s)).rejects.toBeInstanceOf(HistoriqueChapitreError);
    expect(lireContenuChapitre(c.id)).toBe("X");
  });

  it("5. T_confirmé non exploitable (horodatage lu illisible) : écriture refusée", async () => {
    const etat = depotPilote();
    const { c, s } = await seanceConfirmee(etat);
    // Lecture réussie mais horodatage illisible : IndexedDB fait autorité (T_confirmé non fini).
    etat.transformer = (versions) => versions.map((v) => ({ ...v, archiveLe: "pas une date" }));
    etat.ecritureEnEchec = true; // le checkpoint exigé par D1 échoue : rien n'est écrit
    a(30 * 1000);
    await expect(sauvegarderContenuChapitre(c.id, "C", s)).rejects.toBeInstanceOf(HistoriqueChapitreError);
    etat.transformer = null;
    etat.ecritureEnEchec = false;
    etat.lectureEnEchec = true;
    await expect(sauvegarderContenuChapitre(c.id, "C", s)).rejects.toBeInstanceOf(HistoriqueChapitreError);
    expect(lireContenuChapitre(c.id)).toBe("B");
  });

  it("6. écart négatif (recul d'horloge) : preuve refusée, écriture bloquée (D1 : 0 ≤ écart)", async () => {
    const etat = depotPilote();
    const { c, s } = await seanceConfirmee(etat);
    etat.lectureEnEchec = true;
    a(-1 * MINUTE);
    await expect(sauvegarderContenuChapitre(c.id, "C", s)).rejects.toBeInstanceOf(HistoriqueChapitreError);
    expect(lireContenuChapitre(c.id)).toBe("B");
  });

  it("7/19. le T_confirmé du chapitre A n'autorise jamais d'écrire le chapitre B", async () => {
    const etat = depotPilote();
    const { c: chapA, s: sA } = await seanceConfirmee(etat);
    const chapB = chapitre("Autre");
    const sB = ouvrirSeanceEdition(chapB.id);
    await sauvegarderContenuChapitre(chapB.id, "b0", sB); // vide : aucune lecture
    etat.lectureEnEchec = true;
    a(30 * 1000);
    await expect(sauvegarderContenuChapitre(chapB.id, "b1", sB)).rejects.toBeInstanceOf(HistoriqueChapitreError);
    expect(lireContenuChapitre(chapB.id)).toBe("b0");
    await sauvegarderContenuChapitre(chapA.id, "C", sA);
    expect(lireContenuChapitre(chapA.id)).toBe("C");
    etat.lectureEnEchec = false;
    expect(await lireHistoriqueChapitre(chapB.id)).toEqual([]);
  });

  it("8. nouvelle séance : l'ancien T_confirmé n'est pas disponible", async () => {
    const etat = depotPilote();
    const { c } = await seanceConfirmee(etat);
    etat.lectureEnEchec = true;
    a(30 * 1000);
    const s2 = ouvrirSeanceEdition(c.id);
    await expect(sauvegarderContenuChapitre(c.id, "C", s2)).rejects.toBeInstanceOf(HistoriqueChapitreError);
    expect(lireContenuChapitre(c.id)).toBe("B");
  });

  it("8. rechargement : la mémoire de séance disparaît avec le module", async () => {
    const etat = depotPilote();
    const { c, s } = await seanceConfirmee(etat);
    vi.resetModules();
    const frais = await import("./manuscript-chapters");
    const fraisHistorique = await import("./manuscript-chapters-history");
    fraisHistorique.__definirDepotHistoriquePourTests({
      listerVersions: async () => {
        throw new fraisHistorique.HistoriqueChapitreError("Lecture de l'historique impossible.");
      },
      ajouterVersion: async () => {
        throw new fraisHistorique.HistoriqueChapitreError("Écriture de l'historique impossible.");
      },
    });
    await expect(frais.sauvegarderContenuChapitre(c.id, "C", s)).rejects.toBeInstanceOf(frais.SeanceEditionInvalideError);
    const s2 = frais.ouvrirSeanceEdition(c.id);
    await expect(frais.sauvegarderContenuChapitre(c.id, "C", s2)).rejects.toBeInstanceOf(fraisHistorique.HistoriqueChapitreError);
    expect(lireContenuChapitre(c.id)).toBe("B");
  });

  it("10. archive en échec : T_confirmé non établi et contenu courant non écrasé", async () => {
    const etat = depotPilote();
    const c = chapitre();
    const s = ouvrirSeanceEdition(c.id);
    await sauvegarderContenuChapitre(c.id, "X", s);
    etat.ecritureEnEchec = true;
    a(10 * 1000);
    await expect(sauvegarderContenuChapitre(c.id, "XY", s)).rejects.toBeInstanceOf(HistoriqueChapitreError);
    expect(lireContenuChapitre(c.id)).toBe("X");
    etat.ecritureEnEchec = false;
    etat.lectureEnEchec = true;
    await expect(sauvegarderContenuChapitre(c.id, "XY", s)).rejects.toBeInstanceOf(HistoriqueChapitreError);
    expect(lireContenuChapitre(c.id)).toBe("X");
  });

  it("15. aucune version + état réel présent : protection exigée (bloqué sans lecture, archivé avec lecture)", async () => {
    const etat = depotPilote();
    const c = chapitre();
    contenuExistant(c.id, "état réel");
    const s = ouvrirSeanceEdition(c.id);
    etat.lectureEnEchec = true;
    await expect(sauvegarderContenuChapitre(c.id, "nouveau", s)).rejects.toBeInstanceOf(HistoriqueChapitreError);
    expect(lireContenuChapitre(c.id)).toBe("état réel");
    etat.lectureEnEchec = false;
    const r = await sauvegarderContenuChapitre(c.id, "nouveau", s);
    expect(r.version).toMatchObject({ contenu: "état réel", motif: "debut-seance" });
  });

  it("16. une entrée historique mal formée ne devient jamais T_confirmé et n'est ni supprimée ni réparée", async () => {
    const etat = depotPilote();
    const c = chapitre();
    const s = ouvrirSeanceEdition(c.id);
    await sauvegarderContenuChapitre(c.id, "X", s);
    await lireHistoriqueChapitre(c.id); // crée la base
    const brute = { id: `${c.id}#0000000000`, chapitreId: c.id, contenu: 42, archiveLe: new Date().toISOString(), motif: "checkpoint" };
    await ecrireEntreeBrute(brute);
    etat.ecritureEnEchec = true;
    a(10 * 1000);
    await expect(sauvegarderContenuChapitre(c.id, "XY", s)).rejects.toBeInstanceOf(HistoriqueChapitreError);
    etat.ecritureEnEchec = false;
    etat.lectureEnEchec = true;
    await expect(sauvegarderContenuChapitre(c.id, "XY", s)).rejects.toBeInstanceOf(HistoriqueChapitreError);
    expect(lireContenuChapitre(c.id)).toBe("X");
    expect(await lireEntreeBrute(brute.id)).toEqual(brute);
  });

  it("14. chapitre vide sans historique : la première écriture reste possible sans lecture ni faux snapshot", async () => {
    const etat = depotPilote();
    etat.lectureEnEchec = true;
    etat.ecritureEnEchec = true;
    const c = chapitre();
    const r = await sauvegarderContenuChapitre(c.id, "premiers mots", ouvrirSeanceEdition(c.id));
    expect(r).toEqual({ ecrit: true, version: null, historiqueIndisponible: false });
    etat.lectureEnEchec = false;
    expect(await contenus(c.id)).toEqual([]);
  });
});

describe("READ-FAILURE — retour d'IndexedDB et autorité de la lecture", () => {
  it("11. IndexedDB redevient lisible : la lecture reprend l'autorité, checkpoint normal sur le contenu à jour", async () => {
    const etat = depotPilote();
    const { c, s } = await seanceConfirmee(etat);
    etat.lectureEnEchec = true;
    a(2 * MINUTE);
    await sauvegarderContenuChapitre(c.id, "D", s);
    etat.lectureEnEchec = false;
    a(6 * MINUTE);
    const r = await sauvegarderContenuChapitre(c.id, "E", s);
    expect(r).toMatchObject({ historiqueIndisponible: false, version: { contenu: "D", motif: "checkpoint" } });
    expect(await contenus(c.id)).toEqual(["A", "D"]);
  });

  it("11. une lecture réussie remplace la valeur volatile : elle peut retirer la preuve", async () => {
    const etat = depotPilote();
    const { c, s } = await seanceConfirmee(etat); // T_confirmé = T0 par l'archive
    // Lecture réussie : dernière version persistée datée de T0 − 10 min (autorité d'IndexedDB).
    etat.transformer = (versions) => versions.map((v) => ({ ...v, archiveLe: new Date(T0 - 10 * MINUTE).toISOString() }));
    etat.ecritureEnEchec = true; // le checkpoint alors exigé échoue
    a(1 * MINUTE);
    await expect(sauvegarderContenuChapitre(c.id, "C", s)).rejects.toBeInstanceOf(HistoriqueChapitreError);
    etat.transformer = null;
    etat.ecritureEnEchec = false;
    etat.lectureEnEchec = true;
    await expect(sauvegarderContenuChapitre(c.id, "C", s)).rejects.toBeInstanceOf(HistoriqueChapitreError);
    expect(lireContenuChapitre(c.id)).toBe("B");
  });
});

describe("READ-FAILURE — concurrence", () => {
  it("12. contenu modifié par un autre onglet pendant le repli : rien n'est écrasé, erreur explicite", async () => {
    const etat = depotPilote();
    const { c, s } = await seanceConfirmee(etat);
    etat.lectureEnEchec = true;
    let premiere = true;
    etat.avantLecture = () => {
      if (premiere) {
        premiere = false;
        localStorage.setItem(cleContenuChapitre(c.id), "autre onglet");
      }
    };
    a(30 * 1000);
    // Le contenu change pendant le 1er passage : la relecture interrompt l'écriture ; au passage
    // suivant, le contenu n'est plus celui écrit par la séance → aucune preuve, blocage.
    await expect(sauvegarderContenuChapitre(c.id, "C", s)).rejects.toBeInstanceOf(HistoriqueChapitreError);
    expect(lireContenuChapitre(c.id)).toBe("autre onglet");
  });

  it("12. contenu modifié entre le repli et l'écriture : relecture, nouveau passage, blocage", async () => {
    const etat = depotPilote();
    const { c, s } = await seanceConfirmee(etat);
    etat.lectureEnEchec = true;
    let appels = 0;
    etat.avantLecture = () => {
      appels += 1;
      // Après la lecture en échec du 1er passage (repli accordé), un autre onglet écrit.
      if (appels === 1) queueMicrotask(() => localStorage.setItem(cleContenuChapitre(c.id), "autre onglet"));
    };
    a(30 * 1000);
    await expect(sauvegarderContenuChapitre(c.id, "C", s)).rejects.toBeInstanceOf(HistoriqueChapitreError);
    expect(lireContenuChapitre(c.id)).toBe("autre onglet");
    expect(appels).toBe(2);
  });

  it("13. limite de concurrence préservée : ContenuChapitreConcurrentError après trois passages", async () => {
    const etat = depotPilote();
    const c = chapitre();
    contenuExistant(c.id, "v0");
    let n = 0;
    etat.avantLecture = () => {
      n += 1;
      queueMicrotask(() => localStorage.setItem(cleContenuChapitre(c.id), `autre ${n}`));
    };
    await expect(sauvegarderContenuChapitre(c.id, "mien", ouvrirSeanceEdition(c.id))).rejects.toBeInstanceOf(
      ContenuChapitreConcurrentError,
    );
    expect(n).toBe(3);
    expect(lireContenuChapitre(c.id)).not.toBe("mien");
  });
});

describe("READ-FAILURE — restauration : aucun repli", () => {
  it("17. restauration ciblée : lecture en échec → refus, même avec un T_confirmé valide", async () => {
    const etat = depotPilote();
    const { c } = await seanceConfirmee(etat);
    const [versionA] = await depotHistoriqueIndexedDB.listerVersions(c.id);
    etat.lectureEnEchec = true;
    a(30 * 1000);
    await expect(restaurerVersionChapitre(c.id, versionA.id)).rejects.toBeInstanceOf(HistoriqueChapitreError);
    expect(lireContenuChapitre(c.id)).toBe("B");
  });

  it("18. archivage avant restauration complète : lecture en échec → rejet, même avec un T_confirmé valide", async () => {
    const etat = depotPilote();
    const { c } = await seanceConfirmee(etat);
    etat.lectureEnEchec = true;
    a(30 * 1000);
    await expect(archiverContenusCanoniquesAvantRestaurationComplete()).rejects.toBeInstanceOf(HistoriqueChapitreError);
    expect(lireContenuChapitre(c.id)).toBe("B");
  });
});

describe("READ-FAILURE — règle pure repliLectureHistoriqueAutorise", () => {
  const base = { premiereModificationFaite: true, dernierContenuEcrit: "S", tConfirme: T0 };

  it("n'autorise le repli que si toutes les conditions gouvernées sont réunies", () => {
    const ok = (p: Partial<Parameters<typeof repliLectureHistoriqueAutorise>[0]>) =>
      repliLectureHistoriqueAutorise({ contenuCourant: "S", nouveauContenu: "N", seance: base, maintenant: T0 + MINUTE, ...p });
    expect(ok({})).toBe(true);
    expect(ok({ contenuCourant: null })).toBe(false);
    expect(ok({ contenuCourant: "" })).toBe(false);
    expect(ok({ nouveauContenu: "S" })).toBe(false);
    expect(ok({ seance: { ...base, premiereModificationFaite: false } })).toBe(false);
    expect(ok({ seance: { ...base, dernierContenuEcrit: "autre" } })).toBe(false);
    expect(ok({ seance: { ...base, tConfirme: null } })).toBe(false);
    expect(ok({ seance: { ...base, tConfirme: Number.NaN } })).toBe(false);
    expect(ok({ maintenant: T0 - 1 })).toBe(false);
    expect(ok({ maintenant: T0 })).toBe(true);
    expect(ok({ maintenant: T0 + DELAI_CHECKPOINT_MS - 1 })).toBe(true);
    expect(ok({ maintenant: T0 + DELAI_CHECKPOINT_MS })).toBe(false);
  });
});

describe("READ-FAILURE — /vue-double (sources)", () => {
  // Les états affichés (avertissement en repli, « Non sauvegardé — historique
  // indisponible » en blocage) sont prouvés par exécution dans
  // lib/vue-double-sauvegarde.test.ts ; ici, seul le branchement est vérifié.
  it("la page traduit les issues et affiche l'état via la logique testée", () => {
    const vue = readFileSync(fileURLToPath(new URL("../app/vue-double/page.tsx", import.meta.url)), "utf8");
    expect(vue).toContain("executerSauvegarde(() => sauvegarderTexteChapitre(cible, val, jeton))");
    expect(vue).toContain("{libelle.texte}");
  });
});
