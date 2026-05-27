"use client";

import { usePathname } from "next/navigation";
import BackupManager from "@/components/BackupManager";

export default function FloatingBackupManager() {
  const pathname = usePathname();
  if (pathname === "/backup") return null;
  return <BackupManager />;
}
