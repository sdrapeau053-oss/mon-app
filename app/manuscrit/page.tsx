"use client";

import { BackLink } from "@/components/ui/back-link";
import { useEffect, useMemo, useState } from "react";

type StatutChapitre = "à écrire" | "écrit" | "scellé";

type ChapitreManuscrit = {
  id: string;
  titre: string;
  bloc: number;
  type: string;
  statut: StatutChapitre;
  contenu: string;
};

type PageManuscrit =
  | { kind: "cover"; pageNumber: null }
  | { kind: "title"; pageNumber: null }
  | { chapter: ChapitreManuscrit; kind: "chapter-title"; pageNumber: number }
  | { chapter: ChapitreManuscrit; content: string; kind: "chapter-body"; pageNumber: number };

const CHAPITRES_TOME_1_KEY = "chapitres-tome-1";
const CARACTERES_PAR_PAGE = 1850;

const chapitresDefaut: ChapitreManuscrit[] = [
  {
    id: "chapitre-1",
    titre: "Le corps avant la mémoire",
    bloc: 1,
    type: "fondation",
    statut: "scellé",
    contenu: "",
  },
  {
    id: "chapitre-2",
    titre: "La poupée",
    bloc: 1,
    type: "fondation",
    statut: "scellé",
    contenu: "",
  },
  {
    id: "chapitre-3",
    titre: "Ce que la nuit contenait",
    bloc: 1,
    type: "fondation",
    statut: "à écrire",
    contenu: "",
  },
  {
    id: "chapitre-4",
    titre: "Le bois et le métal",
    bloc: 1,
    type: "fondation",
    statut: "scellé",
    contenu: "",
  },
  {
    id: "chapitre-5",
    titre: "L’ombre du témoin",
    bloc: 2,
    type: "sévère",
    statut: "à écrire",
    contenu: "",
  },
  {
    id: "chapitre-6",
    titre: "L’angle mort",
    bloc: 2,
    type: "sévère",
    statut: "à écrire",
    contenu: "",
  },
];

function numeroChapitre(id: string) {
  return Number(id.match(/\d+/)?.[0] || 0);
}

function normaliserChapitre(chapitre: Partial<ChapitreManuscrit>, fallback: ChapitreManuscrit) {
  return {
    ...fallback,
    ...chapitre,
    id: typeof chapitre.id === "string" ? chapitre.id : fallback.id,
    titre: typeof chapitre.titre === "string" && chapitre.titre.trim() ? chapitre.titre : fallback.titre,
    bloc: typeof chapitre.bloc === "number" ? chapitre.bloc : fallback.bloc,
    type: typeof chapitre.type === "string" && chapitre.type.trim() ? chapitre.type : fallback.type,
    statut:
      chapitre.statut === "écrit" || chapitre.statut === "scellé" || chapitre.statut === "à écrire"
        ? chapitre.statut
        : fallback.statut,
    contenu: typeof chapitre.contenu === "string" ? chapitre.contenu : fallback.contenu,
  };
}

function lireChapitresTome1() {
  if (typeof window === "undefined") return chapitresDefaut;

  try {
    const saved = localStorage.getItem(CHAPITRES_TOME_1_KEY);
    const parsed = saved ? (JSON.parse(saved) as Partial<ChapitreManuscrit>[]) : [];
    const byId = new Map(parsed.map((chapitre) => [chapitre.id, chapitre]));

    return chapitresDefaut
      .map((chapitre) => normaliserChapitre(byId.get(chapitre.id) || {}, chapitre))
      .sort((a, b) => numeroChapitre(a.id) - numeroChapitre(b.id));
  } catch {
    return chapitresDefaut;
  }
}

function decouperEnPages(contenu: string) {
  const texte = contenu.trim();
  if (!texte) return [];

  const paragraphes = texte.split(/\n{2,}/).map((paragraphe) => paragraphe.trim()).filter(Boolean);
  const pages: string[] = [];
  let page = "";

  paragraphes.forEach((paragraphe) => {
    const bloc = page ? `${page}\n\n${paragraphe}` : paragraphe;

    if (bloc.length > CARACTERES_PAR_PAGE && page) {
      pages.push(page);
      page = paragraphe;
      return;
    }

    if (paragraphe.length > CARACTERES_PAR_PAGE) {
      const phrases = paragraphe.match(/[^.!?]+[.!?]+|\S.+$/g) || [paragraphe];
      phrases.forEach((phrase) => {
        const prochainBloc = page ? `${page} ${phrase.trim()}` : phrase.trim();
        if (prochainBloc.length > CARACTERES_PAR_PAGE && page) {
          pages.push(page);
          page = phrase.trim();
        } else {
          page = prochainBloc;
        }
      });
      return;
    }

    page = bloc;
  });

  if (page) pages.push(page);

  return pages;
}

function creerPages(chapitres: ChapitreManuscrit[]) {
  const pages: PageManuscrit[] = [
    { kind: "cover", pageNumber: null },
    { kind: "title", pageNumber: null },
  ];
  let pageNumber = 1;

  chapitres.forEach((chapitre) => {
    pages.push({ chapter: chapitre, kind: "chapter-title", pageNumber });
    pageNumber += 1;

    decouperEnPages(chapitre.contenu).forEach((content) => {
      pages.push({ chapter: chapitre, content, kind: "chapter-body", pageNumber });
      pageNumber += 1;
    });
  });

  return pages;
}

function formaterVersionManuscrit(chapitres: ChapitreManuscrit[]) {
  const lignes = [
    "L’HÉRITAGE DES SILENCES",
    "Léna Montand",
    "",
    "",
  ];

  chapitres.forEach((chapitre) => {
    lignes.push(`CHAPITRE ${numeroChapitre(chapitre.id)} — ${chapitre.titre.toUpperCase()}`, "");
    lignes.push(chapitre.contenu.trim() || "[Chapitre sans texte pour le moment]", "", "");
  });

  return lignes.join("\n");
}

export default function ManuscritPage() {
  const [chapitres, setChapitres] = useState<ChapitreManuscrit[]>(chapitresDefaut);
  const [copie, setCopie] = useState(false);

  useEffect(() => {
    setChapitres(lireChapitresTome1());
  }, []);

  const pages = useMemo(() => creerPages(chapitres), [chapitres]);
  const chapitresRemplis = chapitres.filter((chapitre) => chapitre.contenu.trim()).length;

  const copierManuscrit = async () => {
    await navigator.clipboard.writeText(formaterVersionManuscrit(chapitres));
    setCopie(true);
    window.setTimeout(() => setCopie(false), 1600);
  };

  return (
    <main className="min-h-screen bg-[#17130f] px-4 py-6 text-[#efe7d6] sm:px-6 lg:px-10">
      <header className="mx-auto mb-8 flex w-full max-w-6xl flex-col gap-4 border-b border-[#d6b25e]/20 pb-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <BackLink label="Système" />
          <p className="mt-5 text-xs uppercase tracking-[0.24em] text-[#d6b25e]">Mode lecture</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-[-0.04em] text-[#f7efe0] sm:text-4xl">
            Manuscrit
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-[#b8aa91]">
            Vue imprimée du Tome 1. Lecture seule, sans édition directe.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <span className="rounded-full border border-[#d6b25e]/25 bg-[#1f1a14] px-4 py-2 text-xs text-[#cdbf9f]">
            {chapitresRemplis}/{chapitres.length} chapitres remplis
          </span>
          <button
            className="rounded-full border border-[#d6b25e]/45 bg-[#d6b25e] px-5 py-2 text-sm font-semibold text-[#17130f] transition hover:-translate-y-0.5 hover:bg-[#e0bf72] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#d6b25e]"
            onClick={copierManuscrit}
            type="button"
          >
            {copie ? "Copié" : "Copier version manuscrit"}
          </button>
        </div>
      </header>

      <section className="mx-auto grid max-w-6xl gap-8">
        {pages.map((page, index) => (
          <article
            className="mx-auto flex min-h-[min(83vh,900px)] w-full max-w-[680px] flex-col bg-[#fbf5e8] px-10 py-12 text-[#211d18] shadow-[0_26px_80px_rgba(0,0,0,0.38)] sm:px-14 sm:py-16 lg:min-h-[900px] lg:w-[6in]"
            key={`${page.kind}-${index}`}
          >
            {page.kind === "cover" && (
              <div className="flex flex-1 flex-col items-center justify-center text-center">
                <p className="mb-8 text-xs uppercase tracking-[0.28em] text-[#8f7a50]">Manuscrit</p>
                <h2 className="max-w-sm text-5xl font-semibold leading-[0.96] tracking-[-0.06em]">
                  L’Héritage des Silences
                </h2>
                <div className="my-10 h-px w-24 bg-[#b59a5c]" />
                <p className="text-lg tracking-[0.12em] text-[#4f4434]">Léna Montand</p>
              </div>
            )}

            {page.kind === "title" && (
              <div className="flex flex-1 flex-col justify-center text-center">
                <p className="text-sm uppercase tracking-[0.24em] text-[#8f7a50]">Tome 1</p>
                <h2 className="mt-8 text-4xl font-semibold leading-tight tracking-[-0.04em]">
                  L’Héritage des Silences
                </h2>
                <p className="mt-8 text-base text-[#4f4434]">Léna Montand</p>
              </div>
            )}

            {page.kind === "chapter-title" && (
              <div className="flex flex-1 flex-col justify-center">
                <p className="text-center text-xs uppercase tracking-[0.24em] text-[#8f7a50]">
                  Chapitre {numeroChapitre(page.chapter.id)}
                </p>
                <h2 className="mx-auto mt-7 max-w-md text-center text-3xl font-semibold leading-tight tracking-[-0.035em]">
                  {page.chapter.titre}
                </h2>
                {!page.chapter.contenu.trim() && (
                  <p className="mx-auto mt-10 max-w-xs text-center text-sm italic leading-7 text-[#84755f]">
                    Chapitre sans texte pour le moment.
                  </p>
                )}
              </div>
            )}

            {page.kind === "chapter-body" && (
              <div className="flex flex-1 flex-col">
                <p className="mb-10 text-center text-[11px] uppercase tracking-[0.2em] text-[#9b8c70]">
                  {page.chapter.titre}
                </p>
                <div className="prose-manuscrit whitespace-pre-wrap text-[1.02rem] leading-[1.95]">
                  {page.content}
                </div>
              </div>
            )}

            {page.pageNumber && (
              <footer className="mt-auto pt-10 text-center text-xs text-[#8f8068]">
                {page.pageNumber}
              </footer>
            )}
          </article>
        ))}
      </section>
    </main>
  );
}
