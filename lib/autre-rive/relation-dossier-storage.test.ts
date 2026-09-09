import { afterEach, beforeEach, describe, expect, it } from "vitest";

import {
  AUTRE_RIVE_RELATION_DOSSIERS_KEY,
  addOrUpdateRelationDossier,
  readRelationDossierById,
  readRelationDossiers,
} from "./storage";
import { LEGACY_DOSSIER_STORAGE_KEY } from "./legacy-adapter";
import type { RelationDossier } from "./types";

// Phase 4 d'IMP-001 (SR-D-001, Décision 4) — tests du stockage canonique.
// Vérifie en particulier que la migration est non destructive vis-à-vis de
// la clé legacy, et que plusieurs dossiers peuvent être migrés un par un
// sans s'écraser entre eux.

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

function buildDossier(overrides: Partial<RelationDossier> = {}): RelationDossier {
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

describe("lib/autre-rive/storage — RelationDossier canonique (Phase 4 IMP-001)", () => {
  beforeEach(() => {
    const memoryLocalStorage = createMemoryLocalStorage();
    (globalThis as { window?: unknown }).window = { localStorage: memoryLocalStorage };
    (globalThis as { localStorage?: unknown }).localStorage = memoryLocalStorage;
  });

  afterEach(() => {
    delete (globalThis as { window?: unknown }).window;
    delete (globalThis as { localStorage?: unknown }).localStorage;
  });

  it("écrit sous une clé distincte de la clé legacy", () => {
    expect(AUTRE_RIVE_RELATION_DOSSIERS_KEY).not.toBe(LEGACY_DOSSIER_STORAGE_KEY);
  });

  it("addOrUpdateRelationDossier enregistre un nouveau dossier canonique, lisible ensuite", () => {
    const dossier = buildDossier();

    const stored = addOrUpdateRelationDossier(dossier);

    expect(stored).toBe(true);
    expect(readRelationDossiers()).toEqual([dossier]);
    expect(readRelationDossierById("dossier-1")).toEqual(dossier);
  });

  it("migre plusieurs dossiers un par un sans écrasement entre eux", () => {
    addOrUpdateRelationDossier(buildDossier({ id: "dossier-1", name: "Relation A" }));
    addOrUpdateRelationDossier(buildDossier({ id: "dossier-2", name: "Relation B" }));

    const all = readRelationDossiers();

    expect(all).toHaveLength(2);
    expect(readRelationDossierById("dossier-1")?.name).toBe("Relation A");
    expect(readRelationDossierById("dossier-2")?.name).toBe("Relation B");
  });

  it("met à jour un dossier existant par id sans dupliquer ni affecter les autres", () => {
    addOrUpdateRelationDossier(buildDossier({ id: "dossier-1", name: "Version initiale" }));
    addOrUpdateRelationDossier(buildDossier({ id: "dossier-2", name: "Autre dossier" }));

    addOrUpdateRelationDossier(buildDossier({ id: "dossier-1", name: "Version mise à jour" }));

    const all = readRelationDossiers();

    expect(all).toHaveLength(2);
    expect(readRelationDossierById("dossier-1")?.name).toBe("Version mise à jour");
    expect(readRelationDossierById("dossier-2")?.name).toBe("Autre dossier");
  });

  it("ne touche jamais à la clé legacy 'autre-rive-dossiers' (sauvegarde non destructive)", () => {
    localStorage.setItem(
      LEGACY_DOSSIER_STORAGE_KEY,
      JSON.stringify([{ id: "dossier-1", nom: "Relation avec A.", statut: "Relation" }]),
    );
    const legacyRawBefore = localStorage.getItem(LEGACY_DOSSIER_STORAGE_KEY);

    addOrUpdateRelationDossier(buildDossier({ id: "dossier-1" }));

    expect(localStorage.getItem(LEGACY_DOSSIER_STORAGE_KEY)).toBe(legacyRawBefore);
  });
});
