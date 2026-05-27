"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useLanguage } from "@/lib/LanguageContext";
import { t } from "@/lib/i18n";

type DailyState = {
  anxiete: number;
  clarte: number;
  concentration: number;
  dissociation: number;
  energie: number;
  motivation: number;
  sommeil: number;
  surcharge: number;
};

type AnchorKey =
  | "eau"
  | "nourriture"
  | "mouvement"
  | "respiration"
  | "lumiere"
  | "douche"
  | "dehors"
  | "pauseEcran";

type MovementKey =
  | "marche"
  | "yoga"
  | "danse"
  | "etirements"
  | "respiration"
  | "mobilisation"
  | "hydratation"
  | "reposCorporel";

type ReminderKey = "matin" | "apresMidi" | "soir" | "avantEcriture" | "apresSurcharge";
type Priority = "écrire" | "corriger" | "repos" | "administratif" | "freelance" | "maison" | "récupération";

type DailyEntry = {
  anchors: Record<AnchorKey, boolean>;
  date: string;
  movement: Record<MovementKey, boolean>;
  priority: Priority;
  reminders: Record<ReminderKey, boolean>;
  resonanceSessions: string[];
  state: DailyState;
  touchedWriting: boolean;
  updatedAt: string;
};

type LifeData = {
  entries: DailyEntry[];
  version: 1;
};

type JournalField =
  | "whatIDidToday"
  | "lifeForward"
  | "energyDrain"
  | "emotionalState"
  | "relationshipThoughts"
  | "businessProgress"
  | "manuscriptProgress"
  | "healthNervousSystem"
  | "avoidanceBehaviors"
  | "proudOf"
  | "avoided"
  | "realization"
  | "tomorrowTask";

type PillarKey =
  | "emotionalStability"
  | "wealthBusiness"
  | "creativeWork"
  | "relationships"
  | "physicalHealth"
  | "nervousSystem"
  | "disciplineExecution"
  | "futureSelfAlignment";

type NervousKey =
  | "emotionallyNumb"
  | "disconnectedBody"
  | "unrealDetached"
  | "watchingSelf"
  | "surroundingsDreamlike"
  | "emotionallyFrozen"
  | "cannotIdentifyFeelings"
  | "mindFoggy"
  | "loseTrackTime"
  | "mentallyElsewhere"
  | "unsafe"
  | "bodyBraced"
  | "overwhelmed"
  | "shutDown"
  | "disconnectedPeople"
  | "avoidEmotions"
  | "hypervigilant"
  | "emotionallyExhausted"
  | "identityDetached"
  | "pleasureDisconnected";

type RealityKey =
  | "concreteEvent"
  | "knownFacts"
  | "assumptions"
  | "strongestEmotion"
  | "bodyState"
  | "physicallySafe"
  | "neutralObserver"
  | "thinkingPattern";

type CheckinMode = "quick" | "full";
type DailyMode = "simple" | "structured";
type CheckinSectionKey = "emotional" | "dissociation" | "hypervigilance" | "body" | "exhaustion";

type DailyJournal = {
  bodyReconnection: Record<string, string>;
  date: string;
  freezeDetection: {
    lastCheckedAt: string | null;
    likely: boolean;
    signals: string[];
  };
  journal: Record<JournalField, string>;
  nervousSystem: Record<NervousKey, number>;
  overanalysisInterruptions: string[];
  pillars: Record<PillarKey, number>;
  realityCheck: Record<RealityKey, string>;
  updatedAt: string;
  version: 1;
};

type StateClassification = {
  action: string;
  actionKey: string;
  indicatorKeys: string[];
  indicators: string[];
  state: string;
  stateKey: string;
  tone: string;
};

type LifeTab = "etat" | "corps" | "journal" | "outils";

const STORAGE_KEY = "life-operating-system";
const ACTIVE_TAB_KEY = "life-os-active-tab";
const CHECKIN_MODE_KEY = "life-os-checkin-mode";
const DAILY_MODE_KEY = "life-os-daily-mode";
const BACKUP_EXPORT_KEY = "backup:lastManualExportAt";
const SYSTEM_STATE_KEY = "system-state";

const defaultState: DailyState = {
  anxiete: 4,
  clarte: 5,
  concentration: 5,
  dissociation: 3,
  energie: 5,
  motivation: 5,
  sommeil: 5,
  surcharge: 4,
};

const anchorLabels: Array<{ key: AnchorKey; label: string; labelKey?: string }> = [
  { key: "eau", label: "eau", labelKey: "life.body.anchor.water" },
  { key: "nourriture", label: "nourriture", labelKey: "life.body.anchor.food" },
  { key: "mouvement", label: "mouvement", labelKey: "life.body.anchor.movement" },
  { key: "respiration", label: "respiration", labelKey: "life.body.anchor.breathing" },
  { key: "lumiere", label: "lumière naturelle", labelKey: "life.body.anchor.light" },
  { key: "douche", label: "douche", labelKey: "life.body.anchor.shower" },
  { key: "dehors", label: "sortir dehors", labelKey: "life.body.anchor.outside" },
  { key: "pauseEcran", label: "pause écran", labelKey: "life.body.anchor.screenBreak" },
];

const priorities: Priority[] = ["écrire", "corriger", "repos", "administratif", "freelance", "maison", "récupération"];

const defaultAnchors = anchorLabels.reduce<Record<AnchorKey, boolean>>((acc, item) => {
  acc[item.key] = false;
  return acc;
}, {} as Record<AnchorKey, boolean>);

const movementLabels: Array<{ key: MovementKey; label: string; labelKey?: string }> = [
  { key: "marche", label: "marche", labelKey: "life.body.walk" },
  { key: "yoga", label: "yoga", labelKey: "life.body.yoga" },
  { key: "danse", label: "danse", labelKey: "life.body.dance" },
  { key: "etirements", label: "étirements", labelKey: "life.body.stretching" },
  { key: "respiration", label: "respiration", labelKey: "life.body.breathing" },
  { key: "mobilisation", label: "mobilisation douce", labelKey: "life.body.gentleMobilization" },
  { key: "hydratation", label: "hydratation", labelKey: "life.body.hydration" },
  { key: "reposCorporel", label: "repos corporel", labelKey: "life.body.bodyRest" },
];

const reminderLabels: Array<{ key: ReminderKey; label: string; labelKey?: string }> = [
  { key: "matin", label: "matin", labelKey: "life.tools.reminder.morningCheckin" },
  { key: "apresMidi", label: "après-midi", labelKey: "life.tools.reminder.businessAction" },
  { key: "soir", label: "soir", labelKey: "life.tools.reminder.eveningJournal" },
  { key: "avantEcriture", label: "avant écriture", labelKey: "life.tools.reminder.manuscriptWriting" },
  { key: "apresSurcharge", label: "après surcharge", labelKey: "life.tools.reminder.nervousSystemCheckin" },
];

const defaultMovement = movementLabels.reduce<Record<MovementKey, boolean>>((acc, item) => {
  acc[item.key] = false;
  return acc;
}, {} as Record<MovementKey, boolean>);

const defaultReminders = reminderLabels.reduce<Record<ReminderKey, boolean>>((acc, item) => {
  acc[item.key] = false;
  return acc;
}, {} as Record<ReminderKey, boolean>);

const lifeTabs: Array<{ key: LifeTab; label: string; labelKey?: string }> = [
  { key: "etat", label: "État", labelKey: "life.tab.state" },
  { key: "corps", label: "Corps", labelKey: "life.tab.body" },
  { key: "journal", label: "Journal", labelKey: "life.tab.journal" },
  { key: "outils", label: "Outils", labelKey: "life.tab.tools" },
];

const journalFields: Array<{ key: JournalField; label: string; labelKey?: string }> = [
  { key: "whatIDidToday", label: "What I did today", labelKey: "life.journal.question.whatIDidToday" },
  { key: "lifeForward", label: "What moved my life forward", labelKey: "life.journal.question.lifeForward" },
  { key: "energyDrain", label: "What drained my energy", labelKey: "life.journal.question.energyDrain" },
  { key: "emotionalState", label: "Emotional state", labelKey: "life.journal.question.emotionalState" },
  { key: "relationshipThoughts", label: "Relationship thoughts or triggers", labelKey: "life.journal.question.relationshipThoughts" },
  { key: "businessProgress", label: "Business progress", labelKey: "life.journal.question.businessProgress" },
  { key: "manuscriptProgress", label: "Manuscript progress", labelKey: "life.journal.question.manuscriptProgress" },
  { key: "healthNervousSystem", label: "Health / nervous system", labelKey: "life.journal.question.healthNervousSystem" },
  { key: "avoidanceBehaviors", label: "Avoidance behaviors", labelKey: "life.journal.question.avoidanceBehaviors" },
  { key: "proudOf", label: "One thing I am proud of", labelKey: "life.journal.question.proudOf" },
  { key: "avoided", label: "One thing I avoided", labelKey: "life.journal.question.avoided" },
  { key: "realization", label: "One important realization", labelKey: "life.journal.question.realization" },
  { key: "tomorrowTask", label: "Most important task for tomorrow", labelKey: "life.journal.question.tomorrowTask" },
];

const pillarLabels: Array<{ key: PillarKey; label: string; labelKey?: string }> = [
  { key: "emotionalStability", label: "Emotional stability", labelKey: "life.journal.pillar.emotionalStability" },
  { key: "wealthBusiness", label: "Wealth / business", labelKey: "life.journal.pillar.wealthBusiness" },
  { key: "creativeWork", label: "Creative work / manuscript", labelKey: "life.journal.pillar.creativeWork" },
  { key: "relationships", label: "Relationships", labelKey: "life.journal.pillar.relationships" },
  { key: "physicalHealth", label: "Physical health", labelKey: "life.journal.pillar.physicalHealth" },
  { key: "nervousSystem", label: "Nervous system", labelKey: "life.journal.pillar.nervousSystem" },
  { key: "disciplineExecution", label: "Discipline / execution", labelKey: "life.journal.pillar.disciplineExecution" },
  { key: "futureSelfAlignment", label: "Alignment with future self", labelKey: "life.journal.pillar.futureSelfAlignment" },
];

const nervousQuestions: Array<{ key: NervousKey; label: string; labelKey: string }> = [
  { key: "emotionallyNumb", label: "I feel emotionally numb.", labelKey: "life.question.emotionallyNumb" },
  { key: "disconnectedBody", label: "I feel disconnected from my body.", labelKey: "life.question.disconnectedBody" },
  { key: "unrealDetached", label: "I feel unreal or detached from reality.", labelKey: "life.question.unrealDetached" },
  { key: "watchingSelf", label: "I feel like I am watching myself from outside.", labelKey: "life.question.watchingSelf" },
  { key: "surroundingsDreamlike", label: "My surroundings feel distant or dreamlike.", labelKey: "life.question.surroundingsDreamlike" },
  { key: "emotionallyFrozen", label: "I feel emotionally frozen.", labelKey: "life.question.emotionallyFrozen" },
  { key: "cannotIdentifyFeelings", label: "I cannot identify what I feel.", labelKey: "life.question.cannotIdentifyFeelings" },
  { key: "mindFoggy", label: "My mind feels foggy or absent.", labelKey: "life.question.mindFoggy" },
  { key: "loseTrackTime", label: "I lose track of time easily.", labelKey: "life.question.loseTrackTime" },
  { key: "mentallyElsewhere", label: "I feel physically present but mentally elsewhere.", labelKey: "life.question.mentallyElsewhere" },
  { key: "unsafe", label: "I feel unsafe even when nothing dangerous is happening.", labelKey: "life.question.unsafe" },
  { key: "bodyBraced", label: "My body feels tense or braced for danger.", labelKey: "life.question.bodyBraced" },
  { key: "overwhelmed", label: "I feel emotionally overwhelmed.", labelKey: "life.question.overwhelmed" },
  { key: "shutDown", label: "I feel emotionally shut down.", labelKey: "life.question.shutDown" },
  { key: "disconnectedPeople", label: "I feel disconnected from other people.", labelKey: "life.question.disconnectedPeople" },
  { key: "avoidEmotions", label: "I avoid feeling difficult emotions.", labelKey: "life.question.avoidEmotions" },
  { key: "hypervigilant", label: "I feel hypervigilant.", labelKey: "life.question.hypervigilant" },
  { key: "emotionallyExhausted", label: "I feel emotionally exhausted.", labelKey: "life.question.emotionallyExhausted" },
  { key: "identityDetached", label: "I feel detached from my own identity.", labelKey: "life.question.identityDetached" },
  { key: "pleasureDisconnected", label: "I feel unable to fully experience pleasure or connection.", labelKey: "life.question.pleasureDisconnected" },
];

const checkinSections: Array<{ key: CheckinSectionKey; labelKey: string; questionKeys: NervousKey[] }> = [
  {
    key: "emotional",
    labelKey: "life.checkin.section.emotional",
    questionKeys: ["emotionallyNumb", "emotionallyFrozen", "cannotIdentifyFeelings", "overwhelmed", "shutDown", "avoidEmotions"],
  },
  {
    key: "dissociation",
    labelKey: "life.checkin.section.dissociation",
    questionKeys: ["disconnectedBody", "unrealDetached", "watchingSelf", "surroundingsDreamlike", "mentallyElsewhere", "identityDetached"],
  },
  {
    key: "hypervigilance",
    labelKey: "life.checkin.section.hypervigilance",
    questionKeys: ["unsafe", "bodyBraced", "hypervigilant"],
  },
  {
    key: "body",
    labelKey: "life.checkin.section.body",
    questionKeys: ["mindFoggy", "loseTrackTime"],
  },
  {
    key: "exhaustion",
    labelKey: "life.checkin.section.exhaustion",
    questionKeys: ["emotionallyExhausted", "disconnectedPeople", "pleasureDisconnected"],
  },
];

const nervousQuestionByKey = nervousQuestions.reduce<Record<NervousKey, { key: NervousKey; label: string; labelKey: string }>>((acc, question) => {
  acc[question.key] = question;
  return acc;
}, {} as Record<NervousKey, { key: NervousKey; label: string; labelKey: string }>);

const realityFields: Array<{ key: RealityKey; label: string; labelKey?: string }> = [
  { key: "concreteEvent", label: "What concrete event happened?", labelKey: "life.tools.reality.concreteEvent" },
  { key: "knownFacts", label: "What facts do I know?", labelKey: "life.tools.reality.knownFacts" },
  { key: "assumptions", label: "What assumptions am I making?", labelKey: "life.tools.reality.assumptions" },
  { key: "strongestEmotion", label: "What emotion is strongest right now?", labelKey: "life.tools.reality.strongestEmotion" },
  { key: "bodyState", label: "What does my body feel like?", labelKey: "life.tools.reality.bodyState" },
  { key: "physicallySafe", label: "Am I physically safe right now?", labelKey: "life.tools.reality.physicallySafe" },
  { key: "neutralObserver", label: "What would a neutral observer say?", labelKey: "life.tools.reality.neutralObserver" },
  { key: "thinkingPattern", label: "Am I catastrophizing, mind-reading, or emotionally reasoning?", labelKey: "life.tools.reality.thinkingPattern" },
];

const bodyReconnectionFields: Array<{ key: string; labelKey: string }> = [
  { key: "What sensations do I feel in my body right now?", labelKey: "life.body.reconnect.sensations" },
  { key: "Where do I feel tension most strongly?", labelKey: "life.body.reconnect.tension" },
  { key: "What emotion might exist underneath the numbness?", labelKey: "life.body.reconnect.emotionUnderNumbness" },
  { key: "What happened before I started disconnecting?", labelKey: "life.body.reconnect.beforeDisconnecting" },
  { key: "What usually increases my dissociation?", labelKey: "life.body.reconnect.increasesDissociation" },
  { key: "What usually reconnects me to myself?", labelKey: "life.body.reconnect.reconnectsSelf" },
  { key: "What environment helps me feel more grounded?", labelKey: "life.body.reconnect.groundingEnvironment" },
  {
    key: "What do I need right now: safety, rest, space, movement, expression, or support?",
    labelKey: "life.body.reconnect.needNow",
  },
];

const bodyReconnectionSuggestions: Array<{ label: string; labelKey: string }> = [
  { label: "Name 5 things you can see.", labelKey: "life.body.grounding.seeFive" },
  { label: "Name 3 physical sensations.", labelKey: "life.body.grounding.threeSensations" },
  { label: "Describe the room temperature.", labelKey: "life.body.grounding.temperature" },
  { label: "Put both feet on the floor.", labelKey: "life.body.grounding.feetFloor" },
  { label: "Drink cold water slowly.", labelKey: "life.body.grounding.coldWater" },
];

const defaultJournalFields = journalFields.reduce<Record<JournalField, string>>((acc, item) => {
  acc[item.key] = "";
  return acc;
}, {} as Record<JournalField, string>);

const defaultPillars = pillarLabels.reduce<Record<PillarKey, number>>((acc, item) => {
  acc[item.key] = 0;
  return acc;
}, {} as Record<PillarKey, number>);

const defaultNervousScores = nervousQuestions.reduce<Record<NervousKey, number>>((acc, item) => {
  acc[item.key] = 0;
  return acc;
}, {} as Record<NervousKey, number>);

const defaultRealityCheck = realityFields.reduce<Record<RealityKey, string>>((acc, item) => {
  acc[item.key] = "";
  return acc;
}, {} as Record<RealityKey, string>);

const defaultBodyReconnection = bodyReconnectionFields.reduce<Record<string, string>>((acc, item) => {
  acc[item.key] = "";
  return acc;
}, {});

function todayKey() {
  return new Date().toLocaleDateString("fr-CA");
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

function clampMetric(value: unknown, fallback: number) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(10, Math.max(0, parsed));
}

function clampRange(value: unknown, fallback: number, max: number) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(max, Math.max(0, parsed));
}

function dailyJournalKey(date = todayKey()) {
  return `life-operating-system-${date}`;
}

function countWords(value: string) {
  return value.trim().split(/\s+/).filter(Boolean).length;
}

function countMatches(value: string, patterns: RegExp[]) {
  return patterns.reduce((count, pattern) => count + (value.match(pattern)?.length || 0), 0);
}

function repeatedWords(value: string) {
  const counts = new Map<string, number>();
  value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s'-]/g, " ")
    .split(/\s+/)
    .filter((word) => word.length > 4)
    .forEach((word) => counts.set(word, (counts.get(word) || 0) + 1));

  return Array.from(counts.values()).filter((count) => count >= 4).length;
}

function normalizeEntry(value: unknown, fallbackDate = todayKey()): DailyEntry {
  const record = isRecord(value) ? value : {};
  const state = isRecord(record.state) ? record.state : {};
  const anchors = isRecord(record.anchors) ? record.anchors : {};
  const movement = isRecord(record.movement) ? record.movement : {};
  const reminders = isRecord(record.reminders) ? record.reminders : {};
  const priority = priorities.includes(record.priority as Priority) ? (record.priority as Priority) : "écrire";
  const resonanceSessions = Array.isArray(record.resonanceSessions)
    ? record.resonanceSessions.filter((item): item is string => typeof item === "string")
    : [];

  return {
    anchors: anchorLabels.reduce<Record<AnchorKey, boolean>>((acc, item) => {
      acc[item.key] = Boolean(anchors[item.key]);
      return acc;
    }, {} as Record<AnchorKey, boolean>),
    date: typeof record.date === "string" ? record.date : fallbackDate,
    movement: movementLabels.reduce<Record<MovementKey, boolean>>((acc, item) => {
      acc[item.key] = Boolean(movement[item.key]);
      return acc;
    }, {} as Record<MovementKey, boolean>),
    priority,
    reminders: reminderLabels.reduce<Record<ReminderKey, boolean>>((acc, item) => {
      acc[item.key] = Boolean(reminders[item.key]);
      return acc;
    }, {} as Record<ReminderKey, boolean>),
    resonanceSessions,
    state: {
      anxiete: clampMetric(state.anxiete, defaultState.anxiete),
      clarte: clampMetric(state.clarte, defaultState.clarte),
      concentration: clampMetric(state.concentration, defaultState.concentration),
      dissociation: clampMetric(state.dissociation, defaultState.dissociation),
      energie: clampMetric(state.energie, defaultState.energie),
      motivation: clampMetric(state.motivation, defaultState.motivation),
      sommeil: clampMetric(state.sommeil, defaultState.sommeil),
      surcharge: clampMetric(state.surcharge, defaultState.surcharge),
    },
    touchedWriting: Boolean(record.touchedWriting),
    updatedAt: typeof record.updatedAt === "string" ? record.updatedAt : new Date().toISOString(),
  };
}

function readLifeData(): LifeData {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { entries: [], version: 1 };
    const parsed = JSON.parse(raw);
    if (!isRecord(parsed) || !Array.isArray(parsed.entries)) return { entries: [], version: 1 };
    return {
      entries: parsed.entries.map((entry) => normalizeEntry(entry)).slice(-90),
      version: 1,
    };
  } catch {
    return { entries: [], version: 1 };
  }
}

function normalizeDailyJournal(value: unknown, fallbackDate = todayKey()): DailyJournal {
  const record = isRecord(value) ? value : {};
  const journal = isRecord(record.journal) ? record.journal : {};
  const nervousSystem = isRecord(record.nervousSystem) ? record.nervousSystem : {};
  const pillars = isRecord(record.pillars) ? record.pillars : {};
  const bodyReconnection = isRecord(record.bodyReconnection) ? record.bodyReconnection : {};
  const realityCheck = isRecord(record.realityCheck) ? record.realityCheck : {};
  const freezeDetection = isRecord(record.freezeDetection) ? record.freezeDetection : {};

  return {
    bodyReconnection: bodyReconnectionFields.reduce<Record<string, string>>((acc, item) => {
      const value = bodyReconnection[item.key];
      acc[item.key] = typeof value === "string" ? value : "";
      return acc;
    }, {}),
    date: typeof record.date === "string" ? record.date : fallbackDate,
    freezeDetection: {
      lastCheckedAt: typeof freezeDetection.lastCheckedAt === "string" ? freezeDetection.lastCheckedAt : null,
      likely: Boolean(freezeDetection.likely),
      signals: Array.isArray(freezeDetection.signals)
        ? freezeDetection.signals.filter((item): item is string => typeof item === "string").slice(0, 12)
        : [],
    },
    journal: journalFields.reduce<Record<JournalField, string>>((acc, item) => {
      const value = journal[item.key];
      acc[item.key] = typeof value === "string" ? value : "";
      return acc;
    }, {} as Record<JournalField, string>),
    nervousSystem: nervousQuestions.reduce<Record<NervousKey, number>>((acc, item) => {
      acc[item.key] = clampRange(nervousSystem[item.key], defaultNervousScores[item.key], 4);
      return acc;
    }, {} as Record<NervousKey, number>),
    pillars: pillarLabels.reduce<Record<PillarKey, number>>((acc, item) => {
      acc[item.key] = clampRange(pillars[item.key], defaultPillars[item.key], 5);
      return acc;
    }, {} as Record<PillarKey, number>),
    overanalysisInterruptions: Array.isArray(record.overanalysisInterruptions)
      ? record.overanalysisInterruptions.filter((item): item is string => typeof item === "string").slice(-20)
      : [],
    realityCheck: realityFields.reduce<Record<RealityKey, string>>((acc, item) => {
      const entry = realityCheck[item.key];
      acc[item.key] = typeof entry === "string" ? entry : "";
      return acc;
    }, {} as Record<RealityKey, string>),
    updatedAt: typeof record.updatedAt === "string" ? record.updatedAt : new Date().toISOString(),
    version: 1,
  };
}

function readDailyJournal(date = todayKey()) {
  try {
    const raw = localStorage.getItem(dailyJournalKey(date));
    if (!raw) return normalizeDailyJournal({ date }, date);
    return normalizeDailyJournal(JSON.parse(raw), date);
  } catch {
    return normalizeDailyJournal({ date }, date);
  }
}

function formatDateTime(value: string | null) {
  if (!value) return "non disponible";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "non disponible";
  return new Intl.DateTimeFormat("fr-CA", { dateStyle: "medium", timeStyle: "short" }).format(date);
}

function formatDurationSince(value: string | null) {
  if (!value) return "aucune session aujourd’hui";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "non disponible";
  const minutes = Math.max(0, Math.floor((Date.now() - date.getTime()) / 60000));
  if (minutes < 1) return "à l’instant";
  if (minutes < 60) return `il y a ${minutes} min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `il y a ${hours} h`;
  return formatDateTime(value);
}

function formatBodyDurationSince(value: string | null, lang: "fr" | "en") {
  if (!value) return t("life.body.noSessionToday", lang);
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "non disponible";
  const minutes = Math.max(0, Math.floor((Date.now() - date.getTime()) / 60000));
  if (minutes < 1) return t("life.body.now", lang);
  if (minutes < 60) return t("life.body.minutesAgo", lang).replace("{count}", String(minutes));
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return t("life.body.hoursAgo", lang).replace("{count}", String(hours));
  return formatDateTime(value);
}

function countActiveStreak(entries: DailyEntry[]) {
  const dates = new Set(entries.map((entry) => entry.date));
  let streak = 0;
  const cursor = new Date();

  while (dates.has(cursor.toLocaleDateString("fr-CA"))) {
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }

  return streak;
}

function readLastChapterWorked() {
  try {
    const raw = localStorage.getItem(SYSTEM_STATE_KEY);
    if (!raw) return "non disponible";
    const parsed = JSON.parse(raw);
    if (!isRecord(parsed) || typeof parsed.manuscrit !== "string") return "non disponible";
    const chapter = parsed.manuscrit.match(/chapitre-(\d+)/i)?.[1];
    return chapter ? `chapitre ${chapter}` : parsed.manuscrit;
  } catch {
    return "non disponible";
  }
}

function updateTodayEntry(entries: DailyEntry[], entry: DailyEntry) {
  const otherEntries = entries.filter((item) => item.date !== entry.date);
  return [...otherEntries, entry].sort((a, b) => a.date.localeCompare(b.date)).slice(-90);
}

function getSignals(entries: DailyEntry[], today: DailyEntry) {
  const recent = [...entries.filter((entry) => entry.date !== today.date), today].slice(-4);
  const highDissociationDays = recent.filter((entry) => entry.state.dissociation >= 7).length;
  const noProgressDays = recent.filter((entry) => !entry.touchedWriting).length;
  const signals: string[] = [];

  if (highDissociationDays >= 3) signals.push("ralentir");
  if (today.state.sommeil <= 3 || today.state.surcharge >= 8) signals.push("repos recommandé");
  if (noProgressDays >= 3 || today.state.concentration <= 3 || today.state.energie <= 3) signals.push("micro-action recommandée");

  return Array.from(new Set(signals));
}

function getMicroAction(today: DailyEntry, signals: string[], journal: DailyJournal) {
  const scores = journal.nervousSystem;
  const dissociationPeak = Math.max(
    scores.emotionallyNumb,
    scores.disconnectedBody,
    scores.unrealDetached,
    scores.watchingSelf,
    scores.surroundingsDreamlike,
    scores.mentallyElsewhere,
    scores.identityDetached,
  );
  const hypervigilancePeak = Math.max(scores.unsafe, scores.bodyBraced, scores.hypervigilant);
  const exhaustionPeak = Math.max(scores.emotionallyExhausted, scores.pleasureDisconnected, scores.mindFoggy);

  if (dissociationPeak >= 3 || today.state.dissociation >= 7) return "passer de l’eau froide sur les mains";
  if (hypervigilancePeak >= 3 || today.state.anxiete >= 8) return "baisser la lumière et réduire la stimulation";
  if (exhaustionPeak >= 3 || today.state.energie <= 3 || today.state.sommeil <= 3) return "manger quelque chose de simple et se reposer";
  if (today.state.surcharge >= 7) return "choisir une seule action et fermer une boucle";
  if (today.state.clarte >= 7 && today.state.surcharge <= 4 && today.state.dissociation <= 3) return "protéger la simplicité";
  if (!today.anchors.eau) return "boire de l’eau";
  if (today.priority === "écrire") return today.state.concentration >= 5 ? "écrire 3 phrases seulement" : "relire 1 page";
  if (today.priority === "corriger") return "relire 1 page";
  if (today.priority === "freelance") return "faire une micro-action freelance de 10 minutes";
  if (today.priority === "maison") return "choisir une seule tâche maison";
  if (signals.includes("micro-action recommandée")) return "faire une sauvegarde";
  return "ouvrir le chapitre 7";
}

function getContextualBodySignals(today: DailyEntry) {
  const messages: string[] = [];
  if (today.state.surcharge >= 7 || today.state.anxiete >= 7 || today.state.dissociation >= 7) {
    messages.push("Commencer par 2 minutes de résonance cardiaque avant d’écrire.");
  }
  if (today.state.energie <= 3) {
    messages.push("Choisir mouvement doux plutôt que performance.");
  }
  if (today.state.motivation <= 3 && today.state.energie >= 5) {
    messages.push("Une marche courte peut aider à relancer le corps.");
  }
  return messages;
}

function bodySignalKey(message: string) {
  const keys: Record<string, string> = {
    "Commencer par 2 minutes de résonance cardiaque avant d’écrire.": "life.body.context.resonanceBeforeWriting",
    "Choisir mouvement doux plutôt que performance.": "life.body.context.softMovement",
    "Une marche courte peut aider à relancer le corps.": "life.body.context.shortWalk",
  };

  return keys[message] || message;
}

function classifyDailyState(journal: DailyJournal, today?: DailyEntry): StateClassification {
  const scores = journal.nervousSystem;
  const dissociationAverage =
    (scores.emotionallyNumb +
      scores.disconnectedBody +
      scores.unrealDetached +
      scores.watchingSelf +
      scores.surroundingsDreamlike +
      scores.emotionallyFrozen +
      scores.cannotIdentifyFeelings +
      scores.mindFoggy +
      scores.mentallyElsewhere +
      scores.identityDetached) /
    10;
  const hypervigilanceAverage = (scores.unsafe + scores.bodyBraced + scores.hypervigilant) / 3;
  const floodAverage = (scores.overwhelmed + scores.avoidEmotions) / 2;
  const freezeAverage = (scores.shutDown + scores.emotionallyFrozen + scores.cannotIdentifyFeelings) / 3;
  const depletionAverage = (scores.emotionallyExhausted + scores.pleasureDisconnected + scores.mindFoggy) / 3;
  const totalAverage = Object.values(scores).reduce((sum, value) => sum + value, 0) / nervousQuestions.length;

  if (dissociationAverage >= 2.7 || (today?.state.dissociation ?? 0) >= 7) {
    return {
      action: "Revenir au corps par une action très concrète : pieds au sol, eau froide lente, regarder autour de toi.",
      actionKey: "life.action.dissociativeShutdown",
      indicatorKeys: ["life.badge.highDissociation", "life.badge.mentalFog", "life.badge.bodyDisconnection"],
      indicators: ["dissociation élevée", "flou mental", "déconnexion du corps"],
      state: "Dissociative shutdown",
      stateKey: "life.class.dissociativeShutdown",
      tone: "border-sky-300/30 bg-sky-400/10 text-sky-50",
    };
  }

  if (freezeAverage >= 2.6) {
    return {
      action: "Réduire les demandes, choisir une seule micro-action et laisser le système revenir doucement.",
      actionKey: "life.action.freezeResponse",
      indicatorKeys: ["life.badge.emotionalFreeze", "life.badge.innerStop", "life.badge.hardToFeel"],
      indicators: ["figement émotionnel", "arrêt intérieur", "difficulté à sentir"],
      state: "Freeze response",
      stateKey: "life.class.freezeResponse",
      tone: "border-indigo-300/30 bg-indigo-400/10 text-indigo-50",
    };
  }

  if (floodAverage >= 2.7 || (today?.state.surcharge ?? 0) >= 8) {
    return {
      action: "Stabiliser avant de décider : respiration lente, phrase courte, aucune grande conclusion maintenant.",
      actionKey: "life.action.emotionallyFlooded",
      indicatorKeys: ["life.badge.emotionalFlood", "life.badge.avoidDifficultEmotions"],
      indicators: ["débordement émotionnel", "évitement des émotions difficiles"],
      state: "Emotionally flooded",
      stateKey: "life.class.emotionallyFlooded",
      tone: "border-amber-300/30 bg-amber-400/10 text-amber-50",
    };
  }

  if (hypervigilanceAverage >= 2.5 || (today?.state.anxiete ?? 0) >= 8) {
    return {
      action: "Chercher la sécurité actuelle : ralentir, vérifier l’environnement réel, reporter ce qui peut attendre.",
      actionKey: "life.action.hypervigilant",
      indicatorKeys: ["life.badge.hypervigilance", "life.badge.bodyAlert", "life.badge.unsafeFeeling"],
      indicators: ["hypervigilance", "corps en alerte", "sentiment d’insécurité"],
      state: "Hypervigilant",
      stateKey: "life.class.hypervigilant",
      tone: "border-[#C9943A]/32 bg-[#C9943A]/10 text-[#E8E0D0]",
    };
  }

  if (depletionAverage >= 2.6 || (today?.state.energie ?? 10) <= 3 || (today?.state.sommeil ?? 10) <= 3) {
    return {
      action: "Passer en mode récupération : repos, hydratation, lumière douce, aucune performance demandée.",
      actionKey: "life.action.exhaustedDepleted",
      indicatorKeys: ["life.badge.emotionalExhaustion", "life.badge.hardPleasure", "life.badge.mentalFog"],
      indicators: ["épuisement émotionnel", "plaisir difficile", "brouillard mental"],
      state: "Exhausted / depleted",
      stateKey: "life.class.exhaustedDepleted",
      tone: "border-[#C9943A]/28 bg-[#C9943A]/8 text-[#E8E0D0]",
    };
  }

  if (totalAverage >= 1.4) {
    return {
      action: "Garder un rythme simple : tâche courte, pause corps, pas d’empilement.",
      actionKey: "life.action.mildlyActivated",
      indicatorKeys: ["life.badge.lightActivation", "life.badge.systemMobilized"],
      indicators: ["activation légère", "système encore mobilisé"],
      state: "Mildly activated",
      stateKey: "life.class.mildlyActivated",
      tone: "border-yellow-300/30 bg-yellow-400/10 text-yellow-50",
    };
  }

  if (totalAverage >= 0.6) {
    return {
      action: "Continuer doucement et noter ce qui aide le système à revenir.",
      actionKey: "life.action.recovering",
      indicatorKeys: ["life.badge.progressiveReturn", "life.badge.lowCharge"],
      indicators: ["retour progressif", "charge présente mais basse"],
      state: "Recovering",
      stateKey: "life.class.recovering",
      tone: "border-emerald-300/28 bg-emerald-400/10 text-emerald-50",
    };
  }

  return {
    action: "Protéger cet état : simplicité, continuité, pas de surcharge inutile.",
    actionKey: "life.action.regulated",
    indicatorKeys: ["life.badge.lowCharge", "life.badge.enoughPresence"],
    indicators: ["charge basse", "présence suffisante"],
    state: "Regulated",
    stateKey: "life.class.regulated",
    tone: "border-emerald-300/35 bg-emerald-400/10 text-emerald-50",
  };
}

function analyzeRealityCheck(journal: DailyJournal) {
  const check = journal.realityCheck;
  const fullText = Object.values(check).join(" ");
  const absoluteCount = countMatches(fullText, [
    /\balways\b/gi,
    /\bnever\b/gi,
    /\beverything\b/gi,
    /\bnothing\b/gi,
    /\beveryone\b/gi,
    /\bno one\b/gi,
    /\bforever\b/gi,
    /\btoujours\b/gi,
    /\bjamais\b/gi,
    /\btout\b/gi,
    /\brien\b/gi,
  ]);
  const assumptionWords = countMatches(check.assumptions, [
    /\bmaybe\b/gi,
    /\bprobably\b/gi,
    /\bi think\b/gi,
    /\bi guess\b/gi,
    /\bpeut-etre\b/gi,
    /\bpeut-être\b/gi,
    /\bje pense\b/gi,
    /\bj'imagine\b/gi,
  ]);
  const factWords = countWords(check.knownFacts);
  const urgency = countMatches(fullText, [/\bnow\b/gi, /\bright now\b/gi, /\burgent\b/gi, /\bimmediately\b/gi, /\bmaintenant\b/gi, /\btout de suite\b/gi]);
  const fears = [check.strongestEmotion, check.thinkingPattern, check.assumptions].filter(Boolean).join(" ");

  const warnings: string[] = [];
  if (absoluteCount >= 3) warnings.push("Possible catastrophizing: plusieurs mots absolus détectés.");
  if (assumptionWords >= 2 && factWords < 8) warnings.push("Possible assumptions: hypothèses présentes avec peu de faits concrets.");
  if (urgency >= 2 || check.strongestEmotion.length > 140) warnings.push("Pause before seeking certainty.");

  return {
    bodyState: check.bodyState || "Not filled yet.",
    facts: check.knownFacts || check.concreteEvent || "Not filled yet.",
    fears: fears || "Not filled yet.",
    interpretations: check.assumptions || check.neutralObserver || "Not filled yet.",
    nextSafeAction: warnings.includes("Pause before seeking certainty.")
      ? "Pause before seeking certainty. Choose one grounding action first."
      : "Name one concrete next step that does not require certainty.",
    warnings,
  };
}

function detectFreezeMode(journal: DailyJournal, today: DailyEntry, entries: DailyEntry[]) {
  const scores = journal.nervousSystem;
  const allJournalText = Object.values(journal.journal).join(" ");
  const recent = [...entries.filter((entry) => entry.date !== today.date), today].slice(-4);
  const daysWithoutProgress = recent.filter((entry) => !entry.touchedWriting).length;
  const signals: string[] = [];

  if (scores.emotionallyNumb >= 3 || scores.shutDown >= 3) signals.push("emotional numbness");
  if (scores.mindFoggy >= 3 || scores.mentallyElsewhere >= 3) signals.push("mental fog");
  if (today.state.energie <= 3 && today.state.motivation <= 3) signals.push("inability to start tasks");
  if (today.state.surcharge >= 7 && today.state.concentration <= 4) signals.push("task paralysis");
  if (daysWithoutProgress >= 3) signals.push("temps sans progression");
  if (countMatches(allJournalText, [/\bplan\b/gi, /\bplanning\b/gi, /\banalyze\b/gi, /\banalyse\b/gi, /\bshould\b/gi, /\bil faut\b/gi]) >= 5) {
    signals.push("avoidance disguised as planning");
  }
  if (repeatedWords(allJournalText) >= 3) signals.push("cognitive looping");
  if (countWords(journal.journal.avoidanceBehaviors) > 18) signals.push("avoidance noted");

  const likely = signals.length >= 3 || (signals.length >= 2 && today.state.surcharge >= 7);
  const actions = [
    "stand up and stretch",
    "drink water",
    "open the manuscript only",
    "write one sentence",
    "take a 5 minute walk",
    "do 2 minutes of resonance breathing",
  ];

  return {
    actions,
    likely,
    signals,
  };
}

function detectOveranalysis(journal: DailyJournal) {
  const realityText = Object.values(journal.realityCheck).join(" ");
  const journalText = Object.values(journal.journal).join(" ");
  const combined = `${realityText} ${journalText}`;
  const questionCount = (combined.match(/\?/g) || []).length;
  const wordCount = countWords(combined);
  const repeats = repeatedWords(combined);
  const ruminationWords = countMatches(combined, [
    /\bwhy\b/gi,
    /\bwhat if\b/gi,
    /\bshould\b/gi,
    /\bmaybe\b/gi,
    /\bwhy did\b/gi,
    /\bpourquoi\b/gi,
    /\bet si\b/gi,
    /\bje devrais\b/gi,
  ]);

  const active = wordCount > 450 || questionCount >= 8 || repeats >= 5 || ruminationWords >= 10;

  return {
    active,
    signals: [
      wordCount > 450 ? "réponses très longues" : "",
      questionCount >= 8 ? "beaucoup de questions" : "",
      repeats >= 5 ? "répétitions fortes" : "",
      ruminationWords >= 10 ? "rumination détectable" : "",
    ].filter(Boolean),
  };
}

function signalKey(signal: string) {
  const keys: Record<string, string> = {
    ralentir: "life.signal.slowDown",
    "repos recommandé": "life.signal.restRecommended",
    "micro-action recommandée": "life.signal.microActionRecommended",
  };

  return keys[signal] || signal;
}

function microActionKey(action: string) {
  const keys: Record<string, string> = {
    "passer de l’eau froide sur les mains": "life.micro.coldWaterHands",
    "baisser la lumière et réduire la stimulation": "life.micro.lowLight",
    "manger quelque chose de simple et se reposer": "life.micro.simpleFoodRest",
    "choisir une seule action et fermer une boucle": "life.micro.oneAction",
    "protéger la simplicité": "life.micro.protectSimplicity",
    "boire de l’eau": "life.micro.drinkWater",
    "marcher 10 minutes": "life.micro.walk10",
    "repos recommandé": "life.micro.rest",
    "écrire 3 phrases seulement": "life.micro.write3",
    "relire 1 page": "life.micro.read1",
    "faire une micro-action freelance de 10 minutes": "life.micro.freelance10",
    "choisir une seule tâche maison": "life.micro.homeTask",
    "faire une sauvegarde": "life.micro.backup",
    "ouvrir le chapitre 7": "life.micro.openChapter7",
  };

  return keys[action] || action;
}

function synthesisStateKey(stateKey: string) {
  const keys: Record<string, string> = {
    "life.class.dissociativeShutdown": "life.synthesis.state.fragmentedPresence",
    "life.class.freezeResponse": "life.synthesis.state.withdrawal",
    "life.class.emotionallyFlooded": "life.synthesis.state.emotionalOverload",
    "life.class.hypervigilant": "life.synthesis.state.highVigilance",
    "life.class.exhaustedDepleted": "life.synthesis.state.depletion",
    "life.class.regulated": "life.synthesis.state.stable",
    "life.class.mildlyActivated": "life.synthesis.state.mildActivation",
    "life.class.recovering": "life.synthesis.state.recovery",
  };

  return keys[stateKey] || stateKey;
}

function synthesisOrientationKey(classification: StateClassification, today: DailyEntry) {
  if (classification.stateKey === "life.class.dissociativeShutdown" || today.state.dissociation >= 7) return "life.synthesis.orientation.body";
  if (classification.stateKey === "life.class.hypervigilant" || today.state.anxiete >= 8) return "life.synthesis.orientation.reduceStimulation";
  if (classification.stateKey === "life.class.exhaustedDepleted" || today.state.energie <= 3 || today.state.sommeil <= 3) return "life.synthesis.orientation.rest";
  if (classification.stateKey === "life.class.emotionallyFlooded" || today.state.surcharge >= 7) return "life.synthesis.orientation.oneAction";
  if (classification.stateKey === "life.class.regulated") return "life.synthesis.orientation.simplicity";
  return "life.synthesis.orientation.slowDown";
}

function synthesisMicroActionKey(classification: StateClassification, today: DailyEntry, fallbackAction: string) {
  if (classification.stateKey === "life.class.dissociativeShutdown" || today.state.dissociation >= 7) return "life.synthesis.micro.dissociation";
  if (classification.stateKey === "life.class.hypervigilant" || today.state.anxiete >= 8) return "life.synthesis.micro.hypervigilance";
  if (classification.stateKey === "life.class.exhaustedDepleted" || today.state.energie <= 3 || today.state.sommeil <= 3) return "life.synthesis.micro.exhaustion";
  if (classification.stateKey === "life.class.emotionallyFlooded" || today.state.surcharge >= 7) return "life.synthesis.micro.overload";
  if (classification.stateKey === "life.class.regulated") return "life.synthesis.micro.stable";
  return microActionKey(fallbackAction);
}

function dominantSignalKeys(classification: StateClassification, today: DailyEntry, journal: DailyJournal) {
  const keys: string[] = [];
  const add = (key: string) => {
    if (!keys.includes(key) && keys.length < 4) keys.push(key);
  };

  if (classification.stateKey === "life.class.dissociativeShutdown" || today.state.dissociation >= 7) add("life.synthesis.signal.dissociation");
  if (classification.stateKey === "life.class.emotionallyFlooded" || today.state.surcharge >= 7) add("life.synthesis.signal.overload");
  if (journal.nervousSystem.mindFoggy >= 3) add("life.synthesis.signal.mentalFog");
  if (classification.stateKey === "life.class.exhaustedDepleted" || today.state.energie <= 3 || today.state.sommeil <= 3) add("life.synthesis.signal.fatigue");
  if (classification.stateKey === "life.class.hypervigilant" || today.state.anxiete >= 7) add("life.synthesis.signal.anxiety");
  if (classification.stateKey === "life.class.regulated" || classification.stateKey === "life.class.recovering") add("life.synthesis.signal.enoughPresence");
  if (classification.stateKey === "life.class.regulated") add("life.synthesis.signal.lowCharge");

  if (!keys.length) add("life.synthesis.signal.enoughPresence");
  return keys;
}

function realityWarningKey(warning: string) {
  const keys: Record<string, string> = {
    "Possible catastrophizing: plusieurs mots absolus détectés.": "life.tools.warning.catastrophizing",
    "Possible assumptions: hypothèses présentes avec peu de faits concrets.": "life.tools.warning.assumptions",
    "Pause before seeking certainty.": "life.tools.warning.pause",
  };

  return keys[warning] || warning;
}

function freezeSignalKey(signal: string) {
  const keys: Record<string, string> = {
    "emotional numbness": "life.tools.freeze.emotionalNumbness",
    "mental fog": "life.tools.freeze.mentalFog",
    "inability to start tasks": "life.tools.freeze.inabilityStart",
    "task paralysis": "life.tools.freeze.taskParalysis",
    "temps sans progression": "life.tools.freeze.noProgress",
    "avoidance disguised as planning": "life.tools.freeze.avoidancePlanning",
    "cognitive looping": "life.tools.freeze.cognitiveLooping",
    "avoidance noted": "life.tools.freeze.avoidanceNoted",
    "aucun signal fort": "life.tools.freeze.noStrongSignal",
  };

  return keys[signal] || signal;
}

function freezeActionKey(action: string) {
  const keys: Record<string, string> = {
    "stand up and stretch": "life.tools.action.standStretch",
    "drink water": "life.tools.action.drinkWater",
    "open the manuscript only": "life.tools.action.openManuscript",
    "write one sentence": "life.tools.action.writeOneSentence",
    "take a 5 minute walk": "life.tools.action.walkFive",
    "do 2 minutes of resonance breathing": "life.tools.action.resonanceTwo",
  };

  return keys[action] || action;
}

function overanalysisSignalKey(signal: string) {
  const keys: Record<string, string> = {
    grounding: "life.tools.suggestion.grounding",
    embodiment: "life.tools.suggestion.embodiment",
    "concrete action": "life.tools.suggestion.concreteAction",
    "pause before continuing analysis": "life.tools.suggestion.pauseBeforeAnalysis",
    "réponses très longues": "life.tools.overanalysis.longAnswers",
    "beaucoup de questions": "life.tools.overanalysis.manyQuestions",
    "répétitions fortes": "life.tools.overanalysis.strongRepetitions",
    "rumination détectable": "life.tools.overanalysis.rumination",
  };

  return keys[signal] || signal;
}

function notificationStatusKey(status: string) {
  const keys: Record<string, string> = {
    "notifications non activées": "life.tools.notification.notEnabled",
    "non supporté": "life.tools.notification.unsupported",
    "permission accordée": "life.tools.notification.granted",
    "permission refusée": "life.tools.notification.denied",
  };

  return keys[status] || status;
}

function MetricSlider({
  compact = false,
  label,
  onChange,
  value,
}: {
  compact?: boolean;
  label: string;
  onChange: (value: number) => void;
  value: number;
}) {
  return (
    <label className={`rounded-xl border border-[#d6b25e]/12 bg-[#0f0d0a]/45 ${compact ? "px-3 py-2" : "p-3"}`}>
      <span className={`flex items-center justify-between gap-3 text-[#efe5d4] ${compact ? "text-xs" : "text-sm"}`}>
        {label}
        <strong className={`text-[#d6b25e] ${compact ? "text-xs" : ""}`}>{value}</strong>
      </span>
      <input
        className={`w-full accent-[#d6b25e] ${compact ? "mt-1.5 h-5" : "mt-3"}`}
        max="10"
        min="0"
        onChange={(event) => onChange(Number(event.target.value))}
        type="range"
        value={value}
      />
    </label>
  );
}

function ScoreControl({
  label,
  max,
  onChange,
  value,
}: {
  label: string;
  max: 4 | 5;
  onChange: (value: number) => void;
  value: number;
}) {
  return (
    <label className="rounded-xl border border-[#d6b25e]/14 bg-[#0f0d0a]/50 p-3">
      <span className="flex items-start justify-between gap-3 text-sm leading-5 text-[#efe5d4]">
        {label}
        <strong className="shrink-0 text-[#d6b25e]">{value}/{max}</strong>
      </span>
      <input
        className="mt-3 w-full accent-[#d6b25e]"
        max={max}
        min="0"
        onChange={(event) => onChange(Number(event.target.value))}
        type="range"
        value={value}
      />
    </label>
  );
}

function JournalTextarea({
  label,
  onChange,
  value,
}: {
  label: string;
  onChange: (value: string) => void;
  value: string;
}) {
  return (
    <label className="block rounded-xl border border-[#d6b25e]/14 bg-[#0f0d0a]/50 p-3">
      <span className="text-sm font-semibold text-[#efe5d4]">{label}</span>
      <textarea
        className="mt-2 min-h-20 w-full resize-y rounded-xl border border-[#d6b25e]/14 bg-[#090807] px-3 py-2 text-sm leading-6 text-[#f1e7d5] outline-none transition placeholder:text-[#7c715f] focus:border-[#d6b25e]/45"
        onChange={(event) => onChange(event.target.value)}
        placeholder="Écrire quelques mots suffit."
        value={value}
      />
    </label>
  );
}

function SoftPanel({ children, title }: { children: React.ReactNode; title: string }) {
  return (
    <section className="rounded-2xl border border-[#d6b25e]/15 bg-[#141311] p-4">
      <p className="editorial-label">{title}</p>
      <div className="mt-4">{children}</div>
    </section>
  );
}

function ToggleGroup<T extends string>({
  items,
  onChange,
  value,
}: {
  items: Array<{ key: T; label: string }>;
  onChange: (value: T) => void;
  value: T;
}) {
  return (
    <div className="flex flex-wrap gap-2 rounded-2xl border border-[#d6b25e]/14 bg-[#0f0d0a]/45 p-1.5">
      {items.map((item) => (
        <button
          className={`rounded-xl px-3 py-2 text-sm font-semibold transition ${
            value === item.key
              ? "bg-[#C9A84C] text-[#15110d]"
              : "text-[#9f927d] hover:bg-[#d6b25e]/8 hover:text-[#efe5d4]"
          }`}
          key={item.key}
          onClick={() => onChange(item.key)}
          type="button"
        >
          {item.label}
        </button>
      ))}
    </div>
  );
}

export default function LifeOperatingSystem({ headerSlot }: { headerSlot?: ReactNode } = {}) {
  const { lang } = useLanguage();
  const [data, setData] = useState<LifeData>({ entries: [], version: 1 });
  const [today, setToday] = useState<DailyEntry>(() => normalizeEntry({ date: todayKey() }));
  const [dailyJournal, setDailyJournal] = useState<DailyJournal>(() =>
    normalizeDailyJournal({
      bodyReconnection: defaultBodyReconnection,
      date: todayKey(),
      journal: defaultJournalFields,
      nervousSystem: defaultNervousScores,
      pillars: defaultPillars,
    }),
  );
  const [loaded, setLoaded] = useState(false);
  const [resonanceMode, setResonanceMode] = useState<"rapide" | "standard">("rapide");
  const [isBreathing, setIsBreathing] = useState(false);
  const [resonanceElapsed, setResonanceElapsed] = useState(0);
  const [soundEnabled, setSoundEnabled] = useState(false);
  const [videoAvailable, setVideoAvailable] = useState(false);
  const [notificationStatus, setNotificationStatus] = useState("notifications non activées");
  const [realityOpen, setRealityOpen] = useState(false);
  const [freezeOpen, setFreezeOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<LifeTab>("etat");
  const [dailyMode, setDailyMode] = useState<DailyMode>("simple");
  const [checkinMode, setCheckinMode] = useState<CheckinMode>("quick");
  const [openCheckinSections, setOpenCheckinSections] = useState<Record<CheckinSectionKey, boolean>>({
    body: false,
    dissociation: false,
    emotional: false,
    exhaustion: false,
    hypervigilance: false,
  });
  const lastPhaseRef = useRef<"inspire" | "expire" | null>(null);
  const initialLifeDataSaveSkippedRef = useRef(false);
  const initialDailyJournalSaveSkippedRef = useRef(false);
  const initialActiveTabSaveSkippedRef = useRef(false);
  const initialDailyModeSaveSkippedRef = useRef(false);
  const initialCheckinModeSaveSkippedRef = useRef(false);

  const resonanceDuration = resonanceMode === "rapide" ? 120 : 300;
  const phase = Math.floor(resonanceElapsed / 5) % 2 === 0 ? "inspire" : "expire";
  const phaseLabel = phase === "inspire" ? "Inspirer" : "Expirer";
  const progress = Math.min(100, Math.round((resonanceElapsed / resonanceDuration) * 100));

  useEffect(() => {
    const saved = readLifeData();
    const existingToday = saved.entries.find((entry) => entry.date === todayKey());
    setData(saved);
    setToday(existingToday || normalizeEntry({ date: todayKey() }));
    setDailyJournal(readDailyJournal(todayKey()));
    const storedTab = localStorage.getItem(ACTIVE_TAB_KEY);
    if (storedTab && lifeTabs.some((tab) => tab.key === storedTab)) {
      setActiveTab(storedTab as LifeTab);
    }
    const storedDailyMode = localStorage.getItem(DAILY_MODE_KEY);
    if (storedDailyMode === "simple" || storedDailyMode === "structured") setDailyMode(storedDailyMode);
    const storedCheckinMode = localStorage.getItem(CHECKIN_MODE_KEY);
    if (storedCheckinMode === "quick" || storedCheckinMode === "full") setCheckinMode(storedCheckinMode);
    setLoaded(true);
  }, []);

  useEffect(() => {
    if (!loaded) return;
    if (!initialLifeDataSaveSkippedRef.current) {
      initialLifeDataSaveSkippedRef.current = true;
      return;
    }
    const nextData = { entries: updateTodayEntry(data.entries, today), version: 1 as const };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(nextData));
    setData(nextData);
  }, [loaded, today]);

  useEffect(() => {
    if (!loaded) return;
    if (!initialDailyJournalSaveSkippedRef.current) {
      initialDailyJournalSaveSkippedRef.current = true;
      return;
    }
    localStorage.setItem(dailyJournalKey(dailyJournal.date), JSON.stringify(dailyJournal));
  }, [dailyJournal, loaded]);

  useEffect(() => {
    if (!loaded) return;
    if (!initialActiveTabSaveSkippedRef.current) {
      initialActiveTabSaveSkippedRef.current = true;
      return;
    }
    localStorage.setItem(ACTIVE_TAB_KEY, activeTab);
  }, [activeTab, loaded]);

  useEffect(() => {
    if (!loaded) return;
    if (!initialDailyModeSaveSkippedRef.current) {
      initialDailyModeSaveSkippedRef.current = true;
      return;
    }
    localStorage.setItem(DAILY_MODE_KEY, dailyMode);
  }, [dailyMode, loaded]);

  useEffect(() => {
    if (!loaded) return;
    if (!initialCheckinModeSaveSkippedRef.current) {
      initialCheckinModeSaveSkippedRef.current = true;
      return;
    }
    localStorage.setItem(CHECKIN_MODE_KEY, checkinMode);
  }, [checkinMode, loaded]);

  const playCue = useCallback((nextPhase: "inspire" | "expire") => {
    if (!soundEnabled || typeof window === "undefined") return;

    const audioPath = nextPhase === "inspire" ? "/audio/resonance-inspire.mp3" : "/audio/resonance-expire.mp3";
    const audio = new Audio(audioPath);
    audio.volume = 0.22;
    audio.play().catch(() => {
      const AudioContextConstructor = window.AudioContext || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!AudioContextConstructor) return;
      const context = new AudioContextConstructor();
      const oscillator = context.createOscillator();
      const gain = context.createGain();
      oscillator.frequency.value = nextPhase === "inspire" ? 440 : 330;
      gain.gain.value = 0.035;
      oscillator.connect(gain);
      gain.connect(context.destination);
      oscillator.start();
      oscillator.stop(context.currentTime + 0.09);
    });
  }, [soundEnabled]);

  useEffect(() => {
    if (!isBreathing) return;

    const interval = window.setInterval(() => {
      setResonanceElapsed((current) => {
        if (current + 1 >= resonanceDuration) {
          setIsBreathing(false);
          setToday((entry) => ({
            ...entry,
            resonanceSessions: [...entry.resonanceSessions, new Date().toISOString()].slice(-30),
            updatedAt: new Date().toISOString(),
          }));
          return resonanceDuration;
        }
        return current + 1;
      });
    }, 1000);

    return () => window.clearInterval(interval);
  }, [isBreathing, resonanceDuration]);

  useEffect(() => {
    if (!isBreathing) return;
    if (lastPhaseRef.current !== phase) {
      lastPhaseRef.current = phase;
      playCue(phase);
    }
  }, [isBreathing, phase, playCue]);

  useEffect(() => {
    if (typeof window === "undefined" || !("Notification" in window)) {
      setNotificationStatus("non supporté");
      return;
    }
    if (Notification.permission === "granted") setNotificationStatus("permission accordée");
    if (Notification.permission === "denied") setNotificationStatus("permission refusée");
  }, []);

  useEffect(() => {
    let cancelled = false;
    fetch("/videos/resonance-cardiaque.mp4", { method: "HEAD" })
      .then((response) => {
        if (!cancelled) setVideoAvailable(response.ok);
      })
      .catch(() => {
        if (!cancelled) setVideoAvailable(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const signals = useMemo(() => getSignals(data.entries, today), [data.entries, today]);
  const microAction = useMemo(() => getMicroAction(today, signals, dailyJournal), [dailyJournal, signals, today]);
  const activeStreak = useMemo(() => countActiveStreak(data.entries), [data.entries]);
  const lastWritingSession = useMemo(() => {
    const entry = [...data.entries].reverse().find((item) => item.touchedWriting);
    return entry ? entry.date : "non disponible";
  }, [data.entries]);
  const lastBackup = loaded ? localStorage.getItem(BACKUP_EXPORT_KEY) : null;
  const lastChapter = loaded ? readLastChapterWorked() : "non disponible";
  const anchorDone = anchorLabels.filter((item) => today.anchors[item.key]).length;
  const movementDone = movementLabels.filter((item) => today.movement[item.key]).length;
  const selectedReminders = reminderLabels.filter((item) => today.reminders[item.key]);
  const lastResonanceSession = today.resonanceSessions.at(-1) || null;
  const resonanceCountLabel =
    today.resonanceSessions.length >= 3 ? "3+ sessions" : `${today.resonanceSessions.length} session${today.resonanceSessions.length > 1 ? "s" : ""}`;
  const bodySignals = useMemo(() => getContextualBodySignals(today), [today]);
  const stateClassification = useMemo(() => classifyDailyState(dailyJournal, today), [dailyJournal, today]);
  const synthesisSignals = useMemo(() => dominantSignalKeys(stateClassification, today, dailyJournal), [dailyJournal, stateClassification, today]);
  const synthesisOrientation = useMemo(() => synthesisOrientationKey(stateClassification, today), [stateClassification, today]);
  const synthesisMicroAction = useMemo(() => synthesisMicroActionKey(stateClassification, today, microAction), [microAction, stateClassification, today]);
  const realityAnalysis = useMemo(() => analyzeRealityCheck(dailyJournal), [dailyJournal]);
  const freezeDetection = useMemo(() => detectFreezeMode(dailyJournal, today, data.entries), [dailyJournal, data.entries, today]);
  const overanalysis = useMemo(() => detectOveranalysis(dailyJournal), [dailyJournal]);
  const nervousAverage = useMemo(() => {
    const total = Object.values(dailyJournal.nervousSystem).reduce((sum, value) => sum + value, 0);
    return nervousQuestions.length ? Number((total / nervousQuestions.length).toFixed(1)) : 0;
  }, [dailyJournal]);
  const dayProgress = useMemo(() => {
    const now = new Date();
    const minutes = now.getHours() * 60 + now.getMinutes();
    const start = 6 * 60;
    const end = 21 * 60;
    return Math.min(100, Math.max(0, Math.round(((minutes - start) / (end - start)) * 100)));
  }, [today.date]);
  const essentialDone = useMemo(() => {
    const essentials = [
      today.anchors.eau,
      today.anchors.nourriture,
      today.anchors.mouvement || today.movement.marche || today.movement.mobilisation,
      today.touchedWriting,
    ];
    return essentials.filter(Boolean).length;
  }, [today]);
  const dissociationScore = useMemo(
    () =>
      Math.max(
        dailyJournal.nervousSystem.emotionallyNumb,
        dailyJournal.nervousSystem.disconnectedBody,
        dailyJournal.nervousSystem.unrealDetached,
        dailyJournal.nervousSystem.watchingSelf,
        dailyJournal.nervousSystem.surroundingsDreamlike,
        dailyJournal.nervousSystem.mentallyElsewhere,
        dailyJournal.nervousSystem.identityDetached,
      ),
    [dailyJournal],
  );
  const showBodyReconnection = dissociationScore >= 3 || today.state.dissociation >= 7;

  function updateState(key: keyof DailyState, value: number) {
    setToday((current) => ({
      ...current,
      state: { ...current.state, [key]: value },
      updatedAt: new Date().toISOString(),
    }));
  }

  function updateAnchor(key: AnchorKey) {
    setToday((current) => ({
      ...current,
      anchors: { ...current.anchors, [key]: !current.anchors[key] },
      updatedAt: new Date().toISOString(),
    }));
  }

  function updatePriority(priority: Priority) {
    setToday((current) => ({ ...current, priority, updatedAt: new Date().toISOString() }));
  }

  function updateMovement(key: MovementKey) {
    setToday((current) => ({
      ...current,
      movement: { ...current.movement, [key]: !current.movement[key] },
      updatedAt: new Date().toISOString(),
    }));
  }

  function updateReminder(key: ReminderKey) {
    setToday((current) => ({
      ...current,
      reminders: { ...current.reminders, [key]: !current.reminders[key] },
      updatedAt: new Date().toISOString(),
    }));
  }

  function updateJournalField(key: JournalField, value: string) {
    setDailyJournal((current) => ({
      ...current,
      journal: { ...current.journal, [key]: value },
      updatedAt: new Date().toISOString(),
    }));
  }

  function updatePillar(key: PillarKey, value: number) {
    setDailyJournal((current) => ({
      ...current,
      pillars: { ...current.pillars, [key]: clampRange(value, 0, 5) },
      updatedAt: new Date().toISOString(),
    }));
  }

  function updateNervousScore(key: NervousKey, value: number) {
    setDailyJournal((current) => ({
      ...current,
      nervousSystem: { ...current.nervousSystem, [key]: clampRange(value, 0, 4) },
      updatedAt: new Date().toISOString(),
    }));
  }

  function updateBodyReconnection(prompt: string, value: string) {
    setDailyJournal((current) => ({
      ...current,
      bodyReconnection: { ...current.bodyReconnection, [prompt]: value },
      updatedAt: new Date().toISOString(),
    }));
  }

  function updateRealityField(key: RealityKey, value: string) {
    setDailyJournal((current) => ({
      ...current,
      realityCheck: { ...current.realityCheck, [key]: value },
      updatedAt: new Date().toISOString(),
    }));
  }

  function saveFreezeDetection() {
    setDailyJournal((current) => ({
      ...current,
      freezeDetection: {
        lastCheckedAt: new Date().toISOString(),
        likely: freezeDetection.likely,
        signals: freezeDetection.signals,
      },
      overanalysisInterruptions: overanalysis.active
        ? [...current.overanalysisInterruptions, new Date().toISOString()].slice(-20)
        : current.overanalysisInterruptions,
      updatedAt: new Date().toISOString(),
    }));
  }

  function resetResonance() {
    setIsBreathing(false);
    setResonanceElapsed(0);
    lastPhaseRef.current = null;
  }

  async function requestNotifications() {
    if (typeof window === "undefined" || !("Notification" in window)) {
      setNotificationStatus("non supporté");
      return;
    }

    const permission = await Notification.requestPermission();
    if (permission === "granted") {
      setNotificationStatus("permission accordée");
      new Notification("Rappel doux", { body: "Respirer, boire un peu d’eau, revenir au corps." });
    } else if (permission === "denied") {
      setNotificationStatus("permission refusée");
    } else {
      setNotificationStatus("notifications non activées");
    }
  }

  return (
    <main className="internal-page">
      {headerSlot}
      <div className="internal-shell max-w-5xl">
        <header className="internal-header">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="internal-kicker">Life Operating System</p>
              <h1 className="internal-title">Stabilité et continuité</h1>
              <p className="internal-subtitle">
                Un centre doux pour soutenir l’écriture, la concentration et le long terme sans toucher aux données du manuscrit.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Link className="internal-button" href="/guide-strate">
                Besoin d’aide ?
              </Link>
              <Link
                className="internal-button flex flex-col !rounded-xl !px-3 !py-2 leading-tight"
                href="/daily-system"
              >
                <span className="text-sm font-semibold">{t("life.dailySystem.nav", lang)}</span>
                <span className="mt-1 text-[10px] text-[#9A9080]">{t("life.dailySystem.subtitle", lang)}</span>
              </Link>
              <Link className="internal-button" href="/communaute">
                {t("community.nav", lang)}
              </Link>
              <Link className="internal-button" href="/">
                Accueil
              </Link>
            </div>
          </div>
        </header>

        <section className="mb-4 grid gap-3 lg:grid-cols-[0.8fr_1.2fr]">
          <SoftPanel title={t("life.mode.title", lang)}>
            <ToggleGroup<DailyMode>
              items={[
                { key: "simple", label: t("life.mode.simple", lang) },
                { key: "structured", label: t("life.mode.structured", lang) },
              ]}
              onChange={setDailyMode}
              value={dailyMode}
            />
          </SoftPanel>

          {dailyMode === "structured" ? (
            <section className="rounded-2xl border border-[#d6b25e]/15 bg-[#141311] p-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <p className="editorial-label">{t("life.structured.title", lang)}</p>
                  <p className="mt-2 text-sm leading-6 text-[#b8aa91]">{t("life.structured.subtitle", lang)}</p>
                </div>
                <Link className="internal-button w-fit" href="/daily-system">
                  {t("life.dailySystem.nav", lang)}
                </Link>
              </div>
              <div className="mt-4 grid gap-3 md:grid-cols-3">
                <article className="rounded-xl border border-[#d6b25e]/14 bg-[#0f0d0a]/55 p-3">
                  <p className="editorial-label">{t("life.structured.progress", lang)}</p>
                  <div className="mt-3 h-2 overflow-hidden rounded-full bg-[#1A1A16]">
                    <div className="h-full rounded-full bg-[#6B8F71]" style={{ width: `${dayProgress}%` }} />
                  </div>
                  <p className="mt-2 text-sm font-semibold text-[#f1e7d5]">{dayProgress}%</p>
                </article>
                <article className="rounded-xl border border-[#d6b25e]/14 bg-[#0f0d0a]/55 p-3">
                  <p className="editorial-label">{t("life.structured.priorities", lang)}</p>
                  <p className="mt-2 text-sm font-semibold text-[#f1e7d5]">{essentialDone}/4</p>
                  <p className="mt-1 text-xs leading-5 text-[#b8aa91]">{t("life.structured.essentials", lang)}</p>
                </article>
                <article className="rounded-xl border border-[#d6b25e]/14 bg-[#0f0d0a]/55 p-3">
                  <p className="editorial-label">{t("life.structured.difficultDay", lang)}</p>
                  <p className="mt-2 text-sm leading-5 text-[#f1e7d5]">
                    {today.state.surcharge >= 7 || today.state.energie <= 3
                      ? t("life.structured.reduce", lang)
                      : t("life.structured.keepSimple", lang)}
                  </p>
                </article>
              </div>
              <div className="mt-4 flex flex-wrap gap-2 text-[11px] font-semibold text-[#d8cbb5]">
                {["06:00", "09:00", "12:00", "15:00", "18:00", "21:00"].map((slot) => (
                  <span className="rounded-full border border-[#d6b25e]/14 bg-[#090807]/70 px-3 py-1" key={slot}>
                    {slot}
                  </span>
                ))}
              </div>
            </section>
          ) : (
            <section className="rounded-2xl border border-[#d6b25e]/15 bg-[#141311] p-4">
              <p className="editorial-label">{t("life.mode.simple", lang)}</p>
              <p className="mt-2 text-sm leading-6 text-[#b8aa91]">{t("life.mode.simpleDescription", lang)}</p>
            </section>
          )}
        </section>

        <section className="mb-4 grid gap-3 sm:grid-cols-3">
          <article className="internal-card">
            <p className="editorial-label">Aujourd’hui</p>
            <p className="mt-2 text-2xl font-semibold text-[#f1e7d5]">{today.date}</p>
          </article>
          <article className="internal-card">
            <p className="editorial-label">Ancrage</p>
            <p className="mt-2 text-2xl font-semibold text-[#f1e7d5]">{anchorDone}/{anchorLabels.length}</p>
          </article>
          <article className="internal-card">
            <p className="editorial-label">Signal</p>
            <p className="mt-2 text-lg font-semibold text-[#f1e7d5]">{signals[0] || "continuer doucement"}</p>
          </article>
        </section>

        <nav className="sticky top-2 z-30 mb-4 -mx-1 overflow-x-auto rounded-2xl border border-[#d6b25e]/14 bg-[#11100e]/95 p-1.5 backdrop-blur">
          <div className="grid min-w-[420px] grid-cols-4 gap-1 sm:min-w-0">
            {lifeTabs.map((tab) => (
              <button
                className={`rounded-xl px-3 py-2 text-sm font-semibold transition ${
                  activeTab === tab.key
                    ? "bg-[#C9A84C] text-[#15110d] shadow-[0_8px_24px_rgba(0,0,0,0.18)]"
                    : "text-[#9f927d] hover:bg-[#d6b25e]/8 hover:text-[#efe5d4]"
                }`}
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                type="button"
              >
                {tab.labelKey ? t(tab.labelKey, lang) : tab.label}
              </button>
            ))}
          </div>
        </nav>

        {activeTab === "etat" ? (
        <>
        <SoftPanel title={t("life.state.checkin", lang)}>
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <ToggleGroup<CheckinMode>
              items={[
                { key: "quick", label: t("life.checkin.quick", lang) },
                { key: "full", label: t("life.checkin.full", lang) },
              ]}
              onChange={setCheckinMode}
              value={checkinMode}
            />
            <span className="w-fit rounded-full border border-[#d6b25e]/18 bg-[#090807]/80 px-3 py-1 text-xs font-semibold text-[#d8cbb5]">
              {t("life.state.average", lang)} {nervousAverage}/4
            </span>
          </div>

          <div className="grid gap-4 xl:grid-cols-[1.05fr_0.95fr]">
            <div className="rounded-2xl border border-[#d6b25e]/14 bg-[#0f0d0a]/45 p-4">
              <div>
                <p className="text-sm font-semibold text-[#f1e7d5]">
                  {checkinMode === "quick" ? t("life.checkin.quick", lang) : t("life.checkin.full", lang)}
                </p>
                <p className="mt-1 text-xs leading-5 text-[#b8aa91]">{t("life.state.scale", lang)}</p>
              </div>

              {checkinMode === "quick" ? (
                <div className="mt-3 grid gap-2 sm:grid-cols-2">
                  <MetricSlider compact label={t("life.journal.slider.energy", lang)} onChange={(value) => updateState("energie", value)} value={today.state.energie} />
                  <MetricSlider compact label={t("life.journal.slider.anxiety", lang)} onChange={(value) => updateState("anxiete", value)} value={today.state.anxiete} />
                  <MetricSlider compact label={t("life.journal.slider.dissociation", lang)} onChange={(value) => updateState("dissociation", value)} value={today.state.dissociation} />
                  <MetricSlider compact label={t("life.journal.slider.overload", lang)} onChange={(value) => updateState("surcharge", value)} value={today.state.surcharge} />
                  <MetricSlider compact label={t("life.journal.slider.mentalClarity", lang)} onChange={(value) => updateState("clarte", value)} value={today.state.clarte} />
                </div>
              ) : (
                <div className="mt-4 grid gap-3">
                  {checkinSections.map((section) => {
                    const sectionAverage = section.questionKeys.length
                      ? Number(
                          (
                            section.questionKeys.reduce((sum, key) => sum + dailyJournal.nervousSystem[key], 0) /
                            section.questionKeys.length
                          ).toFixed(1),
                        )
                      : 0;

                    return (
                      <div className="rounded-2xl border border-[#d6b25e]/14 bg-[#090807]/65" key={section.key}>
                        <button
                          aria-expanded={openCheckinSections[section.key]}
                          className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left"
                          onClick={() =>
                            setOpenCheckinSections((current) => ({
                              ...current,
                              [section.key]: !current[section.key],
                            }))
                          }
                          type="button"
                        >
                          <span>
                            <span className="text-sm font-semibold text-[#f1e7d5]">{t(section.labelKey, lang)}</span>
                            <span className="mt-1 block text-xs text-[#9A9080]">{t("life.checkin.sectionScore", lang)} {sectionAverage}/4</span>
                          </span>
                          <span className="rounded-full border border-[#d6b25e]/18 px-3 py-1 text-xs font-semibold text-[#d8cbb5]">
                            {openCheckinSections[section.key] ? t("backup.close", lang) : t("backup.open", lang)}
                          </span>
                        </button>
                        {openCheckinSections[section.key] ? (
                          <div className="grid gap-3 border-t border-[#d6b25e]/12 p-3 md:grid-cols-2">
                            {section.questionKeys.map((questionKey) => {
                              const question = nervousQuestionByKey[questionKey];
                              return (
                                <ScoreControl
                                  key={question.key}
                                  label={t(question.labelKey, lang)}
                                  max={4}
                                  onChange={(value) => updateNervousScore(question.key, value)}
                                  value={dailyJournal.nervousSystem[question.key]}
                                />
                              );
                            })}
                          </div>
                        ) : null}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="grid gap-4">
              <div className="rounded-2xl border border-[#6B8F71]/20 bg-[#1E1E1A] px-4 py-3 text-[#E8E0D0] shadow-[0_14px_34px_rgba(0,0,0,0.16)] transition duration-300">
                <div className="flex flex-col gap-1">
                  <p className="editorial-label">{t("life.synthesis.title", lang)}</p>
                  <p className="text-xs leading-5 text-[#9A9080]">{t("life.synthesis.subtitle", lang)}</p>
                </div>

                <div className="mt-3 space-y-3">
                  <section>
                    <p className="editorial-label">{t("life.synthesis.likelyState", lang)}</p>
                    <p className="mt-1 text-xl font-semibold text-[#E8E0D0]">
                      {t(synthesisStateKey(stateClassification.stateKey), lang)}
                    </p>
                  </section>

                  <section>
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="editorial-label mr-1">{t("life.synthesis.signals", lang)}</p>
                      {synthesisSignals.map((signalKey) => (
                        <span
                          className="rounded-full border border-[#6B8F71]/20 bg-[#6B8F71]/8 px-2.5 py-0.5 text-[11px] font-semibold text-[#E8E0D0]"
                          key={signalKey}
                        >
                          {t(signalKey, lang)}
                        </span>
                      ))}
                    </div>
                  </section>

                  <section className="border-t border-[#2A2A24]/70 pt-3">
                    <p className="editorial-label">{t("life.synthesis.orientation", lang)}</p>
                    <p className="mt-1 text-sm leading-6 text-[#E8E0D0]">{t(synthesisOrientation, lang)}</p>
                  </section>

                  <section className="border-t border-[#2A2A24]/70 pt-3">
                    <p className="editorial-label">{t("life.synthesis.microAction", lang)}</p>
                    <p className="mt-1 text-sm font-semibold leading-6 text-[#E8E0D0]">{t(synthesisMicroAction, lang)}</p>
                    <button
                      className={`mt-3 rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
                        today.touchedWriting
                          ? "border-[#6B8F71]/35 bg-[#6B8F71]/12 text-[#DDE8D6]"
                          : "border-[#C9A84C]/28 bg-[#0f0d0a] text-[#D8CBB5]"
                      }`}
                      onClick={() => setToday((current) => ({ ...current, touchedWriting: !current.touchedWriting, updatedAt: new Date().toISOString() }))}
                      type="button"
                    >
                      {today.touchedWriting ? t("life.state.progressMarked", lang) : t("life.state.markProgress", lang)}
                    </button>
                  </section>
                </div>
              </div>
            </div>
          </div>
        </SoftPanel>
        </>
        ) : null}

        {activeTab === "outils" ? (
        <>
        <section className="mt-4 grid gap-4 xl:grid-cols-2">
          <div className="rounded-2xl border border-[#d6b25e]/15 bg-[#141311] p-4">
            <button
              aria-expanded={realityOpen}
              className="flex w-full items-center justify-between gap-3 text-left"
              onClick={() => setRealityOpen((current) => !current)}
              type="button"
            >
              <span>
                <span className="editorial-label block">{t("life.tools.realityCheck", lang)}</span>
                <span className="mt-2 block text-sm leading-6 text-[#b8aa91]">{t("life.tools.realityDescription", lang)}</span>
              </span>
              <span className="rounded-full border border-[#d6b25e]/18 px-3 py-1 text-xs font-semibold text-[#d8cbb5]">
                {realityOpen ? t("life.tools.close", lang) : t("life.tools.open", lang)}
              </span>
            </button>

            {realityOpen ? (
              <div className="mt-4 border-t border-[#d6b25e]/12 pt-4">
                <div className="grid gap-3">
                  {realityFields.map((field) => (
                    <JournalTextarea
                      key={field.key}
                      label={field.labelKey ? t(field.labelKey, lang) : field.label}
                      onChange={(value) => updateRealityField(field.key, value)}
                      value={dailyJournal.realityCheck[field.key]}
                    />
                  ))}
                </div>

                <div className="mt-4 grid gap-3">
                  {[
                    ["life.tools.section.facts", realityAnalysis.facts],
                    ["life.tools.section.interpretations", realityAnalysis.interpretations],
                    ["life.tools.section.fears", realityAnalysis.fears],
                    ["life.tools.section.bodyState", realityAnalysis.bodyState],
                    ["life.tools.section.nextSafeAction", realityAnalysis.nextSafeAction],
                  ].map(([label, value]) => (
                    <div className="rounded-xl border border-[#d6b25e]/14 bg-[#0f0d0a]/55 p-3" key={label}>
                      <p className="editorial-label">{t(label, lang)}</p>
                      <p className="mt-2 text-sm leading-6 text-[#f1e7d5]">{value}</p>
                    </div>
                  ))}
                </div>

                <div className="mt-4 flex flex-wrap gap-2">
                  {realityAnalysis.warnings.length ? (
                    realityAnalysis.warnings.map((warning) => (
                      <span className="rounded-full border border-amber-300/25 bg-amber-400/10 px-3 py-1 text-xs font-semibold text-amber-50" key={warning}>
                        {t(realityWarningKey(warning), lang)}
                      </span>
                    ))
                  ) : (
                    <span className="rounded-full border border-emerald-300/25 bg-emerald-400/10 px-3 py-1 text-xs font-semibold text-emerald-50">
                      {t("life.tools.regulated", lang)}
                    </span>
                  )}
                </div>
              </div>
            ) : null}
          </div>

          <div className="rounded-2xl border border-[#d6b25e]/15 bg-[#141311] p-4">
            <button
              aria-expanded={freezeOpen}
              className="flex w-full items-center justify-between gap-3 text-left"
              onClick={() => setFreezeOpen((current) => !current)}
              type="button"
            >
              <span>
                <span className="editorial-label block">{t("life.tools.freezeMode", lang)}</span>
                <span className="mt-2 block text-sm leading-6 text-[#b8aa91]">{t("life.tools.freezeDescription", lang)}</span>
              </span>
              <span className="rounded-full border border-[#d6b25e]/18 px-3 py-1 text-xs font-semibold text-[#d8cbb5]">
                {freezeOpen ? t("life.tools.close", lang) : t("life.tools.open", lang)}
              </span>
            </button>

            {freezeOpen ? (
              <div className="mt-4 border-t border-[#d6b25e]/12 pt-4">
                <div
                  className={`rounded-2xl border p-4 ${
                    freezeDetection.likely
                      ? "border-indigo-300/30 bg-indigo-400/10 text-indigo-50"
                      : "border-emerald-300/25 bg-emerald-400/10 text-emerald-50"
                  }`}
                >
                  <p className="text-xs font-bold uppercase tracking-[0.16em] opacity-80">
                    {freezeDetection.likely ? t("life.tools.freezeLikely", lang) : t("life.tools.regulated", lang)}
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {(freezeDetection.signals.length ? freezeDetection.signals : ["aucun signal fort"]).map((signal) => (
                      <span className="rounded-full border border-current/20 bg-black/10 px-3 py-1 text-xs font-semibold" key={signal}>
                        {t(freezeSignalKey(signal), lang)}
                      </span>
                    ))}
                  </div>
                  <p className="mt-4 text-sm leading-6">
                    {freezeDetection.likely
                      ? t("life.tools.freezeAdvice", lang)
                      : t("life.tools.freezeNoStrong", lang)}
                  </p>
                </div>

                {overanalysis.active ? (
                  <div className="mt-4 rounded-2xl border border-amber-300/25 bg-amber-400/10 p-4 text-amber-50">
                    <p className="text-sm font-semibold">{t("life.tools.overanalysis.title", lang)}</p>
                    <p className="mt-2 text-sm leading-6">{t("life.tools.overanalysis.body", lang)}</p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {["grounding", "embodiment", "concrete action", "pause before continuing analysis", ...overanalysis.signals].map((signal) => (
                        <span className="rounded-full border border-current/20 bg-black/10 px-3 py-1 text-xs font-semibold" key={signal}>
                          {t(overanalysisSignalKey(signal), lang)}
                        </span>
                      ))}
                    </div>
                  </div>
                ) : null}

                <div className="mt-4 grid gap-2 sm:grid-cols-2">
                  {freezeDetection.actions.map((action) => (
                    <p className="rounded-xl border border-[#d6b25e]/12 bg-[#0f0d0a]/55 px-3 py-2 text-sm leading-5 text-[#d8cbb5]" key={action}>
                      {t(freezeActionKey(action), lang)}
                    </p>
                  ))}
                </div>

                <button
                  className="mt-4 rounded-full border border-[#d6b25e]/28 bg-[#0f0d0a] px-4 py-2 text-sm font-semibold text-[#d8cbb5]"
                  onClick={saveFreezeDetection}
                  type="button"
                >
                  {t("life.tools.saveState", lang)}
                </button>
              </div>
            ) : null}
          </div>
        </section>

        <div className="mt-4 rounded-2xl border border-[#d6b25e]/14 bg-[#141311] p-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-sm font-semibold text-[#f1e7d5]">{t("life.tools.gentleReminders", lang)}</p>
              <p className="mt-1 text-sm leading-6 text-[#b8aa91]">
                {t("life.tools.reminderDescription", lang)}
              </p>
            </div>
            <button
              className="rounded-full border border-[#d6b25e]/28 bg-[#0f0d0a] px-4 py-2 text-sm font-semibold text-[#d8cbb5]"
              onClick={requestNotifications}
              type="button"
            >
              {t("life.tools.activateBrowserNotifications", lang)}
            </button>
          </div>

          <div className="mt-3 flex flex-wrap gap-2">
            {reminderLabels.map((item) => (
              <button
                className={`rounded-full border px-3 py-2 text-sm font-semibold transition ${
                  today.reminders[item.key]
                    ? "border-[#d6b25e]/55 bg-[#d6b25e] text-[#15110d]"
                    : "border-[#d6b25e]/16 bg-[#090807]/70 text-[#d8cbb5]"
                }`}
                key={item.key}
                onClick={() => updateReminder(item.key)}
                type="button"
              >
                {item.labelKey ? t(item.labelKey, lang) : item.label}
              </button>
            ))}
          </div>

          <div className="mt-4 grid gap-3 md:grid-cols-2">
            <div className="rounded-xl border border-[#d6b25e]/14 bg-[#090807]/70 p-3">
              <p className="editorial-label">{t("life.tools.notifications", lang)}</p>
              <p className="mt-2 text-sm font-semibold text-[#f1e7d5]">{t(notificationStatusKey(notificationStatus), lang)}</p>
            </div>
            <div className="rounded-xl border border-[#d6b25e]/14 bg-[#090807]/70 p-3">
              <p className="editorial-label">{t("life.tools.activeVisualReminder", lang)}</p>
              <p className="mt-2 text-sm font-semibold text-[#f1e7d5]">
                {selectedReminders.length
                  ? selectedReminders.map((item) => (item.labelKey ? t(item.labelKey, lang) : item.label)).join(", ")
                  : t("life.tools.noReminder", lang)}
              </p>
            </div>
          </div>
        </div>
        </>
        ) : null}

        {activeTab === "journal" ? (
        <>
        <section className="mt-4 grid gap-4 xl:grid-cols-[0.85fr_1.15fr]">
          <SoftPanel title={t("life.journal.pillars", lang)}>
            <div className="grid gap-3">
              {pillarLabels.map((pillar) => (
                <ScoreControl
                  key={pillar.key}
                  label={pillar.labelKey ? t(pillar.labelKey, lang) : pillar.label}
                  max={5}
                  onChange={(value) => updatePillar(pillar.key, value)}
                  value={dailyJournal.pillars[pillar.key]}
                />
              ))}
            </div>
          </SoftPanel>

          <SoftPanel title={t("life.journal.daily", lang)}>
            <div className="mb-4 rounded-xl border border-[#d6b25e]/14 bg-[#0f0d0a]/50 px-3 py-2 text-xs leading-5 text-[#b8aa91]">
              {t("life.journal.savedLocal", lang)} : {dailyJournalKey(today.date)}
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              {journalFields.map((field) => (
                <JournalTextarea
                  key={field.key}
                  label={field.labelKey ? t(field.labelKey, lang) : field.label}
                  onChange={(value) => updateJournalField(field.key, value)}
                  value={dailyJournal.journal[field.key]}
                />
              ))}
            </div>
          </SoftPanel>
        </section>

        <div className="mt-4 grid gap-4">
          <SoftPanel title={t("life.journal.dailyState", lang)}>
            <div className="grid gap-3 sm:grid-cols-2">
              <MetricSlider label={t("life.journal.slider.energy", lang)} onChange={(value) => updateState("energie", value)} value={today.state.energie} />
              <MetricSlider label={t("life.journal.slider.mentalClarity", lang)} onChange={(value) => updateState("clarte", value)} value={today.state.clarte} />
              <MetricSlider label={t("life.journal.slider.dissociation", lang)} onChange={(value) => updateState("dissociation", value)} value={today.state.dissociation} />
              <MetricSlider label={t("life.journal.slider.anxiety", lang)} onChange={(value) => updateState("anxiete", value)} value={today.state.anxiete} />
              <MetricSlider label={t("life.journal.slider.sleep", lang)} onChange={(value) => updateState("sommeil", value)} value={today.state.sommeil} />
              <MetricSlider label={t("life.journal.slider.concentration", lang)} onChange={(value) => updateState("concentration", value)} value={today.state.concentration} />
              <MetricSlider label={t("life.journal.slider.motivation", lang)} onChange={(value) => updateState("motivation", value)} value={today.state.motivation} />
              <MetricSlider label={t("life.journal.slider.overload", lang)} onChange={(value) => updateState("surcharge", value)} value={today.state.surcharge} />
            </div>
          </SoftPanel>
        </div>

        <section className="mt-4">
          <SoftPanel title={t("life.journal.realPriority", lang)}>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {priorities.map((priority) => (
                <button
                  className={`rounded-full border px-3 py-2 text-sm font-semibold transition ${
                    today.priority === priority
                      ? "border-[#d6b25e]/55 bg-[#d6b25e] text-[#15110d]"
                      : "border-[#d6b25e]/16 bg-[#0f0d0a]/55 text-[#d8cbb5]"
                  }`}
                  key={priority}
                  onClick={() => updatePriority(priority)}
                  type="button"
                >
                  {priority}
                </button>
              ))}
            </div>
          </SoftPanel>
        </section>

        <SoftPanel title={t("life.journal.continuity", lang)}>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <article className="rounded-xl border border-[#d6b25e]/14 bg-[#0f0d0a]/55 p-3">
              <p className="editorial-label">{t("life.journal.continuity.activeDays", lang)}</p>
              <p className="mt-2 text-xl font-semibold text-[#f1e7d5]">{activeStreak}</p>
            </article>
            <article className="rounded-xl border border-[#d6b25e]/14 bg-[#0f0d0a]/55 p-3">
              <p className="editorial-label">{t("life.journal.continuity.lastWriting", lang)}</p>
              <p className="mt-2 text-sm font-semibold text-[#f1e7d5]">{lastWritingSession}</p>
            </article>
            <article className="rounded-xl border border-[#d6b25e]/14 bg-[#0f0d0a]/55 p-3">
              <p className="editorial-label">{t("life.journal.continuity.lastBackup", lang)}</p>
              <p className="mt-2 text-sm font-semibold text-[#f1e7d5]">{formatDateTime(lastBackup)}</p>
            </article>
            <article className="rounded-xl border border-[#d6b25e]/14 bg-[#0f0d0a]/55 p-3">
              <p className="editorial-label">{t("life.journal.continuity.lastChapter", lang)}</p>
              <p className="mt-2 text-sm font-semibold text-[#f1e7d5]">{lastChapter}</p>
            </article>
          </div>
        </SoftPanel>
        </>
        ) : null}

        {activeTab === "corps" ? (
        <>
        <SoftPanel title={t("life.body.sensoryGrounding", lang)}>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
            {anchorLabels.map((item) => (
              <button
                className={`rounded-xl border px-3 py-3 text-left text-sm font-semibold transition ${
                  today.anchors[item.key]
                    ? "border-emerald-300/35 bg-emerald-400/10 text-emerald-100"
                    : "border-[#d6b25e]/14 bg-[#0f0d0a]/55 text-[#d8cbb5]"
                }`}
                key={item.key}
                onClick={() => updateAnchor(item.key)}
                type="button"
              >
                {item.labelKey ? t(item.labelKey, lang) : item.label}
              </button>
            ))}
          </div>
        </SoftPanel>

        <SoftPanel title={t("life.body.panel", lang)}>
          <div className="grid gap-4 xl:grid-cols-[1.05fr_0.95fr]">
            <div className="rounded-2xl border border-[#d6b25e]/14 bg-[#0f0d0a]/50 p-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <p className="text-sm font-semibold text-[#f1e7d5]">{t("life.body.heartCoherence", lang)}</p>
                  <p className="mt-1 text-sm leading-6 text-[#b8aa91]">{t("life.body.guidedRhythm", lang)}</p>
                </div>
                <div className="flex rounded-full border border-[#d6b25e]/16 bg-[#090807] p-1">
                  {(["rapide", "standard"] as const).map((mode) => (
                    <button
                      className={`rounded-full px-3 py-1 text-xs font-semibold transition ${
                        resonanceMode === mode ? "bg-[#d6b25e] text-[#15110d]" : "text-[#d8cbb5]"
                      }`}
                      key={mode}
                      onClick={() => {
                        setResonanceMode(mode);
                        resetResonance();
                      }}
                      type="button"
                    >
                      {mode === "rapide" ? t("life.body.quickMode", lang) : t("life.body.standardMode", lang)}
                    </button>
                  ))}
                </div>
              </div>

              <div className="mt-5 grid gap-4 sm:grid-cols-[190px_1fr] sm:items-center">
                <div className="mx-auto flex h-44 w-44 items-center justify-center rounded-full border border-[#d6b25e]/24 bg-[#171411] p-4 shadow-[inset_0_0_45px_rgba(214,178,94,0.06)]">
                  <div
                    className="flex h-full w-full items-center justify-center rounded-full border border-[#d6b25e]/18 bg-[#0f0d0a] transition-transform duration-1000 ease-in-out"
                    style={{ transform: `scale(${phase === "inspire" && isBreathing ? 1.08 : 0.9})` }}
                  >
                    <div className="text-center">
                      <p className="text-2xl font-semibold text-[#f1e7d5]">{phase === "inspire" ? t("life.body.inhale", lang) : t("life.body.exhale", lang)}</p>
                      <p className="mt-1 text-xs text-[#b8aa91]">{resonanceElapsed}s / {resonanceDuration}s</p>
                    </div>
                  </div>
                </div>

                <div>
                  <div className="h-2 overflow-hidden rounded-full bg-[#090807]">
                    <div className="h-full rounded-full bg-[#d6b25e] transition-all duration-500" style={{ width: `${progress}%` }} />
                  </div>
                  <div className="mt-4 flex flex-wrap gap-2">
                    <button
                      className="rounded-full border border-[#d6b25e]/32 bg-[#d6b25e] px-4 py-2 text-sm font-semibold text-[#15110d]"
                      onClick={() => setIsBreathing((current) => !current)}
                      type="button"
                    >
                      {isBreathing ? t("life.body.pause", lang) : t("life.body.start", lang)}
                    </button>
                    <button
                      className="rounded-full border border-[#d6b25e]/18 bg-[#0f0d0a] px-4 py-2 text-sm font-semibold text-[#d8cbb5]"
                      onClick={resetResonance}
                      type="button"
                    >
                      {t("life.body.reset", lang)}
                    </button>
                    <button
                      className={`rounded-full border px-4 py-2 text-sm font-semibold ${
                        soundEnabled
                          ? "border-emerald-300/35 bg-emerald-400/10 text-emerald-100"
                          : "border-[#d6b25e]/18 bg-[#0f0d0a] text-[#d8cbb5]"
                      }`}
                      onClick={() => setSoundEnabled((current) => !current)}
                      type="button"
                    >
                      Son {soundEnabled ? "activé" : "désactivé"}
                    </button>
                  </div>
                  <div className="mt-4 grid gap-2 sm:grid-cols-2">
                    <div className="rounded-xl border border-[#d6b25e]/14 bg-[#090807]/70 p-3">
                      <p className="editorial-label">{t("life.body.today", lang)}</p>
                      <p className="mt-2 text-lg font-semibold text-[#f1e7d5]">{today.resonanceSessions.length >= 3 ? "3+" : today.resonanceSessions.length} {t("life.body.sessionsToday", lang)}</p>
                    </div>
                    <div className="rounded-xl border border-[#d6b25e]/14 bg-[#090807]/70 p-3">
                      <p className="editorial-label">{t("life.body.lastSession", lang)}</p>
                      <p className="mt-2 text-sm font-semibold text-[#f1e7d5]">{formatBodyDurationSince(lastResonanceSession, lang)}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="grid gap-4">
              {videoAvailable ? (
                <div className="rounded-2xl border border-[#d6b25e]/14 bg-[#0f0d0a]/50 p-4">
                  <p className="text-sm font-semibold text-[#f1e7d5]">{t("life.body.videoGuide", lang)}</p>
                  <video
                    className="mt-3 aspect-video w-full rounded-xl border border-[#d6b25e]/14 bg-[#090807] object-cover"
                    controls
                    onError={() => setVideoAvailable(false)}
                    preload="metadata"
                    src="/videos/resonance-cardiaque.mp4"
                  />
                </div>
              ) : null}

              <div className="rounded-2xl border border-[#d6b25e]/14 bg-[#0f0d0a]/50 p-4">
                <p className="text-sm font-semibold text-[#f1e7d5]">{t("life.body.bodySignals", lang)}</p>
                <div className="mt-3 grid gap-2">
                  {bodySignals.length ? (
                    bodySignals.map((message) => (
                      <p className="rounded-xl border border-amber-300/22 bg-amber-400/8 px-3 py-2 text-sm leading-5 text-amber-50" key={message}>
                        {t(bodySignalKey(message), lang)}
                      </p>
                    ))
                  ) : (
                    <p className="rounded-xl border border-emerald-300/22 bg-emerald-400/8 px-3 py-2 text-sm leading-5 text-emerald-50">
                      {t("life.body.noUrgentBodySignal", lang)}
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>

          {showBodyReconnection ? (
            <div className="mt-4 rounded-2xl border border-sky-300/22 bg-sky-400/8 p-4 text-sky-50">
              <p className="text-sm font-semibold">{t("life.body.bodyReconnection", lang)}</p>
              <p className="mt-2 text-sm leading-6 text-sky-50/85">
                {t("life.body.reconnectionActive", lang)}
              </p>
              <div className="mt-4 grid gap-3 md:grid-cols-2">
                {bodyReconnectionFields.map((prompt) => (
                  <JournalTextarea
                    key={prompt.key}
                    label={t(prompt.labelKey, lang)}
                    onChange={(value) => updateBodyReconnection(prompt.key, value)}
                    value={dailyJournal.bodyReconnection[prompt.key] || ""}
                  />
                ))}
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                {bodyReconnectionSuggestions.map((suggestion) => (
                  <span className="rounded-full border border-sky-100/20 bg-black/10 px-3 py-1 text-xs font-semibold" key={suggestion.label}>
                    {t(suggestion.labelKey, lang)}
                  </span>
                ))}
              </div>
            </div>
          ) : null}

          <div className="mt-4 grid gap-4 lg:grid-cols-2">
            <div className="rounded-2xl border border-[#d6b25e]/14 bg-[#0f0d0a]/50 p-4">
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm font-semibold text-[#f1e7d5]">{t("life.body.dailyMovement", lang)}</p>
                <span className="rounded-full border border-[#d6b25e]/16 px-3 py-1 text-xs font-semibold text-[#d8cbb5]">
                  {movementDone}/{movementLabels.length}
                </span>
              </div>
              <div className="mt-3 grid gap-2 sm:grid-cols-2">
                {movementLabels.map((item) => (
                  <button
                    className={`rounded-xl border px-3 py-3 text-left text-sm font-semibold transition ${
                      today.movement[item.key]
                        ? "border-emerald-300/35 bg-emerald-400/10 text-emerald-100"
                        : "border-[#d6b25e]/14 bg-[#090807]/70 text-[#d8cbb5]"
                    }`}
                    key={item.key}
                    onClick={() => updateMovement(item.key)}
                    type="button"
                  >
                    {item.labelKey ? t(item.labelKey, lang) : item.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="rounded-2xl border border-[#d6b25e]/14 bg-[#0f0d0a]/50 p-4">
              <p className="text-sm font-semibold text-[#f1e7d5]">Objectifs recommandés</p>
              <div className="mt-3 grid gap-2 text-sm leading-5 text-[#d8cbb5]">
                <p className="rounded-xl border border-[#d6b25e]/12 bg-[#090807]/70 px-3 py-2">Résonance cardiaque : 1 à 3 fois par jour.</p>
                <p className="rounded-xl border border-[#d6b25e]/12 bg-[#090807]/70 px-3 py-2">Marche : 10 à 30 minutes selon énergie.</p>
                <p className="rounded-xl border border-[#d6b25e]/12 bg-[#090807]/70 px-3 py-2">Yoga / étirements : 5 à 20 minutes.</p>
                <p className="rounded-xl border border-[#d6b25e]/12 bg-[#090807]/70 px-3 py-2">Danse : 1 courte session si énergie suffisante.</p>
                <p className="rounded-xl border border-[#d6b25e]/12 bg-[#090807]/70 px-3 py-2">Pause corps : au moins 1 fois par jour.</p>
              </div>
            </div>
          </div>

        </SoftPanel>
        </>
        ) : null}
      </div>
    </main>
  );
}
