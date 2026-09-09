import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { addOrUpdateRelationDossier, readRelationDossierById } from "@/lib/autre-rive";
import type { RelationDossier } from "@/lib/autre-rive";

import { buildAiScoreAssessments, syncAiScoresToCanonicalDossier } from "./ai-score-sync";
import { parseAnalyseIA } from "./ia-parsing";

// Phase 8bis.3 — Conformité finale SR-D-001 (Décisions 2 et 3). Tests du
// nouveau chemin de données IA -> ScoreAssessment -> RelationDossier
// canonique, en remplacement de l'écrasement direct des champs plats
// legacy retiré de page.tsx par cette même sous-phase.

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

describe("buildAiScoreAssessments — construction pure (tests 1, 2, 3, 4, 13)", () => {
  it("crée un ScoreAssessment source 'ai' pour la dimension clarté (test 1)", () => {
    const [assessment] = buildAiScoreAssessments({ clarte: 72 }, {}, { createdAt: fixedNow(), createId: () => "assessment-clarte-1" });

    expect(assessment.dimension).toBe("clarte");
    expect(assessment.source).toBe("ai");
    expect(assessment.score.source).toBe("ai");
  });

  it("crée un ScoreAssessment source 'ai' pour la dimension réciprocité (test 2)", () => {
    const [assessment] = buildAiScoreAssessments({ reciprocite: 55 }, {}, { createdAt: fixedNow(), createId: () => "assessment-reciprocite-1" });

    expect(assessment.dimension).toBe("reciprocite");
    expect(assessment.source).toBe("ai");
  });

  it("crée un ScoreAssessment source 'ai' pour la dimension sécurité (test 3)", () => {
    const [assessment] = buildAiScoreAssessments({ securite: 40 }, {}, { createdAt: fixedNow(), createId: () => "assessment-securite-1" });

    expect(assessment.dimension).toBe("securite");
    expect(assessment.source).toBe("ai");
  });

  it("conserve les valeurs sur l'échelle canonique 0-100 (test 4)", () => {
    const assessments = buildAiScoreAssessments(
      { clarte: 0, reciprocite: 100, securite: 63 },
      {},
      { createdAt: fixedNow(), createId: (d) => "assessment-" + d },
    );

    expect(assessments.map((a) => a.score.rawScale)).toEqual(["0-100", "0-100", "0-100"]);
    expect(assessments.map((a) => a.score.normalizedValue)).toEqual([0, 100, 63]);
  });

  it("ne crée aucune évaluation pour une dimension absente de la réponse IA (test 13)", () => {
    const assessments = buildAiScoreAssessments({ clarte: 70 }, {}, { createdAt: fixedNow(), createId: (d) => "assessment-" + d });

    expect(assessments).toHaveLength(1);
    expect(assessments[0].dimension).toBe("clarte");
  });

  it("porte la rationale fournie par le flux IA existant, jamais inventée pour un champ absent", () => {
    const assessments = buildAiScoreAssessments(
      { clarte: 70, reciprocite: 60 },
      { clarte: "Echange globalement clair." },
      { createdAt: fixedNow(), createId: (d) => "assessment-" + d },
    );

    const clarte = assessments.find((a) => a.dimension === "clarte");
    const reciprocite = assessments.find((a) => a.dimension === "reciprocite");

    expect(clarte?.rationale).toBe("Echange globalement clair.");
    expect(reciprocite?.rationale).toBeUndefined();
  });
});

describe("syncAiScoresToCanonicalDossier — persistance (tests 5, 6, 7, 9, 10, 12)", () => {
  beforeEach(() => {
    const memoryLocalStorage = createMemoryLocalStorage();
    (globalThis as { window?: unknown }).window = { localStorage: memoryLocalStorage };
    (globalThis as { localStorage?: unknown }).localStorage = memoryLocalStorage;
  });

  afterEach(() => {
    delete (globalThis as { window?: unknown }).window;
    delete (globalThis as { localStorage?: unknown }).localStorage;
  });

  it("persiste correctement le dossier canonique après ajout des évaluations (test 10)", () => {
    addOrUpdateRelationDossier(buildValidDossier());

    const result = syncAiScoresToCanonicalDossier(
      "dossier-1",
      { clarte: 72, reciprocite: 55, securite: 40 },
      {},
      "analyse-1",
      { now: fixedNow },
    );

    expect(result.status).toBe("applied");
    const reloaded = readRelationDossierById("dossier-1");
    expect(reloaded?.assessments).toHaveLength(3);
    expect(reloaded?.assessments.every((a) => a.source === "ai")).toBe(true);
  });

  it("une deuxième analyse ajoute de nouvelles évaluations sans écraser les anciennes (test 5, 12)", () => {
    addOrUpdateRelationDossier(buildValidDossier());

    syncAiScoresToCanonicalDossier("dossier-1", { clarte: 40 }, {}, "analyse-1", { now: fixedNow });
    syncAiScoresToCanonicalDossier("dossier-1", { clarte: 80 }, {}, "analyse-2", { now: fixedNow });

    const reloaded = readRelationDossierById("dossier-1");
    expect(reloaded?.assessments).toHaveLength(2);
    expect(reloaded?.assessments.map((a) => a.score.normalizedValue)).toEqual([40, 80]);
  });

  it("ne modifie jamais currentAssessmentRefs : aucune évaluation IA n'est désignée courante automatiquement (test 6, 7)", () => {
    addOrUpdateRelationDossier(buildValidDossier());

    const result = syncAiScoresToCanonicalDossier(
      "dossier-1",
      { clarte: 72, reciprocite: 55, securite: 40 },
      {},
      "analyse-1",
      { now: fixedNow },
    );

    expect(result.status).toBe("applied");
    if (result.status === "applied") {
      expect(result.dossier.currentAssessmentRefs).toEqual([]);
    }
    // syncAiScoresToCanonicalDossier n'importe pas setCurrentAssessmentRef :
    // structurellement, aucun appel n'est possible depuis ce module.
    const source = readFileSync(join(dirname(fileURLToPath(import.meta.url)), "ai-score-sync.ts"), "utf-8");
    expect(source).not.toMatch(/setCurrentAssessmentRef/);
  });

  it("ne modifie jamais LegacyScoreSnapshot (test 9)", () => {
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

    syncAiScoresToCanonicalDossier("dossier-1", { clarte: 72 }, {}, "analyse-1", { now: fixedNow });

    const reloaded = readRelationDossierById("dossier-1");
    expect(reloaded?.legacyScoreSnapshots).toEqual(legacySnapshots);
  });

  it("absence de migration silencieuse si le dossier n'est pas encore canonique (test 11)", () => {
    const result = syncAiScoresToCanonicalDossier(
      "dossier-jamais-migre",
      { clarte: 72, reciprocite: 55, securite: 40 },
      {},
      "analyse-1",
      { now: fixedNow },
    );

    expect(result.status).toBe("skipped_not_canonical");
    expect(readRelationDossierById("dossier-jamais-migre")).toBeNull();
  });
});

describe("Phase 8bis.3b — chaine complete parseAnalyseIA -> buildAiScoreAssessments (tests 6, 7, 8, 10)", () => {
  function scoresFromAnalyseIA(ia: ReturnType<typeof parseAnalyseIA>) {
    // Meme conversion que celle appliquee au point d'appel dans page.tsx :
    // une dimension absente (null) devient undefined, seule forme d'absence
    // reconnue par buildAiScoreAssessments.
    return {
      clarte: ia.clarteScore ?? undefined,
      reciprocite: ia.reciprociteScore ?? undefined,
      securite: ia.securiteScore ?? undefined,
    };
  }

  it("clarte absente de la reponse IA -> aucun ScoreAssessment clarte (test 6)", () => {
    const text = "[RECIPROCITE_SCORE]\n60\n[/RECIPROCITE_SCORE]\n[SECURITE_SCORE]\n80\n[/SECURITE_SCORE]";
    const ia = parseAnalyseIA(text);

    const assessments = buildAiScoreAssessments(scoresFromAnalyseIA(ia), {}, { createId: (d) => "assessment-" + d });

    expect(assessments.some((a) => a.dimension === "clarte")).toBe(false);
    expect(assessments.map((a) => a.dimension).sort()).toEqual(["reciprocite", "securite"]);
  });

  it("reciprocite absente de la reponse IA -> aucun ScoreAssessment reciprocite (test 7)", () => {
    const text = "[CLARTE_SCORE]\n60\n[/CLARTE_SCORE]\n[SECURITE_SCORE]\n80\n[/SECURITE_SCORE]";
    const ia = parseAnalyseIA(text);

    const assessments = buildAiScoreAssessments(scoresFromAnalyseIA(ia), {}, { createId: (d) => "assessment-" + d });

    expect(assessments.some((a) => a.dimension === "reciprocite")).toBe(false);
    expect(assessments.map((a) => a.dimension).sort()).toEqual(["clarte", "securite"]);
  });

  it("securite absente de la reponse IA -> aucun ScoreAssessment securite (test 8)", () => {
    const text = "[CLARTE_SCORE]\n60\n[/CLARTE_SCORE]\n[RECIPROCITE_SCORE]\n80\n[/RECIPROCITE_SCORE]";
    const ia = parseAnalyseIA(text);

    const assessments = buildAiScoreAssessments(scoresFromAnalyseIA(ia), {}, { createId: (d) => "assessment-" + d });

    expect(assessments.some((a) => a.dimension === "securite")).toBe(false);
    expect(assessments.map((a) => a.dimension).sort()).toEqual(["clarte", "reciprocite"]);
  });

  describe("persistance quand une dimension est absente (test 10)", () => {
    beforeEach(() => {
      const memoryLocalStorage = createMemoryLocalStorage();
      (globalThis as { window?: unknown }).window = { localStorage: memoryLocalStorage };
      (globalThis as { localStorage?: unknown }).localStorage = memoryLocalStorage;
    });

    afterEach(() => {
      delete (globalThis as { window?: unknown }).window;
      delete (globalThis as { localStorage?: unknown }).localStorage;
    });

    it("currentAssessmentRefs reste inchange meme quand une dimension est absente de la reponse IA (test 10)", () => {
      addOrUpdateRelationDossier(buildValidDossier());
      const text = "[CLARTE_SCORE]\n60\n[/CLARTE_SCORE]\n[SECURITE_SCORE]\n80\n[/SECURITE_SCORE]";
      const ia = parseAnalyseIA(text);

      const result = syncAiScoresToCanonicalDossier("dossier-1", scoresFromAnalyseIA(ia), {}, "analyse-1", { now: fixedNow });

      expect(result.status).toBe("applied");
      if (result.status === "applied") {
        expect(result.dossier.currentAssessmentRefs).toEqual([]);
        expect(result.dossier.assessments.map((a) => a.dimension).sort()).toEqual(["clarte", "securite"]);
      }
    });
  });
});

describe("page.tsx — garanties structurelles (tests 8, 14)", () => {
  const pageSource = readFileSync(join(dirname(fileURLToPath(import.meta.url)), "page.tsx"), "utf-8");

  it("n'écrase plus jamais niveauClarte / niveauReciprocite / niveauSecurite avec un score IA (test 8)", () => {
    expect(pageSource).not.toMatch(/niveauClarte:\s*ia\s*\?/);
    expect(pageSource).not.toMatch(/niveauReciprocite:\s*ia\s*\?/);
    expect(pageSource).not.toMatch(/niveauSecurite:\s*ia\s*\?/);
    // Le nouveau chemin canonique est bien appelé à la place.
    expect(pageSource).toMatch(/syncAiScoresToCanonicalDossier/);
  });

  it("ne définit localement aucun type RelationDossier concurrent (test 14)", () => {
    // StoredDossier reste la seule définition locale de ce fichier : son
    // remplacement complet par RelationDossier canonique n'est pas possible
    // dans cette sous-phase (RelationDossier ne porte pas encore de
    // structure pour analyses/derniereAnalyse/nom/statut/dateCreation —
    // voir le rapport de 8bis.3). Ce test verrouille seulement l'absence
    // d'une définition locale portant déjà le nom canonique.
    expect(pageSource).not.toMatch(/(?:interface|type)\s+RelationDossier\b/);
  });
});
