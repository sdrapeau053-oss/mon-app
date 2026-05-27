export const MODES = {
  narratif:     "Narratif",
  informatif:   "Informatif",
  persuasif:    "Persuasif",
  editorial:    "Éditorial",
  publicitaire: "Publicitaire",
  brut:         "Brut / Direct",
} as const;

export type ModeKey = keyof typeof MODES;
