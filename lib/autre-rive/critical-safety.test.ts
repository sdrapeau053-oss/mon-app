import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { addCanonicalRapportAnalyse } from "./rapport-analyse";
import { readCanonicalRapportsAnalyse } from "./storage";
import { setCurrentSafetyAssessmentRef, triggerCriticalSafetyReanalysis } from "./critical-safety";
import type { CriticalSafetyAssessment, RelationDossier } from "./types";

// Phase 7 d'IMP-001 (SR-D-001, Décision 4 « Exception de sécurité » +
// Décision 6, item Sécurité) — tests du mécanisme minimal de déclenchement
// d'une réanalyse sur événement critique.

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

    legacyScoreSnapshots: [
      {
        id: "legacy-score-dossier-1-niveauSecurite",
        metricKey: "niveauSecurite",
        rawValue: 3,
        originalField: "niveauSecurite",
        importedAt: "2026-08-01T00:00:00.000Z",
        provenance: "legacy_unknown",
        migrationStatus: "pending_review",
      },
    ],

    schemaVersion: 1,
    createdAt: "2026-08-01T00:00:00.000Z",
    updatedAt: "2026-08-01T00:00:00.000Z",
  };
}

function buildCriticalAssessment(overrides: Partial<CriticalSafetyAssessment> = {}): CriticalSafetyAssessment {
  return {
    id: "safety-1",
    relationDossierId: "dossier-1",
    level: "critical",
    participantIds: ["person-1"],
    evidenceIds: ["evidence-1"],
    rationale: "Menace explicite reçue dans un message, corroborée par une capture d'écran.",
    createdAt: "2026-08-13T00:00:00.000Z",
    createdBy: "utilisatrice",
    ...overrides,
  };
}

const fixedNow = () => "2026-08-13T10:00:00.000Z";

describe("triggerCriticalSafetyReanalysis — comportement de base (tests 1, 2, 5)", () => {
  it("un élément non critique ne crée aucune nouvelle évaluation de sécurité (test 1)", () => {
    const dossier = buildValidDossier();
    const nonCritical = buildCriticalAssessment({ id: "safety-1", level: "concern" });

    const result = triggerCriticalSafetyReanalysis(dossier, nonCritical, { now: fixedNow });

    expect(result.dossier.safetyAssessments).toEqual([]);
    expect(result.reanalysisRequired).toBe(false);
    expect(result.dossier).toBe(dossier);
  });

  it("un élément critique crée une nouvelle CriticalSafetyAssessment dans l'historique (test 2)", () => {
    const dossier = buildValidDossier();
    const critical = buildCriticalAssessment();

    const result = triggerCriticalSafetyReanalysis(dossier, critical, { now: fixedNow });

    expect(result.dossier.safetyAssessments).toEqual([critical]);
  });

  it("un élément critique déclenche une réanalyse, avec la raison définie par la Décision 5 (test 5)", () => {
    const dossier = buildValidDossier();
    const critical = buildCriticalAssessment();

    const result = triggerCriticalSafetyReanalysis(dossier, critical, { now: fixedNow });

    expect(result.reanalysisRequired).toBe(true);
    expect(result.reanalysisTriggerReason).toBe("critical_event");
  });
});

describe("Historisation sans écrasement (tests 3, 4, 9)", () => {
  it("l'ancienne évaluation de sécurité reste intacte après l'ajout d'une nouvelle (test 3)", () => {
    const first = buildCriticalAssessment({ id: "safety-1" });
    let dossier = buildValidDossier();
    dossier = triggerCriticalSafetyReanalysis(dossier, first, { now: fixedNow }).dossier;

    const second = buildCriticalAssessment({ id: "safety-2", rationale: "Second événement, distinct du premier." });
    const result = triggerCriticalSafetyReanalysis(dossier, second, { now: fixedNow });

    expect(result.dossier.safetyAssessments[0]).toEqual(first);
  });

  it("conserve l'historique complet de sécurité, sans écrasement (test 4)", () => {
    const first = buildCriticalAssessment({ id: "safety-1" });
    const second = buildCriticalAssessment({ id: "safety-2" });

    let dossier = buildValidDossier();
    dossier = triggerCriticalSafetyReanalysis(dossier, first, { now: fixedNow }).dossier;
    dossier = triggerCriticalSafetyReanalysis(dossier, second, { now: fixedNow }).dossier;

    expect(dossier.safetyAssessments.map((item) => item.id)).toEqual(["safety-1", "safety-2"]);
  });

  it("plusieurs événements critiques créent plusieurs entrées historiques distinctes, sans écrasement possible (test 9)", () => {
    const first = buildCriticalAssessment({ id: "safety-1" });
    let dossier = buildValidDossier();
    dossier = triggerCriticalSafetyReanalysis(dossier, first, { now: fixedNow }).dossier;

    const duplicate = buildCriticalAssessment({ id: "safety-1", rationale: "Tentative de remplacement." });
    expect(() => triggerCriticalSafetyReanalysis(dossier, duplicate, { now: fixedNow })).toThrowError();

    const second = buildCriticalAssessment({ id: "safety-2" });
    const result = triggerCriticalSafetyReanalysis(dossier, second, { now: fixedNow });
    expect(result.dossier.safetyAssessments).toHaveLength(2);
  });
});

describe("Garanties de non-remplacement automatique (tests 6, 7, 8)", () => {
  beforeEach(() => {
    const memoryLocalStorage = createMemoryLocalStorage();
    (globalThis as { window?: unknown }).window = { localStorage: memoryLocalStorage };
    (globalThis as { localStorage?: unknown }).localStorage = memoryLocalStorage;
  });

  afterEach(() => {
    delete (globalThis as { window?: unknown }).window;
    delete (globalThis as { localStorage?: unknown }).localStorage;
  });

  it("ne modifie jamais un RapportAnalyse existant, courant ou non (test 6)", () => {
    const existingRapport = {
      id: "rapport-1",
      relationDossierId: "dossier-1",
      generatedAt: "2026-08-01T00:00:00.000Z",
      triggerReason: "initial_analysis" as const,
      assessmentSnapshots: [],
      needSnapshots: [],
      observations: [],
      hypotheses: [],
      conclusions: [],
      flags: [],
      coverage: {
        overallCoverage: 0.2,
        coverageLevel: "faible" as const,
        missingDataNotes: [],
        calculationVersion: "coverage-v1",
      },
      overallConfidence: 0.3,
      overallConclusionLabel: "donnees_insuffisantes" as const,
      methodologyVersion: "analyse-conversation-v1",
    };
    addCanonicalRapportAnalyse(existingRapport);

    const dossier = buildValidDossier();
    const critical = buildCriticalAssessment();
    triggerCriticalSafetyReanalysis(dossier, critical, { now: fixedNow });

    // Ce module n'importe ni n'appelle rien du stockage de RapportAnalyse :
    // le rapport existant reste strictement identique.
    expect(readCanonicalRapportsAnalyse()).toEqual([existingRapport]);
  });

  it("ne modifie jamais currentAssessmentRefs (test 7)", () => {
    const dossier: RelationDossier = {
      ...buildValidDossier(),
      currentAssessmentRefs: [
        { dimension: "clarte", assessmentId: "assessment-1", selectedAt: "2026-08-01T00:00:00.000Z", selectedBy: "utilisatrice" },
      ],
    };
    const refsBefore = dossier.currentAssessmentRefs;

    const critical = buildCriticalAssessment();
    const result = triggerCriticalSafetyReanalysis(dossier, critical, { now: fixedNow });

    expect(result.dossier.currentAssessmentRefs).toBe(refsBefore);
  });

  it("ne modifie jamais currentSafetyAssessmentRef", () => {
    const dossier: RelationDossier = { ...buildValidDossier(), currentSafetyAssessmentRef: "safety-0" };

    const critical = buildCriticalAssessment();
    const result = triggerCriticalSafetyReanalysis(dossier, critical, { now: fixedNow });

    expect(result.dossier.currentSafetyAssessmentRef).toBe("safety-0");
  });

  it("ne génère aucun diagnostic ni score supplémentaire (test 8)", () => {
    const dossier = buildValidDossier();
    const critical = buildCriticalAssessment();

    const result = triggerCriticalSafetyReanalysis(dossier, critical, { now: fixedNow });

    // L'évaluation stockée est exactement celle fournie par l'appelant, sans
    // champ ajouté (aucun score, aucune catégorisation calculée par ce module).
    expect(result.dossier.safetyAssessments[0]).toEqual(critical);
    // Le résultat du déclenchement ne contient que le strict nécessaire au
    // signal de réanalyse — aucune donnée de diagnostic annexe.
    expect(Object.keys(result).sort()).toEqual(["dossier", "reanalysisRequired", "reanalysisTriggerReason"].sort());
  });
});

describe("Non-régression sur les données legacy (test 10)", () => {
  beforeEach(() => {
    const memoryLocalStorage = createMemoryLocalStorage();
    (globalThis as { window?: unknown }).window = { localStorage: memoryLocalStorage };
    (globalThis as { localStorage?: unknown }).localStorage = memoryLocalStorage;
  });

  afterEach(() => {
    delete (globalThis as { window?: unknown }).window;
    delete (globalThis as { localStorage?: unknown }).localStorage;
  });

  it("ne touche jamais localStorage : la clé legacy reste strictement intacte (test 10)", () => {
    const legacyRaw = JSON.stringify([{ id: "dossier-legacy-1", nom: "Relation legacy", niveauSecurite: 3 }]);
    localStorage.setItem("autre-rive-dossiers", legacyRaw);

    const dossier = buildValidDossier();
    const critical = buildCriticalAssessment();
    triggerCriticalSafetyReanalysis(dossier, critical, { now: fixedNow });

    expect(localStorage.getItem("autre-rive-dossiers")).toBe(legacyRaw);
  });

  it("ne modifie pas legacyScoreSnapshots du dossier en mémoire (test 10)", () => {
    const dossier = buildValidDossier();
    const snapshotsBefore = dossier.legacyScoreSnapshots;

    const critical = buildCriticalAssessment();
    const result = triggerCriticalSafetyReanalysis(dossier, critical, { now: fixedNow });

    expect(result.dossier.legacyScoreSnapshots).toBe(snapshotsBefore);
  });
});

describe("setCurrentSafetyAssessmentRef — désignation explicite (8bis.1)", () => {
  it("une évaluation de sécurité existante peut être explicitement désignée comme courante (test 1)", () => {
    const dossier = buildValidDossier();
    const critical = buildCriticalAssessment({ id: "safety-1" });
    const withHistory = triggerCriticalSafetyReanalysis(dossier, critical, { now: fixedNow }).dossier;

    const result = setCurrentSafetyAssessmentRef(withHistory, "safety-1", { now: fixedNow });

    expect(result.currentSafetyAssessmentRef).toBe("safety-1");
  });

  it("refuse de désigner une évaluation de sécurité inexistante (test 2)", () => {
    const dossier = buildValidDossier();

    expect(() => setCurrentSafetyAssessmentRef(dossier, "safety-inexistante", { now: fixedNow })).toThrowError();
  });

  it("refuse de désigner une évaluation de sécurité appartenant à un autre dossier (test 3)", () => {
    const dossier = buildValidDossier();
    const critical = buildCriticalAssessment({ id: "safety-1" });
    const withHistory = triggerCriticalSafetyReanalysis(dossier, critical, { now: fixedNow }).dossier;

    // Même id d'évaluation, mais porté par un dossier différent : le
    // pointeur ne doit jamais pouvoir traverser les dossiers.
    const otherDossier: RelationDossier = { ...buildValidDossier(), id: "dossier-2" };

    expect(() => setCurrentSafetyAssessmentRef(otherDossier, "safety-1", { now: fixedNow })).toThrowError();
    // Le dossier d'origine, lui, reste correctement désignable.
    expect(setCurrentSafetyAssessmentRef(withHistory, "safety-1", { now: fixedNow }).currentSafetyAssessmentRef).toBe(
      "safety-1",
    );
  });

  it("une nouvelle désignation remplace le pointeur précédent au lieu d'en créer plusieurs (test 4)", () => {
    const dossier = buildValidDossier();
    const first = buildCriticalAssessment({ id: "safety-1" });
    const second = buildCriticalAssessment({ id: "safety-2" });

    let withHistory = triggerCriticalSafetyReanalysis(dossier, first, { now: fixedNow }).dossier;
    withHistory = triggerCriticalSafetyReanalysis(withHistory, second, { now: fixedNow }).dossier;

    const afterFirstRef = setCurrentSafetyAssessmentRef(withHistory, "safety-1", { now: fixedNow });
    expect(afterFirstRef.currentSafetyAssessmentRef).toBe("safety-1");

    const afterSecondRef = setCurrentSafetyAssessmentRef(afterFirstRef, "safety-2", { now: fixedNow });
    expect(afterSecondRef.currentSafetyAssessmentRef).toBe("safety-2");
    // Un seul pointeur (champ scalaire) : la nouvelle désignation remplace
    // strictement l'ancienne, jamais une collection de pointeurs.
    expect(typeof afterSecondRef.currentSafetyAssessmentRef).toBe("string");
  });

  it("triggerCriticalSafetyReanalysis continue de ne jamais modifier automatiquement currentSafetyAssessmentRef, y compris après une désignation explicite (test 5)", () => {
    const dossier = buildValidDossier();
    const first = buildCriticalAssessment({ id: "safety-1" });
    let withHistory = triggerCriticalSafetyReanalysis(dossier, first, { now: fixedNow }).dossier;
    withHistory = setCurrentSafetyAssessmentRef(withHistory, "safety-1", { now: fixedNow });

    const second = buildCriticalAssessment({ id: "safety-2" });
    const result = triggerCriticalSafetyReanalysis(withHistory, second, { now: fixedNow });

    // Un nouvel événement critique s'ajoute à l'historique mais ne déplace
    // jamais automatiquement le pointeur courant vers lui.
    expect(result.dossier.currentSafetyAssessmentRef).toBe("safety-1");
  });

  it("l'historique safetyAssessments reste intact lors de la désignation (test 6)", () => {
    const dossier = buildValidDossier();
    const critical = buildCriticalAssessment({ id: "safety-1" });
    const withHistory = triggerCriticalSafetyReanalysis(dossier, critical, { now: fixedNow }).dossier;
    const historyBefore = withHistory.safetyAssessments;

    const result = setCurrentSafetyAssessmentRef(withHistory, "safety-1", { now: fixedNow });

    expect(result.safetyAssessments).toBe(historyBefore);
    expect(result.safetyAssessments).toEqual([critical]);
  });
});

describe("Validation de cohérence", () => {
  it("refuse une évaluation de sécurité dont relationDossierId ne correspond pas au dossier fourni", () => {
    const dossier = buildValidDossier();
    const mismatched = buildCriticalAssessment({ relationDossierId: "dossier-2" });

    expect(() => triggerCriticalSafetyReanalysis(dossier, mismatched, { now: fixedNow })).toThrowError();
  });
});
