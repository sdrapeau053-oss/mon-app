import type {
  AuteurMessage,
  Message,
  NiveauConfiance,
  SourceImport,
  StatutValidation,
} from "./types";

export type ParseResult = {
  messages: Message[];
  erreurs: string[];
  avertissements: string[];
  source: SourceImport;
  nombreTotal: number;
  nombreValides: number;
};

type AuteurDetecté = { auteur: AuteurMessage; isAuthorMarker: boolean; nomAuteur: string | null };

type JsonMessageInput = { auteur: AuteurMessage; texte: string; date?: string; nomAuteur?: string };

function generateHash(texte: string): string {
  let hash = 0;

  for (let index = 0; index < texte.length; index += 1) {
    hash = (hash << 5) - hash + texte.charCodeAt(index);
    hash |= 0;
  }

  return Math.abs(hash).toString(16);
}

function generateId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }

  return `message-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function createEmptyResult(source: SourceImport, erreurs: string[] = [], avertissements: string[] = []): ParseResult {
  return {
    avertissements,
    erreurs,
    messages: [],
    nombreTotal: 0,
    nombreValides: 0,
    source,
  };
}

function isRecord(value: unknown): value is Record<string, unknown> { return typeof value === "object" && value !== null && !Array.isArray(value); }

function isAuteurMessage(value: unknown): value is AuteurMessage { return value === "moi" || value === "autre" || value === "inconnu"; }

function isString(value: unknown): value is string { return typeof value === "string"; }

function normalizeMessengerLine(line: string): string {
  return line
    .replace(/[\u200B-\u200D\uFEFF]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/^[.…]+|[.…]+$/g, "")
    .trim();
}

function isIgnorableMessengerLine(line: string): boolean {
  const normalizedLine = line.trim().toLowerCase();
  const compactLine = normalizedLine.replace(/\s+/g, "");
  const reactionOnly = ["👍", "❤️", "😂", "😮", "😢", "😡", "👌", "🙏", "🔥", "💔", "😘", "😍"];
  const ignoredFragments = [
    "you replied to", "you replied", "replied to you", "replied to", "sacha replied", "répondu à",
    "vous avez répondu à", "a répondu à", "a répondu", "you sent", "vous avez envoyé", "you reacted",
    "vous avez réagi", "reacted to", "a réagi à", "liked a message", "a aimé un message", "missed call",
    "appel manqué", "voice call", "appel vocal", "video call", "appel vidéo", "sent a photo",
    "a envoyé une photo", "attachment", "pièce jointe", "sticker", "autocollant", "active now",
    "actif maintenant", "today at", "aujourd'hui à", "yesterday at", "hier à", "edited", "modifié",
  ];

  if (!normalizedLine) return true;
  if (reactionOnly.includes(compactLine)) return true;
  if (["seen", "vu", "sent", "envoyé", "photo", "gif"].includes(normalizedLine)) return true;

  return ignoredFragments.some((fragment) => normalizedLine.includes(fragment));
}

function detectConversationDate(line: string): string | null {
  const normalizedLine = line.trim();

  if (/^(aujourd'hui|hier|today|yesterday)$/i.test(normalizedLine)) return normalizedLine;
  if (/^(aujourd'hui|hier)\s+à\s+\d{1,2}[:h]\d{2}$/i.test(normalizedLine)) return normalizedLine;
  if (/^(today|yesterday)\s+at\s+\d{1,2}:\d{2}\s*(am|pm)?$/i.test(normalizedLine)) return normalizedLine;
  if (/^\d{1,2}\s+[A-Za-zÀ-ÿ]+\s+\d{4}$/.test(normalizedLine)) return normalizedLine;
  if (/^[A-Za-zÀ-ÿ]+\s+\d{1,2},\s+\d{4}$/.test(normalizedLine)) return normalizedLine;
  if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(normalizedLine)) return normalizedLine;
  if (/^\d{4}-\d{2}-\d{2}$/.test(normalizedLine)) return normalizedLine;

  return null;
}

function isSelfAuthorName(name: string): boolean {
  return ["moi", "me", "you", "vous"].includes(name.trim().toLowerCase());
}

function normalizeAuthorName(name: string): string {
  return name.trim().replace(/\s+/g, " ").replace(/\b\p{L}/gu, (letter) => letter.toUpperCase());
}

function looksLikeAuthorName(value: string): boolean {
  const trimmedValue = value.trim();
  const words = trimmedValue.split(/\s+/).filter(Boolean);
  const lowerValue = trimmedValue.toLowerCase();
  const phraseFragments = [
    " je ",
    " tu ",
    " il ",
    " elle ",
    " nous ",
    " vous ",
    " ils ",
    " elles ",
    " c'est ",
    " j'",
    " t'",
    " pas ",
    " pour ",
    " avec ",
    " dans ",
    " que ",
  ];

  if (trimmedValue.length < 2 || trimmedValue.length > 48) return false;
  if (words.length < 1 || words.length > 4) return false;
  if (!/^[A-Za-zÀ-ÿ]/.test(trimmedValue)) return false;
  if (/[?!]/.test(trimmedValue)) return false;
  if (phraseFragments.some((fragment) => ` ${lowerValue} `.includes(fragment))) return false;

  return words.every((word) => /^[A-Za-zÀ-ÿ'’-]+$/.test(word));
}

function detectAuthor(line: string): AuteurDetecté {
  const trimmedLine = line.trim();
  const colonMatch = trimmedLine.match(/^([^:]{1,80})\s*:\s*(.*)$/);
  const candidate = colonMatch ? colonMatch[1].trim() : trimmedLine;

  if (isSelfAuthorName(candidate)) {
    return {
      auteur: "moi",
      isAuthorMarker: true,
      nomAuteur: null,
    };
  }

  if (looksLikeAuthorName(candidate)) {
    return {
      auteur: "autre",
      isAuthorMarker: true,
      nomAuteur: normalizeAuthorName(candidate),
    };
  }

  return {
    auteur: "inconnu",
    isAuthorMarker: false,
    nomAuteur: null,
  };
}

function getInlineAuthorMessage(line: string): string {
  const match = line.match(/^[^:]{1,80}\s*:\s*(.*)$/);
  return match?.[1]?.trim() ?? "";
}

function detectDottedInlineMessage(line: string): { author: AuteurDetecté; texte: string } | null {
  const match = line.match(/^([A-Za-zÀ-ÿ][A-Za-zÀ-ÿ\s]{0,30})\.{2,5}(.+)$/);
  if (!match) return null;
  return { author: detectAuthor(match[1].trim()), texte: match[2].trim() };
}

function isLikelyMessageLine(line: string): boolean {
  if (line.length <= 2) return false;
  if (isIgnorableMessengerLine(line)) return false;
  if (detectConversationDate(line)) return false;
  if (detectAuthor(line).isAuthorMarker) return false;
  return true;
}

function validationForImportedAuteur(auteur: AuteurMessage): {
  niveauConfiance: NiveauConfiance;
  statutValidation: StatutValidation;
  valide: boolean;
} {
  if (auteur === "inconnu") {
    return {
      niveauConfiance: "faible",
      statutValidation: "rouge",
      valide: false,
    };
  }

  return {
    niveauConfiance: "élevé",
    statutValidation: "validé",
    valide: true,
  };
}

function validationForJsonAuteur(auteur: AuteurMessage): {
  niveauConfiance: NiveauConfiance;
  statutValidation: StatutValidation;
  valide: boolean;
} {
  if (auteur === "inconnu") {
    return {
      niveauConfiance: "faible",
      statutValidation: "rouge",
      valide: false,
    };
  }

  return {
    niveauConfiance: "élevé",
    statutValidation: "jaune",
    valide: true,
  };
}

function createMessage(params: {
  auteur: AuteurMessage;
  conversationId: string;
  date: string;
  dateOriginale: string;
  dossierId: string;
  niveauConfiance: NiveauConfiance;
  nomAuteur: string;
  source: SourceImport;
  statutValidation: StatutValidation;
  texte: string;
  textOriginal: string;
  valide: boolean;
}): Message {
  return {
    auteur: params.auteur,
    conversationId: params.conversationId,
    corrigéManuellement: false,
    date: params.date,
    dateImport: new Date().toISOString(),
    dateOriginale: params.dateOriginale,
    dossierId: params.dossierId,
    hash: generateHash(params.textOriginal),
    id: generateId(),
    niveauConfiance: params.niveauConfiance,
    nomAuteur: params.nomAuteur,
    source: params.source,
    statutValidation: params.statutValidation,
    textOriginal: params.textOriginal,
    texte: params.texte,
    valide: params.valide,
  };
}

function buildMessageFromBuffer(params: {
  bufferLines: string[];
  conversationId: string;
  currentAuthor: AuteurMessage;
  currentAuthorName: string | null;
  currentDateOriginale: string;
  dossierId: string;
  source: SourceImport;
}): Message | null {
  const texte = params.bufferLines.join("\n").trim();

  if (!texte) return null;

  const validation = validationForImportedAuteur(params.currentAuthor);
  const dateImport = new Date().toISOString();

  return createMessage({
    auteur: params.currentAuthor,
    conversationId: params.conversationId,
    date: params.currentDateOriginale || dateImport,
    dateOriginale: params.currentDateOriginale,
    dossierId: params.dossierId,
    niveauConfiance: validation.niveauConfiance,
    nomAuteur:
      params.currentAuthor === "moi"
        ? "Moi"
        : params.currentAuthor === "autre"
          ? params.currentAuthorName ?? "Autre"
          : "Inconnu",
    source: params.source,
    statutValidation: validation.statutValidation,
    texte,
    textOriginal: texte,
    valide: validation.valide,
  });
}

function buildDiagnostics(params: {
  auteurMarkers: number;
  ignoredLines: number;
  messages: Message[];
}): string[] {
  const unknownMessages = params.messages.filter((message) => message.auteur === "inconnu").length;
  const validMessages = params.messages.filter((message) => message.valide).length;
  const quality = params.messages.length > 0 ? Math.round((validMessages / params.messages.length) * 100) : 0;

  return [
    `${params.ignoredLines} ligne(s) Messenger ignorée(s).`,
    `${params.auteurMarkers} marqueur(s) d'auteur détecté(s).`,
    `${unknownMessages} message(s) avec auteur à vérifier.`,
    `Qualité d'import estimée : ${quality} % — ${validMessages} messages validés, ${unknownMessages} à vérifier.`,
  ];
}

function parseLines(
  texte: string,
  conversationId: string,
  dossierId: string,
  source: SourceImport,
  avertissements: string[] = [],
): ParseResult {
  let currentAuthor: AuteurMessage = "inconnu";
  let currentAuthorName: string | null = null;
  let currentDateOriginale = "";
  let ignoredLines = 0;
  let auteurMarkers = 0;
  const bufferLines: string[] = [];
  const messages: Message[] = [];

  const flushBuffer = () => {
    const message = buildMessageFromBuffer({
      bufferLines,
      conversationId,
      currentAuthor,
      currentAuthorName,
      currentDateOriginale,
      dossierId,
      source,
    });

    if (message) messages.push(message);
    bufferLines.length = 0;
  };

  texte.split(/\r?\n/).forEach((rawLine) => {
    const line = normalizeMessengerLine(rawLine);

    if (!line) return;

    const detectedDate = detectConversationDate(line);
    if (detectedDate) {
      currentDateOriginale = detectedDate;
      return;
    }

    if (isIgnorableMessengerLine(line)) {
      ignoredLines += 1;
      return;
    }

    const dottedInline = detectDottedInlineMessage(line);
    if (dottedInline) {
      flushBuffer();
      auteurMarkers += dottedInline.author.isAuthorMarker ? 1 : 0;
      currentAuthor = dottedInline.author.auteur;
      currentAuthorName = dottedInline.author.nomAuteur;
      bufferLines.push(dottedInline.texte);
      flushBuffer();
      return;
    }

    const detectedAuthor = detectAuthor(line);
    if (detectedAuthor.isAuthorMarker) {
      flushBuffer();
      auteurMarkers += 1;
      currentAuthor = detectedAuthor.auteur;
      currentAuthorName = detectedAuthor.nomAuteur;

      const inlineMessage = getInlineAuthorMessage(line);
      if (inlineMessage) bufferLines.push(inlineMessage);
      return;
    }

    if (isLikelyMessageLine(line)) {
      bufferLines.push(line);
    }
  });

  flushBuffer();

  return {
    avertissements: [...avertissements, ...buildDiagnostics({ auteurMarkers, ignoredLines, messages })],
    erreurs: [],
    messages,
    nombreTotal: messages.length,
    nombreValides: messages.filter((message) => message.valide).length,
    source,
  };
}

function parseJsonMessageInput(value: unknown): JsonMessageInput | null {
  if (!isRecord(value)) return null;

  const auteur = isAuteurMessage(value.auteur) ? value.auteur : "inconnu";
  const texte = isString(value.texte) ? value.texte.trim() : "";
  const date = isString(value.date) && value.date.trim() ? value.date.trim() : undefined;
  const nomAuteur = isString(value.nomAuteur) && value.nomAuteur.trim() ? value.nomAuteur.trim() : undefined;

  if (!texte) return null;

  return {
    auteur,
    date,
    nomAuteur,
    texte,
  };
}

export function parseCopierColler(texte: string, conversationId: string, dossierId: string): ParseResult {
  return parseLines(texte, conversationId, dossierId, "copier-coller");
}

export function parseTXT(
  contenu: string,
  nomFichier: string,
  conversationId: string,
  dossierId: string,
): ParseResult {
  const avertissements = nomFichier.trim() ? [] : ["Nom de fichier TXT absent."];
  return parseLines(contenu, conversationId, dossierId, "txt", avertissements);
}

export function parseJSON(
  contenu: string,
  nomFichier: string,
  conversationId: string,
  dossierId: string,
): ParseResult {
  let parsed: unknown;

  try {
    parsed = JSON.parse(contenu) as unknown;
  } catch {
    return createEmptyResult("json", [`JSON invalide${nomFichier.trim() ? ` dans ${nomFichier.trim()}` : ""}.`]);
  }

  if (!Array.isArray(parsed)) {
    return createEmptyResult("json", ["Format JSON inattendu : un tableau de messages est attendu."]);
  }

  const avertissements: string[] = [];
  const dateImport = new Date().toISOString();
  const messages: Message[] = [];

  parsed.forEach((entry, index) => {
    const input = parseJsonMessageInput(entry);

    if (!input) {
      avertissements.push(`Message JSON ignoré à l'index ${index} : champ texte absent ou invalide.`);
      return;
    }

    const validation = validationForJsonAuteur(input.auteur);
    const messageDate = input.date ?? dateImport;

    messages.push(
      createMessage({
        auteur: input.auteur,
        conversationId,
        date: messageDate,
        dateOriginale: input.date ?? "",
        dossierId,
        niveauConfiance: validation.niveauConfiance,
        nomAuteur: input.nomAuteur ?? (input.auteur === "moi" ? "Moi" : input.auteur === "autre" ? "Autre" : "Inconnu"),
        source: "json",
        statutValidation: validation.statutValidation,
        texte: input.texte,
        textOriginal: input.texte,
        valide: validation.valide,
      }),
    );
  });

  return {
    avertissements,
    erreurs: [],
    messages,
    nombreTotal: parsed.length,
    nombreValides: messages.filter((message) => message.valide).length,
    source: "json",
  };
}
