"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { SystemPageShell } from "@/components/system-ui";
import { BackLink } from "@/components/ui/back-link";
import { CompagnonLayout, type CompagnonData } from "@/components/compagnon/CompagnonLayout";
import { genererDiagnosticEditorial } from "@/lib/editorial-director";
import { lireFragments } from "@/lib/fragments";
import { lireMemoiresNarratives } from "@/lib/memoire-narrative";
import { lireChapitresTome1DepuisStorage } from "@/lib/tome1-chapters";
import {
  CENTRAL_MOTIFS,
  analyzeMotifs,
  buildChapterSources,
  calculerTop5Actions,
  detecterPresencePersonnages,
  detecterSouvenirOrphelins,
  extraireProfilAutrice,
} from "@/lib/livre-companion";

export default function TableauAuteurPage() {
  const [data, setData] = useState<CompagnonData | null>(null);

  useEffect(() => {
    // Chargement unique — toutes les données passées en paramètre aux fonctions
    const tome1Chapters = lireChapitresTome1DepuisStorage();
    const memoires = lireMemoiresNarratives();
    const fragments = lireFragments();
    const { chapters, invalidKeys } = buildChapterSources();
    const motifs = analyzeMotifs(chapters, CENTRAL_MOTIFS);
    const snapshot = { chapters, invalidKeys, motifs };
    const diagnostic = genererDiagnosticEditorial(tome1Chapters, fragments);
    const personnages = detecterPresencePersonnages(chapters, memoires);
    const orphelins = detecterSouvenirOrphelins(memoires);
    const profil = extraireProfilAutrice(snapshot);
    const actions = calculerTop5Actions(memoires, snapshot, diagnostic);

    setData({
      actions,
      chapters,
      diagnostic,
      memoires,
      personnages,
      profil,
      snapshot,
      orphelins,
      tome1Chapters,
    });
  }, []);

  if (!data) {
    return (
      <main className="internal-page">
        <SystemPageShell maxWidth={1100}>
          <header className="internal-header">
            <BackLink label="Centre" href="/centre-de-controle" />
            <p className="internal-kicker">Compagnon de Livre</p>
            <h1 className="internal-title">L'Héritage des Silences</h1>
            <p className="internal-subtitle">Analyse en cours…</p>
          </header>
        </SystemPageShell>
      </main>
    );
  }

  return (
    <main className="internal-page">
      <SystemPageShell maxWidth={1100}>
        <header className="internal-header" style={{ marginBottom: 12 }}>
          <BackLink label="Centre" href="/centre-de-controle" />
          <p className="internal-kicker">Écriture</p>
          <h1 className="internal-title">Compagnon de Livre</h1>
          <p className="internal-subtitle">
            L'Héritage des Silences — analyse narrative de l'œuvre.
          </p>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 10 }}>
            <Link className="internal-button" href="/mission-manuscrit">
              Cockpit Écriture
            </Link>
            <Link className="internal-button" href="/ecrire-maintenant">
              Écrire maintenant
            </Link>
          </div>
        </header>

        <CompagnonLayout data={data} />
      </SystemPageShell>
    </main>
  );
}
