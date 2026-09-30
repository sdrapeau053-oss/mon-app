"use client";

import { useEffect, useMemo, useState } from "react";
import { StateTile, StatusChip, SystemGrid, SystemPanel, SystemSectionHeader } from "@/components/system-ui";
import { addExecutionEntry, generateExecutionEntryId, readExecutionEntries } from "../execution-journal-storage";
import { EXECUTION_CATEGORY_LABELS, type ExecutionCategory, type ExecutionEntry } from "../execution-journal-types";

const categories = Object.keys(EXECUTION_CATEGORY_LABELS) as ExecutionCategory[];

export function ExecutionJournalPanel() {
  const [collapsed, setCollapsed] = useState(true);
  const [category, setCategory] = useState<ExecutionCategory>("ecriture");
  const [entries, setEntries] = useState<ExecutionEntry[]>([]);
  const [text, setText] = useState("");

  useEffect(() => {
    setEntries(readExecutionEntries());
  }, []);

  function addEntry() {
    const cleanText = text.trim();
    if (!cleanText) return;
    const entry: ExecutionEntry = {
      category,
      createdAt: new Date().toISOString(),
      id: generateExecutionEntryId(),
      text: cleanText,
    };
    setEntries(addExecutionEntry(entry));
    setText("");
  }

  const summary = useMemo(() => {
    const now = Date.now();
    return {
      last30Days: countSince(entries, now, 30),
      last7Days: countSince(entries, now, 7),
      today: entries.filter((entry) => new Date(entry.createdAt).toDateString() === new Date(now).toDateString()).length,
    };
  }, [entries]);

  const recentEntries = [...entries].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 10);
  const emptySummary = summary.today === 0 && summary.last7Days === 0 && summary.last30Days === 0;

  if (collapsed) {
    return (
      <button
        onClick={() => setCollapsed(false)}
        style={{
          alignItems: "center",
          background: "rgba(20, 19, 17, 0.7)",
          border: "1px solid rgba(201, 168, 92, 0.14)",
          borderRadius: 10,
          cursor: "pointer",
          display: "flex",
          gap: 10,
          justifyContent: "space-between",
          marginBottom: 8,
          padding: "9px 14px",
          width: "100%",
        }}
        type="button"
      >
        <span style={{ color: "#b8ad99", fontSize: 12.5, fontWeight: 650 }}>Journal d’exécution</span>
        <span style={{ color: "#9a8e78", fontSize: 12 }}>
          {entries.length > 0 ? `${entries.length} entrée${entries.length > 1 ? "s" : ""}` : "Vide"} ›
        </span>
      </button>
    );
  }

  return (
    <SystemPanel compact style={{ marginBottom: 8, padding: "9px 10px" }}>
      <div style={{ alignItems: "center", display: "flex", gap: 8, justifyContent: "space-between", marginBottom: 6 }}>
        <SystemSectionHeader title="Journal d’exécution" />
        <button className="internal-button" onClick={() => setCollapsed(true)} style={{ fontSize: 11, padding: "3px 8px" }} type="button">
          Réduire
        </button>
      </div>
      <p className="editorial-body" style={{ fontSize: 12.5, margin: "0 0 7px" }}>
        Ce qui a réellement avancé aujourd’hui.
      </p>
      {emptySummary ? (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
          <StatusChip>Aujourd’hui · 0</StatusChip>
          <StatusChip>7 jours · 0</StatusChip>
          <StatusChip>30 jours · 0</StatusChip>
        </div>
      ) : (
        <SystemGrid gap={6} min={150}>
          <StateTile label="Aujourd’hui" value={`${summary.today}`} />
          <StateTile label="7 derniers jours" value={`${summary.last7Days}`} />
          <StateTile label="30 derniers jours" value={`${summary.last30Days}`} />
        </SystemGrid>
      )}
      <div style={{ display: "grid", gap: 7, marginTop: 8 }}>
        <div style={{ display: "grid", gap: 6, gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))" }}>
          <input
            className="internal-control"
            onChange={(event) => setText(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") addEntry();
            }}
            placeholder="J’ai terminé..."
            style={{ fontSize: 12.5, minHeight: 34, padding: "7px 9px" }}
            value={text}
          />
          <select
            className="internal-control"
            onChange={(event) => setCategory(event.target.value as ExecutionCategory)}
            style={{ fontSize: 12.5, minHeight: 34, padding: "7px 9px" }}
            value={category}
          >
            {categories.map((entryCategory) => (
              <option key={entryCategory} value={entryCategory}>
                {EXECUTION_CATEGORY_LABELS[entryCategory]}
              </option>
            ))}
          </select>
          <button className="internal-button-primary" onClick={addEntry} style={{ minHeight: 34, padding: "7px 12px" }} type="button">
            Ajouter
          </button>
        </div>

        {recentEntries.length ? (
          <div style={{ display: "grid", gap: 5 }}>
            {recentEntries.map((entry) => (
              <article
                key={entry.id}
                style={{
                  alignItems: "center",
                  background: "rgba(255, 250, 238, 0.03)",
                  border: "1px solid rgba(201, 168, 92, 0.12)",
                  borderRadius: 10,
                  display: "grid",
                  gap: 8,
                  gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))",
                  padding: "7px 8px",
                }}
              >
                <StatusChip>{EXECUTION_CATEGORY_LABELS[entry.category]}</StatusChip>
                <p style={{ color: "#f1e7d5", fontSize: 12.5, margin: 0, overflowWrap: "anywhere" }}>{entry.text}</p>
                <span className="editorial-body" style={{ fontSize: 11 }}>
                  {new Date(entry.createdAt).toLocaleDateString("fr-CA")}
                </span>
              </article>
            ))}
          </div>
        ) : (
          <p className="editorial-body" style={{ fontSize: 12.5, margin: 0 }}>
            Aucune entrée pour le moment.
          </p>
        )}
      </div>
    </SystemPanel>
  );
}

function countSince(entries: ExecutionEntry[], now: number, days: number) {
  const cutoff = now - days * 24 * 60 * 60 * 1000;
  return entries.filter((entry) => new Date(entry.createdAt).getTime() >= cutoff).length;
}
