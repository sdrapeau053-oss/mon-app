"use client";

import { RefObject, useCallback, useEffect, useMemo, useState } from "react";

export type ManuscriptPaginationChapter = {
  contenu: string;
  id: string;
};

type PaginationResult = Record<string, string[]>;

const FALLBACK_PAGE_HEIGHT = 520;
const MIN_PAGE_TEXT_HEIGHT = 340;
const PAGE_VERTICAL_SAFETY = 10;

function splitParagraphs(content: string) {
  return content
    .trim()
    .split(/\n{2,}/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean);
}

function splitParagraphBySentences(paragraph: string) {
  return paragraph
    .match(/[^.?!;]+[.?!;]+(?:\s+|$)|[^.?!;]+$/g)
    ?.map((sentence) => sentence.trim())
    .filter(Boolean) || [paragraph];
}

function splitOversizedSentence(sentence: string, measure: (value: string) => number, availableHeight: number) {
  const words = sentence.split(/\s+/).filter(Boolean);
  const chunks: string[] = [];
  let current = "";

  words.forEach((word) => {
    const next = current ? `${current} ${word}` : word;

    if (current && measure(next) > availableHeight) {
      chunks.push(current);
      current = word;
      return;
    }

    current = next;
  });

  if (current) chunks.push(current);
  return chunks;
}

function splitOversizedParagraph(paragraph: string, measure: (value: string) => number, availableHeight: number) {
  return splitParagraphBySentences(paragraph).flatMap((sentence) =>
    measure(sentence) > availableHeight
      ? splitOversizedSentence(sentence, measure, availableHeight)
      : [sentence],
  );
}

function getAvailablePageHeight(container: HTMLElement | null) {
  if (!container) return FALLBACK_PAGE_HEIGHT;

  const renderedBody = container.querySelector<HTMLElement>(".page-content-body");
  if (renderedBody && renderedBody.clientHeight >= 260) {
    return Math.max(MIN_PAGE_TEXT_HEIGHT, renderedBody.clientHeight - PAGE_VERTICAL_SAFETY);
  }

  const renderedPage = container.querySelector<HTMLElement>(".book-page");
  if (renderedPage?.clientHeight) {
    const styles = window.getComputedStyle(renderedPage);
    const paddingY = parseFloat(styles.paddingTop) + parseFloat(styles.paddingBottom);
    const headerAndFooterReserve = 54;

    return Math.max(
      MIN_PAGE_TEXT_HEIGHT,
      renderedPage.clientHeight - paddingY - headerAndFooterReserve - PAGE_VERTICAL_SAFETY,
    );
  }

  return Math.max(MIN_PAGE_TEXT_HEIGHT, Math.round(container.clientHeight * 0.72));
}

function createMeasureElement(container: HTMLElement) {
  const renderedPage = container.querySelector<HTMLElement>(".book-page");
  const renderedText = container.querySelector<HTMLElement>(".book-text");
  const pageStyles = renderedPage ? window.getComputedStyle(renderedPage) : null;
  const textStyles = renderedText ? window.getComputedStyle(renderedText) : null;
  const pageWidth = renderedPage?.clientWidth || Math.min(460, container.clientWidth / 2);
  const paddingX = pageStyles
    ? parseFloat(pageStyles.paddingLeft) + parseFloat(pageStyles.paddingRight)
    : 84;
  const textWidth = Math.max(260, pageWidth - paddingX);
  const wrapper = document.createElement("div");
  const text = document.createElement("div");

  wrapper.style.position = "fixed";
  wrapper.style.left = "-9999px";
  wrapper.style.top = "0";
  wrapper.style.visibility = "hidden";
  wrapper.style.pointerEvents = "none";
  wrapper.style.width = `${textWidth}px`;
  wrapper.style.zIndex = "-1";

  text.className = "book-text";
  text.style.whiteSpace = "pre-wrap";
  text.style.width = `${textWidth}px`;
  text.style.maxWidth = textStyles?.maxWidth || "46ch";
  text.style.fontFamily = textStyles?.fontFamily || 'Georgia, "Times New Roman", serif';
  text.style.fontSize = textStyles?.fontSize || "13px";
  text.style.lineHeight = textStyles?.lineHeight || "1.48";
  text.style.letterSpacing = textStyles?.letterSpacing || "normal";

  wrapper.appendChild(text);
  document.body.appendChild(wrapper);

  return {
    destroy: () => wrapper.remove(),
    measure: (value: string) => {
      text.textContent = value;
      return text.scrollHeight;
    },
  };
}

function paginateContent(content: string, measure: (value: string) => number, availableHeight: number) {
  const paragraphs = splitParagraphs(content);
  if (paragraphs.length === 0) return [];

  const pages: string[] = [];
  let currentPage = "";

  paragraphs.forEach((paragraph) => {
    const blocks = measure(paragraph) > availableHeight
      ? splitOversizedParagraph(paragraph, measure, availableHeight)
      : [paragraph];

    blocks.forEach((block) => {
      const nextPage = currentPage ? `${currentPage}\n\n${block}` : block;

      if (currentPage && measure(nextPage) > availableHeight) {
        pages.push(currentPage);
        currentPage = block;
        return;
      }

      currentPage = nextPage;
    });
  });

  if (currentPage) pages.push(currentPage);
  return pages;
}

function arePaginationResultsEqual(a: PaginationResult, b: PaginationResult) {
  const aKeys = Object.keys(a);
  const bKeys = Object.keys(b);
  if (aKeys.length !== bKeys.length) return false;

  return aKeys.every((key) => {
    const left = a[key] || [];
    const right = b[key] || [];
    return left.length === right.length && left.every((page, index) => page === right[index]);
  });
}

export function useDOMPagination(
  chapters: ManuscriptPaginationChapter[],
  pageContainerRef: RefObject<HTMLElement | null>,
) {
  const paginationInput = useMemo(
    () => chapters.map((chapter) => `${chapter.id}:${chapter.contenu.length}`).join("|"),
    [chapters],
  );
  const [pagesByChapter, setPagesByChapter] = useState<PaginationResult>({});

  const recalculate = useCallback(() => {
    if (typeof window === "undefined") return;

    const container = pageContainerRef.current;
    if (!container) return;

    const availableHeight = getAvailablePageHeight(container);
    const measurer = createMeasureElement(container);
    const nextPages = chapters.reduce<PaginationResult>((result, chapter) => {
      result[chapter.id] = paginateContent(chapter.contenu, measurer.measure, availableHeight);
      return result;
    }, {});

    measurer.destroy();
    setPagesByChapter((current) => (arePaginationResultsEqual(current, nextPages) ? current : nextPages));
  }, [chapters, pageContainerRef]);

  useEffect(() => {
    const frame = window.requestAnimationFrame(recalculate);
    return () => window.cancelAnimationFrame(frame);
  }, [paginationInput, recalculate]);

  useEffect(() => {
    window.addEventListener("resize", recalculate);
    document.addEventListener("fullscreenchange", recalculate);

    return () => {
      window.removeEventListener("resize", recalculate);
      document.removeEventListener("fullscreenchange", recalculate);
    };
  }, [recalculate]);

  return pagesByChapter;
}
