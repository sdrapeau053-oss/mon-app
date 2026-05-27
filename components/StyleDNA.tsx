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
  SystemTable,
  SystemTableCell,
  SystemTableHeader,
} from "@/components/system-ui";
import {
  CHAPITRES_TOME_1_STORAGE_KEY,
  getNumeroChapitreTome1,
  normaliserChapitresTome1,
  type ChapitreTome1,
} from "@/lib/tome1-chapters";

type JsonReadResult<T> = {
  exists: boolean;
  invalid: boolean;
  value: T | null;
};

type FrequentWord = {
  count: number;
  word: string;
};

type DeviationLevel = "faible" | "moyen" | "fort";

type VoiceDeviation = {
  alert: string;
  label: string;
  level: DeviationLevel;
  percent: number;
};

type ChapterStyleMetrics = {
  abstractCount: number;
  alerts: string[];
  averageSentenceLength: number;
  bodyCount: number;
  chapter: ChapitreTome1;
  concreteAbstractRatio: number | null;
  voiceAlerts: string[];
  voiceDeviations: VoiceDeviation[];
  frequentWords: FrequentWord[];
  longSentencePercent: number;
  mediumSentencePercent: number;
  sentenceCount: number;
  shortSentencePercent: number;
  wordCount: number;
};

type StyleSnapshot = {
  averages: {
    abstractPerThousand: number;
    averageSentenceLength: number;
    bodyPerThousand: number;
    longSentencePercent: number;
    shortSentencePercent: number;
  };
  chapters: ChapterStyleMetrics[];
  invalidStorage: boolean;
};

const ABSTRACT_WORDS = [
  "pensée",
  "sentiment",
  "émotion",
  "tristesse",
  "souffrance",
  "trauma",
  "peur",
  "honte",
  "solitude",
  "douleur",
];

const BODY_WORDS = [
  "corps",
  "main",
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
];

const STOP_WORDS = new Set([
  "a",
  "ai",
  "au",
  "aux",
  "avec",
  "ce",
  "ces",
  "cet",
  "cette",
  "dans",
  "de",
  "des",
  "du",
  "elle",
  "elles",
  "en",
  "est",
  "et",
  "il",
  "ils",
  "je",
  "la",
  "le",
  "les",
  "leur",
  "lui",
  "ma",
  "mais",
  "me",
  "mes",
  "mon",
  "ne",
  "nous",
  "on",
  "ou",
  "où",
  "par",
  "pas",
  "plus",
  "pour",
  "que",
  "qui",
  "sa",
  "se",
  "ses",
  "son",
  "sur",
  "ta",
  "te",
  "tes",
  "tu",
  "un",
  "une",
  "vos",
  "vous",
]);

function normalizeWord(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/^[^a-z0-9]+|[^a-z0-9]+$/g, "");
}

const ABSTRACT_WORD_SET = new Set(ABSTRACT_WORDS.map(normalizeWord));
const BODY_WORD_SET = new Set(BODY_WORDS.map(normalizeWord));

function readJson<T>(key: string): JsonReadResult<T> {
  const raw = localStorage.getItem(key);
  if (raw === null) return { exists: false, invalid: false, value: null };

  try {
    return { exists: true, invalid: false, value: JSON.parse(raw) as T };
  } catch {
    return { exists: true, invalid: true, value: null };
  }
}

function splitSentences(text: string) {
  return text
    .replace(/\s+/g, " ")
    .split(/(?<=[.!?…])\s+|\n+/)
    .map((sentence) => sentence.trim())
    .filter(Boolean);
}

function tokenize(text: string) {
  return text
    .match(/[A-Za-zÀ-ÖØ-öø-ÿ0-9]+(?:['’][A-Za-zÀ-ÖØ-öø-ÿ0-9]+)?/g)
    ?.map(normalizeWord)
    .filter((word) => word.length > 1) ?? [];
}

function percent(count: number, total: number) {
  return total > 0 ? Math.round((count / total) * 100) : 0;
}

function round(value: number, digits = 1) {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

function countLexicon(words: string[], lexicon: Set<string>) {
  return words.filter((word) => lexicon.has(word)).length;
}

function getFrequentWords(words: string[]): FrequentWord[] {
  const counts = new Map<string, number>();

  words
    .filter((word) => word.length > 2 && !STOP_WORDS.has(word))
    .forEach((word) => counts.set(word, (counts.get(word) || 0) + 1));

  return Array.from(counts.entries())
    .map(([word, count]) => ({ word, count }))
    .filter((item) => item.count >= 2)
    .sort((a, b) => b.count - a.count || a.word.localeCompare(b.word))
    .slice(0, 8);
}

function analyzeChapter(chapter: ChapitreTome1): ChapterStyleMetrics | null {
  const text = chapter.contenu.trim();
  if (!text) return null;

  const words = tokenize(text);
  if (!words.length) return null;

  const sentences = splitSentences(text);
  const sentenceLengths = sentences.map((sentence) => tokenize(sentence).length).filter(Boolean);
  const sentenceCount = Math.max(sentenceLengths.length, 1);
  const shortSentences = sentenceLengths.filter((length) => length < 10).length;
  const mediumSentences = sentenceLengths.filter((length) => length >= 10 && length <= 20).length;
  const longSentences = sentenceLengths.filter((length) => length > 20).length;
  const abstractCount = countLexicon(words, ABSTRACT_WORD_SET);
  const bodyCount = countLexicon(words, BODY_WORD_SET);

  return {
    abstractCount,
    alerts: [],
    averageSentenceLength: round(words.length / sentenceCount),
    bodyCount,
    chapter,
    concreteAbstractRatio: abstractCount > 0 ? round(bodyCount / abstractCount, 2) : bodyCount > 0 ? null : 0,
    voiceAlerts: [],
    voiceDeviations: [],
    frequentWords: getFrequentWords(words),
    longSentencePercent: percent(longSentences, sentenceCount),
    mediumSentencePercent: percent(mediumSentences, sentenceCount),
    sentenceCount,
    shortSentencePercent: percent(shortSentences, sentenceCount),
    wordCount: words.length,
  };
}

function perThousand(count: number, total: number) {
  return total > 0 ? (count / total) * 1000 : 0;
}

function average(values: number[]) {
  if (!values.length) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function numericRatio(value: number | null) {
  return value ?? 0;
}

function relativeDifference(value: number, baseline: number) {
  if (baseline === 0) return value === 0 ? 0 : 100;

  return Math.abs((value - baseline) / baseline) * 100;
}

function deviationLevel(difference: number): DeviationLevel {
  if (difference < 15) return "faible";
  if (difference <= 30) return "moyen";

  return "fort";
}

function buildVoiceDeviation(
  label: string,
  value: number,
  baseline: number,
  alert: string,
): VoiceDeviation {
  const difference = round(relativeDifference(value, baseline));

  return {
    alert,
    label,
    level: deviationLevel(difference),
    percent: difference,
  };
}

function addAlerts(chapters: ChapterStyleMetrics[]): ChapterStyleMetrics[] {
  const averages = {
    abstractPerThousand: average(chapters.map((chapter) => perThousand(chapter.abstractCount, chapter.wordCount))),
    averageSentenceLength: average(chapters.map((chapter) => chapter.averageSentenceLength)),
    bodyPerThousand: average(chapters.map((chapter) => perThousand(chapter.bodyCount, chapter.wordCount))),
    longSentencePercent: average(chapters.map((chapter) => chapter.longSentencePercent)),
    concreteAbstractRatio: average(chapters.map((chapter) => numericRatio(chapter.concreteAbstractRatio))),
    shortSentencePercent: average(chapters.map((chapter) => chapter.shortSentencePercent)),
  };

  return chapters.map((chapter) => {
    const alerts: string[] = [];
    const abstractDensity = perThousand(chapter.abstractCount, chapter.wordCount);
    const bodyDensity = perThousand(chapter.bodyCount, chapter.wordCount);

    if (abstractDensity > averages.abstractPerThousand * 1.35 && abstractDensity > bodyDensity) {
      alerts.push("chapitre plus explicatif que la moyenne");
    }

    if (
      chapter.averageSentenceLength > Math.max(20, averages.averageSentenceLength * 1.25) ||
      chapter.longSentencePercent > Math.max(35, averages.longSentencePercent * 1.35)
    ) {
      alerts.push("chapitre très dense");
    }

    if (
      chapter.shortSentencePercent > Math.max(55, averages.shortSentencePercent * 1.25) ||
      chapter.averageSentenceLength < Math.max(7, averages.averageSentenceLength * 0.7)
    ) {
      alerts.push("chapitre très fragmenté");
    }

    if (bodyDensity < averages.bodyPerThousand * 0.75 || chapter.bodyCount < chapter.abstractCount) {
      alerts.push("chapitre plus narratif que sensoriel");
    }

    const voiceDeviations = [
      buildVoiceDeviation(
        "Longueur moyenne des phrases",
        chapter.averageSentenceLength,
        averages.averageSentenceLength,
        "Phrases nettement plus longues que la moyenne",
      ),
      buildVoiceDeviation(
        "Phrases courtes",
        chapter.shortSentencePercent,
        averages.shortSentencePercent,
        "Rythme plus fragmenté que la moyenne",
      ),
      buildVoiceDeviation(
        "Phrases longues",
        chapter.longSentencePercent,
        averages.longSentencePercent,
        "Phrases nettement plus longues que la moyenne",
      ),
      buildVoiceDeviation(
        "Fréquence abstraite",
        abstractDensity,
        averages.abstractPerThousand,
        "Plus explicatif que la moyenne",
      ),
      buildVoiceDeviation(
        "Fréquence corporelle/sensorielle",
        bodyDensity,
        averages.bodyPerThousand,
        "Plus sensoriel que la moyenne",
      ),
      buildVoiceDeviation(
        "Ratio concret / abstrait",
        numericRatio(chapter.concreteAbstractRatio),
        averages.concreteAbstractRatio,
        "Plus sensoriel que la moyenne",
      ),
    ];
    const strongAlerts = voiceDeviations.filter((deviation) => deviation.level === "fort");
    const mediumAlerts = voiceDeviations.filter((deviation) => deviation.level === "moyen");
    const voiceAlerts = Array.from(
      new Set(
        strongAlerts.length === 0 && mediumAlerts.length === 0
          ? ["Très proche de la voix moyenne"]
          : [...strongAlerts, ...mediumAlerts].map((deviation) => deviation.alert),
      ),
    );

    return { ...chapter, alerts, voiceAlerts, voiceDeviations };
  });
}

function buildSnapshot(): StyleSnapshot {
  const chaptersRead = readJson<unknown>(CHAPITRES_TOME_1_STORAGE_KEY);
  const chapters =
    chaptersRead.exists && !chaptersRead.invalid ? normaliserChapitresTome1(chaptersRead.value) : [];
  const analyzed = addAlerts(
    chapters
      .map(analyzeChapter)
      .filter((chapter): chapter is ChapterStyleMetrics => Boolean(chapter)),
  );

  return {
    averages: {
      abstractPerThousand: round(average(analyzed.map((chapter) => perThousand(chapter.abstractCount, chapter.wordCount)))),
      averageSentenceLength: round(average(analyzed.map((chapter) => chapter.averageSentenceLength))),
      bodyPerThousand: round(average(analyzed.map((chapter) => perThousand(chapter.bodyCount, chapter.wordCount)))),
      longSentencePercent: round(average(analyzed.map((chapter) => chapter.longSentencePercent))),
      shortSentencePercent: round(average(analyzed.map((chapter) => chapter.shortSentencePercent))),
    },
    chapters: analyzed,
    invalidStorage: chaptersRead.invalid,
  };
}

function pickBy(
  chapters: ChapterStyleMetrics[],
  sort: (a: ChapterStyleMetrics, b: ChapterStyleMetrics) => number,
) {
  return [...chapters].sort(sort)[0] ?? null;
}

function formatChapterTitle(chapter: ChapterStyleMetrics | null) {
  if (!chapter) return "non disponible";

  return `Ch. ${getNumeroChapitreTome1(chapter.chapter.id)} — ${chapter.chapter.titre}`;
}

function MetricCard({ label, value, detail }: { label: string; value: string | number; detail?: string }) {
  return (
    <article className="internal-card min-h-[106px]">
      <p className="editorial-label">{label}</p>
      <p className="mt-3 text-3xl font-semibold text-[#f1e7d5]">{value}</p>
      {detail ? <p className="mt-2 text-xs leading-5 text-[#a99b84]">{detail}</p> : null}
    </article>
  );
}

function MiniBar({ label, value, tone = "#d6b25e" }: { label: string; value: number; tone?: string }) {
  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between gap-3 text-[11px] text-[#cfc1aa]">
        <span>{label}</span>
        <span className="font-semibold text-[#f1e7d5]">{value}%</span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-[#0d0c0a]">
        <div className="h-full rounded-full" style={{ width: `${Math.min(Math.max(value, 0), 100)}%`, background: tone }} />
      </div>
    </div>
  );
}

function getDeviationTone(level: DeviationLevel) {
  if (level === "faible") return "border-emerald-300/35 bg-emerald-400/10 text-emerald-100";
  if (level === "moyen") return "border-amber-300/35 bg-amber-400/10 text-amber-100";

  return "border-red-300/35 bg-red-400/10 text-red-100";
}

export default function StyleDNA() {
  const [snapshot, setSnapshot] = useState<StyleSnapshot | null>(null);

  useEffect(() => {
    const refresh = () => setSnapshot(buildSnapshot());

    refresh();
    window.addEventListener("storage", refresh);

    return () => window.removeEventListener("storage", refresh);
  }, []);

  const comparisons = useMemo(() => {
    const chapters = snapshot?.chapters ?? [];

    return {
      longest: pickBy(chapters, (a, b) => b.wordCount - a.wordCount),
      mostFragmented: pickBy(chapters, (a, b) => b.shortSentencePercent - a.shortSentencePercent),
      mostSensory: pickBy(chapters, (a, b) => perThousand(b.bodyCount, b.wordCount) - perThousand(a.bodyCount, a.wordCount)),
      shortest: pickBy(chapters, (a, b) => a.wordCount - b.wordCount),
    };
  }, [snapshot]);

  const totals = useMemo(() => {
    const chapters = snapshot?.chapters ?? [];
    const wordCount = chapters.reduce((sum, chapter) => sum + chapter.wordCount, 0);
    const sentenceCount = chapters.reduce((sum, chapter) => sum + chapter.sentenceCount, 0);
    const abstractCount = chapters.reduce((sum, chapter) => sum + chapter.abstractCount, 0);
    const bodyCount = chapters.reduce((sum, chapter) => sum + chapter.bodyCount, 0);

    return {
      abstractCount,
      bodyCount,
      ratio: abstractCount > 0 ? round(bodyCount / abstractCount, 2) : bodyCount > 0 ? "sensoriel seul" : "non disponible",
      sentenceCount,
      wordCount,
    };
  }, [snapshot]);
  const voiceSummary = useMemo(() => {
    const chapters = snapshot?.chapters ?? [];
    const chaptersNeedingAttention = chapters.filter((chapter) =>
      chapter.voiceAlerts.some((alert) => alert !== "Très proche de la voix moyenne"),
    ).length;

    return {
      chaptersNeedingAttention,
      label:
        chaptersNeedingAttention === 0
          ? "voix cohérente"
          : `attention requise sur ${chaptersNeedingAttention} chapitre${chaptersNeedingAttention > 1 ? "s" : ""}`,
    };
  }, [snapshot]);

  if (!snapshot) {
    return (
      <main className="internal-page">
        <SystemPageShell maxWidth={1100} padding="22px 16px 44px">
          <SystemPanel compact>
            <p className="editorial-body">Lecture du manuscrit...</p>
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
              <p className="internal-kicker">ADN stylistique</p>
              <h1 className="internal-title">Tendances réelles du manuscrit</h1>
              <p className="internal-subtitle">
                Analyse locale des chapitres écrits : rythme, densité, répétitions et équilibre sensoriel.
              </p>
            </div>
            <SystemActionRow>
              <Link className="soft-button" href="/guide-strate" style={{ textDecoration: "none" }}>
                Besoin d’aide ?
              </Link>
              <Link className="soft-button" href="/" style={{ textDecoration: "none" }}>
                Accueil
              </Link>
              <Link className="soft-button" href="/dashboard" style={{ textDecoration: "none" }}>
                Dashboard
              </Link>
            </SystemActionRow>
        </header>

        {snapshot.invalidStorage ? (
          <SystemPanel compact style={{ borderColor: "rgba(181, 107, 95, 0.35)", color: "#d79a8f" }}>
            La clé {CHAPITRES_TOME_1_STORAGE_KEY} contient un JSON invalide. L’analyse stylistique est suspendue.
          </SystemPanel>
        ) : null}

        {snapshot.chapters.length === 0 ? (
          <SystemPanel>
            <SystemSectionHeader eyebrow="État" title="Aucun chapitre écrit détecté" />
            <p className="editorial-body mt-3">
              Les chapitres vides sont ignorés proprement. Dès qu’un chapitre contient du texte, ses tendances apparaîtront ici.
            </p>
          </SystemPanel>
        ) : (
          <>
            <SystemPanel compact>
              <p className="text-sm font-semibold text-[#f1e7d5]">
                {snapshot.chapters.length} chapitre{snapshot.chapters.length > 1 ? "s" : ""} analysé{snapshot.chapters.length > 1 ? "s" : ""} — {voiceSummary.label}
              </p>
              <p className="mt-1 text-xs leading-5 text-[#a99b84]">
                Écart faible : moins de 15 %. Écart moyen : 15 à 30 %. Écart fort : plus de 30 %.
              </p>
            </SystemPanel>

            <SystemGrid min={190} gap={12}>
              <MetricCard label="Chapitres analysés" value={snapshot.chapters.length} />
              <MetricCard label="Mots" value={totals.wordCount.toLocaleString("fr-CA")} />
              <MetricCard label="Phrases" value={totals.sentenceCount.toLocaleString("fr-CA")} />
              <MetricCard label="Longueur moyenne" value={`${snapshot.averages.averageSentenceLength} mots`} detail="Moyenne par phrase." />
              <MetricCard label="Mots abstraits" value={totals.abstractCount} detail={`${snapshot.averages.abstractPerThousand} / 1000 mots`} />
              <MetricCard label="Mots corporels" value={totals.bodyCount} detail={`${snapshot.averages.bodyPerThousand} / 1000 mots`} />
              <MetricCard label="Ratio concret / abstrait" value={String(totals.ratio)} />
              <MetricCard label="Phrases courtes moy." value={`${snapshot.averages.shortSentencePercent}%`} detail="Moins de 10 mots." />
            </SystemGrid>

            <section className="mt-4 grid gap-4 lg:grid-cols-[0.86fr_1fr]">
              <SystemPanel>
                <SystemSectionHeader eyebrow="Comparaison" title="Entre chapitres" />
                <div className="mt-4 grid gap-2">
                  {[
                    ["Chapitre le plus court", formatChapterTitle(comparisons.shortest)],
                    ["Chapitre le plus long", formatChapterTitle(comparisons.longest)],
                    ["Chapitre le plus fragmenté", formatChapterTitle(comparisons.mostFragmented)],
                    ["Chapitre le plus sensoriel", formatChapterTitle(comparisons.mostSensory)],
                  ].map(([label, value]) => (
                    <div className="rounded-xl border border-[#d6b25e]/14 bg-[#0f0d0a]/60 px-3 py-2" key={label}>
                      <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#a99b84]">{label}</p>
                      <p className="mt-1 text-sm font-semibold text-[#f1e7d5]">{value}</p>
                    </div>
                  ))}
                </div>
              </SystemPanel>

              <SystemPanel>
                <SystemSectionHeader eyebrow="Surveillance" title="Alerte stylistique" />
                <div className="mt-4 grid gap-2">
                  {snapshot.chapters.some((chapter) => chapter.alerts.length > 0) ? (
                    snapshot.chapters
                      .filter((chapter) => chapter.alerts.length > 0)
                      .map((chapter) => (
                        <div className="rounded-xl border border-amber-300/30 bg-amber-400/10 px-3 py-2" key={chapter.chapter.id}>
                          <p className="text-sm font-semibold text-[#f1e7d5]">
                            Ch. {getNumeroChapitreTome1(chapter.chapter.id)} — {chapter.chapter.titre}
                          </p>
                          <p className="mt-1 text-xs leading-5 text-amber-100">{chapter.alerts.join(" · ")}</p>
                        </div>
                      ))
                  ) : (
                    <p className="rounded-xl border border-emerald-300/30 bg-emerald-400/10 px-3 py-2 text-sm text-emerald-100">
                      Aucune variation forte détectée avec les métriques actuelles.
                    </p>
                  )}
                </div>
              </SystemPanel>
            </section>

            <SystemPanel ariaLabel="Écart à la voix du Tome 1" style={{ marginTop: 16 }}>
              <SystemSectionHeader eyebrow="Voix" title="Écart à la voix du Tome 1" />
                <p className="editorial-body mt-1 text-sm" style={{ marginBottom: 14 }}>
                  Comparaison de chaque chapitre à la moyenne globale des chapitres non vides.
                </p>
              <div className="grid gap-3 lg:grid-cols-2">
                {snapshot.chapters.map((chapter) => (
                  <article className="internal-card" key={`voice-${chapter.chapter.id}`}>
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <p className="editorial-label">Chapitre {getNumeroChapitreTome1(chapter.chapter.id)}</p>
                        <h2 className="mt-2 text-lg font-semibold text-[#f1e7d5]">{chapter.chapter.titre}</h2>
                      </div>
                      <StatusChip tone={chapter.voiceAlerts.includes("Très proche de la voix moyenne") ? "success" : "warning"}>
                        {chapter.voiceAlerts.includes("Très proche de la voix moyenne") ? "proche" : "à surveiller"}
                      </StatusChip>
                    </div>

                    <div className="mt-3 flex flex-wrap gap-2">
                      {chapter.voiceAlerts.map((alert) => (
                        <span className="rounded-full border border-[#d6b25e]/18 bg-[#0f0d0a]/70 px-2.5 py-1 text-[11px] text-[#d8cbb5]" key={alert}>
                          {alert}
                        </span>
                      ))}
                    </div>

                    <div className="mt-4 grid gap-2">
                      {chapter.voiceDeviations.map((deviation) => (
                        <div
                          className="flex items-center justify-between gap-3 rounded-xl border border-[#d6b25e]/12 bg-[#0f0d0a]/55 px-3 py-2"
                          key={`${chapter.chapter.id}-${deviation.label}`}
                        >
                          <div className="min-w-0">
                            <p className="truncate text-sm font-semibold text-[#f1e7d5]">{deviation.label}</p>
                            <p className="text-[11px] text-[#a99b84]">{deviation.percent}% d’écart à la moyenne</p>
                          </div>
                          <span className={`shrink-0 rounded-full border px-2 py-1 text-[10px] font-bold ${getDeviationTone(deviation.level)}`}>
                            {deviation.level}
                          </span>
                        </div>
                      ))}
                    </div>
                  </article>
                ))}
              </div>
            </SystemPanel>

            <SystemPanel ariaLabel="Métriques par chapitre" style={{ marginTop: 16 }}>
              <SystemSectionHeader eyebrow="Métriques" title="Par chapitre" />
              <SystemTable minWidth={940}>
                  <thead>
                    <tr>
                      <SystemTableHeader>Chapitre</SystemTableHeader>
                      <SystemTableHeader>Mots</SystemTableHeader>
                      <SystemTableHeader>Phrases</SystemTableHeader>
                      <SystemTableHeader>Moy.</SystemTableHeader>
                      <SystemTableHeader>Courtes</SystemTableHeader>
                      <SystemTableHeader>Moyennes</SystemTableHeader>
                      <SystemTableHeader>Longues</SystemTableHeader>
                      <SystemTableHeader>Abstrait</SystemTableHeader>
                      <SystemTableHeader>Sensoriel</SystemTableHeader>
                      <SystemTableHeader>Ratio</SystemTableHeader>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#d6b25e]/10">
                    {snapshot.chapters.map((chapter) => (
                      <tr className="text-[#d8cbb5]" key={chapter.chapter.id}>
                        <SystemTableCell width={220}>
                          <p className="truncate font-semibold text-[#f1e7d5]">
                            Ch. {getNumeroChapitreTome1(chapter.chapter.id)} — {chapter.chapter.titre}
                          </p>
                          <p className="mt-1 truncate text-[11px] text-[#a99b84]">
                            {chapter.frequentWords.length
                              ? chapter.frequentWords.map((item) => `${item.word} ${item.count}`).join(", ")
                              : "répétitions fortes non détectées"}
                          </p>
                        </SystemTableCell>
                        <SystemTableCell>{chapter.wordCount}</SystemTableCell>
                        <SystemTableCell>{chapter.sentenceCount}</SystemTableCell>
                        <SystemTableCell>{chapter.averageSentenceLength}</SystemTableCell>
                        <SystemTableCell>{chapter.shortSentencePercent}%</SystemTableCell>
                        <SystemTableCell>{chapter.mediumSentencePercent}%</SystemTableCell>
                        <SystemTableCell>{chapter.longSentencePercent}%</SystemTableCell>
                        <SystemTableCell>{chapter.abstractCount}</SystemTableCell>
                        <SystemTableCell>{chapter.bodyCount}</SystemTableCell>
                        <SystemTableCell>
                          {chapter.concreteAbstractRatio === null ? "sensoriel seul" : chapter.concreteAbstractRatio}
                        </SystemTableCell>
                      </tr>
                    ))}
                  </tbody>
                </SystemTable>
            </SystemPanel>

            <SystemPanel ariaLabel="Rythme et mots fréquents" style={{ marginTop: 16 }}>
              <SystemSectionHeader eyebrow="Détail" title="Rythme et mots fréquents" />
              <div className="grid gap-3 lg:grid-cols-2">
                {snapshot.chapters.map((chapter) => (
                  <article className="internal-card" key={chapter.chapter.id}>
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="editorial-label">Chapitre {getNumeroChapitreTome1(chapter.chapter.id)}</p>
                        <h2 className="mt-2 text-lg font-semibold text-[#f1e7d5]">{chapter.chapter.titre}</h2>
                      </div>
                      <StatusChip>{chapter.wordCount} mots</StatusChip>
                    </div>

                    <div className="mt-4 grid gap-3">
                      <MiniBar label="Phrases courtes" value={chapter.shortSentencePercent} tone="#8fb7c9" />
                      <MiniBar label="Phrases moyennes" value={chapter.mediumSentencePercent} tone="#d6b25e" />
                      <MiniBar label="Phrases longues" value={chapter.longSentencePercent} tone="#c98768" />
                    </div>

                    <div className="mt-4 flex flex-wrap gap-2">
                      {chapter.frequentWords.length ? (
                        chapter.frequentWords.map((item) => (
                          <StatusChip key={item.word}>
                            {item.word} · {item.count}
                          </StatusChip>
                        ))
                      ) : (
                        <span className="text-xs text-[#a99b84]">Aucune répétition lexicale forte.</span>
                      )}
                    </div>
                  </article>
                ))}
              </div>
            </SystemPanel>
          </>
        )}
      </SystemPageShell>
    </main>
  );
}
