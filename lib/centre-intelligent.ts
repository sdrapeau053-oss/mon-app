import { readContinuity } from "@/lib/continuity";
import { getAiApplicationsStats } from "@/lib/freelance-ai-applications";
import { readCentreQuickSettings, readStoredOrchestratorState } from "@/lib/system-orchestrator";
import { getNumeroChapitreTome1, lireChapitresTome1DepuisStorage, type ChapitreTome1 } from "@/lib/tome1-chapters";

type DailyTask = {
  done: boolean;
  id: string;
  label: string;
};

type DailyState = {
  energie?: string;
  hardDay?: boolean;
  tasks?: DailyTask[];
};

export type TodayDecision = {
  action: string;
  href: string;
  metrics: {
    energie: string;
    progression: string;
    surcharge: string;
  };
  reasons: string[];
  time: string;
  type: "urgence" | "manuscrit" | "business" | "daily" | "recuperation";
};

function canUseStorage() {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

function todayKey() {
  return `daily-system-${new Date().toLocaleDateString("fr-CA")}`;
}

function parseJson<T>(key: string, fallback: T): T {
  if (!canUseStorage()) return fallback;

  try {
    const saved = localStorage.getItem(key);
    return saved ? ({ ...fallback, ...JSON.parse(saved) } as T) : fallback;
  } catch {
    return fallback;
  }
}

function isWritten(chapter: ChapitreTome1) {
  return Boolean(chapter.contenu.trim()) || chapter.statut === "écrit" || chapter.statut === "scellé";
}

function isSealed(chapter: ChapitreTome1) {
  return chapter.statut === "scellé" || chapter.statut === "gele" || chapter.statutStructure === "gele";
}

function getNextManuscriptChapter() {
  const chapters = lireChapitresTome1DepuisStorage();
  const sorted = [...chapters].sort((a, b) => getNumeroChapitreTome1(a.id) - getNumeroChapitreTome1(b.id));
  const toWrite = sorted.find((chapter) => !isWritten(chapter) || chapter.statut === "à écrire" || chapter.statut === "vide");
  const toReview = sorted.find((chapter) => isWritten(chapter) && !isSealed(chapter));

  return toWrite || toReview || sorted[0] || null;
}

function getChapterLabel(chapter: ChapitreTome1 | null) {
  if (!chapter) return "";
  return `Chapitre ${getNumeroChapitreTome1(chapter.id)}`;
}

function isLowEnergy(value: string) {
  const normalized = value.toLowerCase();
  return ["fatigue", "basse", "épuis", "epuis", "difficile"].some((pattern) => normalized.includes(pattern));
}

function isBusinessSignal(value: string) {
  const normalized = value.toLowerCase();
  return ["alignerr", "business", "candidature", "client", "cv", "freelance", "linkedin", "mission", "profil", "prospect", "répondre", "repondre"].some((pattern) =>
    normalized.includes(pattern),
  );
}

function readRoadmapSignal() {
  if (!canUseStorage()) return "";

  try {
    const parsed = JSON.parse(localStorage.getItem("strate-roadmap-master") || "[]");
    if (!Array.isArray(parsed)) return "";
    const active = parsed.find((item) => item?.id === "bloc-1-centre-intelligent" && item?.status === "en-cours");
    return active ? "Roadmap : Centre intelligent en cours" : "";
  } catch {
    return "";
  }
}

export function getTodayDecision(): TodayDecision {
  const orchestration = readStoredOrchestratorState();
  const quickSettings = readCentreQuickSettings();
  const daily = parseJson<DailyState>(todayKey(), {});
  const continuity = readContinuity();
  const chapter = getNextManuscriptChapter();
  const chapterLabel = getChapterLabel(chapter);
  const firstDailyTask = (daily.tasks || []).find((task) => !task.done)?.label || "";
  const energy = quickSettings.energie || daily.energie || orchestration.energie || "Non renseignée";
  const hardDay = Boolean(orchestration.journeeDifficile || daily.hardDay);
  const highOverload = orchestration.surcharge === "Haute";
  const roadmapSignal = readRoadmapSignal();
  const aiApplications = getAiApplicationsStats();
  const progression = chapterLabel ? `${chapterLabel} prioritaire` : "À préciser";

  const baseMetrics = {
    energie: energy,
    progression,
    surcharge: orchestration.surcharge || "Basse",
  };

  if (orchestration.urgenceActive) {
    return {
      action: "Ouvrir la priorité du moment",
      href: "/urgence-malika",
      metrics: baseMetrics,
      reasons: ["Priorité du moment active", "Stabilisation avant production", "Aucun autre choix demandé"],
      time: "10 minutes",
      type: "urgence",
    };
  }

  if (isLowEnergy(energy) && highOverload) {
    return {
      action: "Récupération courte",
      href: "/life-operating-system",
      metrics: baseMetrics,
      reasons: ["Énergie basse", "Surcharge élevée", "Récupération avant production"],
      time: "10 minutes",
      type: "recuperation",
    };
  }

  if (chapter && hardDay) {
    return {
      action: `10 minutes sur ${chapterLabel}`,
      href: "/mission-manuscrit",
      metrics: baseMetrics,
      reasons: ["Journée difficile", "Micro-action seulement", "Chapitre prioritaire identifié"],
      time: "10 minutes",
      type: "manuscrit",
    };
  }

  if (chapter && (!isWritten(chapter) || !isSealed(chapter))) {
    return {
      action: `Continuer ${chapterLabel}`,
      href: "/mission-manuscrit",
      metrics: baseMetrics,
      reasons: [
        continuity.lastPage || continuity.lastChapter ? "Continuité active" : "Mission manuscrit disponible",
        "Chapitre prioritaire",
        roadmapSignal || "Aucune urgence détectée",
      ].filter(Boolean),
      time: "20 minutes",
      type: "manuscrit",
    };
  }

  const businessSource = [
    aiApplications.count > 0 ? aiApplications.nextAction : "",
    quickSettings.prochaineAction,
    quickSettings.actionCritique,
    quickSettings.priorite,
    firstDailyTask,
  ].find(isBusinessSignal);
  if (businessSource) {
    return {
      action: hardDay ? "Répondre à un client" : businessSource,
      href: businessSource === aiApplications.nextAction ? "/freelance-candidature-ia" : "/freelance",
      metrics: baseMetrics,
      reasons: ["Action business détectée", hardDay ? "Format micro-action" : "Priorité exploitable", "Aucune urgence détectée"],
      time: hardDay ? "10 minutes" : "20 minutes",
      type: "business",
    };
  }

  if (firstDailyTask && !hardDay) {
    return {
      action: firstDailyTask,
      href: "/daily-system",
      metrics: baseMetrics,
      reasons: ["Tâche quotidienne ouverte", "Compatible avec l’énergie", "Aucun élément plus urgent"],
      time: "15 minutes",
      type: "daily",
    };
  }

  return {
    action: hardDay ? "Prendre une marche" : "Ouvrir Life OS",
    href: "/life-operating-system",
    metrics: baseMetrics,
    reasons: [hardDay ? "Journée difficile" : "Aucune priorité plus urgente", "Action simple", "Récupération utile"],
    time: "10 minutes",
    type: "recuperation",
  };
}
