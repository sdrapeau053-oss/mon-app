"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  CHAPITRES_TOME_1_STORAGE_KEY,
  getDateModificationChapitreTome1,
  getStatutEditorialChapitreTome1,
  normaliserChapitresTome1,
  type ChapitreTome1,
} from "@/lib/tome1-chapters";
import { FRAGMENTS_STORAGE_KEY, normalizeFragments, type Fragment } from "@/lib/fragments";
import {
  STRUCTURE_CHAPITRES_STORAGE_KEY,
  STRUCTURE_TOMES_STORAGE_KEY,
  normaliserChapitres,
  normaliserTomes,
} from "@/lib/manuscript-structure";
import { SCENES_STORAGE_KEY } from "@/lib/narrative-relations";
import type { Scene } from "@/lib/scenes";

type JsonReadResult<T> = {
  exists: boolean;
  invalid: boolean;
  value: T | null;
};

type SecurityStatus = "OK" | "Attention" | "Critique";

type DashboardSnapshot = {
  backupStatus: SecurityStatus;
  backupMessage: string;
  chapterDrafts: number;
  chapterEmpty: number;
  chapterNeedsReview: number;
  chapterValidated: number;
  detectedKeys: DetectedStorageKey[];
  fragments: Fragment[];
  invalidKeys: string[];
  lastExportAt: string | null;
  lastModifiedAt: string | null;
  narrativeRelationCount: number | null;
  scenes: Scene[];
  startedChapterPercent: number;
  structureChapterCount: number;
  tome1Chapters: ChapitreTome1[];
  tome1ProgressPercent: number;
  totalChapters: number;
  totalFragments: number;
  totalLinkedItems: number;
  totalTomes: number;
  validatedChapterPercent: number;
};

type DetectedStorageKey = {
  key: string;
  label: string;
  present: boolean;
  invalid: boolean;
  count: number | null;
};

const LAST_EXPORT_KEY = "backup:lastManualExportAt";
const LAST_IMPORT_KEY = "backup:lastImportAt";
const LAST_KEY_COUNT_KEY = "backup:lastKeyCount";
const ONE_DAY_MS = 24 * 60 * 60 * 1000;

const TRACKED_KEYS = [
  { key: STRUCTURE_TOMES_STORAGE_KEY, label: "Tomes" },
  { key: STRUCTURE_CHAPITRES_STORAGE_KEY, label: "Structure des chapitres" },
  { key: CHAPITRES_TOME_1_STORAGE_KEY, label: "Chapitres Tome 1" },
  { key: FRAGMENTS_STORAGE_KEY, label: "Fragments" },
  { key: SCENES_STORAGE_KEY, label: "Scènes relationnelles" },
  { key: "tome1-statuts", label: "Statuts Tome 1" },
  { key: "missions", label: "Missions" },
  { key: "textes-missions", label: "Textes de missions" },
  { key: "system-state", label: "État du système" },
  { key: LAST_EXPORT_KEY, label: "Dernier export manuel" },
  { key: LAST_IMPORT_KEY, label: "Dernier import" },
  { key: LAST_KEY_COUNT_KEY, label: "Nombre de clés sauvegardées" },
];

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

function readJson<T>(key: string): JsonReadResult<T> {
  const raw = localStorage.getItem(key);
  if (raw === null) return { exists: false, invalid: false, value: null };

  try {
    return { exists: true, invalid: false, value: JSON.parse(raw) as T };
  } catch {
    return { exists: true, invalid: true, value: null };
  }
}

function countCollection(value: unknown): number | null {
  if (Array.isArray(value)) return value.length;
  if (isRecord(value)) return Object.keys(value).length;
  if (typeof value === "string") return value.trim() ? 1 : 0;
  if (value === null || value === undefined) return null;

  return 1;
}

function formatDateTime(value: string | null) {
  if (!value) return "non disponible";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "non disponible";

  return new Intl.DateTimeFormat("fr-CA", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function formatMetric(value: number | null) {
  return value === null ? "non disponible" : value.toLocaleString("fr-CA");
}

function getSecurityStatus(lastExportAt: string | null): Pick<DashboardSnapshot, "backupMessage" | "backupStatus"> {
  if (!lastExportAt) {
    return {
      backupStatus: "Critique",
      backupMessage: "Aucun export manuel détecté.",
    };
  }

  const exportDate = new Date(lastExportAt);
  if (Number.isNaN(exportDate.getTime())) {
    return {
      backupStatus: "Critique",
      backupMessage: "La date du dernier export manuel est invalide.",
    };
  }

  if (Date.now() - exportDate.getTime() > ONE_DAY_MS) {
    return {
      backupStatus: "Attention",
      backupMessage: "Le dernier export manuel date de plus de 24h.",
    };
  }

  return {
    backupStatus: "OK",
    backupMessage: "Sauvegarde récente détectée.",
  };
}

function normalizeScenes(value: unknown): Scene[] {
  if (!Array.isArray(value)) return [];

  return value.filter(isRecord).map((scene) => {
    const tome = Number(scene.tome) || Number(scene.tomeId) || 1;
    const chapitre = Number(scene.chapitre) || 1;

    return {
      ...scene,
      id: typeof scene.id === "string" ? scene.id : "",
      titre: typeof scene.titre === "string" ? scene.titre : "Scène sans titre",
      tome,
      tomeId: Number(scene.tomeId) || tome,
      chapitre,
      chapitreId: typeof scene.chapitreId === "string" ? scene.chapitreId : "",
      fragmentIds: Array.isArray(scene.fragmentIds) ? scene.fragmentIds.map(String).filter(Boolean) : [],
      liens: Array.isArray(scene.liens) ? scene.liens : [],
    } as Scene;
  });
}

function extractPossibleDate(value: unknown): string[] {
  if (!value || typeof value !== "object") return [];

  const record = value as Record<string, unknown>;
  return [
    record.updatedAt,
    record.updated_at,
    record.derniereModification,
    record.modifiedAt,
    record.dateModification,
    record.date,
    record.createdAt,
  ].filter((item): item is string => typeof item === "string" && Boolean(item.trim()));
}

function findLatestDate(items: unknown[]) {
  const timestamps = items
    .flatMap((item) => {
      const dates = extractPossibleDate(item);

      if (isRecord(item) && Array.isArray(item.versions)) {
        item.versions.forEach((version) => {
          if (isRecord(version) && typeof version.date === "string") dates.push(version.date);
        });
      }

      return dates;
    })
    .map((value) => new Date(value).getTime())
    .filter((value) => Number.isFinite(value));

  if (!timestamps.length) return null;

  return new Date(Math.max(...timestamps)).toISOString();
}

function countLinkedItems(fragments: Fragment[], scenes: Scene[]) {
  const linkedFragments = fragments.filter(
    (fragment) =>
      Boolean(fragment.chapitreId || fragment.chapitre || fragment.tomeId) ||
      (Array.isArray(fragment.sceneIds) && fragment.sceneIds.length > 0),
  ).length;
  const linkedScenes = scenes.filter(
    (scene) =>
      Boolean(scene.chapitreId || scene.chapitre || scene.tomeId || scene.tome) ||
      (Array.isArray(scene.fragmentIds) && scene.fragmentIds.length > 0),
  ).length;

  return linkedFragments + linkedScenes;
}

function countNarrativeRelations() {
  const explicitKey = ["narrative-relations", "relations-narratives", "narrativeRelations"].find(
    (key) => localStorage.getItem(key) !== null,
  );

  if (!explicitKey) return null;

  const relationRead = readJson<unknown>(explicitKey);
  if (relationRead.invalid) return null;

  return countCollection(relationRead.value);
}

function buildSnapshot(): DashboardSnapshot {
  const tomesRead = readJson<unknown>(STRUCTURE_TOMES_STORAGE_KEY);
  const structureChaptersRead = readJson<unknown>(STRUCTURE_CHAPITRES_STORAGE_KEY);
  const tome1Read = readJson<unknown>(CHAPITRES_TOME_1_STORAGE_KEY);
  const fragmentsRead = readJson<unknown>(FRAGMENTS_STORAGE_KEY);
  const scenesRead = readJson<unknown>(SCENES_STORAGE_KEY);

  const tomes = tomesRead.exists && !tomesRead.invalid ? normaliserTomes(tomesRead.value) : [];
  const structureChapters =
    structureChaptersRead.exists && !structureChaptersRead.invalid
      ? normaliserChapitres(structureChaptersRead.value)
      : {};
  const structureChapterCount = Object.values(structureChapters).reduce(
    (total, chapters) => total + chapters.length,
    0,
  );
  const tome1Chapters =
    tome1Read.exists && !tome1Read.invalid ? normaliserChapitresTome1(tome1Read.value) : [];
  const fragments = fragmentsRead.exists && !fragmentsRead.invalid ? normalizeFragments(fragmentsRead.value) : [];
  const scenes = scenesRead.exists && !scenesRead.invalid ? normalizeScenes(scenesRead.value) : [];

  const chapterStatuses = tome1Chapters.map(getStatutEditorialChapitreTome1);
  const chapterEmpty = chapterStatuses.filter((status) => status === "vide").length;
  const chapterDrafts = chapterStatuses.filter((status) => status === "brouillon").length;
  const chapterNeedsReview = chapterStatuses.filter((status) => status === "à réviser").length;
  const chapterValidated = chapterStatuses.filter((status) => status === "validé").length;
  const totalChapters = structureChapterCount || tome1Chapters.length;
  const tome1Total = tome1Chapters.length;
  const startedChapters = Math.max(tome1Total - chapterEmpty, 0);
  const percent = (count: number, total: number) => (total > 0 ? Math.round((count / total) * 100) : 0);
  const lastExportAt = localStorage.getItem(LAST_EXPORT_KEY);
  const backupState = getSecurityStatus(lastExportAt);
  const invalidKeys = [
    tomesRead.invalid ? STRUCTURE_TOMES_STORAGE_KEY : "",
    structureChaptersRead.invalid ? STRUCTURE_CHAPITRES_STORAGE_KEY : "",
    tome1Read.invalid ? CHAPITRES_TOME_1_STORAGE_KEY : "",
    fragmentsRead.invalid ? FRAGMENTS_STORAGE_KEY : "",
    scenesRead.invalid ? SCENES_STORAGE_KEY : "",
  ].filter(Boolean);

  const detectedKeys = TRACKED_KEYS.map(({ key, label }) => {
    const raw = localStorage.getItem(key);
    if (raw === null) return { key, label, present: false, invalid: false, count: null };

    const parsed = readJson<unknown>(key);
    return {
      key,
      label,
      present: true,
      invalid: parsed.invalid,
      count: parsed.invalid ? null : countCollection(parsed.value),
    };
  });

  return {
    ...backupState,
    chapterDrafts,
    chapterEmpty,
    chapterNeedsReview,
    chapterValidated,
    detectedKeys,
    fragments,
    invalidKeys,
    lastExportAt,
    lastModifiedAt: findLatestDate([
      ...tome1Chapters,
      ...fragments,
      ...fragments.flatMap((fragment) => fragment.versions),
      ...scenes,
    ]),
    narrativeRelationCount: countNarrativeRelations(),
    scenes,
    startedChapterPercent: percent(startedChapters, tome1Total),
    structureChapterCount,
    tome1Chapters,
    tome1ProgressPercent: percent(startedChapters + chapterValidated, tome1Total * 2),
    totalChapters,
    totalFragments: fragments.length,
    totalLinkedItems: countLinkedItems(fragments, scenes),
    totalTomes: tomes.length,
    validatedChapterPercent: percent(chapterValidated, tome1Total),
  };
}

function getStatusTone(status: SecurityStatus) {
  if (status === "OK") return "border-emerald-300/45 bg-emerald-400/10 text-emerald-100";
  if (status === "Attention") return "border-amber-300/50 bg-amber-400/12 text-amber-100";

  return "border-red-400/50 bg-red-500/12 text-red-100";
}

function MetricCard({
  label,
  value,
  detail,
}: {
  label: string;
  value: number | string | null;
  detail?: string;
}) {
  return (
    <article className="internal-card min-h-[104px]">
      <p className="editorial-label">{label}</p>
      <p className="mt-3 text-3xl font-semibold text-[#f1e7d5]">{typeof value === "number" ? formatMetric(value) : value}</p>
      {detail ? <p className="mt-2 text-xs leading-5 text-[#a99b84]">{detail}</p> : null}
    </article>
  );
}

function ProgressBar({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <div className="mb-2 flex items-center justify-between gap-3 text-xs text-[#cfc1aa]">
        <span>{label}</span>
        <span className="font-semibold text-[#f1e7d5]">{value}%</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-[#0d0c0a]">
        <div className="h-full rounded-full bg-[#d6b25e]" style={{ width: `${Math.min(Math.max(value, 0), 100)}%` }} />
      </div>
    </div>
  );
}

export default function Dashboard() {
  const [snapshot, setSnapshot] = useState<DashboardSnapshot | null>(null);

  useEffect(() => {
    const refresh = () => setSnapshot(buildSnapshot());

    refresh();
    window.addEventListener("storage", refresh);

    return () => window.removeEventListener("storage", refresh);
  }, []);

  const alerts = useMemo(() => {
    if (!snapshot) return [];

    const items: string[] = [];
    if (snapshot.tome1Chapters.length > 0 && snapshot.chapterEmpty / snapshot.tome1Chapters.length >= 0.4) {
      items.push("Beaucoup de chapitres du Tome 1 sont encore vides.");
    }

    if (snapshot.backupStatus !== "OK") {
      items.push(snapshot.backupMessage);
    }

    if (snapshot.invalidKeys.length > 0) {
      items.push(`Données JSON invalides détectées : ${snapshot.invalidKeys.join(", ")}.`);
    }

    return items;
  }, [snapshot]);

  if (!snapshot) {
    return (
      <section className="internal-panel">
        <p className="editorial-body">Lecture du localStorage...</p>
      </section>
    );
  }

  return (
    <main className="internal-page">
      <div className="internal-shell">
        <header className="internal-header">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="internal-kicker">Tableau de bord réel</p>
              <h1 className="internal-title">L’Héritage des Silences</h1>
              <p className="internal-subtitle">
                Lecture directe des données présentes dans le navigateur, sans modification des structures existantes.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Link className="internal-button" href="/">
                Accueil
              </Link>
              <Link className="internal-button-primary" href="/backup">
                Sauvegarde
              </Link>
            </div>
          </div>
        </header>

        <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <MetricCard label="Tomes" value={snapshot.totalTomes} />
          <MetricCard label="Chapitres" value={snapshot.totalChapters} detail={`${snapshot.structureChapterCount} dans la structure générale`} />
          <MetricCard label="Fragments" value={snapshot.totalFragments} />
          <MetricCard label="Scènes" value={snapshot.scenes.length} />
          <MetricCard label="Chapitres vides" value={snapshot.chapterEmpty} />
          <MetricCard label="Brouillons" value={snapshot.chapterDrafts} />
          <MetricCard label="À réviser" value={snapshot.chapterNeedsReview} />
          <MetricCard label="Validés" value={snapshot.chapterValidated} />
          <MetricCard label="Liés aux chapitres" value={snapshot.totalLinkedItems} detail="Scènes et fragments avec tome, chapitre ou liaison." />
          <MetricCard label="Relations narratives" value={snapshot.narrativeRelationCount} />
          <MetricCard label="Dernière modification" value={formatDateTime(snapshot.lastModifiedAt)} />
          <MetricCard label="Dernier export" value={formatDateTime(snapshot.lastExportAt)} />
        </section>

        <section className="mt-4 grid gap-4 lg:grid-cols-[1fr_0.72fr]">
          <article className="internal-panel">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <p className="editorial-label">Santé du projet</p>
                <h2 className="mt-2 text-xl font-semibold text-[#f1e7d5]">Progression du Tome 1</h2>
              </div>
              <span className={`w-fit rounded-full border px-3 py-1 text-[11px] font-bold ${getStatusTone(snapshot.backupStatus)}`}>
                Sauvegarde : {snapshot.backupStatus}
              </span>
            </div>

            <div className="mt-5 grid gap-4">
              <ProgressBar label="Progression Tome 1" value={snapshot.tome1ProgressPercent} />
              <ProgressBar label="Chapitres validés" value={snapshot.validatedChapterPercent} />
              <ProgressBar label="Chapitres commencés" value={snapshot.startedChapterPercent} />
            </div>

            <div className="mt-5 grid gap-2">
              {alerts.length > 0 ? (
                alerts.map((alert) => (
                  <p className="rounded-xl border border-amber-300/35 bg-amber-400/10 px-3 py-2 text-sm text-amber-100" key={alert}>
                    {alert}
                  </p>
                ))
              ) : (
                <p className="rounded-xl border border-emerald-300/35 bg-emerald-400/10 px-3 py-2 text-sm text-emerald-100">
                  Aucun signal critique détecté.
                </p>
              )}
            </div>
          </article>

          <article className="internal-panel">
            <p className="editorial-label">Données détectées</p>
            <div className="mt-4 grid gap-2">
              {snapshot.detectedKeys.map((item) => (
                <div
                  className="flex items-center justify-between gap-3 rounded-xl border border-[#d6b25e]/14 bg-[#0f0d0a]/60 px-3 py-2"
                  key={item.key}
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-[#f1e7d5]">{item.label}</p>
                    <p className="truncate text-[11px] text-[#a99b84]">{item.key}</p>
                  </div>
                  <span className={`shrink-0 rounded-full border px-2 py-1 text-[10px] font-bold ${
                    item.invalid
                      ? "border-red-300/40 bg-red-400/10 text-red-100"
                      : item.present
                        ? "border-emerald-300/35 bg-emerald-400/10 text-emerald-100"
                        : "border-[#d6b25e]/18 bg-[#191610] text-[#a99b84]"
                  }`}
                  >
                    {item.invalid ? "invalide" : item.present ? formatMetric(item.count) : "absente"}
                  </span>
                </div>
              ))}
            </div>
          </article>
        </section>
      </div>
    </main>
  );
}
