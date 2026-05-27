export type OrchestratorTask = {
  id: string;
  label: string;
  done: boolean;
};

export type SystemOrchestratorInput = {
  dailyTasks: OrchestratorTask[];
  energy?: string;
  hardDay?: boolean;
  houseRemaining?: number;
  manuscriptProgress?: number;
  priority?: string;
  routinesDone?: number;
  urgenciesActive?: number;
};

export type SystemOrchestratorState = {
  surcharge: "Basse" | "Légère" | "Haute";
  energie: string;
  modeFocus: boolean;
  journeeDifficile: boolean;
  urgenceActive: boolean;
  sourceUrgence?: "malika";
  updatedAt?: string;
  mode: "Stable" | "Fatigue élevée" | "Journée lourde" | "Dispersion" | "Mode essentiel";
  stabilizationMode: boolean;
  indicators: Array<{ label: string; value: string }>;
  recommendation: {
    primary: string;
    secondary: string[];
  };
  suggestions: string[];
  focusPriority: string;
  focusActions: string[];
};

export type CentreQuickSettings = {
  priorite: string;
  energie: string;
  actionCritique: string;
  noteRapide: string;
  prochaineAction: string;
  updatedAt: string;
};

export type EmergencySignalState = {
  active: boolean;
  latestDate: string;
  sourceUrgence: "malika";
};

export const SYSTEM_ORCHESTRATOR_STATE_KEY = "strate-system-orchestrator-state";
export const SYSTEM_GLOBAL_STATE_KEY = "system-global-state";
export const SYSTEM_ORCHESTRATOR_HARD_DAY_KEY = "strate-system-journee-difficile";
export const CENTRE_QUICK_SETTINGS_KEY = "centre-controle-quick-settings";

const emptyState: SystemOrchestratorState = {
  surcharge: "Basse",
  energie: "",
  modeFocus: false,
  journeeDifficile: false,
  urgenceActive: false,
  mode: "Stable",
  stabilizationMode: false,
  indicators: [
    { label: "Surcharge", value: "Basse" },
    { label: "Stabilité", value: "Stable" },
    { label: "Fatigue", value: "À observer" },
    { label: "Concentration", value: "Disponible" },
  ],
  recommendation: {
    primary: "écrire 15 minutes",
    secondary: [],
  },
  suggestions: ["écrire 15 minutes"],
  focusPriority: "stabiliser la journée",
  focusActions: ["écrire 15 minutes"],
};

export const emptyCentreQuickSettings: CentreQuickSettings = {
  priorite: "",
  energie: "",
  actionCritique: "",
  noteRapide: "",
  prochaineAction: "",
  updatedAt: "",
};

function unique(items: string[]) {
  return Array.from(new Set(items.filter(Boolean)));
}

function includesAny(value: string, patterns: string[]) {
  const normalized = value.toLowerCase();
  return patterns.some((pattern) => normalized.includes(pattern));
}

export function buildSystemOrchestratorState(input: SystemOrchestratorInput): SystemOrchestratorState {
  const dailyRemaining = input.dailyTasks.filter((task) => !task.done).length;
  const houseRemaining = Math.max(input.houseRemaining ?? 0, 0);
  const taskVolume = dailyRemaining + houseRemaining;
  const weightedLoad = dailyRemaining * 0.55 + houseRemaining * 0.18;
  const energy = input.energy || "";
  const fatigueHigh = Boolean(input.hardDay) || includesAny(energy, ["fatigue", "basse", "épuis", "epuis"]);
  const urgenceActive = (input.urgenciesActive ?? 0) > 0;
  const highOverload = weightedLoad >= 11;
  const lightOverload = weightedLoad >= 5 || taskVolume >= 12;
  const dispersed = weightedLoad >= 7 && (input.manuscriptProgress ?? 0) === 0 && (input.routinesDone ?? 0) === 0;
  const journeeDifficile = Boolean(input.hardDay) || fatigueHigh || urgenceActive;
  const surcharge = urgenceActive || fatigueHigh || highOverload ? "Haute" : lightOverload ? "Légère" : "Basse";
  const mode = journeeDifficile
    ? "Mode essentiel"
    : fatigueHigh
      ? "Fatigue élevée"
      : surcharge === "Haute"
        ? "Journée lourde"
        : dispersed
          ? "Dispersion"
          : surcharge === "Légère"
            ? "Journée lourde"
            : "Stable";
  const concentration = journeeDifficile || fatigueHigh
    ? "Courte"
    : urgenceActive
      ? "Stabilisation"
      : (input.manuscriptProgress ?? 0) > 0
        ? "Disponible"
        : "À lancer doucement";
  const stability = journeeDifficile
    ? "Essentiel"
    : urgenceActive
      ? "Stabilisation"
      : (input.routinesDone ?? 0) >= 2 || dailyRemaining <= 3
        ? "Stable"
        : "À consolider";
  const fatigue = fatigueHigh || journeeDifficile ? "Élevée" : includesAny(energy, ["haute"]) ? "Basse" : "À observer";
  const firstOpenTask = input.dailyTasks.find((task) => !task.done)?.label || "";
  const stabilizationMode = urgenceActive;
  const modeFocus = surcharge === "Haute" || dispersed || journeeDifficile;
  const primaryRecommendation = urgenceActive
    ? "priorité du moment"
    : journeeDifficile
      ? "mode essentiel"
      : surcharge === "Haute"
        ? "alléger la journée"
        : dispersed
          ? "choisir une seule priorité"
          : input.priority?.trim() || firstOpenTask || "écrire 15 minutes";
  const secondaryActions = unique([
    urgenceActive ? "ouvrir le plan d’urgence" : "",
    journeeDifficile ? "prioriser récupération" : "",
    modeFocus ? "garder une seule priorité" : "",
    surcharge === "Haute" ? "alléger la journée" : "",
    surcharge === "Haute" ? "pause recommandée" : "",
    (input.routinesDone ?? 0) === 0 ? "terminer routine matin" : "",
    firstOpenTask,
    !fatigueHigh && !urgenceActive ? "écrire 15 minutes" : "",
    houseRemaining > 0 && !journeeDifficile ? "faire une tâche maison" : "",
  ].filter((action) => action !== primaryRecommendation)).slice(0, 3);
  const suggestions = unique([primaryRecommendation, ...secondaryActions]).slice(0, 4);
  const focusPriority = primaryRecommendation;

  return {
    surcharge,
    energie: energy,
    modeFocus,
    journeeDifficile,
    urgenceActive,
    mode,
    stabilizationMode,
    indicators: [
      { label: "Surcharge", value: surcharge },
      { label: "Stabilité", value: stability },
      { label: "Fatigue", value: fatigue },
      { label: "Concentration", value: concentration },
    ],
    recommendation: {
      primary: primaryRecommendation,
      secondary: secondaryActions,
    },
    suggestions,
    focusPriority,
    focusActions: secondaryActions,
  };
}

export function readStoredOrchestratorState() {
  if (typeof window === "undefined") return emptyState;

  try {
    const saved = localStorage.getItem(SYSTEM_GLOBAL_STATE_KEY) || localStorage.getItem(SYSTEM_ORCHESTRATOR_STATE_KEY);
    const legacyHardDay = localStorage.getItem(SYSTEM_ORCHESTRATOR_HARD_DAY_KEY) === "1";
    const parsed = saved ? JSON.parse(saved) : {};
    return {
      ...emptyState,
      ...parsed,
      journeeDifficile: Boolean(parsed.journeeDifficile || legacyHardDay),
      recommendation: {
        ...emptyState.recommendation,
        ...(parsed.recommendation || {}),
      },
    } as SystemOrchestratorState;
  } catch {
    return emptyState;
  }
}

export function saveStoredOrchestratorState(state: SystemOrchestratorState) {
  if (typeof window === "undefined") return;

  const current = readStoredOrchestratorState();
  const next = {
    ...current,
    ...state,
    updatedAt: new Date().toISOString(),
  };

  localStorage.setItem(SYSTEM_ORCHESTRATOR_STATE_KEY, JSON.stringify(next));
  localStorage.setItem(SYSTEM_GLOBAL_STATE_KEY, JSON.stringify(next));
}

function readStorageEntries(key: string): Array<{ date?: string; values?: Record<string, string> }> {
  if (typeof window === "undefined") return [];

  try {
    const saved = localStorage.getItem(key);
    const parsed = saved ? JSON.parse(saved) : [];

    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function isRecentDate(value: string) {
  const normalized = value.replace(" ", "T");
  const timestamp = Date.parse(normalized);

  if (Number.isNaN(timestamp)) return false;

  const threeDays = 1000 * 60 * 60 * 24 * 3;

  return Date.now() - timestamp <= threeDays;
}

function hasEmergencySignal(entry: { date?: string; values?: Record<string, string> }) {
  const values = Object.values(entry.values || {}).join(" ").toLowerCase();
  const hasStrongSignal =
    values.includes("urgent") ||
    values.includes("urgence") ||
    values.includes("critique") ||
    values.includes("élev") ||
    values.includes("elev") ||
    values.includes("crise") ||
    values.includes("risque") ||
    values.includes("sécurité") ||
    values.includes("securite") ||
    values.includes("escalade");

  return hasStrongSignal || Boolean(entry.date && values.trim() && isRecentDate(entry.date));
}

export function detectMalikaEmergencySignal(): EmergencySignalState {
  const entries = [
    ...readStorageEntries("system-urgence-malika"),
    ...readStorageEntries("system-malika"),
  ];
  const signalEntries = entries.filter(hasEmergencySignal);
  const latestDate = signalEntries
    .map((entry) => entry.date || "")
    .filter(Boolean)
    .sort((a, b) => b.localeCompare(a))[0] || "";

  return {
    active: signalEntries.length > 0,
    latestDate,
    sourceUrgence: "malika",
  };
}

export function saveMalikaEmergencySignal(signal: EmergencySignalState) {
  if (typeof window === "undefined") return;

  const current = readStoredOrchestratorState();
  const next: SystemOrchestratorState = {
    ...current,
    sourceUrgence: "malika",
    updatedAt: new Date().toISOString(),
    urgenceActive: signal.active,
  };

  localStorage.setItem(SYSTEM_GLOBAL_STATE_KEY, JSON.stringify(next));
}

export function readCentreQuickSettings() {
  if (typeof window === "undefined") return emptyCentreQuickSettings;

  try {
    const saved = localStorage.getItem(CENTRE_QUICK_SETTINGS_KEY);
    return saved
      ? ({ ...emptyCentreQuickSettings, ...JSON.parse(saved) } as CentreQuickSettings)
      : emptyCentreQuickSettings;
  } catch {
    return emptyCentreQuickSettings;
  }
}

export function saveCentreQuickSettings(settings: CentreQuickSettings) {
  if (typeof window === "undefined") return;

  localStorage.setItem(CENTRE_QUICK_SETTINGS_KEY, JSON.stringify(settings));
}

export function readGlobalHardDayPreference() {
  if (typeof window === "undefined") return false;

  return readStoredOrchestratorState().journeeDifficile;
}

export function saveGlobalHardDayPreference(value: boolean) {
  if (typeof window === "undefined") return;

  const current = readStoredOrchestratorState();
  saveStoredOrchestratorState({
    ...current,
    journeeDifficile: value,
  });

  if (value) {
    localStorage.setItem(SYSTEM_ORCHESTRATOR_HARD_DAY_KEY, "1");
  } else {
    localStorage.removeItem(SYSTEM_ORCHESTRATOR_HARD_DAY_KEY);
  }
}
