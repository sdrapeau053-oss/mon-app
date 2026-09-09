import type {
  ConversationImportée,
  ImportValidation,
  LegacyRapportAnalyse,
  Message,
  RapportAnalyse,
  RelationDossier,
} from "./types";

export const AUTRE_RIVE_IMPORTS_KEY = "autre-rive-imports";
export const AUTRE_RIVE_CONVERSATIONS_KEY = "autre-rive-conversations";
export const AUTRE_RIVE_MESSAGES_KEY = "autre-rive-messages";
export const AUTRE_RIVE_VALIDATIONS_KEY = "autre-rive-validations";

// Clé legacy — NE JAMAIS MODIFIER ni renommer (donnée existante). Le type qui
// la décrit est renommé (LegacyRapportAnalyse, Phase 6 d'IMP-001, SR-D-001
// Décision 5) mais la clé elle-même reste identique : ce n'est pas la donnée
// qui change, seulement son nom dans le code.
export const AUTRE_RIVE_RAPPORTS_KEY = "autre-rive-rapports";

// Clé canonique — Phase 6 d'IMP-001 (SR-D-001, Décision 5). Distincte de la
// clé legacy ci-dessus : les deux coexistent, aucune conversion automatique
// de l'une vers l'autre.
export const AUTRE_RIVE_CANONICAL_RAPPORTS_KEY = "autre-rive-rapports-analyse";

// Clé canonique — Phase 4 d'IMP-001 (SR-D-001, Décision 4). Distincte et
// séparée de la clé legacy "autre-rive-dossiers" (jamais modifiée, jamais
// renommée : voir lib/autre-rive/legacy-adapter.ts). Un dossier canonique
// coexiste ici avec sa version legacy tant que rien ne supprime cette
// dernière — la migration est additive, jamais destructive.
export const AUTRE_RIVE_RELATION_DOSSIERS_KEY = "autre-rive-relation-dossiers";

export type AutreRiveStorageSummary = {
  conversations: number;
  messages: number;
  validations: number;
  rapports: number;
};

function canUseLocalStorage(): boolean {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

function safeReadArray<T>(key: string): T[] {
  if (!canUseLocalStorage()) return [];

  try {
    const raw = localStorage.getItem(key);
    const data: unknown = raw ? JSON.parse(raw) : [];
    return Array.isArray(data) ? (data as T[]) : [];
  } catch {
    return [];
  }
}

function safeWriteArray<T>(key: string, value: T[]): boolean {
  if (!canUseLocalStorage()) return false;

  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
}

export function readImportedConversations(): ConversationImportée[] {
  return safeReadArray<ConversationImportée>(AUTRE_RIVE_CONVERSATIONS_KEY);
}

export function saveImportedConversations(conversations: ConversationImportée[]): boolean {
  return safeWriteArray(AUTRE_RIVE_CONVERSATIONS_KEY, conversations);
}

export function addImportedConversation(conversation: ConversationImportée): boolean {
  const conversations = readImportedConversations();
  return saveImportedConversations([conversation, ...conversations]);
}

export function updateImportedConversation(
  conversationId: string,
  updater: (conversation: ConversationImportée) => ConversationImportée,
): boolean {
  const conversations = readImportedConversations();
  let hasUpdated = false;

  const updatedConversations = conversations.map((conversation) => {
    if (conversation.id !== conversationId) return conversation;
    hasUpdated = true;
    return updater(conversation);
  });

  return hasUpdated ? saveImportedConversations(updatedConversations) : false;
}

export function deleteImportedConversation(conversationId: string): boolean {
  const conversations = readImportedConversations();
  const filteredConversations = conversations.filter((conversation) => conversation.id !== conversationId);
  return saveImportedConversations(filteredConversations);
}

export function readImportedMessages(): Message[] {
  return safeReadArray<Message>(AUTRE_RIVE_MESSAGES_KEY);
}

export function saveImportedMessages(messages: Message[]): boolean {
  return safeWriteArray(AUTRE_RIVE_MESSAGES_KEY, messages);
}

export function addImportedMessages(messages: Message[]): boolean {
  const existingMessages = readImportedMessages();
  return saveImportedMessages([...messages, ...existingMessages]);
}

export function readMessagesByConversation(conversationId: string): Message[] {
  return readImportedMessages().filter((message) => message.conversationId === conversationId);
}

export function deleteMessagesByConversation(conversationId: string): boolean {
  const messages = readImportedMessages();
  const filteredMessages = messages.filter((message) => message.conversationId !== conversationId);
  return saveImportedMessages(filteredMessages);
}

export function readImportValidations(): ImportValidation[] {
  return safeReadArray<ImportValidation>(AUTRE_RIVE_VALIDATIONS_KEY);
}

export function saveImportValidations(validations: ImportValidation[]): boolean {
  return safeWriteArray(AUTRE_RIVE_VALIDATIONS_KEY, validations);
}

export function addImportValidation(validation: ImportValidation): boolean {
  const validations = readImportValidations();
  return saveImportValidations([validation, ...validations]);
}

export function readValidationByConversation(conversationId: string): ImportValidation | null {
  return readImportValidations().find((validation) => validation.conversationId === conversationId) ?? null;
}

// Renommées explicitement Phase 6 d'IMP-001 (readRapportsAnalyse →
// readLegacyRapportsAnalyse, etc.) : le type qu'elles manipulent est
// LegacyRapportAnalyse, pas le nouveau type canonique RapportAnalyse. Aucun
// changement de comportement, aucune migration — la clé lue/écrite reste
// AUTRE_RIVE_RAPPORTS_KEY ("autre-rive-rapports"), inchangée.
export function readLegacyRapportsAnalyse(): LegacyRapportAnalyse[] {
  return safeReadArray<LegacyRapportAnalyse>(AUTRE_RIVE_RAPPORTS_KEY);
}

export function saveLegacyRapportsAnalyse(rapports: LegacyRapportAnalyse[]): boolean {
  return safeWriteArray(AUTRE_RIVE_RAPPORTS_KEY, rapports);
}

export function addLegacyRapportAnalyse(rapport: LegacyRapportAnalyse): boolean {
  const rapports = readLegacyRapportsAnalyse();
  return saveLegacyRapportsAnalyse([rapport, ...rapports]);
}

export function readLegacyRapportsByConversation(conversationId: string): LegacyRapportAnalyse[] {
  return readLegacyRapportsAnalyse().filter((rapport) => rapport.conversationId === conversationId);
}

export function deleteImportBundle(conversationId: string): boolean {
  const conversations = readImportedConversations().filter((conversation) => conversation.id !== conversationId);
  const messages = readImportedMessages().filter((message) => message.conversationId !== conversationId);
  const validations = readImportValidations().filter((validation) => validation.conversationId !== conversationId);
  const rapports = readLegacyRapportsAnalyse().filter((rapport) => rapport.conversationId !== conversationId);

  const conversationsSaved = saveImportedConversations(conversations);
  const messagesSaved = saveImportedMessages(messages);
  const validationsSaved = saveImportValidations(validations);
  const rapportsSaved = saveLegacyRapportsAnalyse(rapports);

  return conversationsSaved && messagesSaved && validationsSaved && rapportsSaved;
}

export function getAutreRiveStorageSummary(): AutreRiveStorageSummary {
  return {
    conversations: readImportedConversations().length,
    messages: readImportedMessages().length,
    validations: readImportValidations().length,
    rapports: readLegacyRapportsAnalyse().length,
  };
}

// -----------------------------------------------
// RelationDossier canonique — Phase 4 d'IMP-001 (SR-D-001, Décision 4)
// -----------------------------------------------
//
// Le paramètre de ces fonctions est typé RelationDossier : relationType,
// status, participantIds et primaryUserParticipantId y sont des champs
// obligatoires (non optionnels). Il est donc structurellement impossible
// d'appeler saveRelationDossiers/addOrUpdateRelationDossier avec un objet où
// ces quatre champs ne sont pas déjà résolus — le compilateur TypeScript
// refuse toute tentative de passer directement le résultat partiel de
// adaptLegacyRelationDossierPartially() (voir legacy-adapter.ts). La seule façon
// d'obtenir un RelationDossier valide à partir d'un dossier legacy est de
// passer par finalizeLegacyMigration(), qui exige la confirmation humaine
// explicite des quatre champs (SR-D-001 ; règle de confirmation validée
// avant la Phase 4).
//
// Ce mécanisme n'écrit jamais dans "autre-rive-dossiers" (clé legacy) : la
// donnée source reste intacte, quel que soit l'état de la migration.

export function readRelationDossiers(): RelationDossier[] {
  return safeReadArray<RelationDossier>(AUTRE_RIVE_RELATION_DOSSIERS_KEY);
}

export function saveRelationDossiers(dossiers: RelationDossier[]): boolean {
  return safeWriteArray(AUTRE_RIVE_RELATION_DOSSIERS_KEY, dossiers);
}

export function readRelationDossierById(id: string): RelationDossier | null {
  return readRelationDossiers().find((dossier) => dossier.id === id) ?? null;
}

// Insère ou remplace un dossier canonique par id, sans jamais toucher aux
// autres dossiers déjà migrés (migration dossier par dossier, sans
// écrasement croisé).
export function addOrUpdateRelationDossier(dossier: RelationDossier): boolean {
  const existing = readRelationDossiers();
  const index = existing.findIndex((current) => current.id === dossier.id);

  const next =
    index === -1
      ? [dossier, ...existing]
      : existing.map((current, currentIndex) => (currentIndex === index ? dossier : current));

  return saveRelationDossiers(next);
}

// -----------------------------------------------
// RapportAnalyse canonique — Phase 6 d'IMP-001 (SR-D-001, Décision 5)
// -----------------------------------------------
//
// Lecture/écriture brutes uniquement, sans règle métier : ce fichier reste un
// simple accès à localStorage, comme le reste de storage.ts. La garantie
// d'immuabilité et d'append-only (aucun rapport existant jamais remplacé) est
// appliquée par rapport-analyse.ts, pas ici — même séparation que
// storage.ts/assessment.ts en Phase 5 (storage.ts = CRUD brut, le module
// métier applique les règles de non-écrasement).
//
// Clé distincte de la clé legacy AUTRE_RIVE_RAPPORTS_KEY : les deux
// coexistent, sans conversion automatique de l'une vers l'autre.

export function readCanonicalRapportsAnalyse(): RapportAnalyse[] {
  return safeReadArray<RapportAnalyse>(AUTRE_RIVE_CANONICAL_RAPPORTS_KEY);
}

export function saveCanonicalRapportsAnalyse(rapports: RapportAnalyse[]): boolean {
  return safeWriteArray(AUTRE_RIVE_CANONICAL_RAPPORTS_KEY, rapports);
}

export function readCanonicalRapportsByDossier(relationDossierId: string): RapportAnalyse[] {
  return readCanonicalRapportsAnalyse().filter((rapport) => rapport.relationDossierId === relationDossierId);
}
