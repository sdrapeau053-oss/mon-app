"use client";

import { SystemModulePage } from "@/app/components/SystemModulePage";
import { systemModuleConfigs } from "@/app/lib/system-module-configs";

export default function SynthesesPage() {
  return <SystemModulePage config={systemModuleConfigs.syntheses} />;
}
