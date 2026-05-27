"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { BackLink } from "@/components/ui/back-link";
import {
  StateTile,
  StatusChip,
  SystemDividerBlock,
  SystemGrid,
  SystemPageShell,
  SystemPanel,
  SystemSectionHeader,
} from "@/components/system-ui";
import { isSupabaseConfigured } from "@/lib/supabase";
import {
  loadCloudDailySystemEntry,
  saveCloudDailySystemEntry,
  type CloudDailySystemState,
} from "@/lib/cloud-sync";
import {
  buildSystemOrchestratorState,
  emptyCentreQuickSettings,
  readCentreQuickSettings,
  readStoredOrchestratorState,
  saveStoredOrchestratorState,
  type CentreQuickSettings,
} from "@/lib/system-orchestrator";

type DailyTask = {
  id: string;
  label: string;
  done: boolean;
};

type DailyBlock = {
  id: string;
  title: string;
  tasks: DailyTask[];
};

type DailyState = {
  energie: string;
  hardDay: boolean;
  note: string;
  priorite: string;
  tasks: DailyTask[];
};

type SystemState = {
  manuscrit: string;
  energie: string;
  priorite: string;
};

const SYSTEM_STATE_KEY = "system-state";

const NORMAL_BLOCKS: DailyBlock[] = [
  {
    id: "bloc-matin",
    title: "Matin",
    tasks: [
      { id: "matin-fille", label: "Fille prête, école", done: false },
      { id: "matin-reset", label: "Reset personnel — café, silence", done: false },
    ],
  },
  {
    id: "bloc-corps",
    title: "Corps",
    tasks: [
      { id: "corps-mouvement", label: "Mouvement ou marche", done: false },
      { id: "corps-soin", label: "Soins, repas, hydratation", done: false },
    ],
  },
  {
    id: "bloc-manuscrit",
    title: "Manuscrit",
    tasks: [
      { id: "manuscrit-ecriture", label: "Écrire ou réviser", done: false },
      { id: "manuscrit-fragment", label: "Ancrer un fragment", done: false },
    ],
  },
  {
    id: "bloc-freelance",
    title: "Freelance",
    tasks: [
      { id: "freelance-action", label: "Une action client ou prospect", done: false },
      { id: "freelance-contenu", label: "Publier ou préparer contenu", done: false },
    ],
  },
  {
    id: "bloc-maison",
    title: "Maison",
    tasks: [
      { id: "maison-essentiel", label: "Tâche essentielle du jour", done: false },
    ],
  },
  {
    id: "bloc-soir",
    title: "Soir",
    tasks: [
      { id: "soir-famille", label: "Temps famille — présente", done: false },
      { id: "soir-fermeture", label: "Fermer la journée sans culpabilité", done: false },
    ],
  },
];

const HARD_DAY_TASKS: DailyTask[] = [
  { id: "hard-corps", label: "Nourrir et hydrater le corps", done: false },
  { id: "hard-action", label: "Une seule micro-action utile", done: false },
  { id: "hard-soir", label: "Fermer la journée sans culpabilité", done: false },
];

const normalTasks = NORMAL_BLOCKS.flatMap((b) => b.tasks);
const ESSENTIAL_TASK_IDS = ["matin-reset", "corps-soin", "maison-essentiel"];
const QUICK_ACTION_TASK_ID = "centre-controle-prochaine-action";

const defaultSystemState: SystemState = {
  manuscrit: "chapitre-5",
  energie: "",
  priorite: "",
};

function todayKey() {
  return `daily-system-${new Date().toLocaleDateString("fr-CA")}`;
}

function todayDate() {
  return new Date().toLocaleDateString("fr-CA");
}

function mergeTaskState(template: DailyTask[], savedTasks: DailyTask[] = []) {
  return template.map((task) => ({
    ...task,
    done: savedTasks.find((saved) => saved.id === task.id)?.done ?? false,
  }));
}

function normalizeTasks(tasks: unknown): DailyTask[] {
  if (!Array.isArray(tasks)) return [];
  return tasks.filter((task): task is DailyTask => {
    if (!task || typeof task !== "object") return false;
    const candidate = task as Partial<DailyTask>;
    return typeof candidate.id === "string" && typeof candidate.label === "string";
  });
}

function readDailyState(): DailyState {
  if (typeof window === "undefined") {
    return { energie: "", hardDay: false, note: "", priorite: "", tasks: normalTasks };
  }
  try {
    const saved = localStorage.getItem(todayKey());
    if (!saved) return { energie: "", hardDay: false, note: "", priorite: "", tasks: normalTasks };
    const parsed = JSON.parse(saved) as Partial<DailyState>;
    const hardDay = Boolean(parsed.hardDay);
    return {
      energie: parsed.energie || "",
      hardDay,
      note: parsed.note || "",
      priorite: parsed.priorite || "",
      tasks: mergeTaskState(hardDay ? HARD_DAY_TASKS : normalTasks, parsed.tasks || []),
    };
  } catch {
    return { energie: "", hardDay: false, note: "", priorite: "", tasks: normalTasks };
  }
}

function normalizeDailyState(
  state: Partial<CloudDailySystemState> | null | undefined,
): DailyState {
  const hardDay = Boolean(state?.hardDay);
  return {
    energie: "",
    hardDay,
    note: state?.note || "",
    priorite: "",
    tasks: mergeTaskState(
      hardDay ? HARD_DAY_TASKS : normalTasks,
      normalizeTasks(state?.tasks),
    ),
  };
}

function saveDailyState(state: DailyState) {
  localStorage.setItem(todayKey(), JSON.stringify(state));
}

function readSystemState(): SystemState {
  try {
    const saved = localStorage.getItem(SYSTEM_STATE_KEY);
    return saved ? { ...defaultSystemState, ...JSON.parse(saved) } : defaultSystemState;
  } catch {
    return defaultSystemState;
  }
}

function saveSystemStateFromDaily(energie: string, priorite: string) {
  if (!energie && !priorite) return;
  const current = readSystemState();
  localStorage.setItem(
    SYSTEM_STATE_KEY,
    JSON.stringify({
      ...current,
      ...(energie ? { energie } : {}),
      ...(priorite ? { priorite } : {}),
    }),
  );
}

function shouldSuggestReducedMode(energy: string) {
  const normalized = energy.toLowerCase();
  return ["fatigue", "basse", "épuisée", "epuisee", "épuis", "epuis", "difficile"].some((word) =>
    normalized.includes(word),
  );
}

function hasQuickSettings(settings: CentreQuickSettings) {
  return Boolean(
    settings.priorite.trim() ||
      settings.energie.trim() ||
      settings.actionCritique.trim() ||
      settings.noteRapide.trim() ||
      settings.prochaineAction.trim(),
  );
}

function DayBlock({
  block,
  tasks,
  onToggle,
}: {
  block: DailyBlock;
  tasks: DailyTask[];
  onToggle: (id: string) => void;
}) {
  const blockTasks = tasks.filter((t) => block.tasks.some((bt) => bt.id === t.id));
  const allDone = blockTasks.length > 0 && blockTasks.every((t) => t.done);

  return (
    <div
      style={{
        background: allDone ? "rgba(122, 158, 122, 0.08)" : "rgba(16, 15, 13, 0.95)",
        border: allDone
          ? "1px solid rgba(122, 158, 122, 0.3)"
          : "1px solid rgba(198, 169, 126, 0.2)",
        borderRadius: 12,
        padding: "11px 14px",
        transition: "all 0.2s ease",
      }}
    >
      <p
        style={{
          color: allDone ? "rgba(122, 158, 122, 0.8)" : "var(--accent, #c6a97e)",
          fontSize: 10,
          fontWeight: 700,
          letterSpacing: "0.1em",
          margin: "0 0 8px",
          textTransform: "uppercase",
        }}
      >
        {block.title}
      </p>
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        {blockTasks.map((task) => (
          <button
            key={task.id}
            type="button"
            onClick={() => onToggle(task.id)}
            style={{
              alignItems: "center",
              background: "transparent",
              border: "none",
              color: task.done ? "rgba(239, 229, 212, 0.4)" : "#efe5d4",
              cursor: "pointer",
              display: "grid",
              font: "inherit",
              gap: 10,
              gridTemplateColumns: "18px 1fr",
              padding: "3px 0",
              textAlign: "left",
              width: "100%",
            }}
          >
            <span
              aria-hidden="true"
              style={{
                alignItems: "center",
                background: task.done ? "rgba(122, 158, 122, 0.9)" : "transparent",
                border: task.done
                  ? "1px solid rgba(122, 158, 122, 0.9)"
                  : "1px solid rgba(198, 169, 126, 0.4)",
                borderRadius: 999,
                color: "#fff",
                display: "flex",
                fontSize: 11,
                flexShrink: 0,
                height: 18,
                justifyContent: "center",
                transition: "all 0.2s ease",
                width: 18,
              }}
            >
              {task.done ? "✓" : ""}
            </span>
            <span
              style={{
                fontSize: 15,
                fontWeight: 500,
                lineHeight: 1.3,
                opacity: task.done ? 0.5 : 1,
                textDecoration: task.done ? "line-through" : "none",
                transition: "all 0.2s ease",
              }}
            >
              {task.label}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}

export default function DailySystemPage() {
  const initialOrchestration =
    typeof window === "undefined" ? null : readStoredOrchestratorState();
  const initialQuickSettings =
    typeof window === "undefined" ? emptyCentreQuickSettings : readCentreQuickSettings();
  const [hydrated, setHydrated] = useState(false);
  const [cloudLoading, setCloudLoading] = useState(true);
  const [cloudStatus, setCloudStatus] = useState("");
  const [energie, setEnergie] = useState("");
  const [hardDay, setHardDay] = useState(false);
  const [orchestratedHardDay, setOrchestratedHardDay] = useState(
    Boolean(initialOrchestration?.journeeDifficile),
  );
  const [orchestratedStabilization, setOrchestratedStabilization] = useState(
    Boolean(initialOrchestration?.urgenceActive),
  );
  const [orchestratedSuggestions, setOrchestratedSuggestions] = useState<string[]>([]);
  const [quickSettings, setQuickSettings] = useState<CentreQuickSettings>(initialQuickSettings);
  const [minimumEntryMode, setMinimumEntryMode] = useState(false);
  const [tasks, setTasks] = useState<DailyTask[]>(normalTasks);
  const [note, setNote] = useState("");
  const [priorite, setPriorite] = useState("");
  const initialSaveSkippedRef = useRef(false);

  useEffect(() => {
    const searchParams = new URLSearchParams(window.location.search);
    setMinimumEntryMode(searchParams.get("mode") === "minimum" || searchParams.get("from") === "lost");

    let cancelled = false;
    async function loadDailyState() {
      setCloudLoading(true);
      const cloudResult = await loadCloudDailySystemEntry(todayDate());
      const savedState = cloudResult.data
        ? normalizeDailyState(cloudResult.data)
        : readDailyState();
      if (cancelled) return;
      setHardDay(savedState.hardDay);
      setTasks(savedState.tasks);
      setNote(savedState.note);
      setEnergie(savedState.energie);
      setPriorite(savedState.priorite);
      const centreSettings = readCentreQuickSettings();
      const storedOrchestration = readStoredOrchestratorState();
      const quickEnergy = centreSettings.energie.trim();
      const effectiveEnergy = quickEnergy || savedState.energie;
      const quickReducedMode = shouldSuggestReducedMode(quickEnergy);
      const hardDaySignal = savedState.hardDay || storedOrchestration.journeeDifficile || quickReducedMode;
      const localOrchestration = buildSystemOrchestratorState({
        dailyTasks: savedState.tasks,
        energy: effectiveEnergy,
        hardDay: hardDaySignal,
        priority: centreSettings.priorite.trim() || savedState.priorite,
      });
      const hasExistingSignal = Boolean(
        savedState.hardDay ||
          savedState.energie ||
          savedState.priorite ||
          hasQuickSettings(centreSettings) ||
          storedOrchestration.updatedAt ||
          storedOrchestration.journeeDifficile ||
          storedOrchestration.urgenceActive,
      );
      if (hasExistingSignal) {
        saveStoredOrchestratorState({
          ...storedOrchestration,
          ...localOrchestration,
          urgenceActive: storedOrchestration.urgenceActive || localOrchestration.urgenceActive,
          journeeDifficile: hardDaySignal || localOrchestration.journeeDifficile,
        });
      }
      setQuickSettings(centreSettings);
      setOrchestratedHardDay(hardDaySignal || localOrchestration.journeeDifficile);
      setOrchestratedStabilization(storedOrchestration.urgenceActive || localOrchestration.urgenceActive);
      setOrchestratedSuggestions(
        [
          centreSettings.prochaineAction.trim(),
          centreSettings.actionCritique.trim(),
          localOrchestration.recommendation.primary,
          ...localOrchestration.recommendation.secondary,
        ].filter(Boolean),
      );
      setCloudStatus(
        cloudResult.data
          ? "Données cloud chargées."
          : cloudResult.error
            ? "Mode local actif."
            : "Aucune donnée cloud pour aujourd'hui.",
      );
      setCloudLoading(false);
      setHydrated(true);
    }
    loadDailyState();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    if (!initialSaveSkippedRef.current) {
      initialSaveSkippedRef.current = true;
      return;
    }
    saveDailyState({ energie, hardDay, note, priorite, tasks });
    saveSystemStateFromDaily(energie, priorite);
  }, [energie, hardDay, hydrated, note, priorite, tasks]);

  const doneCount = tasks.filter((t) => t.done).length;
  const simplifiedMode = hardDay || orchestratedHardDay || orchestratedStabilization;
  const visibleTasks = simplifiedMode
    ? tasks.filter((task) => ESSENTIAL_TASK_IDS.includes(task.id)).slice(0, 3)
    : tasks;
  const quickActionTask = quickSettings.prochaineAction.trim()
    ? [{ id: QUICK_ACTION_TASK_ID, label: quickSettings.prochaineAction.trim(), done: false }]
    : [];
  const displayTasks = [
    ...quickActionTask,
    ...(visibleTasks.length > 0 ? visibleTasks : HARD_DAY_TASKS),
  ].slice(0, simplifiedMode ? 4 : undefined);
  const displayDoneCount = simplifiedMode ? displayTasks.filter((task) => task.done).length : doneCount;
  const displayTaskCount = simplifiedMode ? displayTasks.length : tasks.length;
  const progression = displayTaskCount > 0 ? Math.round((displayDoneCount / displayTaskCount) * 100) : 0;
  const journeeReussie = progression >= 60;
  const activeBlocks = useMemo(
    () => (simplifiedMode ? NORMAL_BLOCKS.filter((block) => ["bloc-matin", "bloc-corps", "bloc-maison"].includes(block.id)) : NORMAL_BLOCKS),
    [simplifiedMode],
  );

  function toggleTask(id: string) {
    if (id === QUICK_ACTION_TASK_ID) return;
    setTasks((current) =>
      current.map((task) => (task.id === id ? { ...task, done: !task.done } : task)),
    );
  }

  function toggleHardDay() {
    setHardDay((current) => {
      const next = !current;
      setTasks((currentTasks) =>
        mergeTaskState(next ? HARD_DAY_TASKS : normalTasks, currentTasks),
      );
      setEnergie(next ? "fatigue" : "neutre");
      setPriorite(next ? "repos" : "ecrire");
      return next;
    });
  }

  async function handleCloudSave() {
    setCloudStatus("Sauvegarde cloud...");
    const result = await saveCloudDailySystemEntry(todayDate(), { hardDay, note, tasks });
    setCloudStatus(result.error ? result.error : "Sauvegarde cloud effectuée.");
  }

  return (
    <main className="internal-page">
      <SystemPageShell maxWidth={600}>
        <div
          style={{
            background: simplifiedMode
              ? "linear-gradient(180deg, rgba(198, 169, 126, 0.18), rgba(255, 250, 243, 0.7))"
              : "transparent",
            borderRadius: 18,
            transition: "background var(--motion-soft) var(--motion-ease)",
          }}
        >
        <header className="internal-header">
          <BackLink label="Système" />
          <p className="internal-kicker">Aujourd'hui</p>
          <h1 className="internal-title" style={{ fontStyle: "italic" }}>
            Daily System
          </h1>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 10 }}>
            <Link className="internal-button" href="/guide-strate">
              Besoin d’aide ?
            </Link>
          </div>
        </header>

        {minimumEntryMode && (
          <SystemPanel ariaLabel="Mode minimum" compact style={{ borderLeft: "3px solid #c6a97e" }}>
            <SystemSectionHeader title="On garde seulement l’essentiel." />
            <p style={{ color: "#b8ad99", fontSize: 12, lineHeight: 1.55, margin: "0 0 12px" }}>
              Tu peux réduire la journée maintenant et garder seulement les actions utiles.
            </p>
            {!hardDay ? (
              <button className="btn-primary" type="button" onClick={toggleHardDay} style={{ fontSize: 13, minHeight: 38, width: "100%" }}>
                Activer journée difficile
              </button>
            ) : (
              <p style={{ color: "rgba(122, 158, 122, 0.9)", fontSize: 12, fontWeight: 700, margin: 0 }}>
                Journée difficile déjà active.
              </p>
            )}
          </SystemPanel>
        )}

        {hasQuickSettings(quickSettings) && (
          <SystemPanel ariaLabel="Réglage du jour" compact>
            <SystemSectionHeader title="Réglage du jour" />
            <SystemGrid gap={7} min={150}>
              {quickSettings.priorite.trim() && <StateTile label="Priorité" value={quickSettings.priorite} />}
              {quickSettings.energie.trim() && <StateTile label="Énergie" value={quickSettings.energie} />}
              {quickSettings.actionCritique.trim() && <StateTile label="Action critique" value={quickSettings.actionCritique} />}
              {quickSettings.prochaineAction.trim() && <StateTile label="Prochaine action" value={quickSettings.prochaineAction} />}
            </SystemGrid>
            {quickSettings.noteRapide.trim() && (
              <p style={{ color: "#b8ad99", fontSize: 12, lineHeight: 1.5, margin: "8px 0 0" }}>
                {quickSettings.noteRapide}
              </p>
            )}
          </SystemPanel>
        )}

        <SystemPanel ariaLabel="Progression" compact>
          <div style={{ alignItems: "center", display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
            <span style={{ color: "var(--text-muted)", fontSize: 12 }}>
              {displayDoneCount}/{displayTaskCount} tâches
            </span>
            <span style={{ color: journeeReussie ? "rgba(122, 158, 122, 0.9)" : "var(--accent, #c6a97e)", fontSize: 12, fontWeight: 800 }}>
              {progression}%{journeeReussie ? " — journée réussie" : ""}
            </span>
          </div>
          <div style={{ background: "rgba(46, 42, 39, 0.15)", borderRadius: 999, height: 4, overflow: "hidden" }}>
            <div style={{ background: journeeReussie ? "rgba(122, 158, 122, 0.8)" : "var(--accent, #c6a97e)", borderRadius: 999, height: "100%", transition: "width 0.3s ease", width: `${progression}%` }} />
          </div>
        </SystemPanel>

        {!simplifiedMode && (
          <section aria-label="Blocs du jour" style={{ marginBottom: 12 }}>
            <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
              {activeBlocks.map((block) => (
                <DayBlock key={block.id} block={block} tasks={tasks} onToggle={toggleTask} />
              ))}
            </div>
          </section>
        )}

        {simplifiedMode && (
          <SystemPanel ariaLabel="Journée difficile" compact>
            <SystemSectionHeader title={orchestratedStabilization ? "Mode stabilisation" : "Journée difficile"} />
              <p style={{ color: "rgba(239, 229, 212, 0.5)", fontSize: 12, margin: "0 0 12px" }}>
                Objectifs limités à l’essentiel.
              </p>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {displayTasks.map((task) => (
                  <button key={task.id} type="button" onClick={() => toggleTask(task.id)}
                    style={{ alignItems: "center", background: "transparent", border: "none", color: task.done ? "rgba(239, 229, 212, 0.4)" : "#efe5d4", cursor: "pointer", display: "grid", font: "inherit", gap: 10, gridTemplateColumns: "18px 1fr", padding: "3px 0", textAlign: "left", width: "100%" }}>
                    <span aria-hidden="true" style={{ alignItems: "center", background: task.done ? "rgba(122, 158, 122, 0.9)" : "transparent", border: task.done ? "1px solid rgba(122, 158, 122, 0.9)" : "1px solid rgba(198, 169, 126, 0.4)", borderRadius: 999, color: "#fff", display: "flex", flexShrink: 0, fontSize: 11, height: 18, justifyContent: "center", transition: "all 0.2s ease", width: 18 }}>
                      {task.done ? "✓" : ""}
                    </span>
                    <span style={{ fontSize: 15, fontWeight: 500, lineHeight: 1.3, opacity: task.done ? 0.5 : 1, textDecoration: task.done ? "line-through" : "none", transition: "all 0.2s ease" }}>
                      {task.label}
                    </span>
                  </button>
                ))}
              </div>
              {orchestratedSuggestions.length > 0 && (
                <SystemDividerBlock>
                  <p style={{ color: "rgba(239, 229, 212, 0.55)", fontSize: 11, lineHeight: 1.5, margin: 0 }}>
                    {orchestratedSuggestions.slice(0, 2).join(" · ")}
                  </p>
                </SystemDividerBlock>
              )}
          </SystemPanel>
        )}

        <SystemPanel ariaLabel="Mode journée difficile" compact>
          <button className={hardDay ? "btn-primary" : "btn-ghost"} type="button" onClick={toggleHardDay} style={{ fontSize: 13, minHeight: 40, width: "100%" }}>
            {hardDay ? "Désactiver le mode difficile" : "Journée difficile"}
          </button>
        </SystemPanel>

        {!simplifiedMode && <SystemPanel ariaLabel="Note rapide" compact>
          <textarea className="textarea-atelier" value={note} onChange={(event) => setNote(event.target.value)} placeholder="Une note, un rappel, rien de plus..." style={{ fontSize: 13, minHeight: 58, opacity: 0.86, padding: 12 }} />
        </SystemPanel>}

        {!simplifiedMode && <SystemPanel ariaLabel="Sauvegarde" compact>
          {!isSupabaseConfigured && (
            <div style={{ marginBottom: 8 }}>
              <StatusChip tone="warning">Cloud non configuré — sauvegarde locale uniquement</StatusChip>
            </div>
          )}
          <div style={{ alignItems: "center", display: "flex", gap: 10, justifyContent: "space-between" }}>
            <small style={{ color: "var(--text-muted)", fontSize: 11 }}>
              {cloudLoading ? "Chargement..." : cloudStatus}
            </small>
            <button className="btn-ghost" disabled={!isSupabaseConfigured} type="button" onClick={handleCloudSave} style={{ fontSize: 12, opacity: isSupabaseConfigured ? 1 : 0.45 }}>
              Sauvegarder
            </button>
          </div>
        </SystemPanel>}
        </div>
      </SystemPageShell>
    </main>
  );
}
