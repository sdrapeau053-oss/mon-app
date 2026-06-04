"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  SystemPageShell,
  SystemPanel,
  SystemSectionHeader,
} from "@/components/system-ui";
import { BackLink } from "@/components/ui/back-link";
import { genererDiagnosticEditorial } from "@/lib/editorial-director";
import { readContinuity, type StrateContinuity } from "@/lib/continuity";
import { lireFragments, type Fragment } from "@/lib/fragments";
import { lireMemoiresNarratives, type MemoireNarrative } from "@/lib/memoire-narrative";
import {
  createChapitreId,
  lireNarrativeRelationsAvecAutomatiques,
  type NarrativeRelation,
} from "@/lib/narrative-relations";
import {
  compterMotsChapitreTome1,
  getChapitresTome1Ecrits,
  getNumeroChapitreTome1,
  lireChapitresTome1DepuisStorage,
  type ChapitreTome1,
} from "@/lib/tome1-chapters";

// ── Types ────────────────────────────────────────────────────────

type CockpitData = {
  chapters: ChapitreTome1[];
  continuity: StrateContinuity | null;
  fragments: Fragment[];
  memoires: MemoireNarrative[];
  relations: NarrativeRelation[];
};

// ── Helpers chapitres ────────────────────────────────────────────

function isWritten(chapter: ChapitreTome1) {
  return Boolean(chapter.contenu.trim());
}

function isSealed(chapter: ChapitreTome1) {
  return (
    chapter.statut === "scellé" ||
    chapter.statut === "gele" ||
    chapter.statutStructure === "gele"
  );
}

function isExplicitlyWritten(chapter: ChapitreTome1) {
  return isWritten(chapter) || chapter.statut === "écrit" || isSealed(chapter);
}

function isToWrite(chapter: ChapitreTome1) {
  return (
    !isExplicitlyWritten(chapter) ||
    chapter.statut === "à écrire" ||
    chapter.statut === "vide" ||
    !chapter.contenu.trim()
  );
}

function isRevisionCandidate(chapter: ChapitreTome1) {
  return isExplicitlyWritten(chapter) && !isSealed(chapter);
}

function chapterNumber(chapter: ChapitreTome1) {
  return getNumeroChapitreTome1(chapter.id);
}

function getStatusLabel(chapter: ChapitreTome1) {
  if (isSealed(chapter)) return "scellé";
  if (isWritten(chapter) || chapter.statut === "écrit") return "écrit";
  return "à écrire";
}

function getChapitresParStatut(chapitres: ChapitreTome1[]) {
  const sorted = [...chapitres].sort((a, b) => chapterNumber(a) - chapterNumber(b));
  return {
    aEcrire: sorted.filter(isToWrite),
    enCours: sorted.filter((ch) => isWritten(ch) && !isSealed(ch)),
    termines: sorted.filter(isSealed),
  };
}

function getTotalMots(chapitres: ChapitreTome1[]): number {
  return chapitres.reduce((total, ch) => total + compterMotsChapitreTome1(ch), 0);
}

function formatChapterNums(chapitres: ChapitreTome1[], max = 4): string {
  if (chapitres.length === 0) return "—";
  const nums = chapitres
    .slice(0, max)
    .map((ch) => `Ch. ${chapterNumber(ch)}`)
    .join(", ");
  return chapitres.length > max ? `${nums}…` : nums;
}

// ── Helpers continuité ───────────────────────────────────────────

function formatDaysSince(value: string): string {
  if (!value) return "première session";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "première session";
  const days = Math.max(0, Math.floor((Date.now() - date.getTime()) / 86_400_000));
  if (days === 0) return "aujourd'hui";
  if (days === 1) return "hier";
  return `il y a ${days} jours`;
}

function continuityChapterNumber(continuity: StrateContinuity | null) {
  const value = continuity?.lastChapter || continuity?.lastPage || "";
  const match = value.match(/\d+/);
  return match ? Number(match[0]) : null;
}

// ── Helpers mémoires ─────────────────────────────────────────────

function chapterRelationIds(chapter: ChapitreTome1) {
  const numero = chapterNumber(chapter);
  const canonical = createChapitreId(1, numero);
  return new Set([
    chapter.id,
    canonical,
    `chapter:${canonical}`,
    `chapitre:${chapter.id}`,
    `chapitre-${numero}`,
  ]);
}

function memoireRelationIds(memoire: MemoireNarrative) {
  return new Set([memoire.id, `memoire:${memoire.id}`]);
}

function relationLinksMemoireToChapter(
  relation: NarrativeRelation,
  memoire: MemoireNarrative,
  chapter: ChapitreTome1,
) {
  const memoireIds = memoireRelationIds(memoire);
  const chapterIds = chapterRelationIds(chapter);
  return (
    (memoireIds.has(relation.sourceId) && chapterIds.has(relation.targetId)) ||
    (memoireIds.has(relation.targetId) && chapterIds.has(relation.sourceId))
  );
}

function getLinkedMemoires(
  chapter: ChapitreTome1,
  memoires: MemoireNarrative[],
  relations: NarrativeRelation[],
) {
  const numero = chapterNumber(chapter);
  return memoires.filter((memoire) => {
    if (memoire.statut === "archive") return false;
    if (memoire.tomeProbable === 1 && memoire.chapitreProbable === numero) return true;
    return relations.some((relation) =>
      relationLinksMemoireToChapter(relation, memoire, chapter),
    );
  });
}

function getUntreatedMemoires(memoires: MemoireNarrative[]) {
  return memoires.filter(
    (memoire) => memoire.statut === "non-traite" || memoire.statut === "a-integrer",
  );
}

function getMemoireIcon(statut: string): string {
  if (statut === "non-traite" || statut === "a-integrer") return "⚠";
  if (statut === "integre") return "✓";
  return "○";
}

function getMemoireStatutLabel(statut: string): string {
  if (statut === "non-traite") return "non traité";
  if (statut === "a-integrer") return "à intégrer";
  if (statut === "integre") return "intégré";
  return statut;
}

// ── Helpers recommandation ───────────────────────────────────────

function chooseRecommendedChapter(data: CockpitData) {
  const sorted = [...data.chapters].sort((a, b) => chapterNumber(a) - chapterNumber(b));
  const continuityNumber = continuityChapterNumber(data.continuity);
  const continuityChapter = continuityNumber
    ? sorted.find((chapter) => {
        if (chapterNumber(chapter) !== continuityNumber) return false;
        return isToWrite(chapter) || isRevisionCandidate(chapter);
      })
    : null;

  if (continuityChapter) return continuityChapter;

  const nextToWrite = sorted.find(isToWrite);
  if (nextToWrite) return nextToWrite;

  const revisionCandidates = sorted.filter(isRevisionCandidate);
  const scored = revisionCandidates.map((chapter) => {
    const linked = getLinkedMemoires(chapter, data.memoires, data.relations);
    const untreated = getUntreatedMemoires(linked);
    const orderBonus = Math.max(0, 32 - chapterNumber(chapter)) / 10;
    return { chapter, score: untreated.length * 2 + linked.length + orderBonus };
  });

  return scored.sort((a, b) => b.score - a.score)[0]?.chapter || sorted[0];
}

function getActionRecommendation({
  chapter,
  directorAlert,
  untreatedCount,
}: {
  chapter: ChapitreTome1;
  directorAlert: string;
  untreatedCount: number;
}) {
  if (
    directorAlert.includes("respiration") ||
    directorAlert.includes("séquence trop lourde")
  )
    return "ajouter une respiration";
  if (untreatedCount > 0) return "sélectionner les mémoires utiles";
  if (!isWritten(chapter)) return "commencer par 300 mots";
  return "relire le chapitre précédent";
}

// ── Composant principal ──────────────────────────────────────────

export default function MissionManuscritPage() {
  const [data, setData] = useState<CockpitData | null>(null);
  const [auditsOpen, setAuditsOpen] = useState(false);
  const [risqueOpen, setRisqueOpen] = useState(false);

  useEffect(() => {
    setData({
      chapters: lireChapitresTome1DepuisStorage(),
      continuity: readContinuity(),
      fragments: lireFragments(),
      memoires: lireMemoiresNarratives(),
      relations: lireNarrativeRelationsAvecAutomatiques(),
    });
  }, []);

  const cockpit = useMemo(() => {
    if (!data) return null;

    const chapter = chooseRecommendedChapter(data);
    const linkedMemoires = getLinkedMemoires(chapter, data.memoires, data.relations);
    const untreatedMemoires = getUntreatedMemoires(linkedMemoires);
    const director = genererDiagnosticEditorial(data.chapters, data.fragments);
    const directorAlert =
      director.signaux.find((s) => s.tone === "warning")?.message || "équilibre lisible";
    const action = getActionRecommendation({
      chapter,
      directorAlert,
      untreatedCount: untreatedMemoires.length,
    });

    const resumeChapter = data.continuity?.lastChapterId
      ? (data.chapters.find((ch) => ch.id === data.continuity?.lastChapterId) ?? chapter)
      : chapter;

    const priorityMemoires =
      untreatedMemoires.length > 0
        ? untreatedMemoires.slice(0, 3)
        : linkedMemoires.slice(0, 3);

    const chapitresEcrits = getChapitresTome1Ecrits(data.chapters);
    const totalMots = getTotalMots(chapitresEcrits);
    const chapitresStatuts = getChapitresParStatut(data.chapters);

    return {
      action,
      chapter,
      chapitresEcrits: chapitresEcrits.length,
      chapitresStatuts,
      chapitresTotal: data.chapters.length,
      director,
      directorAlert,
      linkedMemoires,
      priorityMemoires,
      resumeChapter,
      totalMots,
      untreatedMemoires,
      writingUpdatedAt: data.continuity?.writingUpdatedAt || "",
    };
  }, [data]);

  // ── État de chargement ─────────────────────────────────────────

  if (!cockpit) {
    return (
      <main className="internal-page">
        <SystemPageShell maxWidth={980}>
          <header className="internal-header">
            <BackLink label="Centre" href="/centre-de-controle" />
            <p className="internal-kicker">Écriture</p>
            <h1 className="internal-title">Cockpit Écriture</h1>
            <p className="internal-subtitle">Chargement en cours…</p>
          </header>
        </SystemPageShell>
      </main>
    );
  }

  const {
    action,
    chapter,
    chapitresEcrits,
    chapitresStatuts,
    chapitresTotal,
    director,
    directorAlert,
    linkedMemoires,
    priorityMemoires,
    resumeChapter,
    totalMots,
    untreatedMemoires,
    writingUpdatedAt,
  } = cockpit;

  const chapterNo = chapterNumber(chapter);
  const resumeChapterNo = chapterNumber(resumeChapter);
  const progressPct =
    chapitresTotal > 0 ? Math.round((chapitresEcrits / chapitresTotal) * 100) : 0;

  return (
    <main className="internal-page">
      <SystemPageShell maxWidth={1040}>

        {/* Header ────────────────────────────────────────────── */}
        <header className="internal-header" style={{ marginBottom: 8 }}>
          <BackLink label="Centre" href="/centre-de-controle" />
          <p className="internal-kicker">Écriture</p>
          <h1 className="internal-title">Cockpit Écriture</h1>
        </header>

        {/* BLOC 1 — REPRENDRE ─────────────────────────────────── */}
        <SystemPanel ariaLabel="Reprendre l'écriture">
          <div
            style={{
              alignItems: "center",
              display: "flex",
              flexWrap: "wrap",
              gap: 16,
              justifyContent: "space-between",
            }}
          >
            <div style={{ minWidth: 0 }}>
              <p
                style={{
                  color: "#9c8d73",
                  fontSize: 11,
                  letterSpacing: "0.18em",
                  margin: "0 0 6px",
                  textTransform: "uppercase",
                }}
              >
                ↩ Reprendre
              </p>
              <p
                style={{
                  color: "#f1e7d5",
                  fontSize: 17,
                  fontWeight: 650,
                  margin: "0 0 4px",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                Ch. {resumeChapterNo} · {resumeChapter.titre}
              </p>
              <p className="editorial-body" style={{ fontSize: 13, margin: 0 }}>
                {formatDaysSince(writingUpdatedAt)}
                {resumeChapter.contenu.trim()
                  ? ` · ${compterMotsChapitreTome1(resumeChapter).toLocaleString("fr-CA")} mots`
                  : " · aucun texte pour l'instant"}
              </p>
            </div>
            <Link
              className="internal-button-primary"
              href="/ecrire-maintenant"
              style={{ flexShrink: 0, fontSize: 14, padding: "10px 22px" }}
            >
              ▶ Reprendre l'écriture
            </Link>
          </div>
        </SystemPanel>

        {/* BLOC 2 — AUJOURD'HUI ───────────────────────────────── */}
        <SystemPanel ariaLabel="Aujourd'hui">
          <SystemSectionHeader eyebrow="Aujourd'hui" title={`Ch. ${chapterNo} · ${chapter.titre}`} />
          <p className="editorial-body" style={{ fontSize: 13, margin: "0 0 12px" }}>
            {getStatusLabel(chapter)}
            {chapter.intensite ? ` · intensité ${chapter.intensite}` : ""}
            {chapter.ageApprox ? ` · ${chapter.ageApprox}` : ""}
          </p>
          <p
            style={{
              color: "#f1e7d5",
              fontSize: 15,
              fontWeight: 600,
              margin: "0 0 4px",
            }}
          >
            → {action}
          </p>
          <p className="editorial-body" style={{ fontSize: 13, margin: "0 0 16px" }}>
            Garde la décision petite : une scène, un choix de mémoires, ou 300 mots.
          </p>
          <button
            onClick={() => setRisqueOpen((v) => !v)}
            style={{
              background: "none",
              border: "none",
              color: "#9c8d73",
              cursor: "pointer",
              fontSize: 11,
              letterSpacing: "0.14em",
              padding: 0,
              textAlign: "left",
              textTransform: "uppercase",
            }}
            type="button"
          >
            ⚠ {directorAlert} {risqueOpen ? "▴" : "▾"}
          </button>
          {risqueOpen && (
            <div
              style={{
                borderTop: "1px solid rgba(214,178,94,0.1)",
                display: "grid",
                gap: 6,
                gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))",
                marginTop: 12,
                paddingTop: 12,
              }}
            >
              <p className="editorial-body" style={{ fontSize: 12, margin: 0 }}>
                Saturation : {director.courbeTension}
              </p>
              <p className="editorial-body" style={{ fontSize: 12, margin: 0 }}>
                Respiration : {director.evaluation360.respiration}
              </p>
              <p className="editorial-body" style={{ fontSize: 12, margin: 0 }}>
                Motif :{" "}
                {director.motifsSurutilises[0]
                  ? `${director.motifsSurutilises[0].motif} (${director.motifsSurutilises[0].count})`
                  : "—"}
              </p>
              <p className="editorial-body" style={{ fontSize: 12, margin: 0 }}>
                Risque lecteur : {director.risqueLecteur}
              </p>
            </div>
          )}
        </SystemPanel>

        {/* BLOC 3 — MÉMOIRES À INTÉGRER ──────────────────────── */}
        <SystemPanel ariaLabel="Mémoires à intégrer">
          <SystemSectionHeader title="Mémoires à intégrer" />
          {priorityMemoires.length > 0 ? (
            <div style={{ display: "grid", gap: 10 }}>
              {priorityMemoires.map((memoire) => (
                <div
                  key={memoire.id}
                  style={{
                    alignItems: "baseline",
                    borderBottom: "1px solid rgba(214,178,94,0.08)",
                    display: "flex",
                    gap: 10,
                    justifyContent: "space-between",
                    paddingBottom: 10,
                  }}
                >
                  <div
                    style={{ alignItems: "baseline", display: "flex", gap: 8, minWidth: 0 }}
                  >
                    <span
                      style={{
                        color:
                          memoire.statut === "integre" ? "#b8caa8" : "#d6b25e",
                        flexShrink: 0,
                        fontSize: 13,
                      }}
                    >
                      {getMemoireIcon(memoire.statut)}
                    </span>
                    <span
                      style={{
                        color: "#f1e7d5",
                        fontSize: 14,
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {memoire.titre}
                    </span>
                  </div>
                  <span
                    className="editorial-body"
                    style={{ flexShrink: 0, fontSize: 12 }}
                  >
                    intensité {memoire.intensite || "n/r"} · {getMemoireStatutLabel(memoire.statut)}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="editorial-body" style={{ margin: 0 }}>
              Aucune mémoire liée à ce chapitre pour l'instant.
            </p>
          )}
          <div
            style={{
              alignItems: "center",
              display: "flex",
              justifyContent: "space-between",
              marginTop: 14,
            }}
          >
            <p className="editorial-body" style={{ fontSize: 12, margin: 0 }}>
              {untreatedMemoires.length > 0
                ? `${untreatedMemoires.length} non traité${untreatedMemoires.length > 1 ? "es" : ""} sur ${linkedMemoires.length} liée${linkedMemoires.length > 1 ? "s" : ""}`
                : linkedMemoires.length > 0
                  ? `${linkedMemoires.length} mémoire${linkedMemoires.length > 1 ? "s" : ""} liée${linkedMemoires.length > 1 ? "s" : ""}`
                  : "Aucune mémoire reliée"}
            </p>
            <Link className="internal-button" href="/memoires" style={{ fontSize: 12 }}>
              Toutes les mémoires →
            </Link>
          </div>
        </SystemPanel>

        {/* BLOC 4 — ÉTAT DU MANUSCRIT ─────────────────────────── */}
        <SystemPanel ariaLabel="État du manuscrit">
          <SystemSectionHeader title="État du manuscrit" />

          {/* Barre de progression */}
          <div
            style={{
              alignItems: "center",
              display: "flex",
              gap: 14,
              marginBottom: 18,
            }}
          >
            <div
              style={{
                background: "rgba(255,255,255,0.07)",
                borderRadius: 3,
                flex: 1,
                height: 6,
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  background: "rgba(214,178,94,0.65)",
                  borderRadius: 3,
                  height: "100%",
                  transition: "width 0.4s ease",
                  width: `${progressPct}%`,
                }}
              />
            </div>
            <span
              style={{ color: "#d7cab0", flexShrink: 0, fontSize: 13 }}
            >
              {chapitresEcrits} / {chapitresTotal} chapitres · {totalMots.toLocaleString("fr-CA")} mots
            </span>
          </div>

          {/* 3 colonnes statuts */}
          <div
            style={{
              display: "grid",
              gap: 12,
              gridTemplateColumns: "repeat(3, 1fr)",
            }}
          >
            <div
              style={{
                background: "rgba(255,255,255,0.03)",
                borderRadius: 10,
                padding: "12px 14px",
              }}
            >
              <p
                style={{
                  color: "#9c8d73",
                  fontSize: 10,
                  letterSpacing: "0.18em",
                  margin: "0 0 6px",
                  textTransform: "uppercase",
                }}
              >
                À écrire
              </p>
              <p
                style={{
                  color: "#f1e7d5",
                  fontSize: 22,
                  fontWeight: 700,
                  lineHeight: 1,
                  margin: "0 0 6px",
                }}
              >
                {chapitresStatuts.aEcrire.length}
              </p>
              <p className="editorial-body" style={{ fontSize: 11, margin: 0 }}>
                {formatChapterNums(chapitresStatuts.aEcrire)}
              </p>
            </div>

            <div
              style={{
                background: "rgba(255,255,255,0.03)",
                borderRadius: 10,
                padding: "12px 14px",
              }}
            >
              <p
                style={{
                  color: "#9c8d73",
                  fontSize: 10,
                  letterSpacing: "0.18em",
                  margin: "0 0 6px",
                  textTransform: "uppercase",
                }}
              >
                En cours
              </p>
              <p
                style={{
                  color: "#f1e7d5",
                  fontSize: 22,
                  fontWeight: 700,
                  lineHeight: 1,
                  margin: "0 0 6px",
                }}
              >
                {chapitresStatuts.enCours.length}
              </p>
              <p className="editorial-body" style={{ fontSize: 11, margin: 0 }}>
                {formatChapterNums(chapitresStatuts.enCours)}
              </p>
            </div>

            <div
              style={{
                background: "rgba(255,255,255,0.03)",
                borderRadius: 10,
                padding: "12px 14px",
              }}
            >
              <p
                style={{
                  color: "#9c8d73",
                  fontSize: 10,
                  letterSpacing: "0.18em",
                  margin: "0 0 6px",
                  textTransform: "uppercase",
                }}
              >
                Terminé
              </p>
              <p
                style={{
                  color: "#b8caa8",
                  fontSize: 22,
                  fontWeight: 700,
                  lineHeight: 1,
                  margin: "0 0 6px",
                }}
              >
                {chapitresStatuts.termines.length}
              </p>
              <p className="editorial-body" style={{ fontSize: 11, margin: 0 }}>
                {formatChapterNums(chapitresStatuts.termines)}
              </p>
            </div>
          </div>
        </SystemPanel>

        {/* BLOC 5 — ACCÈS RAPIDE ──────────────────────────────── */}
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, paddingBottom: 24 }}>
          <Link className="internal-button" href="/manuscrit">Manuscrit</Link>
          <Link className="internal-button" href="/structure-tome-1">Structure</Link>
          <Link className="internal-button" href="/memoires">Mémoires</Link>
          <button
            className="internal-button"
            onClick={() => setAuditsOpen((v) => !v)}
            type="button"
          >
            Audits {auditsOpen ? "▴" : "▾"}
          </button>
          {auditsOpen && (
            <>
              <Link className="internal-button" href="/pipeline-editorial">Pipeline</Link>
              <Link className="internal-button" href="/audit-vibration">Vibration</Link>
              <Link className="internal-button" href="/audit-voix">Voix</Link>
              <Link className="internal-button" href="/audit-linguistique">Linguistique</Link>
              <Link className="internal-button" href="/repetitions">Répétitions</Link>
              <Link className="internal-button" href="/audit-anti-ia">Anti-IA</Link>
            </>
          )}
        </div>

      </SystemPageShell>
    </main>
  );
}
