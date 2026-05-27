"use client";

import { SystemModulePage } from "@/app/components/SystemModulePage";
import { systemModuleConfigs } from "@/app/lib/system-module-configs";

export default function PlanCriseFamilialPage() {
  return (
    <div className="internal-page">
      <SystemModulePage config={systemModuleConfigs.planCriseFamilial} />
    </div>
  );
}
