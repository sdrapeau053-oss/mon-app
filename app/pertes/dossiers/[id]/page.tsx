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

type TabKey = "overview" | "map" | "evolution" | "priorities" | "anchors" | "recap" | "review" | "balance" | "lost" | "timeline" | "journal" | "memory";
type MemoireField = keyof PerteMemoireVivante;

interface PerteDossier {
  id: string;
  titre: string;
  typePerte: string;
  personneOuSituation?: string;
  dateDebut?: string;
  intensiteActuelle?: number;
  notes?: string;
  pertesSecondaires?: string[];
  pertesAssociees?: string[];
  timeline?: PerteTimelineEvent[];
  journal?: PerteJournalEntry[];
  memoireVivante?: PerteMemoireVivante;
  prochaineEtape?: string;
  dateCreation: string;
}

interface PerteTimelineEvent {
  id: string;
  date?: string;
  titre: string;
  type: string;
  intensite?: number;
  note?: string;
}

interface PerteJournalEntry {
  id: string;
  date: string;
  emotion: string;
  intensite: number;
  declencheur?: string;
  texte: string;
}

interface PerteMemoireVivante {
  souvenirs: string[];
  phrases: string[];
  lieux: string[];
  objets: string[];
  ceQuiReste: string[];
}

const STORAGE_KEY = "pertes-humaines-dossiers";

const tabs: { key: TabKey; label: string }[] = [
  { key: "overview", label: "Vue d'ensemble" },
  { key: "map", label: "Cartographie" },
  { key: "evolution", label: "Évolution" },
  { key: "priorities", label: "Priorités" },
  { key: "anchors", label: "Ancrages" },
  { key: "recap", label: "Récapitulatif" },
  { key: "review", label: "À relire" },
  { key: "balance", label: "Bilan" },
  { key: "lost", label: "Ce que j'ai perdu" },
  { key: "timeline", label: "Timeline" },
  { key: "journal", label: "Journal" },
  { key: "memory", label: "Mémoire" },
];

const dashboardButtonStyle = {
  alignItems: "center",
  borderRadius: 999,
  display: "inline-flex",
  fontSize: 12.5,
  justifyContent: "center",
  lineHeight: 1,
  minHeight: 36,
  padding: "8px 13px",
  textAlign: "center",
  whiteSpace: "nowrap",
} as const;

const dashboardFieldStyle = { display: "grid", gap: 4 } as const;
const dashboardControlStyle = {
  boxSizing: "border-box",
  fontSize: 13,
  minHeight: 36,
  padding: "6px 10px",
  width: "100%",
} as const;

const memoireFieldOptions: { value: MemoireField; label: string }[] = [
  { value: "souvenirs", label: "Souvenir" },
  { value: "phrases", label: "Phrase" },
  { value: "lieux", label: "Lieu" },
  { value: "objets", label: "Objet" },
  { value: "ceQuiReste", label: "Ce qui reste" },
];

const typePerteOptions = [
  "Personne décédée",
  "Personne encore vivante mais changée",
  "Relation",
  "Santé",
  "Sécurité",
  "Enfance",
  "Futur imaginé",
  "Famille",
  "Identité",
  "Croyance ou vérité",
  "Plusieurs pertes en même temps",
  "Autre",
];

const pertesSecondairesOptions = [
  "Deuil du futur",
  "Deuil relationnel",
  "Deuil identitaire",
  "Deuil moral",
  "Deuil ambigu",
  "Deuil anticipé",
  "Deuil cumulatif",
  "Deuil traumatique",
  "Deuil de sécurité",
  "Deuil de l'enfance",
];

function isPerteDossier(value: unknown): value is PerteDossier {
  if (!value || typeof value !== "object") return false;
  const item = value as Partial<PerteDossier>;
  return (
    typeof item.id === "string" &&
    typeof item.titre === "string" &&
    typeof item.typePerte === "string" &&
    typeof item.dateCreation === "string"
  );
}

function readDossiers(): PerteDossier[] {
  if (typeof window === "undefined") return [];

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.filter(isPerteDossier) : [];
  } catch {
    return [];
  }
}

function writeDossiers(dossiers: PerteDossier[]) {
  if (typeof window === "undefined") return;

  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(dossiers));
  } catch {
    return;
  }
}

function createId(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function formatDateFr(date?: string) {
  if (!date) return "";

  try {
    const parsed = new Date(date);
    if (!Number.isFinite(parsed.getTime())) return date;
    return parsed.toLocaleDateString("fr-CA", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  } catch {
    return date;
  }
}

function getDateTimestamp(date?: string) {
  if (!date) return null;

  try {
    const parsed = new Date(date);
    return Number.isFinite(parsed.getTime()) ? parsed.getTime() : null;
  } catch {
    return null;
  }
}

function arrayHasItems(values?: string[]) {
  return Array.isArray(values) && values.length > 0;
}

function getMemoireItems(memoire?: PerteMemoireVivante) {
  if (!memoire) return [];

  return [
    { field: "souvenirs" as const, label: "Souvenirs", values: Array.isArray(memoire.souvenirs) ? memoire.souvenirs : [] },
    { field: "phrases" as const, label: "Phrases", values: Array.isArray(memoire.phrases) ? memoire.phrases : [] },
    { field: "lieux" as const, label: "Lieux", values: Array.isArray(memoire.lieux) ? memoire.lieux : [] },
    { field: "objets" as const, label: "Objets", values: Array.isArray(memoire.objets) ? memoire.objets : [] },
    { field: "ceQuiReste" as const, label: "Ce qui reste", values: Array.isArray(memoire.ceQuiReste) ? memoire.ceQuiReste : [] },
  ];
}

function createEmptyMemoire(): PerteMemoireVivante {
  return {
    souvenirs: [],
    phrases: [],
    lieux: [],
    objets: [],
    ceQuiReste: [],
  };
}

function getNextAction(dossier: PerteDossier) {
  if (dossier.prochaineEtape?.trim()) {
    return dossier.prochaineEtape.trim();
  }
  if (!arrayHasItems(dossier.pertesAssociees)) {
    return "Explorer ce que cette perte a emporté avec elle.";
  }
  if (!Array.isArray(dossier.timeline) || dossier.timeline.length === 0) {
    return "Ajouter un premier événement à la timeline.";
  }
  if (!Array.isArray(dossier.journal) || dossier.journal.length === 0) {
    return "Ajouter une première entrée journal.";
  }
  return "Continuer à documenter cette perte à votre rythme.";
}

function formatExportList(values: string[]) {
  return values.length > 0 ? values.map((value) => `- ${value}`).join("\n") : "- Aucun élément";
}

export default function PerteDossierDetailPage() {
  const params = useParams<{ id: string }>();
  const [dossier, setDossier] = useState<PerteDossier | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [activeTab, setActiveTab] = useState<TabKey>("overview");
  const [toast, setToast] = useState("");
  const [perteAssocieeDraft, setPerteAssocieeDraft] = useState("");
  const [perteAssocieeError, setPerteAssocieeError] = useState("");
  const [timelineTitle, setTimelineTitle] = useState("");
  const [timelineDate, setTimelineDate] = useState("");
  const [timelineType, setTimelineType] = useState("");
  const [timelineIntensity, setTimelineIntensity] = useState(5);
  const [timelineNote, setTimelineNote] = useState("");
  const [timelineError, setTimelineError] = useState("");
  const [journalEmotion, setJournalEmotion] = useState("");
  const [journalIntensity, setJournalIntensity] = useState(5);
  const [journalTrigger, setJournalTrigger] = useState("");
  const [journalText, setJournalText] = useState("");
  const [journalError, setJournalError] = useState("");
  const [memoireField, setMemoireField] = useState<MemoireField>("souvenirs");
  const [memoireText, setMemoireText] = useState("");
  const [memoireError, setMemoireError] = useState("");
  const [mainEditOpen, setMainEditOpen] = useState(false);
  const [editTitre, setEditTitre] = useState("");
  const [editTypePerte, setEditTypePerte] = useState("");
  const [editPersonneOuSituation, setEditPersonneOuSituation] = useState("");
  const [editDateDebut, setEditDateDebut] = useState("");
  const [editIntensiteActuelle, setEditIntensiteActuelle] = useState(5);
  const [editPertesSecondaires, setEditPertesSecondaires] = useState<string[]>([]);
  const [editNotes, setEditNotes] = useState("");
  const [editProchaineEtape, setEditProchaineEtape] = useState("");
  const [mainEditError, setMainEditError] = useState("");

  useEffect(() => {
    const dossiers = readDossiers();
    setDossier(dossiers.find((item) => item.id === params.id) || null);
    setLoaded(true);
  }, [params.id]);

  const memoireItems = useMemo(() => getMemoireItems(dossier?.memoireVivante), [dossier?.memoireVivante]);
  const hasMemoire = memoireItems.some((item) => arrayHasItems(item.values));

  function showToast(message: string) {
    setToast(message);
    window.setTimeout(() => setToast(""), 2200);
  }

  function updateCurrentDossier(updater: (current: PerteDossier) => PerteDossier, message: string) {
    if (!dossier) return;

    const dossiers = readDossiers();
    let updatedDossier: PerteDossier | null = null;
    const nextDossiers = dossiers.map((item) => {
      if (item.id !== dossier.id) return item;
      updatedDossier = updater(item);
      return updatedDossier;
    });

    if (!updatedDossier) return;
    writeDossiers(nextDossiers);
    setDossier(updatedDossier);
    showToast(message);
  }

  function openMainEdit() {
    if (!dossier) return;
    setEditTitre(dossier.titre);
    setEditTypePerte(dossier.typePerte);
    setEditPersonneOuSituation(dossier.personneOuSituation || "");
    setEditDateDebut(dossier.dateDebut || "");
    setEditIntensiteActuelle(typeof dossier.intensiteActuelle === "number" ? dossier.intensiteActuelle : 5);
    setEditPertesSecondaires(Array.isArray(dossier.pertesSecondaires) ? dossier.pertesSecondaires : []);
    setEditNotes(dossier.notes || "");
    setEditProchaineEtape(dossier.prochaineEtape || "");
    setMainEditError("");
    setMainEditOpen(true);
  }

  function cancelMainEdit() {
    setMainEditOpen(false);
    setMainEditError("");
  }

  function toggleEditPerteSecondaire(value: string) {
    setEditPertesSecondaires((current) =>
      current.includes(value)
        ? current.filter((item) => item !== value)
        : [...current, value],
    );
  }

  function saveMainInfo() {
    if (!editTitre.trim()) {
      setMainEditError("Veuillez nommer cette perte.");
      return;
    }
    if (!editTypePerte.trim()) {
      setMainEditError("Veuillez choisir un type de perte.");
      return;
    }

    updateCurrentDossier((current) => ({
      ...current,
      titre: editTitre.trim(),
      typePerte: editTypePerte,
      personneOuSituation: editPersonneOuSituation.trim() || undefined,
      dateDebut: editDateDebut.trim() || undefined,
      intensiteActuelle: editIntensiteActuelle,
      pertesSecondaires: editPertesSecondaires,
      notes: editNotes.trim() || undefined,
      prochaineEtape: editProchaineEtape.trim() || undefined,
    }), "Informations principales sauvegardées.");
    setMainEditOpen(false);
    setMainEditError("");
  }

  function addPerteAssociee() {
    const value = perteAssocieeDraft.trim();
    if (!value) {
      setPerteAssocieeError("Veuillez nommer ce qui a été perdu.");
      return;
    }

    updateCurrentDossier((current) => ({
      ...current,
      pertesAssociees: [...(Array.isArray(current.pertesAssociees) ? current.pertesAssociees : []), value],
    }), "Perte associée ajoutée.");
    setPerteAssocieeDraft("");
    setPerteAssocieeError("");
  }

  function addTimelineEvent() {
    if (!timelineTitle.trim() || !timelineType.trim()) {
      setTimelineError("Veuillez indiquer un titre et un type.");
      return;
    }

    const event: PerteTimelineEvent = {
      id: createId("timeline"),
      date: timelineDate.trim() || undefined,
      titre: timelineTitle.trim(),
      type: timelineType.trim(),
      intensite: timelineIntensity,
      note: timelineNote.trim() || undefined,
    };

    updateCurrentDossier((current) => ({
      ...current,
      timeline: [event, ...(Array.isArray(current.timeline) ? current.timeline : [])],
    }), "Événement ajouté à la timeline.");
    setTimelineTitle("");
    setTimelineDate("");
    setTimelineType("");
    setTimelineIntensity(5);
    setTimelineNote("");
    setTimelineError("");
  }

  function addJournalEntry() {
    if (!journalEmotion.trim() || !journalText.trim()) {
      setJournalError("Veuillez indiquer une émotion et un texte.");
      return;
    }

    const entry: PerteJournalEntry = {
      id: createId("journal"),
      date: new Date().toISOString(),
      emotion: journalEmotion.trim(),
      intensite: journalIntensity,
      declencheur: journalTrigger.trim() || undefined,
      texte: journalText.trim(),
    };

    updateCurrentDossier((current) => ({
      ...current,
      journal: [entry, ...(Array.isArray(current.journal) ? current.journal : [])],
    }), "Entrée journal ajoutée.");
    setJournalEmotion("");
    setJournalIntensity(5);
    setJournalTrigger("");
    setJournalText("");
    setJournalError("");
  }

  function addMemoireItem() {
    const value = memoireText.trim();
    if (!value) {
      setMemoireError("Veuillez écrire un élément à conserver.");
      return;
    }

    updateCurrentDossier((current) => {
      const memoire = { ...createEmptyMemoire(), ...(current.memoireVivante || {}) };
      const currentValues = Array.isArray(memoire[memoireField]) ? memoire[memoireField] : [];
      return {
        ...current,
        memoireVivante: {
          ...memoire,
          [memoireField]: [...currentValues, value],
        },
      };
    }, "Élément de mémoire ajouté.");
    setMemoireText("");
    setMemoireError("");
  }

  function deletePerteAssociee(indexToDelete: number) {
    updateCurrentDossier((current) => ({
      ...current,
      pertesAssociees: (Array.isArray(current.pertesAssociees) ? current.pertesAssociees : []).filter((_, index) => index !== indexToDelete),
    }), "Perte associée supprimée.");
  }

  function deleteTimelineEvent(id: string) {
    updateCurrentDossier((current) => ({
      ...current,
      timeline: (Array.isArray(current.timeline) ? current.timeline : []).filter((event) => event.id !== id),
    }), "Événement supprimé.");
  }

  function deleteJournalEntry(id: string) {
    updateCurrentDossier((current) => ({
      ...current,
      journal: (Array.isArray(current.journal) ? current.journal : []).filter((entry) => entry.id !== id),
    }), "Entrée journal supprimée.");
  }

  function deleteMemoireItem(field: MemoireField, indexToDelete: number) {
    updateCurrentDossier((current) => {
      const memoire = { ...createEmptyMemoire(), ...(current.memoireVivante || {}) };
      const currentValues = Array.isArray(memoire[field]) ? memoire[field] : [];
      return {
        ...current,
        memoireVivante: {
          ...memoire,
          [field]: currentValues.filter((_, index) => index !== indexToDelete),
        },
      };
    }, "Élément de mémoire supprimé.");
  }

  async function copyDossierExport() {
    if (!dossier) return;

    const currentTimeline = Array.isArray(dossier.timeline) ? dossier.timeline : [];
    const currentJournal = Array.isArray(dossier.journal) ? dossier.journal : [];
    const currentPertesAssociees = Array.isArray(dossier.pertesAssociees) ? dossier.pertesAssociees : [];
    const currentPertesSecondaires = Array.isArray(dossier.pertesSecondaires) ? dossier.pertesSecondaires : [];
    const currentMemoireItems = getMemoireItems(dossier.memoireVivante);
    const exportText = [
      "DOSSIER DE PERTE HUMAINE",
      "",
      `Titre : ${dossier.titre}`,
      `Type : ${dossier.typePerte}`,
      `Personne/situation : ${dossier.personneOuSituation || "Non précisé"}`,
      `Date/période : ${dossier.dateDebut || "Non précisée"}`,
      `Intensité : ${typeof dossier.intensiteActuelle === "number" ? `${dossier.intensiteActuelle}/10` : "Non évaluée"}`,
      "",
      "PERTES SECONDAIRES",
      formatExportList(currentPertesSecondaires),
      "",
      "NOTES INITIALES",
      dossier.notes?.trim() ? dossier.notes.trim() : "Aucune note initiale",
      "",
      "PROCHAINE ÉTAPE",
      getNextAction(dossier),
      "",
      "PERTES ASSOCIÉES",
      formatExportList(currentPertesAssociees),
      "",
      "TIMELINE",
      currentTimeline.length > 0
        ? currentTimeline.map((event) => [
            `- ${event.titre}`,
            `  Date : ${event.date || "Non précisée"}`,
            `  Type : ${event.type}`,
            `  Intensité : ${typeof event.intensite === "number" ? `${event.intensite}/10` : "Non évaluée"}`,
            `  Note : ${event.note || "Aucune note"}`,
          ].join("\n")).join("\n")
        : "- Aucun événement",
      "",
      "JOURNAL",
      currentJournal.length > 0
        ? currentJournal.map((entry) => [
            `- ${formatDateFr(entry.date)}`,
            `  Émotion : ${entry.emotion}`,
            `  Intensité : ${entry.intensite}/10`,
            `  Déclencheur : ${entry.declencheur || "Non précisé"}`,
            `  Texte : ${entry.texte}`,
          ].join("\n")).join("\n")
        : "- Aucune entrée",
      "",
      "MÉMOIRE VIVANTE",
      currentMemoireItems.map((item) => `${item.label} :\n${formatExportList(item.values)}`).join("\n\n"),
    ].join("\n");

    await navigator.clipboard.writeText(exportText);
    showToast("Dossier copié dans le presse-papiers.");
  }

  async function copyBalanceExport() {
    if (!dossier) return;

    const exportText = [
      "BILAN DU DOSSIER DE PERTE",
      "",
      `Titre : ${dossier.titre}`,
      `Type : ${dossier.typePerte}`,
      `Personne/situation : ${dossier.personneOuSituation || "Non précisé"}`,
      `Date/période : ${dossier.dateDebut || "Non précisée"}`,
      `Intensité : ${typeof dossier.intensiteActuelle === "number" ? `${dossier.intensiteActuelle}/10` : "Non évaluée"}`,
      "",
      "RÉSUMÉ DU DOSSIER",
      `${dossierStatus} · Complétion ${completionLevel}%`,
      intensitySummary,
      "",
      "LECTURE ÉMOTIONNELLE",
      `Charge émotionnelle : ${emotionalChargeLabel}`,
      emotionalChargeText,
      `Densité du dossier : ${dossierDensityLabel}`,
      dossierDensityText,
      "",
      "REPÈRE DE PROGRESSION",
      progressionStatus,
      progressionText,
      "",
      "FIL CONDUCTEUR",
      guidingThread,
      guidingThreadText,
      "",
      "COMPTEURS GLOBAUX",
      `Pertes associées : ${pertesAssociees.length}`,
      `Événements timeline : ${timeline.length}`,
      `Entrées journal : ${journal.length}`,
      `Éléments mémoire : ${memoireCount}`,
      `Total éléments : ${totalDossierElements}`,
      "",
      "PROCHAINE ÉTAPE",
      getNextAction(dossier),
    ].join("\n");

    await navigator.clipboard.writeText(exportText);
    showToast("Bilan copié dans le presse-papiers.");
  }

  async function copyRecapExport() {
    if (!dossier) return;

    const exportText = [
      "RÉCAPITULATIF DU DOSSIER DE PERTE",
      "",
      "INFORMATIONS PRINCIPALES",
      `Titre : ${dossier.titre}`,
      `Type : ${dossier.typePerte}`,
      `Personne/situation : ${dossier.personneOuSituation || "Non précisé"}`,
      `Date/période : ${dossier.dateDebut || "Non précisée"}`,
      `Intensité : ${typeof dossier.intensiteActuelle === "number" ? `${dossier.intensiteActuelle}/10` : "Non évaluée"}`,
      `Créé le : ${formatDateFr(dossier.dateCreation)}`,
      "",
      "SYNTHÈSE DU DOSSIER",
      `${dossierStatus} · Complétion ${completionLevel}%`,
      intensitySummary,
      "",
      "LECTURE ÉMOTIONNELLE",
      `Charge émotionnelle : ${emotionalChargeLabel}`,
      emotionalChargeText,
      `Densité du dossier : ${dossierDensityLabel}`,
      dossierDensityText,
      "",
      "REPÈRE DE PROGRESSION",
      progressionStatus,
      progressionText,
      "",
      "FIL CONDUCTEUR",
      guidingThread,
      guidingThreadText,
      "",
      "PERTES SECONDAIRES",
      formatExportList(pertesSecondaires),
      "",
      "PERTES ASSOCIÉES",
      formatExportList(pertesAssociees),
      "",
      "TIMELINE",
      timeline.length > 0
        ? timeline.map((event) => [
            `- ${event.titre}`,
            `  Date : ${event.date || "Non précisée"}`,
            `  Type : ${event.type}`,
            `  Intensité : ${typeof event.intensite === "number" ? `${event.intensite}/10` : "Non évaluée"}`,
            `  Note : ${event.note || "Aucune note"}`,
          ].join("\n")).join("\n")
        : "- Aucun événement",
      "",
      "JOURNAL",
      journal.length > 0
        ? journal.map((entry) => [
            `- ${formatDateFr(entry.date)}`,
            `  Émotion : ${entry.emotion}`,
            `  Intensité : ${entry.intensite}/10`,
            `  Déclencheur : ${entry.declencheur || "Non précisé"}`,
            `  Texte : ${entry.texte}`,
          ].join("\n")).join("\n")
        : "- Aucune entrée",
      "",
      "MÉMOIRE VIVANTE",
      memoireItems.map((item) => `${item.label} :\n${formatExportList(item.values)}`).join("\n\n"),
      "",
      "ANCRAGES",
      `Ce qui reste vivant : ${recentMemoireItems.length > 0 ? recentMemoireItems.map((item) => `${item.label} — ${item.value}`).join(" | ") : "Aucun élément récent"}`,
      `Ce qui peut soutenir : ${pertesAssociees.length > 0 ? pertesAssociees.join(", ") : "Aucune perte associée nommée"}`,
      `Ce qui demande douceur : ${dossier.notes?.trim() ? dossier.notes.trim() : intensitySummary}`,
      `Prochain geste simple : ${currentDirection}`,
      "",
      "PRIORITÉS",
      `À traiter maintenant : ${currentDirection}`,
      `À relire bientôt : ${recentJournalEntries.length > 0 ? recentJournalEntries.map((entry) => `${formatDateFr(entry.date)} — ${entry.emotion}`).join(" | ") : "Aucune entrée journal récente"}`,
      `À garder en mémoire : ${recentMemoireItems.length > 0 ? recentMemoireItems.map((item) => `${item.label} — ${item.value}`).join(" | ") : "Aucun élément mémoire récent"}`,
      "",
      "PROCHAINE ÉTAPE",
      currentDirection,
    ].join("\n");

    await navigator.clipboard.writeText(exportText);
    showToast("Récapitulatif copié dans le presse-papiers.");
  }

  if (!loaded) {
    return (
      <main className="internal-page">
        <SystemPageShell maxWidth={900} padding="24px 18px 56px">
          <SystemPanel ariaLabel="Chargement" compact>
            <p className="editorial-body" style={{ margin: 0 }}>Chargement du dossier...</p>
          </SystemPanel>
        </SystemPageShell>
      </main>
    );
  }

  if (!dossier) {
    return (
      <main className="internal-page">
        <SystemPageShell maxWidth={900} padding="24px 18px 56px">
          <header className="internal-header">
            <BackLink href="/pertes/dossiers" label="Retour aux dossiers" />
            <p className="internal-kicker">Pertes humaines</p>
            <h1 className="internal-title" style={{ fontStyle: "italic" }}>Dossier introuvable</h1>
          </header>
          <SystemPanel ariaLabel="Dossier introuvable" compact>
            <p className="editorial-body" style={{ margin: "0 0 14px" }}>
              Impossible de retrouver ce dossier dans les données locales. Il a peut-être été supprimé ou n&apos;a pas encore été créé sur cet appareil.
            </p>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              <Link className="internal-button-primary" href="/pertes/dossiers" style={dashboardButtonStyle}>
                Retour aux dossiers
              </Link>
              <Link className="internal-button" href="/pertes/cartographie" style={dashboardButtonStyle}>
                Créer un autre dossier
              </Link>
            </div>
          </SystemPanel>
        </SystemPageShell>
      </main>
    );
  }

  const timeline = Array.isArray(dossier.timeline) ? dossier.timeline : [];
  const journal = Array.isArray(dossier.journal) ? dossier.journal : [];
  const pertesAssociees = Array.isArray(dossier.pertesAssociees) ? dossier.pertesAssociees : [];
  const pertesSecondaires = Array.isArray(dossier.pertesSecondaires) ? dossier.pertesSecondaires : [];
  const intensite = typeof dossier.intensiteActuelle === "number" ? dossier.intensiteActuelle : null;
  const memoireCount = memoireItems.reduce((total, item) => total + item.values.length, 0);
  const completionSignals = [
    Boolean(dossier.notes?.trim()),
    pertesSecondaires.length > 0,
    pertesAssociees.length > 0,
    timeline.length > 0,
    journal.length > 0,
    memoireCount > 0,
  ];
  const completionLevel = Math.round((completionSignals.filter(Boolean).length / completionSignals.length) * 100);
  const dossierStatus =
    completionLevel >= 67
      ? "Dossier substantiel"
      : completionLevel >= 34
        ? "Dossier en construction"
        : "Dossier embryonnaire";
  const intensitySummary =
    intensite === null
      ? "Intensité non évaluée pour le moment."
      : intensite <= 3
        ? "Perte présente mais stabilisée."
        : intensite <= 6
          ? "Perte encore active."
          : "Perte à forte charge émotionnelle.";
  const totalDossierElements = pertesAssociees.length + timeline.length + journal.length + memoireCount;
  const emotionalChargeLabel =
    intensite === null
      ? "Non évaluée"
      : intensite <= 3
        ? "Charge douce"
        : intensite <= 6
          ? "Charge active"
          : "Charge forte";
  const emotionalChargeText =
    intensite === null
      ? "La charge actuelle n'a pas encore été située."
      : intensite <= 3
        ? "La perte est présente, mais elle semble moins envahir l'ensemble du dossier."
        : intensite <= 6
          ? "La perte demeure active et demande encore de l'attention."
          : "La perte occupe une place émotionnelle importante en ce moment.";
  const dossierDensityLabel =
    totalDossierElements >= 8
      ? "Dossier dense"
      : totalDossierElements >= 3
        ? "Dossier documenté"
        : "Dossier léger";
  const dossierDensityText =
    totalDossierElements >= 8
      ? "Plusieurs éléments permettent déjà de relire cette perte avec recul."
      : totalDossierElements >= 3
        ? "Le dossier commence à montrer des repères concrets."
        : "Le dossier contient encore peu d'éléments, ce qui est normal au début.";
  const currentDirection = getNextAction(dossier);
  const directionText = currentDirection
    ? `La direction actuelle est simple : ${currentDirection}`
    : "Aucune direction particulière n'est nécessaire pour le moment.";
  const progressionStatus =
    journal.length === 0 || (intensite !== null && intensite >= 8)
      ? "À déposer"
      : pertesAssociees.length === 0 || timeline.length === 0
        ? "À comprendre"
        : memoireCount > 0 && intensite !== null && intensite <= 4
          ? "À honorer"
          : "À traverser";
  const progressionText =
    progressionStatus === "À déposer"
      ? "Le dossier semble encore demander un premier espace pour poser ce qui pèse."
      : progressionStatus === "À comprendre"
        ? "Le dossier gagne à être éclairci : ce qui a été perdu, quand, et avec quelles couches."
        : progressionStatus === "À honorer"
          ? "Le dossier contient déjà des traces qui permettent de garder une mémoire vivante."
          : "Le dossier est assez documenté pour accompagner une traversée progressive.";
  const threadSource = [dossier.typePerte, ...pertesSecondaires].join(" ").toLocaleLowerCase("fr-CA");
  const guidingThread =
    memoireCount > 0 && intensite !== null && intensite <= 4
      ? "Mémoire"
      : intensite !== null && intensite >= 8
        ? "Survie"
        : threadSource.includes("vivante") || threadSource.includes("ambigu") || threadSource.includes("identitaire")
          ? "Transformation"
          : threadSource.includes("relation") || threadSource.includes("futur") || threadSource.includes("croyance")
            ? "Rupture"
            : "Absence";
  const guidingThreadText =
    guidingThread === "Mémoire"
      ? "Le dossier semble s'organiser autour de ce qui reste vivant malgré la perte."
      : guidingThread === "Survie"
        ? "Le dossier porte surtout la nécessité de tenir avec une charge très présente."
        : guidingThread === "Transformation"
          ? "Le thème central semble être le changement d'une personne, d'un rôle ou d'une forme de vie."
          : guidingThread === "Rupture"
            ? "Le dossier semble marqué par une séparation entre un avant et un après."
            : "Le dossier tourne autour de ce qui n'est plus là, ou plus accessible comme avant.";
  const recentJournalEntries = journal.slice(0, 3);
  const recentTimelineEvents = timeline.slice(0, 3);
  const recentPertesAssociees = pertesAssociees.slice(-3).reverse();
  const recentMemoireItems = memoireItems
    .flatMap((item) => item.values.map((value) => ({ label: item.label, value })))
    .slice(-3)
    .reverse();
  const evolutionItems = [
    ...timeline.map((event) => ({
      dateLabel: event.date || "Date non précisée",
      detail: event.note || event.type,
      id: event.id,
      meta: `${event.type}${typeof event.intensite === "number" ? ` · Intensité ${event.intensite}/10` : ""}`,
      source: "Timeline" as const,
      timestamp: getDateTimestamp(event.date),
      title: event.titre,
    })),
    ...journal.map((entry) => ({
      dateLabel: formatDateFr(entry.date),
      detail: entry.texte,
      id: entry.id,
      meta: `${entry.emotion} · Intensité ${entry.intensite}/10${entry.declencheur ? ` · ${entry.declencheur}` : ""}`,
      source: "Journal" as const,
      timestamp: getDateTimestamp(entry.date),
      title: entry.emotion,
    })),
    ...memoireItems.flatMap((item) =>
      item.values.map((value, index) => ({
        dateLabel: `Mémoire vivante · ${formatDateFr(dossier.dateCreation)}`,
        detail: value,
        id: `memoire-${item.field}-${index}`,
        meta: item.label,
        source: "Mémoire" as const,
        timestamp: getDateTimestamp(dossier.dateCreation),
        title: item.label,
      })),
    ),
  ].sort((a, b) => {
    const aTime = a.timestamp ?? Number.MAX_SAFE_INTEGER;
    const bTime = b.timestamp ?? Number.MAX_SAFE_INTEGER;
    return aTime - bTime;
  });
  const datedEvolutionItems = evolutionItems.filter((item) => item.timestamp !== null);
  const firstEvolutionItem = evolutionItems[0] || null;
  const lastEvolutionItem = evolutionItems[evolutionItems.length - 1] || null;
  const firstDatedEvolutionItem = datedEvolutionItems[0] || null;
  const lastDatedEvolutionItem = datedEvolutionItems[datedEvolutionItems.length - 1] || null;
  const evolutionDurationDays =
    firstDatedEvolutionItem && lastDatedEvolutionItem
      ? Math.max(0, Math.round(((lastDatedEvolutionItem.timestamp || 0) - (firstDatedEvolutionItem.timestamp || 0)) / 86400000))
      : null;
  const hasReviewContent =
    recentJournalEntries.length > 0 ||
    recentTimelineEvents.length > 0 ||
    recentPertesAssociees.length > 0 ||
    recentMemoireItems.length > 0;
  const hasPriorityContent = Boolean(currentDirection) || intensite !== null || hasReviewContent;
  const hasAnchorContent = memoireCount > 0 || pertesAssociees.length > 0 || Boolean(dossier.notes?.trim()) || Boolean(currentDirection);
  const balanceIsSparse = totalDossierElements <= 1;
  const tabCounts: Partial<Record<TabKey, number>> = {
    map: 1 + pertesSecondaires.length + pertesAssociees.length,
    evolution: evolutionItems.length,
    priorities: totalDossierElements + (intensite !== null ? 1 : 0),
    anchors: memoireCount + pertesAssociees.length + (dossier.notes?.trim() ? 1 : 0),
    recap: totalDossierElements,
    review: totalDossierElements,
    balance: totalDossierElements,
    lost: pertesAssociees.length,
    timeline: timeline.length,
    journal: journal.length,
    memory: memoireCount,
  };

  return (
    <main className="internal-page">
      <SystemPageShell maxWidth={1180} padding="24px 18px 56px">
        <header className="internal-header" style={{ marginBottom: 18 }}>
          <BackLink href="/pertes/dossiers" label="Retour aux dossiers" />
          <div style={{ display: "grid", gap: 10 }}>
            <p className="internal-kicker">Fiche de perte</p>
            <h1 className="internal-title" style={{ fontStyle: "italic", marginBottom: 0 }}>
              {dossier.titre}
            </h1>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center" }}>
              <StatusChip tone="neutral">{dossier.typePerte}</StatusChip>
              {dossier.personneOuSituation ? <StatusChip tone="warning">{dossier.personneOuSituation}</StatusChip> : null}
              {dossier.dateDebut ? <StatusChip tone="neutral">{dossier.dateDebut}</StatusChip> : null}
              {intensite !== null ? <StatusChip tone="warning">Intensité {intensite}/10</StatusChip> : null}
              <StatusChip tone="neutral">Créée le {formatDateFr(dossier.dateCreation)}</StatusChip>
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              <Link className="internal-button" href="/pertes/dossiers" style={dashboardButtonStyle}>
                Retour aux dossiers
              </Link>
              <Link className="internal-button" href="/pertes/cartographie" style={dashboardButtonStyle}>
                Créer un autre dossier
              </Link>
              <button className="internal-button-primary" onClick={openMainEdit} style={dashboardButtonStyle} type="button">
                Modifier les informations
              </button>
              <button className="internal-button" onClick={copyDossierExport} style={dashboardButtonStyle} type="button">
                Copier le dossier
              </button>
            </div>
          </div>
        </header>

        {mainEditOpen ? (
          <SystemPanel ariaLabel="Modifier les informations principales" compact>
            <SystemSectionHeader eyebrow="Édition contrôlée" title="Modifier les informations" />
            <div style={{ display: "grid", gap: 12 }}>
              <label style={dashboardFieldStyle}>
                <span className="label-meta">Titre *</span>
                <input
                  className="internal-control"
                  onChange={(event) => {
                    setEditTitre(event.target.value);
                    setMainEditError("");
                  }}
                  style={dashboardControlStyle}
                  value={editTitre}
                />
              </label>

              <SystemGrid gap={10} min={240}>
                <label style={dashboardFieldStyle}>
                  <span className="label-meta">Type *</span>
                  <select
                    className="internal-control"
                    onChange={(event) => {
                      setEditTypePerte(event.target.value);
                      setMainEditError("");
                    }}
                    style={dashboardControlStyle}
                    value={editTypePerte}
                  >
                    <option value="">Choisir un type</option>
                    {typePerteOptions.map((option) => (
                      <option key={option} value={option}>{option}</option>
                    ))}
                  </select>
                </label>
                <label style={dashboardFieldStyle}>
                  <span className="label-meta">Personne ou situation</span>
                  <input
                    className="internal-control"
                    onChange={(event) => setEditPersonneOuSituation(event.target.value)}
                    style={dashboardControlStyle}
                    value={editPersonneOuSituation}
                  />
                </label>
                <label style={dashboardFieldStyle}>
                  <span className="label-meta">Date ou période</span>
                  <input
                    className="internal-control"
                    onChange={(event) => setEditDateDebut(event.target.value)}
                    style={dashboardControlStyle}
                    value={editDateDebut}
                  />
                </label>
                <label style={dashboardFieldStyle}>
                  <span className="label-meta">Intensité : {editIntensiteActuelle}/10</span>
                  <input
                    max={10}
                    min={1}
                    onChange={(event) => setEditIntensiteActuelle(Number(event.target.value))}
                    style={{ accentColor: "var(--accent-gold)", width: "100%" }}
                    type="range"
                    value={editIntensiteActuelle}
                  />
                </label>
              </SystemGrid>

              <div style={{ display: "grid", gap: 7 }}>
                <p className="label-meta" style={{ margin: 0 }}>Pertes secondaires</p>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                  {pertesSecondairesOptions.map((option) => {
                    const checked = editPertesSecondaires.includes(option);
                    return (
                      <button
                        key={option}
                        onClick={() => toggleEditPerteSecondaire(option)}
                        style={{
                          background: checked ? "rgba(201,168,92,0.18)" : "rgba(255,250,238,0.03)",
                          border: checked ? "1px solid rgba(201,168,92,0.62)" : "1px solid rgba(201,168,92,0.18)",
                          borderRadius: 999,
                          color: checked ? "var(--text-main)" : "var(--text-soft)",
                          cursor: "pointer",
                          fontSize: 12,
                          padding: "7px 11px",
                        }}
                        type="button"
                      >
                        {option}
                      </button>
                    );
                  })}
                </div>
              </div>

              <label style={dashboardFieldStyle}>
                <span className="label-meta">Notes initiales</span>
                <textarea
                  className="internal-control"
                  onChange={(event) => setEditNotes(event.target.value)}
                  rows={5}
                  style={{ ...dashboardControlStyle, lineHeight: 1.6, minHeight: 120, resize: "vertical" }}
                  value={editNotes}
                />
              </label>

              <label style={dashboardFieldStyle}>
                <span className="label-meta">Prochaine étape</span>
                <textarea
                  className="internal-control"
                  onChange={(event) => setEditProchaineEtape(event.target.value)}
                  placeholder={getNextAction({ ...dossier, prochaineEtape: undefined })}
                  rows={3}
                  style={{ ...dashboardControlStyle, lineHeight: 1.6, minHeight: 86, resize: "vertical" }}
                  value={editProchaineEtape}
                />
              </label>

              {mainEditError ? <span style={{ color: "#d79a8f", fontSize: 12 }}>{mainEditError}</span> : null}

              <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                <button className="internal-button-primary" onClick={saveMainInfo} style={dashboardButtonStyle} type="button">
                  Sauvegarder
                </button>
                <button className="internal-button" onClick={cancelMainEdit} style={dashboardButtonStyle} type="button">
                  Annuler
                </button>
              </div>
            </div>
          </SystemPanel>
        ) : null}

        <nav
          aria-label="Onglets de la fiche"
          style={{
            display: "flex",
            gap: 8,
            marginBottom: 16,
            overflowX: "auto",
            paddingBottom: 4,
          }}
        >
          {tabs.map((tab) => {
            const active = activeTab === tab.key;
            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                style={{
                  background: active ? "rgba(201,168,92,0.82)" : "rgba(255,250,238,0.035)",
                  border: active ? "1px solid rgba(201,168,92,0.78)" : "1px solid rgba(201,168,92,0.16)",
                  borderRadius: 999,
                  color: active ? "#17130d" : "var(--accent-gold)",
                  cursor: "pointer",
                  flexShrink: 0,
                  fontSize: 12,
                  fontWeight: active ? 700 : 500,
                  minHeight: 34,
                  padding: "7px 12px",
                }}
                type="button"
              >
                {tab.label}{typeof tabCounts[tab.key] === "number" ? ` (${tabCounts[tab.key]})` : ""}
              </button>
            );
          })}
        </nav>

        {activeTab === "overview" ? (
          <SystemGrid gap={12} min={260}>
            <SystemPanel ariaLabel="Synthèse du dossier" compact>
              <SystemSectionHeader eyebrow="Synthèse locale" title="Synthèse du dossier" />
              <div style={{ display: "grid", gap: 10 }}>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 7 }}>
                  <StatusChip tone={completionLevel >= 67 ? "success" : completionLevel >= 34 ? "warning" : "neutral"}>
                    {dossierStatus}
                  </StatusChip>
                  <StatusChip tone="neutral">Complétion {completionLevel}%</StatusChip>
                  <StatusChip tone={intensite !== null && intensite >= 7 ? "warning" : "neutral"}>
                    {intensite !== null ? `Intensité ${intensite}/10` : "Intensité non évaluée"}
                  </StatusChip>
                </div>
                <div style={{ display: "grid", gap: 5 }}>
                  <p style={{ color: "var(--text-soft)", fontSize: 13, lineHeight: 1.55, margin: 0 }}>
                    Pertes associées : {pertesAssociees.length} · Timeline : {timeline.length} · Journal : {journal.length} · Mémoire : {memoireCount}
                  </p>
                  <p className="editorial-body" style={{ margin: 0 }}>
                    {intensitySummary}
                  </p>
                </div>
              </div>
            </SystemPanel>

            <SystemPanel ariaLabel="Lecture émotionnelle" compact>
              <SystemSectionHeader eyebrow="Lecture non médicale" title="Lecture émotionnelle" />
              <div style={{ display: "grid", gap: 12 }}>
                {[
                  { label: "Charge émotionnelle", value: emotionalChargeLabel, text: emotionalChargeText },
                  { label: "Densité du dossier", value: dossierDensityLabel, text: dossierDensityText },
                  { label: "Direction actuelle", value: "Prochaine étape", text: directionText },
                ].map((item) => (
                  <article
                    key={item.label}
                    style={{
                      background: "rgba(255,250,238,0.03)",
                      border: "1px solid rgba(201,168,92,0.12)",
                      borderRadius: 10,
                      display: "grid",
                      gap: 5,
                      padding: 12,
                    }}
                  >
                    <p className="label-meta" style={{ margin: 0 }}>{item.label}</p>
                    <strong style={{ color: "var(--accent-gold)", fontFamily: "var(--font-serif)", fontSize: 20, fontWeight: 400 }}>
                      {item.value}
                    </strong>
                    <p style={{ color: "var(--text-soft)", fontSize: 13, lineHeight: 1.6, margin: 0 }}>
                      {item.text}
                    </p>
                  </article>
                ))}
              </div>
            </SystemPanel>

            <SystemPanel ariaLabel="Repère de progression" compact>
              <SystemSectionHeader eyebrow="Repère local" title="Repère de progression" />
              <div style={{ display: "grid", gap: 10 }}>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 7 }}>
                  <StatusChip tone={progressionStatus === "À honorer" ? "success" : progressionStatus === "À déposer" ? "warning" : "neutral"}>
                    {progressionStatus}
                  </StatusChip>
                  <StatusChip tone="neutral">{journal.length} entrée{journal.length > 1 ? "s" : ""} journal</StatusChip>
                  <StatusChip tone="neutral">{memoireCount} élément{memoireCount > 1 ? "s" : ""} mémoire</StatusChip>
                </div>
                <p className="editorial-body" style={{ margin: 0 }}>
                  {progressionText}
                </p>
              </div>
            </SystemPanel>

            <SystemPanel ariaLabel="Fil conducteur" compact>
              <SystemSectionHeader eyebrow="Thème local" title="Fil conducteur" />
              <div style={{ display: "grid", gap: 10 }}>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 7 }}>
                  <StatusChip tone={guidingThread === "Mémoire" ? "success" : guidingThread === "Survie" ? "warning" : "neutral"}>
                    {guidingThread}
                  </StatusChip>
                  <StatusChip tone="neutral">{dossier.typePerte}</StatusChip>
                </div>
                <p className="editorial-body" style={{ margin: 0 }}>
                  {guidingThreadText}
                </p>
              </div>
            </SystemPanel>

            <SystemPanel ariaLabel="Type de perte" compact>
              <SystemSectionHeader eyebrow="Lecture" title="Type de perte" />
              <p className="editorial-body" style={{ margin: "0 0 12px" }}>{dossier.typePerte}</p>
              {pertesSecondaires.length > 0 ? (
                <div style={{ display: "flex", flexWrap: "wrap", gap: 7 }}>
                  {pertesSecondaires.map((perte) => <StatusChip key={perte} tone="warning">{perte}</StatusChip>)}
                </div>
              ) : (
                <p style={{ color: "var(--text-muted)", fontSize: 13, margin: 0 }}>Aucune perte secondaire indiquée</p>
              )}
            </SystemPanel>

            <SystemPanel ariaLabel="Intensité actuelle" compact>
              <SystemSectionHeader eyebrow="État actuel" title="Intensité actuelle" />
              {intensite !== null ? (
                <>
                  <strong style={{ color: "var(--accent-gold)", fontFamily: "var(--font-serif)", fontSize: 30 }}>
                    {intensite}/10
                  </strong>
                  <div style={{ background: "rgba(255,255,255,.06)", borderRadius: 999, height: 5, marginTop: 10, overflow: "hidden", width: "100%" }}>
                    <div style={{ background: "var(--accent-gold)", height: "100%", width: `${Math.max(0, Math.min(10, intensite)) * 10}%` }} />
                  </div>
                </>
              ) : (
                <p style={{ color: "var(--text-muted)", fontSize: 13, margin: 0 }}>Non évaluée</p>
              )}
            </SystemPanel>

            <SystemPanel ariaLabel="Notes initiales" compact>
              <SystemSectionHeader eyebrow="Point de départ" title="Notes initiales" />
              <p className="editorial-body" style={{ margin: 0, whiteSpace: "pre-wrap" }}>
                {dossier.notes?.trim() ? dossier.notes : "Aucune note initiale"}
              </p>
            </SystemPanel>

            <SystemPanel ariaLabel="Prochaine étape" compact>
              <SystemSectionHeader eyebrow="Suite douce" title="Prochaine étape" />
              <p className="editorial-body" style={{ margin: 0 }}>
                {getNextAction(dossier)}
              </p>
            </SystemPanel>
          </SystemGrid>
        ) : null}

        {activeTab === "map" ? (
          <SystemPanel ariaLabel="Cartographie visuelle des pertes" compact>
            <SystemSectionHeader eyebrow="Vue locale" title="Cartographie des pertes" />
            <div style={{ display: "grid", gap: 16 }}>
              <article
                style={{
                  background: "linear-gradient(135deg, rgba(201,168,92,0.16), rgba(255,250,238,0.035))",
                  border: "1px solid rgba(201,168,92,0.34)",
                  borderRadius: 14,
                  display: "grid",
                  gap: 12,
                  padding: 18,
                }}
              >
                <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                  <StatusChip tone="warning">Perte principale</StatusChip>
                  <StatusChip tone="neutral">{dossier.typePerte}</StatusChip>
                  {intensite !== null ? <StatusChip tone="warning">Intensité {intensite}/10</StatusChip> : null}
                </div>
                <div style={{ display: "grid", gap: 6 }}>
                  <h2 style={{ color: "var(--text-main)", fontFamily: "var(--font-serif)", fontSize: 28, fontStyle: "italic", fontWeight: 400, lineHeight: 1.15, margin: 0 }}>
                    {dossier.titre}
                  </h2>
                  {dossier.personneOuSituation ? (
                    <p style={{ color: "var(--text-soft)", fontSize: 14, lineHeight: 1.6, margin: 0 }}>
                      {dossier.personneOuSituation}
                    </p>
                  ) : null}
                </div>
                {intensite !== null ? (
                  <div style={{ display: "grid", gap: 5 }}>
                    <div style={{ background: "rgba(255,255,255,.07)", borderRadius: 999, height: 6, overflow: "hidden", width: "100%" }}>
                      <div style={{ background: "var(--accent-gold)", height: "100%", width: `${Math.max(0, Math.min(10, intensite)) * 10}%` }} />
                    </div>
                    <p style={{ color: "var(--text-muted)", fontSize: 12, margin: 0 }}>
                      Charge actuelle visible dans ce dossier.
                    </p>
                  </div>
                ) : null}
              </article>

              <SystemGrid gap={12} min={260}>
                <article
                  style={{
                    background: "rgba(255,250,238,0.03)",
                    border: "1px solid rgba(201,168,92,0.14)",
                    borderRadius: 12,
                    display: "grid",
                    gap: 10,
                    padding: 14,
                  }}
                >
                  <p className="label-meta" style={{ margin: 0 }}>Pertes secondaires</p>
                  {pertesSecondaires.length > 0 ? (
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 7 }}>
                      {pertesSecondaires.map((perte) => <StatusChip key={perte} tone="warning">{perte}</StatusChip>)}
                    </div>
                  ) : (
                    <p style={{ color: "var(--text-muted)", fontSize: 13, lineHeight: 1.55, margin: 0 }}>
                      Aucune perte secondaire indiquée.
                    </p>
                  )}
                </article>

                <article
                  style={{
                    background: "rgba(255,250,238,0.03)",
                    border: "1px solid rgba(201,168,92,0.14)",
                    borderRadius: 12,
                    display: "grid",
                    gap: 10,
                    padding: 14,
                  }}
                >
                  <p className="label-meta" style={{ margin: 0 }}>Pertes associées</p>
                  {pertesAssociees.length > 0 ? (
                    <div style={{ display: "grid", gap: 7 }}>
                      {pertesAssociees.map((perte) => (
                        <div
                          key={perte}
                          style={{
                            background: "rgba(201,168,92,0.08)",
                            border: "1px solid rgba(201,168,92,0.18)",
                            borderRadius: 9,
                            color: "var(--text-soft)",
                            fontSize: 13,
                            lineHeight: 1.5,
                            padding: "8px 10px",
                          }}
                        >
                          {perte}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p style={{ color: "var(--text-muted)", fontSize: 13, lineHeight: 1.55, margin: 0 }}>
                      Aucune perte associée ajoutée pour le moment.
                    </p>
                  )}
                </article>

                <article
                  style={{
                    background: "rgba(255,250,238,0.03)",
                    border: "1px solid rgba(201,168,92,0.14)",
                    borderRadius: 12,
                    display: "grid",
                    gap: 12,
                    padding: 14,
                  }}
                >
                  <p className="label-meta" style={{ margin: 0 }}>Repères du dossier</p>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 7 }}>
                    <StatusChip tone={guidingThread === "Mémoire" ? "success" : guidingThread === "Survie" ? "warning" : "neutral"}>
                      Thème : {guidingThread}
                    </StatusChip>
                    <StatusChip tone={progressionStatus === "À honorer" ? "success" : progressionStatus === "À déposer" ? "warning" : "neutral"}>
                      Progression : {progressionStatus}
                    </StatusChip>
                  </div>
                  <p style={{ color: "var(--text-soft)", fontSize: 13, lineHeight: 1.6, margin: 0 }}>
                    {guidingThreadText}
                  </p>
                  <p style={{ color: "var(--text-soft)", fontSize: 13, lineHeight: 1.6, margin: 0 }}>
                    {progressionText}
                  </p>
                </article>
              </SystemGrid>
            </div>
          </SystemPanel>
        ) : null}

        {activeTab === "evolution" ? (
          <SystemPanel ariaLabel="Ligne de temps émotionnelle" compact>
            <SystemSectionHeader eyebrow="Lecture chronologique" title="Évolution" />
            <div style={{ display: "grid", gap: 16 }}>
              <SystemGrid gap={12} min={220}>
                <article
                  style={{
                    background: "rgba(255,250,238,0.03)",
                    border: "1px solid rgba(201,168,92,0.14)",
                    borderRadius: 12,
                    display: "grid",
                    gap: 5,
                    padding: 14,
                  }}
                >
                  <p className="label-meta" style={{ margin: 0 }}>Total</p>
                  <strong style={{ color: "var(--accent-gold)", fontFamily: "var(--font-serif)", fontSize: 26, fontWeight: 400 }}>
                    {evolutionItems.length}
                  </strong>
                  <p style={{ color: "var(--text-muted)", fontSize: 12, margin: 0 }}>
                    élément{evolutionItems.length > 1 ? "s" : ""} dans la ligne de temps
                  </p>
                </article>

                <article
                  style={{
                    background: "rgba(255,250,238,0.03)",
                    border: "1px solid rgba(201,168,92,0.14)",
                    borderRadius: 12,
                    display: "grid",
                    gap: 5,
                    padding: 14,
                  }}
                >
                  <p className="label-meta" style={{ margin: 0 }}>Premier élément</p>
                  <strong style={{ color: "var(--text-main)", fontFamily: "var(--font-serif)", fontSize: 20, fontWeight: 400 }}>
                    {firstEvolutionItem ? firstEvolutionItem.title : "Aucun"}
                  </strong>
                  {firstEvolutionItem ? <p style={{ color: "var(--text-muted)", fontSize: 12, margin: 0 }}>{firstEvolutionItem.dateLabel}</p> : null}
                </article>

                <article
                  style={{
                    background: "rgba(255,250,238,0.03)",
                    border: "1px solid rgba(201,168,92,0.14)",
                    borderRadius: 12,
                    display: "grid",
                    gap: 5,
                    padding: 14,
                  }}
                >
                  <p className="label-meta" style={{ margin: 0 }}>Dernier élément</p>
                  <strong style={{ color: "var(--text-main)", fontFamily: "var(--font-serif)", fontSize: 20, fontWeight: 400 }}>
                    {lastEvolutionItem ? lastEvolutionItem.title : "Aucun"}
                  </strong>
                  {lastEvolutionItem ? <p style={{ color: "var(--text-muted)", fontSize: 12, margin: 0 }}>{lastEvolutionItem.dateLabel}</p> : null}
                </article>

                <article
                  style={{
                    background: "rgba(255,250,238,0.03)",
                    border: "1px solid rgba(201,168,92,0.14)",
                    borderRadius: 12,
                    display: "grid",
                    gap: 5,
                    padding: 14,
                  }}
                >
                  <p className="label-meta" style={{ margin: 0 }}>Durée couverte</p>
                  <strong style={{ color: "var(--text-main)", fontFamily: "var(--font-serif)", fontSize: 20, fontWeight: 400 }}>
                    {evolutionDurationDays !== null ? `${evolutionDurationDays} jour${evolutionDurationDays > 1 ? "s" : ""}` : "Non calculable"}
                  </strong>
                  <p style={{ color: "var(--text-muted)", fontSize: 12, margin: 0 }}>
                    Selon les dates exploitables.
                  </p>
                </article>
              </SystemGrid>

              {evolutionItems.length > 0 ? (
                <div style={{ borderLeft: "1px solid rgba(201,168,92,0.28)", display: "grid", gap: 12, paddingLeft: 14 }}>
                  {evolutionItems.map((item) => (
                    <article
                      key={`${item.source}-${item.id}`}
                      style={{
                        background: "rgba(255,250,238,0.025)",
                        border: "1px solid rgba(201,168,92,0.12)",
                        borderRadius: 12,
                        display: "grid",
                        gap: 7,
                        padding: 14,
                      }}
                    >
                      <div style={{ alignItems: "center", display: "flex", flexWrap: "wrap", gap: 7, justifyContent: "space-between" }}>
                        <div style={{ display: "flex", flexWrap: "wrap", gap: 7 }}>
                          <StatusChip tone={item.source === "Journal" ? "warning" : item.source === "Mémoire" ? "success" : "neutral"}>
                            {item.source}
                          </StatusChip>
                          <StatusChip tone="neutral">{item.dateLabel}</StatusChip>
                        </div>
                        <span style={{ color: "var(--text-muted)", fontSize: 12 }}>{item.meta}</span>
                      </div>
                      <h2 style={{ color: "var(--text-main)", fontFamily: "var(--font-serif)", fontSize: 20, fontWeight: 400, margin: 0 }}>
                        {item.title}
                      </h2>
                      <p style={{ color: "var(--text-soft)", fontSize: 13, lineHeight: 1.65, margin: 0, whiteSpace: "pre-wrap" }}>
                        {item.detail}
                      </p>
                    </article>
                  ))}
                </div>
              ) : (
                <p style={{ color: "var(--text-muted)", fontSize: 13, lineHeight: 1.6, margin: 0 }}>
                  Aucun élément à afficher pour le moment. Ajoutez un événement, une entrée journal ou un élément de mémoire vivante.
                </p>
              )}
            </div>
          </SystemPanel>
        ) : null}

        {activeTab === "priorities" ? (
          <SystemPanel ariaLabel="Priorités du dossier" compact>
            <SystemSectionHeader eyebrow="Lecture locale" title="Priorités" />
            {hasPriorityContent ? (
              <SystemGrid gap={12} min={280}>
                <article
                  style={{
                    background: "rgba(255,250,238,0.03)",
                    border: "1px solid rgba(201,168,92,0.14)",
                    borderRadius: 12,
                    display: "grid",
                    gap: 10,
                    padding: 14,
                  }}
                >
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 7 }}>
                    <StatusChip tone={intensite !== null && intensite >= 7 ? "warning" : "neutral"}>
                      À traiter maintenant
                    </StatusChip>
                    {intensite !== null ? <StatusChip tone="neutral">Intensité {intensite}/10</StatusChip> : null}
                  </div>
                  <p className="editorial-body" style={{ margin: 0 }}>
                    {currentDirection}
                  </p>
                  {intensite !== null ? (
                    <div style={{ display: "grid", gap: 5 }}>
                      <div style={{ background: "rgba(255,255,255,.06)", borderRadius: 999, height: 5, overflow: "hidden", width: "100%" }}>
                        <div style={{ background: "var(--accent-gold)", height: "100%", width: `${Math.max(0, Math.min(10, intensite)) * 10}%` }} />
                      </div>
                      <p style={{ color: "var(--text-muted)", fontSize: 12, margin: 0 }}>{intensitySummary}</p>
                    </div>
                  ) : null}
                  {recentPertesAssociees.length > 0 ? (
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 7 }}>
                      {recentPertesAssociees.map((perte, index) => (
                        <StatusChip key={`${perte}-${index}`} tone="warning">{perte}</StatusChip>
                      ))}
                    </div>
                  ) : null}
                </article>

                <article
                  style={{
                    background: "rgba(255,250,238,0.03)",
                    border: "1px solid rgba(201,168,92,0.14)",
                    borderRadius: 12,
                    display: "grid",
                    gap: 10,
                    padding: 14,
                  }}
                >
                  <StatusChip tone="neutral">À relire bientôt</StatusChip>
                  {recentJournalEntries.length > 0 ? (
                    <div style={{ display: "grid", gap: 8 }}>
                      {recentJournalEntries.map((entry) => (
                        <div key={entry.id} style={{ borderTop: "1px solid rgba(201,168,92,0.12)", paddingTop: 8 }}>
                          <p className="label-meta" style={{ margin: "0 0 3px" }}>{formatDateFr(entry.date)} · {entry.emotion}</p>
                          <p style={{ color: "var(--text-soft)", fontSize: 13, lineHeight: 1.55, margin: 0 }}>{entry.texte}</p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p style={{ color: "var(--text-muted)", fontSize: 13, lineHeight: 1.55, margin: 0 }}>
                      Aucune entrée journal récente à relire.
                    </p>
                  )}
                  {recentTimelineEvents[0] ? (
                    <div style={{ borderTop: "1px solid rgba(201,168,92,0.12)", paddingTop: 8 }}>
                      <p className="label-meta" style={{ margin: "0 0 3px" }}>Dernier événement timeline</p>
                      <p style={{ color: "var(--text-soft)", fontSize: 13, lineHeight: 1.55, margin: 0 }}>
                        {recentTimelineEvents[0].titre}{recentTimelineEvents[0].date ? ` · ${recentTimelineEvents[0].date}` : ""}
                      </p>
                    </div>
                  ) : null}
                </article>

                <article
                  style={{
                    background: "rgba(255,250,238,0.03)",
                    border: "1px solid rgba(201,168,92,0.14)",
                    borderRadius: 12,
                    display: "grid",
                    gap: 10,
                    padding: 14,
                  }}
                >
                  <StatusChip tone="success">À garder en mémoire</StatusChip>
                  {recentMemoireItems.length > 0 ? (
                    <div style={{ display: "grid", gap: 8 }}>
                      {recentMemoireItems.map((item) => (
                        <div key={`${item.label}-${item.value}`} style={{ borderTop: "1px solid rgba(201,168,92,0.12)", paddingTop: 8 }}>
                          <p className="label-meta" style={{ margin: "0 0 3px" }}>{item.label}</p>
                          <p style={{ color: "var(--text-soft)", fontSize: 13, lineHeight: 1.55, margin: 0 }}>{item.value}</p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p style={{ color: "var(--text-muted)", fontSize: 13, lineHeight: 1.55, margin: 0 }}>
                      Aucun élément de mémoire vivante ajouté pour le moment.
                    </p>
                  )}
                  <p style={{ color: "var(--text-soft)", fontSize: 13, lineHeight: 1.6, margin: 0 }}>
                    {guidingThreadText}
                  </p>
                </article>
              </SystemGrid>
            ) : (
              <p style={{ color: "var(--text-muted)", fontSize: 13, lineHeight: 1.6, margin: 0 }}>
                Le dossier contient encore trop peu d'éléments pour proposer des priorités de relecture. Ajoutez une perte associée, une entrée journal, un événement ou un élément de mémoire.
              </p>
            )}
          </SystemPanel>
        ) : null}

        {activeTab === "anchors" ? (
          <SystemPanel ariaLabel="Ancrages du dossier" compact>
            <SystemSectionHeader eyebrow="Stabilisation locale" title="Ancrages" />
            {hasAnchorContent ? (
              <SystemGrid gap={12} min={260}>
                <article
                  style={{
                    background: "rgba(255,250,238,0.03)",
                    border: "1px solid rgba(201,168,92,0.14)",
                    borderRadius: 12,
                    display: "grid",
                    gap: 10,
                    padding: 14,
                  }}
                >
                  <StatusChip tone="success">Ce qui reste vivant</StatusChip>
                  {recentMemoireItems.length > 0 ? (
                    <div style={{ display: "grid", gap: 8 }}>
                      {recentMemoireItems.map((item) => (
                        <div key={`${item.label}-${item.value}`} style={{ borderTop: "1px solid rgba(201,168,92,0.12)", paddingTop: 8 }}>
                          <p className="label-meta" style={{ margin: "0 0 3px" }}>{item.label}</p>
                          <p style={{ color: "var(--text-soft)", fontSize: 13, lineHeight: 1.55, margin: 0 }}>{item.value}</p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p style={{ color: "var(--text-muted)", fontSize: 13, lineHeight: 1.55, margin: 0 }}>
                      Aucun élément de mémoire vivante ajouté pour le moment.
                    </p>
                  )}
                </article>

                <article
                  style={{
                    background: "rgba(255,250,238,0.03)",
                    border: "1px solid rgba(201,168,92,0.14)",
                    borderRadius: 12,
                    display: "grid",
                    gap: 10,
                    padding: 14,
                  }}
                >
                  <StatusChip tone="neutral">Ce qui peut soutenir</StatusChip>
                  {pertesAssociees.length > 0 ? (
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 7 }}>
                      {pertesAssociees.map((perte, index) => (
                        <StatusChip key={`${perte}-${index}`} tone="warning">{perte}</StatusChip>
                      ))}
                    </div>
                  ) : (
                    <p style={{ color: "var(--text-muted)", fontSize: 13, lineHeight: 1.55, margin: 0 }}>
                      Aucune perte associée nommée pour l'instant.
                    </p>
                  )}
                  <p style={{ color: "var(--text-soft)", fontSize: 13, lineHeight: 1.6, margin: 0 }}>
                    {guidingThreadText}
                  </p>
                </article>

                <article
                  style={{
                    background: "rgba(255,250,238,0.03)",
                    border: "1px solid rgba(201,168,92,0.14)",
                    borderRadius: 12,
                    display: "grid",
                    gap: 10,
                    padding: 14,
                  }}
                >
                  <StatusChip tone={intensite !== null && intensite >= 7 ? "warning" : "neutral"}>Ce qui demande douceur</StatusChip>
                  <p className="editorial-body" style={{ margin: 0, whiteSpace: "pre-wrap" }}>
                    {dossier.notes?.trim() ? dossier.notes : intensitySummary}
                  </p>
                  {intensite !== null ? (
                    <p style={{ color: "var(--text-muted)", fontSize: 12, margin: 0 }}>
                      Intensité actuelle : {intensite}/10
                    </p>
                  ) : null}
                </article>

                <article
                  style={{
                    background: "rgba(201,168,92,0.08)",
                    border: "1px solid rgba(201,168,92,0.24)",
                    borderRadius: 12,
                    display: "grid",
                    gap: 10,
                    padding: 14,
                  }}
                >
                  <StatusChip tone="warning">Prochain geste simple</StatusChip>
                  <p className="editorial-body" style={{ margin: 0 }}>
                    {currentDirection}
                  </p>
                </article>
              </SystemGrid>
            ) : (
              <p style={{ color: "var(--text-muted)", fontSize: 13, lineHeight: 1.6, margin: 0 }}>
                Le dossier contient encore peu d'éléments stabilisants. Ajoutez une note initiale, une perte associée, un élément de mémoire ou une prochaine étape.
              </p>
            )}
          </SystemPanel>
        ) : null}

        {activeTab === "recap" ? (
          <SystemPanel ariaLabel="Récapitulatif imprimable" compact>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 10, justifyContent: "space-between", marginBottom: 14 }}>
              <SystemSectionHeader eyebrow="Version copiable" title="Récapitulatif imprimable" />
              <button className="internal-button" onClick={copyRecapExport} style={dashboardButtonStyle} type="button">
                Copier le récapitulatif
              </button>
            </div>

            <div style={{ display: "grid", gap: 14 }}>
              <article
                style={{
                  background: "rgba(201,168,92,0.08)",
                  border: "1px solid rgba(201,168,92,0.24)",
                  borderRadius: 12,
                  display: "grid",
                  gap: 10,
                  padding: 16,
                }}
              >
                <div style={{ display: "flex", flexWrap: "wrap", gap: 7 }}>
                  <StatusChip tone="neutral">{dossier.typePerte}</StatusChip>
                  <StatusChip tone={intensite !== null && intensite >= 7 ? "warning" : "neutral"}>
                    {intensite !== null ? `Intensité ${intensite}/10` : "Intensité non évaluée"}
                  </StatusChip>
                  <StatusChip tone="neutral">Créée le {formatDateFr(dossier.dateCreation)}</StatusChip>
                </div>
                <h2 style={{ color: "var(--text-main)", fontFamily: "var(--font-serif)", fontSize: 28, fontStyle: "italic", fontWeight: 400, lineHeight: 1.15, margin: 0 }}>
                  {dossier.titre}
                </h2>
                <p style={{ color: "var(--text-soft)", fontSize: 13, lineHeight: 1.65, margin: 0 }}>
                  {dossier.personneOuSituation || "Personne ou situation non précisée"}
                  {dossier.dateDebut ? ` · ${dossier.dateDebut}` : ""}
                </p>
              </article>

              <SystemGrid gap={12} min={260}>
                <article className="chapter-card" style={{ display: "grid", gap: 8, marginBottom: 0, padding: 14 }}>
                  <h2 style={{ color: "var(--text-main)", fontFamily: "var(--font-serif)", fontSize: 19, fontWeight: 400, margin: 0 }}>Synthèse du dossier</h2>
                  <p className="label-meta" style={{ margin: 0 }}>{dossierStatus} · Complétion {completionLevel}%</p>
                  <p className="editorial-body" style={{ margin: 0 }}>{intensitySummary}</p>
                </article>

                <article className="chapter-card" style={{ display: "grid", gap: 8, marginBottom: 0, padding: 14 }}>
                  <h2 style={{ color: "var(--text-main)", fontFamily: "var(--font-serif)", fontSize: 19, fontWeight: 400, margin: 0 }}>Lecture émotionnelle</h2>
                  <p className="label-meta" style={{ margin: 0 }}>{emotionalChargeLabel} · {dossierDensityLabel}</p>
                  <p style={{ color: "var(--text-soft)", fontSize: 13, lineHeight: 1.6, margin: 0 }}>{emotionalChargeText}</p>
                  <p style={{ color: "var(--text-soft)", fontSize: 13, lineHeight: 1.6, margin: 0 }}>{dossierDensityText}</p>
                </article>

                <article className="chapter-card" style={{ display: "grid", gap: 8, marginBottom: 0, padding: 14 }}>
                  <h2 style={{ color: "var(--text-main)", fontFamily: "var(--font-serif)", fontSize: 19, fontWeight: 400, margin: 0 }}>Repère de progression</h2>
                  <StatusChip tone={progressionStatus === "À honorer" ? "success" : progressionStatus === "À déposer" ? "warning" : "neutral"}>{progressionStatus}</StatusChip>
                  <p className="editorial-body" style={{ margin: 0 }}>{progressionText}</p>
                </article>

                <article className="chapter-card" style={{ display: "grid", gap: 8, marginBottom: 0, padding: 14 }}>
                  <h2 style={{ color: "var(--text-main)", fontFamily: "var(--font-serif)", fontSize: 19, fontWeight: 400, margin: 0 }}>Fil conducteur</h2>
                  <StatusChip tone={guidingThread === "Mémoire" ? "success" : guidingThread === "Survie" ? "warning" : "neutral"}>{guidingThread}</StatusChip>
                  <p className="editorial-body" style={{ margin: 0 }}>{guidingThreadText}</p>
                </article>
              </SystemGrid>

              <SystemGrid gap={12} min={280}>
                <article className="chapter-card" style={{ display: "grid", gap: 8, marginBottom: 0, padding: 14 }}>
                  <h2 style={{ color: "var(--text-main)", fontFamily: "var(--font-serif)", fontSize: 19, fontWeight: 400, margin: 0 }}>Pertes associées</h2>
                  {pertesAssociees.length > 0 ? (
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 7 }}>
                      {pertesAssociees.map((perte, index) => <StatusChip key={`${perte}-${index}`} tone="warning">{perte}</StatusChip>)}
                    </div>
                  ) : (
                    <p style={{ color: "var(--text-muted)", fontSize: 13, margin: 0 }}>Aucune perte associée ajoutée.</p>
                  )}
                </article>

                <article className="chapter-card" style={{ display: "grid", gap: 8, marginBottom: 0, padding: 14 }}>
                  <h2 style={{ color: "var(--text-main)", fontFamily: "var(--font-serif)", fontSize: 19, fontWeight: 400, margin: 0 }}>Timeline</h2>
                  {timeline.length > 0 ? (
                    timeline.map((event) => (
                      <div key={event.id} style={{ borderTop: "1px solid rgba(201,168,92,0.12)", paddingTop: 8 }}>
                        <p className="label-meta" style={{ margin: "0 0 3px" }}>{event.date || "Date non précisée"} · {event.type}</p>
                        <p style={{ color: "var(--text-soft)", fontSize: 13, lineHeight: 1.55, margin: 0 }}>{event.titre}</p>
                      </div>
                    ))
                  ) : (
                    <p style={{ color: "var(--text-muted)", fontSize: 13, margin: 0 }}>Aucun événement timeline.</p>
                  )}
                </article>

                <article className="chapter-card" style={{ display: "grid", gap: 8, marginBottom: 0, padding: 14 }}>
                  <h2 style={{ color: "var(--text-main)", fontFamily: "var(--font-serif)", fontSize: 19, fontWeight: 400, margin: 0 }}>Journal</h2>
                  {journal.length > 0 ? (
                    journal.map((entry) => (
                      <div key={entry.id} style={{ borderTop: "1px solid rgba(201,168,92,0.12)", paddingTop: 8 }}>
                        <p className="label-meta" style={{ margin: "0 0 3px" }}>{formatDateFr(entry.date)} · {entry.emotion} · {entry.intensite}/10</p>
                        <p style={{ color: "var(--text-soft)", fontSize: 13, lineHeight: 1.55, margin: 0 }}>{entry.texte}</p>
                      </div>
                    ))
                  ) : (
                    <p style={{ color: "var(--text-muted)", fontSize: 13, margin: 0 }}>Aucune entrée journal.</p>
                  )}
                </article>

                <article className="chapter-card" style={{ display: "grid", gap: 8, marginBottom: 0, padding: 14 }}>
                  <h2 style={{ color: "var(--text-main)", fontFamily: "var(--font-serif)", fontSize: 19, fontWeight: 400, margin: 0 }}>Mémoire vivante</h2>
                  {memoireCount > 0 ? (
                    memoireItems.map((item) => (
                      arrayHasItems(item.values) ? (
                        <div key={item.field} style={{ borderTop: "1px solid rgba(201,168,92,0.12)", paddingTop: 8 }}>
                          <p className="label-meta" style={{ margin: "0 0 3px" }}>{item.label}</p>
                          <p style={{ color: "var(--text-soft)", fontSize: 13, lineHeight: 1.55, margin: 0 }}>{item.values.join(" · ")}</p>
                        </div>
                      ) : null
                    ))
                  ) : (
                    <p style={{ color: "var(--text-muted)", fontSize: 13, margin: 0 }}>Aucun élément de mémoire vivante.</p>
                  )}
                </article>
              </SystemGrid>

              <SystemGrid gap={12} min={280}>
                <article className="chapter-card" style={{ display: "grid", gap: 8, marginBottom: 0, padding: 14 }}>
                  <h2 style={{ color: "var(--text-main)", fontFamily: "var(--font-serif)", fontSize: 19, fontWeight: 400, margin: 0 }}>Ancrages</h2>
                  <p style={{ color: "var(--text-soft)", fontSize: 13, lineHeight: 1.6, margin: 0 }}>Ce qui reste vivant : {recentMemoireItems.length > 0 ? recentMemoireItems.map((item) => item.value).join(" · ") : "Aucun élément récent"}</p>
                  <p style={{ color: "var(--text-soft)", fontSize: 13, lineHeight: 1.6, margin: 0 }}>Ce qui peut soutenir : {pertesAssociees.length > 0 ? pertesAssociees.join(" · ") : "Aucune perte associée"}</p>
                  <p style={{ color: "var(--text-soft)", fontSize: 13, lineHeight: 1.6, margin: 0 }}>Ce qui demande douceur : {dossier.notes?.trim() ? dossier.notes : intensitySummary}</p>
                </article>

                <article className="chapter-card" style={{ display: "grid", gap: 8, marginBottom: 0, padding: 14 }}>
                  <h2 style={{ color: "var(--text-main)", fontFamily: "var(--font-serif)", fontSize: 19, fontWeight: 400, margin: 0 }}>Priorités</h2>
                  <p style={{ color: "var(--text-soft)", fontSize: 13, lineHeight: 1.6, margin: 0 }}>À traiter maintenant : {currentDirection}</p>
                  <p style={{ color: "var(--text-soft)", fontSize: 13, lineHeight: 1.6, margin: 0 }}>À relire bientôt : {recentJournalEntries.length > 0 ? recentJournalEntries.map((entry) => `${formatDateFr(entry.date)} · ${entry.emotion}`).join(" · ") : "Aucune entrée récente"}</p>
                  <p style={{ color: "var(--text-soft)", fontSize: 13, lineHeight: 1.6, margin: 0 }}>À garder en mémoire : {recentMemoireItems.length > 0 ? recentMemoireItems.map((item) => item.value).join(" · ") : "Aucun élément récent"}</p>
                </article>
              </SystemGrid>

              <SystemPanel ariaLabel="Prochaine étape du récapitulatif" compact>
                <SystemSectionHeader eyebrow="Suite" title="Prochaine étape" />
                <p className="editorial-body" style={{ margin: 0 }}>{currentDirection}</p>
              </SystemPanel>
            </div>
          </SystemPanel>
        ) : null}

        {activeTab === "review" ? (
          <SystemPanel ariaLabel="À relire" compact>
            <SystemSectionHeader eyebrow="Relecture" title="À relire" />
            <div style={{ display: "grid", gap: 14 }}>
              <article
                style={{
                  background: "rgba(255,250,238,0.03)",
                  border: "1px solid rgba(201,168,92,0.12)",
                  borderRadius: 10,
                  display: "grid",
                  gap: 5,
                  padding: 12,
                }}
              >
                <p className="label-meta" style={{ margin: 0 }}>Prochaine étape</p>
                <p className="editorial-body" style={{ margin: 0 }}>{currentDirection}</p>
              </article>

              {hasReviewContent ? (
                <SystemGrid gap={12} min={260}>
                  <article className="chapter-card" style={{ display: "grid", gap: 8, marginBottom: 0, padding: 14 }}>
                    <h2 style={{ color: "var(--text-main)", fontFamily: "var(--font-serif)", fontSize: 19, fontWeight: 400, margin: 0 }}>
                      Dernières entrées journal
                    </h2>
                    {recentJournalEntries.length > 0 ? (
                      recentJournalEntries.map((entry) => (
                        <div key={entry.id} style={{ borderTop: "1px solid rgba(201,168,92,0.12)", paddingTop: 8 }}>
                          <p className="label-meta" style={{ margin: "0 0 3px" }}>{formatDateFr(entry.date)} · {entry.emotion}</p>
                          <p style={{ color: "var(--text-soft)", fontSize: 13, lineHeight: 1.55, margin: 0 }}>{entry.texte}</p>
                        </div>
                      ))
                    ) : (
                      <p style={{ color: "var(--text-muted)", fontSize: 13, margin: 0 }}>Aucune entrée à relire.</p>
                    )}
                  </article>

                  <article className="chapter-card" style={{ display: "grid", gap: 8, marginBottom: 0, padding: 14 }}>
                    <h2 style={{ color: "var(--text-main)", fontFamily: "var(--font-serif)", fontSize: 19, fontWeight: 400, margin: 0 }}>
                      Derniers éléments mémoire
                    </h2>
                    {recentMemoireItems.length > 0 ? (
                      recentMemoireItems.map((item) => (
                        <div key={`${item.label}-${item.value}`} style={{ borderTop: "1px solid rgba(201,168,92,0.12)", paddingTop: 8 }}>
                          <p className="label-meta" style={{ margin: "0 0 3px" }}>{item.label}</p>
                          <p style={{ color: "var(--text-soft)", fontSize: 13, lineHeight: 1.55, margin: 0 }}>{item.value}</p>
                        </div>
                      ))
                    ) : (
                      <p style={{ color: "var(--text-muted)", fontSize: 13, margin: 0 }}>Aucun élément mémoire à relire.</p>
                    )}
                  </article>

                  <article className="chapter-card" style={{ display: "grid", gap: 8, marginBottom: 0, padding: 14 }}>
                    <h2 style={{ color: "var(--text-main)", fontFamily: "var(--font-serif)", fontSize: 19, fontWeight: 400, margin: 0 }}>
                      Derniers événements timeline
                    </h2>
                    {recentTimelineEvents.length > 0 ? (
                      recentTimelineEvents.map((event) => (
                        <div key={event.id} style={{ borderTop: "1px solid rgba(201,168,92,0.12)", paddingTop: 8 }}>
                          <p className="label-meta" style={{ margin: "0 0 3px" }}>{event.date || "Date non précisée"} · {event.type}</p>
                          <p style={{ color: "var(--text-soft)", fontSize: 13, lineHeight: 1.55, margin: 0 }}>{event.titre}</p>
                        </div>
                      ))
                    ) : (
                      <p style={{ color: "var(--text-muted)", fontSize: 13, margin: 0 }}>Aucun événement à relire.</p>
                    )}
                  </article>

                  <article className="chapter-card" style={{ display: "grid", gap: 8, marginBottom: 0, padding: 14 }}>
                    <h2 style={{ color: "var(--text-main)", fontFamily: "var(--font-serif)", fontSize: 19, fontWeight: 400, margin: 0 }}>
                      Pertes associées récentes
                    </h2>
                    {recentPertesAssociees.length > 0 ? (
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 7 }}>
                        {recentPertesAssociees.map((perte, index) => <StatusChip key={`${perte}-${index}`} tone="warning">{perte}</StatusChip>)}
                      </div>
                    ) : (
                      <p style={{ color: "var(--text-muted)", fontSize: 13, margin: 0 }}>Aucune perte associée à relire.</p>
                    )}
                  </article>
                </SystemGrid>
              ) : (
                <p style={{ color: "var(--text-muted)", fontSize: 13, margin: 0 }}>
                  Rien à relire pour le moment. Ajoutez une perte associée, une entrée journal, un événement timeline ou un élément de mémoire.
                </p>
              )}
            </div>
          </SystemPanel>
        ) : null}

        {activeTab === "balance" ? (
          <SystemPanel ariaLabel="Bilan" compact>
            <SystemSectionHeader eyebrow="Synthèse finale locale" title="Bilan" />
            <div style={{ display: "grid", gap: 14 }}>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8, justifyContent: "space-between" }}>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 7 }}>
                  <StatusChip tone={balanceIsSparse ? "neutral" : "warning"}>{dossierStatus}</StatusChip>
                  <StatusChip tone="neutral">Complétion {completionLevel}%</StatusChip>
                  <StatusChip tone="neutral">{totalDossierElements} élément{totalDossierElements > 1 ? "s" : ""}</StatusChip>
                </div>
                <button className="internal-button" onClick={copyBalanceExport} style={dashboardButtonStyle} type="button">
                  Copier le bilan
                </button>
              </div>

              {balanceIsSparse ? (
                <p style={{ color: "var(--text-muted)", fontSize: 13, lineHeight: 1.65, margin: 0 }}>
                  Le dossier est encore très peu rempli. Le bilan existe déjà, mais il deviendra plus utile après quelques pertes associées, événements, entrées journal ou éléments de mémoire.
                </p>
              ) : null}

              <SystemGrid gap={12} min={260}>
                <article className="chapter-card" style={{ display: "grid", gap: 8, marginBottom: 0, padding: 14 }}>
                  <h2 style={{ color: "var(--text-main)", fontFamily: "var(--font-serif)", fontSize: 19, fontWeight: 400, margin: 0 }}>
                    Résumé du dossier
                  </h2>
                  <p style={{ color: "var(--text-soft)", fontSize: 13, lineHeight: 1.6, margin: 0 }}>
                    {dossier.titre} · {dossier.typePerte}
                    {dossier.personneOuSituation ? ` · ${dossier.personneOuSituation}` : ""}
                  </p>
                  <p className="editorial-body" style={{ margin: 0 }}>{intensitySummary}</p>
                </article>

                <article className="chapter-card" style={{ display: "grid", gap: 8, marginBottom: 0, padding: 14 }}>
                  <h2 style={{ color: "var(--text-main)", fontFamily: "var(--font-serif)", fontSize: 19, fontWeight: 400, margin: 0 }}>
                    Lecture émotionnelle
                  </h2>
                  <p className="label-meta" style={{ margin: 0 }}>{emotionalChargeLabel} · {dossierDensityLabel}</p>
                  <p style={{ color: "var(--text-soft)", fontSize: 13, lineHeight: 1.6, margin: 0 }}>{emotionalChargeText}</p>
                  <p style={{ color: "var(--text-soft)", fontSize: 13, lineHeight: 1.6, margin: 0 }}>{dossierDensityText}</p>
                </article>

                <article className="chapter-card" style={{ display: "grid", gap: 8, marginBottom: 0, padding: 14 }}>
                  <h2 style={{ color: "var(--text-main)", fontFamily: "var(--font-serif)", fontSize: 19, fontWeight: 400, margin: 0 }}>
                    Repère de progression
                  </h2>
                  <StatusChip tone={progressionStatus === "À honorer" ? "success" : progressionStatus === "À déposer" ? "warning" : "neutral"}>{progressionStatus}</StatusChip>
                  <p className="editorial-body" style={{ margin: 0 }}>{progressionText}</p>
                </article>

                <article className="chapter-card" style={{ display: "grid", gap: 8, marginBottom: 0, padding: 14 }}>
                  <h2 style={{ color: "var(--text-main)", fontFamily: "var(--font-serif)", fontSize: 19, fontWeight: 400, margin: 0 }}>
                    Fil conducteur
                  </h2>
                  <StatusChip tone={guidingThread === "Mémoire" ? "success" : guidingThread === "Survie" ? "warning" : "neutral"}>{guidingThread}</StatusChip>
                  <p className="editorial-body" style={{ margin: 0 }}>{guidingThreadText}</p>
                </article>
              </SystemGrid>

              <SystemPanel ariaLabel="Compteurs globaux du bilan" compact>
                <SystemSectionHeader eyebrow="Compteurs" title="Compteurs globaux" />
                <p style={{ color: "var(--text-soft)", fontSize: 13, lineHeight: 1.7, margin: 0 }}>
                  Pertes associées : {pertesAssociees.length} · Timeline : {timeline.length} · Journal : {journal.length} · Mémoire : {memoireCount}
                </p>
              </SystemPanel>

              <SystemPanel ariaLabel="Prochaine étape du bilan" compact>
                <SystemSectionHeader eyebrow="Suite" title="Prochaine étape" />
                <p className="editorial-body" style={{ margin: 0 }}>{currentDirection}</p>
              </SystemPanel>
            </div>
          </SystemPanel>
        ) : null}

        {activeTab === "lost" ? (
          <SystemPanel ariaLabel="Ce que j'ai perdu" compact>
            <SystemSectionHeader eyebrow="Nommage" title="Ce que j'ai perdu" />
            <p className="editorial-body" style={{ margin: "0 0 14px", maxWidth: 760 }}>
              Cette section servira à nommer les pertes secondaires : présence, sécurité,
              futur, rôle, identité, habitudes, confiance.
            </p>
            <div style={{ display: "grid", gap: 8, marginBottom: 14 }}>
              <label style={dashboardFieldStyle}>
                <span className="label-meta">Ajouter une perte associée</span>
                <input
                  className="internal-control"
                  onChange={(event) => {
                    setPerteAssocieeDraft(event.target.value);
                    setPerteAssocieeError("");
                  }}
                  placeholder="Exemple : sa présence, notre futur, mon sentiment de sécurité"
                  style={dashboardControlStyle}
                  value={perteAssocieeDraft}
                />
              </label>
              {perteAssocieeError ? <span style={{ color: "#d79a8f", fontSize: 12 }}>{perteAssocieeError}</span> : null}
              <button className="internal-button-primary" onClick={addPerteAssociee} style={{ ...dashboardButtonStyle, justifySelf: "start" }} type="button">
                Ajouter
              </button>
            </div>
            {pertesAssociees.length > 0 ? (
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                {pertesAssociees.map((perte, index) => (
                  <span
                    key={`${perte}-${index}`}
                    style={{
                      alignItems: "center",
                      display: "inline-flex",
                      gap: 5,
                    }}
                  >
                    <StatusChip tone="warning">{perte}</StatusChip>
                    <button
                      onClick={() => deletePerteAssociee(index)}
                      style={{
                        background: "transparent",
                        border: "1px solid rgba(201,168,92,0.18)",
                        borderRadius: 999,
                        color: "var(--text-muted)",
                        cursor: "pointer",
                        fontSize: 11,
                        padding: "2px 7px",
                      }}
                      type="button"
                    >
                      Supprimer
                    </button>
                  </span>
                ))}
              </div>
            ) : (
              <p style={{ color: "var(--text-muted)", fontSize: 13, margin: 0 }}>
                Aucune perte associée ajoutée pour le moment.
              </p>
            )}
          </SystemPanel>
        ) : null}

        {activeTab === "timeline" ? (
          <SystemPanel ariaLabel="Timeline des pertes" compact>
            <SystemSectionHeader eyebrow="Accumulation" title="Timeline" />
            <div style={{ display: "grid", gap: 10, marginBottom: 16 }}>
              <SystemGrid gap={10} min={220}>
                <label style={dashboardFieldStyle}>
                  <span className="label-meta">Titre de l'événement *</span>
                  <input
                    className="internal-control"
                    onChange={(event) => {
                      setTimelineTitle(event.target.value);
                      setTimelineError("");
                    }}
                    placeholder="Exemple : Fin de vie de ma mère"
                    style={dashboardControlStyle}
                    value={timelineTitle}
                  />
                </label>
                <label style={dashboardFieldStyle}>
                  <span className="label-meta">Date ou période</span>
                  <input
                    className="internal-control"
                    onChange={(event) => setTimelineDate(event.target.value)}
                    placeholder="Exemple : 2026, printemps 2026"
                    style={dashboardControlStyle}
                    value={timelineDate}
                  />
                </label>
                <label style={dashboardFieldStyle}>
                  <span className="label-meta">Type *</span>
                  <input
                    className="internal-control"
                    onChange={(event) => {
                      setTimelineType(event.target.value);
                      setTimelineError("");
                    }}
                    placeholder="Exemple : Deuil anticipé"
                    style={dashboardControlStyle}
                    value={timelineType}
                  />
                </label>
                <label style={dashboardFieldStyle}>
                  <span className="label-meta">Intensité : {timelineIntensity}/10</span>
                  <input
                    max={10}
                    min={1}
                    onChange={(event) => setTimelineIntensity(Number(event.target.value))}
                    style={{ accentColor: "var(--accent-gold)", width: "100%" }}
                    type="range"
                    value={timelineIntensity}
                  />
                </label>
              </SystemGrid>
              <label style={dashboardFieldStyle}>
                <span className="label-meta">Note courte</span>
                <textarea
                  className="internal-control"
                  onChange={(event) => setTimelineNote(event.target.value)}
                  placeholder="Ce qui rend cet événement important."
                  rows={3}
                  style={{ ...dashboardControlStyle, lineHeight: 1.6, minHeight: 86, resize: "vertical" }}
                  value={timelineNote}
                />
              </label>
              {timelineError ? <span style={{ color: "#d79a8f", fontSize: 12 }}>{timelineError}</span> : null}
              <button className="internal-button-primary" onClick={addTimelineEvent} style={{ ...dashboardButtonStyle, justifySelf: "start" }} type="button">
                Ajouter à la timeline
              </button>
            </div>
            {timeline.length > 0 ? (
              <div style={{ borderLeft: "1px solid rgba(201,168,92,0.28)", display: "grid", gap: 12, paddingLeft: 14 }}>
                {timeline.map((event) => (
                  <article key={event.id} style={{ display: "grid", gap: 5 }}>
                    <div style={{ alignItems: "center", display: "flex", gap: 8, justifyContent: "space-between" }}>
                      <p className="label-meta" style={{ margin: 0 }}>{event.date || "Date non précisée"}</p>
                      <button
                        onClick={() => deleteTimelineEvent(event.id)}
                        style={{
                          background: "transparent",
                          border: "1px solid rgba(201,168,92,0.18)",
                          borderRadius: 999,
                          color: "var(--text-muted)",
                          cursor: "pointer",
                          fontSize: 11,
                          padding: "2px 8px",
                        }}
                        type="button"
                      >
                        Supprimer
                      </button>
                    </div>
                    <h2 style={{ color: "var(--text-main)", fontFamily: "var(--font-serif)", fontSize: 20, fontWeight: 400, margin: 0 }}>
                      {event.titre}
                    </h2>
                    <p style={{ color: "var(--text-soft)", fontSize: 13, margin: 0 }}>
                      {event.type}{typeof event.intensite === "number" ? ` · Intensité ${event.intensite}/10` : ""}
                    </p>
                    {event.note ? <p className="editorial-body" style={{ margin: 0 }}>{event.note}</p> : null}
                  </article>
                ))}
              </div>
            ) : (
              <p style={{ color: "var(--text-muted)", fontSize: 13, margin: 0 }}>
                Aucun événement ajouté à la timeline.
              </p>
            )}
          </SystemPanel>
        ) : null}

        {activeTab === "journal" ? (
          <SystemPanel ariaLabel="Journal des pertes" compact>
            <SystemSectionHeader eyebrow="Suivi" title="Journal" />
            <div style={{ display: "grid", gap: 10, marginBottom: 16 }}>
              <SystemGrid gap={10} min={220}>
                <label style={dashboardFieldStyle}>
                  <span className="label-meta">Émotion principale *</span>
                  <input
                    className="internal-control"
                    onChange={(event) => {
                      setJournalEmotion(event.target.value);
                      setJournalError("");
                    }}
                    placeholder="Exemple : tristesse, colère, vide"
                    style={dashboardControlStyle}
                    value={journalEmotion}
                  />
                </label>
                <label style={dashboardFieldStyle}>
                  <span className="label-meta">Intensité : {journalIntensity}/10</span>
                  <input
                    max={10}
                    min={1}
                    onChange={(event) => setJournalIntensity(Number(event.target.value))}
                    style={{ accentColor: "var(--accent-gold)", width: "100%" }}
                    type="range"
                    value={journalIntensity}
                  />
                </label>
                <label style={dashboardFieldStyle}>
                  <span className="label-meta">Déclencheur</span>
                  <input
                    className="internal-control"
                    onChange={(event) => setJournalTrigger(event.target.value)}
                    placeholder="Exemple : appel, photo, date, silence"
                    style={dashboardControlStyle}
                    value={journalTrigger}
                  />
                </label>
              </SystemGrid>
              <label style={dashboardFieldStyle}>
                <span className="label-meta">Texte *</span>
                <textarea
                  className="internal-control"
                  onChange={(event) => {
                    setJournalText(event.target.value);
                    setJournalError("");
                  }}
                  placeholder="Qu'est-ce qui a été difficile aujourd'hui ?"
                  rows={4}
                  style={{ ...dashboardControlStyle, lineHeight: 1.6, minHeight: 110, resize: "vertical" }}
                  value={journalText}
                />
              </label>
              {journalError ? <span style={{ color: "#d79a8f", fontSize: 12 }}>{journalError}</span> : null}
              <button className="internal-button-primary" onClick={addJournalEntry} style={{ ...dashboardButtonStyle, justifySelf: "start" }} type="button">
                Ajouter au journal
              </button>
            </div>
            {journal.length > 0 ? (
              <div style={{ display: "grid", gap: 10 }}>
                {journal.map((entry) => (
                  <article className="chapter-card" key={entry.id} style={{ display: "grid", gap: 6, marginBottom: 0, padding: 14 }}>
                    <div style={{ alignItems: "center", display: "flex", gap: 8, justifyContent: "space-between" }}>
                      <p className="label-meta" style={{ margin: 0 }}>{formatDateFr(entry.date)}</p>
                      <button
                        onClick={() => deleteJournalEntry(entry.id)}
                        style={{
                          background: "transparent",
                          border: "1px solid rgba(201,168,92,0.18)",
                          borderRadius: 999,
                          color: "var(--text-muted)",
                          cursor: "pointer",
                          fontSize: 11,
                          padding: "2px 8px",
                        }}
                        type="button"
                      >
                        Supprimer
                      </button>
                    </div>
                    <p style={{ color: "var(--text-soft)", fontSize: 13, margin: 0 }}>
                      {entry.emotion} · Intensité {entry.intensite}/10
                    </p>
                    {entry.declencheur ? <p style={{ color: "var(--text-muted)", fontSize: 12, margin: 0 }}>Déclencheur : {entry.declencheur}</p> : null}
                    <p className="editorial-body" style={{ margin: 0, whiteSpace: "pre-wrap" }}>{entry.texte}</p>
                  </article>
                ))}
              </div>
            ) : (
              <p style={{ color: "var(--text-muted)", fontSize: 13, margin: 0 }}>
                Aucune entrée journal pour le moment.
              </p>
            )}
          </SystemPanel>
        ) : null}

        {activeTab === "memory" ? (
          <SystemPanel ariaLabel="Mémoire vivante" compact>
            <SystemSectionHeader eyebrow="Mémoire active" title="Mémoire" />
            <div style={{ display: "grid", gap: 10, marginBottom: 16 }}>
              <SystemGrid gap={10} min={220}>
                <label style={dashboardFieldStyle}>
                  <span className="label-meta">Section</span>
                  <select
                    className="internal-control"
                    onChange={(event) => setMemoireField(event.target.value as MemoireField)}
                    style={dashboardControlStyle}
                    value={memoireField}
                  >
                    {memoireFieldOptions.map((option) => (
                      <option key={option.value} value={option.value}>{option.label}</option>
                    ))}
                  </select>
                </label>
                <label style={dashboardFieldStyle}>
                  <span className="label-meta">Élément à conserver *</span>
                  <input
                    className="internal-control"
                    onChange={(event) => {
                      setMemoireText(event.target.value);
                      setMemoireError("");
                    }}
                    placeholder="Exemple : une phrase, un lieu, un détail"
                    style={dashboardControlStyle}
                    value={memoireText}
                  />
                </label>
              </SystemGrid>
              {memoireError ? <span style={{ color: "#d79a8f", fontSize: 12 }}>{memoireError}</span> : null}
              <button className="internal-button-primary" onClick={addMemoireItem} style={{ ...dashboardButtonStyle, justifySelf: "start" }} type="button">
                Ajouter à la mémoire
              </button>
            </div>
            {hasMemoire ? (
              <SystemGrid gap={10} min={230}>
                {memoireItems.map((item) => (
                  <article className="chapter-card" key={item.label} style={{ display: "grid", gap: 8, marginBottom: 0, padding: 14 }}>
                    <h2 style={{ color: "var(--text-main)", fontFamily: "var(--font-serif)", fontSize: 19, fontWeight: 400, margin: 0 }}>
                      {item.label}
                    </h2>
                    {arrayHasItems(item.values) ? (
                      <ul style={{ color: "var(--text-soft)", fontSize: 13, lineHeight: 1.6, margin: 0, paddingLeft: 18 }}>
                        {item.values.map((value, index) => (
                          <li key={`${value}-${index}`} style={{ marginBottom: 6 }}>
                            <span>{value}</span>
                            <button
                              onClick={() => deleteMemoireItem(item.field, index)}
                              style={{
                                background: "transparent",
                                border: "1px solid rgba(201,168,92,0.18)",
                                borderRadius: 999,
                                color: "var(--text-muted)",
                                cursor: "pointer",
                                fontSize: 11,
                                marginLeft: 8,
                                padding: "1px 7px",
                              }}
                              type="button"
                            >
                              Supprimer
                            </button>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p style={{ color: "var(--text-muted)", fontSize: 13, margin: 0 }}>Aucun élément.</p>
                    )}
                  </article>
                ))}
              </SystemGrid>
            ) : (
              <p style={{ color: "var(--text-muted)", fontSize: 13, margin: 0 }}>
                Aucun élément de mémoire vivante ajouté pour le moment.
              </p>
            )}
          </SystemPanel>
        ) : null}
      </SystemPageShell>
      {toast ? (
        <div
          style={{
            background: "rgba(21,18,14,.96)",
            border: "1px solid rgba(201,168,92,.36)",
            borderRadius: 999,
            bottom: 20,
            color: "var(--accent-gold)",
            fontSize: 13,
            left: "50%",
            padding: "10px 14px",
            position: "fixed",
            transform: "translateX(-50%)",
            zIndex: 90,
          }}
        >
          {toast}
        </div>
      ) : null}
    </main>
  );
}
