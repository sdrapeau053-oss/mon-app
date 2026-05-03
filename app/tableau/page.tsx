"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

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
type Section = { titre: string; fragments: any[] };

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
      onClick={onClick}
      style={{ fontSize: 11, padding: "3px 9px", background: "none", border: "1px solid #ddd", borderRadius: 5, cursor: "pointer", color: "#777", fontFamily: "Georgia, serif" }}
    >
      {label}
    </button>
  );
}

// ─── Page ───────────────────────────────────────────────────────────────────

export default function Tableau() {
  const [fragments, setFragments] = useState<any[]>([]);
  const [tomes, setTomes] = useState<Tome[]>(TOMES_DEFAUT);
  const [chapitresParTome, setChapitresParTome] = useState<Record<number, string[]>>(CHAPITRES_DEFAUT);

  useEffect(() => {
    setFragments(JSON.parse(localStorage.getItem("fragments") || "[]"));
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
  const derniersFragments = [...fragments].sort((a, b) => b.id - a.id).slice(0, 5);

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
    <main style={{ maxWidth: 860, margin: "0 auto", padding: 24 }}>

      {/* En-tête */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 28 }}>
        <div>
          <h1 style={{ fontSize: 22, fontStyle: "italic", color: "#8B7355" }}>L'Héritage des Silences</h1>
          <p style={{ fontSize: 12, color: "#999" }}>Tableau de bord</p>
        </div>
        <div style={{ display: "flex", gap: 16 }}>
          <Link href="/" style={{ fontSize: 12, color: "#8B7355" }}>← Atelier</Link>
          <Link href="/fragments" style={{ fontSize: 12, color: "#8B7355" }}>Coffre →</Link>
          <Link href="/structure" style={{ fontSize: 12, color: "#8B7355" }}>Structure →</Link>
          <Link href="/chronologie" style={{ fontSize: 12, color: "#8B7355" }}>Chronologie →</Link>
          <Link href="/repetitions" style={{ fontSize: 12, color: "#8B7355" }}>Répétitions →</Link>
        </div>
      </div>

      {/* Stats globales */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, marginBottom: 20 }}>
        <div className="panel" style={{ padding: "16px 20px" }}>
          <div style={{ fontSize: 28, fontWeight: "bold", color: "#8B7355" }}>{totalCoffre}</div>
          <div style={{ fontSize: 12, color: "#999", marginTop: 4 }}>fragment{totalCoffre !== 1 ? "s" : ""} au total</div>
        </div>
        <div style={{ background: "#f4f8f4", border: "1px solid #d0e0d0", borderRadius: 10, padding: "16px 20px" }}>
          <div style={{ fontSize: 28, fontWeight: "bold", color: "#6a9e7a" }}>{totalManuscrit}</div>
          <div style={{ fontSize: 12, color: "#999", marginTop: 4 }}>dans le manuscrit</div>
        </div>
        <div style={{ background: "#fdf6ee", border: "1px solid #f0e0cc", borderRadius: 10, padding: "16px 20px" }}>
          <div style={{ fontSize: 28, fontWeight: "bold", color: "#c6884a" }}>{totalNonIntegres}</div>
          <div style={{ fontSize: 12, color: "#999", marginTop: 4 }}>non intégré{totalNonIntegres !== 1 ? "s" : ""}</div>
        </div>
        <div style={{ background: "#fafafa", border: "1px solid #eee", borderRadius: 10, padding: "16px 20px" }}>
          <div style={{ fontSize: 28, fontWeight: "bold", color: "#555" }}>
            {chapitresAlimentes}<span style={{ fontSize: 16, color: "#bbb" }}>/{totalChapitres}</span>
          </div>
          <div style={{ fontSize: 12, color: "#999", marginTop: 4 }}>chapitres alimentés</div>
        </div>
      </div>

      {/* Barre de progression */}
      {totalCoffre > 0 && (
        <div style={{ marginBottom: 32 }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6, fontSize: 11, color: "#999" }}>
            <span>{pctManuscrit}% des fragments intégrés au manuscrit</span>
            <span>{chapitresVides} chapitre{chapitresVides !== 1 ? "s" : ""} encore vide{chapitresVides !== 1 ? "s" : ""}</span>
          </div>
          <div style={{ height: 6, background: "#eee", borderRadius: 3, overflow: "hidden" }}>
            <div style={{ height: "100%", width: `${pctManuscrit}%`, background: "#6a9e7a", borderRadius: 3, transition: "width 0.3s ease" }} />
          </div>
        </div>
      )}

      {/* Export */}
      {totalManuscrit > 0 && (
        <div className="panel" style={{ marginBottom: 36, padding: "16px 20px" }}>
          <p style={{ fontSize: 11, color: "#999", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 14 }}>Export</p>

          {/* Manuscrit complet */}
          <div style={{ display: "flex", alignItems: "center", gap: 10, paddingBottom: 12, marginBottom: 12, borderBottom: "1px solid #f0f0f0" }}>
            <span style={{ flex: 1, fontSize: 13, color: "#333" }}>Manuscrit complet</span>
            <span style={{ fontSize: 11, color: "#bbb" }}>{totalManuscrit} fragment{totalManuscrit !== 1 ? "s" : ""}</span>
            <BtnExport label=".txt" onClick={() => exporterTout("txt")} />
            <BtnExport label=".md" onClick={() => exporterTout("md")} />
          </div>

          {/* Par tome */}
          {tomes.map((tome) => {
            const count = fragments.filter((f) => f.tomeId === tome.id && f.manuscrit).length;
            return (
              <div key={tome.id} style={{ display: "flex", alignItems: "center", gap: 10, paddingBottom: 8, marginBottom: 8, borderBottom: "1px solid #f8f8f8" }}>
                <span style={{ flex: 1, fontSize: 12, color: tome.color }}>{tome.titre}</span>
                <span style={{ fontSize: 11, color: "#bbb" }}>{count || "—"}</span>
                <BtnExport label=".txt" onClick={() => exporterTome(tome.id, "txt")} />
                <BtnExport label=".md" onClick={() => exporterTome(tome.id, "md")} />
              </div>
            );
          })}
        </div>
      )}

      {/* Par tome — tables */}
      {tomes.map((tome) => {
        const fragsduTome = fragments.filter((f) => f.tomeId === tome.id);
        const manuscritTome = fragsduTome.filter((f) => f.manuscrit).length;
        const chapitres = chapitresParTome[tome.id] ?? [];

        return (
          <div key={tome.id} style={{ marginBottom: 32 }}>
            <div style={{ display: "flex", alignItems: "baseline", gap: 12, marginBottom: 8, paddingBottom: 8, borderBottom: `2px solid ${tome.color}44` }}>
              <h2 style={{ fontSize: 15, color: tome.color, margin: 0, fontWeight: 600 }}>{tome.titre}</h2>
              <span style={{ fontSize: 12, color: "#aaa" }}>
                {fragsduTome.length} coffre · {manuscritTome} manuscrit
              </span>
            </div>

            {chapitres.length === 0 ? (
              <p style={{ fontSize: 12, color: "#ccc", fontStyle: "italic", padding: "8px 10px" }}>Aucun chapitre défini.</p>
            ) : (
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                <thead>
                  <tr style={{ color: "#aaa", fontSize: 11, textTransform: "uppercase", letterSpacing: "0.05em" }}>
                    <th style={{ textAlign: "left", padding: "6px 10px", fontWeight: "normal", width: "44%" }}>Chapitre</th>
                    <th style={{ textAlign: "center", padding: "6px 10px", fontWeight: "normal" }}>Coffre</th>
                    <th style={{ textAlign: "center", padding: "6px 10px", fontWeight: "normal" }}>Manuscrit</th>
                    <th style={{ textAlign: "left", padding: "6px 10px", fontWeight: "normal" }}>Statut</th>
                    <th style={{ textAlign: "right", padding: "6px 10px", fontWeight: "normal" }}>Export</th>
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
                      <tr key={chapitre} style={{ background: i % 2 === 0 ? "#fff" : "#fafafa", borderBottom: "1px solid #f0f0f0" }}>
                        <td style={{ padding: "9px 10px", color: vide ? "#bbb" : "#333" }}>{chapitre}</td>
                        <td style={{ padding: "9px 10px", textAlign: "center", color: vide ? "#ddd" : "#555" }}>
                          {vide ? "—" : fragsChapitre.length}
                        </td>
                        <td style={{ padding: "9px 10px", textAlign: "center", color: manuscritChapitre === 0 ? "#ddd" : "#6a9e7a", fontWeight: manuscritChapitre > 0 ? "bold" : "normal" }}>
                          {manuscritChapitre === 0 ? "—" : manuscritChapitre}
                        </td>
                        <td style={{ padding: "9px 10px" }}>
                          <span style={{ fontSize: 11, color: statutColor }}>{statut}</span>
                        </td>
                        <td style={{ padding: "9px 10px", textAlign: "right", whiteSpace: "nowrap" }}>
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
              </table>
            )}
          </div>
        );
      })}

      {/* Derniers fragments ajoutés */}
      {derniersFragments.length > 0 && (
        <div style={{ marginTop: 8, marginBottom: 32 }}>
          <p style={{ fontSize: 11, color: "#999", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 12 }}>
            Derniers fragments ajoutés
          </p>
          {derniersFragments.map((f) => (
            <div key={f.id} style={{ display: "flex", gap: 12, alignItems: "flex-start", padding: "10px 0", borderBottom: "1px solid #f0f0f0" }}>
              <span style={{ fontSize: 11, color: "#bbb", whiteSpace: "nowrap", minWidth: 72 }}>{f.date ?? ""}</span>
              <span style={{ fontSize: 11, background: "#f0ebe3", color: "#8B7355", padding: "2px 8px", borderRadius: 20, whiteSpace: "nowrap" }}>
                {f.tome?.replace(/^Tome\s+\d+\s+—\s+/, "") ?? "—"}
              </span>
              <span style={{ fontSize: 13, color: "#555", fontStyle: "italic", lineHeight: 1.5 }}>
                {f.texte?.slice(0, 90)}{f.texte?.length > 90 ? "…" : ""}
              </span>
            </div>
          ))}
        </div>
      )}

      {totalCoffre === 0 && (
        <p style={{ color: "#bbb", fontStyle: "italic", textAlign: "center", marginTop: 48 }}>
          Aucun fragment dans le Coffre.
        </p>
      )}
    </main>
  );
}
