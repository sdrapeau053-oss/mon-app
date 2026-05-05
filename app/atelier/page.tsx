"use client";

import { useState } from "react";
import Link from "next/link";

const NARRATIVE_TYPES_KEY = "atelier-narrative-types";

function readNarrativeTypes() {
  if (typeof window === "undefined") return [];

  try {
    const saved = localStorage.getItem(NARRATIVE_TYPES_KEY);
    return saved ? JSON.parse(saved) as string[] : [];
  } catch {
    return [];
  }
}

function checkNarrativeBalance(types: string[]) {
  const lastFive = types.slice(-5);
  const lastThree = types.slice(-3);

  if (lastThree.length === 3 && lastThree.every((type) => type === "sévère")) {
    return {
      status: "warning" as const,
      message: "⚠️ Trop de tension. Ajouter respiration.",
    };
  }

  if (lastFive.length === 5 && !lastFive.includes("doux")) {
    return {
      status: "warning" as const,
      message: "⚠️ Aucun chapitre doux dans les 5 derniers. Prévoir une respiration.",
    };
  }

  return {
    status: "ok" as const,
    message: "✔ Équilibre narratif acceptable.",
  };
}

function checkWritingProtocol(text: string) {
  const violations: string[] = [];
  const lowerText = text.toLowerCase();
  const explanatoryPhrases = [
    "je comprenais",
    "je réalisais",
    "cela signifiait",
    "je savais que",
  ];
  const forbiddenWords = ["trauma", "résilience", "peur", "tristesse"];
  const sentences = text
    .split(/[.!?]+/)
    .map((sentence) => sentence.trim())
    .filter(Boolean);

  if (explanatoryPhrases.some((phrase) => lowerText.includes(phrase))) {
    violations.push("Explication au lieu de montrer");
  }

  if (forbiddenWords.some((word) => lowerText.includes(word))) {
    violations.push("Mot abstrait interdit");
  }

  if (sentences.some((sentence) => sentence.split(/\s+/).filter(Boolean).length > 25)) {
    violations.push("Phrase trop longue (rythme)");
  }

  return { violations };
}

export default function Atelier() {
  const [text, setText] = useState("");
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [narrativeTypes, setNarrativeTypes] = useState<string[]>(readNarrativeTypes);

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
      const protocolCheck = checkWritingProtocol(text);
      const mergedViolations = Array.from(
        new Set([...(data.result?.violations ?? []), ...protocolCheck.violations]),
      );
      const resultWithProtocolCheck = {
        ...data.result,
        violations: mergedViolations,
      };

      setResult(resultWithProtocolCheck);

      const structureType = resultWithProtocolCheck?.structure?.type;
      if (typeof structureType === "string" && structureType.trim()) {
        setNarrativeTypes((current) => {
          const next = [...current, structureType.trim().toLowerCase()].slice(-5);
          localStorage.setItem(NARRATIVE_TYPES_KEY, JSON.stringify(next));
          return next;
        });
      }
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
  const narrativeBalance = checkNarrativeBalance(narrativeTypes);

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

          {result.structure && (
            <div className="panel">
              <p className="label-meta">Structure narrative détectée</p>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))", gap: 10 }}>
                <div className="placement-cell">
                  <p className="label-meta" style={{ marginBottom: 4 }}>Chapitre suggéré</p>
                  <p style={{ fontWeight: 600, color: "var(--text-main)", fontSize: 14 }}>
                    {result.structure.chapitre ?? "Non détecté"}
                  </p>
                </div>
                <div className="placement-cell">
                  <p className="label-meta" style={{ marginBottom: 4 }}>Bloc narratif</p>
                  <p style={{ fontWeight: 600, color: "var(--text-main)", fontSize: 14 }}>
                    {result.structure.bloc ?? "Non détecté"}
                  </p>
                </div>
                <div className="placement-cell">
                  <p className="label-meta" style={{ marginBottom: 4 }}>Type émotionnel</p>
                  <p style={{ fontWeight: 600, color: "var(--text-main)", fontSize: 14 }}>
                    {result.structure.type ?? "Non détecté"}
                  </p>
                </div>
                <div className="placement-cell">
                  <p className="label-meta" style={{ marginBottom: 4 }}>Cohérence</p>
                  <p style={{ fontWeight: 600, color: result.structure["cohérent"] ? "var(--primary)" : "var(--text-muted)", fontSize: 14 }}>
                    {result.structure["cohérent"] ? "Oui" : "Non"}
                  </p>
                </div>
              </div>
              <p
                style={{
                  background: result.structure["cohérent"] ? "#F0FDF4" : "#FFF7ED",
                  border: `1px solid ${result.structure["cohérent"] ? "#86EFAC" : "#FDBA74"}`,
                  borderRadius: 10,
                  color: result.structure["cohérent"] ? "#166534" : "#9A3412",
                  fontSize: 13,
                  fontWeight: 600,
                  lineHeight: 1.5,
                  margin: "12px 0 0",
                  padding: "10px 12px",
                }}
              >
                {result.structure["cohérent"]
                  ? "✔ Placement cohérent dans la structure du tome"
                  : "⚠️ Placement incertain — vérifier le chapitre ou affiner le souvenir"}
              </p>
              <p
                style={{
                  background: narrativeBalance.status === "ok" ? "#F0FDF4" : "#FFF7ED",
                  border: `1px solid ${narrativeBalance.status === "ok" ? "#86EFAC" : "#FDBA74"}`,
                  borderRadius: 10,
                  color: narrativeBalance.status === "ok" ? "#166534" : "#9A3412",
                  fontSize: 13,
                  fontWeight: 600,
                  lineHeight: 1.5,
                  margin: "8px 0 0",
                  padding: "10px 12px",
                }}
              >
                {narrativeBalance.message}
              </p>
            </div>
          )}

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
