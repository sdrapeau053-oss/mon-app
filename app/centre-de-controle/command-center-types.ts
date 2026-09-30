import type { BrainFogCause } from "./brain-fog-types";

export type CognitiveState = "Optimal" | "Stable" | "Fragile" | "Surchargé" | "En crise";

export type CommandMode = "Normal" | "Essentiel" | "Survie";

export type MentalLoadDomain =
  | "IVAC"
  | "Santé"
  | "Finances"
  | "Écriture"
  | "Freelance"
  | "Maison"
  | "Développement";

export type MentalLoadLevel = "Basse" | "Modérée" | "Haute" | "Critique";

export type ActionWeight = "light" | "medium" | "heavy";

export type CommandCenterInput = {
  brainFogCause?: BrainFogCause;
  brainFogScore?: number;
  criticalTask: string;
  dailyRemaining: number;
  energy: string;
  freelanceApplications: number;
  hardDay: boolean;
  houseRemaining: number;
  manuscriptProgress: number;
  priority: string;
  routinesDone: number;
  routinesTotal: number;
  urgencyActive: boolean;
};

export type DomainLoad = {
  domain: MentalLoadDomain;
  level: MentalLoadLevel;
  reason: string;
};

export type CommandAction = {
  domain: MentalLoadDomain;
  id: string;
  label: string;
  reason: string;
  weight: ActionWeight;
};

export type IgnoredAction = {
  action: CommandAction;
  reason: string;
};

export type BrainFogCommandSummary = {
  causeLabel: string;
  causePrincipale: BrainFogCause;
  isRecent: boolean;
  score: number;
};

export type CommandCenterState = {
  brainFogSummary?: BrainFogCommandSummary;
  cognitiveState: CognitiveState;
  domainLoads: DomainLoad[];
  ignoredToday: IgnoredAction[];
  mode: CommandMode;
  nextActions: CommandAction[];
  primaryAction: CommandAction;
  priorityReason: string;
};

export type StoredCommandCenterState = {
  updatedAt: string;
  state: CommandCenterState;
};
