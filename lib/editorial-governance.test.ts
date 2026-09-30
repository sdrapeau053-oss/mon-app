import { describe, expect, it } from "vitest";
import {
  EDITORIAL_PROMPT_REGISTRY,
  LHS_STANDARD_REFERENCE,
  createEditorialTextHash,
  createAuditTraceabilityMetadata,
  editorialAuditCurrencyCountsAsCurrent,
  getEditorialAuditCurrencyStatus,
  getAuditTraceabilityStatus,
  getCanonicalPromptEntries,
  getEditorialPromptEntry,
  getEditorialSystemPrompt,
  getPlannedPromptEntries,
  isAuditTraceabilityMetadata,
  type AuditTraceabilityMetadata,
} from "./editorial-governance";
import { chapitreTome1EstVerrouillePourEcriture, type ChapitreTome1 } from "./tome1-chapters";

describe("editorial governance registry", () => {
  it("declares every planned prompt with a unique promptId", () => {
    const promptIds = EDITORIAL_PROMPT_REGISTRY.map((entry) => entry.promptId);

    expect(promptIds).toHaveLength(9);
    expect(new Set(promptIds).size).toBe(promptIds.length);
  });

  it("declares required versioning fields for every prompt", () => {
    EDITORIAL_PROMPT_REGISTRY.forEach((entry) => {
      expect(entry.promptId).toMatch(/^LHS-/);
      expect(entry.promptVersion).toBe("1.0.0");
      expect(entry.standardVersion).toBe(LHS_STANDARD_REFERENCE);
    });

    expect(getCanonicalPromptEntries().map((entry) => entry.promptId)).toEqual([
      "LHS-MEMORY-TO-FRAGMENT",
      "LHS-VOICE-LOCAL",
      "LHS-VOICE-LONGITUDINAL",
    ]);
    expect(getPlannedPromptEntries()).toHaveLength(6);
  });

  it("declares LHS-VOICE-LOCAL as canonical 1.0.0 for LHS-STD-1.0.0", () => {
    const entry = getEditorialPromptEntry("LHS-VOICE-LOCAL");

    expect(entry).toMatchObject({
      promptVersion: "1.0.0",
      standardVersion: "LHS-STD-1.0.0",
      status: "CANONICAL",
      toolId: "api.detecteur-voix",
      analysisUnit: "passage",
    });
  });

  it("declares LHS-VOICE-LONGITUDINAL as canonical 1.0.0 for LHS-STD-1.0.0", () => {
    const entry = getEditorialPromptEntry("LHS-VOICE-LONGITUDINAL");

    expect(entry).toMatchObject({
      promptVersion: "1.0.0",
      standardVersion: "LHS-STD-1.0.0",
      status: "CANONICAL",
      toolId: "api.audit-voix",
      analysisUnit: "chapter",
    });
  });

  it("does not promote any non-voice planned prompt to canonical in lot 2", () => {
    expect(getPlannedPromptEntries().map((entry) => entry.promptId)).toEqual([
      "LHS-ENGAGEMENT-VIBRATION",
      "LHS-SUR-EXPLICATION",
      "LHS-LINGUISTIC",
      "LHS-INTEGRITY",
      "LHS-FRAGMENT-WEAKNESSES",
      "LHS-EDITORIAL-DECISION-SUPPORT",
    ]);
  });

  it("keeps legacy audit results unversioned instead of assigning the current standard retroactively", () => {
    const legacyResult = {
      chapterId: "1",
      analyzedAt: "2026-08-20T10:00:00.000Z",
      result: { decision: "validé" },
    };

    expect(getAuditTraceabilityStatus(legacyResult)).toBe("LEGACY_UNVERSIONED");
  });

  it("recognizes complete audit traceability metadata", () => {
    const metadata: AuditTraceabilityMetadata = {
      promptId: "LHS-VOICE-LOCAL",
      promptVersion: "1.0.0",
      standardVersion: LHS_STANDARD_REFERENCE,
      toolId: "api.detecteur-voix",
      analysisUnit: "passage",
      modelProvider: "anthropic",
      modelName: "claude-opus-4-5",
      analyzedAt: "2026-08-22T12:00:00.000Z",
      textHash: createEditorialTextHash("texte analysé"),
      resultSchemaVersion: "1.0.0",
    };

    expect(isAuditTraceabilityMetadata(metadata)).toBe(true);
    expect(getAuditTraceabilityStatus({ metadata, result: {} })).toBe("VERSIONED");
  });

  it("creates complete local voice traceability metadata", () => {
    const metadata = createAuditTraceabilityMetadata({
      promptId: "LHS-VOICE-LOCAL",
      modelProvider: "anthropic",
      modelName: "claude-opus-4-5",
      analyzedAt: "2026-08-22T12:00:00.000Z",
      resultSchemaVersion: "1.0.0",
      text: "passage local",
      textVersion: "local-text-v1",
    });

    expect(metadata).toMatchObject({
      promptId: "LHS-VOICE-LOCAL",
      promptVersion: "1.0.0",
      standardVersion: "LHS-STD-1.0.0",
      toolId: "api.detecteur-voix",
      analysisUnit: "passage",
      modelProvider: "anthropic",
      modelName: "claude-opus-4-5",
      analyzedAt: "2026-08-22T12:00:00.000Z",
      textHash: createEditorialTextHash("passage local"),
      textVersion: "local-text-v1",
      resultSchemaVersion: "1.0.0",
    });
  });

  it("creates complete longitudinal voice traceability metadata", () => {
    const metadata = createAuditTraceabilityMetadata({
      promptId: "LHS-VOICE-LONGITUDINAL",
      modelProvider: "anthropic",
      modelName: "claude-sonnet-4-20250514",
      analyzedAt: "2026-08-22T12:00:00.000Z",
      resultSchemaVersion: "1.0.0",
      text: "chapitre principal",
      textVersion: "primary-chapter-text-v1; references-context-not-hashed",
    });

    expect(metadata).toMatchObject({
      promptId: "LHS-VOICE-LONGITUDINAL",
      promptVersion: "1.0.0",
      standardVersion: "LHS-STD-1.0.0",
      toolId: "api.audit-voix",
      analysisUnit: "chapter",
      modelProvider: "anthropic",
      modelName: "claude-sonnet-4-20250514",
      analyzedAt: "2026-08-22T12:00:00.000Z",
      textHash: createEditorialTextHash("chapitre principal"),
      textVersion: "primary-chapter-text-v1; references-context-not-hashed",
      resultSchemaVersion: "1.0.0",
    });
  });

  it("creates metadata from the registry without assigning legacy results to the current standard", () => {
    const metadata = createAuditTraceabilityMetadata({
      promptId: "LHS-MEMORY-TO-FRAGMENT",
      modelProvider: "anthropic",
      modelName: "claude-sonnet-4-6",
      analyzedAt: "2026-08-22T12:00:00.000Z",
      resultSchemaVersion: "1.0.0",
      text: "matière source",
    });

    expect(metadata).toMatchObject({
      promptId: "LHS-MEMORY-TO-FRAGMENT",
      promptVersion: "1.0.0",
      standardVersion: "LHS-STD-1.0.0",
      toolId: "api.analyser",
      analysisUnit: "raw-memory",
      modelProvider: "anthropic",
      modelName: "claude-sonnet-4-6",
      resultSchemaVersion: "1.0.0",
    });
  });

  it("creates deterministic text hashes from the analyzed text only", () => {
    const first = createEditorialTextHash("Même texte");
    const second = createEditorialTextHash("Même texte");
    const different = createEditorialTextHash("Texte différent");

    expect(first).toBe(second);
    expect(first).toMatch(/^fnv1a32:[0-9a-f]{8}$/);
    expect(first).not.toBe(different);
  });

  it("allows saving chapters that are not sealed", () => {
    const chapter = {
      id: "chapitre-1",
      titre: "Chapitre test",
      bloc: 1,
      type: "scene",
      statut: "écrit",
      contenu: "Texte courant",
    } satisfies ChapitreTome1;

    expect(chapitreTome1EstVerrouillePourEcriture(chapter)).toBe(false);
  });

  it("refuses saving sealed chapters", () => {
    const chapter = {
      id: "chapitre-1",
      titre: "Chapitre test",
      bloc: 1,
      type: "scene",
      statut: "scellé",
      contenu: "Texte scellé",
    } satisfies ChapitreTome1;

    expect(chapitreTome1EstVerrouillePourEcriture(chapter)).toBe(true);
  });

  it("keeps legacy audit results readable but not current", () => {
    const legacyResult = {
      chapterId: "1",
      analyzedAt: "2026-08-20T10:00:00.000Z",
      result: { decision: "ancien" },
    };

    expect(getEditorialAuditCurrencyStatus(legacyResult, "texte courant")).toBe("LEGACY_UNVERSIONED");
    expect(editorialAuditCurrencyCountsAsCurrent("LEGACY_UNVERSIONED")).toBe(false);
  });

  it("recognizes current versioned audits when the text hash matches", () => {
    const text = "texte courant";
    const audit = {
      metadata: createAuditTraceabilityMetadata({
        promptId: "LHS-VOICE-LOCAL",
        modelProvider: "anthropic",
        modelName: "claude-opus-4-5",
        analyzedAt: "2026-08-22T12:00:00.000Z",
        resultSchemaVersion: "1.0.0",
        text,
      }),
      result: {},
    };

    const status = getEditorialAuditCurrencyStatus(audit, text);
    expect(status).toBe("VERSIONED_CURRENT");
    expect(editorialAuditCurrencyCountsAsCurrent(status)).toBe(true);
  });

  it("marks versioned audits stale when the current text changed", () => {
    const audit = {
      metadata: createAuditTraceabilityMetadata({
        promptId: "LHS-VOICE-LOCAL",
        modelProvider: "anthropic",
        modelName: "claude-opus-4-5",
        analyzedAt: "2026-08-22T12:00:00.000Z",
        resultSchemaVersion: "1.0.0",
        text: "ancien texte",
      }),
      result: {},
    };

    expect(getEditorialAuditCurrencyStatus(audit, "texte courant")).toBe("STALE_TEXT");
  });

  it("marks audits from an old standard as not current", () => {
    const metadata = createAuditTraceabilityMetadata({
      promptId: "LHS-VOICE-LOCAL",
      modelProvider: "anthropic",
      modelName: "claude-opus-4-5",
      analyzedAt: "2026-08-22T12:00:00.000Z",
      resultSchemaVersion: "1.0.0",
      text: "texte courant",
    }) as Record<string, unknown>;
    metadata.standardVersion = "LHS-STD-0.9.0";

    expect(getEditorialAuditCurrencyStatus({ metadata, result: {} }, "texte courant")).toBe("STALE_STANDARD_OR_PROMPT");
  });

  it("marks audits from an old prompt version as not current", () => {
    const metadata = createAuditTraceabilityMetadata({
      promptId: "LHS-VOICE-LOCAL",
      modelProvider: "anthropic",
      modelName: "claude-opus-4-5",
      analyzedAt: "2026-08-22T12:00:00.000Z",
      resultSchemaVersion: "1.0.0",
      text: "texte courant",
    }) as Record<string, unknown>;
    metadata.promptVersion = "0.9.0";

    expect(getEditorialAuditCurrencyStatus({ metadata, result: {} }, "texte courant")).toBe("STALE_STANDARD_OR_PROMPT");
  });

  it("does not let missing AI audits validate or seal a chapter", () => {
    const status = getEditorialAuditCurrencyStatus(undefined, "texte courant");

    expect(status).toBe("ABSENT");
    expect(editorialAuditCurrencyCountsAsCurrent(status)).toBe(false);
  });

  it("keeps voice prompts away from origin-certification fields or labels", () => {
    const localPrompt = getEditorialSystemPrompt("LHS-VOICE-LOCAL") || "";
    const longitudinalPrompt = getEditorialSystemPrompt("LHS-VOICE-LONGITUDINAL") || "";
    const combined = `${localPrompt}\n${longitudinalPrompt}`;

    expect(combined).not.toMatch(/risqueDetectionIA|niveauHumanite|pourcentage humain|pourcentage IA|% humain|% IA/i);
  });

  it("states that voice audits cannot modify, validate, or seal the manuscript", () => {
    const localPrompt = getEditorialSystemPrompt("LHS-VOICE-LOCAL") || "";
    const longitudinalPrompt = getEditorialSystemPrompt("LHS-VOICE-LONGITUDINAL") || "";

    [localPrompt, longitudinalPrompt].forEach((prompt) => {
      expect(prompt).toContain("Ne modifie pas le manuscrit");
      expect(prompt).toContain("Ne valide pas");
      expect(prompt).toContain("Ne scelle pas");
    });
  });

  it("makes non-invention explicit in voice prompts", () => {
    const localPrompt = getEditorialSystemPrompt("LHS-VOICE-LOCAL") || "";
    const longitudinalPrompt = getEditorialSystemPrompt("LHS-VOICE-LONGITUDINAL") || "";

    [localPrompt, longitudinalPrompt].forEach((prompt) => {
      expect(prompt).toContain("Toute matiere non fournie est non disponible");
      expect(prompt).toContain("MATIERE INSUFFISANTE - demander a l'autrice si un souvenir supplementaire existe.");
      expect(prompt).toContain("N'invente jamais transition, sensation, atmosphere, causalite, geste, dialogue");
    });
  });

  it("distinguishes local voice from longitudinal voice", () => {
    const localPrompt = getEditorialSystemPrompt("LHS-VOICE-LOCAL") || "";
    const longitudinalPrompt = getEditorialSystemPrompt("LHS-VOICE-LONGITUDINAL") || "";

    expect(localPrompt).toContain("Tu analyses localement un passage, fragment ou chapitre unique");
    expect(longitudinalPrompt).toContain("L'objectif est longitudinal");
  });

  it("forbids mechanical harmonization between tomes in the longitudinal prompt", () => {
    const longitudinalPrompt = getEditorialSystemPrompt("LHS-VOICE-LONGITUDINAL") || "";

    expect(longitudinalPrompt).toContain("N'harmonise jamais mecaniquement les tomes ou les chapitres");
    expect(longitudinalPrompt).toContain("N'impose jamais la voix du Tome I aux futurs tomes");
    expect(longitudinalPrompt).toContain("Ne traite jamais la variation de voix comme une erreur par principe");
  });
});
