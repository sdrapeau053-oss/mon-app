"use client";

import { useState, useEffect } from "react";
import { BackLink } from "@/components/ui/back-link";
import { SystemPageShell, SystemPanel } from "@/components/system-ui";
import { lireFragments, type Fragment } from "@/lib/fragments";

const TOMES_DEFAUT = [
  { id: 1, titre: "Tome 1 — Enfance" },
  { id: 2, titre: "Tome 2 — Adolescence" },
  { id: 3, titre: "Tome 3 — Mariage violent" },
  { id: 4, titre: "Tome 4 — Procès" },
];

const CHAPITRES_DEFAUT: Record<number, string[]> = {
  1: ["La maison", "Les adultes", "L'école", "La nature", "Les silences", "Les punitions", "Les jeux"],
  2: ["Le corps qui change", "Les amis", "Le premier amour", "Partir", "La rupture"],
  3: ["Le début", "La maison fermée", "Les coups", "L'isolement", "Résister", "Les enfants"],
  4: ["La plainte", "Le tribunal", "La liberté retrouvée", "Reconstruire", "La transmission"],
};

const styles = {
  fixedNav: {
    position: "fixed" as const,
    top: 24,
    left: 32,
    zIndex: 50,
    display: "flex",
    alignItems: "center",
    gap: 16,
  },
  quitter: {
    fontSize: 12,
    color: "#aaa",
    textDecoration: "none",
    background: "rgba(246,243,238,0.92)",
    backdropFilter: "blur(4px)",
    padding: "6px 12px",
    borderRadius: 20,
    border: "1px solid #e8e2d9",
    transition: "color 0.15s",
  } as React.CSSProperties,
  colonne: {
    paddingTop: 72,
    paddingBottom: 96,
  },
  titreLivre: {
    textAlign: "center" as const,
    marginBottom: 80,
  },
  titreTome: {
    textAlign: "center" as const,
    marginBottom: 56,
  },
  titreChapitre: {
    fontSize: 13,
    fontWeight: 400,
    fontStyle: "italic" as const,
    color: "#aaa",
    textAlign: "center" as const,
    letterSpacing: 0.5,
    marginBottom: 48,
  },
  corps: {
    fontSize: 16,
    lineHeight: 2.1,
    color: "var(--text-main)",
    whiteSpace: "pre-wrap" as const,
    margin: 0,
    fontWeight: 400,
  },
  separateur: {
    textAlign: "center" as const,
    color: "#ccc",
    fontSize: 13,
    letterSpacing: 6,
    margin: "40px 0",
    userSelect: "none" as const,
  },
};

export default function Lecture() {
  const [fragments, setFragments] = useState<Fragment[]>([]);
  const [tomes, setTomes] = useState(TOMES_DEFAUT);
  const [chapitresParTome, setChapitresParTome] = useState<Record<number, string[]>>(CHAPITRES_DEFAUT);

  useEffect(() => {
    setFragments(lireFragments().filter((f) => f.manuscrit));

    const savedTomes = localStorage.getItem("structure-tomes");
    if (savedTomes) setTomes(JSON.parse(savedTomes));

    const savedChapitres = localStorage.getItem("structure-chapitres");
    if (savedChapitres) setChapitresParTome(JSON.parse(savedChapitres));
  }, []);

  const totalMots = fragments.reduce((acc, f) => {
    return acc + (f.texte?.trim() ? f.texte.trim().split(/\s+/).length : 0);
  }, 0);

  return (
    <main className="internal-page">

      {/* Navigation fixe */}
      <div style={styles.fixedNav}>
        <BackLink label="Système" />
      </div>

      <SystemPageShell as="section" maxWidth={620} padding="72px 24px 96px">

        {/* Titre du livre */}
        <div style={styles.titreLivre}>
          <h1 style={{ fontSize: 28, fontStyle: "italic", color: "var(--primary)", fontWeight: 400, lineHeight: 1.4, marginBottom: 16 }}>
            L'Héritage des Silences
          </h1>
          <div style={{ width: 32, height: 1, background: "var(--accent)", margin: "0 auto 16px" }} />
          <p style={{ fontSize: 11, color: "#ccc", letterSpacing: 0.5 }}>
            {fragments.length} fragment{fragments.length > 1 ? "s" : ""} · {totalMots.toLocaleString("fr-CA")} mots
          </p>
        </div>

        {fragments.length === 0 && (
          <SystemPanel ariaLabel="Lecture vide" compact style={{ textAlign: "center" }}>
            <p style={{ color: "var(--text-muted)", fontStyle: "italic", fontSize: 14, margin: 0 }}>
              Aucun fragment dans le manuscrit.
            </p>
          </SystemPanel>
        )}

        {/* Corps du livre */}
        {tomes.map((tome, tomeIdx) => {
          const chapitres = chapitresParTome[tome.id] ?? [];
          const fragsduTome = fragments.filter((f) => f.tomeId === tome.id);
          if (fragsduTome.length === 0) return null;

          return (
            <div key={tome.id} style={{ marginBottom: tomeIdx < tomes.length - 1 ? 120 : 0 }}>

              {/* Titre du tome */}
              <div style={styles.titreTome}>
                <p style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: 4, color: "#ccc", marginBottom: 14 }}>
                  {tome.titre.replace(/.*—\s*/, "")}
                </p>
                <p style={{ fontSize: 20, fontStyle: "italic", color: "var(--primary)", fontWeight: 400, lineHeight: 1.4 }}>
                  {tome.titre}
                </p>
                <div style={{ width: 40, height: 1, background: "var(--border-soft)", margin: "20px auto 0" }} />
              </div>

              {/* Chapitres */}
              {chapitres.map((chapitre) => {
                const fragsduChapitre = fragsduTome.filter((f) => f.chapitre === chapitre);
                if (fragsduChapitre.length === 0) return null;

                return (
                  <div key={chapitre} style={{ marginBottom: 72 }}>

                    <h2 style={styles.titreChapitre}>{chapitre}</h2>

                    {fragsduChapitre.map((f, i) => (
                      <div key={f.id}>
                        <p style={styles.corps}>{f.texte}</p>
                        {i < fragsduChapitre.length - 1 && (
                          <p style={styles.separateur}>*</p>
                        )}
                      </div>
                    ))}

                  </div>
                );
              })}

            </div>
          );
        })}

        {/* Fin */}
        {fragments.length > 0 && (
          <div style={{ textAlign: "center", paddingTop: 48 }}>
            <div style={{ width: 32, height: 1, background: "var(--accent)", margin: "0 auto 20px" }} />
            <p style={{ fontSize: 11, color: "#ccc", letterSpacing: 2 }}>fin</p>
          </div>
        )}

      </SystemPageShell>
    </main>
  );
}
