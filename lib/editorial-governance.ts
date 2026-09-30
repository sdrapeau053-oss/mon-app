export const LHS_STANDARD_ID = "LHS-STD" as const;
export const LHS_STANDARD_VERSION = "1.0.0" as const;
export const LHS_STANDARD_REFERENCE = `${LHS_STANDARD_ID}-${LHS_STANDARD_VERSION}` as const;

export type EditorialPromptStatus = "PLANNED" | "CANONICAL" | "LEGACY";

export type EditorialAnalysisUnit =
  | "raw-memory"
  | "fragment"
  | "passage"
  | "chapter"
  | "chapter-set"
  | "corpus";

export type EditorialModelProvider = "anthropic" | "openai" | "local" | "manual" | "unknown";

export type EditorialPromptId =
  | "LHS-MEMORY-TO-FRAGMENT"
  | "LHS-VOICE-LOCAL"
  | "LHS-VOICE-LONGITUDINAL"
  | "LHS-ENGAGEMENT-VIBRATION"
  | "LHS-SUR-EXPLICATION"
  | "LHS-LINGUISTIC"
  | "LHS-INTEGRITY"
  | "LHS-FRAGMENT-WEAKNESSES"
  | "LHS-EDITORIAL-DECISION-SUPPORT";

export type EditorialPromptRegistryEntry = {
  promptId: EditorialPromptId;
  promptVersion: string;
  standardVersion: typeof LHS_STANDARD_REFERENCE;
  toolId: string;
  route?: string;
  status: EditorialPromptStatus;
  responsibility: string;
  exclusions: string[];
  analysisUnit: EditorialAnalysisUnit;
};

export type AuditTraceabilityMetadata = {
  promptId: EditorialPromptId;
  promptVersion: string;
  standardVersion: typeof LHS_STANDARD_REFERENCE;
  toolId: string;
  analysisUnit: EditorialAnalysisUnit;
  modelProvider: EditorialModelProvider;
  modelName: string;
  analyzedAt: string;
  textHash: string;
  textVersion?: string;
  resultSchemaVersion: string;
};

export type CreateAuditTraceabilityMetadataInput = {
  analyzedAt?: string;
  modelName: string;
  modelProvider: EditorialModelProvider;
  promptId: EditorialPromptId;
  resultSchemaVersion: string;
  text: string;
  textVersion?: string;
};

export type AuditTraceabilityStatus = "VERSIONED" | "LEGACY_UNVERSIONED";
export type EditorialAuditCurrencyStatus =
  | "ABSENT"
  | "LEGACY_UNVERSIONED"
  | "VERSIONED_CURRENT"
  | "STALE_TEXT"
  | "STALE_STANDARD_OR_PROMPT"
  | "INVALID_TRACEABILITY";

export const LHS_VOICE_LOCAL_SYSTEM_PROMPT = `Tu es l'outil canonique LHS-VOICE-LOCAL pour L'Heritage des Silences.

Standard applicable : LHS-STD-1.0.0. Le Standard maitre prevaut sur toute ancienne doctrine.

ROLE
Tu analyses localement un passage, fragment ou chapitre unique. Tu verifies la justesse de voix au niveau du texte fourni seulement.

INTERDICTIONS
- Ne decide jamais si le texte est humain ou IA.
- Ne certifie jamais l'origine d'un texte.
- Ne donne jamais de pourcentage humain, IA ou equivalent.
- N'impose aucune longueur.
- N'impose aucun quota sensoriel.
- N'impose jamais "1 idee = 1 ligne".
- N'impose pas d'image maitresse.
- N'impose pas de fin en crochet.
- N'impose pas de densite de fragments.
- N'harmonise jamais artificiellement le style.
- Ne modifie pas le manuscrit.
- Ne valide pas.
- Ne scelle pas.

PRINCIPES
- La voix n'est pas evaluee par quotas.
- La fragmentation est fonctionnelle, jamais obligatoire.
- Le corps avant l'idee reste un principe directeur, pas une recette.
- Les mots emotionnels sont autorises lorsqu'ils sont justes.
- La narratrice adulte peut intervenir ponctuellement si elle apporte une strate reelle nouvelle.
- Les fins de chapitre sont variables.
- L'image maitresse est facultative.
- Le deplacement narratif est plus important qu'un schema fixe.
- La rugosite intentionnelle doit etre preservee.
- La norme linguistique corrige l'erreur sans normaliser la singularite.

NON-INVENTION
- Toute matiere non fournie est non disponible.
- N'invente jamais transition, sensation, atmosphere, causalite, geste, dialogue, detail, souvenir plausible, emotion supposee ou motivation.
- Tu peux signaler un manque, mais tu ne dois jamais le combler.
- Si le passage semble sous-developpe faute de matiere, ecris exactement : "MATIERE INSUFFISANTE - demander a l'autrice si un souvenir supplementaire existe."

ANALYSE
Observe notamment :
- justesse de la voix ;
- degre d'explication ;
- formulations generiques ;
- psychologisation ;
- metaphores interchangeables ;
- lyrisme ajoute ;
- transitions artificielles ;
- phrases trop demonstratives ;
- repetitions mecaniques ;
- lissage ;
- abstraction remplacant la scene ;
- perte de rugosite intentionnelle ;
- distance incorrecte par rapport a l'age vecu ;
- intrusion excessive de la narratrice adulte ;
- matiere qui semble ajoutee sans support textuel.

RECOMMANDATIONS
Tu peux recommander seulement : CONSERVER, REVOIR, SUPPRIMER.
Toute recommandation de suppression doit etre justifiee precisement par le texte.
Tu analyses, signales et recommandes. La decision reste humaine.

REPONSE
Reponds uniquement en JSON valide, sans markdown.`;

export const LHS_VOICE_LONGITUDINAL_SYSTEM_PROMPT = `Tu es l'outil canonique LHS-VOICE-LONGITUDINAL pour L'Heritage des Silences.

Standard applicable : LHS-STD-1.0.0. Le Standard maitre prevaut sur toute ancienne doctrine.

ROLE
Tu analyses la continuite de l'ADN litteraire d'un chapitre par rapport a plusieurs chapitres de reference ou a un corpus partiel. L'objectif est longitudinal : coherence, evolution, ruptures et repetitions dans le temps.

INTERDICTIONS
- Ne rends jamais tous les chapitres semblables.
- N'impose jamais un rythme uniforme.
- N'impose jamais la voix du Tome I aux futurs tomes.
- Ne traite jamais la variation de voix comme une erreur par principe.
- N'utilise aucun chapitre de reference comme moule obligatoire.
- N'harmonise jamais mecaniquement les tomes ou les chapitres.
- Ne decide jamais si le texte est humain ou IA.
- Ne donne jamais de score d'origine humaine ou IA.
- Ne modifie pas le manuscrit.
- Ne valide pas.
- Ne scelle pas.

PRINCIPES
- Il existe une continuite de l'ADN litteraire.
- La voix varie selon age, periode, tension et strate narrative.
- Certains chapitres peuvent etre plus narratifs, plus sensoriels, plus depouilles, plus reflexifs ou plus dialogues.
- Distingue motif recurrent et tic.
- Distingue variation de rythme et rupture de voix.
- Distingue rugosite volontaire et erreur.
- Distingue evolution legitime et rupture incoherente.
- Repere aussi l'harmonisation excessive et les repetitions stylistiques.

NON-INVENTION
- Toute matiere non fournie est non disponible.
- N'invente jamais transition, sensation, atmosphere, causalite, geste, dialogue, detail, souvenir plausible, emotion supposee ou motivation.
- Tu peux signaler un manque, mais tu ne dois jamais le combler.
- Si un manque de matiere empeche l'analyse ou la correction, ecris exactement : "MATIERE INSUFFISANTE - demander a l'autrice si un souvenir supplementaire existe."

RESULTAT ATTENDU
Identifie :
- coherences ;
- ruptures ;
- evolutions ;
- repetitions ;
- sur-harmonisation ;
- zones a surveiller.

Tu analyses, signales et recommandes. La decision reste humaine.

REPONSE
Reponds uniquement en JSON valide, sans markdown.`;

export const EDITORIAL_PROMPT_REGISTRY: readonly EditorialPromptRegistryEntry[] = [
  {
    promptId: "LHS-MEMORY-TO-FRAGMENT",
    promptVersion: "1.0.0",
    standardVersion: LHS_STANDARD_REFERENCE,
    toolId: "api.analyser",
    route: "/api/analyser",
    status: "CANONICAL",
    responsibility: "Transformer une matiere autobiographique fournie en fragment travaille sans ajout de matiere.",
    exclusions: ["invention", "validation", "scellement", "enrichissement factuel"],
    analysisUnit: "raw-memory",
  },
  {
    promptId: "LHS-VOICE-LOCAL",
    promptVersion: "1.0.0",
    standardVersion: LHS_STANDARD_REFERENCE,
    toolId: "api.detecteur-voix",
    route: "/api/detecteur-voix",
    status: "CANONICAL",
    responsibility: "Controler localement la voix d'un passage ou fragment, sans blocage.",
    exclusions: ["audit longitudinal", "validation", "scellement", "reecriture"],
    analysisUnit: "passage",
  },
  {
    promptId: "LHS-VOICE-LONGITUDINAL",
    promptVersion: "1.0.0",
    standardVersion: LHS_STANDARD_REFERENCE,
    toolId: "api.audit-voix",
    route: "/api/audit-voix",
    status: "CANONICAL",
    responsibility: "Evaluer la coherence longitudinale et l'evolution legitime de la voix.",
    exclusions: ["controle local", "harmonisation stylistique", "validation", "scellement"],
    analysisUnit: "chapter",
  },
  {
    promptId: "LHS-ENGAGEMENT-VIBRATION",
    promptVersion: "1.0.0",
    standardVersion: LHS_STANDARD_REFERENCE,
    toolId: "api.audit-vibration",
    route: "/api/audit-vibration",
    status: "PLANNED",
    responsibility: "Analyser engagement, tension, respiration et deplacement narratif.",
    exclusions: ["tension constante", "corps qui apprend obligatoire", "cliffhanger", "validation"],
    analysisUnit: "chapter",
  },
  {
    promptId: "LHS-SUR-EXPLICATION",
    promptVersion: "1.0.0",
    standardVersion: LHS_STANDARD_REFERENCE,
    toolId: "api.audit-sur-explication",
    route: "/api/audit-sur-explication",
    status: "PLANNED",
    responsibility: "Detecter la sur-explication et les mauvais usages de la double temporalite.",
    exclusions: ["interdiction absolue de voix adulte", "interdiction des emotions nommees", "reecriture"],
    analysisUnit: "chapter",
  },
  {
    promptId: "LHS-LINGUISTIC",
    promptVersion: "1.0.0",
    standardVersion: LHS_STANDARD_REFERENCE,
    toolId: "api.audit-linguistique",
    route: "/api/audit-linguistique",
    status: "PLANNED",
    responsibility: "Controler la langue sans normaliser la voix.",
    exclusions: ["harmonisation", "reecriture automatique", "detection certaine humain/IA"],
    analysisUnit: "chapter",
  },
  {
    promptId: "LHS-INTEGRITY",
    promptVersion: "1.0.0",
    standardVersion: LHS_STANDARD_REFERENCE,
    toolId: "api.audit-anti-ia",
    route: "/api/audit-anti-ia",
    status: "PLANNED",
    responsibility: "Controler l'integrite de voix et de matiere.",
    exclusions: ["detection humain vs IA", "probabilite IA", "indetectabilite", "contournement de detecteurs"],
    analysisUnit: "chapter",
  },
  {
    promptId: "LHS-FRAGMENT-WEAKNESSES",
    promptVersion: "1.0.0",
    standardVersion: LHS_STANDARD_REFERENCE,
    toolId: "api.faiblesses",
    route: "/api/faiblesses",
    status: "PLANNED",
    responsibility: "Diagnostiquer localement les faiblesses d'un fragment.",
    exclusions: ["ajout de matiere", "validation", "scellement", "correction finale"],
    analysisUnit: "fragment",
  },
  {
    promptId: "LHS-EDITORIAL-DECISION-SUPPORT",
    promptVersion: "1.0.0",
    standardVersion: LHS_STANDARD_REFERENCE,
    toolId: "api.decisions",
    route: "/api/decisions",
    status: "PLANNED",
    responsibility: "Soutenir une decision editoriale humaine sans decider a la place de l'autrice.",
    exclusions: ["decision automatique", "validation", "scellement", "invention", "creation de doctrine"],
    analysisUnit: "chapter-set",
  },
];

export function getEditorialPromptEntry(promptId: EditorialPromptId) {
  return EDITORIAL_PROMPT_REGISTRY.find((entry) => entry.promptId === promptId) || null;
}

export function getCanonicalPromptEntries() {
  return EDITORIAL_PROMPT_REGISTRY.filter((entry) => entry.status === "CANONICAL");
}

export function getPlannedPromptEntries() {
  return EDITORIAL_PROMPT_REGISTRY.filter((entry) => entry.status === "PLANNED");
}

export function getEditorialSystemPrompt(promptId: EditorialPromptId) {
  if (promptId === "LHS-VOICE-LOCAL") return LHS_VOICE_LOCAL_SYSTEM_PROMPT;
  if (promptId === "LHS-VOICE-LONGITUDINAL") return LHS_VOICE_LONGITUDINAL_SYSTEM_PROMPT;
  return null;
}

export function isAuditTraceabilityMetadata(value: unknown): value is AuditTraceabilityMetadata {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const candidate = value as Record<string, unknown>;

  return (
    typeof candidate.promptId === "string" &&
    Boolean(getEditorialPromptEntry(candidate.promptId as EditorialPromptId)) &&
    typeof candidate.promptVersion === "string" &&
    candidate.standardVersion === LHS_STANDARD_REFERENCE &&
    typeof candidate.toolId === "string" &&
    typeof candidate.analysisUnit === "string" &&
    typeof candidate.modelProvider === "string" &&
    typeof candidate.modelName === "string" &&
    typeof candidate.analyzedAt === "string" &&
    typeof candidate.textHash === "string" &&
    typeof candidate.resultSchemaVersion === "string"
  );
}

export function getAuditTraceabilityStatus(value: unknown): AuditTraceabilityStatus {
  if (!value || typeof value !== "object" || Array.isArray(value)) return "LEGACY_UNVERSIONED";
  const metadata = (value as Record<string, unknown>).metadata;
  return isAuditTraceabilityMetadata(metadata) ? "VERSIONED" : "LEGACY_UNVERSIONED";
}

function getAuditMetadataCandidate(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return undefined;
  const record = value as Record<string, unknown>;
  if ("metadata" in record) return record.metadata;

  const result = record.result;
  if (result && typeof result === "object" && !Array.isArray(result) && "metadata" in result) {
    return (result as Record<string, unknown>).metadata;
  }

  return undefined;
}

export function getEditorialAuditCurrencyStatus(
  value: unknown,
  currentText: string,
): EditorialAuditCurrencyStatus {
  if (!value) return "ABSENT";

  const metadata = getAuditMetadataCandidate(value);
  if (metadata === undefined) return "LEGACY_UNVERSIONED";
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) return "INVALID_TRACEABILITY";

  const candidate = metadata as Record<string, unknown>;
  const promptId = candidate.promptId;
  const promptVersion = candidate.promptVersion;
  const standardVersion = candidate.standardVersion;
  const prompt = typeof promptId === "string" ? getEditorialPromptEntry(promptId as EditorialPromptId) : null;

  if (!prompt || promptVersion !== prompt.promptVersion || standardVersion !== LHS_STANDARD_REFERENCE) {
    return "STALE_STANDARD_OR_PROMPT";
  }

  const hasValidTraceabilityShape =
    candidate.toolId === prompt.toolId &&
    candidate.analysisUnit === prompt.analysisUnit &&
    typeof candidate.modelProvider === "string" &&
    typeof candidate.modelName === "string" &&
    typeof candidate.analyzedAt === "string" &&
    typeof candidate.textHash === "string" &&
    (candidate.textVersion === undefined || typeof candidate.textVersion === "string") &&
    typeof candidate.resultSchemaVersion === "string";

  if (!hasValidTraceabilityShape) return "INVALID_TRACEABILITY";

  return candidate.textHash === createEditorialTextHash(currentText) ? "VERSIONED_CURRENT" : "STALE_TEXT";
}

export function editorialAuditCurrencyCountsAsCurrent(status: EditorialAuditCurrencyStatus) {
  return status === "VERSIONED_CURRENT";
}

export function createAuditTraceabilityMetadata(
  input: CreateAuditTraceabilityMetadataInput,
): AuditTraceabilityMetadata {
  const prompt = getEditorialPromptEntry(input.promptId);

  if (!prompt) {
    throw new Error(`Prompt inconnu : ${input.promptId}`);
  }

  return {
    promptId: prompt.promptId,
    promptVersion: prompt.promptVersion,
    standardVersion: prompt.standardVersion,
    toolId: prompt.toolId,
    analysisUnit: prompt.analysisUnit,
    modelProvider: input.modelProvider,
    modelName: input.modelName,
    analyzedAt: input.analyzedAt || new Date().toISOString(),
    textHash: createEditorialTextHash(input.text),
    textVersion: input.textVersion,
    resultSchemaVersion: input.resultSchemaVersion,
  };
}

// FNV-1a 32-bit over UTF-16 code units. Deterministic, small, dependency-free,
// and sufficient to detect whether an audit targeted the same text content.
export function createEditorialTextHash(text: string) {
  let hash = 0x811c9dc5;

  for (let index = 0; index < text.length; index += 1) {
    hash ^= text.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }

  return `fnv1a32:${(hash >>> 0).toString(16).padStart(8, "0")}`;
}
