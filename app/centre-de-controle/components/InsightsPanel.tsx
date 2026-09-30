"use client";

import { useEffect, useState } from "react";
import { StateTile, StatusChip, SystemGrid, SystemPanel, SystemSectionHeader } from "@/components/system-ui";
import { readBrainFogEntries } from "../brain-fog-storage";
import { readStoredCommandCenterState } from "../command-center-storage";
import { readExecutionEntries } from "../execution-journal-storage";
import { readMentalParkingItems } from "../mental-parking-storage";
import { activityCounts, buildInsights } from "../insights-engine";
import type { InsightsResult } from "../insights-types";

export function InsightsPanel() {
  const [collapsed, setCollapsed] = useState(true);
  const [result, setResult] = useState<InsightsResult>({ availableDays: 0, insights: [], requiredDays: 7 });
  const [activity, setActivity] = useState({ last30Days: 0, last7Days: 0, today: 0 });
  const emptyActivity = activity.today === 0 && activity.last7Days === 0 && activity.last30Days === 0;

  useEffect(() => {
    const executionEntries = readExecutionEntries();
    const commandState = readStoredCommandCenterState();
    setActivity(activityCounts(executionEntries));
    setResult(
      buildInsights({
        brainFogEntries: readBrainFogEntries(),
        commandUpdatedAt: commandState?.updatedAt,
        executionEntries,
        mentalParkingItems: readMentalParkingItems(),
      }),
    );
  }, []);

  const insightCount = result.insights.length;

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
        <span style={{ color: "#b8ad99", fontSize: 12.5, fontWeight: 650 }}>Insights</span>
        <span style={{ color: "#9a8e78", fontSize: 12 }}>
          {insightCount > 0
            ? `${insightCount} insight${insightCount > 1 ? "s" : ""} disponible${insightCount > 1 ? "s" : ""}`
            : result.availableDays < result.requiredDays
              ? `Disponible après ${result.requiredDays} jours`
              : "Vide"} ›
        </span>
      </button>
    );
  }

  return (
    <SystemPanel compact style={{ marginBottom: 8, padding: "9px 10px" }}>
      <div style={{ alignItems: "center", display: "flex", gap: 8, justifyContent: "space-between", marginBottom: 6 }}>
        <SystemSectionHeader title="Insights" />
        <button className="internal-button" onClick={() => setCollapsed(true)} style={{ fontSize: 11, padding: "3px 8px" }} type="button">
          Réduire
        </button>
      </div>
      <p className="editorial-body" style={{ fontSize: 12.5, margin: "0 0 7px" }}>
        Tendances observées dans vos données réelles.
      </p>
      {emptyActivity ? (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
          <StatusChip>Aujourd’hui · 0</StatusChip>
          <StatusChip>7 jours · 0</StatusChip>
          <StatusChip>30 jours · 0</StatusChip>
        </div>
      ) : (
        <SystemGrid gap={6} min={150}>
          <StateTile label="Aujourd’hui" value={`${activity.today}`} />
          <StateTile label="7 jours" value={`${activity.last7Days}`} />
          <StateTile label="30 jours" value={`${activity.last30Days}`} />
        </SystemGrid>
      )}

      {result.availableDays < result.requiredDays ? (
        <article
          style={{
            background: "rgba(255, 250, 238, 0.03)",
            border: "1px solid rgba(201, 168, 92, 0.12)",
            borderRadius: 10,
            marginTop: 8,
            padding: "8px 9px",
          }}
        >
          <p style={{ color: "#f1e7d5", fontSize: 13, fontWeight: 650, margin: 0 }}>
            Les tendances apparaîtront après plusieurs jours d’utilisation.
          </p>
          <p className="editorial-body" style={{ fontSize: 12, margin: "5px 0 0" }}>
            {result.availableDays} jour(s) disponible(s) sur {result.requiredDays} requis.
          </p>
        </article>
      ) : (
        <div style={{ display: "grid", gap: 6, marginTop: 8 }}>
          {result.insights.map((insight) => (
            <article
              key={insight.id}
              style={{
                background: "rgba(255, 250, 238, 0.03)",
                border: "1px solid rgba(201, 168, 92, 0.12)",
                borderRadius: 10,
                padding: "8px 9px",
              }}
            >
              <div style={{ alignItems: "center", display: "flex", gap: 8, justifyContent: "space-between" }}>
                <p style={{ color: "#f1e7d5", fontSize: 13, fontWeight: 700, margin: 0 }}>{insight.title}</p>
                <StatusChip>Confiance {insight.confidence}</StatusChip>
              </div>
              <p className="editorial-body" style={{ fontSize: 12.5, margin: "5px 0 0" }}>
                {insight.description}
              </p>
            </article>
          ))}
        </div>
      )}
    </SystemPanel>
  );
}
