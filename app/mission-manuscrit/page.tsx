"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  StateTile,
  StatusChip,
  SystemGrid,
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
  getChapterNarrativeStats,
  lireNarrativeRelationsAvecAutomatiques,
  lireScenesRelationnelles,
  type NarrativeRelation,
} from "@/lib/narrative-relations";
import type { Scene } from "@/lib/scenes";
import {
  getNumeroChapitreTome1,
  lireChapitresTome1DepuisStorage,
  type ChapitreTome1,
} from "@/lib/tome1-chapters";

type MissionData = {
  chapters: ChapitreTome1[];
  continuity: StrateContinuity | null;
  fragments: Fragment[];
  memoires: MemoireNarrative[];
  relations: NarrativeRelation[];
  scenes: Scene[];
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
  return !isExplicitlyWritten(chapter) || chapter.statut === "à écrire" || chapter.statut === "vide" || !chapter.contenu.trim();
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

  return memoires.filter((memoire) => {
    if (memoire.statut === "archive") return false;
    if (memoire.tomeProbable === 1 && memoire.chapitreProbable === numero) return true;
    return relations.some((relation) => relationLinksMemoireToChapter(relation, memoire, chapter));
  });
}

function getUntreatedMemoires(memoires: MemoireNarrative[]) {
  return memoires.filter((memoire) => memoire.statut === "non-traite" || memoire.statut === "a-integrer");
}

function averageIntensity(memoires: MemoireNarrative[]) {
  const values = memoires.map((memoire) => memoire.intensite || 0).filter(Boolean);
  if (!values.length) return 0;
  return Number((values.reduce((sum, value) => sum + value, 0) / values.length).toFixed(1));
}

function getMainMotifs(chapter: ChapitreTome1, memoires: MemoireNarrative[], fragments: Fragment[]) {
  const motifs = [
    ...(chapter.imageCentrale || "").split(/[,\s]+/),
    ...memoires.flatMap((memoire) => memoire.motifs || []),
    ...fragments.filter((fragment) => fragment.chapitreId === chapter.id || String(fragment.chapitre || "") === String(chapterNumber(chapter))).flatMap((fragment) => fragment.tags || []),
  ]
    .map((motif) => motif.trim().toLowerCase())
    .filter((motif) => motif.length > 3);

  return Array.from(new Set(motifs)).slice(0, 5);
}

function continuityChapterNumber(continuity: StrateContinuity | null) {
  const value = continuity?.lastChapter || continuity?.lastPage || "";
  const match = value.match(/\d+/);
  return match ? Number(match[0]) : null;
}

function chooseRecommendedChapter(data: MissionData) {
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

    return {
      chapter,
      score: untreated.length * 2 + linked.length + orderBonus,
    };
  });

  return scored.sort((a, b) => b.score - a.score)[0]?.chapter || sorted[0];
}

function getStatusLabel(chapter: ChapitreTome1) {
  if (isWritten(chapter)) return "écrit";
  if (chapter.statut === "scellé") return "scellé";
  return "à écrire";
}

function getDangerLabel(chapter: ChapitreTome1) {
  if (chapter.niveauLourdeur === "extreme") return "très élevé";
  if (chapter.niveauLourdeur === "lourd") return "élevé";
  if (chapter.typeChapitre === "respiration") return "respiration";
  return chapter.niveauLourdeur || chapter.typeChapitre || "à préciser";
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
  if (directorAlert.includes("respiration") || directorAlert.includes("séquence trop lourde")) return "ajouter une respiration";
  if (untreatedCount > 0) return "sélectionner les mémoires utiles";
  if (!isWritten(chapter)) return "commencer par 300 mots";
  return "relire le chapitre précédent";
}

export default function MissionManuscritPage() {
  const [data, setData] = useState<MissionData | null>(null);

  useEffect(() => {
    setData({
      chapters: lireChapitresTome1DepuisStorage(),
      continuity: readContinuity(),
      fragments: lireFragments(),
      memoires: lireMemoiresNarratives(),
      relations: lireNarrativeRelationsAvecAutomatiques(),
      scenes: lireScenesRelationnelles(),
    });
  }, []);

  const mission = useMemo(() => {
    if (!data) return null;

    const chapter = chooseRecommendedChapter(data);
    const linkedMemoires = getLinkedMemoires(chapter, data.memoires, data.relations);
    const untreatedMemoires = getUntreatedMemoires(linkedMemoires);
    const motifs = getMainMotifs(chapter, linkedMemoires, data.fragments);
    const director = genererDiagnosticEditorial(data.chapters, data.fragments);
    const stats = getChapterNarrativeStats({
      chapitre: chapterNumber(chapter),
      fragments: data.fragments,
      scenes: data.scenes,
      tomeId: 1,
    });
    const directorAlert = director.signaux.find((signal) => signal.tone === "warning")?.message || "équilibre lisible";

    return {
      action: getActionRecommendation({ chapter, directorAlert, untreatedCount: untreatedMemoires.length }),
      chapter,
      director,
      directorAlert,
      linkedMemoires,
      motifs: motifs.length ? motifs : stats.motifs,
      stats,
      untreatedMemoires,
    };
  }, [data]);

  if (!mission) {
    return (
      <main className="internal-page">
        <SystemPageShell maxWidth={980}>
          <header className="internal-header">
            <BackLink label="Système" />
            <p className="internal-kicker">Manuscrit</p>
          <h1 className="internal-title">Mission manuscrit</h1>
          <p className="internal-subtitle">Chargement local de la prochaine reprise.</p>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 10 }}>
            <Link className="internal-button" href="/guide-strate">
              Besoin d’aide ?
            </Link>
          </div>
        </header>
        </SystemPageShell>
      </main>
    );
  }

  const { chapter, director, linkedMemoires, motifs, stats, untreatedMemoires } = mission;
  const chapterNo = chapterNumber(chapter);
  const mainMemoires = untreatedMemoires.length ? untreatedMemoires.slice(0, 5) : linkedMemoires.slice(0, 5);

  return (
    <main className="internal-page">
      <SystemPageShell maxWidth={1040}>
        <header className="internal-header">
          <BackLink label="Centre" href="/centre-de-controle" />
          <p className="internal-kicker">Mission manuscrit</p>
          <h1 className="internal-title">Qu’est-ce que j’écris maintenant ?</h1>
          <p className="internal-subtitle">
            Une seule décision principale, calculée localement à partir du Tome 1, des mémoires et du directeur éditorial.
          </p>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 10 }}>
            <Link className="internal-button" href="/guide-strate">
              Besoin d’aide ?
            </Link>
          </div>
        </header>

        <SystemPanel ariaLabel="Chapitre actif recommandé">
          <SystemSectionHeader eyebrow="Décision principale" title="Chapitre actif recommandé" />
          <SystemGrid gap={12} min={220}>
            <StateTile label="Chapitre" value={`Ch. ${chapterNo} · ${chapter.titre}`} />
            <StateTile label="Âge" value={chapter.ageApprox || "À préciser"} />
            <StateTile label="Statut" value={getStatusLabel(chapter)} />
            <StateTile label="Intensité" value={String(chapter.intensite || "À préciser")} />
          </SystemGrid>
          <div style={{ display: "grid", gap: 10, marginTop: 14 }}>
            <p className="editorial-body" style={{ margin: 0 }}>
              <strong style={{ color: "#f1e7d5" }}>Fonction narrative :</strong>{" "}
              {chapter.fonctionNarrative || "À préciser"}
            </p>
            <p className="editorial-body" style={{ margin: 0 }}>
              <strong style={{ color: "#f1e7d5" }}>Danger :</strong> {getDangerLabel(chapter)}
            </p>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 7 }}>
              {(motifs.length ? motifs : ["motifs à préciser"]).map((motif) => (
                <StatusChip key={motif}>{motif}</StatusChip>
              ))}
            </div>
          </div>
        </SystemPanel>

        <SystemGrid gap={14} min={280}>
          <SystemPanel ariaLabel="Pourquoi ce chapitre" compact>
            <SystemSectionHeader title="Pourquoi ce chapitre ?" />
            <ul className="editorial-body" style={{ display: "grid", gap: 8, margin: 0, paddingLeft: 18 }}>
              {!isWritten(chapter) && <li>Il reste à écrire ou à stabiliser.</li>}
              <li>Il arrive naturellement dans l’ordre du Tome 1.</li>
              {untreatedMemoires.length > 0 && <li>Il est lié à des mémoires non traitées.</li>}
              {data?.continuity?.lastPage && <li>Il reste cohérent avec la continuité récente.</li>}
            </ul>
          </SystemPanel>

          <SystemPanel ariaLabel="Action recommandée" compact>
            <SystemSectionHeader title="Action recommandée" />
            <p className="editorial-title" style={{ fontSize: "1.08rem", margin: 0 }}>
              → {mission.action}
            </p>
            <p className="editorial-body" style={{ margin: "10px 0 0" }}>
              Garde la décision petite : une scène, un choix de mémoires, ou 300 mots.
            </p>
          </SystemPanel>
        </SystemGrid>

        <SystemPanel ariaLabel="Mémoires disponibles">
          <SystemSectionHeader title="Mémoires disponibles" />
          <SystemGrid gap={10} min={190}>
            <StateTile label="Total lié" value={String(linkedMemoires.length)} />
            <StateTile label="Non traitées" value={String(untreatedMemoires.length)} />
            <StateTile label="Intensité moyenne" value={averageIntensity(linkedMemoires) ? String(averageIntensity(linkedMemoires)) : "Non renseignée"} />
            <StateTile label="Relations narratives" value={`${stats.fragmentCount} fragments · ${stats.sceneCount} scènes`} />
          </SystemGrid>
          <div style={{ display: "grid", gap: 8, marginTop: 14 }}>
            {mainMemoires.length > 0 ? (
              mainMemoires.map((memoire) => (
                <article
                  key={memoire.id}
                  style={{
                    background: "rgba(255, 250, 238, 0.035)",
                    border: "1px solid rgba(201, 168, 92, 0.12)",
                    borderRadius: 10,
                    padding: "10px 12px",
                  }}
                >
                  <p style={{ color: "#f1e7d5", fontSize: 14, fontWeight: 650, margin: "0 0 4px" }}>{memoire.titre}</p>
                  <p className="editorial-body" style={{ fontSize: 12.5, margin: 0 }}>
                    {memoire.periode} · {memoire.statut} · intensité {memoire.intensite || "n/r"}
                  </p>
                </article>
              ))
            ) : (
              <p className="editorial-body" style={{ margin: 0 }}>Aucune mémoire liée à afficher pour l’instant.</p>
            )}
          </div>
        </SystemPanel>

        <SystemPanel ariaLabel="Risque éditorial">
          <SystemSectionHeader title="Risque éditorial" />
          <SystemGrid gap={10} min={190}>
            <StateTile label="Saturation" value={director.courbeTension} />
            <StateTile label="Respiration" value={director.evaluation360.respiration} />
            <StateTile label="Motifs" value={director.motifsSurutilises[0] ? `${director.motifsSurutilises[0].motif} (${director.motifsSurutilises[0].count})` : "À préciser"} />
            <StateTile label="Risque lecteur" value={director.risqueLecteur} />
          </SystemGrid>
          <p className="editorial-body" style={{ margin: "12px 0 0" }}>
            <strong style={{ color: "#f1e7d5" }}>Alerte principale :</strong> {mission.directorAlert}
          </p>
        </SystemPanel>

        <SystemPanel ariaLabel="Actions rapides" compact>
          <SystemSectionHeader title="Ouvrir le bon endroit" />
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            <Link className="internal-button-primary" href="/ecrire-maintenant">
              Continuer l’écriture
            </Link>
            <Link className="internal-button" href="/manuscrit">
              Ouvrir dans Manuscrit
            </Link>
            <Link className="internal-button" href="/structure-tome-1">
              Voir dans Structure
            </Link>
            <Link className="internal-button" href="/memoires">
              Voir Mémoires liées
            </Link>
            <Link className="internal-button" href="/centre-de-controle">
              Retour Centre
            </Link>
          </div>
        </SystemPanel>
      </SystemPageShell>
    </main>
  );
}
