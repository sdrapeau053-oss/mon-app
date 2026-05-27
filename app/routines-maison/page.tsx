"use client";

import { useEffect, useState } from "react";
import { SystemModulePage } from "@/app/components/SystemModulePage";
import { systemModuleConfigs } from "@/app/lib/system-module-configs";
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

function compactValue(value: string, fallback = "Non renseigné") {
  return value.trim() || fallback;
}

export default function RoutinesMaisonPage() {
  const [systemState, setSystemState] = useState<SystemOrchestratorState | null>(null);
  const [quickSettings, setQuickSettings] = useState<CentreQuickSettings>(emptyCentreQuickSettings);

  useEffect(() => {
    setSystemState(readStoredOrchestratorState());
    setQuickSettings(readCentreQuickSettings());
  }, []);

  const energy = compactValue(quickSettings.energie, systemState?.energie || "");
  const surcharge = systemState?.surcharge || "Basse";
  const priority = compactValue(quickSettings.priorite, systemState?.focusPriority || "");
  const nextAction = quickSettings.prochaineAction.trim();
  const shouldShowMinimalRoutine = Boolean(systemState?.journeeDifficile) || surcharge === "Haute";

  return (
    <>
      <SystemPageShell as="section" maxWidth={980} padding="32px 24px 0">
        <SystemPanel ariaLabel="État du jour" compact>
          <SystemSectionHeader
            actions={(
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                <StatusChip tone={systemState?.modeFocus ? "warning" : "neutral"}>
                  Focus {systemState?.modeFocus ? "actif" : "calme"}
                </StatusChip>
                <StatusChip tone={systemState?.journeeDifficile ? "warning" : "neutral"}>
                  Journée {systemState?.journeeDifficile ? "difficile" : "standard"}
                </StatusChip>
              </div>
            )}
            eyebrow="Pilotage local"
            title="État du jour"
          />

          <SystemGrid gap={8} min={150}>
            <StateTile label="Énergie" value={energy} />
            <StateTile label="Surcharge" value={surcharge} />
            <StateTile label="Priorité" value={priority} />
            {nextAction && <StateTile label="Prochaine action" value={nextAction} />}
          </SystemGrid>

          {shouldShowMinimalRoutine && (
            <SystemDividerBlock>
              <p className="label-meta" style={{ margin: "0 0 7px" }}>
                Routine minimale recommandée
              </p>
              <SystemActionRow>
                {["une routine essentielle", "une tâche maison courte", "un retour au calme"].map((item) => (
                  <StatusChip key={item}>{item}</StatusChip>
                ))}
              </SystemActionRow>
            </SystemDividerBlock>
          )}
        </SystemPanel>
      </SystemPageShell>
      <SystemModulePage config={systemModuleConfigs.routinesMaison} />
    </>
  );
}
