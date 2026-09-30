"use client";

import Link from "next/link";
import { SystemGrid, SystemPanel } from "@/components/system-ui";
import type { TodayDecision } from "@/lib/centre-intelligent";

export function CentreTodayPanel({ todayDecision }: { todayDecision: TodayDecision | null }) {
  if (!todayDecision) return null;

  return (
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
  );
}
