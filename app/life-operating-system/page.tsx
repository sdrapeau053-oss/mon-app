"use client";

import { useEffect, useState } from "react";
import LifeOperatingSystem from "@/components/LifeOperatingSystem";
import {
  StateTile,
  StatusChip,
  SystemActionRow,
  SystemDividerBlock,
  SystemGrid,
  SystemPageShell,
  SystemPanel,
  SystemSectionHeader,
} from "@/components/system-ui";
import {
  emptyCentreQuickSettings,
  readCentreQuickSettings,
  readStoredOrchestratorState,
  type CentreQuickSettings,
  type SystemOrchestratorState,
} from "@/lib/system-orchestrator";

function hasDifficultEnergy(value: string) {
  const normalized = value.toLowerCase();

  return (
    normalized.includes("fatigue") ||
    normalized.includes("basse") ||
    normalized.includes("épuis") ||
    normalized.includes("epuis") ||
    normalized.includes("difficile")
  );
}

function findIndicator(state: SystemOrchestratorState, label: string) {
  return state.indicators.find((indicator) => indicator.label.toLowerCase() === label.toLowerCase())?.value || "";
}

function compactValue(value: string, fallback = "Non renseigné") {
  return value.trim() || fallback;
}

export default function LifeOperatingSystemPage() {
  const [systemState, setSystemState] = useState<SystemOrchestratorState | null>(null);
  const [quickSettings, setQuickSettings] = useState<CentreQuickSettings>(emptyCentreQuickSettings);

  useEffect(() => {
    setSystemState(readStoredOrchestratorState());
    setQuickSettings(readCentreQuickSettings());
  }, []);

  const energy = compactValue(quickSettings.energie, systemState?.energie || "");
  const surcharge = systemState?.surcharge || "Basse";
  const hardDay = Boolean(systemState?.journeeDifficile);
  const priority = compactValue(quickSettings.priorite, systemState?.focusPriority || "");
  const note = quickSettings.noteRapide.trim();
  const nextAction = quickSettings.prochaineAction.trim();
  const fatigueValue = systemState ? findIndicator(systemState, "Fatigue") : "";
  const fatigueHigh =
    hasDifficultEnergy(energy) ||
    fatigueValue.toLowerCase().includes("élev") ||
    fatigueValue.toLowerCase().includes("elev") ||
    systemState?.mode === "Fatigue élevée";
  const showRecovery = hardDay || fatigueHigh;

  const headerSlot = (
    <SystemPageShell maxWidth={980} padding="32px 24px 0">
      <SystemPanel ariaLabel="État du jour" compact>
        <SystemSectionHeader
          actions={(
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              <StatusChip tone={systemState?.modeFocus ? "warning" : "neutral"}>
                Focus {systemState?.modeFocus ? "actif" : "calme"}
              </StatusChip>
              <StatusChip tone={systemState?.urgenceActive ? "warning" : "neutral"}>
                Priorité du moment {systemState?.urgenceActive ? "active" : "inactive"}
              </StatusChip>
            </div>
          )}
          eyebrow="Pilotage local"
          title="État du jour"
        />

        <SystemGrid gap={8} min={150}>
          <StateTile label="Énergie" value={energy} />
          <StateTile label="Surcharge" value={surcharge} />
          <StateTile label="Journée difficile" value={hardDay ? "Active" : "Inactive"} />
          <StateTile label="Priorité du jour" value={priority} />
        </SystemGrid>

        {(note || nextAction) && (
          <SystemGrid gap={8} min={220}>
            {note && (
              <p
                style={{
                  borderLeft: "2px solid rgba(201, 168, 92, 0.42)",
                  color: "var(--text-soft)",
                  fontSize: 13,
                  lineHeight: 1.45,
                  margin: "10px 0 0",
                  paddingLeft: 10,
                }}
              >
                {note}
              </p>
            )}
            {nextAction && (
              <p
                style={{
                  color: "var(--text-soft)",
                  fontSize: 13,
                  lineHeight: 1.45,
                  margin: "10px 0 0",
                }}
              >
                Prochaine action : <span style={{ color: "var(--text-main)" }}>{nextAction}</span>
              </p>
            )}
          </SystemGrid>
        )}

        {showRecovery && (
          <SystemDividerBlock>
            <p className="label-meta" style={{ margin: "0 0 7px" }}>
              Mode récupération recommandé
            </p>
            <SystemActionRow>
              {["respiration 2 minutes", "boire de l’eau", "une micro-action", "retour au calme"].map((item) => (
                <StatusChip key={item}>{item}</StatusChip>
              ))}
            </SystemActionRow>
          </SystemDividerBlock>
        )}
      </SystemPanel>
    </SystemPageShell>
  );

  return <LifeOperatingSystem headerSlot={headerSlot} />;
}
