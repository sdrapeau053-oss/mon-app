import type { CommandCenterState, StoredCommandCenterState } from "./command-center-types";

const COMMAND_CENTER_STORAGE_KEY = "strate-cdc-state";

export function readStoredCommandCenterState(): StoredCommandCenterState | null {
  try {
    const saved = localStorage.getItem(COMMAND_CENTER_STORAGE_KEY);
    if (!saved) return null;
    const parsed = JSON.parse(saved);
    if (!parsed || typeof parsed !== "object") return null;
    if (!("updatedAt" in parsed) || !("state" in parsed)) return null;
    return parsed as StoredCommandCenterState;
  } catch {
    return null;
  }
}

export function saveStoredCommandCenterState(state: CommandCenterState) {
  const payload: StoredCommandCenterState = {
    state,
    updatedAt: new Date().toISOString(),
  };
  localStorage.setItem(COMMAND_CENTER_STORAGE_KEY, JSON.stringify(payload));
}

export { COMMAND_CENTER_STORAGE_KEY };
