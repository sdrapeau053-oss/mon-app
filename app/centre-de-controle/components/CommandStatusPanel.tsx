"use client";

import { StateTile, SystemGrid, SystemPanel } from "@/components/system-ui";

type CommandStatusPanelProps = {
  displayedCriticalTask: string;
  displayedEnergy: string;
  displayedPriority: string;
  globalHardDay: boolean;
  mode: string;
  onToggleGlobalHardDay: () => void;
  surchargeValue: string;
  urgenciesActive: number;
};

export function CommandStatusPanel({
  displayedCriticalTask,
  displayedEnergy,
  displayedPriority,
  globalHardDay,
  mode,
  onToggleGlobalHardDay,
  surchargeValue,
  urgenciesActive,
}: CommandStatusPanelProps) {
  return (
    <>
      <SystemPanel compact style={{ marginBottom: 7, padding: 7 }}>
        <SystemGrid gap={7} min={260}>
          <StateTile label="État local" value={mode} />
          <StateTile label="Urgences actives" value={String(urgenciesActive)} />
          <button
            className={globalHardDay ? "internal-button-primary" : "internal-button"}
            onClick={onToggleGlobalHardDay}
            style={{
              borderRadius: 9,
              minHeight: 43,
              padding: "8px 10px",
              textAlign: "left",
              width: "100%",
            }}
            type="button"
          >
            Journée difficile {globalHardDay ? "active" : ""}
          </button>
        </SystemGrid>
      </SystemPanel>

      <SystemPanel compact style={{ marginBottom: 7, padding: 7 }}>
        <SystemGrid gap={6} min={260}>
          <StateTile label="Priorité" value={displayedPriority} />
          <StateTile label="Énergie" value={displayedEnergy} />
          <StateTile label="Surcharge" value={surchargeValue} />
          <StateTile label="Action critique" value={displayedCriticalTask} />
        </SystemGrid>
      </SystemPanel>
    </>
  );
}
