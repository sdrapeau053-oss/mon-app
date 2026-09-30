import type { MentalParkingItem } from "./mental-parking-types";

export const MENTAL_PARKING_STORAGE_KEY = "strate-cdc-mental-parking";

const MAX_MENTAL_PARKING_ITEMS = 500;

export function readMentalParkingItems(): MentalParkingItem[] {
  try {
    const raw = localStorage.getItem(MENTAL_PARKING_STORAGE_KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.filter(isMentalParkingItem) : [];
  } catch {
    return [];
  }
}

export function addMentalParkingItem(item: MentalParkingItem): MentalParkingItem[] {
  const next = [item, ...readMentalParkingItems()].slice(0, MAX_MENTAL_PARKING_ITEMS);
  writeMentalParkingItems(next);
  return next;
}

export function archiveMentalParkingItem(id: string): MentalParkingItem[] {
  const next = readMentalParkingItems().map((item) => (item.id === id ? { ...item, archived: true } : item));
  writeMentalParkingItems(next);
  return next;
}

export function generateMentalParkingId() {
  return `parking-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function writeMentalParkingItems(items: MentalParkingItem[]) {
  try {
    localStorage.setItem(MENTAL_PARKING_STORAGE_KEY, JSON.stringify(items.slice(0, MAX_MENTAL_PARKING_ITEMS)));
  } catch {
    // localStorage peut être plein ou indisponible.
  }
}

function isMentalParkingItem(value: unknown): value is MentalParkingItem {
  if (!value || typeof value !== "object") return false;
  const item = value as Partial<MentalParkingItem>;
  return typeof item.id === "string" && typeof item.createdAt === "string" && typeof item.text === "string";
}
