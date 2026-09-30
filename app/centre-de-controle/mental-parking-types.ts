export type MentalParkingCategory = "idee" | "inquietude" | "rappel" | "tache" | "emotion" | "autre";

export type MentalParkingItem = {
  archived: boolean;
  category: MentalParkingCategory;
  createdAt: string;
  id: string;
  text: string;
};

export const MENTAL_PARKING_CATEGORY_LABELS: Record<MentalParkingCategory, string> = {
  autre: "Autre",
  emotion: "Émotion",
  idee: "Idée",
  inquietude: "Inquiétude",
  rappel: "Rappel",
  tache: "Tâche",
};
