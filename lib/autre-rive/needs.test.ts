import { describe, expect, it } from "vitest";

import {
  addNeed,
  confirmNeed,
  correctNeed,
  createExpressedNeed,
  createObservedNeed,
  rejectNeed,
} from "./needs";
import type { RelationDossier } from "./types";

// Phase 8bis.2 (SR-D-001, Décision 4 §1 et Décision 6, item Besoins) —
// tests du cycle de vie minimal des besoins. Chaque test correspond à un
// point de la liste de tests obligatoires fournie pour cette sous-phase.

function buildValidDossier(): RelationDossier {
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
  };
}

const fixedNow = () => "2026-08-25T10:00:00.000Z";

describe("createExpressedNeed / createObservedNeed (tests 1, 2)", () => {
  it("crée un besoin exprimé avec l'origine 'expressed' (test 1)", () => {
    const need = createExpressedNeed({
      id: "need-1",
      label: "Se sentir écoutée",
      createdAt: fixedNow(),
    });

    expect(need.origin).toBe("expressed");
    expect(need.status).toBe("active");
    expect(need.id).toBe("need-1");
  });

  it("crée un besoin observé avec l'origine 'observed' (test 2)", () => {
    const need = createObservedNeed({
      id: "need-2",
      label: "Besoin de réassurance",
      evidenceIds: ["evidence-1"],
      createdAt: fixedNow(),
    });

    expect(need.origin).toBe("observed");
    expect(need.evidenceIds).toEqual(["evidence-1"]);
  });
});

describe("Absence d'automatisme observed -> user_confirmed (tests 3, 12)", () => {
  it("un besoin observé reste non confirmé sans action explicite (test 3)", () => {
    const need = createObservedNeed({ id: "need-1", label: "Besoin de sécurité", createdAt: fixedNow() });
    const dossier = addNeed(buildValidDossier(), need, { now: fixedNow });

    expect(dossier.needs.find((n) => n.id === "need-1")?.origin).toBe("observed");
  });

  it("aucune opération de création ou d'historisation ne transforme automatiquement un besoin observé en user_confirmed (test 12)", () => {
    let dossier = buildValidDossier();
    const first = createObservedNeed({ id: "need-1", label: "Besoin d'autonomie", createdAt: fixedNow() });
    dossier = addNeed(dossier, first, { now: fixedNow });

    const second = createObservedNeed({ id: "need-2", label: "Besoin de clarté", createdAt: fixedNow() });
    dossier = addNeed(dossier, second, { now: fixedNow });

    expect(dossier.needs.every((n) => n.origin !== "user_confirmed")).toBe(true);
  });
});

describe("confirmNeed / correctNeed / rejectNeed — actions explicites (tests 4, 5, 6)", () => {
  it("confirmation explicite d'un besoin (test 4)", () => {
    const observed = createObservedNeed({ id: "need-1", label: "Besoin d'espace", createdAt: fixedNow() });
    const dossier = addNeed(buildValidDossier(), observed, { now: fixedNow });

    const result = confirmNeed(dossier, "need-1", "need-1-confirmed", { now: fixedNow });
    const confirmed = result.needs.find((n) => n.id === "need-1-confirmed");

    expect(confirmed?.origin).toBe("user_confirmed");
    expect(confirmed?.supersedesNeedId).toBe("need-1");
  });

  it("correction explicite d'un besoin (test 5)", () => {
    const observed = createObservedNeed({
      id: "need-1",
      label: "Besoin flou",
      evidenceIds: ["evidence-1"],
      createdAt: fixedNow(),
    });
    const dossier = addNeed(buildValidDossier(), observed, { now: fixedNow });

    const result = correctNeed(dossier, "need-1", "need-1-corrected", { label: "Besoin de présence" }, { now: fixedNow });
    const corrected = result.needs.find((n) => n.id === "need-1-corrected");

    expect(corrected?.label).toBe("Besoin de présence");
    expect(corrected?.supersedesNeedId).toBe("need-1");
    // Une correction ne modifie pas l'origine du besoin.
    expect(corrected?.origin).toBe("observed");
  });

  it("rejet explicite d'un besoin (test 6)", () => {
    const observed = createObservedNeed({ id: "need-1", label: "Besoin supposé", createdAt: fixedNow() });
    const dossier = addNeed(buildValidDossier(), observed, { now: fixedNow });

    const result = rejectNeed(dossier, "need-1", "need-1-rejected", { now: fixedNow });
    const rejected = result.needs.find((n) => n.id === "need-1-rejected");

    expect(rejected?.status).toBe("inactive");
    expect(rejected?.supersedesNeedId).toBe("need-1");
  });
});

describe("Conservation de l'origine, des preuves et de l'historique (tests 7, 8, 9, 10)", () => {
  it("conserve l'origine du besoin d'origine après validation (test 7)", () => {
    const observed = createObservedNeed({ id: "need-1", label: "Besoin de stabilité", createdAt: fixedNow() });
    const dossier = addNeed(buildValidDossier(), observed, { now: fixedNow });

    const result = confirmNeed(dossier, "need-1", "need-1-confirmed", { now: fixedNow });
    const original = result.needs.find((n) => n.id === "need-1");

    expect(original?.origin).toBe("observed");
    expect(original).toBe(observed);
  });

  it("conserve les preuves du besoin d'origine après validation (test 8)", () => {
    const observed = createObservedNeed({
      id: "need-1",
      label: "Besoin de respect",
      evidenceIds: ["evidence-1", "evidence-2"],
      createdAt: fixedNow(),
    });
    const dossier = addNeed(buildValidDossier(), observed, { now: fixedNow });

    const result = rejectNeed(dossier, "need-1", "need-1-rejected", { now: fixedNow });
    const original = result.needs.find((n) => n.id === "need-1");
    const rejected = result.needs.find((n) => n.id === "need-1-rejected");

    expect(original?.evidenceIds).toEqual(["evidence-1", "evidence-2"]);
    // Preuves conservées par défaut sur la nouvelle entrée, sauf correction explicite.
    expect(rejected?.evidenceIds).toEqual(["evidence-1", "evidence-2"]);
  });

  it("conserve l'historique de façon non destructive : le besoin d'origine reste intact et présent (test 9)", () => {
    const observed = createObservedNeed({ id: "need-1", label: "Besoin de reconnaissance", createdAt: fixedNow() });
    let dossier = addNeed(buildValidDossier(), observed, { now: fixedNow });
    const needsBeforeLength = dossier.needs.length;

    dossier = confirmNeed(dossier, "need-1", "need-1-confirmed", { now: fixedNow });

    expect(dossier.needs).toHaveLength(needsBeforeLength + 1);
    expect(dossier.needs.find((n) => n.id === "need-1")).toEqual(observed);
  });

  it("une nouvelle validation n'efface pas les validations précédentes (test 10)", () => {
    const observed = createObservedNeed({ id: "need-1", label: "Besoin de continuité", createdAt: fixedNow() });
    let dossier = addNeed(buildValidDossier(), observed, { now: fixedNow });

    dossier = confirmNeed(dossier, "need-1", "need-1-confirmed", { now: fixedNow });
    dossier = correctNeed(
      dossier,
      "need-1-confirmed",
      "need-1-confirmed-corrected",
      { description: "Précision ajoutée après confirmation" },
      { now: fixedNow },
    );

    expect(dossier.needs.map((n) => n.id)).toEqual(["need-1", "need-1-confirmed", "need-1-confirmed-corrected"]);
  });
});

describe("Validation de cohérence (test 11)", () => {
  it("impossible de confirmer, corriger ou rejeter un besoin inexistant (test 11)", () => {
    const dossier = buildValidDossier();

    expect(() => confirmNeed(dossier, "need-inexistant", "need-x", { now: fixedNow })).toThrowError();
    expect(() => correctNeed(dossier, "need-inexistant", "need-x", { label: "x" }, { now: fixedNow })).toThrowError();
    expect(() => rejectNeed(dossier, "need-inexistant", "need-x", { now: fixedNow })).toThrowError();
  });

  it("addNeed refuse d'écraser un besoin existant portant le même id", () => {
    const need = createObservedNeed({ id: "need-1", label: "Besoin initial", createdAt: fixedNow() });
    const dossier = addNeed(buildValidDossier(), need, { now: fixedNow });
    const duplicate = createObservedNeed({ id: "need-1", label: "Tentative de remplacement", createdAt: fixedNow() });

    expect(() => addNeed(dossier, duplicate, { now: fixedNow })).toThrowError();
  });
});
