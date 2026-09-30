import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  ajouterFragment,
  lireFragments,
  lireFragmentsSupprimes,
  lireTousLesFragments,
  mettreAJourFragment,
  restaurerFragment,
  sauvegarderFragments,
  supprimerFragment,
  type Fragment,
} from "./fragments";

// fragments.ts vérifie la disponibilité via `typeof window`, mais lit et
// écrit ensuite via l'identifiant global `localStorage` — même convention
// que lib/autre-rive/storage.test.ts, réutilisée ici à l'identique plutôt
// que réinventée.
function createMemoryLocalStorage(): Storage {
  const store = new Map<string, string>();
  return {
    get length() {
      return store.size;
    },
    clear: () => store.clear(),
    getItem: (key: string) => (store.has(key) ? (store.get(key) as string) : null),
    key: (index: number) => Array.from(store.keys())[index] ?? null,
    removeItem: (key: string) => {
      store.delete(key);
    },
    setItem: (key: string, value: string) => {
      store.set(key, value);
    },
  };
}

function frag(overrides: Partial<Fragment> = {}): Fragment {
  return {
    id: "f1",
    texte: "texte",
    tags: [],
    age: null,
    periode: null,
    anneeApprox: null,
    violations: [],
    versions: [],
    ...overrides,
  };
}

beforeEach(() => {
  const memoryLocalStorage = createMemoryLocalStorage();
  (globalThis as { window?: unknown }).window = { localStorage: memoryLocalStorage };
  (globalThis as { localStorage?: unknown }).localStorage = memoryLocalStorage;
});

afterEach(() => {
  delete (globalThis as { window?: unknown }).window;
  delete (globalThis as { localStorage?: unknown }).localStorage;
});

describe("LIVRE-P0.2 — soft-delete non destructif des fragments", () => {
  it("1. un fragment legacy sans deletedAt reste actif", () => {
    sauvegarderFragments([frag({ id: "legacy" })]);
    const actifs = lireFragments();
    expect(actifs.map((f) => f.id)).toContain("legacy");
    expect(actifs.find((f) => f.id === "legacy")?.deletedAt).toBeUndefined();
  });

  it("2-3. lireFragments retourne les actifs et exclut les supprimés", () => {
    sauvegarderFragments([frag({ id: "a" }), frag({ id: "b", deletedAt: "2026-01-01T00:00:00.000Z" })]);
    const actifs = lireFragments();
    expect(actifs.map((f) => f.id)).toEqual(["a"]);
  });

  it("4. lireTousLesFragments retourne actifs + supprimés", () => {
    sauvegarderFragments([frag({ id: "a" }), frag({ id: "b", deletedAt: "2026-01-01T00:00:00.000Z" })]);
    const tous = lireTousLesFragments();
    expect(tous.map((f) => f.id).sort()).toEqual(["a", "b"]);
  });

  it("5. lireFragmentsSupprimes retourne uniquement les supprimés", () => {
    sauvegarderFragments([frag({ id: "a" }), frag({ id: "b", deletedAt: "2026-01-01T00:00:00.000Z" })]);
    const supprimes = lireFragmentsSupprimes();
    expect(supprimes.map((f) => f.id)).toEqual(["b"]);
  });

  it("6-9. supprimerFragment conserve physiquement le fragment, ajoute deletedAt, conserve id/texte/tags", () => {
    sauvegarderFragments([frag({ id: "a", texte: "Un souvenir précis", tags: ["peur", "froid"] })]);
    supprimerFragment("a");
    const tous = lireTousLesFragments();
    expect(tous).toHaveLength(1);
    const a = tous[0];
    expect(a.id).toBe("a");
    expect(a.texte).toBe("Un souvenir précis");
    expect(a.tags).toEqual(["peur", "froid"]);
    expect(typeof a.deletedAt).toBe("string");
    expect(a.deletedAt).toBeTruthy();
  });

  it("10-11. suppression conserve versions et liens tome/chapitre/scène", () => {
    sauvegarderFragments([
      frag({
        id: "a",
        versions: [{ date: "2026-01-01", texte: "brouillon" }],
        tomeId: 1,
        chapitre: "La maison",
        sceneIds: ["scene-1"],
      }),
    ]);
    supprimerFragment("a");
    const a = lireTousLesFragments()[0];
    expect(a.versions).toEqual([{ date: "2026-01-01", texte: "brouillon" }]);
    expect(a.tomeId).toBe(1);
    expect(a.chapitre).toBe("La maison");
    expect(a.sceneIds).toEqual(["scene-1"]);
  });

  it("13-14. suppression répétée est idempotente et conserve le deletedAt initial", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-01-01T00:00:00.000Z"));
    sauvegarderFragments([frag({ id: "a" })]);
    supprimerFragment("a");
    const premier = lireTousLesFragments()[0].deletedAt;

    vi.setSystemTime(new Date("2026-02-01T00:00:00.000Z"));
    supprimerFragment("a");
    const second = lireTousLesFragments()[0].deletedAt;

    expect(second).toBe(premier);
    vi.useRealTimers();
  });

  it("15-17. restauration retire deletedAt, conserve les autres données, réapparaît dans lireFragments", () => {
    sauvegarderFragments([frag({ id: "a", texte: "X", tags: ["t1"], deletedAt: "2026-01-01T00:00:00.000Z" })]);
    restaurerFragment("a");
    const a = lireTousLesFragments()[0];
    expect(a.deletedAt).toBeUndefined();
    expect(a.texte).toBe("X");
    expect(a.tags).toEqual(["t1"]);
    expect(lireFragments().map((f) => f.id)).toContain("a");
  });

  it("18. restauration répétée est sûre/idempotente", () => {
    sauvegarderFragments([frag({ id: "a" })]); // déjà actif
    expect(() => restaurerFragment("a")).not.toThrow();
    expect(lireTousLesFragments()[0].deletedAt).toBeUndefined();
  });

  it("19. un id inexistant ne détruit/modifie aucun autre fragment", () => {
    sauvegarderFragments([frag({ id: "a" }), frag({ id: "b" })]);
    supprimerFragment("inexistant");
    const tous = lireTousLesFragments();
    expect(tous).toHaveLength(2);
    expect(tous.every((f) => !f.deletedAt)).toBe(true);
  });

  it("20. mettreAJourFragment ne restaure pas accidentellement un fragment supprimé", () => {
    sauvegarderFragments([frag({ id: "a", deletedAt: "2026-01-01T00:00:00.000Z" })]);
    mettreAJourFragment("a", (f) => ({ ...f, note: "une note ajoutée" }));
    const a = lireTousLesFragments()[0];
    expect(a.note).toBe("une note ajoutée");
    expect(a.deletedAt).toBe("2026-01-01T00:00:00.000Z");
  });

  it("mettreAJourFragment ne fait pas disparaître les fragments supprimés qu'elle ne touche pas", () => {
    sauvegarderFragments([
      frag({ id: "a" }),
      frag({ id: "b", deletedAt: "2026-01-01T00:00:00.000Z" }),
    ]);
    mettreAJourFragment("a", (f) => ({ ...f, note: "x" }));
    expect(lireTousLesFragments().map((f) => f.id).sort()).toEqual(["a", "b"]);
  });

  it("21. ajouterFragment crée un fragment actif", () => {
    ajouterFragment(frag({ id: "nouveau" }));
    const nouveau = lireTousLesFragments().find((f) => f.id === "nouveau");
    expect(nouveau?.deletedAt).toBeUndefined();
    expect(lireFragments().map((f) => f.id)).toContain("nouveau");
  });

  it("ajouterFragment ne fait pas disparaître les fragments supprimés existants", () => {
    sauvegarderFragments([frag({ id: "b", deletedAt: "2026-01-01T00:00:00.000Z" })]);
    ajouterFragment(frag({ id: "nouveau" }));
    expect(lireTousLesFragments().map((f) => f.id).sort()).toEqual(["b", "nouveau"]);
  });

  it("22. données legacy restent compatibles après un cycle sauvegarde/relecture", () => {
    const legacy = { id: "old", texte: "ancien", tags: ["x"] };
    sauvegarderFragments([legacy]);
    const relu = lireTousLesFragments()[0];
    expect(relu.deletedAt).toBeUndefined();
    expect(relu.texte).toBe("ancien");
  });

  it("23. supprimer A ne modifie pas B", () => {
    sauvegarderFragments([frag({ id: "a", texte: "A" }), frag({ id: "b", texte: "B", tags: ["garde"] })]);
    supprimerFragment("a");
    const b = lireTousLesFragments().find((f) => f.id === "b")!;
    expect(b.texte).toBe("B");
    expect(b.tags).toEqual(["garde"]);
    expect(b.deletedAt).toBeUndefined();
  });

  it("24. supprimer/restaurer A ne modifie pas les versions de B", () => {
    sauvegarderFragments([
      frag({ id: "a" }),
      frag({ id: "b", versions: [{ date: "2026-01-01", texte: "v1" }] }),
    ]);
    supprimerFragment("a");
    restaurerFragment("a");
    const b = lireTousLesFragments().find((f) => f.id === "b")!;
    expect(b.versions).toEqual([{ date: "2026-01-01", texte: "v1" }]);
  });
});
