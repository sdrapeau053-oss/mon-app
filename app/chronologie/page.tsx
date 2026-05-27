"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  StatusChip,
  SystemActionRow,
  SystemPageShell,
  SystemPanel,
} from "@/components/system-ui";
import { BackLink } from "@/components/ui/back-link";
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
    <article
      className="chapter-card"
      style={{ cursor: "pointer", marginBottom: 8 }}
      onClick={onToggle}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center", marginBottom: 4 }}>
            <StatusChip>
              {f.chapitre || f.tome || "—"}
            </StatusChip>
            {(f.tags ?? []).slice(0, 3).map((t: string) => (
              <StatusChip key={t}>{t}</StatusChip>
            ))}
            {f.manuscrit && <StatusChip tone="success">lié</StatusChip>}
          </div>
          {expanded ? (
            <p style={{ color: "var(--text-main)", fontSize: 14, lineHeight: 2, marginTop: 4, whiteSpace: "pre-wrap" }}>{f.texte}</p>
          ) : (
            <p style={{ color: "var(--text-soft)", fontSize: 13, lineHeight: 1.7, marginTop: 4, maxHeight: "3.4em", overflow: "hidden" }}>{f.texte}</p>
          )}
        </div>
        <span style={{ color: "var(--text-muted)", flexShrink: 0, fontSize: 10, paddingTop: 2 }}>{expanded ? "▲" : "▼"}</span>
      </div>
    </article>
  );
}

function DotSolid({ label }: { label?: string }) {
  return (
    <div style={{ alignItems: "center", background: "#c6a97e", border: "3px solid rgba(255, 250, 238, 0.1)", borderRadius: "50%", display: "flex", flexShrink: 0, height: 36, justifyContent: "center", width: 36 }}>
      {label && <span style={{ color: "#1a1612", fontSize: 11, fontWeight: 700 }}>{label}</span>}
    </div>
  );
}

function DotSmall() {
  return (
    <div style={{ background: "#c6a97e", border: "2px solid rgba(255, 250, 238, 0.1)", borderRadius: "50%", flexShrink: 0, height: 12, marginTop: 12, width: 12 }} />
  );
}

function LinesolId() {
  return <div style={{ borderLeft: "2px solid rgba(201, 168, 92, 0.22)", flex: 1, marginTop: 4, minHeight: 16, width: 0 }} />;
}

function LineDashed() {
  return <div style={{ borderLeft: "2px dashed rgba(201, 168, 92, 0.2)", flex: 1, minHeight: 32, width: 0 }} />;
}

function PillYear({ label }: { label: string }) {
  return (
    <div style={{ alignItems: "center", background: "#c6a97e", border: "2px solid rgba(255, 250, 238, 0.1)", borderRadius: 8, display: "flex", flexShrink: 0, height: 28, justifyContent: "center", width: 48 }}>
      <span style={{ color: "#1a1612", fontSize: 10, fontWeight: 700 }}>{label}</span>
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
    <main className="internal-page">
      <SystemPageShell maxWidth={900} padding="22px 16px 44px">
      <header className="internal-header" style={{ display: "flex", flexWrap: "wrap", justifyContent: "space-between", gap: 14 }}>
        <div style={{ minWidth: 0 }}>
          <p className="internal-kicker">Manuscrit</p>
          <h1 className="internal-title" style={{ fontStyle: "italic" }}>L'Héritage des Silences</h1>
          <p className="internal-subtitle">
            Chronologie — {totalClass} fragment{totalClass !== 1 ? "s" : ""} classé{totalClass !== 1 ? "s" : ""}
            {totalSans > 0 && <span> · {totalSans} sans repère</span>}
          </p>
        </div>
        <SystemActionRow>
          <BackLink label="Système" />
          <Link className="soft-button" href="/fragments" style={{ fontSize: 12, textDecoration: "none" }}>Coffre →</Link>
          <Link className="soft-button" href="/structure" style={{ fontSize: 12, textDecoration: "none" }}>Structure →</Link>
          <Link className="soft-button" href="/tableau" style={{ fontSize: 12, textDecoration: "none" }}>Tableau →</Link>
          <Link className="soft-button" href="/repetitions" style={{ fontSize: 12, textDecoration: "none" }}>Répétitions →</Link>
        </SystemActionRow>
      </header>

      {/* Vue toggle */}
      <SystemPanel compact style={{ marginBottom: 18 }}>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
        {(["age", "periode", "annee"] as VueMode[]).map((v) => (
          <button key={v} onClick={() => setVue(v)} style={{
            background: vue === v ? "#c6a97e" : "rgba(255, 250, 238, 0.04)",
            border: "1px solid rgba(201, 168, 92, 0.18)",
            borderRadius: 999,
            color: vue === v ? "#1a1612" : "var(--text-soft)",
            cursor: "pointer",
            fontSize: 12,
            padding: "7px 14px",
          }}>
            {v === "age" ? "Âge" : v === "periode" ? "Période de vie" : "Année"}
          </button>
        ))}
      </div>
      </SystemPanel>

      {fragments.length === 0 && (
        <SystemPanel compact>
          <p style={{ color: "var(--text-soft)", fontStyle: "italic", margin: 0 }}>Aucun fragment dans le coffre.</p>
        </SystemPanel>
      )}

      <SystemPanel ariaLabel="Chronologie des fragments">
      {/* ── VUE ÂGE ─────────────────────────────────────────────────────── */}
      {vue === "age" && (
        <>
          {ageRows.length === 0 && fragments.length > 0 && (
            <p style={{ color: "var(--text-muted)", fontSize: 13, fontStyle: "italic", marginBottom: 24 }}>
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
                    <span style={{ color: "var(--text-muted)", fontSize: 11, fontStyle: "italic" }}>
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
                  <p style={{ color: "var(--text-muted)", fontSize: 11, marginBottom: 10, paddingTop: 8 }}>
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
            <div style={{ borderTop: ageRows.length ? "1px dashed rgba(201, 168, 92, 0.18)" : "none", marginTop: ageRows.length ? 24 : 0, paddingTop: 16 }}>
              <p style={{ color: "var(--text-muted)", fontSize: 11, fontStyle: "italic", marginBottom: 12 }}>
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
            <p style={{ color: "var(--text-muted)", fontSize: 13, fontStyle: "italic", marginBottom: 24 }}>
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
                <p style={{ color: "var(--text-main)", fontSize: 15, fontWeight: 600, marginBottom: 2, paddingTop: 4, textTransform: "capitalize" }}>
                  {g.periode}
                </p>
                <p style={{ color: "var(--text-muted)", fontSize: 11, marginBottom: 10 }}>
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
            <div style={{ borderTop: groupesPeriode.length ? "1px dashed rgba(201, 168, 92, 0.18)" : "none", marginTop: groupesPeriode.length ? 24 : 0, paddingTop: 16 }}>
              <p style={{ color: "var(--text-muted)", fontSize: 11, fontStyle: "italic", marginBottom: 12 }}>
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
            <p style={{ color: "var(--text-muted)", fontSize: 13, fontStyle: "italic", marginBottom: 24 }}>
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
                    <span style={{ color: "var(--text-muted)", fontSize: 11, fontStyle: "italic" }}>
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
                  <p style={{ color: "var(--text-muted)", fontSize: 11, marginBottom: 10, paddingTop: 6 }}>
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
            <div style={{ borderTop: anneeRows.length ? "1px dashed rgba(201, 168, 92, 0.18)" : "none", marginTop: anneeRows.length ? 24 : 0, paddingTop: 16 }}>
              <p style={{ color: "var(--text-muted)", fontSize: 11, fontStyle: "italic", marginBottom: 12 }}>
                Sans année · {sansAnnee.length} fragment{sansAnnee.length > 1 ? "s" : ""}
              </p>
              {sansAnnee.map((f) => (
                <FragCard key={f.id} f={f} expanded={String(expandedId) === String(f.id)} onToggle={() => toggleExpand(f.id)} />
              ))}
            </div>
          )}
        </>
      )}
      </SystemPanel>
      </SystemPageShell>
    </main>
  );
}
