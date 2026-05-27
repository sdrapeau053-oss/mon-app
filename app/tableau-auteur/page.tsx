"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
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
import { getContinuitySummary, readContinuity, type StrateContinuity } from "@/lib/continuity";
import { genererDiagnosticEditorial } from "@/lib/editorial-director";
import { getRepetitionExecutiveStats } from "@/lib/editorial-repetitions";
import { lireFragments, type Fragment } from "@/lib/fragments";
import { lireMemoiresNarratives, type MemoireNarrative } from "@/lib/memoire-narrative";
import {
  createChapitreId,
  lireNarrativeRelationsAvecAutomatiques,
  type NarrativeRelation,
} from "@/lib/narrative-relations";
import {
  getNumeroChapitreTome1,
  lireChapitresTome1DepuisStorage,
  type ChapitreTome1,
} from "@/lib/tome1-chapters";

const WEEKLY_GOAL_KEY = "auteur-objectif-semaine";

type AuthorData = {
  chapters: ChapitreTome1[];
  continuity: StrateContinuity;
  fragments: Fragment[];
  memoires: MemoireNarrative[];
  relations: NarrativeRelation[];
};

function isWritten(chapter: ChapitreTome1) {
  return Boolean(chapter.contenu.trim()) || chapter.statut === "écrit" || chapter.statut === "scellé";
}

function isValidated(chapter: ChapitreTome1) {
  return chapter.statut === "scellé" || chapter.statut === "gele" || chapter.statutEditorial === "validé";
}

function isInProgress(chapter: ChapitreTome1) {
  return !isValidated(chapter) && (chapter.statut === "brouillon" || chapter.statut === "en_cours" || Boolean(chapter.contenu.trim()));
}

function chapterNumber(chapter: ChapitreTome1) {
  return getNumeroChapitreTome1(chapter.id);
}

function chooseActiveChapter(chapters: ChapitreTome1[], continuity: StrateContinuity) {
  const sorted = [...chapters].sort((a, b) => chapterNumber(a) - chapterNumber(b));
  const continuityNumber = Number((continuity.lastChapter || continuity.lastPage || "").match(/\d+/)?.[0] || 0);
  const continuityChapter = continuityNumber ? sorted.find((chapter) => chapterNumber(chapter) === continuityNumber && !isValidated(chapter)) : null;

  return continuityChapter || sorted.find((chapter) => !isWritten(chapter)) || sorted.find((chapter) => !isValidated(chapter)) || sorted[0];
}

function relationTouchesMemoire(relation: NarrativeRelation, memoire: MemoireNarrative) {
  return relation.sourceId === memoire.id || relation.targetId === memoire.id || relation.sourceId === `memoire:${memoire.id}` || relation.targetId === `memoire:${memoire.id}`;
}

function relationTouchesTome1(relation: NarrativeRelation) {
  return /tome-1-chapitre-|chapitre-\d+/.test(`${relation.sourceId} ${relation.targetId}`);
}

function getMemoireStats(memoires: MemoireNarrative[], relations: NarrativeRelation[]) {
  const active = memoires.filter((memoire) => memoire.statut !== "archive");
  const linked = active.filter((memoire) => {
    if (memoire.tomeProbable === 1 || memoire.chapitreProbable) return true;
    return relations.some((relation) => relationTouchesMemoire(relation, memoire) && relationTouchesTome1(relation));
  });
  const used = active.filter((memoire) => memoire.statut === "integre");
  const remaining = active.filter((memoire) => memoire.statut === "non-traite" || memoire.statut === "a-integrer");
  const unlinked = active.filter((memoire) => !linked.includes(memoire));

  return { linked: linked.length, remaining: remaining.length, unlinked: unlinked.length, used: used.length };
}

function getStructureStats(chapters: ChapitreTome1[]) {
  const totalBlocks = new Set(chapters.map((chapter) => chapter.bloc)).size;
  const completedBlocks = Array.from(new Set(chapters.map((chapter) => chapter.bloc))).filter((bloc) =>
    chapters.filter((chapter) => chapter.bloc === bloc).every(isWritten),
  ).length;
  const narrativeReady = chapters.filter((chapter) => chapter.fonctionNarrative || chapter.imageCentrale || chapter.typeChapitre).length;

  return {
    completedBlocks,
    narrativeProgress: chapters.length ? Math.round((narrativeReady / chapters.length) * 100) : 0,
    remainingBlocks: Math.max(totalBlocks - completedBlocks, 0),
    structureProgress: chapters.length ? Math.round((chapters.filter(isWritten).length / chapters.length) * 100) : 0,
  };
}

function elapsedLabel(value: string) {
  if (!value) return "Non renseigné";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Non renseigné";
  const days = Math.max(0, Math.floor((Date.now() - date.getTime()) / 86_400_000));
  if (days === 0) return "Aujourd’hui";
  if (days === 1) return "Hier";
  return `Il y a ${days} jours`;
}

function readWeeklyGoal() {
  try {
    return localStorage.getItem(WEEKLY_GOAL_KEY) || "";
  } catch {
    return "";
  }
}

export default function TableauAuteurPage() {
  const [data, setData] = useState<AuthorData | null>(null);
  const [weeklyGoal, setWeeklyGoal] = useState("");
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    setData({
      chapters: lireChapitresTome1DepuisStorage(),
      continuity: readContinuity(),
      fragments: lireFragments(),
      memoires: lireMemoiresNarratives(),
      relations: lireNarrativeRelationsAvecAutomatiques(),
    });
    setWeeklyGoal(readWeeklyGoal());
  }, []);

  const dashboard = useMemo(() => {
    if (!data) return null;

    const total = data.chapters.length;
    const written = data.chapters.filter(isWritten).length;
    const valid = data.chapters.filter(isValidated).length;
    const inProgress = data.chapters.filter(isInProgress).length;
    const empty = Math.max(total - written, 0);
    const activeChapter = chooseActiveChapter(data.chapters, data.continuity);
    const continuitySummary = getContinuitySummary(data.continuity);
    const memoires = getMemoireStats(data.memoires, data.relations);
    const structure = getStructureStats(data.chapters);
    const director = genererDiagnosticEditorial(data.chapters, data.fragments);
    const repetitions = getRepetitionExecutiveStats(data.chapters);

    return {
      activeChapter,
      continuitySummary,
      director,
      inProgress,
      memoires,
      progress: total ? Math.round((written / total) * 100) : 0,
      repetitions,
      structure,
      total,
      valid,
      written,
      empty,
    };
  }, [data]);

  function saveGoal() {
    localStorage.setItem(WEEKLY_GOAL_KEY, weeklyGoal.trim());
    setSaved(true);
  }

  if (!dashboard) {
    return (
      <main className="internal-page">
        <SystemPageShell maxWidth={980}>
          <header className="internal-header">
            <BackLink label="Centre" href="/centre-de-controle" />
            <p className="internal-kicker">Tableau auteur</p>
            <h1 className="internal-title">L’Héritage des Silences</h1>
            <p className="internal-subtitle">Chargement local de la vue exécutive.</p>
          </header>
        </SystemPageShell>
      </main>
    );
  }

  const activeNo = chapterNumber(dashboard.activeChapter);

  return (
    <main className="internal-page">
      <SystemPageShell maxWidth={1120}>
        <header className="internal-header">
          <BackLink label="Centre" href="/centre-de-controle" />
          <p className="internal-kicker">Tableau auteur</p>
          <h1 className="internal-title">L’Héritage des Silences</h1>
          <p className="internal-subtitle">
            Vue exécutive du tome : progression, chapitre actif, mémoires, structure et santé éditoriale.
          </p>
        </header>

        <SystemPanel ariaLabel="Indicateurs exécutifs" compact>
          <SystemSectionHeader title="Indicateurs exécutifs" />
          <SystemGrid gap={8} min={170}>
            <StateTile label="Temps depuis dernière écriture" value={elapsedLabel(data?.continuity.writingUpdatedAt || data?.continuity.lastUsedAt || "")} />
            <StateTile label="Chapitre actif" value={`Ch. ${activeNo}`} />
            <StateTile label="Progression globale" value={`${dashboard.progress}%`} />
            <StateTile label="Objectif semaine" value={weeklyGoal || "Non défini"} />
            <StateTile label="Mémoires restantes" value={String(dashboard.memoires.remaining)} />
          </SystemGrid>
        </SystemPanel>

        <SystemPanel ariaLabel="Progression globale">
          <SystemSectionHeader eyebrow="Tome 1" title="Progression globale" />
          <SystemGrid gap={10} min={160}>
            <StateTile label="Chapitres" value={String(dashboard.total)} />
            <StateTile label="Écrits" value={String(dashboard.written)} />
            <StateTile label="En cours" value={String(dashboard.inProgress)} />
            <StateTile label="Validés" value={String(dashboard.valid)} />
            <StateTile label="Vides" value={String(dashboard.empty)} />
            <StateTile label="Avancement" value={`${dashboard.progress}%`} />
          </SystemGrid>
        </SystemPanel>

        <SystemGrid gap={14} min={300}>
          <SystemPanel ariaLabel="Chapitre actif">
            <SystemSectionHeader title="Chapitre actif" />
            <SystemGrid gap={8} min={150}>
              <StateTile label="Chapitre" value={`Ch. ${activeNo}`} />
              <StateTile label="Titre" value={dashboard.activeChapter.titre} />
              <StateTile label="Âge" value={dashboard.activeChapter.ageApprox || "À préciser"} />
              <StateTile label="Statut" value={dashboard.activeChapter.statut || "À préciser"} />
              <StateTile label="Dernière activité" value={elapsedLabel(data?.continuity.writingUpdatedAt || data?.continuity.lastUsedAt || "")} />
            </SystemGrid>
            <SystemActionRow>
              <Link className="internal-button-primary" href="/ecrire-maintenant">
                Continuer l’écriture
              </Link>
            </SystemActionRow>
          </SystemPanel>

          <SystemPanel ariaLabel="Activité récente">
            <SystemSectionHeader title="Activité récente" />
            <SystemGrid gap={8} min={170}>
              <StateTile label="Dernier chapitre" value={data?.continuity.lastChapter || "Non renseigné"} />
              <StateTile label="Date d’écriture" value={data?.continuity.writingUpdatedAt ? new Date(data.continuity.writingUpdatedAt).toLocaleDateString("fr-CA") : "Non renseignée"} />
              <StateTile label="Dernière page" value={dashboard.continuitySummary?.lastPageLabel || "Non renseignée"} />
              <StateTile label="Activité manuscrit" value={data?.continuity.lastAction || "Non renseignée"} />
            </SystemGrid>
          </SystemPanel>
        </SystemGrid>

        <SystemGrid gap={14} min={300}>
          <SystemPanel ariaLabel="Mémoires">
            <SystemSectionHeader title="Mémoires" />
            <SystemGrid gap={8} min={150}>
              <StateTile label="Reliées" value={String(dashboard.memoires.linked)} />
              <StateTile label="Utilisées" value={String(dashboard.memoires.used)} />
              <StateTile label="Restantes" value={String(dashboard.memoires.remaining)} />
              <StateTile label="Non reliées" value={String(dashboard.memoires.unlinked)} />
            </SystemGrid>
          </SystemPanel>

          <SystemPanel ariaLabel="Structure du Tome">
            <SystemSectionHeader title="Structure du Tome" />
            <SystemGrid gap={8} min={150}>
              <StateTile label="Structure" value={`${dashboard.structure.structureProgress}%`} />
              <StateTile label="Narratif" value={`${dashboard.structure.narrativeProgress}%`} />
              <StateTile label="Blocs complétés" value={String(dashboard.structure.completedBlocks)} />
              <StateTile label="Blocs restants" value={String(dashboard.structure.remainingBlocks)} />
            </SystemGrid>
          </SystemPanel>
        </SystemGrid>

        <SystemPanel ariaLabel="Santé éditoriale">
          <SystemSectionHeader title="Santé éditoriale" />
          <SystemGrid gap={8} min={170}>
            <StateTile label="Cohérence" value={dashboard.director.evaluation360.coherence} />
            <StateTile label="Respiration" value={dashboard.director.evaluation360.respiration} />
            <StateTile label="Variété" value={dashboard.director.evaluation360.variete} />
            <StateTile label="Saturation" value={dashboard.director.courbeTension} />
            <StateTile label="Risque lecteur" value={dashboard.director.risqueLecteur} />
          </SystemGrid>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 7, marginTop: 12 }}>
            {dashboard.director.signaux.slice(0, 4).map((signal) => (
              <StatusChip key={signal.message} tone={signal.tone}>
                {signal.message}
              </StatusChip>
            ))}
          </div>
        </SystemPanel>

        <SystemPanel ariaLabel="Répétitions" compact>
          <SystemSectionHeader
            actions={<StatusChip tone={dashboard.repetitions.globalLevel === "élevé" ? "danger" : dashboard.repetitions.globalLevel === "moyen" ? "warning" : "neutral"}>{dashboard.repetitions.globalLevel}</StatusChip>}
            title="Répétitions"
          />
          <SystemGrid gap={8} min={180}>
            <StateTile label="Niveau global" value={dashboard.repetitions.globalLevel} />
            <StateTile label="Alertes" value={String(dashboard.repetitions.alertsCount)} />
          </SystemGrid>
          <SystemActionRow>
            <Link className="internal-button" href="/audit-repetitions">
              Ouvrir Audit Répétitions
            </Link>
          </SystemActionRow>
        </SystemPanel>

        <SystemPanel ariaLabel="Objectif de la semaine" compact>
          <SystemSectionHeader title="Objectif de la semaine" />
          <label style={{ display: "grid", gap: 7 }}>
            <span className="label-meta">Objectif actuel</span>
            <input
              className="internal-control"
              onChange={(event) => {
                setSaved(false);
                setWeeklyGoal(event.target.value);
              }}
              placeholder="Terminer Chapitre 7"
              value={weeklyGoal}
            />
          </label>
          <SystemActionRow>
            <button className="internal-button-primary" onClick={saveGoal} type="button">
              Enregistrer
            </button>
            {saved && <StatusChip tone="success">Objectif enregistré</StatusChip>}
          </SystemActionRow>
        </SystemPanel>

        <SystemPanel ariaLabel="Actions rapides" compact>
          <SystemSectionHeader title="Actions rapides" />
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {[
              { href: "/ecrire-maintenant", label: "Écrire maintenant" },
              { href: "/mission-manuscrit", label: "Mission Manuscrit" },
              { href: "/structure-tome-1", label: "Structure Tome 1" },
              { href: "/fragments", label: "Fragments" },
              { href: "/chronologie", label: "Chronologie" },
              { href: "/style-dna", label: "Style DNA" },
              { href: "/roadmap", label: "Roadmap" },
            ].map((item) => (
              <Link className="internal-button" href={item.href} key={item.href}>
                {item.label}
              </Link>
            ))}
          </div>
        </SystemPanel>
      </SystemPageShell>
    </main>
  );
}
