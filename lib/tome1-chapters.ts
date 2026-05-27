export type StatutChapitreTome1 =
  | "à écrire"
  | "écrit"
  | "scellé"
  | "vide"
  | "brouillon"
  | "en_cours"
  | "stabilise"
  | "gele";

export type StatutEditorialChapitreTome1 = "vide" | "brouillon" | "à réviser" | "validé";

export type ChapitreTome1 = {
  id: string;
  titre: string;
  description?: string;
  bloc: number;
  type: string;
  statut: StatutChapitreTome1;
  contenu: string;
  ageApprox?: string;
  periode?: string;
  typeChapitre?: string;
  niveauLourdeur?: string;
  intensite?: number;
  potentielSerie?: string;
  typeEpisode?: string;
  imageCentrale?: string;
  fonctionNarrative?: string;
  statutStructure?: string;
  statutEditorial?: StatutEditorialChapitreTome1;
  updatedAt?: string;
  updated_at?: string;
  derniereModification?: string;
};

export const CHAPITRES_TOME_1_STORAGE_KEY = "chapitres-tome-1";
export const TITRE_TOME_1 = "Tome I — Le gel et la lumière";

export const CHAPITRES_TOME_1_METADATA: Record<string, Partial<ChapitreTome1>> = {
  "chapitre-1": {
    titre: "Le corps avant la mémoire",
    description: "Le corps enregistre avant les mots.",
    ageApprox: "0–2 ans",
    periode: "Petite enfance",
    type: "trauma",
    typeChapitre: "trauma",
    niveauLourdeur: "lourd",
    intensite: 8,
    potentielSerie: "fort",
    typeEpisode: "ouverture",
    imageCentrale: "Le corps avant la mémoire consciente",
    fonctionNarrative: "Installer la mémoire corporelle comme première vérité du tome.",
    statutStructure: "stabilise",
  },
  "chapitre-2": {
    titre: "La poupée",
    description: "La solitude d’une enfant face à un poids trop grand.",
    ageApprox: "2 ans",
    periode: "Petite enfance",
    type: "tension",
    typeChapitre: "tension",
    niveauLourdeur: "moyen",
    intensite: 7,
    potentielSerie: "fort",
    typeEpisode: "montee",
    imageCentrale: "La poupée presque aussi grande que l’enfant",
    fonctionNarrative: "Montrer l’isolement et l’attente sans secours.",
    statutStructure: "stabilise",
  },
  "chapitre-3": {
    titre: "Ce que la nuit contenait",
    description: "La nuit devient un territoire organisé par la peur.",
    ageApprox: "3–4 ans",
    periode: "Petite enfance",
    type: "trauma",
    typeChapitre: "trauma",
    niveauLourdeur: "extreme",
    intensite: 9,
    potentielSerie: "iconique",
    typeEpisode: "climax",
    imageCentrale: "La lucarne, le froid, le corps en alerte",
    fonctionNarrative: "Donner une forme sensorielle au danger nocturne.",
    statutStructure: "en_cours",
  },
  "chapitre-4": {
    titre: "Le bois et le métal",
    description: "Les objets ordinaires portent les règles du danger.",
    ageApprox: "~4 ans",
    periode: "Petite enfance",
    type: "tension",
    typeChapitre: "tension",
    niveauLourdeur: "lourd",
    intensite: 8,
    potentielSerie: "fort",
    typeEpisode: "montee",
    imageCentrale: "La clé, le corridor, la table, le vélo",
    fonctionNarrative: "Montrer comment le corps apprend les règles avant l’explication.",
    statutStructure: "stabilise",
  },
  "chapitre-5": {
    titre: "L’ombre du témoin",
    description: "La violence devient aussi celle de ceux qui voient et ne bougent pas.",
    ageApprox: "< 5 ans",
    periode: "Enfance",
    type: "pivot",
    typeChapitre: "pivot",
    niveauLourdeur: "extreme",
    intensite: 9,
    potentielSerie: "iconique",
    typeEpisode: "climax",
    imageCentrale: "Le témoin immobile devant la violence",
    fonctionNarrative: "Élargir le danger du père au système des témoins silencieux.",
    statutStructure: "en_cours",
  },
  "chapitre-6": {
    titre: "L’angle mort",
    description: "Le regard se retire quand la scène devient impossible à porter.",
    ageApprox: "~5 ans",
    periode: "Enfance",
    type: "effondrement",
    typeChapitre: "effondrement",
    niveauLourdeur: "extreme",
    intensite: 10,
    potentielSerie: "iconique",
    typeEpisode: "climax",
    imageCentrale: "Le noir intérieur, les yeux ouverts",
    fonctionNarrative: "Installer la dissociation comme mécanisme de survie.",
    statutStructure: "stabilise",
  },
};

function numeroDepuisId(id: string) {
  return Number(id.match(/\d+/)?.[0] || 0);
}

function blocDepuisNumero(numero: number) {
  if (numero <= 4) return 1;
  if (numero <= 11) return 2;
  if (numero <= 17) return 3;
  if (numero <= 22) return 4;
  return 5;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

function normaliserStatutChapitre(statut: unknown): StatutChapitreTome1 {
  if (
    statut === "écrit" ||
    statut === "scellé" ||
    statut === "à écrire" ||
    statut === "vide" ||
    statut === "brouillon" ||
    statut === "en_cours" ||
    statut === "stabilise" ||
    statut === "gele"
  ) {
    return statut;
  }

  return "à écrire";
}

function normaliserStatutEditorial(statut: unknown): StatutEditorialChapitreTome1 | undefined {
  if (statut === "vide" || statut === "brouillon" || statut === "à réviser" || statut === "validé") {
    return statut;
  }

  return undefined;
}

export function getNumeroChapitreTome1(id: string) {
  return numeroDepuisId(id);
}

export function creerChapitreTome1Vide(numero: number): ChapitreTome1 {
  const id = `chapitre-${numero}`;
  const metadata = CHAPITRES_TOME_1_METADATA[id] || {};

  return {
    id,
    titre: metadata.titre || `Chapitre ${numero} — À définir`,
    description: metadata.description || "À définir",
    bloc: blocDepuisNumero(numero),
    type: metadata.type || metadata.typeChapitre || "transition",
    statut: "à écrire",
    contenu: "",
    ageApprox: metadata.ageApprox || "",
    periode: metadata.periode || "",
    typeChapitre: metadata.typeChapitre || "transition",
    niveauLourdeur: metadata.niveauLourdeur || "moyen",
    intensite: metadata.intensite,
    potentielSerie: metadata.potentielSerie || "faible",
    typeEpisode: metadata.typeEpisode || "montee",
    imageCentrale: metadata.imageCentrale || "",
    fonctionNarrative: metadata.fonctionNarrative || "À définir",
    statutStructure: metadata.statutStructure || "brouillon",
  };
}

export const CHAPITRES_TOME_1_DEFAUT: ChapitreTome1[] = Array.from({ length: 30 }, (_, index) =>
  creerChapitreTome1Vide(index + 1),
);

export function normaliserChapitreTome1(chapitre: unknown, fallback: ChapitreTome1): ChapitreTome1 {
  if (!isRecord(chapitre)) return fallback;

  const id = typeof chapitre.id === "string" && chapitre.id.trim() ? chapitre.id : fallback.id;
  const metadata = CHAPITRES_TOME_1_METADATA[id] || {};

  return {
    ...fallback,
    ...metadata,
    id,
    titre:
      typeof metadata.titre === "string"
        ? metadata.titre
        : typeof chapitre.titre === "string" && chapitre.titre.trim()
          ? chapitre.titre
          : fallback.titre,
    description:
      typeof chapitre.description === "string"
        ? chapitre.description
        : metadata.description || fallback.description,
    bloc: typeof chapitre.bloc === "number" ? chapitre.bloc : fallback.bloc,
    type:
      typeof chapitre.type === "string" && chapitre.type.trim()
        ? chapitre.type
        : metadata.type || fallback.type,
    statut: normaliserStatutChapitre(chapitre.statut),
    contenu: typeof chapitre.contenu === "string" ? chapitre.contenu : fallback.contenu,
    ageApprox:
      typeof chapitre.ageApprox === "string" ? chapitre.ageApprox : metadata.ageApprox || fallback.ageApprox,
    periode: typeof chapitre.periode === "string" ? chapitre.periode : metadata.periode || fallback.periode,
    typeChapitre:
      typeof chapitre.typeChapitre === "string"
        ? chapitre.typeChapitre
        : metadata.typeChapitre || fallback.typeChapitre,
    niveauLourdeur:
      typeof chapitre.niveauLourdeur === "string"
        ? chapitre.niveauLourdeur
        : metadata.niveauLourdeur || fallback.niveauLourdeur,
    intensite:
      typeof chapitre.intensite === "number" ? chapitre.intensite : metadata.intensite || fallback.intensite,
    potentielSerie:
      typeof chapitre.potentielSerie === "string"
        ? chapitre.potentielSerie
        : metadata.potentielSerie || fallback.potentielSerie,
    typeEpisode:
      typeof chapitre.typeEpisode === "string"
        ? chapitre.typeEpisode
        : metadata.typeEpisode || fallback.typeEpisode,
    imageCentrale:
      typeof chapitre.imageCentrale === "string"
        ? chapitre.imageCentrale
        : metadata.imageCentrale || fallback.imageCentrale,
    fonctionNarrative:
      typeof chapitre.fonctionNarrative === "string"
        ? chapitre.fonctionNarrative
        : metadata.fonctionNarrative || fallback.fonctionNarrative,
    statutStructure:
      typeof chapitre.statutStructure === "string"
        ? chapitre.statutStructure
        : metadata.statutStructure || fallback.statutStructure,
    statutEditorial: normaliserStatutEditorial(chapitre.statutEditorial),
    updatedAt: typeof chapitre.updatedAt === "string" ? chapitre.updatedAt : fallback.updatedAt,
    updated_at: typeof chapitre.updated_at === "string" ? chapitre.updated_at : fallback.updated_at,
    derniereModification:
      typeof chapitre.derniereModification === "string"
        ? chapitre.derniereModification
        : fallback.derniereModification,
  };
}

export function normaliserChapitresTome1(chapitres: unknown): ChapitreTome1[] {
  const sources = Array.isArray(chapitres) ? chapitres : [];
  const entries: Array<[string, Record<string, unknown>]> = sources
    .filter(isRecord)
    .map((chapitre): [string, Record<string, unknown>] => [
      typeof chapitre.id === "string" ? chapitre.id : "",
      chapitre,
    ])
    .filter(([id]) => Boolean(id));
  const parId = new Map(entries);

  return CHAPITRES_TOME_1_DEFAUT.map((fallback) =>
    normaliserChapitreTome1(parId.get(fallback.id), fallback),
  ).sort((a, b) => getNumeroChapitreTome1(a.id) - getNumeroChapitreTome1(b.id));
}

export function lireChapitresTome1DepuisStorage() {
  if (typeof window === "undefined") return CHAPITRES_TOME_1_DEFAUT;

  try {
    const saved = localStorage.getItem(CHAPITRES_TOME_1_STORAGE_KEY);
    return normaliserChapitresTome1(saved ? JSON.parse(saved) : []);
  } catch {
    return CHAPITRES_TOME_1_DEFAUT;
  }
}

export function chapitreTome1EstEcrit(chapitre: ChapitreTome1) {
  return Boolean(chapitre.contenu.trim());
}

export function compterMotsChapitreTome1(chapitre: ChapitreTome1) {
  return chapitre.contenu.trim().split(/\s+/).filter(Boolean).length;
}

export function getStatutEditorialChapitreTome1(chapitre: ChapitreTome1): StatutEditorialChapitreTome1 {
  if (!chapitreTome1EstEcrit(chapitre)) return "vide";
  if (chapitre.statutEditorial) return chapitre.statutEditorial;

  if (
    chapitre.statut === "scellé" ||
    chapitre.statut === "gele" ||
    chapitre.statutStructure === "gele" ||
    chapitre.statutStructure === "stabilise"
  ) {
    return "validé";
  }

  return "brouillon";
}

export function getDateModificationChapitreTome1(chapitre: ChapitreTome1) {
  return chapitre.updatedAt || chapitre.updated_at || chapitre.derniereModification || "";
}

export function chapitreTome1EstDisponible(chapitre: ChapitreTome1) {
  return chapitreTome1EstEcrit(chapitre) || chapitre.statut === "écrit" || chapitre.statut === "scellé";
}

export function getChapitresTome1Ecrits(chapitres: ChapitreTome1[]) {
  return chapitres.filter(chapitreTome1EstEcrit);
}

export function getChapitresTome1Disponibles(chapitres: ChapitreTome1[]) {
  return chapitres.filter(chapitreTome1EstDisponible);
}
