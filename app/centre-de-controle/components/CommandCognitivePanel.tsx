"use client";

import { StatusChip, SystemPanel } from "@/components/system-ui";
import type { BrainFogCommandSummary, CognitiveState, CommandMode, DomainLoad } from "../command-center-types";

type CommandCognitivePanelProps = {
  brainFogSummary?: BrainFogCommandSummary;
  cognitiveState: CognitiveState;
  domainLoads: DomainLoad[];
  mode: CommandMode;
};

function toneForState(state: CognitiveState) {
  if (state === "Optimal" || state === "Stable") return "success";
  if (state === "Fragile" || state === "Surchargé") return "warning";
  if (state === "En crise") return "danger";
  return "neutral";
}

const STATE_COPY: Record<CognitiveState, string> = {
  "En crise": "Mode survie actif — une seule action.",
  "Fragile": "Journée lourde — priorités réduites.",
  "Optimal": "Énergie disponible — journée ouverte.",
  "Stable": "Système équilibré — avancer normalement.",
  "Surchargé": "Mode essentiel — charge élevée détectée.",
};

export function CommandCognitivePanel({ brainFogSummary, cognitiveState, domainLoads, mode }: CommandCognitivePanelProps) {
  const highLoads = domainLoads.filter((load) => load.level === "Haute" || load.level === "Critique").slice(0, 3);

  return (
    <SystemPanel compact style={{ marginBottom: 0, padding: "7px 8px" }}>
      <div style={{ alignItems: "center", display: "flex", gap: 8, justifyContent: "space-between" }}>
        <p style={{ color: "#f1e7d5", fontSize: 18, fontWeight: 700, margin: 0 }}>
          {cognitiveState}
        </p>
        <StatusChip tone={toneForState(cognitiveState)}>{mode}</StatusChip>
      </div>
      <p className="editorial-body" style={{ fontSize: 12, margin: "5px 0 0" }}>
        {STATE_COPY[cognitiveState]}
      </p>
      {brainFogSummary ? (
        <div
          style={{
            background: "rgba(255, 250, 238, 0.03)",
            border: "1px solid rgba(201, 168, 92, 0.1)",
            borderRadius: 9,
            display: "grid",
            gap: 3,
            marginTop: 6,
            padding: "6px 7px",
          }}
        >
          <p className="editorial-body" style={{ fontSize: 11.5, margin: 0 }}>
            Brain Fog : <strong style={{ color: "#f1e7d5" }}>{brainFogSummary.score}/10</strong>
          </p>
          <p className="editorial-body" style={{ fontSize: 11.5, margin: 0 }}>
            Cause : <strong style={{ color: "#f1e7d5" }}>{brainFogSummary.causeLabel}</strong>
          </p>
        </div>
      ) : null}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 5, marginTop: 6 }}>
        {(highLoads.length ? highLoads : domainLoads.slice(0, 3)).map((load) => (
          <StatusChip key={load.domain} tone={load.level === "Critique" || load.level === "Haute" ? "warning" : "neutral"}>
            {load.domain} · {load.level}
          </StatusChip>
        ))}
        {brainFogSummary && (
          <StatusChip tone={brainFogSummary.score >= 7 ? "danger" : brainFogSummary.score >= 5 ? "warning" : "neutral"}>
            Brain Fog {brainFogSummary.score} · {brainFogSummary.causeLabel}
          </StatusChip>
        )}
      </div>
    </SystemPanel>
  );
}
