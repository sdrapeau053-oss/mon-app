"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { lireFragments, type Fragment } from "@/lib/fragments";

type VueMode = "age" | "periode" | "annee";

type AgeRow =
  | { type: "point"; age: number; frags: Fragment[]; last: boolean }
  | { type: "gap"; from: number; to: number; years: number };

type AnneeRow =
  | { type: "point"; annee: number; frags: Fragment[]; last: boolean }
  | { type: "gap"; from: number; to: number; years: number };

function FragCard({ f, expanded, onToggle }: { f: Fragment; expanded: boolean; onToggle: () => void }) {
  return (
    <div
      className="chapter-card"
      style={{ marginBottom: 8, cursor: "pointer" }}
      onClick={onToggle}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center", marginBottom: 4 }}>
            <span style={{ fontSize: 11, background: "#f9f6f0", color: "#8B7355", padding: "2px 8px", borderRadius: 20 }}>
              {f.chapitre || f.tome || "—"}
            </span>
            {(f.tags ?? []).slice(0, 3).map((t: string) => (
              <span key={t} style={{ fontSize: 10, color: "#aaa", background: "#f5f2ee", padding: "1px 6px", borderRadius: 10 }}>{t}</span>
            ))}
            {f.manuscrit && <span style={{ fontSize: 10, color: "#6a9e7a" }}>✓</span>}
          </div>
          {expanded ? (
            <p style={{ fontSize: 14, lineHeight: 2, whiteSpace: "pre-wrap", color: "#333", marginTop: 4 }}>{f.texte}</p>
          ) : (
            <p style={{ fontSize: 13, color: "#666", lineHeight: 1.7, marginTop: 4, overflow: "hidden", maxHeight: "3.4em" }}>{f.texte}</p>
          )}
        </div>
        <span style={{ fontSize: 10, color: "#ccc", flexShrink: 0, paddingTop: 2 }}>{expanded ? "▲" : "▼"}</span>
      </div>
    </div>
  );
}

function DotSolid({ label }: { label?: string }) {
  return (
    <div style={{ width: 36, height: 36, borderRadius: "50%", background: "#8B7355", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, border: "3px solid #f6f3ee" }}>
      {label && <span style={{ fontSize: 11, color: "white", fontWeight: 700 }}>{label}</span>}
    </div>
  );
}

function DotSmall() {
  return (
    <div style={{ width: 12, height: 12, borderRadius: "50%", background: "#8B7355", flexShrink: 0, marginTop: 12, border: "2px solid #f6f3ee" }} />
  );
}

function LinesolId() {
  return <div style={{ flex: 1, width: 0, borderLeft: "2px solid #e8e2d9", marginTop: 4, minHeight: 16 }} />;
}

function LineDashed() {
  return <div style={{ flex: 1, width: 0, borderLeft: "2px dashed #ddd5c8", minHeight: 32 }} />;
}

function PillYear({ label }: { label: string }) {
  return (
    <div style={{ width: 48, height: 28, borderRadius: 8, background: "#8B7355", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, border: "2px solid #f6f3ee" }}>
      <span style={{ fontSize: 10, color: "white", fontWeight: 700 }}>{label}</span>
    </div>
  );
}

export default function Chronologie() {
  const [fragments, setFragments] = useState<Fragment[]>([]);
  const [vue, setVue] = useState<VueMode>("age");
  const [expandedId, setExpandedId] = useState<Fragment["id"] | null>(null);

  useEffect(() => {
    setFragments(lireFragments());
  }, []);

  function toggleExpand(id: Fragment["id"]) {
    setExpandedId((prev) => (String(prev) === String(id) ? null : id));
  }

  // ── Age ──────────────────────────────────────────────────────────────────
  const ageMap = new Map<number, Fragment[]>();
  fragments.forEach((f) => {
    if (f.age == null) return;
    if (!ageMap.has(f.age)) ageMap.set(f.age, []);
    ageMap.get(f.age)!.push(f);
  });
  const groupesAge = [...ageMap.entries()].sort((a, b) => a[0] - b[0]).map(([age, frags]) => ({ age, frags }));
  const ageRows: AgeRow[] = [];
  groupesAge.forEach((g, idx) => {
    const prev = groupesAge[idx - 1];
    if (prev && g.age - prev.age > 1) {
      ageRows.push({ type: "gap", from: prev.age + 1, to: g.age - 1, years: g.age - prev.age - 1 });
    }
    ageRows.push({ type: "point", age: g.age, frags: g.frags, last: idx === groupesAge.length - 1 });
  });
  const sansAge = fragments.filter((f) => f.age == null);

  // ── Période ───────────────────────────────────────────────────────────────
  const periodeMap = new Map<string, Fragment[]>();
  fragments.forEach((f) => {
    if (!f.periode) return;
    if (!periodeMap.has(f.periode)) periodeMap.set(f.periode, []);
    periodeMap.get(f.periode)!.push(f);
  });
  const groupesPeriode = [...periodeMap.entries()]
    .map(([periode, frags]) => {
      const ages = frags.map((f) => f.age).filter((a): a is number => a != null);
      return { periode, frags, minAge: ages.length ? Math.min(...ages) : null };
    })
    .sort((a, b) => {
      if (a.minAge != null && b.minAge != null) return a.minAge - b.minAge;
      if (a.minAge != null) return -1;
      if (b.minAge != null) return 1;
      return a.periode.localeCompare(b.periode);
    });
  const sansPeriode = fragments.filter((f) => !f.periode);

  // ── Année ─────────────────────────────────────────────────────────────────
  const anneeMap = new Map<number, Fragment[]>();
  fragments.forEach((f) => {
    if (f.anneeApprox == null) return;
    if (!anneeMap.has(f.anneeApprox)) anneeMap.set(f.anneeApprox, []);
    anneeMap.get(f.anneeApprox)!.push(f);
  });
  const groupesAnnee = [...anneeMap.entries()].sort((a, b) => a[0] - b[0]).map(([annee, frags]) => ({ annee, frags }));
  const anneeRows: AnneeRow[] = [];
  groupesAnnee.forEach((g, idx) => {
    const prev = groupesAnnee[idx - 1];
    if (prev && g.annee - prev.annee > 1) {
      anneeRows.push({ type: "gap", from: prev.annee + 1, to: g.annee - 1, years: g.annee - prev.annee - 1 });
    }
    anneeRows.push({ type: "point", annee: g.annee, frags: g.frags, last: idx === groupesAnnee.length - 1 });
  });
  const sansAnnee = fragments.filter((f) => f.anneeApprox == null);

  const totalClass =
    vue === "age" ? fragments.filter((f) => f.age != null).length
    : vue === "periode" ? fragments.filter((f) => f.periode).length
    : fragments.filter((f) => f.anneeApprox != null).length;
  const totalSans =
    vue === "age" ? sansAge.length
    : vue === "periode" ? sansPeriode.length
    : sansAnnee.length;

  return (
    <main style={{ maxWidth: 800, margin: "0 auto", padding: 24 }}>
      {/* Nav */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 20 }}>
        <div>
          <h1 style={{ fontSize: 22, fontStyle: "italic", color: "#8B7355" }}>L'Héritage des Silences</h1>
          <p style={{ fontSize: 12, color: "#999" }}>
            Chronologie — {totalClass} fragment{totalClass !== 1 ? "s" : ""} classé{totalClass !== 1 ? "s" : ""}
            {totalSans > 0 && <span> · {totalSans} sans repère</span>}
          </p>
        </div>
        <div style={{ display: "flex", gap: 16, flexWrap: "wrap", justifyContent: "flex-end" }}>
          <Link href="/" style={{ fontSize: 12, color: "#8B7355" }}>← Atelier</Link>
          <Link href="/fragments" style={{ fontSize: 12, color: "#8B7355" }}>Coffre →</Link>
          <Link href="/structure" style={{ fontSize: 12, color: "#8B7355" }}>Structure →</Link>
          <Link href="/tableau" style={{ fontSize: 12, color: "#8B7355" }}>Tableau →</Link>
          <Link href="/repetitions" style={{ fontSize: 12, color: "#8B7355" }}>Répétitions →</Link>
        </div>
      </div>

      {/* Vue toggle */}
      <div style={{ display: "flex", border: "1px solid #e8e2d9", borderRadius: 8, overflow: "hidden", width: "fit-content", marginBottom: 32 }}>
        {(["age", "periode", "annee"] as VueMode[]).map((v) => (
          <button key={v} onClick={() => setVue(v)} style={{
            fontSize: 12, padding: "7px 18px", border: "none", cursor: "pointer",
            background: vue === v ? "#8B7355" : "#fff",
            color: vue === v ? "white" : "#666",
            borderRight: v !== "annee" ? "1px solid #e8e2d9" : "none",
          }}>
            {v === "age" ? "Âge" : v === "periode" ? "Période de vie" : "Année"}
          </button>
        ))}
      </div>

      {fragments.length === 0 && (
        <p style={{ color: "#999", fontStyle: "italic" }}>Aucun fragment dans le coffre.</p>
      )}

      {/* ── VUE ÂGE ─────────────────────────────────────────────────────── */}
      {vue === "age" && (
        <>
          {ageRows.length === 0 && fragments.length > 0 && (
            <p style={{ color: "#bbb", fontStyle: "italic", marginBottom: 24, fontSize: 13 }}>
              Aucun fragment avec un âge renseigné — ajoute l'âge depuis le Coffre.
            </p>
          )}
          {ageRows.map((row, i) => {
            if (row.type === "gap") {
              return (
                <div key={`gap-${i}`} style={{ display: "flex" }}>
                  <div style={{ width: 56, flexShrink: 0, display: "flex", flexDirection: "column", alignItems: "center" }}>
                    <LineDashed />
                  </div>
                  <div style={{ flex: 1, paddingLeft: 16, display: "flex", alignItems: "center" }}>
                    <span style={{ fontSize: 11, color: "#ccc", fontStyle: "italic" }}>
                      {row.years === 1
                        ? `${row.from} ans — sans souvenir`
                        : `${row.from}–${row.to} ans — ${row.years} ans sans souvenir`}
                    </span>
                  </div>
                </div>
              );
            }
            return (
              <div key={`age-${row.age}`} style={{ display: "flex" }}>
                <div style={{ width: 56, flexShrink: 0, display: "flex", flexDirection: "column", alignItems: "center" }}>
                  <DotSolid label={String(row.age)} />
                  {!row.last && <LinesolId />}
                </div>
                <div style={{ flex: 1, paddingLeft: 16, paddingBottom: 24 }}>
                  <p style={{ fontSize: 11, color: "#bbb", marginBottom: 10, paddingTop: 8 }}>
                    {row.age} an{row.age > 1 ? "s" : ""} · {row.frags.length} fragment{row.frags.length > 1 ? "s" : ""}
                  </p>
                  {row.frags.map((f) => (
                    <FragCard key={f.id} f={f} expanded={String(expandedId) === String(f.id)} onToggle={() => toggleExpand(f.id)} />
                  ))}
                </div>
              </div>
            );
          })}
          {sansAge.length > 0 && (
            <div style={{ marginTop: ageRows.length ? 24 : 0, paddingTop: 16, borderTop: ageRows.length ? "1px dashed #e8e2d9" : "none" }}>
              <p style={{ fontSize: 11, color: "#ccc", fontStyle: "italic", marginBottom: 12 }}>
                Sans repère d'âge · {sansAge.length} fragment{sansAge.length > 1 ? "s" : ""}
              </p>
              {sansAge.map((f) => (
                <FragCard key={f.id} f={f} expanded={String(expandedId) === String(f.id)} onToggle={() => toggleExpand(f.id)} />
              ))}
            </div>
          )}
        </>
      )}

      {/* ── VUE PÉRIODE ──────────────────────────────────────────────────── */}
      {vue === "periode" && (
        <>
          {groupesPeriode.length === 0 && fragments.length > 0 && (
            <p style={{ color: "#bbb", fontStyle: "italic", marginBottom: 24, fontSize: 13 }}>
              Aucun fragment avec une période renseignée — ajoute la période depuis le Coffre.
            </p>
          )}
          {groupesPeriode.map((g, idx) => (
            <div key={g.periode} style={{ display: "flex" }}>
              <div style={{ width: 56, flexShrink: 0, display: "flex", flexDirection: "column", alignItems: "center" }}>
                <DotSmall />
                {idx < groupesPeriode.length - 1 && <LinesolId />}
              </div>
              <div style={{ flex: 1, paddingLeft: 16, paddingBottom: 28 }}>
                <p style={{ fontSize: 15, fontWeight: 600, color: "#555", textTransform: "capitalize", marginBottom: 2, paddingTop: 4 }}>
                  {g.periode}
                </p>
                <p style={{ fontSize: 11, color: "#bbb", marginBottom: 10 }}>
                  {g.frags.length} fragment{g.frags.length > 1 ? "s" : ""}
                  {g.minAge != null && ` · à partir de ${g.minAge} ans`}
                </p>
                {g.frags.map((f) => (
                  <FragCard key={f.id} f={f} expanded={String(expandedId) === String(f.id)} onToggle={() => toggleExpand(f.id)} />
                ))}
              </div>
            </div>
          ))}
          {sansPeriode.length > 0 && (
            <div style={{ marginTop: groupesPeriode.length ? 24 : 0, paddingTop: 16, borderTop: groupesPeriode.length ? "1px dashed #e8e2d9" : "none" }}>
              <p style={{ fontSize: 11, color: "#ccc", fontStyle: "italic", marginBottom: 12 }}>
                Sans période · {sansPeriode.length} fragment{sansPeriode.length > 1 ? "s" : ""}
              </p>
              {sansPeriode.map((f) => (
                <FragCard key={f.id} f={f} expanded={String(expandedId) === String(f.id)} onToggle={() => toggleExpand(f.id)} />
              ))}
            </div>
          )}
        </>
      )}

      {/* ── VUE ANNÉE ────────────────────────────────────────────────────── */}
      {vue === "annee" && (
        <>
          {anneeRows.length === 0 && fragments.length > 0 && (
            <p style={{ color: "#bbb", fontStyle: "italic", marginBottom: 24, fontSize: 13 }}>
              Aucun fragment avec une année renseignée — ajoute l'année depuis le Coffre.
            </p>
          )}
          {anneeRows.map((row, i) => {
            if (row.type === "gap") {
              return (
                <div key={`gap-${i}`} style={{ display: "flex" }}>
                  <div style={{ width: 56, flexShrink: 0, display: "flex", flexDirection: "column", alignItems: "center" }}>
                    <LineDashed />
                  </div>
                  <div style={{ flex: 1, paddingLeft: 16, display: "flex", alignItems: "center" }}>
                    <span style={{ fontSize: 11, color: "#ccc", fontStyle: "italic" }}>
                      {row.years === 1
                        ? `${row.from} — sans souvenir`
                        : `${row.from}–${row.to} — ${row.years} ans sans souvenir`}
                    </span>
                  </div>
                </div>
              );
            }
            return (
              <div key={`annee-${row.annee}`} style={{ display: "flex" }}>
                <div style={{ width: 56, flexShrink: 0, display: "flex", flexDirection: "column", alignItems: "center" }}>
                  <PillYear label={String(row.annee)} />
                  {!row.last && <LinesolId />}
                </div>
                <div style={{ flex: 1, paddingLeft: 16, paddingBottom: 24 }}>
                  <p style={{ fontSize: 11, color: "#bbb", marginBottom: 10, paddingTop: 6 }}>
                    {row.annee} · {row.frags.length} fragment{row.frags.length > 1 ? "s" : ""}
                  </p>
                  {row.frags.map((f) => (
                    <FragCard key={f.id} f={f} expanded={String(expandedId) === String(f.id)} onToggle={() => toggleExpand(f.id)} />
                  ))}
                </div>
              </div>
            );
          })}
          {sansAnnee.length > 0 && (
            <div style={{ marginTop: anneeRows.length ? 24 : 0, paddingTop: 16, borderTop: anneeRows.length ? "1px dashed #e8e2d9" : "none" }}>
              <p style={{ fontSize: 11, color: "#ccc", fontStyle: "italic", marginBottom: 12 }}>
                Sans année · {sansAnnee.length} fragment{sansAnnee.length > 1 ? "s" : ""}
              </p>
              {sansAnnee.map((f) => (
                <FragCard key={f.id} f={f} expanded={String(expandedId) === String(f.id)} onToggle={() => toggleExpand(f.id)} />
              ))}
            </div>
          )}
        </>
      )}
    </main>
  );
}
