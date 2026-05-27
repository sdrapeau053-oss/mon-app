export const FRAGMENTS_STORAGE_KEY = "fragments";

export type Fragment = {
  id: number | string;
  source?: string;
  texte: string;
  tome?: string;
  tomeId?: number | null;
  chapitre?: string;
  date?: string;
  manuscrit?: boolean;
  tags: string[];
  note?: string;
  age: number | null;
  periode: string | null;
  anneeApprox: number | null;
  violations: string[];
  versions: { date: string; texte: string }[];
  titre?: string;
  type?: string;
  statut?: string;
  sceneIds?: string[];
  chapitreId?: string;
};

export type FragmentInput = Partial<Fragment> & {
  id: Fragment["id"];
  texte?: string;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

function parseNumberOrNull(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }

  return null;
}

function parseStringOrNull(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value : null;
}

export function normalizeFragment(fragment: unknown): Fragment | null {
  if (!isRecord(fragment)) return null;

  const id = fragment.id;
  if (typeof id !== "number" && typeof id !== "string") return null;

  return {
    ...fragment,
    id,
    source: typeof fragment.source === "string" ? fragment.source : undefined,
    texte: typeof fragment.texte === "string" ? fragment.texte : "",
    tome: typeof fragment.tome === "string" ? fragment.tome : undefined,
    tomeId: parseNumberOrNull(fragment.tomeId),
    chapitre: typeof fragment.chapitre === "string" ? fragment.chapitre : undefined,
    date:
      typeof fragment.date === "string"
        ? fragment.date
        : new Date().toLocaleDateString("fr-CA"),
    manuscrit: Boolean(fragment.manuscrit),
    tags: Array.isArray(fragment.tags)
      ? fragment.tags.filter((tag): tag is string => typeof tag === "string")
      : [],
    note: typeof fragment.note === "string" ? fragment.note : undefined,
    age: parseNumberOrNull(fragment.age),
    periode: parseStringOrNull(fragment.periode),
    anneeApprox: parseNumberOrNull(fragment.anneeApprox),
    violations: Array.isArray(fragment.violations)
      ? fragment.violations.filter((violation): violation is string => typeof violation === "string")
      : [],
    versions: Array.isArray(fragment.versions)
      ? fragment.versions.filter(
          (version): version is { date: string; texte: string } =>
            isRecord(version) &&
            typeof version.date === "string" &&
            typeof version.texte === "string",
        )
      : [],
    titre: typeof fragment.titre === "string" ? fragment.titre : undefined,
    type: typeof fragment.type === "string" ? fragment.type : undefined,
    statut: typeof fragment.statut === "string" ? fragment.statut : undefined,
    sceneIds: Array.isArray(fragment.sceneIds)
      ? fragment.sceneIds.filter((sceneId): sceneId is string => typeof sceneId === "string")
      : [],
    chapitreId: typeof fragment.chapitreId === "string" ? fragment.chapitreId : undefined,
  };
}

export function normalizeFragments(fragments: unknown): Fragment[] {
  if (!Array.isArray(fragments)) return [];

  return fragments
    .map((fragment) => normalizeFragment(fragment))
    .filter((fragment): fragment is Fragment => Boolean(fragment));
}

export function lireFragments(): Fragment[] {
  if (typeof window === "undefined") return [];

  try {
    const saved = localStorage.getItem(FRAGMENTS_STORAGE_KEY);
    return normalizeFragments(saved ? JSON.parse(saved) : []);
  } catch {
    return [];
  }
}

export function sauvegarderFragments(fragments: FragmentInput[]) {
  const normalized = normalizeFragments(fragments);
  localStorage.setItem(FRAGMENTS_STORAGE_KEY, JSON.stringify(normalized));
  return normalized;
}

export function ajouterFragment(fragment: FragmentInput) {
  const current = lireFragments();
  const normalized = normalizeFragment(fragment);
  if (!normalized) return current;

  return sauvegarderFragments([normalized, ...current]);
}

export function mettreAJourFragment(
  id: Fragment["id"],
  updater: (fragment: Fragment) => FragmentInput,
) {
  return sauvegarderFragments(
    lireFragments().map((fragment) =>
      String(fragment.id) === String(id) ? updater(fragment) : fragment,
    ),
  );
}

export function supprimerFragment(id: Fragment["id"]) {
  return sauvegarderFragments(
    lireFragments().filter((fragment) => String(fragment.id) !== String(id)),
  );
}
