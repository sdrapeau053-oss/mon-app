export type StatutScene = "brouillon" | "confirmée" | "gelée";

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
