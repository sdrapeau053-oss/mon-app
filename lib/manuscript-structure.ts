export const STRUCTURE_TOMES_STORAGE_KEY = "structure-tomes";
export const STRUCTURE_CHAPITRES_STORAGE_KEY = "structure-chapitres";

export type ManuscriptTome = {
  id: number;
  titre: string;
  color: string;
};

export type ManuscriptChapitres = Record<number, string[]>;

export const TOMES_DEFAUT: ManuscriptTome[] = [
  { id: 1, titre: "Tome 1 — Enfance", color: "#8B7355" },
  { id: 2, titre: "Tome 2 — Adolescence", color: "#6B7A8B" },
  { id: 3, titre: "Tome 3 — Mariage violent", color: "#8B6B6B" },
  { id: 4, titre: "Tome 4 — Procès", color: "#7B8B6B" },
];

export const CHAPITRES_DEFAUT: ManuscriptChapitres = {
  1: ["La maison", "Les adultes", "L'école", "La nature", "Les silences", "Les punitions", "Les jeux"],
  2: ["Le corps qui change", "Les amis", "Le premier amour", "Partir", "La rupture"],
  3: ["Le début", "La maison fermée", "Les coups", "L'isolement", "Résister", "Les enfants"],
  4: ["La plainte", "Le tribunal", "La liberté retrouvée", "Reconstruire", "La transmission"],
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

function normalizeTome(tome: unknown, fallback?: ManuscriptTome): ManuscriptTome | null {
  if (!isRecord(tome)) return fallback || null;

  const id = typeof tome.id === "number" && Number.isFinite(tome.id) ? tome.id : fallback?.id;
  if (!id) return null;

  return {
    id,
    titre: typeof tome.titre === "string" && tome.titre.trim() ? tome.titre : fallback?.titre || `Tome ${id}`,
    color: typeof tome.color === "string" && tome.color.trim() ? tome.color : fallback?.color || "#8B7355",
  };
}

export function normaliserTomes(tomes: unknown): ManuscriptTome[] {
  if (!Array.isArray(tomes)) return TOMES_DEFAUT;

  const normalized = tomes
    .map((tome, index) => normalizeTome(tome, TOMES_DEFAUT[index]))
    .filter((tome): tome is ManuscriptTome => Boolean(tome));

  return normalized.length > 0 ? normalized : TOMES_DEFAUT;
}

export function normaliserChapitres(chapitres: unknown): ManuscriptChapitres {
  if (!isRecord(chapitres)) return CHAPITRES_DEFAUT;

  return TOMES_DEFAUT.reduce<ManuscriptChapitres>((acc, tome) => {
    const value = chapitres[String(tome.id)] ?? chapitres[tome.id];
    acc[tome.id] = Array.isArray(value)
      ? value.filter((chapitre): chapitre is string => typeof chapitre === "string")
      : CHAPITRES_DEFAUT[tome.id] || [];

    return acc;
  }, {});
}

export function lireTomes(): ManuscriptTome[] {
  if (typeof window === "undefined") return TOMES_DEFAUT;

  try {
    const saved = localStorage.getItem(STRUCTURE_TOMES_STORAGE_KEY);
    return normaliserTomes(saved ? JSON.parse(saved) : TOMES_DEFAUT);
  } catch {
    return TOMES_DEFAUT;
  }
}

export function sauvegarderTomes(tomes: ManuscriptTome[]) {
  const normalized = normaliserTomes(tomes);
  localStorage.setItem(STRUCTURE_TOMES_STORAGE_KEY, JSON.stringify(normalized));
  return normalized;
}

export function lireChapitres(): ManuscriptChapitres {
  if (typeof window === "undefined") return CHAPITRES_DEFAUT;

  try {
    const saved = localStorage.getItem(STRUCTURE_CHAPITRES_STORAGE_KEY);
    return normaliserChapitres(saved ? JSON.parse(saved) : CHAPITRES_DEFAUT);
  } catch {
    return CHAPITRES_DEFAUT;
  }
}

export function sauvegarderChapitres(chapitres: ManuscriptChapitres) {
  const normalized = normaliserChapitres(chapitres);
  localStorage.setItem(STRUCTURE_CHAPITRES_STORAGE_KEY, JSON.stringify(normalized));
  return normalized;
}
