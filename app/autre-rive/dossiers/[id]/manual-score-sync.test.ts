import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { addOrUpdateRelationDossier, createAiScoreAssessment, readRelationDossierById } from "@/lib/autre-rive";
import type { RelationDossier } from "@/lib/autre-rive";

import { syncManualScoreToCanonicalDossier } from "./manual-score-sync";

// Phase 8bis.5 — Conformité finale SR-D-001 (Décisions 2 et 3). Tests de la
// canonicalisation de la saisie manuelle des indicateurs (curseurs de
// dossier-screen.tsx) : niveauClarte, niveauReciprocite, niveauSecurite
// gagnent un chemin ScoreAssessment canonique (source "manual"), en plus —
// jamais à la place — de l'écriture legacy plate existante ; energieEmotionnelle
// n'a et ne reçoit aucune dimension canonique inventée.

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

    ...overrides,
  };
}

const fixedNow = () => "2026-08-30T10:00:00.000Z";

describe("syncManualScoreToCanonicalDossier — mapping rawValue -> normalizedValue (tests 1, 2, 3, 4)", () => {
  beforeEach(() => {
    const memoryLocalStorage = createMemoryLocalStorage();
    (globalThis as { window?: unknown }).window = { localStorage: memoryLocalStorage };
    (globalThis as { localStorage?: unknown }).localStorage = memoryLocalStorage;
  });

  afterEach(() => {
    delete (globalThis as { window?: unknown }).window;
    delete (globalThis as { localStorage?: unknown }).localStorage;
  });

  it("une saisie manuelle à 1 produit rawValue=1 / normalizedValue=10 (test 1)", () => {
    addOrUpdateRelationDossier(buildValidDossier());

    const result = syncManualScoreToCanonicalDossier("dossier-1", "niveauClarte", 1, { now: fixedNow, createId: () => "a-1" });

    expect(result.status).toBe("applied");
    const reloaded = readRelationDossierById("dossier-1");
    expect(reloaded?.assessments[0]?.score.rawValue).toBe(1);
    expect(reloaded?.assessments[0]?.score.normalizedValue).toBe(10);
  });

  it("une saisie manuelle à 5 produit normalizedValue=50 (test 2)", () => {
    addOrUpdateRelationDossier(buildValidDossier());

    syncManualScoreToCanonicalDossier("dossier-1", "niveauReciprocite", 5, { now: fixedNow, createId: () => "a-1" });

    const reloaded = readRelationDossierById("dossier-1");
    expect(reloaded?.assessments[0]?.score.normalizedValue).toBe(50);
  });

  it("une saisie manuelle à 10 produit normalizedValue=100 (test 3)", () => {
    addOrUpdateRelationDossier(buildValidDossier());

    syncManualScoreToCanonicalDossier("dossier-1", "niveauSecurite", 10, { now: fixedNow, createId: () => "a-1" });

    const reloaded = readRelationDossierById("dossier-1");
    expect(reloaded?.assessments[0]?.score.normalizedValue).toBe(100);
  });

  it("rawScale est toujours '1-10' pour une saisie manuelle (test 4)", () => {
    addOrUpdateRelationDossier(buildValidDossier());

    syncManualScoreToCanonicalDossier("dossier-1", "niveauClarte", 7, { now: fixedNow, createId: () => "a-1" });

    const reloaded = readRelationDossierById("dossier-1");
    expect(reloaded?.assessments[0]?.score.rawScale).toBe("1-10");
  });
});

describe("syncManualScoreToCanonicalDossier — provenance 'manual' (tests 5, 6)", () => {
  beforeEach(() => {
    const memoryLocalStorage = createMemoryLocalStorage();
    (globalThis as { window?: unknown }).window = { localStorage: memoryLocalStorage };
    (globalThis as { localStorage?: unknown }).localStorage = memoryLocalStorage;
  });

  afterEach(() => {
    delete (globalThis as { window?: unknown }).window;
    delete (globalThis as { localStorage?: unknown }).localStorage;
  });

  it("source = 'manual' sur ScoreValue (test 5)", () => {
    addOrUpdateRelationDossier(buildValidDossier());

    syncManualScoreToCanonicalDossier("dossier-1", "niveauClarte", 6, { now: fixedNow, createId: () => "a-1" });

    const reloaded = readRelationDossierById("dossier-1");
    expect(reloaded?.assessments[0]?.score.source).toBe("manual");
  });

  it("source = 'manual' sur ScoreAssessment (test 6)", () => {
    addOrUpdateRelationDossier(buildValidDossier());

    syncManualScoreToCanonicalDossier("dossier-1", "niveauClarte", 6, { now: fixedNow, createId: () => "a-1" });

    const reloaded = readRelationDossierById("dossier-1");
    expect(reloaded?.assessments[0]?.source).toBe("manual");
  });
});

describe("syncManualScoreToCanonicalDossier — historisation non destructive (tests 7, 8, 9)", () => {
  beforeEach(() => {
    const memoryLocalStorage = createMemoryLocalStorage();
    (globalThis as { window?: unknown }).window = { localStorage: memoryLocalStorage };
    (globalThis as { localStorage?: unknown }).localStorage = memoryLocalStorage;
  });

  afterEach(() => {
    delete (globalThis as { window?: unknown }).window;
    delete (globalThis as { localStorage?: unknown }).localStorage;
  });

  it("une nouvelle saisie ajoute une nouvelle évaluation sans écraser la précédente (test 7, 8)", () => {
    addOrUpdateRelationDossier(buildValidDossier());

    syncManualScoreToCanonicalDossier("dossier-1", "niveauClarte", 3, { now: fixedNow, createId: () => "a-1" });
    syncManualScoreToCanonicalDossier("dossier-1", "niveauClarte", 8, { now: fixedNow, createId: () => "a-2" });

    const reloaded = readRelationDossierById("dossier-1");
    expect(reloaded?.assessments).toHaveLength(2);
    expect(reloaded?.assessments.map((a) => a.score.normalizedValue)).toEqual([30, 80]);
    // La première évaluation reste strictement intacte (test 8).
    expect(reloaded?.assessments[0]).toEqual(
      expect.objectContaining({ id: "a-1", score: expect.objectContaining({ rawValue: 3, normalizedValue: 30 }) }),
    );
  });

  it("une évaluation IA existante reste intacte après une saisie manuelle (test 9)", () => {
    const aiAssessment = createAiScoreAssessment({
      id: "a-ai-1",
      dimension: "clarte",
      rawValue: 72,
      rawScale: "0-100",
      createdBy: "ia-strate",
      createdAt: fixedNow(),
    });
    addOrUpdateRelationDossier(buildValidDossier({ assessments: [aiAssessment] }));

    syncManualScoreToCanonicalDossier("dossier-1", "niveauClarte", 4, { now: fixedNow, createId: () => "a-manual-1" });

    const reloaded = readRelationDossierById("dossier-1");
    expect(reloaded?.assessments).toHaveLength(2);
    const stillThere = reloaded?.assessments.find((a) => a.id === "a-ai-1");
    expect(stillThere).toEqual(aiAssessment);
  });
});

describe("syncManualScoreToCanonicalDossier — legacy jamais touché (tests 10, 11)", () => {
  beforeEach(() => {
    const memoryLocalStorage = createMemoryLocalStorage();
    (globalThis as { window?: unknown }).window = { localStorage: memoryLocalStorage };
    (globalThis as { localStorage?: unknown }).localStorage = memoryLocalStorage;
  });

  afterEach(() => {
    delete (globalThis as { window?: unknown }).window;
    delete (globalThis as { localStorage?: unknown }).localStorage;
  });

  it("ne convertit jamais une ancienne valeur ambiguë (LegacyScoreSnapshot) déjà présente (test 10, 11)", () => {
    const legacySnapshots = [
      {
        id: "legacy-score-dossier-1-niveauSecurite",
        metricKey: "niveauSecurite",
        rawValue: 3,
        originalField: "niveauSecurite",
        importedAt: "2026-08-01T00:00:00.000Z",
        provenance: "legacy_unknown" as const,
        migrationStatus: "pending_review" as const,
      },
    ];
    addOrUpdateRelationDossier(buildValidDossier({ legacyScoreSnapshots: legacySnapshots }));

    syncManualScoreToCanonicalDossier("dossier-1", "niveauSecurite", 9, { now: fixedNow, createId: () => "a-1" });

    const reloaded = readRelationDossierById("dossier-1");
    // Le legacy snapshot ambigu reste bit-à-bit intact : aucune conversion
    // automatique, seule une nouvelle saisie explicite est historisée à côté.
    expect(reloaded?.legacyScoreSnapshots).toEqual(legacySnapshots);
    expect(reloaded?.assessments).toHaveLength(1);
    expect(reloaded?.assessments[0]?.score.source).toBe("manual");
  });
});

describe("syncManualScoreToCanonicalDossier — dimensions canoniques autorisées uniquement (tests 12, 13)", () => {
  beforeEach(() => {
    const memoryLocalStorage = createMemoryLocalStorage();
    (globalThis as { window?: unknown }).window = { localStorage: memoryLocalStorage };
    (globalThis as { localStorage?: unknown }).localStorage = memoryLocalStorage;
  });

  afterEach(() => {
    delete (globalThis as { window?: unknown }).window;
    delete (globalThis as { localStorage?: unknown }).localStorage;
  });

  it("niveauClarte / niveauReciprocite / niveauSecurite utilisent bien les dimensions canoniques déjà existantes (test 12)", () => {
    addOrUpdateRelationDossier(buildValidDossier());

    syncManualScoreToCanonicalDossier("dossier-1", "niveauClarte", 5, { now: fixedNow, createId: (d) => `a-${d}` });
    syncManualScoreToCanonicalDossier("dossier-1", "niveauReciprocite", 5, { now: fixedNow, createId: (d) => `a-${d}` });
    syncManualScoreToCanonicalDossier("dossier-1", "niveauSecurite", 5, { now: fixedNow, createId: (d) => `a-${d}` });

    const reloaded = readRelationDossierById("dossier-1");
    expect(reloaded?.assessments.map((a) => a.dimension).sort()).toEqual(["clarte", "reciprocite", "securite"]);
  });

  it("energieEmotionnelle n'invente aucune dimension canonique : aucune synchronisation n'a lieu (test 13)", () => {
    addOrUpdateRelationDossier(buildValidDossier());

    const result = syncManualScoreToCanonicalDossier("dossier-1", "energieEmotionnelle", 7, { now: fixedNow, createId: () => "a-1" });

    expect(result.status).toBe("skipped_no_canonical_dimension");
    const reloaded = readRelationDossierById("dossier-1");
    expect(reloaded?.assessments).toEqual([]);
  });

  it("son propre code source ne mappe jamais energieEmotionnelle vers une dimension et n'invente aucune dimension 'energie' (test 13)", () => {
    const source = readFileSync(join(dirname(fileURLToPath(import.meta.url)), "manual-score-sync.ts"), "utf-8");

    expect(source).not.toMatch(/energieEmotionnelle\s*:\s*"/);
    // Aucune dimension canonique "energie" (distincte du seul champ legacy
    // "energieEmotionnelle", légitimement cité dans ManualIndicatorKey et
    // les commentaires) n'est jamais assignée comme valeur de mapping.
    expect(source).not.toMatch(/:\s*"energie"/);
  });
});

describe("syncManualScoreToCanonicalDossier — CurrentAssessmentRef jamais désigné automatiquement (test 14)", () => {
  beforeEach(() => {
    const memoryLocalStorage = createMemoryLocalStorage();
    (globalThis as { window?: unknown }).window = { localStorage: memoryLocalStorage };
    (globalThis as { localStorage?: unknown }).localStorage = memoryLocalStorage;
  });

  afterEach(() => {
    delete (globalThis as { window?: unknown }).window;
    delete (globalThis as { localStorage?: unknown }).localStorage;
  });

  it("currentAssessmentRefs reste vide après une saisie manuelle (SR-D-001, Décision 3)", () => {
    addOrUpdateRelationDossier(buildValidDossier());

    const result = syncManualScoreToCanonicalDossier("dossier-1", "niveauClarte", 5, { now: fixedNow, createId: () => "a-1" });

    expect(result.status).toBe("applied");
    if (result.status === "applied") {
      expect(result.dossier.currentAssessmentRefs).toEqual([]);
    }
    const reloaded = readRelationDossierById("dossier-1");
    expect(reloaded?.currentAssessmentRefs).toEqual([]);
  });

  it("un pointeur courant déjà désigné pour une autre évaluation n'est jamais remplacé par la nouvelle saisie manuelle", () => {
    addOrUpdateRelationDossier(
      buildValidDossier({
        assessments: [
          createAiScoreAssessment({ id: "a-ai-1", dimension: "clarte", rawValue: 72, rawScale: "0-100", createdBy: "ia-strate", createdAt: fixedNow() }),
        ],
        currentAssessmentRefs: [{ dimension: "clarte", assessmentId: "a-ai-1", selectedAt: fixedNow(), selectedBy: "ia-strate" }],
      }),
    );

    syncManualScoreToCanonicalDossier("dossier-1", "niveauClarte", 5, { now: fixedNow, createId: () => "a-manual-1" });

    const reloaded = readRelationDossierById("dossier-1");
    expect(reloaded?.currentAssessmentRefs).toEqual([{ dimension: "clarte", assessmentId: "a-ai-1", selectedAt: fixedNow(), selectedBy: "ia-strate" }]);
  });

  it("son propre code source n'appelle jamais setCurrentAssessmentRef : garantie structurelle (test 14)", () => {
    const source = readFileSync(join(dirname(fileURLToPath(import.meta.url)), "manual-score-sync.ts"), "utf-8");

    expect(source).not.toMatch(/setCurrentAssessmentRef\s*\(/);
    expect(source).not.toMatch(/^import[^;]*setCurrentAssessmentRef[^;]*;/m);
  });
});

describe("syncManualScoreToCanonicalDossier — absence de migration silencieuse (garantie complémentaire, cf. ai-score-sync)", () => {
  it("ne crée aucun dossier canonique et ne le migre pas implicitement si aucune version canonique n'existe déjà", () => {
    const result = syncManualScoreToCanonicalDossier("dossier-jamais-migre", "niveauClarte", 5, { now: fixedNow, createId: () => "a-1" });

    expect(result.status).toBe("skipped_not_canonical");
    expect(readRelationDossierById("dossier-jamais-migre")).toBeNull();
  });
});

describe("dossier-screen.tsx — affichage 1-10 toujours fonctionnel, écriture legacy inchangée (test 15)", () => {
  const screenSource = readFileSync(join(dirname(fileURLToPath(import.meta.url)), "dossier-screen.tsx"), "utf-8");

  it("les curseurs restent affichés sur une échelle 1-10 (min=1, max=10, type=range)", () => {
    expect(screenSource).toMatch(/max=\{10\}/);
    expect(screenSource).toMatch(/min=\{1\}/);
    expect(screenSource).toMatch(/type="range"/);
  });

  it("l'écriture legacy plate updateDossier(...) reste appelée en plus de la synchronisation canonique", () => {
    expect(screenSource).toMatch(/updateDossier\(\(current\) => \(\{ \.\.\.current, \[key\]: rawValue \}\)\)/);
    expect(screenSource).toMatch(/syncManualScoreToCanonicalDossier\(dossierId, key, rawValue\)/);
  });
});
