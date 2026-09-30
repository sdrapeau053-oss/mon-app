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
  // LIVRE-P0.2 — suppression logique et réversible. Absent = actif.
  // Présent (timestamp ISO) = supprimé logiquement ; le fragment, son
  // texte, ses tags, ses versions et ses liens restent intacts en
  // stockage. Ne jamais réutiliser `statut` pour cette information :
  // c'est un champ libre, non gouverné, déjà utilisé pour autre chose.
  deletedAt?: string;
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
    deletedAt: typeof fragment.deletedAt === "string" && fragment.deletedAt.trim() ? fragment.deletedAt : undefined,
  };
}

export function normalizeFragments(fragments: unknown): Fragment[] {
  if (!Array.isArray(fragments)) return [];

  return fragments
    .map((fragment) => normalizeFragment(fragment))
    .filter((fragment): fragment is Fragment => Boolean(fragment));
}

// LIVRE-P0.2 — lecture complète, sans filtrage de suppression : actifs +
// supprimés. Réservée aux opérations de cycle de vie (suppression,
// restauration, migration, export/sync) qui doivent voir tout le corpus
// pour ne jamais écraser silencieusement un fragment absent de la vue
// active. Les consommateurs ordinaires du Livre doivent utiliser
// lireFragments() (filtrée) et n'ont pas à connaître `deletedAt`.
export function lireTousLesFragments(): Fragment[] {
  if (typeof window === "undefined") return [];

  try {
    const saved = localStorage.getItem(FRAGMENTS_STORAGE_KEY);
    return normalizeFragments(saved ? JSON.parse(saved) : []);
  } catch {
    return [];
  }
}

// Lecture normale : uniquement les fragments actifs (non supprimés).
// C'est le point de lecture utilisé par tous les écrans/lib existants.
export function lireFragments(): Fragment[] {
  return lireTousLesFragments().filter((fragment) => !fragment.deletedAt);
}

// Lecture explicite de la corbeille : uniquement les fragments supprimés.
export function lireFragmentsSupprimes(): Fragment[] {
  return lireTousLesFragments().filter((fragment) => Boolean(fragment.deletedAt));
}

export function sauvegarderFragments(fragments: FragmentInput[]) {
  const normalized = normalizeFragments(fragments);
  localStorage.setItem(FRAGMENTS_STORAGE_KEY, JSON.stringify(normalized));
  return normalized;
}

export function ajouterFragment(fragment: FragmentInput) {
  // LIVRE-P0.2 — lireTousLesFragments() (pas lireFragments()) : sinon
  // chaque ajout réécrirait le corpus en excluant silencieusement tous
  // les fragments déjà soft-deleted.
  const current = lireTousLesFragments();
  const normalized = normalizeFragment(fragment);
  if (!normalized) return current;
  // Un nouveau fragment est toujours actif ; deletedAt n'est jamais
  // inventé ici, quoi que l'appelant ait fourni.
  return sauvegarderFragments([{ ...normalized, deletedAt: undefined }, ...current]);
}

export function mettreAJourFragment(
  id: Fragment["id"],
  updater: (fragment: Fragment) => FragmentInput,
) {
  // LIVRE-P0.2 — lireTousLesFragments() : une mise à jour ordinaire ne
  // doit jamais faire disparaître du corpus les fragments soft-deleted
  // qu'elle ne touche pas.
  const tous = lireTousLesFragments();

  return sauvegarderFragments(
    tous.map((fragment) => {
      if (String(fragment.id) !== String(id)) return fragment;
      const resultat = updater(fragment);
      // Une mise à jour ordinaire ne change jamais le cycle de vie :
      // deletedAt reste exactement ce qu'il était avant l'appel, quoi que
      // l'updater ait renvoyé. La restauration passe uniquement par
      // restaurerFragment().
      return { ...resultat, deletedAt: fragment.deletedAt };
    }),
  );
}

// Suppression logique, non destructive et idempotente : le fragment
// reste physiquement présent, avec son id, son texte, ses tags, ses
// versions et ses liens intacts. Une deuxième suppression du même
// fragment ne modifie rien (le premier deletedAt est conservé). Un id
// inexistant ne modifie aucun fragment.
export function supprimerFragment(id: Fragment["id"]) {
  const tous = lireTousLesFragments();

  return sauvegarderFragments(
    tous.map((fragment) => {
      if (String(fragment.id) !== String(id)) return fragment;
      if (fragment.deletedAt) return fragment; // déjà supprimé : idempotent
      return { ...fragment, deletedAt: new Date().toISOString() };
    }),
  );
}

// Restauration non destructive et idempotente : retire uniquement
// `deletedAt`, préserve tout le reste. Un id inexistant ou déjà actif ne
// modifie rien.
export function restaurerFragment(id: Fragment["id"]) {
  const tous = lireTousLesFragments();

  return sauvegarderFragments(
    tous.map((fragment) => {
      if (String(fragment.id) !== String(id)) return fragment;
      if (!fragment.deletedAt) return fragment; // déjà actif : idempotent
      return { ...fragment, deletedAt: undefined };
    }),
  );
}
