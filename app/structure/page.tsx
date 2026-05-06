"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { lireFragments, sauvegarderFragments, type Fragment } from "@/lib/fragments";
import {
  CHAPITRES_DEFAUT,
  TOMES_DEFAUT,
  lireChapitres,
  lireTomes,
  sauvegarderChapitres as persisterChapitres,
  sauvegarderTomes as persisterTomes,
  type ManuscriptTome,
} from "@/lib/manuscript-structure";

const COULEURS_DISPONIBLES = [
  "#8B7355", "#6B7A8B", "#8B6B6B", "#7B8B6B",
  "#7A6B8B", "#8B7A6B", "#6B8B7A", "#8B8B6B",
  "#6B6B8B", "#8B6B7A",
];

type Tome = ManuscriptTome & { color: string };

type DecisionChapitre = {
  loi: string;
  fonctionne: string[];
  faiblesses: string[];
  exces: string[];
  manque: string[];
  tension: "faible" | "moyen" | "fort";
  tension_note: string;
  repetition_risque: string;
  direction: string[];
};

type AnalyseState = {
  loading: boolean;
  result: DecisionChapitre | null;
  error: string | null;
};

function sameFragmentId(a: Fragment["id"], b: Fragment["id"]) {
  return String(a) === String(b);
}

export default function Structure() {
  const [fragments, setFragments] = useState<Fragment[]>([]);
  const [tomes, setTomes] = useState<Tome[]>(TOMES_DEFAUT);
  const [chapitresParTome, setChapitresParTome] = useState<Record<number, string[]>>(CHAPITRES_DEFAUT);
  const [nouveauChapitreInput, setNouveauChapitreInput] = useState<{ tomeId: number; nom: string } | null>(null);
  const [tomeOuverts, setTomeOuverts] = useState<number[]>([1, 2, 3, 4]);
  const [chapitreOuverts, setChapitreOuverts] = useState<string[]>([]);
  const [fragmentOuvert, setFragmentOuvert] = useState<Fragment["id"] | null>(null);
  const [deplacerOuvert, setDeplacerOuvert] = useState<Fragment["id"] | null>(null);
  const [renommerInput, setRenommerInput] = useState<{ tomeId: number; ancienNom: string; nouveauNom: string } | null>(null);
  const [supprimerConfirm, setSupprimerConfirm] = useState<{ tomeId: number; chapitre: string } | null>(null);
  const [draggingId, setDraggingId] = useState<Fragment["id"] | null>(null);
  const [dragOverKey, setDragOverKey] = useState<string | null>(null);
  const [renommerTomeInput, setRenommerTomeInput] = useState<{ id: number; titre: string } | null>(null);
  const [supprimerTomeConfirm, setSupprimerTomeConfirm] = useState<number | null>(null);
  const [nouveauTomeInput, setNouveauTomeInput] = useState<{ titre: string; color: string } | null>(null);
  const [analyses, setAnalyses] = useState<Record<string, AnalyseState>>({});
  const [detailsOuverts, setDetailsOuverts] = useState<Record<string, boolean>>({});

  useEffect(() => {
    setFragments(lireFragments());
    const chapitres = lireChapitres();
    const tomesLus = lireTomes() as Tome[];

    setChapitresParTome(chapitres);
    setTomes(tomesLus);
    setTomeOuverts(tomesLus.map((tome) => tome.id));
  }, []);

  function sauvegarderTomes(updated: Tome[]) {
    setTomes(persisterTomes(updated) as Tome[]);
  }

  function sauvegarderChapitres(updated: Record<number, string[]>) {
    setChapitresParTome(persisterChapitres(updated));
  }

  function toggleTome(id: number) {
    setTomeOuverts((prev) =>
      prev.includes(id) ? prev.filter((t) => t !== id) : [...prev, id]
    );
  }

  function toggleChapitre(key: string) {
    setChapitreOuverts((prev) =>
      prev.includes(key) ? prev.filter((c) => c !== key) : [...prev, key]
    );
  }

  function toggleFragment(id: Fragment["id"]) {
    setFragmentOuvert((prev) => (prev !== null && sameFragmentId(prev, id) ? null : id));
  }

  function ajouterChapitre(tomeId: number, nom: string) {
    const trimmed = nom.trim();
    if (!trimmed) return;
    sauvegarderChapitres({ ...chapitresParTome, [tomeId]: [...(chapitresParTome[tomeId] || []), trimmed] });
    setNouveauChapitreInput(null);
  }

  function renommerChapitre(tomeId: number, ancienNom: string, nouveauNom: string) {
    const trimmed = nouveauNom.trim();
    if (!trimmed || trimmed === ancienNom) { setRenommerInput(null); return; }
    sauvegarderChapitres({
      ...chapitresParTome,
      [tomeId]: chapitresParTome[tomeId].map((c) => (c === ancienNom ? trimmed : c)),
    });
    const updatedFragments = fragments.map((f) =>
      f.tomeId === tomeId && f.chapitre === ancienNom ? { ...f, chapitre: trimmed } : f
    );
    setFragments(sauvegarderFragments(updatedFragments));
    setRenommerInput(null);
  }

  function supprimerChapitre(tomeId: number, nom: string) {
    sauvegarderChapitres({
      ...chapitresParTome,
      [tomeId]: chapitresParTome[tomeId].filter((c) => c !== nom),
    });
    setSupprimerConfirm(null);
  }

  function deplacerFragment(id: Fragment["id"], tomeId: number, nouvChapitre: string, chapKey?: string) {
    const tome = tomes.find((t) => t.id === tomeId);
    const updated = fragments.map((f) =>
      sameFragmentId(f.id, id) ? { ...f, tome: tome?.titre ?? f.tome, tomeId, chapitre: nouvChapitre } : f
    );
    setFragments(sauvegarderFragments(updated));
    setDeplacerOuvert(null);
    setFragmentOuvert(null);
    setDraggingId(null);
    setDragOverKey(null);
    if (chapKey) setChapitreOuverts((prev) => prev.includes(chapKey) ? prev : [...prev, chapKey]);
  }

  function ajouterTome() {
    if (!nouveauTomeInput) return;
    const trimmed = nouveauTomeInput.titre.trim();
    if (!trimmed) return;
    const newId = Math.max(0, ...tomes.map((t) => t.id)) + 1;
    const newTome: Tome = { id: newId, titre: trimmed, color: nouveauTomeInput.color };
    sauvegarderTomes([...tomes, newTome]);
    sauvegarderChapitres({ ...chapitresParTome, [newId]: [] });
    setTomeOuverts((prev) => [...prev, newId]);
    setNouveauTomeInput(null);
  }

  function renommerTome(id: number, nouveauTitre: string) {
    const trimmed = nouveauTitre.trim();
    if (!trimmed) { setRenommerTomeInput(null); return; }
    const updated = tomes.map((t) => t.id === id ? { ...t, titre: trimmed } : t);
    sauvegarderTomes(updated);
    const updatedFragments = fragments.map((f) =>
      f.tomeId === id ? { ...f, tome: trimmed } : f
    );
    setFragments(sauvegarderFragments(updatedFragments));
    setRenommerTomeInput(null);
  }

  async function analyserChapitre(tomeId: number, tome: Tome, chapitre: string) {
    const key = `${tomeId}-${chapitre}`;
    const fragsduChapitre = fragments.filter((f) => f.manuscrit && f.tomeId === tomeId && f.chapitre === chapitre);
    if (fragsduChapitre.length === 0) return;

    setAnalyses((prev) => ({ ...prev, [key]: { loading: true, result: null, error: null } }));
    try {
      const res = await fetch("/api/decisions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tome: tome.titre,
          chapitre,
          fragments: fragsduChapitre.map((f) => f.texte),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setAnalyses((prev) => ({ ...prev, [key]: { loading: false, result: null, error: data.error ?? "Erreur inconnue." } }));
        return;
      }
      setAnalyses((prev) => ({ ...prev, [key]: { loading: false, result: data.result, error: null } }));
    } catch {
      setAnalyses((prev) => ({ ...prev, [key]: { loading: false, result: null, error: "Impossible de contacter le serveur." } }));
    }
  }

  function supprimerTome(id: number) {
    const updated = tomes.filter((t) => t.id !== id);
    sauvegarderTomes(updated);
    const updatedChapitres = Object.fromEntries(
      Object.entries(chapitresParTome).filter(([k]) => Number(k) !== id)
    ) as Record<number, string[]>;
    sauvegarderChapitres(updatedChapitres);
    setSupprimerTomeConfirm(null);
    setTomeOuverts((prev) => prev.filter((t) => t !== id));
  }

  const total = fragments.filter((f) => f.manuscrit).length;

  return (
    <main style={{ maxWidth: 800, margin: "0 auto", padding: 24 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 28 }}>
        <div>
          <h1 style={{ fontSize: 22, fontStyle: "italic", color: "#8B7355" }}>L'Héritage des Silences</h1>
          <p style={{ fontSize: 12, color: "#999" }}>Structure du manuscrit — {total} fragment{total > 1 ? "s" : ""}</p>
        </div>
        <div style={{ display: "flex", gap: 16 }}>
          <Link href="/" style={{ fontSize: 12, color: "#8B7355" }}>← Atelier</Link>
          <Link href="/fragments" style={{ fontSize: 12, color: "#8B7355" }}>Coffre →</Link>
          <Link href="/tableau" style={{ fontSize: 12, color: "#8B7355" }}>Tableau →</Link>
          <Link href="/chronologie" style={{ fontSize: 12, color: "#8B7355" }}>Chronologie →</Link>
          <Link href="/repetitions" style={{ fontSize: 12, color: "#8B7355" }}>Répétitions →</Link>
          <Link href="/lecture" style={{ fontSize: 12, color: "#8B7355" }}>Lecture →</Link>
          <Link href="/audit" style={{ fontSize: 12, color: "#8B7355" }}>Audit →</Link>
        </div>
      </div>

      {tomes.map((tome) => {
        const fragsduTome = fragments.filter((f) => f.manuscrit && f.tomeId === tome.id);
        const ouvert = tomeOuverts.includes(tome.id);
        const chapitresDuTome = chapitresParTome[tome.id] || [];
        const tomeVide = fragsduTome.length === 0 && chapitresDuTome.every(
          (c) => fragments.filter((f) => f.manuscrit && f.tomeId === tome.id && f.chapitre === c).length === 0
        );

        return (
          <div key={tome.id} style={{ marginBottom: 28 }}>
            {/* En-tête du tome */}
            {renommerTomeInput?.id === tome.id ? (
              <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: ouvert ? 8 : 0 }}>
                <input
                  autoFocus
                  value={renommerTomeInput.titre}
                  onChange={(e) => setRenommerTomeInput({ ...renommerTomeInput, titre: e.target.value })}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") renommerTome(tome.id, renommerTomeInput.titre);
                    if (e.key === "Escape") setRenommerTomeInput(null);
                  }}
                  style={{ flex: 1, padding: "10px 14px", fontSize: 15, fontFamily: "Georgia, serif", border: `1px solid ${tome.color}88`, borderRadius: 8, outline: "none", fontWeight: "bold", color: tome.color }}
                />
                <button
                  onClick={() => renommerTome(tome.id, renommerTomeInput.titre)}
                  style={{ padding: "10px 18px", background: tome.color, color: "white", border: "none", borderRadius: 8, cursor: "pointer", fontSize: 13, fontFamily: "Georgia, serif" }}
                >
                  Enregistrer
                </button>
                <button
                  onClick={() => setRenommerTomeInput(null)}
                  style={{ padding: "10px 14px", background: "#eee", color: "#555", border: "none", borderRadius: 8, cursor: "pointer", fontSize: 13 }}
                >
                  Annuler
                </button>
              </div>
            ) : (
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  padding: "12px 16px",
                  background: `${tome.color}18`,
                  border: `1px solid ${tome.color}44`,
                  borderRadius: 8,
                  marginBottom: ouvert ? 8 : 0,
                }}
              >
                <button
                  onClick={() => toggleTome(tome.id)}
                  style={{ flex: 1, display: "flex", alignItems: "center", gap: 10, background: "none", border: "none", cursor: "pointer", fontFamily: "Georgia, serif", padding: 0, textAlign: "left" }}
                >
                  <span className="tome-title" style={{ fontSize: 15, color: tome.color }}>{tome.titre}</span>
                  <span style={{ fontSize: 12, color: "#999" }}>
                    {fragsduTome.length} fragment{fragsduTome.length > 1 ? "s" : ""} {ouvert ? "▲" : "▼"}
                  </span>
                </button>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  {supprimerTomeConfirm === tome.id ? (
                    <>
                      <span style={{ fontSize: 11, color: "#c00" }}>Supprimer ce tome ?</span>
                      <button
                        onClick={() => supprimerTome(tome.id)}
                        style={{ fontSize: 11, padding: "3px 10px", background: "#c00", color: "white", border: "none", borderRadius: 4, cursor: "pointer" }}
                      >
                        Confirmer
                      </button>
                      <button
                        onClick={() => setSupprimerTomeConfirm(null)}
                        className="soft-button"
                        style={{ fontSize: 11 }}
                      >
                        Annuler
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        onClick={() => setRenommerTomeInput({ id: tome.id, titre: tome.titre })}
                        className="soft-button"
                        style={{ fontSize: 11 }}
                      >
                        Renommer
                      </button>
                      {tomeVide && (
                        <button
                          onClick={() => setSupprimerTomeConfirm(tome.id)}
                          style={{ fontSize: 11, color: "#c00", background: "none", border: "none", cursor: "pointer", fontFamily: "Georgia, serif" }}
                        >
                          Supprimer
                        </button>
                      )}
                    </>
                  )}
                </div>
              </div>
            )}

            {ouvert && (
              <div style={{ paddingLeft: 12 }}>
                {chapitresDuTome.map((chapitre) => {
                  const key = `${tome.id}-${chapitre}`;
                  const fragsduChapitre = fragsduTome.filter((f) => f.chapitre === chapitre);
                  const vide = fragsduChapitre.length === 0;
                  const chapOuvert = chapitreOuverts.includes(key);
                  const isDragOver = dragOverKey === key;

                  return (
                    <div
                      key={key}
                      style={{
                        marginBottom: 6,
                        borderLeft: isDragOver ? `3px solid ${tome.color}` : "3px solid transparent",
                        borderRadius: 6,
                        transition: "border-color 0.15s",
                      }}
                      onDragOver={(e) => { e.preventDefault(); setDragOverKey(key); }}
                      onDragLeave={(e) => { if (!e.currentTarget.contains(e.relatedTarget as Node)) setDragOverKey(null); }}
                      onDrop={(e) => {
                        e.preventDefault();
                        const id = e.dataTransfer.getData("fragmentId");
                        if (id) deplacerFragment(id, tome.id, chapitre, key);
                      }}
                    >
                      {/* En-tête du chapitre */}
                      {renommerInput?.tomeId === tome.id && renommerInput.ancienNom === chapitre ? (
                        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                          <input
                            autoFocus
                            value={renommerInput.nouveauNom}
                            onChange={(e) => setRenommerInput({ ...renommerInput, nouveauNom: e.target.value })}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") renommerChapitre(tome.id, chapitre, renommerInput.nouveauNom);
                              if (e.key === "Escape") setRenommerInput(null);
                            }}
                            style={{ flex: 1, padding: "6px 10px", fontSize: 13, fontFamily: "Georgia, serif", border: `1px solid ${tome.color}88`, borderRadius: 6, outline: "none" }}
                          />
                          <button
                            onClick={() => renommerChapitre(tome.id, chapitre, renommerInput.nouveauNom)}
                            style={{ padding: "6px 14px", background: tome.color, color: "white", border: "none", borderRadius: 6, cursor: "pointer", fontSize: 12, fontFamily: "Georgia, serif" }}
                          >
                            Enregistrer
                          </button>
                          <button
                            onClick={() => setRenommerInput(null)}
                            style={{ padding: "6px 10px", background: "#eee", color: "#555", border: "none", borderRadius: 6, cursor: "pointer", fontSize: 12 }}
                          >
                            Annuler
                          </button>
                        </div>
                      ) : (
                        <div
                          style={{
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                            padding: "8px 14px",
                            background: vide ? "#fafafa" : "#fff",
                            border: `1px solid ${vide ? "#eee" : tome.color + "66"}`,
                            borderRadius: 6,
                          }}
                        >
                          <button
                            onClick={() => !vide && toggleChapitre(key)}
                            style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "flex-start", gap: 2, background: "none", border: "none", cursor: vide ? "default" : "pointer", fontFamily: "Georgia, serif", padding: 0 }}
                          >
                            <span style={{ fontSize: 13, color: vide ? "#bbb" : "#444" }}>{chapitre}</span>
                            <span style={{ fontSize: 11, color: vide ? "#ddd" : tome.color }}>
                              {vide ? "vide" : `(${fragsduChapitre.length} fragment${fragsduChapitre.length > 1 ? "s" : ""})`}
                            </span>
                          </button>
                          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                            {supprimerConfirm?.tomeId === tome.id && supprimerConfirm.chapitre === chapitre ? (
                              <>
                                <span style={{ fontSize: 11, color: "#c00" }}>Supprimer ce chapitre ?</span>
                                <button
                                  onClick={() => supprimerChapitre(tome.id, chapitre)}
                                  style={{ fontSize: 11, padding: "2px 10px", background: "#c00", color: "white", border: "none", borderRadius: 4, cursor: "pointer" }}
                                >
                                  Confirmer
                                </button>
                                <button
                                  onClick={() => setSupprimerConfirm(null)}
                                  className="soft-button"
                                  style={{ fontSize: 11 }}
                                >
                                  Annuler
                                </button>
                              </>
                            ) : (
                              <>
                                <button
                                  onClick={() => setRenommerInput({ tomeId: tome.id, ancienNom: chapitre, nouveauNom: chapitre })}
                                  className="soft-button"
                                  style={{ fontSize: 11 }}
                                >
                                  Renommer
                                </button>
                                {vide && (
                                  <button
                                    onClick={() => setSupprimerConfirm({ tomeId: tome.id, chapitre })}
                                    style={{ fontSize: 11, color: "#c00", background: "none", border: "none", cursor: "pointer", fontFamily: "Georgia, serif" }}
                                  >
                                    Supprimer
                                  </button>
                                )}
                                {!vide && (() => {
                                  const key = `${tome.id}-${chapitre}`;
                                  const analyse = analyses[key];
                                  return (
                                    <button
                                      onClick={() => analyserChapitre(tome.id, tome, chapitre)}
                                      disabled={analyse?.loading}
                                      style={{
                                        fontSize: 11,
                                        padding: "2px 10px",
                                        background: "none",
                                        color: analyse?.result ? tome.color : "#999",
                                        border: `1px solid ${analyse?.result ? tome.color + "88" : "#ddd"}`,
                                        borderRadius: 4,
                                        cursor: analyse?.loading ? "default" : "pointer",
                                        fontFamily: "Georgia, serif",
                                        opacity: analyse?.loading ? 0.5 : 1,
                                        transition: "color 0.2s, border-color 0.2s",
                                      }}
                                    >
                                      {analyse?.loading ? "Analyse…" : analyse?.result ? "Ré-analyser" : "Analyser →"}
                                    </button>
                                  );
                                })()}
                                {!vide && (
                                  <span style={{ fontSize: 11, color: "#bbb" }}>{chapOuvert ? "▲" : "▼"}</span>
                                )}
                              </>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Décision narrative */}
                      {(() => {
                        const key = `${tome.id}-${chapitre}`;
                        const analyse = analyses[key];
                        if (!analyse || analyse.loading || (!analyse.result && !analyse.error)) return null;
                        const detailOuvert = detailsOuverts[key] ?? false;
                        const TENSION_COLOR: Record<string, string> = { faible: "#b89060", moyen: "#8B7355", fort: "#5a3e2b" };
                        return (
                          <div
                            className="decision-panel"
                            style={{ borderLeft: `3px solid ${tome.color}` }}
                          >
                            {analyse.error && (
                              <p style={{ fontSize: 13, color: "#b04040", fontStyle: "italic" }}>{analyse.error}</p>
                            )}
                            {analyse.result && (() => {
                              const r = analyse.result;
                              return (
                                <>
                                  {/* Zone principale */}
                                  <div className="decision-main">

                                    {/* Loi implicite — sans label */}
                                    <p className="decision-loi-strong">{r.loi}</p>

                                    {/* Tension — badge inline */}
                                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                      <span style={{
                                        fontSize: 10,
                                        fontWeight: 700,
                                        color: TENSION_COLOR[r.tension] ?? "#8B7355",
                                        textTransform: "uppercase",
                                        letterSpacing: 1.5,
                                        padding: "2px 8px",
                                        border: `1px solid ${TENSION_COLOR[r.tension] ?? "#8B7355"}66`,
                                        borderRadius: 20,
                                      }}>
                                        {r.tension}
                                      </span>
                                      <span style={{ fontSize: 12, color: "#888" }}>{r.tension_note}</span>
                                    </div>

                                    {/* Direction — blocs d'action */}
                                    <div style={{ borderTop: `1px solid ${tome.color}33`, paddingTop: 14, display: "flex", flexDirection: "column", gap: 8 }}>
                                      <p className="label-meta" style={{ marginBottom: 2 }}>Direction</p>
                                      {r.direction.map((d, i) => (
                                        <div key={i} className="decision-action" style={{ borderLeft: `2px solid ${tome.color}` }}>
                                          <span style={{ color: tome.color, fontWeight: 700, marginRight: 8 }}>{i + 1}.</span>{d}
                                        </div>
                                      ))}
                                    </div>

                                  </div>

                                  {/* Toggle détails */}
                                  <button
                                    className="decision-toggle-strong"
                                    onClick={() => setDetailsOuverts((prev) => ({ ...prev, [key]: !detailOuvert }))}
                                  >
                                    {detailOuvert ? "▾ Masquer l'analyse détaillée" : "▸ Voir l'analyse détaillée"}
                                  </button>

                                  {/* Zone secondaire — repliable */}
                                  {detailOuvert && (
                                    <div className="decision-secondary">

                                      {/* 3 colonnes */}
                                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
                                        {[
                                          { label: "Fonctionne", items: r.fonctionne, color: "#5a8f6a" },
                                          { label: "Faiblesses", items: r.faiblesses, color: "#b04040" },
                                          { label: "En trop", items: r.exces, color: "#a06030" },
                                        ].map(({ label, items, color }) => (
                                          <div key={label}>
                                            <p className="label-meta" style={{ marginBottom: 6 }}>{label}</p>
                                            {items.length === 0
                                              ? <p style={{ fontSize: 12, color: "#ccc", fontStyle: "italic" }}>—</p>
                                              : items.map((item, i) => (
                                                <p key={i} style={{ fontSize: 12, color, lineHeight: 1.6, marginBottom: 3 }}>• {item}</p>
                                              ))
                                            }
                                          </div>
                                        ))}
                                      </div>

                                      {/* Manque */}
                                      {r.manque.length > 0 && (
                                        <div>
                                          <p className="label-meta" style={{ marginBottom: 6 }}>Ce qui manque</p>
                                          <div className="tags-row" style={{ marginBottom: 0 }}>
                                            {r.manque.map((m, i) => (
                                              <span key={i} className="tag-pill" style={{ cursor: "default" }}>{m}</span>
                                            ))}
                                          </div>
                                        </div>
                                      )}

                                      {/* Risque répétition */}
                                      <div>
                                        <p className="label-meta" style={{ marginBottom: 4 }}>Risque de répétition</p>
                                        <p style={{ fontSize: 12, color: "#777", lineHeight: 1.6 }}>{r.repetition_risque}</p>
                                      </div>

                                    </div>
                                  )}
                                </>
                              );
                            })()}
                          </div>
                        );
                      })()}

                      {/* Fragments du chapitre */}
                      {!vide && chapOuvert && (
                        <div style={{ paddingLeft: 16, paddingTop: 4 }}>
                          {fragsduChapitre.map((f) => {
                            const fragOuvert = fragmentOuvert !== null && sameFragmentId(fragmentOuvert, f.id);
                            const estEnDrag = draggingId !== null && sameFragmentId(draggingId, f.id);
                            return (
                              <div
                                key={f.id}
                                draggable
                                onDragStart={(e) => {
                                  e.dataTransfer.setData("fragmentId", f.id.toString());
                                  e.dataTransfer.effectAllowed = "move";
                                  setDraggingId(f.id);
                                }}
                                onDragEnd={() => { setDraggingId(null); setDragOverKey(null); }}
                                style={{
                                  marginBottom: 6,
                                  border: `1px solid ${fragOuvert ? tome.color + "88" : "#eee"}`,
                                  borderRadius: 6,
                                  overflow: "hidden",
                                  opacity: estEnDrag ? 0.4 : 1,
                                  cursor: "grab",
                                }}
                              >
                                <div
                                  style={{
                                    display: "flex",
                                    justifyContent: "space-between",
                                    alignItems: "center",
                                    padding: "8px 14px",
                                    background: fragOuvert ? `${tome.color}0e` : "#fff",
                                  }}
                                >
                                  <button
                                    onClick={() => toggleFragment(f.id)}
                                    style={{ flex: 1, background: "none", border: "none", cursor: "pointer", fontFamily: "Georgia, serif", textAlign: "left", padding: 0 }}
                                  >
                                    <span style={{ fontSize: 13, color: "#555", fontStyle: "italic" }}>
                                      {f.texte?.slice(0, 80)}{f.texte?.length > 80 ? "…" : ""}
                                    </span>
                                  </button>
                                  <div style={{ display: "flex", alignItems: "center", gap: 10, marginLeft: 12, whiteSpace: "nowrap" }}>
                                    <span style={{ fontSize: 11, color: "#bbb" }}>{f.date ?? ""}</span>
                                    <button
                                      onClick={() => setDeplacerOuvert(deplacerOuvert !== null && sameFragmentId(deplacerOuvert, f.id) ? null : f.id)}
                                      style={{ fontSize: 11, color: tome.color, background: "none", border: `1px solid ${tome.color}66`, borderRadius: 4, padding: "2px 8px", cursor: "pointer", fontFamily: "Georgia, serif" }}
                                    >
                                      Déplacer
                                    </button>
                                    <span style={{ fontSize: 11, color: "#bbb", cursor: "pointer" }} onClick={() => toggleFragment(f.id)}>
                                      {fragOuvert ? "▲" : "▼"}
                                    </span>
                                  </div>
                                </div>

                                {deplacerOuvert !== null && sameFragmentId(deplacerOuvert, f.id) && (
                                  <div style={{ padding: "10px 14px", borderTop: `1px solid ${tome.color}22`, background: "#fafafa", display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                                    <span style={{ fontSize: 11, color: "#999" }}>Déplacer vers :</span>
                                    <select
                                      defaultValue=""
                                      onChange={(e) => {
                                        const [tomeIdStr, nouvChapitre] = e.target.value.split("||");
                                        const tId = parseInt(tomeIdStr);
                                        if (tId && nouvChapitre) deplacerFragment(f.id, tId, nouvChapitre);
                                      }}
                                      style={{ fontSize: 12, padding: "4px 8px", border: "1px solid #ddd", borderRadius: 6, cursor: "pointer", fontFamily: "Georgia, serif" }}
                                    >
                                      <option value="" disabled>Choisir un chapitre…</option>
                                      {tomes.map((t) => (
                                        <optgroup key={t.id} label={t.titre}>
                                          {(chapitresParTome[t.id] || []).map((c) => (
                                            <option key={c} value={`${t.id}||${c}`}>{c}</option>
                                          ))}
                                        </optgroup>
                                      ))}
                                    </select>
                                    <button
                                      onClick={() => setDeplacerOuvert(null)}
                                      className="soft-button"
                                      style={{ fontSize: 11 }}
                                    >
                                      Annuler
                                    </button>
                                  </div>
                                )}

                                {fragOuvert && (
                                  <div style={{ padding: "12px 16px", borderTop: `1px solid ${tome.color}33`, background: "#fff" }}>
                                    <p style={{ fontSize: 14, lineHeight: 2, whiteSpace: "pre-wrap", color: "#333", margin: 0 }}>{f.texte}</p>
                                    <p style={{ fontSize: 11, color: "#aaa", marginTop: 10, marginBottom: 0 }}>
                                      {f.date && `Ajouté le ${f.date}`}
                                    </p>
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}

                {/* Nouveau chapitre */}
                {nouveauChapitreInput?.tomeId === tome.id ? (
                  <div style={{ display: "flex", gap: 8, alignItems: "center", marginTop: 8, paddingRight: 4 }}>
                    <input
                      autoFocus
                      value={nouveauChapitreInput.nom}
                      onChange={(e) => setNouveauChapitreInput({ ...nouveauChapitreInput, nom: e.target.value })}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") ajouterChapitre(tome.id, nouveauChapitreInput.nom);
                        if (e.key === "Escape") setNouveauChapitreInput(null);
                      }}
                      placeholder="Nom du chapitre…"
                      style={{ flex: 1, padding: "6px 10px", fontSize: 13, fontFamily: "Georgia, serif", border: `1px solid ${tome.color}88`, borderRadius: 6, outline: "none" }}
                    />
                    <button
                      onClick={() => ajouterChapitre(tome.id, nouveauChapitreInput.nom)}
                      style={{ padding: "6px 14px", background: tome.color, color: "white", border: "none", borderRadius: 6, cursor: "pointer", fontSize: 12, fontFamily: "Georgia, serif" }}
                    >
                      Ajouter
                    </button>
                    <button
                      onClick={() => setNouveauChapitreInput(null)}
                      className="soft-button"
                      style={{ padding: "6px 10px", fontSize: 12 }}
                    >
                      Annuler
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setNouveauChapitreInput({ tomeId: tome.id, nom: "" })}
                    style={{ marginTop: 8, padding: "6px 14px", background: "none", color: tome.color, border: `1px dashed ${tome.color}66`, borderRadius: 6, cursor: "pointer", fontSize: 12, fontFamily: "Georgia, serif", width: "100%" }}
                  >
                    + Nouveau chapitre
                  </button>
                )}
              </div>
            )}
          </div>
        );
      })}

      {/* Nouveau tome */}
      {nouveauTomeInput ? (
        <div style={{ marginTop: 16, padding: "16px 20px", border: "1px dashed #ccc", borderRadius: 8, background: "#fafafa" }}>
          <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 10 }}>
            <input
              autoFocus
              value={nouveauTomeInput.titre}
              onChange={(e) => setNouveauTomeInput({ ...nouveauTomeInput, titre: e.target.value })}
              onKeyDown={(e) => {
                if (e.key === "Enter") ajouterTome();
                if (e.key === "Escape") setNouveauTomeInput(null);
              }}
              placeholder="Titre du tome…"
              style={{ flex: 1, padding: "8px 12px", fontSize: 14, fontFamily: "Georgia, serif", border: "1px solid #ccc", borderRadius: 6, outline: "none" }}
            />
            <button
              onClick={ajouterTome}
              style={{ padding: "8px 18px", background: nouveauTomeInput.color, color: "white", border: "none", borderRadius: 6, cursor: "pointer", fontSize: 13, fontFamily: "Georgia, serif" }}
            >
              Créer
            </button>
            <button
              onClick={() => setNouveauTomeInput(null)}
              style={{ padding: "8px 14px", background: "#eee", color: "#555", border: "none", borderRadius: 6, cursor: "pointer", fontSize: 13 }}
            >
              Annuler
            </button>
          </div>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <span style={{ fontSize: 11, color: "#999" }}>Couleur :</span>
            {COULEURS_DISPONIBLES.map((c) => (
              <button
                key={c}
                onClick={() => setNouveauTomeInput({ ...nouveauTomeInput, color: c })}
                style={{
                  width: 20,
                  height: 20,
                  borderRadius: "50%",
                  background: c,
                  border: nouveauTomeInput.color === c ? "2px solid #333" : "2px solid transparent",
                  cursor: "pointer",
                  padding: 0,
                }}
              />
            ))}
          </div>
        </div>
      ) : (
        <button
          onClick={() => setNouveauTomeInput({ titre: "", color: COULEURS_DISPONIBLES[tomes.length % COULEURS_DISPONIBLES.length] })}
          style={{ marginTop: 8, width: "100%", padding: "10px 16px", background: "none", color: "#8B7355", border: "1px dashed #8B735566", borderRadius: 8, cursor: "pointer", fontSize: 13, fontFamily: "Georgia, serif" }}
        >
          + Nouveau tome
        </button>
      )}

      {total === 0 && (
        <p style={{ color: "#bbb", fontStyle: "italic", textAlign: "center", marginTop: 48 }}>
          Aucun fragment envoyé au manuscrit. Utilise le bouton "Envoyer au manuscrit" depuis le Coffre.
        </p>
      )}
    </main>
  );
}
