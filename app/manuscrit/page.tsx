"use client";

import Link from "next/link";
import { BackLink } from "@/components/ui/back-link";
import { genererAlertesEditoriales } from "@/lib/editorial-memory";
import { lireFragments, type Fragment } from "@/lib/fragments";
import {
  createChapitreId,
  creerSnapshotRelationsNarratives,
  getRelatedEntityIds,
  getRelationsForEntity,
  getSceneIdsForFragment,
  lireScenesRelationnelles,
  type NarrativeEntity,
  type NarrativeRelationsSnapshot,
} from "@/lib/narrative-relations";
import type { Scene } from "@/lib/scenes";
import { useDOMPagination } from "@/lib/paginate-manuscript";
import {
  CHAPITRES_TOME_1_DEFAUT,
  TITRE_TOME_1,
  compterMotsChapitreTome1,
  getChapitresTome1Disponibles,
  getChapitresTome1Ecrits,
  getDateModificationChapitreTome1,
  getNumeroChapitreTome1,
  getStatutEditorialChapitreTome1,
  lireChapitresTome1DepuisStorage,
  type ChapitreTome1,
  type StatutEditorialChapitreTome1,
} from "@/lib/tome1-chapters";
import { useEffect, useMemo, useRef, useState } from "react";

type PageManuscrit =
  | { kind: "cover"; pageNumber: null; chapterId?: string; chapterTitle?: string }
  | { kind: "title"; pageNumber: null; chapterId?: string; chapterTitle?: string }
  | { chapters: ChapitreTome1[]; kind: "toc"; pageNumber: null; chapterId?: string; chapterTitle?: string }
  | { chapter: ChapitreTome1; kind: "chapter-title"; pageNumber: number; chapterId: string; chapterTitle: string }
  | { chapter: ChapitreTome1; content: string; kind: "chapter-body"; pageNumber: number; chapterId: string; chapterTitle: string }
  | { chapter: ChapitreTome1; kind: "placeholder"; pageNumber: number; chapterId: string; chapterTitle: string };

const CARACTERES_PAR_PAGE = 860;

function numeroChapitre(id: string) {
  return getNumeroChapitreTome1(id);
}

function decouperLongParagraphe(paragraphe: string) {
  const phrases = paragraphe.match(/[^.!?]+[.!?]+|\S.+$/g) || [paragraphe];
  const morceaux: string[] = [];
  let morceau = "";

  phrases.forEach((phrase) => {
    const texte = phrase.trim();
    const prochain = morceau ? `${morceau} ${texte}` : texte;

    if (prochain.length > CARACTERES_PAR_PAGE && morceau) {
      morceaux.push(morceau);
      morceau = texte;
      return;
    }

    morceau = prochain;
  });

  if (morceau) morceaux.push(morceau);
  return morceaux;
}

function splitTextIntoPages(contenu: string) {
  const texte = contenu.trim();
  if (!texte) return [];

  const blocs = texte.split(/\n{2,}/).map((paragraphe) => paragraphe.trim()).filter(Boolean);
  const pages: string[] = [];
  let page = "";

  blocs.forEach((blocOriginal) => {
    const sousBlocs = blocOriginal.length > CARACTERES_PAR_PAGE
      ? decouperLongParagraphe(blocOriginal)
      : [blocOriginal];

    sousBlocs.forEach((bloc) => {
      const prochain = page ? `${page}\n\n${bloc}` : bloc;

      if (prochain.length > CARACTERES_PAR_PAGE && page) {
        pages.push(page);
        page = bloc;
        return;
      }

      page = prochain;
    });
  });

  if (page) pages.push(page);
  return pages;
}

function getReadableChapters(chapitres: ChapitreTome1[]) {
  return getChapitresTome1Disponibles(chapitres);
}

function buildManuscriptPages(
  chapitres: ChapitreTome1[],
  includeEmptyChapters: boolean,
  includeFrontMatter = true,
  pagesParChapitre: Record<string, string[]> = {},
) {
  const chapitresVisibles = includeEmptyChapters ? chapitres : getReadableChapters(chapitres);
  const pages: PageManuscrit[] = includeFrontMatter
    ? [
      { kind: "cover", pageNumber: null },
      { kind: "title", pageNumber: null },
      { chapters: chapitresVisibles, kind: "toc", pageNumber: null },
    ]
    : [];
  let pageNumber = 1;

  chapitresVisibles.forEach((chapitre) => {
    const numero = numeroChapitre(chapitre.id);

    pages.push({
      chapter: chapitre,
      chapterId: chapitre.id,
      chapterTitle: chapitre.titre,
      kind: "chapter-title",
      pageNumber,
    });
    pageNumber += 1;

    const pagesTexte = pagesParChapitre[chapitre.id] || splitTextIntoPages(chapitre.contenu);

    if (pagesTexte.length === 0 && includeEmptyChapters) {
      pages.push({
        chapter: chapitre,
        chapterId: chapitre.id,
        chapterTitle: chapitre.titre || `Chapitre ${numero}`,
        kind: "placeholder",
        pageNumber,
      });
      pageNumber += 1;
      return;
    }

    pagesTexte.forEach((content) => {
      pages.push({
        chapter: chapitre,
        chapterId: chapitre.id,
        chapterTitle: chapitre.titre,
        content,
        kind: "chapter-body",
        pageNumber,
      });
      pageNumber += 1;
    });
  });

  return pages;
}

function getChapterPageRanges(pages: PageManuscrit[]) {
  const ranges = new Map<string, { end: number; start: number; title: string }>();

  pages.forEach((page, index) => {
    if (!page.chapterId || !page.chapterTitle) return;

    const existing = ranges.get(page.chapterId);
    if (!existing) {
      ranges.set(page.chapterId, { end: index, start: index, title: page.chapterTitle });
      return;
    }

    existing.end = index;
  });

  return ranges;
}

function formaterVersionManuscrit(chapitres: ChapitreTome1[]) {
  const chapitresVisibles = getChapitresTome1Ecrits(chapitres);
  const lignes = [
    "L’HÉRITAGE DES SILENCES",
    TITRE_TOME_1,
    "Léna Montand",
    "",
    "",
  ];

  if (chapitresVisibles.length > 0) {
    lignes.push("TABLE DES MATIÈRES", "");
    chapitresVisibles.forEach((chapitre) => {
      lignes.push(`Chapitre ${numeroChapitre(chapitre.id)} — ${chapitre.titre}`);
    });
    lignes.push("", "");
  }

  chapitresVisibles.forEach((chapitre) => {
    lignes.push(`CHAPITRE ${numeroChapitre(chapitre.id)} — ${chapitre.titre.toUpperCase()}`, "");
    lignes.push(chapitre.contenu.trim(), "", "");
  });

  return lignes.join("\n");
}

function pageKey(page: PageManuscrit | undefined, index: number) {
  if (!page) return `empty-${index}`;
  return `${page.kind}-${page.pageNumber ?? "liminaire"}-${page.chapterId || "front"}-${index}`;
}

const STATUT_EDITORIAL_LABELS: Record<StatutEditorialChapitreTome1, string> = {
  "à réviser": "À réviser",
  brouillon: "Brouillon",
  validé: "Validé",
  vide: "Vide",
};

const STATUT_EDITORIAL_MARKERS: Record<StatutEditorialChapitreTome1, string> = {
  "à réviser": "◐",
  brouillon: "●",
  validé: "✓",
  vide: "○",
};

function formatNombreMots(nombre: number) {
  return `${nombre.toLocaleString("fr-CA")} mot${nombre > 1 ? "s" : ""}`;
}

function formatDateModification(value: string) {
  if (!value) return "";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  return new Intl.DateTimeFormat("fr-CA", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
}

function getChapterOptionLabel(chapitre: ChapitreTome1) {
  const statut = getStatutEditorialChapitreTome1(chapitre);
  return `${STATUT_EDITORIAL_MARKERS[statut]} Ch. ${numeroChapitre(chapitre.id)} · ${chapitre.titre}`;
}

function formatStat(nombre: number) {
  return nombre.toLocaleString("fr-CA");
}

function buildDiagnosticEditorial(chapitres: ChapitreTome1[]) {
  const chapitresEcrits = getChapitresTome1Ecrits(chapitres);
  const chapitresAvecMots = chapitresEcrits
    .map((chapitre) => ({
      chapitre,
      mots: compterMotsChapitreTome1(chapitre),
      statut: getStatutEditorialChapitreTome1(chapitre),
    }))
    .filter((entry) => entry.mots > 0);
  const totalMots = chapitresAvecMots.reduce((total, entry) => total + entry.mots, 0);
  const moyenneMots = chapitresAvecMots.length ? Math.round(totalMots / chapitresAvecMots.length) : 0;
  const chapitresValides = chapitresAvecMots.filter((entry) => entry.statut === "validé").length;
  const chapitresBrouillons = chapitresAvecMots.filter((entry) => entry.statut === "brouillon").length;
  const chapitreLePlusLong = [...chapitresAvecMots].sort((a, b) => b.mots - a.mots)[0] || null;
  const chapitreLePlusCourt = [...chapitresAvecMots].sort((a, b) => a.mots - b.mots)[0] || null;
  const alertes: string[] = [];

  if (chapitreLePlusCourt && chapitreLePlusCourt.mots < 500) {
    alertes.push(`Chapitre très court : ch. ${numeroChapitre(chapitreLePlusCourt.chapitre.id)}.`);
  }

  if (chapitreLePlusLong && chapitreLePlusLong.mots > 7000) {
    alertes.push(`Chapitre très long : ch. ${numeroChapitre(chapitreLePlusLong.chapitre.id)}.`);
  }

  if (chapitresBrouillons >= 4 && chapitresBrouillons > chapitresValides) {
    alertes.push("Plusieurs chapitres restent en brouillon.");
  }

  if (chapitresAvecMots.length > 0 && chapitresValides === 0) {
    alertes.push("Aucun chapitre validé pour le moment.");
  }

  if (
    chapitreLePlusLong &&
    chapitreLePlusCourt &&
    chapitreLePlusCourt.mots > 0 &&
    chapitreLePlusLong.mots / chapitreLePlusCourt.mots >= 3
  ) {
    alertes.push("Écart important de longueur entre chapitres.");
  }

  return {
    alertes: Array.from(new Set(alertes)).slice(0, 3),
    chapitreLePlusCourt,
    chapitreLePlusLong,
    chapitresEcrits: chapitresEcrits.length,
    chapitresVides: chapitres.length - chapitresEcrits.length,
    chapitresValides,
    moyenneMots,
    totalMots,
  };
}

const MOTS_IGNORES = new Set([
  "alors",
  "avec",
  "avoir",
  "comme",
  "dans",
  "des",
  "elle",
  "elles",
  "encore",
  "est",
  "était",
  "être",
  "faire",
  "fait",
  "ils",
  "les",
  "leur",
  "mais",
  "mes",
  "moi",
  "nous",
  "pas",
  "plus",
  "pour",
  "que",
  "qui",
  "sans",
  "ses",
  "son",
  "sont",
  "sur",
  "tout",
  "très",
  "une",
  "vous",
]);

function getParagraphesChapitre(chapitre: ChapitreTome1) {
  return chapitre.contenu.trim().split(/\n{2,}/).map((paragraphe) => paragraphe.trim()).filter(Boolean);
}

function trouverRepetitionsSignificatives(texte: string) {
  const mots = texte
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .match(/[a-zà-ÿ]{4,}/gi) || [];
  const compteur = new Map<string, number>();

  mots.forEach((mot) => {
    if (MOTS_IGNORES.has(mot)) return;
    compteur.set(mot, (compteur.get(mot) || 0) + 1);
  });

  return Array.from(compteur.entries())
    .filter(([, count]) => count >= 4)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3);
}

function buildAuditChapitre(chapitre: ChapitreTome1 | null) {
  if (!chapitre) return null;

  const mots = compterMotsChapitreTome1(chapitre);
  const paragraphes = getParagraphesChapitre(chapitre);
  const paragraphesAvecMots = paragraphes.map((paragraphe) => paragraphe.split(/\s+/).filter(Boolean).length);
  const moyenneParagraphes = paragraphesAvecMots.length
    ? Math.round(paragraphesAvecMots.reduce((total, count) => total + count, 0) / paragraphesAvecMots.length)
    : 0;
  const paragraphesTresLongs = paragraphesAvecMots.filter((count) => count > 180).length;
  const paragraphesTresCourts = paragraphesAvecMots.filter((count) => count > 0 && count < 20).length;
  const statut = getStatutEditorialChapitreTome1(chapitre);
  const alertes: string[] = [];

  if (mots === 0) alertes.push("Chapitre vide.");
  if (!chapitre.titre.trim()) alertes.push("Titre absent.");
  if (paragraphesTresLongs > 0) alertes.push("Certains paragraphes respireraient mieux divisés.");
  if (paragraphesTresCourts >= Math.max(4, paragraphes.length / 2) && mots > 0) {
    alertes.push("Rythme très fragmenté à vérifier.");
  }

  return {
    alertes: alertes.slice(0, 2),
    moyenneParagraphes,
    mots,
    paragraphes: paragraphes.length,
    paragraphesTresCourts,
    paragraphesTresLongs,
    repetitions: trouverRepetitionsSignificatives(chapitre.contenu),
    statut,
    titrePresent: Boolean(chapitre.titre.trim()),
  };
}

function estSouvenirNonIntegre(fragment: Fragment) {
  const statut = (fragment.statut || "").toLowerCase();
  return (
    statut.includes("non") ||
    statut.includes("à intégrer") ||
    statut.includes("a integrer") ||
    statut.includes("brut")
  );
}

function motifsDominants(items: string[]) {
  const compteur = new Map<string, number>();

  items
    .map((item) => item.trim())
    .filter(Boolean)
    .forEach((item) => compteur.set(item, (compteur.get(item) || 0) + 1));

  return Array.from(compteur.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 4)
    .map(([motif]) => motif);
}

function buildMatiereNarrative(chapitre: ChapitreTome1 | null, fragments: Fragment[], scenes: Scene[]) {
  if (!chapitre) return null;

  const numero = numeroChapitre(chapitre.id);
  const chapitreId = createChapitreId(1, numero);
  const scenesLiees = scenes.filter(
    (scene) =>
      scene.chapitreId === chapitreId ||
      (Number(scene.tome || scene.tomeId) === 1 && String(scene.chapitre) === String(numero)),
  );
  const sceneIds = new Set(scenesLiees.map((scene) => scene.id));
  const fragmentsLies = fragments.filter(
    (fragment) =>
      fragment.chapitreId === chapitreId ||
      (fragment.tomeId === 1 && String(fragment.chapitre) === String(numero)) ||
      getSceneIdsForFragment(fragment).some((sceneId) => sceneIds.has(sceneId)),
  );
  const motifs = motifsDominants([
    ...fragmentsLies.flatMap((fragment) => fragment.tags || []),
    ...scenesLiees.flatMap((scene) => [...(scene.motifs || []), ...(scene.tagsNarratifs || [])]),
  ]);
  const alertes: string[] = [];

  if (compterMotsChapitreTome1(chapitre) > 0 && fragmentsLies.length === 0) {
    alertes.push("Aucun fragment lié à ce chapitre écrit.");
  }

  return {
    alertes,
    fragments: fragmentsLies.length,
    motifs,
    scenes: scenesLiees.length,
    souvenirsNonIntegres: fragmentsLies.filter(estSouvenirNonIntegre).length,
  };
}

function buildResonancesNarratives(chapitre: ChapitreTome1 | null, snapshot: NarrativeRelationsSnapshot | null) {
  if (!chapitre || !snapshot) return null;

  const chapitreId = createChapitreId(1, numeroChapitre(chapitre.id));
  const entityById = new Map(snapshot.entities.map((entity) => [entity.id, entity]));
  const chapterEntity = entityById.get(chapitreId);
  const relations = getRelationsForEntity(chapitreId, snapshot.relations);
  const relatedEntities = getRelatedEntityIds(chapitreId, relations)
    .map((entityId) => entityById.get(entityId))
    .filter((entity): entity is NarrativeEntity => Boolean(entity));
  const motifRelations = relations.filter((relation) => relation.relationType === "motif");
  const emotionRelations = relations.filter((relation) => relation.relationType === "emotion");
  const continuityRelations = relations.filter((relation) => relation.relationType === "continuity");
  const motifs = motifsDominants([
    ...(chapterEntity?.motifs || []),
    ...relatedEntities
      .filter((entity) => motifRelations.some((relation) => relation.sourceId === entity.id || relation.targetId === entity.id))
      .flatMap((entity) => entity.motifs),
  ]);
  const fragmentsLies = relatedEntities
    .filter((entity) => entity.type === "fragment")
    .map((entity) => entity.label)
    .slice(0, 4);
  const echosEmotionnels = Array.from(
    new Set([
      ...(chapterEntity?.emotions || []),
      ...relatedEntities
        .filter((entity) => emotionRelations.some((relation) => relation.sourceId === entity.id || relation.targetId === entity.id))
        .flatMap((entity) => entity.emotions),
    ]),
  ).slice(0, 4);
  const continuites = relatedEntities
    .filter((entity) => continuityRelations.some((relation) => relation.sourceId === entity.id || relation.targetId === entity.id))
    .map((entity) => entity.label)
    .slice(0, 3);

  return {
    continuites,
    echosEmotionnels,
    fragmentsLies,
    motifs,
    relationCount: relations.length,
  };
}

export default function ManuscritPage() {
  const [chapitres, setChapitres] = useState<ChapitreTome1[]>(CHAPITRES_TOME_1_DEFAUT);
  const [fragments, setFragments] = useState<Fragment[]>([]);
  const [scenes, setScenes] = useState<Scene[]>([]);
  const [copie, setCopie] = useState(false);
  const [includeEmptyChapters, setIncludeEmptyChapters] = useState(false);
  const [selectedChapterId, setSelectedChapterId] = useState<string>("all");
  const [pageIndex, setPageIndex] = useState(0);
  const [isWide, setIsWide] = useState(false);
  const [isInsightsOpen, setIsInsightsOpen] = useState(false);
  const [relationsNarratives, setRelationsNarratives] = useState<NarrativeRelationsSnapshot | null>(null);
  const readingZoneRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    setChapitres(lireChapitresTome1DepuisStorage());
    setFragments(lireFragments());
    setScenes(lireScenesRelationnelles());
    setRelationsNarratives(creerSnapshotRelationsNarratives());
  }, []);

  useEffect(() => {
    const update = () => setIsWide(window.innerWidth >= 900);
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  const chapitresLisibles = useMemo(
    () => (includeEmptyChapters ? chapitres : getReadableChapters(chapitres)),
    [chapitres, includeEmptyChapters],
  );
  const selectedChapter = selectedChapterId === "all"
    ? null
    : chapitres.find((chapitre) => chapitre.id === selectedChapterId) || null;
  const chapitresPourLecture = selectedChapter ? [selectedChapter] : chapitres;
  const paginationChapitres = useMemo(
    () =>
      (selectedChapter ? [selectedChapter] : chapitresLisibles)
        .filter((chapitre) => chapitre.contenu.trim())
        .map((chapitre) => ({ contenu: chapitre.contenu, id: chapitre.id })),
    [chapitresLisibles, selectedChapter],
  );
  const pagesParChapitre = useDOMPagination(paginationChapitres, readingZoneRef);

  const pages = useMemo(
    () => buildManuscriptPages(
      chapitresPourLecture,
      selectedChapter ? true : includeEmptyChapters,
      !selectedChapter,
      pagesParChapitre,
    ),
    [chapitresPourLecture, includeEmptyChapters, pagesParChapitre, selectedChapter],
  );
  const chapterRanges = useMemo(() => getChapterPageRanges(pages), [pages]);
  const visibleIndex = isWide ? Math.floor(pageIndex / 2) * 2 : pageIndex;
  const visiblePages = isWide ? [pages[visibleIndex], pages[visibleIndex + 1]] : [pages[visibleIndex]];
  const activePage = pages[Math.min(visibleIndex, pages.length - 1)];
  const activeChapter = activePage?.chapterTitle || "Pages liminaires";
  const activeChapterData = selectedChapter || (activePage && "chapter" in activePage ? activePage.chapter : null);
  const activeEditorialStatus = activeChapterData ? getStatutEditorialChapitreTome1(activeChapterData) : null;
  const activeWordCount = activeChapterData ? compterMotsChapitreTome1(activeChapterData) : 0;
  const activeUpdatedAt = activeChapterData
    ? formatDateModification(getDateModificationChapitreTome1(activeChapterData))
    : "";
  const currentPageLabel = Math.min(visibleIndex + 1, pages.length);
  const chapitresRemplis = getChapitresTome1Ecrits(chapitres).length;
  const diagnosticEditorial = useMemo(() => buildDiagnosticEditorial(chapitres), [chapitres]);
  const memoireActive = useMemo(() => genererAlertesEditoriales(chapitres, fragments), [chapitres, fragments]);
  const auditChapitreActif = useMemo(() => buildAuditChapitre(activeChapterData), [activeChapterData]);
  const matiereNarrative = useMemo(
    () => buildMatiereNarrative(activeChapterData, fragments, scenes),
    [activeChapterData, fragments, scenes],
  );
  const resonancesNarratives = useMemo(
    () => buildResonancesNarratives(activeChapterData, relationsNarratives),
    [activeChapterData, relationsNarratives],
  );

  const maxStep = isWide ? 2 : 1;
  const canGoPrevious = visibleIndex > 0;
  const canGoNext = visibleIndex + maxStep < pages.length;
  const rangesList = useMemo(
    () => Array.from(chapterRanges.values()).sort((a, b) => a.start - b.start),
    [chapterRanges],
  );
  const selectedChapterIndex = selectedChapter
    ? chapitresLisibles.findIndex((chapitre) => chapitre.id === selectedChapter.id)
    : -1;
  const currentRangeIndex = rangesList.findIndex((range) => visibleIndex >= range.start && visibleIndex <= range.end);
  const nextRangeFromFrontMatter = rangesList.findIndex((range) => range.start > visibleIndex);
  const canGoPreviousChapter = selectedChapter
    ? selectedChapterIndex > 0
    : currentRangeIndex > 0;
  const canGoNextChapter = selectedChapter
    ? selectedChapterIndex >= 0 && selectedChapterIndex < chapitresLisibles.length - 1
    : currentRangeIndex >= 0
      ? currentRangeIndex < rangesList.length - 1
      : nextRangeFromFrontMatter >= 0;

  const allerPagePrecedente = () => {
    setPageIndex((current) => Math.max(0, current - maxStep));
  };

  const allerPageSuivante = () => {
    setPageIndex((current) => Math.min(Math.max(pages.length - 1, 0), current + maxStep));
  };

  const allerChapitre = (direction: "next" | "previous") => {
    if (selectedChapter) {
      const currentChapterIndex = chapitresLisibles.findIndex((chapitre) => chapitre.id === selectedChapter.id);
      const nextIndex = direction === "next" ? currentChapterIndex + 1 : currentChapterIndex - 1;
      const target = chapitresLisibles[nextIndex];

      if (target) {
        setSelectedChapterId(target.id);
        setPageIndex(0);
      }

      return;
    }

    const targetIndex = currentRangeIndex >= 0
      ? direction === "next"
        ? currentRangeIndex + 1
        : currentRangeIndex - 1
      : direction === "next"
        ? nextRangeFromFrontMatter
        : nextRangeFromFrontMatter - 1;
    const target = rangesList[targetIndex];

    if (target) setPageIndex(target.start);
  };

  const copierManuscrit = async () => {
    const texte = formaterVersionManuscrit(chapitres);

    try {
      await navigator.clipboard.writeText(texte);
    } catch {
      const textarea = document.createElement("textarea");
      textarea.value = texte;
      textarea.setAttribute("readonly", "");
      textarea.style.position = "fixed";
      textarea.style.left = "-9999px";
      textarea.style.top = "0";
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand("copy");
      textarea.remove();
    }

    setCopie(true);
    window.setTimeout(() => setCopie(false), 1600);
  };

  const activerPleinEcran = async () => {
    try {
      if (!document.fullscreenElement) {
        await document.documentElement.requestFullscreen?.();
        return;
      }

      await document.exitFullscreen?.();
    } catch {
      // Certains navigateurs intégrés refusent le plein écran.
    }
  };

  useEffect(() => {
    setPageIndex(0);
    if (!includeEmptyChapters && selectedChapterId !== "all") {
      const exists = getReadableChapters(chapitres).some((chapitre) => chapitre.id === selectedChapterId);
      if (!exists) setSelectedChapterId("all");
    }
  }, [chapitres, includeEmptyChapters, selectedChapterId]);

  useEffect(() => {
    setPageIndex((current) => Math.min(current, Math.max(pages.length - 1, 0)));
  }, [pages.length]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "ArrowLeft") allerPagePrecedente();
      if (event.key === "ArrowRight") allerPageSuivante();
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  });

  return (
    <main className="manuscript-viewport min-h-screen overflow-hidden bg-[#0d0c0a] text-[#f5efe3]">
      <div className="manuscript-stage flex h-screen flex-col px-3 py-2 sm:px-5">
        <header className="mx-auto flex w-full max-w-7xl shrink-0 flex-col gap-1.5 pb-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <BackLink label="Système" />
            <div className="hidden h-5 w-px bg-[#d6b25e]/18 sm:block" />
            <p className="text-[10px] uppercase tracking-[0.24em] text-[#9c8d73]">Livre virtuel</p>
          </div>

          <div className="flex flex-wrap items-center gap-1.5 text-[11px] text-[#b8aa91]">
            <Link
              className="rounded-full border border-[#d6b25e]/12 px-3 py-1.5 opacity-80 transition hover:border-[#d6b25e]/28 hover:text-[#f5efe3]"
              href="/guide-strate"
            >
              Besoin d’aide ?
            </Link>
            <Link
              className="rounded-full border border-[#d6b25e]/12 px-3 py-1.5 opacity-80 transition hover:border-[#d6b25e]/28 hover:text-[#f5efe3]"
              href="/structure-tome-1"
            >
              Structure
            </Link>
            <button className="book-control" disabled={!canGoPreviousChapter} onClick={() => allerChapitre("previous")} type="button">
              Ch. préc.
            </button>
            <button className="book-control" disabled={!canGoNextChapter} onClick={() => allerChapitre("next")} type="button">
              Ch. suiv.
            </button>
            <button className="book-control" onClick={activerPleinEcran} type="button">
              Plein écran
            </button>
            <button className="book-control" onClick={copierManuscrit} type="button">
              {copie ? "Copié" : "Copier"}
            </button>
          </div>
        </header>

        <section className="manuscript-toolbar mx-auto flex w-full max-w-7xl shrink-0 items-center justify-between gap-3 border-y border-[#d6b25e]/10 py-1.5">
          <div className="min-w-0">
            <h1 className="truncate font-serif text-lg text-[#f5efe3] sm:text-xl">
              L’Héritage des Silences
            </h1>
            <p className="truncate text-xs text-[#b8aa91]">
              {TITRE_TOME_1} · {activeChapter}
            </p>
            <div className="mt-1 flex flex-wrap items-center gap-2 text-[10px] uppercase tracking-[0.16em] text-[#9c8d73]">
              {activeEditorialStatus ? (
                <>
                  <span className="rounded-full border border-[#d6b25e]/12 bg-[#d6b25e]/5 px-2 py-0.5 text-[#d8caa8]">
                    {STATUT_EDITORIAL_MARKERS[activeEditorialStatus]}{" "}
                    {STATUT_EDITORIAL_LABELS[activeEditorialStatus]}
                  </span>
                  <span>{formatNombreMots(activeWordCount)}</span>
                  {activeUpdatedAt && <span>Modifié le {activeUpdatedAt}</span>}
                </>
              ) : (
                <span>Pages liminaires</span>
              )}
            </div>
          </div>
          <div className="flex shrink-0 flex-wrap items-center justify-end gap-2 text-xs text-[#b8aa91]">
            <span className="hidden sm:inline">{chapitresRemplis}/{chapitres.length} chapitres écrits</span>
            <span>Page {currentPageLabel} / {pages.length}</span>
            <select
              className="book-select max-w-[190px] rounded-full border border-[#d6b25e]/14 bg-[#14110e] px-3 py-1.5 text-xs text-[#d7cab0] outline-none transition focus:border-[#d6b25e]/45"
              onChange={(event) => {
                setSelectedChapterId(event.target.value);
                setPageIndex(0);
              }}
              value={selectedChapterId}
            >
              <option value="all">Livre entier</option>
              {chapitresLisibles.map((chapitre) => (
                <option key={chapitre.id} value={chapitre.id}>
                  {getChapterOptionLabel(chapitre)}
                </option>
              ))}
            </select>
            <label className="book-toggle flex cursor-pointer items-center gap-2 rounded-full border border-[#d6b25e]/14 px-3 py-1.5">
              <input
                checked={includeEmptyChapters}
                className="accent-[#d6b25e]"
                onChange={(event) => setIncludeEmptyChapters(event.target.checked)}
                type="checkbox"
              />
              <span className="hidden sm:inline">Toute la structure</span>
              <span className="sm:hidden">Tout</span>
            </label>
          </div>
        </section>

        <section
          className={[
            "manuscript-insights-panel mx-auto mt-1 w-full max-w-7xl shrink-0 overflow-hidden rounded-[14px] border border-[#d6b25e]/10 bg-[#15120f]/76 text-[#c2b397] shadow-[0_8px_22px_rgba(0,0,0,0.14)] backdrop-blur-sm",
            isInsightsOpen ? "max-h-[156px]" : "max-h-[38px]",
          ].join(" ")}
        >
          <button
            className="flex w-full items-center justify-between gap-3 px-3 py-1.5 text-left"
            onClick={() => setIsInsightsOpen((value) => !value)}
            type="button"
          >
            <span className="min-w-0">
              <span className="block text-[8px] uppercase tracking-[0.2em] text-[#9c8d73]">
                Lecture éditoriale
              </span>
              <span className="block truncate text-[10px] text-[#d7cab0]">
                {formatStat(diagnosticEditorial.totalMots)} mots · {diagnosticEditorial.chapitresEcrits} écrits
                {auditChapitreActif ? ` · ${formatNombreMots(auditChapitreActif.mots)} sur le chapitre actif` : ""}
                {matiereNarrative ? ` · ${matiereNarrative.fragments} fragments liés` : ""}
                {resonancesNarratives ? ` · ${resonancesNarratives.relationCount} résonances` : ""}
                {memoireActive.length ? ` · ${memoireActive.length} signaux actifs` : ""}
              </span>
            </span>
            <span className="shrink-0 text-[10px] uppercase tracking-[0.16em] text-[#9c8d73]">
              {isInsightsOpen ? "Refermer" : "Détails"}
            </span>
          </button>

          <div className="max-h-[118px] overflow-y-auto border-t border-[#d6b25e]/8 px-3 py-2 text-[9px] text-[#b8aa91]">
            <div className="grid gap-2 md:grid-cols-5">
              <div className="min-w-0">
                <p className="mb-1 text-[8px] uppercase tracking-[0.18em] text-[#9c8d73]">
                  Tome
                </p>
                <p className="truncate">
                  {diagnosticEditorial.chapitresEcrits} écrits · {diagnosticEditorial.chapitresVides} vides ·{" "}
                  {diagnosticEditorial.chapitresValides} validés
                </p>
                <p className="truncate text-[#d7cab0]">
                  moyenne {formatStat(diagnosticEditorial.moyenneMots)} mots / chapitre
                </p>
                <p className="truncate text-[#d6b25e]">
                  {diagnosticEditorial.alertes.length > 0
                    ? diagnosticEditorial.alertes.join(" · ")
                    : "Aucune alerte majeure"}
                </p>
              </div>

              {auditChapitreActif && (
                <div className="min-w-0">
                  <p className="mb-1 text-[8px] uppercase tracking-[0.18em] text-[#9c8d73]">
                    Chapitre actif
                  </p>
                  <p className="truncate">
                    {STATUT_EDITORIAL_MARKERS[auditChapitreActif.statut]}{" "}
                    {STATUT_EDITORIAL_LABELS[auditChapitreActif.statut]} ·{" "}
                    {auditChapitreActif.paragraphes} paragraphes
                  </p>
                  <p className="truncate text-[#d7cab0]">
                    {formatStat(auditChapitreActif.moyenneParagraphes)} mots / paragraphe ·{" "}
                    {auditChapitreActif.paragraphesTresLongs} très longs
                  </p>
                  <p className="truncate text-[#d6b25e]">
                    {auditChapitreActif.alertes.length > 0
                      ? auditChapitreActif.alertes.join(" · ")
                      : "Aucune alerte locale"}
                  </p>
                </div>
              )}

              {matiereNarrative && (
                <div className="min-w-0">
                  <p className="mb-1 text-[8px] uppercase tracking-[0.18em] text-[#9c8d73]">
                    Matière liée
                  </p>
                  <p className="truncate">
                    {matiereNarrative.fragments} fragment{matiereNarrative.fragments > 1 ? "s" : ""} ·{" "}
                    {matiereNarrative.scenes} scène{matiereNarrative.scenes > 1 ? "s" : ""}
                  </p>
                  <p className="truncate text-[#d7cab0]">
                    {matiereNarrative.motifs.length > 0
                      ? `Motifs : ${matiereNarrative.motifs.join(", ")}`
                      : "Motifs à préciser"}
                  </p>
                  <p className="truncate text-[#d6b25e]">
                    {matiereNarrative.alertes.length > 0
                      ? matiereNarrative.alertes.join(" · ")
                      : "Matière reliée"}
                  </p>
                </div>
              )}

              {resonancesNarratives && (
                <div className="min-w-0">
                  <p className="mb-1 text-[8px] uppercase tracking-[0.18em] text-[#9c8d73]">
                    Résonances narratives
                  </p>
                  <p className="truncate">
                    {resonancesNarratives.relationCount} relation{resonancesNarratives.relationCount > 1 ? "s" : ""} liée{resonancesNarratives.relationCount > 1 ? "s" : ""}
                  </p>
                  <p className="truncate text-[#d7cab0]">
                    {resonancesNarratives.motifs.length > 0
                      ? `Motifs : ${resonancesNarratives.motifs.join(", ")}`
                      : "Motifs à préciser"}
                  </p>
                  <p className="truncate text-[#c2b397]">
                    {resonancesNarratives.fragmentsLies.length > 0
                      ? `Fragments : ${resonancesNarratives.fragmentsLies.join(", ")}`
                      : "Aucun fragment relié"}
                  </p>
                  <p className="truncate text-[#d6b25e]">
                    {resonancesNarratives.echosEmotionnels.length > 0
                      ? `Échos : ${resonancesNarratives.echosEmotionnels.join(", ")}`
                      : resonancesNarratives.continuites.length > 0
                        ? `Continuités : ${resonancesNarratives.continuites.join(", ")}`
                        : "Continuités à construire"}
                  </p>
                </div>
              )}

              <div className="min-w-0">
                <p className="mb-1 text-[8px] uppercase tracking-[0.18em] text-[#9c8d73]">
                  Mémoire active
                </p>
                <ul className="m-0 grid list-none gap-1 p-0 text-[9px] leading-snug">
                  {memoireActive.length > 0 ? (
                    memoireActive.slice(0, 4).map((alerte) => (
                      <li
                        className={alerte.tone === "success" ? "text-[#b8caa8]" : "text-[#d6b25e]"}
                        key={alerte.message}
                      >
                        {alerte.tone === "success" ? "✓" : "⚠"} {alerte.message}
                      </li>
                    ))
                  ) : (
                    <li className="text-[#b8aa91]">Aucun signal majeur</li>
                  )}
                </ul>
              </div>
            </div>
          </div>
        </section>

        <section className="manuscript-reading-zone relative mx-auto w-full max-w-7xl flex-1" ref={readingZoneRef}>
          <button
            aria-label="Page précédente"
            className="book-side-arrow book-side-arrow-left"
            disabled={!canGoPrevious}
            onClick={allerPagePrecedente}
            type="button"
          >
            ‹
          </button>
          <button
            aria-label="Page suivante"
            className="book-side-arrow book-side-arrow-right"
            disabled={!canGoNext}
            onClick={allerPageSuivante}
            type="button"
          >
            ›
          </button>

          <div className="book-shell">
            <div className="book-object relative z-20 grid h-full w-full grid-cols-1 gap-0 md:grid-cols-2">
              {visiblePages.map((page, index) => (
                <BookPage
                  isLeft={isWide && index === 0}
                  isRight={isWide && index === 1}
                  key={pageKey(page, visibleIndex + index)}
                  page={page}
                />
              ))}
              {isWide && !visiblePages[1] && <div className="book-page-empty hidden md:block" />}
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}

function BookPage({
  isLeft,
  isRight,
  page,
}: {
  isLeft?: boolean;
  isRight?: boolean;
  page?: PageManuscrit;
}) {
  if (!page) {
    return <div className="book-page-empty hidden md:block" />;
  }

  return (
    <article
      className={[
        "book-page relative flex min-h-0 flex-col overflow-hidden bg-[#fbf3e2] px-7 py-8 text-[#211d18] sm:px-10 sm:py-10",
        page.kind === "chapter-body" ? "book-page-content" : "",
        isLeft ? "book-page-left md:rounded-r-none" : "",
        isRight ? "book-page-right md:rounded-l-none" : "",
      ].join(" ")}
    >
      {(page.kind === "chapter-body" || page.kind === "placeholder") && (
        <header className="mb-5 flex shrink-0 items-center justify-between gap-4 text-[10px] uppercase tracking-[0.16em] text-[#9b8c70]">
          <span className="truncate">L’Héritage des Silences</span>
          <span className="truncate">{page.chapterTitle}</span>
        </header>
      )}

      {page.kind === "cover" && (
        <div className="page-content page-content-center text-center">
          <p className="book-kicker">Manuscrit</p>
          <h2 className="book-cover-title max-w-sm font-serif leading-[0.98] text-[#231e17]">
            L’Héritage des Silences
          </h2>
          <p className="book-cover-subtitle text-sm uppercase tracking-[0.2em] text-[#705f42]">
            {TITRE_TOME_1}
          </p>
          <div className="book-title-rule h-px w-24 bg-[#b59a5c]" />
          <p className="text-sm tracking-[0.14em] text-[#4f4434]">Léna Montand</p>
        </div>
      )}

      {page.kind === "title" && (
        <div className="page-content page-content-center text-center">
          <p className="text-xs uppercase tracking-[0.24em] text-[#8f7a50]">Tome I</p>
          <h2 className="book-section-title mx-auto max-w-sm font-serif leading-tight text-[#231e17]">
            Le gel et la lumière
          </h2>
          <p className="book-section-copy mx-auto max-w-xs text-sm leading-7 text-[#6d5f49]">
            Pages liminaires et chapitres du manuscrit actuel.
          </p>
          <p className="book-author text-sm text-[#4f4434]">Léna Montand</p>
        </div>
      )}

      {page.kind === "toc" && (
        <div className="page-content page-content-body">
          <p className="book-kicker text-center">Table des matières</p>
          <div className="mx-auto mt-2 w-full max-w-sm space-y-2">
            {page.chapters.length > 0 ? (
              page.chapters.map((chapitre) => (
                <div
                  className="flex items-baseline gap-3 border-b border-[#8f7a50]/16 pb-1.5 text-[#3d3326]"
                  key={chapitre.id}
                >
                  <span className="shrink-0 text-[10px] uppercase tracking-[0.2em] text-[#8f7a50]">
                    {String(numeroChapitre(chapitre.id)).padStart(2, "0")}
                  </span>
                  <span className="font-serif text-sm leading-snug">
                    {chapitre.titre}
                  </span>
                </div>
              ))
            ) : (
              <p className="text-center text-sm italic leading-7 text-[#84755f]">
                Aucun chapitre écrit pour le moment.
              </p>
            )}
          </div>
        </div>
      )}

      {page.kind === "chapter-title" && (
        <div className="page-content page-content-center text-center">
          <p className="text-xs uppercase tracking-[0.24em] text-[#8f7a50]">
            Chapitre {numeroChapitre(page.chapter.id)}
          </p>
          <h2 className="book-chapter-title mx-auto max-w-md font-serif leading-tight text-[#231e17]">
            {page.chapter.titre}
          </h2>
          {(page.chapter.ageApprox || page.chapter.periode) && (
            <p className="book-chapter-meta mx-auto max-w-xs text-xs uppercase tracking-[0.16em] text-[#8f8068]">
              {[page.chapter.ageApprox, page.chapter.periode].filter(Boolean).join(" · ")}
            </p>
          )}
        </div>
      )}

      {page.kind === "placeholder" && (
        <div className="page-content page-content-center text-center">
          <p className="text-xs uppercase tracking-[0.2em] text-[#8f7a50]">
            Chapitre {numeroChapitre(page.chapter.id)}
          </p>
          <h2 className="book-placeholder-title mx-auto max-w-sm font-serif text-[#231e17]">
            {page.chapter.titre}
          </h2>
          <p className="book-placeholder-copy mx-auto max-w-xs text-sm italic leading-7 text-[#84755f]">
            Chapitre à écrire.
          </p>
          {page.chapter.fonctionNarrative && (
            <p className="book-placeholder-note mx-auto max-w-sm text-xs leading-6 text-[#8b7b63]">
              {page.chapter.fonctionNarrative}
            </p>
          )}
        </div>
      )}

      {page.kind === "chapter-body" && (
        <div className="page-content page-content-body">
          <div className="book-text whitespace-pre-wrap text-[#211d18]">
            {page.content}
          </div>
        </div>
      )}

      {page.pageNumber && (
        <footer className="mt-auto shrink-0 pt-5 text-center text-[11px] text-[#8f8068]">
          {page.pageNumber}
        </footer>
      )}
    </article>
  );
}
