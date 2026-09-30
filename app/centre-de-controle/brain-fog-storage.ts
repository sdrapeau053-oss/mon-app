// ─── Brain Fog Storage ───────────────────────────────────────────────────────
// Gestion localStorage uniquement.
// Aucune logique métier — déléguer à brain-fog-engine.ts.

import type {
  BrainFogEntry,
  BrainFogStoragePayload,
} from "./brain-fog-types";

// ─── Clé localStorage (préfixe strate-cdc- obligatoire) ──────────────────────
// Stocke un tableau d'entrées de scan, conservées 90 jours.
// Format : { entries: BrainFogEntry[], updatedAt: string }
export const BRAIN_FOG_STORAGE_KEY = "strate-cdc-brain-fog-entries";

const MAX_RETENTION_DAYS = 90;
const MAX_ENTRIES = 200;

// ─── Lecture ─────────────────────────────────────────────────────────────────

export function readBrainFogEntries(): BrainFogEntry[] {
  try {
    const raw = localStorage.getItem(BRAIN_FOG_STORAGE_KEY);
    if (!raw) return [];

    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return [];

    const payload = parsed as Partial<BrainFogStoragePayload>;
    if (!Array.isArray(payload.entries)) return [];

    return payload.entries;
  } catch {
    return [];
  }
}

export function readLatestBrainFogEntry(): BrainFogEntry | null {
  const entries = readBrainFogEntries();
  if (entries.length === 0) return null;

  return entries.reduce((latest, entry) =>
    entry.createdAt > latest.createdAt ? entry : latest,
  );
}

/** Retourner les entrées des N derniers jours. */
export function readRecentBrainFogEntries(days = 7): BrainFogEntry[] {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - days);
  const cutoffIso = cutoff.toISOString();

  return readBrainFogEntries().filter((e) => e.createdAt >= cutoffIso);
}

// ─── Écriture ─────────────────────────────────────────────────────────────────

export function saveBrainFogEntry(entry: BrainFogEntry): void {
  try {
    const existing = readBrainFogEntries();
    const pruned = pruneOldEntries(existing, MAX_RETENTION_DAYS);

    const updated = [...pruned, entry].slice(-MAX_ENTRIES);

    const payload: BrainFogStoragePayload = {
      entries: updated,
      updatedAt: new Date().toISOString(),
    };

    localStorage.setItem(BRAIN_FOG_STORAGE_KEY, JSON.stringify(payload));
  } catch {
    // Écriture silencieuse — localStorage peut être plein ou bloqué
  }
}

// ─── Nettoyage ────────────────────────────────────────────────────────────────

export function pruneOldEntries(
  entries: BrainFogEntry[],
  maxDays: number,
): BrainFogEntry[] {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - maxDays);
  const cutoffIso = cutoff.toISOString();

  return entries.filter((e) => e.createdAt >= cutoffIso);
}

// ─── Génération d'ID ──────────────────────────────────────────────────────────

export function generateBrainFogEntryId(): string {
  return `bf-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}
