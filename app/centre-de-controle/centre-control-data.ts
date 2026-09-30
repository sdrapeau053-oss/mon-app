export type DailyTask = {
  id: string;
  label: string;
  done: boolean;
};

export type DailyState = {
  energie: string;
  hardDay: boolean;
  note: string;
  priorite: string;
  tasks: DailyTask[];
};

export type SystemState = {
  energie?: string;
  manuscrit?: string;
  priorite?: string;
};

export type ModuleEntry = {
  id?: number;
  date?: string;
  values?: Record<string, string>;
};

export type TachesMenageresData = {
  statuts?: Record<string, "non-fait" | "fait" | "reporte">;
};

export const NORMAL_TASKS: DailyTask[] = [
  { id: "matin-fille", label: "Fille prête, école", done: false },
  { id: "matin-reset", label: "Reset personnel — café, silence", done: false },
  { id: "corps-mouvement", label: "Mouvement ou marche", done: false },
  { id: "corps-soin", label: "Soins, repas, hydratation", done: false },
  { id: "manuscrit-ecriture", label: "Écrire ou réviser", done: false },
  { id: "manuscrit-fragment", label: "Ancrer un fragment", done: false },
  { id: "freelance-action", label: "Une action client ou prospect", done: false },
  { id: "freelance-contenu", label: "Publier ou préparer contenu", done: false },
  { id: "maison-essentiel", label: "Tâche essentielle du jour", done: false },
  { id: "soir-famille", label: "Temps famille — présente", done: false },
  { id: "soir-fermeture", label: "Fermer la journée sans culpabilité", done: false },
];

export const HARD_DAY_TASKS: DailyTask[] = [
  { id: "hard-corps", label: "Nourrir et hydrater le corps", done: false },
  { id: "hard-action", label: "Une seule micro-action utile", done: false },
  { id: "hard-soir", label: "Fermer la journée sans culpabilité", done: false },
];

export const HOUSE_TASK_COUNT = 17;
export const AUTHOR_WEEKLY_GOAL_KEY = "auteur-objectif-semaine";

export const quickLinks = [
  { href: "/ecrire-maintenant", label: "Écrire" },
  { href: "/manuscrit", label: "Manuscrit" },
  { href: "/daily-system", label: "Daily" },
  { href: "/life-operating-system", label: "Life OS" },
  { href: "/malika", label: "Malika" },
  { href: "/urgence-malika", label: "Urgence Malika" },
  { href: "/taches-menageres", label: "Maison" },
  { href: "/aide-memoire", label: "Aide mémoire" },
];

export const defaultDailyState: DailyState = {
  energie: "",
  hardDay: false,
  note: "",
  priorite: "",
  tasks: NORMAL_TASKS,
};

function todayKey() {
  return `daily-system-${new Date().toLocaleDateString("fr-CA")}`;
}

export function parseJson<T>(key: string, fallback: T): T {
  try {
    const saved = localStorage.getItem(key);
    return saved ? ({ ...fallback, ...JSON.parse(saved) } as T) : fallback;
  } catch {
    return fallback;
  }
}

export function readDailyState(): DailyState {
  const saved = parseJson<Partial<DailyState>>(todayKey(), {});
  const hardDay = Boolean(saved.hardDay);
  const template = hardDay ? HARD_DAY_TASKS : NORMAL_TASKS;
  const savedTasks = Array.isArray(saved.tasks) ? saved.tasks : [];

  return {
    energie: saved.energie || "",
    hardDay,
    note: saved.note || "",
    priorite: saved.priorite || "",
    tasks: template.map((task) => ({
      ...task,
      done: Boolean(savedTasks.find((savedTask) => savedTask.id === task.id)?.done),
    })),
  };
}

export function readEntries(key: string): ModuleEntry[] {
  try {
    const saved = localStorage.getItem(key);
    const parsed = saved ? JSON.parse(saved) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function getHouseStats() {
  const data = parseJson<TachesMenageresData>("taches-menageres-data", { statuts: {} });
  const statuses = Object.values(data.statuts || {});
  const done = statuses.filter((status) => status === "fait").length;
  const remaining = Math.max(HOUSE_TASK_COUNT - done, 0);

  return { done, remaining, total: HOUSE_TASK_COUNT };
}

export function isDoneStatus(value: string) {
  const normalized = value.toLowerCase();
  return (
    normalized.includes("fait") ||
    normalized.includes("stable") ||
    normalized.includes("termin") ||
    normalized.includes("compl")
  );
}

export function isUrgencyActive(entry: ModuleEntry) {
  const values = Object.values(entry.values || {}).join(" ").toLowerCase();

  if (!values.trim()) return false;
  if (isDoneStatus(values)) return false;

  return (
    values.includes("urgent") ||
    values.includes("critique") ||
    values.includes("élev") ||
    values.includes("risque") ||
    values.includes("crise")
  );
}

export function formatValue(value: string, fallback = "Non renseigné") {
  return value.trim() || fallback;
}

export function labelFromChapterId(chapterId: string) {
  if (!chapterId) return "Aucun";
  const number = chapterId.match(/\d+/)?.[0];
  return number ? `Chapitre ${number}` : chapterId;
}

export function getNextAction({
  criticalTask,
  daily,
  houseRemaining,
}: {
  criticalTask: string;
  daily: DailyState;
  houseRemaining: number;
}) {
  const priority = daily.priorite.toLowerCase();
  const energy = daily.energie.toLowerCase();

  if (daily.hardDay || energy.includes("fatigue")) return "repos recommandé";
  if (criticalTask.toLowerCase().includes("reset") || criticalTask.toLowerCase().includes("fille")) {
    return "terminer routine matin";
  }
  if (priority.includes("écrire") || priority.includes("ecrire") || priority.includes("manuscrit")) {
    return "écrire 15 minutes";
  }
  if (houseRemaining > 0) return "faire une tâche maison";
  return criticalTask || "écrire 15 minutes";
}

export function getActionList({
  criticalTask,
  daily,
  houseRemaining,
}: {
  criticalTask: string;
  daily: DailyState;
  houseRemaining: number;
}) {
  const primary = getNextAction({ criticalTask, daily, houseRemaining });
  const actions = [primary];

  if (!actions.includes("écrire 15 minutes")) actions.push("écrire 15 minutes");
  if (houseRemaining > 0 && !actions.includes("faire une tâche maison")) actions.push("faire une tâche maison");
  if ((daily.hardDay || daily.energie.toLowerCase().includes("fatigue")) && !actions.includes("repos recommandé")) {
    actions.push("repos recommandé");
  }

  return actions.slice(0, 3);
}
