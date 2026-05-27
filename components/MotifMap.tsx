"use client";

import Link from "next/link";
import { FormEvent, useEffect, useMemo, useState } from "react";
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

type ChapterSource = {
  id: string;
  index: number;
  title: string;
  tomeId: number;
  tomeTitle: string;
  text: string;
};

type MotifEvolution = "croissant" | "décroissant" | "stable" | "absent";

type MotifStats = {
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

type MotifSnapshot = {
  chapters: ChapterSource[];
  invalidKeys: string[];
  motifs: MotifStats[];
};

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

const MANUAL_VARIANTS: Record<string, string[]> = {
  animaux: ["animal", "animaux", "bête", "bêtes"],
  chambre: ["chambre", "chambres"],
  corps: ["corps", "corporel", "corporelle", "corporels", "corporelles", "chair", "peau", "ventre"],
  eau: ["eau", "eaux", "rivière", "ruisseau", "pluie", "lac", "eau chaude", "cascade"],
  froid: ["froid", "froide", "froids", "froides"],
  fuite: ["fuite", "fuites", "fuir", "fuyait", "fuyant"],
  honte: ["honte", "hontes", "humiliation", "humilié", "humiliée", "honteux", "honteuse", "gêne"],
  lumière: ["lumière", "lumières", "lumineux", "lumineuse"],
  maison: ["maison", "maisons"],
  mère: ["mère", "mères", "maman"],
  nuit: ["nuit", "nuits", "nocturne"],
  peur: ["peur", "peurs", "apeuré", "apeurée", "craindre", "terrorisé", "terrorisée", "menace", "danger", "inquiétude"],
  père: ["père", "pères", "papa"],
  silence: ["silence", "silences", "silencieux", "silencieuse", "muet", "muette", "absence de bruit"],
  voix: ["voix"],
};

function readJson<T>(key: string): JsonReadResult<T> {
  const raw = localStorage.getItem(key);
  if (raw === null) return { exists: false, invalid: false, value: null };

  try {
    return { exists: true, invalid: false, value: JSON.parse(raw) as T };
  } catch {
    return { exists: true, invalid: true, value: null };
  }
}

function normalizeWord(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/^[^a-z0-9]+|[^a-z0-9]+$/g, "");
}

function normalizeText(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[’]/g, "'")
    .replace(/[^a-z0-9'\s]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function tokenize(text: string) {
  return text
    .match(/[A-Za-zÀ-ÖØ-öø-ÿ0-9]+(?:['’][A-Za-zÀ-ÖØ-öø-ÿ0-9]+)?/g)
    ?.map(normalizeWord)
    .filter(Boolean) ?? [];
}

function ecritureKey(tomeId: number, chapterTitle: string) {
  return `ecriture_${tomeId}_${encodeURIComponent(chapterTitle)}`;
}

function getVariants(motif: string) {
  const normalized = normalizeWord(motif);
  const variants = MANUAL_VARIANTS[motif.toLowerCase()] || MANUAL_VARIANTS[normalized] || [motif];

  return Array.from(new Set(variants.map((variant) => normalizeText(variant)).filter(Boolean)));
}

function countPhrase(text: string, phrase: string) {
  if (!phrase.includes(" ")) return 0;

  const escaped = phrase.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return text.match(new RegExp(`(^|\\s)${escaped}(?=\\s|$)`, "g"))?.length ?? 0;
}

function countMotif(words: string[], normalizedText: string, variants: string[]) {
  const wordVariants = new Set(variants.filter((variant) => !variant.includes(" ")).map(normalizeWord));
  const wordCount = words.filter((word) => wordVariants.has(word)).length;
  const phraseCount = variants
    .filter((variant) => variant.includes(" "))
    .reduce((sum, phrase) => sum + countPhrase(normalizedText, phrase), 0);

  return wordCount + phraseCount;
}

function getIntensity(count: number): "faible" | "moyenne" | "forte" {
  if (count >= 6) return "forte";
  if (count >= 3) return "moyenne";
  return "faible";
}

function intensityTone(intensity: "faible" | "moyenne" | "forte") {
  if (intensity === "forte") return "border-red-300/35 bg-red-400/10 text-red-100";
  if (intensity === "moyenne") return "border-amber-300/35 bg-amber-400/10 text-amber-100";
  return "border-emerald-300/35 bg-emerald-400/10 text-emerald-100";
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

function getEvolution(chapterCounts: number[]): MotifEvolution {
  const total = chapterCounts.reduce((sum, count) => sum + count, 0);
  if (total === 0) return "absent";

  const midpoint = Math.ceil(chapterCounts.length / 2);
  const firstHalf = chapterCounts.slice(0, midpoint).reduce((sum, count) => sum + count, 0);
  const secondHalf = chapterCounts.slice(midpoint).reduce((sum, count) => sum + count, 0);
  const difference = secondHalf - firstHalf;
  const tolerance = Math.max(2, Math.round(total * 0.15));

  if (Math.abs(difference) <= tolerance) return "stable";
  return difference > 0 ? "croissant" : "décroissant";
}

function getLongestGap(chapterCounts: number[]) {
  let current = 0;
  let longest = 0;

  chapterCounts.forEach((count) => {
    if (count > 0) {
      current = 0;
      return;
    }

    current += 1;
    longest = Math.max(longest, current);
  });

  return longest;
}

function analyzeMotifs(chapters: ChapterSource[], motifs: string[]): MotifStats[] {
  const tokenizedChapters = chapters.map((chapter) => ({
    chapter,
    normalizedText: normalizeText(chapter.text),
    words: tokenize(chapter.text),
  }));

  return motifs.map((motif) => {
    const variants = getVariants(motif);
    const chapterCounts = tokenizedChapters.map(({ normalizedText, words }) => countMotif(words, normalizedText, variants));
    const appearances = chapterCounts.reduce((sum, count) => sum + count, 0);
    const distributionByTome: Record<number, number> = {};
    const chaptersWithMotif = tokenizedChapters
      .map(({ chapter }, index) => ({ chapter, count: chapterCounts[index] || 0 }))
      .filter(({ count }) => count > 0);

    chaptersWithMotif.forEach(({ chapter, count }) => {
      distributionByTome[chapter.tomeId] = (distributionByTome[chapter.tomeId] || 0) + count;
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
      lastAppearance: lastChapter ? `${lastChapter.tomeTitle} · ${lastChapter.title}` : null,
      longestGap,
      motif,
      variants,
    };
  });
}

function buildSnapshot(motifs: string[]): MotifSnapshot {
  const { chapters, invalidKeys } = buildChapterSources();

  return {
    chapters,
    invalidKeys,
    motifs: analyzeMotifs(chapters, motifs),
  };
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

function evolutionTone(evolution: MotifEvolution) {
  if (evolution === "croissant") return "border-emerald-300/35 bg-emerald-400/10 text-emerald-100";
  if (evolution === "décroissant") return "border-amber-300/35 bg-amber-400/10 text-amber-100";
  if (evolution === "absent") return "border-red-300/35 bg-red-400/10 text-red-100";

  return "border-[#d6b25e]/20 bg-[#0f0d0a]/70 text-[#d8cbb5]";
}

export default function MotifMap() {
  const [customMotif, setCustomMotif] = useState("");
  const [customMotifs, setCustomMotifs] = useState<string[]>([]);
  const [snapshot, setSnapshot] = useState<MotifSnapshot | null>(null);
  const allMotifs = useMemo(
    () => Array.from(new Set([...CENTRAL_MOTIFS, ...customMotifs].map((motif) => motif.trim()).filter(Boolean))),
    [customMotifs],
  );

  useEffect(() => {
    const refresh = () => setSnapshot(buildSnapshot(allMotifs));

    refresh();
    window.addEventListener("storage", refresh);

    return () => window.removeEventListener("storage", refresh);
  }, [allMotifs]);

  const activeMotifs = snapshot?.motifs.filter((motif) => motif.appearances > 0).length ?? 0;
  const alertMotifs = snapshot?.motifs.filter((motif) => motif.alert || motif.evolution === "absent").length ?? 0;

  function addCustomMotif(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const nextMotif = customMotif.trim().toLowerCase();
    if (!nextMotif || allMotifs.includes(nextMotif)) return;

    setCustomMotifs((current) => [...current, nextMotif]);
    setCustomMotif("");
  }

  if (!snapshot) {
    return (
      <main className="internal-page">
        <SystemPageShell maxWidth={1100} padding="22px 16px 44px">
          <SystemPanel compact>
            <p className="editorial-body">Lecture des motifs...</p>
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
            <p className="internal-kicker">Carte des motifs</p>
            <h1 className="internal-title">Motifs trans-tomes</h1>
            <p className="internal-subtitle">
              Suivi local des symboles narratifs sur les chapitres écrits, sans modifier les données du manuscrit.
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
          <MetricCard label="Vue globale" value={`${activeMotifs} actifs`} detail={`${alertMotifs} motifs en alerte`} />
          <MetricCard label="Chapitres lus" value={snapshot.chapters.length} detail="Chapitres non vides uniquement." />
          <MetricCard label="Motifs suivis" value={snapshot.motifs.length} />
          <MetricCard label="Alertes" value={alertMotifs} detail="Absents ou disparus plus de 8 chapitres." />
        </SystemGrid>

        <SystemPanel ariaLabel="Ajouter un motif personnalisé" style={{ marginTop: 16 }}>
          <form className="flex flex-col gap-3 sm:flex-row sm:items-end" onSubmit={addCustomMotif}>
            <label className="flex-1">
              <span className="editorial-label">Ajouter un motif personnalisé</span>
              <input
                className="internal-control mt-2 w-full px-3 py-2 text-sm"
                onChange={(event) => setCustomMotif(event.target.value)}
                placeholder="ex. fenêtre"
                type="text"
                value={customMotif}
              />
            </label>
            <button className="internal-button-primary w-fit" type="submit">
              Ajouter
            </button>
          </form>
        </SystemPanel>

        {snapshot.chapters.length === 0 ? (
          <SystemPanel>
            <SystemSectionHeader eyebrow="État" title="Aucun chapitre écrit détecté" />
            <p className="editorial-body mt-3">
              Les chapitres vides sont ignorés. La carte apparaîtra dès qu’un texte sera présent dans les structures locales.
            </p>
          </SystemPanel>
        ) : (
          <section className="grid gap-3 lg:grid-cols-2">
            {snapshot.motifs.map((motif) => (
              <article className="internal-card" key={motif.motif}>
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <p className="editorial-label">Motif</p>
                    <h2 className="mt-2 text-xl font-semibold capitalize text-[#f1e7d5]">{motif.motif}</h2>
                    <p className="mt-1 text-xs text-[#a99b84]">Variantes : {motif.variants.join(", ")}</p>
                  </div>
                  <span className={`w-fit rounded-full border px-2.5 py-1 text-[11px] font-semibold ${evolutionTone(motif.evolution)}`}>
                    {motif.evolution}
                  </span>
                </div>

                <div className="mt-4 grid gap-2 sm:grid-cols-3">
                  <div className="rounded-xl border border-[#d6b25e]/12 bg-[#0f0d0a]/60 px-3 py-2">
                    <p className="text-[10px] uppercase tracking-[0.16em] text-[#a99b84]">Apparitions</p>
                    <p className="mt-1 text-lg font-semibold text-[#f1e7d5]">{motif.appearances}</p>
                  </div>
                  <div className="rounded-xl border border-[#d6b25e]/12 bg-[#0f0d0a]/60 px-3 py-2">
                    <p className="text-[10px] uppercase tracking-[0.16em] text-[#a99b84]">Chapitres</p>
                    <p className="mt-1 text-lg font-semibold text-[#f1e7d5]">{motif.chapters.length}</p>
                  </div>
                  <div className="rounded-xl border border-[#d6b25e]/12 bg-[#0f0d0a]/60 px-3 py-2">
                    <p className="text-[10px] uppercase tracking-[0.16em] text-[#a99b84]">Silence max</p>
                    <p className="mt-1 text-lg font-semibold text-[#f1e7d5]">{motif.longestGap}</p>
                  </div>
                </div>

                {motif.alert || motif.evolution === "absent" ? (
                  <p className="mt-3 rounded-xl border border-amber-300/35 bg-amber-400/10 px-3 py-2 text-sm text-amber-100">
                    {motif.evolution === "absent"
                      ? "Motif central absent des chapitres analysés."
                      : "Motif absent pendant plus de 8 chapitres consécutifs."}
                  </p>
                ) : null}

                <div className="mt-4">
                  <p className="editorial-label">Distribution par tome</p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {[1, 2, 3, 4].map((tomeId) => (
                      <StatusChip key={tomeId}>
                        Tome {tomeId} · {motif.distributionByTome[tomeId] || 0}
                      </StatusChip>
                    ))}
                  </div>
                </div>

                <div className="mt-4">
                  <p className="editorial-label">Dernière apparition</p>
                  <p className="mt-1 text-sm text-[#d8cbb5]">{motif.lastAppearance || "non détectée"}</p>
                </div>

                <div className="mt-4">
                  <p className="editorial-label">Chronologie du motif</p>
                  <div className="mt-3 grid gap-2">
                    {motif.chapters.length ? (
                      motif.chapters.map((chapter, index) => (
                        <div className="grid grid-cols-[28px_1fr_auto] items-center gap-3" key={`${motif.motif}-timeline-${chapter.tomeId}-${chapter.title}`}>
                          <div className="flex h-full flex-col items-center">
                            <span className="flex h-6 w-6 items-center justify-center rounded-full border border-[#d6b25e]/24 bg-[#0f0d0a] text-[10px] font-semibold text-[#d6b25e]">
                              {index + 1}
                            </span>
                            {index < motif.chapters.length - 1 ? <span className="mt-1 h-6 w-px bg-[#d6b25e]/18" /> : null}
                          </div>
                          <div className="min-w-0">
                            <p className="truncate text-sm font-semibold text-[#f1e7d5]">
                              Tome {chapter.tomeId} · {chapter.title}
                            </p>
                            <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-[#0f0d0a]">
                              <div
                                className="h-full rounded-full bg-[#d6b25e]"
                                style={{ width: `${Math.min(100, Math.max(12, chapter.count * 14))}%` }}
                              />
                            </div>
                          </div>
                          <span className={`rounded-full border px-2 py-1 text-[10px] font-bold ${intensityTone(chapter.intensity)}`}>
                            {chapter.intensity}
                          </span>
                        </div>
                      ))
                    ) : (
                      <p className="rounded-xl border border-[#d6b25e]/12 bg-[#0f0d0a]/45 px-3 py-2 text-sm text-[#a99b84]">
                        Aucune apparition à placer dans la chronologie.
                      </p>
                    )}
                  </div>
                </div>

                <div className="mt-4">
                  <p className="editorial-label">Chapitres concernés</p>
                  <div className="mt-2 max-h-40 overflow-auto rounded-xl border border-[#d6b25e]/12 bg-[#0f0d0a]/45">
                    {motif.chapters.length ? (
                      motif.chapters.map((chapter) => (
                        <div className="flex items-center justify-between gap-3 border-b border-[#d6b25e]/8 px-3 py-2 last:border-b-0" key={`${motif.motif}-${chapter.tomeId}-${chapter.title}`}>
                          <span className="min-w-0 truncate text-sm text-[#f1e7d5]">
                            Tome {chapter.tomeId} · {chapter.title}
                          </span>
                          <span className="flex shrink-0 items-center gap-2">
                            <span className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold ${intensityTone(chapter.intensity)}`}>
                              {chapter.intensity}
                            </span>
                            <span className="text-xs font-semibold text-[#d6b25e]">{chapter.count}</span>
                          </span>
                        </div>
                      ))
                    ) : (
                      <p className="px-3 py-2 text-sm text-[#a99b84]">Aucun chapitre concerné.</p>
                    )}
                  </div>
                </div>
              </article>
            ))}
          </section>
        )}
      </SystemPageShell>
    </main>
  );
}
