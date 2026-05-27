"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  CompactMetric,
  StatusChip,
  SystemActionRow,
  SystemGrid,
  SystemPageShell,
  SystemPanel,
  SystemSectionHeader,
  SystemTable,
  SystemTableHeader,
} from "@/components/system-ui";
import { BackLink } from "@/components/ui/back-link";
import { lireFragments, type Fragment } from "@/lib/fragments";

const TOMES_DEFAUT = [
  { id: 1, titre: "Tome 1 — Enfance", color: "#8B7355" },
  { id: 2, titre: "Tome 2 — Adolescence", color: "#6B7A8B" },
  { id: 3, titre: "Tome 3 — Mariage violent", color: "#8B6B6B" },
  { id: 4, titre: "Tome 4 — Procès", color: "#7B8B6B" },
];

const CHAPITRES_DEFAUT: Record<number, string[]> = {
  1: ["La maison", "Les adultes", "L'école", "La nature", "Les silences", "Les punitions", "Les jeux"],
  2: ["Le corps qui change", "Les amis", "Le premier amour", "Partir", "La rupture"],
  3: ["Le début", "La maison fermée", "Les coups", "L'isolement", "Résister", "Les enfants"],
  4: ["La plainte", "Le tribunal", "La liberté retrouvée", "Reconstruire", "La transmission"],
};

type Tome = { id: number; titre: string; color: string };
type Section = { titre: string; fragments: Fragment[] };

// ─── Helpers export ────────────────────────────────────────────────────────

function slug(s: string): string {
  return s.toLowerCase()
    .normalize("NFD").replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

function telecharger(contenu: string, nom: string) {
  const mime = nom.endsWith(".md") ? "text/markdown" : "text/plain";
  const blob = new Blob([contenu], { type: `${mime};charset=utf-8` });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = nom; a.click();
  URL.revokeObjectURL(url);
}

function fragmentSortValue(fragment: Fragment): number {
  const numericId = Number(fragment.id);
  return Number.isFinite(numericId) ? numericId : 0;
}

function buildTxt(titre: string, sections: Section[]): string {
  const lines: string[] = [titre.toUpperCase(), ""];
  sections.forEach(({ titre: t, fragments: frags }) => {
    const ms = frags.filter((f) => f.manuscrit);
    if (ms.length === 0) return;
    lines.push(t.toUpperCase());
    lines.push("─".repeat(Math.min(t.length + 2, 48)));
    lines.push("");
    ms.forEach((f, i) => {
      lines.push(f.texte ?? "");
      lines.push("");
      if (i < ms.length - 1) { lines.push("* * *"); lines.push(""); }
    });
    lines.push("");
  });
  return lines.join("\n").trimEnd();
}

function buildMarkdown(titre: string, sections: Section[], niveauSection = 2): string {
  const prefix = "#".repeat(niveauSection);
  const lines: string[] = [`# ${titre}`, ""];
  sections.forEach(({ titre: t, fragments: frags }) => {
    const ms = frags.filter((f) => f.manuscrit);
    if (ms.length === 0) return;
    lines.push(`${prefix} ${t}`);
    lines.push("");
    ms.forEach((f, i) => {
      lines.push(f.texte ?? "");
      lines.push("");
      if (i < ms.length - 1) { lines.push("---"); lines.push(""); }
    });
  });
  return lines.join("\n").trimEnd();
}

// ─── Bouton export réutilisable ─────────────────────────────────────────────

function BtnExport({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      className="soft-button"
      onClick={onClick}
      style={{ cursor: "pointer", fontSize: 11, padding: "3px 9px" }}
    >
      {label}
    </button>
  );
}

// ─── Page ───────────────────────────────────────────────────────────────────

export default function Tableau() {
  const [fragments, setFragments] = useState<Fragment[]>([]);
  const [tomes, setTomes] = useState<Tome[]>(TOMES_DEFAUT);
  const [chapitresParTome, setChapitresParTome] = useState<Record<number, string[]>>(CHAPITRES_DEFAUT);

  useEffect(() => {
    setFragments(lireFragments());
    const savedTomes = localStorage.getItem("structure-tomes");
    if (savedTomes) setTomes(JSON.parse(savedTomes));
    const savedChapitres = localStorage.getItem("structure-chapitres");
    if (savedChapitres) setChapitresParTome(JSON.parse(savedChapitres));
  }, []);

  // Stats globales
  const totalCoffre = fragments.length;
  const totalManuscrit = fragments.filter((f) => f.manuscrit).length;
  const totalNonIntegres = fragments.filter((f) => !f.manuscrit).length;
  const totalChapitres = tomes.reduce((acc, t) => acc + (chapitresParTome[t.id] ?? []).length, 0);
  const chapitresAlimentes = tomes.reduce((acc, t) =>
    acc + (chapitresParTome[t.id] ?? []).filter((c) =>
      fragments.some((f) => f.tomeId === t.id && f.chapitre === c)
    ).length, 0);
  const chapitresVides = totalChapitres - chapitresAlimentes;
  const pctManuscrit = totalCoffre > 0 ? Math.round((totalManuscrit / totalCoffre) * 100) : 0;

  // Derniers fragments
  const derniersFragments = [...fragments]
    .sort((a, b) => fragmentSortValue(b) - fragmentSortValue(a))
    .slice(0, 5);

  // Fonctions export
  function exporterTout(format: "txt" | "md") {
    const sections: Section[] = tomes.flatMap((t) =>
      (chapitresParTome[t.id] ?? []).map((c) => ({
        titre: `${t.titre} — ${c}`,
        fragments: fragments.filter((f) => f.tomeId === t.id && f.chapitre === c),
      }))
    );
    const titre = "L'Héritage des Silences — Manuscrit complet";
    const contenu = format === "txt" ? buildTxt(titre, sections) : buildMarkdown(titre, sections);
    telecharger(contenu, `heritage-manuscrit.${format}`);
  }

  function exporterTome(tomeId: number, format: "txt" | "md") {
    const tome = tomes.find((t) => t.id === tomeId);
    if (!tome) return;
    const sections: Section[] = (chapitresParTome[tomeId] ?? []).map((c) => ({
      titre: c,
      fragments: fragments.filter((f) => f.tomeId === tomeId && f.chapitre === c),
    }));
    const contenu = format === "txt" ? buildTxt(tome.titre, sections) : buildMarkdown(tome.titre, sections);
    telecharger(contenu, `${slug(tome.titre)}.${format}`);
  }

  function exporterChapitre(tomeId: number, chapitre: string, format: "txt" | "md") {
    const tome = tomes.find((t) => t.id === tomeId);
    const sections: Section[] = [{
      titre: chapitre,
      fragments: fragments.filter((f) => f.tomeId === tomeId && f.chapitre === chapitre),
    }];
    const titre = `${tome?.titre ?? ""} — ${chapitre}`;
    const contenu = format === "txt" ? buildTxt(titre, sections) : buildMarkdown(titre, sections, 2);
    telecharger(contenu, `${slug(tome?.titre ?? "tome")}-${slug(chapitre)}.${format}`);
  }

  return (
    <main className="internal-page">
      <SystemPageShell maxWidth={960} padding="22px 16px 44px">
      <header className="internal-header" style={{ display: "flex", flexWrap: "wrap", justifyContent: "space-between", gap: 14 }}>
        <div style={{ minWidth: 0 }}>
          <p className="internal-kicker">Manuscrit</p>
          <h1 className="internal-title" style={{ fontStyle: "italic" }}>L'Héritage des Silences</h1>
          <p className="internal-subtitle">Tableau de bord</p>
        </div>
        <SystemActionRow>
          <BackLink label="Système" />
          <Link className="soft-button" href="/fragments" style={{ fontSize: 12, textDecoration: "none" }}>Coffre →</Link>
          <Link className="soft-button" href="/structure" style={{ fontSize: 12, textDecoration: "none" }}>Structure →</Link>
          <Link className="soft-button" href="/chronologie" style={{ fontSize: 12, textDecoration: "none" }}>Chronologie →</Link>
          <Link className="soft-button" href="/repetitions" style={{ fontSize: 12, textDecoration: "none" }}>Répétitions →</Link>
        </SystemActionRow>
      </header>

      {/* Stats globales */}
      <SystemGrid min={150} gap={12}>
        <CompactMetric label="Fragments" value={`${totalCoffre} total`} />
        <CompactMetric label="Manuscrit" value={`${totalManuscrit} intégré${totalManuscrit !== 1 ? "s" : ""}`} />
        <CompactMetric label="Coffre" value={`${totalNonIntegres} restant${totalNonIntegres !== 1 ? "s" : ""}`} />
        <CompactMetric label="Chapitres" value={`${chapitresAlimentes}/${totalChapitres} alimentés`} />
      </SystemGrid>

      {/* Barre de progression */}
      {totalCoffre > 0 && (
        <SystemPanel compact style={{ marginTop: 18 }}>
          <div style={{ color: "var(--text-muted)", display: "flex", flexWrap: "wrap", fontSize: 11, gap: 8, justifyContent: "space-between", marginBottom: 8 }}>
            <span>{pctManuscrit}% des fragments intégrés au manuscrit</span>
            <span>{chapitresVides} chapitre{chapitresVides !== 1 ? "s" : ""} encore vide{chapitresVides !== 1 ? "s" : ""}</span>
          </div>
          <div style={{ background: "rgba(255, 250, 238, 0.08)", borderRadius: 999, height: 6, overflow: "hidden" }}>
            <div style={{ background: "#9fbd99", borderRadius: 999, height: "100%", transition: "width 0.3s ease", width: `${pctManuscrit}%` }} />
          </div>
        </SystemPanel>
      )}

      {/* Export */}
      {totalManuscrit > 0 && (
        <SystemPanel ariaLabel="Export">
          <SystemSectionHeader eyebrow="Export" title="Manuscrit exportable" />

          {/* Manuscrit complet */}
          <div style={{ alignItems: "center", borderBottom: "1px solid rgba(201, 168, 92, 0.12)", display: "flex", flexWrap: "wrap", gap: 10, marginBottom: 12, paddingBottom: 12 }}>
            <span style={{ color: "var(--text-main)", flex: 1, fontSize: 13, minWidth: 160 }}>Manuscrit complet</span>
            <span style={{ color: "var(--text-muted)", fontSize: 11 }}>{totalManuscrit} fragment{totalManuscrit !== 1 ? "s" : ""}</span>
            <BtnExport label=".txt" onClick={() => exporterTout("txt")} />
            <BtnExport label=".md" onClick={() => exporterTout("md")} />
          </div>

          {/* Par tome */}
          {tomes.map((tome) => {
            const count = fragments.filter((f) => f.tomeId === tome.id && f.manuscrit).length;
            return (
              <div key={tome.id} style={{ alignItems: "center", borderBottom: "1px solid rgba(201, 168, 92, 0.08)", display: "flex", flexWrap: "wrap", gap: 10, marginBottom: 8, paddingBottom: 8 }}>
                <span style={{ color: "#d7bd79", flex: 1, fontSize: 12, minWidth: 160 }}>{tome.titre}</span>
                <span style={{ color: "var(--text-muted)", fontSize: 11 }}>{count || "—"}</span>
                <BtnExport label=".txt" onClick={() => exporterTome(tome.id, "txt")} />
                <BtnExport label=".md" onClick={() => exporterTome(tome.id, "md")} />
              </div>
            );
          })}
        </SystemPanel>
      )}

      {/* Par tome — tables */}
      {tomes.map((tome) => {
        const fragsduTome = fragments.filter((f) => f.tomeId === tome.id);
        const manuscritTome = fragsduTome.filter((f) => f.manuscrit).length;
        const chapitres = chapitresParTome[tome.id] ?? [];

        return (
          <SystemPanel key={tome.id} ariaLabel={tome.titre}>
            <SystemSectionHeader
              eyebrow="Tome"
              title={tome.titre}
              actions={
                <StatusChip>
                  {fragsduTome.length} coffre · {manuscritTome} manuscrit
                </StatusChip>
              }
            />

            {chapitres.length === 0 ? (
              <p style={{ color: "var(--text-muted)", fontSize: 12, fontStyle: "italic", margin: 0 }}>Aucun chapitre défini.</p>
            ) : (
              <SystemTable minWidth={680}>
                <thead>
                  <tr>
                    <SystemTableHeader>Chapitre</SystemTableHeader>
                    <SystemTableHeader>Coffre</SystemTableHeader>
                    <SystemTableHeader>Manuscrit</SystemTableHeader>
                    <SystemTableHeader>Statut</SystemTableHeader>
                    <SystemTableHeader>Export</SystemTableHeader>
                  </tr>
                </thead>
                <tbody>
                  {chapitres.map((chapitre, i) => {
                    const fragsChapitre = fragsduTome.filter((f) => f.chapitre === chapitre);
                    const manuscritChapitre = fragsChapitre.filter((f) => f.manuscrit).length;
                    const vide = fragsChapitre.length === 0;

                    let statut: string;
                    let statutColor: string;
                    if (vide) { statut = "vide"; statutColor = "#ddd"; }
                    else if (manuscritChapitre === 0) { statut = "en attente"; statutColor = "#f0a030"; }
                    else if (manuscritChapitre >= 3) { statut = "bien alimenté"; statutColor = "#6a9e7a"; }
                    else { statut = "en cours"; statutColor = tome.color; }

                    return (
                      <tr key={chapitre} style={{ background: i % 2 === 0 ? "rgba(255, 250, 238, 0.025)" : "transparent", borderBottom: "1px solid rgba(201, 168, 92, 0.08)" }}>
                        <td style={{ color: vide ? "var(--text-muted)" : "var(--text-main)", padding: "9px 12px" }}>{chapitre}</td>
                        <td style={{ color: vide ? "var(--text-muted)" : "var(--text-soft)", padding: "9px 12px", textAlign: "center" }}>
                          {vide ? "—" : fragsChapitre.length}
                        </td>
                        <td style={{ color: manuscritChapitre === 0 ? "var(--text-muted)" : "#9fbd99", fontWeight: manuscritChapitre > 0 ? "bold" : "normal", padding: "9px 12px", textAlign: "center" }}>
                          {manuscritChapitre === 0 ? "—" : manuscritChapitre}
                        </td>
                        <td style={{ padding: "9px 12px" }}>
                          <span style={{ fontSize: 11, color: statutColor }}>{statut}</span>
                        </td>
                        <td style={{ padding: "9px 12px", textAlign: "right", whiteSpace: "nowrap" }}>
                          {manuscritChapitre > 0 && (
                            <span style={{ display: "inline-flex", gap: 4 }}>
                              <BtnExport label=".txt" onClick={() => exporterChapitre(tome.id, chapitre, "txt")} />
                              <BtnExport label=".md" onClick={() => exporterChapitre(tome.id, chapitre, "md")} />
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </SystemTable>
            )}
          </SystemPanel>
        );
      })}

      {/* Derniers fragments ajoutés */}
      {derniersFragments.length > 0 && (
        <SystemPanel ariaLabel="Derniers fragments ajoutés">
          <SystemSectionHeader eyebrow="Coffre" title="Derniers fragments ajoutés" />
          {derniersFragments.map((f) => (
            <div key={f.id} style={{ alignItems: "flex-start", borderBottom: "1px solid rgba(201, 168, 92, 0.08)", display: "flex", flexWrap: "wrap", gap: 10, padding: "10px 0" }}>
              <span style={{ color: "var(--text-muted)", fontSize: 11, minWidth: 72, whiteSpace: "nowrap" }}>{f.date ?? ""}</span>
              <span style={{ border: "1px solid rgba(201, 168, 92, 0.16)", borderRadius: 999, color: "#d7bd79", fontSize: 11, padding: "2px 8px", whiteSpace: "nowrap" }}>
                {f.tome?.replace(/^Tome\s+\d+\s+—\s+/, "") ?? "—"}
              </span>
              <span style={{ color: "var(--text-soft)", flex: "1 1 220px", fontSize: 13, fontStyle: "italic", lineHeight: 1.5 }}>
                {f.texte?.slice(0, 90)}{f.texte?.length > 90 ? "…" : ""}
              </span>
            </div>
          ))}
        </SystemPanel>
      )}

      {totalCoffre === 0 && (
        <SystemPanel compact>
          <p style={{ color: "var(--text-soft)", fontStyle: "italic", margin: 0, textAlign: "center" }}>
            Aucun fragment dans le Coffre.
          </p>
        </SystemPanel>
      )}
      </SystemPageShell>
    </main>
  );
}
