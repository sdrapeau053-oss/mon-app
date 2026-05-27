"use client";

import { useEffect, useState } from "react";
import { SystemModulePage } from "@/app/components/SystemModulePage";
import { systemModuleConfigs } from "@/app/lib/system-module-configs";
import {
  StateTile,
  StatusChip,
  SystemGrid,
  SystemPageShell,
  SystemPanel,
  SystemSectionHeader,
} from "@/components/system-ui";
import {
  detectMalikaEmergencySignal,
  saveMalikaEmergencySignal,
  type EmergencySignalState,
} from "@/lib/system-orchestrator";

function StatusCard({ signal }: { signal: EmergencySignalState | null }) {
  const active = signal?.active ?? false;

  return (
    <SystemPageShell as="section" maxWidth={980} padding="32px 24px 0">
      <SystemPanel ariaLabel="État transmis au Centre" compact>
        <SystemSectionHeader
          actions={(
            <StatusChip tone={active ? "warning" : "neutral"}>
              Urgence {active ? "active" : "inactive"}
            </StatusChip>
          )}
          eyebrow="Orchestration locale"
          title="État transmis au Centre"
        />
        <SystemGrid gap={8} min={220}>
          <StateTile label="Source" value="Malika" />
          {signal?.latestDate && <StateTile label="Dernier signal" value={signal.latestDate} />}
        </SystemGrid>
      </SystemPanel>
    </SystemPageShell>
  );
}

export default function MalikaPage() {
  const [signal, setSignal] = useState<EmergencySignalState | null>(null);

  useEffect(() => {
    const currentSignal = detectMalikaEmergencySignal();
    setSignal(currentSignal);
    saveMalikaEmergencySignal(currentSignal);
  }, []);

  return (
    <>
      <StatusCard signal={signal} />
      <SystemModulePage config={systemModuleConfigs.malika} />
    </>
  );
}
