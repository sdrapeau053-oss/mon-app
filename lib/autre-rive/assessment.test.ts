import { describe, expect, it } from "vitest";

import {
  addAssessment,
  confirmLegacyScoreSnapshot,
  createAiScoreAssessment,
  createImportedScoreAssessment,
  createManualScoreAssessment,
  detectAssessmentDisagreement,
  excludeLegacyScoreSnapshot,
  getCurrentAssessment,
  setCurrentAssessmentRef,
  suggestLikelyScale,
} from "./assessment";
import type { RelationDossier } from "./types";

// Phase 5 d'IMP-001 (SR-D-001, Décisions 2 et 3) — moteur d'évaluations
// canoniques. Chaque test correspond à un point de la liste de tests
// obligatoires fournie pour cette phase.

function buildValidDossier(): RelationDossier {
  return {
    id: "dossier-1",
    name: "Relation avec A.",
    relationType: "romantic",
    status: "active",

    participantIds: ["user-1", "person-1"],
    primaryUserParticipantId: "user-1",

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
  };
}

const fixedNow = () => "2026-08-13T10:00:00.000Z";

describe("createManualScoreAssessment / createAiScoreAssessment — construction (tests 1 et 2)", () => {
  it("crée une évaluation manuelle valide, échelle 1-10 convertie en 0-100 (test 1)", () => {
    const assessment = createManualScoreAssessment({
      id: "assessment-clarte-manual-1",
      dimension: "clarte",
      rawValue: 7,
      rawScale: "1-10",
      createdBy: "utilisatrice",
      createdAt: fixedNow(),
      rationale: "Je me sens claire sur mes besoins depuis deux semaines.",
    });

    expect(assessment.source).toBe("manual");
    expect(assessment.score.source).toBe("manual");
    expect(assessment.score.rawValue).toBe(7);
    expect(assessment.score.rawScale).toBe("1-10");
    // Règle de conversion Décision 2 §2 : 1-10 → normalizedValue = rawValue × 10.
    expect(assessment.score.normalizedValue).toBe(70);
    expect(assessment.evidenceIds).toEqual([]);
  });

  it("crée une évaluation IA valide, échelle 0-100 conservée telle quelle (test 2)", () => {
    const assessment = createAiScoreAssessment({
      id: "assessment-clarte-ai-1",
      dimension: "clarte",
      rawValue: 62,
      rawScale: "0-100",
      createdBy: "moteur-analyse-v1",
      createdAt: fixedNow(),
      methodologyVersion: "analyse-conversation-v1",
      confidence: 0.6,
      confidenceSource: "system_estimated",
      evidenceIds: ["conversation-1"],
    });

    expect(assessment.source).toBe("ai");
    expect(assessment.score.source).toBe("ai");
    // Règle de conversion Décision 2 §2 : 0-100 → normalizedValue = rawValue.
    expect(assessment.score.normalizedValue).toBe(62);
    expect(assessment.methodologyVersion).toBe("analyse-conversation-v1");
  });
});

describe("addAssessment — historisation (tests 3, 4, 6, 9)", () => {
  it("laisse coexister une évaluation manuelle et une évaluation IA pour la même dimension (test 3)", () => {
    const manual = createManualScoreAssessment({
      id: "assessment-clarte-manual-1",
      dimension: "clarte",
      rawValue: 7,
      rawScale: "1-10",
      createdBy: "utilisatrice",
      createdAt: "2026-08-01T00:00:00.000Z",
    });
    const ai = createAiScoreAssessment({
      id: "assessment-clarte-ai-1",
      dimension: "clarte",
      rawValue: 62,
      rawScale: "0-100",
      createdBy: "moteur-analyse-v1",
      createdAt: "2026-08-02T00:00:00.000Z",
    });

    const afterManual = addAssessment(buildValidDossier(), manual, { now: fixedNow });
    const afterBoth = addAssessment(afterManual, ai, { now: fixedNow });

    expect(afterBoth.assessments).toHaveLength(2);
    expect(afterBoth.assessments.map((item) => item.source).sort()).toEqual(["ai", "manual"]);
  });

  it("ajoute une nouvelle évaluation sans écraser les précédentes, y compris sur la même dimension (test 4)", () => {
    const first = createManualScoreAssessment({
      id: "assessment-clarte-manual-1",
      dimension: "clarte",
      rawValue: 5,
      rawScale: "1-10",
      createdBy: "utilisatrice",
      createdAt: "2026-08-01T00:00:00.000Z",
    });
    const second = createManualScoreAssessment({
      id: "assessment-clarte-manual-2",
      dimension: "clarte",
      rawValue: 8,
      rawScale: "1-10",
      createdBy: "utilisatrice",
      createdAt: "2026-08-05T00:00:00.000Z",
    });

    const afterFirst = addAssessment(buildValidDossier(), first, { now: fixedNow });
    const afterSecond = addAssessment(afterFirst, second, { now: fixedNow });

    expect(afterSecond.assessments).toHaveLength(2);
    expect(afterSecond.assessments[0]).toEqual(first);
    expect(afterSecond.assessments[1]).toEqual(second);
  });

  it("refuse d'ajouter deux évaluations portant le même id (aucune évaluation n'écrase une autre)", () => {
    const assessment = createManualScoreAssessment({
      id: "assessment-clarte-manual-1",
      dimension: "clarte",
      rawValue: 5,
      rawScale: "1-10",
      createdBy: "utilisatrice",
    });

    const afterFirst = addAssessment(buildValidDossier(), assessment, { now: fixedNow });

    expect(() => addAssessment(afterFirst, assessment, { now: fixedNow })).toThrowError();
  });

  it("une nouvelle évaluation IA n'entre jamais automatiquement dans currentAssessmentRefs (test 6)", () => {
    const ai = createAiScoreAssessment({
      id: "assessment-clarte-ai-1",
      dimension: "clarte",
      rawValue: 62,
      rawScale: "0-100",
      createdBy: "moteur-analyse-v1",
    });

    const dossier = addAssessment(buildValidDossier(), ai, { now: fixedNow });

    expect(dossier.currentAssessmentRefs).toEqual([]);
    expect(getCurrentAssessment(dossier, "clarte")).toBeNull();
  });

  it("conserve l'historique complet : un dossier avec plusieurs évaluations garde toutes ses entrées (test 9)", () => {
    const manual = createManualScoreAssessment({
      id: "assessment-clarte-manual-1",
      dimension: "clarte",
      rawValue: 5,
      rawScale: "1-10",
      createdBy: "utilisatrice",
    });
    const ai1 = createAiScoreAssessment({
      id: "assessment-clarte-ai-1",
      dimension: "clarte",
      rawValue: 40,
      rawScale: "0-100",
      createdBy: "moteur-analyse-v1",
    });
    const ai2 = createAiScoreAssessment({
      id: "assessment-clarte-ai-2",
      dimension: "clarte",
      rawValue: 70,
      rawScale: "0-100",
      createdBy: "moteur-analyse-v2",
    });

    let dossier = buildValidDossier();
    dossier = addAssessment(dossier, manual, { now: fixedNow });
    dossier = addAssessment(dossier, ai1, { now: fixedNow });
    dossier = addAssessment(dossier, ai2, { now: fixedNow });

    expect(dossier.assessments.map((item) => item.id)).toEqual([
      "assessment-clarte-manual-1",
      "assessment-clarte-ai-1",
      "assessment-clarte-ai-2",
    ]);
  });
});

describe("setCurrentAssessmentRef / getCurrentAssessment — pointeur explicite (tests 5, 7, 12)", () => {
  it("un pointeur CurrentAssessmentRef explicite détermine l'évaluation retenue pour une dimension (test 5)", () => {
    const manual = createManualScoreAssessment({
      id: "assessment-clarte-manual-1",
      dimension: "clarte",
      rawValue: 5,
      rawScale: "1-10",
      createdBy: "utilisatrice",
    });

    const withAssessment = addAssessment(buildValidDossier(), manual, { now: fixedNow });
    const withRef = setCurrentAssessmentRef(withAssessment, "clarte", manual.id, "utilisatrice", {
      now: fixedNow,
    });

    expect(withRef.currentAssessmentRefs).toEqual([
      {
        dimension: "clarte",
        assessmentId: manual.id,
        selectedAt: fixedNow(),
        selectedBy: "utilisatrice",
      },
    ]);
    expect(getCurrentAssessment(withRef, "clarte")).toEqual(manual);
  });

  it("changer le pointeur courant exige un geste explicite distinct de l'ajout de l'évaluation (test 7)", () => {
    const manual = createManualScoreAssessment({
      id: "assessment-clarte-manual-1",
      dimension: "clarte",
      rawValue: 5,
      rawScale: "1-10",
      createdBy: "utilisatrice",
    });
    const ai = createAiScoreAssessment({
      id: "assessment-clarte-ai-1",
      dimension: "clarte",
      rawValue: 80,
      rawScale: "0-100",
      createdBy: "moteur-analyse-v1",
    });

    let dossier = buildValidDossier();
    dossier = addAssessment(dossier, manual, { now: fixedNow });
    dossier = setCurrentAssessmentRef(dossier, "clarte", manual.id, "utilisatrice", { now: fixedNow });
    dossier = addAssessment(dossier, ai, { now: fixedNow });

    // L'ajout de l'évaluation IA seule ne change rien : le pointeur pointe
    // toujours vers l'évaluation manuelle.
    expect(getCurrentAssessment(dossier, "clarte")).toEqual(manual);

    // Un second appel explicite, distinct de addAssessment, est nécessaire
    // pour faire de l'évaluation IA la valeur courante.
    dossier = setCurrentAssessmentRef(dossier, "clarte", ai.id, "utilisatrice", { now: fixedNow });

    expect(getCurrentAssessment(dossier, "clarte")).toEqual(ai);
    // Un seul pointeur par dimension : l'ancien est remplacé, jamais dupliqué.
    expect(dossier.currentAssessmentRefs).toHaveLength(1);
  });

  it("refuse de désigner comme courante une évaluation qui n'existe pas dans l'historique du dossier", () => {
    const dossier = buildValidDossier();

    expect(() =>
      setCurrentAssessmentRef(dossier, "clarte", "assessment-inexistant", "utilisatrice", { now: fixedNow }),
    ).toThrowError();
  });

  it("gère correctement plusieurs évaluations pour une même dimension en retenant uniquement celle désignée (test 12)", () => {
    const older = createManualScoreAssessment({
      id: "assessment-clarte-manual-1",
      dimension: "clarte",
      rawValue: 3,
      rawScale: "1-10",
      createdBy: "utilisatrice",
      createdAt: "2026-07-01T00:00:00.000Z",
    });
    const newer = createAiScoreAssessment({
      id: "assessment-clarte-ai-1",
      dimension: "clarte",
      rawValue: 90,
      rawScale: "0-100",
      createdBy: "moteur-analyse-v1",
      createdAt: "2026-08-10T00:00:00.000Z",
    });

    let dossier = buildValidDossier();
    dossier = addAssessment(dossier, older, { now: fixedNow });
    dossier = addAssessment(dossier, newer, { now: fixedNow });
    // Sans pointeur explicite, la plus récente n'est PAS retenue implicitement.
    expect(getCurrentAssessment(dossier, "clarte")).toBeNull();

    dossier = setCurrentAssessmentRef(dossier, "clarte", older.id, "utilisatrice", { now: fixedNow });
    // La désignation explicite retient l'évaluation choisie, même si elle
    // n'est pas la plus récente.
    expect(getCurrentAssessment(dossier, "clarte")).toEqual(older);
  });
});

describe("Comportement en l'absence de pointeur courant (test 11)", () => {
  it("retourne null lorsqu'aucune évaluation courante n'existe pour une dimension, même sans historique", () => {
    const dossier = buildValidDossier();

    expect(getCurrentAssessment(dossier, "clarte")).toBeNull();
  });

  it("retourne null pour une dimension sans pointeur alors qu'une autre dimension en a un", () => {
    const manual = createManualScoreAssessment({
      id: "assessment-clarte-manual-1",
      dimension: "clarte",
      rawValue: 5,
      rawScale: "1-10",
      createdBy: "utilisatrice",
    });

    let dossier = buildValidDossier();
    dossier = addAssessment(dossier, manual, { now: fixedNow });
    dossier = setCurrentAssessmentRef(dossier, "clarte", manual.id, "utilisatrice", { now: fixedNow });

    expect(getCurrentAssessment(dossier, "securite")).toBeNull();
  });
});

describe("Provenance et traçabilité préservées (test 8)", () => {
  it("conserve la provenance complète (source, auteur, preuves, méthodologie) telle que fournie (test 8)", () => {
    const ai = createAiScoreAssessment({
      id: "assessment-securite-ai-1",
      dimension: "securite",
      rawValue: 55,
      rawScale: "0-100",
      createdBy: "moteur-analyse-v2",
      createdAt: "2026-08-10T00:00:00.000Z",
      methodologyVersion: "analyse-conversation-v2",
      confidence: 0.72,
      confidenceSource: "system_estimated",
      evidenceIds: ["conversation-3", "conversation-4"],
      rationale: "Basé sur deux conversations récentes.",
    });

    expect(ai).toMatchObject({
      confidence: 0.72,
      confidenceSource: "system_estimated",
      createdAt: "2026-08-10T00:00:00.000Z",
      createdBy: "moteur-analyse-v2",
      evidenceIds: ["conversation-3", "conversation-4"],
      methodologyVersion: "analyse-conversation-v2",
      rationale: "Basé sur deux conversations récentes.",
      source: "ai",
    });
  });
});

describe("Aucune conversion automatique d'un LegacyScoreSnapshot en ScoreAssessment (test 10)", () => {
  it("ajouter ou pointer une évaluation ne touche jamais legacyScoreSnapshots", () => {
    const dossierWithLegacy: RelationDossier = {
      ...buildValidDossier(),
      legacyScoreSnapshots: [
        {
          id: "legacy-score-dossier-1-niveauClarte",
          metricKey: "niveauClarte",
          rawValue: 7,
          originalField: "niveauClarte",
          importedAt: "2026-08-01T00:00:00.000Z",
          provenance: "legacy_unknown",
          migrationStatus: "pending_review",
        },
      ],
    };

    const manual = createManualScoreAssessment({
      id: "assessment-clarte-manual-1",
      dimension: "clarte",
      rawValue: 7,
      rawScale: "1-10",
      createdBy: "utilisatrice",
    });

    let dossier = addAssessment(dossierWithLegacy, manual, { now: fixedNow });
    dossier = setCurrentAssessmentRef(dossier, "clarte", manual.id, "utilisatrice", { now: fixedNow });

    // Le snapshot legacy reste strictement inchangé : ni promu en
    // ScoreAssessment, ni modifié, ni supprimé.
    expect(dossier.legacyScoreSnapshots).toEqual(dossierWithLegacy.legacyScoreSnapshots);
    // Ni addAssessment ni setCurrentAssessmentRef n'exportent de fonction de
    // conversion : seule l'existence de createManualScoreAssessment /
    // createAiScoreAssessment, qui exigent toutes deux une échelle connue
    // (KnownScoreScale), le garantit déjà à la compilation — une valeur
    // legacy "unknown" ne peut pas leur être passée sans conversion
    // manuelle explicite par l'appelant. Le chemin de conversion explicite
    // prévu par la Décision 2 §6 existe bien ailleurs dans ce module
    // (createImportedScoreAssessment / confirmLegacyScoreSnapshot /
    // excludeLegacyScoreSnapshot, voir plus bas) mais n'est jamais appelé
    // implicitement par addAssessment ou setCurrentAssessmentRef.
  });
});

describe("detectAssessmentDisagreement — signalement ≥ 20 points (SR-D-001, Décision 3 §6)", () => {
  function buildPair(valueA: number, valueB: number, dimensionB = "clarte") {
    const assessmentA = createManualScoreAssessment({
      id: "assessment-clarte-manual-1",
      dimension: "clarte",
      rawValue: valueA,
      rawScale: "0-100",
      createdBy: "utilisatrice",
      createdAt: "2026-08-01T00:00:00.000Z",
    });
    const assessmentB = createAiScoreAssessment({
      id: "assessment-clarte-ai-1",
      dimension: dimensionB,
      rawValue: valueB,
      rawScale: "0-100",
      createdBy: "moteur-analyse-v1",
      createdAt: "2026-08-02T00:00:00.000Z",
    });
    return { assessmentA, assessmentB };
  }

  it("ne produit aucun signalement lorsque l'écart est inférieur au seuil (test 1)", () => {
    const { assessmentA, assessmentB } = buildPair(50, 65); // écart 15
    const disagreement = detectAssessmentDisagreement({
      id: "disagreement-1",
      relationDossierId: "dossier-1",
      assessmentA,
      assessmentB,
      createdAt: fixedNow(),
    });

    expect(disagreement).toBeNull();
  });

  it("produit un signalement lorsque l'écart est exactement égal au seuil (test 2)", () => {
    const { assessmentA, assessmentB } = buildPair(50, 70); // écart 20
    const disagreement = detectAssessmentDisagreement({
      id: "disagreement-1",
      relationDossierId: "dossier-1",
      assessmentA,
      assessmentB,
      createdAt: fixedNow(),
    });

    expect(disagreement).not.toBeNull();
    expect(disagreement?.absoluteDifference).toBe(20);
  });

  it("produit un signalement lorsque l'écart dépasse le seuil (test 3)", () => {
    const { assessmentA, assessmentB } = buildPair(30, 90); // écart 60
    const disagreement = detectAssessmentDisagreement({
      id: "disagreement-1",
      relationDossierId: "dossier-1",
      assessmentA,
      assessmentB,
      createdAt: fixedNow(),
    });

    expect(disagreement).not.toBeNull();
    expect(disagreement?.absoluteDifference).toBe(60);
  });

  it("ne produit aucun signalement entre deux dimensions différentes (test 4)", () => {
    const { assessmentA, assessmentB } = buildPair(10, 90, "securite"); // écart 80, dimensions différentes
    const disagreement = detectAssessmentDisagreement({
      id: "disagreement-1",
      relationDossierId: "dossier-1",
      assessmentA,
      assessmentB,
      createdAt: fixedNow(),
    });

    expect(disagreement).toBeNull();
  });

  it("ne modifie aucune évaluation comparée (test 5)", () => {
    const { assessmentA, assessmentB } = buildPair(30, 90);
    const snapshotA = JSON.parse(JSON.stringify(assessmentA));
    const snapshotB = JSON.parse(JSON.stringify(assessmentB));

    detectAssessmentDisagreement({
      id: "disagreement-1",
      relationDossierId: "dossier-1",
      assessmentA,
      assessmentB,
      createdAt: fixedNow(),
    });

    expect(assessmentA).toEqual(snapshotA);
    expect(assessmentB).toEqual(snapshotB);
  });

  it("ne modifie aucun CurrentAssessmentRef — la fonction n'accède à aucun RelationDossier (test 6)", () => {
    const { assessmentA, assessmentB } = buildPair(30, 90);
    let dossier = buildValidDossier();
    dossier = addAssessment(dossier, assessmentA, { now: fixedNow });
    dossier = addAssessment(dossier, assessmentB, { now: fixedNow });
    dossier = setCurrentAssessmentRef(dossier, "clarte", assessmentA.id, "utilisatrice", { now: fixedNow });
    const refsBefore = dossier.currentAssessmentRefs;

    detectAssessmentDisagreement({
      id: "disagreement-1",
      relationDossierId: dossier.id,
      assessmentA,
      assessmentB,
      createdAt: fixedNow(),
    });

    // Le signalement n'a jamais eu accès au dossier : le pointeur reste
    // l'objet exact d'avant l'appel.
    expect(dossier.currentAssessmentRefs).toBe(refsBefore);
  });

  it("respecte un seuil configurable différent de la valeur par défaut (test 7)", () => {
    const { assessmentA, assessmentB } = buildPair(50, 65); // écart 15, sous le seuil par défaut de 20

    const withDefaultThreshold = detectAssessmentDisagreement({
      id: "disagreement-1",
      relationDossierId: "dossier-1",
      assessmentA,
      assessmentB,
      createdAt: fixedNow(),
    });
    expect(withDefaultThreshold).toBeNull();

    const withLowerThreshold = detectAssessmentDisagreement({
      id: "disagreement-1",
      relationDossierId: "dossier-1",
      assessmentA,
      assessmentB,
      threshold: 10,
      createdAt: fixedNow(),
    });
    expect(withLowerThreshold).not.toBeNull();
    expect(withLowerThreshold?.threshold).toBe(10);
  });

  it("calcule correctement absoluteDifference, y compris lorsque A > B (test 8)", () => {
    const { assessmentA, assessmentB } = buildPair(90, 30);
    const disagreement = detectAssessmentDisagreement({
      id: "disagreement-1",
      relationDossierId: "dossier-1",
      assessmentA,
      assessmentB,
      createdAt: fixedNow(),
    });

    expect(disagreement?.absoluteDifference).toBe(60);
  });

  it("initialise toujours le statut à 'open' (test 9)", () => {
    const { assessmentA, assessmentB } = buildPair(20, 80);
    const disagreement = detectAssessmentDisagreement({
      id: "disagreement-1",
      relationDossierId: "dossier-1",
      assessmentA,
      assessmentB,
      createdAt: fixedNow(),
    });

    expect(disagreement?.status).toBe("open");
  });
});

describe("suggestLikelyScale — suggestion informative uniquement (Décision 2 §5)", () => {
  it("suggère 1-10 pour une valeur <= 10", () => {
    expect(suggestLikelyScale(7)).toBe("1-10");
    expect(suggestLikelyScale(10)).toBe("1-10");
  });

  it("suggère 0-100 pour une valeur > 10", () => {
    expect(suggestLikelyScale(11)).toBe("0-100");
    expect(suggestLikelyScale(80)).toBe("0-100");
  });
});

describe("createImportedScoreAssessment — source imported / user_confirmed (Décision 2 §6)", () => {
  it("produit un ScoreValue de source imported et un ScoreAssessment de source user_confirmed", () => {
    const assessment = createImportedScoreAssessment({
      id: "assessment-clarte-imported-1",
      dimension: "clarte",
      rawValue: 7,
      rawScale: "1-10",
      createdBy: "utilisatrice",
      createdAt: fixedNow(),
    });

    expect(assessment.source).toBe("user_confirmed");
    expect(assessment.score.source).toBe("imported");
    expect(assessment.score.rawValue).toBe(7);
    expect(assessment.score.rawScale).toBe("1-10");
    expect(assessment.score.normalizedValue).toBe(70);
  });

  it("applique la règle de conversion exacte de la Décision 2 §2 pour une échelle 0-100", () => {
    const assessment = createImportedScoreAssessment({
      id: "assessment-securite-imported-1",
      dimension: "securite",
      rawValue: 45,
      rawScale: "0-100",
      createdBy: "utilisatrice",
      createdAt: fixedNow(),
    });

    expect(assessment.score.normalizedValue).toBe(45);
  });
});

describe("confirmLegacyScoreSnapshot / excludeLegacyScoreSnapshot — processus de validation (Décision 2 §6)", () => {
  function buildDossierWithLegacySnapshot(): RelationDossier {
    return {
      ...buildValidDossier(),
      legacyScoreSnapshots: [
        {
          id: "legacy-score-dossier-1-niveauClarte",
          metricKey: "niveauClarte",
          rawValue: 7,
          originalField: "niveauClarte",
          importedAt: "2026-08-01T00:00:00.000Z",
          provenance: "legacy_unknown",
          migrationStatus: "pending_review",
        },
      ],
    };
  }

  it("confirmer un snapshot ajoute l'évaluation ET fait passer migrationStatus à confirmed, en un seul mouvement", () => {
    const dossier = buildDossierWithLegacySnapshot();
    const assessment = createImportedScoreAssessment({
      id: "assessment-clarte-imported-1",
      dimension: "clarte",
      rawValue: 7,
      rawScale: "1-10",
      createdBy: "utilisatrice",
      createdAt: fixedNow(),
    });

    const updated = confirmLegacyScoreSnapshot(dossier, "legacy-score-dossier-1-niveauClarte", assessment, {
      now: fixedNow,
    });

    expect(updated.assessments).toEqual([assessment]);
    expect(updated.legacyScoreSnapshots?.[0].migrationStatus).toBe("confirmed");
    // La valeur brute originale n'est jamais modifiée ni supprimée.
    expect(updated.legacyScoreSnapshots?.[0].rawValue).toBe(7);
  });

  it("confirmer refuse un id de snapshot inexistant, sans rien modifier", () => {
    const dossier = buildDossierWithLegacySnapshot();
    const assessment = createImportedScoreAssessment({
      id: "assessment-clarte-imported-1",
      dimension: "clarte",
      rawValue: 7,
      rawScale: "1-10",
      createdBy: "utilisatrice",
      createdAt: fixedNow(),
    });

    expect(() => confirmLegacyScoreSnapshot(dossier, "id-inexistant", assessment, { now: fixedNow })).toThrow();
  });

  it("exclure un snapshot fait passer migrationStatus à excluded sans jamais ajouter d'évaluation", () => {
    const dossier = buildDossierWithLegacySnapshot();

    const updated = excludeLegacyScoreSnapshot(dossier, "legacy-score-dossier-1-niveauClarte", { now: fixedNow });

    expect(updated.assessments).toEqual([]);
    expect(updated.legacyScoreSnapshots?.[0].migrationStatus).toBe("excluded");
    expect(updated.legacyScoreSnapshots?.[0].rawValue).toBe(7);
  });

  it("exclure refuse un id de snapshot inexistant", () => {
    const dossier = buildDossierWithLegacySnapshot();

    expect(() => excludeLegacyScoreSnapshot(dossier, "id-inexistant", { now: fixedNow })).toThrow();
  });

  it("confirmer un snapshot ne touche jamais les autres snapshots du même dossier", () => {
    const dossier: RelationDossier = {
      ...buildValidDossier(),
      legacyScoreSnapshots: [
        {
          id: "legacy-score-dossier-1-niveauClarte",
          metricKey: "niveauClarte",
          rawValue: 7,
          originalField: "niveauClarte",
          importedAt: "2026-08-01T00:00:00.000Z",
          provenance: "legacy_unknown",
          migrationStatus: "pending_review",
        },
        {
          id: "legacy-score-dossier-1-niveauSecurite",
          metricKey: "niveauSecurite",
          rawValue: 90,
          originalField: "niveauSecurite",
          importedAt: "2026-08-01T00:00:00.000Z",
          provenance: "legacy_unknown",
          migrationStatus: "pending_review",
        },
      ],
    };

    const assessment = createImportedScoreAssessment({
      id: "assessment-clarte-imported-1",
      dimension: "clarte",
      rawValue: 7,
      rawScale: "1-10",
      createdBy: "utilisatrice",
      createdAt: fixedNow(),
    });

    const updated = confirmLegacyScoreSnapshot(dossier, "legacy-score-dossier-1-niveauClarte", assessment, {
      now: fixedNow,
    });

    const untouched = updated.legacyScoreSnapshots?.find((s) => s.id === "legacy-score-dossier-1-niveauSecurite");
    expect(untouched?.migrationStatus).toBe("pending_review");
    expect(untouched?.rawValue).toBe(90);
  });
});
