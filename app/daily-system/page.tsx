"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";

type Category = "freelance" | "bio" | "app" | "famille" | "menage" | "sante" | "autre";

type DailyTask = {
  id: string;
  label: string;
  done: boolean;
  category: Category;
  time?: string;
};

type DailyNote = {
  id: string;
  content: string;
  timestamp: string;
};

const TASKS_KEY = "sylvie_tasks";
const NOTES_KEY = "sylvie_notes";
const HARD_DAY_KEY = "sylvie_hard_day";
const PROGRESSION_KEY = "sylvie_progression";
const DAILY_KEY = "sylvie_daily";

const categories: { id: Category; label: string }[] = [
  { id: "freelance", label: "Freelance" },
  { id: "bio", label: "Bio" },
  { id: "app", label: "App" },
  { id: "famille", label: "Famille" },
  { id: "menage", label: "Ménage" },
  { id: "sante", label: "Santé" },
  { id: "autre", label: "Autre" },
];

const starterTasks: DailyTask[] = [
  { id: "daily-freelance", label: "Une action freelance utile", done: false, category: "freelance" },
  { id: "daily-bio", label: "Écrire ou relire un fragment", done: false, category: "bio" },
  { id: "daily-menage", label: "Un bloc maison réaliste", done: false, category: "menage" },
];

function readLocal<T>(key: string, fallback: T): T {
  try {
    const saved = localStorage.getItem(key);
    return saved ? JSON.parse(saved) : fallback;
  } catch {
    return fallback;
  }
}

function writeDailySnapshot(tasks: DailyTask[], notes: DailyNote[], hardDay: boolean) {
  const done = tasks.filter((task) => task.done).length;
  const progression = tasks.length > 0 ? Math.round((done / tasks.length) * 100) : 0;

  localStorage.setItem(TASKS_KEY, JSON.stringify(tasks));
  localStorage.setItem(NOTES_KEY, JSON.stringify(notes));
  localStorage.setItem(HARD_DAY_KEY, JSON.stringify(hardDay));
  localStorage.setItem(PROGRESSION_KEY, JSON.stringify(progression));
  localStorage.setItem(
    DAILY_KEY,
    JSON.stringify({
      date: new Date().toLocaleDateString("fr-CA"),
      tasks,
      notes,
      hardDayMode: hardDay,
      progression,
    }),
  );
}

export default function DailySystemPage() {
  const [tasks, setTasks] = useState<DailyTask[]>([]);
  const [notes, setNotes] = useState<DailyNote[]>([]);
  const [hardDay, setHardDay] = useState(false);
  const [taskLabel, setTaskLabel] = useState("");
  const [taskCategory, setTaskCategory] = useState<Category>("freelance");
  const [taskTime, setTaskTime] = useState("");
  const [noteInput, setNoteInput] = useState("");

  useEffect(() => {
    const savedTasks = readLocal<DailyTask[]>(TASKS_KEY, starterTasks);
    const savedNotes = readLocal<DailyNote[]>(NOTES_KEY, []);
    const savedHardDay = readLocal<boolean>(HARD_DAY_KEY, false);

    setTasks(savedTasks);
    setNotes(savedNotes);
    setHardDay(savedHardDay);
  }, []);

  useEffect(() => {
    writeDailySnapshot(tasks, notes, hardDay);
  }, [tasks, notes, hardDay]);

  const doneCount = tasks.filter((task) => task.done).length;
  const pendingCount = tasks.length - doneCount;
  const progression = tasks.length > 0 ? Math.round((doneCount / tasks.length) * 100) : 0;

  const tasksByCategory = useMemo(() => {
    return categories.map((category) => ({
      ...category,
      tasks: tasks.filter((task) => task.category === category.id),
    }));
  }, [tasks]);

  function addTask() {
    const label = taskLabel.trim();
    if (!label) return;

    setTasks((current) => [
      {
        id: `task-${Date.now()}`,
        label,
        done: false,
        category: taskCategory,
        time: taskTime.trim(),
      },
      ...current,
    ]);
    setTaskLabel("");
    setTaskTime("");
  }

  function toggleTask(id: string) {
    setTasks((current) =>
      current.map((task) => (task.id === id ? { ...task, done: !task.done } : task)),
    );
  }

  function removeTask(id: string) {
    setTasks((current) => current.filter((task) => task.id !== id));
  }

  function addNote() {
    const content = noteInput.trim();
    if (!content) return;

    setNotes((current) => [
      {
        id: `note-${Date.now()}`,
        content,
        timestamp: new Date().toLocaleTimeString("fr-CA", { hour: "2-digit", minute: "2-digit" }),
      },
      ...current,
    ]);
    setNoteInput("");
  }

  return (
    <main style={{ maxWidth: 1080, margin: "0 auto", padding: "32px 24px 56px" }}>
      <header style={{ marginBottom: 28 }}>
        <Link href="/" style={{ color: "var(--text-muted)", fontSize: 11 }}>
          ← Tableau de bord
        </Link>
        <p className="label-meta" style={{ marginTop: 18 }}>
          Système quotidien
        </p>
        <h1 style={{ color: "var(--primary)", fontSize: 32, fontStyle: "italic", margin: "8px 0 8px" }}>
          Daily System
        </h1>
        <p style={{ color: "var(--text-muted)", fontSize: 14, lineHeight: 1.7, maxWidth: 760 }}>
          Un espace simple pour choisir les priorités du jour, suivre la progression, noter ce qui
          compte et alimenter le contexte de l’agent.
        </p>
      </header>

      <section className="panel" style={{ marginBottom: 22 }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12 }}>
          <Metric label="Progression" value={`${progression}%`} />
          <Metric label="Tâches faites" value={String(doneCount)} />
          <Metric label="Restantes" value={String(pendingCount)} />
          <button
            className={hardDay ? "btn-primary" : "btn-ghost"}
            type="button"
            onClick={() => setHardDay((current) => !current)}
            style={{ minHeight: 72, width: "100%" }}
          >
            {hardDay ? "Mode journée difficile actif" : "Activer journée difficile"}
          </button>
        </div>
      </section>

      <section className="panel" style={{ marginBottom: 22 }}>
        <p className="label-meta">Ajouter une tâche</p>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 10 }}>
          <input
            className="search-input"
            value={taskLabel}
            onChange={(event) => setTaskLabel(event.target.value)}
            placeholder="Ex. relancer un client, écrire 20 minutes..."
          />
          <select
            className="filter-select"
            value={taskCategory}
            onChange={(event) => setTaskCategory(event.target.value as Category)}
          >
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.label}
              </option>
            ))}
          </select>
          <input
            className="search-input"
            value={taskTime}
            onChange={(event) => setTaskTime(event.target.value)}
            placeholder="Heure"
          />
          <button className="btn-primary" type="button" onClick={addTask}>
            Ajouter
          </button>
        </div>
      </section>

      <section style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 18 }}>
        <div>
          <p className="label-meta">Blocs du jour</p>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {tasksByCategory.map((category) => (
              <article className="chapter-card" key={category.id}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "baseline" }}>
                  <h2 className="tome-title" style={{ margin: 0 }}>
                    {category.label}
                  </h2>
                  <span className="word-count">{category.tasks.filter((task) => task.done).length}/{category.tasks.length}</span>
                </div>

                {category.tasks.length === 0 ? (
                  <p className="text-muted" style={{ marginBottom: 0 }}>
                    Rien dans ce bloc pour l’instant.
                  </p>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 12 }}>
                    {category.tasks.map((task) => (
                      <div
                        key={task.id}
                        style={{
                          alignItems: "center",
                          background: task.done ? "rgba(122, 158, 122, 0.14)" : "var(--bg-main)",
                          border: "1px solid var(--border-soft)",
                          borderRadius: 10,
                          display: "grid",
                          gap: 10,
                          gridTemplateColumns: "auto 1fr auto",
                          padding: "10px 12px",
                        }}
                      >
                        <input checked={task.done} onChange={() => toggleTask(task.id)} type="checkbox" />
                        <div>
                          <p style={{ margin: 0, color: "var(--text-main)", fontSize: 14 }}>
                            {task.label}
                          </p>
                          {task.time && (
                            <p className="word-count" style={{ margin: "4px 0 0" }}>
                              {task.time}
                            </p>
                          )}
                        </div>
                        <button className="soft-button" type="button" onClick={() => removeTask(task.id)}>
                          Retirer
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </article>
            ))}
          </div>
        </div>

        <aside>
          <section className="panel" style={{ marginBottom: 16 }}>
            <p className="label-meta">Note rapide</p>
            <textarea
              className="textarea-atelier"
              value={noteInput}
              onChange={(event) => setNoteInput(event.target.value)}
              placeholder="Ce qui compte aujourd’hui, blocage, idée, rappel..."
              style={{ minHeight: 120 }}
            />
            <button className="btn-primary" type="button" onClick={addNote} style={{ width: "100%" }}>
              Ajouter la note
            </button>
          </section>

          <section className="panel">
            <p className="label-meta">Notes du jour</p>
            {notes.length === 0 ? (
              <p className="text-muted">Aucune note pour l’instant.</p>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {notes.map((note) => (
                  <article className="placement-cell" key={note.id}>
                    <p className="word-count" style={{ marginTop: 0 }}>
                      {note.timestamp}
                    </p>
                    <p style={{ color: "var(--text-soft)", fontSize: 13, lineHeight: 1.7, whiteSpace: "pre-wrap" }}>
                      {note.content}
                    </p>
                  </article>
                ))}
              </div>
            )}
          </section>
        </aside>
      </section>
    </main>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="placement-cell">
      <p className="label-meta" style={{ marginBottom: 4 }}>
        {label}
      </p>
      <p style={{ color: "var(--text-main)", fontSize: 22, fontWeight: 700, margin: 0 }}>{value}</p>
    </div>
  );
}
