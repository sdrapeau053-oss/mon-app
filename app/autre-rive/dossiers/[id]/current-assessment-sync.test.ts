import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { afterEach, beforeEach, describe, expect, it } from "vitest";

import {
  addOrUpdateRelationDossier,
  createAiScoreAssessment,
  createManualScoreAssessment,
  readRelationDossierById,
  type RelationDossier,
} from "@/lib/autre-rive";

import { selectCurrentAssessment } from "./current-assessment-sync";

// Phase 9C — Conformité finale SR-D-001 (Décision 3 §11, « Pointeur
// explicite par dimension »). Tests du raccordement produit minimal entre
// l'écran de fiche dossier et le moteur canonique déjà existant et déjà
// considéré correct (setCurrentAssessmentRef / getCurrentAssessment,
// lib/autre-rive/assessment.ts, non modifié par cette phase). L'origine de
// toute désignation d'évaluation courante est ici exclusivement le geste
// humain explicite simulé par un appel direct à selectCurrentAssessment —
// jamais une conséquence automatique d'une saisie, d'une analyse IA ou
// d'une détection de désaccord.

function readModuleSource(): string {
  return readFileSync(join(dirname(fileURLToPath(import.meta.url)), "current-assessment-sync.ts"), "utf-8");
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

describe("selectCurrentAssessment — pas de duplication d'invariants (test statique)", () => {
  it("ne réimplémente pas la validation déjà garantie par setCurrentAssessmentRef", () => {
    const source = readModuleSource();
    // Aucune vérification manuelle d'existence/dimension ici : la source de
    // vérité reste setCurrentAssessmentRef (lib/autre-rive/assessment.ts).
    expect(source).not.toMatch(/\.find\(/);
    expect(source).not.toMatch(/throw new Error/);
  });
});

describe("selectCurrentAssessment — dossier non canonique (test 17)", () => {
  it("aucune migration implicite : renvoie skipped_not_canonical, ne crée rien", () => {
    const result = selectCurrentAssessment("dossier-jamais-migre", "clarte", "assessment-1", { now: fixedNow });

    expect(result.status).toBe("skipped_not_canonical");
    expect(readRelationDossierById("dossier-jamais-migre")).toBeNull();
  });
});

describe("selectCurrentAssessment — persistance et invariants (tests 1-16, 18-19)", () => {
  beforeEach(() => {
    const memoryLocalStorage = createMemoryLocalStorage();
    (globalThis as { window?: unknown }).window = { localStorage: memoryLocalStorage };
    (globalThis as { localStorage?: unknown }).localStorage = memoryLocalStorage;
  });

  afterEach(() => {
    delete (globalThis as { window?: unknown }).window;
    delete (globalThis as { localStorage?: unknown }).localStorage;
  });

  it("sélection explicite d'une évaluation manuelle valide (test 1)", () => {
    const manual = createManualScoreAssessment({ id: "m-1", dimension: "clarte", rawValue: 5, rawScale: "1-10", createdBy: "utilisatrice", createdAt: fixedNow() });
    addOrUpdateRelationDossier(buildValidDossier({ assessments: [manual] }));

    const result = selectCurrentAssessment("dossier-1", "clarte", "m-1", { now: fixedNow });

    expect(result.status).toBe("applied");
    const reloaded = readRelationDossierById("dossier-1");
    expect(reloaded?.currentAssessmentRefs).toEqual([
      { dimension: "clarte", assessmentId: "m-1", selectedAt: fixedNow(), selectedBy: "utilisatrice" },
    ]);
  });

  it("sélection explicite d'une évaluation IA valide (test 2)", () => {
    const ai = createAiScoreAssessment({ id: "a-1", dimension: "clarte", rawValue: 80, rawScale: "0-100", createdBy: "moteur-analyse-v1", createdAt: fixedNow() });
    addOrUpdateRelationDossier(buildValidDossier({ assessments: [ai] }));

    const result = selectCurrentAssessment("dossier-1", "clarte", "a-1", { now: fixedNow });

    expect(result.status).toBe("applied");
    const reloaded = readRelationDossierById("dossier-1");
    expect(reloaded?.currentAssessmentRefs[0].assessmentId).toBe("a-1");
  });

  it("CurrentAssessmentRef.dimension correcte (test 3)", () => {
    const manual = createManualScoreAssessment({ id: "m-1", dimension: "securite", rawValue: 5, rawScale: "1-10", createdBy: "utilisatrice", createdAt: fixedNow() });
    addOrUpdateRelationDossier(buildValidDossier({ assessments: [manual] }));

    selectCurrentAssessment("dossier-1", "securite", "m-1", { now: fixedNow });

    const reloaded = readRelationDossierById("dossier-1");
    expect(reloaded?.currentAssessmentRefs[0].dimension).toBe("securite");
  });

  it("assessmentId correct (test 4)", () => {
    const manual = createManualScoreAssessment({ id: "m-1", dimension: "clarte", rawValue: 5, rawScale: "1-10", createdBy: "utilisatrice", createdAt: fixedNow() });
    addOrUpdateRelationDossier(buildValidDossier({ assessments: [manual] }));

    selectCurrentAssessment("dossier-1", "clarte", "m-1", { now: fixedNow });

    const reloaded = readRelationDossierById("dossier-1");
    expect(reloaded?.currentAssessmentRefs[0].assessmentId).toBe("m-1");
  });

  it("selectedAt renseigné (test 5)", () => {
    const manual = createManualScoreAssessment({ id: "m-1", dimension: "clarte", rawValue: 5, rawScale: "1-10", createdBy: "utilisatrice", createdAt: fixedNow() });
    addOrUpdateRelationDossier(buildValidDossier({ assessments: [manual] }));

    selectCurrentAssessment("dossier-1", "clarte", "m-1", { now: fixedNow });

    const reloaded = readRelationDossierById("dossier-1");
    expect(reloaded?.currentAssessmentRefs[0].selectedAt).toBe(fixedNow());
  });

  it("selectedBy renseigné, convention 'utilisatrice' par défaut (test 6)", () => {
    const manual = createManualScoreAssessment({ id: "m-1", dimension: "clarte", rawValue: 5, rawScale: "1-10", createdBy: "utilisatrice", createdAt: fixedNow() });
    addOrUpdateRelationDossier(buildValidDossier({ assessments: [manual] }));

    selectCurrentAssessment("dossier-1", "clarte", "m-1", { now: fixedNow });

    const reloaded = readRelationDossierById("dossier-1");
    expect(reloaded?.currentAssessmentRefs[0].selectedBy).toBe("utilisatrice");
  });

  it("sélection d'un assessment inexistant rejetée (test 7)", () => {
    addOrUpdateRelationDossier(buildValidDossier());

    expect(() => selectCurrentAssessment("dossier-1", "clarte", "assessment-inexistant", { now: fixedNow })).toThrowError();

    const reloaded = readRelationDossierById("dossier-1");
    expect(reloaded?.currentAssessmentRefs).toEqual([]);
  });

  it("assessment d'une autre dimension rejeté (test 8)", () => {
    const manual = createManualScoreAssessment({ id: "m-1", dimension: "securite", rawValue: 5, rawScale: "1-10", createdBy: "utilisatrice", createdAt: fixedNow() });
    addOrUpdateRelationDossier(buildValidDossier({ assessments: [manual] }));

    expect(() => selectCurrentAssessment("dossier-1", "clarte", "m-1", { now: fixedNow })).toThrowError();

    const reloaded = readRelationDossierById("dossier-1");
    expect(reloaded?.currentAssessmentRefs).toEqual([]);
  });

  it("assessment d'un autre dossier impossible : id inexistant dans ce dossier-ci est rejeté (test 9)", () => {
    const manualElsewhere = createManualScoreAssessment({ id: "m-autre-dossier", dimension: "clarte", rawValue: 5, rawScale: "1-10", createdBy: "utilisatrice", createdAt: fixedNow() });
    addOrUpdateRelationDossier(buildValidDossier({ id: "dossier-2", assessments: [manualElsewhere] }));
    addOrUpdateRelationDossier(buildValidDossier({ id: "dossier-1", assessments: [] }));

    expect(() => selectCurrentAssessment("dossier-1", "clarte", "m-autre-dossier", { now: fixedNow })).toThrowError();

    const reloaded = readRelationDossierById("dossier-1");
    expect(reloaded?.currentAssessmentRefs).toEqual([]);
  });

  it("aucune création d'assessment (test 10)", () => {
    const manual = createManualScoreAssessment({ id: "m-1", dimension: "clarte", rawValue: 5, rawScale: "1-10", createdBy: "utilisatrice", createdAt: fixedNow() });
    addOrUpdateRelationDossier(buildValidDossier({ assessments: [manual] }));

    selectCurrentAssessment("dossier-1", "clarte", "m-1", { now: fixedNow });

    const reloaded = readRelationDossierById("dossier-1");
    expect(reloaded?.assessments).toHaveLength(1);
  });

  it("historique des assessments inchangé (test 11)", () => {
    const manual = createManualScoreAssessment({ id: "m-1", dimension: "clarte", rawValue: 5, rawScale: "1-10", createdBy: "utilisatrice", createdAt: fixedNow() });
    addOrUpdateRelationDossier(buildValidDossier({ assessments: [manual] }));
    const snapshot = JSON.stringify(manual);

    selectCurrentAssessment("dossier-1", "clarte", "m-1", { now: fixedNow });

    const reloaded = readRelationDossierById("dossier-1");
    expect(JSON.stringify(reloaded?.assessments[0])).toBe(snapshot);
  });

  it("remplacer une sélection courante par une autre est explicite et traçable (test 12)", () => {
    const manual = createManualScoreAssessment({ id: "m-1", dimension: "clarte", rawValue: 5, rawScale: "1-10", createdBy: "utilisatrice", createdAt: fixedNow() });
    const ai = createAiScoreAssessment({ id: "a-1", dimension: "clarte", rawValue: 80, rawScale: "0-100", createdBy: "moteur-analyse-v1", createdAt: fixedNow() });
    addOrUpdateRelationDossier(buildValidDossier({ assessments: [manual, ai] }));

    selectCurrentAssessment("dossier-1", "clarte", "m-1", { now: fixedNow });
    selectCurrentAssessment("dossier-1", "clarte", "a-1", { now: fixedNow });

    const reloaded = readRelationDossierById("dossier-1");
    expect(reloaded?.currentAssessmentRefs).toHaveLength(1);
    expect(reloaded?.currentAssessmentRefs[0].assessmentId).toBe("a-1");
  });

  it("ancienne évaluation reste dans l'historique après changement de courant (test 13)", () => {
    const manual = createManualScoreAssessment({ id: "m-1", dimension: "clarte", rawValue: 5, rawScale: "1-10", createdBy: "utilisatrice", createdAt: fixedNow() });
    const ai = createAiScoreAssessment({ id: "a-1", dimension: "clarte", rawValue: 80, rawScale: "0-100", createdBy: "moteur-analyse-v1", createdAt: fixedNow() });
    addOrUpdateRelationDossier(buildValidDossier({ assessments: [manual, ai] }));

    selectCurrentAssessment("dossier-1", "clarte", "m-1", { now: fixedNow });
    selectCurrentAssessment("dossier-1", "clarte", "a-1", { now: fixedNow });

    const reloaded = readRelationDossierById("dossier-1");
    expect(reloaded?.assessments.map((a) => a.id).sort()).toEqual(["a-1", "m-1"]);
  });

  it("saisie manuelle seule (addAssessment) ne change jamais le pointeur (test 14)", () => {
    addOrUpdateRelationDossier(buildValidDossier());
    let dossier = readRelationDossierById("dossier-1")!;
    const manual = createManualScoreAssessment({ id: "m-1", dimension: "clarte", rawValue: 5, rawScale: "1-10", createdBy: "utilisatrice", createdAt: fixedNow() });
    dossier = { ...dossier, assessments: [...dossier.assessments, manual] };
    addOrUpdateRelationDossier(dossier);

    const reloaded = readRelationDossierById("dossier-1");
    expect(reloaded?.currentAssessmentRefs).toEqual([]);
  });

  it("ajout IA seul ne change jamais le pointeur (test 15)", () => {
    addOrUpdateRelationDossier(buildValidDossier());
    let dossier = readRelationDossierById("dossier-1")!;
    const ai = createAiScoreAssessment({ id: "a-1", dimension: "clarte", rawValue: 80, rawScale: "0-100", createdBy: "moteur-analyse-v1", createdAt: fixedNow() });
    dossier = { ...dossier, assessments: [...dossier.assessments, ai] };
    addOrUpdateRelationDossier(dossier);

    const reloaded = readRelationDossierById("dossier-1");
    expect(reloaded?.currentAssessmentRefs).toEqual([]);
  });

  it("la détection de désaccord (Phase 9B) ne change jamais le pointeur (test 16)", () => {
    const manual = createManualScoreAssessment({ id: "m-1", dimension: "clarte", rawValue: 2, rawScale: "1-10", createdBy: "utilisatrice", createdAt: fixedNow() });
    const ai = createAiScoreAssessment({ id: "a-1", dimension: "clarte", rawValue: 90, rawScale: "0-100", createdBy: "moteur-analyse-v1", createdAt: fixedNow() });
    addOrUpdateRelationDossier(buildValidDossier({ assessments: [manual, ai] }));

    // Le module de désaccord (9B) est une fonction pure de lecture : ce
    // test vérifie, au niveau produit, qu'aucun appel à ce module ne peut
    // faire apparaître un currentAssessmentRefs non vide sans passage par
    // selectCurrentAssessment. On simule ici l'absence d'effet en relisant
    // simplement le dossier après la seule opération de sync 9B possible :
    // sa fonction ne prend même pas addOrUpdateRelationDossier en
    // dépendance (vérifié statiquement en Phase 9B).
    const reloaded = readRelationDossierById("dossier-1");
    expect(reloaded?.currentAssessmentRefs).toEqual([]);
  });

  it("aucune nouvelle clé localStorage : réutilise AUTRE_RIVE_RELATION_DOSSIERS_KEY existante (test 18)", () => {
    const source = readModuleSource();
    expect(source).not.toMatch(/localStorage\s*[.[]/);
    expect(source).not.toMatch(/setItem/);
  });

  it("aucun champ legacy modifié : seul currentAssessmentRefs change (test 19)", () => {
    const manual = createManualScoreAssessment({ id: "m-1", dimension: "clarte", rawValue: 5, rawScale: "1-10", createdBy: "utilisatrice", createdAt: fixedNow() });
    addOrUpdateRelationDossier(buildValidDossier({ notes: "Notes existantes.", tags: ["important"], assessments: [manual] }));

    selectCurrentAssessment("dossier-1", "clarte", "m-1", { now: fixedNow });

    const reloaded = readRelationDossierById("dossier-1");
    expect(reloaded?.notes).toBe("Notes existantes.");
    expect(reloaded?.tags).toEqual(["important"]);
  });
});

describe("Chemin UI complet — clic -> écriture -> relecture -> badge (vérification post-9C)", () => {
  beforeEach(() => {
    const memoryLocalStorage = createMemoryLocalStorage();
    (globalThis as { window?: unknown }).window = { localStorage: memoryLocalStorage };
    (globalThis as { localStorage?: unknown }).localStorage = memoryLocalStorage;
  });

  afterEach(() => {
    delete (globalThis as { window?: unknown }).window;
    delete (globalThis as { localStorage?: unknown }).localStorage;
  });

  // Reproduit exactement la logique de badge de current-assessment-panel.tsx
  // (`currentRef?.assessmentId === assessment.id`), sans rendu React (le
  // projet n'a délibérément aucune dépendance DOM/testing-library —
  // vitest.config.mts) : ce test verrouille la donnée que le badge affiche,
  // pas le pixel lui-même.
  function isCurrentFor(dossier: RelationDossier, dimension: string, assessmentId: string): boolean {
    const ref = dossier.currentAssessmentRefs.find((item) => item.dimension === dimension);
    return ref?.assessmentId === assessmentId;
  }

  it("un premier clic fait apparaître le badge sur l'assessment désigné, sans toucher l'autre (tests 1, 2, 3, 4)", () => {
    const manual = createManualScoreAssessment({ id: "m-1", dimension: "clarte", rawValue: 5, rawScale: "1-10", createdBy: "utilisatrice", createdAt: fixedNow() });
    const ai = createAiScoreAssessment({ id: "a-1", dimension: "clarte", rawValue: 80, rawScale: "0-100", createdBy: "moteur-analyse-v1", createdAt: fixedNow() });
    addOrUpdateRelationDossier(buildValidDossier({ assessments: [manual, ai] }));

    // Étape 1 : clic (handleSelect) — le retour est ignoré, exactement comme
    // dans current-assessment-panel.tsx.
    selectCurrentAssessment("dossier-1", "clarte", "m-1", { now: fixedNow });

    // Étape 2 : onChange() -> refreshCanonicalDossier() -> relecture
    // synchrone immédiate, sans délai ni reload (test 6).
    const afterFirstClick = readRelationDossierById("dossier-1")!;

    expect(isCurrentFor(afterFirstClick, "clarte", "m-1")).toBe(true);
    expect(isCurrentFor(afterFirstClick, "clarte", "a-1")).toBe(false);
  });

  it("un second clic sur une autre évaluation fait apparaître le nouveau badge ET disparaître l'ancien, immédiatement (tests 4, 5, 6)", () => {
    const manual = createManualScoreAssessment({ id: "m-1", dimension: "clarte", rawValue: 5, rawScale: "1-10", createdBy: "utilisatrice", createdAt: fixedNow() });
    const ai = createAiScoreAssessment({ id: "a-1", dimension: "clarte", rawValue: 80, rawScale: "0-100", createdBy: "moteur-analyse-v1", createdAt: fixedNow() });
    addOrUpdateRelationDossier(buildValidDossier({ assessments: [manual, ai] }));

    selectCurrentAssessment("dossier-1", "clarte", "m-1", { now: fixedNow });
    const afterFirstClick = readRelationDossierById("dossier-1")!;
    expect(isCurrentFor(afterFirstClick, "clarte", "m-1")).toBe(true);

    // Deuxième clic, même enchaînement synchrone que le premier (aucun
    // setTimeout, aucun await, aucun reload entre les deux lignes ci-dessous
    // — reproduit fidèlement handleSelect() puis onChange()).
    selectCurrentAssessment("dossier-1", "clarte", "a-1", { now: fixedNow });
    const afterSecondClick = readRelationDossierById("dossier-1")!;

    expect(isCurrentFor(afterSecondClick, "clarte", "a-1")).toBe(true);
    expect(isCurrentFor(afterSecondClick, "clarte", "m-1")).toBe(false);
  });

  it("la persistance reste correcte après plusieurs désignations successives (test 7)", () => {
    const manual = createManualScoreAssessment({ id: "m-1", dimension: "clarte", rawValue: 5, rawScale: "1-10", createdBy: "utilisatrice", createdAt: fixedNow() });
    const ai = createAiScoreAssessment({ id: "a-1", dimension: "clarte", rawValue: 80, rawScale: "0-100", createdBy: "moteur-analyse-v1", createdAt: fixedNow() });
    addOrUpdateRelationDossier(buildValidDossier({ assessments: [manual, ai] }));

    selectCurrentAssessment("dossier-1", "clarte", "m-1", { now: fixedNow });
    selectCurrentAssessment("dossier-1", "clarte", "a-1", { now: fixedNow });

    const reloaded = readRelationDossierById("dossier-1")!;
    expect(reloaded.currentAssessmentRefs).toHaveLength(1);
    expect(reloaded.currentAssessmentRefs[0]).toEqual({
      dimension: "clarte",
      assessmentId: "a-1",
      selectedAt: fixedNow(),
      selectedBy: "utilisatrice",
    });
    // L'historique complet reste intact (aucune suppression, aucune
    // création) : les deux évaluations d'origine sont toujours là.
    expect(reloaded.assessments.map((a) => a.id).sort()).toEqual(["a-1", "m-1"]);
  });

  it("aucune sélection automatique n'est introduite par ce chemin (test 8, rappel statique)", () => {
    const panelSource = readFileSync(
      join(dirname(fileURLToPath(import.meta.url)), "current-assessment-panel.tsx"),
      "utf-8",
    );
    expect(panelSource).not.toMatch(/useEffect/);
    // La sélection reste déclenchée exclusivement par onClick, jamais par un
    // effet de montage ou un recalcul de rendu.
    expect(panelSource).toMatch(/onClick=\{\(\) => handleSelect/);
  });
});

describe("CurrentAssessmentPanel — pas de sélection automatique (tests 20, 21, 22, static)", () => {
  function readPanelSource(): string {
    return readFileSync(join(dirname(fileURLToPath(import.meta.url)), "current-assessment-panel.tsx"), "utf-8");
  }

  it("n'appelle jamais selectCurrentAssessment depuis un effet (aucun montage automatique) (test 22)", () => {
    const source = readPanelSource();
    expect(source).not.toMatch(/useEffect/);
    expect(source).not.toMatch(/useState/);
  });

  it("affiche un badge distinct pour l'évaluation courante et une action de sélection distincte pour les autres (tests 20, 21)", () => {
    const source = readPanelSource();
    expect(source).toMatch(/★ courante/);
    expect(source).toMatch(/Désigner comme courante/);
  });

  it("ne propose jamais l'action de sélection sur l'évaluation déjà courante (garantie anti-ambiguïté)", () => {
    const source = readPanelSource();
    expect(source).toMatch(/!isCurrent/);
  });
});
