// ─── Brain Fog Types ─────────────────────────────────────────────────────────
// Représente l'ensemble du domaine Brain Fog Scanner.
// Aucune logique ici — uniquement des types.

/** Signaux évalués lors d'un scan.
 *  Échelle : 0 = aucun problème · 1 = léger · 2 = modéré · 3 = significatif · 4 = sévère
 */
export type BrainFogSignalKey =
  | "sommeil"
  | "hydratation"
  | "alimentation"
  | "stress"
  | "anxiete"
  | "tristesse"
  | "surcharge_emotionnelle"
  | "rumination"
  | "tache_evitee"
  | "douleur_physique"
  | "medication"
  | "urgence_presente";

export type BrainFogSignal = {
  key: BrainFogSignalKey;
  value: number; // 0–4
};

// Causes probables identifiées par le moteur
export type BrainFogCause =
  | "fatigue_physiologique"
  | "surcharge_cognitive"
  | "anxiete"
  | "depression"
  | "evitement_emotionnel"
  | "traumatisme_active"
  | "combinaison_facteurs";

export type BrainFogConfidence = "faible" | "moyen" | "élevé";

/** Une seule intervention est toujours proposée — jamais une liste. */
export type BrainFogIntervention = {
  label: string;
  explication: string;
  dureeEstimee: string;
};

export type BrainFogAnalysis = {
  score: number;                    // 0–10
  causePrincipale: BrainFogCause;
  causesSecondaires: BrainFogCause[];
  confiance: BrainFogConfidence;
  intervention: BrainFogIntervention;
  phraseExplication: string;
  evaluatedAt: string;              // ISO 8601
};

export type BrainFogEntry = {
  id: string;
  signals: BrainFogSignal[];
  analysis: BrainFogAnalysis;
  createdAt: string; // ISO 8601
};

// Payload brut dans localStorage
export type BrainFogStoragePayload = {
  entries: BrainFogEntry[];
  updatedAt: string;
};

// ─── Labels humains (réutilisés dans l'UI et le moteur) ──────────────────────

export const BRAIN_FOG_CAUSE_LABELS: Record<BrainFogCause, string> = {
  fatigue_physiologique: "Fatigue physiologique",
  surcharge_cognitive: "Surcharge cognitive",
  anxiete: "Anxiété",
  depression: "Fatigue émotionnelle profonde",
  evitement_emotionnel: "Évitement émotionnel",
  traumatisme_active: "État de tension activé",
  combinaison_facteurs: "Combinaison de facteurs",
};

export const BRAIN_FOG_SIGNAL_LABELS: Record<BrainFogSignalKey, string> = {
  sommeil: "Qualité du sommeil",
  hydratation: "Hydratation",
  alimentation: "Alimentation",
  stress: "Niveau de stress",
  anxiete: "Anxiété ressentie",
  tristesse: "Tristesse ou vide",
  surcharge_emotionnelle: "Surcharge émotionnelle",
  rumination: "Pensées qui tournent",
  tache_evitee: "Tâche que vous évitez",
  douleur_physique: "Douleur ou tension physique",
  medication: "Médication non prise ou ajustée",
  urgence_presente: "Situation urgente active",
};
