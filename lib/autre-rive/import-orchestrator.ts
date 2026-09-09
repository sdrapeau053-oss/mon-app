import type { SourceImport } from "./types";
import {
  addImportValidation,
  addImportedConversation,
  addImportedMessages,
  deleteImportBundle,
  readImportedConversations,
} from "./storage";
import { buildConversationImportée, buildImportValidationInitiale } from "./import-builder";
import { parseCopierColler, parseJSON, parseTXT, type ParseResult } from "./parsers";

export type ImportOrchestratorResult = {
  succès: boolean;
  conversationId: string | null;
  nombreMessages: number;
  nombreValides: number;
  nombreRouge: number;
  erreurs: string[];
  avertissements: string[];
};

function generateId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }

  return `import-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function generateUniqueConversationId(): string {
  const existingIds = new Set(readImportedConversations().map((conversation) => conversation.id));
  let conversationId = generateId();

  while (existingIds.has(conversationId)) {
    conversationId = generateId();
  }

  return conversationId;
}

function createFailureResult(params: {
  avertissements: string[];
  conversationId: string | null;
  erreurs: string[];
  nombreMessages?: number;
  nombreRouge?: number;
  nombreValides?: number;
}): ImportOrchestratorResult {
  return {
    avertissements: params.avertissements,
    conversationId: params.conversationId,
    erreurs: params.erreurs,
    nombreMessages: params.nombreMessages ?? 0,
    nombreRouge: params.nombreRouge ?? 0,
    nombreValides: params.nombreValides ?? 0,
    succès: false,
  };
}

function parseContent(
  contenu: string,
  source: SourceImport,
  nomFichier: string,
  conversationId: string,
  dossierId: string,
): ParseResult {
  if (source === "copier-coller") {
    return parseCopierColler(contenu, conversationId, dossierId);
  }

  if (source === "txt") {
    return parseTXT(contenu, nomFichier, conversationId, dossierId);
  }

  return parseJSON(contenu, nomFichier, conversationId, dossierId);
}

export function importerContenu(
  contenu: string,
  source: SourceImport,
  nomFichier: string,
  dossierId: string,
): ImportOrchestratorResult {
  const conversationId = generateUniqueConversationId();
  const parseResult = parseContent(contenu, source, nomFichier, conversationId, dossierId);

  if (parseResult.erreurs.length > 0 && parseResult.messages.length === 0) {
    return createFailureResult({
      avertissements: parseResult.avertissements,
      conversationId: null,
      erreurs: parseResult.erreurs,
    });
  }

  const builtConversation = buildConversationImportée(parseResult, dossierId, nomFichier);
  const conversation = {
    ...builtConversation,
    id: conversationId,
    messages: parseResult.messages,
  };
  const validation = buildImportValidationInitiale(conversation);
  const saveErrors: string[] = [];

  if (!addImportedConversation(conversation)) {
    saveErrors.push("Impossible de sauvegarder la conversation importée.");
  }

  if (!addImportedMessages(parseResult.messages)) {
    saveErrors.push("Impossible de sauvegarder les messages importés.");
  }

  if (!addImportValidation(validation)) {
    saveErrors.push("Impossible de sauvegarder la validation initiale.");
  }

  return {
    avertissements: parseResult.avertissements,
    conversationId: saveErrors.length > 0 ? null : conversation.id,
    erreurs: [...parseResult.erreurs, ...saveErrors],
    nombreMessages: conversation.nombreMessages,
    nombreRouge: conversation.nombreMessagesRouge,
    nombreValides: conversation.nombreMessagesValidés,
    succès: saveErrors.length === 0,
  };
}

export function supprimerImport(conversationId: string): boolean {
  return deleteImportBundle(conversationId);
}
