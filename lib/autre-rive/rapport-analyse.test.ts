import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { addCanonicalRapportAnalyse } from "./rapport-analyse";
import {
  addLegacyRapportAnalyse,
  readCanonicalRapportsAnalyse,
  readLegacyRapportsAnalyse,
} from "./storage";
import type {
  CompetingHypothesis,
  EvidenceAvailability,
  LegacyRapportAnalyse,
  RapportAnalyse,
  RapportAnalyseMetadata,
} from "./types";

// Phase 6 d'IMP-001 (SR-D-001, Décision 5) — tests du type canonique
// RapportAnalyse et de son stockage append-only, ainsi que de la
// non-régression du type legacy renommé (LegacyRapportAnalyse).

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

function buildValidRapport(overrides: Partial<RapportAnalyse> = {}): RapportAnalyse {
  return {
    id: "rapport-1",
    relationDossierId: "dossier-1",
    generatedAt: "2026-08-13T00:00:00.000Z",
    triggerReason: "manual_request",

    assessmentSnapshots: [
      {
        assessmentId: "assessment-clarte-manual-1",
        dimension: "clarte",
        normalizedValue: 70,
        source: "manual",
        evidenceIds: ["evidence-1"],
        capturedAt: "2026-08-13T00:00:00.000Z",
      },
    ],
    needSnapshots: [
      {
        needId: "need-1",
        label: "Besoin de sécurité émotionnelle",
        origin: "observed",
        status: "active",
        evidenceIds: ["evidence-2"],
        capturedAt: "2026-08-13T00:00:00.000Z",
      },
    ],

    observations: [
      {
        id: "observation-1",
        label: "Message envoyé à 3h du matin",
        participantId: "person-1",
        evidenceIds: ["evidence-1"],
        isFactual: true,
      },
    ],
    hypotheses: [
      {
        id: "hypothesis-1",
        label: "Sollicitation affective intense en début de relation",
        analyticTermUsed: "love bombing",
        supportingObservationIds: ["observation-1"],
        contradictingObservationIds: [],
        compatibilityLevel: "moderee",
        methodologyNote: "Fondée sur la fréquence et l'intensité des messages du premier mois.",
      },
    ],
    conclusions: [
      {
        id: "conclusion-1",
        dimension: "clarte",
        label: "preoccupante",
        narrativeSummary: "La communication montre des signes d'intensité inhabituelle.",
        confidence: 0.6,
        confidenceExplanation: "Fondée sur une seule conversation importée.",
        supportingEvidenceIds: ["evidence-1"],
        contradictingEvidenceIds: [],
        limitations: ["Couverture temporelle limitée à un mois."],
      },
    ],

    flags: [
      {
        id: "flag-1",
        participantId: "person-1",
        type: "red",
        label: "Messages nocturnes répétés",
        analyticTermUsed: "love bombing",
        severity: 2,
        supportingEvidenceIds: ["evidence-1"],
        confidence: 0.6,
      },
    ],

    coverage: {
      overallCoverage: 0.4,
      coverageLevel: "partielle",
      missingDataNotes: ["Aucune conversation antérieure au premier mois."],
      calculationVersion: "coverage-v1",
    },
    overallConfidence: 0.55,
    overallConclusionLabel: "preoccupante",

    methodologyVersion: "analyse-conversation-v1",

    ...overrides,
  };
}

function buildValidMetadata(overrides: Partial<RapportAnalyseMetadata> = {}): RapportAnalyseMetadata {
  return {
    reportId: "rapport-1",
    relatedContestationIds: [],
    ...overrides,
  };
}

describe("RapportAnalyse — construction et snapshots (SR-D-001, Décision 5)", () => {
  it("construit un rapport canonique valide (test 1)", () => {
    const rapport = buildValidRapport();

    expect(rapport.relationDossierId).toBe("dossier-1");
    expect(rapport.methodologyVersion).toBe("analyse-conversation-v1");
  });

  it("préserve fidèlement les snapshots tels que fournis en entrée, sans transformation (test 5)", () => {
    const input = buildValidRapport({
      assessmentSnapshots: [
        {
          assessmentId: "assessment-securite-ai-1",
          dimension: "securite",
          normalizedValue: 45,
          source: "ai",
          confidence: 0.8,
          evidenceIds: ["evidence-9"],
          capturedAt: "2026-08-10T00:00:00.000Z",
        },
      ],
    });

    expect(input.assessmentSnapshots).toEqual([
      {
        assessmentId: "assessment-securite-ai-1",
        dimension: "securite",
        normalizedValue: 45,
        source: "ai",
        confidence: 0.8,
        evidenceIds: ["evidence-9"],
        capturedAt: "2026-08-10T00:00:00.000Z",
      },
    ]);
  });

  it("conserve methodologyVersion tel que fourni (test 9)", () => {
    const rapport = buildValidRapport({ methodologyVersion: "analyse-conversation-v3" });

    expect(rapport.methodologyVersion).toBe("analyse-conversation-v3");
  });

  it("conserve coverage.calculationVersion tel que fourni (test 10)", () => {
    const rapport = buildValidRapport({
      coverage: {
        overallCoverage: 0.9,
        coverageLevel: "bonne",
        missingDataNotes: [],
        calculationVersion: "coverage-v2",
      },
    });

    expect(rapport.coverage.calculationVersion).toBe("coverage-v2");
  });

  it("compatibilityScore reste facultatif sur une hypothèse (test 7)", () => {
    const hypothesisWithoutScore: CompetingHypothesis = {
      id: "hypothesis-1",
      label: "Hypothèse sans score chiffré",
      supportingObservationIds: [],
      contradictingObservationIds: [],
      compatibilityLevel: "faible",
      methodologyNote: "Aucune méthode versionnée ne calcule encore ce score.",
    };

    expect(hypothesisWithoutScore.compatibilityScore).toBeUndefined();
  });

  it("compatibilityLevel est obligatoire sur une hypothèse (test 8)", () => {
    const base: CompetingHypothesis = {
      id: "hypothesis-1",
      label: "Hypothèse test",
      supportingObservationIds: [],
      contradictingObservationIds: [],
      compatibilityLevel: "elevee",
      methodologyNote: "Note.",
    };
    // eslint-disable-next-line @typescript-eslint/no-unused-vars -- extrait volontairement pour l'omettre ci-dessous
    const { compatibilityLevel, ...withoutCompatibilityLevel } = base;

    // @ts-expect-error — compatibilityLevel manquant : champ obligatoire (SR-D-001, Décision 5).
    const invalid: CompetingHypothesis = withoutCompatibilityLevel;

    expect(invalid).toBeDefined();
  });

  it("analyticTermUsed est utilisé pour les concepts analytiques, jamais clinicalTermUsed", () => {
    const hypothesis = buildValidRapport().hypotheses[0];

    expect(hypothesis.analyticTermUsed).toBe("love bombing");
    expect(Object.keys(hypothesis)).not.toContain("clinicalTermUsed");
  });
});

describe("RapportAnalyseMetadata — séparation des métadonnées administratives (test 6)", () => {
  it("ne partage aucun champ avec le contenu analytique de RapportAnalyse", () => {
    const rapport = buildValidRapport();
    const metadata = buildValidMetadata({ archivedAt: "2026-09-01T00:00:00.000Z" });

    const metadataKeys = new Set(Object.keys(metadata));
    const contentKeys = new Set(Object.keys(rapport));

    // reportId (metadata) correspond au même rapport que id (contenu), mais
    // ce sont deux clés distinctes sur deux objets distincts : aucune clé de
    // métadonnées n'existe directement sur l'objet de contenu analytique.
    for (const key of metadataKeys) {
      expect(contentKeys.has(key)).toBe(false);
    }
  });
});

describe("EvidenceAvailability — disponibilité hors du rapport immuable (tests 11 et 12)", () => {
  it("la disponibilité d'une preuve reste un objet séparé, sans altérer le contenu du rapport (test 11)", () => {
    const rapport = buildValidRapport();
    const referencedEvidenceIds = rapport.observations.flatMap((observation) => observation.evidenceIds);

    const availability: EvidenceAvailability = {
      evidenceId: "evidence-1",
      status: "deleted",
      checkedAt: "2026-08-14T00:00:00.000Z",
    };

    // Marquer une preuve comme supprimée ne modifie ni ne retire sa
    // référence du contenu déjà généré : le rapport reste l'instantané de ce
    // qui a été utilisé au moment de sa création.
    expect(referencedEvidenceIds).toContain(availability.evidenceId);
    expect(rapport.observations[0].evidenceIds).toEqual(["evidence-1"]);
  });

  it("EvidenceAvailability est un type structurellement indépendant de RapportAnalyse (test 12)", () => {
    const availability: EvidenceAvailability = {
      evidenceId: "evidence-1",
      status: "available",
      checkedAt: "2026-08-14T00:00:00.000Z",
    };

    expect(Object.keys(availability).sort()).toEqual(["checkedAt", "evidenceId", "status"].sort());

    const rapport = buildValidRapport();
    expect(Object.keys(rapport)).not.toContain("status");
    expect(Object.keys(rapport)).not.toContain("checkedAt");
  });
});

describe("Stockage append-only du RapportAnalyse canonique (SR-D-001, Décision 5)", () => {
  beforeEach(() => {
    const memoryLocalStorage = createMemoryLocalStorage();
    (globalThis as { window?: unknown }).window = { localStorage: memoryLocalStorage };
    (globalThis as { localStorage?: unknown }).localStorage = memoryLocalStorage;
  });

  afterEach(() => {
    delete (globalThis as { window?: unknown }).window;
    delete (globalThis as { localStorage?: unknown }).localStorage;
  });

  it("ajoute un rapport et le rend lisible via le stockage canonique (test 1)", () => {
    const rapport = buildValidRapport();

    const stored = addCanonicalRapportAnalyse(rapport);

    expect(stored).toBe(true);
    expect(readCanonicalRapportsAnalyse()).toEqual([rapport]);
  });

  it("chaque nouvelle analyse crée un nouvel identifiant et une nouvelle entrée (test 2)", () => {
    const first = buildValidRapport({ id: "rapport-1" });
    const second = buildValidRapport({ id: "rapport-2", generatedAt: "2026-08-14T00:00:00.000Z" });

    addCanonicalRapportAnalyse(first);
    addCanonicalRapportAnalyse(second);

    const ids = readCanonicalRapportsAnalyse().map((rapport) => rapport.id);
    expect(ids.sort()).toEqual(["rapport-1", "rapport-2"]);
  });

  it("un rapport déjà stocké reste inchangé après l'ajout d'un nouveau (test 3)", () => {
    const first = buildValidRapport({ id: "rapport-1" });
    addCanonicalRapportAnalyse(first);

    const second = buildValidRapport({ id: "rapport-2", overallConclusionLabel: "malsaine" });
    addCanonicalRapportAnalyse(second);

    const storedFirst = readCanonicalRapportsAnalyse().find((rapport) => rapport.id === "rapport-1");
    expect(storedFirst).toEqual(first);
  });

  it("refuse de remplacer un rapport existant : stockage strictement append-only (test 4)", () => {
    const rapport = buildValidRapport();
    addCanonicalRapportAnalyse(rapport);

    const attemptedReplacement = buildValidRapport({ overallConclusionLabel: "risque_critique" });

    expect(() => addCanonicalRapportAnalyse(attemptedReplacement)).toThrowError();
    // La tentative refusée n'a rien modifié : le rapport original reste tel quel.
    expect(readCanonicalRapportsAnalyse()).toEqual([rapport]);
  });

  it("les rapports legacy restent lisibles après le renommage du type (test 13)", () => {
    const legacyRapport: LegacyRapportAnalyse = {
      id: "legacy-rapport-1",
      conversationId: "conversation-1",
      dossierId: "dossier-1",
      dateAnalyse: "2026-07-01T00:00:00.000Z",
      niveauAnalyse: "exploratoire",
      indicateurs: [{ nom: "Clarté", valeur: 6, description: "Lecture initiale." }],
      certitudeGlobale: "moyen",
      radar: { axes: [{ nom: "Clarté", score: 60 }] },
      redFlags: [],
      greenFlags: ["Communication régulière"],
      chronologie: [],
      résumé: "Première lecture exploratoire.",
      limitations: ["Peu de données disponibles."],
    };

    const stored = addLegacyRapportAnalyse(legacyRapport);

    expect(stored).toBe(true);
    expect(readLegacyRapportsAnalyse()).toEqual([legacyRapport]);
  });

  it("n'effectue aucune conversion automatique d'un rapport legacy vers le format canonique (test 14)", () => {
    const legacyRapport: LegacyRapportAnalyse = {
      id: "legacy-rapport-1",
      conversationId: "conversation-1",
      dossierId: "dossier-1",
      dateAnalyse: "2026-07-01T00:00:00.000Z",
      niveauAnalyse: "exploratoire",
      indicateurs: [],
      certitudeGlobale: "faible",
      radar: { axes: [] },
      redFlags: [],
      greenFlags: [],
      chronologie: [],
      résumé: "Rapport legacy.",
      limitations: [],
    };

    addLegacyRapportAnalyse(legacyRapport);

    // Les deux stockages sont strictement séparés : ajouter un rapport
    // legacy ne fait apparaître aucune entrée côté canonique.
    expect(readCanonicalRapportsAnalyse()).toEqual([]);
  });
});
