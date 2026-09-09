import { describe, expect, it } from "vitest";

import { parseAnalyseIA, parseScore } from "./ia-parsing";

// Phase 8bis.3b — Correction de l'absence de score IA (SR-D-001, Décision
// 3 : aucune valeur ne doit être inventée pour combler une absence).

function withScoreTag(tag: string, value: string): string {
  return "[" + tag + "_SCORE]\n" + value + "\n[/" + tag + "_SCORE]";
}

describe("parseScore — score réellement présent (tests 1, 2, 3)", () => {
  it("conserve 0 quand le score réellement présent est 0 (test 1)", () => {
    expect(parseScore(withScoreTag("CLARTE", "0"), "CLARTE")).toBe(0);
  });

  it("conserve 50 quand le score réellement présent est 50 (test 2)", () => {
    expect(parseScore(withScoreTag("CLARTE", "50"), "CLARTE")).toBe(50);
  });

  it("conserve 100 quand le score réellement présent est 100 (test 3)", () => {
    expect(parseScore(withScoreTag("CLARTE", "100"), "CLARTE")).toBe(100);
  });
});

describe("parseScore — absence explicite (tests 4, 5)", () => {
  it("renvoie null quand le tag de score est absent, sans valeur artificielle (test 4)", () => {
    expect(parseScore("[CLARTE]\nTexte sans tag de score.\n[/CLARTE]", "CLARTE")).toBeNull();
  });

  it("renvoie null quand le contenu du tag n'est pas interprétable comme un score, sans valeur artificielle (test 5)", () => {
    expect(parseScore(withScoreTag("CLARTE", "indetermine"), "CLARTE")).toBeNull();
  });

  it("renvoie null quand le tag est présent mais vide", () => {
    expect(parseScore(withScoreTag("CLARTE", ""), "CLARTE")).toBeNull();
  });

  it("clampe toujours sur l'échelle canonique 0-100 quand un entier est réellement présent, hors bornes", () => {
    expect(parseScore(withScoreTag("CLARTE", "150"), "CLARTE")).toBe(100);
    expect(parseScore(withScoreTag("CLARTE", "-20"), "CLARTE")).toBe(0);
  });
});

describe("parseAnalyseIA — dimensions absentes (tests 6, 7, 8, 9)", () => {
  it("clarté absente -> clarteScore null (test 6)", () => {
    const text = [
      "[CLARTE]\nTexte clarté.\n[/CLARTE]",
      withScoreTag("RECIPROCITE", "60"),
      withScoreTag("SECURITE", "80"),
    ].join("\n");

    const ia = parseAnalyseIA(text);

    expect(ia.clarteScore).toBeNull();
    expect(ia.reciprociteScore).toBe(60);
    expect(ia.securiteScore).toBe(80);
  });

  it("réciprocité absente -> reciprociteScore null (test 7)", () => {
    const text = [withScoreTag("CLARTE", "60"), withScoreTag("SECURITE", "80")].join("\n");

    const ia = parseAnalyseIA(text);

    expect(ia.reciprociteScore).toBeNull();
  });

  it("sécurité absente -> securiteScore null (test 8)", () => {
    const text = [withScoreTag("CLARTE", "60"), withScoreTag("RECIPROCITE", "80")].join("\n");

    const ia = parseAnalyseIA(text);

    expect(ia.securiteScore).toBeNull();
  });

  it("les dimensions réellement présentes continuent d'être produites normalement quand une autre est absente (test 9)", () => {
    const text = withScoreTag("CLARTE", "45") + "\n" + withScoreTag("SECURITE", "90");

    const ia = parseAnalyseIA(text);

    expect(ia.clarteScore).toBe(45);
    expect(ia.securiteScore).toBe(90);
    expect(ia.reciprociteScore).toBeNull();
  });
});
