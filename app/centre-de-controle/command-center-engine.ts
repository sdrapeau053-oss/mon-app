import type {
  ActionWeight,
  CognitiveState,
  CommandAction,
  CommandCenterInput,
  CommandCenterState,
  CommandMode,
  DomainLoad,
  IgnoredAction,
  MentalLoadDomain,
  MentalLoadLevel,
} from "./command-center-types";
import { BRAIN_FOG_CAUSE_LABELS } from "./brain-fog-types";

const lightActions: CommandAction[] = [
  {
    domain: "Santé",
    id: "hydrate-rest",
    label: "Boire, manger, respirer cinq minutes",
    reason: "Action légère compatible avec une énergie basse.",
    weight: "light",
  },
  {
    domain: "Écriture",
    id: "write-15",
    label: "Écrire 15 minutes",
    reason: "Action courte qui rapproche du manuscrit sans surcharge.",
    weight: "light",
  },
  {
    domain: "Maison",
    id: "one-house-task",
    label: "Faire une seule tâche maison",
    reason: "Réduit la charge domestique sans ouvrir un grand chantier.",
    weight: "light",
  },
  {
    domain: "Santé",
    id: "name-avoided-task",
    label: "Nommer la tâche évitée — pas la faire",
    reason: "Sortir la tension d'évitement sans obligation d'exécuter.",
    weight: "light",
  },
  {
    domain: "Développement",
    id: "one-thing-only",
    label: "Choisir une seule chose et fermer le reste",
    reason: "Réduire les entrées cognitives actives.",
    weight: "light",
  },
];

const normalActions: CommandAction[] = [
  ...lightActions,
  {
    domain: "Freelance",
    id: "freelance-followup",
    label: "Faire une action candidature ou client",
    reason: "Maintient le pipeline sans disperser la journée.",
    weight: "medium",
  },
  {
    domain: "Développement",
    id: "daily-routine",
    label: "Compléter une routine utile",
    reason: "Stabilise le système sans créer de nouveau module.",
    weight: "medium",
  },
  {
    domain: "Écriture",
    id: "deep-writing",
    label: "Avancer le manuscrit en profondeur",
    reason: "Action lourde réservée aux journées stables.",
    weight: "heavy",
  },
];

export function calculateCognitiveState(input: CommandCenterInput): CognitiveState {
  if (input.urgencyActive) return "En crise";
  if (input.brainFogScore !== undefined && input.brainFogScore >= 7) return "En crise";
  if (input.brainFogScore !== undefined && input.brainFogScore >= 5) return "Surchargé";
  if (input.hardDay && isExhausted(input.energy)) return "En crise";
  if (input.hardDay) return "Fragile";
  if (isExhausted(input.energy)) return "Surchargé";
  if (calculateHighestLoad(input) === "Haute") return "Surchargé";
  if (calculateHighestLoad(input) === "Critique") return "En crise";
  if (input.dailyRemaining >= 8 || input.houseRemaining >= 12) return "Fragile";
  if (input.dailyRemaining <= 2 && input.houseRemaining <= 4) return "Optimal";
  return "Stable";
}

export function calculateMode(input: CommandCenterInput, cognitiveState = calculateCognitiveState(input)): CommandMode {
  if (cognitiveState === "En crise") return "Survie";
  if (input.hardDay) return "Essentiel";
  if (isExhausted(input.energy)) return "Essentiel";
  if (cognitiveState === "Surchargé") return "Essentiel";
  return "Normal";
}

export function calculateDomainLoads(input: CommandCenterInput): DomainLoad[] {
  return [
    domainLoad("IVAC", input.urgencyActive ? "Critique" : "Basse", input.urgencyActive ? "Urgence active détectée." : "Aucune urgence active."),
    domainLoad("Santé", input.hardDay || isExhausted(input.energy) ? "Haute" : "Modérée", input.energy || "Énergie non renseignée."),
    domainLoad("Finances", input.freelanceApplications > 0 ? "Modérée" : "Basse", "Aucune pression financière directe détectée ici."),
    domainLoad("Écriture", input.priority.toLowerCase().includes("écrire") ? "Haute" : "Modérée", `${input.manuscriptProgress}% manuscrit.`),
    domainLoad("Freelance", input.freelanceApplications > 0 ? "Modérée" : "Basse", `${input.freelanceApplications} candidature(s).`),
    domainLoad("Maison", input.houseRemaining >= 10 ? "Haute" : input.houseRemaining >= 5 ? "Modérée" : "Basse", `${input.houseRemaining} tâche(s) restantes.`),
    domainLoad("Développement", input.routinesTotal > input.routinesDone ? "Modérée" : "Basse", `${input.routinesDone}/${input.routinesTotal} routines.`),
  ];
}

export function calculatePriorityAction(input: CommandCenterInput, mode = calculateMode(input)): CommandAction {
  if (input.urgencyActive) {
    return {
      domain: "IVAC",
      id: "handle-urgency",
      label: "Traiter l’urgence active",
      reason: "urgenceActive est prioritaire sur tout le reste.",
      weight: "light",
    };
  }
  if (input.brainFogCause === "evitement_emotionnel") return getLightAction("name-avoided-task");
  if (input.brainFogCause === "surcharge_cognitive") return getLightAction("one-thing-only");
  if (mode === "Survie") return lightActions[0];
  if (input.hardDay || isExhausted(input.energy)) return lightActions[0];
  if (input.priority.toLowerCase().includes("écrire")) return lightActions[1];
  if (input.houseRemaining > 0) return lightActions[2];
  return normalActions[1];
}

export function calculateNextActions(input: CommandCenterInput, primaryAction: CommandAction, mode = calculateMode(input)): CommandAction[] {
  const allowedWeights: ActionWeight[] = mode === "Survie" ? ["light"] : mode === "Essentiel" ? ["light", "medium"] : ["light", "medium", "heavy"];
  return normalActions
    .filter((action) => action.id !== primaryAction.id)
    .filter((action) => allowedWeights.includes(action.weight))
    .slice(0, mode === "Survie" ? 2 : 3);
}

export function calculateIgnoredActions(input: CommandCenterInput, mode = calculateMode(input)): IgnoredAction[] {
  if (mode === "Normal") return [];
  return normalActions
    .filter((action) => mode === "Survie" ? action.weight !== "light" : action.weight === "heavy")
    .map((action) => ({
      action,
      reason: mode === "Survie" ? "Ignorée aujourd’hui : aucune action lourde en mode Survie." : "Ignorée aujourd’hui : simplification demandée.",
    }));
}

export function buildCommandCenterState(input: CommandCenterInput): CommandCenterState {
  const cognitiveState = calculateCognitiveState(input);
  const mode = calculateMode(input, cognitiveState);
  const primaryAction = calculatePriorityAction(input, mode);
  return {
    brainFogSummary:
      input.brainFogScore !== undefined && input.brainFogCause
        ? {
            score: input.brainFogScore,
            causePrincipale: input.brainFogCause,
            causeLabel: BRAIN_FOG_CAUSE_LABELS[input.brainFogCause],
            isRecent: true,
          }
        : undefined,
    cognitiveState,
    domainLoads: calculateDomainLoads(input),
    ignoredToday: calculateIgnoredActions(input, mode),
    mode,
    nextActions: calculateNextActions(input, primaryAction, mode),
    primaryAction,
    priorityReason: primaryAction.reason,
  };
}

function calculateHighestLoad(input: CommandCenterInput): MentalLoadLevel {
  const loads = [
    input.urgencyActive ? "Critique" : "Basse",
    input.houseRemaining >= 10 ? "Haute" : "Basse",
    input.dailyRemaining >= 8 ? "Haute" : "Basse",
  ] satisfies MentalLoadLevel[];
  if (loads.includes("Critique")) return "Critique";
  if (loads.includes("Haute")) return "Haute";
  return "Basse";
}

function domainLoad(domain: MentalLoadDomain, level: MentalLoadLevel, reason: string): DomainLoad {
  return { domain, level, reason };
}

function getLightAction(id: string) {
  return lightActions.find((action) => action.id === id) || lightActions[0];
}

function isExhausted(energy: string) {
  const normalized = energy.toLowerCase();
  return normalized.includes("épuis") || normalized.includes("epuis") || normalized.includes("fatigue") || normalized.includes("vide");
}
