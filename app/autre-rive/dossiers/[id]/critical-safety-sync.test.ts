import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { afterEach, beforeEach, describe, expect, it } from "vitest";

import {
  addOrUpdateRelationDossier,
  AUTRE_RIVE_RELATION_DOSSIERS_KEY,
  createManualScoreAssessment,
  readCanonicalRapportsAnalyse,
  readRelationDossierById,
  type RelationDossier,
} from "@/lib/autre-rive";

import { reportCriticalSafetyEvent, selectCurrentSafetyAssessment } from "./critical-safety-sync";

// Phase 9A — Conformité finale SR-D-001 (Décision 4, « Exception de
// sécurité »). Tests du raccordement produit minimal entre l'écran de
// fiche dossier et le moteur canonique déjà existant et déjà considéré
// correct (lib/autre-rive/critical-safety.ts, non modifié par cette
// phase). L'origine de tout CriticalSafetyAssessment est ici exclusivement
// le geste humain explicite simulé par un appel direct à
// reportCriticalSafetyEvent — jamais un score, un mot-clé ou une sortie IA.

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

const fixedNow = () => "2026-09-05T10:00:00.000Z";

function readModuleSource(): string {
  return readFileSync(join(dirname(fileURLToPath(import.meta.url)), "critical-safety-sync.ts"), "utf-8");
}

describe("reportCriticalSafetyEvent — aucune qualification automatique (tests 1, 2, 6)", () => {
  it("ne lit jamais niveauClarte/niveauReciprocite/niveauSecurite dans son propre code source (test 1)", () => {
    const source = readModuleSource();
    expect(source).not.toMatch(/niveauSecurite/);
    expect(source).not.toMatch(/niveauClarte/);
    expect(source).not.toMatch(/niveauReciprocite/);
  });

  it("ne lit jamais dossier.assessments ni la dimension 'securite' pour qualifier un événement (test 2)", () => {
    const source = readModuleSource();
    expect(source).not.toMatch(/\.assessments\b/);
    expect(source).not.toMatch(/"securite"/);
  });

  it("level est toujours 'critical', jamais paramétrable depuis l'appelant (test 6)", () => {
    const source = readModuleSource();
    // Un seul littéral "critical" assigné à level, jamais un paramètre ou
    // une valeur dérivée d'un score/mot-clé.
    expect(source).toMatch(/level:\s*"critical"/);
    expect(source).not.toMatch(/level:\s*participantIds|level:\s*rationale/);
  });
});

describe("reportCriticalSafetyEvent — dossier non canonique (test 3)", () => {
  it("aucune migration implicite : renvoie skipped_not_canonical, ne crée rien", () => {
    const result = reportCriticalSafetyEvent("dossier-jamais-migre", ["moi"], "Événement grave.", { now: fixedNow });

    expect(result.status).toBe("skipped_not_canonical");
    expect(readRelationDossierById("dossier-jamais-migre")).toBeNull();
  });
});

describe("reportCriticalSafetyEvent — persistance (tests 4, 5, 7, 8, 9, 13, 14, 15, 16, 17)", () => {
  beforeEach(() => {
    const memoryLocalStorage = createMemoryLocalStorage();
    (globalThis as { window?: unknown }).window = { localStorage: memoryLocalStorage };
    (globalThis as { localStorage?: unknown }).localStorage = memoryLocalStorage;
  });

  afterEach(() => {
    delete (globalThis as { window?: unknown }).window;
    delete (globalThis as { localStorage?: unknown }).localStorage;
  });

  it("une création explicite ajoute une évaluation sans écraser l'historique (test 4)", () => {
    addOrUpdateRelationDossier(buildValidDossier());

    reportCriticalSafetyEvent("dossier-1", ["moi"], "Premier événement.", { now: fixedNow, createId: () => "safety-1" });
    reportCriticalSafetyEvent("dossier-1", ["julie"], "Second événement.", { now: fixedNow, createId: () => "safety-2" });

    const reloaded = readRelationDossierById("dossier-1");
    expect(reloaded?.safetyAssessments).toHaveLength(2);
    expect(reloaded?.safetyAssessments.map((a) => a.id)).toEqual(["safety-1", "safety-2"]);
  });

  it("un id déjà présent est rejeté, sans doublon (test 5)", () => {
    addOrUpdateRelationDossier(buildValidDossier());

    reportCriticalSafetyEvent("dossier-1", ["moi"], "Premier événement.", { now: fixedNow, createId: () => "safety-1" });

    expect(() =>
      reportCriticalSafetyEvent("dossier-1", ["julie"], "Second événement.", { now: fixedNow, createId: () => "safety-1" }),
    ).toThrowError();

    const reloaded = readRelationDossierById("dossier-1");
    expect(reloaded?.safetyAssessments).toHaveLength(1);
  });

  it("level: 'critical' produit reanalysisRequired: true et reason 'critical_event' (tests 7, 8)", () => {
    addOrUpdateRelationDossier(buildValidDossier());

    const result = reportCriticalSafetyEvent("dossier-1", ["moi"], "Événement grave.", { now: fixedNow, createId: () => "safety-1" });

    expect(result.status).toBe("applied");
    if (result.status === "applied") {
      expect(result.reanalysisRequired).toBe(true);
      expect(result.reanalysisTriggerReason).toBe("critical_event");
    }
  });

  it("la création ne modifie jamais currentSafetyAssessmentRef (test 9)", () => {
    addOrUpdateRelationDossier(buildValidDossier());

    reportCriticalSafetyEvent("dossier-1", ["moi"], "Événement grave.", { now: fixedNow, createId: () => "safety-1" });

    const reloaded = readRelationDossierById("dossier-1");
    expect(reloaded?.currentSafetyAssessmentRef).toBeUndefined();
  });

  it("l'historique existant (autres champs du dossier) reste préservé (test 13)", () => {
    addOrUpdateRelationDossier(
      buildValidDossier({
        notes: "Notes existantes.",
        tags: ["important"],
        assessments: [createManualScoreAssessment({ id: "a-1", dimension: "clarte", rawValue: 7, rawScale: "1-10", createdBy: "utilisatrice", createdAt: fixedNow() })],
      }),
    );

    reportCriticalSafetyEvent("dossier-1", ["moi"], "Événement grave.", { now: fixedNow, createId: () => "safety-1" });

    const reloaded = readRelationDossierById("dossier-1");
    expect(reloaded?.notes).toBe("Notes existantes.");
    expect(reloaded?.tags).toEqual(["important"]);
  });

  it("aucun RapportAnalyse canonique n'est généré automatiquement (test 14)", () => {
    addOrUpdateRelationDossier(buildValidDossier());

    reportCriticalSafetyEvent("dossier-1", ["moi"], "Événement grave.", { now: fixedNow, createId: () => "safety-1" });

    expect(readCanonicalRapportsAnalyse()).toEqual([]);
  });

  it("aucun ScoreAssessment ordinaire n'est modifié (test 15)", () => {
    const existingAssessment = createManualScoreAssessment({ id: "a-1", dimension: "securite", rawValue: 2, rawScale: "1-10", createdBy: "utilisatrice", createdAt: fixedNow() });
    addOrUpdateRelationDossier(buildValidDossier({ assessments: [existingAssessment] }));

    reportCriticalSafetyEvent("dossier-1", ["moi"], "Événement grave.", { now: fixedNow, createId: () => "safety-1" });

    const reloaded = readRelationDossierById("dossier-1");
    expect(reloaded?.assessments).toEqual([existingAssessment]);
  });

  it("aucune donnée legacy n'est modifiée (test 16)", () => {
    const legacySnapshots = [
      {
        id: "legacy-score-dossier-1-niveauSecurite",
        metricKey: "niveauSecurite",
        rawValue: 2,
        originalField: "niveauSecurite",
        importedAt: fixedNow(),
        provenance: "legacy_unknown" as const,
        migrationStatus: "pending_review" as const,
      },
    ];
    addOrUpdateRelationDossier(buildValidDossier({ legacyScoreSnapshots: legacySnapshots }));
    (globalThis as { localStorage: Storage }).localStorage.setItem("autre-rive-dossiers", JSON.stringify([{ id: "dossier-1", nom: "X", statut: "Y", dateCreation: fixedNow() }]));

    reportCriticalSafetyEvent("dossier-1", ["moi"], "Événement grave.", { now: fixedNow, createId: () => "safety-1" });

    const reloaded = readRelationDossierById("dossier-1");
    expect(reloaded?.legacyScoreSnapshots).toEqual(legacySnapshots);
    const legacyRaw = (globalThis as { localStorage: Storage }).localStorage.getItem("autre-rive-dossiers");
    expect(legacyRaw ? JSON.parse(legacyRaw) : null).toEqual([{ id: "dossier-1", nom: "X", statut: "Y", dateCreation: fixedNow() }]);
  });

  it("aucune nouvelle clé localStorage parallèle : seule la clé canonique des dossiers est écrite (test 17)", () => {
    addOrUpdateRelationDossier(buildValidDossier());
    const storage = (globalThis as { localStorage: Storage }).localStorage;
    const keysBefore = new Set<string>();
    for (let i = 0; i < storage.length; i += 1) {
      const key = storage.key(i);
      if (key) keysBefore.add(key);
    }

    reportCriticalSafetyEvent("dossier-1", ["moi"], "Événement grave.", { now: fixedNow, createId: () => "safety-1" });

    const keysAfter = new Set<string>();
    for (let i = 0; i < storage.length; i += 1) {
      const key = storage.key(i);
      if (key) keysAfter.add(key);
    }

    expect(keysAfter).toEqual(keysBefore);
    expect(Array.from(keysAfter)).toEqual([AUTRE_RIVE_RELATION_DOSSIERS_KEY]);
  });
});

describe("reportCriticalSafetyEvent — sélection explicite des participants (correction de gouvernance)", () => {
  beforeEach(() => {
    const memoryLocalStorage = createMemoryLocalStorage();
    (globalThis as { window?: unknown }).window = { localStorage: memoryLocalStorage };
    (globalThis as { localStorage?: unknown }).localStorage = memoryLocalStorage;
  });

  afterEach(() => {
    delete (globalThis as { window?: unknown }).window;
    delete (globalThis as { localStorage?: unknown }).localStorage;
  });

  it("participantIds n'est jamais déduit de dossier.participantIds : seule la sélection explicite est retenue", () => {
    addOrUpdateRelationDossier(buildValidDossier({ participantIds: ["moi", "julie"] }));

    reportCriticalSafetyEvent("dossier-1", ["julie"], "Événement grave.", { now: fixedNow, createId: () => "safety-1" });

    const reloaded = readRelationDossierById("dossier-1");
    expect(reloaded?.safetyAssessments[0]?.participantIds).toEqual(["julie"]);
  });

  it("son propre code source ne référence jamais dossier.participantIds comme valeur assignée à participantIds", () => {
    const source = readModuleSource();
    expect(source).not.toMatch(/participantIds:\s*canonicalDossier\.participantIds/);
    expect(source).not.toMatch(/participantIds:\s*dossier\.participantIds/);
  });

  it("une liste de participants vide est rejetée", () => {
    addOrUpdateRelationDossier(buildValidDossier());

    expect(() => reportCriticalSafetyEvent("dossier-1", [], "Événement grave.", { now: fixedNow })).toThrowError();
    expect(readRelationDossierById("dossier-1")?.safetyAssessments).toEqual([]);
  });

  it("un participant qui n'appartient pas au dossier est rejeté", () => {
    addOrUpdateRelationDossier(buildValidDossier({ participantIds: ["moi", "julie"] }));

    expect(() =>
      reportCriticalSafetyEvent("dossier-1", ["quelqu-un-d-autre"], "Événement grave.", { now: fixedNow }),
    ).toThrowError();
    expect(readRelationDossierById("dossier-1")?.safetyAssessments).toEqual([]);
  });

  it("une justification vide est rejetée", () => {
    addOrUpdateRelationDossier(buildValidDossier());

    expect(() => reportCriticalSafetyEvent("dossier-1", ["moi"], "   ", { now: fixedNow })).toThrowError();
    expect(readRelationDossierById("dossier-1")?.safetyAssessments).toEqual([]);
  });
});

describe("selectCurrentSafetyAssessment — désignation explicite (tests 10, 11, 12)", () => {
  beforeEach(() => {
    const memoryLocalStorage = createMemoryLocalStorage();
    (globalThis as { window?: unknown }).window = { localStorage: memoryLocalStorage };
    (globalThis as { localStorage?: unknown }).localStorage = memoryLocalStorage;
  });

  afterEach(() => {
    delete (globalThis as { window?: unknown }).window;
    delete (globalThis as { localStorage?: unknown }).localStorage;
  });

  it("la sélection explicite d'une évaluation existante fonctionne (test 10)", () => {
    addOrUpdateRelationDossier(buildValidDossier());
    reportCriticalSafetyEvent("dossier-1", ["moi"], "Événement grave.", { now: fixedNow, createId: () => "safety-1" });

    const result = selectCurrentSafetyAssessment("dossier-1", "safety-1", { now: fixedNow });

    expect(result.status).toBe("applied");
    const reloaded = readRelationDossierById("dossier-1");
    expect(reloaded?.currentSafetyAssessmentRef).toBe("safety-1");
  });

  it("une sélection invalide (id inexistant) est rejetée (test 11)", () => {
    addOrUpdateRelationDossier(buildValidDossier());
    reportCriticalSafetyEvent("dossier-1", ["moi"], "Événement grave.", { now: fixedNow, createId: () => "safety-1" });

    expect(() => selectCurrentSafetyAssessment("dossier-1", "safety-inexistant", { now: fixedNow })).toThrowError();
    const reloaded = readRelationDossierById("dossier-1");
    expect(reloaded?.currentSafetyAssessmentRef).toBeUndefined();
  });

  it("une évaluation appartenant à un autre dossier ne peut pas être sélectionnée (test 12)", () => {
    addOrUpdateRelationDossier(buildValidDossier({ id: "dossier-1" }));
    addOrUpdateRelationDossier(buildValidDossier({ id: "dossier-2", participantIds: ["moi"], primaryUserParticipantId: "moi" }));

    reportCriticalSafetyEvent("dossier-2", ["moi"], "Événement du dossier 2.", { now: fixedNow, createId: () => "safety-dossier-2" });

    expect(() => selectCurrentSafetyAssessment("dossier-1", "safety-dossier-2", { now: fixedNow })).toThrowError();
    const reloadedDossier1 = readRelationDossierById("dossier-1");
    expect(reloadedDossier1?.currentSafetyAssessmentRef).toBeUndefined();
  });

  it("dossier non canonique : skipped_not_canonical", () => {
    const result = selectCurrentSafetyAssessment("dossier-jamais-migre", "safety-1", { now: fixedNow });
    expect(result.status).toBe("skipped_not_canonical");
  });
});

describe("Déterminisme et traçabilité (test 18)", () => {
  beforeEach(() => {
    const memoryLocalStorage = createMemoryLocalStorage();
    (globalThis as { window?: unknown }).window = { localStorage: memoryLocalStorage };
    (globalThis as { localStorage?: unknown }).localStorage = memoryLocalStorage;
  });

  afterEach(() => {
    delete (globalThis as { window?: unknown }).window;
    delete (globalThis as { localStorage?: unknown }).localStorage;
  });

  it("id/createdAt/createdBy injectables produisent un résultat entièrement déterministe et reproductible", () => {
    addOrUpdateRelationDossier(buildValidDossier());

    const result = reportCriticalSafetyEvent("dossier-1", ["moi", "julie"], "Événement grave.", {
      now: fixedNow,
      createId: () => "safety-deterministe",
      createdBy: "utilisatrice",
    });

    expect(result.status).toBe("applied");
    if (result.status === "applied") {
      const created = result.dossier.safetyAssessments.find((a) => a.id === "safety-deterministe");
      expect(created).toEqual({
        id: "safety-deterministe",
        relationDossierId: "dossier-1",
        level: "critical",
        participantIds: ["moi", "julie"],
        evidenceIds: [],
        rationale: "Événement grave.",
        createdAt: fixedNow(),
        createdBy: "utilisatrice",
      });
    }
  });
});
