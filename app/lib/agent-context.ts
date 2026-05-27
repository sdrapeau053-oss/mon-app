// /app/lib/agent-context.ts
// Lit les données du localStorage de ton app et construit le contexte pour l'agent

export interface DailyTask {
  id: string;
  label: string;
  done: boolean;
  category: "freelance" | "menage" | "bio" | "app" | "famille" | "sante" | "autre";
  time?: string;
}

export interface DailyNote {
  id: string;
  content: string;
  timestamp: string;
}

export interface AppContext {
  date: string;
  hardDayMode: boolean;
  progression: number;
  tasks: {
    done: DailyTask[];
    pending: DailyTask[];
  };
  byCategory: {
    freelance: DailyTask[];
    menage: DailyTask[];
    bio: DailyTask[];
    app: DailyTask[];
    famille: DailyTask[];
    sante: DailyTask[];
  };
  notes: DailyNote[];
  rawData?: Record<string, unknown>;
}

const STORAGE_KEYS = {
  tasks: "sylvie_tasks",
  notes: "sylvie_notes",
  hardDayMode: "sylvie_hard_day",
  progression: "sylvie_progression",
  dailyData: "sylvie_daily",
  hubData: "sylvie_hub",
};

export function readAppContext(): AppContext {
  if (typeof window === "undefined") {
    return buildEmptyContext();
  }

  try {
    const rawTasks = safeRead<DailyTask[]>(STORAGE_KEYS.tasks, []);
    const rawNotes = safeRead<DailyNote[]>(STORAGE_KEYS.notes, []);
    const hardDayMode = safeRead<boolean>(STORAGE_KEYS.hardDayMode, false);
    const progression = safeRead<number>(STORAGE_KEYS.progression, 0);
    const hubData = safeRead<Record<string, unknown>>(STORAGE_KEYS.hubData, {});
    const dailyData = safeRead<Record<string, unknown>>(STORAGE_KEYS.dailyData, {});
    const allTasks = rawTasks.length > 0 ? rawTasks : extractTasksFromHub(hubData, dailyData);
    const doneTasks = allTasks.filter((task) => task.done);
    const pendingTasks = allTasks.filter((task) => !task.done);
    const computedProgression =
      allTasks.length > 0 ? Math.round((doneTasks.length / allTasks.length) * 100) : progression;

    return {
      date: new Date().toLocaleDateString("fr-CA"),
      hardDayMode,
      progression: computedProgression,
      tasks: {
        done: doneTasks,
        pending: pendingTasks,
      },
      byCategory: {
        freelance: allTasks.filter((task) => task.category === "freelance"),
        menage: allTasks.filter((task) => task.category === "menage"),
        bio: allTasks.filter((task) => task.category === "bio"),
        app: allTasks.filter((task) => task.category === "app"),
        famille: allTasks.filter((task) => task.category === "famille"),
        sante: allTasks.filter((task) => task.category === "sante"),
      },
      notes: rawNotes,
      rawData: { hubData, dailyData },
    };
  } catch (err) {
    console.error("agent-context: erreur de lecture localStorage", err);
    return buildEmptyContext();
  }
}

export function formatContextForAgent(ctx: AppContext): string {
  const lines: string[] = [];

  lines.push(`=== CONTEXTE APP SYLVIE — ${ctx.date} ===`);
  lines.push(`Mode journée difficile : ${ctx.hardDayMode ? "OUI" : "Non"}`);
  lines.push(`Progression du jour : ${ctx.progression}%`);
  lines.push("");
  lines.push(`TACHES COMPLETEES (${ctx.tasks.done.length}) :`);

  if (ctx.tasks.done.length === 0) {
    lines.push("  — aucune encore");
  } else {
    ctx.tasks.done.forEach((task) => lines.push(`  - [${task.category}] ${task.label}`));
  }

  lines.push("");
  lines.push(`TACHES EN ATTENTE (${ctx.tasks.pending.length}) :`);

  if (ctx.tasks.pending.length === 0) {
    lines.push("  — tout est fait");
  } else {
    ctx.tasks.pending.forEach((task) =>
      lines.push(`  - [${task.category}] ${task.label}${task.time ? ` (${task.time})` : ""}`),
    );
  }

  lines.push("");
  lines.push("PAR BLOC :");

  const categories = [
    { key: "freelance", label: "Freelance" },
    { key: "bio", label: "Biographie" },
    { key: "app", label: "App" },
    { key: "famille", label: "Famille" },
    { key: "menage", label: "Menage" },
    { key: "sante", label: "Sante" },
  ] as const;

  categories.forEach(({ key, label }) => {
    const tasks = ctx.byCategory[key];
    if (tasks.length > 0) {
      const done = tasks.filter((task) => task.done).length;
      lines.push(`  ${label} : ${done}/${tasks.length} completes`);
    }
  });

  if (ctx.notes.length > 0) {
    lines.push("");
    lines.push("NOTES DU JOUR :");
    ctx.notes.forEach((note) => lines.push(`  - ${note.content}`));
  }

  lines.push("");
  lines.push("=== FIN DU CONTEXTE ===");
  return lines.join("\n");
}

function safeRead<T>(key: string, fallback: T): T {
  try {
    const value = localStorage.getItem(key);
    if (!value) return fallback;
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

function extractTasksFromHub(
  hubData: Record<string, unknown>,
  dailyData: Record<string, unknown>,
): DailyTask[] {
  const tasks: DailyTask[] = [];

  [hubData, dailyData].forEach((source) => {
    if (source && Array.isArray(source.tasks)) {
      (source.tasks as DailyTask[]).forEach((task) => tasks.push(task));
    }

    if (source && Array.isArray(source.checklist)) {
      (source.checklist as DailyTask[]).forEach((task) => tasks.push(task));
    }
  });

  return tasks;
}

function buildEmptyContext(): AppContext {
  return {
    date: new Date().toLocaleDateString("fr-CA"),
    hardDayMode: false,
    progression: 0,
    tasks: { done: [], pending: [] },
    byCategory: {
      freelance: [],
      menage: [],
      bio: [],
      app: [],
      famille: [],
      sante: [],
    },
    notes: [],
  };
}
