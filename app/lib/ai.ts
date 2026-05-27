import type {
  AnalysisResult,
  CandidateResult,
  RecommendedModule,
  SessionContext,
  UserProfile,
} from "@/app/lib/types";

function includesAny(text: string, words: string[]) {
  const lower = text.toLowerCase();
  return words.some((word) => lower.includes(word));
}

export function routeInput(input: string, _userProfile?: UserProfile | null): RecommendedModule {
  if (includesAny(input, ["rester", "partir", "continuer", "quitter", "détacher", "leave", "stay"])) {
    return "DECISION";
  }

  if (includesAny(input, ["peur", "trauma", "passé", "bad experience", "not trust", "projection", "méfie"])) {
    return "SAFETY";
  }

  if (includesAny(input, ["pourquoi", "why", "agit", "comportement", "répond", "distance"])) {
    return "UNDERSTANDING";
  }

  return "CLARITY";
}

export function runCoreAnalysis(input: string, _userProfile?: UserProfile | null): AnalysisResult {
  const lower = input.toLowerCase();
  const inconsistent = includesAny(lower, ["silence", "chaud froid", "incohérent", "ghost", "mixed", "flou"]);
  const highRisk = includesAny(lower, ["mensonge", "insulte", "menace", "violence", "toxique", "toxic"]);

  return {
    signal: inconsistent ? "incohérent" : "flou",
    intent: highRisk ? "désalignée" : "incertaine",
    risk: highRisk ? "élevé" : "modéré",
    userPattern: "tu analyses pour te rassurer",
    action: "ralentis, observe ses actes, ne comble pas le flou",
    confidence: input.length > 260 ? "medium" : "low",
  };
}

export function createSessionContext(result: AnalysisResult, recommended: RecommendedModule): SessionContext {
  return {
    signal: result.signal === "incohérent" ? "inconsistent" : "unclear",
    intent: result.intent === "désalignée" ? "misaligned" : "uncertain",
    risk: result.risk === "élevé" ? "high" : "medium",
    confidence: result.confidence === "medium" ? "medium" : "low",
    userPattern: result.userPattern,
    modulesRun: [],
    summary: `Core done. Recommended: ${recommended}.`,
  };
}

export function runUnderstandModule(_input: string, session: SessionContext, _profile?: UserProfile | null) {
  return {
    title: "Ce qui se passe vraiment",
    sections: [
      ["TOI", ["Ton mécanisme activé : analyse pour retrouver de la sécurité.", "Ton point fort : tu repères l’incohérence.", "Ton point faible : tu remplis le flou à sa place."]],
      ["LUI", [`Son comportement observable : ${session.signal}.`, `Son niveau de cohérence : ${session.intent}.`, "Son impact sur toi : tension et attente."]],
      ["DYNAMIQUE", ["Vous créez une boucle flou → analyse → attente.", "Risque principal : t’attacher à une possibilité, pas à des actes."]],
      ["VÉRITÉ", ["Tu confonds peut-être intensité et stabilité."]],
      ["ACTION", ["Observe sans interpréter pendant 7 jours."]],
    ],
  };
}

export function runDecisionModule(_input: string, session: SessionContext, _profile?: UserProfile | null) {
  const verdict = session.risk === "high"
    ? "Te retirer est plus protecteur tant que les actes restent incohérents."
    : "Rester seulement si les actes deviennent cohérents rapidement.";

  return {
    title: "Ce que cette relation te coûte",
    sections: [
      ["SI TU RESTES", ["doute constant", "adaptation", "fatigue émotionnelle"]],
      ["SI TU PARS", ["inconfort court terme", "clarté", "reprise de contrôle"]],
      ["VERDICT", [verdict]],
      ["ACTION", ["Ne t’investis pas davantage pour l’instant."]],
    ],
  };
}

export function runSafetyModule(_input: string, session: SessionContext, _profile?: UserProfile | null) {
  return {
    title: "Est-ce lui… ou ta peur ?",
    sections: [
      ["CE QUE TU VIS", ["Tu veux te protéger. Tu anticipes une déception."]],
      ["RISQUE", [session.confidence === "low" ? "Tu peux projeter ton passé sur quelqu’un qui n’a pas encore fauté." : "Le risque vient surtout de l’incohérence actuelle."]],
      ["VÉRITÉ", ["Tu n’as pas à baisser ta garde. Tu dois apprendre à la régler."]],
      ["ACTION", ["Ralentis sans fermer. Observe sans accuser."]],
    ],
  };
}

export function runCandidateAnalysis(_input: string, _profile?: UserProfile | null): CandidateResult {
  return {
    compatibility: 7,
    emotionalRisk: "modéré",
    triggeredPattern: "peur de l’incohérence",
    verdict: "candidat à observer",
    action: "attends des preuves de constance avant de t’investir",
  };
}
