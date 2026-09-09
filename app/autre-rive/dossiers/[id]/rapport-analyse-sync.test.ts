import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { afterEach, beforeEach, describe, expect, it } from "vitest";

import {
  addOrUpdateRelationDossier,
  createAiScoreAssessment,
  createExpressedNeed,
  createManualScoreAssessment,
  createObservedNeed,
  readCanonicalRapportsByDossier,
  readRelationDossierById,
  type Conclusion,
  type CriticalSafetyAssessment,
  type RelationDossier,
} from "@/lib/autre-rive";

import {
  buildAssessmentSnapshots,
  buildNeedSnapshots,
  buildSafetySnapshot,
  computeCoverageSummary,
  CONCLUSION_SEVERITY_ORDER,
  COVERAGE_CALCULATION_VERSION,
  deriveOverallConclusionLabel,
  deriveOverallConfidence,
  generateCanonicalRapportAnalyse,
  NO_CONCLUSION_CONFIDENCE_SENTINEL,
  RAPPORT_METHODOLOGY_VERSION,
} from "./rapport-analyse-sync";

// Phase 9E — Conformité finale SR-D-001 (Décision 5, « Rôle de
// RapportAnalyse »). Tests du raccordement produit minimal entre l'écran de
// fiche dossier et le moteur canonique déjà existant et déjà considéré
// correct (addCanonicalRapportAnalyse, lib/autre-rive/rapport-analyse.ts,
// non modifié par cette phase), ainsi que des trois règles de gouvernance
// validées explicitement par l'utilisatrice avant cette implémentation :
// - CoverageSummary : Méthode 1, comptage brut avec seuils explicites ;
// - overallConfidence : minimum des confidences, sentinelle documentée si
//   aucune conclusion n'existe encore ;
// - overallConclusionLabel : "donnees_insuffisantes" si aucune conclusion,
//   sinon le pire cas parmi les conclusions, sans hiérarchie de dimension.

function readSyncSource(): string {
  return readFileSync(join(dirname(fileURLToPath(import.meta.url)), "rapport-analyse-sync.ts"), "utf-8");
}

function readPanelSource(): string {
  return readFileSync(join(dirname(fileURLToPath(import.meta.url)), "rapport-analyse-panel.tsx"), "utf-8");
}

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

const fixedNow = () => "2026-09-06T10:00:00.000Z";

function buildConclusion(overrides: Partial<Conclusion> = {}): Conclusion {
  return {
    id: "conclusion-1",
    dimension: "clarte",
    label: "probablement_saine",
    narrativeSummary: "Résumé narratif de test.",
    confidence: 80,
    confidenceExplanation: "Explication de test.",
    supportingEvidenceIds: [],
    contradictingEvidenceIds: [],
    limitations: [],
    ...overrides,
  };
}

function buildSafetyAssessment(overrides: Partial<CriticalSafetyAssessment> = {}): CriticalSafetyAssessment {
  return {
    id: "safety-1",
    relationDossierId: "dossier-1",
    level: "critical",
    participantIds: ["julie"],
    evidenceIds: [],
    rationale: "Justification de test.",
    createdAt: fixedNow(),
    createdBy: "utilisatrice",
    ...overrides,
  };
}

// -----------------------------------------------------------------------
// 1. computeCoverageSummary — Méthode 1 validée (comptage brut + seuils)
// -----------------------------------------------------------------------

describe("computeCoverageSummary — comptage brut avec seuils explicites (Méthode 1 validée)", () => {
  it("overallCoverage est la somme brute des identifiants réellement présents, jamais un ratio", () => {
    const dossier = buildValidDossier({
      conversationIds: ["c1", "c2"],
      eventIds: ["e1"],
      evidenceIds: ["p1", "p2", "p3"],
      journalEntryIds: ["j1"],
    });

    const coverage = computeCoverageSummary(dossier);

    expect(coverage.overallCoverage).toBe(7);
  });

  it("overallCoverage peut dépasser 1 : ce n'est jamais un pourcentage ou un ratio 0-1", () => {
    const dossier = buildValidDossier({ evidenceIds: Array.from({ length: 50 }, (_, i) => `p${i}`) });

    expect(computeCoverageSummary(dossier).overallCoverage).toBe(50);
  });

  it("coverageLevel = 'insuffisante' à 0", () => {
    expect(computeCoverageSummary(buildValidDossier()).coverageLevel).toBe("insuffisante");
  });

  it("coverageLevel = 'faible' dans la tranche 1-2", () => {
    const dossier = buildValidDossier({ evidenceIds: ["p1", "p2"] });
    expect(computeCoverageSummary(dossier).coverageLevel).toBe("faible");
  });

  it("coverageLevel = 'partielle' dans la tranche 3-9", () => {
    const dossier = buildValidDossier({ evidenceIds: ["p1", "p2", "p3", "p4", "p5"] });
    expect(computeCoverageSummary(dossier).coverageLevel).toBe("partielle");
  });

  it("coverageLevel = 'bonne' dans la tranche 10-29", () => {
    const dossier = buildValidDossier({ evidenceIds: Array.from({ length: 15 }, (_, i) => `p${i}`) });
    expect(computeCoverageSummary(dossier).coverageLevel).toBe("bonne");
  });

  it("coverageLevel = 'tres_bonne' à partir de 30", () => {
    const dossier = buildValidDossier({ evidenceIds: Array.from({ length: 30 }, (_, i) => `p${i}`) });
    expect(computeCoverageSummary(dossier).coverageLevel).toBe("tres_bonne");
  });

  it("les seuils de bascule sont exacts aux bornes (2 -> faible, 3 -> partielle, 9 -> partielle, 10 -> bonne, 29 -> bonne)", () => {
    expect(computeCoverageSummary(buildValidDossier({ evidenceIds: ["p1", "p2"] })).coverageLevel).toBe("faible");
    expect(computeCoverageSummary(buildValidDossier({ evidenceIds: ["p1", "p2", "p3"] })).coverageLevel).toBe("partielle");
    expect(computeCoverageSummary(buildValidDossier({ evidenceIds: Array.from({ length: 9 }, (_, i) => `p${i}`) })).coverageLevel).toBe(
      "partielle",
    );
    expect(computeCoverageSummary(buildValidDossier({ evidenceIds: Array.from({ length: 10 }, (_, i) => `p${i}`) })).coverageLevel).toBe(
      "bonne",
    );
    expect(computeCoverageSummary(buildValidDossier({ evidenceIds: Array.from({ length: 29 }, (_, i) => `p${i}`) })).coverageLevel).toBe(
      "bonne",
    );
  });

  it("missingDataNotes signale chaque catégorie vide, factuellement", () => {
    const coverage = computeCoverageSummary(buildValidDossier());

    expect(coverage.missingDataNotes).toContain("Aucune preuve historisée (evidenceIds vide).");
    expect(coverage.missingDataNotes).toContain("Aucune conversation historisée (conversationIds vide).");
    expect(coverage.missingDataNotes).toContain("Aucun événement historisé (eventIds vide).");
    expect(coverage.missingDataNotes).toContain("Aucune entrée de journal historisée (journalEntryIds vide).");
  });

  it("missingDataNotes omet une catégorie dès qu'elle contient au moins une entrée", () => {
    const coverage = computeCoverageSummary(buildValidDossier({ evidenceIds: ["p1"] }));

    expect(coverage.missingDataNotes).not.toContain("Aucune preuve historisée (evidenceIds vide).");
    expect(coverage.missingDataNotes).toContain("Aucune conversation historisée (conversationIds vide).");
  });

  it("calculationVersion porte la version documentée de la méthode", () => {
    expect(computeCoverageSummary(buildValidDossier()).calculationVersion).toBe(COVERAGE_CALCULATION_VERSION);
    expect(COVERAGE_CALCULATION_VERSION).toBe("coverage-count-v1");
  });

  it("documentedPeriodStart/End proviennent d'horodatages réellement présents dans le dossier, jamais inventés", () => {
    const manual = createManualScoreAssessment({
      id: "m-1",
      dimension: "clarte",
      rawValue: 5,
      rawScale: "1-10",
      createdBy: "utilisatrice",
      createdAt: "2026-07-01T00:00:00.000Z",
    });
    const dossier = buildValidDossier({
      assessments: [manual],
      createdAt: "2026-08-01T00:00:00.000Z",
      updatedAt: "2026-08-15T00:00:00.000Z",
    });

    const coverage = computeCoverageSummary(dossier);

    expect(coverage.documentedPeriodStart).toBe("2026-07-01T00:00:00.000Z");
    expect(coverage.documentedPeriodEnd).toBe("2026-08-15T00:00:00.000Z");
  });

  it("aucune source n'utilise de dénominateur implicite ou de pourcentage de \"relation complète\" (statique)", () => {
    const source = readSyncSource();
    expect(source).not.toMatch(/overallCoverage\s*\/\s*/);
    expect(source).not.toMatch(/overallCoverage\s*\*\s*100/);
  });
});

// -----------------------------------------------------------------------
// 2. deriveOverallConfidence — minimum validé, jamais moyenne
// -----------------------------------------------------------------------

describe("deriveOverallConfidence — minimum des confidences, sentinelle documentée si aucune conclusion", () => {
  it("retourne la sentinelle documentée quand aucune conclusion n'existe", () => {
    expect(deriveOverallConfidence([])).toBe(NO_CONCLUSION_CONFIDENCE_SENTINEL);
    expect(NO_CONCLUSION_CONFIDENCE_SENTINEL).toBe(0);
  });

  it("retourne la confidence unique quand une seule conclusion existe", () => {
    expect(deriveOverallConfidence([buildConclusion({ confidence: 65 })])).toBe(65);
  });

  it("retourne le minimum, jamais la moyenne, de plusieurs conclusions", () => {
    const conclusions = [
      buildConclusion({ id: "c1", confidence: 90 }),
      buildConclusion({ id: "c2", confidence: 30 }),
      buildConclusion({ id: "c3", confidence: 70 }),
    ];

    // Moyenne serait 63.33 : le minimum (30) doit être retourné, jamais la
    // moyenne, conformément à la décision de gouvernance validée.
    expect(deriveOverallConfidence(conclusions)).toBe(30);
  });

  it("le minimum reste correct indépendamment de l'ordre des conclusions", () => {
    const ascending = [buildConclusion({ id: "c1", confidence: 20 }), buildConclusion({ id: "c2", confidence: 80 })];
    const descending = [buildConclusion({ id: "c2", confidence: 80 }), buildConclusion({ id: "c1", confidence: 20 })];

    expect(deriveOverallConfidence(ascending)).toBe(20);
    expect(deriveOverallConfidence(descending)).toBe(20);
  });

  it("n'utilise jamais de moyenne ni de pondération (statique)", () => {
    const source = readSyncSource();
    expect(source).not.toMatch(/reduce\(\s*\(?\s*\w*\s*,\s*\w*\s*\)?\s*=>\s*\w+\s*\+\s*\w+\.confidence/);
    expect(source).not.toMatch(/confidence\s*\*\s*0?\.\d/);
  });
});

// -----------------------------------------------------------------------
// 3. deriveOverallConclusionLabel — pire cas validé, jamais de hiérarchie
// -----------------------------------------------------------------------

describe("deriveOverallConclusionLabel — pire cas parmi les conclusions, aucune hiérarchie de dimension", () => {
  it("retourne 'donnees_insuffisantes' quand aucune conclusion n'existe", () => {
    expect(deriveOverallConclusionLabel([])).toBe("donnees_insuffisantes");
  });

  it("retourne le label unique quand une seule conclusion existe", () => {
    expect(deriveOverallConclusionLabel([buildConclusion({ label: "preoccupante" })])).toBe("preoccupante");
  });

  it("retourne le pire cas parmi plusieurs conclusions", () => {
    const conclusions = [
      buildConclusion({ id: "c1", label: "probablement_saine" }),
      buildConclusion({ id: "c2", label: "malsaine" }),
      buildConclusion({ id: "c3", label: "preoccupante" }),
    ];

    expect(deriveOverallConclusionLabel(conclusions)).toBe("malsaine");
  });

  it("le pire cas reste correct indépendamment de l'ordre des conclusions", () => {
    const first = [buildConclusion({ id: "c1", label: "risque_critique" }), buildConclusion({ id: "c2", label: "probablement_saine" })];
    const second = [buildConclusion({ id: "c2", label: "probablement_saine" }), buildConclusion({ id: "c1", label: "risque_critique" })];

    expect(deriveOverallConclusionLabel(first)).toBe("risque_critique");
    expect(deriveOverallConclusionLabel(second)).toBe("risque_critique");
  });

  it("aucune hiérarchie entre dimensions : le label le plus sévère l'emporte quelle que soit sa dimension d'origine", () => {
    const conclusions = [
      buildConclusion({ id: "c1", dimension: "securite", label: "preoccupante" }),
      buildConclusion({ id: "c2", dimension: "clarte", label: "malsaine" }),
    ];

    // "malsaine" (clarté) l'emporte sur "preoccupante" (sécurité) : ce n'est
    // pas la dimension "sécurité" qui prime, seule la sévérité compte.
    expect(deriveOverallConclusionLabel(conclusions)).toBe("malsaine");
  });

  it("CONCLUSION_SEVERITY_ORDER porte exactement les 5 valeurs d'OverallConclusionLabel, dans l'ordre de sévérité croissante", () => {
    expect(CONCLUSION_SEVERITY_ORDER).toEqual([
      "donnees_insuffisantes",
      "probablement_saine",
      "preoccupante",
      "malsaine",
      "risque_critique",
    ]);
  });

  it("n'utilise jamais de moyenne, de pondération ou de priorité de dimension cachée (statique)", () => {
    const source = readSyncSource();
    expect(source).not.toMatch(/dimension\s*===\s*["']clarte["'].*priorit/i);
    expect(source).not.toMatch(/weight/i);
  });
});

// -----------------------------------------------------------------------
// 4. buildAssessmentSnapshots — pointeur explicite uniquement
// -----------------------------------------------------------------------

describe("buildAssessmentSnapshots — uniquement currentAssessmentRefs, jamais \"la plus récente\"", () => {
  it("aucun pointeur -> aucun instantané, même si des évaluations existent dans le dossier", () => {
    const manual = createManualScoreAssessment({ id: "m-1", dimension: "clarte", rawValue: 8, rawScale: "1-10", createdBy: "utilisatrice", createdAt: fixedNow() });
    const dossier = buildValidDossier({ assessments: [manual], currentAssessmentRefs: [] });

    expect(buildAssessmentSnapshots(dossier, fixedNow())).toEqual([]);
  });

  it("un pointeur correspondant à une évaluation existante produit un instantané fidèle", () => {
    const manual = createManualScoreAssessment({
      id: "m-1",
      dimension: "clarte",
      rawValue: 8,
      rawScale: "1-10",
      createdBy: "utilisatrice",
      createdAt: "2026-08-10T00:00:00.000Z",
      evidenceIds: ["p1"],
      confidence: 75,
    });
    const dossier = buildValidDossier({
      assessments: [manual],
      currentAssessmentRefs: [{ dimension: "clarte", assessmentId: "m-1", selectedAt: fixedNow(), selectedBy: "utilisatrice" }],
    });

    const snapshots = buildAssessmentSnapshots(dossier, fixedNow());

    expect(snapshots).toEqual([
      {
        assessmentId: "m-1",
        dimension: "clarte",
        normalizedValue: 80,
        source: "manual",
        confidence: 75,
        evidenceIds: ["p1"],
        capturedAt: fixedNow(),
      },
    ]);
  });

  it("un pointeur orphelin (évaluation introuvable) est ignoré silencieusement, sans lever d'exception", () => {
    const dossier = buildValidDossier({
      assessments: [],
      currentAssessmentRefs: [{ dimension: "clarte", assessmentId: "introuvable", selectedAt: fixedNow(), selectedBy: "utilisatrice" }],
    });

    expect(() => buildAssessmentSnapshots(dossier, fixedNow())).not.toThrow();
    expect(buildAssessmentSnapshots(dossier, fixedNow())).toEqual([]);
  });

  it("plusieurs pointeurs sur plusieurs dimensions produisent un instantané par dimension désignée", () => {
    const clarte = createManualScoreAssessment({ id: "m-1", dimension: "clarte", rawValue: 8, rawScale: "1-10", createdBy: "utilisatrice", createdAt: fixedNow() });
    const securite = createAiScoreAssessment({ id: "a-1", dimension: "securite", rawValue: 90, rawScale: "0-100", createdBy: "moteur-analyse-v1", createdAt: fixedNow() });
    const dossier = buildValidDossier({
      assessments: [clarte, securite],
      currentAssessmentRefs: [
        { dimension: "clarte", assessmentId: "m-1", selectedAt: fixedNow(), selectedBy: "utilisatrice" },
        { dimension: "securite", assessmentId: "a-1", selectedAt: fixedNow(), selectedBy: "utilisatrice" },
      ],
    });

    const snapshots = buildAssessmentSnapshots(dossier, fixedNow());

    expect(snapshots.map((s) => s.dimension).sort()).toEqual(["clarte", "securite"]);
  });

  it("une dimension sans pointeur explicite n'apparaît jamais, même si une évaluation plus récente existe pour elle", () => {
    const older = createManualScoreAssessment({ id: "m-1", dimension: "clarte", rawValue: 5, rawScale: "1-10", createdBy: "utilisatrice", createdAt: "2026-08-01T00:00:00.000Z" });
    const newer = createManualScoreAssessment({ id: "m-2", dimension: "clarte", rawValue: 9, rawScale: "1-10", createdBy: "utilisatrice", createdAt: "2026-08-20T00:00:00.000Z" });
    // Aucun pointeur désigné pour "clarte" du tout, malgré deux évaluations
    // historisées : aucune des deux ne doit jamais être substituée.
    const dossier = buildValidDossier({ assessments: [older, newer], currentAssessmentRefs: [] });

    expect(buildAssessmentSnapshots(dossier, fixedNow())).toEqual([]);
  });

  it("ne contient jamais de logique de repli \"plus récente\" (statique)", () => {
    const source = readSyncSource();
    expect(source).not.toMatch(/buildAssessmentSnapshots[\s\S]{0,400}\.sort\(/);
  });
});

// -----------------------------------------------------------------------
// 5. buildNeedSnapshots — uniquement les versions en tête (non supersédées)
// -----------------------------------------------------------------------

describe("buildNeedSnapshots — uniquement les besoins en tête, aucune donnée legacy transformée", () => {
  it("aucun besoin -> aucun instantané", () => {
    expect(buildNeedSnapshots(buildValidDossier(), fixedNow())).toEqual([]);
  });

  it("un besoin non supersédé est inclus fidèlement", () => {
    const need = createExpressedNeed({ id: "need-1", label: "Être écoutée", createdAt: fixedNow() });
    const dossier = buildValidDossier({ needs: [need] });

    expect(buildNeedSnapshots(dossier, fixedNow())).toEqual([
      { needId: "need-1", label: "Être écoutée", origin: "expressed", status: "active", confidence: undefined, evidenceIds: [], capturedAt: fixedNow() },
    ]);
  });

  it("un besoin supersédé (remplacé) est exclu, seule sa version la plus récente apparaît", () => {
    const original = createExpressedNeed({ id: "need-1", label: "Besoin flou", createdAt: "2026-08-01T00:00:00.000Z" });
    const corrected = { ...createExpressedNeed({ id: "need-2", label: "Besoin clarifié", createdAt: fixedNow() }), supersedesNeedId: "need-1" };
    const dossier = buildValidDossier({ needs: [original, corrected] });

    const snapshots = buildNeedSnapshots(dossier, fixedNow());

    expect(snapshots).toHaveLength(1);
    expect(snapshots[0].needId).toBe("need-2");
  });

  it("un besoin inactif (rejeté) en tête de chaîne reste snapshoté, avec son statut réel préservé", () => {
    const original = createExpressedNeed({ id: "need-1", label: "Besoin à écarter", createdAt: "2026-08-01T00:00:00.000Z" });
    const rejected = { ...createExpressedNeed({ id: "need-2", label: "Besoin à écarter", createdAt: fixedNow(), status: "inactive" }), supersedesNeedId: "need-1" };
    const dossier = buildValidDossier({ needs: [original, rejected] });

    const snapshots = buildNeedSnapshots(dossier, fixedNow());

    expect(snapshots).toHaveLength(1);
    expect(snapshots[0]).toMatchObject({ needId: "need-2", status: "inactive" });
  });

  it("un besoin observé non confirmé est snapshoté avec son origine réelle, jamais requalifié", () => {
    const observed = createObservedNeed({ id: "need-observed-1", label: "Besoin de réassurance", createdAt: fixedNow() });
    const dossier = buildValidDossier({ needs: [observed] });

    expect(buildNeedSnapshots(dossier, fixedNow())[0]).toMatchObject({ origin: "observed", status: "active" });
  });

  it("ne lit ni ne transforme aucune donnée legacy (notes, journal, red/green flags) en besoin (statique)", () => {
    const source = readSyncSource();
    expect(source).not.toMatch(/\.notes\b/);
    expect(source).not.toMatch(/\.journal\b/);
    expect(source).not.toMatch(/journalEntryIds\.map/);
    expect(source).not.toMatch(/redFlags\.|greenFlags\./);
  });
});

// -----------------------------------------------------------------------
// 6. buildSafetySnapshot — uniquement le pointeur explicite currentSafetyAssessmentRef
// -----------------------------------------------------------------------

describe("buildSafetySnapshot — uniquement currentSafetyAssessmentRef", () => {
  it("aucun pointeur de sécurité courant -> aucun instantané", () => {
    expect(buildSafetySnapshot(buildValidDossier())).toBeUndefined();
  });

  it("un pointeur correspondant à une évaluation existante produit l'instantané exact", () => {
    const safety = buildSafetyAssessment();
    const dossier = buildValidDossier({ safetyAssessments: [safety], currentSafetyAssessmentRef: "safety-1" });

    expect(buildSafetySnapshot(dossier)).toEqual(safety);
  });

  it("un pointeur ne correspondant à aucune évaluation historisée retourne undefined, sans lever d'exception", () => {
    const dossier = buildValidDossier({ safetyAssessments: [], currentSafetyAssessmentRef: "introuvable" });

    expect(() => buildSafetySnapshot(dossier)).not.toThrow();
    expect(buildSafetySnapshot(dossier)).toBeUndefined();
  });

  it("plusieurs évaluations de sécurité historisées : seule celle désignée par le pointeur est retenue", () => {
    const older = buildSafetyAssessment({ id: "safety-older", createdAt: "2026-07-01T00:00:00.000Z" });
    const current = buildSafetyAssessment({ id: "safety-current", createdAt: fixedNow() });
    const dossier = buildValidDossier({ safetyAssessments: [older, current], currentSafetyAssessmentRef: "safety-older" });

    // La plus ancienne est désignée par le pointeur : elle doit être
    // retenue, jamais la plus récente par défaut.
    expect(buildSafetySnapshot(dossier)?.id).toBe("safety-older");
  });
});

// -----------------------------------------------------------------------
// 7. generateCanonicalRapportAnalyse — dossier non canonique
// -----------------------------------------------------------------------

describe("generateCanonicalRapportAnalyse — dossier non canonique", () => {
  it("aucune migration implicite : renvoie skipped_not_canonical, ne crée rien", () => {
    const result = generateCanonicalRapportAnalyse("dossier-jamais-migre", { now: fixedNow });

    expect(result.status).toBe("skipped_not_canonical");
  });
});

// -----------------------------------------------------------------------
// 8. generateCanonicalRapportAnalyse — persistance et invariants
// -----------------------------------------------------------------------

describe("generateCanonicalRapportAnalyse — persistance et invariants", () => {
  beforeEach(() => {
    const memoryLocalStorage = createMemoryLocalStorage();
    (globalThis as { window?: unknown }).window = { localStorage: memoryLocalStorage };
    (globalThis as { localStorage?: unknown }).localStorage = memoryLocalStorage;
  });

  afterEach(() => {
    delete (globalThis as { window?: unknown }).window;
    delete (globalThis as { localStorage?: unknown }).localStorage;
  });

  it("un rapport généré est immédiatement lisible via readCanonicalRapportsByDossier, sans reload", () => {
    addOrUpdateRelationDossier(buildValidDossier());

    const result = generateCanonicalRapportAnalyse("dossier-1", { now: fixedNow, createId: () => "rapport-1" });

    expect(result.status).toBe("applied");
    expect(readCanonicalRapportsByDossier("dossier-1").map((r) => r.id)).toEqual(["rapport-1"]);
  });

  it("triggerReason vaut toujours 'manual_request' : seul déclencheur réel du produit", () => {
    addOrUpdateRelationDossier(buildValidDossier());

    const result = generateCanonicalRapportAnalyse("dossier-1", { now: fixedNow, createId: () => "rapport-1" });

    expect(result.status === "applied" && result.rapport.triggerReason).toBe("manual_request");
  });

  it("observations, hypotheses, conclusions et flags sont toujours des tableaux vides (aucune source honnête aujourd'hui)", () => {
    addOrUpdateRelationDossier(buildValidDossier());

    const result = generateCanonicalRapportAnalyse("dossier-1", { now: fixedNow, createId: () => "rapport-1" });

    expect(result.status === "applied" && result.rapport.observations).toEqual([]);
    expect(result.status === "applied" && result.rapport.hypotheses).toEqual([]);
    expect(result.status === "applied" && result.rapport.conclusions).toEqual([]);
    expect(result.status === "applied" && result.rapport.flags).toEqual([]);
  });

  it("comparison reste absent : aucune règle de comparaison n'est gouvernée aujourd'hui", () => {
    addOrUpdateRelationDossier(buildValidDossier());

    const result = generateCanonicalRapportAnalyse("dossier-1", { now: fixedNow, createId: () => "rapport-1" });

    expect(result.status === "applied" && result.rapport.comparison).toBeUndefined();
  });

  it("overallConfidence vaut la sentinelle documentée quand conclusions est vide (toujours le cas aujourd'hui)", () => {
    addOrUpdateRelationDossier(buildValidDossier());

    const result = generateCanonicalRapportAnalyse("dossier-1", { now: fixedNow, createId: () => "rapport-1" });

    expect(result.status === "applied" && result.rapport.overallConfidence).toBe(NO_CONCLUSION_CONFIDENCE_SENTINEL);
  });

  it("overallConclusionLabel vaut 'donnees_insuffisantes' quand conclusions est vide (toujours le cas aujourd'hui)", () => {
    addOrUpdateRelationDossier(buildValidDossier());

    const result = generateCanonicalRapportAnalyse("dossier-1", { now: fixedNow, createId: () => "rapport-1" });

    expect(result.status === "applied" && result.rapport.overallConclusionLabel).toBe("donnees_insuffisantes");
  });

  it("coverage du rapport correspond exactement à computeCoverageSummary appliqué au même dossier", () => {
    const dossier = buildValidDossier({ evidenceIds: ["p1", "p2", "p3"] });
    addOrUpdateRelationDossier(dossier);

    const result = generateCanonicalRapportAnalyse("dossier-1", { now: fixedNow, createId: () => "rapport-1" });

    expect(result.status === "applied" && result.rapport.coverage).toEqual(computeCoverageSummary(dossier));
  });

  it("methodologyVersion porte la version documentée de cette phase", () => {
    addOrUpdateRelationDossier(buildValidDossier());

    const result = generateCanonicalRapportAnalyse("dossier-1", { now: fixedNow, createId: () => "rapport-1" });

    expect(result.status === "applied" && result.rapport.methodologyVersion).toBe(RAPPORT_METHODOLOGY_VERSION);
  });

  it("assessmentSnapshots/needSnapshots/safetySnapshot du rapport reflètent exactement les pointeurs explicites du dossier au moment de la génération", () => {
    const manual = createManualScoreAssessment({ id: "m-1", dimension: "clarte", rawValue: 7, rawScale: "1-10", createdBy: "utilisatrice", createdAt: fixedNow() });
    const need = createExpressedNeed({ id: "need-1", label: "Être écoutée", createdAt: fixedNow() });
    const safety = buildSafetyAssessment();
    const dossier = buildValidDossier({
      assessments: [manual],
      currentAssessmentRefs: [{ dimension: "clarte", assessmentId: "m-1", selectedAt: fixedNow(), selectedBy: "utilisatrice" }],
      needs: [need],
      safetyAssessments: [safety],
      currentSafetyAssessmentRef: "safety-1",
    });
    addOrUpdateRelationDossier(dossier);

    const result = generateCanonicalRapportAnalyse("dossier-1", { now: fixedNow, createId: () => "rapport-1" });

    expect(result.status === "applied" && result.rapport.assessmentSnapshots).toEqual(buildAssessmentSnapshots(dossier, fixedNow()));
    expect(result.status === "applied" && result.rapport.needSnapshots).toEqual(buildNeedSnapshots(dossier, fixedNow()));
    expect(result.status === "applied" && result.rapport.safetySnapshot).toEqual(safety);
  });

  it("dossier sans aucune donnée canonique (9C/9D non utilisées) produit un rapport honnête aux snapshots vides, sans erreur", () => {
    addOrUpdateRelationDossier(buildValidDossier());

    const result = generateCanonicalRapportAnalyse("dossier-1", { now: fixedNow, createId: () => "rapport-1" });

    expect(result.status === "applied" && result.rapport.assessmentSnapshots).toEqual([]);
    expect(result.status === "applied" && result.rapport.needSnapshots).toEqual([]);
    expect(result.status === "applied" && result.rapport.safetySnapshot).toBeUndefined();
  });
});

// -----------------------------------------------------------------------
// 9. generateCanonicalRapportAnalyse — immuabilité et absence de mutation
// -----------------------------------------------------------------------

describe("generateCanonicalRapportAnalyse — immuabilité et absence de mutation du dossier", () => {
  beforeEach(() => {
    const memoryLocalStorage = createMemoryLocalStorage();
    (globalThis as { window?: unknown }).window = { localStorage: memoryLocalStorage };
    (globalThis as { localStorage?: unknown }).localStorage = memoryLocalStorage;
  });

  afterEach(() => {
    delete (globalThis as { window?: unknown }).window;
    delete (globalThis as { localStorage?: unknown }).localStorage;
  });

  it("générer un rapport ne modifie jamais le RelationDossier lui-même", () => {
    addOrUpdateRelationDossier(buildValidDossier());
    const before = readRelationDossierById("dossier-1");

    generateCanonicalRapportAnalyse("dossier-1", { now: fixedNow, createId: () => "rapport-1" });

    const after = readRelationDossierById("dossier-1");
    expect(after).toEqual(before);
  });

  it("deux générations successives créent deux rapports distincts et immuables, sans se remplacer", () => {
    addOrUpdateRelationDossier(buildValidDossier());

    generateCanonicalRapportAnalyse("dossier-1", { now: fixedNow, createId: () => "rapport-1" });
    generateCanonicalRapportAnalyse("dossier-1", { now: () => "2026-09-07T10:00:00.000Z", createId: () => "rapport-2" });

    const rapports = readCanonicalRapportsByDossier("dossier-1");
    expect(rapports.map((r) => r.id).sort()).toEqual(["rapport-1", "rapport-2"]);
  });

  it("un id de rapport déjà existant est refusé par le moteur canonique sous-jacent, non contourné ici", () => {
    addOrUpdateRelationDossier(buildValidDossier());
    generateCanonicalRapportAnalyse("dossier-1", { now: fixedNow, createId: () => "rapport-1" });

    expect(() => generateCanonicalRapportAnalyse("dossier-1", { now: fixedNow, createId: () => "rapport-1" })).toThrow();
  });

  it("n'appelle jamais addOrUpdateRelationDossier (statique)", () => {
    const source = readSyncSource();
    expect(source).not.toMatch(/addOrUpdateRelationDossier\s*\(/);
  });

  it("ne génère jamais automatiquement un rapport pour un changement de score, de besoin, de sécurité ou de désaccord (statique)", () => {
    const source = readSyncSource();
    expect(source).not.toMatch(/from ["']\.\/manual-score-sync["']/);
    expect(source).not.toMatch(/from ["']\.\/current-assessment-sync["']/);
    expect(source).not.toMatch(/from ["']\.\/needs-sync["']/);
    expect(source).not.toMatch(/from ["']\.\/critical-safety-sync["']/);
    expect(source).not.toMatch(/from ["']\.\/assessment-disagreement-view["']/);
  });
});

// -----------------------------------------------------------------------
// 10. RapportAnalysePanel — vérifications statiques
// -----------------------------------------------------------------------

describe("RapportAnalysePanel — pas de génération automatique, pas de modification/suppression (statique)", () => {
  it("n'utilise aucun effet interne (aucune génération au montage ou au rendu)", () => {
    expect(readPanelSource()).not.toMatch(/useEffect/);
  });

  it("ne propose aucune action de modification, suppression ou régénération d'un rapport déjà généré", () => {
    const source = readPanelSource();
    expect(source).not.toMatch(/[Ss]upprimer/);
    expect(source).not.toMatch(/[Mm]odifier/);
    expect(source).not.toMatch(/[Rr]égénérer/);
  });

  it("affiche le message obligatoire de gouvernance quand overallConclusionLabel vaut 'donnees_insuffisantes'", () => {
    const source = readPanelSource();
    expect(source).toMatch(/Aucune conclusion structurée n'a encore été produite pour ce dossier\./);
    expect(source).toMatch(/donnees_insuffisantes/);
  });

  it("n'appelle generateCanonicalRapportAnalyse que depuis un gestionnaire de clic explicite, jamais ailleurs", () => {
    const source = readPanelSource();
    const callSites = source.match(/generateCanonicalRapportAnalyse\s*\(/g) ?? [];
    // Un seul site d'appel : le gestionnaire handleGenerate déclenché par
    // onClick sur le bouton "Générer un rapport d'analyse".
    expect(callSites).toHaveLength(1);
    expect(source).toMatch(/onClick=\{handleGenerate\}/);
  });
});

// -----------------------------------------------------------------------
// 11. RapportAnalysePanel — actualisation UI sans reload
// -----------------------------------------------------------------------

describe("RapportAnalysePanel — génération immédiatement lisible sans reload", () => {
  beforeEach(() => {
    const memoryLocalStorage = createMemoryLocalStorage();
    (globalThis as { window?: unknown }).window = { localStorage: memoryLocalStorage };
    (globalThis as { localStorage?: unknown }).localStorage = memoryLocalStorage;
  });

  afterEach(() => {
    delete (globalThis as { window?: unknown }).window;
    delete (globalThis as { localStorage?: unknown }).localStorage;
  });

  it("un rapport généré est immédiatement lisible via une relecture synchrone des rapports canoniques, reproduisant exactement onChange() -> refreshCanonicalRapports()", () => {
    addOrUpdateRelationDossier(buildValidDossier());

    generateCanonicalRapportAnalyse("dossier-1", { now: fixedNow, createId: () => "rapport-1" });
    const afterGenerate = readCanonicalRapportsByDossier("dossier-1");

    expect(afterGenerate.some((r) => r.id === "rapport-1")).toBe(true);
  });
});
