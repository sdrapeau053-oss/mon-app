// ── Devise ────────────────────────────────────────────────────────────────────

export const DEVISE = { symbole: "$", code: "CAD" } as const;

export function formaterPrix(montant: number): string {
  return `${montant} ${DEVISE.symbole}`;
}

// ── Types ─────────────────────────────────────────────────────────────────────

export interface TypeProjetConfig {
  id: string;
  label: string;
  base: number;
}

export interface GrilleConfig {
  types: TypeProjetConfig[];
  longueur:   Record<"court" | "moyen" | "long" | "tres_long", number>;
  complexite: Record<"simple" | "standard" | "complexe", number>;
  urgence:    Record<"haute" | "normale" | "basse", number>;
  versionSuppl: number;
  acompte: number;
}

// TypeProjetKey : liste des types détectables automatiquement (built-in)
export type TypeProjetKey =
  | "page_vente" | "email" | "article" | "fiche_produit"
  | "newsletter" | "brochure" | "site_web" | "autre";

// ── Valeurs par défaut ────────────────────────────────────────────────────────

const TYPES_DEFAUT: TypeProjetConfig[] = [
  { id: "page_vente",    label: "Page de vente",  base: 220 },
  { id: "email",         label: "Email",          base: 90  },
  { id: "article",       label: "Article / Blog", base: 130 },
  { id: "fiche_produit", label: "Fiche produit",  base: 65  },
  { id: "newsletter",    label: "Newsletter",     base: 110 },
  { id: "brochure",      label: "Brochure",       base: 190 },
  { id: "site_web",      label: "Site web",       base: 320 },
  { id: "autre",         label: "Autre",          base: 160 },
];

const LONGUEUR_DEFAUT:   GrilleConfig["longueur"]   = { court: 0.80, moyen: 1.00, long: 1.35, tres_long: 1.70 };
const COMPLEXITE_DEFAUT: GrilleConfig["complexite"] = { simple: 0.85, standard: 1.00, complexe: 1.40 };
const URGENCE_DEFAUT:    GrilleConfig["urgence"]    = { haute: 1.30, normale: 1.00, basse: 0.90 };
const VERSION_SUPPL_DEFAUT = 40;
const ACOMPTE_DEFAUT = 0.50;

export function creerConfigDefaut(): GrilleConfig {
  return {
    types:        TYPES_DEFAUT.map(t => ({ ...t })),
    longueur:     { ...LONGUEUR_DEFAUT },
    complexite:   { ...COMPLEXITE_DEFAUT },
    urgence:      { ...URGENCE_DEFAUT },
    versionSuppl: VERSION_SUPPL_DEFAUT,
    acompte:      ACOMPTE_DEFAUT,
  };
}

// ── localStorage ──────────────────────────────────────────────────────────────

const CLE_STORAGE = "grille-config";

function estConfigValide(c: unknown): c is GrilleConfig {
  if (!c || typeof c !== "object") return false;
  const o = c as Record<string, unknown>;
  if (!Array.isArray(o.types)) return false;
  if (!(o.types as unknown[]).every(t => {
    if (!t || typeof t !== "object") return false;
    const { id, label, base } = t as Record<string, unknown>;
    return typeof id === "string" && typeof label === "string" && typeof base === "number";
  })) return false;
  if (!o.longueur || typeof o.longueur !== "object") return false;
  if (!("moyen" in (o.longueur as object))) return false;
  if (!o.complexite || typeof o.complexite !== "object") return false;
  if (!("standard" in (o.complexite as object))) return false;
  if (!o.urgence || typeof o.urgence !== "object") return false;
  if (!("normale" in (o.urgence as object))) return false;
  return true;
}

export function chargerConfig(): GrilleConfig {
  if (typeof window === "undefined") return creerConfigDefaut();
  try {
    const saved = localStorage.getItem(CLE_STORAGE);
    if (!saved) return creerConfigDefaut();
    const parsed = JSON.parse(saved) as unknown;
    if (!estConfigValide(parsed)) return creerConfigDefaut();
    if (!parsed.types.some(t => t.id === "autre")) {
      parsed.types.push({ id: "autre", label: "Autre", base: 160 });
    }
    return parsed;
  } catch {
    return creerConfigDefaut();
  }
}

export function sauvegarderConfig(config: GrilleConfig): void {
  localStorage.setItem(CLE_STORAGE, JSON.stringify(config));
}

export function reinitialiserConfig(): GrilleConfig {
  localStorage.removeItem(CLE_STORAGE);
  return creerConfigDefaut();
}

// ── Temps estimé (fallback sur "autre" pour les types personnalisés) ──────────

const TEMPS_ESTIME: Record<string, Record<"simple" | "standard" | "complexe", string>> = {
  page_vente:    { simple: "3–4h",  standard: "5–7h",  complexe: "8–12h"  },
  email:         { simple: "1–2h",  standard: "2–3h",  complexe: "3–5h"   },
  article:       { simple: "2–3h",  standard: "3–5h",  complexe: "5–8h"   },
  fiche_produit: { simple: "1h",    standard: "1–2h",  complexe: "2–3h"   },
  newsletter:    { simple: "2–3h",  standard: "3–4h",  complexe: "4–6h"   },
  brochure:      { simple: "3–5h",  standard: "5–8h",  complexe: "8–14h"  },
  site_web:      { simple: "5–8h",  standard: "8–14h", complexe: "14–24h" },
  autre:         { simple: "2–4h",  standard: "4–6h",  complexe: "6–10h"  },
};

// ── Calcul ────────────────────────────────────────────────────────────────────

export interface CalculPrix {
  prixFinal: number;
  acompte: number;
  tempsEstime: string;
  detail: string[];
}

function normaliserTypeId(typeId: string | undefined, cfg: GrilleConfig): string {
  if (typeId === undefined) return "autre";
  if (!cfg.types.some(t => t.id === typeId)) return "autre";
  return typeId;
}

export function calculerPrix(
  typeId: string | undefined,
  longueur: keyof GrilleConfig["longueur"] | undefined,
  urgence: keyof GrilleConfig["urgence"],
  complexite: keyof GrilleConfig["complexite"],
  nombreVersions: number,
  config?: GrilleConfig
): CalculPrix {
  const cfg = config ?? creerConfigDefaut();
  const id  = normaliserTypeId(typeId, cfg);

  const typeEntry =
    cfg.types.find(t => t.id === id) ??
    { id: "autre", label: "Autre", base: 160 };

  const base  = typeEntry.base;
  const label = typeEntry.label;
  const coL   = cfg.longueur[longueur ?? "moyen"];
  const coU   = cfg.urgence[urgence];
  const coC   = cfg.complexite[complexite];
  const versionsSuppl = Math.max(0, nombreVersions - 1) * cfg.versionSuppl;
  const prixFinal     = Math.round(base * coL * coU * coC) + versionsSuppl;
  const acompte       = Math.round(prixFinal * cfg.acompte);

  const detail: string[] = [`Base ${label} : ${formaterPrix(base)}`];
  if (longueur && longueur !== "moyen") detail.push(`Longueur (${longueur}) : ×${coL}`);
  if (urgence   !== "normale")          detail.push(`Urgence (${urgence}) : ×${coU}`);
  if (complexite !== "standard")        detail.push(`Complexité (${complexite}) : ×${coC}`);
  if (versionsSuppl > 0)               detail.push(`${nombreVersions - 1} version(s) suppl. : +${formaterPrix(versionsSuppl)}`);

  const tempsEntry = TEMPS_ESTIME[id] ?? TEMPS_ESTIME["autre"];
  return { prixFinal, acompte, tempsEstime: tempsEntry[complexite], detail };
}
