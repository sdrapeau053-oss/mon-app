"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  StatusChip,
  SystemActionRow,
  SystemGrid,
  SystemPageShell,
  SystemPanel,
  SystemSectionHeader,
} from "@/components/system-ui";
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
  type ManuscriptTome,
} from "@/lib/manuscript-structure";

type JsonReadResult<T> = {
  exists: boolean;
  invalid: boolean;
  value: T | null;
};

type ChapterSource = {
  id: string;
  index: number;
  title: string;
  tomeId: number;
  tomeTitle: string;
  text: string;
};

type AlertType =
  | "Conclusion explicite"
  | "Formulation thérapeutique"
  | "Surinterprétation"
  | "Abstraction dense";

type SilenceAlert = {
  chapterId: string;
  chapterTitle: string;
  excerpt: string;
  suggestion: "Envisager de supprimer" | "Remplacer par une sensation" | "Laisser la scène parler";
  tomeId: number;
  tomeTitle: string;
  type: AlertType;
};

type ChapterSilenceScore =
  | "Silence préservé"
  | "Légère tension"
  | "Attention requise"
  | "Voix en danger";

type ChapterSilenceResult = {
  alerts: SilenceAlert[];
  chapter: ChapterSource;
  score: ChapterSilenceScore;
};

type SilenceSnapshot = {
  chapters: ChapterSilenceResult[];
  invalidKeys: string[];
};

const EXPLICIT_CONCLUSIONS = [
  "je comprenais que",
  "cela m'a appris que",
  "c'est pour ça que",
  "au fond",
  "je réalisais",
  "je savais que",
  "je sentais que",
  "cela voulait dire",
  "c'était parce que",
  "maintenant je comprends",
];

const THERAPEUTIC_FORMULATIONS = [
  "ma blessure",
  "mon trauma",
  "j'avais besoin",
  "pour me protéger",
  "inconsciemment",
  "quelque chose en moi",
  "une partie de moi",
];

const OVERINTERPRETATIONS = [
  "c'est ainsi que",
  "voilà pourquoi",
  "désormais je",
  "à partir de ce moment",
  "je n'étais plus",
  "tout avait changé",
];

const ABSTRACT_WORDS = new Set([
  "pensee",
  "sentiment",
  "emotion",
  "tristesse",
  "souffrance",
  "trauma",
  "peur",
  "honte",
  "solitude",
  "douleur",
  "memoire",
  "absence",
  "vide",
  "angoisse",
  "culpabilite",
  "verite",
  "abandon",
]);

const SENSORY_WORDS = new Set([
  "corps",
  "main",
  "mains",
  "peau",
  "souffle",
  "odeur",
  "bruit",
  "froid",
  "froide",
  "chaud",
  "chaude",
  "eau",
  "ventre",
  "sang",
  "voix",
  "silence",
  "yeux",
  "bouche",
  "gorge",
  "dos",
  "jambe",
  "jambes",
  "lumiere",
  "noir",
  "mur",
  "sol",
]);

function readJson<T>(key: string): JsonReadResult<T> {
  const raw = localStorage.getItem(key);
  if (raw === null) return { exists: false, invalid: false, value: null };

  try {
    return { exists: true, invalid: false, value: JSON.parse(raw) as T };
  } catch {
    return { exists: true, invalid: true, value: null };
  }
}

function normalizeText(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[’]/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}

function tokenize(value: string) {
  return value
    .match(/[A-Za-zÀ-ÖØ-öø-ÿ0-9]+(?:['’][A-Za-zÀ-ÖØ-öø-ÿ0-9]+)?/g)
    ?.map(normalizeText)
    .map((word) => word.replace(/^[^a-z0-9]+|[^a-z0-9]+$/g, ""))
    .filter(Boolean) ?? [];
}

function splitSentences(text: string) {
  return text
    .replace(/\s+/g, " ")
    .split(/(?<=[.!?…])\s+|\n+/)
    .map((sentence) => sentence.trim())
    .filter(Boolean);
}

function splitParagraphs(text: string) {
  return text
    .split(/\n{2,}/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean);
}

function ecritureKey(tomeId: number, chapterTitle: string) {
  return `ecriture_${tomeId}_${encodeURIComponent(chapterTitle)}`;
}

function buildChapterSources(): { chapters: ChapterSource[]; invalidKeys: string[] } {
  const tomesRead = readJson<unknown>(STRUCTURE_TOMES_STORAGE_KEY);
  const chaptersRead = readJson<unknown>(STRUCTURE_CHAPITRES_STORAGE_KEY);
  const tome1Read = readJson<unknown>(CHAPITRES_TOME_1_STORAGE_KEY);
  const tomes = tomesRead.exists && !tomesRead.invalid ? normaliserTomes(tomesRead.value) : TOMES_DEFAUT;
  const chaptersByTome =
    chaptersRead.exists && !chaptersRead.invalid ? normaliserChapitres(chaptersRead.value) : CHAPITRES_DEFAUT;
  const tomeById = new Map<number, ManuscriptTome>(tomes.map((tome) => [tome.id, tome]));
  const invalidKeys = [
    tomesRead.invalid ? STRUCTURE_TOMES_STORAGE_KEY : "",
    chaptersRead.invalid ? STRUCTURE_CHAPITRES_STORAGE_KEY : "",
    tome1Read.invalid ? CHAPITRES_TOME_1_STORAGE_KEY : "",
  ].filter(Boolean);
  const sources: ChapterSource[] = [];

  if (tome1Read.exists && !tome1Read.invalid) {
    normaliserChapitresTome1(tome1Read.value).forEach((chapter) => {
      sources.push({
        id: `tome-1-${chapter.id}`,
        index: getNumeroChapitreTome1(chapter.id),
        title: chapter.titre,
        tomeId: 1,
        tomeTitle: tomeById.get(1)?.titre || "Tome 1",
        text: chapter.contenu,
      });
    });
  }

  tomes
    .filter((tome) => tome.id !== 1 || !tome1Read.exists || tome1Read.invalid)
    .forEach((tome) => {
      (chaptersByTome[tome.id] || []).forEach((chapterTitle, index) => {
        sources.push({
          id: `tome-${tome.id}-chapitre-${index + 1}`,
          index: index + 1,
          title: chapterTitle,
          tomeId: tome.id,
          tomeTitle: tome.titre,
          text: localStorage.getItem(ecritureKey(tome.id, chapterTitle)) || "",
        });
      });
    });

  return {
    chapters: sources.filter((chapter) => chapter.text.trim()).sort((a, b) => a.tomeId - b.tomeId || a.index - b.index),
    invalidKeys,
  };
}

function scoreForAlertCount(count: number): ChapterSilenceScore {
  if (count === 0) return "Silence préservé";
  if (count <= 2) return "Légère tension";
  if (count <= 4) return "Attention requise";
  return "Voix en danger";
}

function suggestionForType(type: AlertType): SilenceAlert["suggestion"] {
  if (type === "Formulation thérapeutique" || type === "Abstraction dense") return "Remplacer par une sensation";
  if (type === "Surinterprétation") return "Laisser la scène parler";
  return "Envisager de supprimer";
}

function addPatternAlerts(
  chapter: ChapterSource,
  sentences: string[],
  patterns: string[],
  type: AlertType,
) {
  const normalizedPatterns = patterns.map(normalizeText);

  return sentences.flatMap((sentence): SilenceAlert[] => {
    const normalizedSentence = normalizeText(sentence);
    const found = normalizedPatterns.some((pattern) => normalizedSentence.includes(pattern));
    if (!found) return [];

    return [
      {
        chapterId: chapter.id,
        chapterTitle: chapter.title,
        excerpt: sentence,
        suggestion: suggestionForType(type),
        tomeId: chapter.tomeId,
        tomeTitle: chapter.tomeTitle,
        type,
      },
    ];
  });
}

function hasDenseAbstraction(paragraph: string) {
  const words = tokenize(paragraph);
  let abstractRun = 0;
  let sensoryCount = 0;

  for (const word of words) {
    if (SENSORY_WORDS.has(word)) sensoryCount += 1;

    if (ABSTRACT_WORDS.has(word)) {
      abstractRun += 1;
      if (abstractRun > 4 && sensoryCount === 0) return true;
      continue;
    }

    if (!["de", "du", "des", "la", "le", "les", "un", "une", "et", "a", "en"].includes(word)) {
      abstractRun = 0;
    }
  }

  return false;
}

function addAbstractionAlerts(chapter: ChapterSource, paragraphs: string[]) {
  return paragraphs.flatMap((paragraph): SilenceAlert[] => {
    if (!hasDenseAbstraction(paragraph)) return [];

    return [
      {
        chapterId: chapter.id,
        chapterTitle: chapter.title,
        excerpt: paragraph.length > 260 ? `${paragraph.slice(0, 257)}...` : paragraph,
        suggestion: "Remplacer par une sensation",
        tomeId: chapter.tomeId,
        tomeTitle: chapter.tomeTitle,
        type: "Abstraction dense",
      },
    ];
  });
}

function analyzeChapter(chapter: ChapterSource): ChapterSilenceResult {
  const sentences = splitSentences(chapter.text);
  const paragraphs = splitParagraphs(chapter.text);
  const alerts = [
    ...addPatternAlerts(chapter, sentences, EXPLICIT_CONCLUSIONS, "Conclusion explicite"),
    ...addPatternAlerts(chapter, sentences, THERAPEUTIC_FORMULATIONS, "Formulation thérapeutique"),
    ...addPatternAlerts(chapter, sentences, OVERINTERPRETATIONS, "Surinterprétation"),
    ...addAbstractionAlerts(chapter, paragraphs),
  ];

  return {
    alerts,
    chapter,
    score: scoreForAlertCount(alerts.length),
  };
}

function buildSnapshot(): SilenceSnapshot {
  const { chapters, invalidKeys } = buildChapterSources();

  return {
    chapters: chapters.map(analyzeChapter),
    invalidKeys,
  };
}

function scoreTone(score: ChapterSilenceScore) {
  if (score === "Silence préservé") return "border-emerald-300/35 bg-emerald-400/10 text-emerald-100";
  if (score === "Légère tension") return "border-[#d6b25e]/28 bg-[#d6b25e]/10 text-[#f4dfad]";
  if (score === "Attention requise") return "border-amber-300/35 bg-amber-400/10 text-amber-100";
  return "border-red-300/35 bg-red-400/10 text-red-100";
}

function typeTone(type: AlertType) {
  if (type === "Conclusion explicite") return "border-amber-300/35 bg-amber-400/10 text-amber-100";
  if (type === "Formulation thérapeutique") return "border-sky-300/35 bg-sky-400/10 text-sky-100";
  if (type === "Surinterprétation") return "border-red-300/35 bg-red-400/10 text-red-100";
  return "border-purple-300/35 bg-purple-400/10 text-purple-100";
}

function MetricCard({ label, value, detail }: { label: string; value: string | number; detail?: string }) {
  return (
    <article className="internal-card min-h-[104px]">
      <p className="editorial-label">{label}</p>
      <p className="mt-3 text-3xl font-semibold text-[#f1e7d5]">{value}</p>
      {detail ? <p className="mt-2 text-xs leading-5 text-[#a99b84]">{detail}</p> : null}
    </article>
  );
}

export default function SilenceNarratif() {
  const [snapshot, setSnapshot] = useState<SilenceSnapshot | null>(null);

  useEffect(() => {
    const refresh = () => setSnapshot(buildSnapshot());

    refresh();
    window.addEventListener("storage", refresh);

    return () => window.removeEventListener("storage", refresh);
  }, []);

  const summary = useMemo(() => {
    const chapters = snapshot?.chapters ?? [];
    const preserved = chapters.filter((chapter) => chapter.score === "Silence préservé").length;
    const needsRevision = chapters.length - preserved;
    const alerts = chapters.flatMap((chapter) => chapter.alerts);

    return {
      alerts,
      needsRevision,
      preserved,
    };
  }, [snapshot]);

  if (!snapshot) {
    return (
      <main className="internal-page">
        <SystemPageShell maxWidth={1100} padding="22px 16px 44px">
          <SystemPanel compact>
            <p className="editorial-body">Lecture du silence narratif...</p>
          </SystemPanel>
        </SystemPageShell>
      </main>
    );
  }

  return (
    <main className="internal-page">
      <SystemPageShell maxWidth={1180} padding="22px 16px 44px">
        <header className="internal-header" style={{ display: "flex", flexWrap: "wrap", gap: 14, justifyContent: "space-between" }}>
          <div style={{ minWidth: 0 }}>
            <p className="internal-kicker">Silence narratif</p>
            <h1 className="internal-title">Protéger la scène</h1>
            <p className="internal-subtitle">
              Détection locale des endroits où le texte explique ce que la scène pourrait laisser agir seule.
            </p>
          </div>
          <SystemActionRow>
            <Link className="soft-button" href="/" style={{ textDecoration: "none" }}>
              Accueil
            </Link>
            <Link className="soft-button" href="/style-dna" style={{ textDecoration: "none" }}>
              Style DNA
            </Link>
          </SystemActionRow>
        </header>

        {snapshot.invalidKeys.length > 0 ? (
          <SystemPanel compact style={{ borderColor: "rgba(181, 107, 95, 0.35)", color: "#d79a8f" }}>
            Données JSON invalides détectées : {snapshot.invalidKeys.join(", ")}. Les clés concernées sont ignorées.
          </SystemPanel>
        ) : null}

        <SystemGrid min={190} gap={12}>
          <MetricCard label="Chapitres analysés" value={snapshot.chapters.length} />
          <MetricCard label="Voix préservée" value={summary.preserved} />
          <MetricCard label="Révision requise" value={summary.needsRevision} />
          <MetricCard label="Alertes détectées" value={summary.alerts.length} detail="Toutes catégories confondues." />
        </SystemGrid>

        {snapshot.chapters.length === 0 ? (
          <SystemPanel style={{ marginTop: 16 }}>
            <SystemSectionHeader eyebrow="État" title="Aucun chapitre écrit détecté" />
            <p className="editorial-body mt-3">
              Les chapitres vides sont ignorés. Le module s’activera dès qu’un texte sera présent dans les structures locales.
            </p>
          </SystemPanel>
        ) : (
          <section className="grid gap-4" style={{ marginTop: 16 }}>
            {snapshot.chapters.map((chapterResult) => (
              <SystemPanel ariaLabel={`Silence narratif — ${chapterResult.chapter.title}`} key={chapterResult.chapter.id}>
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <p className="editorial-label">
                      Tome {chapterResult.chapter.tomeId} · Chapitre {chapterResult.chapter.index}
                    </p>
                    <h2 className="mt-2 text-xl font-semibold text-[#f1e7d5]">{chapterResult.chapter.title}</h2>
                  </div>
                  <span className={`w-fit rounded-full border px-3 py-1 text-[11px] font-bold ${scoreTone(chapterResult.score)}`}>
                    {chapterResult.score}
                  </span>
                </div>

                {chapterResult.alerts.length === 0 ? (
                  <p className="mt-4 rounded-xl border border-emerald-300/30 bg-emerald-400/10 px-3 py-2 text-sm text-emerald-100">
                    Aucune sur-explication détectée avec les règles actuelles.
                  </p>
                ) : (
                  <div className="mt-4 grid gap-3">
                    {chapterResult.alerts.map((alert, index) => (
                      <div className="rounded-xl border border-[#d6b25e]/14 bg-[#0f0d0a]/55 p-3" key={`${alert.chapterId}-${alert.type}-${index}`}>
                        <div className="flex flex-wrap items-center gap-2">
                          <span className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold ${typeTone(alert.type)}`}>
                            {alert.type}
                          </span>
                          <StatusChip>{alert.suggestion}</StatusChip>
                        </div>
                        <p className="mt-3 text-sm leading-6 text-[#efe5d4]">“{alert.excerpt}”</p>
                      </div>
                    ))}
                  </div>
                )}
              </SystemPanel>
            ))}
          </section>
        )}
      </SystemPageShell>
    </main>
  );
}
