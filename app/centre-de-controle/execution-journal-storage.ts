import type { ExecutionEntry } from "./execution-journal-types";

export const EXECUTION_JOURNAL_STORAGE_KEY = "strate-cdc-execution-journal";

export function readExecutionEntries(): ExecutionEntry[] {
  try {
    const raw = localStorage.getItem(EXECUTION_JOURNAL_STORAGE_KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.filter(isExecutionEntry) : [];
  } catch {
    return [];
  }
}

export function addExecutionEntry(entry: ExecutionEntry): ExecutionEntry[] {
  const next = [entry, ...readExecutionEntries()];
  writeExecutionEntries(next);
  return next;
}

export function generateExecutionEntryId() {
  return `execution-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function writeExecutionEntries(entries: ExecutionEntry[]) {
  try {
    localStorage.setItem(EXECUTION_JOURNAL_STORAGE_KEY, JSON.stringify(entries));
  } catch {
    // localStorage peut être plein ou indisponible.
  }
}

function isExecutionEntry(value: unknown): value is ExecutionEntry {
  if (!value || typeof value !== "object") return false;
  const entry = value as Partial<ExecutionEntry>;
  return typeof entry.id === "string" && typeof entry.createdAt === "string" && typeof entry.text === "string";
}
