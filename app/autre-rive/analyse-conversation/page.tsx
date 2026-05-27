"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  StatusChip,
  SystemGrid,
  SystemPageShell,
  SystemPanel,
  SystemSectionHeader,
} from "@/components/system-ui";
import { BackLink } from "@/components/ui/back-link";

type Tonalite = "Positive" | "Tendue" | "Mixte" | "Neutre";
type NiveauTension = "Faible" | "Modéré" | "Élevé";

interface ConversationAnalysis {
  tonalite: Tonalite;
  patterns: string[];
  niveauTension: NiveauTension;
  observations: string[];
  negativeCount: number;
}

interface AnalyseConversation {
  id: string;
  date: string;
  tonalite: string;
  patterns: string[];
  niveauTension: string;
  observations: string[];
}

interface StoredDossier {
  id: string;
  nom: string;
  statut: string;
  dateCreation: string;
  derniereAnalyse?: {
    date: string;
    tonalite: string;
    patterns: string[];
    niveauTension: string;
    observations: string[];
  };
  analyses?: AnalyseConversation[];
}

const STORAGE_KEY = "autre-rive-dossiers";

const positiveKeywords = [
  "merci",
  "content",
  "heureux",
  "bien",
  "super",
  "génial",
  "j'apprécie",
  "je t'aime",
  "présent",
  "disponible",
];

const negativeKeywords = [
  "jamais",
  "toujours",
  "tu ne",
  "tu n'es pas",
  "c'est ta faute",
  "pas capable",
  "déçu",
  "frustré",
  "colère",
  "encore une fois",
];

const patternDefinitions = [
  {
    label: "Généralisation détectée",
    keywords: ["toujours", "jamais", "tout le temps", "chaque fois"],
  },
  {
    label: "Pattern de blâme détecté",
    keywords: ["c'est ta faute", "tu ne fais jamais", "t'as encore"],
  },
  {
    label: "Retrait détecté",
    keywords: ["laisse-moi tranquille", "j'ai besoin d'espace", "je ne veux plus en parler"],
  },
  {
    label: "Demande affective détectée",
    keywords: ["j'ai besoin", "tu pourrais", "est-ce que tu peux", "j'aimerais que"],
  },
];

const dashboardButtonStyle = {
  alignItems: "center",
  borderRadius: 999,
  display: "inline-flex",
  fontSize: 12.5,
  justifyContent: "center",
  lineHeight: 1,
  minHeight: 36,
  padding: "7px 11px",
  textAlign: "center",
  whiteSpace: "nowrap",
} as const;

const dashboardFieldStyle = {
  display: "grid",
  gap: 4,
} as const;

const dashboardControlStyle = {
  boxSizing: "border-box",
  fontSize: 13,
  minHeight: 36,
  padding: "6px 10px",
  width: "100%",
} as const;

function isStoredDossier(value: unknown): value is StoredDossier {
  if (!value || typeof value !== "object") return false;
  const item = value as Partial<StoredDossier>;
  return typeof item.id === "string" && typeof item.nom === "string" && typeof item.statut === "string" && typeof item.dateCreation === "string";
}

function readDossiers(): StoredDossier[] {
  if (typeof window === "undefined") return [];

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    const data: unknown = raw ? JSON.parse(raw) : [];
    return Array.isArray(data) ? data.filter(isStoredDossier) : [];
  } catch {
    return [];
  }
}

function createAnalysisId() {
  return `analyse-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function countKeywordMatches(text: string, keywords: string[]) {
  return keywords.reduce((total, keyword) => {
    return text.includes(keyword) ? total + 1 : total;
  }, 0);
}

function analyzeConversation(text: string): ConversationAnalysis {
  const normalized = text.toLocaleLowerCase("fr-CA");
  const positiveCount = countKeywordMatches(normalized, positiveKeywords);
  const negativeCount = countKeywordMatches(normalized, negativeKeywords);

  let tonalite: Tonalite = "Neutre";
  if (positiveCount > 0 && negativeCount > 0) tonalite = "Mixte";
  else if (positiveCount > 0) tonalite = "Positive";
  else if (negativeCount > 0) tonalite = "Tendue";

  const patterns = patternDefinitions
    .filter((pattern) => pattern.keywords.some((keyword) => normalized.includes(keyword)))
    .map((pattern) => pattern.label);

  let niveauTension: NiveauTension = "Faible";
  if (negativeCount >= 3) niveauTension = "Élevé";
  else if (negativeCount >= 1) niveauTension = "Modéré";

  const observations: string[] = [];
  if (patterns.includes("Généralisation détectée")) {
    observations.push("Des formulations absolues ont été repérées. Cela peut indiquer une frustration accumulée.");
  }
  if (patterns.includes("Pattern de blâme détecté")) {
    observations.push("Des formulations de responsabilisation directe ont été repérées.");
  }
  if (tonalite === "Positive") {
    observations.push("La conversation contient des éléments d'expression positive.");
  }
  if (!patterns.length) {
    observations.push("Aucun pattern préoccupant détecté dans cet extrait.");
  }
  observations.push(`Le niveau de tension semble ${niveauTension.toLocaleLowerCase("fr-CA")} dans cet extrait.`);

  return {
    tonalite,
    patterns,
    niveauTension,
    observations: observations.slice(0, 3),
    negativeCount,
  };
}

function tonaliteTone(tonalite: Tonalite): "success" | "warning" | "neutral" {
  if (tonalite === "Positive") return "success";
  if (tonalite === "Tendue" || tonalite === "Mixte") return "warning";
  return "neutral";
}

function tensionProgress(niveau: NiveauTension) {
  if (niveau === "Élevé") return 100;
  if (niveau === "Modéré") return 62;
  return 28;
}

function tensionColor(niveau: NiveauTension) {
  if (niveau === "Élevé") return "#b56b5f";
  if (niveau === "Modéré") return "var(--accent-gold)";
  return "#9fbd99";
}

export default function AnalyseConversationPage() {
  const [dossiers, setDossiers] = useState<StoredDossier[]>([]);
  const [selectedDossierId, setSelectedDossierId] = useState("");
  const [conversation, setConversation] = useState("");
  const [conversationError, setConversationError] = useState("");
  const [analysis, setAnalysis] = useState<ConversationAnalysis | null>(null);
  const [toast, setToast] = useState("");

  useEffect(() => {
    const loadedDossiers = readDossiers();
    const query = new URLSearchParams(window.location.search);
    const queryDossierId = query.get("dossier") || "";
    const selectedExists = loadedDossiers.some((dossier) => dossier.id === queryDossierId);

    setDossiers(loadedDossiers);
    setSelectedDossierId(selectedExists ? queryDossierId : loadedDossiers[0]?.id || "");
  }, []);

  const selectedDossier = useMemo(() => {
    return dossiers.find((dossier) => dossier.id === selectedDossierId) || null;
  }, [dossiers, selectedDossierId]);

  function runAnalysis() {
    const content = conversation.trim();
    if (content.length < 50) {
      setConversationError("Ajoutez au moins 50 caractères pour analyser.");
      setAnalysis(null);
      return;
    }

    setConversationError("");
    setAnalysis(analyzeConversation(content));
  }

  function saveAnalysisToDossier() {
    if (!selectedDossier || !analysis) return;

    const currentDossiers = readDossiers();
    const savedAnalysis: AnalyseConversation = {
      date: new Date().toISOString(),
      id: createAnalysisId(),
      niveauTension: analysis.niveauTension,
      observations: analysis.observations,
      patterns: analysis.patterns,
      tonalite: analysis.tonalite,
    };
    const next = currentDossiers.map((dossier) =>
      dossier.id === selectedDossier.id
        ? {
            ...dossier,
            derniereAnalyse: {
              date: savedAnalysis.date,
              niveauTension: savedAnalysis.niveauTension,
              observations: savedAnalysis.observations,
              patterns: savedAnalysis.patterns,
              tonalite: savedAnalysis.tonalite,
            },
            analyses: [savedAnalysis, ...(Array.isArray(dossier.analyses) ? dossier.analyses : [])],
          }
        : dossier,
    );

    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      setDossiers(next);
      setToast(`Analyse sauvegardée dans le dossier ${selectedDossier.nom}.`);
      window.setTimeout(() => setToast(""), 2000);
    } catch {
      return;
    }
  }

  return (
    <main className="internal-page">
      <SystemPageShell maxWidth={1100}>
        <header className="internal-header">
          <BackLink href="/autre-rive" label="L’Autre Rive" />
          <p className="internal-kicker">Analyse locale</p>
          <h1 className="internal-title">Analyse de conversation</h1>
          <p className="internal-subtitle">Collez un extrait et obtenez une lecture relationnelle.</p>
        </header>

        {!dossiers.length ? (
          <SystemPanel ariaLabel="Aucun dossier relationnel" compact>
            <SystemSectionHeader eyebrow="Étape 1" title="Créez d'abord un dossier relationnel." />
            <Link className="internal-button-primary" href="/autre-rive/dossiers" style={dashboardButtonStyle}>
              Créer un dossier
            </Link>
          </SystemPanel>
        ) : (
          <>
            <SystemPanel ariaLabel="Sélection du dossier" compact>
              <SystemSectionHeader eyebrow="Étape 1" title="Sélection du dossier" />
              <SystemGrid gap={10} min={260}>
                <label style={dashboardFieldStyle}>
                  <span className="label-meta">Dossier</span>
                  <select
                    className="internal-control"
                    onChange={(event) => setSelectedDossierId(event.target.value)}
                    style={dashboardControlStyle}
                    value={selectedDossierId}
                  >
                    {dossiers.map((dossier) => (
                      <option key={dossier.id} value={dossier.id}>
                        {dossier.nom}
                      </option>
                    ))}
                  </select>
                </label>
                <div className="chapter-card" style={{ display: "grid", gap: 5, marginBottom: 0, padding: 12 }}>
                  <p className="label-meta" style={{ margin: 0 }}>Dossier concerné</p>
                  <strong style={{ color: "var(--text-main)", fontFamily: "var(--font-serif)", fontSize: 20 }}>
                    {selectedDossier?.nom || "Aucun dossier sélectionné"}
                  </strong>
                </div>
              </SystemGrid>
            </SystemPanel>

            <SystemPanel ariaLabel="Saisie de la conversation" compact>
              <SystemSectionHeader eyebrow="Étape 2" title="Saisie de la conversation" />
              <label style={dashboardFieldStyle}>
                <span className="label-meta">Conversation</span>
                <textarea
                  className="internal-control"
                  onChange={(event) => {
                    setConversation(event.target.value);
                    setConversationError("");
                  }}
                  placeholder="Collez ici un extrait de conversation — SMS, message vocal transcrit, email, etc."
                  rows={10}
                  style={{ ...dashboardControlStyle, minHeight: 240 }}
                  value={conversation}
                />
              </label>
              {conversation.trim().length < 50 || conversationError ? (
                <p style={{ color: conversationError ? "#d79a8f" : "var(--text-soft)", fontSize: 12, margin: "8px 0 0" }}>
                  {conversationError || "Ajoutez au moins 50 caractères pour analyser."}
                </p>
              ) : null}
              <button
                className="internal-button-primary"
                disabled={conversation.trim().length < 50}
                onClick={runAnalysis}
                style={{ ...dashboardButtonStyle, marginTop: 12, opacity: conversation.trim().length < 50 ? 0.55 : 1 }}
                type="button"
              >
                Analyser la conversation
              </button>
            </SystemPanel>

            {analysis ? (
              <SystemPanel ariaLabel="Résultats de l'analyse" compact>
                <SystemSectionHeader eyebrow="Étape 3" title="Analyse" />
                <SystemGrid gap={10} min={220}>
                  <article className="chapter-card" style={{ display: "grid", gap: 8, marginBottom: 0, padding: 14 }}>
                    <p className="label-meta" style={{ margin: 0 }}>Tonalité générale</p>
                    <StatusChip tone={tonaliteTone(analysis.tonalite)}>{analysis.tonalite}</StatusChip>
                  </article>
                  <article className="chapter-card" style={{ display: "grid", gap: 8, marginBottom: 0, padding: 14 }}>
                    <p className="label-meta" style={{ margin: 0 }}>Niveau de tension</p>
                    <strong style={{ color: "var(--text-main)", fontFamily: "var(--font-serif)", fontSize: 22 }}>
                      {analysis.niveauTension}
                    </strong>
                    <div style={{ background: "rgba(255,255,255,.06)", borderRadius: 999, height: 6, overflow: "hidden", width: "100%" }}>
                      <div
                        style={{
                          background: tensionColor(analysis.niveauTension),
                          height: "100%",
                          transition: "width .2s ease",
                          width: `${tensionProgress(analysis.niveauTension)}%`,
                        }}
                      />
                    </div>
                  </article>
                </SystemGrid>

                <div style={{ display: "grid", gap: 12, marginTop: 14 }}>
                  <section>
                    <h2 style={{ color: "var(--text-main)", fontFamily: "var(--font-serif)", fontSize: 20, margin: "0 0 8px" }}>
                      Patterns détectés
                    </h2>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 7 }}>
                      {analysis.patterns.length ? (
                        analysis.patterns.map((pattern) => <StatusChip key={pattern} tone="warning">{pattern}</StatusChip>)
                      ) : (
                        <StatusChip tone="neutral">Aucun pattern détecté</StatusChip>
                      )}
                    </div>
                  </section>

                  <section>
                    <h2 style={{ color: "var(--text-main)", fontFamily: "var(--font-serif)", fontSize: 20, margin: "0 0 8px" }}>
                      Observations
                    </h2>
                    <div style={{ display: "grid", gap: 8 }}>
                      {analysis.observations.map((observation) => (
                        <p className="editorial-body" key={observation} style={{ margin: 0 }}>
                          {observation}
                        </p>
                      ))}
                    </div>
                  </section>

                  <button
                    className="internal-button-primary"
                    disabled={!selectedDossier}
                    onClick={saveAnalysisToDossier}
                    style={{ ...dashboardButtonStyle, justifySelf: "start", opacity: selectedDossier ? 1 : 0.55 }}
                    type="button"
                  >
                    Sauvegarder dans le dossier {selectedDossier?.nom || ""}
                  </button>
                </div>
              </SystemPanel>
            ) : null}
          </>
        )}
      </SystemPageShell>

      {toast ? (
        <div
          style={{
            background: "rgba(21,18,14,.96)",
            border: "1px solid rgba(201,168,92,.36)",
            borderRadius: 999,
            bottom: 20,
            color: "var(--accent-gold)",
            fontSize: 13,
            left: "50%",
            padding: "10px 14px",
            position: "fixed",
            transform: "translateX(-50%)",
            zIndex: 90,
          }}
        >
          {toast}
        </div>
      ) : null}
    </main>
  );
}
