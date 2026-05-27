"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import {
  StatusChip,
  SystemGrid,
  SystemPageShell,
  SystemPanel,
  SystemSectionHeader,
} from "@/components/system-ui";
import { BackLink } from "@/components/ui/back-link";

interface RelationDossier {
  id: string;
  nom: string;
  statut: string;
  dateCreation: string;
  derniereInteraction?: string;
  derniereAnalyse?: RelationAnalysis;
  analyses?: AnalyseConversation[];
  decisions?: Decision[];
  journal?: EntreeJournal[];
  notes?: string;
  tags?: string[];
  conversations?: RelationConversation[];
  energieEmotionnelle?: number;
  niveauClarte?: number;
  niveauReciprocite?: number;
  niveauSecurite?: number;
}

interface RelationConversation {
  id: string;
  titre?: string;
  contenu: string;
  dateCreation: string;
}

interface RelationAnalysis {
  date?: string;
  tonalite?: string;
  patterns?: string[];
  niveauTension?: string;
  observations?: string[];
}

interface AnalyseConversation {
  id: string;
  date: string;
  tonalite: string;
  patterns: string[];
  niveauTension: string;
  observations: string[];
}

interface Decision {
  id: string;
  date: string;
  situation: string;
  intention: string;
  optionChoisie: string;
  recommandation: string;
}

interface EntreeJournal {
  id: string;
  date: string;
  evenement: string;
  emotion: string;
  intensite: number;
  declencheur?: string;
}

type IndicatorKey = "niveauClarte" | "niveauReciprocite" | "niveauSecurite" | "energieEmotionnelle";

type IndicatorConfig = {
  key: IndicatorKey;
  label: string;
};

type RadarDimension = {
  label: string;
  value?: number;
};

const STORAGE_KEY = "autre-rive-dossiers";

const indicators: IndicatorConfig[] = [
  { key: "niveauClarte", label: "Clarté" },
  { key: "niveauReciprocite", label: "Réciprocité" },
  { key: "niveauSecurite", label: "Sécurité" },
  { key: "energieEmotionnelle", label: "Énergie émotionnelle" },
];

const situationOptions = [
  "Nous communiquons encore",
  "La communication est réduite",
  "Nous ne communiquons plus",
  "Je dois prendre une décision importante",
  "Je me sens confus(e) sur la relation",
  "La relation me fait du mal",
  "Je veux améliorer la relation",
  "Autre",
];

const intentionOptions = [
  "Continuer la relation",
  "Mettre la relation en pause",
  "Mettre fin à la relation",
  "Établir de nouvelles limites",
  "Demander une conversation",
  "Observer sans agir",
  "Prendre soin de moi d'abord",
];

const intentionOptionMap: Record<string, string[]> = {
  "Continuer la relation": [
    "Exprimer clairement vos besoins",
    "Proposer un moment de dialogue structuré",
    "Observer l'évolution sur 2 semaines",
  ],
  "Mettre fin à la relation": [
    "Préparer un message clair et sobre",
    "Choisir le bon moment et le bon canal",
    "Anticiper les réactions possibles",
  ],
  "Établir de nouvelles limites": [
    "Identifier la limite la plus urgente",
    "Formuler la limite en une phrase simple",
    "Choisir le moment pour l'exprimer",
  ],
  "Mettre la relation en pause": [
    "Informer l'autre de votre besoin d'espace",
    "Définir une durée approximative",
    "Utiliser ce temps pour clarifier vos besoins",
  ],
  "Demander une conversation": [
    "Choisir un moment calme",
    "Préparer 2 ou 3 points essentiels",
    "Écouter sans interrompre",
  ],
  "Observer sans agir": [
    "Noter vos observations quotidiennes",
    "Fixer une date de réévaluation",
    "Éviter les décisions sous l'émotion",
  ],
  "Prendre soin de moi d'abord": [
    "Réduire les interactions pour l'instant",
    "Identifier vos besoins fondamentaux",
    "Chercher un soutien extérieur si nécessaire",
  ],
};

const emotionOptions = [
  "Anxiété",
  "Tristesse",
  "Colère",
  "Peur",
  "Confusion",
  "Soulagement",
  "Joie",
  "Espoir",
  "Honte",
  "Culpabilité",
  "Solitude",
  "Sécurité",
  "Autre",
];

const relationTabs = [
  "Vue d’ensemble",
  "Évaluation",
  "Observations",
  "Conversations",
  "Décisions & Patterns",
] as const;

type RelationTab = (typeof relationTabs)[number];

const dashboardButtonStyle = {
  alignItems: "center",
  borderRadius: 999,
  display: "inline-flex",
  fontSize: 12.5,
  justifyContent: "center",
  lineHeight: 1,
  minHeight: 36,
  padding: "7px 11px",
  textAlign: "center",
  whiteSpace: "nowrap",
} as const;

const dashboardFieldStyle = {
  display: "grid",
  gap: 4,
} as const;

const dashboardControlStyle = {
  boxSizing: "border-box",
  fontSize: 13,
  minHeight: 36,
  padding: "6px 10px",
  width: "100%",
} as const;

function isRelationDossier(value: unknown): value is RelationDossier {
  if (!value || typeof value !== "object") return false;
  const item = value as Partial<RelationDossier>;
  return typeof item.id === "string" && typeof item.nom === "string" && typeof item.statut === "string" && typeof item.dateCreation === "string";
}

function readDossiers(): RelationDossier[] {
  if (typeof window === "undefined") return [];

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    const data: unknown = raw ? JSON.parse(raw) : [];
    return Array.isArray(data) ? data.filter(isRelationDossier) : [];
  } catch {
    return [];
  }
}

function saveDossiers(dossiers: RelationDossier[]) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(dossiers));
  } catch {
    return;
  }
}

function getRouteId(value: string | string[] | undefined) {
  if (Array.isArray(value)) return value[0] || "";
  return value || "";
}

function calculateCompletion(dossier: RelationDossier) {
  let score = 0;
  const hasIndicator = indicators.some((indicator) => typeof dossier[indicator.key] === "number");

  if (dossier.nom.trim()) score += 15;
  if (dossier.statut.trim()) score += 15;
  if (dossier.derniereInteraction?.trim()) score += 15;
  if (dossier.notes?.trim()) score += 20;
  if (dossier.tags?.length) score += 15;
  if (hasIndicator) score += 20;

  return score;
}

function completionColor(score: number) {
  if (score <= 40) return "#b56b5f";
  if (score <= 70) return "var(--accent-gold)";
  return "#9fbd99";
}

function createConversationId() {
  return `conv-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function createDecisionId() {
  return `decision-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function createJournalId() {
  return `journal-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function isRelationConversation(value: unknown): value is RelationConversation {
  if (!value || typeof value !== "object") return false;
  const item = value as Partial<RelationConversation>;
  return typeof item.id === "string" && typeof item.contenu === "string" && typeof item.dateCreation === "string";
}

function isAnalyseConversation(value: unknown): value is AnalyseConversation {
  if (!value || typeof value !== "object") return false;
  const item = value as Partial<AnalyseConversation>;
  return (
    typeof item.id === "string" &&
    typeof item.date === "string" &&
    typeof item.tonalite === "string" &&
    typeof item.niveauTension === "string" &&
    Array.isArray(item.patterns) &&
    Array.isArray(item.observations)
  );
}

function isDecision(value: unknown): value is Decision {
  if (!value || typeof value !== "object") return false;
  const item = value as Partial<Decision>;
  return (
    typeof item.id === "string" &&
    typeof item.date === "string" &&
    typeof item.situation === "string" &&
    typeof item.intention === "string" &&
    typeof item.optionChoisie === "string" &&
    typeof item.recommandation === "string"
  );
}

function isEntreeJournal(value: unknown): value is EntreeJournal {
  if (!value || typeof value !== "object") return false;
  const item = value as Partial<EntreeJournal>;
  return (
    typeof item.id === "string" &&
    typeof item.date === "string" &&
    typeof item.evenement === "string" &&
    typeof item.emotion === "string" &&
    typeof item.intensite === "number"
  );
}

function getConversations(dossier: RelationDossier) {
  return Array.isArray(dossier.conversations) ? dossier.conversations.filter(isRelationConversation) : [];
}

function getAnalyses(dossier: RelationDossier) {
  return Array.isArray(dossier.analyses)
    ? dossier.analyses
        .filter(isAnalyseConversation)
        .sort((first, second) => second.date.localeCompare(first.date))
    : [];
}

function getDecisions(dossier: RelationDossier) {
  return Array.isArray(dossier.decisions)
    ? dossier.decisions.filter(isDecision).sort((first, second) => second.date.localeCompare(first.date))
    : [];
}

function getJournal(dossier: RelationDossier) {
  return Array.isArray(dossier.journal)
    ? dossier.journal.filter(isEntreeJournal).sort((first, second) => second.date.localeCompare(first.date))
    : [];
}

function formatConversationDate(value: string) {
  try {
    return new Intl.DateTimeFormat("fr-CA", {
      day: "2-digit",
      month: "long",
      year: "numeric",
    }).format(new Date(value));
  } catch {
    return value;
  }
}

function previewConversation(value: string) {
  const compact = value.replace(/\s+/g, " ").trim();
  return compact.length > 200 ? `${compact.slice(0, 200)}...` : compact;
}

function formatDecisionRelativeDate(value: string) {
  const maintenant = Date.now();
  const dateDecision = new Date(value).getTime();
  if (!Number.isFinite(dateDecision)) return value;

  const jours = Math.floor((maintenant - dateDecision) / (1000 * 60 * 60 * 24));
  if (jours === 0) return "Aujourd'hui";
  if (jours === 1) return "Hier";
  if (jours < 30) return `Il y a ${jours} jours`;
  return formatAnalysisDate(value);
}

function previewJournalEvent(value: string) {
  const compact = value.replace(/\s+/g, " ").trim();
  return compact.length > 150 ? `${compact.slice(0, 150)}...` : compact;
}

function previewPatternEvent(value: string) {
  const compact = value.replace(/\s+/g, " ").trim();
  return compact.length > 100 ? `${compact.slice(0, 100)}...` : compact;
}

function sanitizeExportFileName(value: string) {
  return (
    value
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-zA-Z0-9-_]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .toLocaleLowerCase("fr-CA") || "dossier-relationnel"
  );
}

function downloadExportFile(fileName: string, content: string, type: string) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function formatAnalysisDate(value: string) {
  try {
    return new Intl.DateTimeFormat("fr-CA", {
      day: "2-digit",
      month: "long",
      year: "numeric",
    }).format(new Date(value));
  } catch {
    return value;
  }
}

function tonaliteTone(value: string): "success" | "warning" | "neutral" {
  if (value === "Positive") return "success";
  if (value === "Tendue" || value === "Mixte") return "warning";
  return "neutral";
}

function tensionTone(value: string): "success" | "warning" | "neutral" {
  if (value === "Faible") return "success";
  if (value === "Modéré" || value === "Élevé") return "warning";
  return "neutral";
}

function tensionValue(value: string | undefined) {
  if (value === "Faible") return 3;
  if (value === "Modéré") return 6;
  if (value === "Élevé") return 9;
  return undefined;
}

function inverseTensionValue(value: string | undefined) {
  if (value === "Faible") return 8;
  if (value === "Modéré") return 5;
  if (value === "Élevé") return 2;
  return undefined;
}

function radarColor(value: number) {
  if (value <= 3) return "#b56b5f";
  if (value <= 6) return "var(--accent-gold)";
  return "#9fbd99";
}

function getGeneralState(values: number[]) {
  if (!values.length) return "Non évalué";
  const average = values.reduce((total, value) => total + value, 0) / values.length;
  if (average <= 3) return "Préoccupant";
  if (average <= 6) return "À surveiller";
  return "Stable";
}

function getRelationSummaryState(score: number | null) {
  if (score === null) return "Non évalué";
  if (score <= 3) return "Préoccupant";
  if (score <= 5) return "Fragile";
  if (score <= 7) return "À surveiller";
  return "Stable";
}

function relationSummaryStateStyle(state: string) {
  if (state === "Préoccupant") return { borderColor: "rgba(181,107,95,.42)", color: "#d79a8f" };
  if (state === "Fragile") return { borderColor: "rgba(201,132,74,.42)", color: "#d7a06f" };
  if (state === "À surveiller") return { borderColor: "rgba(201,168,92,.36)", color: "var(--accent-gold)" };
  if (state === "Stable") return { borderColor: "rgba(159,189,153,.42)", color: "#b9d4b4" };
  return { borderColor: "rgba(255,255,255,.16)", color: "var(--text-soft)" };
}

function securityLevelStyle(level: string) {
  if (level === "Prioritaire") return { borderColor: "rgba(181,107,95,.52)", color: "#d79a8f" };
  if (level === "Vigilance") return { borderColor: "rgba(201,132,74,.48)", color: "#d7a06f" };
  return { borderColor: "rgba(201,168,92,.38)", color: "var(--accent-gold)" };
}

function generalStateTone(value: string): "success" | "warning" | "neutral" {
  if (value === "Stable") return "success";
  if (value === "Préoccupant" || value === "À surveiller") return "warning";
  return "neutral";
}

function emotionBadgeStyle(emotion: string) {
  if (["Anxiété", "Peur", "Honte", "Culpabilité", "Solitude"].includes(emotion)) {
    return { borderColor: "rgba(181,107,95,.42)", color: "#d79a8f" };
  }
  if (["Tristesse", "Confusion"].includes(emotion)) {
    return { borderColor: "rgba(158,171,186,.34)", color: "#c4ccd6" };
  }
  if (emotion === "Colère") {
    return { borderColor: "rgba(201,132,74,.42)", color: "#d7a06f" };
  }
  if (["Soulagement", "Joie", "Espoir", "Sécurité"].includes(emotion)) {
    return { borderColor: "rgba(159,189,153,.42)", color: "#b9d4b4" };
  }
  return { borderColor: "rgba(201,168,92,.18)", color: "var(--text-soft)" };
}

function intensityColor(value: number) {
  if (value <= 3) return "#9fbd99";
  if (value <= 6) return "var(--accent-gold)";
  return "#b56b5f";
}

function isSoothingEmotion(emotion: string) {
  return ["Soulagement", "Joie", "Espoir", "Sécurité"].includes(emotion);
}

function isDrainingEmotion(emotion: string) {
  return ["Anxiété", "Peur", "Colère", "Tristesse", "Honte", "Culpabilité", "Solitude", "Confusion"].includes(emotion);
}

function getEnergyValue(emotion: string, intensity: number) {
  if (isDrainingEmotion(emotion)) return intensity * -1;
  if (isSoothingEmotion(emotion)) return intensity;
  return 0;
}

function getEnergyScore(entries: EntreeJournal[]) {
  if (!entries.length) return 0;
  const rawScore = entries.reduce((total, entry) => total + getEnergyValue(entry.emotion, entry.intensite), 0);
  const minimum = entries.length * -10;
  const maximum = entries.length * 10;
  return Math.round((((rawScore - minimum) / (maximum - minimum)) * 10) * 10) / 10;
}

function energyState(score: number) {
  if (score <= 3) return "Relation drainante";
  if (score <= 6) return "Relation mixte";
  return "Relation apaisante";
}

function energyTone(score: number): "success" | "warning" | "neutral" {
  if (score >= 7) return "success";
  if (score >= 4) return "warning";
  return "neutral";
}

function energyColor(score: number) {
  if (score <= 3) return "#b56b5f";
  if (score <= 6) return "var(--accent-gold)";
  return "#9fbd99";
}

function energyType(emotion: string) {
  if (isDrainingEmotion(emotion)) return "Drainant";
  if (isSoothingEmotion(emotion)) return "Apaisant";
  return "Neutre";
}

function tensionScore(value: string) {
  if (value === "Élevé") return 3;
  if (value === "Modéré") return 2;
  if (value === "Faible") return 1;
  return 0;
}

function repetitionLevel(count: number) {
  if (count >= 4) return "Persistant";
  if (count >= 2) return "Récurrent";
  return "Isolé";
}

function repetitionLevelStyle(level: string) {
  if (level === "Persistant") return { borderColor: "rgba(181,107,95,.42)", color: "#d79a8f" };
  if (level === "Récurrent") return { borderColor: "rgba(201,168,92,.36)", color: "var(--accent-gold)" };
  return { borderColor: "rgba(201,168,92,.18)", color: "var(--text-soft)" };
}

function getMostFrequent(values: string[]) {
  const counts = new Map<string, number>();
  values.forEach((value) => counts.set(value, (counts.get(value) || 0) + 1));
  return Array.from(counts.entries()).sort((first, second) => second[1] - first[1])[0] || null;
}

function getLatestByDate<T>(items: T[], getDate: (item: T) => string | undefined) {
  return [...items].sort((first, second) => {
    const firstDate = new Date(getDate(first) || "").getTime();
    const secondDate = new Date(getDate(second) || "").getTime();
    return (Number.isFinite(secondDate) ? secondDate : 0) - (Number.isFinite(firstDate) ? firstDate : 0);
  })[0];
}

function parseValidDateTime(value: string | undefined) {
  const timestamp = new Date(value || "").getTime();
  return Number.isFinite(timestamp) ? timestamp : null;
}

function getLatestValidDate(values: Array<string | undefined>) {
  return values
    .map(parseValidDateTime)
    .filter((timestamp): timestamp is number => timestamp !== null)
    .sort((first, second) => second - first)[0] ?? null;
}

function containsSensitiveWords(value: string) {
  const normalized = value.toLocaleLowerCase("fr-CA");
  return [
    "peur",
    "terreur",
    "danger",
    "menace",
    "violence",
    "contrôle",
    "controle",
    "isolement",
    "isolé",
    "isole",
    "seul",
    "emprisonné",
    "emprisonne",
    "piégé",
    "piege",
    "coincé",
    "coince",
    "honte",
    "humiliation",
    "humilié",
    "humilie",
    "rabaissé",
    "rabaisse",
    "nul",
    "inutile",
    "disparaître",
    "disparaitre",
    "partir",
    "fuir",
    "m'échapper",
    "m echapper",
    "en finir",
    "crier",
    "frapper",
    "blesser",
    "mal",
    "souffrir",
    "souffrance",
    "jamais libre",
    "pas le droit",
    "interdit",
    "surveillance",
    "surveille",
    "manipulé",
    "manipule",
    "manipulation",
    "culpabilisé",
    "culpabilise",
    "culpabiliser",
    "forcé",
    "force",
    "obligé",
    "oblige",
  ].some((word) => normalized.includes(word));
}

function getDecisionOptions(intention: string) {
  return intentionOptionMap[intention] || [];
}

function getDecisionRecommendation(dossier: RelationDossier) {
  if (typeof dossier.niveauSecurite === "number" && dossier.niveauSecurite <= 3) {
    return "Votre niveau de sécurité est bas. Priorisez votre sécurité avant toute décision relationnelle.";
  }

  if (dossier.derniereAnalyse?.niveauTension === "Élevé") {
    return "La tension récente est élevée. Évitez les conversations importantes sous tension.";
  }

  if (typeof dossier.niveauClarte === "number" && dossier.niveauClarte <= 3) {
    return "La clarté de cette relation est faible. Prenez le temps d'observer avant d'agir.";
  }

  const hasBlamePattern = Array.isArray(dossier.derniereAnalyse?.patterns)
    ? dossier.derniereAnalyse.patterns.some((pattern) => pattern.toLocaleLowerCase("fr-CA").includes("blâme"))
    : false;

  if (hasBlamePattern) {
    return "Un pattern de blâme a été détecté. Abordez la situation avec des formulations en je plutôt qu'en tu.";
  }

  return "Basez-vous sur votre intention et vos valeurs pour avancer.";
}

function getRecommendation(dossier: RelationDossier) {
  const allIndicatorsEmpty = indicators.every((indicator) => typeof dossier[indicator.key] !== "number");

  if (allIndicatorsEmpty) return "Commencez par évaluer les indicateurs de cette relation.";
  if (!dossier.notes?.trim()) return "Ajoutez vos premières observations dans les notes.";
  if (!dossier.tags?.length) return "Ajoutez des tags pour mieux caractériser cette relation.";
  return "Cette fiche est complète. Les analyses arrivent bientôt.";
}

export default function RelationDossierDetailPage() {
  const params = useParams<{ id?: string | string[] }>();
  const dossierId = getRouteId(params.id);

  const [dossier, setDossier] = useState<RelationDossier | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [notesDraft, setNotesDraft] = useState("");
  const [notesMessage, setNotesMessage] = useState("");
  const [tagDraft, setTagDraft] = useState("");
  const [tagError, setTagError] = useState("");
  const [conversationTitle, setConversationTitle] = useState("");
  const [conversationContent, setConversationContent] = useState("");
  const [conversationError, setConversationError] = useState("");
  const [conversationMessage, setConversationMessage] = useState("");
  const [expandedConversationId, setExpandedConversationId] = useState("");
  const [deleteConversationTarget, setDeleteConversationTarget] = useState<RelationConversation | null>(null);
  const [expandedAnalysisId, setExpandedAnalysisId] = useState("");
  const [deleteAnalysisTarget, setDeleteAnalysisTarget] = useState<AnalyseConversation | null>(null);
  const [analysisMessage, setAnalysisMessage] = useState("");
  const [decisionSituation, setDecisionSituation] = useState("");
  const [decisionIntention, setDecisionIntention] = useState("");
  const [decisionOption, setDecisionOption] = useState("");
  const [decisionError, setDecisionError] = useState("");
  const [decisionMessage, setDecisionMessage] = useState("");
  const [deleteDecisionTarget, setDeleteDecisionTarget] = useState<Decision | null>(null);
  const [journalEvent, setJournalEvent] = useState("");
  const [journalEmotion, setJournalEmotion] = useState("");
  const [journalIntensity, setJournalIntensity] = useState(5);
  const [journalTrigger, setJournalTrigger] = useState("");
  const [journalError, setJournalError] = useState("");
  const [journalMessage, setJournalMessage] = useState("");
  const [expandedJournalId, setExpandedJournalId] = useState("");
  const [deleteJournalTarget, setDeleteJournalTarget] = useState<EntreeJournal | null>(null);
  const [activeTab, setActiveTab] = useState<RelationTab>("Vue d’ensemble");
  const [searchQuery, setSearchQuery] = useState("");
  const [journalSearchQuery, setJournalSearchQuery] = useState("");
  const [journalEmotionFilter, setJournalEmotionFilter] = useState("");
  const [analysisSearchQuery, setAnalysisSearchQuery] = useState("");
  const [analysisToneFilter, setAnalysisToneFilter] = useState("");
  const [analysisTensionFilter, setAnalysisTensionFilter] = useState("");
  const [decisionSearchQuery, setDecisionSearchQuery] = useState("");
  const [decisionIntentionFilter, setDecisionIntentionFilter] = useState("");
  const [decisionSituationFilter, setDecisionSituationFilter] = useState("");

  useEffect(() => {
    const found = readDossiers().find((item) => item.id === dossierId) || null;
    setDossier(found);
    setNotesDraft(found?.notes || "");
    setLoaded(true);
  }, [dossierId]);

  function updateDossier(updater: (current: RelationDossier) => RelationDossier) {
    const currentDossiers = readDossiers();
    const current = currentDossiers.find((item) => item.id === dossierId);
    if (!current) {
      setDossier(null);
      return;
    }

    const updated = updater(current);
    const next = currentDossiers.map((item) => (item.id === dossierId ? updated : item));
    saveDossiers(next);
    setDossier(updated);
  }

  function updateIndicator(key: IndicatorKey, value: string) {
    const numericValue = Number(value);
    if (!Number.isFinite(numericValue)) return;
    updateDossier((current) => ({ ...current, [key]: numericValue }));
  }

  function saveNotes() {
    updateDossier((current) => ({ ...current, notes: notesDraft.trim() }));
    setNotesMessage("Notes enregistrées.");
    window.setTimeout(() => setNotesMessage(""), 2000);
  }

  function addTag() {
    const tag = tagDraft.trim();
    if (!tag) {
      setTagError("Le tag ne peut pas être vide.");
      return;
    }

    const existingTags = dossier?.tags || [];
    if (existingTags.includes(tag)) {
      setTagError("Ce tag existe déjà.");
      return;
    }

    updateDossier((current) => ({ ...current, tags: [...(current.tags || []), tag] }));
    setTagDraft("");
    setTagError("");
  }

  function removeTag(tag: string) {
    updateDossier((current) => ({ ...current, tags: (current.tags || []).filter((item) => item !== tag) }));
  }

  function saveConversation() {
    const contenu = conversationContent.trim();
    if (contenu.length < 20) {
      setConversationError("Veuillez saisir au moins 20 caractères.");
      return;
    }

    const conversation: RelationConversation = {
      id: createConversationId(),
      titre: conversationTitle.trim() || undefined,
      contenu,
      dateCreation: new Date().toISOString(),
    };

    updateDossier((current) => ({
      ...current,
      conversations: [conversation, ...getConversations(current)],
    }));
    setConversationTitle("");
    setConversationContent("");
    setConversationError("");
    setConversationMessage("Conversation enregistrée.");
    window.setTimeout(() => setConversationMessage(""), 2000);
  }

  function confirmDeleteConversation() {
    if (!deleteConversationTarget) return;
    updateDossier((current) => ({
      ...current,
      conversations: getConversations(current).filter((conversation) => conversation.id !== deleteConversationTarget.id),
    }));
    setExpandedConversationId((current) => (current === deleteConversationTarget.id ? "" : current));
    setDeleteConversationTarget(null);
  }

  function confirmDeleteAnalysis() {
    if (!deleteAnalysisTarget) return;

    updateDossier((current) => {
      const nextAnalyses = getAnalyses(current).filter((analysis) => analysis.id !== deleteAnalysisTarget.id);
      const nextLatest = nextAnalyses[0];

      return {
        ...current,
        analyses: nextAnalyses,
        derniereAnalyse: nextLatest
          ? {
              date: nextLatest.date,
              niveauTension: nextLatest.niveauTension,
              observations: nextLatest.observations,
              patterns: nextLatest.patterns,
              tonalite: nextLatest.tonalite,
            }
          : undefined,
      };
    });
    setExpandedAnalysisId((current) => (current === deleteAnalysisTarget.id ? "" : current));
    setDeleteAnalysisTarget(null);
    setAnalysisMessage("Analyse supprimée.");
    window.setTimeout(() => setAnalysisMessage(""), 2000);
  }

  function saveDecision() {
    if (!dossier) return;
    if (!decisionSituation) {
      setDecisionError("Veuillez choisir une situation.");
      return;
    }
    if (!decisionIntention) {
      setDecisionError("Veuillez choisir une intention.");
      return;
    }
    if (!decisionOption) {
      setDecisionError("Veuillez choisir une option.");
      return;
    }

    const decision: Decision = {
      date: new Date().toISOString(),
      id: createDecisionId(),
      intention: decisionIntention,
      optionChoisie: decisionOption,
      recommandation: getDecisionRecommendation(dossier),
      situation: decisionSituation,
    };

    updateDossier((current) => ({
      ...current,
      decisions: [decision, ...getDecisions(current)],
    }));
    setDecisionSituation("");
    setDecisionIntention("");
    setDecisionOption("");
    setDecisionError("");
    setDecisionMessage("Décision sauvegardée.");
    window.setTimeout(() => setDecisionMessage(""), 2000);
  }

  function confirmDeleteDecision() {
    if (!deleteDecisionTarget) return;
    updateDossier((current) => ({
      ...current,
      decisions: getDecisions(current).filter((decision) => decision.id !== deleteDecisionTarget.id),
    }));
    setDeleteDecisionTarget(null);
    setDecisionMessage("Décision supprimée.");
    window.setTimeout(() => setDecisionMessage(""), 2000);
  }

  function saveJournalEntry() {
    const evenement = journalEvent.trim();
    if (evenement.length < 10) {
      setJournalError("Veuillez saisir au moins 10 caractères.");
      return;
    }
    if (!journalEmotion) {
      setJournalError("Veuillez choisir une émotion.");
      return;
    }

    const entry: EntreeJournal = {
      date: new Date().toISOString(),
      declencheur: journalTrigger.trim() || undefined,
      emotion: journalEmotion,
      evenement,
      id: createJournalId(),
      intensite: journalIntensity,
    };

    updateDossier((current) => ({
      ...current,
      journal: [entry, ...getJournal(current)],
    }));
    setJournalEvent("");
    setJournalEmotion("");
    setJournalIntensity(5);
    setJournalTrigger("");
    setJournalError("");
    setJournalMessage("Entrée enregistrée.");
    window.setTimeout(() => setJournalMessage(""), 2000);
  }

  function confirmDeleteJournalEntry() {
    if (!deleteJournalTarget) return;
    updateDossier((current) => ({
      ...current,
      journal: getJournal(current).filter((entry) => entry.id !== deleteJournalTarget.id),
    }));
    setExpandedJournalId((current) => (current === deleteJournalTarget.id ? "" : current));
    setDeleteJournalTarget(null);
    setJournalMessage("Entrée supprimée.");
    window.setTimeout(() => setJournalMessage(""), 2000);
  }

  const recommendation = useMemo(() => (dossier ? getRecommendation(dossier) : ""), [dossier]);
  const conversations = useMemo(() => (dossier ? getConversations(dossier) : []), [dossier]);
  const decisions = useMemo(() => (dossier ? getDecisions(dossier) : []), [dossier]);
  const journalEntries = useMemo(() => (dossier ? getJournal(dossier) : []), [dossier]);
  const analyses = useMemo(() => (dossier ? getAnalyses(dossier) : []), [dossier]);
  const decisionOptions = useMemo(() => getDecisionOptions(decisionIntention), [decisionIntention]);
  const currentDecisionRecommendation = useMemo(() => (dossier ? getDecisionRecommendation(dossier) : ""), [dossier]);
  const journalSummary = useMemo(() => {
    if (!journalEntries.length) return null;
    const emotionCounts = new Map<string, number>();
    const intensityTotal = journalEntries.reduce((total, entry) => {
      emotionCounts.set(entry.emotion, (emotionCounts.get(entry.emotion) || 0) + 1);
      return total + entry.intensite;
    }, 0);
    const dominantEmotion = Array.from(emotionCounts.entries()).sort((first, second) => second[1] - first[1])[0]?.[0] || "Non évalué";

    return {
      dominantEmotion,
      averageIntensity: Math.round((intensityTotal / journalEntries.length) * 10) / 10,
      total: journalEntries.length,
    };
  }, [journalEntries]);
  const patternInsights = useMemo(() => {
    const totalEntries = journalEntries.length + decisions.length + analyses.length;
    const emotionGroups = new Map<string, { count: number; intensityTotal: number }>();
    journalEntries.forEach((entry) => {
      const current = emotionGroups.get(entry.emotion) || { count: 0, intensityTotal: 0 };
      emotionGroups.set(entry.emotion, {
        count: current.count + 1,
        intensityTotal: current.intensityTotal + entry.intensite,
      });
    });
    const emotions = Array.from(emotionGroups.entries())
      .map(([emotion, data]) => ({
        averageIntensity: Math.round((data.intensityTotal / data.count) * 10) / 10,
        count: data.count,
        emotion,
      }))
      .sort((first, second) => second.count - first.count)
      .slice(0, 3);

    const maxEmotionCount = Math.max(1, ...emotions.map((emotion) => emotion.count));
    const triggers = Array.from(
      journalEntries
        .filter((entry) => entry.declencheur?.trim())
        .reduce((counts, entry) => {
          const trigger = entry.declencheur?.trim() || "";
          counts.set(trigger, (counts.get(trigger) || 0) + 1);
          return counts;
        }, new Map<string, number>())
        .entries(),
    ).sort((first, second) => second[1] - first[1]);

    const analysisPatterns = Array.from(
      analyses
        .flatMap((analysis) => analysis.patterns)
        .reduce((counts, pattern) => {
          counts.set(pattern, (counts.get(pattern) || 0) + 1);
          return counts;
        }, new Map<string, number>())
        .entries(),
    ).sort((first, second) => second[1] - first[1]);

    const chronologicalTensions = [...analyses].sort((first, second) => first.date.localeCompare(second.date));
    const lastThree = analyses.slice(0, 3).reverse();
    const tensionTrend =
      lastThree.length < 2
        ? ""
        : tensionScore(lastThree[lastThree.length - 1].niveauTension) > tensionScore(lastThree[0].niveauTension)
          ? "Tension en hausse"
          : tensionScore(lastThree[lastThree.length - 1].niveauTension) < tensionScore(lastThree[0].niveauTension)
            ? "Tension en baisse"
            : "Tension stable";
    const notableEvents = [...journalEntries]
      .sort((first, second) => {
        const intensityDifference = second.intensite - first.intensite;
        if (intensityDifference !== 0) return intensityDifference;

        const firstDate = new Date(first.date).getTime();
        const secondDate = new Date(second.date).getTime();
        return (Number.isFinite(secondDate) ? secondDate : 0) - (Number.isFinite(firstDate) ? firstDate : 0);
      })
      .slice(0, 3);

    const topSituation = getMostFrequent(decisions.map((decision) => decision.situation));
    const topIntention = getMostFrequent(decisions.map((decision) => decision.intention));
    const persistentPattern = analysisPatterns.some(([, count]) => count >= 4);
    const dominantEmotion = emotions[0];
    const observations: string[] = [];

    if (
      dominantEmotion &&
      ["Anxiété", "Peur", "Solitude", "Tristesse"].includes(dominantEmotion.emotion) &&
      dominantEmotion.averageIntensity >= 6
    ) {
      observations.push("Cette relation génère fréquemment des émotions intenses à tonalité difficile.");
    }
    if (persistentPattern) {
      observations.push("Certains patterns se répètent de façon persistante dans les conversations analysées.");
    }
    if (tensionTrend === "Tension en hausse") {
      observations.push("La tension dans les échanges a tendance à augmenter.");
    }
    if (typeof dossier?.niveauSecurite === "number" && dossier.niveauSecurite <= 4) {
      observations.push("Le niveau de sécurité dans cette relation est bas.");
    }
    if (typeof dossier?.niveauReciprocite === "number" && dossier.niveauReciprocite <= 4) {
      observations.push("Le niveau de réciprocité perçu est faible.");
    }
    if (typeof dossier?.niveauSecurite === "number" && dossier.niveauSecurite >= 7) {
      observations.push("Sécurité élevée dans cette relation.");
    }
    if (typeof dossier?.niveauReciprocite === "number" && dossier.niveauReciprocite >= 7) {
      observations.push("Bonne réciprocité perçue.");
    }
    if (typeof dossier?.niveauClarte === "number" && dossier.niveauClarte >= 7) {
      observations.push("Clarté relationnelle élevée.");
    }
    if (analyses.some((analysis) => analysis.tonalite === "Positive")) {
      observations.push("Des échanges positifs ont été observés.");
    }
    if (journalEntries.some((entry) => isSoothingEmotion(entry.emotion))) {
      observations.push("Des moments apaisants ont été enregistrés.");
    }
    if (decisions.length > 0) {
      observations.push("Des décisions ont été prises et documentées.");
    }
    if (typeof dossier?.energieEmotionnelle === "number" && dossier.energieEmotionnelle >= 7) {
      observations.push("Impact émotionnel global positif.");
    }
    if (!observations.length) {
      observations.push("Continuez à enrichir votre dossier pour affiner le repérage des patterns.");
    }

    return {
      analysisPatterns,
      chronologicalTensions,
      emotions,
      maxEmotionCount,
      notableEvents,
      observations: observations.slice(0, 4),
      tensionTrend,
      topIntention,
      topSituation,
      totalEntries,
      triggers,
    };
  }, [analyses, decisions, dossier, journalEntries]);
  const energyInsights = useMemo(() => {
    const total = journalEntries.length;
    const globalScore = getEnergyScore(journalEntries);
    const counts = journalEntries.reduce(
      (accumulator, entry) => {
        const type = energyType(entry.emotion);
        if (type === "Drainant") accumulator.draining += 1;
        else if (type === "Apaisant") accumulator.soothing += 1;
        else accumulator.neutral += 1;
        return accumulator;
      },
      { draining: 0, neutral: 0, soothing: 0 },
    );
    const recentEntries = [...journalEntries]
      .sort((first, second) => {
        const firstDate = new Date(first.date).getTime();
        const secondDate = new Date(second.date).getTime();
        return (Number.isFinite(secondDate) ? secondDate : 0) - (Number.isFinite(firstDate) ? firstDate : 0);
      })
      .slice(0, 5);
    const recentScore = getEnergyScore(recentEntries);
    const trend =
      recentScore > globalScore + 1
        ? "Tendance positive récente"
        : recentScore < globalScore - 1
          ? "Tendance négative récente"
          : "Tendance stable";
    const notableEvents = [...journalEntries]
      .sort((first, second) => {
        const intensityDifference = second.intensite - first.intensite;
        if (intensityDifference !== 0) return intensityDifference;

        const firstDate = new Date(first.date).getTime();
        const secondDate = new Date(second.date).getTime();
        return (Number.isFinite(secondDate) ? secondDate : 0) - (Number.isFinite(firstDate) ? firstDate : 0);
      })
      .slice(0, 3);
    const triggerGroups = journalEntries
      .filter((entry) => entry.declencheur?.trim())
      .reduce(
        (groups, entry) => {
          const type = energyType(entry.emotion);
          if (type === "Neutre") return groups;
          const trigger = entry.declencheur?.trim() || "";
          const group = type === "Drainant" ? groups.draining : groups.soothing;
          const current = group.get(trigger) || { count: 0, intensityTotal: 0 };
          group.set(trigger, { count: current.count + 1, intensityTotal: current.intensityTotal + entry.intensite });
          return groups;
        },
        { draining: new Map<string, { count: number; intensityTotal: number }>(), soothing: new Map<string, { count: number; intensityTotal: number }>() },
      );
    const formatTriggers = (items: Map<string, { count: number; intensityTotal: number }>) =>
      Array.from(items.entries())
        .map(([trigger, data]) => ({
          averageIntensity: Math.round((data.intensityTotal / data.count) * 10) / 10,
          count: data.count,
          trigger,
        }))
        .sort((first, second) => second.averageIntensity - first.averageIntensity)
        .slice(0, 5);
    const observation =
      globalScore <= 3
        ? "Cette relation génère principalement des émotions drainantes. Prenez soin de votre énergie en priorité."
        : trend === "Tendance négative récente"
          ? "L'impact émotionnel récent est en baisse. Observez ce qui se passe dans les derniers événements."
          : globalScore >= 7
            ? "Cette relation a un impact majoritairement apaisant."
            : globalScore >= 4 && globalScore <= 6
              ? "Cette relation a un impact mixte. Continuez à observer pour mieux comprendre la dynamique."
              : "Continuez à enrichir le journal pour affiner cette lecture.";

    return {
      counts,
      globalScore,
      notableEvents,
      observation,
      recentEntries,
      recentScore,
      soothingTriggers: formatTriggers(triggerGroups.soothing),
      drainingTriggers: formatTriggers(triggerGroups.draining),
      total,
      trend,
    };
  }, [journalEntries]);
  const relationSummary = useMemo(() => {
    const scoreValues = [
      dossier?.niveauClarte,
      dossier?.niveauReciprocite,
      dossier?.niveauSecurite,
      dossier?.energieEmotionnelle,
      inverseTensionValue(dossier?.derniereAnalyse?.niveauTension),
    ].filter((value): value is number => typeof value === "number");
    const score = scoreValues.length ? Math.round((scoreValues.reduce((total, value) => total + value, 0) / scoreValues.length) * 10) / 10 : null;
    const state = getRelationSummaryState(score);
    const forces: string[] = [];
    const risks: string[] = [];
    const missing: string[] = [];
    const patternCounts = analyses
      .flatMap((analysis) => analysis.patterns)
      .reduce((counts, pattern) => {
        counts.set(pattern, (counts.get(pattern) || 0) + 1);
        return counts;
      }, new Map<string, number>());

    if (typeof dossier?.niveauSecurite === "number" && dossier.niveauSecurite >= 7) {
      forces.push("Sécurité élevée dans cette relation.");
    }
    if (typeof dossier?.niveauReciprocite === "number" && dossier.niveauReciprocite >= 7) {
      forces.push("Bonne réciprocité perçue.");
    }
    if (typeof dossier?.niveauClarte === "number" && dossier.niveauClarte >= 7) {
      forces.push("Clarté relationnelle élevée.");
    }
    if (analyses.some((analysis) => analysis.tonalite === "Positive")) {
      forces.push("Des échanges positifs ont été observés.");
    }
    if (journalEntries.some((entry) => isSoothingEmotion(entry.emotion))) {
      forces.push("Des moments apaisants ont été enregistrés.");
    }
    if (decisions.length > 0) {
      forces.push("Des décisions ont été prises et documentées.");
    }
    if (typeof dossier?.energieEmotionnelle === "number" && dossier.energieEmotionnelle >= 7) {
      forces.push("Impact émotionnel global positif.");
    }

    if (typeof dossier?.niveauSecurite === "number" && dossier.niveauSecurite <= 3) {
      risks.push("Niveau de sécurité bas. À prioriser.");
    }
    if (dossier?.derniereAnalyse?.niveauTension === "Élevé") {
      risks.push("Tension élevée détectée dans les échanges récents.");
    }
    if (typeof dossier?.niveauReciprocite === "number" && dossier.niveauReciprocite <= 3) {
      risks.push("Réciprocité faible perçue.");
    }
    if (analyses.filter((analysis) => analysis.niveauTension === "Élevé").length >= 2) {
      risks.push("Tension élevée récurrente dans les analyses.");
    }
    if (journalEntries.filter((entry) => ["Anxiété", "Peur", "Colère", "Tristesse", "Honte", "Culpabilité", "Solitude"].includes(entry.emotion)).length >= 3) {
      risks.push("Émotions drainantes fréquentes dans le journal.");
    }
    if (Array.from(patternCounts.values()).some((count) => count >= 4)) {
      risks.push("Un pattern persistant a été détecté dans les conversations.");
    }

    if (typeof dossier?.niveauClarte !== "number") {
      missing.push("Évaluez la clarté dans les indicateurs.");
    }
    if (typeof dossier?.niveauSecurite !== "number") {
      missing.push("Évaluez la sécurité dans les indicateurs.");
    }
    if (!analyses.length) {
      missing.push("Analysez une conversation pour enrichir le profil.");
    }
    if (!journalEntries.length) {
      missing.push("Ajoutez des événements dans le journal relationnel.");
    }
    if (!conversations.length) {
      missing.push("Enregistrez une conversation dans le dossier.");
    }
    if (!decisions.length) {
      missing.push("Utilisez le centre de décision pour clarifier vos actions.");
    }

    const nextAction =
      typeof dossier?.niveauSecurite === "number" && dossier.niveauSecurite <= 3
        ? {
            href: "#centre-decision",
            label: "Ouvrir le centre de décision",
            text: "Votre sécurité est la priorité. Consultez le centre de décision.",
          }
        : dossier?.derniereAnalyse?.niveauTension === "Élevé"
          ? {
              text: "La tension est élevée. Évitez les décisions importantes sous tension.",
            }
          : typeof dossier?.niveauClarte !== "number"
            ? {
                href: "#indicateurs-relationnels",
                label: "Évaluer les indicateurs",
                text: "Évaluez la clarté de cette relation dans les indicateurs.",
              }
            : !analyses.length
              ? {
                  href: `/autre-rive/analyse-conversation?dossier=${encodeURIComponent(dossier.id)}`,
                  label: "Analyser une conversation",
                  text: "Analysez une conversation pour enrichir le profil.",
                }
              : !journalEntries.length
                ? {
                    href: "#journal-relationnel",
                    label: "Ouvrir le journal",
                    text: "Commencez à tenir le journal relationnel.",
                  }
                : !decisions.length
                  ? {
                      href: "#centre-decision",
                      label: "Ouvrir le centre de décision",
                      text: "Utilisez le centre de décision pour clarifier votre prochaine action.",
                    }
                  : {
                      text: "Continuez à enrichir le dossier pour affiner la synthèse.",
                    };

    return {
      forces: forces.length ? forces.slice(0, 3) : ["Aucune force détectée pour le moment. Enrichissez les indicateurs pour affiner cette lecture."],
      missing: missing.length ? missing.slice(0, 4) : ["Toutes les données principales sont renseignées."],
      nextAction,
      risks: risks.length ? risks.slice(0, 3) : ["Aucun point de vigilance détecté pour le moment."],
      score,
      state,
    };
  }, [analyses, conversations, decisions, dossier, journalEntries]);
  const securitySignals = useMemo(() => {
    const signals: { level: "Attention" | "Vigilance" | "Prioritaire"; text: string }[] = [];

    if (typeof dossier?.niveauSecurite === "number" && dossier.niveauSecurite <= 3) {
      signals.push({ level: "Prioritaire", text: "Votre niveau de sécurité évalué est bas." });
    }
    if (dossier?.derniereAnalyse?.niveauTension === "Élevé") {
      signals.push({ level: "Vigilance", text: "Une tension élevée a été détectée dans les échanges récents." });
    }
    if (analyses.filter((analysis) => analysis.niveauTension === "Élevé").length >= 3) {
      signals.push({ level: "Prioritaire", text: "La tension élevée est récurrente dans plusieurs analyses." });
    }
    if (
      journalEntries.filter(
        (entry) =>
          ["Anxiété", "Peur", "Colère", "Honte", "Culpabilité", "Solitude"].includes(entry.emotion) &&
          entry.intensite >= 7,
      ).length >= 3
    ) {
      signals.push({
        level: "Vigilance",
        text: "Des émotions difficiles d'intensité élevée sont fréquentes dans votre journal.",
      });
    }
    if (analyses.filter((analysis) => analysis.patterns.some((pattern) => pattern.toLocaleLowerCase("fr-CA").includes("blâme"))).length >= 2) {
      signals.push({ level: "Vigilance", text: "Un pattern de blâme a été observé à plusieurs reprises dans les analyses." });
    }
    if (
      containsSensitiveWords(dossier?.notes || "") ||
      journalEntries.some((entry) => containsSensitiveWords(`${entry.evenement} ${entry.declencheur || ""}`))
    ) {
      signals.push({
        level: "Attention",
        text: "Certains éléments récurrents dans vos notes ou votre journal méritent une réflexion attentive.",
      });
    }
    if (
      typeof dossier?.niveauSecurite === "number" &&
      dossier.niveauSecurite <= 5 &&
      analyses.length >= 2 &&
      dossier.derniereAnalyse?.niveauTension === "Élevé"
    ) {
      signals.push({
        level: "Vigilance",
        text: "La combinaison d'une sécurité faible et d'une tension élevée mérite votre attention.",
      });
    }

    const order = { Prioritaire: 0, Vigilance: 1, Attention: 2 };
    return signals.sort((first, second) => order[first.level] - order[second.level]);
  }, [analyses, dossier, journalEntries]);
  const radarDimensions = useMemo<RadarDimension[]>(() => {
    if (!dossier) return [];

    return [
      { label: "Clarté", value: dossier.niveauClarte },
      { label: "Réciprocité", value: dossier.niveauReciprocite },
      { label: "Sécurité", value: dossier.niveauSecurite },
      { label: "Énergie émotionnelle", value: dossier.energieEmotionnelle },
      { label: "Tension observée", value: tensionValue(dossier.derniereAnalyse?.niveauTension) },
    ];
  }, [dossier]);
  const evaluatedCoreDimensions = useMemo(() => {
    if (!dossier) return [];
    return [dossier.niveauClarte, dossier.niveauReciprocite, dossier.niveauSecurite, dossier.energieEmotionnelle].filter(
      (value): value is number => typeof value === "number",
    );
  }, [dossier]);
  const generalState = useMemo(() => getGeneralState(evaluatedCoreDimensions), [evaluatedCoreDimensions]);
  const intelligentCompletion = useMemo(() => {
    const criteria = [
      { done: evaluatedCoreDimensions.length >= 2, label: "Indicateurs évalués" },
      { done: (dossier?.notes?.trim().length || 0) >= 10, label: "Notes renseignées" },
      { done: (dossier?.tags?.length || 0) >= 1, label: "Tags ajoutés" },
      { done: conversations.length >= 1, label: "Conversation enregistrée" },
      { done: analyses.length >= 1, label: "Conversation analysée" },
      { done: journalEntries.length >= 1, label: "Entrée journal ajoutée" },
      { done: decisions.length >= 1, label: "Décision documentée" },
    ];
    const score = criteria.filter((criterion) => criterion.done).length;

    return {
      criteria,
      percent: Math.round((score / criteria.length) * 100),
      score,
      total: criteria.length,
    };
  }, [analyses.length, conversations.length, decisions.length, dossier?.notes, dossier?.tags?.length, evaluatedCoreDimensions.length, journalEntries.length]);
  const miniDashboardItems = useMemo(
    () => [
      { label: "État général", value: relationSummary.state },
      { label: "Clarté", value: typeof dossier?.niveauClarte === "number" ? `${dossier.niveauClarte}/10` : "—" },
      { label: "Réciprocité", value: typeof dossier?.niveauReciprocite === "number" ? `${dossier.niveauReciprocite}/10` : "—" },
      { label: "Sécurité", value: typeof dossier?.niveauSecurite === "number" ? `${dossier.niveauSecurite}/10` : "—" },
      { label: "Énergie", value: typeof dossier?.energieEmotionnelle === "number" ? `${dossier.energieEmotionnelle}/10` : "—" },
      { label: "Tension", value: dossier?.derniereAnalyse?.niveauTension || "—" },
      { label: "Analyses", value: String(analyses.length) },
      { label: "Journal", value: String(journalEntries.length) },
      { label: "Décisions", value: String(decisions.length) },
    ],
    [analyses.length, decisions.length, dossier, journalEntries.length, relationSummary.state],
  );
  const tabCounters = useMemo<Record<RelationTab, number>>(
    () => ({
      "Vue d’ensemble": 0,
      "Évaluation": evaluatedCoreDimensions.length,
      Observations: journalEntries.length + (dossier?.notes?.trim() ? 1 : 0) + (dossier?.tags?.length || 0),
      Conversations: conversations.length + analyses.length,
      "Décisions & Patterns": decisions.length,
    }),
    [analyses.length, conversations.length, decisions.length, dossier?.notes, dossier?.tags?.length, evaluatedCoreDimensions.length, journalEntries.length],
  );
  const recentActivitySummary = useMemo(() => {
    const septJours = Date.now() - 7 * 24 * 60 * 60 * 1000;
    const countSince = (dates: string[]) =>
      dates.reduce((count, date) => {
        const timestamp = parseValidDateTime(date);
        return timestamp !== null && timestamp >= septJours ? count + 1 : count;
      }, 0);
    const latestConversationDate = getLatestValidDate(conversations.map((conversation) => conversation.dateCreation));
    const latestAnalysisDate = getLatestValidDate(analyses.map((analysis) => analysis.date));
    const latestJournalDate = getLatestValidDate(journalEntries.map((entry) => entry.date));
    const latestDecisionDate = getLatestValidDate(decisions.map((decision) => decision.date));
    const latestGlobalDate = getLatestValidDate([
      ...conversations.map((conversation) => conversation.dateCreation),
      ...analyses.map((analysis) => analysis.date),
      ...journalEntries.map((entry) => entry.date),
      ...decisions.map((decision) => decision.date),
    ]);
    const weekly = {
      analyses: countSince(analyses.map((analysis) => analysis.date)),
      conversations: countSince(conversations.map((conversation) => conversation.dateCreation)),
      decisions: countSince(decisions.map((decision) => decision.date)),
      journal: countSince(journalEntries.map((entry) => entry.date)),
    };
    const total = weekly.conversations + weekly.analyses + weekly.journal + weekly.decisions;
    const status =
      total >= 3
        ? { label: "Dossier actif", tone: "success" as const }
        : total >= 1
          ? { label: "Dossier calme", tone: "warning" as const }
          : latestGlobalDate === null
            ? { label: "Dossier vide", tone: "neutral" as const }
            : { label: "Dossier inactif", tone: "neutral" as const };
    const formatLatest = (timestamp: number | null) => (timestamp === null ? "Aucune" : formatDecisionRelativeDate(new Date(timestamp).toISOString()));

    return {
      latest: {
        analyses: formatLatest(latestAnalysisDate),
        conversations: formatLatest(latestConversationDate),
        decisions: formatLatest(latestDecisionDate),
        global: latestGlobalDate === null ? "Aucune activité enregistrée" : formatDecisionRelativeDate(new Date(latestGlobalDate).toISOString()),
        journal: formatLatest(latestJournalDate),
      },
      status,
      total,
      weekly,
    };
  }, [analyses, conversations, decisions, journalEntries]);
  const normalizedConversationSearch = searchQuery.toLocaleLowerCase("fr-CA").trim();
  const filteredConversations = useMemo(() => {
    if (!normalizedConversationSearch) return conversations;
    return conversations.filter((conversation) => {
      const title = conversation.titre?.toLocaleLowerCase("fr-CA") || "";
      const content = conversation.contenu.toLocaleLowerCase("fr-CA");
      return title.includes(normalizedConversationSearch) || content.includes(normalizedConversationSearch);
    });
  }, [conversations, normalizedConversationSearch]);
  const normalizedJournalSearch = journalSearchQuery.toLocaleLowerCase("fr-CA").trim();
  const journalFiltersActive = Boolean(normalizedJournalSearch || journalEmotionFilter);
  const filteredJournalEntries = useMemo(() => {
    return journalEntries.filter((entry) => {
      const matchesText =
        !normalizedJournalSearch ||
        entry.evenement.toLocaleLowerCase("fr-CA").includes(normalizedJournalSearch) ||
        (entry.declencheur?.toLocaleLowerCase("fr-CA").includes(normalizedJournalSearch) ?? false);
      const matchesEmotion = !journalEmotionFilter || entry.emotion === journalEmotionFilter;
      return matchesText && matchesEmotion;
    });
  }, [journalEmotionFilter, journalEntries, normalizedJournalSearch]);
  const normalizedAnalysisSearch = analysisSearchQuery.toLocaleLowerCase("fr-CA").trim();
  const analysisFiltersActive = Boolean(normalizedAnalysisSearch || analysisToneFilter || analysisTensionFilter);
  const filteredAnalyses = useMemo(() => {
    return analyses.filter((analysis) => {
      const searchable = [
        analysis.tonalite,
        analysis.niveauTension,
        ...analysis.patterns,
        ...analysis.observations,
      ]
        .join(" ")
        .toLocaleLowerCase("fr-CA");
      const matchesText = !normalizedAnalysisSearch || searchable.includes(normalizedAnalysisSearch);
      const matchesTone = !analysisToneFilter || analysis.tonalite === analysisToneFilter;
      const matchesTension = !analysisTensionFilter || analysis.niveauTension === analysisTensionFilter;
      return matchesText && matchesTone && matchesTension;
    });
  }, [analyses, analysisTensionFilter, analysisToneFilter, normalizedAnalysisSearch]);
  const normalizedDecisionSearch = decisionSearchQuery.toLocaleLowerCase("fr-CA").trim();
  const decisionFiltersActive = Boolean(normalizedDecisionSearch || decisionIntentionFilter || decisionSituationFilter);
  const filteredDecisions = useMemo(() => {
    return decisions.filter((decision) => {
      const searchable = [decision.situation, decision.intention, decision.optionChoisie, decision.recommandation]
        .join(" ")
        .toLocaleLowerCase("fr-CA");
      const matchesText = !normalizedDecisionSearch || searchable.includes(normalizedDecisionSearch);
      const matchesIntention = !decisionIntentionFilter || decision.intention === decisionIntentionFilter;
      const matchesSituation = !decisionSituationFilter || decision.situation === decisionSituationFilter;
      return matchesText && matchesIntention && matchesSituation;
    });
  }, [decisionIntentionFilter, decisions, decisionSituationFilter, normalizedDecisionSearch]);

  function buildDossierExportPayload() {
    if (!dossier) {
      throw new Error("Dossier indisponible pour l'export.");
    }

    const currentDossier = dossier;

    return {
      exporteLe: new Date().toISOString(),
      dossier: {
        id: currentDossier.id,
        nom: currentDossier.nom,
        statut: currentDossier.statut,
        dateCreation: currentDossier.dateCreation,
        derniereInteraction: currentDossier.derniereInteraction || null,
      },
      synthese: {
        etatGeneral: relationSummary.state,
        scoreGlobal: relationSummary.score,
        recommandation: recommendation,
        pointsForts: relationSummary.forces,
        pointsDeVigilance: relationSummary.risks,
        donneesACompleter: relationSummary.missing,
        prochaineAction: relationSummary.nextAction.text,
        etatGeneralDetaille: generalState,
        completion: intelligentCompletion,
      },
      indicateurs: {
        clarte: currentDossier.niveauClarte ?? null,
        reciprocite: currentDossier.niveauReciprocite ?? null,
        securite: currentDossier.niveauSecurite ?? null,
        energieEmotionnelle: currentDossier.energieEmotionnelle ?? null,
        tensionObservee: currentDossier.derniereAnalyse?.niveauTension || null,
        dimensions: radarDimensions,
      },
      notes: currentDossier.notes || "",
      tags: currentDossier.tags || [],
      conversations,
      analyses,
      decisions,
      journal: journalEntries,
      patterns: {
        observations: patternInsights.observations,
        emotionsDominantes: patternInsights.emotions,
        declencheursFrequents: patternInsights.triggers.map(([declencheur, count]) => ({ count, declencheur })),
        patternsAnalyses: patternInsights.analysisPatterns.map(([pattern, count]) => ({ count, pattern })),
        tendanceTension: patternInsights.tensionTrend || "Non évaluée",
        situationFrequente: patternInsights.topSituation || null,
        intentionFrequente: patternInsights.topIntention || null,
        evenementsNotables: patternInsights.notableEvents,
        totalEntreesObservees: patternInsights.totalEntries,
      },
      securite: {
        niveau: currentDossier.niveauSecurite ?? null,
        signaux: securitySignals,
      },
      energieEmotionnelle: {
        niveau: currentDossier.energieEmotionnelle ?? null,
        resumeJournal: journalSummary,
        lecture: energyInsights,
      },
      derniereAnalyse: currentDossier.derniereAnalyse || null,
    };
  }

  function buildDossierTextExport() {
    const payload = buildDossierExportPayload();
    const lines: string[] = [];
    const addSection = (title: string) => {
      lines.push("", title.toLocaleUpperCase("fr-CA"), "-".repeat(title.length));
    };
    const addList = (items: string[]) => {
      if (!items.length) {
        lines.push("- Aucun élément");
        return;
      }
      items.forEach((item) => lines.push(`- ${item}`));
    };

    lines.push(`Dossier relationnel : ${payload.dossier.nom}`);
    lines.push(`Exporté le : ${formatAnalysisDate(payload.exporteLe)}`);
    lines.push(`Statut : ${payload.dossier.statut}`);
    lines.push(`Date de création : ${payload.dossier.dateCreation}`);
    lines.push(`Dernière interaction : ${payload.dossier.derniereInteraction || "Non renseignée"}`);

    addSection("Synthèse");
    lines.push(`État général : ${payload.synthese.etatGeneral}`);
    lines.push(`Score global : ${payload.synthese.scoreGlobal === null ? "Non évalué" : `${payload.synthese.scoreGlobal}/10`}`);
    lines.push(`Recommandation : ${payload.synthese.recommandation || "Non disponible"}`);
    lines.push(`Prochaine action : ${payload.synthese.prochaineAction}`);
    lines.push("Points forts :");
    addList(payload.synthese.pointsForts);
    lines.push("Points de vigilance :");
    addList(payload.synthese.pointsDeVigilance);
    lines.push("Données à compléter :");
    addList(payload.synthese.donneesACompleter);

    addSection("Indicateurs");
    lines.push(`Clarté : ${payload.indicateurs.clarte === null ? "Non évaluée" : `${payload.indicateurs.clarte}/10`}`);
    lines.push(`Réciprocité : ${payload.indicateurs.reciprocite === null ? "Non évaluée" : `${payload.indicateurs.reciprocite}/10`}`);
    lines.push(`Sécurité : ${payload.indicateurs.securite === null ? "Non évaluée" : `${payload.indicateurs.securite}/10`}`);
    lines.push(`Énergie émotionnelle : ${payload.indicateurs.energieEmotionnelle === null ? "Non évaluée" : `${payload.indicateurs.energieEmotionnelle}/10`}`);
    lines.push(`Tension observée : ${payload.indicateurs.tensionObservee || "Non évaluée"}`);

    addSection("Notes");
    lines.push(payload.notes || "Aucune note.");

    addSection("Tags");
    addList(payload.tags);

    addSection("Conversations");
    if (payload.conversations.length) {
      payload.conversations.forEach((conversation, index) => {
        lines.push(`${index + 1}. ${conversation.titre?.trim() || "Conversation sans titre"} — ${formatAnalysisDate(conversation.dateCreation)}`);
        lines.push(conversation.contenu);
      });
    } else {
      lines.push("Aucune conversation.");
    }

    addSection("Analyses");
    if (payload.analyses.length) {
      payload.analyses.forEach((analysis, index) => {
        lines.push(`${index + 1}. ${formatAnalysisDate(analysis.date)} — ${analysis.tonalite} — tension ${analysis.niveauTension}`);
        lines.push(`Patterns : ${analysis.patterns.length ? analysis.patterns.join(", ") : "Aucun"}`);
        lines.push(`Observations : ${analysis.observations.length ? analysis.observations.join(" | ") : "Aucune"}`);
      });
    } else {
      lines.push("Aucune analyse.");
    }

    addSection("Décisions");
    if (payload.decisions.length) {
      payload.decisions.forEach((decision, index) => {
        lines.push(`${index + 1}. ${formatAnalysisDate(decision.date)} — ${decision.intention}`);
        lines.push(`Situation : ${decision.situation}`);
        lines.push(`Option choisie : ${decision.optionChoisie}`);
        lines.push(`Recommandation : ${decision.recommandation}`);
      });
    } else {
      lines.push("Aucune décision.");
    }

    addSection("Journal");
    if (payload.journal.length) {
      payload.journal.forEach((entry, index) => {
        lines.push(`${index + 1}. ${formatAnalysisDate(entry.date)} — ${entry.emotion} (${entry.intensite}/10)`);
        lines.push(`Événement : ${entry.evenement}`);
        lines.push(`Déclencheur : ${entry.declencheur || "Non renseigné"}`);
      });
    } else {
      lines.push("Aucune entrée journal.");
    }

    addSection("Patterns");
    lines.push(`Tendance de tension : ${payload.patterns.tendanceTension}`);
    lines.push(`Situation fréquente : ${payload.patterns.situationFrequente || "Non détectée"}`);
    lines.push(`Intention fréquente : ${payload.patterns.intentionFrequente || "Non détectée"}`);
    lines.push("Observations :");
    addList(payload.patterns.observations);
    lines.push("Patterns d'analyses :");
    addList(payload.patterns.patternsAnalyses.map((item) => `${item.pattern} (${item.count})`));
    lines.push("Déclencheurs fréquents :");
    addList(payload.patterns.declencheursFrequents.map((item) => `${item.declencheur} (${item.count})`));

    addSection("Sécurité");
    lines.push(`Niveau : ${payload.securite.niveau === null ? "Non évalué" : `${payload.securite.niveau}/10`}`);
    addList(payload.securite.signaux.map((signal) => `${signal.level} — ${signal.text}`));

    addSection("Énergie émotionnelle");
    lines.push(`Niveau : ${payload.energieEmotionnelle.niveau === null ? "Non évalué" : `${payload.energieEmotionnelle.niveau}/10`}`);
    lines.push(`Score global journal : ${payload.energieEmotionnelle.lecture.globalScore}/10`);
    lines.push(`Tendance : ${payload.energieEmotionnelle.lecture.trend}`);
    lines.push(`Observation : ${payload.energieEmotionnelle.lecture.observation}`);

    return lines.join("\n");
  }

  function exportDossier(format: "json" | "txt") {
    if (!dossier) return;

    const baseName = `${sanitizeExportFileName(dossier.nom)}-dossier-relationnel`;
    if (format === "json") {
      downloadExportFile(`${baseName}.json`, JSON.stringify(buildDossierExportPayload(), null, 2), "application/json;charset=utf-8");
      return;
    }

    downloadExportFile(`${baseName}.txt`, buildDossierTextExport(), "text/plain;charset=utf-8");
  }

  if (loaded && !dossier) {
    return (
      <main className="internal-page">
        <SystemPageShell maxWidth={900}>
          <header className="internal-header">
            <BackLink href="/autre-rive/dossiers" label="Dossiers" />
            <p className="internal-kicker">L&apos;Autre Rive</p>
            <h1 className="internal-title">Dossier introuvable</h1>
            <p className="internal-subtitle">Ce dossier n&apos;existe pas ou n&apos;est plus disponible localement.</p>
          </header>

          <SystemPanel ariaLabel="Dossier introuvable" compact>
            <Link className="internal-button-primary" href="/autre-rive/dossiers" style={dashboardButtonStyle}>
              Retour aux dossiers
            </Link>
          </SystemPanel>
        </SystemPageShell>
      </main>
    );
  }

  if (!dossier) {
    return (
      <main className="internal-page">
        <SystemPageShell maxWidth={900}>
          <SystemPanel ariaLabel="Chargement du dossier" compact>
            <p className="editorial-body" style={{ margin: 0 }}>Chargement du dossier...</p>
          </SystemPanel>
        </SystemPageShell>
      </main>
    );
  }

  return (
    <main className="internal-page">
      <SystemPageShell maxWidth={1180}>
        <header className="internal-header">
          <BackLink href="/autre-rive/dossiers" label="Dossiers" />
          <p className="internal-kicker">L&apos;Autre Rive</p>
          <h1 className="internal-title">{dossier.nom}</h1>
          <p className="internal-subtitle">
            Fiche relationnelle complète : indicateurs, notes, tags et prochaines étapes.
          </p>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            <StatusChip tone="warning">{dossier.statut}</StatusChip>
            <StatusChip>Créé le {dossier.dateCreation}</StatusChip>
            {dossier.derniereInteraction ? <StatusChip>Dernière interaction · {dossier.derniereInteraction}</StatusChip> : null}
          </div>
        </header>

        <SystemPanel ariaLabel="Retour aux dossiers" compact>
          <Link className="internal-button-primary" href="/autre-rive/dossiers" style={dashboardButtonStyle}>
            Retour aux dossiers
          </Link>
        </SystemPanel>

        <SystemPanel ariaLabel="Export du dossier" compact>
          <div style={{ alignItems: "center", display: "flex", flexWrap: "wrap", gap: 12, justifyContent: "space-between" }}>
            <div style={{ display: "grid", gap: 4 }}>
              <SystemSectionHeader eyebrow="Sauvegarde" title="Export du dossier" />
              <p className="editorial-body" style={{ margin: 0 }}>
                Export complet du dossier relationnel pour sauvegarde, relecture ou partage.
              </p>
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              <button
                className="internal-button-primary"
                onClick={() => exportDossier("txt")}
                style={dashboardButtonStyle}
                type="button"
              >
                Exporter en .txt
              </button>
              <button
                className="internal-button"
                onClick={() => exportDossier("json")}
                style={dashboardButtonStyle}
                type="button"
              >
                Exporter en .json
              </button>
            </div>
          </div>
        </SystemPanel>

        <SystemPanel ariaLabel="Tableau de bord relationnel condensé" compact>
          <div
            style={{
              display: "grid",
              gap: 8,
              gridTemplateColumns: "repeat(auto-fit, minmax(96px, 1fr))",
            }}
          >
            {miniDashboardItems.map((item) => (
              <article className="chapter-card" key={item.label} style={{ display: "grid", gap: 4, marginBottom: 0, padding: "10px 12px" }}>
                <span className="label-meta" style={{ margin: 0 }}>{item.label}</span>
                <strong style={{ color: "var(--text-main)", fontFamily: "var(--font-serif)", fontSize: 18, lineHeight: 1.1 }}>
                  {item.value}
                </strong>
              </article>
            ))}
          </div>
        </SystemPanel>

        <nav
          aria-label="Sections du dossier"
          style={{
            display: "flex",
            gap: 8,
            overflowX: "auto",
            paddingBottom: 4,
            WebkitOverflowScrolling: "touch",
          }}
        >
          {relationTabs.map((tab) => {
            const isActive = activeTab === tab;
            const count = tabCounters[tab];

            return (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                style={{
                  ...dashboardButtonStyle,
                  background: isActive ? "var(--accent-gold)" : "rgba(10,10,10,.42)",
                  border: isActive ? "1px solid var(--accent-gold)" : "1px solid rgba(201,168,92,.24)",
                  color: isActive ? "#17120a" : "var(--accent-gold)",
                  cursor: "pointer",
                  flex: "0 0 auto",
                  transition: "background .2s ease, color .2s ease, border-color .2s ease",
                }}
                type="button"
              >
                <span>{tab}</span>
                {count > 0 ? (
                  <span
                    style={{
                      alignItems: "center",
                      background: isActive ? "rgba(10,10,10,.72)" : "rgba(201,168,92,.13)",
                      border: isActive ? "1px solid rgba(10,10,10,.2)" : "1px solid rgba(201,168,92,.26)",
                      borderRadius: 999,
                      color: isActive ? "var(--accent-gold)" : "var(--accent-gold)",
                      display: "inline-flex",
                      fontSize: 11,
                      justifyContent: "center",
                      lineHeight: 1,
                      marginLeft: 7,
                      minWidth: 20,
                      padding: "4px 6px",
                    }}
                  >
                    {count}
                  </span>
                ) : null}
              </button>
            );
          })}
        </nav>

        {activeTab === "Vue d’ensemble" ? (
          <>
        <SystemPanel ariaLabel="Synthèse relationnelle globale" compact>
          <div style={{ border: "1px solid rgba(201,168,92,.38)", borderRadius: 18, display: "grid", gap: 14, padding: 16 }}>
            <div style={{ alignItems: "center", display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 8 }}>
              <SystemSectionHeader eyebrow="Vue d'ensemble" title="Synthèse relationnelle" />
              <Link
                href={`/autre-rive/dossiers/${dossier.id}/timeline`}
                style={{
                  background: "rgba(201,168,92,.15)",
                  border: "1px solid rgba(201,168,92,.4)",
                  borderRadius: 999,
                  color: "var(--accent-gold, #c9a85c)",
                  fontSize: 12,
                  padding: "6px 14px",
                  textDecoration: "none",
                  whiteSpace: "nowrap",
                }}
              >
                Voir la chronologie
              </Link>
            </div>
            <p className="editorial-body" style={{ margin: 0 }}>
              Vue d&apos;ensemble de cette relation.
            </p>

            <article className="chapter-card" style={{ borderColor: "rgba(201,168,92,.32)", display: "grid", gap: 10, marginBottom: 0, padding: 14 }}>
              <div style={{ alignItems: "center", display: "flex", flexWrap: "wrap", gap: 10, justifyContent: "space-between" }}>
                <div style={{ display: "grid", gap: 4 }}>
                  <h2 style={{ color: "var(--text-main)", fontFamily: "var(--font-serif)", fontSize: 20, margin: 0 }}>
                    État général
                  </h2>
                  <p className="label-meta" style={{ margin: 0 }}>
                    Score global : {relationSummary.score === null ? "Non évalué" : `${relationSummary.score}/10`}
                  </p>
                </div>
                <span
                  style={{
                    border: "1px solid",
                    borderRadius: 999,
                    fontSize: 12,
                    lineHeight: 1,
                    padding: "7px 10px",
                    ...relationSummaryStateStyle(relationSummary.state),
                  }}
                >
                  {relationSummary.state}
                </span>
              </div>
              {relationSummary.score !== null ? (
                <div style={{ background: "rgba(255,255,255,.06)", borderRadius: 999, height: 7, overflow: "hidden", width: "100%" }}>
                  <div style={{ background: energyColor(relationSummary.score), height: "100%", width: `${relationSummary.score * 10}%` }} />
                </div>
              ) : null}
            </article>

            <SystemGrid gap={12} min={280}>
              <article className="chapter-card" style={{ display: "grid", gap: 10, marginBottom: 0, padding: 14 }}>
                <h2 style={{ color: "var(--text-main)", fontFamily: "var(--font-serif)", fontSize: 20, margin: 0 }}>
                  Points forts
                </h2>
                <div style={{ display: "grid", gap: 7 }}>
                  {relationSummary.forces.map((force) => (
                    <p className="editorial-body" key={force} style={{ margin: 0 }}>✓ {force}</p>
                  ))}
                </div>
              </article>

              <article className="chapter-card" style={{ display: "grid", gap: 10, marginBottom: 0, padding: 14 }}>
                <h2 style={{ color: "var(--text-main)", fontFamily: "var(--font-serif)", fontSize: 20, margin: 0 }}>
                  Points de vigilance
                </h2>
                <div style={{ display: "grid", gap: 7 }}>
                  {relationSummary.risks.map((risk) => (
                    <p className="editorial-body" key={risk} style={{ margin: 0 }}>⚠ {risk}</p>
                  ))}
                </div>
              </article>
            </SystemGrid>

            <SystemGrid gap={12} min={280}>
              <article className="chapter-card" style={{ display: "grid", gap: 10, marginBottom: 0, padding: 14 }}>
                <h2 style={{ color: "var(--text-main)", fontFamily: "var(--font-serif)", fontSize: 20, margin: 0 }}>
                  Pour aller plus loin
                </h2>
                <div style={{ display: "grid", gap: 7 }}>
                  {relationSummary.missing.map((item) => (
                    <p className="editorial-body" key={item} style={{ margin: 0 }}>{item}</p>
                  ))}
                </div>
              </article>

              <article className="chapter-card" style={{ borderColor: "rgba(201,168,92,.34)", display: "grid", gap: 10, marginBottom: 0, padding: 14 }}>
                <h2 style={{ color: "var(--text-main)", fontFamily: "var(--font-serif)", fontSize: 20, margin: 0 }}>
                  Prochaine action
                </h2>
                <p className="editorial-body" style={{ margin: 0 }}>{relationSummary.nextAction.text}</p>
                {relationSummary.nextAction.href && relationSummary.nextAction.label ? (
                  <Link className="internal-button-primary" href={relationSummary.nextAction.href} style={{ ...dashboardButtonStyle, justifySelf: "start" }}>
                    {relationSummary.nextAction.label}
                  </Link>
                ) : null}
              </article>
            </SystemGrid>
          </div>
        </SystemPanel>

        <SystemPanel ariaLabel="Centre de sécurité relationnelle" compact>
          <SystemSectionHeader eyebrow="Observation" title="Sécurité relationnelle" />
          <p className="editorial-body" style={{ margin: "0 0 14px" }}>
            Certains signaux méritent votre attention.
          </p>

          <div className="chapter-card" style={{ borderColor: "rgba(201,168,92,.28)", display: "grid", gap: 6, marginBottom: 12, padding: 14 }}>
            <p className="editorial-body" style={{ margin: 0 }}>
              Ce module observe des signaux dans vos données.
            </p>
            <p className="editorial-body" style={{ margin: 0 }}>
              Il ne pose aucun diagnostic.
            </p>
            <p className="editorial-body" style={{ margin: 0 }}>
              Si vous vous sentez en danger, contactez une ressource de soutien appropriée.
            </p>
          </div>

          {securitySignals.length ? (
            <div style={{ display: "grid", gap: 10, marginBottom: 14 }}>
              {securitySignals.map((signal) => (
                <article
                  className="chapter-card"
                  key={`${signal.level}-${signal.text}`}
                  style={{ borderColor: securityLevelStyle(signal.level).borderColor, display: "grid", gap: 8, marginBottom: 0, padding: 14 }}
                >
                  <span
                    style={{
                      border: "1px solid",
                      borderRadius: 999,
                      fontSize: 12,
                      justifySelf: "start",
                      lineHeight: 1,
                      padding: "7px 10px",
                      ...securityLevelStyle(signal.level),
                    }}
                  >
                    {signal.level}
                  </span>
                  <p className="editorial-body" style={{ margin: 0 }}>{signal.text}</p>
                </article>
              ))}
            </div>
          ) : (
            <article className="chapter-card" style={{ borderColor: "rgba(159,189,153,.34)", display: "grid", gap: 8, marginBottom: 14, padding: 14 }}>
              <StatusChip tone="success">Aucun signal</StatusChip>
              <p className="editorial-body" style={{ margin: 0 }}>
                Aucun signal préoccupant détecté dans les données actuelles de ce dossier.
              </p>
            </article>
          )}

          <article className="chapter-card" style={{ display: "grid", gap: 12, marginBottom: 0, padding: 14 }}>
            <h2 style={{ color: "var(--text-main)", fontFamily: "var(--font-serif)", fontSize: 20, margin: 0 }}>
              Ressources de soutien
            </h2>
            <SystemGrid gap={10} min={220}>
              {[
                { line: "1 800 363-9010", meta: "Disponible 24h/24 7j/7", title: "SOS Violence conjugale" },
                { line: "1 866 APPELLE (277-3553)", meta: "Disponible 24h/24 7j/7", title: "Centre de prévention du suicide" },
                { line: "1 800 263-2266", meta: "Pour les jeunes de moins de 25 ans", title: "Tel-jeunes" },
                { line: "1 866 277-3553", meta: "Ligne québécoise de crise", title: "Crise générale" },
              ].map((resource) => (
                <div className="chapter-card" key={resource.title} style={{ display: "grid", gap: 5, marginBottom: 0, padding: 12 }}>
                  <h3 style={{ color: "var(--text-main)", fontFamily: "var(--font-serif)", fontSize: 17, margin: 0 }}>{resource.title}</h3>
                  <p className="editorial-body" style={{ margin: 0 }}>Ligne : {resource.line}</p>
                  <p className="label-meta" style={{ margin: 0 }}>{resource.meta}</p>
                </div>
              ))}
            </SystemGrid>
            <p className="label-meta" style={{ margin: 0 }}>
              Ces ressources sont confidentielles et gratuites. Les ressources varient selon votre région. Vérifiez les coordonnées locales si nécessaire. Si vous êtes en danger immédiat, composez le 911.
            </p>
          </article>
        </SystemPanel>

        <SystemPanel ariaLabel="Activité récente" compact>
          <div style={{ alignItems: "start", display: "flex", flexWrap: "wrap", gap: 10, justifyContent: "space-between", marginBottom: 12 }}>
            <SystemSectionHeader eyebrow="Historique rapide" title="Activité récente" />
            <StatusChip tone={recentActivitySummary.status.tone}>{recentActivitySummary.status.label}</StatusChip>
          </div>

          <div className="chapter-card" style={{ borderColor: "rgba(201,168,92,.28)", display: "grid", gap: 10, marginBottom: 0, padding: 12 }}>
            <div style={{ display: "grid", gap: 7 }}>
              <p className="editorial-body" style={{ margin: 0 }}>
                <strong>Dernière activité :</strong> {recentActivitySummary.latest.global}
              </p>
              <p style={{ color: "var(--accent-gold)", fontSize: 18, fontWeight: 750, lineHeight: 1.1, margin: 0 }}>
                {recentActivitySummary.total === 0 ? "Aucune activité cette semaine." : `${recentActivitySummary.total} action(s) cette semaine`}
              </p>
              <p className="label-meta" style={{ lineHeight: 1.5, margin: 0 }}>
                Cette semaine : {recentActivitySummary.weekly.conversations} conversation(s) · {recentActivitySummary.weekly.analyses} analyse(s) ·{" "}
                {recentActivitySummary.weekly.journal} entrée(s) journal · {recentActivitySummary.weekly.decisions} décision(s)
              </p>
            </div>

            <div style={{ background: "rgba(201,168,92,.16)", height: 1, width: "100%" }} />

            <div style={{ display: "grid", gap: 6 }}>
              {[
                ["Dernière conversation ajoutée", recentActivitySummary.latest.conversations],
                ["Dernière analyse sauvegardée", recentActivitySummary.latest.analyses],
                ["Dernière entrée journal", recentActivitySummary.latest.journal],
                ["Dernière décision documentée", recentActivitySummary.latest.decisions],
              ].map(([label, value]) => (
                <div
                  key={label}
                  style={{
                    alignItems: "center",
                    display: "grid",
                    gap: 8,
                    gridTemplateColumns: "minmax(0, 1fr) auto",
                  }}
                >
                  <span className="editorial-body" style={{ margin: 0 }}>{label}</span>
                  <span className="label-meta" style={{ textAlign: "right", whiteSpace: "nowrap" }}>{value}</span>
                </div>
              ))}
            </div>
          </div>
        </SystemPanel>

        <SystemPanel ariaLabel="Complétion du dossier" compact>
          <SystemSectionHeader eyebrow="Progression" title="Complétion du dossier" />
          <div style={{ alignItems: "end", display: "flex", flexWrap: "wrap", gap: 10, justifyContent: "space-between", marginBottom: 10 }}>
            <div style={{ display: "grid", gap: 4 }}>
              <strong style={{ color: "var(--text-main)", fontFamily: "var(--font-serif)", fontSize: 22, lineHeight: 1.1 }}>
                Fiche complète à {intelligentCompletion.percent}%
              </strong>
              <span className="label-meta">{intelligentCompletion.score}/{intelligentCompletion.total} critères remplis</span>
            </div>
          </div>
          <div style={{ background: "rgba(255,255,255,.06)", borderRadius: 999, height: 6, overflow: "hidden", width: "100%" }}>
            <div style={{ background: completionColor(intelligentCompletion.percent), height: "100%", transition: "width .2s ease", width: `${intelligentCompletion.percent}%` }} />
          </div>
          <div
            style={{
              display: "grid",
              gap: 8,
              gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 260px), 1fr))",
              marginTop: 14,
            }}
          >
            {intelligentCompletion.criteria.map((criterion) => (
              <div
                key={criterion.label}
                style={{
                  alignItems: "center",
                  color: criterion.done ? "var(--text-main)" : "var(--text-soft)",
                  display: "flex",
                  gap: 8,
                  opacity: criterion.done ? 1 : 0.72,
                }}
              >
                <span style={{ color: criterion.done ? "#9fbd99" : "rgba(255,255,255,.34)", lineHeight: 1 }}>
                  {criterion.done ? "✓" : "✗"}
                </span>
                <span className="editorial-body" style={{ margin: 0 }}>{criterion.label}</span>
              </div>
            ))}
          </div>
        </SystemPanel>
          </>
        ) : null}

        {activeTab === "Évaluation" ? (
          <>
        <SystemPanel ariaLabel="Indicateurs relationnels" compact>
          <div id="indicateurs-relationnels" style={{ scrollMarginTop: 24 }} />
          <SystemSectionHeader eyebrow="Indicateurs" title="Évaluer la relation" />
          <div
            style={{
              display: "grid",
              gap: 10,
              gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 360px), 1fr))",
            }}
          >
            {indicators.map((indicator) => {
              const value = dossier[indicator.key];

              return (
                <article
                  className="chapter-card"
                  key={indicator.key}
                  style={{ display: "grid", gap: 10, marginBottom: 0, padding: 14 }}
                >
                  <div style={{ alignItems: "center", display: "flex", gap: 8, justifyContent: "space-between" }}>
                    <h2 style={{ color: "var(--text-main)", fontFamily: "var(--font-serif)", fontSize: 18, margin: 0 }}>
                      {indicator.label}
                    </h2>
                    <StatusChip tone={typeof value === "number" ? "warning" : "neutral"}>
                      {typeof value === "number" ? `${value}/10` : "Non évalué"}
                    </StatusChip>
                  </div>
                  <input
                    aria-label={indicator.label}
                    max={10}
                    min={1}
                    onChange={(event) => updateIndicator(indicator.key, event.target.value)}
                    style={{ accentColor: "var(--accent-gold)", width: "100%" }}
                    type="range"
                    value={typeof value === "number" ? value : 5}
                  />
                </article>
              );
            })}
          </div>
        </SystemPanel>
          </>
        ) : null}

        {activeTab === "Vue d’ensemble" ? (
          <>
        <SystemPanel ariaLabel="Radar relationnel" compact>
          <SystemSectionHeader eyebrow="Synthèse visuelle" title="Radar relationnel" />
          <p className="editorial-body" style={{ margin: "0 0 14px" }}>
            Synthèse visuelle de la relation.
          </p>
          {evaluatedCoreDimensions.length < 2 ? (
            <p className="editorial-body" style={{ color: "var(--text-soft)", margin: "0 0 14px" }}>
              Évaluez les indicateurs et analysez une conversation pour obtenir une synthèse complète.
            </p>
          ) : null}

          <div style={{ display: "grid", gap: 12 }}>
            {radarDimensions.map((dimension) => {
              const evaluated = typeof dimension.value === "number";

              return (
                <div
                  className="chapter-card"
                  key={dimension.label}
                  style={{
                    alignItems: "center",
                    display: "grid",
                    gap: 10,
                    gridTemplateColumns: "minmax(130px, 190px) minmax(0, 1fr) auto",
                    marginBottom: 0,
                    padding: 12,
                  }}
                >
                  <strong style={{ color: "var(--text-main)", fontSize: 13.5 }}>{dimension.label}</strong>
                  <div style={{ background: "rgba(255,255,255,.06)", borderRadius: 999, height: 6, overflow: "hidden", width: "100%" }}>
                    <div
                      style={{
                        background: evaluated ? radarColor(dimension.value || 0) : "transparent",
                        height: "100%",
                        transition: "width .2s ease",
                        width: evaluated ? `${Math.max(0, Math.min(10, dimension.value || 0)) * 10}%` : "0%",
                      }}
                    />
                  </div>
                  <span className="label-meta" style={{ textAlign: "right", whiteSpace: "nowrap" }}>
                    {evaluated ? `${dimension.value}/10` : "Non évalué"}
                  </span>
                </div>
              );
            })}
          </div>

          <div
            className="chapter-card"
            style={{ display: "grid", gap: 10, marginBottom: 0, marginTop: 14, padding: 14 }}
          >
            <div style={{ alignItems: "center", display: "flex", flexWrap: "wrap", gap: 10, justifyContent: "space-between" }}>
              <div style={{ display: "grid", gap: 4 }}>
                <p className="label-meta" style={{ margin: 0 }}>État général</p>
                <strong style={{ color: "var(--text-main)", fontFamily: "var(--font-serif)", fontSize: 20 }}>
                  {generalState}
                </strong>
              </div>
              <StatusChip tone={generalStateTone(generalState)}>{generalState}</StatusChip>
            </div>
            <p className="label-meta" style={{ margin: 0 }}>
              Patterns observés : {Array.isArray(dossier.derniereAnalyse?.patterns) && dossier.derniereAnalyse.patterns.length
                ? `${dossier.derniereAnalyse.patterns.length} pattern(s) détecté(s)`
                : "Aucun pattern détecté"}
            </p>
          </div>
        </SystemPanel>
          </>
        ) : null}

        {activeTab === "Observations" ? (
          <>
        <SystemGrid gap={12} min={320}>
          <SystemPanel ariaLabel="Notes du dossier" compact>
            <SystemSectionHeader eyebrow="Notes" title="Observations privées" />
            <label style={dashboardFieldStyle}>
              <span className="label-meta">Notes</span>
              <textarea
                className="internal-control"
                onChange={(event) => setNotesDraft(event.target.value)}
                placeholder="Ajoutez vos observations ici..."
                rows={7}
                style={{ ...dashboardControlStyle, minHeight: 150 }}
                value={notesDraft}
              />
            </label>
            <div style={{ alignItems: "center", display: "flex", flexWrap: "wrap", gap: 10, marginTop: 10 }}>
              <button className="internal-button-primary" onClick={saveNotes} style={dashboardButtonStyle} type="button">
                Enregistrer les notes
              </button>
              {notesMessage ? <span style={{ color: "var(--accent-gold)", fontSize: 13 }}>{notesMessage}</span> : null}
            </div>
          </SystemPanel>

          <SystemPanel ariaLabel="Tags du dossier" compact>
            <SystemSectionHeader eyebrow="Tags" title="Caractériser la relation" />
            <div style={{ display: "flex", flexWrap: "wrap", gap: 7, marginBottom: 12 }}>
              {(dossier.tags || []).length ? (
                (dossier.tags || []).map((tag) => (
                  <button
                    className="internal-button"
                    key={tag}
                    onClick={() => removeTag(tag)}
                    style={{ ...dashboardButtonStyle, minHeight: 30, padding: "6px 10px" }}
                    title="Supprimer ce tag"
                    type="button"
                  >
                    {tag} ×
                  </button>
                ))
              ) : (
                <StatusChip tone="neutral">Aucun tag</StatusChip>
              )}
            </div>
            <div style={{ display: "grid", gap: 8 }}>
              <label style={dashboardFieldStyle}>
                <span className="label-meta">Ajouter un tag</span>
                <input
                  className="internal-control"
                  onChange={(event) => {
                    setTagDraft(event.target.value);
                    setTagError("");
                  }}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      event.preventDefault();
                      addTag();
                    }
                  }}
                  placeholder="Ex. clarté, tension, distance"
                  style={dashboardControlStyle}
                  value={tagDraft}
                />
              </label>
              {tagError ? <span style={{ color: "#d79a8f", fontSize: 12 }}>{tagError}</span> : null}
              <button className="internal-button-primary" onClick={addTag} style={{ ...dashboardButtonStyle, justifySelf: "start" }} type="button">
                Ajouter le tag
              </button>
            </div>
          </SystemPanel>
        </SystemGrid>
          </>
        ) : null}

        {activeTab === "Conversations" ? (
          <>
        <SystemPanel ariaLabel="Conversations du dossier" compact>
          <SystemSectionHeader
            eyebrow="Centre d'importation relationnelle"
            title="Conversations"
          />
          <p className="editorial-body" style={{ margin: "0 0 14px" }}>
            Ajoutez des conversations importantes à ce dossier afin de préparer les futures analyses.
          </p>

          <div style={{ display: "grid", gap: 10 }}>
            <label style={dashboardFieldStyle}>
              <span className="label-meta">Titre facultatif</span>
              <input
                className="internal-control"
                onChange={(event) => setConversationTitle(event.target.value)}
                placeholder="Exemple — Conversation du 12 mai"
                style={dashboardControlStyle}
                value={conversationTitle}
              />
            </label>
            <label style={dashboardFieldStyle}>
              <span className="label-meta">Conversation</span>
              <textarea
                className="internal-control"
                onChange={(event) => {
                  setConversationContent(event.target.value);
                  setConversationError("");
                }}
                placeholder="Collez ici une conversation, un échange Messenger, un SMS, un courriel, ou toute autre discussion pertinente."
                rows={8}
                style={{ ...dashboardControlStyle, minHeight: 180 }}
                value={conversationContent}
              />
            </label>
            {conversationError ? <span style={{ color: "#d79a8f", fontSize: 12 }}>{conversationError}</span> : null}
            <div style={{ alignItems: "center", display: "flex", flexWrap: "wrap", gap: 10 }}>
              <button className="internal-button-primary" onClick={saveConversation} style={dashboardButtonStyle} type="button">
                Enregistrer la conversation
              </button>
              {conversationMessage ? <span style={{ color: "var(--accent-gold)", fontSize: 13 }}>{conversationMessage}</span> : null}
            </div>
          </div>

          <div style={{ display: "grid", gap: 10, marginTop: 16 }}>
            {conversations.length ? (
              <>
                <label style={dashboardFieldStyle}>
                  <span className="label-meta">Recherche</span>
                  <input
                    className="internal-control"
                    onChange={(event) => setSearchQuery(event.target.value)}
                    placeholder="Rechercher dans les conversations..."
                    style={dashboardControlStyle}
                    type="text"
                    value={searchQuery}
                  />
                </label>
                <p className="label-meta" style={{ margin: 0 }}>
                  {normalizedConversationSearch
                    ? `${filteredConversations.length} résultat(s) pour "${searchQuery.trim()}"`
                    : `${conversations.length} conversation${conversations.length > 1 ? "s" : ""}`}
                </p>
              </>
            ) : null}
            {conversations.length ? (
              filteredConversations.length ? (
              filteredConversations.map((conversation) => {
                const expanded = expandedConversationId === conversation.id;

                return (
                  <article
                    className="chapter-card"
                    key={conversation.id}
                    style={{ display: "grid", gap: 10, marginBottom: 0, padding: 14 }}
                  >
                    <div style={{ alignItems: "start", display: "flex", flexWrap: "wrap", gap: 10, justifyContent: "space-between" }}>
                      <div style={{ display: "grid", gap: 4, minWidth: 0 }}>
                        <h2 style={{ color: "var(--text-main)", fontFamily: "var(--font-serif)", fontSize: 18, margin: 0 }}>
                          {conversation.titre?.trim() || "Conversation sans titre"}
                        </h2>
                        <p className="label-meta" style={{ margin: 0 }}>{formatConversationDate(conversation.dateCreation)}</p>
                      </div>
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 7 }}>
                        <button
                          className="internal-button"
                          onClick={() => setExpandedConversationId(expanded ? "" : conversation.id)}
                          style={{ ...dashboardButtonStyle, minHeight: 32 }}
                          type="button"
                        >
                          Voir
                        </button>
                        <button
                          className="internal-button"
                          onClick={() => setDeleteConversationTarget(conversation)}
                          style={{ ...dashboardButtonStyle, minHeight: 32 }}
                          type="button"
                        >
                          Supprimer
                        </button>
                      </div>
                    </div>
                    <p className="editorial-body" style={{ margin: 0 }}>
                      {previewConversation(conversation.contenu)}
                    </p>
                    {expanded ? (
                      <div
                        style={{
                          background: "rgba(255,250,238,.035)",
                          border: "1px solid rgba(201,168,92,.14)",
                          borderRadius: 14,
                          color: "var(--text-main)",
                          fontSize: 13.5,
                          lineHeight: 1.7,
                          padding: 12,
                          whiteSpace: "pre-wrap",
                        }}
                      >
                        {conversation.contenu}
                      </div>
                    ) : null}
                  </article>
                );
              })
              ) : (
                <div className="chapter-card" style={{ display: "grid", gap: 8, marginBottom: 0, padding: 14, textAlign: "center" }}>
                  <h2 style={{ color: "var(--text-main)", fontFamily: "var(--font-serif)", fontSize: 18, margin: 0 }}>
                    Aucun résultat
                  </h2>
                  <p className="editorial-body" style={{ margin: 0 }}>Aucune conversation ne correspond à votre recherche.</p>
                  <button
                    className="internal-button-primary"
                    onClick={() => setSearchQuery("")}
                    style={{ ...dashboardButtonStyle, justifySelf: "center" }}
                    type="button"
                  >
                    Effacer la recherche
                  </button>
                </div>
              )
            ) : (
              <div
                className="chapter-card"
                style={{ display: "grid", gap: 6, marginBottom: 0, padding: 14, textAlign: "center" }}
              >
                <p className="editorial-body" style={{ margin: 0 }}>Aucune conversation enregistrée.</p>
                <p className="label-meta" style={{ margin: 0 }}>
                  Ajoutez votre première conversation pour préparer les futures analyses.
                </p>
              </div>
            )}
          </div>
        </SystemPanel>
          </>
        ) : null}

        {activeTab === "Vue d’ensemble" ? (
          <>
        <SystemPanel ariaLabel="Dernière analyse sauvegardée" compact>
          <SystemSectionHeader eyebrow="Analyse relationnelle" title="Dernière analyse" />
          {dossier.derniereAnalyse ? (
            <div style={{ display: "grid", gap: 14 }}>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                {dossier.derniereAnalyse.date ? (
                  <StatusChip>Analyse du {formatAnalysisDate(dossier.derniereAnalyse.date)}</StatusChip>
                ) : null}
                {dossier.derniereAnalyse.tonalite ? (
                  <StatusChip tone={tonaliteTone(dossier.derniereAnalyse.tonalite)}>
                    Tonalité · {dossier.derniereAnalyse.tonalite}
                  </StatusChip>
                ) : null}
                {dossier.derniereAnalyse.niveauTension ? (
                  <StatusChip tone={tensionTone(dossier.derniereAnalyse.niveauTension)}>
                    Tension · {dossier.derniereAnalyse.niveauTension}
                  </StatusChip>
                ) : null}
              </div>

              <section style={{ display: "grid", gap: 8 }}>
                <h2 style={{ color: "var(--text-main)", fontFamily: "var(--font-serif)", fontSize: 19, margin: 0 }}>
                  Patterns détectés
                </h2>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 7 }}>
                  {Array.isArray(dossier.derniereAnalyse.patterns) && dossier.derniereAnalyse.patterns.length ? (
                    dossier.derniereAnalyse.patterns.map((pattern) => (
                      <StatusChip key={pattern} tone="warning">{pattern}</StatusChip>
                    ))
                  ) : (
                    <StatusChip tone="neutral">Aucun pattern détecté</StatusChip>
                  )}
                </div>
              </section>

              {Array.isArray(dossier.derniereAnalyse.observations) && dossier.derniereAnalyse.observations.length ? (
                <section style={{ display: "grid", gap: 8 }}>
                  <h2 style={{ color: "var(--text-main)", fontFamily: "var(--font-serif)", fontSize: 19, margin: 0 }}>
                    Observations
                  </h2>
                  <div style={{ display: "grid", gap: 7 }}>
                    {dossier.derniereAnalyse.observations.map((observation) => (
                      <p className="editorial-body" key={observation} style={{ margin: 0 }}>
                        {observation}
                      </p>
                    ))}
                  </div>
                </section>
              ) : null}
            </div>
          ) : (
            <div style={{ display: "grid", gap: 12 }}>
              <p className="editorial-body" style={{ margin: 0 }}>Aucune analyse sauvegardée pour le moment.</p>
              <Link
                className="internal-button-primary"
                href={`/autre-rive/analyse-conversation?dossier=${encodeURIComponent(dossier.id)}`}
                style={{ ...dashboardButtonStyle, justifySelf: "start" }}
              >
                Analyser une conversation
              </Link>
            </div>
          )}
        </SystemPanel>
          </>
        ) : null}

        {activeTab === "Conversations" ? (
          <>
        <SystemPanel ariaLabel="Historique des analyses" compact>
          <SystemSectionHeader
            eyebrow="Archives relationnelles"
            title="Historique des analyses"
          />
          <p className="editorial-body" style={{ margin: "0 0 14px" }}>
            Toutes les analyses sauvegardées pour cette relation.
          </p>

          {analyses.length ? (
            <div style={{ display: "grid", gap: 10 }}>
              <SystemGrid gap={10} min={220}>
                <label style={dashboardFieldStyle}>
                  <span className="label-meta">Recherche</span>
                  <input
                    className="internal-control"
                    onChange={(event) => setAnalysisSearchQuery(event.target.value)}
                    placeholder="Rechercher dans les analyses..."
                    style={dashboardControlStyle}
                    type="text"
                    value={analysisSearchQuery}
                  />
                </label>
                <label style={dashboardFieldStyle}>
                  <span className="label-meta">Tonalité</span>
                  <select
                    className="internal-control"
                    onChange={(event) => setAnalysisToneFilter(event.target.value)}
                    style={dashboardControlStyle}
                    value={analysisToneFilter}
                  >
                    <option value="">Toutes les tonalités</option>
                    {["Positive", "Mixte", "Tendue", "Neutre"].map((tone) => (
                      <option key={tone} value={tone}>{tone}</option>
                    ))}
                  </select>
                </label>
                <label style={dashboardFieldStyle}>
                  <span className="label-meta">Tension</span>
                  <select
                    className="internal-control"
                    onChange={(event) => setAnalysisTensionFilter(event.target.value)}
                    style={dashboardControlStyle}
                    value={analysisTensionFilter}
                  >
                    <option value="">Tous les niveaux</option>
                    {["Faible", "Modéré", "Élevé"].map((level) => (
                      <option key={level} value={level}>{level}</option>
                    ))}
                  </select>
                </label>
              </SystemGrid>
              <p className="label-meta" style={{ margin: 0 }}>
                {analysisFiltersActive
                  ? filteredAnalyses.length
                    ? `${filteredAnalyses.length} résultat(s)`
                    : "Aucun résultat"
                  : `${analyses.length} analyse${analyses.length > 1 ? "s" : ""}`}
              </p>
              {filteredAnalyses.length ? (
              filteredAnalyses.map((analysis) => {
                const expanded = expandedAnalysisId === analysis.id;

                return (
                  <article
                    className="chapter-card"
                    key={analysis.id}
                    style={{ display: "grid", gap: 10, marginBottom: 0, padding: 14 }}
                  >
                    <div style={{ alignItems: "start", display: "flex", flexWrap: "wrap", gap: 10, justifyContent: "space-between" }}>
                      <div style={{ display: "grid", gap: 7, minWidth: 0 }}>
                        <strong style={{ color: "var(--text-main)", fontFamily: "var(--font-serif)", fontSize: 18 }}>
                          {formatAnalysisDate(analysis.date)}
                        </strong>
                        <div style={{ display: "flex", flexWrap: "wrap", gap: 7 }}>
                          <StatusChip tone={tonaliteTone(analysis.tonalite)}>Tonalité · {analysis.tonalite}</StatusChip>
                          <StatusChip tone={tensionTone(analysis.niveauTension)}>Tension · {analysis.niveauTension}</StatusChip>
                          <StatusChip tone="neutral">{analysis.patterns.length} pattern(s) détecté(s)</StatusChip>
                        </div>
                      </div>
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 7 }}>
                        <button
                          className="internal-button"
                          onClick={() => setExpandedAnalysisId(expanded ? "" : analysis.id)}
                          style={{ ...dashboardButtonStyle, minHeight: 32 }}
                          type="button"
                        >
                          Voir le détail
                        </button>
                        <button
                          className="internal-button"
                          onClick={() => setDeleteAnalysisTarget(analysis)}
                          style={{ ...dashboardButtonStyle, minHeight: 32 }}
                          type="button"
                        >
                          Supprimer
                        </button>
                      </div>
                    </div>

                    {expanded ? (
                      <div
                        style={{
                          background: "rgba(255,250,238,.035)",
                          border: "1px solid rgba(201,168,92,.14)",
                          borderRadius: 14,
                          display: "grid",
                          gap: 12,
                          padding: 12,
                        }}
                      >
                        <div style={{ display: "flex", flexWrap: "wrap", gap: 7 }}>
                          <StatusChip>Analyse du {formatAnalysisDate(analysis.date)}</StatusChip>
                          <StatusChip tone={tonaliteTone(analysis.tonalite)}>Tonalité · {analysis.tonalite}</StatusChip>
                          <StatusChip tone={tensionTone(analysis.niveauTension)}>Tension · {analysis.niveauTension}</StatusChip>
                        </div>
                        <section style={{ display: "grid", gap: 8 }}>
                          <h3 style={{ color: "var(--text-main)", fontFamily: "var(--font-serif)", fontSize: 17, margin: 0 }}>
                            Patterns détectés
                          </h3>
                          <div style={{ display: "flex", flexWrap: "wrap", gap: 7 }}>
                            {analysis.patterns.length ? (
                              analysis.patterns.map((pattern) => <StatusChip key={pattern} tone="warning">{pattern}</StatusChip>)
                            ) : (
                              <StatusChip tone="neutral">Aucun pattern détecté</StatusChip>
                            )}
                          </div>
                        </section>
                        <section style={{ display: "grid", gap: 8 }}>
                          <h3 style={{ color: "var(--text-main)", fontFamily: "var(--font-serif)", fontSize: 17, margin: 0 }}>
                            Observations
                          </h3>
                          {analysis.observations.length ? (
                            analysis.observations.map((observation) => (
                              <p className="editorial-body" key={observation} style={{ margin: 0 }}>
                                {observation}
                              </p>
                            ))
                          ) : (
                            <p className="editorial-body" style={{ margin: 0 }}>Aucune observation enregistrée.</p>
                          )}
                        </section>
                      </div>
                    ) : null}
                  </article>
                );
              })
              ) : (
                <div className="chapter-card" style={{ display: "grid", gap: 8, marginBottom: 0, padding: 14, textAlign: "center" }}>
                  <p className="editorial-body" style={{ margin: 0 }}>Aucune analyse ne correspond à votre recherche.</p>
                  <button
                    className="internal-button-primary"
                    onClick={() => {
                      setAnalysisSearchQuery("");
                      setAnalysisToneFilter("");
                      setAnalysisTensionFilter("");
                    }}
                    style={{ ...dashboardButtonStyle, justifySelf: "center" }}
                    type="button"
                  >
                    Effacer les filtres
                  </button>
                </div>
              )}
              {analysisMessage ? <span style={{ color: "var(--accent-gold)", fontSize: 13 }}>{analysisMessage}</span> : null}
            </div>
          ) : (
            <div style={{ display: "grid", gap: 12 }}>
              <p className="editorial-body" style={{ margin: 0 }}>Aucune analyse dans l&apos;historique.</p>
              <Link
                className="internal-button-primary"
                href={`/autre-rive/analyse-conversation?dossier=${encodeURIComponent(dossier.id)}`}
                style={{ ...dashboardButtonStyle, justifySelf: "start" }}
              >
                Analyser une conversation
              </Link>
            </div>
          )}
        </SystemPanel>
          </>
        ) : null}

        {activeTab === "Décisions & Patterns" ? (
          <>
        <SystemPanel ariaLabel="Centre de décision" compact>
          <div id="centre-decision" style={{ scrollMarginTop: 24 }} />
          <SystemSectionHeader eyebrow="Décision" title="Centre de décision" />
          <p className="editorial-body" style={{ margin: "0 0 14px" }}>
            Clarifiez votre prochaine action.
          </p>

          <SystemGrid gap={10} min={260}>
            <label style={dashboardFieldStyle}>
              <span className="label-meta">Quelle est la situation actuelle ?</span>
              <select
                className="internal-control"
                onChange={(event) => {
                  setDecisionSituation(event.target.value);
                  setDecisionError("");
                }}
                style={dashboardControlStyle}
                value={decisionSituation}
              >
                <option value="">Choisir une situation</option>
                {situationOptions.map((option) => (
                  <option key={option} value={option}>{option}</option>
                ))}
              </select>
            </label>
            <label style={dashboardFieldStyle}>
              <span className="label-meta">Quelle est votre intention ?</span>
              <select
                className="internal-control"
                onChange={(event) => {
                  setDecisionIntention(event.target.value);
                  setDecisionOption("");
                  setDecisionError("");
                }}
                style={dashboardControlStyle}
                value={decisionIntention}
              >
                <option value="">Choisir une intention</option>
                {intentionOptions.map((option) => (
                  <option key={option} value={option}>{option}</option>
                ))}
              </select>
            </label>
          </SystemGrid>

          <div style={{ display: "grid", gap: 8, marginTop: 14 }}>
            <p className="label-meta" style={{ margin: 0 }}>Choix d&apos;une option</p>
            {decisionOptions.length ? (
              <SystemGrid gap={8} min={220}>
                {decisionOptions.map((option) => (
                  <label
                    className="chapter-card"
                    key={option}
                    style={{
                      alignItems: "center",
                      cursor: "pointer",
                      display: "flex",
                      gap: 9,
                      marginBottom: 0,
                      padding: 11,
                    }}
                  >
                    <input
                      checked={decisionOption === option}
                      name="decision-option"
                      onChange={() => {
                        setDecisionOption(option);
                        setDecisionError("");
                      }}
                      style={{ accentColor: "var(--accent-gold)" }}
                      type="radio"
                    />
                    <span style={{ color: "var(--text-main)", fontSize: 13.5 }}>{option}</span>
                  </label>
                ))}
              </SystemGrid>
            ) : (
              <p className="editorial-body" style={{ color: "var(--text-soft)", margin: 0 }}>
                Choisissez une intention pour afficher les options possibles.
              </p>
            )}
          </div>

          <div
            className="chapter-card"
            style={{
              background: "linear-gradient(135deg, rgba(201,168,92,.13), rgba(255,250,238,.035))",
              borderColor: "rgba(201,168,92,.32)",
              display: "grid",
              gap: 7,
              marginBottom: 0,
              marginTop: 14,
              padding: 14,
            }}
          >
            <p className="label-meta" style={{ margin: 0 }}>Recommandation</p>
            <p className="editorial-body" style={{ color: "var(--text-main)", margin: 0 }}>
              {currentDecisionRecommendation}
            </p>
          </div>

          {decisionError ? <p style={{ color: "#d79a8f", fontSize: 12, margin: "10px 0 0" }}>{decisionError}</p> : null}
          <div style={{ alignItems: "center", display: "flex", flexWrap: "wrap", gap: 10, marginTop: 12 }}>
            <button className="internal-button-primary" onClick={saveDecision} style={dashboardButtonStyle} type="button">
              Sauvegarder cette décision
            </button>
            {decisionMessage ? <span style={{ color: "var(--accent-gold)", fontSize: 13 }}>{decisionMessage}</span> : null}
          </div>

          <div style={{ display: "grid", gap: 10, marginTop: 16 }}>
            <h2 style={{ color: "var(--text-main)", fontFamily: "var(--font-serif)", fontSize: 20, margin: 0 }}>
              Historique des décisions
            </h2>
            {decisions.length ? (
              <>
                <SystemGrid gap={10} min={220}>
                  <label style={dashboardFieldStyle}>
                    <span className="label-meta">Recherche</span>
                    <input
                      className="internal-control"
                      onChange={(event) => setDecisionSearchQuery(event.target.value)}
                      placeholder="Rechercher dans les décisions..."
                      style={dashboardControlStyle}
                      type="text"
                      value={decisionSearchQuery}
                    />
                  </label>
                  <label style={dashboardFieldStyle}>
                    <span className="label-meta">Intention</span>
                    <select
                      className="internal-control"
                      onChange={(event) => setDecisionIntentionFilter(event.target.value)}
                      style={dashboardControlStyle}
                      value={decisionIntentionFilter}
                    >
                      <option value="">Toutes les intentions</option>
                      {intentionOptions.map((option) => (
                        <option key={option} value={option}>{option}</option>
                      ))}
                    </select>
                  </label>
                  <label style={dashboardFieldStyle}>
                    <span className="label-meta">Situation</span>
                    <select
                      className="internal-control"
                      onChange={(event) => setDecisionSituationFilter(event.target.value)}
                      style={dashboardControlStyle}
                      value={decisionSituationFilter}
                    >
                      <option value="">Toutes les situations</option>
                      {situationOptions.map((option) => (
                        <option key={option} value={option}>{option}</option>
                      ))}
                    </select>
                  </label>
                </SystemGrid>
                <p className="label-meta" style={{ margin: 0 }}>
                  {decisionFiltersActive
                    ? filteredDecisions.length
                      ? `${filteredDecisions.length} résultat(s)`
                      : "Aucun résultat"
                    : `${decisions.length} décision${decisions.length > 1 ? "s" : ""}`}
                </p>
                {filteredDecisions.length ? (
              filteredDecisions.map((decision) => (
                <article
                  className="chapter-card"
                  key={decision.id}
                  style={{ display: "grid", gap: 9, marginBottom: 0, padding: 14 }}
                >
                  <div style={{ alignItems: "start", display: "flex", flexWrap: "wrap", gap: 10, justifyContent: "space-between" }}>
                    <div style={{ display: "grid", gap: 5, minWidth: 0 }}>
                      <p className="label-meta" style={{ margin: 0 }}>{formatDecisionRelativeDate(decision.date)}</p>
                      <strong style={{ color: "var(--text-main)", fontFamily: "var(--font-serif)", fontSize: 18 }}>
                        {decision.intention}
                      </strong>
                    </div>
                    <button
                      className="internal-button"
                      onClick={() => setDeleteDecisionTarget(decision)}
                      style={{ ...dashboardButtonStyle, minHeight: 32 }}
                      type="button"
                    >
                      Supprimer
                    </button>
                  </div>
                  <div style={{ display: "grid", gap: 5 }}>
                    <p className="editorial-body" style={{ margin: 0 }}><strong>Situation :</strong> {decision.situation}</p>
                    <p className="editorial-body" style={{ margin: 0 }}><strong>Option :</strong> {decision.optionChoisie}</p>
                    <p className="editorial-body" style={{ margin: 0 }}><strong>Recommandation :</strong> {decision.recommandation}</p>
                  </div>
                </article>
              ))
                ) : (
                  <div className="chapter-card" style={{ display: "grid", gap: 8, marginBottom: 0, padding: 14, textAlign: "center" }}>
                    <p className="editorial-body" style={{ margin: 0 }}>Aucune décision ne correspond à votre recherche.</p>
                    <button
                      className="internal-button-primary"
                      onClick={() => {
                        setDecisionSearchQuery("");
                        setDecisionIntentionFilter("");
                        setDecisionSituationFilter("");
                      }}
                      style={{ ...dashboardButtonStyle, justifySelf: "center" }}
                      type="button"
                    >
                      Effacer les filtres
                    </button>
                  </div>
                )}
              </>
            ) : (
              <div className="chapter-card" style={{ display: "grid", gap: 6, marginBottom: 0, padding: 14, textAlign: "center" }}>
                <p className="editorial-body" style={{ margin: 0 }}>Aucune décision sauvegardée.</p>
                <p className="label-meta" style={{ margin: 0 }}>
                  Utilisez le formulaire ci-dessus pour clarifier votre prochaine action.
                </p>
              </div>
            )}
          </div>
        </SystemPanel>
          </>
        ) : null}

        {activeTab === "Observations" ? (
          <>
        <SystemPanel ariaLabel="Journal relationnel" compact>
          <div id="journal-relationnel" style={{ scrollMarginTop: 24 }} />
          <SystemSectionHeader eyebrow="Suivi relationnel" title="Journal relationnel" />
          <p className="editorial-body" style={{ margin: "0 0 14px" }}>
            Notez les événements importants et leur impact émotionnel.
          </p>

          {journalSummary ? (
            <SystemGrid gap={10} min={220}>
              <article className="chapter-card" style={{ display: "grid", gap: 5, marginBottom: 0, padding: 12 }}>
                <p className="label-meta" style={{ margin: 0 }}>Nombre total d&apos;entrées</p>
                <strong style={{ color: "var(--text-main)", fontFamily: "var(--font-serif)", fontSize: 22 }}>{journalSummary.total}</strong>
              </article>
              <article className="chapter-card" style={{ display: "grid", gap: 5, marginBottom: 0, padding: 12 }}>
                <p className="label-meta" style={{ margin: 0 }}>Émotion dominante</p>
                <strong style={{ color: "var(--text-main)", fontFamily: "var(--font-serif)", fontSize: 22 }}>{journalSummary.dominantEmotion}</strong>
              </article>
              <article className="chapter-card" style={{ display: "grid", gap: 5, marginBottom: 0, padding: 12 }}>
                <p className="label-meta" style={{ margin: 0 }}>Intensité moyenne</p>
                <strong style={{ color: "var(--text-main)", fontFamily: "var(--font-serif)", fontSize: 22 }}>{journalSummary.averageIntensity}/10</strong>
              </article>
            </SystemGrid>
          ) : null}

          <div style={{ display: "grid", gap: 10, marginTop: journalSummary ? 16 : 0 }}>
            <label style={dashboardFieldStyle}>
              <span className="label-meta">Que s&apos;est-il passé ?</span>
              <textarea
                className="internal-control"
                onChange={(event) => {
                  setJournalEvent(event.target.value);
                  setJournalError("");
                }}
                placeholder="Décrivez brièvement l'événement ou la situation."
                rows={4}
                style={{ ...dashboardControlStyle, minHeight: 110 }}
                value={journalEvent}
              />
            </label>

            <SystemGrid gap={10} min={220}>
              <label style={dashboardFieldStyle}>
                <span className="label-meta">Quelle émotion avez-vous ressentie ?</span>
                <select
                  className="internal-control"
                  onChange={(event) => {
                    setJournalEmotion(event.target.value);
                    setJournalError("");
                  }}
                  style={dashboardControlStyle}
                  value={journalEmotion}
                >
                  <option value="">Choisir une émotion</option>
                  {emotionOptions.map((emotion) => (
                    <option key={emotion} value={emotion}>{emotion}</option>
                  ))}
                </select>
              </label>
              <label style={dashboardFieldStyle}>
                <span className="label-meta">Qu&apos;est-ce qui a déclenché cette émotion ?</span>
                <input
                  className="internal-control"
                  onChange={(event) => setJournalTrigger(event.target.value)}
                  placeholder="Un mot, une action, un silence, un message..."
                  style={dashboardControlStyle}
                  value={journalTrigger}
                />
              </label>
            </SystemGrid>

            <label style={{ ...dashboardFieldStyle, gap: 8 }}>
              <span className="label-meta">Intensité de l&apos;émotion · {journalIntensity}/10</span>
              <input
                max={10}
                min={1}
                onChange={(event) => setJournalIntensity(Number(event.target.value))}
                style={{ accentColor: "var(--accent-gold)", width: "100%" }}
                type="range"
                value={journalIntensity}
              />
            </label>

            {journalError ? <p style={{ color: "#d79a8f", fontSize: 12, margin: 0 }}>{journalError}</p> : null}
            <div style={{ alignItems: "center", display: "flex", flexWrap: "wrap", gap: 10 }}>
              <button className="internal-button-primary" onClick={saveJournalEntry} style={dashboardButtonStyle} type="button">
                Enregistrer l&apos;entrée
              </button>
              {journalMessage ? <span style={{ color: "var(--accent-gold)", fontSize: 13 }}>{journalMessage}</span> : null}
            </div>
          </div>

          <div style={{ display: "grid", gap: 10, marginTop: 16 }}>
            {journalEntries.length ? (
              <>
                <SystemGrid gap={10} min={220}>
                  <label style={dashboardFieldStyle}>
                    <span className="label-meta">Recherche</span>
                    <input
                      className="internal-control"
                      onChange={(event) => setJournalSearchQuery(event.target.value)}
                      placeholder="Rechercher dans le journal..."
                      style={dashboardControlStyle}
                      type="text"
                      value={journalSearchQuery}
                    />
                  </label>
                  <label style={dashboardFieldStyle}>
                    <span className="label-meta">Filtre par émotion</span>
                    <select
                      className="internal-control"
                      onChange={(event) => setJournalEmotionFilter(event.target.value)}
                      style={dashboardControlStyle}
                      value={journalEmotionFilter}
                    >
                      <option value="">Toutes les émotions</option>
                      {emotionOptions.map((emotion) => (
                        <option key={emotion} value={emotion}>{emotion}</option>
                      ))}
                    </select>
                  </label>
                </SystemGrid>
                <p className="label-meta" style={{ margin: 0 }}>
                  {journalFiltersActive
                    ? filteredJournalEntries.length
                      ? `${filteredJournalEntries.length} résultat(s)`
                      : "Aucun résultat"
                    : `${journalEntries.length} entrée${journalEntries.length > 1 ? "s" : ""}`}
                </p>
              </>
            ) : null}
            {journalEntries.length ? (
              filteredJournalEntries.length ? (
              filteredJournalEntries.map((entry) => {
                const expanded = expandedJournalId === entry.id;
                const intensityWidth = `${Math.max(0, Math.min(10, entry.intensite)) * 10}%`;

                return (
                  <article
                    className="chapter-card"
                    key={entry.id}
                    style={{ display: "grid", gap: 10, marginBottom: 0, padding: 14 }}
                  >
                    <div style={{ alignItems: "start", display: "flex", flexWrap: "wrap", gap: 10, justifyContent: "space-between" }}>
                      <div style={{ display: "grid", gap: 7, minWidth: 0 }}>
                        <p className="label-meta" style={{ margin: 0 }}>{formatDecisionRelativeDate(entry.date)}</p>
                        <div style={{ display: "flex", flexWrap: "wrap", gap: 7 }}>
                          <span
                            style={{
                              border: "1px solid",
                              borderRadius: 999,
                              fontSize: 12,
                              lineHeight: 1,
                              padding: "6px 9px",
                              ...emotionBadgeStyle(entry.emotion),
                            }}
                          >
                            {entry.emotion}
                          </span>
                          <StatusChip tone={entry.intensite >= 7 ? "warning" : entry.intensite <= 3 ? "success" : "neutral"}>
                            Intensité · {entry.intensite}/10
                          </StatusChip>
                        </div>
                      </div>
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 7 }}>
                        <button
                          className="internal-button"
                          onClick={() => setExpandedJournalId(expanded ? "" : entry.id)}
                          style={{ ...dashboardButtonStyle, minHeight: 32 }}
                          type="button"
                        >
                          Voir
                        </button>
                        <button
                          className="internal-button"
                          onClick={() => setDeleteJournalTarget(entry)}
                          style={{ ...dashboardButtonStyle, minHeight: 32 }}
                          type="button"
                        >
                          Supprimer
                        </button>
                      </div>
                    </div>
                    <div style={{ display: "grid", gap: 6 }}>
                      <div style={{ background: "rgba(255,255,255,.06)", borderRadius: 999, height: 6, overflow: "hidden", width: "100%" }}>
                        <div style={{ background: intensityColor(entry.intensite), height: "100%", width: intensityWidth }} />
                      </div>
                      <p className="editorial-body" style={{ margin: 0 }}>{previewJournalEvent(entry.evenement)}</p>
                      {entry.declencheur ? <p className="label-meta" style={{ margin: 0 }}>Déclencheur : {entry.declencheur}</p> : null}
                    </div>

                    {expanded ? (
                      <div
                        style={{
                          background: "rgba(255,250,238,.035)",
                          border: "1px solid rgba(201,168,92,.14)",
                          borderRadius: 14,
                          display: "grid",
                          gap: 10,
                          padding: 12,
                        }}
                      >
                        <StatusChip>Entrée du {formatAnalysisDate(entry.date)}</StatusChip>
                        <p className="editorial-body" style={{ margin: 0, whiteSpace: "pre-wrap" }}>{entry.evenement}</p>
                        <div style={{ display: "flex", flexWrap: "wrap", gap: 7 }}>
                          <span
                            style={{
                              border: "1px solid",
                              borderRadius: 999,
                              fontSize: 12,
                              lineHeight: 1,
                              padding: "6px 9px",
                              ...emotionBadgeStyle(entry.emotion),
                            }}
                          >
                            {entry.emotion}
                          </span>
                          <StatusChip tone={entry.intensite >= 7 ? "warning" : entry.intensite <= 3 ? "success" : "neutral"}>
                            Intensité · {entry.intensite}/10
                          </StatusChip>
                        </div>
                        <div style={{ background: "rgba(255,255,255,.06)", borderRadius: 999, height: 6, overflow: "hidden", width: "100%" }}>
                          <div style={{ background: intensityColor(entry.intensite), height: "100%", width: intensityWidth }} />
                        </div>
                        {entry.declencheur ? <p className="label-meta" style={{ margin: 0 }}>Déclencheur : {entry.declencheur}</p> : null}
                      </div>
                    ) : null}
                  </article>
                );
              })
              ) : (
                <div className="chapter-card" style={{ display: "grid", gap: 8, marginBottom: 0, padding: 14, textAlign: "center" }}>
                  <p className="editorial-body" style={{ margin: 0 }}>Aucune entrée ne correspond à votre recherche.</p>
                  <button
                    className="internal-button-primary"
                    onClick={() => {
                      setJournalSearchQuery("");
                      setJournalEmotionFilter("");
                    }}
                    style={{ ...dashboardButtonStyle, justifySelf: "center" }}
                    type="button"
                  >
                    Effacer les filtres
                  </button>
                </div>
              )
            ) : (
              <div className="chapter-card" style={{ display: "grid", gap: 6, marginBottom: 0, padding: 14, textAlign: "center" }}>
                <p className="editorial-body" style={{ margin: 0 }}>Aucune entrée dans le journal.</p>
                <p className="label-meta" style={{ margin: 0 }}>
                  Commencez à noter les événements importants pour suivre l&apos;évolution de cette relation.
                </p>
              </div>
            )}
          </div>
        </SystemPanel>
          </>
        ) : null}

        {activeTab === "Décisions & Patterns" ? (
          <>
        <SystemPanel ariaLabel="Repérage des patterns" compact>
          <SystemSectionHeader eyebrow="Lecture locale" title="Repérage des patterns" />
          <p className="editorial-body" style={{ margin: "0 0 14px" }}>
            Ce que vos données révèlent sur cette relation.
          </p>

          {patternInsights.totalEntries < 2 ? (
            <div className="chapter-card" style={{ display: "grid", gap: 6, marginBottom: 0, padding: 14, textAlign: "center" }}>
              <p className="editorial-body" style={{ margin: 0 }}>Pas encore assez de données pour repérer des patterns.</p>
              <p className="label-meta" style={{ margin: 0 }}>Continuez à enrichir votre dossier.</p>
            </div>
          ) : (
            <div style={{ display: "grid", gap: 12 }}>
              <div style={{ display: "grid", gap: 8 }}>
                <h2 style={{ color: "var(--text-main)", fontFamily: "var(--font-serif)", fontSize: 20, margin: 0 }}>
                  Ce qui impacte votre énergie
                </h2>
              </div>

              <SystemGrid gap={12} min={280}>
                <article className="chapter-card" style={{ display: "grid", gap: 10, marginBottom: 0, padding: 14 }}>
                  <h2 style={{ color: "var(--text-main)", fontFamily: "var(--font-serif)", fontSize: 20, margin: 0 }}>
                    Émotions récurrentes
                  </h2>
                  {patternInsights.emotions.length ? (
                    <div style={{ display: "grid", gap: 10 }}>
                      {patternInsights.emotions.map((emotion) => (
                        <div key={emotion.emotion} style={{ display: "grid", gap: 6 }}>
                          <div style={{ alignItems: "center", display: "flex", flexWrap: "wrap", gap: 8, justifyContent: "space-between" }}>
                            <span
                              style={{
                                border: "1px solid",
                                borderRadius: 999,
                                fontSize: 12,
                                lineHeight: 1,
                                padding: "6px 9px",
                                ...emotionBadgeStyle(emotion.emotion),
                              }}
                            >
                              {emotion.emotion}
                            </span>
                            <span className="label-meta">{emotion.count} fois · Intensité moyenne {emotion.averageIntensity}/10</span>
                          </div>
                          <div style={{ background: "rgba(255,255,255,.06)", borderRadius: 999, height: 6, overflow: "hidden", width: "100%" }}>
                            <div
                              style={{
                                background: intensityColor(emotion.averageIntensity),
                                height: "100%",
                                width: `${(emotion.count / patternInsights.maxEmotionCount) * 100}%`,
                              }}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="editorial-body" style={{ margin: 0 }}>Aucune donnée émotionnelle disponible.</p>
                  )}
                </article>

                <article className="chapter-card" style={{ display: "grid", gap: 10, marginBottom: 0, padding: 14 }}>
                  <h2 style={{ color: "var(--text-main)", fontFamily: "var(--font-serif)", fontSize: 20, margin: 0 }}>
                    Déclencheurs fréquents
                  </h2>
                  {patternInsights.triggers.length >= 2 ? (
                    <div style={{ display: "grid", gap: 7 }}>
                      {patternInsights.triggers.slice(0, 5).map(([trigger, count]) => (
                        <p className="editorial-body" key={trigger} style={{ margin: 0 }}>
                          <strong>{trigger}</strong> — {count} fois
                        </p>
                      ))}
                    </div>
                  ) : (
                    <p className="editorial-body" style={{ margin: 0 }}>Pas encore assez de déclencheurs enregistrés.</p>
                  )}
                </article>
              </SystemGrid>

              <SystemGrid gap={12} min={280}>
                <article className="chapter-card" style={{ display: "grid", gap: 10, marginBottom: 0, padding: 14 }}>
                  <h2 style={{ color: "var(--text-main)", fontFamily: "var(--font-serif)", fontSize: 20, margin: 0 }}>
                    Patterns observés dans les conversations
                  </h2>
                  {patternInsights.analysisPatterns.length ? (
                    <div style={{ display: "grid", gap: 8 }}>
                      {patternInsights.analysisPatterns.map(([pattern, count]) => {
                        const level = repetitionLevel(count);

                        return (
                          <div key={pattern} style={{ alignItems: "center", display: "flex", flexWrap: "wrap", gap: 8, justifyContent: "space-between" }}>
                            <StatusChip tone="warning">{pattern}</StatusChip>
                            <span className="label-meta">Détecté {count} fois</span>
                            <span
                              style={{
                                border: "1px solid",
                                borderRadius: 999,
                                fontSize: 12,
                                lineHeight: 1,
                                padding: "6px 9px",
                                ...repetitionLevelStyle(level),
                              }}
                            >
                              {level}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <p className="editorial-body" style={{ margin: 0 }}>Aucune analyse sauvegardée.</p>
                  )}
                </article>

                <article className="chapter-card" style={{ display: "grid", gap: 10, marginBottom: 0, padding: 14 }}>
                  <h2 style={{ color: "var(--text-main)", fontFamily: "var(--font-serif)", fontSize: 20, margin: 0 }}>
                    Moments marquants
                  </h2>
                  {patternInsights.notableEvents.length ? (
                    <div style={{ display: "grid", gap: 8 }}>
                      {patternInsights.notableEvents.map((entry) => {
                        const type = isSoothingEmotion(entry.emotion) ? "Apaisant" : "Drainant";

                        return (
                          <div key={entry.id} style={{ display: "grid", gap: 6 }}>
                            <div style={{ alignItems: "center", display: "flex", flexWrap: "wrap", gap: 8, justifyContent: "space-between" }}>
                              <span className="label-meta">{formatDecisionRelativeDate(entry.date)}</span>
                              <div style={{ alignItems: "center", display: "flex", flexWrap: "wrap", gap: 6 }}>
                                <span
                                  style={{
                                    border: "1px solid",
                                    borderRadius: 999,
                                    fontSize: 12,
                                    lineHeight: 1,
                                    padding: "6px 9px",
                                    ...emotionBadgeStyle(entry.emotion),
                                  }}
                                >
                                  {entry.emotion}
                                </span>
                                <StatusChip tone={type === "Apaisant" ? "success" : "warning"}>{type}</StatusChip>
                              </div>
                            </div>
                            <p className="editorial-body" style={{ margin: 0 }}>{previewPatternEvent(entry.evenement)}</p>
                            <span className="label-meta">Intensité {entry.intensite}/10</span>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <p className="editorial-body" style={{ margin: 0 }}>Aucun événement marquant disponible.</p>
                  )}
                </article>
              </SystemGrid>

              <SystemGrid gap={12} min={280}>
                <article className="chapter-card" style={{ display: "grid", gap: 10, marginBottom: 0, padding: 14 }}>
                  <h2 style={{ color: "var(--text-main)", fontFamily: "var(--font-serif)", fontSize: 20, margin: 0 }}>
                    Évolution de la tension
                  </h2>
                  {patternInsights.chronologicalTensions.length ? (
                    <div style={{ display: "grid", gap: 8 }}>
                      {patternInsights.tensionTrend ? <StatusChip tone={patternInsights.tensionTrend === "Tension en baisse" ? "success" : "warning"}>{patternInsights.tensionTrend}</StatusChip> : null}
                      {patternInsights.chronologicalTensions.map((analysis) => (
                        <div key={analysis.id} style={{ alignItems: "center", display: "flex", flexWrap: "wrap", gap: 8, justifyContent: "space-between" }}>
                          <span className="label-meta">{formatDecisionRelativeDate(analysis.date)}</span>
                          <StatusChip tone={tensionTone(analysis.niveauTension)}>{analysis.niveauTension}</StatusChip>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="editorial-body" style={{ margin: 0 }}>Aucune donnée de tension disponible.</p>
                  )}
                </article>

                <article className="chapter-card" style={{ display: "grid", gap: 10, marginBottom: 0, padding: 14 }}>
                  <h2 style={{ color: "var(--text-main)", fontFamily: "var(--font-serif)", fontSize: 20, margin: 0 }}>
                    Schémas décisionnels
                  </h2>
                  {decisions.length >= 2 ? (
                    <div style={{ display: "grid", gap: 7 }}>
                      <p className="editorial-body" style={{ margin: 0 }}>
                        Situation récurrente : <strong>{patternInsights.topSituation?.[0]}</strong> — {patternInsights.topSituation?.[1]} fois
                      </p>
                      <p className="editorial-body" style={{ margin: 0 }}>
                        Intention récurrente : <strong>{patternInsights.topIntention?.[0]}</strong> — {patternInsights.topIntention?.[1]} fois
                      </p>
                    </div>
                  ) : (
                    <p className="editorial-body" style={{ margin: 0 }}>Pas encore assez de décisions enregistrées.</p>
                  )}
                </article>

                <article className="chapter-card" style={{ display: "grid", gap: 10, marginBottom: 0, padding: 14 }}>
                  <h2 style={{ color: "var(--text-main)", fontFamily: "var(--font-serif)", fontSize: 20, margin: 0 }}>
                    Synthèse
                  </h2>
                  <div style={{ display: "grid", gap: 8 }}>
                    {patternInsights.observations.map((observation) => (
                      <p className="editorial-body" key={observation} style={{ margin: 0 }}>
                        {observation}
                      </p>
                    ))}
                  </div>
                </article>
              </SystemGrid>
            </div>
          )}
        </SystemPanel>
          </>
        ) : null}

        {activeTab === "Évaluation" ? (
          <>
        <SystemPanel ariaLabel="Énergie émotionnelle" compact>
          <SystemSectionHeader eyebrow="Impact relationnel" title="Énergie émotionnelle" />
          <p className="editorial-body" style={{ margin: "0 0 14px" }}>
            Cette relation vous draine-t-elle ou vous apaise-t-elle ?
          </p>

          {!journalEntries.length ? (
            <div className="chapter-card" style={{ display: "grid", gap: 6, marginBottom: 0, padding: 14, textAlign: "center" }}>
              <p className="editorial-body" style={{ margin: 0 }}>Aucune donnée disponible.</p>
              <p className="label-meta" style={{ margin: 0 }}>
                Commencez à enregistrer des événements dans le journal pour voir l&apos;impact énergétique de cette relation.
              </p>
            </div>
          ) : (
            <div style={{ display: "grid", gap: 12 }}>
              <SystemGrid gap={12} min={280}>
                <article className="chapter-card" style={{ display: "grid", gap: 10, marginBottom: 0, padding: 14 }}>
                  <div style={{ alignItems: "center", display: "flex", flexWrap: "wrap", gap: 8, justifyContent: "space-between" }}>
                    <h2 style={{ color: "var(--text-main)", fontFamily: "var(--font-serif)", fontSize: 20, margin: 0 }}>
                      Bilan énergétique
                    </h2>
                    <StatusChip tone={energyTone(energyInsights.globalScore)}>{energyState(energyInsights.globalScore)}</StatusChip>
                  </div>
                  <div style={{ display: "grid", gap: 8 }}>
                    <div style={{ alignItems: "end", display: "flex", gap: 10, justifyContent: "space-between" }}>
                      <span style={{ color: "var(--text-main)", fontFamily: "var(--font-serif)", fontSize: 32, lineHeight: 1 }}>
                        {energyInsights.globalScore}/10
                      </span>
                      <span className="label-meta">Valeur manuelle : {typeof dossier?.energieEmotionnelle === "number" ? `${dossier.energieEmotionnelle}/10` : "Non évalué"}</span>
                    </div>
                    <div style={{ background: "rgba(255,255,255,.06)", borderRadius: 999, height: 7, overflow: "hidden", width: "100%" }}>
                      <div
                        style={{
                          background: energyColor(energyInsights.globalScore),
                          height: "100%",
                          width: `${energyInsights.globalScore * 10}%`,
                        }}
                      />
                    </div>
                  </div>
                </article>

                <article className="chapter-card" style={{ display: "grid", gap: 10, marginBottom: 0, padding: 14 }}>
                  <h2 style={{ color: "var(--text-main)", fontFamily: "var(--font-serif)", fontSize: 20, margin: 0 }}>
                    Répartition des émotions
                  </h2>
                  {[
                    { color: "#b56b5f", count: energyInsights.counts.draining, label: "Drainant" },
                    { color: "#9fbd99", count: energyInsights.counts.soothing, label: "Apaisant" },
                    { color: "rgba(255,255,255,.28)", count: energyInsights.counts.neutral, label: "Neutre" },
                  ].map((item) => (
                    <div key={item.label} style={{ display: "grid", gap: 5 }}>
                      <div style={{ alignItems: "center", display: "flex", gap: 8, justifyContent: "space-between" }}>
                        <span className="editorial-body" style={{ margin: 0 }}>{item.label}</span>
                        <span className="label-meta">{item.count} entrée{item.count > 1 ? "s" : ""}</span>
                      </div>
                      <div style={{ background: "rgba(255,255,255,.06)", borderRadius: 999, height: 6, overflow: "hidden", width: "100%" }}>
                        <div style={{ background: item.color, height: "100%", width: `${(item.count / energyInsights.total) * 100}%` }} />
                      </div>
                    </div>
                  ))}
                </article>
              </SystemGrid>

              <SystemGrid gap={12} min={280}>
                <article className="chapter-card" style={{ display: "grid", gap: 10, marginBottom: 0, padding: 14 }}>
                  <div style={{ alignItems: "center", display: "flex", flexWrap: "wrap", gap: 8, justifyContent: "space-between" }}>
                    <h2 style={{ color: "var(--text-main)", fontFamily: "var(--font-serif)", fontSize: 20, margin: 0 }}>
                      Tendance des 5 dernières entrées
                    </h2>
                    <StatusChip tone={energyInsights.trend === "Tendance positive récente" ? "success" : energyInsights.trend === "Tendance négative récente" ? "warning" : "neutral"}>
                      {energyInsights.trend}
                    </StatusChip>
                  </div>
                  <p className="label-meta" style={{ margin: 0 }}>Score récent : {energyInsights.recentScore}/10</p>
                  <div style={{ display: "grid", gap: 8 }}>
                    {energyInsights.recentEntries.map((entry) => (
                      <div key={entry.id} style={{ display: "grid", gap: 5 }}>
                        <div style={{ alignItems: "center", display: "flex", flexWrap: "wrap", gap: 8, justifyContent: "space-between" }}>
                          <span className="label-meta">{formatDecisionRelativeDate(entry.date)}</span>
                          <span
                            style={{
                              border: "1px solid",
                              borderRadius: 999,
                              fontSize: 12,
                              lineHeight: 1,
                              padding: "6px 9px",
                              ...emotionBadgeStyle(entry.emotion),
                            }}
                          >
                            {entry.emotion}
                          </span>
                        </div>
                        <div style={{ background: "rgba(255,255,255,.06)", borderRadius: 999, height: 5, overflow: "hidden", width: "100%" }}>
                          <div style={{ background: intensityColor(entry.intensite), height: "100%", width: `${entry.intensite * 10}%` }} />
                        </div>
                      </div>
                    ))}
                  </div>
                </article>

                <article className="chapter-card" style={{ display: "grid", gap: 10, marginBottom: 0, padding: 14 }}>
                  <h2 style={{ color: "var(--text-main)", fontFamily: "var(--font-serif)", fontSize: 20, margin: 0 }}>
                    Moments marquants
                  </h2>
                  <div style={{ display: "grid", gap: 8 }}>
                    {energyInsights.notableEvents.map((entry) => {
                      const type = energyType(entry.emotion);

                      return (
                        <div key={entry.id} style={{ display: "grid", gap: 6 }}>
                          <div style={{ alignItems: "center", display: "flex", flexWrap: "wrap", gap: 8, justifyContent: "space-between" }}>
                            <span className="label-meta">{formatDecisionRelativeDate(entry.date)}</span>
                            <div style={{ alignItems: "center", display: "flex", flexWrap: "wrap", gap: 6 }}>
                              <span
                                style={{
                                  border: "1px solid",
                                  borderRadius: 999,
                                  fontSize: 12,
                                  lineHeight: 1,
                                  padding: "6px 9px",
                                  ...emotionBadgeStyle(entry.emotion),
                                }}
                              >
                                {entry.emotion}
                              </span>
                              <StatusChip tone={type === "Apaisant" ? "success" : type === "Drainant" ? "warning" : "neutral"}>{type}</StatusChip>
                            </div>
                          </div>
                          <p className="editorial-body" style={{ margin: 0 }}>{previewPatternEvent(entry.evenement)}</p>
                          <span className="label-meta">Intensité {entry.intensite}/10</span>
                        </div>
                      );
                    })}
                  </div>
                </article>
              </SystemGrid>

              <SystemGrid gap={12} min={280}>
                <article className="chapter-card" style={{ display: "grid", gap: 10, marginBottom: 0, padding: 14 }}>
                  <h2 style={{ color: "var(--text-main)", fontFamily: "var(--font-serif)", fontSize: 20, margin: 0 }}>
                    Déclencheurs drainants
                  </h2>
                  {energyInsights.drainingTriggers.length ? (
                    <div style={{ display: "grid", gap: 7 }}>
                      {energyInsights.drainingTriggers.map((trigger) => (
                        <p className="editorial-body" key={trigger.trigger} style={{ margin: 0 }}>
                          <strong>{trigger.trigger}</strong> — intensité moyenne {trigger.averageIntensity}/10 · {trigger.count} fois
                        </p>
                      ))}
                    </div>
                  ) : (
                    <p className="editorial-body" style={{ margin: 0 }}>Aucun déclencheur drainant enregistré.</p>
                  )}
                </article>

                <article className="chapter-card" style={{ display: "grid", gap: 10, marginBottom: 0, padding: 14 }}>
                  <h2 style={{ color: "var(--text-main)", fontFamily: "var(--font-serif)", fontSize: 20, margin: 0 }}>
                    Déclencheurs apaisants
                  </h2>
                  {energyInsights.soothingTriggers.length ? (
                    <div style={{ display: "grid", gap: 7 }}>
                      {energyInsights.soothingTriggers.map((trigger) => (
                        <p className="editorial-body" key={trigger.trigger} style={{ margin: 0 }}>
                          <strong>{trigger.trigger}</strong> — intensité moyenne {trigger.averageIntensity}/10 · {trigger.count} fois
                        </p>
                      ))}
                    </div>
                  ) : (
                    <p className="editorial-body" style={{ margin: 0 }}>Aucun déclencheur apaisant enregistré.</p>
                  )}
                </article>
              </SystemGrid>

              {!energyInsights.drainingTriggers.length && !energyInsights.soothingTriggers.length ? (
                <p className="editorial-body" style={{ margin: 0 }}>
                  Ajoutez des déclencheurs dans le journal pour identifier ce qui impacte votre énergie.
                </p>
              ) : null}

              <article className="chapter-card" style={{ borderColor: "rgba(201,168,92,.34)", display: "grid", gap: 8, marginBottom: 0, padding: 14 }}>
                <h2 style={{ color: "var(--text-main)", fontFamily: "var(--font-serif)", fontSize: 20, margin: 0 }}>
                  Observation
                </h2>
                <p className="editorial-body" style={{ margin: 0 }}>{energyInsights.observation}</p>
              </article>
            </div>
          )}
        </SystemPanel>
          </>
        ) : null}

        {activeTab === "Vue d’ensemble" ? (
          <>
        <SystemPanel ariaLabel="Prochaine étape recommandée" compact>
          <SystemSectionHeader eyebrow="Prochaine étape" title="Recommandation" />
          <p className="editorial-body" style={{ margin: 0 }}>{recommendation}</p>
        </SystemPanel>
          </>
        ) : null}
      </SystemPageShell>

      {deleteConversationTarget ? (
        <div
          aria-label="Confirmation de suppression de conversation"
          aria-modal="true"
          role="dialog"
          style={{
            alignItems: "center",
            background: "rgba(0,0,0,.62)",
            display: "flex",
            inset: 0,
            justifyContent: "center",
            padding: 20,
            position: "fixed",
            zIndex: 80,
          }}
        >
          <div className="panel" style={{ maxWidth: 380, width: "100%" }}>
            <h2 style={{ color: "var(--text-main)", fontFamily: "var(--font-serif)", fontSize: 20, margin: "0 0 8px" }}>
              Supprimer cette conversation ?
            </h2>
            <p className="editorial-body" style={{ margin: "0 0 14px" }}>
              {deleteConversationTarget.titre?.trim() || "Conversation sans titre"}
            </p>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              <button className="internal-button-primary" onClick={confirmDeleteConversation} style={dashboardButtonStyle} type="button">
                Confirmer
              </button>
              <button className="internal-button" onClick={() => setDeleteConversationTarget(null)} style={dashboardButtonStyle} type="button">
                Annuler
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {deleteAnalysisTarget ? (
        <div
          aria-label="Confirmation de suppression d'analyse"
          aria-modal="true"
          role="dialog"
          style={{
            alignItems: "center",
            background: "rgba(0,0,0,.62)",
            display: "flex",
            inset: 0,
            justifyContent: "center",
            padding: 20,
            position: "fixed",
            zIndex: 80,
          }}
        >
          <div className="panel" style={{ maxWidth: 380, width: "100%" }}>
            <h2 style={{ color: "var(--text-main)", fontFamily: "var(--font-serif)", fontSize: 20, margin: "0 0 8px" }}>
              Supprimer cette analyse ?
            </h2>
            <p className="editorial-body" style={{ margin: "0 0 14px" }}>
              Analyse du {formatAnalysisDate(deleteAnalysisTarget.date)}
            </p>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              <button className="internal-button-primary" onClick={confirmDeleteAnalysis} style={dashboardButtonStyle} type="button">
                Confirmer
              </button>
              <button className="internal-button" onClick={() => setDeleteAnalysisTarget(null)} style={dashboardButtonStyle} type="button">
                Annuler
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {deleteDecisionTarget ? (
        <div
          aria-label="Confirmation de suppression de décision"
          aria-modal="true"
          role="dialog"
          style={{
            alignItems: "center",
            background: "rgba(0,0,0,.62)",
            display: "flex",
            inset: 0,
            justifyContent: "center",
            padding: 20,
            position: "fixed",
            zIndex: 80,
          }}
        >
          <div className="panel" style={{ maxWidth: 380, width: "100%" }}>
            <h2 style={{ color: "var(--text-main)", fontFamily: "var(--font-serif)", fontSize: 20, margin: "0 0 8px" }}>
              Supprimer cette décision ?
            </h2>
            <p className="editorial-body" style={{ margin: "0 0 14px" }}>{deleteDecisionTarget.intention}</p>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              <button className="internal-button-primary" onClick={confirmDeleteDecision} style={dashboardButtonStyle} type="button">
                Confirmer
              </button>
              <button className="internal-button" onClick={() => setDeleteDecisionTarget(null)} style={dashboardButtonStyle} type="button">
                Annuler
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {deleteJournalTarget ? (
        <div
          aria-label="Confirmation de suppression d'entrée de journal"
          aria-modal="true"
          role="dialog"
          style={{
            alignItems: "center",
            background: "rgba(0,0,0,.62)",
            display: "flex",
            inset: 0,
            justifyContent: "center",
            padding: 20,
            position: "fixed",
            zIndex: 80,
          }}
        >
          <div className="panel" style={{ maxWidth: 380, width: "100%" }}>
            <h2 style={{ color: "var(--text-main)", fontFamily: "var(--font-serif)", fontSize: 20, margin: "0 0 8px" }}>
              Supprimer cette entrée ?
            </h2>
            <p className="editorial-body" style={{ margin: "0 0 14px" }}>{deleteJournalTarget.emotion}</p>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              <button className="internal-button-primary" onClick={confirmDeleteJournalEntry} style={dashboardButtonStyle} type="button">
                Confirmer
              </button>
              <button className="internal-button" onClick={() => setDeleteJournalTarget(null)} style={dashboardButtonStyle} type="button">
                Annuler
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </main>
  );
}
