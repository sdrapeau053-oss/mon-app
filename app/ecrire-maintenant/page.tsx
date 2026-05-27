"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  StateTile,
  StatusChip,
  SystemActionRow,
  SystemGrid,
  SystemPageShell,
  SystemPanel,
  SystemSectionHeader,
} from "@/components/system-ui";
import { BackLink } from "@/components/ui/back-link";
import { getContinuitySummary, readContinuity, saveWritingContinuity, type StrateContinuity } from "@/lib/continuity";
import { genererDiagnosticEditorial } from "@/lib/editorial-director";
import { genererAlertesEditoriales } from "@/lib/editorial-memory";
import { lireFragments, type Fragment } from "@/lib/fragments";
import { lireMemoiresNarratives, type MemoireNarrative } from "@/lib/memoire-narrative";
import {
  createChapitreId,
  lireNarrativeRelationsAvecAutomatiques,
  type NarrativeRelation,
} from "@/lib/narrative-relations";
import {
  CHAPITRES_TOME_1_STORAGE_KEY,
  getNumeroChapitreTome1,
  lireChapitresTome1DepuisStorage,
  normaliserChapitresTome1,
  type ChapitreTome1,
} from "@/lib/tome1-chapters";

type WritingData = {
  chapters: ChapitreTome1[];
  continuity: StrateContinuity | null;
  fragments: Fragment[];
  memoires: MemoireNarrative[];
  relations: NarrativeRelation[];
};

function isWritten(chapter: ChapitreTome1) {
  return Boolean(chapter.contenu.trim());
}

function isSealed(chapter: ChapitreTome1) {
  return chapter.statut === "scellé" || chapter.statut === "gele" || chapter.statutStructure === "gele";
}

function isExplicitlyWritten(chapter: ChapitreTome1) {
  return isWritten(chapter) || chapter.statut === "écrit" || isSealed(chapter);
}

function isToWrite(chapter: ChapitreTome1) {
  return !isExplicitlyWritten(chapter) || chapter.statut === "à écrire" || chapter.statut === "vide";
}

function isRevisionCandidate(chapter: ChapitreTome1) {
  return isExplicitlyWritten(chapter) && !isSealed(chapter);
}

function chapterNumber(chapter: ChapitreTome1) {
  return getNumeroChapitreTome1(chapter.id);
}

function chapterRelationIds(chapter: ChapitreTome1) {
  const numero = chapterNumber(chapter);
  const canonical = createChapitreId(1, numero);
  return new Set([chapter.id, canonical, `chapter:${canonical}`, `chapitre:${chapter.id}`, `chapitre-${numero}`]);
}

function memoireRelationIds(memoire: MemoireNarrative) {
  return new Set([memoire.id, `memoire:${memoire.id}`]);
}

function relationLinksMemoireToChapter(relation: NarrativeRelation, memoire: MemoireNarrative, chapter: ChapitreTome1) {
  const memoireIds = memoireRelationIds(memoire);
  const chapterIds = chapterRelationIds(chapter);

  return (
    (memoireIds.has(relation.sourceId) && chapterIds.has(relation.targetId)) ||
    (memoireIds.has(relation.targetId) && chapterIds.has(relation.sourceId))
  );
}

function getLinkedMemoires(chapter: ChapitreTome1, memoires: MemoireNarrative[], relations: NarrativeRelation[]) {
  const numero = chapterNumber(chapter);

  return memoires
    .filter((memoire) => {
      if (memoire.statut === "archive") return false;
      if (memoire.tomeProbable === 1 && memoire.chapitreProbable === numero) return true;
      return relations.some((relation) => relationLinksMemoireToChapter(relation, memoire, chapter));
    })
    .sort((a, b) => {
      const aOpen = a.statut === "non-traite" || a.statut === "a-integrer" ? 1 : 0;
      const bOpen = b.statut === "non-traite" || b.statut === "a-integrer" ? 1 : 0;
      return bOpen - aOpen || (b.intensite || 0) - (a.intensite || 0);
    });
}

function continuityChapterNumber(continuity: StrateContinuity | null) {
  const value = continuity?.lastChapter || continuity?.lastPage || "";
  const match = value.match(/\d+/);
  return match ? Number(match[0]) : null;
}

function chooseActiveChapter(data: WritingData) {
  const sorted = [...data.chapters].sort((a, b) => chapterNumber(a) - chapterNumber(b));
  const continuityNumber = continuityChapterNumber(data.continuity);
  const continuityChapter = continuityNumber
    ? sorted.find((chapter) => chapterNumber(chapter) === continuityNumber && (isToWrite(chapter) || isRevisionCandidate(chapter)))
    : null;

  if (continuityChapter) return continuityChapter;
  return sorted.find(isToWrite) || sorted.find(isRevisionCandidate) || sorted[0];
}

function chooseDefaultChapter(data: WritingData) {
  const sorted = [...data.chapters].sort((a, b) => chapterNumber(a) - chapterNumber(b));
  return sorted.find(isToWrite) || sorted.find(isRevisionCandidate) || sorted[0];
}

function getContinuityChapter(data: WritingData) {
  if (data.continuity?.lastChapterId) {
    const direct = data.chapters.find((chapter) => chapter.id === data.continuity?.lastChapterId);
    if (direct) return direct;
  }

  const continuityNumber = continuityChapterNumber(data.continuity);
  return continuityNumber ? data.chapters.find((chapter) => chapterNumber(chapter) === continuityNumber) : undefined;
}

function getStatusLabel(chapter: ChapitreTome1) {
  if (isSealed(chapter)) return "scellé";
  if (isWritten(chapter) || chapter.statut === "écrit") return "écrit";
  return "à écrire";
}

function getMainMotifs(chapter: ChapitreTome1, memoires: MemoireNarrative[]) {
  const motifs = [
    ...(chapter.imageCentrale || "").split(/[,\s]+/),
    ...memoires.flatMap((memoire) => memoire.motifs || []),
  ]
    .map((motif) => motif.trim().toLowerCase())
    .filter((motif) => motif.length > 3);

  return Array.from(new Set(motifs)).slice(0, 6);
}

function getQuickAudit(chapters: ChapitreTome1[], fragments: Fragment[]) {
  const memoryAlerts = genererAlertesEditoriales(chapters, fragments)
    .filter((alert) => alert.tone === "warning")
    .filter((alert) => /répét|respiration|densité|motif/i.test(alert.message))
    .map((alert) => alert.message);
  const director = genererDiagnosticEditorial(chapters, fragments);
  const directorAlerts = director.signaux
    .filter((signal) => signal.tone === "warning")
    .map((signal) => signal.message);

  return Array.from(new Set([...memoryAlerts, ...directorAlerts])).slice(0, 4);
}

function formatDate(value: string) {
  if (!value) return "Non renseigné";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Non renseigné";
  return date.toLocaleDateString("fr-CA");
}

function getDaysSince(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return Math.max(0, Math.floor((Date.now() - date.getTime()) / 86_400_000));
}

function formatActivityTime(value: string) {
  if (!value) return "Non renseigné";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Non renseigné";
  return date.toLocaleString("fr-CA", {
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    month: "2-digit",
  });
}

export default function EcrireMaintenantPage() {
  const [data, setData] = useState<WritingData | null>(null);
  const [draft, setDraft] = useState("");
  const [activeChapterId, setActiveChapterId] = useState("");
  const [focusMode, setFocusMode] = useState(false);
  const [resumePrompt, setResumePrompt] = useState<"available" | "unavailable" | "dismissed">("dismissed");
  const [saveMessage, setSaveMessage] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const scrollRef = useRef(0);

  useEffect(() => {
    const nextData = {
      chapters: lireChapitresTome1DepuisStorage(),
      continuity: readContinuity(),
      fragments: lireFragments(),
      memoires: lireMemoiresNarratives(),
      relations: lireNarrativeRelationsAvecAutomatiques(),
    };
    const continuityChapter = getContinuityChapter(nextData);
    const active = continuityChapter || chooseActiveChapter(nextData);
    const hasWritingContinuity = Boolean(nextData.continuity.lastChapterId || nextData.continuity.writingUpdatedAt || nextData.continuity.lastPosition);

    setData(nextData);
    setActiveChapterId(active?.id || "");
    setDraft(active?.contenu || "");
    setResumePrompt(hasWritingContinuity ? (continuityChapter ? "available" : "unavailable") : "dismissed");
  }, []);

  useEffect(() => {
    function onScroll() {
      scrollRef.current = window.scrollY;
    }

    scrollRef.current = window.scrollY;
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const context = useMemo(() => {
    if (!data) return null;

    const chapter = data.chapters.find((item) => item.id === activeChapterId) || chooseActiveChapter(data);
    const linkedMemoires = getLinkedMemoires(chapter, data.memoires, data.relations);
    const quickAudit = getQuickAudit(data.chapters, data.fragments);
    const summary = getContinuitySummary(data.continuity || undefined);
    const motifs = getMainMotifs(chapter, linkedMemoires);
    const why = [
      !isWritten(chapter) ? "chapitre non terminé" : "chapitre non scellé à réviser",
      linkedMemoires.length > 0 ? "mémoires disponibles" : "",
      data.continuity?.lastPage ? "continuité active" : "",
      "progression logique du tome",
    ].filter(Boolean);

    return { chapter, linkedMemoires, motifs, quickAudit, summary, why };
  }, [activeChapterId, data]);

  const persistWritingSpot = useCallback(
    (position?: number) => {
      if (!context) return;
      const cursor = position ?? textareaRef.current?.selectionStart ?? 0;
      saveWritingContinuity({
        chapterId: context.chapter.id,
        chapterLabel: `Chapitre ${chapterNumber(context.chapter)}`,
        position: cursor,
        scroll: scrollRef.current,
      });
    },
    [context],
  );

  useEffect(() => {
    function saveBeforeLeaving() {
      persistWritingSpot();
    }

    window.addEventListener("beforeunload", saveBeforeLeaving);
    document.addEventListener("visibilitychange", saveBeforeLeaving);
    return () => {
      window.removeEventListener("beforeunload", saveBeforeLeaving);
      document.removeEventListener("visibilitychange", saveBeforeLeaving);
    };
  }, [persistWritingSpot]);

  function saveDraft() {
    if (!data || !context) return;

    const now = new Date().toISOString();
    const updatedChapters = data.chapters.map((chapter) =>
      chapter.id === context.chapter.id
        ? {
            ...chapter,
            contenu: draft,
            derniereModification: now,
            statut: draft.trim() ? "brouillon" : chapter.statut,
            updatedAt: now,
          }
        : chapter,
    );
    const normalized = normaliserChapitresTome1(updatedChapters);

    localStorage.setItem(CHAPITRES_TOME_1_STORAGE_KEY, JSON.stringify(normalized));
    persistWritingSpot();
    setData({ ...data, chapters: normalized, continuity: readContinuity() });
    setSaveMessage("Sauvegardé localement.");
  }

  function ignoreResume() {
    if (!data) return;
    const normalChapter = chooseDefaultChapter(data);
    setActiveChapterId(normalChapter?.id || "");
    setDraft(normalChapter?.contenu || "");
    setResumePrompt("dismissed");
  }

  function resumeWriting() {
    if (!data || !context) return;
    const target = getContinuityChapter(data);
    if (!target) {
      setResumePrompt("unavailable");
      return;
    }

    const position = Math.min(data.continuity?.lastPosition || 0, target.contenu.length);
    const scroll = data.continuity?.lastScroll || 0;

    setActiveChapterId(target.id);
    setDraft(target.contenu || "");
    setResumePrompt("dismissed");

    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        textareaRef.current?.focus();
        textareaRef.current?.setSelectionRange(position, position);
        window.scrollTo({ top: scroll, behavior: "auto" });
      });
    });
  }

  if (!context) {
    return (
      <main className="internal-page">
        <SystemPageShell maxWidth={980}>
          <header className="internal-header">
            <BackLink label="Centre" href="/centre-de-controle" />
            <p className="internal-kicker">Manuscrit</p>
            <h1 className="internal-title">Écrire maintenant</h1>
            <p className="internal-subtitle">Préparation locale de l’espace d’écriture.</p>
          </header>
        </SystemPageShell>
      </main>
    );
  }

  const chapterNo = chapterNumber(context.chapter);

  return (
    <main className="internal-page">
      <SystemPageShell maxWidth={focusMode ? 980 : 1120}>
        <header className="internal-header" style={{ marginBottom: focusMode ? 12 : undefined }}>
          {!focusMode && <BackLink label="Centre" href="/centre-de-controle" />}
          <p className="internal-kicker">Écriture</p>
          <h1 className="internal-title">Écrire maintenant</h1>
          <p className="internal-subtitle">
            Le chapitre, les mémoires utiles et le texte au même endroit.
          </p>
          <SystemActionRow>
            <button className={focusMode ? "internal-button-primary" : "internal-button"} onClick={() => setFocusMode((value) => !value)}>
              {focusMode ? "Quitter Focus" : "Focus"}
            </button>
            {!focusMode && (
              <Link className="internal-button" href="/mission-manuscrit">
                Mission manuscrit
              </Link>
            )}
            {!focusMode && (
              <Link className="internal-button" href="/guide-strate">
                Besoin d’aide ?
              </Link>
            )}
          </SystemActionRow>
        </header>

        {resumePrompt === "available" && !focusMode && (
          <SystemPanel ariaLabel="Reprise manuscrit">
            <SystemSectionHeader title={getDaysSince(data?.continuity?.writingUpdatedAt || "") !== null && (getDaysSince(data?.continuity?.writingUpdatedAt || "") || 0) > 30 ? "Ancienne session détectée" : "Reprendre là où vous étiez ?"} />
            <SystemGrid gap={10} min={220}>
              <StateTile label="Chapitre" value={data?.continuity?.lastChapter || `Chapitre ${chapterNo}`} />
              <StateTile label="Dernière activité" value={formatActivityTime(data?.continuity?.writingUpdatedAt || data?.continuity?.lastUsedAt || "")} />
              <StateTile label="Section" value={data?.continuity?.lastSection || "Éditeur"} />
            </SystemGrid>
            <SystemActionRow>
              <button className="internal-button-primary" onClick={resumeWriting}>
                Reprendre
              </button>
              <button className="internal-button" onClick={ignoreResume}>
                Ignorer
              </button>
            </SystemActionRow>
          </SystemPanel>
        )}

        {resumePrompt === "unavailable" && !focusMode && (
          <SystemPanel ariaLabel="Continuité indisponible" compact>
            <SystemSectionHeader title="Continuité indisponible" />
            <p className="editorial-body" style={{ margin: 0 }}>
              Le chapitre de la dernière session n’est plus disponible. Tu peux repartir depuis Mission Manuscrit.
            </p>
            <SystemActionRow>
              <Link className="internal-button-primary" href="/mission-manuscrit">
                Mission Manuscrit
              </Link>
              <button className="internal-button" onClick={ignoreResume}>
                Nouvelle session
              </button>
            </SystemActionRow>
          </SystemPanel>
        )}

        <SystemPanel ariaLabel="Chapitre actif" compact={focusMode}>
          <SystemSectionHeader eyebrow="Chapitre actif" title={`Ch. ${chapterNo} · ${context.chapter.titre}`} />
          <SystemGrid gap={10} min={170}>
            <StateTile label="Âge" value={context.chapter.ageApprox || "À préciser"} />
            <StateTile label="Statut" value={getStatusLabel(context.chapter)} />
            <StateTile label="Intensité" value={String(context.chapter.intensite || "À préciser")} />
            <StateTile label="Fonction" value={context.chapter.fonctionNarrative || "À préciser"} />
          </SystemGrid>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 7, marginTop: 12 }}>
            {(context.motifs.length ? context.motifs : ["motifs à préciser"]).map((motif) => (
              <StatusChip key={motif}>{motif}</StatusChip>
            ))}
          </div>
        </SystemPanel>

        {!focusMode && (
          <SystemGrid gap={14} min={280}>
            <SystemPanel ariaLabel="Continuité" compact>
              <SystemSectionHeader title="Continuité" />
              <div style={{ display: "grid", gap: 8 }}>
                <StateTile label="Dernière activité" value={context.summary?.lastActivity || "Non renseignée"} />
                <StateTile label="Dernière visite" value={context.summary?.lastPageLabel || "Non renseignée"} />
                <StateTile label="Date" value={formatDate(data?.continuity?.lastUsedAt || data?.continuity?.updatedAt || "")} />
                <StateTile label="Position" value={data?.continuity?.lastPosition ? `curseur ${data.continuity.lastPosition}` : "Non renseignée"} />
              </div>
              <SystemActionRow>
                <a className="internal-button-primary" href="#editeur">
                  Reprendre ici
                </a>
              </SystemActionRow>
            </SystemPanel>

            <SystemPanel ariaLabel="Pourquoi ce chapitre" compact>
              <SystemSectionHeader title="Pourquoi ce chapitre ?" />
              <ul className="editorial-body" style={{ display: "grid", gap: 8, margin: 0, paddingLeft: 18 }}>
                {context.why.map((reason) => (
                  <li key={reason}>{reason}</li>
                ))}
              </ul>
            </SystemPanel>
          </SystemGrid>
        )}

        <SystemPanel ariaLabel="Mémoires liées" compact={focusMode}>
          <SystemSectionHeader title="Mémoires liées" />
          {context.linkedMemoires.length > 0 ? (
            <div style={{ display: "grid", gap: 8 }}>
              {context.linkedMemoires.slice(0, focusMode ? 5 : 8).map((memoire) => (
                <article
                  key={memoire.id}
                  style={{
                    background: "rgba(255, 250, 238, 0.035)",
                    border: "1px solid rgba(201, 168, 92, 0.12)",
                    borderRadius: 10,
                    minWidth: 0,
                    padding: "10px 12px",
                  }}
                >
                  <p style={{ color: "#f1e7d5", fontSize: 14, fontWeight: 650, margin: "0 0 5px" }}>{memoire.titre}</p>
                  <p className="editorial-body" style={{ fontSize: 12.5, margin: 0 }}>
                    {memoire.ageApprox || memoire.periode} · intensité {memoire.intensite || "n/r"} · {memoire.statut}
                  </p>
                </article>
              ))}
            </div>
          ) : (
            <p className="editorial-body" style={{ margin: 0 }}>Aucune mémoire liée trouvée pour ce chapitre.</p>
          )}
        </SystemPanel>

        <SystemPanel ariaLabel="Éditeur" style={{ padding: focusMode ? 14 : undefined }}>
          <SystemSectionHeader
            actions={
              <button className="internal-button-primary" onClick={saveDraft}>
                Sauvegarder
              </button>
            }
            eyebrow="Éditeur"
            title="Texte du chapitre"
          />
          <textarea
            id="editeur"
            ref={textareaRef}
            aria-label="Texte du chapitre actif"
            value={draft}
            onChange={(event) => {
              setDraft(event.target.value);
              setSaveMessage("");
            }}
            onBlur={() => persistWritingSpot()}
            onKeyUp={(event) => persistWritingSpot(event.currentTarget.selectionStart)}
            onSelect={(event) => persistWritingSpot(event.currentTarget.selectionStart)}
            placeholder="Écrire ici..."
            style={{
              background: "rgba(5, 5, 4, 0.55)",
              border: "1px solid rgba(201, 168, 92, 0.18)",
              borderRadius: 14,
              boxSizing: "border-box",
              color: "var(--text-main)",
              fontFamily: "Georgia, 'Times New Roman', serif",
              fontSize: 17,
              lineHeight: 1.75,
              minHeight: focusMode ? "62vh" : 420,
              outline: "none",
              padding: "18px 18px",
              resize: "vertical",
              width: "100%",
            }}
          />
          <p className="editorial-body" style={{ fontSize: 12.5, margin: "8px 0 0" }}>
            {saveMessage || "Sauvegarde locale uniquement, dans le chapitre actif."}
          </p>
        </SystemPanel>

        {!focusMode && (
          <>
            <SystemPanel ariaLabel="Audit rapide" compact>
              <SystemSectionHeader title="Audit rapide" />
              {context.quickAudit.length > 0 ? (
                <div style={{ display: "grid", gap: 8 }}>
                  {context.quickAudit.map((alert) => (
                    <p className="editorial-body" key={alert} style={{ margin: 0 }}>
                      ⚠ {alert}
                    </p>
                  ))}
                </div>
              ) : (
                <p className="editorial-body" style={{ margin: 0 }}>Aucune alerte majeure à afficher pour l’instant.</p>
              )}
            </SystemPanel>

            <SystemPanel ariaLabel="Navigation rapide" compact>
              <SystemSectionHeader title="Navigation rapide" />
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                <Link className="internal-button" href="/mission-manuscrit">
                  Mission Manuscrit
                </Link>
                <Link className="internal-button" href="/structure-tome-1">
                  Structure Tome 1
                </Link>
                <Link className="internal-button" href="/memoires">
                  Mémoires
                </Link>
                <Link className="internal-button" href="/chronologie">
                  Chronologie
                </Link>
                <Link className="internal-button" href="/manuscrit">
                  Manuscrit
                </Link>
                <Link className="internal-button" href="/centre-de-controle">
                  Retour Centre
                </Link>
              </div>
            </SystemPanel>
          </>
        )}
      </SystemPageShell>
    </main>
  );
}
