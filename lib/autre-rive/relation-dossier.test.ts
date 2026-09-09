import { describe, expect, it } from "vitest";

import { isPrimaryParticipantValid } from "./types";
import type {
  CriticalSafetyAssessment,
  RelationDossier,
  RelationStatus,
  RelationType,
  SafetyLevel,
} from "./types";

// Phase 2 d'IMP-001 (SR-D-001, Décision 4 + clarification de gouvernance
// minimale sur RelationType, RelationStatus et CriticalSafetyAssessment) —
// tests du type canonique RelationDossier. Non branché sur un écran, aucune
// donnée existante ni localStorage modifié, aucune migration lancée.

function assertNever(value: never): never {
  throw new Error(`Valeur inattendue, hors de l'union documentée : ${String(value)}`);
}

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

describe("RelationDossier — création valide (SR-D-001, Décision 4)", () => {
  it("construit un dossier conforme au type canonique", () => {
    const dossier = buildValidDossier();

    expect(dossier.id).toBe("dossier-1");
    expect(dossier.schemaVersion).toBe(1);
    expect(dossier.participantIds).toContain(dossier.primaryUserParticipantId);
  });
});

describe("RelationDossier — champs obligatoires détectés à la compilation", () => {
  it("participantIds est obligatoire", () => {
    const base = buildValidDossier();
    // eslint-disable-next-line @typescript-eslint/no-unused-vars -- extrait volontairement pour l'omettre ci-dessous
    const { participantIds, ...withoutParticipantIds } = base;

    // @ts-expect-error — participantIds manquant : champ obligatoire (SR-D-001, Décision 4).
    const invalid: RelationDossier = withoutParticipantIds;

    expect(invalid).toBeDefined();
  });

  it("schemaVersion est obligatoire", () => {
    const base = buildValidDossier();
    // eslint-disable-next-line @typescript-eslint/no-unused-vars -- extrait volontairement pour l'omettre ci-dessous
    const { schemaVersion, ...withoutSchemaVersion } = base;

    // @ts-expect-error — schemaVersion manquant : champ obligatoire (SR-D-001, Décision 4).
    const invalid: RelationDossier = withoutSchemaVersion;

    expect(invalid).toBeDefined();
  });
});

describe("RelationDossier — primaryUserParticipantId doit appartenir à participantIds", () => {
  it("accepte un primaryUserParticipantId présent dans participantIds", () => {
    const dossier = buildValidDossier();

    expect(isPrimaryParticipantValid(dossier)).toBe(true);
  });

  it("rejette un primaryUserParticipantId absent de participantIds", () => {
    const dossier = { ...buildValidDossier(), primaryUserParticipantId: "quelqu-un-d-autre" };

    expect(isPrimaryParticipantValid(dossier)).toBe(false);
  });
});

describe("RelationType / RelationStatus / SafetyLevel — clarification de gouvernance", () => {
  it("n'autorise que les cinq types de relation fixés par la clarification", () => {
    function isKnown(type: RelationType): true {
      switch (type) {
        case "romantic":
        case "family":
        case "friendship":
        case "professional":
        case "other":
          return true;
        default:
          return assertNever(type);
      }
    }

    expect(isKnown("romantic")).toBe(true);
    expect(isKnown("family")).toBe(true);
    expect(isKnown("friendship")).toBe(true);
    expect(isKnown("professional")).toBe(true);
    expect(isKnown("other")).toBe(true);
  });

  it("n'autorise que les trois statuts fixés par la clarification", () => {
    function isKnown(status: RelationStatus): true {
      switch (status) {
        case "active":
        case "paused":
        case "ended":
          return true;
        default:
          return assertNever(status);
      }
    }

    expect(isKnown("active")).toBe(true);
    expect(isKnown("paused")).toBe(true);
    expect(isKnown("ended")).toBe(true);
  });

  it("n'autorise que les quatre niveaux de sécurité fixés par la clarification", () => {
    function isKnown(level: SafetyLevel): true {
      switch (level) {
        case "none_identified":
        case "concern":
        case "high_risk":
        case "critical":
          return true;
        default:
          return assertNever(level);
      }
    }

    expect(isKnown("none_identified")).toBe(true);
    expect(isKnown("concern")).toBe(true);
    expect(isKnown("high_risk")).toBe(true);
    expect(isKnown("critical")).toBe(true);
  });

  it("construit un CriticalSafetyAssessment conforme, sans diagnostic ni scoring", () => {
    const assessment: CriticalSafetyAssessment = {
      id: "safety-1",
      relationDossierId: "dossier-1",
      level: "concern",
      participantIds: ["user-1", "person-1"],
      evidenceIds: ["evidence-1"],
      rationale: "Message contenant une menace implicite, une seule occurrence à ce jour.",
      createdAt: "2026-08-01T00:00:00.000Z",
      createdBy: "system",
    };

    expect(assessment.level).toBe("concern");
    // Aucun champ de diagnostic, de catégorisation de violence ou de score
    // automatique n'existe sur ce type — seulement niveau, preuves, motif,
    // confiance facultative, auteur et date, conformément à la clarification.
    expect(Object.keys(assessment).sort()).toEqual(
      [
        "createdAt",
        "createdBy",
        "evidenceIds",
        "id",
        "level",
        "participantIds",
        "rationale",
        "relationDossierId",
      ].sort(),
    );
  });
});

describe("RelationDossier — aucune ancienne structure plate héritée", () => {
  type Expect<T extends true> = T;
  type NotHasKey<T, K extends string> = K extends keyof T ? false : true;

  it("le type canonique ne comporte aucun champ plat hérité des définitions locales existantes", () => {
    // Vérification de type : si l'un de ces champs existait sur RelationDossier,
    // ce fichier ne compilerait plus (npx tsc --noEmit le détecte). Les champs
    // testés sont ceux des quatre définitions locales dupliquées identifiées
    // dans l'audit d'IMP-001 (niveauClarte, niveauReciprocite, niveauSecurite,
    // energieEmotionnelle, dateCreation, derniereInteraction, statut, nom).
    type _NoLegacyFlatFields = Expect<
      [
        NotHasKey<RelationDossier, "niveauClarte">,
        NotHasKey<RelationDossier, "niveauReciprocite">,
        NotHasKey<RelationDossier, "niveauSecurite">,
        NotHasKey<RelationDossier, "energieEmotionnelle">,
        NotHasKey<RelationDossier, "dateCreation">,
        NotHasKey<RelationDossier, "derniereInteraction">,
        NotHasKey<RelationDossier, "statut">,
        NotHasKey<RelationDossier, "nom">,
      ] extends true[]
        ? true
        : false
    >;

    const check: _NoLegacyFlatFields = true;
    expect(check).toBe(true);
  });
});
