import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { afterEach, beforeEach, describe, expect, it } from "vitest";

import {
  addOrUpdateRelationDossier,
  createObservedNeed,
  readRelationDossierById,
  type RelationDossier,
} from "@/lib/autre-rive";

import {
  addExpressedNeedToDossier,
  confirmObservedNeedInDossier,
  correctNeedInDossier,
  rejectNeedInDossier,
} from "./needs-sync";

// Phase 9D — Conformité finale SR-D-001 (Décision 4 §1, Décision 6 item
// Besoins). Tests du raccordement produit minimal entre l'écran de fiche
// dossier et le moteur canonique déjà existant et déjà considéré correct
// (lib/autre-rive/needs.ts, non modifié par cette phase). L'origine de tout
// NeedStatement créé par ce module est ici exclusivement un texte fourni
// explicitement par l'appelant — jamais dérivé de notes, journal, IA ou
// red/green flags.

function readSyncSource(): string {
  return readFileSync(join(dirname(fileURLToPath(import.meta.url)), "needs-sync.ts"), "utf-8");
}

function readPanelSource(): string {
  return readFileSync(join(dirname(fileURLToPath(import.meta.url)), "needs-panel.tsx"), "utf-8");
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

describe("needs-sync — pas de conversion automatique depuis les données legacy (test 20, statique)", () => {
  // Recherche des formes d'ACCÈS réelles (propriété lue, champ du dossier),
  // pas du mot en prose : les commentaires de gouvernance de ce fichier
  // documentent explicitement pourquoi notes/journal/red-green flags ne
  // sont jamais convertis, et mentionnent donc ces mots eux-mêmes — les
  // chercher littéralement produirait un faux positif sur cette
  // documentation, pas sur un vrai accès aux données.
  it("ne lit jamais dossier.notes, dossier.journal ni les red/green flags des rapports pour fabriquer un besoin", () => {
    const source = readSyncSource();
    expect(source).not.toMatch(/\.notes\b|\.journal\b|journalEntryIds|redFlags\.|greenFlags\./);
  });

  it("le panneau ne lit jamais dossier.notes, dossier.journal ni les red/green flags pour proposer un besoin", () => {
    const source = readPanelSource();
    expect(source).not.toMatch(/\.notes\b|\.journal\b|journalEntryIds|redFlags\.|greenFlags\./);
  });
});

describe("needs-sync — dossier non canonique (test 17)", () => {
  it("aucune migration implicite : renvoie skipped_not_canonical, ne crée rien", () => {
    const result = addExpressedNeedToDossier("dossier-jamais-migre", "Besoin d'écoute", undefined, { now: fixedNow });

    expect(result.status).toBe("skipped_not_canonical");
    expect(readRelationDossierById("dossier-jamais-migre")).toBeNull();
  });
});

describe("needs-sync — persistance et invariants", () => {
  beforeEach(() => {
    const memoryLocalStorage = createMemoryLocalStorage();
    (globalThis as { window?: unknown }).window = { localStorage: memoryLocalStorage };
    (globalThis as { localStorage?: unknown }).localStorage = memoryLocalStorage;
  });

  afterEach(() => {
    delete (globalThis as { window?: unknown }).window;
    delete (globalThis as { localStorage?: unknown }).localStorage;
  });

  it("création explicite d'un besoin exprimé (test 1)", () => {
    addOrUpdateRelationDossier(buildValidDossier());

    const result = addExpressedNeedToDossier("dossier-1", "Se sentir écoutée", undefined, { now: fixedNow, createId: () => "need-1" });

    expect(result.status).toBe("applied");
    const reloaded = readRelationDossierById("dossier-1");
    expect(reloaded?.needs).toHaveLength(1);
    expect(reloaded?.needs[0].label).toBe("Se sentir écoutée");
  });

  it("texte obligatoire : rejette un label vide ou blanc (test 2)", () => {
    addOrUpdateRelationDossier(buildValidDossier());

    expect(() => addExpressedNeedToDossier("dossier-1", "   ", undefined, { now: fixedNow })).toThrowError();

    const reloaded = readRelationDossierById("dossier-1");
    expect(reloaded?.needs).toEqual([]);
  });

  it("origine correcte pour un besoin exprimé (test 3)", () => {
    addOrUpdateRelationDossier(buildValidDossier());

    addExpressedNeedToDossier("dossier-1", "Besoin d'espace", undefined, { now: fixedNow, createId: () => "need-1" });

    const reloaded = readRelationDossierById("dossier-1");
    expect(reloaded?.needs[0].origin).toBe("expressed");
  });

  it("ajout append-only : plusieurs besoins coexistent sans écrasement (test 4)", () => {
    addOrUpdateRelationDossier(buildValidDossier());

    addExpressedNeedToDossier("dossier-1", "Premier besoin", undefined, { now: fixedNow, createId: () => "need-1" });
    addExpressedNeedToDossier("dossier-1", "Second besoin", undefined, { now: fixedNow, createId: () => "need-2" });

    const reloaded = readRelationDossierById("dossier-1");
    expect(reloaded?.needs.map((n) => n.id)).toEqual(["need-1", "need-2"]);
  });

  it("id unique : un id déjà présent est rejeté, sans doublon (test 5)", () => {
    addOrUpdateRelationDossier(buildValidDossier());

    addExpressedNeedToDossier("dossier-1", "Premier besoin", undefined, { now: fixedNow, createId: () => "need-1" });

    expect(() =>
      addExpressedNeedToDossier("dossier-1", "Autre texte", undefined, { now: fixedNow, createId: () => "need-1" }),
    ).toThrowError();

    const reloaded = readRelationDossierById("dossier-1");
    expect(reloaded?.needs).toHaveLength(1);
  });

  it("aucune modification des besoins existants lors d'un ajout (test 6)", () => {
    const observed = createObservedNeed({ id: "need-observed-1", label: "Besoin de réassurance", createdAt: fixedNow() });
    addOrUpdateRelationDossier(buildValidDossier({ needs: [observed] }));
    const snapshot = JSON.stringify(observed);

    addExpressedNeedToDossier("dossier-1", "Nouveau besoin", undefined, { now: fixedNow, createId: () => "need-2" });

    const reloaded = readRelationDossierById("dossier-1");
    expect(JSON.stringify(reloaded?.needs.find((n) => n.id === "need-observed-1"))).toBe(snapshot);
  });

  it("confirmation explicite d'un besoin observé (test 7)", () => {
    const observed = createObservedNeed({ id: "need-observed-1", label: "Besoin de réassurance", createdAt: fixedNow() });
    addOrUpdateRelationDossier(buildValidDossier({ needs: [observed] }));

    const result = confirmObservedNeedInDossier("dossier-1", "need-observed-1", { now: fixedNow, createId: () => "need-confirmed-1" });

    expect(result.status).toBe("applied");
    const reloaded = readRelationDossierById("dossier-1");
    expect(reloaded?.needs.find((n) => n.id === "need-confirmed-1")?.origin).toBe("user_confirmed");
  });

  it("la confirmation crée une nouvelle version (test 8)", () => {
    const observed = createObservedNeed({ id: "need-observed-1", label: "Besoin de réassurance", createdAt: fixedNow() });
    addOrUpdateRelationDossier(buildValidDossier({ needs: [observed] }));

    confirmObservedNeedInDossier("dossier-1", "need-observed-1", { now: fixedNow, createId: () => "need-confirmed-1" });

    const reloaded = readRelationDossierById("dossier-1");
    expect(reloaded?.needs).toHaveLength(2);
  });

  it("le statut/origine 'user_confirmed' n'apparaît qu'après l'action de confirmation explicite (test 9)", () => {
    const observed = createObservedNeed({ id: "need-observed-1", label: "Besoin de réassurance", createdAt: fixedNow() });
    addOrUpdateRelationDossier(buildValidDossier({ needs: [observed] }));

    const beforeConfirm = readRelationDossierById("dossier-1");
    expect(beforeConfirm?.needs.every((n) => n.origin !== "user_confirmed")).toBe(true);

    confirmObservedNeedInDossier("dossier-1", "need-observed-1", { now: fixedNow, createId: () => "need-confirmed-1" });

    const afterConfirm = readRelationDossierById("dossier-1");
    expect(afterConfirm?.needs.some((n) => n.origin === "user_confirmed")).toBe(true);
  });

  it("supersedesNeedId correct après confirmation (test 10)", () => {
    const observed = createObservedNeed({ id: "need-observed-1", label: "Besoin de réassurance", createdAt: fixedNow() });
    addOrUpdateRelationDossier(buildValidDossier({ needs: [observed] }));

    confirmObservedNeedInDossier("dossier-1", "need-observed-1", { now: fixedNow, createId: () => "need-confirmed-1" });

    const reloaded = readRelationDossierById("dossier-1");
    expect(reloaded?.needs.find((n) => n.id === "need-confirmed-1")?.supersedesNeedId).toBe("need-observed-1");
  });

  it("la correction crée une nouvelle version (test 11)", () => {
    addOrUpdateRelationDossier(buildValidDossier());
    addExpressedNeedToDossier("dossier-1", "Besoin flou", undefined, { now: fixedNow, createId: () => "need-1" });

    const result = correctNeedInDossier("dossier-1", "need-1", { label: "Besoin de présence" }, { now: fixedNow, createId: () => "need-1-corrected" });

    expect(result.status).toBe("applied");
    const reloaded = readRelationDossierById("dossier-1");
    expect(reloaded?.needs).toHaveLength(2);
    expect(reloaded?.needs.find((n) => n.id === "need-1-corrected")?.label).toBe("Besoin de présence");
  });

  it("l'ancienne version reste intacte après correction (test 12)", () => {
    addOrUpdateRelationDossier(buildValidDossier());
    addExpressedNeedToDossier("dossier-1", "Besoin flou", undefined, { now: fixedNow, createId: () => "need-1" });
    const before = readRelationDossierById("dossier-1")?.needs[0];
    const snapshot = JSON.stringify(before);

    correctNeedInDossier("dossier-1", "need-1", { label: "Besoin de présence" }, { now: fixedNow, createId: () => "need-1-corrected" });

    const reloaded = readRelationDossierById("dossier-1");
    expect(JSON.stringify(reloaded?.needs.find((n) => n.id === "need-1"))).toBe(snapshot);
  });

  it("le rejet crée une nouvelle version inactive (test 13)", () => {
    addOrUpdateRelationDossier(buildValidDossier());
    addExpressedNeedToDossier("dossier-1", "Besoin à écarter", undefined, { now: fixedNow, createId: () => "need-1" });

    const result = rejectNeedInDossier("dossier-1", "need-1", { now: fixedNow, createId: () => "need-1-rejected" });

    expect(result.status).toBe("applied");
    const reloaded = readRelationDossierById("dossier-1");
    expect(reloaded?.needs.find((n) => n.id === "need-1-rejected")?.status).toBe("inactive");
  });

  it("l'ancienne version reste intacte après rejet (test 14)", () => {
    addOrUpdateRelationDossier(buildValidDossier());
    addExpressedNeedToDossier("dossier-1", "Besoin à écarter", undefined, { now: fixedNow, createId: () => "need-1" });
    const before = readRelationDossierById("dossier-1")?.needs[0];
    const snapshot = JSON.stringify(before);

    rejectNeedInDossier("dossier-1", "need-1", { now: fixedNow, createId: () => "need-1-rejected" });

    const reloaded = readRelationDossierById("dossier-1");
    expect(JSON.stringify(reloaded?.needs.find((n) => n.id === "need-1"))).toBe(snapshot);
  });

  it("aucune suppression physique : le nombre de besoins ne diminue jamais (test 15)", () => {
    addOrUpdateRelationDossier(buildValidDossier());
    addExpressedNeedToDossier("dossier-1", "Besoin A", undefined, { now: fixedNow, createId: () => "need-1" });
    correctNeedInDossier("dossier-1", "need-1", { label: "Besoin A corrigé" }, { now: fixedNow, createId: () => "need-2" });
    rejectNeedInDossier("dossier-1", "need-2", { now: fixedNow, createId: () => "need-3" });

    const reloaded = readRelationDossierById("dossier-1");
    expect(reloaded?.needs).toHaveLength(3);
  });

  it("historique complet conservé, chaîne de supersession traçable (test 16)", () => {
    addOrUpdateRelationDossier(buildValidDossier());
    addExpressedNeedToDossier("dossier-1", "Besoin A", undefined, { now: fixedNow, createId: () => "need-1" });
    correctNeedInDossier("dossier-1", "need-1", { label: "Besoin A corrigé" }, { now: fixedNow, createId: () => "need-2" });
    rejectNeedInDossier("dossier-1", "need-2", { now: fixedNow, createId: () => "need-3" });

    const reloaded = readRelationDossierById("dossier-1");
    const chain = reloaded?.needs.map((n) => ({ id: n.id, supersedes: n.supersedesNeedId }));
    expect(chain).toEqual([
      { id: "need-1", supersedes: undefined },
      { id: "need-2", supersedes: "need-1" },
      { id: "need-3", supersedes: "need-2" },
    ]);
  });

  it("aucune nouvelle clé localStorage (test 18, statique)", () => {
    const source = readSyncSource();
    expect(source).not.toMatch(/localStorage\s*[.[]/);
  });

  it("aucun champ legacy modifié (test 19)", () => {
    addOrUpdateRelationDossier(buildValidDossier({ notes: "Notes existantes.", tags: ["important"] }));

    addExpressedNeedToDossier("dossier-1", "Besoin A", undefined, { now: fixedNow, createId: () => "need-1" });

    const reloaded = readRelationDossierById("dossier-1");
    expect(reloaded?.notes).toBe("Notes existantes.");
    expect(reloaded?.tags).toEqual(["important"]);
  });

  it("aucune confirmation automatique : nécessite toujours un needId fourni explicitement (test 21)", () => {
    const observed = createObservedNeed({ id: "need-observed-1", label: "Besoin de réassurance", createdAt: fixedNow() });
    addOrUpdateRelationDossier(buildValidDossier({ needs: [observed] }));

    // Ajouter un autre besoin exprimé ne confirme jamais implicitement
    // l'observé existant.
    addExpressedNeedToDossier("dossier-1", "Besoin exprimé indépendant", undefined, { now: fixedNow, createId: () => "need-2" });

    const reloaded = readRelationDossierById("dossier-1");
    expect(reloaded?.needs.find((n) => n.id === "need-observed-1")?.origin).toBe("observed");
  });

  it("aucun appel automatique à un rapport canonique (test 30, statique)", () => {
    const source = readSyncSource();
    expect(source).not.toMatch(/RapportAnalyse|generateReport|createReport/i);
  });

  it("n'importe et n'appelle jamais les modules ou fonctions des phases 9A/9B/9C (test 29, statique)", () => {
    // Recherche des formes d'IMPORT/APPEL réelles, pas de la prose : les
    // commentaires de ce fichier citent par leur nom les modules 9A/9C à
    // titre de précédent architectural, ce qui produirait un faux positif
    // sur une recherche du simple mot.
    const source = readSyncSource();
    expect(source).not.toMatch(/from ["']\.\/critical-safety-sync["']|from ["']\.\/assessment-disagreement-view["']|from ["']\.\/current-assessment-sync["']|setCurrentAssessmentRef\(|setCurrentSafetyAssessmentRef\(/);
  });
});

describe("NeedsPanel — affichage et actualisation UI sans reload (tests 22, 23, 24, 25, 26, 27, 28)", () => {
  beforeEach(() => {
    const memoryLocalStorage = createMemoryLocalStorage();
    (globalThis as { window?: unknown }).window = { localStorage: memoryLocalStorage };
    (globalThis as { localStorage?: unknown }).localStorage = memoryLocalStorage;
  });

  afterEach(() => {
    delete (globalThis as { window?: unknown }).window;
    delete (globalThis as { localStorage?: unknown }).localStorage;
  });

  it("le panneau affiche l'origine et le statut de chaque besoin (tests 22, 23, statique)", () => {
    const source = readPanelSource();
    expect(source).toMatch(/formatOriginLabel/);
    expect(source).toMatch(/formatStatusLabel/);
  });

  it("le panneau distingue visuellement les versions actives des versions historiques (test 24, statique)", () => {
    const source = readPanelSource();
    expect(source).toMatch(/isHead/);
    expect(source).toMatch(/historique/);
  });

  it("n'appelle jamais les actions depuis un effet (aucune création/confirmation/correction/rejet automatique au montage) (test 21, 28 statique)", () => {
    const source = readPanelSource();
    expect(source).not.toMatch(/useEffect/);
  });

  it("un ajout est immédiatement lisible via une relecture synchrone du dossier canonique, sans reload (test 25)", () => {
    addOrUpdateRelationDossier(buildValidDossier());

    addExpressedNeedToDossier("dossier-1", "Besoin ajouté", undefined, { now: fixedNow, createId: () => "need-1" });
    // Reproduit exactement onChange() -> refreshCanonicalDossier() : lecture
    // synchrone immédiate, aucun délai, aucun reload (même vérification que
    // la Phase 9C).
    const afterAdd = readRelationDossierById("dossier-1");

    expect(afterAdd?.needs.some((n) => n.id === "need-1")).toBe(true);
  });

  it("une confirmation est immédiatement lisible sans reload (test 26)", () => {
    const observed = createObservedNeed({ id: "need-observed-1", label: "Besoin de réassurance", createdAt: fixedNow() });
    addOrUpdateRelationDossier(buildValidDossier({ needs: [observed] }));

    confirmObservedNeedInDossier("dossier-1", "need-observed-1", { now: fixedNow, createId: () => "need-confirmed-1" });
    const afterConfirm = readRelationDossierById("dossier-1");

    expect(afterConfirm?.needs.some((n) => n.id === "need-confirmed-1" && n.origin === "user_confirmed")).toBe(true);
  });

  it("une correction est immédiatement lisible sans reload (test 27)", () => {
    addOrUpdateRelationDossier(buildValidDossier());
    addExpressedNeedToDossier("dossier-1", "Besoin flou", undefined, { now: fixedNow, createId: () => "need-1" });

    correctNeedInDossier("dossier-1", "need-1", { label: "Besoin clarifié" }, { now: fixedNow, createId: () => "need-2" });
    const afterCorrection = readRelationDossierById("dossier-1");

    expect(afterCorrection?.needs.find((n) => n.id === "need-2")?.label).toBe("Besoin clarifié");
  });

  it("un rejet est immédiatement lisible sans reload (test 28)", () => {
    addOrUpdateRelationDossier(buildValidDossier());
    addExpressedNeedToDossier("dossier-1", "Besoin à écarter", undefined, { now: fixedNow, createId: () => "need-1" });

    rejectNeedInDossier("dossier-1", "need-1", { now: fixedNow, createId: () => "need-2" });
    const afterReject = readRelationDossierById("dossier-1");

    expect(afterReject?.needs.find((n) => n.id === "need-2")?.status).toBe("inactive");
  });
});
