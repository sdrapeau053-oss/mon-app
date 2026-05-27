"use client";

import { SystemModulePage } from "@/app/components/SystemModulePage";
import { systemModuleConfigs } from "@/app/lib/system-module-configs";

export default function AvantAgirPage() {
  return <SystemModulePage config={systemModuleConfigs.avantAgir} />;
}
