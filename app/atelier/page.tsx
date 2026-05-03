"use client";

import { useState } from "react";
import Link from "next/link";

export default function Atelier() {
  const [text, setText] = useState("");
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function analyser() {
    if (!text.trim()) return;
    setLoading(true);
    setResult(null);
    setSaved(false);
    setError(null);
    try {
      const res = await fetch("/api/analyser", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Une erreur est survenue lors de l'analyse.");
        return;
      }
      setResult(data.result);
    } catch {
      setError("Impossible de contacter le serveur. Vérifie ta connexion.");
    } finally {
      setLoading(false);
    }
  }

  function sauvegarder() {
    if (!result) return;
    try {
      const existing = localStorage.getItem("fragments");
      const fragments = existing ? JSON.parse(existing) : [];
      fragments.unshift({
        id: Date.now(),
        source: text,
        texte: result.fragment,
        tome: result.tome,
        chapitre: result.chapitre,
        violations: result.violations ?? [],
        date: new Date().toLocaleDateString("fr-CA"),
        versions: [],
        tags: [],
        age: null,
        periode: null,
        anneeApprox: null,
      });
      localStorage.setItem("fragments", JSON.stringify(fragments));
      setSaved(true);
    } catch(e) {
      console.error("Erreur sauvegarde", e);
    }
  }

  const wordCount = text.trim() ? text.trim().split(/\s+/).length : 0;

  return (
    <main style={{ maxWidth: 700, margin: "0 auto", padding: "32px 24px" }}>

      {/* ── En-tête ── */}
      <div style={{ marginBottom: 32 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 16 }}>
          <div>
            <Link href="/" style={{ fontSize: 11, color: "var(--text-muted)" }}>← Accueil</Link>
            <h1 style={{ fontSize: 26, fontStyle: "italic", color: "var(--primary)", lineHeight: 1.2, marginBottom: 4, marginTop: 6 }}>
              L'Héritage des Silences
            </h1>
            <p style={{ fontSize: 12, color: "var(--text-muted)", letterSpacing: 0.5 }}>
              Atelier d'écriture · IA narrative
            </p>
          </div>
          <nav style={{ display: "flex", gap: 14, flexWrap: "wrap", justifyContent: "flex-end", paddingTop: 4 }}>
            <Link href="/vue-double" style={{ fontSize: 12, color: "var(--primary)" }}>Écriture</Link>
            <Link href="/fragments" style={{ fontSize: 12, color: "var(--primary)" }}>Coffre</Link>
            <Link href="/structure" style={{ fontSize: 12, color: "var(--primary)" }}>Structure</Link>
            <Link href="/tableau" style={{ fontSize: 12, color: "var(--primary)" }}>Tableau</Link>
            <Link href="/chronologie" style={{ fontSize: 12, color: "var(--primary)" }}>Chronologie</Link>
            <Link href="/repetitions" style={{ fontSize: 12, color: "var(--primary)" }}>Répétitions</Link>
            <Link href="/lecture" style={{ fontSize: 12, color: "var(--primary)" }}>Lecture</Link>
            <Link href="/audit" style={{ fontSize: 12, color: "var(--primary)" }}>Audit</Link>
          </nav>
        </div>
        <div style={{ marginTop: 20, borderTop: "1px solid var(--border-soft)" }} />
      </div>

      {/* ── Zone d'écriture ── */}
      <div style={{ marginBottom: 24 }}>
        <p className="label-meta" style={{ marginBottom: 10 }}>Souvenir · fragment · sensation</p>
        <textarea
          className="textarea-atelier"
          value={text}
          onChange={(e) => { setText(e.target.value); setSaved(false); setResult(null); setError(null); }}
          placeholder="Dépose ici un souvenir, un fragment, une sensation..."
        />
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 10 }}>
          <span className="word-count">
            {wordCount > 0 ? `${wordCount} mot${wordCount > 1 ? "s" : ""}` : ""}
          </span>
          <button className="btn-primary" onClick={analyser} disabled={loading || !text.trim()}>
            {loading ? "Analyse en cours…" : "Analyser →"}
          </button>
        </div>
      </div>

      {error && (
        <div className="error-alert" style={{ marginBottom: 24 }}>
          {error}
        </div>
      )}

      {result && (
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>

          <div className="panel">
            <p className="label-meta">Placement suggéré</p>
            <div style={{ display: "flex", gap: 10 }}>
              <div className="placement-cell">
                <p className="label-meta" style={{ marginBottom: 4 }}>Tome</p>
                <p style={{ fontWeight: 600, color: "var(--primary)", fontSize: 14 }}>{result.tome}</p>
              </div>
              <div className="placement-cell">
                <p className="label-meta" style={{ marginBottom: 4 }}>Chapitre</p>
                <p style={{ fontWeight: 600, color: "var(--text-main)", fontSize: 14 }}>{result.chapitre}</p>
              </div>
            </div>
          </div>

          {result.fragment && (
            <div className="chapter-card" style={{ padding: "20px 22px" }}>
              <p className="label-meta">Fragment narratif</p>
              <p style={{ lineHeight: 2, whiteSpace: "pre-wrap", fontSize: 15, color: "var(--text-main)" }}>
                {result.fragment}
              </p>
            </div>
          )}

          {result.violations?.length > 0 && (
            <div className="error-alert">
              <p className="label-meta" style={{ color: "#b04040", marginBottom: 8 }}>
                Violations du protocole
              </p>
              {result.violations.map((v: string, i: number) => (
                <p key={i} style={{ fontSize: 13, marginTop: i > 0 ? 4 : 0 }}>• {v}</p>
              ))}
            </div>
          )}

          <button onClick={sauvegarder} disabled={saved} className={saved ? "btn-saved" : "btn-save"}>
            {saved ? "✓ Fragment sauvegardé dans le coffre" : "Sauvegarder ce fragment →"}
          </button>

        </div>
      )}
    </main>
  );
}
