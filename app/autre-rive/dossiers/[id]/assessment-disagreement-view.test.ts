import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import {
  createAiScoreAssessment,
  createManualScoreAssessment,
  DEFAULT_DISAGREEMENT_THRESHOLD,
  type RelationDossier,
  type ScoreAssessment,
} from "@/lib/autre-rive";

import { computeAssessmentDisagreements } from "./assessment-disagreement-view";

// Phase 9B — Conformité finale SR-D-001 (Décision 3 §6). Tests du
// raccordement produit minimal entre l'écran de fiche dossier et le moteur
// canonique déjà existant et déjà considéré correct
// (detectAssessmentDisagreement, lib/autre-rive/assessment.ts, non modifié
// par cette phase). Ce module ne teste pas le moteur lui-même (déjà couvert
// par assessment.test.ts) : il teste uniquement la sélection des
// assessments à comparer (règle « dernier manuel + dernier IA par
// dimension », décision de gouvernance validée explicitement par
// l'utilisatrice) et l'absence de toute mutation ou persistance nouvelle.

function readModuleSource(): string {
  return readFileSync(join(dirname(fileURLToPath(import.meta.url)), "assessment-disagreement-view.ts"), "utf-8");
}

function buildValidDossier(overrides: Partial<RelationDossier> = {}): RelationDossier {
  return {
    id: "dossier-1",
    name: "Relation avec A.",
    relationType: "romantic",
    status: "active",

    participantIds: ["moi", "julie"],
    primaryUserParticipantId: "moi",

    needs: [],
    assessments: [],
    currentAssessmentRefs: [],

    safetyAssessments: [],

    contestationIds: [],

    conversationIds: [],
    eventIds: [],
    evidenceIds: [],
    journalEntryIds: [],

    notes: "",
    tags: [],

    schemaVersion: 1,
    createdAt: "2026-08-01T00:00:00.000Z",
    updatedAt: "2026-08-01T00:00:00.000Z",

    ...overrides,
  };
}

function manual(id: string, dimension: string, rawValue: number, createdAt: string): ScoreAssessment {
  return createManualScoreAssessment({ id, dimension, rawValue, rawScale: "1-10", createdBy: "utilisatrice", createdAt });
}

function ai(id: string, dimension: string, rawValue: number, createdAt: string, rawScale: "1-10" | "0-100" = "1-10"): ScoreAssessment {
  return createAiScoreAssessment({ id, dimension, rawValue, rawScale, createdBy: "systeme-ia", createdAt });
}

describe("computeAssessmentDisagreements — seuil (tests 1, 2, 3)", () => {
  it("écart de 19 points : aucun désaccord (test 1)", () => {
    // manual 50 (rawValue 5, échelle 1-10), ai 69 (rawValue 6.9)
    const dossier = buildValidDossier({
      assessments: [manual("m-1", "clarte", 5, "2026-09-01T00:00:00.000Z"), ai("a-1", "clarte", 6.9, "2026-09-02T00:00:00.000Z")],
    });
    expect(computeAssessmentDisagreements(dossier)).toEqual([]);
  });

  it("écart de 20 points pile : désaccord signalé (test 2, borne incluse)", () => {
    const dossier = buildValidDossier({
      assessments: [manual("m-1", "clarte", 5, "2026-09-01T00:00:00.000Z"), ai("a-1", "clarte", 7, "2026-09-02T00:00:00.000Z")],
    });
    const views = computeAssessmentDisagreements(dossier);
    expect(views).toHaveLength(1);
    expect(views[0].disagreement.absoluteDifference).toBe(20);
  });

  it("écart de 21 points : désaccord signalé (test 3)", () => {
    const dossier = buildValidDossier({
      assessments: [manual("m-1", "clarte", 5, "2026-09-01T00:00:00.000Z"), ai("a-1", "clarte", 7.1, "2026-09-02T00:00:00.000Z")],
    });
    expect(computeAssessmentDisagreements(dossier)).toHaveLength(1);
  });
});

describe("computeAssessmentDisagreements — non-comparaisons (tests 4, 5, 6, 7)", () => {
  it("dimensions différentes : jamais comparées, aucun désaccord (test 4)", () => {
    const dossier = buildValidDossier({
      assessments: [manual("m-1", "clarte", 2, "2026-09-01T00:00:00.000Z"), ai("a-1", "securite", 9, "2026-09-02T00:00:00.000Z")],
    });
    expect(computeAssessmentDisagreements(dossier)).toEqual([]);
  });

  it("normalizedValue absent sur l'un des deux côtés (legacy importé en 'unknown') : aucun désaccord, jamais d'erreur (test 5)", () => {
    // detectAssessmentDisagreement (moteur non modifié) refuse toute
    // comparaison si l'un des deux normalizedValue est null — reproduit ici
    // via un ScoreAssessment construit directement (pas via
    // createManualScoreAssessment/createAiScoreAssessment, qui n'acceptent
    // que des échelles connues et ne peuvent donc jamais produire ce cas).
    const manualWithoutNormalizedValue: ScoreAssessment = {
      ...manual("m-1", "clarte", 5, "2026-09-01T00:00:00.000Z"),
      score: { rawValue: 5, rawScale: "unknown", normalizedValue: null, source: "unknown" },
    };
    const dossier = buildValidDossier({
      assessments: [manualWithoutNormalizedValue, ai("a-1", "clarte", 9, "2026-09-02T00:00:00.000Z")],
    });
    expect(computeAssessmentDisagreements(dossier)).toEqual([]);
  });

  it("un seul côté présent pour une dimension (aucune évaluation IA) : aucun désaccord (test 5bis)", () => {
    const dossier = buildValidDossier({
      assessments: [manual("m-1", "clarte", 5, "2026-09-01T00:00:00.000Z")],
    });
    expect(computeAssessmentDisagreements(dossier)).toEqual([]);
  });

  it("deux évaluations manuelles seules pour une dimension : jamais comparées entre elles (test 6)", () => {
    const dossier = buildValidDossier({
      assessments: [manual("m-1", "clarte", 2, "2026-09-01T00:00:00.000Z"), manual("m-2", "clarte", 9, "2026-09-02T00:00:00.000Z")],
    });
    expect(computeAssessmentDisagreements(dossier)).toEqual([]);
  });

  it("deux évaluations IA seules pour une dimension : jamais comparées entre elles (test 7)", () => {
    const dossier = buildValidDossier({
      assessments: [ai("a-1", "clarte", 2, "2026-09-01T00:00:00.000Z"), ai("a-2", "clarte", 9, "2026-09-02T00:00:00.000Z")],
    });
    expect(computeAssessmentDisagreements(dossier)).toEqual([]);
  });
});

describe("computeAssessmentDisagreements — sélection déterministe multi-historique (tests 8, 9, 10)", () => {
  it("sélectionne le dernier manuel et le dernier IA par date, pas les plus anciens (test 8)", () => {
    const dossier = buildValidDossier({
      assessments: [
        manual("m-old", "clarte", 9, "2026-09-01T00:00:00.000Z"),
        manual("m-new", "clarte", 2, "2026-09-03T00:00:00.000Z"),
        ai("a-old", "clarte", 9, "2026-09-01T00:00:00.000Z"),
        ai("a-new", "clarte", 2, "2026-09-03T00:00:00.000Z"),
      ],
    });
    const views = computeAssessmentDisagreements(dossier);
    // m-old vs a-old aurait un écart de 0 ; m-new vs a-new aurait aussi un
    // écart de 0. Ce test vérifie surtout que ce sont bien m-new/a-new qui
    // sont retenus, pas un mélange m-old/a-new ou l'inverse.
    expect(views).toEqual([]);
    const dossierWithGap = buildValidDossier({
      assessments: [
        manual("m-old", "clarte", 9, "2026-09-01T00:00:00.000Z"),
        manual("m-new", "clarte", 2, "2026-09-03T00:00:00.000Z"),
        ai("a-old", "clarte", 2, "2026-09-01T00:00:00.000Z"),
        ai("a-new", "clarte", 9, "2026-09-03T00:00:00.000Z"),
      ],
    });
    const viewsWithGap = computeAssessmentDisagreements(dossierWithGap);
    expect(viewsWithGap).toHaveLength(1);
    expect(viewsWithGap[0].manualAssessment.id).toBe("m-new");
    expect(viewsWithGap[0].aiAssessment.id).toBe("a-new");
  });

  it("l'ordre d'insertion dans le tableau assessments n'influence pas le résultat (test 9)", () => {
    const inOrder = buildValidDossier({
      assessments: [
        manual("m-1", "clarte", 2, "2026-09-01T00:00:00.000Z"),
        ai("a-1", "clarte", 9, "2026-09-02T00:00:00.000Z"),
        manual("m-2", "clarte", 3, "2026-09-03T00:00:00.000Z"),
      ],
    });
    const reversed = buildValidDossier({
      assessments: [
        manual("m-2", "clarte", 3, "2026-09-03T00:00:00.000Z"),
        ai("a-1", "clarte", 9, "2026-09-02T00:00:00.000Z"),
        manual("m-1", "clarte", 2, "2026-09-01T00:00:00.000Z"),
      ],
    });
    const viewsInOrder = computeAssessmentDisagreements(inOrder);
    const viewsReversed = computeAssessmentDisagreements(reversed);
    expect(viewsInOrder).toHaveLength(1);
    expect(viewsReversed).toHaveLength(1);
    expect(viewsInOrder[0].manualAssessment.id).toBe(viewsReversed[0].manualAssessment.id);
    expect(viewsInOrder[0].aiAssessment.id).toBe(viewsReversed[0].aiAssessment.id);
  });

  it("createdAt strictement égal (manual) : le départage par id est indépendant de l'ordre d'insertion (test 10, correction post-validation)", () => {
    // CORRECTION : la version précédente affirmait l'indépendance à l'ordre
    // (test 9) tout en retenant, en cas d'égalité stricte de createdAt, "le
    // premier rencontré dans l'ordre d'insertion" — ce qui contredisait
    // cette même propriété. Le départage retient désormais l'id
    // lexicographiquement le plus grand ("m-2" > "m-1"), quel que soit
    // l'ordre du tableau : les deux ordres doivent produire EXACTEMENT le
    // même résultat.
    const orderAB = buildValidDossier({
      assessments: [manual("m-1", "clarte", 2, "2026-09-01T00:00:00.000Z"), manual("m-2", "clarte", 5, "2026-09-01T00:00:00.000Z"), ai("a-1", "clarte", 9, "2026-09-01T00:00:00.000Z")],
    });
    const orderBA = buildValidDossier({
      assessments: [manual("m-2", "clarte", 5, "2026-09-01T00:00:00.000Z"), manual("m-1", "clarte", 2, "2026-09-01T00:00:00.000Z"), ai("a-1", "clarte", 9, "2026-09-01T00:00:00.000Z")],
    });
    const viewsAB = computeAssessmentDisagreements(orderAB);
    const viewsBA = computeAssessmentDisagreements(orderBA);
    expect(viewsAB[0].manualAssessment.id).toBe("m-2");
    expect(viewsBA[0].manualAssessment.id).toBe("m-2");
    expect(viewsAB[0].manualAssessment.id).toBe(viewsBA[0].manualAssessment.id);
  });

  it("createdAt strictement égal (ai) : le départage par id est indépendant de l'ordre d'insertion (test 10bis)", () => {
    const orderAB = buildValidDossier({
      assessments: [manual("m-1", "clarte", 2, "2026-09-01T00:00:00.000Z"), ai("a-1", "clarte", 5, "2026-09-01T00:00:00.000Z"), ai("a-2", "clarte", 9, "2026-09-01T00:00:00.000Z")],
    });
    const orderBA = buildValidDossier({
      assessments: [manual("m-1", "clarte", 2, "2026-09-01T00:00:00.000Z"), ai("a-2", "clarte", 9, "2026-09-01T00:00:00.000Z"), ai("a-1", "clarte", 5, "2026-09-01T00:00:00.000Z")],
    });
    const viewsAB = computeAssessmentDisagreements(orderAB);
    const viewsBA = computeAssessmentDisagreements(orderBA);
    expect(viewsAB[0].aiAssessment.id).toBe("a-2");
    expect(viewsBA[0].aiAssessment.id).toBe("a-2");
    expect(viewsAB[0].aiAssessment.id).toBe(viewsBA[0].aiAssessment.id);
  });

  it("le désaccord final (dimension, écart, ids comparés) est identique lorsque tout l'historique est réordonné (test 10ter)", () => {
    const original = buildValidDossier({
      assessments: [
        manual("m-1", "clarte", 2, "2026-09-01T00:00:00.000Z"),
        manual("m-2", "clarte", 5, "2026-09-01T00:00:00.000Z"),
        ai("a-1", "clarte", 5, "2026-09-01T00:00:00.000Z"),
        ai("a-2", "clarte", 9, "2026-09-01T00:00:00.000Z"),
      ],
    });
    const shuffled = buildValidDossier({
      assessments: [
        ai("a-2", "clarte", 9, "2026-09-01T00:00:00.000Z"),
        manual("m-2", "clarte", 5, "2026-09-01T00:00:00.000Z"),
        ai("a-1", "clarte", 5, "2026-09-01T00:00:00.000Z"),
        manual("m-1", "clarte", 2, "2026-09-01T00:00:00.000Z"),
      ],
    });
    const viewsOriginal = computeAssessmentDisagreements(original);
    const viewsShuffled = computeAssessmentDisagreements(shuffled);
    expect(viewsOriginal).toHaveLength(1);
    expect(viewsShuffled).toHaveLength(1);
    expect(viewsShuffled[0].disagreement.dimension).toBe(viewsOriginal[0].disagreement.dimension);
    expect(viewsShuffled[0].disagreement.absoluteDifference).toBe(viewsOriginal[0].disagreement.absoluteDifference);
    expect(viewsShuffled[0].manualAssessment.id).toBe(viewsOriginal[0].manualAssessment.id);
    expect(viewsShuffled[0].aiAssessment.id).toBe(viewsOriginal[0].aiAssessment.id);
  });

  it("le départage par id ne mute aucun des assessments comparés (test 10quater)", () => {
    const manualA = manual("m-1", "clarte", 2, "2026-09-01T00:00:00.000Z");
    const manualB = manual("m-2", "clarte", 5, "2026-09-01T00:00:00.000Z");
    const aiAssessment = ai("a-1", "clarte", 9, "2026-09-01T00:00:00.000Z");
    const dossier = buildValidDossier({ assessments: [manualA, manualB, aiAssessment] });
    const snapshotA = JSON.stringify(manualA);
    const snapshotB = JSON.stringify(manualB);

    computeAssessmentDisagreements(dossier);

    expect(JSON.stringify(manualA)).toBe(snapshotA);
    expect(JSON.stringify(manualB)).toBe(snapshotB);
  });

  it("le départage par id ne modifie jamais currentAssessmentRefs (test 10quinquies)", () => {
    const dossier = buildValidDossier({
      assessments: [manual("m-1", "clarte", 2, "2026-09-01T00:00:00.000Z"), manual("m-2", "clarte", 5, "2026-09-01T00:00:00.000Z"), ai("a-1", "clarte", 9, "2026-09-01T00:00:00.000Z")],
      currentAssessmentRefs: [],
    });

    computeAssessmentDisagreements(dossier);

    expect(dossier.currentAssessmentRefs).toEqual([]);
  });
});

describe("computeAssessmentDisagreements — non-mutation et non-persistance (tests 11, 12, 13, 14, 15)", () => {
  it("ne modifie jamais les ScoreAssessment comparés (test 11)", () => {
    const manualAssessment = manual("m-1", "clarte", 2, "2026-09-01T00:00:00.000Z");
    const aiAssessment = ai("a-1", "clarte", 9, "2026-09-02T00:00:00.000Z");
    const dossier = buildValidDossier({ assessments: [manualAssessment, aiAssessment] });
    const snapshotManual = JSON.stringify(manualAssessment);
    const snapshotAi = JSON.stringify(aiAssessment);

    computeAssessmentDisagreements(dossier);

    expect(JSON.stringify(manualAssessment)).toBe(snapshotManual);
    expect(JSON.stringify(aiAssessment)).toBe(snapshotAi);
  });

  it("ne modifie jamais currentAssessmentRefs (test 12)", () => {
    const dossier = buildValidDossier({
      assessments: [manual("m-1", "clarte", 2, "2026-09-01T00:00:00.000Z"), ai("a-1", "clarte", 9, "2026-09-02T00:00:00.000Z")],
      currentAssessmentRefs: [],
    });

    computeAssessmentDisagreements(dossier);

    expect(dossier.currentAssessmentRefs).toEqual([]);
  });

  it("ne crée jamais de nouveau ScoreAssessment dans dossier.assessments (test 13)", () => {
    const dossier = buildValidDossier({
      assessments: [manual("m-1", "clarte", 2, "2026-09-01T00:00:00.000Z"), ai("a-1", "clarte", 9, "2026-09-02T00:00:00.000Z")],
    });
    const lengthBefore = dossier.assessments.length;

    computeAssessmentDisagreements(dossier);

    expect(dossier.assessments).toHaveLength(lengthBefore);
  });

  it("ne fait jamais de moyenne ni de score dérivé : les valeurs affichées restent celles des deux assessments d'origine (test 14)", () => {
    const dossier = buildValidDossier({
      assessments: [manual("m-1", "clarte", 2, "2026-09-01T00:00:00.000Z"), ai("a-1", "clarte", 9, "2026-09-02T00:00:00.000Z")],
    });
    const views = computeAssessmentDisagreements(dossier);
    expect(views[0].manualAssessment.score.normalizedValue).toBe(20);
    expect(views[0].aiAssessment.score.normalizedValue).toBe(90);
  });

  it("n'écrit dans aucune clé localStorage (fonction pure, ne dépend d'aucun stockage) (test 15)", () => {
    // Le module DOCUMENTE en commentaire qu'il ne crée pas de nouvelle clé
    // localStorage (justification de la décision "dérivé, non persisté") :
    // on vérifie donc l'absence d'un appel réel à l'API localStorage, pas
    // l'absence du mot dans les commentaires.
    const source = readModuleSource();
    expect(source).not.toMatch(/localStorage\s*[.[]/);
    expect(source).not.toMatch(/addOrUpdateRelationDossier\s*\(/);
  });
});

describe("computeAssessmentDisagreements — dossier non canonique (test 16)", () => {
  it("aucun dossier canonique fourni : aucun calcul, aucune donnée créée (test 16)", () => {
    // Ce module ne lit jamais lui-même le dossier (contrairement à
    // critical-safety-sync.ts) : c'est le panneau (assessment-disagreement-panel.tsx)
    // qui reçoit `dossier: RelationDossier | null` et n'appelle
    // computeAssessmentDisagreements que si `dossier` est non nul. On vérifie
    // ici, de façon statique, que le panneau respecte bien cette garde.
    const panelSource = readFileSync(
      join(dirname(fileURLToPath(import.meta.url)), "assessment-disagreement-panel.tsx"),
      "utf-8",
    );
    expect(panelSource).toMatch(/if\s*\(!dossier\)/);
  });
});

describe("computeAssessmentDisagreements — affichage neutre (tests 17, 18)", () => {
  it("les deux sources et les deux valeurs sont exposées dans le résultat (test 17)", () => {
    const dossier = buildValidDossier({
      assessments: [manual("m-1", "clarte", 2, "2026-09-01T00:00:00.000Z"), ai("a-1", "clarte", 9, "2026-09-02T00:00:00.000Z")],
    });
    const views = computeAssessmentDisagreements(dossier);
    expect(views[0].manualAssessment.source).toBe("manual");
    expect(views[0].aiAssessment.source).toBe("ai");
  });

  it("le panneau n'affirme jamais qu'une source a raison (test 18)", () => {
    // Vérifié directement sur les vues produites par le module testé (pas
    // sur le fichier .tsx en texte brut, qui documente en commentaire les
    // formulations interdites — les chercher littéralement dans tout le
    // fichier produirait un faux positif sur sa propre documentation).
    const dossier = buildValidDossier({
      assessments: [manual("m-1", "clarte", 2, "2026-09-01T00:00:00.000Z"), ai("a-1", "clarte", 9, "2026-09-02T00:00:00.000Z")],
    });
    const views = computeAssessmentDisagreements(dossier);
    expect(views).toHaveLength(1);
    // Le résultat ne contient qu'un écart chiffré et les deux évaluations
    // d'origine : aucun champ ne désigne un "gagnant", aucune moyenne
    // n'est calculée ni exposée.
    expect(views[0]).not.toHaveProperty("average");
    expect(views[0]).not.toHaveProperty("winner");
    expect(views[0]).not.toHaveProperty("correctAssessmentId");
    expect(Object.keys(views[0]).sort()).toEqual(["aiAssessment", "disagreement", "manualAssessment"]);

    const panelSource = readFileSync(
      join(dirname(fileURLToPath(import.meta.url)), "assessment-disagreement-panel.tsx"),
      "utf-8",
    );
    // Les seules chaînes réellement affichées à l'écran restent neutres.
    expect(panelSource).toMatch(/Aucune des deux valeurs n.{0,8}est désignée comme correcte/);
    expect(panelSource).toMatch(/Votre évaluation et l.{0,8}analyse IA diffèrent sensiblement sur cette dimension/);
  });
});

describe("computeAssessmentDisagreements — seuil configurable préservé (test 19)", () => {
  it("un threshold personnalisé est bien transmis au moteur (test 19)", () => {
    const dossier = buildValidDossier({
      assessments: [manual("m-1", "clarte", 5, "2026-09-01T00:00:00.000Z"), ai("a-1", "clarte", 6, "2026-09-02T00:00:00.000Z")],
    });
    expect(computeAssessmentDisagreements(dossier)).toEqual([]);
    const views = computeAssessmentDisagreements(dossier, { threshold: 5 });
    expect(views).toHaveLength(1);
    expect(views[0].disagreement.threshold).toBe(5);
  });

  it("sans threshold personnalisé, le seuil par défaut du moteur (20) s'applique (rappel de couverture)", () => {
    const dossier = buildValidDossier({
      assessments: [manual("m-1", "clarte", 5, "2026-09-01T00:00:00.000Z"), ai("a-1", "clarte", 7, "2026-09-02T00:00:00.000Z")],
    });
    const views = computeAssessmentDisagreements(dossier);
    expect(views[0].disagreement.threshold).toBe(DEFAULT_DISAGREEMENT_THRESHOLD);
  });
});

describe("Phase 9A — non-régression (test 20)", () => {
  it("ce module n'importe et ne modifie jamais critical-safety-sync.ts ni critical-safety-panel.tsx (test 20)", () => {
    const source = readModuleSource();
    expect(source).not.toMatch(/critical-safety/);
  });
});
