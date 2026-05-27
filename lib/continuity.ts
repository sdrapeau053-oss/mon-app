export const CONTINUITY_STORAGE_KEY = "strate-continuity";

export type StrateContinuity = {
  lastAction: string;
  lastChapter: string;
  lastChapterId: string;
  lastModule: string;
  lastPage: string;
  lastPosition: number;
  lastScroll: number;
  lastSection: string;
  lastUsedAt: string;
  previousPage: string;
  updatedAt: string;
  version: 1;
  writingUpdatedAt: string;
};

export type ContinuitySummary = {
  elapsedLabel: string;
  lastActivity: string;
  lastPageLabel: string;
  resumeHref: string;
  suggestedResume: string;
};

const EMPTY_CONTINUITY: StrateContinuity = {
  lastAction: "",
  lastChapter: "",
  lastChapterId: "",
  lastModule: "",
  lastPage: "",
  lastPosition: 0,
  lastScroll: 0,
  lastSection: "",
  lastUsedAt: "",
  previousPage: "",
  updatedAt: "",
  version: 1,
  writingUpdatedAt: "",
};

const ROUTE_LABELS: Record<string, string> = {
  "/": "Accueil",
  "/aide-memoire": "Aide-mémoire",
  "/audit": "Audit",
  "/centre-de-controle": "Centre",
  "/chronologie": "Chronologie",
  "/daily-system": "Daily System",
  "/ecrire-maintenant": "Écrire maintenant",
  "/freelance": "Freelance",
  "/guide-strate": "Guide STRATE",
  "/lecture": "Lecture",
  "/life-operating-system": "Life OS",
  "/manuscrit": "Manuscrit",
  "/memoires": "Mémoires",
  "/missions": "Missions",
  "/retour-utilisation": "Retour d’utilisation",
  "/routines-maison": "Routines maison",
  "/structure": "Structure",
  "/style-dna": "Style DNA",
  "/taches-menageres": "Tâches ménagères",
  "/timeline": "Timeline",
};

function canUseStorage() {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

function normalizePath(pathname: string) {
  if (!pathname) return "/";
  return pathname.split("?")[0] || "/";
}

export function getContinuityRouteLabel(pathname: string) {
  const normalized = normalizePath(pathname);
  if (ROUTE_LABELS[normalized]) return ROUTE_LABELS[normalized];

  const segment = normalized.split("/").filter(Boolean)[0];
  if (!segment) return "Accueil";

  return segment
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function getModuleLabel(pathname: string) {
  const normalized = normalizePath(pathname);

  if (["/", "/centre-de-controle", "/centre-intelligent", "/ecrire-maintenant", "/guide-strate", "/retour-utilisation"].includes(normalized)) return "Centre";
  if (
    [
      "/daily-system",
      "/life-operating-system",
      "/routines-maison",
      "/taches-menageres",
      "/timeline",
      "/aide-memoire",
    ].includes(normalized)
  ) {
    return "Vie";
  }
  if (
    normalized.includes("audit") ||
    ["/chronologie", "/lecture", "/manuscrit", "/memoires", "/repetitions", "/silence", "/structure", "/style-dna", "/tableau"].includes(
      normalized,
    )
  ) {
    return "Manuscrit";
  }
  if (normalized.includes("freelance") || normalized.includes("missions") || normalized.includes("analyser-demande")) return "Business";

  return getContinuityRouteLabel(normalized);
}

function getChapterFromPath(pathname: string) {
  const match = normalizePath(pathname).match(/chapitre[-/]?(\d+)/i);
  return match?.[1] ? `Chapitre ${match[1]}` : "";
}

export function readContinuity(): StrateContinuity {
  if (!canUseStorage()) return EMPTY_CONTINUITY;

  try {
    const raw = window.localStorage.getItem(CONTINUITY_STORAGE_KEY);
    if (!raw) return EMPTY_CONTINUITY;

    const parsed = JSON.parse(raw) as Partial<StrateContinuity>;
    return { ...EMPTY_CONTINUITY, ...parsed, version: 1 };
  } catch {
    return EMPTY_CONTINUITY;
  }
}

export function saveContinuity(next: Partial<StrateContinuity>) {
  if (!canUseStorage()) return;

  const current = readContinuity();
  const updated: StrateContinuity = {
    ...current,
    ...next,
    updatedAt: next.updatedAt || new Date().toISOString(),
    version: 1,
  };

  try {
    window.localStorage.setItem(CONTINUITY_STORAGE_KEY, JSON.stringify(updated));
  } catch {
    // Continuité non critique : l'app doit rester utilisable même si le stockage est indisponible.
  }
}

export function trackContinuityVisit(pathname: string) {
  const normalized = normalizePath(pathname);
  const current = readContinuity();
  const now = new Date().toISOString();
  const previousPage = current.lastPage && current.lastPage !== normalized ? current.lastPage : current.previousPage;
  const lastChapter = getChapterFromPath(normalized) || current.lastChapter;

  saveContinuity({
    lastChapter,
    lastModule: getModuleLabel(normalized),
    lastPage: normalized,
    lastUsedAt: now,
    previousPage,
    updatedAt: now,
  });
}

export function saveContinuityAction(action: string) {
  if (!action.trim()) return;
  saveContinuity({ lastAction: action.trim(), lastUsedAt: new Date().toISOString() });
}

export function saveContinuityChapter(chapter: string) {
  if (!chapter.trim()) return;
  saveContinuity({ lastChapter: chapter.trim(), lastUsedAt: new Date().toISOString() });
}

export function saveWritingContinuity({
  chapterId,
  chapterLabel,
  position,
  scroll,
  section = "editeur",
}: {
  chapterId: string;
  chapterLabel: string;
  position: number;
  scroll: number;
  section?: string;
}) {
  if (!chapterId.trim() || !chapterLabel.trim()) return;

  const now = new Date().toISOString();
  saveContinuity({
    lastAction: `Continuer ${chapterLabel}`,
    lastChapter: chapterLabel,
    lastChapterId: chapterId,
    lastModule: "Centre",
    lastPage: "/ecrire-maintenant",
    lastPosition: Math.max(0, Math.round(position || 0)),
    lastScroll: Math.max(0, Math.round(scroll || 0)),
    lastSection: section,
    lastUsedAt: now,
    updatedAt: now,
    writingUpdatedAt: now,
  });
}

function getDaysSince(value: string, now: Date) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;

  const diff = now.getTime() - date.getTime();
  if (diff < 0) return 0;

  return Math.floor(diff / 86_400_000);
}

function getElapsedLabel(days: number | null) {
  if (days === null) return "Non renseigné";
  if (days <= 0) return "Aujourd’hui";
  if (days === 1) return "Retour après 1 jour";
  if (days < 7) return `Retour après ${days} jours`;
  if (days < 30) return "Retour après une semaine";
  return "Retour après un mois";
}

function getMeaningfulPage(continuity: StrateContinuity) {
  if (continuity.lastPage === "/centre-de-controle" && continuity.previousPage) return continuity.previousPage;
  return continuity.lastPage || continuity.previousPage || "";
}

function getSuggestedResume(continuity: StrateContinuity, days: number | null, page: string) {
  if (continuity.lastAction) return continuity.lastAction;
  if (continuity.lastChapter && days !== null && days >= 7) return "Relire les deux dernières pages";
  if (continuity.lastChapter) return `Tu travaillais ${continuity.lastChapter}`;
  if (page.includes("manuscrit")) return "Reprendre le manuscrit";
  if (page.includes("audit")) return "Relire les derniers résultats";
  if (page.includes("chronologie")) return "Reprendre la chronologie";
  if (days !== null && days >= 7) return "Relire les deux dernières pages";
  if (page) return `Reprendre ${getContinuityRouteLabel(page)}`;
  return "Ouvrir le Centre";
}

export function getContinuitySummary(continuity = readContinuity(), now = new Date()): ContinuitySummary | null {
  if (!continuity.lastUsedAt && !continuity.lastPage && !continuity.previousPage) return null;

  const meaningfulPage = getMeaningfulPage(continuity);
  const days = getDaysSince(continuity.lastUsedAt || continuity.updatedAt, now);

  return {
    elapsedLabel: getElapsedLabel(days),
    lastActivity: continuity.lastChapter || continuity.lastAction || continuity.lastModule || "Activité récente",
    lastPageLabel: meaningfulPage ? getContinuityRouteLabel(meaningfulPage) : "Non renseigné",
    resumeHref: meaningfulPage || "/centre-de-controle",
    suggestedResume: getSuggestedResume(continuity, days, meaningfulPage),
  };
}
