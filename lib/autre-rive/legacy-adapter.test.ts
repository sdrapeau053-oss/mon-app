import { afterEach, beforeEach, describe, expect, it } from "vitest";

import {
  LEGACY_DOSSIER_STORAGE_KEY,
  adaptLegacyRelationDossierPartially,
  finalizeLegacyMigration,
  readPartiallyAdaptedLegacyRelationDossiers,
  type ConfirmedLegacyIdentity,
  type LegacyRelationDossierRecord,
} from "./legacy-adapter";

// Phase 3 d'IMP-001 (SR-D-001, Décision 4 §3 et §6) — tests de l'adaptateur
// de lecture legacy → canonique. Aucun test ici n'écrit de valeur métier
// dans localStorage au-delà de la préparation du jeu de données de départ ;
// l'adaptateur lui-même est vérifié comme strictement lecture seule.

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

function seedLegacyDossiers(records: LegacyRelationDossierRecord[]): string {
  const raw = JSON.stringify(records);
  localStorage.setItem(LEGACY_DOSSIER_STORAGE_KEY, raw);
  return raw;
}

const fixedNow = () => "2026-08-10T00:00:00.000Z";

describe("adaptLegacyRelationDossierPartially — lecture d'un dossier legacy valide (test 1)", () => {
  it("produit une représentation canonique en mémoire à partir d'un dossier legacy complet", () => {
    const record: LegacyRelationDossierRecord = {
      id: "dossier-1",
      nom: "Relation avec A.",
      statut: "Relation",
      typeRelation: "Romantique",
      dateCreation: "2026-01-01T00:00:00.000Z",
      derniereInteraction: "2026-07-01T00:00:00.000Z",
      notes: "Quelques notes.",
      tags: ["important"],
      conversations: [{ id: "conv-1" }, { id: "conv-2" }],
      journal: [{ id: "journal-1" }],
      niveauClarte: 7,
      niveauReciprocite: 5,
      niveauSecurite: 8,
      energieEmotionnelle: 6,
    };

    const adaptation = adaptLegacyRelationDossierPartially(record, { now: fixedNow });

    expect(adaptation.sourceId).toBe("dossier-1");
    expect(adaptation.canonicalFields.id).toBe("dossier-1");
    expect(adaptation.canonicalFields.name).toBe("Relation avec A.");
    expect(adaptation.canonicalFields.conversationIds).toEqual(["conv-1", "conv-2"]);
    expect(adaptation.canonicalFields.journalEntryIds).toEqual(["journal-1"]);
  });
});

describe("adaptLegacyRelationDossierPartially — conservation exacte des valeurs historiques brutes (test 2)", () => {
  it("conserve dateCreation, notes et tags sans les altérer", () => {
    const record: LegacyRelationDossierRecord = {
      id: "dossier-1",
      nom: "Relation avec A.",
      dateCreation: "2026-03-15T10:30:00.000Z",
      notes: "Texte exact à préserver, avec ponctuation ! Et accents éàî.",
      tags: ["b", "a", "c"],
    };

    const adaptation = adaptLegacyRelationDossierPartially(record, { now: fixedNow });

    expect(adaptation.canonicalFields.createdAt).toBe("2026-03-15T10:30:00.000Z");
    expect(adaptation.canonicalFields.notes).toBe("Texte exact à préserver, avec ponctuation ! Et accents éàî.");
    expect(adaptation.canonicalFields.tags).toEqual(["b", "a", "c"]);
  });

  it("conserve rawValue exact des scores, sans arrondi ni transformation", () => {
    const record: LegacyRelationDossierRecord = {
      id: "dossier-1",
      nom: "Relation avec A.",
      niveauClarte: 6.5,
    };

    const adaptation = adaptLegacyRelationDossierPartially(record, { now: fixedNow });
    const snapshot = adaptation.canonicalFields.legacyScoreSnapshots?.find((s) => s.metricKey === "niveauClarte");

    expect(snapshot?.rawValue).toBe(6.5);
  });
});

describe("adaptLegacyRelationDossierPartially — scores legacy transformés uniquement en LegacyScoreSnapshot (test 3)", () => {
  it("produit un LegacyScoreSnapshot par score numérique présent, et aucun pour les scores absents", () => {
    const record: LegacyRelationDossierRecord = {
      id: "dossier-1",
      nom: "Relation avec A.",
      niveauClarte: 7,
      niveauSecurite: 3,
      // niveauReciprocite et energieEmotionnelle absents
    };

    const adaptation = adaptLegacyRelationDossierPartially(record, { now: fixedNow });
    const metricKeys = (adaptation.canonicalFields.legacyScoreSnapshots ?? []).map((s) => s.metricKey).sort();

    expect(metricKeys).toEqual(["niveauClarte", "niveauSecurite"]);
  });
});

describe("adaptLegacyRelationDossierPartially — provenance legacy_unknown (test 4)", () => {
  it("marque chaque snapshot avec provenance 'legacy_unknown' et migrationStatus 'pending_review'", () => {
    const record: LegacyRelationDossierRecord = { id: "dossier-1", nom: "Relation avec A.", niveauClarte: 7 };

    const adaptation = adaptLegacyRelationDossierPartially(record, { now: fixedNow });
    const snapshot = adaptation.canonicalFields.legacyScoreSnapshots?.[0];

    expect(snapshot?.provenance).toBe("legacy_unknown");
    expect(snapshot?.migrationStatus).toBe("pending_review");
  });
});

describe("adaptLegacyRelationDossierPartially — aucune déduction silencieuse d'échelle (test 5)", () => {
  it("ne fixe jamais rawScale, même pour des valeurs <= 10 ou > 10", () => {
    const record: LegacyRelationDossierRecord = {
      id: "dossier-1",
      nom: "Relation avec A.",
      niveauClarte: 7, // pourrait être 1-10 ou 0-100 : ne doit jamais être déduit
      energieEmotionnelle: 65, // idem, pas de règle "valeur > 10 => 0-100"
    };

    const adaptation = adaptLegacyRelationDossierPartially(record, { now: fixedNow });

    for (const snapshot of adaptation.canonicalFields.legacyScoreSnapshots ?? []) {
      expect(snapshot.rawScale).toBeUndefined();
    }
  });
});

describe("adaptLegacyRelationDossierPartially — aucun ScoreAssessment créé automatiquement (test 6)", () => {
  it("assessments reste vide même en présence de scores legacy", () => {
    const record: LegacyRelationDossierRecord = {
      id: "dossier-1",
      nom: "Relation avec A.",
      niveauClarte: 7,
      niveauReciprocite: 5,
      niveauSecurite: 8,
      energieEmotionnelle: 6,
    };

    const adaptation = adaptLegacyRelationDossierPartially(record, { now: fixedNow });

    expect(adaptation.canonicalFields.assessments).toEqual([]);
  });
});

describe("adaptLegacyRelationDossierPartially — aucun CurrentAssessmentRef créé automatiquement (test 7)", () => {
  it("currentAssessmentRefs reste vide même en présence de scores legacy", () => {
    const record: LegacyRelationDossierRecord = { id: "dossier-1", nom: "Relation avec A.", niveauClarte: 7 };

    const adaptation = adaptLegacyRelationDossierPartially(record, { now: fixedNow });

    expect(adaptation.canonicalFields.currentAssessmentRefs).toEqual([]);
  });
});

describe("readPartiallyAdaptedLegacyRelationDossiers — donnée source inchangée après adaptation (test 8)", () => {
  beforeEach(() => {
    const memoryLocalStorage = createMemoryLocalStorage();
    (globalThis as { window?: unknown }).window = { localStorage: memoryLocalStorage };
    (globalThis as { localStorage?: unknown }).localStorage = memoryLocalStorage;
  });

  afterEach(() => {
    delete (globalThis as { window?: unknown }).window;
    delete (globalThis as { localStorage?: unknown }).localStorage;
  });

  it("laisse le contenu brut de localStorage strictement identique après lecture/adaptation", () => {
    const rawBefore = seedLegacyDossiers([
      { id: "dossier-1", nom: "Relation avec A.", niveauClarte: 7 },
      { id: "dossier-2", nom: "Relation avec B.", statut: "Rupture" },
    ]);

    readPartiallyAdaptedLegacyRelationDossiers({ now: fixedNow });

    const rawAfter = localStorage.getItem(LEGACY_DOSSIER_STORAGE_KEY);
    expect(rawAfter).toBe(rawBefore);
  });
});

describe("readPartiallyAdaptedLegacyRelationDossiers — plusieurs dossiers adaptés sans écrasement (test 9)", () => {
  beforeEach(() => {
    const memoryLocalStorage = createMemoryLocalStorage();
    (globalThis as { window?: unknown }).window = { localStorage: memoryLocalStorage };
    (globalThis as { localStorage?: unknown }).localStorage = memoryLocalStorage;
  });

  afterEach(() => {
    delete (globalThis as { window?: unknown }).window;
    delete (globalThis as { localStorage?: unknown }).localStorage;
  });

  it("adapte chaque dossier indépendamment, sans mélanger leurs scores ni leurs identifiants", () => {
    seedLegacyDossiers([
      { id: "dossier-1", nom: "Relation avec A.", niveauClarte: 7 },
      { id: "dossier-2", nom: "Relation avec B.", niveauClarte: 2, niveauSecurite: 9 },
    ]);

    const adaptations = readPartiallyAdaptedLegacyRelationDossiers({ now: fixedNow });

    expect(adaptations).toHaveLength(2);
    expect(adaptations.map((a) => a.sourceId)).toEqual(["dossier-1", "dossier-2"]);

    const [first, second] = adaptations;
    expect(first.canonicalFields.legacyScoreSnapshots?.map((s) => s.metricKey)).toEqual(["niveauClarte"]);
    expect(second.canonicalFields.legacyScoreSnapshots?.map((s) => s.metricKey).sort()).toEqual([
      "niveauClarte",
      "niveauSecurite",
    ]);
    // Les identifiants de snapshot intègrent le dossier source : aucune
    // collision possible entre deux dossiers portant le même metricKey.
    expect(first.canonicalFields.legacyScoreSnapshots?.[0]?.id).not.toBe(
      second.canonicalFields.legacyScoreSnapshots?.find((s) => s.metricKey === "niveauClarte")?.id,
    );
  });
});

describe("Phase 3 — données partielles ou champs manquants, sans invention silencieuse (test 10)", () => {
  it("des champs legacy absents produisent des valeurs vides documentées, jamais inventées", () => {
    const record: LegacyRelationDossierRecord = {
      id: "dossier-1",
      nom: "Relation avec A.",
      // statut, typeRelation, dateCreation, derniereInteraction, notes, tags,
      // conversations, journal, tous les scores : absents.
    };

    const adaptation = adaptLegacyRelationDossierPartially(record, { now: fixedNow });

    expect(adaptation.canonicalFields.createdAt).toBe("");
    expect(adaptation.canonicalFields.updatedAt).toBe("");
    expect(adaptation.canonicalFields.notes).toBe("");
    expect(adaptation.canonicalFields.tags).toEqual([]);
    expect(adaptation.canonicalFields.conversationIds).toEqual([]);
    expect(adaptation.canonicalFields.journalEntryIds).toEqual([]);
    expect(adaptation.canonicalFields.legacyScoreSnapshots).toEqual([]);
  });

  it("relationType, status, participantIds et primaryUserParticipantId sont signalés comme bloqués, jamais inventés", () => {
    const record: LegacyRelationDossierRecord = { id: "dossier-1", nom: "Relation avec A." };

    const adaptation = adaptLegacyRelationDossierPartially(record, { now: fixedNow });
    const blockedFields = adaptation.blockers.map((b) => b.field).sort();

    expect(blockedFields).toEqual([
      "participantIds",
      "primaryUserParticipantId",
      "relationType",
      "status",
    ]);
    expect("relationType" in adaptation.canonicalFields).toBe(false);
    expect("status" in adaptation.canonicalFields).toBe(false);
    expect("participantIds" in adaptation.canonicalFields).toBe(false);
    expect("primaryUserParticipantId" in adaptation.canonicalFields).toBe(false);
  });

  it("des entrées de journal/conversations sans id exploitable sont ignorées plutôt qu'inventées", () => {
    const record: LegacyRelationDossierRecord = {
      id: "dossier-1",
      nom: "Relation avec A.",
      conversations: [{ id: "conv-1" }, { titre: "Sans id" }, "chaîne inattendue", null],
      journal: "pas un tableau",
    };

    const adaptation = adaptLegacyRelationDossierPartially(record, { now: fixedNow });

    expect(adaptation.canonicalFields.conversationIds).toEqual(["conv-1"]);
    expect(adaptation.canonicalFields.journalEntryIds).toEqual([]);
  });

});

describe("Phase 3 — enregistrements sans identité exploitable exclus, pas fabriqués (test 10, suite)", () => {
  beforeEach(() => {
    const memoryLocalStorage = createMemoryLocalStorage();
    (globalThis as { window?: unknown }).window = { localStorage: memoryLocalStorage };
    (globalThis as { localStorage?: unknown }).localStorage = memoryLocalStorage;
  });

  afterEach(() => {
    delete (globalThis as { window?: unknown }).window;
    delete (globalThis as { localStorage?: unknown }).localStorage;
  });

  it("un enregistrement sans id ou sans nom exploitable est exclu de la lecture en lot, pas fabriqué", () => {
    seedLegacyDossiers([
      { id: "dossier-1", nom: "Relation avec A." },
      { statut: "Relation" }, // ni id ni nom exploitables
      { id: "dossier-3" }, // nom manquant
    ]);

    const adaptations = readPartiallyAdaptedLegacyRelationDossiers({ now: fixedNow });

    expect(adaptations.map((a) => a.sourceId)).toEqual(["dossier-1"]);
  });
});

describe("finalizeLegacyMigration — confirmation humaine explicite (Phase 4, règle validée avant exécution)", () => {
  const confirmed: ConfirmedLegacyIdentity = {
    relationType: "romantic",
    status: "active",
    participantIds: ["user-1", "person-1"],
    primaryUserParticipantId: "user-1",
  };

  it("assemble un RelationDossier complet à partir de l'adaptation partielle et de l'identité confirmée", () => {
    const record: LegacyRelationDossierRecord = {
      id: "dossier-1",
      nom: "Relation avec A.",
      dateCreation: "2026-01-01T00:00:00.000Z",
      niveauClarte: 7,
    };
    const adaptation = adaptLegacyRelationDossierPartially(record, { now: fixedNow });

    const dossier = finalizeLegacyMigration(adaptation, confirmed);

    expect(dossier.relationType).toBe("romantic");
    expect(dossier.status).toBe("active");
    expect(dossier.participantIds).toEqual(["user-1", "person-1"]);
    expect(dossier.primaryUserParticipantId).toBe("user-1");
    // Les champs déjà résolus par l'adaptation partielle (Phase 3) sont
    // conservés intacts par la finalisation.
    expect(dossier.name).toBe("Relation avec A.");
    expect(dossier.legacyScoreSnapshots?.[0]?.metricKey).toBe("niveauClarte");
  });

  it("passe schemaVersion de 0 (fragment) à 1 (dossier réellement canonique) une fois finalisé", () => {
    const record: LegacyRelationDossierRecord = { id: "dossier-1", nom: "Relation avec A." };
    const adaptation = adaptLegacyRelationDossierPartially(record, { now: fixedNow });

    expect(adaptation.canonicalFields.schemaVersion).toBe(0);

    const dossier = finalizeLegacyMigration(adaptation, confirmed);

    expect(dossier.schemaVersion).toBe(1);
  });

  it("rejette une confirmation où primaryUserParticipantId n'appartient pas à participantIds", () => {
    const record: LegacyRelationDossierRecord = { id: "dossier-1", nom: "Relation avec A." };
    const adaptation = adaptLegacyRelationDossierPartially(record, { now: fixedNow });

    expect(() =>
      finalizeLegacyMigration(adaptation, {
        ...confirmed,
        primaryUserParticipantId: "quelqu-un-d-autre",
      }),
    ).toThrow(/primaryUserParticipantId/);
  });

  it("ne peut pas être appelée sans relationType — détecté à la compilation (test 4)", () => {
    const record: LegacyRelationDossierRecord = { id: "dossier-1", nom: "Relation avec A." };
    const adaptation = adaptLegacyRelationDossierPartially(record, { now: fixedNow });

    // @ts-expect-error — relationType manquant : finalizeLegacyMigration exige les 4 champs confirmés.
    const invalid: ReturnType<typeof finalizeLegacyMigration> = finalizeLegacyMigration(adaptation, {
      status: "active",
      participantIds: ["user-1"],
      primaryUserParticipantId: "user-1",
    });

    expect(invalid).toBeDefined();
  });

  it("ne peut pas être appelée sans status — détecté à la compilation (test 5)", () => {
    const record: LegacyRelationDossierRecord = { id: "dossier-1", nom: "Relation avec A." };
    const adaptation = adaptLegacyRelationDossierPartially(record, { now: fixedNow });

    // @ts-expect-error — status manquant : finalizeLegacyMigration exige les 4 champs confirmés.
    const invalid: ReturnType<typeof finalizeLegacyMigration> = finalizeLegacyMigration(adaptation, {
      relationType: "romantic",
      participantIds: ["user-1"],
      primaryUserParticipantId: "user-1",
    });

    expect(invalid).toBeDefined();
  });

  it("rejette une confirmation sans aucun participant (test 1)", () => {
    const record: LegacyRelationDossierRecord = { id: "dossier-1", nom: "Relation avec A." };
    const adaptation = adaptLegacyRelationDossierPartially(record, { now: fixedNow });

    expect(() =>
      finalizeLegacyMigration(adaptation, { ...confirmed, participantIds: [], primaryUserParticipantId: "" }),
    ).toThrow(/participantIds/);
  });

  it("rejette une confirmation avec un primaryUserParticipantId vide (test 2)", () => {
    const record: LegacyRelationDossierRecord = { id: "dossier-1", nom: "Relation avec A." };
    const adaptation = adaptLegacyRelationDossierPartially(record, { now: fixedNow });

    expect(() =>
      finalizeLegacyMigration(adaptation, { ...confirmed, primaryUserParticipantId: "   " }),
    ).toThrow(/primaryUserParticipantId/);
  });
});
