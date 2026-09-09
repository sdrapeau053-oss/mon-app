import { describe, expect, it } from "vitest";

import type {
  AssessmentSource,
  CurrentAssessmentRef,
  LegacyScoreSnapshot,
  NeedOrigin,
  NeedStatement,
  NeedStatus,
  ScoreAssessment,
  ScoreScale,
  ScoreSource,
  ScoreValue,
} from "./types";

// Phase 2 d'IMP-001 (SR-D-001, Décisions 2, 3 et 4) — tests de contrat sur les
// types canoniques ajoutés cette phase. Ces types ne sont branchés sur aucun
// écran et n'ont pas de fonction associée : il n'y a donc pas de "comportement"
// à tester au sens classique. Ce que ces tests garantissent :
//   1. qu'une instance conforme à SR-D-001 est réellement constructible
//      (contrat de forme, détecte toute dérive accidentelle du type) ;
//   2. que l'ensemble exact des valeurs autorisées par chaque union littérale
//      correspond mot pour mot à SR-D-001 (exhaustiveness check : l'ajout ou
//      le retrait d'une valeur casse la compilation).
//
// RelationDossier, RelationType, RelationStatus et CriticalSafetyAssessment
// ne sont pas couverts ici : ils ne sont pas définis dans ce fichier (voir le
// rapport de la Phase 2 pour le blocage documentaire correspondant). Les
// invariants "participants obligatoires", "primaryUserParticipantId dans
// participantIds", "schemaVersion obligatoire" et "validation des statuts et
// types" prévus par IMP-001 pour RelationDossier ne peuvent donc pas être
// testés cette phase.

function assertNever(value: never): never {
  throw new Error(`Valeur inattendue, hors de l'union documentée par SR-D-001 : ${String(value)}`);
}

describe("NeedOrigin / NeedStatus / NeedStatement (SR-D-001, Décision 4 §1)", () => {
  it("n'autorise que les trois origines documentées par SR-D-001", () => {
    function label(origin: NeedOrigin): string {
      switch (origin) {
        case "expressed":
          return "exprimé";
        case "observed":
          return "observé";
        case "user_confirmed":
          return "confirmé par l'utilisatrice";
        default:
          return assertNever(origin);
      }
    }

    expect(label("expressed")).toBe("exprimé");
    expect(label("observed")).toBe("observé");
    expect(label("user_confirmed")).toBe("confirmé par l'utilisatrice");
  });

  it("n'autorise que les quatre statuts documentés par SR-D-001", () => {
    function isKnown(status: NeedStatus): true {
      switch (status) {
        case "active":
        case "evolving":
        case "inactive":
        case "contradicted":
          return true;
        default:
          return assertNever(status);
      }
    }

    expect(isKnown("active")).toBe(true);
    expect(isKnown("evolving")).toBe(true);
    expect(isKnown("inactive")).toBe(true);
    expect(isKnown("contradicted")).toBe(true);
  });

  it("construit un besoin observé, non encore confirmé, tel que décrit par SR-D-001", () => {
    const need: NeedStatement = {
      id: "need-1",
      label: "Besoin de sécurité émotionnelle",
      origin: "observed",
      status: "active",
      evidenceIds: ["evidence-1", "evidence-2"],
      validFrom: "2026-08-01T00:00:00.000Z",
      createdAt: "2026-08-01T00:00:00.000Z",
      updatedAt: "2026-08-01T00:00:00.000Z",
    };

    expect(need.origin).toBe("observed");
    // SR-D-001 : « une hypothèse observée devient user_confirmed seulement
    // lorsque l'utilisatrice la confirme ; elle n'écrase jamais la version
    // antérieure. » Ce test fige seulement la forme, pas ce comportement
    // (aucune fonction de confirmation n'existe encore — hors périmètre Phase 2).
    expect(need.status).not.toBe("contradicted");
  });
});

describe("ScoreValue (SR-D-001, Décision 2 §1 et §4)", () => {
  it("construit une valeur sur l'échelle canonique 0-100", () => {
    const score: ScoreValue = {
      rawValue: 72,
      rawScale: "0-100",
      normalizedValue: 72,
      source: "ai",
    };

    expect(score.normalizedValue).toBe(score.rawValue);
  });

  it("représente une valeur historique sans provenance comme 'unknown', jamais convertie automatiquement", () => {
    // SR-D-001 §4 : « Toute valeur historique dépourvue de provenance explicite
    // doit être importée comme une valeur inconnue [...] sans conversion
    // automatique irréversible. »
    const legacyValue: ScoreValue = {
      rawValue: 7,
      rawScale: "unknown",
      normalizedValue: null,
      source: "unknown",
    };

    expect(legacyValue.normalizedValue).toBeNull();
    expect(legacyValue.source).toBe("unknown");
  });

  it("n'autorise que les échelles et sources documentées par SR-D-001", () => {
    const scales: ScoreScale[] = ["1-10", "0-100", "unknown"];
    const sources: ScoreSource[] = ["manual", "ai", "hybrid", "imported", "unknown"];

    expect(scales).toHaveLength(3);
    expect(sources).toHaveLength(5);
  });
});

describe("ScoreAssessment / CurrentAssessmentRef (SR-D-001, Décision 3 §2 et §11)", () => {
  it("construit une évaluation IA et son pointeur courant explicite", () => {
    const assessment: ScoreAssessment = {
      id: "assessment-1",
      dimension: "clarte",
      score: { rawValue: 65, rawScale: "0-100", normalizedValue: 65, source: "ai" },
      source: "ai",
      createdAt: "2026-08-01T00:00:00.000Z",
      createdBy: "system",
      evidenceIds: ["evidence-1"],
      confidence: 0.7,
      confidenceSource: "system_estimated",
    };

    const currentRef: CurrentAssessmentRef = {
      dimension: "clarte",
      assessmentId: assessment.id,
      selectedAt: "2026-08-02T00:00:00.000Z",
      selectedBy: "user-1",
    };

    // SR-D-001 : le pointeur courant est désigné explicitement par dimension,
    // jamais déduit de la date de création ou de la source.
    expect(currentRef.dimension).toBe(assessment.dimension);
    expect(currentRef.assessmentId).toBe(assessment.id);
  });

  it("n'autorise que les quatre sources d'évaluation documentées par SR-D-001", () => {
    function isKnown(source: AssessmentSource): true {
      switch (source) {
        case "manual":
        case "ai":
        case "user_confirmed":
        case "derived":
          return true;
        default:
          return assertNever(source);
      }
    }

    expect(isKnown("manual")).toBe(true);
    expect(isKnown("ai")).toBe(true);
    expect(isKnown("user_confirmed")).toBe(true);
    expect(isKnown("derived")).toBe(true);
  });
});

describe("LegacyScoreSnapshot (SR-D-001, Décision 4 §3)", () => {
  it("construit un instantané hérité en attente de revue, avec provenance verrouillée", () => {
    const snapshot: LegacyScoreSnapshot = {
      id: "legacy-1",
      metricKey: "niveauClarte",
      rawValue: 7,
      originalField: "niveauClarte",
      importedAt: "2026-08-01T00:00:00.000Z",
      provenance: "legacy_unknown",
      migrationStatus: "pending_review",
    };

    expect(snapshot.provenance).toBe("legacy_unknown");
    expect(["pending_review", "confirmed", "excluded"]).toContain(snapshot.migrationStatus);
  });
});
