import {
  CHAPITRES_TOME_1_STORAGE_KEY,
  CHAPITRES_TOME_1_DEFAUT,
  getNumeroChapitreTome1,
  normaliserChapitresTome1,
  type ChapitreTome1,
} from "@/lib/tome1-chapters";
import { lireFragments, type Fragment } from "@/lib/fragments";
import {
  createChapitreId,
  lireNarrativeRelationsAvecAutomatiques,
  type NarrativeRelation,
} from "@/lib/narrative-relations";

export type CompleteChapter = {
  id: string;
  tomeId: number;
  numero: number;
  titre: string;
  texte: string;
  wordCount: number;
  fragmentCount: number;
  fragments: Fragment[];
  chapter: ChapitreTome1;
  source: "fragments" | "chapitre" | "vide";
  isEmpty: boolean;
};

function normalizeTextBlock(value: string) {
  return value
    .replace(/\r\n/g, "\n")
    .split("\n")
    .map((line) => line.replace(/[ \t]+/g, " ").trimEnd())
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function normalizeLabel(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[’']/g, " ")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function countWords(value: string) {
  return value.trim().split(/\s+/).filter(Boolean).length;
}

function getChapterNumberFromId(chapterId: string | number) {
  if (typeof chapterId === "number" && Number.isFinite(chapterId)) return chapterId;
  return Number(String(chapterId).match(/\d+/)?.[0] || 0);
}

function fragmentRelationIds(fragment: Fragment) {
  return new Set([`fragment:${String(fragment.id)}`, String(fragment.id)]);
}

function relationLinksFragmentToChapter(
  relation: NarrativeRelation,
  fragmentIds: Set<string>,
  chapterIds: Set<string>,
) {
  const sourceIsFragment = fragmentIds.has(relation.sourceId);
  const targetIsFragment = fragmentIds.has(relation.targetId);
  const sourceIsChapter = chapterIds.has(relation.sourceId);
  const targetIsChapter = chapterIds.has(relation.targetId);

  return (sourceIsFragment && targetIsChapter) || (targetIsFragment && sourceIsChapter);
}

function readTome1Chapters() {
  if (typeof window === "undefined") return CHAPITRES_TOME_1_DEFAUT;

  try {
    const saved = localStorage.getItem(CHAPITRES_TOME_1_STORAGE_KEY);
    return normaliserChapitresTome1(saved ? JSON.parse(saved) : []);
  } catch {
    return CHAPITRES_TOME_1_DEFAUT;
  }
}

function fragmentMatchesChapter(
  fragment: Fragment,
  chapter: ChapitreTome1,
  tomeId: number,
  numero: number,
  relations: NarrativeRelation[],
) {
  const canonicalChapterId = createChapitreId(tomeId, numero);
  const chapterIds = new Set([canonicalChapterId, chapter.id]);
  if (relations.some((relation) => relationLinksFragmentToChapter(relation, fragmentRelationIds(fragment), chapterIds))) {
    return true;
  }

  if (!fragment.manuscrit) return false;

  if (fragment.chapitreId && fragment.chapitreId === canonicalChapterId) return true;
  if (fragment.chapitreId && fragment.chapitreId === chapter.id) return true;
  if (fragment.tomeId !== tomeId) return false;

  const fragmentChapter = String(fragment.chapitre || "").trim();
  if (!fragmentChapter) return false;

  return (
    fragmentChapter === String(numero) ||
    normalizeLabel(fragmentChapter) === normalizeLabel(`chapitre-${numero}`) ||
    normalizeLabel(fragmentChapter).startsWith(normalizeLabel(`Chapitre ${numero}`)) ||
    normalizeLabel(fragmentChapter) === normalizeLabel(chapter.titre) ||
    normalizeLabel(fragmentChapter).includes(normalizeLabel(chapter.titre)) ||
    normalizeLabel(chapter.titre).includes(normalizeLabel(fragmentChapter)) ||
    normalizeLabel(fragmentChapter) === normalizeLabel(`Chapitre ${numero}`)
  );
}

function buildCompleteChapter(
  chapter: ChapitreTome1,
  fragments: Fragment[],
  relations: NarrativeRelation[],
  tomeId = 1,
): CompleteChapter {
  const numero = getNumeroChapitreTome1(chapter.id);
  const linkedFragments = fragments
    .map((fragment, index) => ({ fragment, index }))
    .filter(({ fragment }) => fragmentMatchesChapter(fragment, chapter, tomeId, numero, relations))
    .sort((a, b) => a.index - b.index)
    .map(({ fragment }) => fragment);

  const fragmentText = normalizeTextBlock(
    linkedFragments
      .map((fragment) => normalizeTextBlock(fragment.texte || ""))
      .filter(Boolean)
      .join("\n\n"),
  );
  const chapterText = normalizeTextBlock(chapter.contenu || "");
  const texte = fragmentText || chapterText;
  const source = fragmentText ? "fragments" : chapterText ? "chapitre" : "vide";

  return {
    id: chapter.id,
    tomeId,
    numero,
    titre: chapter.titre,
    texte,
    wordCount: countWords(texte),
    fragmentCount: linkedFragments.length,
    fragments: linkedFragments,
    chapter,
    source,
    isEmpty: !texte,
  };
}

export function getCompleteChapter(
  chapterId: string | number,
  options: { chapters?: ChapitreTome1[]; fragments?: Fragment[]; relations?: NarrativeRelation[]; tomeId?: number } = {},
) {
  const tomeId = options.tomeId ?? 1;
  const chapters = options.chapters || readTome1Chapters();
  const fragments = options.fragments || lireFragments();
  const relations = options.relations || lireNarrativeRelationsAvecAutomatiques();
  const numero = getChapterNumberFromId(chapterId);
  const chapter = chapters.find((item) => getNumeroChapitreTome1(item.id) === numero || item.id === String(chapterId));

  if (!chapter) return null;
  return buildCompleteChapter(chapter, fragments, relations, tomeId);
}

export function getCompleteChapters(
  options: { chapters?: ChapitreTome1[]; fragments?: Fragment[]; relations?: NarrativeRelation[]; tomeId?: number } = {},
) {
  const tomeId = options.tomeId ?? 1;
  const chapters = options.chapters || readTome1Chapters();
  const fragments = options.fragments || lireFragments();
  const relations = options.relations || lireNarrativeRelationsAvecAutomatiques();

  return chapters
    .map((chapter) => buildCompleteChapter(chapter, fragments, relations, tomeId))
    .sort((a, b) => a.numero - b.numero);
}
