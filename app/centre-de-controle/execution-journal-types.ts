export type ExecutionCategory = "ecriture" | "sante" | "maison" | "administratif" | "business" | "autre";

export type ExecutionEntry = {
  category: ExecutionCategory;
  createdAt: string;
  id: string;
  text: string;
};

export const EXECUTION_CATEGORY_LABELS: Record<ExecutionCategory, string> = {
  administratif: "Administratif",
  autre: "Autre",
  business: "Business",
  ecriture: "Écriture",
  maison: "Maison",
  sante: "Santé",
};
