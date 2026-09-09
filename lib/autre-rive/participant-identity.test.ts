import { describe, expect, it } from "vitest";

import { generateStableParticipantIds } from "./participant-identity";

// Phase 4bis d'IMP-001 (SR-D-001, Décision 4).

describe("generateStableParticipantIds", () => {
  it("produit des identifiants stables pour la même confirmation (test 6)", () => {
    const labels = ["Julie", "David"];

    expect(generateStableParticipantIds(labels)).toEqual(generateStableParticipantIds(labels));
  });

  it("ne collisionne jamais entre deux participants du même dossier (test 7)", () => {
    const ids = generateStableParticipantIds(["Julie", "Julie", "julie !"]);

    expect(new Set(ids).size).toBe(3);
  });

  it("produit des identifiants différents pour des libellés différents", () => {
    const ids = generateStableParticipantIds(["Julie", "David"]);

    expect(ids[0]).not.toBe(ids[1]);
  });

  it("normalise accents, casse et ponctuation de façon prévisible", () => {
    const ids = generateStableParticipantIds(["Éléonore-Marie"]);

    expect(ids[0]).toBe("eleonore-marie");
  });

  it("ne génère jamais d'identifiant vide, même pour un libellé sans caractère alphanumérique", () => {
    const ids = generateStableParticipantIds(["!!!"]);

    expect(ids[0]).toBe("participant");
  });
});
