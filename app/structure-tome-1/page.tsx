"use client";

import Link from "next/link";
import { BackLink } from "@/components/ui/back-link";
import { genererDiagnosticEditorial } from "@/lib/editorial-director";
import { genererAlertesEditoriales } from "@/lib/editorial-memory";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { lireFragments, type Fragment } from "@/lib/fragments";
import {
  getChapterNarrativeStats,
  lireScenesRelationnelles,
} from "@/lib/narrative-relations";
import { lireMemoiresNarratives, type MemoireNarrative } from "@/lib/memoire-narrative";
import type { Scene } from "@/lib/scenes";

type ChapterType = "severe" | "doux" | "respiration" | "charniere" | "fin" | "mixte";
type ChapterStatus = "a-ecrire" | "ecrit" | "scelle";
type StoredChapterStatus = "à écrire" | "écrit" | "scellé";
type TypeChapitre =
  | "respiration"
  | "tension"
  | "trauma"
  | "pivot"
  | "effondrement"
  | "contraste"
  | "transition";
type NiveauLourdeur = "leger" | "moyen" | "lourd" | "extreme";
type IntensiteChapitre = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10;
type PotentielSerieChapitre = "faible" | "moyen" | "fort" | "iconique";
type TypeEpisode = "ouverture" | "respiration" | "montee" | "climax" | "aftermath" | "finale";
type StatutStructureChapitre = "vide" | "brouillon" | "en_cours" | "stabilise" | "gele";

interface Chapter {
  num: number;
  age: string;
  title: string;
  type: ChapterType;
  souvenirs: string;
  fonction: string;
  etatInterieur: string;
}

interface Bloc {
  num: number;
  title: string;
  age: string;
  chapitres: Chapter[];
}

interface StoredChapter {
  id: string;
  titre: string;
  description?: string;
  bloc: number;
  type: string;
  statut: StoredChapterStatus;
  contenu: string;
  ageApprox?: string;
  periode?: string;
  typeChapitre?: TypeChapitre;
  niveauLourdeur?: NiveauLourdeur;
  intensite?: IntensiteChapitre;
  potentielSerie?: PotentielSerieChapitre;
  typeEpisode?: TypeEpisode;
  imageCentrale?: string;
  fonctionNarrative?: string;
  statutStructure?: StatutStructureChapitre;
}

type SupabaseStoredChapter = {
  id: string;
  titre: string | null;
  bloc: number | null;
  type: string | null;
  statut: string | null;
  contenu: string | null;
};

const CHAPITRES_TOME_1_KEY = "chapitres-tome-1";

const TYPES_CHAPITRE: TypeChapitre[] = [
  "respiration",
  "tension",
  "trauma",
  "pivot",
  "effondrement",
  "contraste",
  "transition",
];

const NIVEAUX_LOURDEUR: NiveauLourdeur[] = ["leger", "moyen", "lourd", "extreme"];
const POTENTIELS_SERIE: PotentielSerieChapitre[] = ["faible", "moyen", "fort", "iconique"];
const TYPES_EPISODE: TypeEpisode[] = ["ouverture", "respiration", "montee", "climax", "aftermath", "finale"];
const STATUTS_STRUCTURE: StatutStructureChapitre[] = ["vide", "brouillon", "en_cours", "stabilise", "gele"];

const CHAPITRES_1_6_METADATA: Record<string, Partial<StoredChapter>> = {
  "chapitre-1": {
    titre: "Le corps avant la mémoire",
    description: "Le corps enregistre avant les mots.",
    ageApprox: "0–2 ans",
    periode: "Petite enfance",
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

const TITRES_OFFICIELS_CHAPITRES_1_6: Record<string, string> = Object.fromEntries(
  Object.entries(CHAPITRES_1_6_METADATA).map(([id, chapitre]) => [id, chapitre.titre || id]),
);

const CHAPITRES_7_30_EDITORIAL_METADATA: Record<string, Partial<StoredChapter> & { dangerEditorial: string; respirationEditorial: string; saturationEditorial: string }> = {
  "chapitre-7": {
    titre: "La table et le silence",
    ageApprox: "4–5 ans",
    typeChapitre: "tension",
    niveauLourdeur: "moyen",
    intensite: 4,
    potentielSerie: "moyen",
    typeEpisode: "aftermath",
    fonctionNarrative: "Adaptation invisible aux règles non dites de la maison.",
    imageCentrale: "Les mains posées au bon endroit avant même de réfléchir",
    dangerEditorial: "invisible adaptatif",
    respirationEditorial: "faux calme appris",
    saturationEditorial: "translucide",
  },
  "chapitre-8": {
    titre: "Les animaux et les règles",
    ageApprox: "3–4 ans",
    typeChapitre: "tension",
    niveauLourdeur: "moyen",
    intensite: 5,
    potentielSerie: "fort",
    typeEpisode: "montee",
    fonctionNarrative: "Camouflage relationnel, devenir lisible sans devenir visible.",
    imageCentrale: "Le visage réglé avant d’entrer dans une pièce",
    dangerEditorial: "latent domestique",
    respirationEditorial: "suspension brève",
    saturationEditorial: "feutrée",
  },
  "chapitre-9": {
    titre: "Devenir invisible",
    ageApprox: "5 ans",
    typeChapitre: "tension",
    niveauLourdeur: "lourd",
    intensite: 6,
    potentielSerie: "fort",
    typeEpisode: "montee",
    fonctionNarrative: "Hypervigilance naissante, le corps lit l’air avant les mots.",
    imageCentrale: "Les épaules qui entendent avant les oreilles",
    dangerEditorial: "diffus relationnel",
    respirationEditorial: "respiration retenue",
    saturationEditorial: "gris chaud",
  },
  "chapitre-10": {
    titre: "Ce que les bruits annonçaient",
    ageApprox: "2–3 ans",
    typeChapitre: "trauma",
    niveauLourdeur: "lourd",
    intensite: 6,
    potentielSerie: "fort",
    typeEpisode: "montee",
    fonctionNarrative: "Apprentissage du danger, reconnaître le changement avant l’événement.",
    imageCentrale: "Le silence qui change de poids",
    dangerEditorial: "silencieux corporel",
    respirationEditorial: "silence guetté",
    saturationEditorial: "voilée instable",
  },
  "chapitre-11": {
    titre: "Ma sœur et moi",
    ageApprox: "5–6 ans",
    typeChapitre: "contraste",
    niveauLourdeur: "moyen",
    intensite: 5,
    potentielSerie: "moyen",
    typeEpisode: "respiration",
    fonctionNarrative: "Faux refuge, le lien protège sans pouvoir empêcher le système.",
    imageCentrale: "Deux enfants qui baissent la voix pour tenir ensemble",
    dangerEditorial: "imprévisible intérieur",
    respirationEditorial: "faux refuge",
    saturationEditorial: "mate inquiète",
  },
  "chapitre-12": {
    titre: "L'eau",
    ageApprox: "6 ans",
    typeChapitre: "respiration",
    niveauLourdeur: "leger",
    intensite: 3,
    potentielSerie: "moyen",
    typeEpisode: "respiration",
    fonctionNarrative: "Refuge sensoriel, première preuve que le corps peut exister autrement.",
    imageCentrale: "L’eau froide autour des pieds",
    dangerEditorial: "latent sensoriel",
    respirationEditorial: "respiration sensorielle",
    saturationEditorial: "lactée",
  },
  "chapitre-13": {
    titre: "Dehors",
    ageApprox: "6–7 ans",
    typeChapitre: "respiration",
    niveauLourdeur: "leger",
    intensite: 2,
    potentielSerie: "moyen",
    typeEpisode: "respiration",
    fonctionNarrative: "Normalité trompeuse, l’extérieur donne de l’air sans garantir la sécurité.",
    imageCentrale: "Les framboises qui tachent les doigts",
    dangerEditorial: "diffus ordinaire",
    respirationEditorial: "calme emprunté",
    saturationEditorial: "claire piégée",
  },
  "chapitre-14": {
    titre: "L'école",
    ageApprox: "6–7 ans",
    typeChapitre: "contraste",
    niveauLourdeur: "moyen",
    intensite: 4,
    potentielSerie: "moyen",
    typeEpisode: "respiration",
    fonctionNarrative: "Douceur fragile, découvrir un monde à règles différentes sans pouvoir s’y installer.",
    imageCentrale: "Le papier, le pupitre, une voix normale",
    dangerEditorial: "silencieux fragile",
    respirationEditorial: "douceur interrompue",
    saturationEditorial: "dorée fragile",
  },
  "chapitre-15": {
    titre: "La figure douce",
    ageApprox: "7 ans",
    typeChapitre: "respiration",
    niveauLourdeur: "leger",
    intensite: 3,
    potentielSerie: "fort",
    typeEpisode: "respiration",
    fonctionNarrative: "Socialisation prudente, recevoir la douceur sans savoir où la mettre.",
    imageCentrale: "Une voix qui ne descend pas",
    dangerEditorial: "imprévisible social",
    respirationEditorial: "souffle social",
    saturationEditorial: "sociale pâle",
  },
  "chapitre-16": {
    titre: "Ce que je voulais",
    ageApprox: "7–8 ans",
    typeChapitre: "respiration",
    niveauLourdeur: "leger",
    intensite: 3,
    potentielSerie: "moyen",
    typeEpisode: "respiration",
    fonctionNarrative: "Retour du vivant, le désir d’enfant existe encore par intermittence.",
    imageCentrale: "Un objet voulu pour soi seule",
    dangerEditorial: "chronique doux",
    respirationEditorial: "suspension claire",
    saturationEditorial: "suspendue claire",
  },
  "chapitre-17": {
    titre: "Mon frère",
    ageApprox: "8 ans",
    typeChapitre: "contraste",
    niveauLourdeur: "moyen",
    intensite: 4,
    potentielSerie: "fort",
    typeEpisode: "aftermath",
    fonctionNarrative: "Suspension émotionnelle, être vue vraiment avant que le danger reprenne.",
    imageCentrale: "Un regard qui reconnaît sans demander",
    dangerEditorial: "rapproché suspendu",
    respirationEditorial: "accalmie instable",
    saturationEditorial: "tremblée",
  },
  "chapitre-18": {
    titre: "Quand l'air a changé",
    ageApprox: "8–9 ans",
    typeChapitre: "tension",
    niveauLourdeur: "lourd",
    intensite: 7,
    potentielSerie: "fort",
    typeEpisode: "montee",
    fonctionNarrative: "Contamination du présent, la respiration du bloc précédent se ferme.",
    imageCentrale: "L’air qui change avant la scène",
    dangerEditorial: "contaminant présent",
    respirationEditorial: "tension lente montante",
    saturationEditorial: "chargée nerveuse",
  },
  "chapitre-19": {
    titre: "Les boîtes",
    ageApprox: "9 ans",
    typeChapitre: "pivot",
    niveauLourdeur: "lourd",
    intensite: 7,
    potentielSerie: "moyen",
    typeEpisode: "montee",
    fonctionNarrative: "Peur chronique, l’instabilité entre dans les objets emballés.",
    imageCentrale: "Les boîtes qui annoncent sans expliquer",
    dangerEditorial: "chronique nerveux",
    respirationEditorial: "attente nerveuse",
    saturationEditorial: "acide",
  },
  "chapitre-20": {
    titre: "La route",
    ageApprox: "9 ans",
    typeChapitre: "pivot",
    niveauLourdeur: "lourd",
    intensite: 8,
    potentielSerie: "fort",
    typeEpisode: "climax",
    fonctionNarrative: "Mémoire corporelle, le départ déplace le danger sans le couper.",
    imageCentrale: "Le paysage qui change derrière la vitre",
    dangerEditorial: "rapproché mémoriel",
    respirationEditorial: "retour somatique",
    saturationEditorial: "profonde",
  },
  "chapitre-21": {
    titre: "La nouvelle maison",
    ageApprox: "9–10 ans",
    typeChapitre: "trauma",
    niveauLourdeur: "lourd",
    intensite: 8,
    potentielSerie: "fort",
    typeEpisode: "montee",
    fonctionNarrative: "Perte du refuge, le nouveau lieu exige une nouvelle cartographie du danger.",
    imageCentrale: "Les coins inconnus d’une maison déjà menaçante",
    dangerEditorial: "omniprésent quotidien",
    respirationEditorial: "souffle contaminé",
    saturationEditorial: "dense contaminée",
  },
  "chapitre-22": {
    titre: "L'isolement",
    ageApprox: "9–10 ans",
    typeChapitre: "effondrement",
    niveauLourdeur: "extreme",
    intensite: 9,
    potentielSerie: "iconique",
    typeEpisode: "climax",
    fonctionNarrative: "Prédateur invisible, l’isolement enlève les derniers témoins possibles.",
    imageCentrale: "Une maison trop loin pour être vue",
    dangerEditorial: "ouvert invisible",
    respirationEditorial: "vigilance sans repos",
    saturationEditorial: "froide active",
  },
  "chapitre-23": {
    titre: "Le climat reprend",
    ageApprox: "10 ans",
    typeChapitre: "effondrement",
    niveauLourdeur: "extreme",
    intensite: 9,
    potentielSerie: "iconique",
    typeEpisode: "climax",
    fonctionNarrative: "Dissociation, le climat reprend et le corps sait qu’il faut se séparer.",
    imageCentrale: "La présence qui commence à sortir du corps",
    dangerEditorial: "ouvert frontal",
    respirationEditorial: "contamination silencieuse",
    saturationEditorial: "lourde ouverte",
  },
  "chapitre-24": {
    titre: "Ce que le corps faisait seul",
    ageApprox: "10 ans",
    typeChapitre: "effondrement",
    niveauLourdeur: "extreme",
    intensite: 9,
    potentielSerie: "fort",
    typeEpisode: "climax",
    fonctionNarrative: "Effacement, les automatismes remplacent la présence consciente.",
    imageCentrale: "Le corps qui agit depuis un endroit lointain",
    dangerEditorial: "explosif interne",
    respirationEditorial: "respiration écrasée",
    saturationEditorial: "noire interne",
  },
  "chapitre-25": {
    titre: "La nuit différente",
    ageApprox: "10 ans",
    typeChapitre: "trauma",
    niveauLourdeur: "extreme",
    intensite: 10,
    potentielSerie: "iconique",
    typeEpisode: "climax",
    fonctionNarrative: "Isolement de la fracture, la nuit devient un bord infranchissable.",
    imageCentrale: "Une nuit sans forme nommable",
    dangerEditorial: "omniprésent clos",
    respirationEditorial: "air rare",
    saturationEditorial: "fermée compacte",
  },
  "chapitre-26": {
    titre: "Le lendemain ordinaire",
    ageApprox: "10–11 ans",
    typeChapitre: "effondrement",
    niveauLourdeur: "extreme",
    intensite: 9,
    potentielSerie: "iconique",
    typeEpisode: "aftermath",
    fonctionNarrative: "Fragmentation, la surface ordinaire continue pendant que l’intérieur se coupe.",
    imageCentrale: "Le matin intact posé sur le silence",
    dangerEditorial: "dissocié blanc",
    respirationEditorial: "blanc suspendu",
    saturationEditorial: "blanche distante",
  },
  "chapitre-27": {
    titre: "Ma sœur ne sait pas",
    ageApprox: "11 ans",
    typeChapitre: "effondrement",
    niveauLourdeur: "lourd",
    intensite: 8,
    potentielSerie: "fort",
    typeEpisode: "aftermath",
    fonctionNarrative: "Perte du langage, le lien le plus proche ne peut plus recevoir la vérité.",
    imageCentrale: "Les mots arrêtés avant la sœur",
    dangerEditorial: "dissocié verbal",
    respirationEditorial: "parole coupée",
    saturationEditorial: "muette sèche",
  },
  "chapitre-28": {
    titre: "Ce que j'avais appris à faire",
    ageApprox: "11 ans",
    typeChapitre: "effondrement",
    niveauLourdeur: "lourd",
    intensite: 8,
    potentielSerie: "fort",
    typeEpisode: "aftermath",
    fonctionNarrative: "Gel émotionnel, l’inventaire de la survie montre son coût.",
    imageCentrale: "Le sourire appris comme posture",
    dangerEditorial: "omniprésent fragmenté",
    respirationEditorial: "souffle fragmenté",
    saturationEditorial: "cassée froide",
  },
  "chapitre-29": {
    titre: "L'hiver de mes onze ans",
    ageApprox: "11 ans",
    typeChapitre: "contraste",
    niveauLourdeur: "lourd",
    intensite: 7,
    potentielSerie: "fort",
    typeEpisode: "aftermath",
    fonctionNarrative: "Survie sociale, le monde blanc continue dehors pendant que l’intérieur reste séparé.",
    imageCentrale: "La fenêtre givrée devant un monde indifférent",
    dangerEditorial: "dissocié social",
    respirationEditorial: "normalité mécanique",
    saturationEditorial: "lisse fausse",
  },
  "chapitre-30": {
    titre: "Le gel et la lumière",
    ageApprox: "11 ans",
    typeChapitre: "pivot",
    niveauLourdeur: "lourd",
    intensite: 8,
    potentielSerie: "iconique",
    typeEpisode: "finale",
    fonctionNarrative: "Fracture interne, fermer le tome sans résoudre ce qui résiste.",
    imageCentrale: "Le gel et la lumière dans la même image",
    dangerEditorial: "ouvert résiduel",
    respirationEditorial: "silence résiduel",
    saturationEditorial: "résiduelle sombre",
  },
};

const FONCTIONS_COURTES_7_30: Record<string, string> = {
  "chapitre-7": "adaptation",
  "chapitre-8": "camouflage",
  "chapitre-9": "hypervigilance",
  "chapitre-10": "apprentissage du danger",
  "chapitre-11": "faux refuge",
  "chapitre-12": "refuge sensoriel",
  "chapitre-13": "normalité trompeuse",
  "chapitre-14": "douceur fragile",
  "chapitre-15": "socialisation",
  "chapitre-16": "retour du vivant",
  "chapitre-17": "suspension",
  "chapitre-18": "contamination du présent",
  "chapitre-19": "peur chronique",
  "chapitre-20": "mémoire corporelle",
  "chapitre-21": "perte du refuge",
  "chapitre-22": "prédateur invisible",
  "chapitre-23": "dissociation",
  "chapitre-24": "effacement",
  "chapitre-25": "isolement",
  "chapitre-26": "fragmentation",
  "chapitre-27": "perte du langage",
  "chapitre-28": "gel émotionnel",
  "chapitre-29": "survie sociale",
  "chapitre-30": "fracture interne",
};

function creerChapitreInitial(numero: number): StoredChapter {
  const id = `chapitre-${numero}`;
  const metadata = CHAPITRES_1_6_METADATA[id] || CHAPITRES_7_30_EDITORIAL_METADATA[id] || {};
  const bloc = numero <= 4 ? 1 : numero <= 11 ? 2 : numero <= 17 ? 3 : numero <= 22 ? 4 : 5;

  return {
    id,
    titre: metadata.titre || `Chapitre ${numero} — À définir`,
    description: metadata.description || "À définir",
    bloc,
    type: metadata.typeChapitre || "transition",
    statut: numero <= 6 ? "à écrire" : "à écrire",
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

const CHAPITRES_TOME_1_INITIAUX: StoredChapter[] = Array.from({ length: 30 }, (_, index) =>
  creerChapitreInitial(index + 1),
);

function normaliserTexteStructure(texte: string) {
  return texte
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[’']/g, "'")
    .trim();
}

function motsSignifiants(texte: string) {
  const motsVides = new Set([
    "avec",
    "dans",
    "pour",
    "sans",
    "une",
    "des",
    "les",
    "que",
    "qui",
    "comme",
    "avant",
    "apres",
    "chapitre",
    "fonction",
    "danger",
    "memoire",
    "memoires",
  ]);

  return normaliserTexteStructure(texte)
    .replace(/[^a-z0-9\s-]/g, " ")
    .split(/\s+/)
    .filter((mot) => mot.length >= 4 && !motsVides.has(mot));
}

function periodeDepuisAgeChapitre(age: string): MemoireNarrative["periode"] | null {
  const nombres = age.match(/\d+/g)?.map(Number).filter(Number.isFinite) || [];
  if (nombres.length === 0) return null;

  const ageMax = Math.max(...nombres);
  if (ageMax <= 5) return "0-5";
  if (ageMax <= 11) return "6-11";
  if (ageMax <= 17) return "12-17";
  if (ageMax <= 24) return "18-24";
  return "adulte";
}

function motsMemoire(memoire: MemoireNarrative) {
  return new Set(
    [
      ...motsSignifiants(memoire.titre),
      ...motsSignifiants(memoire.texte),
      ...(memoire.motifs || []).flatMap(motsSignifiants),
    ],
  );
}

function motsChapitre(
  chapitre: Chapter,
  meta: StoredChapter,
  fonctionCourte: string,
  dangerEditorial: string,
  respirationExplicite: string,
) {
  return new Set(
    [
      ...motsSignifiants(chapitre.title),
      ...motsSignifiants(chapitre.souvenirs),
      ...motsSignifiants(chapitre.fonction),
      ...motsSignifiants(meta.description || ""),
      ...motsSignifiants(meta.fonctionNarrative || ""),
      ...motsSignifiants(meta.imageCentrale || ""),
      ...motsSignifiants(meta.typeChapitre || ""),
      ...motsSignifiants(fonctionCourte),
      ...motsSignifiants(dangerEditorial),
      ...motsSignifiants(respirationExplicite),
    ],
  );
}

function compterOccurrences(values: string[]) {
  return values.reduce<Record<string, number>>((acc, value) => {
    const trimmed = value.trim();
    if (!trimmed) return acc;
    acc[trimmed] = (acc[trimmed] || 0) + 1;
    return acc;
  }, {});
}

function topOccurrences(values: string[], limit: number) {
  return Object.entries(compterOccurrences(values))
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, limit)
    .map(([value]) => value);
}

function analyserMemoiresLiees(
  memoires: MemoireNarrative[],
  chapitre: Chapter,
  meta: StoredChapter,
  fonctionCourte: string,
  dangerEditorial: string,
  respirationExplicite: string,
) {
  const periodeChapitre = periodeDepuisAgeChapitre(chapitre.age);
  const motsDuChapitre = motsChapitre(chapitre, meta, fonctionCourte, dangerEditorial, respirationExplicite);

  const memoiresLiees = memoires.filter((memoire) => {
    if (memoire.statut === "archive") return false;
    if (!memoire.tomeProbable && memoire.periode !== "transgenerationnel") return false;

    const estTome1 = memoire.tomeProbable === 1;
    const estTransgenerationnel = memoire.periode === "transgenerationnel";
    if (!estTome1 && !estTransgenerationnel) return false;

    if (estTome1 && memoire.chapitreProbable === chapitre.num) return true;

    const motsDeMemoire = motsMemoire(memoire);
    const intersections = Array.from(motsDeMemoire).filter((mot) => motsDuChapitre.has(mot));
    const periodeCompatible = Boolean(periodeChapitre && memoire.periode === periodeChapitre);

    if (estTransgenerationnel) return intersections.length >= 2;
    if (periodeCompatible && intersections.length >= 1) return true;
    return intersections.length >= 2;
  });

  return {
    total: memoiresLiees.length,
    nonTraitees: memoiresLiees.filter((memoire) => memoire.statut === "non-traite").length,
    intensiteMoyenne: moyenne(memoiresLiees.map((memoire) => memoire.intensite || 0).filter(Boolean)),
    motifsDominants: topOccurrences(memoiresLiees.flatMap((memoire) => memoire.motifs || []), 4),
    periodesDominantes: topOccurrences(memoiresLiees.map((memoire) => memoire.periode), 3),
    items: memoiresLiees
      .slice()
      .sort((a, b) => {
        const intensiteDiff = (b.intensite || 0) - (a.intensite || 0);
        if (intensiteDiff !== 0) return intensiteDiff;
        return (a.ageApprox || "").localeCompare(b.ageApprox || "", "fr", { numeric: true });
      }),
  };
}

function extraitMemoire(texte: string, maxLength = 180) {
  const clean = texte.replace(/\s+/g, " ").trim();
  if (clean.length <= maxLength) return clean;
  return `${clean.slice(0, maxLength).trim()}...`;
}

function statutMemoireLabel(statut: MemoireNarrative["statut"]) {
  if (statut === "non-traite") return "non traité";
  if (statut === "a-integrer") return "à intégrer";
  if (statut === "integre") return "intégré";
  return "archive";
}

function statutMemoireStyle(statut: MemoireNarrative["statut"]) {
  const styles: Record<MemoireNarrative["statut"], { color: string; background: string; border: string }> = {
    "non-traite": {
      color: "#7A5A16",
      background: "rgba(198,169,126,0.14)",
      border: "1px solid rgba(198,169,126,0.28)",
    },
    "a-integrer": {
      color: "#506070",
      background: "rgba(80,96,112,0.1)",
      border: "1px solid rgba(80,96,112,0.2)",
    },
    integre: {
      color: "#566F52",
      background: "rgba(86,111,82,0.1)",
      border: "1px solid rgba(86,111,82,0.2)",
    },
    archive: {
      color: "#78716C",
      background: "rgba(120,113,108,0.08)",
      border: "1px solid rgba(120,113,108,0.16)",
    },
  };

  return styles[statut];
}

function detecterChapitreDepuisContenu(contenu: string) {
  const contenuNormalise = normaliserTexteStructure(contenu);
  const matchNumero = contenuNormalise.match(/chapitre\s+([1-6])\b/);

  if (matchNumero?.[1]) {
    return `chapitre-${matchNumero[1]}`;
  }

  return Object.entries(TITRES_OFFICIELS_CHAPITRES_1_6).find(([, titre]) =>
    contenuNormalise.includes(normaliserTexteStructure(titre)),
  )?.[0] || null;
}

function normaliserChapitreStocke(chapitre: StoredChapter): StoredChapter {
  const numero = Number(chapitre.id.replace("chapitre-", ""));
  const fallback = Number.isFinite(numero) && numero >= 1 && numero <= 30
    ? creerChapitreInitial(numero)
    : creerChapitreInitial(1);
  const metadata = CHAPITRES_1_6_METADATA[chapitre.id] || {};

  return {
    ...fallback,
    ...chapitre,
    titre: metadata.titre || chapitre.titre || fallback.titre,
    description: chapitre.description || metadata.description || fallback.description,
    type: chapitre.type || chapitre.typeChapitre || fallback.type,
    statut:
      chapitre.statut === "scellé" || chapitre.statut === "écrit" || chapitre.statut === "à écrire"
        ? chapitre.statut
        : fallback.statut,
    contenu: chapitre.contenu || "",
    ageApprox: chapitre.ageApprox ?? metadata.ageApprox ?? fallback.ageApprox,
    periode: chapitre.periode ?? metadata.periode ?? fallback.periode,
    typeChapitre: chapitre.typeChapitre || metadata.typeChapitre || fallback.typeChapitre,
    niveauLourdeur: chapitre.niveauLourdeur || metadata.niveauLourdeur || fallback.niveauLourdeur,
    intensite: chapitre.intensite || metadata.intensite || fallback.intensite,
    potentielSerie: chapitre.potentielSerie || metadata.potentielSerie || fallback.potentielSerie,
    typeEpisode: chapitre.typeEpisode || metadata.typeEpisode || fallback.typeEpisode,
    imageCentrale: chapitre.imageCentrale ?? metadata.imageCentrale ?? fallback.imageCentrale,
    fonctionNarrative:
      chapitre.fonctionNarrative ?? metadata.fonctionNarrative ?? fallback.fonctionNarrative,
    statutStructure: chapitre.statutStructure || metadata.statutStructure || fallback.statutStructure,
  };
}

function reconcilerChapitresTome1(chapitres: StoredChapter[]) {
  const parId = new Map<string, StoredChapter>();

  [...CHAPITRES_TOME_1_INITIAUX, ...chapitres].forEach((chapitre) => {
    parId.set(chapitre.id, normaliserChapitreStocke(chapitre));
  });

  Array.from(parId.values()).forEach((chapitre) => {
    const contenu = chapitre.contenu.trim();
    const chapitreDetecte = contenu ? detecterChapitreDepuisContenu(contenu) : null;

    if (!chapitreDetecte || chapitreDetecte === chapitre.id) {
      return;
    }

    const destination = parId.get(chapitreDetecte);
    if (!destination) {
      return;
    }

    const contenuDestination = destination.contenu.trim();
    destination.contenu = contenuDestination && contenuDestination !== contenu
      ? `${contenuDestination}\n\n--- Contenu déplacé depuis ${chapitre.id} ---\n\n${contenu}`
      : contenu;
    destination.statut =
      chapitre.statut === "scellé" || destination.statut === "scellé" ? "scellé" : "écrit";

    chapitre.contenu = "";
    chapitre.statut = "à écrire";
  });

  return Array.from(parId.values())
    .map((chapitre) => normaliserChapitreStocke(chapitre))
    .sort((a, b) => Number(a.id.replace("chapitre-", "")) - Number(b.id.replace("chapitre-", "")));
}

function initialiserChapitresTome1() {
  try {
    const saved = localStorage.getItem(CHAPITRES_TOME_1_KEY);

    if (!saved) {
      localStorage.setItem(CHAPITRES_TOME_1_KEY, JSON.stringify(CHAPITRES_TOME_1_INITIAUX));
      return;
    }

    const chapitres = JSON.parse(saved) as StoredChapter[];
    const chapitresCompletes = CHAPITRES_TOME_1_INITIAUX.reduce<StoredChapter[]>(
      (acc, chapitreInitial) => {
        const existe = acc.some((chapitre) => chapitre.id === chapitreInitial.id);
        return existe ? acc : [...acc, chapitreInitial];
      },
      Array.isArray(chapitres) ? chapitres : [],
    );
    const chapitresReconciles = reconcilerChapitresTome1(chapitresCompletes);

    localStorage.setItem(CHAPITRES_TOME_1_KEY, JSON.stringify(chapitresReconciles));
  } catch {
    localStorage.setItem(CHAPITRES_TOME_1_KEY, JSON.stringify(CHAPITRES_TOME_1_INITIAUX));
  }
}

function chargerChapitresTome1() {
  initialiserChapitresTome1();

  try {
    const saved = localStorage.getItem(CHAPITRES_TOME_1_KEY);
    const chapitres = saved ? JSON.parse(saved) as StoredChapter[] : CHAPITRES_TOME_1_INITIAUX;
    return Array.isArray(chapitres) ? reconcilerChapitresTome1(chapitres) : CHAPITRES_TOME_1_INITIAUX;
  } catch {
    return CHAPITRES_TOME_1_INITIAUX;
  }
}

async function chargerChapitresTome1DepuisSupabase() {
  if (!supabase) {
    return [];
  }

  const { data, error } = await supabase
    .from("chapitres_tome1")
    .select("id,titre,bloc,type,statut,contenu")
    .order("id", { ascending: true });

  if (error || !data?.length) {
    return [];
  }

  return (data as SupabaseStoredChapter[]).map((chapitre) => ({
    id: chapitre.id,
    titre: chapitre.titre || TITRES_OFFICIELS_CHAPITRES_1_6[chapitre.id] || chapitre.id,
    bloc: chapitre.bloc || 1,
    type: chapitre.type || "fondation",
    statut: chapitre.statut === "scellé" || chapitre.statut === "écrit" ? chapitre.statut : "à écrire",
    contenu: chapitre.contenu || "",
  })) satisfies StoredChapter[];
}

type ChapterStorageState = "vide" | "rempli" | "scellé";

function getStoredChapterEffectiveStatus(chapitre?: StoredChapter): ChapterStatus {
  if (chapitre?.statut === "scellé") {
    return "scelle";
  }

  if (chapitre?.contenu?.trim()) {
    return "ecrit";
  }

  return "a-ecrire";
}

function getChapterStorageState(chapitre?: StoredChapter): ChapterStorageState {
  if (chapitre?.statut === "scellé") {
    return "scellé";
  }

  if (chapitre?.contenu?.trim()) {
    return "rempli";
  }

  return "vide";
}

function getChapitreNumero(chapitre: StoredChapter) {
  return Number(chapitre.id.replace("chapitre-", ""));
}

function getChapitreEditorialMetadata(chapitre: StoredChapter) {
  const metadata = CHAPITRES_7_30_EDITORIAL_METADATA[chapitre.id];

  if (!metadata) {
    return chapitre;
  }

  return {
    ...chapitre,
    titre: metadata.titre || chapitre.titre,
    ageApprox: metadata.ageApprox || chapitre.ageApprox,
    typeChapitre: metadata.typeChapitre || chapitre.typeChapitre,
    niveauLourdeur: metadata.niveauLourdeur || chapitre.niveauLourdeur,
    intensite: chapitre.intensite || metadata.intensite,
    potentielSerie: metadata.potentielSerie || chapitre.potentielSerie,
    typeEpisode: metadata.typeEpisode || chapitre.typeEpisode,
    imageCentrale: metadata.imageCentrale || chapitre.imageCentrale,
    fonctionNarrative: metadata.fonctionNarrative || chapitre.fonctionNarrative,
  };
}

function getDangerEditorial(chapitre: StoredChapter) {
  return CHAPITRES_7_30_EDITORIAL_METADATA[chapitre.id]?.dangerEditorial || (
    (chapitre.intensite || 0) >= 9
      ? "ouvert"
      : (chapitre.intensite || 0) >= 7
        ? "rapproché"
        : (chapitre.intensite || 0) >= 4
          ? "latent"
          : "invisible"
  );
}

function getRespirationEditoriale(chapitre: StoredChapter) {
  return CHAPITRES_7_30_EDITORIAL_METADATA[chapitre.id]?.respirationEditorial || getRespirationExplicite(chapitre);
}

function getSaturationEditoriale(chapitre: StoredChapter) {
  return CHAPITRES_7_30_EDITORIAL_METADATA[chapitre.id]?.saturationEditorial || getRisqueSaturation(chapitre, [chapitre]);
}

function getIntensityColor(intensite?: number, isEmpty = false) {
  if (isEmpty || !intensite) return "#9A9080";
  if (intensite <= 3) return "#6B8F71";
  if (intensite <= 6) return "#C9A84C";
  if (intensite <= 8) return "#C9713A";
  return "#8B3A2A";
}

function getIntensityDotStyle(intensite?: number, isEmpty = false) {
  return {
    background: getIntensityColor(intensite, isEmpty),
    opacity: isEmpty || !intensite ? 0.4 : 1,
  };
}

const BLOCS: Bloc[] = [
  {
    num: 1,
    title: "Le corps avant les mots",
    age: "0 à 4 ans",
    chapitres: [
      { num: 1, age: "0–2 ans", title: "Le corps avant la mémoire", type: "severe", souvenirs: "Bassinette · eau trop chaude · sirop bu · rat dans la tétine · grenier · niche du chien comme refuge", fonction: "Le corps enregistre avant que l'esprit comprenne. Aucun mot pour ce qui arrive.", etatInterieur: "Je ne comprends pas encore" },
      { num: 2, age: "2 ans", title: "La poupée", type: "severe", souvenirs: "Poupée presque aussi grande · escalier · porte fermée · poignée immobile · attente seule", fonction: "Isolement. L'enfant seule avec son poids. Personne ne vient.", etatInterieur: "Je suis seule" },
      { num: 3, age: "3–4 ans", title: "Ce que la nuit contenait", type: "severe", souvenirs: "Main sur le pied · dentifrice · visage blanc · lucarne · hameçon · plancher froid · urine chaude sur les jambes", fonction: "La peur prend un visage. La nuit est organisée contre l'enfant.", etatInterieur: "La peur a une forme maintenant" },
      { num: 4, age: "~4 ans", title: "Le bois et le métal", type: "severe", souvenirs: "Clé dans serrure · corridor · table · vélo trop grand · chute dans l'escalier · douceur qui ne promet rien", fonction: "Les objets portent le danger. Le corps apprend les règles sans qu'on les explique.", etatInterieur: "Je comprends les règles sans qu'on me les dise" },
    ],
  },
  {
    num: 2,
    title: "Construction du système",
    age: "4 à 6 ans",
    chapitres: [
      { num: 5, age: "< 5 ans", title: "L’ombre du témoin", type: "severe", souvenirs: "Chien suspendu · garage · chaîne · coups · oncle présent et immobile · il voyait, il ne bougeait pas", fonction: "La violence n'est pas juste le père. C'est tous ceux qui regardent et ne bougent pas.", etatInterieur: "Personne ne réagit — c'est donc normal" },
      { num: 6, age: "~5 ans", title: "L’angle mort", type: "severe", souvenirs: "Poules · hache · tronc · corps décapité qui court · violence à table · sang · chambre · noir · yeux ouverts", fonction: "Dissociation. Observer sans pouvoir. Se retirer dans le noir intérieur.", etatInterieur: "Je disparais de l'intérieur" },
      { num: 7, age: "4–5 ans", title: "La table et le silence", type: "severe", souvenirs: "Repas en famille · cuillère suspendue · vapeur qui disparaît · verre posé trop fort · voix qui descend · chaise qui recule", fonction: "La tension quotidienne. Le danger dans les gestes ordinaires.", etatInterieur: "Je lis l'air avant que ça change" },
      { num: 8, age: "3–4 ans", title: "Les animaux et les règles", type: "severe", souvenirs: "Chiots portés à la rivière · chatons noyés · punitions à genoux sur carrelage · mains dans le dos · mère avec gestes mesurés", fonction: "La violence sur le vivant est normale. Personne ne pleure. Le silence est la règle.", etatInterieur: "Les vivants disparaissent sans bruit" },
      { num: 9, age: "5 ans", title: "Devenir invisible", type: "severe", souvenirs: "Gestes appris pour ne pas attirer · rire retenu · corps qui rétrécit · coins de pièce · escalier évité · respiration coupée en deux", fonction: "L'enfant construit ses propres stratégies de survie. Seule. Sans que personne lui enseigne.", etatInterieur: "Disparaître est ma protection" },
      { num: 10, age: "2–3 ans", title: "Ce que les bruits annonçaient", type: "severe", souvenirs: "Sons de la maison la nuit · pas dans le corridor · clé dans la serrure · silence qui change · bois qui craque · corps qui écoute dans le noir", fonction: "Le corps apprend à lire le danger avant que les yeux voient quoi que ce soit.", etatInterieur: "J'entends avant de comprendre" },
      { num: 11, age: "5–6 ans", title: "Ma sœur et moi", type: "doux", souvenirs: "Langage secret · rires à voix basse · jeux inventés · complicité dans le noir · se comprendre sans parler", fonction: "Premier lien de survie. Deux personnes qui tiennent ensemble sans le dire.", etatInterieur: "Ensemble on tient" },
    ],
  },
  {
    num: 3,
    title: "Respirations",
    age: "6 à 8 ans",
    chapitres: [
      { num: 12, age: "6 ans", title: "L'eau", type: "respiration", souvenirs: "Ruisseau ou lac · pieds dans l'eau froide · cailloux sous les orteils · écrevisses · courant · soleil sur la surface · bruit de l'eau", fonction: "Première vraie respiration du livre. Le corps dans quelque chose de doux. Aucune explication.", etatInterieur: "Le corps existe autrement ici" },
      { num: 13, age: "6–7 ans", title: "Dehors", type: "respiration", souvenirs: "Framboises · mains qui tachent · odeur de terre chaude · herbe haute · insectes · chaleur sur les bras · seule dehors sans surveillance", fonction: "L'enfant existe pour elle-même. Pas pour surveiller, pas pour disparaître. Juste être là.", etatInterieur: "Je suis là sans être vue" },
      { num: 14, age: "6–7 ans", title: "L'école", type: "mixte", souvenirs: "Classe · pupitre · crayon · odeur de papier · récréation · un adulte qui parle normalement · règles différentes", fonction: "Il existe un monde avec d'autres règles. Ça déstabilise autant que ça soulage.", etatInterieur: "Les règles ne sont pas les mêmes partout" },
      { num: 15, age: "7 ans", title: "La figure douce", type: "respiration", souvenirs: "Une personne bienveillante · geste simple sans danger · voix qui ne descend pas · présence qui ne surveille pas", fonction: "Il existait une autre façon d'être. Le corps ne savait pas comment recevoir ça.", etatInterieur: "Je ne sais pas quoi faire de la douceur" },
      { num: 16, age: "7–8 ans", title: "Ce que je voulais", type: "doux", souvenirs: "Un objet désiré · un endroit imaginé · un rêve d'enfant · ce qu'on s'inventait pour tenir", fonction: "L'enfant désire. Elle imagine. Elle existe au-delà de la survie.", etatInterieur: "Je veux quelque chose pour moi" },
      { num: 17, age: "8 ans", title: "Mon frère", type: "doux", souvenirs: "Un moment précis avec lui · comment il te regardait · quelque chose qu'il faisait ou disait · ce qu'il savait sans que tu lui dises", fonction: "Ancrer la dédicace dans le récit. \"Tu savais exactement comment me voir.\"", etatInterieur: "Quelqu'un me voit vraiment" },
    ],
  },
  {
    num: 4,
    title: "Le retour et la montée",
    age: "8 à 9 ans",
    chapitres: [
      { num: 18, age: "8–9 ans", title: "Quand l'air a changé", type: "severe", souvenirs: "Tension qui remonte · violence qui reprend · corps qui se remet en alerte · signal que la respiration est finie", fonction: "Le contraste du bloc 3 rend ce retour encore plus lourd. Le lecteur le ressent dans son propre corps.", etatInterieur: "Le corps se souvient avant moi" },
      { num: 19, age: "9 ans", title: "Les boîtes", type: "mixte", souvenirs: "Boîtes qui apparaissent · objets emballés · ce qu'on laisse · rumeurs de déménagement · inquiétude sans nom", fonction: "L'instabilité s'annonce. L'enfant anticipe sans comprendre ce qui vient.", etatInterieur: "Quelque chose va changer mais je ne sais pas quoi" },
      { num: 20, age: "9 ans", title: "La route", type: "charniere", souvenirs: "Voiture · paysage qui change · Cowansville qui disparaît · silence dans l'habitacle · odeur de la voiture · premier regard sur Dunham", fonction: "Rupture géographique. Point de non-retour. Dunham commence ici.", etatInterieur: "Le sol disparaît sous mes pieds" },
      { num: 21, age: "9–10 ans", title: "La nouvelle maison", type: "severe", souvenirs: "Dunham · nouveaux planchers · odeurs inconnues · fenêtres différentes · repérer les zones de danger", fonction: "Le système voyage avec la famille. Un nouveau lieu ne change rien au danger.", etatInterieur: "C'est pareil mais je ne connais pas encore les coins" },
      { num: 22, age: "9–10 ans", title: "L'isolement", type: "severe", souvenirs: "Dunham plus loin de tout · moins de voisins · moins de témoins · nouvelle école · sentiment que personne ne verra", fonction: "L'isolement géographique amplifie tout. Plus personne ne voit. Le danger n'a plus de limites.", etatInterieur: "Personne ne peut me voir d'ici" },
    ],
  },
  {
    num: 5,
    title: "La fracture",
    age: "9 à 11 ans",
    chapitres: [
      { num: 23, age: "10 ans", title: "Le climat reprend", type: "severe", souvenirs: "Reprise de la violence à Dunham · atmosphère encore plus lourde · scène précise · peut-être pire qu'avant", fonction: "Dunham n'est pas une échappatoire. Le système se réinstalle intact.", etatInterieur: "C'est pire qu'avant" },
      { num: 24, age: "10 ans", title: "Ce que le corps faisait seul", type: "severe", souvenirs: "Réactions automatiques · sursauts · sommeil fragmenté · rapport à la nourriture · corps qui agit avant que l'esprit décide", fonction: "La dissociation est installée. Le corps a ses propres mémoires.", etatInterieur: "Mon corps fait des choses que je ne lui demande pas" },
      { num: 25, age: "10 ans", title: "La nuit différente", type: "severe", souvenirs: "Une nuit qui ne ressemble pas aux autres · quelque chose a changé · le corps sait avant les mots · premiers signes — montrer sans jamais nommer", fonction: "Fracture. Premier signe de l'inceste. Ne rien nommer. Juste ce que le corps enregistre.", etatInterieur: "Quelque chose s'est cassé cette nuit" },
      { num: 26, age: "10–11 ans", title: "Le lendemain ordinaire", type: "severe", souvenirs: "Matin qui continue normalement · petit-déjeuner · gestes ordinaires · comme si rien · vie de surface intacte · silence absolu dans le corps", fonction: "Dissociation totale. La vie continue par-dessus. C'est ce silence-là qui est le plus dévastateur.", etatInterieur: "Tout continue comme si rien" },
      { num: 27, age: "11 ans", title: "Ma sœur ne sait pas", type: "severe", souvenirs: "Distance nouvelle · quelque chose qui ne peut plus se dire · lien qui tient mais qui a changé · moment où tu as réalisé que tu ne pouvais pas lui dire", fonction: "Le secret isole même à l'intérieur du lien le plus proche.", etatInterieur: "Je suis seule avec ça" },
      { num: 28, age: "11 ans", title: "Ce que j'avais appris à faire", type: "severe", souvenirs: "Gestes automatiques · comment sourire · comment tenir le corps droit · comment traverser une pièce · ce que ça coûte", fonction: "L'inventaire sans inventaire. Le coût réel de la survie.", etatInterieur: "Je sais survivre mais je ne sais pas autre chose" },
      { num: 29, age: "11 ans", title: "L'hiver de mes onze ans", type: "mixte", souvenirs: "Dunham en hiver · neige · froid · fenêtre givrée · silence de la neige · monde extérieur blanc et indifférent · attendre sans savoir quoi", fonction: "Avant-dernière image. Lourde et belle. Le monde dehors ne sait pas.", etatInterieur: "Le monde dehors continue sans moi" },
      { num: 30, age: "11 ans", title: "Le gel et la lumière", type: "fin", souvenirs: "Une image finale · lumière sur la neige ou sur l'eau · le corps encore debout · rien ne se résout · tout continue · mais quelque chose résiste", fonction: "Le titre du tome. Ce qui fige et ce qui résiste en même temps. Fin ouverte.", etatInterieur: "Je suis encore là" },
    ],
  },
];

const CHAPITRES_ECRITS_PAR_DEFAUT = [1, 2, 4, 6, 8, 10];

const TYPE_CONFIG: Record<ChapterType, { label: string; bg: string; text: string; border: string }> = {
  severe: { label: "Sévère", bg: "#FEF2F2", text: "#991B1B", border: "#FCA5A5" },
  doux: { label: "Doux", bg: "#F0FDF4", text: "#166534", border: "#86EFAC" },
  respiration: { label: "Respiration", bg: "#EFF6FF", text: "#1E40AF", border: "#93C5FD" },
  charniere: { label: "Charnière", bg: "#F5F3FF", text: "#4C1D95", border: "#C4B5FD" },
  fin: { label: "Fin du tome", bg: "#FFFBEB", text: "#92400E", border: "#FCD34D" },
  mixte: { label: "Mixte", bg: "#FFF7ED", text: "#9A3412", border: "#FDBA74" },
};

const STATUS_CONFIG: Record<ChapterStatus, { label: string; bg: string; text: string; border: string; dot: string }> = {
  "a-ecrire": { label: "À écrire", bg: "#F9FAFB", text: "#6B7280", border: "#E5E7EB", dot: "#D1D5DB" },
  ecrit: { label: "Écrit", bg: "#F0FDF4", text: "#166534", border: "#86EFAC", dot: "#22C55E" },
  scelle: { label: "Scellé", bg: "#FFFBEB", text: "#92400E", border: "#FCD34D", dot: "#F59E0B" },
};

const BLOC_COLORS = [
  { bg: "#EFF6FF", border: "#BFDBFE", text: "#1E3A8A", num: "#3B82F6" },
  { bg: "#FFF7ED", border: "#FED7AA", text: "#7C2D12", num: "#F97316" },
  { bg: "#F0FDF4", border: "#BBF7D0", text: "#14532D", num: "#22C55E" },
  { bg: "#F5F3FF", border: "#DDD6FE", text: "#2E1065", num: "#8B5CF6" },
  { bg: "#FFF1F2", border: "#FECDD3", text: "#881337", num: "#F43F5E" },
];

const POTENTIEL_SERIE_SCORE: Record<PotentielSerieChapitre, number> = {
  faible: 1,
  moyen: 2,
  fort: 3,
  iconique: 4,
};

const TYPES_TENSION: TypeChapitre[] = ["tension", "trauma", "pivot", "effondrement"];
const TYPES_RESPIRATION: TypeChapitre[] = ["respiration", "contraste", "transition"];
const TYPES_CLIMAX: TypeChapitre[] = ["pivot", "effondrement"];

function moyenne(values: number[]) {
  if (values.length === 0) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function formatMoyenne(value: number) {
  return value ? value.toFixed(1).replace(".", ",") : "—";
}

function ratioLabel(tension: number, respiration: number) {
  if (tension === 0 && respiration === 0) return "À définir";
  if (respiration === 0) return `${tension}:0`;
  return `${tension}:${respiration}`;
}

function resumerBlocNarratif(chapitres: StoredChapter[]) {
  const intensite = moyenne(chapitres.map((chapitre) => chapitre.intensite || 0).filter(Boolean));
  const trauma = chapitres.filter((chapitre) => chapitre.typeChapitre === "trauma" || chapitre.typeChapitre === "effondrement").length;
  const respirations = chapitres.filter((chapitre) => chapitre.typeChapitre === "respiration").length;
  const pivots = chapitres.filter((chapitre) => chapitre.typeChapitre === "pivot" || chapitre.typeEpisode === "climax").length;

  if (trauma >= 2 && respirations === 0) {
    return `Bloc très chargé · intensité ${formatMoyenne(intensite)} · respiration à prévoir.`;
  }

  if (pivots > 0) {
    return `Bloc de bascule · ${pivots} pivot${pivots > 1 ? "s" : ""} · intensité ${formatMoyenne(intensite)}.`;
  }

  if (respirations > trauma) {
    return `Bloc de reprise d’air · ${respirations} respiration${respirations > 1 ? "s" : ""}.`;
  }

  return `Bloc en construction · intensité ${formatMoyenne(intensite)} · équilibre à suivre.`;
}

function detecterSaturations(chapitres: StoredChapter[]) {
  const alertes: string[] = [];
  const ordonnes = [...chapitres].sort(
    (a, b) => Number(a.id.replace("chapitre-", "")) - Number(b.id.replace("chapitre-", "")),
  );

  for (let index = 0; index <= ordonnes.length - 3; index += 1) {
    const serie = ordonnes.slice(index, index + 3);
    if (serie.every((chapitre) => TYPES_TENSION.includes(chapitre.typeChapitre || "transition"))) {
      alertes.push(`Ch. ${index + 1}–${index + 3} : tension continue, respiration utile.`);
    }
  }

  const sansRespiration = ordonnes.filter((chapitre) => chapitre.typeChapitre === "respiration").length === 0;
  const intensiteMoyenne = moyenne(ordonnes.map((chapitre) => chapitre.intensite || 0).filter(Boolean));

  if (sansRespiration) {
    alertes.push("Aucune respiration marquée dans le tome.");
  }

  if (intensiteMoyenne >= 7.5 && sansRespiration) {
    alertes.push("Intensité élevée sans contrepoids doux.");
  }

  return Array.from(new Set(alertes)).slice(0, 4);
}

function typeAffichageDepuisChapitre(typeChapitre?: TypeChapitre): ChapterType {
  if (typeChapitre === "respiration") return "respiration";
  if (typeChapitre === "pivot") return "charniere";
  if (typeChapitre === "transition" || typeChapitre === "contraste") return "mixte";
  if (typeChapitre === "trauma" || typeChapitre === "effondrement" || typeChapitre === "tension") {
    return "severe";
  }

  return "mixte";
}

function getRespirationExplicite(chapitre: StoredChapter) {
  if (chapitre.typeEpisode === "respiration" || chapitre.typeChapitre === "respiration") return "Respiration";
  if (chapitre.typeChapitre === "pivot" || chapitre.typeChapitre === "effondrement" || chapitre.typeEpisode === "climax") return "Bascule";
  if (chapitre.typeChapitre === "transition" || chapitre.typeEpisode === "aftermath") return "Transition";
  if (chapitre.typeChapitre === "contraste") return "Faux calme";
  if ((chapitre.intensite || 0) <= 4 || chapitre.niveauLourdeur === "leger") return "Normalité fragile";
  return "Tension";
}

function getFonctionNarrativeCourte(chapitre: StoredChapter) {
  const fonctionEditoriale = FONCTIONS_COURTES_7_30[chapitre.id];

  if (fonctionEditoriale) {
    return fonctionEditoriale;
  }

  const source = normaliserTexteStructure(`${chapitre.fonctionNarrative || ""} ${chapitre.description || ""} ${chapitre.typeEpisode || ""}`);

  if (source.includes("installer") || source.includes("premiere verite") || chapitre.typeEpisode === "ouverture") return "implantation";
  if (source.includes("contamin") || source.includes("danger") || source.includes("systeme voyage")) return "contamination";
  if (source.includes("regle") || source.includes("apprend") || source.includes("survie")) return "dressage";
  if (source.includes("immobil") || source.includes("dissociation") || source.includes("dispar")) return "immobilité";
  if (source.includes("bascule") || chapitre.typeChapitre === "pivot") return "bascule";
  if (source.includes("respiration") || source.includes("douce") || chapitre.typeChapitre === "respiration") return "respiration";
  if (source.includes("normal") || source.includes("ordinaire") || source.includes("surface")) return "illusion de normalité";
  if (source.includes("fracture") || source.includes("casse") || chapitre.typeChapitre === "effondrement") return "fracture";
  if (source.includes("revel") || source.includes("montrer")) return "révélation";
  if (source.includes("montee") || source.includes("amplifie") || chapitre.typeEpisode === "montee") return "montée";
  if (source.includes("prepar") || source.includes("annonce")) return "préparation";
  if (source.includes("destabilis") || source.includes("instabilite")) return "désorientation";
  if (source.includes("lendemain") || chapitre.typeEpisode === "aftermath") return "après-coup";
  if (source.includes("fin") || chapitre.typeEpisode === "finale") return "clôture";
  return chapitre.typeEpisode === "climax" ? "bascule" : "préparation";
}

function isChapitreLourd(chapitre: StoredChapter) {
  return (chapitre.intensite || 0) >= 8 && TYPES_TENSION.includes(chapitre.typeChapitre || "transition");
}

function getRisqueSaturation(chapitre: StoredChapter, chapitres: StoredChapter[]) {
  const numero = Number(chapitre.id.replace("chapitre-", ""));
  const precedent = chapitres.find((item) => Number(item.id.replace("chapitre-", "")) === numero - 1);
  const suivant = chapitres.find((item) => Number(item.id.replace("chapitre-", "")) === numero + 1);
  const serieLourde =
    isChapitreLourd(chapitre) &&
    ((precedent && isChapitreLourd(precedent)) || (suivant && isChapitreLourd(suivant)));

  if (serieLourde) return "Respiration nécessaire après";
  if ((chapitre.intensite || 0) >= 8 && (TYPES_TENSION.includes(chapitre.typeChapitre || "transition") || TYPES_CLIMAX.includes(chapitre.typeChapitre || "transition"))) {
    return "Saturation élevée";
  }
  if (TYPES_RESPIRATION.includes(chapitre.typeChapitre || "transition") || chapitre.typeEpisode === "respiration") {
    return "Saturation basse";
  }
  if ((chapitre.intensite || 0) >= 5) return "Saturation moyenne";
  return "Saturation basse";
}

function editorialBadgeStyle(kind: "respiration" | "fonction" | "saturation", label: string, isSelected: boolean) {
  const base = {
    fontFamily: "system-ui, sans-serif",
    fontSize: 9,
    padding: "0 5px",
    borderRadius: 20,
    whiteSpace: "nowrap" as const,
  };

  if (kind === "respiration") {
    return {
      ...base,
      background: isSelected ? "rgba(107,143,113,0.11)" : "rgba(107,143,113,0.08)",
      border: "1px solid rgba(107,143,113,0.15)",
      color: "#4F654F",
    };
  }

  if (kind === "saturation") {
    return {
      ...base,
      background: isSelected ? "rgba(201,168,76,0.12)" : "rgba(201,168,76,0.08)",
      border: "1px solid rgba(201,168,76,0.18)",
      color: "#7A6428",
    };
  }

  return {
    ...base,
    background: isSelected ? "rgba(198,169,126,0.14)" : "rgba(198,169,126,0.09)",
    border: "1px solid rgba(198,169,126,0.22)",
    color: "#6F5B3F",
  };
}

function chapitreAffichageDepuisStockage(chapitre: StoredChapter): Chapter {
  const numero = Number(chapitre.id.replace("chapitre-", ""));

  return {
    num: numero,
    age: chapitre.ageApprox || "—",
    title: chapitre.titre,
    type: typeAffichageDepuisChapitre(chapitre.typeChapitre),
    souvenirs: chapitre.description || "À définir",
    fonction: chapitre.fonctionNarrative || "À définir",
    etatInterieur: chapitre.imageCentrale || "À définir",
  };
}

const BLOCS_TOME_1: Bloc[] = [
  { num: 1, title: "Le corps avant les mots", age: "0 à 4 ans", chapitres: [] },
  { num: 2, title: "Construction du système", age: "4 à 6 ans", chapitres: [] },
  { num: 3, title: "Respirations", age: "6 à 8 ans", chapitres: [] },
  { num: 4, title: "Le retour et la montée", age: "8 à 9 ans", chapitres: [] },
  { num: 5, title: "La fracture", age: "9 à 11 ans", chapitres: [] },
].map((bloc) => ({
  ...bloc,
  chapitres: CHAPITRES_TOME_1_INITIAUX
    .filter((chapitre) => chapitre.bloc === bloc.num)
    .map(chapitreAffichageDepuisStockage),
}));

export default function StructureTome1() {
  const [statuts, setStatuts] = useState<Record<number, ChapterStatus>>({});
  const [selected, setSelected] = useState<Chapter | null>(null);
  const [filter, setFilter] = useState<ChapterStatus | "all">("all");
  const [chapitresStockes, setChapitresStockes] = useState<StoredChapter[]>([]);
  const [editingChapterId, setEditingChapterId] = useState<string | null>(null);
  const [draftContent, setDraftContent] = useState("");
  const [cloudStatus, setCloudStatus] = useState("");
  const [scenes, setScenes] = useState<Scene[]>([]);
  const [fragments, setFragments] = useState<Fragment[]>([]);
  const [memoiresNarratives, setMemoiresNarratives] = useState<MemoireNarrative[]>([]);
  const [relationsHydratees, setRelationsHydratees] = useState(false);

  useEffect(() => {
    let actif = true;

    async function chargerDonnees() {
      setScenes(lireScenesRelationnelles());
      setFragments(lireFragments());
      setMemoiresNarratives(lireMemoiresNarratives());
      setRelationsHydratees(true);
      const chapitresLocaux = chargerChapitresTome1();
      const chapitresCloud = await chargerChapitresTome1DepuisSupabase();
      const chapitresCharges = chapitresCloud.length > 0
        ? reconcilerChapitresTome1(chapitresCloud)
        : chapitresLocaux;

      if (!actif) return;

    const statutsDepuisChapitres = chapitresCharges.reduce<Record<number, ChapterStatus>>(
      (acc, chapitre) => {
        const numero = Number(chapitre.id.replace("chapitre-", ""));
        if (Number.isFinite(numero)) {
          acc[numero] = getStoredChapterEffectiveStatus(chapitre);
        }
        return acc;
      },
      {},
    );

    setChapitresStockes(chapitresCharges);

    const saved = localStorage.getItem("tome1-statuts");
    if (saved) {
      const statutsSynchronises = {
        ...JSON.parse(saved),
        ...statutsDepuisChapitres,
      };
      setStatuts(statutsSynchronises);
      localStorage.setItem("tome1-statuts", JSON.stringify(statutsSynchronises));
    } else {
      const defaults: Record<number, ChapterStatus> = {};
      CHAPITRES_ECRITS_PAR_DEFAUT.forEach((n) => { defaults[n] = "ecrit"; });
      const statutsSynchronises = { ...defaults, ...statutsDepuisChapitres };
      setStatuts(statutsSynchronises);
      localStorage.setItem("tome1-statuts", JSON.stringify(statutsSynchronises));
    }
    }

    chargerDonnees();

    return () => {
      actif = false;
    };
  }, []);

  const saveStatut = (num: number, status: ChapterStatus) => {
    const updated = { ...statuts, [num]: status };
    setStatuts(updated);
    localStorage.setItem("tome1-statuts", JSON.stringify(updated));

    const chapter = BLOCS_TOME_1.flatMap((bloc) => bloc.chapitres).find((item) => item.num === num);
    if (!chapter) return;

    const storedStatus: StoredChapterStatus =
      status === "scelle" ? "scellé" : status === "ecrit" ? "écrit" : "à écrire";

    updateStoredChapter(chapter, (storedChapter) => ({
      ...storedChapter,
      statut: storedStatus,
    }));
  };

  const syncStatut = (num: number, status: ChapterStatus) => {
    const updated = { ...statuts, [num]: status };
    setStatuts(updated);
    localStorage.setItem("tome1-statuts", JSON.stringify(updated));
  };

  const getStoredChapter = (num: number) =>
    chapitresStockes.find((chapitre) => chapitre.id === `chapitre-${num}`);

  const blocsAffiches = BLOCS_TOME_1.map((bloc) => ({
    ...bloc,
    chapitres: bloc.chapitres.map((chapter) => {
      const storedChapter = getStoredChapter(chapter.num);
      return storedChapter
        ? chapitreAffichageDepuisStockage(getChapitreEditorialMetadata(storedChapter))
        : chapitreAffichageDepuisStockage(getChapitreEditorialMetadata(creerChapitreInitial(chapter.num)));
    }),
  }));

  const createStoredChapter = (chapter: Chapter): StoredChapter => {
    const initial = creerChapitreInitial(chapter.num);

    return {
      ...initial,
      titre: chapter.title,
      bloc: BLOCS_TOME_1.find((bloc) => bloc.chapitres.some((chapitre) => chapitre.num === chapter.num))?.num || initial.bloc,
      type: TYPE_CONFIG[chapter.type].label.toLowerCase(),
    };
  };

  const updateStoredChapter = (
    chapter: Chapter,
    updater: (storedChapter: StoredChapter) => StoredChapter,
  ) => {
    const chapterId = `chapitre-${chapter.num}`;
    const existingChapter = getStoredChapter(chapter.num);
    const updatedChapter = updater(existingChapter || createStoredChapter(chapter));
    const nextChapitres = chapitresStockes.some((storedChapter) => storedChapter.id === chapterId)
      ? chapitresStockes.map((storedChapter) =>
      storedChapter.id === chapterId ? updatedChapter : storedChapter,
      )
      : [...chapitresStockes, updatedChapter];

    setChapitresStockes(nextChapitres);
    localStorage.setItem(CHAPITRES_TOME_1_KEY, JSON.stringify(nextChapitres));
    return updatedChapter;
  };

  const updateChapterMetadata = (chapter: Chapter, updates: Partial<StoredChapter>) => {
    updateStoredChapter(chapter, (storedChapter) => ({
      ...storedChapter,
      ...updates,
      type: updates.typeChapitre || storedChapter.type,
    }));
  };

  const sauvegarderChapitresDansCloud = async () => {
    if (!supabase) {
      setCloudStatus("Supabase non configuré. Ajoute la clé publishable dans .env.local.");
      return;
    }

    const payload = chapitresStockes.map((chapitre) => ({
      id: chapitre.id,
      titre: chapitre.titre,
      bloc: chapitre.bloc,
      type: chapitre.type,
      statut: chapitre.statut,
      contenu: chapitre.contenu,
      updated_at: new Date().toISOString(),
    }));

    const { error } = await supabase
      .from("chapitres_tome1")
      .upsert(payload, { onConflict: "id" });

    setCloudStatus(error ? `Erreur cloud : ${error.message}` : "Sauvegarde cloud effectuée");
  };

  const startEditingChapter = (chapter: Chapter) => {
    const storedChapter = getStoredChapter(chapter.num) || createStoredChapter(chapter);

    if (storedChapter.statut === "scellé") {
      setEditingChapterId(null);
      setDraftContent(storedChapter.contenu || "");
      return;
    }

    setEditingChapterId(storedChapter.id);
    setDraftContent(storedChapter?.contenu || "");
  };

  const saveChapterContent = (chapter: Chapter) => {
    updateStoredChapter(chapter, (storedChapter) => ({
      ...storedChapter,
      contenu: draftContent,
      statut: draftContent.trim() ? "écrit" : storedChapter.statut,
    }));
    if (draftContent.trim()) {
      syncStatut(chapter.num, "ecrit");
    }
    setEditingChapterId(null);
  };

  const sealChapter = (chapter: Chapter) => {
    updateStoredChapter(chapter, (storedChapter) => ({
      ...storedChapter,
      contenu: draftContent,
      statut: "scellé",
    }));
    syncStatut(chapter.num, "scelle");
    setEditingChapterId(null);
  };

  const unlockChapter = (chapter: Chapter) => {
    const updatedChapter = updateStoredChapter(chapter, (storedChapter) => ({
      ...storedChapter,
      statut: storedChapter.contenu.trim() ? "écrit" : "à écrire",
    }));
    syncStatut(chapter.num, updatedChapter.contenu.trim() ? "ecrit" : "a-ecrire");

    setDraftContent(updatedChapter.contenu || "");
    setEditingChapterId(updatedChapter.id);
  };

  const allChapters = blocsAffiches.flatMap((b) => b.chapitres);
  const chapitresAnalyse = CHAPITRES_TOME_1_INITIAUX.map((fallback) =>
    getChapitreEditorialMetadata(getStoredChapter(Number(fallback.id.replace("chapitre-", ""))) || fallback),
  );
  const memoireActiveEditoriale = genererAlertesEditoriales(chapitresAnalyse, fragments);
  const diagnosticDirecteurEditorial = genererDiagnosticEditorial(chapitresAnalyse, fragments);
  const intensites = chapitresAnalyse.map((chapitre) => chapitre.intensite || 0).filter(Boolean);
  const intensiteMoyenneTome = moyenne(intensites);
  const chapitresTension = chapitresAnalyse.filter((chapitre) =>
    TYPES_TENSION.includes(chapitre.typeChapitre || "transition"),
  );
  const chapitresRespiration = chapitresAnalyse.filter((chapitre) =>
    TYPES_RESPIRATION.includes(chapitre.typeChapitre || "transition"),
  );
  const scoreSerieGlobal = Math.round(
    (moyenne(chapitresAnalyse.map((chapitre) => POTENTIEL_SERIE_SCORE[chapitre.potentielSerie || "faible"])) / 4) * 100,
  );
  const chapitresIconiques = chapitresAnalyse.filter((chapitre) => chapitre.potentielSerie === "iconique").length;
  const chapitresPivot = chapitresAnalyse.filter((chapitre) =>
    TYPES_CLIMAX.includes(chapitre.typeChapitre || "transition") || chapitre.typeEpisode === "climax",
  );
  const alertesNarratives = detecterSaturations(chapitresAnalyse);
  const timelineAge = chapitresAnalyse
    .filter((chapitre) => chapitre.ageApprox)
    .map((chapitre) => ({
      id: chapitre.id,
      age: chapitre.ageApprox || "—",
      intensite: chapitre.intensite || 0,
      titre: chapitre.titre,
    }));
  const blocAnalyses = blocsAffiches.map((bloc) => {
    const chapitresBloc = chapitresAnalyse.filter((chapitre) => chapitre.bloc === bloc.num);
    const traumaCount = chapitresBloc.filter((chapitre) =>
      chapitre.typeChapitre === "trauma" || chapitre.typeChapitre === "effondrement",
    ).length;
    const sceneFragmentStats = chapitresBloc.map((chapitre) => {
      const numero = getChapitreNumero(chapitre);
      return relationsHydratees
        ? getChapterNarrativeStats({ tomeId: 1, chapitre: numero, scenes, fragments })
        : {
            sceneCount: 0,
            fragmentCount: 0,
            memoireCount: 0,
            averageIntensity: 0,
            hasRespiration: false,
            hasPivot: false,
            hasTrauma: false,
            motifs: [],
          };
    });
    const motifs = sceneFragmentStats.flatMap((stats) => stats.motifs);
    const motifsDominants = Object.entries(
      motifs.reduce<Record<string, number>>((acc, motif) => {
        acc[motif] = (acc[motif] || 0) + 1;
        return acc;
      }, {}),
    )
      .sort((a, b) => b[1] - a[1])
      .slice(0, 4)
      .map(([motif]) => motif);

    return {
      bloc,
      chapitresBloc,
      traumaCount,
      densiteTrauma: chapitresBloc.length ? Math.round((traumaCount / chapitresBloc.length) * 100) : 0,
      scenesLiees: sceneFragmentStats.reduce((sum, stats) => sum + stats.sceneCount, 0),
      fragmentsLies: sceneFragmentStats.reduce((sum, stats) => sum + stats.fragmentCount, 0),
      motifsDominants,
      resume: resumerBlocNarratif(chapitresBloc),
    };
  });
  const getStatut = (num: number): ChapterStatus => {
    const storedChapter = getStoredChapter(num);
    return storedChapter ? getStoredChapterEffectiveStatus(storedChapter) : (statuts[num] || "a-ecrire");
  };

  const statutsFusionnes = allChapters.reduce<Record<number, ChapterStatus>>((acc, chapter) => {
    acc[chapter.num] = getStatut(chapter.num);
    return acc;
  }, {});
  const totalEcrit = Object.values(statutsFusionnes).filter((s) => s === "ecrit" || s === "scelle").length;
  const totalScelle = Object.values(statutsFusionnes).filter((s) => s === "scelle").length;
  const totalAEcrire = allChapters.length - totalEcrit;
  const filteredNums = filter === "all" ? null : new Set(allChapters.filter((c) => statutsFusionnes[c.num] === filter).map((c) => c.num));
  const derniersChapitresTravailles = allChapters
    .filter((chapter) => ["ecrit", "scelle"].includes(statutsFusionnes[chapter.num]))
    .sort((a, b) => a.num - b.num)
    .slice(-3);
  const warningTension =
    derniersChapitresTravailles.length === 3 &&
    derniersChapitresTravailles.every((chapter) => chapter.type === "severe");

  return (
    <div style={{ minHeight: "100vh", background: "#FAFAF8", fontFamily: "'Georgia', 'Times New Roman', serif" }}>

      {/* Header */}
      <div style={{ background: "transparent", color: "#1C1917", padding: "2.5rem 2rem 2rem" }}>
        <div style={{ maxWidth: 860, margin: "0 auto" }}>
          <div style={{ marginBottom: 14 }}>
            <BackLink label="Système" />
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 12 }}>
            <Link className="internal-button" href="/guide-strate">
              Besoin d’aide ?
            </Link>
          </div>
          <p style={{ fontSize: 11, letterSpacing: "0.15em", textTransform: "uppercase", color: "#8B7355", marginBottom: 8, fontFamily: "system-ui, sans-serif" }}>L'Héritage des silences</p>
          <h1 style={{ fontSize: 28, fontWeight: 400, margin: "0 0 6px", letterSpacing: "-0.02em" }}>Tome I — Le gel et la lumière</h1>
          <p style={{ fontSize: 14, color: "#78716C", margin: "0 0 2rem", fontFamily: "system-ui, sans-serif" }}>Plan directeur · Guide du manuscrit</p>

          {/* Stats */}
          <div style={{ display: "flex", gap: 24, flexWrap: "wrap" }}>
            {[
              { val: 30, label: "chapitres" },
              { val: totalEcrit, label: "écrits" },
              { val: totalScelle, label: "scellés" },
              { val: totalAEcrire, label: "à écrire" },
            ].map((s) => (
              <div key={s.label} style={{ textAlign: "center" }}>
                <div style={{ fontSize: 28, fontWeight: 300, color: "#1C1917", lineHeight: 1 }}>{s.val}</div>
                <div style={{ fontSize: 11, color: "#78716C", textTransform: "uppercase", letterSpacing: "0.1em", fontFamily: "system-ui, sans-serif", marginTop: 2 }}>{s.label}</div>
              </div>
            ))}
            <div style={{ marginLeft: "auto", display: "flex", alignItems: "flex-end" }}>
              <div style={{ display: "grid", gap: 8, justifyItems: "end" }}>
                <button
                  onClick={sauvegarderChapitresDansCloud}
                  style={{
                    border: "1px solid rgba(120, 113, 108, 0.28)",
                    borderRadius: 999,
                    background: "rgba(255, 253, 248, 0.45)",
                    color: "#1C1917",
                    cursor: "pointer",
                    fontFamily: "system-ui, sans-serif",
                    fontSize: 12,
                    padding: "7px 12px",
                  }}
                  type="button"
                >
                  Sauvegarder dans le cloud
                </button>
                {cloudStatus && (
                  <p style={{ color: "#78716C", fontFamily: "system-ui, sans-serif", fontSize: 11, margin: 0 }}>
                    {cloudStatus}
                  </p>
                )}
                <div style={{ width: 120, height: 4, background: "rgba(120,113,108,0.22)", borderRadius: 2, overflow: "hidden" }}>
                  <div style={{ width: `${Math.round((totalEcrit / 30) * 100)}%`, height: "100%", background: "#22C55E", borderRadius: 2, transition: "width 0.5s" }} />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div style={{ background: "#F5F0E8", borderBottom: "1px solid #E7E2D8", padding: "0.75rem 2rem" }}>
        <div style={{ maxWidth: 860, margin: "0 auto", display: "flex", gap: 8, flexWrap: "wrap", fontFamily: "system-ui, sans-serif" }}>
          {(["all", "a-ecrire", "ecrit", "scelle"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              style={{
                padding: "4px 14px", borderRadius: 20, fontSize: 12, cursor: "pointer", border: "1px solid",
                background: filter === f ? "#1C1917" : "transparent",
                color: filter === f ? "#F5F0E8" : "#78716C",
                borderColor: filter === f ? "#1C1917" : "#D6D0C4",
                transition: "all 0.15s",
              }}
            >
              {f === "all" ? "Tous" : STATUS_CONFIG[f].label}
            </button>
          ))}
        </div>
      </div>

      {warningTension && (
        <div style={{ background: "#FFF7ED", borderBottom: "1px solid #FDBA74", padding: "0.85rem 2rem" }}>
          <div style={{ maxWidth: 860, margin: "0 auto", color: "#9A3412", fontFamily: "system-ui, sans-serif", fontSize: 13, fontWeight: 600 }}>
            ⚠️ Trop de tension. Ajouter respiration.
          </div>
        </div>
      )}

      <section style={{ background: "#F7F2EA", borderBottom: "1px solid #E0D7C8", padding: "0.9rem 2rem" }}>
        <div style={{ maxWidth: 860, margin: "0 auto", fontFamily: "system-ui, sans-serif" }}>
          <p style={{ color: "#8B7355", fontSize: 10, letterSpacing: "0.14em", margin: "0 0 8px", textTransform: "uppercase" }}>
            Mémoire active
          </p>
          <div style={{ display: "grid", gap: 6, gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))" }}>
            {memoireActiveEditoriale.length > 0 ? (
              memoireActiveEditoriale.slice(0, 6).map((alerte) => (
                <div
                  key={alerte.message}
                  style={{
                    background: alerte.tone === "success" ? "rgba(236, 249, 232, 0.72)" : "rgba(255, 247, 237, 0.75)",
                    border: alerte.tone === "success" ? "1px solid rgba(107, 142, 98, 0.22)" : "1px solid rgba(180, 83, 9, 0.18)",
                    borderRadius: 10,
                    color: alerte.tone === "success" ? "#45643D" : "#7C2D12",
                    fontSize: 12,
                    lineHeight: 1.45,
                    padding: "8px 10px",
                  }}
                >
                  {alerte.tone === "success" ? "✓" : "⚠"} {alerte.message}
                </div>
              ))
            ) : (
              <div
                style={{
                  background: "rgba(255,253,248,0.58)",
                  border: "1px solid rgba(120,113,108,0.16)",
                  borderRadius: 10,
                  color: "#78716C",
                  fontSize: 12,
                  lineHeight: 1.45,
                  padding: "8px 10px",
                }}
              >
                Aucun signal majeur pour l’instant.
              </div>
            )}
          </div>
        </div>
      </section>

      <section style={{ background: "#F0E8DA", borderBottom: "1px solid #E0D7C8", padding: "0.95rem 2rem" }}>
        <div style={{ maxWidth: 860, margin: "0 auto", display: "grid", gap: 10, fontFamily: "system-ui, sans-serif" }}>
          <div>
            <p style={{ color: "#8B7355", fontSize: 10, letterSpacing: "0.14em", margin: "0 0 5px", textTransform: "uppercase" }}>
              Directeur éditorial 360°
            </p>
            <p style={{ color: "#57534E", fontSize: 12, lineHeight: 1.45, margin: 0 }}>
              Lecture stratégique du tome : cohérence, variété, respiration, originalité et risque lecteur.
            </p>
          </div>

          <div style={{ display: "grid", gap: 8, gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))" }}>
            {[
              { label: "Cohérence", value: diagnosticDirecteurEditorial.evaluation360.coherence },
              { label: "Variété", value: diagnosticDirecteurEditorial.evaluation360.variete },
              { label: "Respiration", value: diagnosticDirecteurEditorial.evaluation360.respiration },
              { label: "Originalité", value: diagnosticDirecteurEditorial.evaluation360.originalite },
              { label: "Risque lecteur", value: diagnosticDirecteurEditorial.evaluation360.risqueLecteur },
            ].map((item) => (
              <div key={item.label} style={{ background: "rgba(255,253,248,0.58)", border: "1px solid rgba(120,113,108,0.16)", borderRadius: 10, padding: "9px 10px" }}>
                <p style={{ color: "#8B7355", fontSize: 10, letterSpacing: "0.12em", margin: "0 0 4px", textTransform: "uppercase" }}>{item.label}</p>
                <p style={{ color: "#1C1917", fontFamily: "'Georgia', serif", fontSize: 18, lineHeight: 1.1, margin: 0 }}>{item.value}</p>
              </div>
            ))}
          </div>

          <div style={{ display: "grid", gap: 8, gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 250px), 1fr))", minWidth: 0, width: "100%" }}>
            <div style={{ background: "rgba(255,253,248,0.5)", border: "1px solid rgba(120,113,108,0.14)", borderRadius: 10, minWidth: 0, padding: "9px 10px" }}>
              <p style={{ color: "#8B7355", fontSize: 10, letterSpacing: "0.12em", margin: "0 0 6px", textTransform: "uppercase" }}>Signaux</p>
              <ul style={{ display: "grid", gap: 4, listStyle: "none", margin: 0, padding: 0 }}>
                {diagnosticDirecteurEditorial.signaux.map((signal) => (
                  <li
                    key={signal.message}
                    style={{
                      color: signal.tone === "success" ? "#45643D" : "#7C2D12",
                      fontSize: 12,
                      lineHeight: 1.4,
                    }}
                  >
                    {signal.tone === "success" ? "✓" : "⚠"} {signal.message}
                  </li>
                ))}
              </ul>
            </div>

            <div style={{ background: "rgba(255,253,248,0.5)", border: "1px solid rgba(120,113,108,0.14)", borderRadius: 10, minWidth: 0, padding: "9px 10px" }}>
              <p style={{ color: "#8B7355", fontSize: 10, letterSpacing: "0.12em", margin: "0 0 6px", textTransform: "uppercase" }}>Motifs dominants</p>
              <p style={{ color: "#57534E", fontSize: 12, lineHeight: 1.45, margin: "0 0 5px" }}>
                Top 10 : {diagnosticDirecteurEditorial.motifsSurutilises.length ? diagnosticDirecteurEditorial.motifsSurutilises.map((item) => `${item.motif} (${item.count})`).join(", ") : "à préciser"}
              </p>
              <p style={{ color: "#78716C", fontSize: 12, lineHeight: 1.45, margin: 0 }}>
                Absents : {diagnosticDirecteurEditorial.motifsAbsents.length ? diagnosticDirecteurEditorial.motifsAbsents.slice(0, 4).join(", ") : "aucun signal fort"}
              </p>
            </div>

            <div style={{ background: "rgba(255,253,248,0.5)", border: "1px solid rgba(120,113,108,0.14)", borderRadius: 10, minWidth: 0, padding: "9px 10px" }}>
              <p style={{ color: "#8B7355", fontSize: 10, letterSpacing: "0.12em", margin: "0 0 6px", textTransform: "uppercase" }}>Courbe lecteur</p>
              <p style={{ color: "#57534E", fontSize: 12, lineHeight: 1.45, margin: "0 0 5px" }}>
                Fatigue : {diagnosticDirecteurEditorial.courbeLecteur.fatigue} · Tension : {diagnosticDirecteurEditorial.courbeLecteur.tension}
              </p>
              <p style={{ color: "#78716C", fontSize: 12, lineHeight: 1.45, margin: 0 }}>
                Curiosité : {diagnosticDirecteurEditorial.courbeLecteur.curiosite} · Récupération : {diagnosticDirecteurEditorial.courbeLecteur.recuperation}
              </p>
            </div>

            <div style={{ background: "rgba(255,253,248,0.5)", border: "1px solid rgba(120,113,108,0.14)", borderRadius: 10, minWidth: 0, padding: "9px 10px" }}>
              <p style={{ color: "#8B7355", fontSize: 10, letterSpacing: "0.12em", margin: "0 0 6px", textTransform: "uppercase" }}>Redondances</p>
              <p style={{ color: "#57534E", fontSize: 12, lineHeight: 1.45, margin: "0 0 5px" }}>
                Chapitres : {diagnosticDirecteurEditorial.chapitresRedondants.length ? diagnosticDirecteurEditorial.chapitresRedondants.join(", ") : "aucune redondance forte"}
              </p>
              <p style={{ color: "#78716C", fontSize: 12, lineHeight: 1.45, margin: 0 }}>
                Séquences lourdes : {diagnosticDirecteurEditorial.sequencesTropLourdes.length ? diagnosticDirecteurEditorial.sequencesTropLourdes.join(", ") : "aucune séquence critique"}
              </p>
            </div>
          </div>

          {diagnosticDirecteurEditorial.explications.length > 0 && (
            <div style={{ display: "grid", gap: 8, gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 260px), 1fr))", minWidth: 0, width: "100%" }}>
              {diagnosticDirecteurEditorial.explications.map((explication) => (
                <article
                  key={explication.title}
                  style={{
                    background: "rgba(255, 247, 237, 0.62)",
                    border: "1px solid rgba(180, 83, 9, 0.16)",
                    borderRadius: 10,
                    color: "#57534E",
                    display: "grid",
                    gap: 6,
                    minWidth: 0,
                    overflowWrap: "break-word",
                    padding: "9px 10px",
                    wordBreak: "break-word",
                  }}
                >
                  <h3 style={{ color: "#7C2D12", fontFamily: "'Georgia', serif", fontSize: 15, fontWeight: 500, lineHeight: 1.2, margin: 0 }}>
                    ⚠ {explication.title}
                  </h3>
                  <div>
                    <p style={{ color: "#8B7355", fontSize: 10, letterSpacing: "0.12em", margin: "0 0 3px", textTransform: "uppercase" }}>
                      Pourquoi ?
                    </p>
                    <p style={{ fontSize: 12, lineHeight: 1.45, margin: 0 }}>{explication.cause}</p>
                  </div>
                  <div>
                    <p style={{ color: "#8B7355", fontSize: 10, letterSpacing: "0.12em", margin: "0 0 3px", textTransform: "uppercase" }}>
                      Chapitres concernés
                    </p>
                    <p style={{ fontSize: 12, lineHeight: 1.45, margin: 0 }}>{explication.chapitres}</p>
                  </div>
                  <div>
                    <p style={{ color: "#8B7355", fontSize: 10, letterSpacing: "0.12em", margin: "0 0 3px", textTransform: "uppercase" }}>
                      Suggestion
                    </p>
                    <p style={{ fontSize: 12, lineHeight: 1.45, margin: 0 }}>{explication.recommandation}</p>
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>
      </section>

      <section style={{ background: "#EFE8DC", borderBottom: "1px solid #E0D7C8", padding: "1rem 2rem" }}>
        <div style={{ maxWidth: 860, margin: "0 auto", display: "grid", gap: 14 }}>
          <div style={{ display: "grid", gap: 8, gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", fontFamily: "system-ui, sans-serif" }}>
            {[
              { label: "Intensité moyenne", value: formatMoyenne(intensiteMoyenneTome), note: "courbe émotionnelle" },
              { label: "Tension / respiration", value: ratioLabel(chapitresTension.length, chapitresRespiration.length), note: `${chapitresTension.length} tensions · ${chapitresRespiration.length} respirations` },
              { label: "Score télésérie", value: `${scoreSerieGlobal}%`, note: `${chapitresIconiques} iconique${chapitresIconiques > 1 ? "s" : ""}` },
              { label: "Pivots / climax", value: chapitresPivot.length, note: "bascule narrative" },
            ].map((item) => (
              <div key={item.label} style={{ border: "1px solid rgba(120,113,108,0.18)", borderRadius: 10, background: "rgba(255,253,248,0.58)", padding: "10px 12px" }}>
                <p style={{ color: "#8B7355", fontSize: 10, letterSpacing: "0.12em", margin: "0 0 4px", textTransform: "uppercase" }}>{item.label}</p>
                <p style={{ color: "#1C1917", fontFamily: "'Georgia', serif", fontSize: 22, lineHeight: 1, margin: 0 }}>{item.value}</p>
                <p style={{ color: "#78716C", fontSize: 11, margin: "5px 0 0" }}>{item.note}</p>
              </div>
            ))}
          </div>

          <div
            style={{
              display: "grid",
              gap: 10,
              gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 320px), 1fr))",
              minWidth: 0,
              width: "100%",
            }}
          >
            <div style={{ border: "1px solid rgba(120,113,108,0.16)", borderRadius: 10, background: "rgba(255,253,248,0.5)", minWidth: 0, padding: "10px 12px", width: "100%" }}>
              <p style={{ color: "#8B7355", fontFamily: "system-ui, sans-serif", fontSize: 10, letterSpacing: "0.12em", margin: "0 0 8px", textTransform: "uppercase" }}>Courbe émotionnelle · timeline âge</p>
              <div style={{ alignItems: "end", display: "grid", gap: 4, gridTemplateColumns: `repeat(${Math.max(timelineAge.length, 1)}, minmax(8px, 1fr))`, minHeight: 74, minWidth: 0, width: "100%" }}>
                {timelineAge.map((point) => (
                  <div key={point.id} title={`${point.age} · ${point.titre}`} style={{ display: "grid", gap: 4, justifyItems: "center", minWidth: 0 }}>
                    <div style={{ background: getIntensityColor(point.intensite), borderRadius: 999, height: `${Math.max(point.intensite * 6, 8)}px`, opacity: 0.72, width: 5 }} />
                    <span style={{ color: "#78716C", fontFamily: "system-ui, sans-serif", fontSize: 9, writingMode: "vertical-rl" }}>{point.age}</span>
                  </div>
                ))}
              </div>
            </div>

            <div
              style={{
                border: "1px solid rgba(120,113,108,0.16)",
                borderRadius: 10,
                background: "rgba(255,253,248,0.5)",
                minWidth: 0,
                overflowWrap: "break-word",
                padding: "10px 12px",
                width: "100%",
                wordBreak: "break-word",
              }}
            >
              <p style={{ color: "#8B7355", fontFamily: "system-ui, sans-serif", fontSize: 10, letterSpacing: "0.12em", margin: "0 0 8px", textTransform: "uppercase" }}>Alertes de saturation</p>
              {alertesNarratives.length > 0 ? (
                <ul
                  style={{
                    color: "#7C2D12",
                    display: "grid",
                    fontFamily: "system-ui, sans-serif",
                    fontSize: 11,
                    gap: 6,
                    lineHeight: 1.55,
                    margin: 0,
                    minWidth: 0,
                    overflowWrap: "break-word",
                    paddingLeft: 16,
                    width: "100%",
                    wordBreak: "break-word",
                  }}
                >
                  {alertesNarratives.map((alerte) => (
                    <li key={alerte} style={{ minWidth: 0, overflowWrap: "break-word", wordBreak: "break-word" }}>
                      {alerte}
                    </li>
                  ))}
                </ul>
              ) : (
                <p style={{ color: "#78716C", fontFamily: "system-ui, sans-serif", fontSize: 12, lineHeight: 1.5, margin: 0, minWidth: 0, overflowWrap: "break-word", wordBreak: "break-word" }}>Équilibre lisible pour l’instant.</p>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Content */}
      <div style={{ maxWidth: 860, margin: "0 auto", padding: "2rem 1rem 4rem" }}>
        {blocsAffiches.map((bloc, bi) => {
          const bc = BLOC_COLORS[bi];
          const visible = bloc.chapitres.filter((c) => !filteredNums || filteredNums.has(c.num));
          const blocAnalyse = blocAnalyses.find((analyse) => analyse.bloc.num === bloc.num);
          if (visible.length === 0) return null;
          return (
            <div key={bloc.num} style={{ marginBottom: "3.25rem" }}>
              {/* Bloc header */}
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12, padding: "8px 13px", borderLeft: `3px solid ${bc.num}`, borderRadius: 9, background: "rgba(198, 169, 126, 0.12)", borderTop: "1px solid rgba(198, 169, 126, 0.25)", borderRight: "1px solid rgba(198, 169, 126, 0.25)", borderBottom: "1px solid rgba(198, 169, 126, 0.25)" }}>
                <span style={{ background: bc.num, borderRadius: 999, color: "#FFFDF8", fontFamily: "system-ui, sans-serif", fontSize: 9, fontWeight: 800, letterSpacing: "0.08em", opacity: 0.86, padding: "3px 7px" }}>BLOC {bloc.num}</span>
                <span style={{ fontSize: 18, fontWeight: 500, color: bc.text, fontFamily: "'Georgia', serif" }}>{bloc.title}</span>
                <span style={{ fontSize: 11, color: bc.text, opacity: 0.62, fontFamily: "system-ui, sans-serif" }}>{bloc.age}</span>
                <span style={{ marginLeft: "auto", fontSize: 11, color: bc.text, opacity: 0.6, fontFamily: "system-ui, sans-serif" }}>Ch. {visible[0].num}–{visible[visible.length - 1].num}</span>
              </div>
              {blocAnalyse && (
                <div style={{ background: "#FFFDF8", border: "1px solid #E7E2D8", borderRadius: 8, display: "grid", gap: 8, gridTemplateColumns: "minmax(0, 1fr) auto", margin: "-6px 0 12px", padding: "9px 12px" }}>
                  <div>
                    <p style={{ color: "#57534E", fontFamily: "'Georgia', serif", fontSize: 13, lineHeight: 1.5, margin: 0 }}>{blocAnalyse.resume}</p>
                    {blocAnalyse.motifsDominants.length > 0 && (
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 5, marginTop: 7 }}>
                        {blocAnalyse.motifsDominants.map((motif) => (
                          <span key={motif} style={{ border: "1px solid #E7E2D8", borderRadius: 20, color: "#78716C", fontFamily: "system-ui, sans-serif", fontSize: 10, padding: "2px 7px" }}>
                            {motif}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                  <div style={{ alignItems: "end", color: "#78716C", display: "grid", fontFamily: "system-ui, sans-serif", fontSize: 10, gap: 3, justifyItems: "end", minWidth: 118 }}>
                    <span>trauma {blocAnalyse.densiteTrauma}%</span>
                    <span>{blocAnalyse.scenesLiees} scènes · {blocAnalyse.fragmentsLies} fragments</span>
                  </div>
                </div>
              )}

              {/* Chapters */}
              <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                {visible.map((ch) => {
                  const chapterStatus = getStatut(ch.num);
                  const isSelected = selected?.num === ch.num;
                  const storedChapter = getStoredChapter(ch.num);
                  const chapitreMeta = getChapitreEditorialMetadata(storedChapter || creerChapitreInitial(ch.num));
                  const isEditingText = editingChapterId === `chapitre-${ch.num}`;
                  const chapterStorageState = getChapterStorageState(storedChapter);
                  const isSealed = chapterStorageState === "scellé";
                  const isEmptyChapter = chapterStorageState === "vide";
                  const stateLabel =
                    chapterStorageState === "vide"
                      ? "À écrire"
                      : chapterStorageState === "rempli"
                        ? "Rempli"
                        : "Scellé";
                  const narrativeStats = getChapterNarrativeStats({
                    tomeId: 1,
                    chapitre: ch.num,
                    scenes,
                    fragments,
                  });
                  const visibleNarrativeStats = relationsHydratees
                    ? narrativeStats
                    : {
                        ...narrativeStats,
                        sceneCount: 0,
                        fragmentCount: 0,
                        memoireCount: 0,
                        averageIntensity: 0,
                        hasRespiration: false,
                        hasPivot: false,
                        hasTrauma: false,
                        motifs: [],
                      };
                  const respirationExplicite = getRespirationEditoriale(chapitreMeta);
                  const fonctionCourte = getFonctionNarrativeCourte(chapitreMeta);
                  const risqueSaturation = getSaturationEditoriale(chapitreMeta);
                  const dangerEditorial = getDangerEditorial(chapitreMeta);
                  const intensityColor = getIntensityColor(chapitreMeta.intensite, isEmptyChapter);
                  const intensityDotStyle = getIntensityDotStyle(chapitreMeta.intensite, isEmptyChapter);
                  const memoiresLiees = analyserMemoiresLiees(
                    memoiresNarratives,
                    ch,
                    chapitreMeta,
                    fonctionCourte,
                    dangerEditorial,
                    respirationExplicite,
                  );
                  return (
                    <div key={ch.num}>
                      <div
                        className="chapter-row-card cursor-pointer"
                        onClick={() => {
                          setSelected(ch);
                          startEditingChapter(ch);
                        }}
                        style={{
                          alignItems: "stretch",
                          background: "rgba(30, 26, 22, 0.06)",
                          borderBottom: "1px solid rgba(198, 169, 126, 0.25)",
                          borderLeft: `3px solid ${intensityColor}`,
                          borderRight: "1px solid rgba(198, 169, 126, 0.25)",
                          borderTop: "1px solid rgba(198, 169, 126, 0.25)",
                          borderRadius: 8,
                          boxShadow: "none",
                          cursor: "pointer",
                          display: "grid",
                          gap: 8,
                          gridTemplateColumns: "38px minmax(0, 1fr) auto",
                          opacity: isSealed ? 0.88 : 1,
                          padding: "6px 12px",
                          transition: "border-color 160ms ease, box-shadow 160ms ease, transform 160ms ease",
                        }}
                      >
                        {/* Num */}
                        <span style={{ color: "#8B7355", fontFamily: "'Georgia', serif", fontSize: 24, fontWeight: 300, lineHeight: 1, opacity: 0.78, textAlign: "center" }}>
                          {String(ch.num).padStart(2, "0")}
                        </span>
                        <div style={{ minWidth: 0 }}>
                          <div style={{ alignItems: "baseline", display: "flex", gap: 8, minWidth: 0 }}>
                            <span style={{ color: "#1C1917", fontFamily: "'Georgia', serif", fontSize: 15, fontWeight: 500, lineHeight: 1.28 }}>
                              {ch.title}
                            </span>
                            {isSealed && <span aria-label="Chapitre scellé" style={{ color: "#D6B25E", fontSize: 12 }}>scellé</span>}
                          </div>
                          <div style={{ color: "#78716C", fontFamily: "system-ui, sans-serif", fontSize: 10, marginTop: 1, opacity: 0.82 }}>
                            {ch.age}
                          </div>
                          <div style={{ color: "#78716C", fontFamily: "system-ui, sans-serif", fontSize: 9, lineHeight: 1.35, marginTop: 2, opacity: 0.72 }}>
                            {visibleNarrativeStats.fragmentCount} fragment{visibleNarrativeStats.fragmentCount > 1 ? "s" : ""} · {visibleNarrativeStats.memoireCount} mémoire{visibleNarrativeStats.memoireCount > 1 ? "s" : ""}
                          </div>
                          <div style={{ display: "flex", gap: 3, marginTop: 4, overflow: "hidden", whiteSpace: "nowrap" }}>
                          <span style={editorialBadgeStyle("fonction", fonctionCourte, isSelected)}>
                            Fonction : {fonctionCourte}
                          </span>
                          <span style={{ fontSize: 9, padding: "0 5px", borderRadius: 20, background: "rgba(198,169,126,0.11)", color: "#6F5B3F", border: "1px solid rgba(198,169,126,0.22)", fontFamily: "system-ui, sans-serif", whiteSpace: "nowrap" }}>
                            Danger : {dangerEditorial}
                          </span>
                          <span style={{ fontSize: 9, padding: "0 5px", borderRadius: 20, background: "rgba(198,169,126,0.08)", color: "#78716C", border: "1px solid rgba(198,169,126,0.18)", fontFamily: "system-ui, sans-serif", whiteSpace: "nowrap" }}>
                            int. {chapitreMeta.intensite || "—"}
                          </span>
                          </div>
                          {memoiresLiees.total > 0 && (
                            <div style={{ color: "#78716C", fontFamily: "system-ui, sans-serif", fontSize: 10, lineHeight: 1.45, marginTop: 5, opacity: 0.82 }}>
                              <span>Mémoires liées : {memoiresLiees.total}</span>
                              <span> · Non traitées : {memoiresLiees.nonTraitees}</span>
                              <span> · Intensité moyenne : {formatMoyenne(memoiresLiees.intensiteMoyenne)}</span>
                              {(memoiresLiees.motifsDominants.length > 0 || memoiresLiees.periodesDominantes.length > 0) && (
                                <span>
                                  <br />
                                  {memoiresLiees.motifsDominants.length > 0 && <>Motifs : {memoiresLiees.motifsDominants.join(" · ")}</>}
                                  {memoiresLiees.motifsDominants.length > 0 && memoiresLiees.periodesDominantes.length > 0 && <span> · </span>}
                                  {memoiresLiees.periodesDominantes.length > 0 && <>Périodes : {memoiresLiees.periodesDominantes.join(" · ")}</>}
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                        <div style={{ alignItems: "flex-end", display: "flex", flexDirection: "column", gap: 5, justifyContent: "space-between" }}>
                          <span style={{ ...intensityDotStyle, width: 6, height: 6, borderRadius: "50%", flexShrink: 0 }} />
                          <span style={{ fontSize: 8, padding: "1px 5px", borderRadius: 20, background: "rgba(255,253,248,0.45)", color: "#78716C", border: "1px solid rgba(198,169,126,0.22)", fontFamily: "system-ui, sans-serif", whiteSpace: "nowrap" }}>
                            {stateLabel}
                          </span>
                        </div>
                      </div>

                      {/* Expanded detail */}
                      {isSelected && (
                        <div style={{ background: "#FAFAF8", border: "1px solid #E7E2D8", borderTop: "none", borderRadius: "0 0 8px 8px", padding: "16px 20px", marginTop: -2 }}>
                          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 14 }}>
                            <div>
                              <p style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: "0.1em", color: "#9CA3AF", marginBottom: 4, fontFamily: "system-ui, sans-serif" }}>Souvenirs à utiliser</p>
                              <p style={{ fontSize: 13, color: "#44403C", lineHeight: 1.7, fontFamily: "'Georgia', serif", margin: 0 }}>{ch.souvenirs}</p>
                            </div>
                            <div>
                              <p style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: "0.1em", color: "#9CA3AF", marginBottom: 4, fontFamily: "system-ui, sans-serif" }}>Fonction narrative</p>
                              <p style={{ fontSize: 13, color: "#44403C", lineHeight: 1.7, fontFamily: "'Georgia', serif", margin: 0 }}>{ch.fonction}</p>
                            </div>
                          </div>
                          <div style={{ background: "#F5F0E8", borderRadius: 6, padding: "8px 12px", marginBottom: 14 }}>
                            <span style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: "0.1em", color: "#9CA3AF", fontFamily: "system-ui, sans-serif" }}>État intérieur · </span>
                            <span style={{ fontSize: 13, color: "#1C1917", fontStyle: "italic", fontFamily: "'Georgia', serif" }}>"{ch.etatInterieur}"</span>
                          </div>
                          {memoiresLiees.items.length > 0 && (
                            <div style={{ background: "rgba(198,169,126,0.06)", border: "1px solid rgba(198,169,126,0.18)", borderRadius: 6, padding: "10px 12px", marginBottom: 14 }}>
                              <p style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: "0.1em", color: "#9CA3AF", margin: "0 0 9px", fontFamily: "system-ui, sans-serif" }}>Mémoires liées</p>
                              <div style={{ display: "grid", gap: 9 }}>
                                {memoiresLiees.items.map((memoire) => {
                                  const statutStyle = statutMemoireStyle(memoire.statut);

                                  return (
                                    <article key={memoire.id} style={{ borderTop: "1px solid rgba(198,169,126,0.14)", paddingTop: 8 }}>
                                      <div style={{ alignItems: "baseline", display: "flex", flexWrap: "wrap", gap: 7 }}>
                                        <h4 style={{ color: "#2A2118", fontFamily: "'Georgia', serif", fontSize: 13, fontWeight: 500, lineHeight: 1.35, margin: 0 }}>
                                          {memoire.titre}
                                        </h4>
                                        <span style={{ color: "#78716C", fontFamily: "system-ui, sans-serif", fontSize: 10 }}>
                                          {memoire.ageApprox || memoire.periode} · int. {memoire.intensite ?? "—"}
                                        </span>
                                        <span style={{ ...statutStyle, borderRadius: 20, fontFamily: "system-ui, sans-serif", fontSize: 9, padding: "1px 6px", whiteSpace: "nowrap" }}>
                                          {statutMemoireLabel(memoire.statut)}
                                        </span>
                                      </div>
                                      <p style={{ color: "#57534E", fontFamily: "'Georgia', serif", fontSize: 12, fontStyle: "italic", lineHeight: 1.55, margin: "4px 0 0" }}>
                                        "{extraitMemoire(memoire.texte)}"
                                      </p>
                                      {memoire.motifs && memoire.motifs.length > 0 && (
                                        <div style={{ display: "flex", flexWrap: "wrap", gap: 5, marginTop: 6 }}>
                                          {memoire.motifs.slice(0, 5).map((motif) => (
                                            <span key={`${memoire.id}-${motif}`} style={{ background: "rgba(255,253,248,0.5)", border: "1px solid rgba(198,169,126,0.18)", borderRadius: 20, color: "#78716C", fontFamily: "system-ui, sans-serif", fontSize: 9, padding: "1px 6px" }}>
                                              {motif}
                                            </span>
                                          ))}
                                        </div>
                                      )}
                                    </article>
                                  );
                                })}
                              </div>
                            </div>
                          )}
                          <div style={{ background: "#FFFDF8", border: "1px solid #E7E2D8", borderRadius: 6, padding: "8px 12px", marginBottom: 14 }}>
                            <p style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: "0.1em", color: "#9CA3AF", margin: "0 0 6px", fontFamily: "system-ui, sans-serif" }}>Badges éditoriaux complets</p>
                            <div style={{ display: "flex", gap: 6, flexWrap: "wrap", fontFamily: "system-ui, sans-serif" }}>
                              <span style={{ border: "1px solid #E7E2D8", borderRadius: 20, color: "#78716C", fontSize: 10, padding: "2px 8px" }}>
                                {chapitreMeta.typeChapitre || ch.type}
                              </span>
                              <span style={{ border: "1px solid #E7E2D8", borderRadius: 20, color: "#78716C", fontSize: 10, padding: "2px 8px" }}>
                                {respirationExplicite}
                              </span>
                              <span style={{ border: "1px solid #E7E2D8", borderRadius: 20, color: "#78716C", fontSize: 10, padding: "2px 8px" }}>
                                {risqueSaturation}
                              </span>
                              <span style={{ border: "1px solid #E7E2D8", borderRadius: 20, color: "#78716C", fontSize: 10, padding: "2px 8px" }}>
                                Danger : {dangerEditorial}
                              </span>
                              <span style={{ border: "1px solid #E7E2D8", borderRadius: 20, color: "#78716C", fontSize: 10, padding: "2px 8px" }}>
                                {chapitreMeta.niveauLourdeur || "—"}
                              </span>
                              <span style={{ border: "1px solid #E7E2D8", borderRadius: 20, color: "#78716C", fontSize: 10, padding: "2px 8px" }}>
                                int. {chapitreMeta.intensite || "—"}
                              </span>
                              <span style={{ border: "1px solid #E7E2D8", borderRadius: 20, color: "#78716C", fontSize: 10, padding: "2px 8px" }}>
                                série {chapitreMeta.potentielSerie || "—"}
                              </span>
                              <span style={{ border: "1px solid #E7E2D8", borderRadius: 20, color: "#78716C", fontSize: 10, padding: "2px 8px" }}>
                                {visibleNarrativeStats.sceneCount}S · {visibleNarrativeStats.fragmentCount}F
                              </span>
                              {(TYPES_CLIMAX.includes(chapitreMeta.typeChapitre || "transition") || chapitreMeta.typeEpisode === "climax") && (
                                <span style={{ border: "1px solid #D6B25E", borderRadius: 20, color: "#8A6B21", fontSize: 10, padding: "2px 8px" }}>
                                  pivot
                                </span>
                              )}
                            </div>
                          </div>
                          <div style={{ background: "#FFFDF8", border: "1px solid #E7E2D8", borderRadius: 6, padding: "8px 12px", marginBottom: 14 }}>
                            <p style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: "0.1em", color: "#9CA3AF", margin: "0 0 6px", fontFamily: "system-ui, sans-serif" }}>Relations narratives</p>
                            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", fontFamily: "system-ui, sans-serif", fontSize: 11, color: "#57534E" }}>
                              <span>{visibleNarrativeStats.sceneCount} scène{visibleNarrativeStats.sceneCount > 1 ? "s" : ""}</span>
                              <span>{visibleNarrativeStats.fragmentCount} fragment{visibleNarrativeStats.fragmentCount > 1 ? "s" : ""}</span>
                              <span>{visibleNarrativeStats.memoireCount} mémoire{visibleNarrativeStats.memoireCount > 1 ? "s" : ""}</span>
                              <span>int. {visibleNarrativeStats.averageIntensity ? visibleNarrativeStats.averageIntensity.toFixed(1).replace(".", ",") : "—"}</span>
                              {visibleNarrativeStats.hasRespiration && <span>respiration</span>}
                              {visibleNarrativeStats.hasPivot && <span>pivot</span>}
                              {visibleNarrativeStats.hasTrauma && <span>trauma</span>}
                            </div>
                            {visibleNarrativeStats.motifs.length > 0 && (
                              <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 8 }}>
                                {visibleNarrativeStats.motifs.map((motif) => (
                                  <span key={motif} style={{ border: "1px solid #E7E2D8", borderRadius: 20, color: "#78716C", fontFamily: "system-ui, sans-serif", fontSize: 10, padding: "2px 8px" }}>
                                    {motif}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                          <div style={{ background: "#FFFDF8", border: "1px solid #E7E2D8", borderRadius: 6, padding: "10px 12px", marginBottom: 14 }}>
                            <p style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: "0.1em", color: "#9CA3AF", margin: "0 0 10px", fontFamily: "system-ui, sans-serif" }}>Métadonnées chapitre</p>
                            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 10, fontFamily: "system-ui, sans-serif" }}>
                              <label style={{ display: "grid", gap: 4, fontSize: 11, color: "#78716C" }}>
                                Titre
                                <input
                                  onChange={(e) => updateChapterMetadata(ch, { titre: e.target.value })}
                                  style={{ border: "1px solid #D6D0C4", borderRadius: 7, background: "#FAFAF8", color: "#1C1917", fontSize: 12, padding: "7px 9px" }}
                                  value={chapitreMeta.titre}
                                />
                              </label>
                              <label style={{ display: "grid", gap: 4, fontSize: 11, color: "#78716C" }}>
                                Âge
                                <input
                                  onChange={(e) => updateChapterMetadata(ch, { ageApprox: e.target.value })}
                                  style={{ border: "1px solid #D6D0C4", borderRadius: 7, background: "#FAFAF8", color: "#1C1917", fontSize: 12, padding: "7px 9px" }}
                                  value={chapitreMeta.ageApprox || ""}
                                />
                              </label>
                              <label style={{ display: "grid", gap: 4, fontSize: 11, color: "#78716C" }}>
                                Période
                                <input
                                  onChange={(e) => updateChapterMetadata(ch, { periode: e.target.value })}
                                  style={{ border: "1px solid #D6D0C4", borderRadius: 7, background: "#FAFAF8", color: "#1C1917", fontSize: 12, padding: "7px 9px" }}
                                  value={chapitreMeta.periode || ""}
                                />
                              </label>
                              <label style={{ display: "grid", gap: 4, fontSize: 11, color: "#78716C" }}>
                                Type
                                <select
                                  onChange={(e) => updateChapterMetadata(ch, { typeChapitre: e.target.value as TypeChapitre })}
                                  style={{ border: "1px solid #D6D0C4", borderRadius: 7, background: "#FAFAF8", color: "#1C1917", fontSize: 12, padding: "7px 9px" }}
                                  value={chapitreMeta.typeChapitre || "transition"}
                                >
                                  {TYPES_CHAPITRE.map((type) => (
                                    <option key={type} value={type}>{type}</option>
                                  ))}
                                </select>
                              </label>
                              <label style={{ display: "grid", gap: 4, fontSize: 11, color: "#78716C" }}>
                                Lourdeur
                                <select
                                  onChange={(e) => updateChapterMetadata(ch, { niveauLourdeur: e.target.value as NiveauLourdeur })}
                                  style={{ border: "1px solid #D6D0C4", borderRadius: 7, background: "#FAFAF8", color: "#1C1917", fontSize: 12, padding: "7px 9px" }}
                                  value={chapitreMeta.niveauLourdeur || "moyen"}
                                >
                                  {NIVEAUX_LOURDEUR.map((niveau) => (
                                    <option key={niveau} value={niveau}>{niveau}</option>
                                  ))}
                                </select>
                              </label>
                              <label style={{ display: "grid", gap: 4, fontSize: 11, color: "#78716C" }}>
                                Intensité
                                <select
                                  onChange={(e) => updateChapterMetadata(ch, { intensite: e.target.value ? Number(e.target.value) as IntensiteChapitre : undefined })}
                                  style={{ border: "1px solid #D6D0C4", borderRadius: 7, background: "#FAFAF8", color: "#1C1917", fontSize: 12, padding: "7px 9px" }}
                                  value={chapitreMeta.intensite || ""}
                                >
                                  <option value="">—</option>
                                  {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((value) => (
                                    <option key={value} value={value}>{value}</option>
                                  ))}
                                </select>
                              </label>
                              <label style={{ display: "grid", gap: 4, fontSize: 11, color: "#78716C" }}>
                                Potentiel série
                                <select
                                  onChange={(e) => updateChapterMetadata(ch, { potentielSerie: e.target.value as PotentielSerieChapitre })}
                                  style={{ border: "1px solid #D6D0C4", borderRadius: 7, background: "#FAFAF8", color: "#1C1917", fontSize: 12, padding: "7px 9px" }}
                                  value={chapitreMeta.potentielSerie || "faible"}
                                >
                                  {POTENTIELS_SERIE.map((potentiel) => (
                                    <option key={potentiel} value={potentiel}>{potentiel}</option>
                                  ))}
                                </select>
                              </label>
                              <label style={{ display: "grid", gap: 4, fontSize: 11, color: "#78716C" }}>
                                Type épisode
                                <select
                                  onChange={(e) => updateChapterMetadata(ch, { typeEpisode: e.target.value as TypeEpisode })}
                                  style={{ border: "1px solid #D6D0C4", borderRadius: 7, background: "#FAFAF8", color: "#1C1917", fontSize: 12, padding: "7px 9px" }}
                                  value={chapitreMeta.typeEpisode || "montee"}
                                >
                                  {TYPES_EPISODE.map((type) => (
                                    <option key={type} value={type}>{type}</option>
                                  ))}
                                </select>
                              </label>
                              <label style={{ display: "grid", gap: 4, fontSize: 11, color: "#78716C" }}>
                                Statut structure
                                <select
                                  onChange={(e) => updateChapterMetadata(ch, { statutStructure: e.target.value as StatutStructureChapitre })}
                                  style={{ border: "1px solid #D6D0C4", borderRadius: 7, background: "#FAFAF8", color: "#1C1917", fontSize: 12, padding: "7px 9px" }}
                                  value={chapitreMeta.statutStructure || "brouillon"}
                                >
                                  {STATUTS_STRUCTURE.map((statut) => (
                                    <option key={statut} value={statut}>{statut}</option>
                                  ))}
                                </select>
                              </label>
                            </div>
                            <div style={{ display: "grid", gap: 10, marginTop: 10 }}>
                              <label style={{ display: "grid", gap: 4, fontFamily: "system-ui, sans-serif", fontSize: 11, color: "#78716C" }}>
                                Description
                                <textarea
                                  onChange={(e) => updateChapterMetadata(ch, { description: e.target.value })}
                                  style={{ minHeight: 58, border: "1px solid #D6D0C4", borderRadius: 7, background: "#FAFAF8", color: "#1C1917", fontSize: 12, lineHeight: 1.5, padding: "7px 9px" }}
                                  value={chapitreMeta.description || ""}
                                />
                              </label>
                              <label style={{ display: "grid", gap: 4, fontFamily: "system-ui, sans-serif", fontSize: 11, color: "#78716C" }}>
                                Image centrale
                                <input
                                  onChange={(e) => updateChapterMetadata(ch, { imageCentrale: e.target.value })}
                                  style={{ border: "1px solid #D6D0C4", borderRadius: 7, background: "#FAFAF8", color: "#1C1917", fontSize: 12, padding: "7px 9px" }}
                                  value={chapitreMeta.imageCentrale || ""}
                                />
                              </label>
                              <label style={{ display: "grid", gap: 4, fontFamily: "system-ui, sans-serif", fontSize: 11, color: "#78716C" }}>
                                Fonction narrative
                                <textarea
                                  onChange={(e) => updateChapterMetadata(ch, { fonctionNarrative: e.target.value })}
                                  style={{ minHeight: 58, border: "1px solid #D6D0C4", borderRadius: 7, background: "#FAFAF8", color: "#1C1917", fontSize: 12, lineHeight: 1.5, padding: "7px 9px" }}
                                  value={chapitreMeta.fonctionNarrative || ""}
                                />
                              </label>
                            </div>
                          </div>
                          {/* Status selector */}
                          <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                            <span style={{ fontSize: 11, color: "#9CA3AF", fontFamily: "system-ui, sans-serif", marginRight: 4 }}>Statut :</span>
                            {(["a-ecrire", "ecrit", "scelle"] as ChapterStatus[]).map((s) => {
                              const scc = STATUS_CONFIG[s];
                              return (
                                <button
                                  key={s}
                                  onClick={(e) => { e.stopPropagation(); saveStatut(ch.num, s); }}
                                  style={{
                                    padding: "4px 12px", borderRadius: 20, fontSize: 11, cursor: "pointer",
                                    border: `1px solid ${chapterStatus === s ? scc.border : "#E5E7EB"}`,
                                    background: chapterStatus === s ? scc.bg : "transparent",
                                    color: chapterStatus === s ? scc.text : "#9CA3AF",
                                    fontFamily: "system-ui, sans-serif", transition: "all 0.15s",
                                  }}
                                >
                                  {scc.label}
                                </button>
                              );
                            })}
                          </div>
                          <div style={{ borderTop: "1px solid #E7E2D8", marginTop: 16, paddingTop: 14 }}>
                            <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center", marginBottom: isEditingText ? 10 : 0 }}>
                              <div>
                                <p style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: "0.1em", color: "#9CA3AF", margin: 0, fontFamily: "system-ui, sans-serif" }}>Texte réel du chapitre</p>
                                {!isEditingText && storedChapter?.contenu && (
                                  <p style={{ fontSize: 11, color: "#78716C", margin: "4px 0 0", fontFamily: "system-ui, sans-serif" }}>
                                    {storedChapter.contenu.trim().split(/\s+/).filter(Boolean).length} mots sauvegardés
                                  </p>
                                )}
                              </div>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (isSealed) {
                                    unlockChapter(ch);
                                    return;
                                  }

                                  startEditingChapter(ch);
                                }}
                                style={{
                                  padding: "5px 12px",
                                  borderRadius: 20,
                                  fontSize: 11,
                                  cursor: "pointer",
                                  border: `1px solid ${isSealed ? "#D6B25E" : "#D6D0C4"}`,
                                  background: isSealed ? "#1C1917" : "#F5F0E8",
                                  color: isSealed ? "#F5F0E8" : "#44403C",
                                  fontFamily: "system-ui, sans-serif",
                                  transition: "all 0.15s",
                                }}
                                type="button"
                              >
                                {isSealed ? "Déverrouiller" : "Modifier le texte"}
                              </button>
                            </div>

                            {isSealed && !isEditingText && (
                              <p style={{ background: "#15120E", border: "1px solid rgba(214,178,94,0.5)", borderRadius: 8, color: "#F5F0E8", fontFamily: "system-ui, sans-serif", fontSize: 12, lineHeight: 1.6, margin: "12px 0 0", padding: "10px 12px" }}>
                                🔒 Chapitre scellé. Déverrouille-le pour modifier le texte.
                              </p>
                            )}

                            {isEditingText && (
                              <div>
                                <textarea
                                  value={draftContent}
                                  onChange={(e) => setDraftContent(e.target.value)}
                                  placeholder="Colle ici le texte complet du chapitre..."
                                  style={{
                                    width: "100%",
                                    minHeight: 180,
                                    border: "1px solid #D6D0C4",
                                    borderRadius: 8,
                                    background: "#FFFDF8",
                                    color: "#1C1917",
                                    fontFamily: "'Georgia', serif",
                                    fontSize: 14,
                                    lineHeight: 1.8,
                                    padding: "12px 14px",
                                    resize: "vertical",
                                    boxSizing: "border-box",
                                    outline: "none",
                                  }}
                                />
                                <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 10 }}>
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setEditingChapterId(null);
                                    }}
                                    style={{
                                      padding: "6px 14px",
                                      borderRadius: 20,
                                      fontSize: 11,
                                      cursor: "pointer",
                                      border: "1px solid #D6D0C4",
                                      background: "transparent",
                                      color: "#78716C",
                                      fontFamily: "system-ui, sans-serif",
                                    }}
                                    type="button"
                                  >
                                    Annuler
                                  </button>
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      sealChapter(ch);
                                    }}
                                    style={{
                                      padding: "6px 14px",
                                      borderRadius: 20,
                                      fontSize: 11,
                                      cursor: "pointer",
                                      border: "1px solid #D6B25E",
                                      background: "#FFFBEB",
                                      color: "#92400E",
                                      fontFamily: "system-ui, sans-serif",
                                    }}
                                    type="button"
                                  >
                                    Sceller
                                  </button>
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      saveChapterContent(ch);
                                    }}
                                    style={{
                                      padding: "6px 14px",
                                      borderRadius: 20,
                                      fontSize: 11,
                                      cursor: "pointer",
                                      border: "1px solid #1C1917",
                                      background: "#1C1917",
                                      color: "#F5F0E8",
                                      fontFamily: "system-ui, sans-serif",
                                    }}
                                    type="button"
                                  >
                                    Enregistrer
                                  </button>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      <style jsx>{`
        .chapter-row-card:hover {
          border-color: rgba(198, 169, 126, 0.38) !important;
          box-shadow:
            inset 3px 0 0 rgba(198, 169, 126, 0.12) !important;
          transform: translateY(-1px);
        }
      `}</style>

      {/* Legend footer */}
      <div style={{ borderTop: "1px solid #E7E2D8", background: "#F5F0E8", padding: "1.5rem 2rem" }}>
        <div style={{ maxWidth: 860, margin: "0 auto", display: "flex", gap: 20, flexWrap: "wrap", fontFamily: "system-ui, sans-serif" }}>
          {[
            { label: "Léger", color: "#6B8F71", opacity: 1 },
            { label: "Moyen", color: "#C9A84C", opacity: 1 },
            { label: "Fort", color: "#C9713A", opacity: 1 },
            { label: "Intense", color: "#8B3A2A", opacity: 1 },
            { label: "Non écrit", color: "#9A9080", opacity: 0.4 },
          ].map((item) => (
            <div key={item.label} style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <span style={{ width: 8, height: 8, borderRadius: "50%", background: item.color, display: "inline-block", opacity: item.opacity }} />
              <span style={{ fontSize: 11, color: "#78716C" }}>{item.label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
