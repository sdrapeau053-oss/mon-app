import type { Metadata } from "next";
import ContinuityTracker from "@/components/ContinuityTracker";
import FloatingBackupManager from "@/components/FloatingBackupManager";
import GlobalNavigation from "@/components/GlobalNavigation";
import LanguageToggle from "@/components/LanguageToggle";
import { LanguageProvider } from "@/lib/LanguageContext";
import "./globals.css";

export const metadata: Metadata = {
  title: "L’Héritage des Silences — Atelier",
  description: "Atelier d’écriture et structure du manuscrit",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="fr">
      <body>
        <LanguageProvider>
          <GlobalNavigation />
          <ContinuityTracker />
          <div className="app-page-motion">{children}</div>
          <FloatingBackupManager />
          <LanguageToggle />
        </LanguageProvider>
      </body>
    </html>
  );
}
