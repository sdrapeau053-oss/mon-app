export const MEMOIRES_NARRATIVES_STORAGE_KEY = "memoires-narratives";

export type MemoireNarrative = {
  id: string;
  titre: string;
  periode:
    | "0-5"
    | "6-11"
    | "12-17"
    | "18-24"
    | "adulte"
    | "transgenerationnel";
  ageApprox?: string;
  type:
    | "scene"
    | "souvenir"
    | "corps"
    | "violence"
    | "refuge"
    | "relation"
    | "transmission"
    | "fragment";
  intensite?: number;
  motifs?: string[];
  personnesLiees?: string[];
  texte: string;
  tomeProbable?: number;
  chapitreProbable?: number;
  statut:
    | "non-traite"
    | "a-integrer"
    | "integre"
    | "archive";
  createdAt: string;
};

const PERIODES = ["0-5", "6-11", "12-17", "18-24", "adulte", "transgenerationnel"] as const;
const TYPES = ["scene", "souvenir", "corps", "violence", "refuge", "relation", "transmission", "fragment"] as const;
const STATUTS = ["non-traite", "a-integrer", "integre", "archive"] as const;

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

function isValidPeriode(value: unknown): value is MemoireNarrative["periode"] {
  return typeof value === "string" && PERIODES.includes(value as MemoireNarrative["periode"]);
}

function isValidType(value: unknown): value is MemoireNarrative["type"] {
  return typeof value === "string" && TYPES.includes(value as MemoireNarrative["type"]);
}

function isValidStatut(value: unknown): value is MemoireNarrative["statut"] {
  return typeof value === "string" && STATUTS.includes(value as MemoireNarrative["statut"]);
}

function optionalString(value: unknown): string | undefined {
  return typeof value === "string" ? value : undefined;
}

function optionalNumber(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

function stringList(value: unknown): string[] | undefined {
  if (!Array.isArray(value)) return undefined;

  return value.filter((item): item is string => typeof item === "string");
}

function normaliserMemoireNarrative(value: unknown): MemoireNarrative | null {
  if (!isRecord(value)) return null;
  if (typeof value.id !== "string") return null;
  if (typeof value.titre !== "string") return null;
  if (!isValidPeriode(value.periode)) return null;
  if (!isValidType(value.type)) return null;
  if (typeof value.texte !== "string") return null;
  if (!isValidStatut(value.statut)) return null;
  if (typeof value.createdAt !== "string") return null;

  return {
    id: value.id,
    titre: value.titre,
    periode: value.periode,
    ageApprox: optionalString(value.ageApprox),
    type: value.type,
    intensite: optionalNumber(value.intensite),
    motifs: stringList(value.motifs),
    personnesLiees: stringList(value.personnesLiees),
    texte: value.texte,
    tomeProbable: optionalNumber(value.tomeProbable),
    chapitreProbable: optionalNumber(value.chapitreProbable),
    statut: value.statut,
    createdAt: value.createdAt,
  };
}

function normaliserMemoiresNarratives(value: unknown): MemoireNarrative[] {
  if (!Array.isArray(value)) return [];

  return value
    .map((memoire) => normaliserMemoireNarrative(memoire))
    .filter((memoire): memoire is MemoireNarrative => Boolean(memoire));
}

export function lireMemoiresNarratives(): MemoireNarrative[] {
  if (typeof window === "undefined") return [];

  try {
    const saved = localStorage.getItem(MEMOIRES_NARRATIVES_STORAGE_KEY);
    return normaliserMemoiresNarratives(saved ? JSON.parse(saved) : []);
  } catch {
    return [];
  }
}

export function sauvegarderMemoiresNarratives(memoires: MemoireNarrative[]): MemoireNarrative[] {
  const normalized = normaliserMemoiresNarratives(memoires);
  if (typeof window === "undefined") return normalized;

  localStorage.setItem(MEMOIRES_NARRATIVES_STORAGE_KEY, JSON.stringify(normalized));
  return normalized;
}

export function ajouterMemoireNarrative(memoire: MemoireNarrative): MemoireNarrative[] {
  const normalized = normaliserMemoireNarrative(memoire);
  if (!normalized) return lireMemoiresNarratives();

  return sauvegarderMemoiresNarratives([normalized, ...lireMemoiresNarratives()]);
}

export function mettreAJourMemoireNarrative(
  id: MemoireNarrative["id"],
  updates: Partial<Omit<MemoireNarrative, "id">>,
): MemoireNarrative[] {
  return sauvegarderMemoiresNarratives(
    lireMemoiresNarratives().map((memoire) =>
      memoire.id === id ? { ...memoire, ...updates, id: memoire.id } : memoire,
    ),
  );
}

export function supprimerMemoireNarrative(id: MemoireNarrative["id"]): MemoireNarrative[] {
  return sauvegarderMemoiresNarratives(
    lireMemoiresNarratives().filter((memoire) => memoire.id !== id),
  );
}
