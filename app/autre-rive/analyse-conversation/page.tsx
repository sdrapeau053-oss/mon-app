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
type NiveauTension = "Faible" | "Modere" | "Eleve";

interface ConversationAnalysis {
  tonalite: Tonalite;
  patterns: string[];
  niveauTension: NiveauTension;
  observations: string[];
  negativeCount: number;
}

interface AnalyseIA {
  faits: string;
  interpretations: string;
  inconnues: string;
  clarte: string;
  clarteScore: number;
  reciprocite: string;
  reciprociteScore: number;
  securite: string;
  securiteScore: number;
  anglesMorts: string;
  verdict: string;
}

interface AnalyseConversation {
  id: string;
  date: string;
  tonalite: string;
  patterns: string[];
  niveauTension: string;
  observations: string[];
  analyseIA?: AnalyseIA;
}

interface StoredDossier {
  id: string;
  nom: string;
  statut: string;
  dateCreation: string;
  niveauClarte?: number;
  niveauReciprocite?: number;
  niveauSecurite?: number;
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

const positiveKeywords = ["merci","content","heureux","bien","super","genial","j'apprécie","je t'aime","present","disponible"];
const negativeKeywords = ["jamais","toujours","tu ne","tu n'es pas","c'est ta faute","pas capable","decu","frustre","colere","encore une fois"];
const patternDefinitions = [
  { label: "Generalisation detectee", keywords: ["toujours","jamais","tout le temps","chaque fois"] },
  { label: "Pattern de blame detecte", keywords: ["c'est ta faute","tu ne fais jamais","t'as encore"] },
  { label: "Retrait detecte", keywords: ["laisse-moi tranquille","j'ai besoin d'espace","je ne veux plus en parler"] },
  { label: "Demande affective detectee", keywords: ["j'ai besoin","tu pourrais","est-ce que tu peux","j'aimerais que"] },
];

const SECTIONS_IA = [
  { tag: "FAITS", titre: "Faits observables", couleur: "#3B8BD4", field: "faits" as keyof AnalyseIA },
  { tag: "INTERPRETATIONS", titre: "Interpretations possibles", couleur: "#BA7517", field: "interpretations" as keyof AnalyseIA },
  { tag: "INCONNUES", titre: "Inconnues", couleur: "#888780", field: "inconnues" as keyof AnalyseIA },
  { tag: "ANGLES", titre: "Angles morts", couleur: "#7F77DD", field: "anglesMorts" as keyof AnalyseIA },
  { tag: "VERDICT", titre: "Verdict synthese", couleur: "#1D9E75", field: "verdict" as keyof AnalyseIA },
];

const dashboardButtonStyle = { alignItems: "center", borderRadius: 999, display: "inline-flex", fontSize: 12.5, justifyContent: "center", lineHeight: 1, minHeight: 36, padding: "7px 11px", textAlign: "center", whiteSpace: "nowrap" } as const;
const dashboardFieldStyle = { display: "grid", gap: 4 } as const;
const dashboardControlStyle = { boxSizing: "border-box", fontSize: 13, minHeight: 36, padding: "6px 10px", width: "100%" } as const;

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
  } catch { return []; }
}

function createAnalysisId() {
  return "analyse-" + Date.now() + "-" + Math.random().toString(36).slice(2, 9);
}

function countKeywordMatches(text: string, keywords: string[]) {
  return keywords.reduce((total, keyword) => text.includes(keyword) ? total + 1 : total, 0);
}

function analyzeConversation(text: string): ConversationAnalysis {
  const normalized = text.toLocaleLowerCase("fr-CA");
  const positiveCount = countKeywordMatches(normalized, positiveKeywords);
  const negativeCount = countKeywordMatches(normalized, negativeKeywords);
  let tonalite: Tonalite = "Neutre";
  if (positiveCount > 0 && negativeCount > 0) tonalite = "Mixte";
  else if (positiveCount > 0) tonalite = "Positive";
  else if (negativeCount > 0) tonalite = "Tendue";
  const patterns = patternDefinitions.filter((p) => p.keywords.some((k) => normalized.includes(k))).map((p) => p.label);
  let niveauTension: NiveauTension = "Faible";
  if (negativeCount >= 3) niveauTension = "Eleve";
  else if (negativeCount >= 1) niveauTension = "Modere";
  const observations: string[] = [];
  if (patterns.includes("Generalisation detectee")) observations.push("Des formulations absolues ont ete reperees. Cela peut indiquer une frustration accumulee.");
  if (patterns.includes("Pattern de blame detecte")) observations.push("Des formulations de responsabilisation directe ont ete reperees.");
  if (tonalite === "Positive") observations.push("La conversation contient des elements d'expression positive.");
  if (!patterns.length) observations.push("Aucun pattern preoccupant detecte dans cet extrait.");
  observations.push("Le niveau de tension semble " + niveauTension.toLocaleLowerCase("fr-CA") + " dans cet extrait.");
  return { tonalite, patterns, niveauTension, observations: observations.slice(0, 3), negativeCount };
}

function parseSection(text: string, tag: string): string {
  const open = "[" + tag + "]";
  const close = "[/" + tag + "]";
  const i1 = text.indexOf(open);
  const i2 = text.indexOf(close);
  if (i1 >= 0 && i2 > i1) return text.slice(i1 + open.length, i2).trim();
  return "";
}

function parseScore(text: string, tag: string): number {
  const raw = parseSection(text, tag + "_SCORE");
  const n = parseInt(raw, 10);
  return Number.isFinite(n) ? Math.max(0, Math.min(100, n)) : 50;
}

function parseAnalyseIA(text: string): AnalyseIA {
  return {
    faits: parseSection(text, "FAITS"),
    interpretations: parseSection(text, "INTERPRETATIONS"),
    inconnues: parseSection(text, "INCONNUES"),
    clarte: parseSection(text, "CLARTE"),
    clarteScore: parseScore(text, "CLARTE"),
    reciprocite: parseSection(text, "RECIPROCITE"),
    reciprociteScore: parseScore(text, "RECIPROCITE"),
    securite: parseSection(text, "SECURITE"),
    securiteScore: parseScore(text, "SECURITE"),
    anglesMorts: parseSection(text, "ANGLES"),
    verdict: parseSection(text, "VERDICT"),
  };
}

function scoreColor(score: number) {
  if (score >= 70) return "#9fbd99";
  if (score >= 40) return "var(--accent-gold)";
  return "#b56b5f";
}

function tonaliteTone(tonalite: Tonalite): "success" | "warning" | "neutral" {
  if (tonalite === "Positive") return "success";
  if (tonalite === "Tendue" || tonalite === "Mixte") return "warning";
  return "neutral";
}

function tensionProgress(niveau: NiveauTension) {
  if (niveau === "Eleve") return 100;
  if (niveau === "Modere") return 62;
  return 28;
}

function tensionColor(niveau: NiveauTension) {
  if (niveau === "Eleve") return "#b56b5f";
  if (niveau === "Modere") return "var(--accent-gold)";
  return "#9fbd99";
}

function formatDate(iso: string) {
  try {
    const d = new Date(iso);
    return d.toLocaleDateString("fr-CA", { day: "numeric", month: "long", year: "numeric" }) + " " + d.toLocaleTimeString("fr-CA", { hour: "2-digit", minute: "2-digit" });
  } catch { return iso; }
}

export default function AnalyseConversationPage() {
  const [dossiers, setDossiers] = useState<StoredDossier[]>([]);
  const [selectedDossierId, setSelectedDossierId] = useState("");
  const [conversation, setConversation] = useState("");
  const [conversationError, setConversationError] = useState("");
  const [analysis, setAnalysis] = useState<ConversationAnalysis | null>(null);
  const [analyseIA, setAnalyseIA] = useState<AnalyseIA | null>(null);
  const [loadingIA, setLoadingIA] = useState(false);
  const [erreurIA, setErreurIA] = useState("");
  const [toast, setToast] = useState("");
  const [historiqueOuvert, setHistoriqueOuvert] = useState(false);

  useEffect(() => {
    const loadedDossiers = readDossiers();
    const query = new URLSearchParams(window.location.search);
    const queryDossierId = query.get("dossier") || "";
    const selectedExists = loadedDossiers.some((d) => d.id === queryDossierId);
    setDossiers(loadedDossiers);
    setSelectedDossierId(selectedExists ? queryDossierId : loadedDossiers[0]?.id || "");
  }, []);

  const selectedDossier = useMemo(() => dossiers.find((d) => d.id === selectedDossierId) || null, [dossiers, selectedDossierId]);

  function showToast(msg: string) {
    setToast(msg);
    window.setTimeout(() => setToast(""), 2500);
  }

  function sauvegarderDansStorage(localAnalysis: ConversationAnalysis, ia: AnalyseIA | null) {
    if (!selectedDossier) return;
    const currentDossiers = readDossiers();
    const savedAnalysis: AnalyseConversation = {
      date: new Date().toISOString(),
      id: createAnalysisId(),
      niveauTension: localAnalysis.niveauTension,
      observations: localAnalysis.observations,
      patterns: localAnalysis.patterns,
      tonalite: localAnalysis.tonalite,
      analyseIA: ia || undefined,
    };
    const next = currentDossiers.map((d) =>
      d.id === selectedDossier.id
        ? {
            ...d,
            niveauClarte: ia ? ia.clarteScore : d.niveauClarte,
            niveauReciprocite: ia ? ia.reciprociteScore : d.niveauReciprocite,
            niveauSecurite: ia ? ia.securiteScore : d.niveauSecurite,
            derniereAnalyse: { date: savedAnalysis.date, niveauTension: savedAnalysis.niveauTension, observations: savedAnalysis.observations, patterns: savedAnalysis.patterns, tonalite: savedAnalysis.tonalite },
            analyses: [savedAnalysis, ...(Array.isArray(d.analyses) ? d.analyses : [])],
          }
        : d,
    );
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      setDossiers(next);
      showToast("Analyse sauvegardee dans " + selectedDossier.nom);
    } catch { return; }
  }

  async function runAnalysis() {
    const content = conversation.trim();
    if (content.length < 50) {
      setConversationError("Ajoutez au moins 50 caracteres pour analyser.");
      setAnalysis(null);
      return;
    }
    setConversationError("");
    setAnalyseIA(null);
    setErreurIA("");

    const localResult = analyzeConversation(content);
    setAnalysis(localResult);

    setLoadingIA(true);
    const prompt = "Tu es un analyste relationnel expert. Analyse cette conversation de facon neutre et structuree.\n\nCONVERSATION:\n" + content + "\n\nReponds EXACTEMENT dans ce format:\n\n[FAITS]\n(Liste les faits observables et concrets dans cette conversation, sans interpretation)\n[/FAITS]\n\n[INTERPRETATIONS]\n(2-3 interpretations possibles de la dynamique relationnelle)\n[/INTERPRETATIONS]\n\n[INCONNUES]\n(Ce que l'on ne peut pas savoir avec cet extrait seul)\n[/INCONNUES]\n\n[CLARTE]\n(Evaluation de la clarte relationnelle dans cet echange)\n[/CLARTE]\n\n[CLARTE_SCORE]\n(Chiffre entre 0 et 100 uniquement)\n[/CLARTE_SCORE]\n\n[RECIPROCITE]\n(Evaluation de la reciprocite dans cet echange)\n[/RECIPROCITE]\n\n[RECIPROCITE_SCORE]\n(Chiffre entre 0 et 100 uniquement)\n[/RECIPROCITE_SCORE]\n\n[SECURITE]\n(Evaluation de la securite emotionnelle dans cet echange)\n[/SECURITE]\n\n[SECURITE_SCORE]\n(Chiffre entre 0 et 100 uniquement)\n[/SECURITE_SCORE]\n\n[ANGLES]\n(Angles morts : ce que l'on risque de mal interpreter sans plus de contexte)\n[/ANGLES]\n\n[VERDICT]\n(Synthese en 2-3 phrases : ce que cette conversation revele sur la dynamique relationnelle)\n[/VERDICT]";

    try {
      const resp = await fetch("/api/agent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: prompt }),
      });
      const data = await resp.json();
      if (resp.ok) {
        const ia = parseAnalyseIA(data.result || "");
        setAnalyseIA(ia);
        sauvegarderDansStorage(localResult, ia);
      } else {
        setErreurIA(data.error || "Erreur analyse IA");
        sauvegarderDansStorage(localResult, null);
      }
    } catch (e) {
      setErreurIA(e instanceof Error ? e.message : "Erreur reseau");
      sauvegarderDansStorage(localResult, null);
    }
    setLoadingIA(false);
  }

  function chargerAnalyse(a: AnalyseConversation) {
    setAnalysis({ tonalite: a.tonalite as Tonalite, patterns: a.patterns, niveauTension: a.niveauTension as NiveauTension, observations: a.observations, negativeCount: 0 });
    setAnalyseIA(a.analyseIA || null);
    setHistoriqueOuvert(false);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  const analysesExistantes = selectedDossier?.analyses || [];

  return (
    <main className="internal-page">
      <SystemPageShell maxWidth={1100}>
        <header className="internal-header">
          <BackLink href="/autre-rive" label="L'Autre Rive" />
          <p className="internal-kicker">Analyse relationnelle</p>
          <h1 className="internal-title">Analyse de conversation</h1>
          <p className="internal-subtitle">Collez un extrait et obtenez une lecture relationnelle structuree.</p>
        </header>

        {!dossiers.length ? (
          <SystemPanel ariaLabel="Aucun dossier" compact>
            <SystemSectionHeader eyebrow="Etape 1" title="Creez d'abord un dossier relationnel." />
            <Link className="internal-button-primary" href="/autre-rive/dossiers" style={dashboardButtonStyle}>Creer un dossier</Link>
          </SystemPanel>
        ) : (
          <>
            <SystemPanel ariaLabel="Selection du dossier" compact>
              <SystemSectionHeader eyebrow="Etape 1" title="Selection du dossier" />
              <SystemGrid gap={10} min={260}>
                <label style={dashboardFieldStyle}>
                  <span className="label-meta">Dossier</span>
                  <select className="internal-control" onChange={(e) => setSelectedDossierId(e.target.value)} style={dashboardControlStyle} value={selectedDossierId}>
                    {dossiers.map((d) => <option key={d.id} value={d.id}>{d.nom}</option>)}
                  </select>
                </label>
                <div className="chapter-card" style={{ display: "grid", gap: 5, marginBottom: 0, padding: 12 }}>
                  <p className="label-meta" style={{ margin: 0 }}>Dossier concerne</p>
                  <strong style={{ color: "var(--text-main)", fontFamily: "var(--font-serif)", fontSize: 20 }}>
                    {selectedDossier?.nom || "Aucun dossier selectionne"}
                  </strong>
                  {analysesExistantes.length > 0 ? (
                    <button type="button" onClick={() => setHistoriqueOuvert(!historiqueOuvert)}
                      style={{ fontSize: 11, padding: "3px 8px", borderRadius: 99, border: "1px solid rgba(201,168,92,0.3)", background: "transparent", color: "var(--text-soft)", cursor: "pointer", justifySelf: "start", marginTop: 4 }}>
                      {analysesExistantes.length} analyse{analysesExistantes.length > 1 ? "s" : ""} precedente{analysesExistantes.length > 1 ? "s" : ""}
                    </button>
                  ) : null}
                </div>
              </SystemGrid>
            </SystemPanel>

            {historiqueOuvert && analysesExistantes.length > 0 ? (
              <SystemPanel ariaLabel="Historique des analyses" compact>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
                  <p className="label-meta" style={{ margin: 0 }}>Historique des analyses — {selectedDossier?.nom}</p>
                  <button type="button" onClick={() => setHistoriqueOuvert(false)} style={{ fontSize: 11, padding: "2px 8px", borderRadius: 99, border: "1px solid rgba(201,168,92,0.2)", background: "transparent", color: "var(--text-muted)", cursor: "pointer" }}>Fermer</button>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {analysesExistantes.slice(0, 10).map((a) => (
                    <div key={a.id} style={{ padding: "10px 12px", background: "rgba(255,250,238,0.03)", border: "1px solid rgba(201,168,92,0.12)", borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
                      <div>
                        <p style={{ fontSize: 12, fontWeight: 600, color: "var(--text-main)", margin: "0 0 2px" }}>{a.tonalite} · Tension {a.niveauTension}</p>
                        <p style={{ fontSize: 11, color: "var(--text-muted)", margin: 0 }}>{formatDate(a.date)}</p>
                        {a.analyseIA ? <p style={{ fontSize: 11, color: "#1D9E75", margin: "2px 0 0" }}>Clarte {a.analyseIA.clarteScore}% · Reciprocite {a.analyseIA.reciprociteScore}% · Securite {a.analyseIA.securiteScore}%</p> : null}
                      </div>
                      <button type="button" onClick={() => chargerAnalyse(a)} style={{ fontSize: 11, padding: "3px 9px", borderRadius: 99, border: "1px solid rgba(29,158,117,0.4)", background: "rgba(29,158,117,0.08)", color: "#1D9E75", cursor: "pointer", flexShrink: 0 }}>Recharger</button>
                    </div>
                  ))}
                </div>
              </SystemPanel>
            ) : null}

            <SystemPanel ariaLabel="Saisie de la conversation" compact>
              <SystemSectionHeader eyebrow="Etape 2" title="Saisie de la conversation" />
              <label style={dashboardFieldStyle}>
                <span className="label-meta">Conversation</span>
                <textarea className="internal-control"
                  onChange={(e) => { setConversation(e.target.value); setConversationError(""); }}
                  placeholder="Collez ici un extrait de conversation — SMS, message vocal transcrit, email, etc."
                  rows={10}
                  style={{ ...dashboardControlStyle, minHeight: 240 }}
                  value={conversation}
                />
              </label>
              {conversation.trim().length < 50 || conversationError ? (
                <p style={{ color: conversationError ? "#d79a8f" : "var(--text-soft)", fontSize: 12, margin: "8px 0 0" }}>
                  {conversationError || "Ajoutez au moins 50 caracteres pour analyser."}
                </p>
              ) : null}
              <button className="internal-button-primary" disabled={conversation.trim().length < 50 || loadingIA}
                onClick={runAnalysis}
                style={{ ...dashboardButtonStyle, marginTop: 12, opacity: conversation.trim().length < 50 || loadingIA ? 0.55 : 1 }}
                type="button">
                {loadingIA ? "Analyse en cours..." : "Analyser la conversation"}
              </button>
            </SystemPanel>

            {analysis ? (
              <SystemPanel ariaLabel="Resultats de l'analyse" compact>
                <SystemSectionHeader eyebrow="Etape 3" title="Analyse" />
                <SystemGrid gap={10} min={220}>
                  <article className="chapter-card" style={{ display: "grid", gap: 8, marginBottom: 0, padding: 14 }}>
                    <p className="label-meta" style={{ margin: 0 }}>Tonalite generale</p>
                    <StatusChip tone={tonaliteTone(analysis.tonalite)}>{analysis.tonalite}</StatusChip>
                  </article>
                  <article className="chapter-card" style={{ display: "grid", gap: 8, marginBottom: 0, padding: 14 }}>
                    <p className="label-meta" style={{ margin: 0 }}>Niveau de tension</p>
                    <strong style={{ color: "var(--text-main)", fontFamily: "var(--font-serif)", fontSize: 22 }}>{analysis.niveauTension}</strong>
                    <div style={{ background: "rgba(255,255,255,.06)", borderRadius: 999, height: 6, overflow: "hidden", width: "100%" }}>
                      <div style={{ background: tensionColor(analysis.niveauTension), height: "100%", transition: "width .2s ease", width: tensionProgress(analysis.niveauTension) + "%" }} />
                    </div>
                  </article>
                </SystemGrid>

                {analysis.patterns.length > 0 ? (
                  <div style={{ marginTop: 14 }}>
                    <h2 style={{ color: "var(--text-main)", fontFamily: "var(--font-serif)", fontSize: 18, margin: "0 0 8px" }}>Patterns detectes</h2>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 7 }}>
                      {analysis.patterns.map((p) => <StatusChip key={p} tone="warning">{p}</StatusChip>)}
                    </div>
                  </div>
                ) : null}

                {loadingIA ? (
                  <div style={{ marginTop: 16, padding: "12px 14px", background: "rgba(201,168,92,0.06)", borderRadius: 8, textAlign: "center" }}>
                    <p style={{ fontSize: 13, color: "var(--text-muted)", margin: 0 }}>Analyse approfondie en cours... (15 a 30 secondes)</p>
                  </div>
                ) : null}

                {erreurIA !== "" ? (
                  <div style={{ marginTop: 14, padding: "10px 12px", background: "rgba(216,90,48,0.08)", border: "1px solid rgba(216,90,48,0.3)", borderRadius: 8 }}>
                    <p style={{ fontSize: 13, color: "#D85A30", margin: 0 }}>Analyse IA indisponible : {erreurIA}</p>
                  </div>
                ) : null}

                {analyseIA ? (
                  <div style={{ marginTop: 16, display: "flex", flexDirection: "column", gap: 12 }}>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10 }}>
                      {[
                        { label: "Clarte relationnelle", score: analyseIA.clarteScore, texte: analyseIA.clarte },
                        { label: "Reciprocite", score: analyseIA.reciprociteScore, texte: analyseIA.reciprocite },
                        { label: "Securite emotionnelle", score: analyseIA.securiteScore, texte: analyseIA.securite },
                      ].map(({ label, score, texte }) => (
                        <div key={label} style={{ padding: "12px", background: "rgba(255,250,238,0.03)", border: "1px solid rgba(201,168,92,0.15)", borderRadius: 10 }}>
                          <p className="label-meta" style={{ margin: "0 0 6px", fontSize: 11 }}>{label}</p>
                          <div style={{ display: "flex", alignItems: "baseline", gap: 6, marginBottom: 8 }}>
                            <span style={{ fontSize: 26, fontWeight: 700, color: scoreColor(score), fontFamily: "var(--font-serif)" }}>{score}</span>
                            <span style={{ fontSize: 13, color: "var(--text-muted)" }}>/100</span>
                          </div>
                          <div style={{ height: 4, background: "rgba(255,255,255,0.06)", borderRadius: 2, overflow: "hidden", marginBottom: 8 }}>
                            <div style={{ height: "100%", width: score + "%", background: scoreColor(score), borderRadius: 2, transition: "width 0.3s" }} />
                          </div>
                          {texte ? <p style={{ fontSize: 11, color: "var(--text-soft)", margin: 0, lineHeight: 1.5 }}>{texte}</p> : null}
                        </div>
                      ))}
                    </div>

                    {SECTIONS_IA.map(({ tag, titre, couleur, field }) => {
                      const contenu = analyseIA[field] as string;
                      if (!contenu) return null;
                      return (
                        <div key={tag} style={{ borderRadius: 8, border: "1px solid " + couleur + "33", overflow: "hidden" }}>
                          <div style={{ padding: "8px 12px", background: couleur + "18", borderBottom: "1px solid " + couleur + "22" }}>
                            <p style={{ fontSize: 12, fontWeight: 600, color: couleur, margin: 0 }}>{titre}</p>
                          </div>
                          <div style={{ padding: "10px 12px" }}>
                            <p style={{ fontSize: 13, color: "var(--text-soft)", lineHeight: 1.7, margin: 0, whiteSpace: "pre-wrap" }}>{contenu}</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : null}
              </SystemPanel>
            ) : null}
          </>
        )}
      </SystemPageShell>

      {toast ? (
        <div style={{ background: "rgba(21,18,14,.96)", border: "1px solid rgba(201,168,92,.36)", borderRadius: 999, bottom: 20, color: "var(--accent-gold)", fontSize: 13, left: "50%", padding: "10px 14px", position: "fixed", transform: "translateX(-50%)", zIndex: 90 }}>
          {toast}
        </div>
      ) : null}
    </main>
  );
}
