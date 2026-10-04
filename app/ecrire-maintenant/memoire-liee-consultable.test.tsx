import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import type { MemoireNarrative } from "@/lib/memoire-narrative";

import { MemoireLieeConsultable } from "./memoire-liee-consultable";

// Même enregistrement que `base-t1-ch07` (app/memoires/page.tsx).
const TABLE_ET_SILENCE: MemoireNarrative = {
  id: "base-t1-ch07",
  titre: "La table et le silence",
  periode: "0-5",
  ageApprox: "4–5 ans",
  type: "scene",
  intensite: 4,
  motifs: ["silence", "repas", "hypervigilance"],
  texte: "Repas en famille · cuillère suspendue · vapeur qui disparaît · verre posé trop fort · voix qui descend · chaise qui recule",
  tomeProbable: 1,
  chapitreProbable: 7,
  statut: "non-traite",
  createdAt: "2026-05-14T00:00:00.000Z",
};

function rendre(memoire: MemoireNarrative) {
  return renderToStaticMarkup(<MemoireLieeConsultable memoire={memoire} />);
}

function texteAffiche(html: string): string | null {
  const match = html.match(/<p data-memoire-texte=""[^>]*>([\s\S]*?)<\/p>/);
  if (!match) return null;
  return match[1].replaceAll("&#x27;", "'").replaceAll("&quot;", '"').replaceAll("&lt;", "<").replaceAll("&gt;", ">").replaceAll("&amp;", "&");
}

function geler<T>(valeur: T): T {
  if (valeur && typeof valeur === "object") {
    Object.values(valeur).forEach(geler);
    Object.freeze(valeur);
  }
  return valeur;
}

// Stockage espion global : toute écriture (ou lecture) est enregistrée.
let appels: string[] = [];
const globals = globalThis as { localStorage?: unknown; indexedDB?: unknown };
const origine = { localStorage: globals.localStorage, indexedDB: globals.indexedDB };

beforeEach(() => {
  appels = [];
  const chapitre = JSON.stringify([{ id: "chapitre-7", contenu: "Texte du chapitre 7 en cours." }]);
  globals.localStorage = {
    getItem: (cle: string) => { appels.push(`get:${cle}`); return cle === "chapitres-tome-1" ? chapitre : null; },
    setItem: (cle: string) => { appels.push(`set:${cle}`); },
    removeItem: (cle: string) => { appels.push(`remove:${cle}`); },
    clear: () => { appels.push("clear"); },
  };
  globals.indexedDB = { open: () => { appels.push("indexedDB.open"); } };
});

afterEach(() => {
  globals.localStorage = origine.localStorage;
  globals.indexedDB = origine.indexedDB;
});

describe("LIVRE V1 — consultation d'une mémoire liée depuis /ecrire-maintenant", () => {
  it("A. la mémoire liée est consultable : élément <details> dont le <summary> porte le titre", () => {
    const html = rendre(TABLE_ET_SILENCE);
    expect(html.startsWith("<details")).toBe(true);
    expect(html).toMatch(/<summary[^>]*>[\s\S]*La table et le silence[\s\S]*<\/summary>/);
    // Le contenu est dans le <details>, après le <summary> : révélé à l'ouverture.
    expect(html.indexOf("data-memoire-texte")).toBeGreaterThan(html.indexOf("</summary>"));
    expect(html.trimEnd().endsWith("</details>")).toBe(true);
  });

  it("B. affiche exactement le contenu enregistré, avec les métadonnées utiles", () => {
    const html = rendre(TABLE_ET_SILENCE);
    expect(texteAffiche(html)).toBe(TABLE_ET_SILENCE.texte);
    expect(html).toContain("Motifs : silence, repas, hypervigilance");
  });

  it("C. aucune fabrication : texte court rendu tel quel, texte vide signalé sans contenu inventé", () => {
    const court = { ...TABLE_ET_SILENCE, texte: "Silence." };
    expect(texteAffiche(rendre(court))).toBe("Silence.");

    const multiligne = { ...TABLE_ET_SILENCE, texte: "  Ligne 1\nLigne 2  " };
    expect(texteAffiche(rendre(multiligne))).toBe("  Ligne 1\nLigne 2  ");

    for (const texte of ["", "   \n "]) {
      const html = rendre({ ...TABLE_ET_SILENCE, texte, motifs: undefined });
      expect(texteAffiche(html)).toBeNull();
      expect(html).toContain("Aucun texte enregistré pour cette mémoire.");
    }
  });

  it("D. fermée par défaut et non verrouillée ouverte : l'utilisatrice peut l'ouvrir puis la refermer", () => {
    const html = rendre(TABLE_ET_SILENCE);
    const ouverture = html.match(/^<details[^>]*>/)![0];
    expect(ouverture).not.toMatch(/\sopen/);
  });

  it("E/F. la consultation n'écrit rien, ne lit pas le chapitre et ne modifie pas la mémoire", () => {
    const memoire = geler(structuredClone(TABLE_ET_SILENCE));
    const avant = JSON.stringify(memoire);
    rendre(memoire);
    rendre(memoire);
    expect(appels).toEqual([]);
    expect(JSON.stringify(memoire)).toBe(avant);
  });

  it("G. le résumé conserve la ligne affichée auparavant (âge · intensité · statut)", () => {
    const html = rendre(TABLE_ET_SILENCE);
    expect(html).toContain("4–5 ans · intensité 4 · non-traite");
    const sansAge = rendre({ ...TABLE_ET_SILENCE, ageApprox: undefined, intensite: undefined });
    expect(sansAge).toContain("0-5 · intensité n/r · non-traite");
  });
});
