import BackupManager from "@/components/BackupManager";
import { SystemPageShell } from "@/components/system-ui";

export default function BackupPage() {
  return (
    <main className="internal-page">
      <SystemPageShell maxWidth={900} padding="22px 16px 44px">
        <BackupManager variant="page" />
      </SystemPageShell>
    </main>
  );
}
