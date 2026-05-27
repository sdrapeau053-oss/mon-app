export type BookSettings = {
  auteur: string;
  dedicace: string;
  epigraphe: string;
  noteAutrice: string;
  titreLivre: string;
  titreTome: string;
};

export const BOOK_SETTINGS_STORAGE_KEY = "book-settings";

export const DEFAULT_BOOK_SETTINGS: BookSettings = {
  auteur: "Léna Montand",
  dedicace: "",
  epigraphe: "",
  noteAutrice: "",
  titreLivre: "L’Héritage des Silences",
  titreTome: "Tome I — Le gel et la lumière",
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

export function normaliserBookSettings(value: unknown): BookSettings {
  if (!isRecord(value)) return DEFAULT_BOOK_SETTINGS;

  return {
    auteur: typeof value.auteur === "string" ? value.auteur : DEFAULT_BOOK_SETTINGS.auteur,
    dedicace: typeof value.dedicace === "string" ? value.dedicace : DEFAULT_BOOK_SETTINGS.dedicace,
    epigraphe: typeof value.epigraphe === "string" ? value.epigraphe : DEFAULT_BOOK_SETTINGS.epigraphe,
    noteAutrice:
      typeof value.noteAutrice === "string" ? value.noteAutrice : DEFAULT_BOOK_SETTINGS.noteAutrice,
    titreLivre:
      typeof value.titreLivre === "string" && value.titreLivre.trim()
        ? value.titreLivre
        : DEFAULT_BOOK_SETTINGS.titreLivre,
    titreTome:
      typeof value.titreTome === "string" && value.titreTome.trim()
        ? value.titreTome
        : DEFAULT_BOOK_SETTINGS.titreTome,
  };
}

export function lireBookSettings(): BookSettings {
  if (typeof window === "undefined") return DEFAULT_BOOK_SETTINGS;

  try {
    const saved = localStorage.getItem(BOOK_SETTINGS_STORAGE_KEY);
    return normaliserBookSettings(saved ? JSON.parse(saved) : null);
  } catch {
    return DEFAULT_BOOK_SETTINGS;
  }
}

export function sauvegarderBookSettings(settings: BookSettings) {
  if (typeof window === "undefined") return;
  localStorage.setItem(BOOK_SETTINGS_STORAGE_KEY, JSON.stringify(normaliserBookSettings(settings)));
}
