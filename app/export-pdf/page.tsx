"use client";

import Link from "next/link";
import "./print.css";
import {
  DEFAULT_BOOK_SETTINGS,
  lireBookSettings,
  type BookSettings,
} from "@/lib/book-settings";
import {
  compterMotsChapitreTome1,
  getChapitresTome1Ecrits,
  getDateModificationChapitreTome1,
  getNumeroChapitreTome1,
  getStatutEditorialChapitreTome1,
  lireChapitresTome1DepuisStorage,
  type ChapitreTome1,
} from "@/lib/tome1-chapters";
import { type ReactNode, useEffect, useMemo, useState } from "react";

type ExportMode = "lecture" | "editeur" | "impression";

type ExportPage = {
  chapterId?: string;
  className: string;
  content: ReactNode;
  id: string;
  tocLabel?: string;
};

const MODE_LABELS: Record<ExportMode, string> = {
  editeur: "Éditeur",
  impression: "Impression",
  lecture: "Lecture",
};

function pageSide(index: number) {
  return index % 2 === 0 ? "page-recto" : "page-verso";
}

function pageClass(index: number, className = "", sansPagination = false) {
  return [
    "book-print-page",
    pageSide(index),
    sansPagination ? "export-no-pagination" : "",
    className,
  ]
    .filter(Boolean)
    .join(" ");
}

function PageChrome({
  titreChapitre,
  titreLivre,
  titreTome,
  sansPagination = false,
}: {
  titreChapitre?: string;
  titreLivre: string;
  titreTome: string;
  sansPagination?: boolean;
}) {
  return (
    <>
      <div className="export-running-header" aria-hidden="true">
        <span className="export-running-recto">{titreLivre}</span>
        <span className="export-running-verso">{titreChapitre || titreTome}</span>
      </div>
      {!sansPagination && <span className="export-page-number" aria-hidden="true" />}
    </>
  );
}

function formaterTitreChapitre(chapitre: ChapitreTome1) {
  return `Chapitre ${getNumeroChapitreTome1(chapitre.id)} — ${chapitre.titre}`;
}

function nombreChapitreDepuisTexte(value: string) {
  const arabe = Number(value);
  if (Number.isFinite(arabe)) return arabe;

  const romans: Record<string, number> = {
    i: 1,
    ii: 2,
    iii: 3,
    iv: 4,
    v: 5,
    vi: 6,
    vii: 7,
    viii: 8,
    ix: 9,
    x: 10,
    xi: 11,
    xii: 12,
    xiii: 13,
    xiv: 14,
    xv: 15,
    xvi: 16,
    xvii: 17,
    xviii: 18,
    xix: 19,
    xx: 20,
    xxi: 21,
    xxii: 22,
    xxiii: 23,
    xxiv: 24,
    xxv: 25,
    xxvi: 26,
    xxvii: 27,
    xxviii: 28,
    xxix: 29,
    xxx: 30,
  };

  return romans[value.toLowerCase()] || 0;
}

function getChapitresPourMode(chapitres: ChapitreTome1[], mode: ExportMode) {
  if (mode === "editeur") return chapitres;
  return getChapitresTome1Ecrits(chapitres);
}

function getParagraphes(chapitre: ChapitreTome1) {
  const numero = getNumeroChapitreTome1(chapitre.id);
  const titreNormalise = chapitre.titre
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[’']/g, "'")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();

  return chapitre.contenu
    .trim()
    .split(/\n{2,}/)
    .map((paragraphe) => paragraphe.trim())
    .filter(Boolean)
    .filter((paragraphe, index) => {
      if (index > 1) return true;

      const ligne = paragraphe
        .replace(/\n+/g, " ")
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[’']/g, "'")
        .replace(/\s+/g, " ")
        .trim()
        .toLowerCase();
      const match = ligne.match(/^chapitre\s+(\d+|[ivxlcdm]+)\s*[—–-]\s*(.+)$/i);

      if (!match) return true;

      const numeroLigne = nombreChapitreDepuisTexte(match[1]);
      const titreLigne = match[2].trim();

      return !(numeroLigne === numero && titreLigne === titreNormalise);
    });
}

function formatDate(value: string) {
  if (!value) return "—";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  return new Intl.DateTimeFormat("fr-CA", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
}

export default function ExportPdfPage() {
  const [chapitres, setChapitres] = useState<ChapitreTome1[]>([]);
  const [currentPage, setCurrentPage] = useState(0);
  const [settings, setSettings] = useState<BookSettings>(DEFAULT_BOOK_SETTINGS);
  const [mode, setMode] = useState<ExportMode>("lecture");

  useEffect(() => {
    setChapitres(lireChapitresTome1DepuisStorage());
    setSettings(lireBookSettings());
  }, []);

  const chapitresAffiches = useMemo(() => getChapitresPourMode(chapitres, mode), [chapitres, mode]);

  const pages = useMemo<ExportPage[]>(() => {
    const bookPages: ExportPage[] = [
      {
        id: "half-title",
        className: pageClass(0, "export-half-title", true),
        content: (
          <>
            <PageChrome sansPagination titreLivre={settings.titreLivre} titreTome={settings.titreTome} />
            <h1>{settings.titreLivre}</h1>
          </>
        ),
      },
      {
        id: "blank",
        className: pageClass(1, "export-blank-page", true),
        content: (
          <>
            <PageChrome sansPagination titreLivre={settings.titreLivre} titreTome={settings.titreTome} />
            <p>Cette page est intentionnellement laissée blanche</p>
          </>
        ),
      },
      {
        id: "title",
        className: pageClass(2, "export-title-page", true),
        content: (
          <>
            <PageChrome sansPagination titreLivre={settings.titreLivre} titreTome={settings.titreTome} />
            <p className="export-kicker">Manuscrit</p>
            <h1>{settings.titreLivre}</h1>
            <p className="export-tome">{settings.titreTome}</p>
            <p className="export-author">{settings.auteur}</p>
          </>
        ),
      },
      {
        id: "rights",
        className: pageClass(3, "export-rights-page"),
        content: (
          <>
            <PageChrome titreLivre={settings.titreLivre} titreTome={settings.titreTome} />
            <p>© {settings.auteur}. Tous droits réservés.</p>
            <p>Version de travail — ne pas diffuser sans autorisation.</p>
          </>
        ),
      },
      {
        id: "dedicace",
        className: pageClass(4, "export-front-section"),
        content: (
          <>
            <PageChrome titreLivre={settings.titreLivre} titreTome={settings.titreTome} />
            <h2>Dédicace</h2>
            <p className="export-placeholder">{settings.dedicace.trim() || "[Dédicace à compléter]"}</p>
          </>
        ),
      },
      {
        id: "epigraphe",
        className: pageClass(5, "export-front-section"),
        content: (
          <>
            <PageChrome titreLivre={settings.titreLivre} titreTome={settings.titreTome} />
            <h2>Épigraphe</h2>
            <p className="export-placeholder">{settings.epigraphe.trim() || "[Épigraphe à compléter]"}</p>
          </>
        ),
      },
      {
        id: "note-autrice",
        className: pageClass(6, "export-front-section"),
        content: (
          <>
            <PageChrome titreLivre={settings.titreLivre} titreTome={settings.titreTome} />
            <h2>Note de l’autrice</h2>
            <p className="export-placeholder">{settings.noteAutrice.trim() || "[Note de l’autrice à compléter]"}</p>
          </>
        ),
      },
      {
        id: "toc",
        className: pageClass(7, "export-toc"),
        content: (
          <>
            <PageChrome titreLivre={settings.titreLivre} titreTome={settings.titreTome} />
            <h2>Table des matières</h2>
            <p className="export-note">
              Les numéros de page ne sont pas affichés, car la pagination finale dépend du moteur
              d’impression du navigateur.
            </p>

            {chapitresAffiches.length > 0 ? (
              <ol>
                {chapitresAffiches.map((chapitre) => (
                  <li key={chapitre.id}>
                    <span>Chapitre {getNumeroChapitreTome1(chapitre.id)}</span>
                    <strong>{chapitre.titre}</strong>
                    {mode === "editeur" && (
                      <em>
                        {chapitre.contenu.trim()
                          ? `${getStatutEditorialChapitreTome1(chapitre)} · ${compterMotsChapitreTome1(chapitre)} mots`
                          : "À écrire"}
                      </em>
                    )}
                  </li>
                ))}
              </ol>
            ) : (
              <p className="export-empty">Aucun chapitre écrit pour le moment.</p>
            )}
          </>
        ),
      },
    ];

    chapitresAffiches.forEach((chapitre) => {
      const paragraphes = getParagraphes(chapitre);
      const estVide = paragraphes.length === 0;

      bookPages.push({
        chapterId: chapitre.id,
        className: "book-print-page page-recto export-chapter export-chapter-start",
        id: chapitre.id,
        tocLabel: formaterTitreChapitre(chapitre),
        content: (
          <>
            <PageChrome
              titreChapitre={formaterTitreChapitre(chapitre)}
              titreLivre={settings.titreLivre}
              titreTome={settings.titreTome}
            />
            <div className="export-chapter-heading">
              <div>
                <p className="export-chapter-number">Chapitre {getNumeroChapitreTome1(chapitre.id)}</p>
                <h2>{formaterTitreChapitre(chapitre)}</h2>
              </div>

              {mode === "editeur" && (
                <aside className="export-editor-meta">
                  <span>{getStatutEditorialChapitreTome1(chapitre)}</span>
                  <span>{compterMotsChapitreTome1(chapitre)} mots</span>
                  <span>modifié : {formatDate(getDateModificationChapitreTome1(chapitre))}</span>
                </aside>
              )}
            </div>

            <div className="export-chapter-layout">
              <div className="export-chapter-content">
                {estVide ? (
                  <p className="export-to-write">À écrire</p>
                ) : (
                  paragraphes.map((paragraphe, index) => (
                    <p key={`${chapitre.id}-${index}`}>{paragraphe}</p>
                  ))
                )}
              </div>

              {mode === "editeur" && (
                <aside aria-label="Marge annotations" className="export-annotation-margin">
                  <p>Annotations</p>
                </aside>
              )}
            </div>
          </>
        ),
      });
    });

    return bookPages;
  }, [chapitresAffiches, mode, settings]);

  const spreadIndex = Math.floor(currentPage / 2);
  const leftIdx = spreadIndex * 2;
  const rightIdx = leftIdx + 1;
  const visibleSet = new Set([leftIdx, rightIdx]);
  const chapterEntries = pages
    .map((page, index) => ({ ...page, index }))
    .filter((page) => page.chapterId && page.tocLabel);
  const goPrevious = () => {
    setCurrentPage((page) => {
      if (page > 8) return page - 1;
      if (page === 8) return 6;
      return Math.max(0, page - 2);
    });
  };
  const goNext = () => {
    setCurrentPage((page) => {
      if (page >= 8) return Math.min(Math.max(0, pages.length - 1), page + 1);
      return Math.min(Math.max(0, pages.length - 1), page + 2);
    });
  };

  useEffect(() => {
    setCurrentPage(0);
  }, [mode]);

  useEffect(() => {
    if (currentPage > pages.length - 1) setCurrentPage(Math.max(0, pages.length - 1));
  }, [currentPage, pages.length]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "ArrowLeft") {
        goPrevious();
      }

      if (event.key === "ArrowRight") {
        goNext();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [pages.length]);

  const exporter = (nextMode: ExportMode) => {
    setMode(nextMode);
    window.setTimeout(() => window.print(), 80);
  };

  return (
    <main className={`export-pdf-page export-mode-${mode}`}>
      <div className="export-pdf-actions">
        <Link className="export-pdf-link" href="/manuscrit">
          ← Manuscrit
        </Link>
        <Link className="export-pdf-link" href="/parametres-livre">
          Paramètres du livre
        </Link>
        <button className="export-pdf-button" onClick={() => exporter("lecture")} type="button">
          Export lecture
        </button>
        <button className="export-pdf-button" onClick={() => exporter("editeur")} type="button">
          Export éditeur
        </button>
        <button className="export-pdf-button" onClick={() => exporter("impression")} type="button">
          Export impression
        </button>
      </div>
      <p className="export-preview-note">
        Livre interactif — l’impression utilise le format 6 × 9 po.
      </p>

      <div className="export-workspace">
        <aside className="export-sidebar" aria-label="Table des matières interactive">
          <p className="export-sidebar-label">Table des matières</p>
          <button
            className={currentPage < 8 ? "export-sidebar-item export-sidebar-item-active" : "export-sidebar-item"}
            onClick={() => setCurrentPage(0)}
            type="button"
          >
            Pages liminaires
          </button>
          {chapterEntries.map((entry) => (
            <button
              className={
                visibleSet.has(entry.index)
                  ? "export-sidebar-item export-sidebar-item-active"
                  : "export-sidebar-item"
              }
              key={entry.id}
              onClick={() => setCurrentPage(entry.index)}
              type="button"
            >
              {entry.tocLabel}
            </button>
          ))}
        </aside>

        <section className="export-reader" aria-label="Livre interactif">
          <button
            aria-label="Page précédente"
            className="export-book-nav export-book-nav-prev"
            disabled={currentPage === 0}
            onClick={goPrevious}
            type="button"
          >
            ←
          </button>

          <article className="export-document" lang="fr">
            {pages.map((page, index) => (
              <section
                className={`${page.className}${!visibleSet.has(index) ? " is-hidden-screen" : ""}`}
                key={page.id}
              >
                {page.content}
              </section>
            ))}
          </article>

          <button
            aria-label="Page suivante"
            className="export-book-nav export-book-nav-next"
            disabled={currentPage >= pages.length - 1}
            onClick={goNext}
            type="button"
          >
            →
          </button>
        </section>
      </div>
    </main>
  );
}
