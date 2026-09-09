import type {
  ConversationImportée,
  ImportValidation,
  Message,
  NiveauAnalyse,
  StatutConversation,
} from "./types";
import type { ParseResult } from "./parsers";

function generateId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }

  return `import-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function generateHash(texte: string): string {
  let hash = 0;

  for (let index = 0; index < texte.length; index += 1) {
    hash = (hash << 5) - hash + texte.charCodeAt(index);
    hash |= 0;
  }

  return Math.abs(hash).toString(16);
}

function buildHash(messages: Message[]): string {
  const contenu = messages.map((message) => `${message.auteur}:${message.texte}`).join("\n");
  return generateHash(contenu);
}

function getNiveauAnalyse(nombreMessages: number): NiveauAnalyse {
  if (nombreMessages < 10) return "données_insuffisantes";
  if (nombreMessages < 20) return "exploratoire";
  if (nombreMessages < 50) return "partielle";
  return "complète";
}

function getStatutConversation(params: {
  nombreMessages: number;
  nombreMessagesRouge: number;
  nombreMessagesValidés: number;
}): StatutConversation {
  if (params.nombreMessagesRouge > 0) return "en_validation";

  if (params.nombreMessages > 0 && params.nombreMessagesValidés === params.nombreMessages) {
    return "validé";
  }

  return "importé";
}

export function buildConversationImportée(
  parseResult: ParseResult,
  dossierId: string,
  nomFichier: string,
): ConversationImportée {
  const messages = parseResult.messages;
  const nombreMessages = messages.length;
  const nombreMessagesValidés = messages.filter((message) => message.valide).length;
  const nombreMessagesRouge = messages.filter((message) => message.statutValidation === "rouge").length;
  const nombreMessagesOrange = messages.filter((message) => message.statutValidation === "orange").length;
  const nombreMessagesJaune = messages.filter((message) => message.statutValidation === "jaune").length;
  const statut = getStatutConversation({
    nombreMessages,
    nombreMessagesRouge,
    nombreMessagesValidés,
  });
  const date = new Date().toISOString();

  return {
    dateImport: date,
    dateModification: date,
    dossierId,
    hash: buildHash(messages),
    id: generateId(),
    langue: "fr",
    messages,
    niveauAnalyse: getNiveauAnalyse(nombreMessages),
    nombreMessages,
    nombreMessagesJaune,
    nombreMessagesOrange,
    nombreMessagesRouge,
    nombreMessagesValidés,
    nomFichier,
    prêtPourAnalyse: statut === "validé" && nombreMessages >= 10,
    source: parseResult.source,
    statut,
    version: "1.0",
  };
}

export function buildImportValidationInitiale(conversation: ConversationImportée): ImportValidation {
  const date = new Date().toISOString();
  const progression =
    conversation.nombreMessages > 0
      ? Math.round((conversation.nombreMessagesValidés / conversation.nombreMessages) * 100)
      : 0;

  return {
    complète: conversation.nombreMessagesRouge === 0 && conversation.nombreMessages > 0,
    conversationId: conversation.id,
    corrections: [],
    dateValidation: date,
    id: generateId(),
    messagesRestantsRouge: conversation.nombreMessagesRouge,
    messagesValidés: conversation.nombreMessagesValidés,
    progression,
    sauvegardéeÀ: date,
    totalMessages: conversation.nombreMessages,
  };
}
