"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { analyserTruthMode, type TruthModeResult, TRUTH_VIDE } from "@/app/lib/truth-mode";
import { lireFragments, type Fragment } from "@/lib/fragments";
import {
  CHAPITRES_DEFAUT,
  TOMES_DEFAUT,
  lireChapitres,
  lireTomes,
  type ManuscriptTome,
} from "@/lib/manuscript-structure";

type Tome = ManuscriptTome;

function cleEcriture(tomeId: number, chapitre: string) {
  return `ecriture_${tomeId}_${encodeURIComponent(chapitre)}`;
}

function chargerTexte(tomeId: number, chapitre: string): string {
  try { return localStorage.getItem(cleEcriture(tomeId, chapitre)) ?? ""; }
  catch { return ""; }
}

function sauvegarderTexte(tomeId: number, chapitre: string, texte: string) {
  try { localStorage.setItem(cleEcriture(tomeId, chapitre), texte); }
  catch { /* quota */ }
}

function compterMots(texte: string): number {
  return texte.trim() ? texte.trim().split(/\s+/).length : 0;
}

export default function VueDouble() {
  const [tomes, setTomes] = useState<Tome[]>(TOMES_DEFAUT);
  const [chapitresParTome, setChapitresParTome] = useState<Record<number, string[]>>(CHAPITRES_DEFAUT);
  const [fragmentsParChapitre, setFragmentsParChapitre] = useState<Record<string, number>>({});

  const [tomeActif, setTomeActif] = useState<number>(1);
  const [chapitreActif, setChapitreActif] = useState<string>("La maison");
  const [texte, setTexte] = useState("");
  const [sauvegarde, setSauvegarde] = useState(true);

  const saveTimer   = useRef<ReturnType<typeof setTimeout> | null>(null);
  const truthTimer  = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [truthOuvert, setTruthOuvert] = useState(false);
  const [truthResult, setTruthResult] = useState<TruthModeResult>(TRUTH_VIDE);

  useEffect(() => {
    try {
      setTomes(lireTomes());
      setChapitresParTome(lireChapitres());

      const fragments: Fragment[] = lireFragments();
      const compte: Record<string, number> = {};
      for (const f of fragments) {
        if (f.tomeId == null || !f.chapitre) continue;
        const cle = `${f.tomeId}__${f.chapitre}`;
        compte[cle] = (compte[cle] ?? 0) + 1;
      }
      setFragmentsParChapitre(compte);
    } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    setTexte(chargerTexte(tomeActif, chapitreActif));
    setSauvegarde(true);
  }, [tomeActif, chapitreActif]);

  function changerChapitre(tomeId: number, chapitre: string) {
    setTomeActif(tomeId);
    setChapitreActif(chapitre);
  }

  function onTexteChange(val: string) {
    setTexte(val);
    setSauvegarde(false);
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      sauvegarderTexte(tomeActif, chapitreActif, val);
      setSauvegarde(true);
    }, 600);
    if (truthOuvert) {
      if (truthTimer.current) clearTimeout(truthTimer.current);
      truthTimer.current = setTimeout(() => setTruthResult(analyserTruthMode(val)), 900);
    }
  }

  function toggleTruth() {
    const ouvert = !truthOuvert;
    setTruthOuvert(ouvert);
    if (ouvert) setTruthResult(analyserTruthMode(texte));
  }

  const tomeActuel = tomes.find(t => t.id === tomeActif);
  const motCount = compterMots(texte);

  const totalMots = tomes.flatMap(t =>
    (chapitresParTome[t.id] ?? []).map(ch => compterMots(chargerTexte(t.id, ch)))
  ).reduce((a, b) => a + b, 0);

  const chapitresTotal = tomes.reduce((n, t) => n + (chapitresParTome[t.id]?.length ?? 0), 0);
  const chapitresEcrits = tomes.reduce((n, t) =>
    n + (chapitresParTome[t.id] ?? []).filter(ch => compterMots(chargerTexte(t.id, ch)) > 0).length, 0
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100vh", background: "var(--bg-main)" }}>

      {/* ── En-tête ── */}
      <div style={{
        display: "flex", justifyContent: "space-between", alignItems: "center",
        padding: "10px 20px", borderBottom: "1px solid var(--border-soft)",
        background: "var(--bg-panel)", flexShrink: 0,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <Link href="/" style={{ fontSize: 12, color: "var(--primary)" }}>← Accueil</Link>
          <Link href="/atelier" style={{ fontSize: 12, color: "var(--primary)" }}>Atelier IA</Link>
          <span style={{ color: "var(--border-soft)" }}>|</span>
          <span style={{ fontSize: 13, color: "var(--text-soft)" }}>
            {tomeActuel?.titre ?? "—"}
            <span style={{ margin: "0 6px", color: "var(--border-strong)" }}>·</span>
            <span style={{ color: "var(--text-main)", fontWeight: 600 }}>{chapitreActif}</span>
          </span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <span style={{ fontSize: 11, color: "var(--text-muted)" }}>
            {chapitresEcrits}/{chapitresTotal} chapitres · {totalMots.toLocaleString("fr-CA")} mots au total
          </span>
          <span style={{
            fontSize: 11,
            color: sauvegarde ? "var(--text-muted)" : "var(--primary)",
            transition: "color 0.3s",
          }}>
            {sauvegarde ? "Sauvegardé" : "…"}
          </span>
        </div>
      </div>

      {/* ── Corps principal ── */}
      <div style={{ display: "flex", flex: 1, overflow: "hidden" }}>

        {/* ── Zone d'écriture (70 %) ── */}
        <div style={{ flex: "0 0 70%", display: "flex", flexDirection: "column", borderRight: "1px solid var(--border-soft)" }}>
          <div style={{ padding: "8px 24px 4px", borderBottom: "1px solid var(--border-soft)", flexShrink: 0 }}>
            <span style={{ fontSize: 11, color: "var(--text-muted)" }}>
              {motCount > 0 ? `${motCount} mot${motCount > 1 ? "s" : ""}` : ""}
            </span>
          </div>
          <textarea
            value={texte}
            onChange={(e) => onTexteChange(e.target.value)}
            placeholder={`Écrire ici — ${chapitreActif}…`}
            style={{
              flex: 1,
              resize: "none",
              border: "none",
              outline: "none",
              padding: "28px 40px",
              fontSize: 16,
              lineHeight: 1.9,
              fontFamily: "Georgia, serif",
              color: "var(--text-main)",
              background: "var(--bg-main)",
            }}
          />
        </div>

        {/* ── Panneau structure (30 %) ── */}
        <div style={{
          flex: "0 0 30%",
          overflow: "auto",
          background: "var(--bg-panel)",
          padding: "16px 0",
        }}>

          {tomes.map(tome => {
            const chapitres = chapitresParTome[tome.id] ?? [];
            const motsTotal = chapitres.reduce((n, ch) => n + compterMots(chargerTexte(tome.id, ch)), 0);

            return (
              <div key={tome.id} style={{ marginBottom: 4 }}>

                {/* Titre tome */}
                <div style={{
                  padding: "6px 20px",
                  display: "flex", justifyContent: "space-between", alignItems: "center",
                }}>
                  <span style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1.2, color: tome.color }}>
                    {tome.titre}
                  </span>
                  {motsTotal > 0 && (
                    <span style={{ fontSize: 10, color: "var(--text-muted)" }}>
                      {motsTotal.toLocaleString("fr-CA")} m.
                    </span>
                  )}
                </div>

                {/* Liste chapitres */}
                {chapitres.map(ch => {
                  const actif = tome.id === tomeActif && ch === chapitreActif;
                  const nbFragments = fragmentsParChapitre[`${tome.id}__${ch}`] ?? 0;
                  const nbMots = compterMots(chargerTexte(tome.id, ch));

                  return (
                    <button
                      key={ch}
                      onClick={() => changerChapitre(tome.id, ch)}
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        width: "100%",
                        padding: "7px 20px",
                        background: actif ? "rgba(198,169,107,0.12)" : "transparent",
                        border: "none",
                        borderLeft: actif ? `3px solid ${tome.color}` : "3px solid transparent",
                        cursor: "pointer",
                        textAlign: "left",
                        transition: "background 0.1s",
                      }}
                    >
                      <span style={{
                        fontSize: 13,
                        color: actif ? "var(--text-main)" : "var(--text-soft)",
                        fontWeight: actif ? 600 : 400,
                      }}>
                        {ch}
                      </span>
                      <span style={{ display: "flex", gap: 8, alignItems: "center", flexShrink: 0 }}>
                        {nbMots > 0 && (
                          <span style={{ fontSize: 10, color: actif ? tome.color : "var(--text-muted)" }}>
                            {nbMots} m.
                          </span>
                        )}
                        {nbFragments > 0 && (
                          <span style={{
                            fontSize: 9, background: tome.color, color: "#fff",
                            borderRadius: 10, padding: "1px 6px", fontWeight: 600,
                          }}>
                            {nbFragments}
                          </span>
                        )}
                      </span>
                    </button>
                  );
                })}

              </div>
            );
          })}

          {/* Progression globale */}
          <div style={{ padding: "16px 20px", marginTop: 8, borderTop: "1px solid var(--border-soft)" }}>
            <p style={{ fontSize: 10, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: 1, marginBottom: 6 }}>
              Progression
            </p>
            <div style={{ height: 4, background: "var(--border-soft)", borderRadius: 2, overflow: "hidden" }}>
              <div style={{
                height: "100%",
                background: "var(--primary)",
                borderRadius: 2,
                width: `${chapitresTotal > 0 ? Math.round((chapitresEcrits / chapitresTotal) * 100) : 0}%`,
                transition: "width 0.3s",
              }} />
            </div>
            <p style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 5 }}>
              {chapitresEcrits}/{chapitresTotal} chapitres commencés
            </p>
          </div>

          {/* Truth Mode */}
          <div style={{ borderTop: "1px solid var(--border-soft)" }}>
            <button
              onClick={toggleTruth}
              style={{
                width: "100%",
                padding: "10px 20px",
                background: truthOuvert ? "rgba(198,169,107,0.08)" : "transparent",
                border: "none",
                cursor: "pointer",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <span style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1.2, color: "var(--primary)" }}>
                Truth Mode
              </span>
              <span style={{ fontSize: 10, color: "var(--text-muted)" }}>
                {truthOuvert ? "▲" : "▼"}
              </span>
            </button>

            {truthOuvert && (
              <TruthPanel result={truthResult} />
            )}
          </div>

        </div>
      </div>
    </div>
  );
}

function ScoreBar({ score, label }: { score: number; label: string }) {
  const couleur = score >= 8 ? "#5a8f6a" : score >= 5 ? "var(--primary)" : "#c07070";
  return (
    <div style={{ marginBottom: 6 }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 2 }}>
        <span style={{ fontSize: 10, color: "var(--text-muted)" }}>{label}</span>
        <span style={{ fontSize: 10, fontWeight: 600, color: couleur }}>{score}/10</span>
      </div>
      <div style={{ height: 3, background: "var(--border-soft)", borderRadius: 2, overflow: "hidden" }}>
        <div style={{ height: "100%", width: `${score * 10}%`, background: couleur, borderRadius: 2, transition: "width 0.4s" }} />
      </div>
    </div>
  );
}

function TruthSection({ titre, items, vide }: { titre: string; items: string[]; vide?: string }) {
  if (items.length === 0 && !vide) return null;
  return (
    <div style={{ marginBottom: 10 }}>
      <p style={{ fontSize: 9, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, color: "var(--text-muted)", marginBottom: 4 }}>
        {titre}
      </p>
      {items.length === 0
        ? <p style={{ fontSize: 10, color: "#5a8f6a", fontStyle: "italic" }}>{vide}</p>
        : items.map((item, i) => (
          <p key={i} style={{ fontSize: 11, color: "var(--text-soft)", padding: "2px 0", borderLeft: "2px solid var(--primary)", paddingLeft: 8, marginBottom: 3 }}>
            {item}
          </p>
        ))
      }
    </div>
  );
}

function TruthPanel({ result }: { result: TruthModeResult }) {
  const { zonesFloues, evitements, sujetsFlous, phrasesLongues, repetitions,
    emotionFaible, concretFaible, positionFaible, scores } = result;

  const aucunProbleme =
    zonesFloues.length === 0 && evitements.length === 0 &&
    sujetsFlous.length === 0 && !emotionFaible && !concretFaible && !positionFaible;

  return (
    <div style={{ padding: "12px 20px 16px" }}>

      {/* Score global */}
      <div style={{ marginBottom: 14 }}>
        <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginBottom: 8 }}>
          <span style={{
            fontSize: 28,
            fontWeight: 700,
            color: scores.global >= 8 ? "#5a8f6a" : scores.global >= 5 ? "var(--primary)" : "#c07070",
          }}>
            {scores.global}
          </span>
          <span style={{ fontSize: 10, color: "var(--text-muted)" }}>/10 lucidité narrative</span>
        </div>
        <ScoreBar score={scores.clarte}     label="Clarté" />
        <ScoreBar score={scores.emotion}    label="Émotion" />
        <ScoreBar score={scores.concret}    label="Concret" />
        <ScoreBar score={scores.repetition} label="Fluidité" />
      </div>

      {aucunProbleme && repetitions.length === 0 && phrasesLongues.length === 0 ? (
        <p style={{ fontSize: 11, color: "#5a8f6a", fontStyle: "italic" }}>
          Texte clair, ancré, émotionnel. Rien à signaler.
        </p>
      ) : (
        <>
          <TruthSection
            titre="Zones floues"
            items={zonesFloues}
            vide="Aucune"
          />

          <TruthSection
            titre="Évitements"
            items={evitements}
            vide="Aucun"
          />

          {sujetsFlous.length > 0 && (
            <div style={{ marginBottom: 10 }}>
              <p style={{ fontSize: 9, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, color: "var(--text-muted)", marginBottom: 4 }}>
                Sujets flous
              </p>
              {sujetsFlous.map(s => (
                <p key={s.mot} style={{ fontSize: 11, color: "var(--text-soft)", borderLeft: "2px solid var(--primary)", paddingLeft: 8, marginBottom: 3 }}>
                  «{s.mot}» — {s.count}×
                </p>
              ))}
            </div>
          )}

          {(emotionFaible || concretFaible || positionFaible) && (
            <div style={{ marginBottom: 10 }}>
              <p style={{ fontSize: 9, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, color: "var(--text-muted)", marginBottom: 4 }}>
                Signaux faibles
              </p>
              {emotionFaible   && <p style={{ fontSize: 11, color: "#c07070", marginBottom: 2 }}>Peu de mots d'émotion</p>}
              {concretFaible   && <p style={{ fontSize: 11, color: "#c07070", marginBottom: 2 }}>Peu de détails sensoriels</p>}
              {positionFaible  && <p style={{ fontSize: 11, color: "#c07070", marginBottom: 2 }}>Position personnelle absente</p>}
            </div>
          )}

          {repetitions.length > 0 && (
            <div style={{ marginBottom: 10 }}>
              <p style={{ fontSize: 9, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, color: "var(--text-muted)", marginBottom: 4 }}>
                Répétitions
              </p>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                {repetitions.map(r => (
                  <span key={r.mot} style={{
                    fontSize: 10, background: "var(--border-soft)",
                    color: r.count >= 4 ? "#c07070" : "var(--text-soft)",
                    borderRadius: 10, padding: "2px 8px",
                  }}>
                    {r.mot} ×{r.count}
                  </span>
                ))}
              </div>
            </div>
          )}

          {phrasesLongues.length > 0 && (
            <div style={{ marginBottom: 10 }}>
              <p style={{ fontSize: 9, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, color: "var(--text-muted)", marginBottom: 4 }}>
                Phrases longues ({phrasesLongues.length})
              </p>
              {phrasesLongues.map((p, i) => (
                <p key={i} style={{
                  fontSize: 10, color: "var(--text-muted)", fontStyle: "italic",
                  borderLeft: "2px solid var(--border-strong)", paddingLeft: 8, marginBottom: 4,
                  overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                }}>
                  {p.slice(0, 80)}{p.length > 80 ? "…" : ""}
                </p>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
