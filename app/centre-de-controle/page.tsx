"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { SystemPageShell } from "@/components/system-ui";
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
import { BrainFogScanner } from "./components/BrainFogScanner";
import { CentrePageHeader } from "./components/CentrePageHeader";
import { CentreStatusPanels } from "./components/CentreStatusPanels";
import { CentreTodayPanel } from "./components/CentreTodayPanel";
import { CommandCognitivePanel } from "./components/CommandCognitivePanel";
import { CommandNextActions } from "./components/CommandNextActions";
import { CommandPrimaryAction } from "./components/CommandPrimaryAction";
import { CommandStatusPanel } from "./components/CommandStatusPanel";
import { ExecutionJournalPanel } from "./components/ExecutionJournalPanel";
import { InsightsPanel } from "./components/InsightsPanel";
import { MentalParkingPanel } from "./components/MentalParkingPanel";
import { ProgressAndRecommendation } from "./components/ProgressAndRecommendation";
import { QuickSettingsPanel } from "./components/QuickSettingsPanel";
import { buildCommandCenterState } from "./command-center-engine";
import { readLatestBrainFogEntry } from "./brain-fog-storage";
import type { BrainFogEntry } from "./brain-fog-types";
import {
  AUTHOR_WEEKLY_GOAL_KEY,
  HOUSE_TASK_COUNT,
  defaultDailyState,
  formatValue,
  getActionList,
  getHouseStats,
  isDoneStatus,
  isUrgencyActive,
  labelFromChapterId,
  parseJson,
  quickLinks,
  readDailyState,
  readEntries,
  type DailyState,
  type ModuleEntry,
  type SystemState,
} from "./centre-control-data";

const uxStats = getUxConsolidationStats();
const BRAIN_FOG_RECENT_HOURS = 8;

function isRecentBrainFogEntry(entry: BrainFogEntry) {
  const createdAt = new Date(entry.createdAt).getTime();
  if (!Number.isFinite(createdAt)) return false;
  return Date.now() - createdAt <= BRAIN_FOG_RECENT_HOURS * 60 * 60 * 1000;
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
  const [latestBrainFogEntry, setLatestBrainFogEntry] = useState<BrainFogEntry | null>(null);
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
    const currentBrainFogEntry = readLatestBrainFogEntry();
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
    setLatestBrainFogEntry(currentBrainFogEntry);
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
  const commandCenterPreview = buildCommandCenterState({
    brainFogCause: latestBrainFogEntry && isRecentBrainFogEntry(latestBrainFogEntry) ? latestBrainFogEntry.analysis.causePrincipale : undefined,
    brainFogScore: latestBrainFogEntry && isRecentBrainFogEntry(latestBrainFogEntry) ? latestBrainFogEntry.analysis.score : undefined,
    criticalTask,
    dailyRemaining: remainingDailyTasks,
    energy: displayedEnergy,
    freelanceApplications: aiApplicationStats.count,
    hardDay: effectiveDaily.hardDay,
    houseRemaining: houseStats.remaining,
    manuscriptProgress: manuscriptStats.progress,
    priority: displayedPriority,
    routinesDone,
    routinesTotal: routines.length,
    urgencyActive: urgenciesActive > 0 || localBrain.urgenceActive,
  });
  const isSurvivalMode = commandCenterPreview.mode === "Survie";
  const commandNextActions = commandCenterPreview.nextActions.slice(0, commandCenterPreview.mode === "Essentiel" ? 2 : 3);
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
  const baseProgress = [
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
  ];
  const visibleProgress = globalHardDay || localBrain.stabilizationMode
    ? baseProgress
    : [
        ...baseProgress,
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
        <CentrePageHeader />

        <div className="grid gap-2 lg:grid-cols-[60%_40%] items-start">
          <div className="flex flex-col gap-2">
            <CommandPrimaryAction
              action={commandCenterPreview.primaryAction}
              mode={commandCenterPreview.mode}
              reason={commandCenterPreview.priorityReason}
            />
            <CommandNextActions actions={commandNextActions} mode={commandCenterPreview.mode} />
          </div>

          <div className="flex flex-col gap-2">
            <CommandCognitivePanel
              brainFogSummary={commandCenterPreview.brainFogSummary}
              cognitiveState={commandCenterPreview.cognitiveState}
              domainLoads={commandCenterPreview.domainLoads}
              mode={commandCenterPreview.mode}
            />
            <BrainFogScanner latestEntry={latestBrainFogEntry || undefined} onEntrySaved={setLatestBrainFogEntry} />
          </div>
        </div>
        {!isSurvivalMode && (
          <>
            <QuickSettingsPanel
              onToggle={() => setQuickOpen((current) => !current)}
              onUpdate={updateQuickSetting}
              quickOpen={quickOpen}
              quickSettings={quickSettings}
            />

            <ProgressAndRecommendation
              indicators={localBrain.indicators}
              primaryRecommendation={primaryRecommendation}
              secondaryRecommendations={secondaryRecommendations}
              visibleProgress={visibleProgress}
            />

            <CommandStatusPanel
              displayedCriticalTask={displayedCriticalTask}
              displayedEnergy={displayedEnergy}
              displayedPriority={displayedPriority}
              globalHardDay={globalHardDay}
              mode={(orchestratorState || localBrain).mode}
              onToggleGlobalHardDay={toggleGlobalHardDay}
              surchargeValue={localBrain.indicators[0]?.value || "À observer"}
              urgenciesActive={urgenciesActive}
            />

            <CentreTodayPanel todayDecision={todayDecision} />
            <MentalParkingPanel />
            <ExecutionJournalPanel />
            <InsightsPanel />
            <CentreStatusPanels
              aiApplicationStats={aiApplicationStats}
              continuity={continuity}
              displayedContinuity={displayedContinuity}
              manuscriptStats={manuscriptStats}
              uxStats={uxStats}
              visibleQuickLinks={visibleQuickLinks}
            />

          </>
        )}
      </SystemPageShell>
    </main>
  );
}
