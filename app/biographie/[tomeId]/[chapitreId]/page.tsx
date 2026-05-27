"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  type Chapitre,
  type AnalyseNarrative,
  type StructureNarrative,
  type StyleNarratif,
  type FormatsExtraits,
  type ModeAuteur,
  type ScoreEcriture,
  type VersionScore,
  chargerProjet,
  sauvegarderProjet,
  mettreAJourChapitre,
  analyserNarration,
  structurerChapitre,
  genererQuestions,
  genererQuestionsProfondes,
  genererVersionNarrative,
  extraireFormats,
  analyserStyleAuteur,
  genererGuidanceScene,
  evaluerQualiteTexte,
  prioritéAmélioration,
} from "@/app/lib/biographie";

type FormatKey = keyof FormatsExtraits;

const FORMAT_LABELS: Record<FormatKey, string> = {
  pitchSerie:      "Pitch série",
  scriptScene:     "Script scène",
  postInstagram:   "Instagram",
  scriptTikTok:    "TikTok",
  threadTwitter:   "Thread X",
  articleSubstack: "Substack",
};

const STYLE_LABELS: Record<StyleNarratif, string> = {
  livre:      "Livre",
  cinema:     "Cinéma",
  conference: "Conférence",
};

const EMOTION_COULEUR: Record<string, string> = {
  peur:       "#f59e0b",
  joie:       "#10b981",
  colère:     "#ef4444",
  tristesse:  "#6366f1",
  honte:      "#8b5cf6",
  espoir:     "#3b82f6",
  solitude:   "#64748b",
  ambivalence:"var(--text-muted)",
};

export default function ChapitreEditorPage() {
  const { tomeId, chapitreId } = useParams() as { tomeId: string; chapitreId: string };

  const [chapitre, setChapitre] = useState<Chapitre | null>(null);
  const [objectifScore, setObjectifScore] = useState(80);
  const [contenu, setContenu] = useState("");
  const [titreEdit, setTitreEdit] = useState(false);
  const [titreVal, setTitreVal] = useState("");
  const [sauvegarde, setSauvegarde] = useState(false);

  // Mode auteur
  const [modeAuteur, setModeAuteur] = useState<ModeAuteur>("guide");

  // Sections d'affichage
  const [sectionOuverte, setSectionOuverte] = useState<string | null>(null);
  const [styleNarratif, setStyleNarratif] = useState<StyleNarratif>("livre");
  const [versionNarrative, setVersionNarrative] = useState("");
  const [formatActif, setFormatActif] = useState<FormatKey>("pitchSerie");
  const [formats, setFormats] = useState<FormatsExtraits | null>(null);
  const [copies, setCopies] = useState<Partial<Record<string, boolean>>>({});

  useEffect(() => {
    const projet = chargerProjet();
    setObjectifScore(projet.objectifScore ?? 80);
    const tome = projet.tomes.find(t => t.id === tomeId);
    const chap = tome?.chapitres.find(c => c.id === chapitreId);
    if (chap) {
      setChapitre(chap);
      setContenu(chap.contenuBrut);
      setTitreVal(chap.titre);
    }
  }, [tomeId, chapitreId]);

  function sauvegarderContenu() {
    if (!chapitre) return;
    const projet = chargerProjet();
    const updated = mettreAJourChapitre(projet, tomeId, chapitreId, { contenuBrut: contenu });
    sauvegarderProjet(updated);
    const chap = updated.tomes.find(t => t.id === tomeId)?.chapitres.find(c => c.id === chapitreId);
    if (chap) setChapitre(chap);
    setSauvegarde(true);
    setTimeout(() => setSauvegarde(false), 1800);
  }

  function sauvegarderTitre() {
    if (!chapitre || !titreVal.trim()) return;
    const projet = chargerProjet();
    const updated = mettreAJourChapitre(projet, tomeId, chapitreId, { titre: titreVal.trim() });
    sauvegarderProjet(updated);
    setChapitre(prev => prev ? { ...prev, titre: titreVal.trim() } : prev);
    setTitreEdit(false);
  }

  function analyser() {
    if (!contenu.trim() || !chapitre) return;
    const analyse = analyserNarration(contenu);
    const structure = structurerChapitre(contenu);
    const score = evaluerQualiteTexte(contenu);
    const entree: VersionScore = { date: new Date().toISOString().split("T")[0], scoreGlobal: score.scoreGlobal };
    const historique = [...(chapitre.historique ?? []), entree].slice(-10);
    const projet = chargerProjet();
    const updated = mettreAJourChapitre(projet, tomeId, chapitreId, {
      contenuBrut: contenu,
      analyseNarrative: analyse,
      structure,
      score,
      historique,
    });
    sauvegarderProjet(updated);
    const chap = updated.tomes.find(t => t.id === tomeId)?.chapitres.find(c => c.id === chapitreId);
    if (chap) setChapitre(chap);
    setSectionOuverte("score");
  }

  function genererVersion(style: StyleNarratif) {
    if (!contenu.trim()) return;
    setStyleNarratif(style);
    setVersionNarrative(genererVersionNarrative(contenu, style));
    setSectionOuverte("version");
  }

  function genererTousFormats() {
    if (!contenu.trim()) return;
    setFormats(extraireFormats(contenu));
    setSectionOuverte("formats");
  }

  async function copier(texte: string, cle: string) {
    try {
      await navigator.clipboard.writeText(texte);
      setCopies(prev => ({ ...prev, [cle]: true }));
      setTimeout(() => setCopies(prev => ({ ...prev, [cle]: false })), 1800);
    } catch { /* ignore */ }
  }

  if (!chapitre) {
    return (
      <main style={{ maxWidth: 800, margin: "0 auto", padding: "32px 24px" }}>
        <p style={{ color: "var(--text-muted)", fontSize: 14 }}>Chapitre introuvable.</p>
        <Link href="/biographie" style={{ fontSize: 12, color: "var(--primary)" }}>← Retour</Link>
      </main>
    );
  }

  const a = chapitre.analyseNarrative;
  const s = chapitre.structure;
  const questions       = a ? genererQuestions(a) : [];
  const questionsProf   = a ? genererQuestionsProfondes(a) : [];
  const feedback        = a && contenu.trim() ? analyserStyleAuteur(contenu) : null;
  const guidanceScene   = genererGuidanceScene();
  const couleurEmotion  = a ? (EMOTION_COULEUR[a.emotionDominante] ?? "var(--text-muted)") : "var(--text-muted)";

  return (
    <main style={{ maxWidth: 800, margin: "0 auto", padding: "32px 24px" }}>

      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20 }}>
        <div>
          {titreEdit ? (
            <input
              autoFocus
              className="search-input"
              value={titreVal}
              onChange={e => setTitreVal(e.target.value)}
              onBlur={sauvegarderTitre}
              onKeyDown={e => { if (e.key === "Enter") sauvegarderTitre(); if (e.key === "Escape") setTitreEdit(false); }}
              style={{ fontSize: 20, fontWeight: 600, marginBottom: 0, width: 320 }}
            />
          ) : (
            <h1
              onClick={() => setTitreEdit(true)}
              style={{ fontSize: 22, fontStyle: "italic", color: "var(--primary)", cursor: "pointer" }}
              title="Cliquer pour renommer"
            >
              {chapitre.titre}
            </h1>
          )}
          {a && (
            <p style={{ fontSize: 12, color: couleurEmotion, marginTop: 4 }}>
              {a.emotionDominante} · intensité {a.niveauIntensite}/5 · thème : {a.theme}
            </p>
          )}
        </div>
        <Link href="/biographie" style={{ fontSize: 12, color: "var(--primary)" }}>← Biographie</Link>
      </div>

      <div style={{ borderTop: "1px solid var(--border-soft)", marginBottom: 24 }} />

      {/* Éditeur */}
      <div style={{ marginBottom: 16 }}>
        <p className="label-meta" style={{ marginBottom: 8 }}>Écrire un souvenir</p>
        <textarea
          className="textarea-atelier"
          value={contenu}
          onChange={e => setContenu(e.target.value)}
          placeholder="Raconte ce souvenir librement, sans chercher la perfection. La structure viendra ensuite…"
          style={{ minHeight: 220 }}
        />
      </div>

      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center", marginBottom: 32 }}>
        <button onClick={analyser} className="btn-primary" disabled={!contenu.trim()}>
          Analyser →
        </button>
        <button onClick={sauvegarderContenu} className="btn-ghost" disabled={!contenu.trim()}>
          {sauvegarde ? "✓ Enregistré" : "Enregistrer"}
        </button>
        <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 11, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: 0.8 }}>Mode</span>
          <div className="toggle-group" style={{ width: "fit-content" }}>
            {(["guide", "assistant"] as const).map(m => (
              <button
                key={m}
                onClick={() => setModeAuteur(m)}
                className={`toggle-btn${modeAuteur === m ? " toggle-btn-active" : ""}`}
              >
                {m === "guide" ? "Guide" : "Assistant"}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Résultats — apparaissent après analyse */}
      {a && s && (
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>

          {/* ── Analyse narrative ── */}
          <ResultCard
            titre="Analyse narrative"
            actif={sectionOuverte === "analyse"}
            onToggle={() => setSectionOuverte(sectionOuverte === "analyse" ? null : "analyse")}
            accentColor={couleurEmotion}
          >
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <div style={{ display: "flex", gap: 24, flexWrap: "wrap" }}>
                <MetaItem label="Thème" valeur={a.theme} />
                <MetaItem label="Émotion" valeur={a.emotionDominante} couleur={couleurEmotion} />
                <MetaItem label="Conflit" valeur={a.conflit} />
                <MetaItem label="Transformation" valeur={a.transformation} />
              </div>
              <div>
                <p className="label-meta" style={{ marginBottom: 6 }}>Intensité narrative</p>
                <div style={{ display: "flex", gap: 6 }}>
                  {[1, 2, 3, 4, 5].map(n => (
                    <div key={n} style={{
                      width: 28, height: 8, borderRadius: 4,
                      background: n <= a.niveauIntensite ? couleurEmotion : "var(--border-soft)",
                      transition: "background 0.2s",
                    }} />
                  ))}
                  <span style={{ fontSize: 11, color: "var(--text-muted)", marginLeft: 4, alignSelf: "center" }}>
                    {a.niveauIntensite}/5
                  </span>
                </div>
              </div>
            </div>
          </ResultCard>

          {/* ── Structure narrative ── */}
          <ResultCard
            titre="Structure narrative"
            actif={sectionOuverte === "structure"}
            onToggle={() => setSectionOuverte(sectionOuverte === "structure" ? null : "structure")}
            accentColor="var(--accent)"
          >
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {[
                { label: "Situation initiale",    valeur: s.situationInitiale,    couleur: "#6366f1" },
                { label: "Élément déclencheur",   valeur: s.elementDeclencheur,   couleur: "#f59e0b" },
                { label: "Tension",               valeur: s.tension,              couleur: "#ef4444" },
                { label: "Bascule",               valeur: s.bascule,              couleur: "#8b5cf6" },
                { label: "Résolution",            valeur: s.resolution,           couleur: "#10b981" },
              ].map(({ label, valeur, couleur }) => (
                <div key={label} style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
                  <span style={{
                    fontSize: 10, fontWeight: 700, color: couleur,
                    textTransform: "uppercase", letterSpacing: 0.8,
                    minWidth: 130, paddingTop: 2, flexShrink: 0,
                  }}>
                    {label}
                  </span>
                  <p style={{ fontSize: 13, color: valeur ? "var(--text-main)" : "var(--text-muted)", lineHeight: 1.6, fontStyle: valeur ? "normal" : "italic" }}>
                    {valeur || "—"}
                  </p>
                </div>
              ))}
            </div>
          </ResultCard>

          {/* ── Questions de guidage ── */}
          <ResultCard
            titre={`Questions de guidage · ${questions.length}`}
            actif={sectionOuverte === "questions"}
            onToggle={() => setSectionOuverte(sectionOuverte === "questions" ? null : "questions")}
            accentColor="#3b82f6"
          >
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {questions.map((q, i) => (
                <p key={i} style={{
                  fontSize: 14, color: "var(--text-main)", lineHeight: 1.7,
                  paddingLeft: 16, borderLeft: "2px solid #3b82f6",
                }}>
                  {q}
                </p>
              ))}
            </div>
          </ResultCard>

          {/* ── Questions profondes (toujours visibles) ── */}
          <ResultCard
            titre="Questions profondes"
            actif={sectionOuverte === "qprofondes"}
            onToggle={() => setSectionOuverte(sectionOuverte === "qprofondes" ? null : "qprofondes")}
            accentColor="#8b5cf6"
          >
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {questionsProf.map((q, i) => (
                <p key={i} style={{
                  fontSize: 14, color: "var(--text-main)", lineHeight: 1.7,
                  paddingLeft: 16, borderLeft: "2px solid #8b5cf6", fontStyle: "italic",
                }}>
                  {q}
                </p>
              ))}
            </div>
          </ResultCard>

          {/* ── Mode scène (guide sans génération) ── */}
          <ResultCard
            titre="Transformer en scène"
            actif={sectionOuverte === "scene"}
            onToggle={() => setSectionOuverte(sectionOuverte === "scene" ? null : "scene")}
            accentColor="#f59e0b"
          >
            <p style={{ fontSize: 12, color: "var(--text-muted)", fontStyle: "italic", marginBottom: 14 }}>
              Réponds à ces questions dans ta tête ou sur papier, puis réécris la scène dans l'éditeur.
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              {(["lieu", "moment", "action", "dialogue"] as const).map(cat => (
                <div key={cat}>
                  <p style={{ fontSize: 11, fontWeight: 700, color: "#f59e0b", textTransform: "uppercase", letterSpacing: 1, marginBottom: 6 }}>
                    {cat === "lieu" ? "Lieu" : cat === "moment" ? "Moment" : cat === "action" ? "Action" : "Dialogue"}
                  </p>
                  <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                    {guidanceScene[cat].map((q, i) => (
                      <p key={i} style={{ fontSize: 13, color: "var(--text-soft)", lineHeight: 1.7 }}>→ {q}</p>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </ResultCard>

          {/* ── Feedback éditorial (toujours visible) ── */}
          {feedback && (
            <ResultCard
              titre="Feedback éditorial"
              actif={sectionOuverte === "feedback"}
              onToggle={() => setSectionOuverte(sectionOuverte === "feedback" ? null : "feedback")}
              accentColor="#ef4444"
            >
              <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                {feedback.suggestions.length > 0 && (
                  <div>
                    <p className="label-meta" style={{ marginBottom: 8 }}>Suggestions</p>
                    {feedback.suggestions.map((s, i) => (
                      <p key={i} style={{ fontSize: 13, color: "var(--text-soft)", lineHeight: 1.8 }}>→ {s}</p>
                    ))}
                  </div>
                )}
                {feedback.phrasesFortes.length > 0 && (
                  <div>
                    <p className="label-meta" style={{ marginBottom: 8, color: "#10b981" }}>Phrases fortes</p>
                    {feedback.phrasesFortes.map((p, i) => (
                      <p key={i} style={{
                        fontSize: 13, color: "var(--text-main)", lineHeight: 1.7,
                        paddingLeft: 12, borderLeft: "2px solid #10b981",
                        marginBottom: 6, fontStyle: "italic",
                      }}>
                        "{p}"
                      </p>
                    ))}
                  </div>
                )}
                {feedback.phrasesFaibles.length > 0 && (
                  <div>
                    <p className="label-meta" style={{ marginBottom: 8, color: "#ef4444" }}>À approfondir</p>
                    {feedback.phrasesFaibles.map((p, i) => (
                      <p key={i} style={{
                        fontSize: 13, color: "var(--text-muted)", lineHeight: 1.7,
                        paddingLeft: 12, borderLeft: "2px solid #ef4444",
                        marginBottom: 6,
                      }}>
                        "{p}"
                      </p>
                    ))}
                  </div>
                )}
              </div>
            </ResultCard>
          )}

          {/* ── Score d'écriture ── */}
          {chapitre.score && (
            <ResultCard
              titre={`Score d'écriture · ${chapitre.score.scoreGlobal}/100`}
              actif={sectionOuverte === "score"}
              onToggle={() => setSectionOuverte(sectionOuverte === "score" ? null : "score")}
              accentColor={scoreColor(chapitre.score.scoreGlobal)}
            >
              <ScorePanel score={chapitre.score} historique={chapitre.historique ?? []} objectif={objectifScore} />
            </ResultCard>
          )}

          {/* ── Version narrative (assistant seulement) ── */}
          {modeAuteur === "assistant" ? (
            <ResultCard
              titre="Version réécrite"
              actif={sectionOuverte === "version"}
              onToggle={() => setSectionOuverte(sectionOuverte === "version" ? null : "version")}
              accentColor="#10b981"
            >
              <div style={{ marginBottom: 14 }}>
                <div className="toggle-group" style={{ width: "fit-content", marginBottom: 14 }}>
                  {(Object.keys(STYLE_LABELS) as StyleNarratif[]).map(style => (
                    <button
                      key={style}
                      onClick={() => genererVersion(style)}
                      className={`toggle-btn${styleNarratif === style && versionNarrative ? " toggle-btn-active" : ""}`}
                    >
                      {STYLE_LABELS[style]}
                    </button>
                  ))}
                </div>
                {versionNarrative ? (
                  <div>
                    <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 8 }}>
                      <button onClick={() => copier(versionNarrative, "version")} className="btn-outline" style={{ fontSize: 11 }}>
                        {copies["version"] ? "✓ Copié" : "Copier"}
                      </button>
                    </div>
                    <pre style={{
                      fontSize: 13, color: "var(--text-main)", lineHeight: 1.85,
                      whiteSpace: "pre-wrap", fontFamily: "Georgia, serif",
                      background: "var(--bg-main)", padding: "14px 18px",
                      borderRadius: 6, border: "1px solid var(--border-soft)", margin: 0,
                    }}>
                      {versionNarrative}
                    </pre>
                  </div>
                ) : (
                  <p style={{ fontSize: 12, color: "var(--text-muted)", fontStyle: "italic" }}>
                    Choisir un style pour générer la version réécrite.
                  </p>
                )}
              </div>
            </ResultCard>
          ) : (
            <div className="chapter-card" style={{ padding: "16px 20px", borderLeft: "3px solid #10b981", background: "rgba(16,185,129,0.03)" }}>
              <p style={{ fontSize: 13, color: "#10b981", fontWeight: 600, marginBottom: 6 }}>Réécrire cette scène toi-même</p>
              <p style={{ fontSize: 13, color: "var(--text-soft)", lineHeight: 1.7 }}>
                À partir de la structure détectée et des questions de guidage, réécris ce souvenir dans l'éditeur ci-dessus.
                Utilise tes propres mots — c'est ta voix qui compte.
              </p>
            </div>
          )}

          {/* ── Formats dérivés ── */}
          <ResultCard
            titre="Contenus dérivés"
            actif={sectionOuverte === "formats"}
            onToggle={() => {
              if (sectionOuverte !== "formats") { genererTousFormats(); }
              else { setSectionOuverte(null); }
            }}
            accentColor="#f59e0b"
          >
            {formats && (
              <div>
                {/* Tabs formats */}
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 14 }}>
                  {(Object.keys(FORMAT_LABELS) as FormatKey[]).map(k => (
                    <button
                      key={k}
                      onClick={() => setFormatActif(k)}
                      className={`toggle-btn${formatActif === k ? " toggle-btn-active" : ""}`}
                      style={{ fontSize: 11 }}
                    >
                      {FORMAT_LABELS[k]}
                    </button>
                  ))}
                </div>
                <div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                    <p className="label-meta">{FORMAT_LABELS[formatActif]}</p>
                    <button
                      onClick={() => copier(formats[formatActif], formatActif)}
                      className="btn-outline"
                      style={{ fontSize: 11 }}
                    >
                      {copies[formatActif] ? "✓ Copié" : "Copier"}
                    </button>
                  </div>
                  <pre style={{
                    fontSize: 12, color: "var(--text-soft)", lineHeight: 1.85,
                    whiteSpace: "pre-wrap", fontFamily: "Georgia, serif",
                    background: "var(--bg-main)", padding: "14px 18px",
                    borderRadius: 6, border: "1px solid var(--border-soft)", margin: 0,
                  }}>
                    {formats[formatActif]}
                  </pre>
                </div>
              </div>
            )}
          </ResultCard>

        </div>
      )}

    </main>
  );
}

// ── Composants ────────────────────────────────────────────────────────────────

function ResultCard({
  titre,
  actif,
  onToggle,
  accentColor,
  children,
}: {
  titre: string;
  actif: boolean;
  onToggle: () => void;
  accentColor: string;
  children: React.ReactNode;
}) {
  return (
    <div className="chapter-card" style={{ overflow: "hidden", borderLeft: `3px solid ${accentColor}` }}>
      <button
        onClick={onToggle}
        style={{
          width: "100%", background: "none", border: "none", padding: "14px 20px",
          display: "flex", justifyContent: "space-between", alignItems: "center",
          cursor: "pointer", textAlign: "left",
        }}
      >
        <p className="label-meta" style={{ color: accentColor }}>{titre}</p>
        <span style={{ fontSize: 11, color: "var(--text-muted)" }}>{actif ? "▲" : "▼"}</span>
      </button>
      {actif && (
        <div style={{ padding: "0 20px 18px" }}>
          {children}
        </div>
      )}
    </div>
  );
}

function MetaItem({ label, valeur, couleur }: { label: string; valeur: string; couleur?: string }) {
  return (
    <div>
      <p className="label-meta" style={{ marginBottom: 3 }}>{label}</p>
      <p style={{ fontSize: 13, color: couleur ?? "var(--text-main)", fontWeight: couleur ? 600 : 400 }}>{valeur}</p>
    </div>
  );
}

function scoreColor(s: number): string {
  if (s >= 75) return "#10b981";
  if (s >= 55) return "#f59e0b";
  if (s >= 35) return "#f97316";
  return "#ef4444";
}

function ScorePanel({ score, historique, objectif }: { score: ScoreEcriture; historique: VersionScore[]; objectif: number }) {
  const conseil = prioritéAmélioration(score);
  const SOUS_SCORES: { label: string; key: keyof ScoreEcriture; couleur: string }[] = [
    { label: "Concret",    key: "concret",   couleur: "#3b82f6" },
    { label: "Précision",  key: "precision", couleur: "#8b5cf6" },
    { label: "Intensité",  key: "intensite", couleur: "#ef4444" },
    { label: "Variation",  key: "variation", couleur: "#10b981" },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {/* Score global */}
      <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
        <div style={{
          width: 64, height: 64, borderRadius: "50%",
          background: `conic-gradient(${scoreColor(score.scoreGlobal)} ${score.scoreGlobal * 3.6}deg, var(--bg-main) 0)`,
          display: "flex", alignItems: "center", justifyContent: "center",
          position: "relative",
        }}>
          <div style={{
            width: 50, height: 50, borderRadius: "50%",
            background: "var(--bg-card)", display: "flex",
            alignItems: "center", justifyContent: "center",
          }}>
            <span style={{ fontSize: 17, fontWeight: 700, color: scoreColor(score.scoreGlobal) }}>
              {score.scoreGlobal}
            </span>
          </div>
        </div>
        <div style={{ flex: 1 }}>
          <p style={{ fontSize: 11, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 4 }}>
            Score global · objectif {objectif}/100
          </p>
          {score.scoreGlobal >= objectif ? (
            <p style={{ fontSize: 12, color: "#10b981", fontWeight: 600 }}>Objectif atteint ✓</p>
          ) : (
            <p style={{ fontSize: 12, color: "var(--text-muted)" }}>
              {objectif - score.scoreGlobal} points pour atteindre l'objectif
            </p>
          )}
        </div>
      </div>

      {/* Sous-scores */}
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {SOUS_SCORES.map(({ label, key, couleur }) => (
          <div key={key} style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ fontSize: 11, color: "var(--text-muted)", minWidth: 70 }}>{label}</span>
            <div style={{ flex: 1, height: 5, background: "var(--bg-main)", borderRadius: 3, overflow: "hidden" }}>
              <div style={{
                height: "100%", width: `${score[key]}%`,
                background: couleur, borderRadius: 3, transition: "width 0.5s ease",
              }} />
            </div>
            <span style={{ fontSize: 11, color: couleur, fontWeight: 600, minWidth: 28, textAlign: "right" }}>
              {score[key]}
            </span>
          </div>
        ))}
      </div>

      {/* Conseil prioritaire */}
      <div style={{ padding: "10px 14px", background: "var(--bg-main)", borderRadius: 6, borderLeft: "3px solid var(--border-soft)" }}>
        <p style={{ fontSize: 11, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 4 }}>
          Priorité d'amélioration
        </p>
        <p style={{ fontSize: 13, color: "var(--text-soft)", lineHeight: 1.65 }}>→ {conseil}</p>
      </div>

      {/* Historique mini */}
      {historique.length > 1 && (
        <div>
          <p style={{ fontSize: 11, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 8 }}>
            Évolution · {historique.length} analyse{historique.length > 1 ? "s" : ""}
          </p>
          <div style={{ display: "flex", alignItems: "flex-end", gap: 4, height: 32 }}>
            {historique.map((v, i) => (
              <div
                key={i}
                title={`${v.date} · ${v.scoreGlobal}/100`}
                style={{
                  flex: 1, minWidth: 10,
                  height: `${Math.max(15, v.scoreGlobal * 0.32)}px`,
                  background: scoreColor(v.scoreGlobal),
                  borderRadius: 2,
                  opacity: i === historique.length - 1 ? 1 : 0.5,
                }}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
