import { getNumeroChapitreTome1, type ChapitreTome1 } from "@/lib/tome1-chapters";

export type RepetitionLevel = "faible" | "moyen" | "élevé";

export type LexicalRepetition = {
  chapters: string[];
  count: number;
  level: RepetitionLevel;
  word: string;
};

export type ExpressionRepetition = {
  chapters: string[];
  count: number;
  expression: string;
};

export type SimilarChapterSignal = {
  chapters: string;
  level: RepetitionLevel;
  suggestion: string;
};

export type StructureSignal = {
  count: number;
  frequency: string;
  structure: string;
};

export type MotifRepetition = {
  count: number;
  motif: string;
  repartition: string;
};

export type AdvancedRepetitionAudit = {
  alerts: string[];
  closings: SimilarChapterSignal[];
  expressions: ExpressionRepetition[];
  globalLevel: RepetitionLevel;
  lexical: LexicalRepetition[];
  motifs: MotifRepetition[];
  openings: SimilarChapterSignal[];
  strengths: string[];
  structures: StructureSignal[];
};

const STOPWORDS = new Set([
  "afin",
  "alors",
  "apres",
  "assez",
  "avec",
  "avait",
  "avais",
  "avant",
  "bien",
  "cela",
  "cette",
  "comme",
  "dans",
  "deja",
  "elle",
  "elles",
  "encore",
  "entre",
  "etait",
  "faire",
  "mais",
  "meme",
  "nous",
  "plus",
  "pour",
  "quand",
  "sans",
  "sont",
  "sous",
  "tout",
  "tres",
  "vers",
  "vous",
]);

const MOTIFS = [
  "silence",
  "froid",
  "maison",
  "nuit",
  "corps",
  "peur",
  "regard",
  "attente",
  "eau",
  "lumiere",
  "danger",
  "refuge",
  "dissociation",
  "alerte",
];

function normalizeText(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/’/g, "'")
    .replace(/[^a-z0-9\s'-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function chapterLabel(chapter: ChapitreTome1) {
  return `Ch. ${getNumeroChapitreTome1(chapter.id)}`;
}

function chapterText(chapter: ChapitreTome1) {
  return [chapter.titre, chapter.description, chapter.fonctionNarrative, chapter.imageCentrale, chapter.contenu]
    .filter(Boolean)
    .join(" ");
}

function words(text: string) {
  return normalizeText(text)
    .split(/\s+/)
    .filter((word) => word.length >= 4 && !STOPWORDS.has(word));
}

function ngrams(tokens: string[], size: number) {
  const values: string[] = [];
  for (let index = 0; index <= tokens.length - size; index += 1) {
    const gram = tokens.slice(index, index + size);
    if (gram.some((word) => STOPWORDS.has(word))) continue;
    values.push(gram.join(" "));
  }
  return values;
}

function levelFromCount(count: number): RepetitionLevel {
  if (count >= 18) return "élevé";
  if (count >= 8) return "moyen";
  return "faible";
}

function similarity(a: string[], b: string[]) {
  const first = new Set(a);
  const second = new Set(b);
  if (!first.size || !second.size) return 0;
  const shared = Array.from(first).filter((word) => second.has(word)).length;
  return shared / Math.min(first.size, second.size);
}

function compareEdges(chapters: ChapitreTome1[], edge: "closing" | "opening"): SimilarChapterSignal[] {
  const written = chapters.filter((chapter) => chapter.contenu.trim());
  const edges = written.map((chapter) => {
    const paragraphs = chapter.contenu.split(/\n+/).map((item) => item.trim()).filter(Boolean);
    const text = edge === "opening" ? paragraphs[0] || "" : paragraphs[paragraphs.length - 1] || "";
    return { chapter, tokens: words(text).slice(edge === "opening" ? 0 : -18) };
  });
  const signals: SimilarChapterSignal[] = [];

  for (let index = 0; index < edges.length; index += 1) {
    for (let other = index + 1; other < edges.length; other += 1) {
      const score = similarity(edges[index].tokens, edges[other].tokens);
      if (score < 0.45) continue;
      signals.push({
        chapters: `${chapterLabel(edges[index].chapter)} · ${chapterLabel(edges[other].chapter)}`,
        level: score >= 0.65 ? "élevé" : "moyen",
        suggestion: edge === "opening" ? "diversifier si nécessaire" : "vérifier la proximité de fermeture",
      });
    }
  }

  return signals.slice(0, 6);
}

function detectStructure(chapter: ChapitreTome1) {
  const text = normalizeText(chapter.contenu || chapter.description || chapter.fonctionNarrative || "");
  const hasScene = /corps|porte|piece|main|bruit|regard|nuit|maison|eau/.test(text);
  const hasAnalysis = /comprendre|appris|realise|analyse|savais|savoir|systeme/.test(text);
  const hasConclusion = /alors|depuis|jamais|toujours|restait|reste|fin/.test(text);

  if (hasScene && hasAnalysis && hasConclusion) return "scène → réflexion → conclusion";
  if (hasScene && hasAnalysis) return "scène → réflexion → transition";
  if (hasAnalysis && hasConclusion) return "souvenir → analyse → conclusion";
  if (hasScene) return "scène sensorielle";
  return "structure discrète";
}

export function analyserRepetitionsAvancees(chapters: ChapitreTome1[]): AdvancedRepetitionAudit {
  const written = chapters.filter((chapter) => chapter.contenu.trim());
  const wordMap = new Map<string, { chapters: Set<string>; count: number }>();
  const expressionMap = new Map<string, { chapters: Set<string>; count: number }>();

  written.forEach((chapter) => {
    const tokens = words(chapter.contenu);
    tokens.forEach((word) => {
      const current = wordMap.get(word) || { chapters: new Set<string>(), count: 0 };
      current.count += 1;
      current.chapters.add(chapterLabel(chapter));
      wordMap.set(word, current);
    });

    [2, 3, 4].forEach((size) => {
      ngrams(tokens, size).forEach((expression) => {
        const current = expressionMap.get(expression) || { chapters: new Set<string>(), count: 0 };
        current.count += 1;
        current.chapters.add(chapterLabel(chapter));
        expressionMap.set(expression, current);
      });
    });
  });

  const lexical = Array.from(wordMap.entries())
    .filter(([, value]) => value.count >= 6 && value.chapters.size >= 2)
    .map(([word, value]) => ({
      chapters: Array.from(value.chapters).slice(0, 6),
      count: value.count,
      level: levelFromCount(value.count),
      word,
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 18);

  const expressions = Array.from(expressionMap.entries())
    .filter(([, value]) => value.count >= 3 && value.chapters.size >= 2)
    .map(([expression, value]) => ({
      chapters: Array.from(value.chapters).slice(0, 6),
      count: value.count,
      expression,
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 12);

  const structureCounts = written.reduce<Record<string, number>>((acc, chapter) => {
    const structure = detectStructure(chapter);
    acc[structure] = (acc[structure] || 0) + 1;
    return acc;
  }, {});
  const structures = Object.entries(structureCounts)
    .map(([structure, count]) => ({
      count,
      frequency: written.length ? `${Math.round((count / written.length) * 100)}%` : "0%",
      structure,
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  const motifs = MOTIFS.map((motif) => {
    const chaptersWithMotif = chapters.filter((chapter) => normalizeText(chapterText(chapter)).includes(motif));
    return {
      count: chaptersWithMotif.length,
      motif,
      repartition: chaptersWithMotif.map(chapterLabel).slice(0, 8).join(", ") || "Absent",
    };
  })
    .filter((entry) => entry.count > 0)
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  const openings = compareEdges(chapters, "opening");
  const closings = compareEdges(chapters, "closing");
  const alerts = [
    ...lexical.filter((item) => item.level === "élevé").slice(0, 2).map((item) => `Mot "${item.word}" utilisé ${item.count} fois`),
    ...expressions.slice(0, 1).map((item) => `Expression répétée : "${item.expression}" (${item.count} fois)`),
    openings.length >= 3 ? `${openings.length} ouvertures proches détectées` : "",
    closings.length >= 3 ? `${closings.length} fermetures proches détectées` : "",
    motifs[0]?.count >= 8 ? `Motif "${motifs[0].motif}" très présent (${motifs[0].count} chapitres)` : "",
  ].filter(Boolean).slice(0, 5);

  const strengths = [
    lexical.filter((item) => item.level === "élevé").length <= 2 ? "bonne diversité lexicale" : "",
    openings.length <= 2 ? "ouvertures variées" : "",
    closings.length <= 2 ? "fermetures assez distinctes" : "",
    motifs.length >= 5 && (motifs[0]?.count || 0) < Math.max(8, chapters.length * 0.45) ? "motifs équilibrés" : "",
  ].filter(Boolean);

  const globalLevel: RepetitionLevel = alerts.length >= 4 ? "élevé" : alerts.length >= 2 ? "moyen" : "faible";

  return {
    alerts,
    closings,
    expressions,
    globalLevel,
    lexical,
    motifs,
    openings,
    strengths,
    structures,
  };
}

export function getRepetitionExecutiveStats(chapters: ChapitreTome1[]) {
  const audit = analyserRepetitionsAvancees(chapters);

  return {
    alertsCount: audit.alerts.length,
    globalLevel: audit.globalLevel,
  };
}
