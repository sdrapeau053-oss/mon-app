import type { Metadata } from "next";
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
      <body>{children}</body>
    </html>
  );
}