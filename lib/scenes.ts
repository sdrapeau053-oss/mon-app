export type StatutScene = "brouillon" | "confirmée" | "gelée";

export type LienScene = {
  sceneId: string;
  typeLien: "prepare" | "repond" | "miroir" | "consequence" | "meme_motif";
};

export type PotentielSerie = {
  visuel?: 1 | 2 | 3 | 4 | 5;
  dialogue?: 1 | 2 | 3 | 4 | 5;
  episode?: 1 | 2 | 3 | 4 | 5;
  ouvertureEpisode?: boolean;
  finaleEpisode?: boolean;
};

export type Scene = {
  id: string;
  titre: string;
  description?: string;
  tome: number;
  chapitre: number;
  ageApprox?: string;
  periode?: string;
  lieu?: string;
  typeScene:
    | "douce"
    | "tension"
    | "pivot"
    | "respiration"
    | "trauma"
    | "transition"
    | "iconique";
  intensite?: 1 | 2 | 3 | 4 | 5;
  importanceSerie?: "faible" | "moyenne" | "forte" | "iconique";
  motifs?: string[];
  personnages?: string[];
  fonctionNarrative?: string;
  consequences?: string;
  notes?: string;
  statut?: StatutScene;
  fragmentIds?: string[];
  chapitreId?: string;
  tomeId?: number;
  liens?: LienScene[];
  potentielSerie?: PotentielSerie;
  tagsNarratifs?: string[];
  objetSymbolique?: string;
  emotionSousJacente?: string;
  memoireCorporelle?: string;
  niveauDialogue?: "aucun" | "minimal" | "present" | "fort";
  roleDansTome?: "installation" | "montée" | "rupture" | "respiration" | "bascule" | "clôture";
};

export const COULEURS_SCENE: Record<Scene["typeScene"], string> = {
  douce: "#e8e0d0",
  tension: "#8ba3b8",
  pivot: "#c49a3c",
  respiration: "#8a9e8c",
  trauma: "#4a4a52",
  transition: "#9e9e9e",
  iconique: "#b8a8c8",
};
