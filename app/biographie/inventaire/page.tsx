"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  createBiographieInventory,
  createBiographieMigrationAudit,
  createBiographieMigrationDecisionReport,
  readBiographieProjetRaw,
} from "@/lib/biographie/migration-audit";
import { type Fragment, lireFragments } from "@/lib/fragments";
import { lireMemoiresNarratives } from "@/lib/memoire-narrative";
import { lireTomes } from "@/lib/manuscript-structure";
import {
  STATUT_LEGACY_IMPORTE,
  estTomeP1A,
  lireChapitresStructureParTome,
  lireContenuChapitre,
  lireEtatStructureCanonique,
  lireTexteChapitre,
} from "@/lib/manuscript-chapters";
import { createChapitreId, lireNarrativeRelationsAvecAutomatiques } from "@/lib/narrative-relations";
import { TITRE_TOME_1, compterMotsChapitreTome1, lireChapitresTome1DepuisStorage } from "@/lib/tome1-chapters";
import { getCompleteChapters } from "@/lib/manuscript-source";

type ChapterStatus = "vide" | "partiel" | "développé";
type SourceStatus = "CANONIQUE" | "SECONDAIRE" | "INCONNU";

type SummaryCard = { label: string; value: number };
type TomeRow = { id: string; title: string; chapterCount: number; fragmentCount: number; wordCount: number };
type ChapterRow = { id: string; tomeTitle: string; title: string; linkedFragments: number; wordCount: number; status: ChapterStatus };
type FragmentRow = { id: string; title: string; date: string; tomeTitle: string; chapterTitle: string; integrated: boolean };
type SourceRow = { name: string; contentType: string; itemCount: number; wordCount: number; status: SourceStatus };
type OrphanSection = { title: string; items: string[] };
type Verdict = { coherent: boolean; migrationRecommended: boolean; risks: string[]; summary: string };
type InventoryView = {
  summary: SummaryCard[];
  tomes: TomeRow[];
  chapters: ChapterRow[];
  fragments: FragmentRow[];
  orphans: OrphanSection[];
  sources: SourceRow[];
  verdict: Verdict;
};

const panelClass = "rounded-[14px] border border-[#d6b25e]/10 bg-[#15120f]/76 p-4";

function countWords(text: string) {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

function normalizeLabel(text: string) {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[’']/g, " ")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function chapterStatus(wordCount: number, linkedCount: number): ChapterStatus {
  if (wordCount === 0 && linkedCount === 0) return "vide";
  if (wordCount >= 700) return "développé";
  return "partiel";
}

function statusClass(status: ChapterStatus | SourceStatus) {
  if (status === "développé" || status === "CANONIQUE") return "border-emerald-400/25 bg-emerald-400/10 text-emerald-200";
  if (status === "partiel" || status === "SECONDAIRE") return "border-[#d6b25e]/25 bg-[#d6b25e]/10 text-[#e8ce8b]";
  return "border-white/10 bg-white/5 text-[#a99b84]";
}

function boolLabel(value: boolean) {
  return value ? "Oui" : "Non";
}

function parseTomeNumber(value: string) {
  const match = value.match(/(\d+)/);
  return match ? Number(match[1]) : null;
}

function chapterTitleFromFragment(fragment: Fragment) {
  return typeof fragment.chapitre === "string" && fragment.chapitre.trim() ? fragment.chapitre : "Aucun chapitre";
}

function tomeTitleFromFragment(fragment: Fragment, tomeMap: Map<number, string>) {
  if (typeof fragment.tomeId === "number" && tomeMap.has(fragment.tomeId)) return tomeMap.get(fragment.tomeId) || "Tome inconnu";
  if (fragment.tome?.trim()) return fragment.tome;
  return "Aucun tome";
}

function readLegacyWritingEntries() {
  if (typeof window === "undefined") return [];
  const entries: Array<{ key: string; tomeId: number; chapterTitle: string; text: string; wordCount: number }> = [];
  for (let index = 0; index < localStorage.length; index += 1) {
    const key = localStorage.key(index);
    if (!key || !key.startsWith("ecriture_")) continue;
    const match = key.match(/^ecriture_(\d+)_(.+)$/);
    if (!match) continue;
    const raw = localStorage.getItem(key) || "";
    const text = raw.trim();
    entries.push({
      key,
      tomeId: Number(match[1]),
      chapterTitle: decodeURIComponent(match[2]),
      text,
      wordCount: countWords(text),
    });
  }
  return entries;
}

function fragmentMatchesStructuredChapter(
  fragment: Fragment,
  tomeId: number,
  chapterTitle: string,
  chapterIndex: number,
) {
  const fragmentTome = typeof fragment.tomeId === "number" ? fragment.tomeId : parseTomeNumber(fragment.tome || "");
  if (fragmentTome !== tomeId) return false;
  if (fragment.chapitreId === createChapitreId(tomeId, chapterIndex)) return true;
  const label = normalizeLabel(fragment.chapitre || "");
  if (!label) return false;
  return label === normalizeLabel(chapterTitle) || label === normalizeLabel(`Chapitre ${chapterIndex}`) || label === String(chapterIndex);
}

function buildInventory(): InventoryView {
  const fragments = lireFragments();
  const memoires = lireMemoiresNarratives();
  const structureTomes = lireTomes();
  // LIVRE-P1A — lecture du manuscrit via les primitives Manuscrit (Tomes 2–4
  // canoniques) ; le modèle Biographie n'est pas concerné.
  const structureChapters = lireChapitresStructureParTome();
  const structureCanonique = lireEtatStructureCanonique();
  const relations = lireNarrativeRelationsAvecAutomatiques();
  const tome1Chapters = lireChapitresTome1DepuisStorage();
  const completeTome1 = getCompleteChapters({ chapters: tome1Chapters, fragments, relations, tomeId: 1 });
  const biographieInventory = createBiographieInventory(readBiographieProjetRaw());
  const migrationAudit = createBiographieMigrationAudit();
  const migrationDecision = createBiographieMigrationDecisionReport(migrationAudit);
  const legacyWritingEntries = readLegacyWritingEntries();

  const tomeTitles = new Map<number, string>(structureTomes.map((tome) => [tome.id, tome.id === 1 ? TITRE_TOME_1 : tome.titre]));

  const chapterRows: ChapterRow[] = completeTome1.map((chapter) => ({
    id: chapter.id,
    tomeTitle: TITRE_TOME_1,
    title: chapter.titre,
    linkedFragments: chapter.fragmentCount,
    wordCount: chapter.wordCount,
    status: chapterStatus(chapter.wordCount, chapter.fragmentCount),
  }));

  structureTomes
    .filter((tome) => tome.id !== 1)
    .forEach((tome) => {
      const chapters = structureChapters[tome.id] || [];
      chapters.forEach((chapter, index) => {
        const title = chapter.titre;
        const fragmentsLies = fragments.filter((fragment) => fragmentMatchesStructuredChapter(fragment, tome.id, title, index + 1));
        const memoiresLiees = memoires.filter(
          (memoire) => memoire.tomeProbable === tome.id && memoire.chapitreProbable === index + 1,
        );
        const legacyText = lireTexteChapitre(chapter).trim();
        const relatedText = [
          legacyText,
          ...fragmentsLies.map((fragment) => fragment.texte || ""),
          ...memoiresLiees.map((memoire) => memoire.texte || ""),
        ]
          .join("\n\n")
          .trim();
        const wordCount = countWords(relatedText);
        const linkedCount = fragmentsLies.length + memoiresLiees.length + (legacyText ? 1 : 0);
        chapterRows.push({
          id: createChapitreId(tome.id, index + 1),
          tomeTitle: tome.titre,
          title,
          linkedFragments: fragmentsLies.length,
          wordCount,
          status: chapterStatus(wordCount, linkedCount),
        });
      });
    });

  const tomeRows: TomeRow[] = structureTomes.map((tome) => {
    const relatedChapters = chapterRows.filter((chapter) => chapter.tomeTitle === (tome.id === 1 ? TITRE_TOME_1 : tome.titre));
    const relatedFragments = fragments.filter((fragment) => {
      const fragmentTome = typeof fragment.tomeId === "number" ? fragment.tomeId : parseTomeNumber(fragment.tome || "");
      return fragmentTome === tome.id;
    });
    return {
      id: `tome-${tome.id}`,
      title: tome.id === 1 ? TITRE_TOME_1 : tome.titre,
      chapterCount: relatedChapters.length,
      fragmentCount: relatedFragments.length,
      wordCount: relatedChapters.reduce((sum, chapter) => sum + chapter.wordCount, 0),
    };
  });

  const biographieWordCount = biographieInventory.chapitres.reduce((sum, chapter) => {
    const text = chapter.versionRedigee.trim() || chapter.texteBrut.trim();
    return sum + countWords(text);
  }, 0);

  const sources: SourceRow[] = [
    { name: "Tome 1 canonique", contentType: "chapitres rédigés", itemCount: tome1Chapters.length, wordCount: tome1Chapters.reduce((sum, chapter) => sum + compterMotsChapitreTome1(chapter), 0), status: "CANONIQUE" },
    { name: "Structure", contentType: "architecture des tomes et chapitres", itemCount: Object.values(structureChapters).reduce((sum, chapters) => sum + chapters.length, 0), wordCount: 0, status: "SECONDAIRE" },
    { name: "Chapitres Tomes 2–4 (canonique)", contentType: "textes des chapitres par identifiant stable", itemCount: structureCanonique.chapitres.filter((chapter) => countWords(lireContenuChapitre(chapter.id)) > 0).length, wordCount: structureCanonique.chapitres.reduce((sum, chapter) => sum + countWords(lireContenuChapitre(chapter.id)), 0), status: "CANONIQUE" },
    { name: "Écriture legacy", contentType: "textes libres liés à la structure", itemCount: legacyWritingEntries.filter((entry) => entry.wordCount > 0).length, wordCount: legacyWritingEntries.reduce((sum, entry) => sum + entry.wordCount, 0), status: "INCONNU" },
    { name: "Coffre / Fragments", contentType: "fragments narratifs", itemCount: fragments.length, wordCount: fragments.reduce((sum, fragment) => sum + countWords(fragment.texte || ""), 0), status: "SECONDAIRE" },
    { name: "Mémoires narratives", contentType: "souvenirs structurés", itemCount: memoires.length, wordCount: memoires.reduce((sum, memoire) => sum + countWords(memoire.texte || ""), 0), status: "SECONDAIRE" },
    { name: "Biographie historique", contentType: "chapitres legacy", itemCount: biographieInventory.chapitres.length, wordCount: biographieWordCount, status: "SECONDAIRE" },
  ];

  const dominantSource = [...sources].sort((left, right) => right.wordCount - left.wordCount)[0];
  const emptyChapters = chapterRows.filter((chapter) => chapter.status === "vide");
  const chaptersWithContent = chapterRows.filter((chapter) => chapter.status !== "vide");
  const fragmentsWithoutChapter = fragments.filter((fragment) => !String(fragment.chapitre || "").trim());
  const fragmentsWithoutTome = fragments.filter(
    (fragment) => typeof fragment.tomeId !== "number" && !String(fragment.tome || "").trim(),
  );
  const memoiresWithoutLink = memoires.filter((memoire) => !memoire.tomeProbable || !memoire.chapitreProbable);
  const orphanHistoricalChapters = biographieInventory.chapitres.filter((chapter) =>
    migrationAudit.comparison.orphanHistoricalChapterIds.includes(chapter.chapitreId),
  );
  // Tomes 2–4 : seul le constat de migration LIVRE-P1A fait foi (une clé
  // legacy importée reste présente mais est rattachée) ; autres tomes : inchangé.
  const legacyImportes = new Set(
    structureCanonique.importsLegacy.filter((entry) => entry.statut === STATUT_LEGACY_IMPORTE).map((entry) => entry.cleLegacy),
  );
  const unmatchedLegacyWriting = legacyWritingEntries.filter((entry) => {
    if (estTomeP1A(entry.tomeId)) return !legacyImportes.has(entry.key);
    const knownTitles = (structureChapters[entry.tomeId] || []).map((chapter) => normalizeLabel(chapter.titre));
    return !knownTitles.includes(normalizeLabel(entry.chapterTitle));
  });

  const fragmentsRows: FragmentRow[] = [...fragments]
    .sort((left, right) => String(right.date || "").localeCompare(String(left.date || "")))
    .map((fragment) => ({
      id: String(fragment.id),
      title: fragment.titre?.trim() || fragment.texte.slice(0, 48) || "Fragment sans titre",
      date: fragment.date || "Date inconnue",
      tomeTitle: tomeTitleFromFragment(fragment, tomeTitles),
      chapterTitle: chapterTitleFromFragment(fragment),
      integrated: Boolean(fragment.manuscrit),
    }));

  const orphanSections: OrphanSection[] = [
    {
      title: "Fragments sans chapitre",
      items: fragmentsWithoutChapter.map((fragment) => fragment.titre?.trim() || String(fragment.id)),
    },
    {
      title: "Fragments sans tome",
      items: fragmentsWithoutTome.map((fragment) => fragment.titre?.trim() || String(fragment.id)),
    },
    {
      title: "Chapitres sans contenu",
      items: emptyChapters.map((chapter) => `${chapter.tomeTitle} · ${chapter.title}`),
    },
    {
      title: "Contenus non reliés",
      items: [
        ...memoiresWithoutLink.map((memoire) => `Mémoire : ${memoire.titre}`),
        ...orphanHistoricalChapters.map((chapter) => `Biographie : ${chapter.chapitreTitre || chapter.chapitreId}`),
        ...unmatchedLegacyWriting.map((entry) => `Écriture legacy : ${entry.chapterTitle}`),
      ],
    },
  ];

  const risks: string[] = [];
  if (dominantSource && dominantSource.name !== "Tome 1 canonique") risks.push(`La majorité du texte semble encore vivre dans la source « ${dominantSource.name} ».`);
  if (fragments.filter((fragment) => !fragment.manuscrit).length > 0) risks.push("Des fragments restent dans le coffre sans être intégrés au manuscrit.");
  if (memoiresWithoutLink.length > 0) risks.push("Certaines mémoires narratives ne pointent vers aucun tome ou chapitre.");
  if (migrationDecision.decision !== "MIGRATION_SAFE") risks.push("La décision de migration actuelle n'est pas encore totalement sûre.");
  if (unmatchedLegacyWriting.length > 0) risks.push("Des textes legacy ne correspondent à aucun chapitre structurel connu.");

  const verdict: Verdict = {
    coherent: risks.length === 0 && chaptersWithContent.length > 0,
    migrationRecommended: migrationDecision.decision === "MIGRATION_SAFE" && risks.length === 0,
    risks,
    summary: dominantSource
      ? `La source la plus fournie est « ${dominantSource.name} » avec environ ${dominantSource.wordCount} mots détectés.`
      : "Aucune source manuscrite significative n'a été détectée.",
  };

  return {
    summary: [
      { label: "Tomes", value: tomeRows.length },
      { label: "Chapitres", value: chapterRows.length },
      { label: "Fragments", value: fragments.length },
      { label: "Chapitres vides", value: emptyChapters.length },
      { label: "Chapitres avec contenu", value: chaptersWithContent.length },
      { label: "Fragments non intégrés", value: fragments.filter((fragment) => !fragment.manuscrit).length },
    ],
    tomes: tomeRows,
    chapters: chapterRows,
    fragments: fragmentsRows,
    orphans: orphanSections,
    sources,
    verdict,
  };
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-[10px] border border-[#d6b25e]/10 bg-black/15 px-3 py-2">
      <p className="m-0 text-[10px] uppercase tracking-[0.14em] text-[#8f816c]">{label}</p>
      <p className="mt-1 text-lg font-semibold text-[#f5efe3]">{value}</p>
    </div>
  );
}

export default function BiographieInventairePage() {
  const [inventory, setInventory] = useState<InventoryView | null>(null);

  useEffect(() => {
    setInventory(buildInventory());
  }, []);

  return (
    <main className="min-h-screen bg-[#0d0c0a] px-4 py-6 text-[#f5efe3] sm:px-6">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-4">
        <header className="border-b border-[#d6b25e]/10 pb-4">
          <Link className="text-xs text-[#d6b25e] transition hover:text-[#f5efe3]" href="/biographie">
            ← Biographie
          </Link>
          <h1 className="mt-3 text-2xl font-semibold tracking-tight sm:text-3xl">Inventaire manuscrit</h1>
          <p className="mt-1 text-sm text-[#a99b84]">Lecture seule — cette page localise les contenus sans rien modifier.</p>
        </header>

        {!inventory ? (
          <section className={panelClass}>
            <p className="text-sm text-[#a99b84]">Lecture des sources manuscrites…</p>
          </section>
        ) : (
          <>
            <section className={panelClass}>
              <p className="text-[10px] uppercase tracking-[0.16em] text-[#d6b25e]">Résumé global</p>
              <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
                {inventory.summary.map((item) => (
                  <Metric key={item.label} label={item.label} value={item.value} />
                ))}
              </div>
            </section>

            <section className={panelClass}>
              <h2 className="text-lg font-semibold">Tomes</h2>
              <div className="mt-3 grid gap-2 md:grid-cols-2">
                {inventory.tomes.map((tome) => (
                  <article className="rounded-[10px] border border-[#d6b25e]/10 bg-black/15 p-3" key={tome.id}>
                    <h3 className="text-sm font-medium">{tome.title}</h3>
                    <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-[#a99b84]">
                      <span>{tome.chapterCount} chapitre(s)</span>
                      <span>{tome.fragmentCount} fragment(s)</span>
                      <span>{tome.wordCount} mots estimés</span>
                    </div>
                  </article>
                ))}
              </div>
            </section>

            <section className={panelClass}>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h2 className="text-lg font-semibold">Chapitres</h2>
                <p className="text-xs text-[#a99b84]">vide = 0 mot et aucune liaison · partiel = &lt; 700 mots · développé = ≥ 700 mots</p>
              </div>
              <div className="mt-3 space-y-2">
                {inventory.chapters.map((chapter) => (
                  <article className="rounded-[10px] border border-white/[0.06] bg-black/15 px-3 py-2" key={chapter.id}>
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <p className="text-[11px] uppercase tracking-[0.12em] text-[#8f816c]">{chapter.tomeTitle}</p>
                        <p className="text-sm font-medium">{chapter.title}</p>
                      </div>
                      <span className={`rounded-full border px-2 py-0.5 text-[10px] ${statusClass(chapter.status)}`}>{chapter.status}</span>
                    </div>
                    <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-[#a99b84]">
                      <span>{chapter.linkedFragments} fragment(s) liés</span>
                      <span>{chapter.wordCount} mots estimés</span>
                    </div>
                  </article>
                ))}
              </div>
            </section>

            <section className={panelClass}>
              <h2 className="text-lg font-semibold">Fragments</h2>
              <div className="mt-3 space-y-2">
                {inventory.fragments.map((fragment) => (
                  <article className="rounded-[10px] border border-white/[0.06] bg-black/15 px-3 py-2" key={fragment.id}>
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="text-sm font-medium">{fragment.title}</p>
                      <span className={`rounded-full border px-2 py-0.5 text-[10px] ${statusClass(fragment.integrated ? "SECONDAIRE" : "INCONNU")}`}>
                        intégré : {boolLabel(fragment.integrated)}
                      </span>
                    </div>
                    <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-[#a99b84]">
                      <span>{fragment.date}</span>
                      <span>{fragment.tomeTitle}</span>
                      <span>{fragment.chapterTitle}</span>
                    </div>
                  </article>
                ))}
              </div>
            </section>

            <section className={panelClass}>
              <h2 className="text-lg font-semibold">Orphelins</h2>
              <div className="mt-3 grid gap-3 lg:grid-cols-2">
                {inventory.orphans.map((section) => (
                  <article className="rounded-[10px] border border-[#d6b25e]/10 bg-black/15 p-3" key={section.title}>
                    <h3 className="text-sm font-medium">{section.title}</h3>
                    <ul className="mt-2 space-y-1 text-xs text-[#d8d2c6]">
                      {section.items.length ? section.items.map((item) => <li key={item}>— {item}</li>) : <li>Aucun élément détecté.</li>}
                    </ul>
                  </article>
                ))}
              </div>
            </section>

            <section className={panelClass}>
              <h2 className="text-lg font-semibold">Sources canoniques détectées</h2>
              <div className="mt-3 grid gap-2 md:grid-cols-2">
                {inventory.sources.map((source) => (
                  <article className="rounded-[10px] border border-white/[0.06] bg-black/15 p-3" key={source.name}>
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="text-sm font-medium">{source.name}</p>
                      <span className={`rounded-full border px-2 py-0.5 text-[10px] ${statusClass(source.status)}`}>{source.status}</span>
                    </div>
                    <p className="mt-1 text-xs text-[#8f816c]">{source.contentType}</p>
                    <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-[#a99b84]">
                      <span>{source.itemCount} élément(s)</span>
                      <span>{source.wordCount} mots estimés</span>
                    </div>
                  </article>
                ))}
              </div>
            </section>

            <section className={`${panelClass} border-[#d6b25e]/20`}>
              <p className="text-[10px] uppercase tracking-[0.16em] text-[#d6b25e]">Verdict</p>
              <div className="mt-3 grid gap-3 lg:grid-cols-2">
                <div className="rounded-[10px] border border-white/[0.06] bg-black/15 p-3">
                  <p className="text-sm text-[#e7dcc9]">Manuscrit cohérent : <span className="font-medium text-[#f5efe3]">{boolLabel(inventory.verdict.coherent)}</span></p>
                  <p className="mt-2 text-sm text-[#e7dcc9]">Migration recommandée : <span className="font-medium text-[#f5efe3]">{boolLabel(inventory.verdict.migrationRecommended)}</span></p>
                  <p className="mt-3 text-sm leading-6 text-[#d8d2c6]">{inventory.verdict.summary}</p>
                </div>
                <div className="rounded-[10px] border border-white/[0.06] bg-black/15 p-3">
                  <h3 className="text-sm font-medium">Risques détectés</h3>
                  <ul className="mt-2 space-y-1 text-xs text-[#d8d2c6]">
                    {inventory.verdict.risks.length ? inventory.verdict.risks.map((risk) => <li key={risk}>— {risk}</li>) : <li>Aucun risque majeur détecté.</li>}
                  </ul>
                </div>
              </div>
            </section>
          </>
        )}
      </div>
    </main>
  );
}
