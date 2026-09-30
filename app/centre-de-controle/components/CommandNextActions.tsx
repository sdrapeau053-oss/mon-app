"use client";

import { StatusChip, SystemPanel, SystemSectionHeader } from "@/components/system-ui";
import type { CommandAction, CommandMode } from "../command-center-types";

type CommandNextActionsProps = {
  actions: CommandAction[];
  mode: CommandMode;
};

export function CommandNextActions({ actions, mode }: CommandNextActionsProps) {
  if (mode === "Survie") {
    return (
      <SystemPanel compact style={{ marginBottom: 0, padding: "6px 8px" }}>
        <SystemSectionHeader actions={<StatusChip tone="danger">Simplification</StatusChip>} title="Suite du jour" />
        <p className="editorial-body" style={{ fontSize: 12.5, margin: 0 }}>
          Mode Survie : une seule action suffit. Les actions lourdes restent volontairement hors champ aujourd’hui.
        </p>
      </SystemPanel>
    );
  }

  return (
    <SystemPanel compact style={{ marginBottom: 0, padding: "6px 8px" }}>
      <SystemSectionHeader title="Suite du jour" />
      <div style={{ display: "grid", gap: 5 }}>
        {actions.map((action) => (
          <article
            key={action.id}
            style={{
              background: "rgba(255, 250, 238, 0.035)",
              border: "1px solid rgba(201, 168, 92, 0.12)",
              borderRadius: 10,
              padding: "5px 7px",
            }}
          >
            <div style={{ alignItems: "center", display: "flex", gap: 8, justifyContent: "space-between" }}>
              <p style={{ color: "#f1e7d5", fontSize: 12.5, fontWeight: 650, margin: 0 }}>{action.label}</p>
              <span style={{ color: "#9a9080", flex: "0 0 auto", fontSize: 11 }}>{action.domain}</span>
            </div>
          </article>
        ))}
      </div>
    </SystemPanel>
  );
}
