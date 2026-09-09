import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { addOrUpdateRelationDossier, readRelationDossierById, type RelationDossier } from "@/lib/autre-rive";

import {
  confirmLegacyScoreSnapshotInDossier,
  excludeLegacyScoreSnapshotInDossier,
} from "./legacy-score-validation-sync";

// Écran de validation des données historiques (SR-D-001, Décision 2 §6).
// Tests du raccordement produit minimal entre l'écran de fiche dossier et
// le moteur canonique (createImportedScoreAssessment / confirmLegacyScoreSnapshot
// / excludeLegacyScoreSnapshot, lib/autre-rive/assessment.ts, testé
// séparément et déjà considéré correct). L'origine de toute confirmation ou
// exclusion est ici exclusivement le geste humain explicite simulé par un
// appel direct aux fonctions de ce module — jamais une conséquence
// automatique d'une lecture ou d'un affichage.

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

function buildPendingSnapshot(
  overrides: Partial<NonNullable<RelationDossier["legacyScoreSnapshots"]>[number]> = {},
) {
  return {
    id: "legacy-score-dossier-1-niveauClarte",
    metricKey: "niveauClarte",
    rawValue: 7,
    originalField: "niveauClarte",
    importedAt: "2026-08-01T00:00:00.000Z",
    provenance: "legacy_unknown" as const,
    migrationStatus: "pending_review" as const,
    ...overrides,
  };
}

const fixedNow = () => "2026-09-08T10:00:00.000Z";

describe("confirmLegacyScoreSnapshotInDossier — dossier non canonique", () => {
  it("aucune migration implicite : renvoie skipped_not_canonical, ne crée rien", () => {
    const result = confirmLegacyScoreSnapshotInDossier("dossier-jamais-migre", "snap-1", "1-10", { now: fixedNow });

    expect(result.status).toBe("skipped_not_canonical");
    expect(readRelationDossierById("dossier-jamais-migre")).toBeNull();
  });
});

describe("confirmLegacyScoreSnapshotInDossier / excludeLegacyScoreSnapshotInDossier — persistance et invariants", () => {
  beforeEach(() => {
    const memoryLocalStorage = createMemoryLocalStorage();
    (globalThis as { window?: unknown }).window = { localStorage: memoryLocalStorage };
    (globalThis as { localStorage?: unknown }).localStorage = memoryLocalStorage;
  });

  afterEach(() => {
    delete (globalThis as { window?: unknown }).window;
    delete (globalThis as { localStorage?: unknown }).localStorage;
  });

  it("confirme une valeur avec dimension canonique en échelle 1-10 : crée l'évaluation et confirme le snapshot", () => {
    addOrUpdateRelationDossier(buildValidDossier({ legacyScoreSnapshots: [buildPendingSnapshot()] }));

    const result = confirmLegacyScoreSnapshotInDossier(
      "dossier-1",
      "legacy-score-dossier-1-niveauClarte",
      "1-10",
      { now: fixedNow },
    );

    expect(result.status).toBe("applied");
    const reloaded = readRelationDossierById("dossier-1");
    expect(reloaded?.legacyScoreSnapshots?.[0].migrationStatus).toBe("confirmed");
    expect(reloaded?.assessments).toHaveLength(1);
    expect(reloaded?.assessments[0].dimension).toBe("clarte");
    expect(reloaded?.assessments[0].source).toBe("user_confirmed");
    expect(reloaded?.assessments[0].score.source).toBe("imported");
    expect(reloaded?.assessments[0].score.rawScale).toBe("1-10");
    expect(reloaded?.assessments[0].score.normalizedValue).toBe(70);
  });

  it("confirme une valeur en échelle 0-100 : la conversion respecte l'échelle choisie, pas la suggestion", () => {
    addOrUpdateRelationDossier(
      buildValidDossier({
        legacyScoreSnapshots: [buildPendingSnapshot({ id: "legacy-score-dossier-1-niveauSecurite", metricKey: "niveauSecurite", rawValue: 85 })],
      }),
    );

    const result = confirmLegacyScoreSnapshotInDossier(
      "dossier-1",
      "legacy-score-dossier-1-niveauSecurite",
      "0-100",
      { now: fixedNow },
    );

    expect(result.status).toBe("applied");
    const reloaded = readRelationDossierById("dossier-1");
    expect(reloaded?.assessments[0].dimension).toBe("securite");
    expect(reloaded?.assessments[0].score.normalizedValue).toBe(85);
  });

  it("ne crée jamais currentAssessmentRefs : confirmer une valeur historique ne la désigne jamais courante", () => {
    addOrUpdateRelationDossier(buildValidDossier({ legacyScoreSnapshots: [buildPendingSnapshot()] }));

    confirmLegacyScoreSnapshotInDossier("dossier-1", "legacy-score-dossier-1-niveauClarte", "1-10", { now: fixedNow });

    const reloaded = readRelationDossierById("dossier-1");
    expect(reloaded?.currentAssessmentRefs).toEqual([]);
  });

  it("refuse de confirmer energieEmotionnelle (aucune dimension canonique) : skipped_no_canonical_dimension, rien ne change", () => {
    addOrUpdateRelationDossier(
      buildValidDossier({
        legacyScoreSnapshots: [
          buildPendingSnapshot({ id: "legacy-score-dossier-1-energieEmotionnelle", metricKey: "energieEmotionnelle", rawValue: 6 }),
        ],
      }),
    );

    const result = confirmLegacyScoreSnapshotInDossier(
      "dossier-1",
      "legacy-score-dossier-1-energieEmotionnelle",
      "1-10",
      { now: fixedNow },
    );

    expect(result.status).toBe("skipped_no_canonical_dimension");
    const reloaded = readRelationDossierById("dossier-1");
    expect(reloaded?.legacyScoreSnapshots?.[0].migrationStatus).toBe("pending_review");
    expect(reloaded?.assessments).toEqual([]);
  });

  it("renvoie skipped_snapshot_not_found pour un id de snapshot inexistant, sans rien modifier", () => {
    addOrUpdateRelationDossier(buildValidDossier({ legacyScoreSnapshots: [buildPendingSnapshot()] }));

    const result = confirmLegacyScoreSnapshotInDossier("dossier-1", "id-inexistant", "1-10", { now: fixedNow });

    expect(result.status).toBe("skipped_snapshot_not_found");
    const reloaded = readRelationDossierById("dossier-1");
    expect(reloaded?.assessments).toEqual([]);
  });

  it("refuse de confirmer deux fois le même snapshot (double geste) : skipped_already_reviewed, une seule évaluation créée", () => {
    addOrUpdateRelationDossier(buildValidDossier({ legacyScoreSnapshots: [buildPendingSnapshot()] }));

    const first = confirmLegacyScoreSnapshotInDossier("dossier-1", "legacy-score-dossier-1-niveauClarte", "1-10", {
      now: fixedNow,
    });
    const second = confirmLegacyScoreSnapshotInDossier("dossier-1", "legacy-score-dossier-1-niveauClarte", "0-100", {
      now: fixedNow,
    });

    expect(first.status).toBe("applied");
    expect(second.status).toBe("skipped_already_reviewed");
    const reloaded = readRelationDossierById("dossier-1");
    expect(reloaded?.assessments).toHaveLength(1);
  });

  it("exclut une valeur sans jamais créer d'évaluation", () => {
    addOrUpdateRelationDossier(buildValidDossier({ legacyScoreSnapshots: [buildPendingSnapshot()] }));

    const result = excludeLegacyScoreSnapshotInDossier("dossier-1", "legacy-score-dossier-1-niveauClarte", {
      now: fixedNow,
    });

    expect(result.status).toBe("applied");
    const reloaded = readRelationDossierById("dossier-1");
    expect(reloaded?.legacyScoreSnapshots?.[0].migrationStatus).toBe("excluded");
    expect(reloaded?.assessments).toEqual([]);
  });

  it("exclut energieEmotionnelle sans blocage de dimension (l'exclusion ne nécessite aucune dimension)", () => {
    addOrUpdateRelationDossier(
      buildValidDossier({
        legacyScoreSnapshots: [
          buildPendingSnapshot({ id: "legacy-score-dossier-1-energieEmotionnelle", metricKey: "energieEmotionnelle", rawValue: 6 }),
        ],
      }),
    );

    const result = excludeLegacyScoreSnapshotInDossier("dossier-1", "legacy-score-dossier-1-energieEmotionnelle", {
      now: fixedNow,
    });

    expect(result.status).toBe("applied");
    const reloaded = readRelationDossierById("dossier-1");
    expect(reloaded?.legacyScoreSnapshots?.[0].migrationStatus).toBe("excluded");
  });

  it("refuse d'exclure deux fois le même snapshot : skipped_already_reviewed", () => {
    addOrUpdateRelationDossier(buildValidDossier({ legacyScoreSnapshots: [buildPendingSnapshot()] }));

    excludeLegacyScoreSnapshotInDossier("dossier-1", "legacy-score-dossier-1-niveauClarte", { now: fixedNow });
    const second = excludeLegacyScoreSnapshotInDossier("dossier-1", "legacy-score-dossier-1-niveauClarte", {
      now: fixedNow,
    });

    expect(second.status).toBe("skipped_already_reviewed");
  });

  it("ne touche jamais un autre snapshot du même dossier lors d'une confirmation", () => {
    addOrUpdateRelationDossier(
      buildValidDossier({
        legacyScoreSnapshots: [
          buildPendingSnapshot(),
          buildPendingSnapshot({ id: "legacy-score-dossier-1-niveauSecurite", metricKey: "niveauSecurite", rawValue: 90 }),
        ],
      }),
    );

    confirmLegacyScoreSnapshotInDossier("dossier-1", "legacy-score-dossier-1-niveauClarte", "1-10", { now: fixedNow });

    const reloaded = readRelationDossierById("dossier-1");
    const untouched = reloaded?.legacyScoreSnapshots?.find((s) => s.id === "legacy-score-dossier-1-niveauSecurite");
    expect(untouched?.migrationStatus).toBe("pending_review");
  });
});
