"use client";

import { SystemModulePage } from "@/app/components/SystemModulePage";
import { systemModuleConfigs } from "@/app/lib/system-module-configs";

export default function IdentiteSchemasPage() {
  return <SystemModulePage config={systemModuleConfigs.identiteSchemas} />;
}
