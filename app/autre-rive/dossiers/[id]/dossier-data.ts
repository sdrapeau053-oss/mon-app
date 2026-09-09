import {
  LEGACY_DOSSIER_STORAGE_KEY,
  type ConversationImportée,
  type ImportValidation,
  type LegacyRapportAnalyse,
} from "@/lib/autre-rive";

// Phase 8bis.4b — Conformité finale SR-D-001 (Décisions 1 et 4). Type
// strictement scopé à l'écran de détail d'un dossier et à son stockage
// legacy (clé "autre-rive-dossiers", importée depuis @/lib/autre-rive
// plutôt que redéfinie localement) : ce n'est PAS le type métier canonique
// RelationDossier, qui vit exclusivement dans lib/autre-rive/types.ts.
// Nommage explicite pour éviter toute confusion (SR-D-001, Décision 1 —
// propriété stricte des types métier). Renommage pur de l'ancien type local
// "RelationDossier" : aucun champ ajouté, retiré ou modifié.
export interface LegacyDossierDetailData {
  id: string;
  nom: string;
  statut: string;
  typeRelation?: string;
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

export interface RelationConversation {
  id: string;
  titre?: string;
  contenu: string;
  dateCreation: string;
  source?: string;
  dateConversation?: string;
}

export interface RelationAnalysis {
  date?: string;
  tonalite?: string;
  patterns?: string[];
  niveauTension?: string;
  observations?: string[];
}

export interface AnalyseConversation {
  id: string;
  date: string;
  tonalite: string;
  patterns: string[];
  niveauTension: string;
  observations: string[];
}

export interface Decision {
  id: string;
  date: string;
  situation: string;
  intention: string;
  optionChoisie: string;
  recommandation: string;
}

export interface EntreeJournal {
  id: string;
  date: string;
  evenement: string;
  emotion: string;
  intensite: number;
  declencheur?: string;
}

export type SectionKey =
  | "chronologie"
  | "preuves"
  | "analyse"
  | "indicateurs"
  | "rapports";

export type TimelineItem = {
  date: string;
  detail: string;
  label: string;
  tone: "neutral" | "success" | "warning";
};

export type ActionItem = {
  description: string;
  href?: string;
  id: string;
  label: string;
  target?: SectionKey;
};

export type RelatedSnapshot = {
  importedConversations: ConversationImportée[];
  rapports: LegacyRapportAnalyse[];
  validations: ImportValidation[];
};

export type AnalysisSnapshot = {
  date: string;
  detail: string;
  label: string;
  tone: "neutral" | "success" | "warning";
};

export const emotionOptions = [
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

export const intentionOptions = [
  "Continuer la relation",
  "Mettre la relation en pause",
  "Mettre fin à la relation",
  "Établir de nouvelles limites",
  "Demander une conversation",
  "Observer sans agir",
  "Prendre soin de moi d'abord",
];

export const situationOptions = [
  "Nous communiquons encore",
  "La communication est réduite",
  "Nous ne communiquons plus",
  "Je dois prendre une décision importante",
  "Je me sens confus(e) sur la relation",
  "La relation me fait du mal",
  "Je veux améliorer la relation",
  "Autre",
];

const intentionOptionMap: Record<string, string[]> = {
  "Continuer la relation": [
    "Exprimer clairement vos besoins",
    "Proposer un moment de dialogue structuré",
    "Observer l'évolution sur 2 semaines",
  ],
  "Demander une conversation": [
    "Choisir un moment calme",
    "Préparer 2 ou 3 points essentiels",
    "Écouter sans interrompre",
  ],
  "Établir de nouvelles limites": [
    "Identifier la limite la plus urgente",
    "Formuler la limite en une phrase simple",
    "Choisir le moment pour l'exprimer",
  ],
  "Mettre fin à la relation": [
    "Préparer un message clair et sobre",
    "Choisir le bon moment et le bon canal",
    "Anticiper les réactions possibles",
  ],
  "Mettre la relation en pause": [
    "Informer l'autre de votre besoin d'espace",
    "Définir une durée approximative",
    "Utiliser ce temps pour clarifier vos besoins",
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

export function createEntityId(prefix: string) {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return `${prefix}-${crypto.randomUUID()}`;
  }

  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function isLegacyDossierDetailData(value: unknown): value is LegacyDossierDetailData {
  if (!value || typeof value !== "object") return false;
  const item = value as Partial<LegacyDossierDetailData>;
  return (
    typeof item.id === "string" &&
    typeof item.nom === "string" &&
    typeof item.statut === "string" &&
    typeof item.dateCreation === "string"
  );
}

export function readLegacyDossierDetails(): LegacyDossierDetailData[] {
  if (typeof window === "undefined") return [];

  try {
    const raw = window.localStorage.getItem(LEGACY_DOSSIER_STORAGE_KEY);
    const data: unknown = raw ? JSON.parse(raw) : [];
    return Array.isArray(data) ? data.filter(isLegacyDossierDetailData) : [];
  } catch {
    return [];
  }
}

export function saveLegacyDossierDetails(dossiers: LegacyDossierDetailData[]) {
  try {
    window.localStorage.setItem(LEGACY_DOSSIER_STORAGE_KEY, JSON.stringify(dossiers));
  } catch {
    return;
  }
}

export function getConversations(dossier: LegacyDossierDetailData) {
  return Array.isArray(dossier.conversations) ? dossier.conversations : [];
}

export function getAnalyses(dossier: LegacyDossierDetailData) {
  return Array.isArray(dossier.analyses)
    ? [...dossier.analyses].sort((a, b) => b.date.localeCompare(a.date))
    : [];
}

export function getDecisions(dossier: LegacyDossierDetailData) {
  return Array.isArray(dossier.decisions)
    ? [...dossier.decisions].sort((a, b) => b.date.localeCompare(a.date))
    : [];
}

export function getJournal(dossier: LegacyDossierDetailData) {
  return Array.isArray(dossier.journal)
    ? [...dossier.journal].sort((a, b) => b.date.localeCompare(a.date))
    : [];
}

export function formatDate(value?: string) {
  if (!value) return "Date inconnue";

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;

  return new Intl.DateTimeFormat("fr-CA", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(parsed);
}

export function formatRelativeDate(value?: string) {
  if (!value) return "Aucune activité";

  const timestamp = new Date(value).getTime();
  if (!Number.isFinite(timestamp)) return value;

  const days = Math.floor((Date.now() - timestamp) / (1000 * 60 * 60 * 24));
  if (days <= 0) return "Aujourd'hui";
  if (days === 1) return "Hier";
  if (days < 30) return `Il y a ${days} jours`;
  return formatDate(value);
}

export function formatPeriod(start: string, end?: string) {
  const startDate = new Date(start);
  const endDate = new Date(end || Date.now());
  if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) {
    return "Période à préciser";
  }

  const months =
    (endDate.getFullYear() - startDate.getFullYear()) * 12 +
    endDate.getMonth() -
    startDate.getMonth();
  if (months <= 1) return "Moins de 2 mois";
  if (months < 12) return `${months} mois`;
  const years = Math.floor(months / 12);
  return years === 1 ? "1 an" : `${years} ans`;
}

export function summarizeText(value: string, max = 180) {
  const compact = value.replace(/\s+/g, " ").trim();
  if (!compact) return "";
  return compact.length <= max ? compact : `${compact.slice(0, max).trim()}...`;
}

export function getDecisionOptions(intention: string) {
  return intentionOptionMap[intention] || [];
}

export function getDecisionRecommendation(dossier: LegacyDossierDetailData) {
  if (typeof dossier.niveauSecurite === "number" && dossier.niveauSecurite <= 3) {
    return "Prioriser la sécurité et ralentir toute décision prise sous pression.";
  }
  if (dossier.derniereAnalyse?.niveauTension === "Élevé") {
    return "Reporter les conversations sensibles jusqu'à un moment plus stable.";
  }
  if (typeof dossier.niveauClarte === "number" && dossier.niveauClarte <= 3) {
    return "Clarifier les faits avant de trancher.";
  }
  return "S'appuyer sur les faits déjà observés et avancer par petites décisions.";
}

export function getClarityLabel(dossier: LegacyDossierDetailData, rapports: LegacyRapportAnalyse[]) {
  if (typeof dossier.niveauClarte === "number") {
    if (dossier.niveauClarte <= 3) return "Clarté faible";
    if (dossier.niveauClarte <= 6) return "Clarté partielle";
    return "Clarté solide";
  }
  if (rapports.some((rapport) => rapport.certitudeGlobale === "élevé")) return "Clarté en consolidation";
  return "Clarté à construire";
}

export function getRiskLabel(dossier: LegacyDossierDetailData, rapports: LegacyRapportAnalyse[]) {
  const redFlags = rapports.reduce((total, rapport) => total + rapport.redFlags.length, 0);
  if (typeof dossier.niveauSecurite === "number" && dossier.niveauSecurite <= 3) return "Vigilance élevée";
  if (dossier.derniereAnalyse?.niveauTension === "Élevé" || redFlags >= 3) return "Vigilance active";
  if (typeof dossier.niveauSecurite === "number" && dossier.niveauSecurite >= 7 && redFlags === 0) return "Vigilance faible";
  return "Vigilance à préciser";
}

export function getCurrentDynamic(
  dossier: LegacyDossierDetailData,
  rapports: LegacyRapportAnalyse[],
  journal: EntreeJournal[],
) {
  const latestPatterns = dossier.derniereAnalyse?.patterns || getAnalyses(dossier)[0]?.patterns || [];
  if (latestPatterns.length > 0) return latestPatterns[0];
  if (rapports[0]?.redFlags.length) return rapports[0].redFlags[0];
  if (rapports[0]?.greenFlags.length) return rapports[0].greenFlags[0];
  if (journal[0]) return `Dominante récente : ${journal[0].emotion}`;
  return "Dossier en observation";
}

export function getTimelineItems(
  dossier: LegacyDossierDetailData,
  related: RelatedSnapshot,
): TimelineItem[] {
  const localConversations = getConversations(dossier).map((conversation) => ({
    date: conversation.dateConversation || conversation.dateCreation,
    detail: conversation.titre?.trim() || summarizeText(conversation.contenu, 110) || "Preuve ajoutée",
    label: "Preuve ajoutée",
    tone: "neutral" as const,
  }));
  const imports = related.importedConversations.map((conversation) => ({
    date: conversation.dateModification || conversation.dateImport,
    detail: `${conversation.nomFichier} · ${conversation.nombreMessages} message(s)`,
    label: "Import relationnel",
    tone: conversation.prêtPourAnalyse ? ("success" as const) : ("warning" as const),
  }));
  const analyses = getAnalyses(dossier).map((analysis) => ({
    date: analysis.date,
    detail: `${analysis.tonalite} · tension ${analysis.niveauTension.toLowerCase()}`,
    label: "Analyse enregistrée",
    tone: analysis.niveauTension === "Élevé" ? ("warning" as const) : ("success" as const),
  }));
  const rapports = related.rapports.map((rapport) => ({
    date: rapport.dateAnalyse,
    detail: rapport.résumé || `${rapport.redFlags.length} point(s) de vigilance`,
    label: "Rapport généré",
    tone: rapport.redFlags.length > rapport.greenFlags.length ? ("warning" as const) : ("success" as const),
  }));
  const decisions = getDecisions(dossier).map((decision) => ({
    date: decision.date,
    detail: `${decision.intention} · ${decision.optionChoisie}`,
    label: "Décision documentée",
    tone: "neutral" as const,
  }));
  const journal = getJournal(dossier).map((entry) => ({
    date: entry.date,
    detail: `${entry.emotion} · ${summarizeText(entry.evenement, 90)}`,
    label: "Événement noté",
    tone: entry.intensite >= 7 ? ("warning" as const) : ("neutral" as const),
  }));

  return [...imports, ...localConversations, ...analyses, ...rapports, ...decisions, ...journal].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
  );
}

export function getComparisonInsight(timeline: TimelineItem[]) {
  const now = Date.now();
  const last30 = timeline.filter((item) => now - new Date(item.date).getTime() <= 30 * 24 * 60 * 60 * 1000).length;
  const previous30 = timeline.filter((item) => {
    const diff = now - new Date(item.date).getTime();
    return diff > 30 * 24 * 60 * 60 * 1000 && diff <= 60 * 24 * 60 * 60 * 1000;
  }).length;
  if (last30 === 0 && previous30 === 0) return "Pas assez d'historique pour comparer deux périodes.";
  if (last30 > previous30) return `Activité plus dense récemment (${last30} vs ${previous30}).`;
  if (last30 < previous30) return `Activité plus calme récemment (${last30} vs ${previous30}).`;
  return `Rythme stable entre les deux périodes (${last30} vs ${previous30}).`;
}

export function getProofStats(
  dossier: LegacyDossierDetailData,
  related: RelatedSnapshot,
) {
  const localProofs = getConversations(dossier);
  const validationsPending = related.validations.filter(
    (validation) => !validation.complète && validation.messagesRestantsRouge > 0,
  ).length;

  return {
    importedCount: related.importedConversations.length,
    localCount: localProofs.length,
    reportCount: related.rapports.length,
    total: related.importedConversations.length + localProofs.length,
    validationPending: validationsPending,
  };
}

export function getLatestAnalysisSnapshot(
  dossier: LegacyDossierDetailData,
  rapports: LegacyRapportAnalyse[],
): AnalysisSnapshot | null {
  const latestLocal = getAnalyses(dossier)[0];
  const latestRapport = [...rapports].sort((a, b) => b.dateAnalyse.localeCompare(a.dateAnalyse))[0];
  if (!latestLocal && !latestRapport && !dossier.derniereAnalyse) return null;

  const localDate = latestLocal?.date || dossier.derniereAnalyse?.date || "";
  const reportDate = latestRapport?.dateAnalyse || "";
  if (reportDate && (!localDate || reportDate > localDate)) {
    return {
      date: reportDate,
      detail: latestRapport.résumé || "Rapport disponible",
      label: "Rapport relationnel",
      tone: latestRapport.redFlags.length > latestRapport.greenFlags.length ? "warning" : "success",
    };
  }

  const latest = latestLocal || dossier.derniereAnalyse;
  return latest
    ? {
        date: latest.date || "",
        detail: `${latest.tonalite || "Lecture locale"} · tension ${(latest.niveauTension || "non évaluée").toLowerCase()}`,
        label: "Analyse actuelle",
        tone: latest.niveauTension === "Élevé" ? "warning" : "neutral",
      }
    : null;
}

export function getRecommendedActions(
  dossier: LegacyDossierDetailData,
  related: RelatedSnapshot,
): ActionItem[] {
  const localProofs = getConversations(dossier);
  const analyses = getAnalyses(dossier);
  const journal = getJournal(dossier);
  const actions: ActionItem[] = [];

  if (related.importedConversations.length + localProofs.length === 0) {
    actions.push({
      description: "Aucune preuve n'est encore attachée au dossier.",
      id: "preuves",
      label: "Ajouter une preuve",
      target: "preuves",
    });
  }
  if (related.validations.some((validation) => !validation.complète && validation.messagesRestantsRouge > 0)) {
    actions.push({
      description: "Certaines preuves demandent encore une validation humaine.",
      id: "validation",
      label: "Reprendre les preuves",
      target: "preuves",
    });
  }
  if (!related.rapports.length && (related.importedConversations.length > 0 || localProofs.length > 0)) {
    actions.push({
      description: "Le dossier contient des preuves mais aucun rapport synthétique récent.",
      href: `/autre-rive/analyse-conversation?dossier=${encodeURIComponent(dossier.id)}`,
      id: "analyse",
      label: "Lancer une analyse",
    });
  }
  if (!dossier.notes?.trim()) {
    actions.push({
      description: "Ajoutez un résumé court pour rendre le dossier immédiatement lisible.",
      id: "resume",
      label: "Modifier le résumé",
      target: "indicateurs",
    });
  }
  if (!journal.length) {
    actions.push({
      description: "Documentez un événement majeur pour ancrer la relation dans le temps.",
      id: "historique",
      label: "Consulter l'historique",
      target: "chronologie",
    });
  }

  return actions.slice(0, 3);
}
