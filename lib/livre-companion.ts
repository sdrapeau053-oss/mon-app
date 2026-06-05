/**
 * livre-companion.ts
 * Moteur central du Compagnon de Livre — extraction de MotifMap +
 * nouvelles fonctions narratives. Aucune nouvelle donnée persistée.
 * Justification > 300 lignes : ce fichier est le seul moteur analytique
 * du Compagnon ; le découper créerait des dépendances circulaires.
 */

import type { MemoireNarrative } from "@/lib/memoire-narrative";
import type { ChapitreTome1 } from "@/lib/tome1-chapters";
import {
  CHAPITRES_TOME_1_STORAGE_KEY,
  getNumeroChapitreTome1,
  normaliserChapitresTome1,
} from "@/lib/tome1-chapters";
import {
  CHAPITRES_DEFAUT,
  STRUCTURE_CHAPITRES_STORAGE_KEY,
  STRUCTURE_TOMES_STORAGE_KEY,
  TOMES_DEFAUT,
  normaliserChapitres,
  normaliserTomes,
} from "@/lib/manuscript-structure";
import type { DiagnosticEditorialStrategique } from "@/lib/editorial-director";

// ── Types ─────────────────────────────────────────────────────────

export type ChapterSource = {
  id: string;
  index: number;
  title: string;
  tomeId: number;
  tomeTitle: string;
  text: string;
};

export type MotifEvolution = "croissant" | "décroissant" | "stable" | "absent";

export type MotifStats = {
  alert: boolean;
  appearances: number;
  chapters: Array<{
    count: number;
    intensity: "faible" | "moyenne" | "forte";
    title: string;
    tomeId: number;
    tomeTitle: string;
  }>;
  distributionByTome: Record<number, number>;
  evolution: MotifEvolution;
  lastAppearance: string | null;
  longestGap: number;
  motif: string;
  variants: string[];
};

export type MotifSnapshot = {
  chapters: ChapterSource[];
  invalidKeys: string[];
  motifs: MotifStats[];
};

export type PersonnageSuivi = {
  nom: string;
  chapitresPresents: { numero: number; titre: string }[];
  absenceMaximale: number;
};

export type SouvenirOrphelin = {
  id: string;
  titre: string;
  intensite: number;
  statut: MemoireNarrative["statut"];
};

export type ActionNarrative = {
  label: string;
  pourquoi: string[];
  impact: "faible" | "moyen" | "élevé";
  certitude: "faible" | "moyenne" | "élevée";
  memoireId?: string;
};

export type ProfilAutrice = {
  dominant: string;
  frequent: string[];
  rare: string[];
};

// ── Constantes ────────────────────────────────────────────────────

export const CENTRAL_MOTIFS = [
  "eau", "froid", "silence", "corps", "animaux", "maison",
  "père", "mère", "lumière", "peur", "honte", "voix",
  "fuite", "chambre", "nuit",
];

export const MOTIFS_ABSENCE_ATTENDUE = [
  "protection", "jeu", "douceur", "liberté", "humour",
];

export const MANUAL_VARIANTS: Record<string, string[]> = {
  animaux: ["animal", "animaux", "bête", "bêtes"],
  chambre: ["chambre", "chambres"],
  corps: ["corps", "corporel", "corporelle", "chair", "peau", "ventre"],
  eau: ["eau", "eaux", "rivière", "ruisseau", "pluie", "lac", "eau chaude"],
  froid: ["froid", "froide", "froids", "froides"],
  fuite: ["fuite", "fuites", "fuir", "fuyait", "fuyant"],
  honte: ["honte", "humiliation", "humilié", "humiliée", "honteux", "honteuse", "gêne"],
  lumière: ["lumière", "lumières", "lumineux", "lumineuse"],
  maison: ["maison", "maisons"],
  mère: ["mère", "mères", "maman"],
  nuit: ["nuit", "nuits", "nocturne"],
  peur: ["peur", "peurs", "apeuré", "apeurée", "craindre", "terrorisé", "terrorisée", "menace", "danger", "inquiétude"],
  père: ["père", "pères", "papa"],
  silence: ["silence", "silences", "silencieux", "silencieuse", "muet", "muette"],
  voix: ["voix"],
};

const PERSONNAGES_CONNUS = [
  "père", "mère", "sœur", "frère", "oncle",
  "grand-mère", "grand-père",
];

// ── Utilitaires texte ─────────────────────────────────────────────

export function normalizeWord(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/^[^a-z0-9]+|[^a-z0-9]+$/g, "");
}

export function normalizeText(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[''']/g, "'")
    .replace(/[^a-z0-9'\s]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function tokenize(text: string): string[] {
  return (
    text
      .match(/[A-Za-zÀ-ÖØ-öø-ÿ0-9]+(?:[''][A-Za-zÀ-ÖØ-öø-ÿ0-9]+)?/g)
      ?.map(normalizeWord)
      .filter(Boolean) ?? []
  );
}

export function getVariants(motif: string): string[] {
  const normalized = normalizeWord(motif);
  const variants =
    MANUAL_VARIANTS[motif.toLowerCase()] ||
    MANUAL_VARIANTS[normalized] ||
    [motif];
  return Array.from(
    new Set(variants.map((v) => normalizeText(v)).filter(Boolean)),
  );
}

function countPhrase(text: string, phrase: string) {
  if (!phrase.includes(" ")) return 0;
  const escaped = phrase.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return (
    text.match(new RegExp(`(^|\\s)${escaped}(?=\\s|$)`, "g"))?.length ?? 0
  );
}

export function countMotif(
  words: string[],
  normalizedText: string,
  variants: string[],
): number {
  const wordVariants = new Set(
    variants.filter((v) => !v.includes(" ")).map(normalizeWord),
  );
  const wordCount = words.filter((w) => wordVariants.has(w)).length;
  const phraseCount = variants
    .filter((v) => v.includes(" "))
    .reduce((sum, phrase) => sum + countPhrase(normalizedText, phrase), 0);
  return wordCount + phraseCount;
}

export function getIntensity(count: number): "faible" | "moyenne" | "forte" {
  if (count >= 6) return "forte";
  if (count >= 3) return "moyenne";
  return "faible";
}

export function getEvolution(counts: number[]): MotifEvolution {
  const total = counts.reduce((s, c) => s + c, 0);
  if (total === 0) return "absent";
  const mid = Math.ceil(counts.length / 2);
  const first = counts.slice(0, mid).reduce((s, c) => s + c, 0);
  const second = counts.slice(mid).reduce((s, c) => s + c, 0);
  const diff = second - first;
  const tolerance = Math.max(2, Math.round(total * 0.15));
  if (Math.abs(diff) <= tolerance) return "stable";
  return diff > 0 ? "croissant" : "décroissant";
}

export function getLongestGap(counts: number[]): number {
  let current = 0;
  let longest = 0;
  counts.forEach((c) => {
    if (c > 0) { current = 0; return; }
    current += 1;
    longest = Math.max(longest, current);
  });
  return longest;
}

// ── Motif engine (extrait de MotifMap.tsx) ────────────────────────

export function analyzeMotifs(
  chapters: ChapterSource[],
  motifs: string[],
): MotifStats[] {
  const tokenized = chapters.map((ch) => ({
    chapter: ch,
    normalizedText: normalizeText(ch.text),
    words: tokenize(ch.text),
  }));

  return motifs.map((motif) => {
    const variants = getVariants(motif);
    const chapterCounts = tokenized.map(({ normalizedText, words }) =>
      countMotif(words, normalizedText, variants),
    );
    const appearances = chapterCounts.reduce((s, c) => s + c, 0);
    const distributionByTome: Record<number, number> = {};
    const chaptersWithMotif = tokenized
      .map(({ chapter }, i) => ({ chapter, count: chapterCounts[i] || 0 }))
      .filter(({ count }) => count > 0);

    chaptersWithMotif.forEach(({ chapter, count }) => {
      distributionByTome[chapter.tomeId] =
        (distributionByTome[chapter.tomeId] || 0) + count;
    });

    const lastChapter = chaptersWithMotif.at(-1)?.chapter ?? null;
    const longestGap = getLongestGap(chapterCounts);

    return {
      alert: longestGap > 8,
      appearances,
      chapters: chaptersWithMotif.map(({ chapter, count }) => ({
        count,
        intensity: getIntensity(count),
        title: chapter.title,
        tomeId: chapter.tomeId,
        tomeTitle: chapter.tomeTitle,
      })),
      distributionByTome,
      evolution: getEvolution(chapterCounts),
      lastAppearance: lastChapter
        ? `${lastChapter.tomeTitle} · ${lastChapter.title}`
        : null,
      longestGap,
      motif,
      variants,
    };
  });
}

// ── Sources chapitres ─────────────────────────────────────────────

function readLocalJson<T>(key: string): T | null {
  if (typeof window === "undefined") return null;
  const raw = localStorage.getItem(key);
  if (!raw) return null;
  try { return JSON.parse(raw) as T; } catch { return null; }
}

export function buildChapterSources(): {
  chapters: ChapterSource[];
  invalidKeys: string[];
} {
  if (typeof window === "undefined") return { chapters: [], invalidKeys: [] };

  const tomesRaw = readLocalJson<unknown>(STRUCTURE_TOMES_STORAGE_KEY);
  const chaptersRaw = readLocalJson<unknown>(STRUCTURE_CHAPITRES_STORAGE_KEY);
  const tome1Raw = readLocalJson<unknown>(CHAPITRES_TOME_1_STORAGE_KEY);
  const tomes = normaliserTomes(tomesRaw ?? TOMES_DEFAUT);
  const chaptersByTome = normaliserChapitres(
    chaptersRaw ?? CHAPITRES_DEFAUT,
  );
  const tomeById = new Map(tomes.map((t) => [t.id, t]));
  const sources: ChapterSource[] = [];

  if (tome1Raw) {
    normaliserChapitresTome1(tome1Raw).forEach((ch) => {
      if (!ch.contenu.trim()) return;
      sources.push({
        id: `tome-1-${ch.id}`,
        index: getNumeroChapitreTome1(ch.id),
        title: ch.titre,
        tomeId: 1,
        tomeTitle: tomeById.get(1)?.titre || "Tome 1",
        text: ch.contenu,
      });
    });
  }

  tomes
    .filter((t) => t.id !== 1 || !tome1Raw)
    .forEach((tome) => {
      (chaptersByTome[tome.id] || []).forEach((title, i) => {
        const text =
          localStorage.getItem(
            `ecriture_${tome.id}_${encodeURIComponent(title)}`,
          ) || "";
        if (!text.trim()) return;
        sources.push({
          id: `tome-${tome.id}-chapitre-${i + 1}`,
          index: i + 1,
          title,
          tomeId: tome.id,
          tomeTitle: tome.titre,
          text,
        });
      });
    });

  return {
    chapters: sources.sort(
      (a, b) => a.tomeId - b.tomeId || a.index - b.index,
    ),
    invalidKeys: [],
  };
}

export function buildSnapshot(
  motifs: string[] = CENTRAL_MOTIFS,
): MotifSnapshot {
  const { chapters, invalidKeys } = buildChapterSources();
  return { chapters, invalidKeys, motifs: analyzeMotifs(chapters, motifs) };
}

// ── Nouvelles fonctions Compagnon ─────────────────────────────────

function detectInText(text: string, nom: string): boolean {
  const n = normalizeText(text);
  const w = normalizeWord(nom);
  if (!w) return false;
  return new RegExp(`(^|[^a-z])${w}([^a-z]|$)`).test(n);
}

export function detecterPresencePersonnages(
  chapters: ChapterSource[],
  memoires: MemoireNarrative[],
): PersonnageSuivi[] {
  const noms = new Set<string>(PERSONNAGES_CONNUS);
  memoires.forEach((m) =>
    (m.personnesLiees || []).forEach((p) => {
      if (p.trim()) noms.add(p.trim().toLowerCase());
    }),
  );

  return Array.from(noms)
    .map((nom) => {
      const chapitresPresents = chapters
        .filter((ch) => detectInText(ch.text, nom))
        .map((ch) => ({ numero: ch.index, titre: ch.title }));
      const nums = chapitresPresents.map((c) => c.numero).sort((a, b) => a - b);
      let absenceMaximale = 0;
      for (let i = 1; i < nums.length; i++) {
        absenceMaximale = Math.max(absenceMaximale, nums[i] - nums[i - 1] - 1);
      }
      return { nom, chapitresPresents, absenceMaximale };
    })
    .filter((p) => p.chapitresPresents.length > 0)
    .sort((a, b) => b.chapitresPresents.length - a.chapitresPresents.length);
}

export function detecterSouvenirOrphelins(
  memoires: MemoireNarrative[],
): SouvenirOrphelin[] {
  return memoires
    .filter(
      (m) =>
        m.statut !== "archive" &&
        m.statut !== "integre" &&
        !m.tomeProbable &&
        !m.chapitreProbable,
    )
    .map((m) => ({
      id: m.id,
      titre: m.titre,
      intensite: m.intensite || 0,
      statut: m.statut,
    }))
    .sort((a, b) => b.intensite - a.intensite);
}

export function extraireProfilAutrice(snapshot: MotifSnapshot): ProfilAutrice {
  const sorted = [...snapshot.motifs].sort(
    (a, b) => b.appearances - a.appearances,
  );
  const total = sorted.reduce((s, m) => s + m.appearances, 0);
  const threshold = total > 0 ? total / Math.max(sorted.length, 1) : 0;

  return {
    dominant: sorted[0]?.motif || "—",
    frequent: sorted
      .filter((m) => m.appearances >= threshold && m.appearances > 0)
      .map((m) => m.motif)
      .slice(0, 6),
    rare: [
      ...sorted
        .filter((m) => m.appearances === 0)
        .map((m) => m.motif),
      ...MOTIFS_ABSENCE_ATTENDUE,
    ].slice(0, 6),
  };
}

export function calculerTop5Actions(
  memoires: MemoireNarrative[],
  snapshot: MotifSnapshot,
  diagnostic: DiagnosticEditorialStrategique,
): ActionNarrative[] {
  const actions: ActionNarrative[] = [];
  const orphelins = detecterSouvenirOrphelins(memoires);

  if (orphelins[0]) {
    actions.push({
      label: `Intégrer "${orphelins[0].titre}"`,
      pourquoi: [
        `intensité ${orphelins[0].intensite}/10`,
        "mémoire orpheline — sans chapitre assigné",
        "renforce la matière narrative du tome",
      ],
      impact: orphelins[0].intensite >= 8 ? "élevé" : "moyen",
      certitude: "élevée",
      memoireId: orphelins[0].id,
    });
  }

  if (diagnostic.sequencesTropLourdes[0]) {
    actions.push({
      label: `Ajouter une respiration (${diagnostic.sequencesTropLourdes[0]})`,
      pourquoi: [
        "séquence de chapitres intenses sans pause",
        "risque de saturation du lecteur",
        `respiration : ${diagnostic.evaluation360.respiration}`,
      ],
      impact: "élevé",
      certitude: "élevée",
    });
  }

  const motifCasse = snapshot.motifs
    .filter((m) => m.longestGap >= 8 && m.appearances > 0)
    .sort((a, b) => b.longestGap - a.longestGap)[0];

  if (motifCasse) {
    actions.push({
      label: `Rouvrir le motif "${motifCasse.motif}"`,
      pourquoi: [
        `${motifCasse.longestGap} chapitres consécutifs sans lui`,
        motifCasse.lastAppearance
          ? `dernière apparition : ${motifCasse.lastAppearance}`
          : "fil narratif interrompu",
      ],
      impact: "moyen",
      certitude: "moyenne",
    });
  }

  if (diagnostic.chapitresRedondants[0]) {
    actions.push({
      label: `Différencier ${diagnostic.chapitresRedondants[0]}`,
      pourquoi: [
        "chapitres trop similaires détectés",
        "risque de répétition perçue par le lecteur",
      ],
      impact: "moyen",
      certitude: "moyenne",
    });
  }

  const motifAbsent = snapshot.motifs.find((m) => m.evolution === "absent");
  if (motifAbsent) {
    actions.push({
      label: `Introduire le motif "${motifAbsent.motif}"`,
      pourquoi: [
        "absent de tout le texte analysé",
        "déséquilibre thématique à considérer",
      ],
      impact: "faible",
      certitude: "faible",
    });
  }

  return actions.slice(0, 5);
}
