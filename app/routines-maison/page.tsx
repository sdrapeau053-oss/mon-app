"use client";

import { SystemModulePage } from "@/app/components/SystemModulePage";
import { systemModuleConfigs } from "@/app/lib/system-module-configs";

export default function RoutinesMaisonPage() {
  return <SystemModulePage config={systemModuleConfigs.routinesMaison} />;
}
