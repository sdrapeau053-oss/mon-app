import {
  analyserDensiteEmotionnelle,
  analyserMotifs,
  analyserRepetitions,
  analyserRespiration,
  type AlerteEditoriale,
  type DensiteEmotionnelle,
} from "@/lib/editorial-memory";
import type { Fragment } from "@/lib/fragments";
import { getNumeroChapitreTome1, type ChapitreTome1 } from "@/lib/tome1-chapters";

type DirectorChapter = Pick<
  ChapitreTome1,
  | "contenu"
  | "description"
  | "fonctionNarrative"
  | "id"
  | "imageCentrale"
  | "intensite"
  | "niveauLourdeur"
  | "titre"
  | "typeChapitre"
  | "typeEpisode"
>;

export type CourbeTension = "montée" | "plateau" | "saturation" | "respiration";
export type EquilibreEmotionnel = "équilibré" | "chargé" | "très chargé" | "critique";
export type ProgressionNarrative = "cohérente" | "fragile" | "répétitive" | "déséquilibrée";
export type RisqueLecteur = "faible" | "modéré" | "élevé";

export type ExplicationEditoriale = {
  cause: string;
  chapitres: string;
  recommandation: string;
  title: string;
};

export type DiagnosticEditorialStrategique = {
  chapitresRedondants: string[];
  courbeTension: CourbeTension;
  equilibreEmotionnel: EquilibreEmotionnel;
  evaluation360: {
    coherence: string;
    originalite: string;
    respiration: string;
    risqueLecteur: RisqueLecteur;
    variete: string;
  };
  courbeLecteur: {
    curiosite: string;
    fatigue: string;
    recuperation: string;
    respiration: string;
    tension: string;
  };
  motifsAbsents: string[];
  motifsDominants: string[];
  motifsSurutilises: Array<{ count: number; motif: string }>;
  progressionNarrative: ProgressionNarrative;
  risqueLecteur: RisqueLecteur;
  sequencesTropLourdes: string[];
  explications: ExplicationEditoriale[];
  signaux: AlerteEditoriale[];
};

const MOTIFS_DIRECTEUR = ["peur", "attente", "immobilité", "silence", "froid", "refuge"];
const MOTIFS_360 = [
  "peur",
  "attente",
  "immobilité",
  "silence",
  "froid",
  "refuge",
  "corps",
  "nuit",
  "regard",
  "danger",
  "dissociation",
  "alerte",
  "isolement",
  "lien",
  "eau",
  "douceur",
  "lumière",
  "maison",
  "règles",
  "survie",
];
const MOTIFS_ABSENCE = ["protection", "jeu", "humour", "curiosité", "normalité", "douceur", "amitié", "liberté"];

function normalizeText(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function chapterText(chapitre: DirectorChapter) {
  return [
    chapitre.titre,
    chapitre.description,
    chapitre.fonctionNarrative,
    chapitre.imageCentrale,
    chapitre.typeChapitre,
    chapitre.typeEpisode,
    chapitre.niveauLourdeur,
    chapitre.contenu,
  ]
    .filter(Boolean)
    .join(" ");
}

function writtenOrStructuredChapters(chapitres: DirectorChapter[]) {
  return chapitres.filter((chapitre) => chapitre.contenu?.trim() || chapitre.intensite || chapitre.typeChapitre);
}

function chapterRange(chapitres: DirectorChapter[]) {
  if (!chapitres.length) return "Non ciblé";
  const sorted = [...chapitres].sort((a, b) => getNumeroChapitreTome1(a.id) - getNumeroChapitreTome1(b.id));
  const start = getNumeroChapitreTome1(sorted[0].id);
  const end = getNumeroChapitreTome1(sorted[sorted.length - 1].id);
  return start === end ? `Chapitre ${start}` : `Chapitres ${start} à ${end}`;
}

function corpusText(chapitres: DirectorChapter[], fragments: Fragment[]) {
  const texteChapitres = normalizeText(chapitres.map(chapterText).join(" "));
  const texteFragments = normalizeText(fragments.map((fragment) => `${fragment.texte} ${(fragment.tags || []).join(" ")}`).join(" "));
  return `${texteChapitres} ${texteFragments}`;
}

function countMotif(text: string, motif: string) {
  const normalized = normalizeText(motif);
  return (text.match(new RegExp(`\\b${normalized}\\b`, "g")) || []).length;
}

export function analyserTensionGlobale(chapitres: DirectorChapter[]): CourbeTension {
  const sorted = writtenOrStructuredChapters(chapitres).sort((a, b) => getNumeroChapitreTome1(a.id) - getNumeroChapitreTome1(b.id));
  if (!sorted.length) return "respiration";

  const lastFive = sorted.slice(-5);
  const averageAll = sorted.reduce((sum, chapitre) => sum + (chapitre.intensite || 4), 0) / sorted.length;
  const averageRecent = lastFive.reduce((sum, chapitre) => sum + (chapitre.intensite || 4), 0) / lastFive.length;
  const intenseRecent = lastFive.filter((chapitre) => (chapitre.intensite || 0) >= 8).length;
  const respirationRecent = lastFive.filter((chapitre) => normalizeText(`${chapitre.typeChapitre || ""} ${chapitre.typeEpisode || ""}`).includes("respiration")).length;

  if (intenseRecent >= 3 || averageRecent >= 8) return "saturation";
  if (respirationRecent >= 2 || averageRecent <= 4) return "respiration";
  if (averageRecent > averageAll + 0.8) return "montée";
  return "plateau";
}

export function analyserRespirationGlobale(chapitres: DirectorChapter[]) {
  const respiration = analyserRespiration(chapitres);
  return {
    ...respiration,
    statut: respiration.manqueRespiration ? "manque de respiration" : "respiration lisible",
  };
}

export function analyserProgressionNarrative(chapitres: DirectorChapter[]): ProgressionNarrative {
  const respiration = analyserRespiration(chapitres);
  const repetitions = analyserRepetitions(chapitres);
  const courbe = analyserTensionGlobale(chapitres);
  const sorted = writtenOrStructuredChapters(chapitres).sort((a, b) => getNumeroChapitreTome1(a.id) - getNumeroChapitreTome1(b.id));
  const emptyStructured = chapitres.filter((chapitre) => !chapitre.contenu?.trim() && !chapitre.typeChapitre).length;

  if (repetitions.rythmeRepete || repetitions.structureFragmentaire) return "répétitive";
  if (respiration.manqueRespiration && courbe === "saturation") return "déséquilibrée";
  if (sorted.length < 4 || emptyStructured > 8) return "fragile";
  return "cohérente";
}

export function analyserMotifsDominants(chapitres: DirectorChapter[], fragments: Fragment[] = []) {
  const text = corpusText(chapitres, fragments);
  const corpus = MOTIFS_DIRECTEUR.reduce<Record<string, number>>((acc, motif) => {
    acc[motif] = countMotif(text, motif);
    return acc;
  }, {});

  return Object.entries(corpus)
    .filter(([, count]) => count > 0)
    .sort((a, b) => b[1] - a[1])
    .map(([motif]) => motif)
    .slice(0, 5);
}

export function analyserMotifsSurutilises(chapitres: DirectorChapter[], fragments: Fragment[] = []) {
  const text = corpusText(chapitres, fragments);

  return MOTIFS_360.map((motif) => ({ count: countMotif(text, motif), motif }))
    .filter((entry) => entry.count > 0)
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);
}

export function analyserEquilibreEmotionnel(chapitres: DirectorChapter[]): EquilibreEmotionnel {
  const densite: DensiteEmotionnelle = analyserDensiteEmotionnelle(chapitres);
  if (densite === "critique") return "critique";
  if (densite === "élevée") return "très chargé";
  if (densite === "modérée") return "chargé";
  return "équilibré";
}

function analyserMotifsAbsents(chapitres: DirectorChapter[], fragments: Fragment[]) {
  const texte = corpusText(chapitres, fragments);
  return MOTIFS_ABSENCE.filter((motif) => !texte.includes(normalizeText(motif)));
}

function extractMotifsForChapter(chapitre: DirectorChapter) {
  const texte = normalizeText(chapterText(chapitre));
  return MOTIFS_360.filter((motif) => texte.includes(normalizeText(motif)));
}

export function analyserChapitresRedondants(chapitres: DirectorChapter[]) {
  const sorted = writtenOrStructuredChapters(chapitres).sort((a, b) => getNumeroChapitreTome1(a.id) - getNumeroChapitreTome1(b.id));
  const redondants: string[] = [];

  sorted.forEach((chapitre, index) => {
    const suivant = sorted[index + 1];
    if (!suivant) return;

    const motifs = extractMotifsForChapter(chapitre);
    const motifsSuivants = extractMotifsForChapter(suivant);
    const overlap = motifs.filter((motif) => motifsSuivants.includes(motif)).length;
    const similarIntensity = Math.abs((chapitre.intensite || 0) - (suivant.intensite || 0)) <= 1;
    const similarFunction = normalizeText(chapitre.fonctionNarrative || chapitre.typeChapitre || "") === normalizeText(suivant.fonctionNarrative || suivant.typeChapitre || "");

    if (overlap >= 3 && similarIntensity && similarFunction) {
      redondants.push(`Ch. ${getNumeroChapitreTome1(chapitre.id)}–${getNumeroChapitreTome1(suivant.id)}`);
    }
  });

  return redondants.slice(0, 5);
}

export function analyserCourbeLecteur(chapitres: DirectorChapter[]) {
  const sorted = writtenOrStructuredChapters(chapitres).sort((a, b) => getNumeroChapitreTome1(a.id) - getNumeroChapitreTome1(b.id));
  const respiration = analyserRespirationGlobale(sorted);
  const tension = analyserTensionGlobale(sorted);
  const averageIntensity = sorted.length ? sorted.reduce((sum, chapitre) => sum + (chapitre.intensite || 4), 0) / sorted.length : 0;
  const respirationCount = sorted.filter((chapitre) => normalizeText(`${chapitre.typeChapitre || ""} ${chapitre.typeEpisode || ""}`).includes("respiration")).length;
  const pivotCount = sorted.filter((chapitre) => normalizeText(`${chapitre.typeChapitre || ""} ${chapitre.typeEpisode || ""}`).includes("pivot") || normalizeText(chapitre.typeEpisode || "").includes("climax")).length;

  return {
    curiosite: pivotCount >= 4 ? "active" : "à relancer",
    fatigue: averageIntensity >= 7.5 || tension === "saturation" ? "élevée" : averageIntensity >= 6 ? "modérée" : "faible",
    recuperation: respirationCount >= 4 ? "présente" : "insuffisante",
    respiration: respiration.statut,
    tension,
  };
}

export function detecterSequencesTropLourdes(chapitres: DirectorChapter[]) {
  const sorted = writtenOrStructuredChapters(chapitres).sort((a, b) => getNumeroChapitreTome1(a.id) - getNumeroChapitreTome1(b.id));
  const sequences: string[] = [];
  let current: DirectorChapter[] = [];

  sorted.forEach((chapitre) => {
    const isHeavy = (chapitre.intensite || 0) >= 8 || normalizeText(`${chapitre.typeChapitre || ""} ${chapitre.niveauLourdeur || ""}`).includes("extreme");
    if (isHeavy) {
      current.push(chapitre);
      return;
    }

    if (current.length > 3) {
      sequences.push(`Ch. ${getNumeroChapitreTome1(current[0].id)}–${getNumeroChapitreTome1(current[current.length - 1].id)}`);
    }
    current = [];
  });

  if (current.length > 3) {
    sequences.push(`Ch. ${getNumeroChapitreTome1(current[0].id)}–${getNumeroChapitreTome1(current[current.length - 1].id)}`);
  }

  return sequences;
}

function detecterSequencesTropLourdesDetaillees(chapitres: DirectorChapter[]) {
  const sorted = writtenOrStructuredChapters(chapitres).sort((a, b) => getNumeroChapitreTome1(a.id) - getNumeroChapitreTome1(b.id));
  const sequences: DirectorChapter[][] = [];
  let current: DirectorChapter[] = [];

  sorted.forEach((chapitre) => {
    const isHeavy = (chapitre.intensite || 0) >= 8 || normalizeText(`${chapitre.typeChapitre || ""} ${chapitre.niveauLourdeur || ""}`).includes("extreme");
    if (isHeavy) {
      current.push(chapitre);
      return;
    }

    if (current.length > 3) sequences.push(current);
    current = [];
  });

  if (current.length > 3) sequences.push(current);
  return sequences;
}

export function analyserRespirationsInsuffisantes(chapitres: DirectorChapter[]) {
  const respiration = analyserRespirationGlobale(chapitres);
  const sequences = detecterSequencesTropLourdes(chapitres);
  return respiration.manqueRespiration || sequences.length > 0;
}

function calculerRisqueLecteur({
  courbeTension,
  equilibreEmotionnel,
  progressionNarrative,
}: {
  courbeTension: CourbeTension;
  equilibreEmotionnel: EquilibreEmotionnel;
  progressionNarrative: ProgressionNarrative;
}): RisqueLecteur {
  if (courbeTension === "saturation" || equilibreEmotionnel === "critique" || progressionNarrative === "déséquilibrée") return "élevé";
  if (equilibreEmotionnel === "très chargé" || progressionNarrative === "fragile" || progressionNarrative === "répétitive") return "modéré";
  return "faible";
}

export function expliquerProgression(chapitres: DirectorChapter[]): ExplicationEditoriale {
  const sorted = writtenOrStructuredChapters(chapitres).sort((a, b) => getNumeroChapitreTome1(a.id) - getNumeroChapitreTome1(b.id));
  const respiration = analyserRespirationGlobale(sorted);
  const courbe = analyserTensionGlobale(sorted);
  const heavyChapters = sorted.filter((chapitre) => (chapitre.intensite || 0) >= 7);
  const target = heavyChapters.length >= 4 ? heavyChapters.slice(0, Math.min(heavyChapters.length, 7)) : sorted.slice(0, 7);

  return {
    cause:
      courbe === "saturation" || respiration.manqueRespiration
        ? "La tension reste haute pendant plusieurs chapitres et la récupération narrative apparaît faible."
        : "La progression est lisible, mais certains contrastes peuvent encore être renforcés.",
    chapitres: chapterRange(target),
    recommandation: "Renforcer les contrastes émotionnels avant les montées les plus fortes, sans réécrire automatiquement le texte.",
    title: "Progression déséquilibrée",
  };
}

export function expliquerRespiration(chapitres: DirectorChapter[]): ExplicationEditoriale {
  const sequences = detecterSequencesTropLourdesDetaillees(chapitres);
  const cible = sequences[0] || writtenOrStructuredChapters(chapitres).filter((chapitre) => (chapitre.intensite || 0) >= 7).slice(0, 5);
  const motifs = cible.flatMap(extractMotifsForChapter).reduce<Record<string, number>>((acc, motif) => {
    acc[motif] = (acc[motif] || 0) + 1;
    return acc;
  }, {});
  const dominants = Object.entries(motifs)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 4)
    .map(([motif]) => motif);

  return {
    cause: dominants.length
      ? `${cible.length || 3} chapitres rapprochés portent des motifs proches : ${dominants.join(", ")}.`
      : "Plusieurs chapitres intenses se suivent avec peu de respiration explicite.",
    chapitres: chapterRange(cible),
    recommandation: "Prévoir une respiration plus incarnée : jeu, curiosité, lien, refuge, normalité ou douceur.",
    title: "Respiration insuffisante",
  };
}

export function expliquerRisqueLecteur(chapitres: DirectorChapter[]): ExplicationEditoriale {
  const sorted = writtenOrStructuredChapters(chapitres).sort((a, b) => getNumeroChapitreTome1(a.id) - getNumeroChapitreTome1(b.id));
  const highTension = sorted.filter((chapitre) => (chapitre.intensite || 0) >= 8);
  const cible = highTension.length >= 4 ? highTension.slice(-8) : sorted.slice(-8);

  return {
    cause: "La tension s’accumule sur plusieurs chapitres sans relâchement assez visible pour le lecteur.",
    chapitres: chapterRange(cible),
    recommandation: "Introduire davantage de variation émotionnelle ou sensorielle dans les zones les plus denses.",
    title: "Risque lecteur élevé",
  };
}

export function expliquerSequenceLourde(chapitres: DirectorChapter[]): ExplicationEditoriale {
  const sequences = detecterSequencesTropLourdesDetaillees(chapitres);
  const cible = sequences[0] || [];

  return {
    cause: "Plus de 3 chapitres consécutifs sont classés forts ou intenses.",
    chapitres: chapterRange(cible),
    recommandation: "Ajouter une scène de respiration, déplacer une séquence, ou accentuer un contraste déjà présent.",
    title: "Séquence trop lourde",
  };
}

export function genererDiagnosticEditorial(chapitres: DirectorChapter[], fragments: Fragment[] = []): DiagnosticEditorialStrategique {
  const courbeTension = analyserTensionGlobale(chapitres);
  const respiration = analyserRespirationGlobale(chapitres);
  const progressionNarrative = analyserProgressionNarrative(chapitres);
  const motifsDominants = analyserMotifsDominants(chapitres, fragments);
  const motifsSurutilises = analyserMotifsSurutilises(chapitres, fragments);
  const motifsMemoire = analyserMotifs(chapitres, fragments);
  const motifsAbsents = Array.from(new Set([...analyserMotifsAbsents(chapitres, fragments), ...motifsMemoire.absents])).slice(0, 5);
  const equilibreEmotionnel = analyserEquilibreEmotionnel(chapitres);
  const risqueLecteur = calculerRisqueLecteur({ courbeTension, equilibreEmotionnel, progressionNarrative });
  const chapitresRedondants = analyserChapitresRedondants(chapitres);
  const courbeLecteur = analyserCourbeLecteur(chapitres);
  const sequencesTropLourdes = detecterSequencesTropLourdes(chapitres);
  const explications: ExplicationEditoriale[] = [];
  const signaux: AlerteEditoriale[] = [];

  signaux.push({
    message: progressionNarrative === "cohérente" ? "progression solide" : `progression ${progressionNarrative}`,
    tone: progressionNarrative === "cohérente" ? "success" : "warning",
  });

  if (courbeTension === "saturation") {
    signaux.push({ message: "tension cumulative élevée", tone: "warning" });
  } else {
    signaux.push({ message: `courbe de tension en ${courbeTension}`, tone: courbeTension === "respiration" ? "success" : "warning" });
  }

  signaux.push({
    message: respiration.manqueRespiration ? "manque de respiration" : "respiration lisible",
    tone: respiration.manqueRespiration ? "warning" : "success",
  });

  signaux.push({
    message: motifsDominants.length >= 3 ? "cohérence des motifs" : "motifs à densifier",
    tone: motifsDominants.length >= 3 ? "success" : "warning",
  });

  if (risqueLecteur !== "faible") {
    signaux.push({ message: `risque lecteur ${risqueLecteur}`, tone: "warning" });
  }

  if (chapitresRedondants.length > 0) {
    signaux.push({ message: `chapitres possiblement redondants : ${chapitresRedondants.join(", ")}`, tone: "warning" });
  }

  if (sequencesTropLourdes.length > 0) {
    signaux.push({ message: `séquence trop lourde : ${sequencesTropLourdes.join(", ")}`, tone: "warning" });
  }

  if (progressionNarrative !== "cohérente") explications.push(expliquerProgression(chapitres));
  if (respiration.manqueRespiration) explications.push(expliquerRespiration(chapitres));
  if (risqueLecteur !== "faible") explications.push(expliquerRisqueLecteur(chapitres));
  if (sequencesTropLourdes.length > 0) explications.push(expliquerSequenceLourde(chapitres));

  return {
    chapitresRedondants,
    courbeTension,
    courbeLecteur,
    equilibreEmotionnel,
    evaluation360: {
      coherence: progressionNarrative === "cohérente" ? "solide" : progressionNarrative,
      originalite: motifsSurutilises[0]?.count >= 12 ? "à varier" : "lisible",
      respiration: analyserRespirationsInsuffisantes(chapitres) ? "insuffisante" : "présente",
      risqueLecteur,
      variete: motifsDominants.length >= 4 && chapitresRedondants.length === 0 ? "bonne" : "à surveiller",
    },
    motifsAbsents,
    motifsDominants,
    motifsSurutilises,
    progressionNarrative,
    risqueLecteur,
    sequencesTropLourdes,
    explications,
    signaux: signaux.slice(0, 8),
  };
}
