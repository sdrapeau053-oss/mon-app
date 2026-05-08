"use client";

import { useEffect, useMemo, useState } from "react";
import { BackLink } from "@/components/ui/back-link";
import {
  loadCloudDailySystemEntry,
  saveCloudDailySystemEntry,
  type CloudDailySystemState,
} from "@/lib/cloud-sync";

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
  manuscrit: string;
  energie: string;
  priorite: string;
};

const SYSTEM_STATE_KEY = "system-state";

const normalTasks: DailyTask[] = [
  { id: "daily-fille", label: "Fille / école", done: false },
  { id: "daily-freelance", label: "Freelance (1 action)", done: false },
  { id: "daily-manuscrit", label: "Manuscrit / écriture", done: false },
  { id: "daily-maison", label: "Maison", done: false },
  { id: "daily-sante", label: "Mouvement / santé", done: false },
];

const softModeTasks: DailyTask[] = [
  { id: "soft-fille", label: "Fille / école", done: false },
  { id: "soft-action", label: "Une action utile", done: false },
  { id: "soft-soin", label: "Prendre soin de soi", done: false },
];

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
    done: savedTasks.find((saved) => saved.id === task.id)?.done || false,
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
    return {
      energie: "",
      hardDay: false,
      note: "",
      priorite: "",
      tasks: normalTasks,
    };
  }

  try {
    const saved = localStorage.getItem(todayKey());
    if (!saved) {
      return {
        energie: "",
        hardDay: false,
        note: "",
        priorite: "",
        tasks: normalTasks,
      };
    }

    const parsed = JSON.parse(saved) as Partial<DailyState>;
    const hardDay = Boolean(parsed.hardDay);

    return {
      energie: parsed.energie || "",
      hardDay,
      note: parsed.note || "",
      priorite: parsed.priorite || "",
      tasks: mergeTaskState(hardDay ? softModeTasks : normalTasks, parsed.tasks || []),
    };
  } catch {
    return {
      energie: "",
      hardDay: false,
      note: "",
      priorite: "",
      tasks: normalTasks,
    };
  }
}

function normalizeDailyState(state: Partial<CloudDailySystemState> | null | undefined): DailyState {
  const hardDay = Boolean(state?.hardDay);

  return {
    energie: "",
    hardDay,
    note: state?.note || "",
    priorite: "",
    tasks: mergeTaskState(hardDay ? softModeTasks : normalTasks, normalizeTasks(state?.tasks)),
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

export default function DailySystemPage() {
  const [hydrated, setHydrated] = useState(false);
  const [cloudLoading, setCloudLoading] = useState(true);
  const [cloudStatus, setCloudStatus] = useState("");
  const [energie, setEnergie] = useState("");
  const [hardDay, setHardDay] = useState(false);
  const [tasks, setTasks] = useState<DailyTask[]>(normalTasks);
  const [note, setNote] = useState("");
  const [priorite, setPriorite] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function loadDailyState() {
      setCloudLoading(true);

      const cloudResult = await loadCloudDailySystemEntry(todayDate());
      const savedState = cloudResult.data ? normalizeDailyState(cloudResult.data) : readDailyState();

      if (cancelled) return;

      setHardDay(savedState.hardDay);
      setTasks(savedState.tasks);
      setNote(savedState.note);
      setEnergie(savedState.energie);
      setPriorite(savedState.priorite);
      setCloudStatus(
        cloudResult.data
          ? "Données cloud chargées."
          : cloudResult.error
            ? "Mode local actif."
            : "Aucune donnée cloud pour aujourd’hui.",
      );
      setCloudLoading(false);
      setHydrated(true);
    }

    loadDailyState();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    saveDailyState({ energie, hardDay, note, priorite, tasks });
    saveSystemStateFromDaily(energie, priorite);
  }, [energie, hardDay, hydrated, note, priorite, tasks]);

  const doneCount = tasks.filter((task) => task.done).length;
  const progression = tasks.length > 0 ? Math.round((doneCount / tasks.length) * 100) : 0;
  const progressText = `${progression}% — ${doneCount}/${tasks.length} tâches`;

  const pageBackground = hardDay
    ? "linear-gradient(180deg, rgba(198, 169, 126, 0.18), rgba(255, 250, 243, 0.7))"
    : "transparent";

  const taskListLabel = useMemo(
    () => (hardDay ? "Mode doux activé" : "Liste des tâches essentielles"),
    [hardDay],
  );

  function toggleTask(id: string) {
    setTasks((current) =>
      current.map((task) => (task.id === id ? { ...task, done: !task.done } : task)),
    );
  }

  function toggleSoftMode() {
    setHardDay((current) => {
      const next = !current;
      setTasks((currentTasks) => mergeTaskState(next ? softModeTasks : normalTasks, currentTasks));
      setEnergie(next ? "fatigue" : "neutre");
      setPriorite(next ? "repos" : "ecrire");
      return next;
    });
  }

  async function handleCloudSave() {
    setCloudStatus("Sauvegarde cloud...");

    const result = await saveCloudDailySystemEntry(todayDate(), {
      hardDay,
      note,
      tasks,
    });

    setCloudStatus(result.error ? result.error : "Sauvegarde cloud effectuée.");
  }

  return (
    <main
      style={{
        background: pageBackground,
        borderRadius: 18,
        margin: "0 auto",
        maxWidth: 560,
        minHeight: "100svh",
        padding: "16px 14px 24px",
        transition: "background 0.2s ease",
      }}
    >
      <header style={{ marginBottom: 14 }}>
        <BackLink label="Système" />
        <p className="label-meta" style={{ margin: "18px 0 5px" }}>
          Aujourd’hui
        </p>
        <h1
          style={{
            color: "var(--primary)",
            fontSize: 30,
            fontStyle: "italic",
            lineHeight: 1,
            margin: 0,
          }}
        >
          Daily System
        </h1>
      </header>

      <section aria-label={taskListLabel} style={{ marginBottom: 16 }}>
        <p className="label-meta" style={{ marginBottom: 8 }}>
          {taskListLabel}
        </p>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {tasks.map((task) => (
            <button
              key={task.id}
              type="button"
              onClick={() => toggleTask(task.id)}
              style={{
                alignItems: "center",
                background: task.done ? "rgba(122, 158, 122, 0.16)" : "rgba(255, 250, 243, 0.94)",
                border: task.done
                  ? "1px solid rgba(122, 158, 122, 0.36)"
                  : "1px solid rgba(198, 169, 126, 0.42)",
                borderRadius: 14,
                boxShadow: task.done ? "none" : "0 10px 26px rgba(46, 42, 39, 0.07)",
                color: "var(--text-main)",
                cursor: "pointer",
                display: "grid",
                font: "inherit",
                gap: 12,
                gridTemplateColumns: "24px 1fr",
                opacity: task.done ? 0.62 : 1,
                padding: "17px 16px",
                textAlign: "left",
                transition:
                  "background-color 0.2s ease, border-color 0.2s ease, box-shadow 0.2s ease, opacity 0.2s ease, transform 0.2s ease",
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
                    : "1px solid rgba(46, 42, 39, 0.32)",
                  borderRadius: 999,
                  color: "#fff",
                  display: "flex",
                  fontSize: 14,
                  height: 22,
                  justifyContent: "center",
                  transition: "all 0.2s ease",
                  width: 22,
                }}
              >
                {task.done ? "✓" : ""}
              </span>
              <span
                style={{
                  fontSize: 17,
                  fontWeight: 700,
                  lineHeight: 1.25,
                  textDecoration: task.done ? "line-through" : "none",
                  transition: "opacity 0.2s ease, text-decoration-color 0.2s ease",
                }}
              >
                {task.label}
              </span>
            </button>
          ))}
        </div>
      </section>

      <section aria-label="Progression" style={{ marginBottom: 16 }}>
        <p style={{ color: "var(--text-main)", fontSize: 14, fontWeight: 700, margin: "0 0 8px" }}>
          {progressText}
        </p>
        <div
          aria-hidden="true"
          style={{
            background: "rgba(46, 42, 39, 0.1)",
            borderRadius: 999,
            height: 6,
            overflow: "hidden",
          }}
        >
          <div
            style={{
              background: "var(--accent)",
              borderRadius: 999,
              height: "100%",
              transition: "width 0.2s ease",
              width: `${progression}%`,
            }}
          />
        </div>
        <div
          style={{
            alignItems: "center",
            display: "flex",
            gap: 10,
            justifyContent: "space-between",
            marginTop: 10,
          }}
        >
          <small style={{ color: "var(--text-muted)", fontSize: 11 }}>
            {cloudLoading ? "Chargement cloud..." : cloudStatus}
          </small>
          <button className="btn-ghost" type="button" onClick={handleCloudSave}>
            Sauvegarder cloud
          </button>
        </div>
      </section>

      <section aria-label="Mode doux" style={{ marginBottom: 18 }}>
        <button
          className={hardDay ? "btn-primary" : "btn-ghost"}
          type="button"
          onClick={toggleSoftMode}
          style={{ minHeight: 46, width: "100%" }}
        >
          {hardDay ? "Mode doux activé" : "Activer le mode doux"}
        </button>
      </section>

      <section aria-label="État du jour" style={{ marginBottom: 18 }}>
        <p className="label-meta" style={{ marginBottom: 8 }}>
          État du jour
        </p>
        <div style={{ display: "grid", gap: 10, gridTemplateColumns: "1fr 1fr" }}>
          <label style={{ color: "var(--text-muted)", fontSize: 11 }}>
            Énergie
            <select
              className="filter-select"
              value={energie}
              onChange={(event) => setEnergie(event.target.value)}
              style={{ marginTop: 6, width: "100%" }}
            >
              <option value="">À définir</option>
              <option value="fatigue">Fatigue</option>
              <option value="neutre">Neutre</option>
              <option value="haute">Haute</option>
            </select>
          </label>
          <label style={{ color: "var(--text-muted)", fontSize: 11 }}>
            Priorité
            <select
              className="filter-select"
              value={priorite}
              onChange={(event) => setPriorite(event.target.value)}
              style={{ marginTop: 6, width: "100%" }}
            >
              <option value="">Choisir</option>
              <option value="ecrire">Écrire</option>
              <option value="freelance">Freelance</option>
              <option value="repos">Repos</option>
            </select>
          </label>
        </div>
      </section>

      <section aria-label="Note rapide">
        <p className="label-meta" style={{ marginBottom: 8 }}>
          Note rapide
        </p>
        <textarea
          className="textarea-atelier"
          value={note}
          onChange={(event) => setNote(event.target.value)}
          placeholder="Une note, un rappel, rien de plus..."
          style={{
            fontSize: 13,
            minHeight: 74,
            opacity: 0.86,
            padding: 12,
          }}
        />
      </section>
    </main>
  );
}
