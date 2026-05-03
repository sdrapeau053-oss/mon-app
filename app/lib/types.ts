export type Lang = "fr" | "en";

export type UserProfile = {
  values: string[];
  relationshipGoal: string;
  pastPatterns: string[];
  triggers: string[];
  nonNegotiables: string[];
};

export type SessionContext = {
  signal: "consistent" | "inconsistent" | "unclear";
  intent: "aligned" | "misaligned" | "uncertain";
  risk: "low" | "medium" | "high" | "toxic";
  confidence: "low" | "medium" | "high";
  userPattern: string;
  modulesRun: string[];
  summary: string;
};

export type AnalysisResult = {
  signal: string;
  intent: string;
  risk: string;
  userPattern: string;
  action: string;
  confidence: string;
};

export type CandidateResult = {
  compatibility: number;
  emotionalRisk: string;
  triggeredPattern: string;
  verdict: string;
  action: string;
};

export type ModuleType = "understand" | "decision" | "safety";

export type RecommendedModule = "CLARITY" | "DECISION" | "SAFETY" | "UNDERSTANDING";

export type HistoryEntry = {
  id: number;
  date: string;
  conversation: string;
  result: AnalysisResult;
  sessionContext: SessionContext;
  recommendedModule: RecommendedModule;
};
