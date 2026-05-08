"use client";

import { useEffect, useState } from "react";
import { BackLink } from "@/components/ui/back-link";

type OptionGroup = "objectifs" | "tons" | "longueurs";

type GhostwritingState = {
  clientText: string;
  objectifs: string[];
  tons: string[];
  longueurs: string[];
};

const STORAGE_KEY = "freelance-ghostwriting-last-input";

const defaultState: GhostwritingState = {
  clientText: "",
  objectifs: [],
  tons: [],
  longueurs: [],
};

const options = {
  objectifs: [
    "raconter une histoire personnelle",
    "clarifier un message",
    "écrire un texte émotionnel",
  ],
  tons: ["intime", "professionnel", "littéraire"],
  longueurs: ["court", "moyen", "long"],
};

function analyserProjet(clientText: string) {
  const length = clientText.trim().length;

  if (length > 700) {
    return {
      complexite: "Élevée",
      prix: "400$",
    };
  }

  if (length > 240) {
    return {
      complexite: "Moyenne",
      prix: "250$",
    };
  }

  return {
    complexite: "Simple",
    prix: "150$",
  };
}

function lireSauvegarde(): GhostwritingState {
  if (typeof window === "undefined") return defaultState;

  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? { ...defaultState, ...JSON.parse(saved) } : defaultState;
  } catch {
    return defaultState;
  }
}

function genererReponseClient(prix: string) {
  return `Voici ce que je te propose :
Un texte narratif basé sur ton histoire.

Délai : 3 jours
Prix : ${prix}`;
}

export default function FreelancePage() {
  const [form, setForm] = useState<GhostwritingState>(defaultState);
  const [result, setResult] = useState("");
  const [clientResponse, setClientResponse] = useState("");
  const [generationError, setGenerationError] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [copied, setCopied] = useState(false);
  const [clientResponseCopied, setClientResponseCopied] = useState(false);
  const quickAnalysis = analyserProjet(form.clientText);

  useEffect(() => {
    setForm(lireSauvegarde());
  }, []);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(form));
  }, [form]);

  function updateClientText(clientText: string) {
    setForm((current) => ({ ...current, clientText }));
  }

  function toggleOption(group: OptionGroup, value: string) {
    setForm((current) => {
      const currentValues = current[group];
      const nextValues = currentValues.includes(value)
        ? currentValues.filter((item) => item !== value)
        : [value];

      return {
        ...current,
        [group]: nextValues,
      };
    });
  }

  async function handleGenerate() {
    const clientText = form.clientText.trim();
    const objectif = form.objectifs[0] || "clarifier un message";
    const ton = form.tons[0] || "professionnel";
    const longueur = form.longueurs[0] || "moyen";

    if (!clientText) {
      setGenerationError("Colle un texte client avant de générer.");
      return;
    }

    setCopied(false);
    setGenerationError("");
    setIsGenerating(true);

    try {
      const response = await fetch("/api/agent", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message: `
Tu es un expert en ghostwriting narratif.

Message client :
${clientText}

Objectif : ${objectif}
Ton : ${ton}
Longueur : ${longueur}

Génère un texte humain, émotionnel et fluide.
`,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data?.error || "Erreur génération Claude");
      }

      setResult(data.result || "Erreur génération");
    } catch (error) {
      setGenerationError(error instanceof Error ? error.message : "Erreur génération Claude");
    } finally {
      setIsGenerating(false);
    }
  }

  function handleGenerateClientResponse() {
    setClientResponse(genererReponseClient(quickAnalysis.prix));
    setClientResponseCopied(false);
  }

  async function handleCopy() {
    if (!result) return;
    await navigator.clipboard.writeText(result);
    setCopied(true);
    setTimeout(() => setCopied(false), 1400);
  }

  async function handleCopyClientResponse() {
    if (!clientResponse) return;
    await navigator.clipboard.writeText(clientResponse);
    setClientResponseCopied(true);
    setTimeout(() => setClientResponseCopied(false), 1400);
  }

  return (
    <main style={{ margin: "0 auto", maxWidth: 620, padding: "18px 14px 28px" }}>
      <header style={{ marginBottom: 18 }}>
        <BackLink label="Système" />
        <p className="label-meta" style={{ margin: "18px 0 6px" }}>
          MVP service
        </p>
        <h1
          style={{
            color: "var(--primary)",
            fontSize: 32,
            fontStyle: "italic",
            lineHeight: 1,
            margin: 0,
          }}
        >
          Ghostwriting
        </h1>
      </header>

      <section className="panel" style={{ marginBottom: 14, padding: 16 }}>
        <p className="label-meta" style={{ marginBottom: 10 }}>
          Analyse rapide
        </p>
        <div style={{ display: "grid", gap: 10, gridTemplateColumns: "1fr 1fr", marginBottom: 12 }}>
          <div className="placement-cell" style={{ padding: 12 }}>
            <p className="word-count" style={{ margin: "0 0 4px" }}>
              Complexité
            </p>
            <strong style={{ color: "var(--text-main)", fontSize: 18 }}>{quickAnalysis.complexite}</strong>
          </div>
          <div className="placement-cell" style={{ padding: 12 }}>
            <p className="word-count" style={{ margin: "0 0 4px" }}>
              Prix suggéré
            </p>
            <strong style={{ color: "var(--text-main)", fontSize: 18 }}>{quickAnalysis.prix}</strong>
          </div>
        </div>

        <button className="btn-ghost" type="button" onClick={handleGenerateClientResponse} style={{ width: "100%" }}>
          ⚡ Générer réponse client
        </button>

        {clientResponse && (
          <article className="placement-cell" style={{ marginTop: 12, padding: 13 }}>
            <div style={{ alignItems: "center", display: "flex", gap: 10, justifyContent: "space-between" }}>
              <p className="word-count" style={{ margin: 0 }}>
                Réponse client
              </p>
              <button className="soft-button" type="button" onClick={handleCopyClientResponse}>
                {clientResponseCopied ? "Copié" : "📋 Copier réponse"}
              </button>
            </div>
            <p
              style={{
                color: "var(--text-soft)",
                fontSize: 13,
                lineHeight: 1.7,
                marginBottom: 0,
                whiteSpace: "pre-wrap",
              }}
            >
              {clientResponse}
            </p>
          </article>
        )}
      </section>

      <section className="panel" style={{ marginBottom: 14, padding: 16 }}>
        <label className="label-meta" htmlFor="client-text">
          Texte du client
        </label>
        <textarea
          className="textarea-atelier"
          id="client-text"
          value={form.clientText}
          onChange={(event) => updateClientText(event.target.value)}
          placeholder="Colle ici le texte ou l’idée du client..."
          style={{ fontSize: 15, minHeight: 150 }}
        />
      </section>

      <section className="panel" style={{ marginBottom: 14, padding: 16 }}>
        <OptionSection
          group="objectifs"
          label="Objectif"
          selected={form.objectifs}
          values={options.objectifs}
          onToggle={toggleOption}
        />
        <OptionSection
          group="tons"
          label="Ton"
          selected={form.tons}
          values={options.tons}
          onToggle={toggleOption}
        />
        <OptionSection
          group="longueurs"
          label="Longueur"
          selected={form.longueurs}
          values={options.longueurs}
          onToggle={toggleOption}
        />
      </section>

      <div style={{ display: "grid", gap: 10, marginBottom: 14 }}>
        <button className="btn-primary" type="button" onClick={handleGenerate} disabled={isGenerating}>
          {isGenerating ? "Génération..." : "Générer"}
        </button>
        {result && (
          <button className="btn-ghost" type="button" onClick={handleGenerate} disabled={isGenerating}>
            Regénérer
          </button>
        )}
      </div>

      <section className="panel" style={{ padding: 16 }}>
        <div style={{ alignItems: "center", display: "flex", gap: 12, justifyContent: "space-between" }}>
          <p className="label-meta" style={{ margin: 0 }}>
            Résultat
          </p>
          {result && (
            <button className="soft-button" type="button" onClick={handleCopy}>
              {copied ? "Copié" : "Copier"}
            </button>
          )}
        </div>

        {generationError ? (
          <p style={{ color: "#9f3a38", fontSize: 14, lineHeight: 1.7, marginBottom: 0 }}>
            {generationError}
          </p>
        ) : result ? (
          <p
            style={{
              color: "var(--text-soft)",
              fontSize: 14,
              lineHeight: 1.75,
              marginBottom: 0,
              whiteSpace: "pre-wrap",
            }}
          >
            {result}
          </p>
        ) : (
          <p style={{ color: "var(--text-muted)", fontSize: 14, lineHeight: 1.7, marginBottom: 0 }}>
            Colle un texte, choisis une direction, puis génère une première version.
          </p>
        )}
      </section>
    </main>
  );
}

function OptionSection({
  group,
  label,
  onToggle,
  selected,
  values,
}: {
  group: OptionGroup;
  label: string;
  onToggle: (group: OptionGroup, value: string) => void;
  selected: string[];
  values: string[];
}) {
  return (
    <div style={{ marginBottom: 16 }}>
      <p className="label-meta" style={{ marginBottom: 8 }}>
        {label}
      </p>
      <div style={{ display: "grid", gap: 8 }}>
        {values.map((value) => {
          const checked = selected.includes(value);

          return (
            <label
              key={value}
              style={{
                alignItems: "center",
                background: checked ? "rgba(198, 169, 126, 0.18)" : "rgba(255, 250, 243, 0.74)",
                border: checked
                  ? "1px solid rgba(198, 169, 126, 0.58)"
                  : "1px solid var(--border-soft)",
                borderRadius: 12,
                cursor: "pointer",
                display: "grid",
                gap: 10,
                gridTemplateColumns: "auto 1fr",
                padding: "12px 13px",
              }}
            >
              <input checked={checked} onChange={() => onToggle(group, value)} type="checkbox" />
              <span style={{ color: "var(--text-main)", fontSize: 14, fontWeight: 650 }}>{value}</span>
            </label>
          );
        })}
      </div>
    </div>
  );
}
