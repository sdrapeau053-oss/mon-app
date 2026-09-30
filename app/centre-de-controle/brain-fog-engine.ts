// ─── Brain Fog Engine ────────────────────────────────────────────────────────
// Fonctions pures. Aucun accès localStorage ici.
// Aucun diagnostic médical — formulations prudentes et non-cliniques.

import type {
  BrainFogAnalysis,
  BrainFogCause,
  BrainFogConfidence,
  BrainFogIntervention,
  BrainFogSignal,
  BrainFogSignalKey,
} from "./brain-fog-types";

// ─── Constantes internes ─────────────────────────────────────────────────────

/** Poids de chaque signal dans le score global (somme = 1.0) */
const SCORE_WEIGHTS: Record<BrainFogSignalKey, number> = {
  sommeil:               0.20,
  stress:                0.15,
  anxiete:               0.12,
  surcharge_emotionnelle:0.10,
  tristesse:             0.10,
  rumination:            0.08,
  tache_evitee:          0.08,
  douleur_physique:      0.07,
  hydratation:           0.04,
  alimentation:          0.04,
  medication:            0.02,
  urgence_presente:      0.00, // amplificateur, pas contributeur direct
};

/**
 * Contribution de chaque signal à chaque cause.
 * Valeur : poids relatif dans le sous-score de cette cause.
 */
type CauseWeightMap = Partial<Record<BrainFogSignalKey, number>>;

const CAUSE_WEIGHTS: Record<BrainFogCause, CauseWeightMap> = {
  fatigue_physiologique: {
    sommeil:         0.50,
    douleur_physique:0.25,
    hydratation:     0.15,
    alimentation:    0.10,
  },
  surcharge_cognitive: {
    surcharge_emotionnelle: 0.40,
    rumination:             0.35,
    tache_evitee:           0.25,
  },
  anxiete: {
    anxiete:          0.45,
    stress:           0.30,
    urgence_presente: 0.25,
  },
  depression: {
    tristesse:              0.50,
    tache_evitee:           0.30,
    surcharge_emotionnelle: 0.20,
  },
  evitement_emotionnel: {
    tache_evitee: 0.50,
    rumination:   0.30,
    tristesse:    0.20,
  },
  traumatisme_active: {
    surcharge_emotionnelle: 0.35,
    anxiete:                0.25,
    urgence_presente:       0.25,
    tristesse:              0.15,
  },
  // combinaison_facteurs est détecté par algo, pas par poids
  combinaison_facteurs: {},
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getSignalValue(signals: BrainFogSignal[], key: BrainFogSignalKey): number {
  return signals.find((s) => s.key === key)?.value ?? 0;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

// ─── Score global (0–10) ─────────────────────────────────────────────────────

export function calculateBrainFogScore(signals: BrainFogSignal[]): number {
  let raw = 0;

  for (const signal of signals) {
    const weight = SCORE_WEIGHTS[signal.key] ?? 0;
    raw += (signal.value / 4) * weight;
  }

  // raw est entre 0 et 1 → multiplier par 10
  let score = raw * 10;

  // Amplification si urgence active et significative
  const urgence = getSignalValue(signals, "urgence_presente");
  if (urgence >= 2) {
    score *= 1.0 + (urgence - 1) * 0.10; // +10% ou +20%
  }

  return Math.round(clamp(score, 0, 10) * 10) / 10;
}

// ─── Sous-scores par cause ────────────────────────────────────────────────────

function calculateCauseSubscore(
  signals: BrainFogSignal[],
  cause: Exclude<BrainFogCause, "combinaison_facteurs">,
): number {
  const weights = CAUSE_WEIGHTS[cause];
  let subscore = 0;

  for (const [key, weight] of Object.entries(weights) as [BrainFogSignalKey, number][]) {
    const value = getSignalValue(signals, key);
    subscore += (value / 4) * weight;
  }

  // Retourner sur une échelle 0–4 pour faciliter les seuils
  return subscore * 4;
}

type CauseSubscores = Record<Exclude<BrainFogCause, "combinaison_facteurs">, number>;

function buildCauseSubscores(signals: BrainFogSignal[]): CauseSubscores {
  return {
    fatigue_physiologique: calculateCauseSubscore(signals, "fatigue_physiologique"),
    surcharge_cognitive:   calculateCauseSubscore(signals, "surcharge_cognitive"),
    anxiete:               calculateCauseSubscore(signals, "anxiete"),
    depression:            calculateCauseSubscore(signals, "depression"),
    evitement_emotionnel:  calculateCauseSubscore(signals, "evitement_emotionnel"),
    traumatisme_active:    calculateCauseSubscore(signals, "traumatisme_active"),
  };
}

// ─── Cause principale et secondaires ─────────────────────────────────────────

export function detectPrimaryCause(signals: BrainFogSignal[]): BrainFogCause {
  const subscores = buildCauseSubscores(signals);

  const sorted = (Object.entries(subscores) as [BrainFogCause, number][])
    .sort(([, a], [, b]) => b - a);

  const top = sorted[0];
  const second = sorted[1];

  // combinaison_facteurs : les deux premières causes sont proches et élevées
  const COMBINATION_THRESHOLD = 2.0;
  const PROXIMITY_THRESHOLD = 0.8;

  if (
    top[1] >= COMBINATION_THRESHOLD &&
    second[1] >= COMBINATION_THRESHOLD &&
    Math.abs(top[1] - second[1]) < PROXIMITY_THRESHOLD
  ) {
    return "combinaison_facteurs";
  }

  return top[0];
}

export function detectSecondaryCauses(
  signals: BrainFogSignal[],
  primaryCause: BrainFogCause,
): BrainFogCause[] {
  if (primaryCause === "combinaison_facteurs") {
    // Pour combinaison, retourner les 2 causes les plus élevées
    const subscores = buildCauseSubscores(signals);
    return (Object.entries(subscores) as [BrainFogCause, number][])
      .sort(([, a], [, b]) => b - a)
      .slice(0, 2)
      .map(([cause]) => cause);
  }

  const subscores = buildCauseSubscores(signals);
  const SECONDARY_THRESHOLD = 1.5;

  return (Object.entries(subscores) as [BrainFogCause, number][])
    .filter(([cause, score]) => cause !== primaryCause && score >= SECONDARY_THRESHOLD)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 2)
    .map(([cause]) => cause);
}

// ─── Confiance ───────────────────────────────────────────────────────────────

export function calculateConfidence(
  signals: BrainFogSignal[],
  score: number,
): BrainFogConfidence {
  const filledSignals = signals.filter((s) => s.value > 0).length;
  const totalSignals = 12;
  const coverage = filledSignals / totalSignals;

  if (coverage >= 0.7 && score >= 5) return "élevé";
  if (coverage >= 0.4 || score >= 4) return "moyen";
  return "faible";
}

// ─── Intervention (une seule) ─────────────────────────────────────────────────

const INTERVENTIONS: Record<BrainFogCause, (score: number) => BrainFogIntervention> = {
  fatigue_physiologique: (score) =>
    score >= 7
      ? {
          label: "S'allonger maintenant",
          explication: "Votre corps signale un manque de récupération. Pas de décision avant repos.",
          dureeEstimee: "15 minutes",
        }
      : {
          label: "Boire, manger, respirer",
          explication: "Quelques besoins de base non comblés. Régler ça avant tout le reste.",
          dureeEstimee: "10 minutes",
        },

  surcharge_cognitive: () => ({
    label: "Vider la tête sur papier",
    explication: "Écrire toutes les pensées qui tournent, fermer l'onglet. Le cerveau peut lâcher.",
    dureeEstimee: "5 minutes",
  }),

  anxiete: (score) =>
    score >= 6
      ? {
          label: "Respiration lente : 4-4",
          explication: "Inspirer 4 secondes, expirer 4 secondes. Cinq fois. Rien d'autre.",
          dureeEstimee: "3 minutes",
        }
      : {
          label: "Nommer ce qui vous pèse",
          explication: "Écrire en une phrase ce qui vous anxiète. L'apprivoiser avant d'agir.",
          dureeEstimee: "5 minutes",
        },

  depression: () => ({
    label: "Une seule chose simple",
    explication: "Pas pour performer — juste pour bouger. Boire de l'eau. Ouvrir une fenêtre.",
    dureeEstimee: "5 minutes",
  }),

  evitement_emotionnel: () => ({
    label: "Nommer la tâche évitée",
    explication: "Pas la faire — juste l'écrire et la poser quelque part. Le reste peut attendre.",
    dureeEstimee: "3 minutes",
  }),

  traumatisme_active: () => ({
    label: "Poser l'écran. Respirer.",
    explication: "Vous êtes en sécurité. Aucune urgence ne demande une décision dans les 5 prochaines minutes.",
    dureeEstimee: "10 minutes",
  }),

  combinaison_facteurs: () => ({
    label: "Aucune décision aujourd'hui",
    explication: "Plusieurs systèmes sont surchargés en même temps. Prendre soin du corps en premier.",
    dureeEstimee: "15 minutes",
  }),
};

export function buildIntervention(
  cause: BrainFogCause,
  score: number,
): BrainFogIntervention {
  return INTERVENTIONS[cause](score);
}

// ─── Phrase d'explication ─────────────────────────────────────────────────────

const EXPLANATIONS: Record<BrainFogCause, (score: number) => string> = {
  fatigue_physiologique: (s) =>
    s >= 7
      ? "Votre corps est épuisé — la clarté mentale ne reviendra qu'avec du repos."
      : "Des besoins physiologiques de base ne sont pas comblés — ça affecte la clarté.",
  surcharge_cognitive: (s) =>
    s >= 6
      ? "Votre cerveau porte trop de fils en même temps — il ne peut plus prioriser seul."
      : "Quelques pensées non résolues occupent de la bande passante mentale.",
  anxiete: (s) =>
    s >= 6
      ? "L'anxiété prend beaucoup de place — le système nerveux est en alerte."
      : "Un fond d'anxiété rend les décisions plus coûteuses qu'elles ne le sont.",
  depression: () =>
    "Un sentiment de lourdeur ou de vide ralentit l'élan — ce n'est pas de la paresse.",
  evitement_emotionnel: () =>
    "Une tâche ou une situation est évitée — ça crée une tension de fond qui consomme de l'énergie.",
  traumatisme_active: () =>
    "Quelque chose a activé un état de vigilance ou de tension — le cerveau est en mode protection.",
  combinaison_facteurs: () =>
    "Plusieurs sources de surcharge agissent en même temps — difficile de les séparer.",
};

export function buildExplanation(cause: BrainFogCause, score: number): string {
  return EXPLANATIONS[cause](score);
}

// ─── Point d'entrée principal ─────────────────────────────────────────────────

export function analyzeBrainFog(signals: BrainFogSignal[]): BrainFogAnalysis {
  const score = calculateBrainFogScore(signals);
  const causePrincipale = detectPrimaryCause(signals);
  const causesSecondaires = detectSecondaryCauses(signals, causePrincipale);
  const confiance = calculateConfidence(signals, score);
  const intervention = buildIntervention(causePrincipale, score);
  const phraseExplication = buildExplanation(causePrincipale, score);

  return {
    score,
    causePrincipale,
    causesSecondaires,
    confiance,
    intervention,
    phraseExplication,
    evaluatedAt: new Date().toISOString(),
  };
}
