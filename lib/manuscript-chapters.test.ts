import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

import { afterEach, beforeEach, describe, expect, it } from "vitest";

import {
  CHAPITRES_MANUSCRIT_STORAGE_KEY,
  STATUT_LEGACY_IMPORTE,
  STATUT_LEGACY_INDETERMINABLE,
  STATUT_LEGACY_SANS_CHAPITRE,
  StructureCanoniqueIllisibleError,
  TitreChapitreDejaUtiliseError,
  ajouterChapitreCanonique,
  assurerChapitreCanoniquePourTitre,
  assurerChapitrePourFragment,
  cleContenuChapitre,
  cleEcritureLegacy,
  composerChapitresParTome,
  lireChapitresCanoniques,
  lireChapitresCanoniquesDuTome,
  lireChapitresStructureParTome,
  lireContenuChapitre,
  lireEtatStructureCanonique,
  lireTexteChapitre,
  lireTextesLegacyNonAttribues,
  migrerChapitresLegacyP1A,
  renommerChapitreCanonique,
  reordonnerChapitresCanoniques,
  sauvegarderChapitresLegacyHorsP1A,
  sauvegarderContenuChapitre,
  sauvegarderTexteChapitre,
  supprimerChapitreCanonique,
  synchroniserChapitresDepuisFragments,
} from "./manuscript-chapters";
import { CHAPITRES_DEFAUT, STRUCTURE_CHAPITRES_STORAGE_KEY } from "./manuscript-structure";
import { CHAPITRES_TOME_1_STORAGE_KEY } from "./tome1-chapters";

// Même convention que lib/fragments.test.ts (localStorage en mémoire).
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

function snapshotStorage(): Record<string, string> {
  const data: Record<string, string> = {};
  for (let index = 0; index < localStorage.length; index += 1) {
    const key = localStorage.key(index) as string;
    data[key] = localStorage.getItem(key) as string;
  }
  return data;
}

function source(relativePath: string) {
  return readFileSync(fileURLToPath(new URL(`../${relativePath}`, import.meta.url)), "utf8");
}

const LEGACY_STRUCTURE = {
  1: ["La maison", "Chapitre manuel T1"],
  2: ["Le corps qui change", "Les amis", "Ajout manuel"],
  3: ["Le début", "Doublon", "Doublon"],
  4: ["La plainte"],
};

beforeEach(() => {
  const memoryLocalStorage = createMemoryLocalStorage();
  (globalThis as { window?: unknown }).window = { localStorage: memoryLocalStorage };
  (globalThis as { localStorage?: unknown }).localStorage = memoryLocalStorage;
});

afterEach(() => {
  delete (globalThis as { window?: unknown }).window;
  delete (globalThis as { localStorage?: unknown }).localStorage;
});

function seedLegacy() {
  localStorage.setItem(STRUCTURE_CHAPITRES_STORAGE_KEY, JSON.stringify(LEGACY_STRUCTURE));
  localStorage.setItem(cleEcritureLegacy(2, "Les amis"), "Texte des amis");
  localStorage.setItem(cleEcritureLegacy(3, "Doublon"), "Texte ambigu");
  localStorage.setItem(cleEcritureLegacy(4, "Chapitre disparu"), "Texte orphelin");
  localStorage.setItem(cleEcritureLegacy(1, "La maison"), "Texte legacy Tome 1");
  localStorage.setItem(CHAPITRES_TOME_1_STORAGE_KEY, JSON.stringify([{ id: "chapitre-1", titre: "La maison", contenu: "Canon T1" }]));
}

describe("LIVRE-P1A — migration legacy des Tomes 2–4", () => {
  it("1. migre la structure legacy des Tomes 2–4 en conservant l'ordre", () => {
    seedLegacy();
    const chapitres = lireChapitresCanoniques();
    expect(lireChapitresCanoniquesDuTome(2).map((c) => c.titre)).toEqual(["Le corps qui change", "Les amis", "Ajout manuel"]);
    expect(lireChapitresCanoniquesDuTome(3).map((c) => c.titre)).toEqual(["Le début", "Doublon", "Doublon"]);
    expect(lireChapitresCanoniquesDuTome(4).map((c) => c.titre)).toEqual(["La plainte"]);
    expect(lireChapitresCanoniquesDuTome(2).map((c) => c.ordre)).toEqual([0, 1, 2]);
    expect(chapitres).toHaveLength(7);
  });

  it("utilise les chapitres par défaut quand la structure legacy est absente (comme normaliserChapitres)", () => {
    expect(lireChapitresCanoniquesDuTome(2).map((c) => c.titre)).toEqual(CHAPITRES_DEFAUT[2]);
  });

  it("2. ignore le Tome 1 (aucun chapitre canonique Tome 1)", () => {
    seedLegacy();
    const chapitres = lireChapitresCanoniques();
    expect(chapitres.every((c) => (c.tomeId as number) !== 1)).toBe(true);
  });

  it("3/4. crée les identifiants une seule fois : relectures répétées → mêmes IDs", () => {
    seedLegacy();
    const premiers = lireChapitresCanoniques().map((c) => c.id);
    const brut = localStorage.getItem(CHAPITRES_MANUSCRIT_STORAGE_KEY);
    for (let i = 0; i < 5; i += 1) expect(lireChapitresCanoniques().map((c) => c.id)).toEqual(premiers);
    expect(localStorage.getItem(CHAPITRES_MANUSCRIT_STORAGE_KEY)).toBe(brut);
    expect(new Set(premiers).size).toBe(premiers.length);
  });

  it("17. migration répétée → idempotente (aucune réécriture, même résultat)", () => {
    seedLegacy();
    const premiere = migrerChapitresLegacyP1A();
    const avant = snapshotStorage();
    const seconde = migrerChapitresLegacyP1A();
    expect(seconde).toEqual(premiere);
    expect(snapshotStorage()).toEqual(avant);
  });

  it("18. structure canonique existante → aucun remplacement ni recréation d'IDs, même si le legacy change", () => {
    seedLegacy();
    const ids = lireChapitresCanoniques().map((c) => c.id);
    localStorage.setItem(STRUCTURE_CHAPITRES_STORAGE_KEY, JSON.stringify({ 2: ["Autre"], 3: [], 4: [] }));
    localStorage.setItem(cleEcritureLegacy(2, "Autre"), "nouveau legacy");
    expect(lireChapitresCanoniques().map((c) => c.id)).toEqual(ids);
    expect(lireChapitresCanoniquesDuTome(2).map((c) => c.titre)).toEqual(["Le corps qui change", "Les amis", "Ajout manuel"]);
  });

  it("structure canonique illisible → jamais écrasée, écritures refusées", () => {
    seedLegacy();
    localStorage.setItem(CHAPITRES_MANUSCRIT_STORAGE_KEY, "{corrompu");
    expect(lireEtatStructureCanonique().invalide).toBe(true);
    expect(migrerChapitresLegacyP1A()).toBeNull();
    expect(() => ajouterChapitreCanonique(2, "X")).toThrow(StructureCanoniqueIllisibleError);
    expect(localStorage.getItem(CHAPITRES_MANUSCRIT_STORAGE_KEY)).toBe("{corrompu");
  });
});

describe("LIVRE-P1A — identité stable", () => {
  it("5/6. renommer conserve l'ID et le contenu", () => {
    seedLegacy();
    const [chapitre] = lireChapitresCanoniquesDuTome(2);
    sauvegarderContenuChapitre(chapitre.id, "Mon texte");
    renommerChapitreCanonique(chapitre.id, "Nouveau titre");
    const renomme = lireChapitresCanoniquesDuTome(2)[0];
    expect(renomme.id).toBe(chapitre.id);
    expect(renomme.titre).toBe("Nouveau titre");
    expect(lireContenuChapitre(chapitre.id)).toBe("Mon texte");
  });

  it("7/8. réordonner conserve les IDs et le contenu", () => {
    seedLegacy();
    const avant = lireChapitresCanoniquesDuTome(2);
    avant.forEach((c) => sauvegarderContenuChapitre(c.id, `texte ${c.titre}`));
    const inverse = [...avant].reverse().map((c) => c.id);
    reordonnerChapitresCanoniques(2, inverse);
    const apres = lireChapitresCanoniquesDuTome(2);
    expect(apres.map((c) => c.id)).toEqual(inverse);
    expect(new Set(apres.map((c) => c.id))).toEqual(new Set(avant.map((c) => c.id)));
    apres.forEach((c) => expect(lireContenuChapitre(c.id)).toBe(`texte ${c.titre}`));
    expect(apres.map((c) => c.ordre)).toEqual([0, 1, 2]);
  });

  it("refuse un réordonnancement qui n'est pas une permutation exacte", () => {
    seedLegacy();
    const ids = lireChapitresCanoniquesDuTome(2).map((c) => c.id);
    expect(() => reordonnerChapitresCanoniques(2, ids.slice(1))).toThrow();
    expect(() => reordonnerChapitresCanoniques(2, [ids[0], ids[0], ids[1]])).toThrow();
    expect(lireChapitresCanoniquesDuTome(2).map((c) => c.id)).toEqual(ids);
  });

  it("9. ajouter un chapitre → ID stable non dérivé du titre", () => {
    const cree = ajouterChapitreCanonique(3, "Les coups de minuit");
    expect(cree.id).not.toContain("coups");
    expect(cree.id).not.toContain(encodeURIComponent("Les coups de minuit"));
    expect(lireChapitresCanoniquesDuTome(3).at(-1)).toEqual(cree);
    renommerChapitreCanonique(cree.id, "Autre");
    expect(lireChapitresCanoniquesDuTome(3).at(-1)?.id).toBe(cree.id);
  });

  it("refuse un titre déjà utilisé dans le tome (ajout et renommage)", () => {
    const [a, b] = lireChapitresCanoniquesDuTome(2);
    expect(() => ajouterChapitreCanonique(2, a.titre)).toThrow(TitreChapitreDejaUtiliseError);
    expect(() => renommerChapitreCanonique(b.id, a.titre)).toThrow(TitreChapitreDejaUtiliseError);
  });

  it("10. suppression explicite retire le chapitre de la structure sans effacer son contenu", () => {
    seedLegacy();
    const [premier, second] = lireChapitresCanoniquesDuTome(2);
    sauvegarderContenuChapitre(second.id, "à garder");
    supprimerChapitreCanonique(second.id);
    const restants = lireChapitresCanoniquesDuTome(2);
    expect(restants.map((c) => c.id)).not.toContain(second.id);
    expect(restants[0].id).toBe(premier.id);
    expect(restants.map((c) => c.ordre)).toEqual([0, 1]);
    expect(localStorage.getItem(cleContenuChapitre(second.id))).toBe("à garder");
  });

  it("refuse d'écrire un contenu pour un identifiant inconnu", () => {
    expect(() => sauvegarderContenuChapitre("chap-inconnu", "x")).toThrow();
    expect(localStorage.getItem(cleContenuChapitre("chap-inconnu"))).toBeNull();
  });
});

describe("LIVRE-P1A — /fragments (D1, D2)", () => {
  it("11. la synchronisation depuis les fragments ne supprime jamais un chapitre (passe 3 supprimée)", () => {
    seedLegacy();
    const avant = lireChapitresCanoniques();
    const legacyAvant = localStorage.getItem(STRUCTURE_CHAPITRES_STORAGE_KEY);
    // Aucun fragment manuscrit : avant P1A, la passe 3 retirait « Ajout manuel » (T2) et « Chapitre manuel T1 ».
    synchroniserChapitresDepuisFragments([]);
    synchroniserChapitresDepuisFragments([{ manuscrit: false, tomeId: 2, chapitre: "Les amis" }]);
    expect(lireChapitresCanoniques()).toEqual(avant);
    expect(localStorage.getItem(STRUCTURE_CHAPITRES_STORAGE_KEY)).toBe(legacyAvant);
  });

  it("11 (source). /fragments n'accède plus directement à structure-chapitres ni à l'ancienne passe 3", () => {
    const page = source("app/fragments/page.tsx");
    expect(page).not.toContain('"structure-chapitres"');
    expect(page).not.toContain("chapitresApresNettoyage");
    expect(page).toContain("synchroniserChapitresDepuisFragments(");
    expect(page).toContain("assurerChapitrePourFragment(");
  });

  it("12. la passe 2 préserve l'ID d'un chapitre existant et crée un chapitre manquant une seule fois", () => {
    seedLegacy();
    const amis = lireChapitresCanoniquesDuTome(2).find((c) => c.titre === "Les amis")!;
    const resultats = synchroniserChapitresDepuisFragments([
      { manuscrit: true, tomeId: 2, chapitre: "Les amis" },
      { manuscrit: true, tomeId: 2, chapitre: "Nouveau depuis fragment" },
      { manuscrit: true, tomeId: 2, chapitre: "Nouveau depuis fragment" },
    ]);
    expect(resultats[0]).toEqual({ statut: "existant", chapitre: amis });
    expect(resultats[1].statut).toBe("cree");
    expect(resultats[2].statut).toBe("existant");
    const tome2 = lireChapitresCanoniquesDuTome(2);
    expect(tome2.find((c) => c.titre === "Les amis")?.id).toBe(amis.id);
    expect(tome2.filter((c) => c.titre === "Nouveau depuis fragment")).toHaveLength(1);
  });

  it("15/16. passe 2 avec homonymes → LEGACY — IDENTITÉ INDÉTERMINABLE, aucun choix ni création", () => {
    seedLegacy();
    const avant = lireChapitresCanoniques();
    const resultat = assurerChapitreCanoniquePourTitre(3, "Doublon");
    expect(resultat.statut).toBe(STATUT_LEGACY_INDETERMINABLE);
    expect(lireChapitresCanoniques()).toEqual(avant);
  });

  it("passe 2 hors P1A (Tome 1) : écriture legacy d'avant P1A, aucune entrée canonique", () => {
    seedLegacy();
    const resultat = assurerChapitrePourFragment(1, "Nouveau T1");
    expect(resultat).toEqual({ statut: "legacy-hors-p1a", ajoute: true });
    const legacy = JSON.parse(localStorage.getItem(STRUCTURE_CHAPITRES_STORAGE_KEY) as string);
    expect(legacy["1"]).toEqual(["La maison", "Chapitre manuel T1", "Nouveau T1"]);
    expect(legacy["2"]).toEqual(LEGACY_STRUCTURE[2]);
    expect(lireChapitresCanoniques().some((c) => c.titre === "Nouveau T1")).toBe(false);
  });
});

describe("LIVRE-P1A — textes legacy ecriture_*", () => {
  it("13. correspondance unique → import canonique sûr", () => {
    seedLegacy();
    const amis = lireChapitresCanoniquesDuTome(2).find((c) => c.titre === "Les amis")!;
    expect(lireContenuChapitre(amis.id)).toBe("Texte des amis");
    const entree = lireEtatStructureCanonique().importsLegacy.find((e) => e.cleLegacy === cleEcritureLegacy(2, "Les amis"));
    expect(entree).toMatchObject({ statut: STATUT_LEGACY_IMPORTE, chapitreId: amis.id });
  });

  it("14. le texte legacy est conservé après import, et le renommage ne fait pas perdre le texte", () => {
    seedLegacy();
    const amis = lireChapitresCanoniquesDuTome(2).find((c) => c.titre === "Les amis")!;
    renommerChapitreCanonique(amis.id, "Les amies");
    expect(localStorage.getItem(cleEcritureLegacy(2, "Les amis"))).toBe("Texte des amis");
    expect(lireContenuChapitre(amis.id)).toBe("Texte des amis");
  });

  it("15/16. deux chapitres de même titre → aucune attribution, statut INDÉTERMINABLE observable", () => {
    seedLegacy();
    const doublons = lireChapitresCanoniquesDuTome(3).filter((c) => c.titre === "Doublon");
    expect(doublons).toHaveLength(2);
    doublons.forEach((c) => expect(lireContenuChapitre(c.id)).toBe(""));
    const entree = lireEtatStructureCanonique().importsLegacy.find((e) => e.cleLegacy === cleEcritureLegacy(3, "Doublon"));
    expect(entree).toMatchObject({ statut: STATUT_LEGACY_INDETERMINABLE, candidats: doublons.map((c) => c.id) });
    expect(entree?.chapitreId).toBeUndefined();
    expect(lireTextesLegacyNonAttribues().map((e) => [e.cleLegacy, e.statut, e.texte])).toContainEqual([
      cleEcritureLegacy(3, "Doublon"),
      STATUT_LEGACY_INDETERMINABLE,
      "Texte ambigu",
    ]);
  });

  it("19. texte legacy sans chapitre correspondant → aucune destruction, exposé comme non attribué", () => {
    seedLegacy();
    const avant = snapshotStorage();
    lireChapitresCanoniques();
    Object.entries(avant).forEach(([key, value]) => {
      if (key !== CHAPITRES_MANUSCRIT_STORAGE_KEY) expect(localStorage.getItem(key)).toBe(value);
    });
    const orphelin = lireTextesLegacyNonAttribues().find((e) => e.cleLegacy === cleEcritureLegacy(4, "Chapitre disparu"));
    expect(orphelin).toMatchObject({ statut: STATUT_LEGACY_SANS_CHAPITRE, texte: "Texte orphelin" });
  });

  it("n'écrase jamais un contenu canonique déjà présent à l'import", () => {
    seedLegacy();
    const etat = migrerChapitresLegacyP1A()!;
    const amis = etat.chapitres.find((c) => c.titre === "Les amis")!;
    sauvegarderContenuChapitre(amis.id, "édité");
    migrerChapitresLegacyP1A();
    expect(lireContenuChapitre(amis.id)).toBe("édité");
  });
});

describe("LIVRE-P1A — Tome 1 hors migration", () => {
  it("23/24. données Tome 1 intactes ; ecriture_1_* ni migrée, ni supprimée, ni réécrite", () => {
    seedLegacy();
    const avant = snapshotStorage();
    lireChapitresCanoniques();
    const chapitre = lireChapitresCanoniquesDuTome(2)[0];
    renommerChapitreCanonique(chapitre.id, "Renommé");
    sauvegarderContenuChapitre(chapitre.id, "texte");
    supprimerChapitreCanonique(chapitre.id);
    synchroniserChapitresDepuisFragments([{ manuscrit: true, tomeId: 2, chapitre: "Via fragment" }]);
    expect(localStorage.getItem(cleEcritureLegacy(1, "La maison"))).toBe(avant[cleEcritureLegacy(1, "La maison")]);
    expect(localStorage.getItem(CHAPITRES_TOME_1_STORAGE_KEY)).toBe(avant[CHAPITRES_TOME_1_STORAGE_KEY]);
    expect(localStorage.getItem(STRUCTURE_CHAPITRES_STORAGE_KEY)).toBe(avant[STRUCTURE_CHAPITRES_STORAGE_KEY]);
    expect(lireEtatStructureCanonique().importsLegacy.some((e) => e.cleLegacy.startsWith("ecriture_1_"))).toBe(false);
  });

  it("D4. aucune double écriture : les Tomes 2–4 legacy ne sont jamais réécrits depuis la structure canonique", () => {
    seedLegacy();
    const chapitre = lireChapitresCanoniquesDuTome(2)[0];
    renommerChapitreCanonique(chapitre.id, "Renommé");
    sauvegarderChapitresLegacyHorsP1A(1, ["Seul T1"]);
    const legacy = JSON.parse(localStorage.getItem(STRUCTURE_CHAPITRES_STORAGE_KEY) as string);
    expect(legacy["1"]).toEqual(["Seul T1"]);
    expect(legacy["2"]).toEqual(LEGACY_STRUCTURE[2]);
    expect(() => sauvegarderChapitresLegacyHorsP1A(2, ["x"])).toThrow();
  });

  it("vue unifiée : Tome 1 reste legacy (lecture/écriture par clé legacy inchangée)", () => {
    seedLegacy();
    const structure = lireChapitresStructureParTome();
    const maison = structure[1][0];
    expect(maison).toMatchObject({ source: "legacy", id: null, titre: "La maison" });
    expect(lireTexteChapitre(maison)).toBe("Texte legacy Tome 1");
  });
});

describe("LIVRE-P1A — consommateurs", () => {
  it("20. vue unifiée : Tomes 2–4 lus par identifiant, sans clé reconstruite par titre", () => {
    seedLegacy();
    const legacyBase = { 1: ["La maison"], 2: ["Titre legacy obsolète"], 5: ["Tome 5 legacy"] };
    const structure = composerChapitresParTome(legacyBase);
    expect(structure[2].map((c) => c.titre)).toEqual(["Le corps qui change", "Les amis", "Ajout manuel"]);
    expect(structure[2].every((c) => c.source === "canonique" && c.id)).toBe(true);
    expect(structure[5]).toEqual([{ tomeId: 5, titre: "Tome 5 legacy", index: 0, id: null, source: "legacy" }]);
    const amis = structure[2][1];
    sauvegarderTexteChapitre(amis, "écrit via vue unifiée");
    renommerChapitreCanonique(amis.id as string, "Renommé");
    const relu = lireChapitresStructureParTome()[2][1];
    expect(relu.titre).toBe("Renommé");
    expect(lireTexteChapitre(relu)).toBe("écrit via vue unifiée");
  });

  it("20 (source). aucun consommateur ne reconstruit `ecriture_${tome}_${titre}` hors du module central", () => {
    const consommateurs = [
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
      "app/biographie/inventaire/page.tsx",
      "app/biographie/strategie/page.tsx",
    ];
    consommateurs.forEach((fichier) => {
      const contenu = source(fichier);
      expect(contenu, fichier).not.toMatch(/ecriture_\$\{/);
      expect(contenu, fichier).not.toMatch(/localStorage\.setItem\(\s*["']structure-chapitres["']/);
    });
  });

  it("21. Biographie lit le manuscrit canonique sans fusionner son modèle Chapitre", () => {
    const biographie = source("app/lib/biographie.ts");
    expect(biographie).not.toContain("manuscript-chapters");
    expect(biographie).toMatch(/export interface Chapitre\b/);
    expect(source("lib/manuscript-chapters.ts")).not.toContain("biographie");
    ["app/biographie/inventaire/page.tsx", "app/biographie/strategie/page.tsx"].forEach((fichier) => {
      const contenu = source(fichier);
      expect(contenu, fichier).toContain('from "@/lib/manuscript-chapters"');
      expect(contenu, fichier).not.toContain("lireChapitres()");
    });
  });

  it("22. compatible BackupManager : export/restauration de toutes les clés → mêmes IDs et contenus", () => {
    seedLegacy();
    const chapitres = lireChapitresCanoniques();
    chapitres.forEach((c) => sauvegarderContenuChapitre(c.id, `contenu ${c.id}`));
    // BackupManager exporte localStorage clé par clé, puis restaure via clear() + setItem().
    const exporte = JSON.parse(JSON.stringify({ data: snapshotStorage() })) as { data: Record<string, string> };
    localStorage.clear();
    Object.entries(exporte.data).forEach(([key, value]) => localStorage.setItem(key, value));
    expect(lireChapitresCanoniques()).toEqual(chapitres);
    chapitres.forEach((c) => expect(lireContenuChapitre(c.id)).toBe(`contenu ${c.id}`));
    const backupManager = source("components/BackupManager.tsx");
    expect(backupManager).toMatch(/for \(let index = 0; index < localStorage\.length; index \+= 1\)/);
  });
});
