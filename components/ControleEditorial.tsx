"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { BackLink } from "@/components/ui/back-link";
import { SystemActionRow, SystemPageShell, SystemPanel } from "@/components/system-ui";
import {
  CHAPITRES_TOME_1_STORAGE_KEY,
  getDateModificationChapitreTome1,
  getNumeroChapitreTome1,
  getStatutEditorialChapitreTome1,
  normaliserChapitresTome1,
  type ChapitreTome1,
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

type BackupStatus = "OK" | "Attention" | "Critique";
type SilenceScore = "Silence préservé" | "Légère tension" | "Attention requise" | "Voix en danger";

type ChapterSource = {
  id: string;
  index: number;
  title: string;
  tomeId: number;
  tomeTitle: string;
  text: string;
};

type StyleMetric = {
  abstractDensity: number;
  averageSentenceLength: number;
  bodyDensity: number;
  chapter: ChapitreTome1;
  concreteAbstractRatio: number;
  shortSentencePercent: number;
  strongDeviationCount: number;
  wordCount: number;
};

type MotifSignal = {
  appearances: number;
  lastAppearance: string | null;
  longestGap: number;
  motif: string;
};

type SilenceSignal = {
  alertCount: number;
  chapter: ChapterSource;
  excerpts: string[];
  score: SilenceScore;
};

type Priority = {
  chapter: string;
  priority: "haute" | "moyenne" | "basse";
  reason: string;
  title: string;
};

type ControlSnapshot = {
  backupStatus: BackupStatus;
  backupText: string;
  chapterDrafts: number;
  chapterEmpty: number;
  chapterNeedsReview: number;
  chapterValidated: number;
  chapters: ChapterSource[];
  invalidKeys: string[];
  lastExportAt: string | null;
  lastModifiedAt: string | null;
  motifs: MotifSignal[];
  priorities: Priority[];
  silenceSignals: SilenceSignal[];
  styleMetrics: StyleMetric[];
  tome1ProgressPercent: number;
  totalChapters: number;
  totalTomes: number;
};

const LAST_EXPORT_KEY = "backup:lastManualExportAt";
const ONE_DAY_MS = 24 * 60 * 60 * 1000;
const CENTRAL_MOTIFS = [
  "eau",
  "froid",
  "silence",
  "corps",
  "animaux",
  "maison",
  "père",
  "mère",
  "lumière",
  "peur",
  "honte",
  "voix",
  "fuite",
  "chambre",
  "nuit",
];
const MOTIF_VARIANTS: Record<string, string[]> = {
  animaux: ["animal", "animaux", "bête", "bêtes"],
  chambre: ["chambre", "chambres"],
  corps: ["corps", "corporel", "corporelle", "corporels", "corporelles"],
  eau: ["eau", "eaux"],
  froid: ["froid", "froide", "froids", "froides"],
  fuite: ["fuite", "fuites", "fuir", "fuyant"],
  honte: ["honte", "hontes"],
  lumière: ["lumière", "lumières", "lumineux", "lumineuse"],
  maison: ["maison", "maisons"],
  mère: ["mère", "mères", "maman"],
  nuit: ["nuit", "nuits", "nocturne"],
  peur: ["peur", "peurs", "apeuré", "apeurée"],
  père: ["père", "pères", "papa"],
  silence: ["silence", "silences", "silencieux", "silencieuse"],
  voix: ["voix"],
};
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
  "angoisse",
]);
const BODY_WORDS = new Set([
  "corps",
  "main",
  "mains",
  "peau",
  "souffle",
  "odeur",
  "bruit",
  "froid",
  "chaud",
  "eau",
  "ventre",
  "sang",
  "voix",
  "silence",
  "yeux",
  "gorge",
]);
const SILENCE_PATTERNS = [
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
  "ma blessure",
  "mon trauma",
  "j'avais besoin",
  "pour me protéger",
  "inconsciemment",
  "quelque chose en moi",
  "une partie de moi",
  "c'est ainsi que",
  "voilà pourquoi",
  "désormais je",
  "à partir de ce moment",
  "je n'étais plus",
  "tout avait changé",
];

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

function normalizeWord(value: string) {
  return normalizeText(value).replace(/^[^a-z0-9]+|[^a-z0-9]+$/g, "");
}

function tokenize(text: string) {
  return text
    .match(/[A-Za-zÀ-ÖØ-öø-ÿ0-9]+(?:['’][A-Za-zÀ-ÖØ-öø-ÿ0-9]+)?/g)
    ?.map(normalizeWord)
    .filter(Boolean) ?? [];
}

function splitSentences(text: string) {
  return text
    .replace(/\s+/g, " ")
    .split(/(?<=[.!?…])\s+|\n+/)
    .map((sentence) => sentence.trim())
    .filter(Boolean);
}

function ecritureKey(tomeId: number, chapterTitle: string) {
  return `ecriture_${tomeId}_${encodeURIComponent(chapterTitle)}`;
}

function formatDateTime(value: string | null) {
  if (!value) return "non disponible";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "non disponible";
  return new Intl.DateTimeFormat("fr-CA", { dateStyle: "medium", timeStyle: "short" }).format(date);
}

function percent(count: number, total: number) {
  return total > 0 ? Math.round((count / total) * 100) : 0;
}

function average(values: number[]) {
  if (!values.length) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function perThousand(count: number, total: number) {
  return total > 0 ? (count / total) * 1000 : 0;
}

function relativeDifference(value: number, baseline: number) {
  if (baseline === 0) return value === 0 ? 0 : 100;
  return Math.abs((value - baseline) / baseline) * 100;
}

function getBackupStatus(lastExportAt: string | null): Pick<ControlSnapshot, "backupStatus" | "backupText"> {
  if (!lastExportAt) return { backupStatus: "Critique", backupText: "Aucun export manuel détecté." };
  const date = new Date(lastExportAt);
  if (Number.isNaN(date.getTime())) return { backupStatus: "Critique", backupText: "Date d’export illisible." };
  if (Date.now() - date.getTime() > ONE_DAY_MS) return { backupStatus: "Attention", backupText: "Dernier export manuel de plus de 24h." };
  return { backupStatus: "OK", backupText: "Sauvegarde récente détectée." };
}

function buildChapterSources(
  tomes: ManuscriptTome[],
  chaptersByTome: Record<number, string[]>,
  tome1Chapters: ChapitreTome1[],
  hasTome1Storage: boolean,
) {
  const tomeById = new Map<number, ManuscriptTome>(tomes.map((tome) => [tome.id, tome]));
  const sources: ChapterSource[] = [];

  if (hasTome1Storage) {
    tome1Chapters.forEach((chapter) => {
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
    .filter((tome) => tome.id !== 1 || !hasTome1Storage)
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

  return sources.filter((chapter) => chapter.text.trim()).sort((a, b) => a.tomeId - b.tomeId || a.index - b.index);
}

function analyzeStyle(chapters: ChapitreTome1[]): StyleMetric[] {
  const metrics = chapters
    .filter((chapter) => chapter.contenu.trim())
    .map((chapter) => {
      const words = tokenize(chapter.contenu);
      const sentences = splitSentences(chapter.contenu);
      const sentenceLengths = sentences.map((sentence) => tokenize(sentence).length).filter(Boolean);
      const sentenceCount = Math.max(sentenceLengths.length, 1);
      const abstractCount = words.filter((word) => ABSTRACT_WORDS.has(word)).length;
      const bodyCount = words.filter((word) => BODY_WORDS.has(word)).length;
      return {
        abstractDensity: perThousand(abstractCount, words.length),
        averageSentenceLength: words.length / sentenceCount,
        bodyDensity: perThousand(bodyCount, words.length),
        chapter,
        concreteAbstractRatio: abstractCount > 0 ? bodyCount / abstractCount : bodyCount > 0 ? bodyCount : 0,
        shortSentencePercent: percent(sentenceLengths.filter((length) => length < 10).length, sentenceCount),
        strongDeviationCount: 0,
        wordCount: words.length,
      };
    });
  const averages = {
    abstractDensity: average(metrics.map((metric) => metric.abstractDensity)),
    averageSentenceLength: average(metrics.map((metric) => metric.averageSentenceLength)),
    bodyDensity: average(metrics.map((metric) => metric.bodyDensity)),
    concreteAbstractRatio: average(metrics.map((metric) => metric.concreteAbstractRatio)),
    shortSentencePercent: average(metrics.map((metric) => metric.shortSentencePercent)),
  };

  return metrics.map((metric) => {
    const values = [
      relativeDifference(metric.abstractDensity, averages.abstractDensity),
      relativeDifference(metric.averageSentenceLength, averages.averageSentenceLength),
      relativeDifference(metric.bodyDensity, averages.bodyDensity),
      relativeDifference(metric.concreteAbstractRatio, averages.concreteAbstractRatio),
      relativeDifference(metric.shortSentencePercent, averages.shortSentencePercent),
    ];

    return { ...metric, strongDeviationCount: values.filter((value) => value > 30).length };
  });
}

function motifVariants(motif: string) {
  return (MOTIF_VARIANTS[motif] || [motif]).map(normalizeWord);
}

function analyzeMotifs(chapters: ChapterSource[]): MotifSignal[] {
  const tokenized = chapters.map((chapter) => ({ chapter, words: tokenize(chapter.text) }));

  return CENTRAL_MOTIFS.map((motif) => {
    const variants = new Set(motifVariants(motif));
    const counts = tokenized.map(({ words }) => words.filter((word) => variants.has(word)).length);
    const appearances = counts.reduce((sum, count) => sum + count, 0);
    let currentGap = 0;
    let longestGap = 0;
    counts.forEach((count) => {
      currentGap = count > 0 ? 0 : currentGap + 1;
      longestGap = Math.max(longestGap, currentGap);
    });
    const last = tokenized
      .map(({ chapter }, index) => ({ chapter, count: counts[index] || 0 }))
      .filter((item) => item.count > 0)
      .at(-1)?.chapter;

    return {
      appearances,
      lastAppearance: last ? `${last.tomeTitle} · ${last.title}` : null,
      longestGap,
      motif,
    };
  });
}

function hasDenseAbstraction(text: string) {
  const words = tokenize(text);
  let run = 0;
  let sensory = 0;
  for (const word of words) {
    if (BODY_WORDS.has(word)) sensory += 1;
    if (ABSTRACT_WORDS.has(word)) {
      run += 1;
      if (run > 4 && sensory === 0) return true;
    } else if (!["de", "du", "des", "la", "le", "les", "un", "une", "et", "a", "en"].includes(word)) {
      run = 0;
    }
  }
  return false;
}

function silenceScore(count: number): SilenceScore {
  if (count === 0) return "Silence préservé";
  if (count <= 2) return "Légère tension";
  if (count <= 4) return "Attention requise";
  return "Voix en danger";
}

function analyzeSilence(chapters: ChapterSource[]): SilenceSignal[] {
  const normalizedPatterns = SILENCE_PATTERNS.map(normalizeText);
  return chapters.map((chapter) => {
    const sentences = splitSentences(chapter.text);
    const patternHits = sentences.filter((sentence) =>
      normalizedPatterns.some((pattern) => normalizeText(sentence).includes(pattern)),
    );
    const denseParagraphs = chapter.text
      .split(/\n{2,}/)
      .map((paragraph) => paragraph.trim())
      .filter((paragraph) => paragraph && hasDenseAbstraction(paragraph));
    const excerpts = [...patternHits, ...denseParagraphs].slice(0, 3);
    const alertCount = patternHits.length + denseParagraphs.length;

    return {
      alertCount,
      chapter,
      excerpts,
      score: silenceScore(alertCount),
    };
  });
}

function findLatestDate(chapters: ChapitreTome1[]) {
  const timestamps = chapters
    .map(getDateModificationChapitreTome1)
    .map((date) => new Date(date).getTime())
    .filter(Number.isFinite);
  if (!timestamps.length) return null;
  return new Date(Math.max(...timestamps)).toISOString();
}

function buildSnapshot(): ControlSnapshot {
  const tomesRead = readJson<unknown>(STRUCTURE_TOMES_STORAGE_KEY);
  const chaptersRead = readJson<unknown>(STRUCTURE_CHAPITRES_STORAGE_KEY);
  const tome1Read = readJson<unknown>(CHAPITRES_TOME_1_STORAGE_KEY);
  const tomes = tomesRead.exists && !tomesRead.invalid ? normaliserTomes(tomesRead.value) : TOMES_DEFAUT;
  const chaptersByTome =
    chaptersRead.exists && !chaptersRead.invalid ? normaliserChapitres(chaptersRead.value) : CHAPITRES_DEFAUT;
  const tome1Chapters =
    tome1Read.exists && !tome1Read.invalid ? normaliserChapitresTome1(tome1Read.value) : [];
  const totalChapters = Object.values(chaptersByTome).reduce((sum, chapters) => sum + chapters.length, 0) || tome1Chapters.length;
  const statuses = tome1Chapters.map(getStatutEditorialChapitreTome1);
  const chapterEmpty = statuses.filter((status) => status === "vide").length;
  const chapterDrafts = statuses.filter((status) => status === "brouillon").length;
  const chapterNeedsReview = statuses.filter((status) => status === "à réviser").length;
  const chapterValidated = statuses.filter((status) => status === "validé").length;
  const started = Math.max(tome1Chapters.length - chapterEmpty, 0);
  const chapters = buildChapterSources(tomes, chaptersByTome, tome1Chapters, tome1Read.exists && !tome1Read.invalid);
  const styleMetrics = analyzeStyle(tome1Chapters);
  const motifs = analyzeMotifs(chapters);
  const silenceSignals = analyzeSilence(chapters);
  const lastExportAt = localStorage.getItem(LAST_EXPORT_KEY);
  const backup = getBackupStatus(lastExportAt);
  const invalidKeys = [
    tomesRead.invalid ? STRUCTURE_TOMES_STORAGE_KEY : "",
    chaptersRead.invalid ? STRUCTURE_CHAPITRES_STORAGE_KEY : "",
    tome1Read.invalid ? CHAPITRES_TOME_1_STORAGE_KEY : "",
  ].filter(Boolean);
  const priorities = buildPriorities({
    backupStatus: backup.backupStatus,
    chapterEmpty,
    motifs,
    silenceSignals,
    styleMetrics,
    tome1Count: tome1Chapters.length,
  });

  return {
    ...backup,
    chapterDrafts,
    chapterEmpty,
    chapterNeedsReview,
    chapterValidated,
    chapters,
    invalidKeys,
    lastExportAt,
    lastModifiedAt: findLatestDate(tome1Chapters),
    motifs,
    priorities,
    silenceSignals,
    styleMetrics,
    tome1ProgressPercent: percent(started + chapterValidated, Math.max(tome1Chapters.length * 2, 1)),
    totalChapters,
    totalTomes: tomes.length,
  };
}

function chapterLabel(chapter: ChapitreTome1 | ChapterSource) {
  if ("tomeId" in chapter) return `Tome ${chapter.tomeId} · ${chapter.title}`;
  return `Chapitre ${getNumeroChapitreTome1(chapter.id)} · ${chapter.titre}`;
}

function buildPriorities(params: {
  backupStatus: BackupStatus;
  chapterEmpty: number;
  motifs: MotifSignal[];
  silenceSignals: SilenceSignal[];
  styleMetrics: StyleMetric[];
  tome1Count: number;
}): Priority[] {
  const priorities: Priority[] = [];
  if (params.backupStatus !== "OK") {
    priorities.push({
      chapter: "Sauvegarde",
      priority: "haute",
      reason: "La base locale doit être protégée avant une grosse passe éditoriale.",
      title: "Exporter une sauvegarde manuelle",
    });
  }
  params.silenceSignals
    .filter((signal) => signal.score === "Voix en danger")
    .slice(0, 3)
    .forEach((signal) =>
      priorities.push({
        chapter: chapterLabel(signal.chapter),
        priority: "haute",
        reason: `${signal.alertCount} alertes de silence narratif.`,
        title: "Réduire la sur-explication",
      }),
    );
  params.styleMetrics
    .filter((metric) => metric.strongDeviationCount >= 2)
    .slice(0, 3)
    .forEach((metric) =>
      priorities.push({
        chapter: chapterLabel(metric.chapter),
        priority: "moyenne",
        reason: `${metric.strongDeviationCount} écarts forts à la voix moyenne.`,
        title: "Vérifier la cohérence de voix",
      }),
    );
  params.motifs
    .filter((motif) => motif.appearances === 0 || motif.longestGap > 8)
    .slice(0, 3)
    .forEach((motif) =>
      priorities.push({
        chapter: motif.lastAppearance || "Motifs trans-tomes",
        priority: motif.appearances === 0 ? "moyenne" : "basse",
        reason: motif.appearances === 0 ? "Motif central absent." : `Motif absent pendant ${motif.longestGap} chapitres.`,
        title: `Revoir le motif “${motif.motif}”`,
      }),
    );
  if (params.tome1Count > 0 && params.chapterEmpty / params.tome1Count > 0.4) {
    priorities.push({
      chapter: "Tome 1",
      priority: "moyenne",
      reason: "Plus de 40 % des chapitres du Tome 1 sont vides.",
      title: "Prioriser les chapitres non démarrés",
    });
  }
  return priorities.slice(0, 8);
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

function statusTone(status: BackupStatus | SilenceScore | Priority["priority"]) {
  if (status === "OK" || status === "Silence préservé" || status === "basse") return "border-emerald-300/35 bg-emerald-400/10 text-emerald-100";
  if (status === "Attention" || status === "Légère tension" || status === "Attention requise" || status === "moyenne") return "border-amber-300/35 bg-amber-400/10 text-amber-100";
  return "border-red-300/35 bg-red-400/10 text-red-100";
}

const SECTIONS = [
  { id: "etat", label: "État global" },
  { id: "alertes", label: "Alertes prioritaires" },
  { id: "style", label: "Voix & style" },
  { id: "motifs", label: "Motifs narratifs" },
  { id: "silence", label: "Silence narratif" },
  { id: "priorites", label: "Priorités d’action" },
] as const;

type SectionId = (typeof SECTIONS)[number]["id"];
type ViewMode = "resume" | "complet";

function CompactMetric({ label, value, detail }: { label: string; value: string | number; detail?: string }) {
  return (
    <article className="rounded-xl border border-[#d6b25e]/14 bg-[#0f0d0a]/55 px-3 py-2">
      <p className="text-[9px] font-bold uppercase tracking-[0.15em] text-[#a99b84]">{label}</p>
      <p className="mt-1 truncate text-lg font-semibold text-[#f1e7d5]">{value}</p>
      {detail ? <p className="mt-1 line-clamp-2 text-[11px] leading-4 text-[#a99b84]">{detail}</p> : null}
    </article>
  );
}

function CollapsibleSection({
  children,
  id,
  isOpen,
  onToggle,
  summary,
  title,
}: {
  children: React.ReactNode;
  id: SectionId;
  isOpen: boolean;
  onToggle: () => void;
  summary?: string;
  title: string;
}) {
  return (
    <section className="min-w-0 max-w-full scroll-mt-28 rounded-2xl border border-[#d6b25e]/15 bg-[#141311]" id={id}>
      <button
        aria-expanded={isOpen}
        className="flex w-full min-w-0 items-center justify-between gap-4 px-4 py-3 text-left"
        onClick={onToggle}
        type="button"
      >
        <span className="min-w-0">
          <span className="editorial-label">{title}</span>
          {summary ? <span className="mt-1 block text-xs leading-5 text-[#a99b84]">{summary}</span> : null}
        </span>
        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-[#d6b25e]/18 text-sm text-[#d6b25e]">
          {isOpen ? "−" : "+"}
        </span>
      </button>
      <div className={`min-w-0 max-w-full overflow-hidden transition-all duration-300 ease-out ${isOpen ? "max-h-[2400px] opacity-100" : "max-h-0 opacity-0"}`}>
        <div className="min-w-0 max-w-full border-t border-[#d6b25e]/10 p-4">{children}</div>
      </div>
    </section>
  );
}

export default function ControleEditorial() {
  const [snapshot, setSnapshot] = useState<ControlSnapshot | null>(null);
  const [mode, setMode] = useState<ViewMode>("resume");
  const [openSections, setOpenSections] = useState<Record<SectionId, boolean>>({
    alertes: true,
    etat: true,
    motifs: false,
    priorites: true,
    silence: false,
    style: false,
  });

  useEffect(() => {
    const refresh = () => setSnapshot(buildSnapshot());
    refresh();
    window.addEventListener("storage", refresh);
    return () => window.removeEventListener("storage", refresh);
  }, []);

  useEffect(() => {
    setOpenSections(
      mode === "resume"
        ? {
            alertes: true,
            etat: true,
            motifs: false,
            priorites: true,
            silence: false,
            style: false,
          }
        : {
            alertes: true,
            etat: true,
            motifs: true,
            priorites: true,
            silence: true,
            style: true,
          },
    );
  }, [mode]);

  const voice = useMemo(() => {
    const metrics = snapshot?.styleMetrics ?? [];
    const strong = metrics.filter((metric) => metric.strongDeviationCount >= 2);
    return {
      coherence: strong.length === 0 ? "voix cohérente" : `attention sur ${strong.length} chapitre${strong.length > 1 ? "s" : ""}`,
      mostExplanatory: [...metrics].sort((a, b) => b.abstractDensity - a.abstractDensity)[0],
      mostFragmented: [...metrics].sort((a, b) => b.shortSentencePercent - a.shortSentencePercent)[0],
      mostSensory: [...metrics].sort((a, b) => b.bodyDensity - a.bodyDensity)[0],
      strong,
    };
  }, [snapshot]);

  const motifs = useMemo(() => {
    const all = snapshot?.motifs ?? [];
    return {
      absent: all.filter((motif) => motif.appearances === 0),
      active: all.filter((motif) => motif.appearances > 0),
      alert: all.filter((motif) => motif.appearances === 0 || motif.longestGap > 8),
      dominant: [...all].sort((a, b) => b.appearances - a.appearances).slice(0, 5),
    };
  }, [snapshot]);

  const silence = useMemo(() => {
    const signals = snapshot?.silenceSignals ?? [];
    return {
      attention: signals.filter((signal) => signal.score === "Attention requise").length,
      danger: signals.filter((signal) => signal.score === "Voix en danger").length,
      excerpts: signals.flatMap((signal) =>
        signal.excerpts.map((excerpt) => ({
          chapter: chapterLabel(signal.chapter),
          excerpt,
        })),
      ).slice(0, 4),
      totalAlerts: signals.reduce((sum, signal) => sum + signal.alertCount, 0),
    };
  }, [snapshot]);

  const visiblePriorities = useMemo(() => {
    const priorities = snapshot?.priorities ?? [];
    if (mode === "resume") return priorities.filter((item) => item.priority === "haute").slice(0, 4);
    return priorities;
  }, [mode, snapshot]);

  const criticalAlerts = useMemo(() => {
    if (!snapshot) return [];
    const alerts: string[] = [];
    if (snapshot.backupStatus !== "OK") alerts.push(snapshot.backupText);
    if (voice.strong.length > 0) alerts.push(`${voice.strong.length} chapitre${voice.strong.length > 1 ? "s" : ""} en écart fort à la voix moyenne.`);
    if (silence.danger > 0) alerts.push(`${silence.danger} chapitre${silence.danger > 1 ? "s" : ""} avec silence narratif en danger.`);
    if (motifs.alert.length > 0) alerts.push(`${motifs.alert.length} motif${motifs.alert.length > 1 ? "s" : ""} narratif${motifs.alert.length > 1 ? "s" : ""} en alerte.`);
    if (snapshot.chapterEmpty > 0 && snapshot.chapterEmpty / Math.max(snapshot.totalChapters, 1) > 0.35) alerts.push("Beaucoup de chapitres sont encore vides.");
    return mode === "resume" ? alerts.slice(0, 4) : alerts;
  }, [mode, motifs.alert.length, silence.danger, snapshot, voice.strong.length]);

  function toggleSection(id: SectionId) {
    setOpenSections((current) => ({ ...current, [id]: !current[id] }));
  }

  if (!snapshot) {
    return (
      <main className="internal-page">
        <SystemPageShell maxWidth={1140} padding="22px 16px 44px">
          <SystemPanel compact>
            <p className="editorial-body">Lecture du contrôle éditorial...</p>
          </SystemPanel>
        </SystemPageShell>
      </main>
    );
  }

  return (
    <main className="internal-page">
      <SystemPageShell maxWidth={1140} padding="22px 16px 44px">
        <header className="internal-header" style={{ display: "flex", flexWrap: "wrap", gap: 14, justifyContent: "space-between" }}>
          <div style={{ minWidth: 0 }}>
            <p className="internal-kicker">Centre de contrôle</p>
            <h1 className="internal-title">Contrôle éditorial</h1>
            <p className="internal-subtitle">
              Vue exécutive des signaux critiques déjà calculables depuis les données locales du manuscrit.
            </p>
          </div>
          <SystemActionRow>
            <div className="flex rounded-full border border-[#d6b25e]/20 bg-[#0f0d0a]/65 p-1">
              {(["resume", "complet"] as const).map((item) => (
                <button
                  className={`rounded-full px-3 py-1.5 text-[12px] font-semibold transition ${
                    mode === item ? "bg-[#d6b25e] text-[#15110d]" : "text-[#d8cbb5] hover:text-[#f1e7d5]"
                  }`}
                  key={item}
                  onClick={() => setMode(item)}
                  type="button"
                >
                  {item === "resume" ? "Résumé" : "Complet"}
                </button>
              ))}
            </div>
            <BackLink label="Système" />
            <Link className="soft-button" href="/backup" style={{ textDecoration: "none" }}>
              Sauvegarde
            </Link>
          </SystemActionRow>
        </header>

        {snapshot.invalidKeys.length > 0 ? (
          <SystemPanel compact style={{ borderColor: "rgba(181, 107, 95, 0.35)", color: "#d79a8f" }}>
            Données JSON invalides détectées : {snapshot.invalidKeys.join(", ")}.
          </SystemPanel>
        ) : null}

        <div className="grid min-w-0 max-w-full gap-4 overflow-hidden lg:grid-cols-[190px_minmax(0,1fr)]">
          <nav className="sticky top-3 z-20 -mx-1 flex max-w-full min-w-0 gap-2 overflow-x-auto rounded-2xl border border-[#d6b25e]/14 bg-[#11100e]/95 p-2 backdrop-blur lg:mx-0 lg:block lg:h-fit lg:overflow-visible">
            {SECTIONS.map((section) => (
              <a
                className="block shrink-0 rounded-xl px-3 py-2 text-xs font-semibold text-[#a99b84] hover:bg-[#d6b25e]/8 hover:text-[#f1e7d5] lg:mb-1"
                href={`#${section.id}`}
                key={section.id}
              >
                {section.label}
              </a>
            ))}
          </nav>

          <div className="grid min-w-0 max-w-full gap-4">
            <CollapsibleSection
              id="etat"
              isOpen={openSections.etat}
              onToggle={() => toggleSection("etat")}
              summary={`${snapshot.totalTomes} tomes · ${snapshot.totalChapters} chapitres · sauvegarde ${snapshot.backupStatus}`}
              title="État global"
            >
              <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
                <CompactMetric label="Tomes" value={snapshot.totalTomes} />
                <CompactMetric label="Chapitres" value={snapshot.totalChapters} />
                <CompactMetric label="Progression Tome 1" value={`${snapshot.tome1ProgressPercent}%`} />
                <CompactMetric label="Sauvegarde" value={snapshot.backupStatus} detail={snapshot.backupText} />
                <CompactMetric label="Vides" value={snapshot.chapterEmpty} />
                {mode === "complet" ? (
                  <>
                    <CompactMetric label="Brouillons" value={snapshot.chapterDrafts} />
                    <CompactMetric label="À réviser" value={snapshot.chapterNeedsReview} />
                    <CompactMetric label="Validés" value={snapshot.chapterValidated} />
                    <CompactMetric label="Dernière modification" value={formatDateTime(snapshot.lastModifiedAt)} />
                    <CompactMetric label="Dernier export" value={formatDateTime(snapshot.lastExportAt)} />
                    <CompactMetric label="Écarts de voix" value={voice.strong.length} />
                    <CompactMetric label="Alertes silence" value={silence.totalAlerts} />
                  </>
                ) : null}
              </div>
            </CollapsibleSection>

            <CollapsibleSection
              id="alertes"
              isOpen={openSections.alertes}
              onToggle={() => toggleSection("alertes")}
              summary={criticalAlerts.length ? `${criticalAlerts.length} signal${criticalAlerts.length > 1 ? "aux" : ""} critique${criticalAlerts.length > 1 ? "s" : ""}` : "aucune alerte critique"}
              title="Alertes prioritaires"
            >
              <div className="grid gap-2">
                {criticalAlerts.length ? criticalAlerts.map((alert) => (
                  <p className="rounded-xl border border-amber-300/30 bg-amber-400/10 px-3 py-2 text-sm text-amber-100" key={alert}>
                    {alert}
                  </p>
                )) : (
                  <p className="rounded-xl border border-emerald-300/30 bg-emerald-400/10 px-3 py-2 text-sm text-emerald-100">
                    Aucun signal prioritaire détecté.
                  </p>
                )}
                {mode === "complet" ? (
                  <div className="mt-2 grid gap-2 md:grid-cols-2">
                    {snapshot.priorities.map((item) => (
                      <div className="rounded-xl border border-[#d6b25e]/14 bg-[#0f0d0a]/60 px-3 py-2" key={`${item.title}-${item.chapter}`}>
                        <div className="flex flex-wrap items-center gap-2">
                          <span className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold ${statusTone(item.priority)}`}>
                            {item.priority}
                          </span>
                          <p className="text-sm font-semibold text-[#f1e7d5]">{item.title}</p>
                        </div>
                        <p className="mt-2 text-xs text-[#a99b84]">{item.chapter}</p>
                        <p className="mt-1 text-sm text-[#d8cbb5]">{item.reason}</p>
                      </div>
                    ))}
                  </div>
                ) : null}
              </div>
            </CollapsibleSection>

            <CollapsibleSection
              id="style"
              isOpen={openSections.style}
              onToggle={() => toggleSection("style")}
              summary={`${snapshot.styleMetrics.length} chapitres analysés · ${voice.coherence}`}
              title="Voix & style"
            >
              <div className="grid gap-2 text-sm text-[#d8cbb5] md:grid-cols-2">
                <CompactMetric label="Chapitres analysés" value={snapshot.styleMetrics.length} />
                <CompactMetric label="Écarts forts" value={voice.strong.length} />
                <CompactMetric label="Plus fragmenté" value={voice.mostFragmented ? chapterLabel(voice.mostFragmented.chapter) : "non disponible"} />
                <CompactMetric label="Plus sensoriel" value={voice.mostSensory ? chapterLabel(voice.mostSensory.chapter) : "non disponible"} />
                {mode === "complet" ? <CompactMetric label="Plus explicatif" value={voice.mostExplanatory ? chapterLabel(voice.mostExplanatory.chapter) : "non disponible"} /> : null}
              </div>
            </CollapsibleSection>

            <CollapsibleSection
              id="motifs"
              isOpen={openSections.motifs}
              onToggle={() => toggleSection("motifs")}
              summary={`${motifs.active.length} actifs · ${motifs.alert.length} en alerte`}
              title="Motifs narratifs"
            >
              <div className="grid gap-2 md:grid-cols-2">
                <CompactMetric label="Motifs actifs" value={motifs.active.length} />
                <CompactMetric label="Motifs en alerte" value={motifs.alert.length} />
                <CompactMetric label="Dominants" value={motifs.dominant.filter((motif) => motif.appearances > 0).map((motif) => motif.motif).join(", ") || "non disponible"} />
                <CompactMetric label="Absents" value={motifs.absent.map((motif) => motif.motif).join(", ") || "aucun"} />
              </div>
              {mode === "complet" ? (
                <div className="mt-3 rounded-xl border border-[#d6b25e]/12 bg-[#0f0d0a]/55 p-3">
                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#a99b84]">Dernières apparitions</p>
                  <div className="mt-2 grid gap-1 md:grid-cols-2">
                    {snapshot.motifs.slice(0, 8).map((motif) => (
                      <p className="text-xs text-[#d8cbb5]" key={motif.motif}>
                        {motif.motif} : {motif.lastAppearance || "absent"}
                      </p>
                    ))}
                  </div>
                </div>
              ) : null}
            </CollapsibleSection>

            <CollapsibleSection
              id="silence"
              isOpen={openSections.silence}
              onToggle={() => toggleSection("silence")}
              summary={`${silence.totalAlerts} alertes · ${silence.danger} voix en danger`}
              title="Silence narratif"
            >
              <div className="grid gap-2 sm:grid-cols-3">
                <CompactMetric label="Alertes détectées" value={silence.totalAlerts} />
                <CompactMetric label="Attention requise" value={silence.attention} />
                <CompactMetric label="Voix en danger" value={silence.danger} />
              </div>
              {(mode === "complet" || silence.danger > 0) ? (
                <div className="mt-3 grid gap-2 md:grid-cols-2">
                  {silence.excerpts.length ? silence.excerpts.map((item, index) => (
                    <div className="rounded-xl border border-[#d6b25e]/12 bg-[#0f0d0a]/55 p-3" key={`${item.chapter}-${index}`}>
                      <p className="text-xs font-semibold text-[#f1e7d5]">{item.chapter}</p>
                      <p className="mt-1 line-clamp-3 text-xs leading-5 text-[#d8cbb5]">“{item.excerpt}”</p>
                    </div>
                  )) : (
                    <p className="text-sm text-[#a99b84]">Aucun extrait prioritaire détecté.</p>
                  )}
                </div>
              ) : null}
            </CollapsibleSection>

            <CollapsibleSection
              id="priorites"
              isOpen={openSections.priorites}
              onToggle={() => toggleSection("priorites")}
              summary={`${visiblePriorities.length} action${visiblePriorities.length > 1 ? "s" : ""} visible${visiblePriorities.length > 1 ? "s" : ""}`}
              title="Priorités d’action"
            >
              <div className="grid gap-2 md:grid-cols-2">
                {visiblePriorities.length ? visiblePriorities.map((item, index) => (
                  <div className="rounded-xl border border-[#d6b25e]/14 bg-[#0f0d0a]/60 px-3 py-2" key={`${item.title}-${index}`}>
                    <div className="flex items-center gap-2">
                      <span className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold ${statusTone(item.priority)}`}>
                        {item.priority}
                      </span>
                      <p className="text-sm font-semibold text-[#f1e7d5]">{index + 1}. {item.title}</p>
                    </div>
                    <p className="mt-1 text-xs text-[#a99b84]">Où : {item.chapter}</p>
                    <p className="mt-1 text-xs text-[#d8cbb5]">Pourquoi : {item.reason}</p>
                  </div>
                )) : (
                  <p className="text-sm text-[#a99b84]">Rien à prioriser maintenant.</p>
                )}
              </div>
            </CollapsibleSection>
          </div>
        </div>
      </SystemPageShell>
    </main>
  );
}
