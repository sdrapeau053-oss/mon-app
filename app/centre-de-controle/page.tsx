"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { BackLink } from "@/components/ui/back-link";
import {
  StateTile,
  SystemGrid,
  SystemPageShell,
  SystemPanel,
  SystemSectionHeader,
} from "@/components/system-ui";
import {
  getChapitresTome1Ecrits,
  getDateModificationChapitreTome1,
  getNumeroChapitreTome1,
  lireChapitresTome1DepuisStorage,
} from "@/lib/tome1-chapters";
import {
  buildSystemOrchestratorState,
  emptyCentreQuickSettings,
  readCentreQuickSettings,
  readStoredOrchestratorState,
  saveCentreQuickSettings,
  saveGlobalHardDayPreference,
  saveStoredOrchestratorState,
  type CentreQuickSettings,
  type SystemOrchestratorState,
} from "@/lib/system-orchestrator";
import { getContinuitySummary, readContinuity, type ContinuitySummary, type StrateContinuity } from "@/lib/continuity";
import { getTodayDecision, type TodayDecision } from "@/lib/centre-intelligent";
import { getUxConsolidationStats } from "@/lib/consolidation-ux";
import { getRepetitionExecutiveStats } from "@/lib/editorial-repetitions";
import { getAiApplicationsStats } from "@/lib/freelance-ai-applications";

type DailyTask = {
  id: string;
  label: string;
  done: boolean;
};

type DailyState = {
  energie: string;
  hardDay: boolean;
  note: string;
  priorite: string;
  tasks: DailyTask[];
};

type SystemState = {
  energie?: string;
  manuscrit?: string;
  priorite?: string;
};

type ModuleEntry = {
  id?: number;
  date?: string;
  values?: Record<string, string>;
};

type TachesMenageresData = {
  statuts?: Record<string, "non-fait" | "fait" | "reporte">;
};

const NORMAL_TASKS: DailyTask[] = [
  { id: "matin-fille", label: "Fille prête, école", done: false },
  { id: "matin-reset", label: "Reset personnel — café, silence", done: false },
  { id: "corps-mouvement", label: "Mouvement ou marche", done: false },
  { id: "corps-soin", label: "Soins, repas, hydratation", done: false },
  { id: "manuscrit-ecriture", label: "Écrire ou réviser", done: false },
  { id: "manuscrit-fragment", label: "Ancrer un fragment", done: false },
  { id: "freelance-action", label: "Une action client ou prospect", done: false },
  { id: "freelance-contenu", label: "Publier ou préparer contenu", done: false },
  { id: "maison-essentiel", label: "Tâche essentielle du jour", done: false },
  { id: "soir-famille", label: "Temps famille — présente", done: false },
  { id: "soir-fermeture", label: "Fermer la journée sans culpabilité", done: false },
];

const HARD_DAY_TASKS: DailyTask[] = [
  { id: "hard-corps", label: "Nourrir et hydrater le corps", done: false },
  { id: "hard-action", label: "Une seule micro-action utile", done: false },
  { id: "hard-soir", label: "Fermer la journée sans culpabilité", done: false },
];

const HOUSE_TASK_COUNT = 17;
const AUTHOR_WEEKLY_GOAL_KEY = "auteur-objectif-semaine";

const quickLinks = [
  { href: "/ecrire-maintenant", label: "Écrire" },
  { href: "/manuscrit", label: "Manuscrit" },
  { href: "/daily-system", label: "Daily" },
  { href: "/life-operating-system", label: "Life OS" },
  { href: "/malika", label: "Malika" },
  { href: "/urgence-malika", label: "Urgence Malika" },
  { href: "/taches-menageres", label: "Maison" },
  { href: "/aide-memoire", label: "Aide mémoire" },
];

const uxStats = getUxConsolidationStats();

const defaultDailyState: DailyState = {
  energie: "",
  hardDay: false,
  note: "",
  priorite: "",
  tasks: NORMAL_TASKS,
};

function todayKey() {
  return `daily-system-${new Date().toLocaleDateString("fr-CA")}`;
}

function parseJson<T>(key: string, fallback: T): T {
  try {
    const saved = localStorage.getItem(key);
    return saved ? ({ ...fallback, ...JSON.parse(saved) } as T) : fallback;
  } catch {
    return fallback;
  }
}

function readDailyState(): DailyState {
  const saved = parseJson<Partial<DailyState>>(todayKey(), {});
  const hardDay = Boolean(saved.hardDay);
  const template = hardDay ? HARD_DAY_TASKS : NORMAL_TASKS;
  const savedTasks = Array.isArray(saved.tasks) ? saved.tasks : [];

  return {
    energie: saved.energie || "",
    hardDay,
    note: saved.note || "",
    priorite: saved.priorite || "",
    tasks: template.map((task) => ({
      ...task,
      done: Boolean(savedTasks.find((savedTask) => savedTask.id === task.id)?.done),
    })),
  };
}

function readEntries(key: string): ModuleEntry[] {
  try {
    const saved = localStorage.getItem(key);
    const parsed = saved ? JSON.parse(saved) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function getHouseStats() {
  const data = parseJson<TachesMenageresData>("taches-menageres-data", { statuts: {} });
  const statuses = Object.values(data.statuts || {});
  const done = statuses.filter((status) => status === "fait").length;
  const remaining = Math.max(HOUSE_TASK_COUNT - done, 0);

  return { done, remaining, total: HOUSE_TASK_COUNT };
}

function isDoneStatus(value: string) {
  const normalized = value.toLowerCase();
  return (
    normalized.includes("fait") ||
    normalized.includes("stable") ||
    normalized.includes("termin") ||
    normalized.includes("compl")
  );
}

function isUrgencyActive(entry: ModuleEntry) {
  const values = Object.values(entry.values || {}).join(" ").toLowerCase();

  if (!values.trim()) return false;
  if (isDoneStatus(values)) return false;

  return (
    values.includes("urgent") ||
    values.includes("critique") ||
    values.includes("élev") ||
    values.includes("risque") ||
    values.includes("crise")
  );
}

function formatValue(value: string, fallback = "Non renseigné") {
  return value.trim() || fallback;
}

function labelFromChapterId(chapterId: string) {
  if (!chapterId) return "Aucun";
  const number = chapterId.match(/\d+/)?.[0];
  return number ? `Chapitre ${number}` : chapterId;
}

function getNextAction({
  criticalTask,
  daily,
  houseRemaining,
}: {
  criticalTask: string;
  daily: DailyState;
  houseRemaining: number;
}) {
  const priority = daily.priorite.toLowerCase();
  const energy = daily.energie.toLowerCase();

  if (daily.hardDay || energy.includes("fatigue")) return "repos recommandé";
  if (criticalTask.toLowerCase().includes("reset") || criticalTask.toLowerCase().includes("fille")) {
    return "terminer routine matin";
  }
  if (priority.includes("écrire") || priority.includes("ecrire") || priority.includes("manuscrit")) {
    return "écrire 15 minutes";
  }
  if (houseRemaining > 0) return "faire une tâche maison";
  return criticalTask || "écrire 15 minutes";
}

function getActionList({
  criticalTask,
  daily,
  houseRemaining,
}: {
  criticalTask: string;
  daily: DailyState;
  houseRemaining: number;
}) {
  const primary = getNextAction({ criticalTask, daily, houseRemaining });
  const actions = [primary];

  if (!actions.includes("écrire 15 minutes")) actions.push("écrire 15 minutes");
  if (houseRemaining > 0 && !actions.includes("faire une tâche maison")) actions.push("faire une tâche maison");
  if ((daily.hardDay || daily.energie.toLowerCase().includes("fatigue")) && !actions.includes("repos recommandé")) {
    actions.push("repos recommandé");
  }

  return actions.slice(0, 3);
}

export default function CentreDeControlePage() {
  const [hydrated, setHydrated] = useState(false);
  const [daily, setDaily] = useState<DailyState>(defaultDailyState);
  const [globalHardDay, setGlobalHardDay] = useState(false);
  const [quickOpen, setQuickOpen] = useState(false);
  const [quickSettings, setQuickSettings] = useState<CentreQuickSettings>(emptyCentreQuickSettings);
  const [orchestratorState, setOrchestratorState] = useState<SystemOrchestratorState | null>(null);
  const [continuity, setContinuity] = useState<StrateContinuity | null>(null);
  const [continuitySummary, setContinuitySummary] = useState<ContinuitySummary | null>(null);
  const [todayDecision, setTodayDecision] = useState<TodayDecision | null>(null);
  const [systemState, setSystemState] = useState<SystemState>({});
  const [routines, setRoutines] = useState<ModuleEntry[]>([]);
  const [urgenciesActive, setUrgenciesActive] = useState(0);
  const [houseStats, setHouseStats] = useState({ done: 0, remaining: HOUSE_TASK_COUNT, total: HOUSE_TASK_COUNT });
  const [aiApplicationStats, setAiApplicationStats] = useState({
    count: 0,
    mainStatus: "Aucune candidature",
    nextAction: "Adapter ton profil LinkedIn pour Alignerr",
  });
  const [manuscriptStats, setManuscriptStats] = useState({
    activeChapter: "Aucun",
    lastChapter: "Aucun",
    progress: 0,
    repetitionAlerts: 0,
    repetitionLevel: "faible",
    weeklyGoal: "",
    written: 0,
    total: 0,
  });
  const quickSettingsTouchedRef = useRef(false);
  const globalStateTouchedRef = useRef(false);

  useEffect(() => {
    const currentDaily = readDailyState();
    const currentSystem = parseJson<SystemState>("system-state", {});
    const currentQuickSettings = readCentreQuickSettings();
    const storedOrchestration = readStoredOrchestratorState();
    const currentRoutines = readEntries("system-routines-maison");
    const currentUrgencies = readEntries("system-urgence-malika").filter(isUrgencyActive).length;
    const currentHouseStats = getHouseStats();
    const currentContinuityRaw = readContinuity();
    const currentContinuity = getContinuitySummary(currentContinuityRaw);
    const currentAuthorGoal = localStorage.getItem(AUTHOR_WEEKLY_GOAL_KEY) || "";
    const currentAiApplicationStats = getAiApplicationsStats();
    const currentTodayDecision = getTodayDecision();
    const chapters = lireChapitresTome1DepuisStorage();
    const writtenChapters = getChapitresTome1Ecrits(chapters);
    const repetitionStats = getRepetitionExecutiveStats(chapters);
    const activeChapter = chapters.find((chapter) => !chapter.contenu.trim() && chapter.statut !== "écrit" && chapter.statut !== "scellé") || chapters[0];
    const latestChapter = [...writtenChapters].sort((a, b) =>
      getDateModificationChapitreTome1(b).localeCompare(getDateModificationChapitreTome1(a)),
    )[0];

    setDaily(currentDaily);
    setContinuity(currentContinuityRaw);
    setContinuitySummary(currentContinuity);
    setTodayDecision(currentTodayDecision);
    setQuickSettings(currentQuickSettings);
    setSystemState(currentSystem);
    setRoutines(currentRoutines);
    setUrgenciesActive(Math.max(currentUrgencies, storedOrchestration.urgenceActive ? 1 : 0));
    setHouseStats(currentHouseStats);
    setAiApplicationStats(currentAiApplicationStats);
    setManuscriptStats({
      activeChapter: activeChapter ? `Ch. ${getNumeroChapitreTome1(activeChapter.id)} · ${activeChapter.titre}` : "Aucun",
      lastChapter: latestChapter?.titre || labelFromChapterId(currentSystem.manuscrit || ""),
      progress: chapters.length ? Math.round((writtenChapters.length / chapters.length) * 100) : 0,
      repetitionAlerts: repetitionStats.alertsCount,
      repetitionLevel: repetitionStats.globalLevel,
      written: writtenChapters.length,
      total: chapters.length,
      weeklyGoal: currentAuthorGoal,
    });
    setGlobalHardDay(storedOrchestration.journeeDifficile || currentDaily.hardDay);
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    if (!quickSettingsTouchedRef.current) return;
    saveCentreQuickSettings({ ...quickSettings, updatedAt: new Date().toISOString() });
  }, [hydrated, quickSettings]);

  function toggleGlobalHardDay() {
    globalStateTouchedRef.current = true;
    setGlobalHardDay((current) => {
      const next = !current;
      saveGlobalHardDayPreference(next);
      return next;
    });
  }

  function updateQuickSetting(key: keyof Omit<CentreQuickSettings, "updatedAt">, value: string) {
    quickSettingsTouchedRef.current = true;
    setQuickSettings((current) => ({ ...current, [key]: value }));
  }

  const doneDailyTasks = daily.tasks.filter((task) => task.done).length;
  const remainingDailyTasks = daily.tasks.length - doneDailyTasks;
  const criticalTask = daily.tasks.find((task) => !task.done)?.label || "Aucune tâche critique";
  const routinesDone = routines.filter((entry) => isDoneStatus(entry.values?.statut || "")).length;
  const displayedPriority = formatValue(quickSettings.priorite, daily.priorite || systemState.priorite || "");
  const displayedEnergy = formatValue(quickSettings.energie, daily.energie || systemState.energie || "");
  const displayedCriticalTask = formatValue(quickSettings.actionCritique, criticalTask);
  const effectiveDaily = {
    ...daily,
    energie: quickSettings.energie.trim() || daily.energie,
    hardDay: daily.hardDay || globalHardDay,
    priorite: quickSettings.priorite.trim() || daily.priorite,
  };
  const nextActions = getActionList({ criticalTask, daily: effectiveDaily, houseRemaining: houseStats.remaining });
  const localBrain = useMemo(
    () =>
      buildSystemOrchestratorState({
        dailyTasks: effectiveDaily.tasks,
        energy: effectiveDaily.energie,
        hardDay: effectiveDaily.hardDay,
        houseRemaining: houseStats.remaining,
        manuscriptProgress: manuscriptStats.progress,
        priority: effectiveDaily.priorite || systemState.priorite,
        routinesDone,
        urgenciesActive,
      }),
    [
      effectiveDaily.energie,
      effectiveDaily.hardDay,
      effectiveDaily.priorite,
      effectiveDaily.tasks,
      houseStats.remaining,
      manuscriptStats.progress,
      routinesDone,
      systemState.priorite,
      urgenciesActive,
    ],
  );
  useEffect(() => {
    if (!hydrated) return;
    setOrchestratorState(localBrain);
    if (!globalStateTouchedRef.current && !quickSettingsTouchedRef.current) return;
    const storedOrchestration = readStoredOrchestratorState();
    saveStoredOrchestratorState({
      ...storedOrchestration,
      ...localBrain,
      urgenceActive: storedOrchestration.urgenceActive || localBrain.urgenceActive,
      sourceUrgence: storedOrchestration.sourceUrgence || localBrain.sourceUrgence,
      journeeDifficile: globalHardDay || localBrain.journeeDifficile,
    });
  }, [globalHardDay, hydrated, localBrain]);
  const visibleQuickLinks = globalHardDay || localBrain.stabilizationMode
    ? quickLinks.filter((link) => ["Daily", "Life OS", "Maison", "Aide mémoire"].includes(link.label))
    : quickLinks;
  const visibleProgress = globalHardDay || localBrain.stabilizationMode
    ? [
        {
          detail: `${remainingDailyTasks} Daily · ${houseStats.remaining} maison`,
          label: "Tâches restantes",
          value: `${remainingDailyTasks + houseStats.remaining}`,
        },
        {
          detail: routines.length ? `${routinesDone}/${routines.length} routines suivies` : "Aucune routine suivie",
          label: "Routines faites",
          value: `${routinesDone}`,
        },
      ]
    : [
        {
          detail: `${remainingDailyTasks} Daily · ${houseStats.remaining} maison`,
          label: "Tâches restantes",
          value: `${remainingDailyTasks + houseStats.remaining}`,
        },
        {
          detail: routines.length ? `${routinesDone}/${routines.length} routines suivies` : "Aucune routine suivie",
          label: "Routines faites",
          value: `${routinesDone}`,
        },
        {
          detail: `${manuscriptStats.written}/${manuscriptStats.total} chapitres écrits`,
          label: "Progression manuscrit",
          value: `${manuscriptStats.progress}%`,
        },
        {
          detail: hydrated ? "Lecture locale seulement" : "Chargement local",
          label: "Dernier chapitre travaillé",
          value: manuscriptStats.lastChapter,
        },
      ];
  const displayedNextActions = quickSettings.prochaineAction.trim()
    ? [quickSettings.prochaineAction.trim(), ...nextActions.filter((action) => action !== quickSettings.prochaineAction.trim())].slice(0, 3)
    : nextActions;
  const primaryRecommendation = quickSettings.prochaineAction.trim() || localBrain.recommendation.primary;
  const secondaryRecommendations = Array.from(
    new Set([
      quickSettings.actionCritique.trim(),
      ...localBrain.recommendation.secondary,
      ...displayedNextActions,
    ].filter(Boolean)),
  )
    .filter((action) => action !== primaryRecommendation)
    .slice(0, globalHardDay || localBrain.stabilizationMode ? 2 : 3);
  const displayedContinuity = continuitySummary || {
    elapsedLabel: "Non renseigné",
    lastActivity: "Aucune activité récente",
    lastPageLabel: "Non renseigné",
    resumeHref: "/centre-de-controle",
    suggestedResume: "Ouvrir le Centre",
  };

  return (
    <main className="internal-page">
      <SystemPageShell maxWidth={1120} padding="8px 24px 14px">
        <header
          className="internal-header"
          style={{
            alignItems: "end",
            display: "grid",
            gap: 10,
            gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
            marginBottom: 7,
            paddingBottom: 7,
          }}
        >
          <div>
            <BackLink label="Système" />
            <p className="internal-kicker" style={{ marginTop: 6 }}>
              Pilotage central
            </p>
            <h1 className="internal-title" style={{ fontSize: "clamp(1.2rem, 1.7vw, 1.62rem)" }}>
              Centre de contrôle
            </h1>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 8 }}>
              <Link className="internal-button" href="/guide-strate">
                Besoin d’aide ?
              </Link>
            </div>
          </div>
          <p
            className="internal-subtitle"
            style={{
              fontSize: "0.72rem",
              lineHeight: 1.32,
              margin: 0,
              maxWidth: 340,
            }}
          >
            Une vue sobre pour savoir quoi prioriser, ouvrir le bon module et avancer sans surcharge.
          </p>
        </header>

        {todayDecision && (
          <SystemPanel compact style={{ marginBottom: 7, padding: 9 }}>
            <SystemGrid gap={8} min={260}>
              <div>
                <p className="editorial-label" style={{ margin: "0 0 4px" }}>
                  Aujourd’hui
                </p>
                <h2 className="editorial-title" style={{ fontSize: "1.05rem", margin: 0 }}>
                  {todayDecision.action}
                </h2>
                <p className="editorial-body" style={{ fontSize: 12.5, margin: "6px 0 0" }}>
                  Temps recommandé : {todayDecision.time}
                </p>
              </div>
              <div style={{ alignItems: "center", display: "flex", flexWrap: "wrap", gap: 8 }}>
                <Link className="internal-button-primary" href={todayDecision.href}>
                  Commencer
                </Link>
                <Link className="internal-button" href="/centre-intelligent">
                  Pourquoi ?
                </Link>
              </div>
            </SystemGrid>
          </SystemPanel>
        )}

        <SystemPanel compact style={{ marginBottom: 7, padding: 7 }}>
          <SystemGrid gap={7} min={260}>
            <StateTile label="État local" value={(orchestratorState || localBrain).mode} />
            <StateTile label="Urgences actives" value={String(urgenciesActive)} />
            <button
              className={globalHardDay ? "internal-button-primary" : "internal-button"}
              onClick={toggleGlobalHardDay}
              style={{
                borderRadius: 9,
                minHeight: 43,
                padding: "8px 10px",
                textAlign: "left",
                width: "100%",
              }}
              type="button"
            >
              Journée difficile {globalHardDay ? "active" : ""}
            </button>
          </SystemGrid>
        </SystemPanel>

        <SystemPanel compact style={{ marginBottom: 7, padding: 7 }}>
          <SystemGrid gap={6} min={260}>
            <StateTile label="Priorité" value={displayedPriority} />
            <StateTile label="Énergie" value={displayedEnergy} />
            <StateTile label="Surcharge" value={localBrain.indicators[0]?.value || "À observer"} />
            <StateTile label="Action critique" value={displayedCriticalTask} />
          </SystemGrid>
        </SystemPanel>

        <SystemPanel compact style={{ marginBottom: 7, padding: 7 }}>
          <button
            className="soft-button"
            onClick={() => setQuickOpen((current) => !current)}
            style={{
              alignItems: "center",
              display: "flex",
              fontSize: 12,
              justifyContent: "space-between",
              padding: 0,
              textAlign: "left",
              width: "100%",
            }}
            type="button"
          >
            <span>
              <span className="editorial-label">Réglage rapide du jour</span>
              <span style={{ color: "#d9cdb8", display: "block", fontSize: 12, marginTop: 3 }}>
                Modifier rapidement la journée
              </span>
            </span>
            <span aria-hidden="true" style={{ color: "#c9a84c", fontSize: 14 }}>
              {quickOpen ? "−" : "+"}
            </span>
          </button>

          {quickOpen && (
            <div
              style={{
                display: "grid",
                gap: 6,
                gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
                marginTop: 8,
              }}
            >
              <QuickInput label="Priorité du jour" value={quickSettings.priorite} onChange={(value) => updateQuickSetting("priorite", value)} />
              <QuickInput label="Énergie du jour" value={quickSettings.energie} onChange={(value) => updateQuickSetting("energie", value)} />
              <QuickInput label="Action critique" value={quickSettings.actionCritique} onChange={(value) => updateQuickSetting("actionCritique", value)} />
              <QuickInput label="Note rapide" value={quickSettings.noteRapide} onChange={(value) => updateQuickSetting("noteRapide", value)} />
              <QuickInput label="Prochaine action" value={quickSettings.prochaineAction} onChange={(value) => updateQuickSetting("prochaineAction", value)} />
            </div>
          )}
        </SystemPanel>

        <SystemPanel compact style={{ marginBottom: 7, padding: 7 }}>
          <SystemSectionHeader title="Continuité" />
          <SystemGrid gap={6} min={220}>
            <StateTile label="Dernière activité" value={displayedContinuity.lastActivity} />
            <StateTile label="Dernière page" value={displayedContinuity.lastPageLabel} />
            <StateTile label="Temps écoulé" value={displayedContinuity.elapsedLabel} />
            <StateTile label="Prochaine reprise suggérée" value={displayedContinuity.suggestedResume} />
          </SystemGrid>
        </SystemPanel>

        {(continuity?.lastChapter || continuity?.lastChapterId) && (
          <SystemPanel compact style={{ marginBottom: 7, padding: 7 }}>
            <SystemSectionHeader title="Dernière activité manuscrit" />
            <SystemGrid gap={6} min={220}>
              <StateTile label="Chapitre" value={continuity.lastChapter || "Chapitre récent"} />
              <StateTile label="Date" value={continuity.writingUpdatedAt ? new Date(continuity.writingUpdatedAt).toLocaleDateString("fr-CA") : "Non renseignée"} />
              <StateTile label="Temps écoulé" value={displayedContinuity.elapsedLabel} />
            </SystemGrid>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 10 }}>
              <Link className="internal-button-primary" href="/ecrire-maintenant">
                Continuer
              </Link>
            </div>
          </SystemPanel>
        )}

        <SystemPanel compact style={{ marginBottom: 7, padding: 7 }}>
          <SystemSectionHeader title="Auteur" />
          <SystemGrid gap={6} min={220}>
            <StateTile label="Progression tome" value={`${manuscriptStats.progress}%`} />
            <StateTile label="Chapitre actif" value={manuscriptStats.activeChapter} />
            <StateTile label="Objectif semaine" value={manuscriptStats.weeklyGoal || "Non défini"} />
          </SystemGrid>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 10 }}>
            <Link className="internal-button-primary" href="/tableau-auteur">
              Ouvrir Tableau Auteur
            </Link>
          </div>
        </SystemPanel>

        <SystemPanel compact style={{ marginBottom: 7, padding: 7 }}>
          <SystemSectionHeader title="Candidature IA" />
          <SystemGrid gap={6} min={220}>
            <StateTile label="Candidatures" value={String(aiApplicationStats.count)} />
            <StateTile label="Statut principal" value={aiApplicationStats.mainStatus} />
            <StateTile label="Prochaine action" value={aiApplicationStats.nextAction} />
          </SystemGrid>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 10 }}>
            <Link className="internal-button" href="/freelance-candidature-ia">
              Ouvrir Candidature IA
            </Link>
          </div>
        </SystemPanel>

        <SystemPanel compact style={{ marginBottom: 7, padding: 7 }}>
          <SystemSectionHeader title="Répétitions" />
          <SystemGrid gap={6} min={220}>
            <StateTile label="Alertes critiques" value={String(manuscriptStats.repetitionAlerts)} />
            <StateTile label="Niveau global" value={manuscriptStats.repetitionLevel} />
          </SystemGrid>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 10 }}>
            <Link className="internal-button" href="/audit-repetitions">
              Ouvrir Audit Répétitions
            </Link>
          </div>
        </SystemPanel>

        <SystemPanel compact style={{ marginBottom: 7, padding: 7 }}>
          <SystemSectionHeader title="UX" />
          <SystemGrid gap={6} min={180}>
            <StateTile label="Routes totales" value={String(uxStats.totalRoutes)} />
            <StateTile label="Essentielles" value={String(uxStats.essential)} />
            <StateTile label="Avancées" value={String(uxStats.advanced)} />
            <StateTile label="Chevauchements" value={String(uxStats.overlaps)} />
          </SystemGrid>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 10 }}>
            <Link className="internal-button" href="/consolidation-ux">
              Ouvrir Consolidation UX
            </Link>
          </div>
        </SystemPanel>

        <SystemPanel compact style={{ marginBottom: 7, padding: 7 }}>
          <SystemSectionHeader title="Accès rapides" />
          <SystemGrid gap={5} min={140}>
            {visibleQuickLinks.map((link) => (
              <Link
                className="internal-button"
                href={link.href}
                key={link.href}
                style={{
                  borderRadius: 9,
                  display: "flex",
                  justifyContent: "center",
                  lineHeight: 1.15,
                  minHeight: 27,
                  padding: "6px 8px",
                  textAlign: "center",
                  fontSize: 11.5,
                }}
              >
                {link.label}
              </Link>
            ))}
          </SystemGrid>
        </SystemPanel>

        <SystemGrid gap={7} min={310}>
          <SystemPanel compact style={{ marginBottom: 0, padding: 8 }}>
            <SystemSectionHeader title="Progression" />
            <div style={{ display: "grid", gap: 5 }}>
              {visibleProgress.map((item) => (
                <ProgressLine detail={item.detail} key={item.label} label={item.label} value={item.value} />
              ))}
            </div>
          </SystemPanel>

          <SystemPanel compact style={{ marginBottom: 0, padding: 8 }}>
            <SystemSectionHeader title="État global" />
            <SystemGrid gap={6} min={140}>
              {localBrain.indicators.map((item) => (
                <StateTile key={item.label} label={item.label} value={item.value} />
              ))}
            </SystemGrid>
          </SystemPanel>
        </SystemGrid>

        <SystemPanel compact style={{ marginBottom: 0, marginTop: 7, padding: "7px 9px" }}>
          <SystemGrid gap={7} min={260}>
            <div>
              <p className="editorial-label" style={{ margin: "0 0 3px" }}>
                Recommandation
              </p>
              <h2 className="editorial-title" style={{ fontSize: "0.95rem", margin: 0 }}>
                Que faire maintenant ?
              </h2>
              <p style={{ color: "#f1e7d5", fontSize: 13, fontWeight: 650, margin: "5px 0 0" }}>
                → {primaryRecommendation}
              </p>
            </div>
            <ul
              style={{
                alignItems: "center",
                color: "#f1e7d5",
                display: "grid",
                gap: 4,
                gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
                listStyle: "none",
                margin: 0,
                padding: 0,
              }}
            >
              {secondaryRecommendations.map((action) => (
                <li
                  key={action}
                  style={{
                    background: "rgba(20, 19, 17, 0.64)",
                    border: "1px solid rgba(201, 168, 92, 0.13)",
                    borderRadius: 9,
                    fontSize: 12.5,
                    fontWeight: 500,
                    lineHeight: 1.2,
                    minHeight: 27,
                    padding: "6px 8px",
                  }}
                >
                  → {action}
                </li>
              ))}
            </ul>
          </SystemGrid>
        </SystemPanel>
      </SystemPageShell>
    </main>
  );
}

function QuickInput({
  label,
  onChange,
  value,
}: {
  label: string;
  onChange: (value: string) => void;
  value: string;
}) {
  return (
    <label style={{ display: "grid", gap: 4 }}>
      <span className="word-count" style={{ margin: 0 }}>
        {label}
      </span>
      <input
        className="internal-control"
        onChange={(event) => onChange(event.target.value)}
        placeholder="Optionnel"
        style={{
          fontFamily: "inherit",
          fontSize: 12,
          minHeight: 30,
          padding: "6px 8px",
          width: "100%",
        }}
        value={value}
      />
    </label>
  );
}

function ProgressLine({ detail, label, value }: { detail: string; label: string; value: string }) {
  return (
    <article
      style={{
        borderBottom: "1px solid rgba(201, 168, 92, 0.1)",
        display: "grid",
        gap: 1,
        paddingBottom: 5,
      }}
    >
      <div style={{ alignItems: "baseline", display: "flex", gap: 12, justifyContent: "space-between" }}>
        <span style={{ color: "#c9bea9", fontSize: 12.5 }}>{label}</span>
        <strong style={{ color: "#f1e7d5", fontSize: 13.5, fontWeight: 560, textAlign: "right" }}>{value}</strong>
      </div>
      <span style={{ color: "#9a9080", fontSize: 10.5, lineHeight: 1.2 }}>{detail}</span>
    </article>
  );
}
