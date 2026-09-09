import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { afterEach, beforeEach, describe, expect, it } from "vitest";

import {
  addOrUpdateRelationDossier,
  AUTRE_RIVE_RELATION_DOSSIERS_KEY,
  readRelationDossiers,
  type RelationDossier,
} from "@/lib/autre-rive";

import {
  buildCanonicalIndex,
  buildDossierDisplayIdentity,
  isLegacyDossierListItem,
  readLegacyDossierList,
  saveLegacyDossierList,
  updateLegacyDossierList,
  type LegacyDossierListItem,
} from "./dossier-list-view";

// Phase 8bis.4a — Conformité finale SR-D-001 (Décisions 1 et 4). Tests de
// la bascule de app/autre-rive/dossiers/page.tsx : suppression de la
// définition locale "RelationDossier", séparation stricte lecture
// legacy / affichage canonique-prioritaire, aucune migration silencieuse.

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

function buildLegacyItem(overrides: Partial<LegacyDossierListItem> = {}): LegacyDossierListItem {
  return {
    id: "d1",
    nom: "Ancien Nom",
    statut: "Rencontre",
    dateCreation: "2026-08-01",
    typeRelation: "Romantique",
    niveauClarte: 7,
    niveauReciprocite: 6,
    niveauSecurite: 8,
    ...overrides,
  };
}

function buildValidCanonicalDossier(overrides: Partial<RelationDossier> = {}): RelationDossier {
  return {
    id: "d1",
    name: "Nouveau Nom",
    relationType: "family",
    status: "paused",

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

function readPageSource(): string {
  const here = dirname(fileURLToPath(import.meta.url));
  return readFileSync(join(here, "page.tsx"), "utf-8");
}

describe("page.tsx — absence de toute définition locale RelationDossier (test 1)", () => {
  it("ne déclare plus aucun type ou interface local nommé RelationDossier", () => {
    const source = readPageSource();

    expect(source).not.toMatch(/interface\s+RelationDossier\b/);
    expect(source).not.toMatch(/type\s+RelationDossier\s*=/);
  });

  it("utilise bien LegacyDossierListItem à la place", () => {
    const source = readPageSource();

    expect(source).toContain("LegacyDossierListItem");
  });
});

describe("buildDossierDisplayIdentity — priorité au canonique (tests 2, 3, 11)", () => {
  it("un dossier non migré (canonical=null) reste identifiable comme legacy (test 3)", () => {
    const identity = buildDossierDisplayIdentity(buildLegacyItem(), null);

    expect(identity).toEqual({
      nom: "Ancien Nom",
      statut: "Rencontre",
      typeRelation: "Romantique",
      isCanonical: false,
    });
  });

  it("un dossier migré affiche les valeurs canoniques traduites (test 2)", () => {
    const identity = buildDossierDisplayIdentity(buildLegacyItem(), buildValidCanonicalDossier());

    expect(identity.isCanonical).toBe(true);
    expect(identity.nom).toBe("Nouveau Nom");
    expect(identity.statut).toBe("En pause");
    expect(identity.typeRelation).toBe("Familiale");
  });

  it("le canonique a priorité sur le legacy même quand les deux diffèrent (test 11)", () => {
    const legacy = buildLegacyItem({ nom: "Ancien Nom", statut: "Rencontre", typeRelation: "Romantique" });
    const canonical = buildValidCanonicalDossier({ name: "Nom Confirmé", status: "active", relationType: "friendship" });

    const identity = buildDossierDisplayIdentity(legacy, canonical);

    expect(identity.nom).toBe("Nom Confirmé");
    expect(identity.statut).toBe("Active");
    expect(identity.typeRelation).toBe("Amicale");
  });

  it("ne renvoie jamais de valeur de score, migrée ou non (test 7)", () => {
    const withoutCanonical = buildDossierDisplayIdentity(buildLegacyItem(), null);
    const withCanonical = buildDossierDisplayIdentity(buildLegacyItem(), buildValidCanonicalDossier());

    expect(Object.keys(withoutCanonical).sort()).toEqual(["isCanonical", "nom", "statut", "typeRelation"]);
    expect(Object.keys(withCanonical).sort()).toEqual(["isCanonical", "nom", "statut", "typeRelation"]);
  });
});

describe("buildCanonicalIndex — déduplication legacy/canonique (test 10)", () => {
  it("indexe un seul dossier canonique par id, sans doublon", () => {
    const index = buildCanonicalIndex([buildValidCanonicalDossier({ id: "d1" }), buildValidCanonicalDossier({ id: "d2" })]);

    expect(index.size).toBe(2);
    expect(index.get("d1")?.id).toBe("d1");
    expect(index.get("d2")?.id).toBe("d2");
    expect(index.get("d3")).toBeUndefined();
  });

  it("un id présent en legacy et en canonique ne produit qu'une seule entrée d'index", () => {
    const index = buildCanonicalIndex([buildValidCanonicalDossier({ id: "d1" })]);
    const legacyIds = [buildLegacyItem({ id: "d1" }), buildLegacyItem({ id: "d2", nom: "Autre" })].map((item) => item.id);

    const matches = legacyIds.filter((id) => index.has(id));
    expect(matches).toEqual(["d1"]);
  });
});

describe("ce module ne réalise et n'appelle aucune migration (tests 5, 6)", () => {
  it("ne référence ni addOrUpdateRelationDossier ni finalizeLegacyMigration dans son propre code source", () => {
    const here = dirname(fileURLToPath(import.meta.url));
    const source = readFileSync(join(here, "dossier-list-view.ts"), "utf-8");

    // Vérifie l'absence d'un appel réel (parenthèse ouvrante) : les noms
    // de ces fonctions apparaissent volontairement dans un commentaire
    // explicatif de ce même fichier pour documenter cette contrainte, sans
    // jamais y être importés ni appelés.
    expect(source).not.toMatch(/\baddOrUpdateRelationDossier\s*\(/);
    expect(source).not.toMatch(/\bfinalizeLegacyMigration\s*\(/);
    expect(source).not.toMatch(/^import[^;]*addOrUpdateRelationDossier[^;]*;/m);
    expect(source).not.toMatch(/^import[^;]*finalizeLegacyMigration[^;]*;/m);
  });

  it("ne construit jamais de valeur pour relationType, status, participantIds ou primaryUserParticipantId (test 6)", () => {
    const here = dirname(fileURLToPath(import.meta.url));
    const source = readFileSync(join(here, "dossier-list-view.ts"), "utf-8");

    expect(source).not.toMatch(/relationType\s*:/);
    expect(source).not.toMatch(/participantIds\s*:/);
    expect(source).not.toMatch(/primaryUserParticipantId\s*:/);
  });
});

describe("stockage — clés legacy et canonique séparées (tests 4, 5, 8, 9)", () => {
  let memoryLocalStorage: Storage;

  beforeEach(() => {
    memoryLocalStorage = createMemoryLocalStorage();
    (globalThis as { window?: unknown }).window = { localStorage: memoryLocalStorage };
    (globalThis as { localStorage?: unknown }).localStorage = memoryLocalStorage;
  });

  afterEach(() => {
    delete (globalThis as { window?: unknown }).window;
    delete (globalThis as { localStorage?: unknown }).localStorage;
  });

  it("préserve la clé legacy 'autre-rive-dossiers' pour la lecture/écriture (test 8)", () => {
    memoryLocalStorage.setItem("autre-rive-dossiers", JSON.stringify([buildLegacyItem()]));

    expect(readLegacyDossierList()).toEqual([buildLegacyItem()]);

    updateLegacyDossierList((current) => [...current, buildLegacyItem({ id: "d2", nom: "Second" })]);
    const raw = memoryLocalStorage.getItem("autre-rive-dossiers");
    expect(raw ? JSON.parse(raw) : null).toHaveLength(2);
  });

  it("n'écrit jamais sous la clé canonique lors d'une opération sur la liste legacy (test 5)", () => {
    updateLegacyDossierList((current) => [...current, buildLegacyItem()]);

    expect(readRelationDossiers()).toEqual([]);
    expect(memoryLocalStorage.getItem(AUTRE_RIVE_RELATION_DOSSIERS_KEY)).toBeNull();
  });

  it("une écriture legacy ne détruit aucune donnée canonique déjà présente (test 4)", () => {
    const canonical = buildValidCanonicalDossier();
    addOrUpdateRelationDossier(canonical);

    updateLegacyDossierList((current) => [...current, buildLegacyItem({ id: "d2", nom: "Autre dossier" })]);

    expect(readRelationDossiers()).toEqual([canonical]);
  });

  it("la clé canonique reste bit-à-bit intacte après une écriture legacy (test 9)", () => {
    const canonical = buildValidCanonicalDossier();
    addOrUpdateRelationDossier(canonical);
    const before = memoryLocalStorage.getItem(AUTRE_RIVE_RELATION_DOSSIERS_KEY);

    updateLegacyDossierList((current) => [...current, buildLegacyItem({ id: "d2" })]);

    expect(memoryLocalStorage.getItem(AUTRE_RIVE_RELATION_DOSSIERS_KEY)).toBe(before);
  });

  it("filtre les entrées invalides sans id/nom/statut/dateCreation en chaîne", () => {
    saveLegacyDossierList([{ ...buildLegacyItem() }]);
    memoryLocalStorage.setItem(
      "autre-rive-dossiers",
      JSON.stringify([{ id: "bad" }, buildLegacyItem({ id: "ok" })]),
    );

    const list = readLegacyDossierList();
    expect(list).toHaveLength(1);
    expect(list[0]?.id).toBe("ok");
    expect(isLegacyDossierListItem({ id: "bad" })).toBe(false);
  });
});

describe("page.tsx — aucune régression sur les actions de liste existantes (test 12)", () => {
  it("conserve les fonctions de gestion de liste déjà en place", () => {
    const source = readPageSource();

    for (const fn of ["openCreateForm", "openEditForm", "submitDossier", "confirmDelete", "updateDerniereInteraction"]) {
      expect(source).toContain(`function ${fn}`);
    }
  });

  it("filtre et trie toujours sur les champs legacy bruts (statut, nom, dateCreation)", () => {
    const source = readPageSource();

    expect(source).toMatch(/dossier\.statut === statusFilter/);
    expect(source).toMatch(/first\.nom\.localeCompare\(second\.nom/);
    expect(source).toMatch(/second\.dateCreation\.localeCompare\(first\.dateCreation\)/);
  });
});
