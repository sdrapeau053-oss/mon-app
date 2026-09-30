"use client";

import { StatusChip, SystemPanel } from "@/components/system-ui";
import type { ActionWeight, CommandAction, CommandMode } from "../command-center-types";

const DUREE: Record<ActionWeight, string> = {
  heavy: "45 à 60 min",
  light: "5 à 10 min",
  medium: "15 à 30 min",
};

const IMPACT_SHORT: Record<ActionWeight, string> = {
  heavy: "Transformation",
  light: "Stabilisation",
  medium: "Avancée",
};

type CommandPrimaryActionProps = {
  action: CommandAction;
  mode: CommandMode;
  reason: string;
};

export function CommandPrimaryAction({ action, mode, reason }: CommandPrimaryActionProps) {
  return (
    <SystemPanel
      compact
      style={{
        borderColor: "rgba(201, 168, 92, 0.26)",
        boxSizing: "border-box",
        height: "100%",
        marginBottom: 0,
        padding: "14px 16px",
      }}
    >
      <div style={{ alignItems: "start", display: "flex", gap: 14, justifyContent: "space-between" }}>
        <div>
          <p className="editorial-label" style={{ margin: "0 0 5px" }}>
            Action unique
          </p>
          <h2 className="editorial-title" style={{ fontSize: "clamp(1.35rem, 2.35vw, 1.85rem)", margin: 0 }}>
            {action.label}
          </h2>
          <p className="editorial-body" style={{ fontSize: 13, margin: "7px 0 0" }}>
            {reason}
          </p>
          <div
            style={{
              borderTop: "1px solid rgba(201, 168, 92, 0.14)",
              display: "flex",
              flexWrap: "wrap",
              gap: 7,
              marginTop: 12,
              paddingTop: 9,
            }}
          >
            <StatusChip>Durée · {DUREE[action.weight]}</StatusChip>
            <StatusChip>Impact · {IMPACT_SHORT[action.weight]}</StatusChip>
          </div>
        </div>
        <StatusChip tone={mode === "Survie" ? "danger" : mode === "Essentiel" ? "warning" : "success"}>{action.domain}</StatusChip>
      </div>
    </SystemPanel>
  );
}
