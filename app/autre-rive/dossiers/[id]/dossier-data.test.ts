import { readFileSync, readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { afterEach, beforeEach, describe, expect, it } from "vitest";

import {
  addOrUpdateRelationDossier,
  AUTRE_RIVE_RELATION_DOSSIERS_KEY,
  LEGACY_DOSSIER_STORAGE_KEY,
  readRelationDossiers,
  type RelationDossier,
} from "@/lib/autre-rive";

import {
  createEntityId,
  getClarityLabel,
  getDecisionRecommendation,
  getRiskLabel,
  isLegacyDossierDetailData,
  readLegacyDossierDetails,
  saveLegacyDossierDetails,
  type Decision,
  type EntreeJournal,
  type LegacyDossierDetailData,
  type RelationConversation,
} from "./dossier-data";

// Phase 8bis.4b — Conformité finale SR-D-001 (Décisions 1 et 4). Tests de
// la bascule de dossier-data.ts : suppression de la dernière définition
// locale concurrente "RelationDossier" dans app/, remplacée par
// LegacyDossierDetailData, sans perte de données legacy ni migration
// silencieuse.

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

function buildLegacyDetail(overrides: Partial<LegacyDossierDetailData> = {}): LegacyDossierDetailData {
  return {
    id: "d1",
    nom: "Jean",
    statut: "Relation",
    dateCreation: "2026-08-01",
    ...overrides,
  };
}

function buildValidCanonicalDossier(overrides: Partial<RelationDossier> = {}): RelationDossier {
  return {
    id: "d1",
    name: "Jean (confirmé)",
    relationType: "friendship",
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

function readDossierDataSource(): string {
  const here = dirname(fileURLToPath(import.meta.url));
  return readFileSync(join(here, "dossier-data.ts"), "utf-8");
}

function readDossierScreenSource(): string {
  const here = dirname(fileURLToPath(import.meta.url));
  return readFileSync(join(here, "dossier-screen.tsx"), "utf-8");
}

describe("dossier-data.ts — plus aucune définition locale RelationDossier (tests 1, 3, 16)", () => {
  it("ne déclare plus aucun type/interface local nommé RelationDossier (test 1)", () => {
    const source = readDossierDataSource();

    expect(source).not.toMatch(/interface\s+RelationDossier\b/);
    expect(source).not.toMatch(/type\s+RelationDossier\s*=/);
  });

  it("expose LegacyDossierDetailData à la place", () => {
    const source = readDossierDataSource();
    expect(source).toContain("export interface LegacyDossierDetailData");
  });

  it("le type canonique RelationDossier utilisé ailleurs provient uniquement de @/lib/autre-rive (test 3)", () => {
    const screenSource = readDossierScreenSource();
    // dossier-screen.tsx importe LegacyDossierDetailData depuis
    // ./dossier-data (legacy) et readRelationDossierById depuis
    // @/lib/autre-rive (canonique) : jamais "RelationDossier" nommé
    // localement ou importé depuis un module non canonique.
    expect(screenSource).not.toMatch(/interface\s+RelationDossier\b/);
    expect(screenSource).not.toMatch(/type\s+RelationDossier\s*=/);
    expect(screenSource).toMatch(/readRelationDossierById/);
  });
});

describe("recherche statique finale dans app/ (test 16)", () => {
  it("zéro interface/type RelationDossier concurrent dans app/autre-rive/dossiers", () => {
    const here = dirname(fileURLToPath(import.meta.url));
    const filesToScan = [
      join(here, "dossier-data.ts"),
      join(here, "dossier-screen.tsx"),
      join(here, "dossier-migration-panel.tsx"),
      join(here, "dossier-block.tsx"),
      join(here, "..", "page.tsx"),
      join(here, "..", "dossier-list-view.ts"),
    ];

    for (const file of filesToScan) {
      const source = readFileSync(file, "utf-8");
      expect(source, `${file} ne doit déclarer aucune interface RelationDossier`).not.toMatch(/interface\s+RelationDossier\b/);
      expect(source, `${file} ne doit déclarer aucun type RelationDossier =`).not.toMatch(/type\s+RelationDossier\s*=/);
    }
  });

  it("dossier-migration-panel.tsx importe LegacyDossierDetailData (pas RelationDossier) depuis dossier-data", () => {
    const here = dirname(fileURLToPath(import.meta.url));
    const source = readFileSync(join(here, "dossier-migration-panel.tsx"), "utf-8");
    expect(source).toContain('import type { LegacyDossierDetailData as LegacyRelationDossier } from "./dossier-data"');
  });

  it("aucun fichier .ts/.tsx du dossier [id] ne contient de définition RelationDossier concurrente", () => {
    const here = dirname(fileURLToPath(import.meta.url));
    // Exclut les fichiers *.test.ts eux-mêmes : leur code contient
    // nécessairement, en texte littéral, les motifs de recherche utilisés
    // par ce test (ex. dans une regex ou une chaîne d'assertion), ce qui
    // produirait un faux positif auto-référentiel sans rapport avec une
    // vraie définition de type.
    const files = readdirSync(here).filter(
      (name) => (name.endsWith(".ts") || name.endsWith(".tsx")) && !name.endsWith(".test.ts") && !name.endsWith(".test.tsx"),
    );
    for (const name of files) {
      const source = readFileSync(join(here, name), "utf-8");
      expect(source, `${name}`).not.toMatch(/interface\s+RelationDossier\b/);
      expect(source, `${name}`).not.toMatch(/^type\s+RelationDossier\s*=/m);
    }
  });
});

describe("stockage legacy — clé préservée, aucune perte (tests 4, 6, 7, 8, 12)", () => {
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

  it("la clé legacy 'autre-rive-dossiers' reste identique à LEGACY_DOSSIER_STORAGE_KEY (test 12)", () => {
    expect(LEGACY_DOSSIER_STORAGE_KEY).toBe("autre-rive-dossiers");
  });

  it("un dossier legacy existant se lit toujours correctement (test 4)", () => {
    memoryLocalStorage.setItem(LEGACY_DOSSIER_STORAGE_KEY, JSON.stringify([buildLegacyDetail()]));

    expect(readLegacyDossierDetails()).toEqual([buildLegacyDetail()]);
    expect(isLegacyDossierDetailData(buildLegacyDetail())).toBe(true);
  });

  it("les notes legacy sont préservées lors d'une mise à jour (test 6)", () => {
    saveLegacyDossierDetails([buildLegacyDetail({ notes: "Résumé important" })]);
    const [dossier] = readLegacyDossierDetails();
    const updated = { ...dossier, tags: ["confiance"] };
    saveLegacyDossierDetails([updated]);

    expect(readLegacyDossierDetails()[0]?.notes).toBe("Résumé important");
  });

  it("les tags legacy sont préservés (test 7)", () => {
    saveLegacyDossierDetails([buildLegacyDetail({ tags: ["a", "b"] })]);
    expect(readLegacyDossierDetails()[0]?.tags).toEqual(["a", "b"]);
  });

  it("le journal legacy est préservé (test 8)", () => {
    const entry: EntreeJournal = {
      date: "2026-08-02T00:00:00.000Z",
      emotion: "Anxiété",
      evenement: "Conversation difficile",
      id: "journal-1",
      intensite: 6,
    };
    saveLegacyDossierDetails([buildLegacyDetail({ journal: [entry] })]);
    expect(readLegacyDossierDetails()[0]?.journal).toEqual([entry]);
  });

  it("les décisions legacy réellement utilisées sont préservées (test 9)", () => {
    const decision: Decision = {
      date: "2026-08-03T00:00:00.000Z",
      id: "decision-1",
      intention: "Demander une conversation",
      optionChoisie: "Choisir un moment calme",
      recommandation: "S'appuyer sur les faits déjà observés et avancer par petites décisions.",
      situation: "Nous communiquons encore",
    };
    saveLegacyDossierDetails([buildLegacyDetail({ decisions: [decision] })]);
    expect(readLegacyDossierDetails()[0]?.decisions).toEqual([decision]);
  });

  it("les conversations/analyses legacy sans équivalent canonique sont préservées (test 10)", () => {
    const conversation: RelationConversation = {
      contenu: "Contenu de preuve manuelle assez long pour être valide.",
      dateCreation: "2026-08-04T00:00:00.000Z",
      id: "conv-1",
      source: "Messenger",
    };
    saveLegacyDossierDetails([
      buildLegacyDetail({
        analyses: [{ date: "2026-08-04", id: "a1", niveauTension: "Modéré", observations: ["obs"], patterns: ["motif"], tonalite: "calme" }],
        conversations: [conversation],
      }),
    ]);
    const [dossier] = readLegacyDossierDetails();
    expect(dossier.conversations).toEqual([conversation]);
    expect(dossier.analyses).toHaveLength(1);
  });

  it("aucune ancienne valeur de score n'est transformée automatiquement (test 11)", () => {
    saveLegacyDossierDetails([buildLegacyDetail({ niveauClarte: 2, niveauReciprocite: 4, niveauSecurite: 9 })]);
    const [dossier] = readLegacyDossierDetails();

    // Les fonctions dérivées lisent la valeur brute telle quelle, sans la
    // convertir ni l'arrondir vers une autre échelle.
    expect(dossier.niveauClarte).toBe(2);
    expect(dossier.niveauReciprocite).toBe(4);
    expect(dossier.niveauSecurite).toBe(9);
    expect(getClarityLabel(dossier, [])).toBe("Clarté faible");
    expect(getRiskLabel(dossier, [])).toBe("Vigilance faible");
    expect(getDecisionRecommendation(dossier)).toBe("Clarifier les faits avant de trancher.");
  });

  it("un dossier existant peut toujours être affiché sans perte de données (test 14)", () => {
    const full = buildLegacyDetail({
      analyses: [{ date: "2026-08-05", id: "a2", niveauTension: "Faible", observations: [], patterns: [], tonalite: "sereine" }],
      conversations: [{ contenu: "preuve", dateCreation: "2026-08-05T00:00:00.000Z", id: "conv-2" }],
      decisions: [{ date: "2026-08-05T00:00:00.000Z", id: "d-1", intention: "Observer sans agir", optionChoisie: "Noter vos observations quotidiennes", recommandation: "r", situation: "s" }],
      derniereInteraction: "2026-08-05",
      journal: [{ date: "2026-08-05T00:00:00.000Z", emotion: "Joie", evenement: "e", id: "j-1", intensite: 3 }],
      niveauClarte: 7,
      niveauReciprocite: 6,
      niveauSecurite: 8,
      notes: "note",
      tags: ["tag1"],
      typeRelation: "Amicale",
    });
    saveLegacyDossierDetails([full]);

    expect(readLegacyDossierDetails()[0]).toEqual(full);
  });

  it("createEntityId produit des ids utilisables pour les opérations de mise à jour (test 15)", () => {
    const id = createEntityId("journal");
    expect(id.startsWith("journal-")).toBe(true);
  });
});

describe("stockage canonique — aucune migration silencieuse, aucun écrasement (tests 5, 13)", () => {
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

  it("un dossier canonique migré se lit toujours via readRelationDossiers (test 5)", () => {
    const canonical = buildValidCanonicalDossier();
    addOrUpdateRelationDossier(canonical);

    expect(readRelationDossiers()).toEqual([canonical]);
  });

  it("une écriture sur la liste legacy n'écrase jamais une donnée canonique existante (test 13)", () => {
    const canonical = buildValidCanonicalDossier();
    addOrUpdateRelationDossier(canonical);
    const before = memoryLocalStorage.getItem(AUTRE_RIVE_RELATION_DOSSIERS_KEY);

    saveLegacyDossierDetails([buildLegacyDetail({ notes: "modification legacy" })]);

    expect(memoryLocalStorage.getItem(AUTRE_RIVE_RELATION_DOSSIERS_KEY)).toBe(before);
    expect(readRelationDossiers()).toEqual([canonical]);
  });

  it("dossier-data.ts ne référence jamais addOrUpdateRelationDossier ni finalizeLegacyMigration", () => {
    const source = readDossierDataSource();
    expect(source).not.toMatch(/\baddOrUpdateRelationDossier\s*\(/);
    expect(source).not.toMatch(/\bfinalizeLegacyMigration\s*\(/);
  });
});
