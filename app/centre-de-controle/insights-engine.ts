import { BRAIN_FOG_CAUSE_LABELS, type BrainFogEntry } from "./brain-fog-types";
import { EXECUTION_CATEGORY_LABELS, type ExecutionCategory, type ExecutionEntry } from "./execution-journal-types";
import { MENTAL_PARKING_CATEGORY_LABELS, type MentalParkingCategory, type MentalParkingItem } from "./mental-parking-types";
import type { Insight, InsightConfidence, InsightsResult } from "./insights-types";

const REQUIRED_DAYS = 7;
const DOMAIN_KEYWORDS: Record<ExecutionCategory, string[]> = {
  administratif: ["admin", "administratif", "papier", "document", "dossier", "facture", "formulaire"],
  autre: [],
  business: ["business", "client", "freelance", "candidature", "prospect", "linkedin"],
  ecriture: ["écrire", "ecrire", "chapitre", "manuscrit", "livre", "texte", "scène", "scene"],
  maison: ["maison", "ménage", "menage", "vaisselle", "linge", "ranger", "ménager"],
  sante: ["santé", "sante", "rdv", "médecin", "medecin", "médicament", "repos", "corps"],
};

type BuildInsightsInput = {
  brainFogEntries: BrainFogEntry[];
  commandUpdatedAt?: string;
  executionEntries: ExecutionEntry[];
  mentalParkingItems: MentalParkingItem[];
};

export function buildInsights(input: BuildInsightsInput): InsightsResult {
  const availableDays = countAvailableDays(input);
  if (availableDays < REQUIRED_DAYS) return { availableDays, insights: [], requiredDays: REQUIRED_DAYS };

  const confidence = confidenceFromDays(availableDays);
  const insights = [
    brainFogInsight(input.brainFogEntries, confidence),
    executionInsight(input.executionEntries, confidence),
    activeDomainsInsight(input.executionEntries, confidence),
    avoidedDomainsInsight(input.mentalParkingItems, input.executionEntries, confidence),
    mentalLoadInsight(input.mentalParkingItems, confidence),
  ].filter(Boolean) as Insight[];

  return { availableDays, insights: insights.slice(0, 5), requiredDays: REQUIRED_DAYS };
}

export function activityCounts(entries: ExecutionEntry[]) {
  const now = Date.now();
  return {
    last30Days: countSince(entries, now, 30),
    last7Days: countSince(entries, now, 7),
    today: entries.filter((entry) => dayKey(entry.createdAt) === dayKey(new Date(now).toISOString())).length,
  };
}

function brainFogInsight(entries: BrainFogEntry[], confidence: InsightConfidence): Insight | null {
  if (!entries.length) return null;
  const scores = entries.map((entry) => entry.analysis.score);
  const average = Math.round((scores.reduce((sum, score) => sum + score, 0) / scores.length) * 10) / 10;
  const cause = mostFrequent(entries.map((entry) => entry.analysis.causePrincipale));
  if (!cause) return null;
  return {
    confidence,
    description: `Score moyen ${average}/10 · min ${Math.min(...scores)}/10 · max ${Math.max(...scores)}/10. Cause la plus fréquente : ${BRAIN_FOG_CAUSE_LABELS[cause]}.`,
    id: "brain-fog",
    title: "Brain Fog",
  };
}

function executionInsight(entries: ExecutionEntry[], confidence: InsightConfidence): Insight | null {
  if (!entries.length) return null;
  const days = Math.max(countDistinctDays(entries.map((entry) => entry.createdAt)), 1);
  const average = Math.round((entries.length / days) * 10) / 10;
  const bestDay = bestExecutionDay(entries);
  const streak = currentStreak(entries);
  return {
    confidence,
    description: `Moyenne : ${average} action(s) par jour. Meilleure journée : ${bestDay.count} action(s). Série actuelle : ${streak} jour(s).`,
    id: "execution",
    title: "Exécution",
  };
}

function activeDomainsInsight(entries: ExecutionEntry[], confidence: InsightConfidence): Insight | null {
  const top = topCounts(entries.map((entry) => entry.category), 3);
  if (!top.length) return null;
  return {
    confidence,
    description: `Domaines les plus actifs : ${top.map(([category, count]) => `${EXECUTION_CATEGORY_LABELS[category]} (${count})`).join(", ")}.`,
    id: "active-domains",
    title: "Domaines actifs",
  };
}

function avoidedDomainsInsight(parkingItems: MentalParkingItem[], entries: ExecutionEntry[], confidence: InsightConfidence): Insight | null {
  const parkingDomains = parkingItems.map(inferDomainFromParking).filter(Boolean) as ExecutionCategory[];
  const parkingCounts = countBy(parkingDomains);
  const executionCounts = countBy(entries.map((entry) => entry.category));
  const avoided = (Object.entries(parkingCounts) as [ExecutionCategory, number][])
    .filter(([domain, parkingCount]) => parkingCount >= 3 && parkingCount >= (executionCounts[domain] || 0) * 3)
    .sort((a, b) => b[1] - a[1])[0];

  if (!avoided) return null;
  return {
    confidence,
    description: `${EXECUTION_CATEGORY_LABELS[avoided[0]]} apparaît souvent dans le Parking Mental, mais peu dans le Journal d’exécution.`,
    id: "avoided-domains",
    title: "Domaines évités",
  };
}

function mentalLoadInsight(items: MentalParkingItem[], confidence: InsightConfidence): Insight | null {
  if (!items.length) return null;
  const counts = countBy(items.map((item) => item.category));
  const top = (Object.entries(counts) as [MentalParkingCategory, number][]).sort((a, b) => b[1] - a[1])[0];
  if (!top || top[1] <= items.length / 2) return null;
  return {
    confidence,
    description: `${MENTAL_PARKING_CATEGORY_LABELS[top[0]]} représente actuellement la majorité des éléments déposés.`,
    id: "mental-load",
    title: "Charge mentale",
  };
}

function countAvailableDays(input: BuildInsightsInput) {
  const dates = [
    ...input.brainFogEntries.map((entry) => entry.createdAt),
    ...input.executionEntries.map((entry) => entry.createdAt),
    ...input.mentalParkingItems.map((item) => item.createdAt),
    input.commandUpdatedAt,
  ].filter(Boolean) as string[];
  return countDistinctDays(dates);
}

function confidenceFromDays(days: number): InsightConfidence {
  if (days >= 30) return "élevée";
  if (days >= 14) return "moyenne";
  return "faible";
}

function inferDomainFromParking(item: MentalParkingItem): ExecutionCategory | null {
  const text = `${item.category} ${item.text}`.toLowerCase();
  for (const [domain, keywords] of Object.entries(DOMAIN_KEYWORDS) as [ExecutionCategory, string[]][]) {
    if (keywords.some((keyword) => text.includes(keyword))) return domain;
  }
  return item.category === "tache" ? "autre" : null;
}

function bestExecutionDay(entries: ExecutionEntry[]) {
  const counts = countBy(entries.map((entry) => dayKey(entry.createdAt)));
  const best = Object.entries(counts).sort((a, b) => b[1] - a[1])[0];
  return { count: best?.[1] || 0, day: best?.[0] || "" };
}

function currentStreak(entries: ExecutionEntry[]) {
  const days = new Set(entries.map((entry) => dayKey(entry.createdAt)));
  let streak = 0;
  const cursor = new Date();
  while (days.has(dayKey(cursor.toISOString()))) {
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}

function topCounts<T extends string>(items: T[], limit: number): [T, number][] {
  return (Object.entries(countBy(items)) as [T, number][]).sort((a, b) => b[1] - a[1]).slice(0, limit);
}

function mostFrequent<T extends string>(items: T[]): T | null {
  return topCounts(items, 1)[0]?.[0] || null;
}

function countBy<T extends string>(items: T[]): Record<T, number> {
  return items.reduce<Record<T, number>>((counts, item) => {
    counts[item] = (counts[item] || 0) + 1;
    return counts;
  }, {} as Record<T, number>);
}

function countSince(entries: ExecutionEntry[], now: number, days: number) {
  const cutoff = now - days * 24 * 60 * 60 * 1000;
  return entries.filter((entry) => new Date(entry.createdAt).getTime() >= cutoff).length;
}

function countDistinctDays(dates: string[]) {
  return new Set(dates.map(dayKey).filter(Boolean)).size;
}

function dayKey(date: string) {
  const parsed = new Date(date);
  if (!Number.isFinite(parsed.getTime())) return "";
  return parsed.toISOString().slice(0, 10);
}
