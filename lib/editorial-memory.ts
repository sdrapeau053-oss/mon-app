import type { Fragment } from "@/lib/fragments";
import { getNumeroChapitreTome1, type ChapitreTome1 } from "@/lib/tome1-chapters";

type EditorialChapter = Pick<
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

export type DensiteEmotionnelle = "faible" | "modérée" | "élevée" | "critique";

export type AlerteEditoriale = {
  message: string;
  tone: "warning" | "success";
};

export type AnalyseMotifs = {
  absents: string[];
  corpus: Record<string, number>;
  frequents: Array<{ count: number; motif: string }>;
  varies: boolean;
};

export type AnalyseRespiration = {
  consecutiveIntenseChapters: number;
  manqueRespiration: boolean;
  respirationCount: number;
};

export type AnalyseRepetitions = {
  ouverturesRepetees: string[];
  rythmeRepete: boolean;
  structureFragmentaire: boolean;
};

const MOTIFS_IMPORTANTS = [
  "silence",
  "noir",
  "attente",
  "corps",
  "nuit",
  "froid",
  "main",
  "regard",
  "porte",
  "eau",
  "lumière",
];

function normalizeText(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function chapterText(chapitre: EditorialChapter) {
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

function isWritten(chapitre: EditorialChapter) {
  return Boolean(chapitre.contenu?.trim());
}

function chapterNumber(chapitre: EditorialChapter) {
  return getNumeroChapitreTome1(chapitre.id);
}

function linkedFragmentsForChapter(chapitre: EditorialChapter, fragments: Fragment[]) {
  const numero = chapterNumber(chapitre);
  const chapterId = chapitre.id;

  return fragments.filter((fragment) => {
    if (fragment.chapitreId === chapterId) return true;
    if (fragment.tomeId === 1 && String(fragment.chapitre || "") === String(numero)) return true;
    return fragment.tomeId === 1 && normalizeText(String(fragment.chapitre || "")).includes(`chapitre ${numero}`);
  });
}

export function analyserMotifs(chapitres: EditorialChapter[], fragments: Fragment[] = []): AnalyseMotifs {
  const corpus = MOTIFS_IMPORTANTS.reduce<Record<string, number>>((acc, motif) => {
    acc[motif] = 0;
    return acc;
  }, {});

  chapitres.forEach((chapitre) => {
    const fragmentsLies = linkedFragmentsForChapter(chapitre, fragments)
      .map((fragment) => `${fragment.texte} ${(fragment.tags || []).join(" ")}`)
      .join(" ");
    const texte = normalizeText(`${chapterText(chapitre)} ${fragmentsLies}`);

    MOTIFS_IMPORTANTS.forEach((motif) => {
      if (texte.includes(normalizeText(motif))) corpus[motif] += 1;
    });
  });

  const frequents = Object.entries(corpus)
    .filter(([, count]) => count >= 4)
    .map(([motif, count]) => ({ count, motif }))
    .sort((a, b) => b.count - a.count);
  const absents = Object.entries(corpus)
    .filter(([, count]) => count === 0)
    .map(([motif]) => motif)
    .slice(0, 4);

  return {
    absents,
    corpus,
    frequents,
    varies: Object.values(corpus).filter((count) => count > 0).length >= 5,
  };
}

export function analyserRespiration(chapitres: EditorialChapter[]): AnalyseRespiration {
  const sorted = [...chapitres].sort((a, b) => chapterNumber(a) - chapterNumber(b));
  let consecutiveIntenseChapters = 0;
  let maxConsecutiveIntenseChapters = 0;
  let respirationCount = 0;

  sorted.forEach((chapitre) => {
    const type = `${chapitre.typeChapitre || ""} ${chapitre.typeEpisode || ""} ${chapitre.niveauLourdeur || ""}`;
    const isRespiration = normalizeText(type).includes("respiration") || normalizeText(type).includes("leger");
    const isIntense = (chapitre.intensite || 0) >= 8 || normalizeText(type).includes("trauma") || normalizeText(type).includes("extreme");

    if (isRespiration) respirationCount += 1;

    if (isIntense) {
      consecutiveIntenseChapters += 1;
      maxConsecutiveIntenseChapters = Math.max(maxConsecutiveIntenseChapters, consecutiveIntenseChapters);
      return;
    }

    consecutiveIntenseChapters = 0;
  });

  return {
    consecutiveIntenseChapters: maxConsecutiveIntenseChapters,
    manqueRespiration: maxConsecutiveIntenseChapters >= 3 || respirationCount <= 1,
    respirationCount,
  };
}

export function analyserRepetitions(chapitres: EditorialChapter[]): AnalyseRepetitions {
  const openings = chapitres
    .filter(isWritten)
    .map((chapitre) => chapitre.contenu.trim().split(/\n+/)[0]?.trim().slice(0, 42))
    .filter(Boolean);
  const openingCounts = openings.reduce<Record<string, number>>((acc, opening) => {
    const normalized = normalizeText(opening);
    acc[normalized] = (acc[normalized] || 0) + 1;
    return acc;
  }, {});
  const paragraphProfiles = chapitres.filter(isWritten).map((chapitre) => {
    const paragraphs = chapitre.contenu.split(/\n{2,}/).map((item) => item.trim()).filter(Boolean);
    if (!paragraphs.length) return "vide";
    const shortParagraphs = paragraphs.filter((paragraph) => paragraph.split(/\s+/).length <= 22).length;
    return shortParagraphs / paragraphs.length > 0.7 ? "fragmentaire" : "ample";
  });

  return {
    ouverturesRepetees: Object.entries(openingCounts)
      .filter(([, count]) => count > 1)
      .map(([opening]) => opening)
      .slice(0, 3),
    rythmeRepete: paragraphProfiles.length >= 4 && new Set(paragraphProfiles.slice(-4)).size === 1,
    structureFragmentaire: paragraphProfiles.slice(-4).filter((profile) => profile === "fragmentaire").length >= 3,
  };
}

export function analyserDensiteEmotionnelle(chapitres: EditorialChapter[]): DensiteEmotionnelle {
  const written = chapitres.filter((chapitre) => isWritten(chapitre) || chapitre.intensite);
  if (!written.length) return "faible";

  const average = written.reduce((total, chapitre) => total + (chapitre.intensite || 4), 0) / written.length;
  const intenseCount = written.filter((chapitre) => (chapitre.intensite || 0) >= 8).length;

  if (average >= 8.5 || intenseCount >= 5) return "critique";
  if (average >= 7 || intenseCount >= 3) return "élevée";
  if (average >= 4.5) return "modérée";
  return "faible";
}

export function genererAlertesEditoriales(chapitres: EditorialChapter[], fragments: Fragment[] = []): AlerteEditoriale[] {
  const motifs = analyserMotifs(chapitres, fragments);
  const respiration = analyserRespiration(chapitres);
  const repetitions = analyserRepetitions(chapitres);
  const densite = analyserDensiteEmotionnelle(chapitres);
  const alertes: AlerteEditoriale[] = [];

  motifs.frequents.slice(0, 3).forEach(({ count, motif }) => {
    alertes.push({ message: `motif "${motif}" présent dans ${count} chapitres`, tone: "warning" });
  });

  motifs.absents.slice(0, 2).forEach((motif) => {
    alertes.push({ message: `motif important absent : ${motif}`, tone: "warning" });
  });

  if (respiration.manqueRespiration) {
    alertes.push({
      message: `respiration faible depuis ${respiration.consecutiveIntenseChapters || 3} chapitres`,
      tone: "warning",
    });
  }

  if (repetitions.ouverturesRepetees.length > 0) {
    alertes.push({ message: "ouverture de chapitre répétée", tone: "warning" });
  }

  if (repetitions.rythmeRepete || repetitions.structureFragmentaire) {
    alertes.push({ message: "structure fragmentaire répétée", tone: "warning" });
  }

  if (densite === "élevée" || densite === "critique") {
    alertes.push({ message: `densité émotionnelle ${densite}`, tone: "warning" });
  }

  if (motifs.varies) {
    alertes.push({ message: "bonne variété de motifs corporels", tone: "success" });
  }

  if (!respiration.manqueRespiration && !repetitions.rythmeRepete) {
    alertes.push({ message: "rythme global cohérent", tone: "success" });
  }

  return alertes.slice(0, 7);
}
