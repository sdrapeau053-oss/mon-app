import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import { creerProjetVide } from "@/app/lib/biographie";
import {
  CHAPITRES_TOME_1_DEFAUT,
  CHAPITRES_TOME_1_STORAGE_KEY,
  TITRE_TOME_1,
  type ChapitreTome1,
} from "@/lib/tome1-chapters";

import {
  PARCOURS_ECRITURE_TOME_1,
  PARCOURS_STRUCTURE_TOME_1,
  lireVueTome1Biographie,
  peutAjouterChapitreDansTomeBiographie,
  titreDesigneTome1,
  tomesBiographieAffiches,
} from "./tome1-vue";

// Stockage espion : enregistre toute lecture et toute tentative d'écriture.
function stockageEspion(initial: Record<string, string>) {
  const donnees = new Map(Object.entries(initial));
  const lectures: string[] = [];
  const ecritures: string[] = [];
  const stockage = {
    getItem(cle: string) {
      lectures.push(cle);
      return donnees.has(cle) ? donnees.get(cle)! : null;
    },
    setItem(cle: string) { ecritures.push(`set:${cle}`); },
    removeItem(cle: string) { ecritures.push(`remove:${cle}`); },
    clear() { ecritures.push("clear"); },
  };
  return { stockage, donnees, lectures, ecritures };
}

function emplacement(numero: number, overrides: Partial<ChapitreTome1> = {}): ChapitreTome1 {
  return { ...CHAPITRES_TOME_1_DEFAUT[numero - 1], ...overrides };
}

// 30 emplacements, comme dans le navigateur de l'autrice, dont seuls certains
// sont réellement écrits.
function trenteEmplacements(ecrits: Record<number, Partial<ChapitreTome1>>): ChapitreTome1[] {
  return CHAPITRES_TOME_1_DEFAUT.map((chapitre, index) => ({ ...chapitre, ...(ecrits[index + 1] ?? {}) }));
}

const FIXTURE = trenteEmplacements({
  1: { statut: "écrit", contenu: "Le corps se souvient avant les mots." },
  2: { statut: "écrit", contenu: "À définir" },
  3: { statut: "scellé", contenu: "La lucarne. Le froid.", historique: [{ id: "v-1", contenu: "Ancien", createdAt: "2026-09-01T00:00:00.000Z" }] },
  4: { statut: "écrit", contenu: "" },
  5: { statut: "brouillon", contenu: "   \n  " },
  25: { statut: "brouillon", contenu: "Une nuit qui ne ressemble pas aux autres." },
});

describe("LIVRE-V1-D1 — /biographie présente le Tome 1 existant en consultation", () => {
  it("A. représente le Tome 1 depuis chapitres-tome-1 (modèle ChapitreTome1)", () => {
    const { stockage } = stockageEspion({ [CHAPITRES_TOME_1_STORAGE_KEY]: JSON.stringify(FIXTURE) });
    const vue = lireVueTome1Biographie(stockage);
    expect(vue.etat).toBe("lue");
    expect(vue.titre).toBe(TITRE_TOME_1);
  });

  it("B. présente plusieurs chapitres valides avec titre canonique, statut et mots", () => {
    const { stockage } = stockageEspion({ [CHAPITRES_TOME_1_STORAGE_KEY]: JSON.stringify(FIXTURE) });
    const vue = lireVueTome1Biographie(stockage);
    expect(vue.chapitres.map((c) => [c.id, c.titre, c.mots])).toEqual([
      ["chapitre-1", "Le corps avant la mémoire", 7],
      ["chapitre-3", "Ce que la nuit contenait", 4],
      ["chapitre-25", "Le pays des lucioles", 8],
    ]);
    const scelle = vue.chapitres.find((c) => c.id === "chapitre-3")!;
    expect(scelle.statut).toBe("scellé");
    expect(scelle.verrouille).toBe(true);
    expect(scelle.statutEditorial).toBe("validé");
    expect(vue.totalMots).toBe(19);
  });

  it("C. 30 emplacements ne comptent pas comme 30 chapitres (vides, « À définir », espaces, statut sans texte)", () => {
    const { stockage } = stockageEspion({ [CHAPITRES_TOME_1_STORAGE_KEY]: JSON.stringify(FIXTURE) });
    expect(FIXTURE).toHaveLength(30);
    expect(lireVueTome1Biographie(stockage).chapitres).toHaveLength(3);

    const squelette = stockageEspion({ [CHAPITRES_TOME_1_STORAGE_KEY]: JSON.stringify(CHAPITRES_TOME_1_DEFAUT) });
    expect(lireVueTome1Biographie(squelette.stockage).chapitres).toHaveLength(0);
  });

  it("D. la lecture ne modifie aucun contenu de chapitre", () => {
    const brut = JSON.stringify(FIXTURE);
    const { stockage, donnees, ecritures } = stockageEspion({ [CHAPITRES_TOME_1_STORAGE_KEY]: brut });
    lireVueTome1Biographie(stockage);
    lireVueTome1Biographie(stockage);
    expect(donnees.get(CHAPITRES_TOME_1_STORAGE_KEY)).toBe(brut);
    expect(ecritures).toEqual([]);
  });

  it("E/F. aucun ProjetNarratif Tome 1 n'est créé, aucune lecture ni écriture de biographie-projet", () => {
    const { stockage, lectures, ecritures } = stockageEspion({ [CHAPITRES_TOME_1_STORAGE_KEY]: JSON.stringify(FIXTURE) });
    lireVueTome1Biographie(stockage);
    expect(lectures).not.toContain("biographie-projet");
    expect(ecritures).toEqual([]);
    // Le tome par défaut de creerProjetVide() (faux Tome 1 vide) n'est pas affiché.
    expect(tomesBiographieAffiches(creerProjetVide().tomes)).toEqual([]);
  });

  it("G. aucune migration : seule la clé chapitres-tome-1 est lue, rien n'est écrit", () => {
    const { stockage, lectures, ecritures } = stockageEspion({
      [CHAPITRES_TOME_1_STORAGE_KEY]: JSON.stringify(FIXTURE),
      "structure-chapitres": JSON.stringify({ 1: ["La maison"] }),
    });
    lireVueTome1Biographie(stockage);
    expect(new Set(lectures)).toEqual(new Set([CHAPITRES_TOME_1_STORAGE_KEY]));
    expect(ecritures).toEqual([]);
  });

  it("H. « Nouveau chapitre » n'est jamais proposé pour un tome qui désigne le Tome 1", () => {
    const [tomeParDefaut] = creerProjetVide().tomes;
    expect(peutAjouterChapitreDansTomeBiographie(tomeParDefaut)).toBe(false);
    expect(peutAjouterChapitreDansTomeBiographie({ id: "tome-42", titre: "Tome I — Le gel et la lumière" })).toBe(false);
    expect(peutAjouterChapitreDansTomeBiographie({ id: "tome-43", titre: "tome 1 bis" })).toBe(false);
    expect(peutAjouterChapitreDansTomeBiographie({ id: "tome-44", titre: "Tome 2 — Adolescence" })).toBe(true);
    expect(peutAjouterChapitreDansTomeBiographie({ id: "tome-45", titre: "Tome II" })).toBe(true);
    expect(peutAjouterChapitreDansTomeBiographie({ id: "tome-46", titre: "Tome 10" })).toBe(true);

    // « Ajouter un tome » refuse un titre qui recréerait un Tome 1 parallèle.
    expect(titreDesigneTome1("Tome 1 — Les origines")).toBe(true);
    expect(titreDesigneTome1("Tome 3 — Mariage violent")).toBe(false);

    // Un tome Tome 1 qui contient déjà des chapitres Biographie reste visible
    // (rien de déjà écrit n'est masqué), mais sans création possible.
    const avecChapitres = { ...tomeParDefaut, chapitres: [{ id: "chap-1" }] };
    expect(tomesBiographieAffiches([avecChapitres])).toEqual([avecChapitres]);
  });

  it("I. l'édition pointe vers les parcours Tome 1 existants (/structure-tome-1#chapitre-N, /ecrire-maintenant)", () => {
    const { stockage } = stockageEspion({ [CHAPITRES_TOME_1_STORAGE_KEY]: JSON.stringify(FIXTURE) });
    const lien = lireVueTome1Biographie(stockage).chapitres.find((c) => c.id === "chapitre-25")!.lienEdition;
    expect(lien).toBe("/structure-tome-1#chapitre-25");
    // Même motif que le lien direct géré par app/structure-tome-1/page.tsx.
    expect(lien.split("#")[1]).toMatch(/^chapitre-(\d+)$/);
    expect(PARCOURS_ECRITURE_TOME_1).toBe("/ecrire-maintenant");

    const racine = fileURLToPath(new URL("../../", import.meta.url));
    expect(existsSync(`${racine}app${PARCOURS_ECRITURE_TOME_1}/page.tsx`)).toBe(true);
    expect(existsSync(`${racine}app${PARCOURS_STRUCTURE_TOME_1}/page.tsx`)).toBe(true);
  });

  it("J. chapitres-tome-1 absent : état vide sûr, aucune création", () => {
    const { stockage, ecritures } = stockageEspion({});
    const vue = lireVueTome1Biographie(stockage);
    expect(vue.etat).toBe("absente");
    expect(vue.chapitres).toEqual([]);
    expect(ecritures).toEqual([]);
    expect(lireVueTome1Biographie(null).etat).toBe("absente");
  });

  it("stockage illisible : signalé, jamais réparé, écrasé ni présenté comme vide", () => {
    for (const brut of ["{pas du json", JSON.stringify({ chapitres: [] }), "null"]) {
      const { stockage, donnees, ecritures } = stockageEspion({ [CHAPITRES_TOME_1_STORAGE_KEY]: brut });
      const vue = lireVueTome1Biographie(stockage);
      expect(vue.etat).toBe("illisible");
      expect(vue.chapitres).toEqual([]);
      expect(donnees.get(CHAPITRES_TOME_1_STORAGE_KEY)).toBe(brut);
      expect(ecritures).toEqual([]);
    }

    const inaccessible = { getItem: () => { throw new Error("SecurityError"); } };
    expect(lireVueTome1Biographie(inaccessible).etat).toBe("illisible");
  });

  it("un emplacement isolé (fixture minimale) est lu avec les métadonnées canoniques", () => {
    const { stockage } = stockageEspion({
      [CHAPITRES_TOME_1_STORAGE_KEY]: JSON.stringify([emplacement(6, { statut: "gele", contenu: "Le noir." })]),
    });
    const [seul] = lireVueTome1Biographie(stockage).chapitres;
    expect(seul).toMatchObject({ id: "chapitre-6", titre: "L’angle mort", verrouille: true, mots: 2, numero: 6 });
  });
});
