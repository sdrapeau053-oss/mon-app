"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { SystemPageShell } from "@/components/system-ui";
import { BackLink } from "@/components/ui/back-link";
import { readContinuity } from "@/lib/continuity";
import { lireFragments } from "@/lib/fragments";
import { lireMemoiresNarratives } from "@/lib/memoire-narrative";
import {
  getDateModificationChapitreTome1,
  getNumeroChapitreTome1,
  getStatutEditorialChapitreTome1,
  lireChapitresTome1DepuisStorage,
} from "@/lib/tome1-chapters";

type Chapter = {
  id: string;
  titre: string;
  tome: number;
  statut: "a_ecrire" | "brouillon" | "revision" | "final";
  derniereModification: string;
};

type Memory = {
  id: string;
  titre: string;
  age: string;
  lieu: string;
  sensation: string;
  fragment: string;
  date: string;
};

type BookHeadquartersData = {
  activeChapter: Chapter | null;
  chapters: Chapter[];
  latestMemory: Memory | null;
};

const statusLabels: Record<Chapter["statut"], string> = {
  a_ecrire: "À écrire",
  brouillon: "Brouillon",
  final: "Final",
  revision: "Révision",
};

function formatDate(value: string) {
  if (!value) return "Aucune date";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Aucune date";
  return new Intl.DateTimeFormat("fr-CA", { dateStyle: "medium" }).format(date);
}

function dateValue(value: string) {
  const parsed = new Date(value).getTime();
  return Number.isNaN(parsed) ? 0 : parsed;
}

function normalizeChapterStatus(statut: string, hasContent: boolean): Chapter["statut"] {
  if (statut === "validé") return "final";
  if (statut === "à réviser") return "revision";
  if (statut === "brouillon" || hasContent) return "brouillon";
  return "a_ecrire";
}

function buildHeadquartersData(): BookHeadquartersData {
  const continuity = readContinuity();
  const chapters = lireChapitresTome1DepuisStorage().map((chapter): Chapter => {
    const editorialStatus = getStatutEditorialChapitreTome1(chapter);
    return {
      derniereModification: getDateModificationChapitreTome1(chapter),
      id: chapter.id,
      statut: normalizeChapterStatus(editorialStatus, Boolean(chapter.contenu?.trim())),
      titre: chapter.titre || `Chapitre ${getNumeroChapitreTome1(chapter.id)}`,
      tome: 1,
    };
  });

  const continuityChapter =
    (continuity.lastChapterId && chapters.find((chapter) => chapter.id === continuity.lastChapterId)) ||
    (continuity.lastChapter
      ? chapters.find((chapter) => continuity.lastChapter?.includes(String(getNumeroChapitreTome1(chapter.id))))
      : null);

  const mostRecentChapter = [...chapters]
    .filter((chapter) => chapter.derniereModification)
    .sort((a, b) => dateValue(b.derniereModification) - dateValue(a.derniereModification))[0];

  const activeChapter =
    continuityChapter ||
    mostRecentChapter ||
    chapters.find((chapter) => chapter.statut !== "final") ||
    chapters[0] ||
    null;

  const memoires = lireMemoiresNarratives().map((memoire): Memory => ({
    age: memoire.ageApprox || memoire.periode,
    date: memoire.createdAt,
    fragment: memoire.texte,
    id: memoire.id,
    lieu: memoire.motifs?.[0] || "Non situé",
    sensation: memoire.type,
    titre: memoire.titre,
  }));

  const fragments = lireFragments().map((fragment): Memory => ({
    age: fragment.age !== null && fragment.age !== undefined ? String(fragment.age) : fragment.periode || "Non daté",
    date: fragment.date || "",
    fragment: fragment.texte,
    id: String(fragment.id),
    lieu: fragment.source || fragment.tags[0] || "Non situé",
    sensation: fragment.tags[1] || fragment.type || "souvenir",
    titre: fragment.titre || fragment.tags[0] || "Souvenir sans titre",
  }));

  const latestMemory = [...memoires, ...fragments].sort((a, b) => dateValue(b.date) - dateValue(a.date))[0] || null;

  return { activeChapter, chapters, latestMemory };
}

function PrimaryAction({ children, href }: { children: React.ReactNode; href: string }) {
  return (
    <Link
      className="inline-flex h-7 items-center justify-center rounded-full border border-[#d6b25e]/34 bg-[#d6b25e] px-3.5 text-[10px] font-semibold leading-none text-[#15110d] no-underline transition hover:bg-[#efd17a]"
      href={href}
    >
      {children}
    </Link>
  );
}

function SecondaryAction({ children, href }: { children: React.ReactNode; href: string }) {
  return (
    <Link
      className="inline-flex h-6 items-center justify-center rounded-full border border-[#d6b25e]/14 bg-transparent px-2.5 text-[10px] font-semibold leading-none text-[#d8cbb5] no-underline transition hover:border-[#d6b25e]/34 hover:text-[#f1e7d5]"
      href={href}
    >
      {children}
    </Link>
  );
}

function QuietCard({
  action,
  children,
  href,
  label,
}: {
  action: string;
  children: React.ReactNode;
  href: string;
  label: string;
}) {
  return (
    <article className="h-[120px] overflow-hidden rounded-[20px] border border-[#d6b25e]/10 bg-[#0f0d0a]/46 px-4 py-3 shadow-[0_12px_34px_rgba(0,0,0,0.10)]">
      <div className="flex flex-nowrap items-center justify-between gap-2">
        <p className="truncate text-[9px] font-bold uppercase tracking-[0.16em] text-[#a99b84]">{label}</p>
        <SecondaryAction href={href}>{action}</SecondaryAction>
      </div>
      {children}
    </article>
  );
}

export default function HeritageDesSilencesPage() {
  const [data, setData] = useState<BookHeadquartersData | null>(null);

  useEffect(() => {
    const refresh = () => setData(buildHeadquartersData());
    refresh();
    window.addEventListener("storage", refresh);
    return () => window.removeEventListener("storage", refresh);
  }, []);

  if (!data) {
    return (
      <main className="internal-page">
        <SystemPageShell maxWidth={920}>
          <p className="internal-subtitle">Ouverture du quartier général…</p>
        </SystemPageShell>
      </main>
    );
  }

  const activeChapterNumber = data.activeChapter ? getNumeroChapitreTome1(data.activeChapter.id) : null;
  const nextAction = data.chapters.length === 0 ? "Créer votre premier chapitre" : "Continuer le dernier chapitre travaillé";

  return (
    <main className="internal-page">
      <SystemPageShell maxWidth={980} padding="8px 14px 18px">
        <div className="flex min-h-[calc(100vh-74px)] flex-col justify-center">
        <header className="internal-header" style={{ marginBottom: 12, minHeight: 0 }}>
          <div className="flex flex-wrap items-center gap-2">
            <BackLink label="Centre" href="/centre-de-controle" />
            <p className="internal-kicker" style={{ margin: 0 }}>Écriture</p>
          </div>
          <h1 className="internal-title" style={{ fontSize: 28, lineHeight: 1, margin: "5px 0 0" }}>L’Héritage des Silences</h1>
          <div className="mt-1 flex flex-wrap items-center gap-2">
            <p className="internal-subtitle" style={{ fontSize: 12, lineHeight: 1.25, margin: 0 }}>Quartier général du manuscrit</p>
            <SecondaryAction href="/structure-tome-1">Structure Tome 1</SecondaryAction>
          </div>
        </header>

        <section className="mb-3 h-[96px] overflow-hidden rounded-[20px] border border-[#d6b25e]/12 bg-[#14110d] px-4 py-3 shadow-[0_14px_42px_rgba(0,0,0,0.12)]">
          <div className="grid h-full gap-3 md:grid-cols-[minmax(0,1fr)_auto] md:items-center">
            <div style={{ minWidth: 0 }}>
              <p className="text-[8.5px] font-bold uppercase tracking-[0.15em] text-[#d6b25e]">Écrire maintenant</p>
              <h2 className="mt-1 font-serif text-xl font-semibold leading-none text-[#f1e7d5]">
                {data.activeChapter ? `Chapitre ${activeChapterNumber}` : "Nouveau chapitre"}
              </h2>
              <p className="mt-1 truncate text-[11px] leading-4 text-[#c7bda9]">
                {data.activeChapter ? data.activeChapter.titre : "Créer votre premier chapitre"}
              </p>
            </div>
            <PrimaryAction href="/ecrire-maintenant">
              {data.chapters.length === 0 ? "Créer un chapitre" : "ÉCRIRE MAINTENANT"}
            </PrimaryAction>
          </div>
        </section>

        <div className="grid gap-3 md:grid-cols-3">
          <QuietCard action="Continuer" href="/ecrire-maintenant" label="Dernier chapitre travaillé">
            <div className="mt-1.5 grid gap-1.5">
              <div className="flex items-center gap-2">
                <p className="font-serif text-xl leading-none text-[#d6b25e]">
                  {activeChapterNumber ? String(activeChapterNumber).padStart(2, "0") : "—"}
                </p>
                <span className="w-fit rounded-full border border-[#d6b25e]/14 px-1.5 py-0.5 text-[9px] leading-none text-[#d8cbb5]">
                  {data.activeChapter ? statusLabels[data.activeChapter.statut] : "À créer"}
                </span>
              </div>
              <div style={{ minWidth: 0 }}>
                <p className="truncate text-xs font-semibold text-[#f1e7d5]">
                  {data.activeChapter ? data.activeChapter.titre : "Aucun chapitre"}
                </p>
                <p className="mt-0.5 truncate text-[10px] text-[#a99b84]">
                  {data.activeChapter
                    ? `Dernière modification · ${formatDate(data.activeChapter.derniereModification)}`
                    : "Le manuscrit attend son premier chapitre."}
                </p>
              </div>
            </div>
          </QuietCard>

          <QuietCard action="Voir" href="/memoires" label="Dernier souvenir ajouté">
            <div className="mt-1.5 grid gap-1.5">
              <div style={{ minWidth: 0 }}>
                <p className="truncate text-xs font-semibold text-[#f1e7d5]">
                  {data.latestMemory ? data.latestMemory.titre : "Aucun souvenir ajouté"}
                </p>
                <p className="mt-0.5 truncate text-[10px] text-[#a99b84]">
                  {data.latestMemory
                    ? `${data.latestMemory.age} · ${formatDate(data.latestMemory.date)}`
                    : "Les souvenirs apparaîtront ici dès leur ajout."}
                </p>
              </div>
              {data.latestMemory ? (
                <span className="w-fit rounded-full border border-[#d6b25e]/14 px-1.5 py-0.5 text-[9px] leading-none text-[#d8cbb5]">
                  {data.latestMemory.sensation}
                </span>
              ) : null}
            </div>
          </QuietCard>

          <QuietCard action={data.chapters.length === 0 ? "Créer" : "Continuer"} href="/ecrire-maintenant" label="Prochaine action">
            <p className="mt-2 line-clamp-2 font-serif text-base leading-snug text-[#f1e7d5]">{nextAction}</p>
          </QuietCard>
        </div>
        </div>
      </SystemPageShell>
    </main>
  );
}
