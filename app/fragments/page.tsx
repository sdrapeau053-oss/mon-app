"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Document, Packer, Paragraph, TextRun, HeadingLevel } from "docx";
import { saveAs } from "file-saver";

const TOMES = [
  { id: 1, titre: "Tome 1 — Enfance", chapitres: ["La maison", "Les adultes", "L'école", "La nature", "Les silences", "Les punitions", "Les jeux"] },
  { id: 2, titre: "Tome 2 — Adolescence", chapitres: ["Le corps qui change", "Les amis", "Le premier amour", "Partir", "La rupture"] },
  { id: 3, titre: "Tome 3 — Mariage violent", chapitres: ["Le début", "La maison fermée", "Les coups", "L'isolement", "Résister", "Les enfants"] },
  { id: 4, titre: "Tome 4 — Procès", chapitres: ["La plainte", "Le tribunal", "La liberté retrouvée", "Reconstruire", "La transmission"] },
];

const TAGS_SUGGERES = ["peur", "silence", "froid", "eau", "animal", "couloir", "fusil", "lumière", "bruit", "odeur"];

function parseTomeId(tomeStr: string): number | null {
  const match = tomeStr?.match(/\d+/);
  const n = match ? parseInt(match[0]) : null;
  return n && n >= 1 ? n : null;
}

export default function Fragments() {
  const [fragments, setFragments] = useState<any[]>([]);
  const [recherche, setRecherche] = useState("");
  const [editing, setEditing] = useState<{ id: number; texte: string } | null>(null);
  const [tagEditingId, setTagEditingId] = useState<number | null>(null);
  const [tagInput, setTagInput] = useState("");
  const [filtreTome, setFiltreTome] = useState<number | null>(null);
  const [filtreChapitre, setFiltreChapitre] = useState("");
  const [filtreManuscrit, setFiltreManuscrit] = useState<"all" | "manuscrit" | "coffre">("all");
  const [filtreTag, setFiltreTag] = useState("");
  const [detailId, setDetailId] = useState<number | null>(null);

  type FaiblesseItem = { extrait: string; type: string; probleme: string; action: string };
  type FaiblesseState = {
    loading: boolean;
    result: { faiblesses: FaiblesseItem[]; verdict_global: string; priorite: string } | null;
    error: string | null;
    ouvert: boolean;
  };
  const [faiblesseStates, setFaiblesseStates] = useState<Record<number, FaiblesseState>>({});
  const [avantApresId, setAvantApresId] = useState<number | null>(null);
  const [versionSelectee, setVersionSelectee] = useState<Record<number, number>>({});
  const [copieStates, setCopieStates] = useState<Record<string, boolean>>({});

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setDetailId(null);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    const saved: any[] = JSON.parse(localStorage.getItem("fragments") || "[]");

    // Passe 1 — corriger les noms de tomes libres + ajouter tomeId si absent
    const CORRECTIONS_TOME: Record<string, string> = {
      "Tome 3 - Vie adulte":    "Tome 3 — Mariage violent",
      "T1 · Enfance":           "Tome 1 — Enfance",
      "T2 · Adolescence":       "Tome 2 — Adolescence",
      "T3 · Mariage violent":   "Tome 3 — Mariage violent",
      "T4 · Procès":            "Tome 4 — Procès",
    };
    let fragmentsChanges = false;
    const migres = saved.map((f) => {
      let updated = { ...f };
      if (f.tome && CORRECTIONS_TOME[f.tome]) {
        updated.tome = CORRECTIONS_TOME[f.tome];
        fragmentsChanges = true;
      }
      if (!updated.tomeId) {
        const tomeId = parseTomeId(updated.tome);
        if (tomeId) { updated.tomeId = tomeId; fragmentsChanges = true; }
      }
      if (!updated.tags) { updated.tags = []; fragmentsChanges = true; }
      if (!("age" in updated)) { updated.age = null; fragmentsChanges = true; }
      if (!("periode" in updated)) { updated.periode = null; fragmentsChanges = true; }
      if (!("anneeApprox" in updated)) { updated.anneeApprox = null; fragmentsChanges = true; }
      if (!("violations" in updated)) { updated.violations = []; fragmentsChanges = true; }
      if (!("versions" in updated)) { updated.versions = []; fragmentsChanges = true; }
      return updated;
    });
    if (fragmentsChanges) localStorage.setItem("fragments", JSON.stringify(migres));

    // Passe 2 — créer les chapitres manquants uniquement pour les fragments dans le manuscrit
    const defaultChapitres = Object.fromEntries(TOMES.map((t) => [t.id, [...t.chapitres]]));
    const chapitres: Record<number, string[]> = JSON.parse(
      localStorage.getItem("structure-chapitres") || JSON.stringify(defaultChapitres)
    );
    let structureChangee = false;
    migres.forEach((f) => {
      if (!f.manuscrit || !f.tomeId || !f.chapitre) return;
      if (!(chapitres[f.tomeId] || []).includes(f.chapitre)) {
        chapitres[f.tomeId] = [...(chapitres[f.tomeId] || []), f.chapitre];
        structureChangee = true;
      }
    });
    if (structureChangee) localStorage.setItem("structure-chapitres", JSON.stringify(chapitres));

    // Passe 3 — nettoyer les chapitres IA sans fragment manuscrit
    const chapitresApresNettoyage: Record<number, string[]> = {};
    let nettoyageEffectue = false;
    TOMES.forEach((t) => {
      const defaut = t.chapitres;
      const actuels = chapitres[t.id] || [];
      const filtres = actuels.filter((c) => {
        if (defaut.includes(c)) return true;
        return migres.some((f) => f.manuscrit && f.tomeId === t.id && f.chapitre === c);
      });
      chapitresApresNettoyage[t.id] = filtres;
      if (filtres.length !== actuels.length) nettoyageEffectue = true;
    });
    if (nettoyageEffectue) localStorage.setItem("structure-chapitres", JSON.stringify(chapitresApresNettoyage));

    setFragments(migres);
  }, []);

  const tousLesTags = [...new Set(fragments.flatMap((f) => f.tags ?? []))].sort() as string[];
  const chapitresDisponibles = filtreTome
    ? [...new Set(fragments.filter((f) => f.tomeId === filtreTome).map((f) => f.chapitre).filter(Boolean))].sort() as string[]
    : [];
  const filtresActifs = !!(filtreTome || filtreChapitre || filtreManuscrit !== "all" || filtreTag || recherche.trim());
  const nonIntegresCount = fragments.filter((f) => !f.manuscrit).length;

  const fragmentsFiltres = fragments
    .filter((f) => !recherche.trim() || (
      f.texte?.toLowerCase().includes(recherche.toLowerCase()) ||
      f.source?.toLowerCase().includes(recherche.toLowerCase()) ||
      f.chapitre?.toLowerCase().includes(recherche.toLowerCase()) ||
      f.tome?.toLowerCase().includes(recherche.toLowerCase()) ||
      f.note?.toLowerCase().includes(recherche.toLowerCase())
    ))
    .filter((f) => !filtreTome || f.tomeId === filtreTome)
    .filter((f) => !filtreChapitre || f.chapitre === filtreChapitre)
    .filter((f) => filtreManuscrit === "all" || (filtreManuscrit === "manuscrit" ? f.manuscrit : !f.manuscrit))
    .filter((f) => !filtreTag || (f.tags ?? []).includes(filtreTag));

  function reinitialiserFiltres() {
    setRecherche("");
    setFiltreTome(null);
    setFiltreChapitre("");
    setFiltreManuscrit("all");
    setFiltreTag("");
  }

  function supprimer(id: number) {
    const updated = fragments.filter((f) => f.id !== id);
    setFragments(updated);
    localStorage.setItem("fragments", JSON.stringify(updated));
  }

  function deplacer(id: number, tome: string, chapitre: string) {
    const tomeId = parseTomeId(tome);
    const updated = fragments.map((f) =>
      f.id === id ? { ...f, tome, chapitre, ...(tomeId ? { tomeId } : {}) } : f
    );
    setFragments(updated);
    localStorage.setItem("fragments", JSON.stringify(updated));
  }

  function sauvegarderNote(id: number, note: string) {
    const updated = fragments.map((f) =>
      f.id === id ? { ...f, note } : f
    );
    setFragments(updated);
    localStorage.setItem("fragments", JSON.stringify(updated));
  }

  function sauvegarderChamp(id: number, champ: "age" | "periode" | "anneeApprox", valeur: string) {
    const parse: number | string | null = champ === "periode"
      ? (valeur.trim() || null)
      : (valeur.trim() ? parseInt(valeur.trim()) : null);
    const updated = fragments.map((f) => f.id === id ? { ...f, [champ]: parse } : f);
    setFragments(updated);
    localStorage.setItem("fragments", JSON.stringify(updated));
  }

  function enregistrerModification() {
    if (!editing) return;
    const updated = fragments.map((f) => {
      if (f.id !== editing.id) return f;
      const snapshot = { date: new Date().toLocaleDateString("fr-CA"), texte: f.texte };
      return { ...f, texte: editing.texte, versions: [...(f.versions ?? []), snapshot] };
    });
    setFragments(updated);
    localStorage.setItem("fragments", JSON.stringify(updated));
    setEditing(null);
  }

  function restaurerVersion(id: number, texte: string) {
    const fragment = fragments.find((f) => f.id === id);
    if (!fragment) return;
    const snapshot = { date: new Date().toLocaleDateString("fr-CA"), texte: fragment.texte };
    const updated = fragments.map((f) =>
      f.id === id
        ? { ...f, texte, versions: [...(f.versions ?? []), snapshot] }
        : f
    );
    setFragments(updated);
    localStorage.setItem("fragments", JSON.stringify(updated));
  }

  function envoyerAuManuscrit(id: number) {
    const fragment = fragments.find((f) => f.id === id);
    if (!fragment) return;

    const tomeId = fragment.tomeId ?? parseTomeId(fragment.tome);

    // 1. Charger la structure
    const defaultChapitres = Object.fromEntries(TOMES.map((t) => [t.id, [...t.chapitres]]));
    const structure: Record<number, string[]> = JSON.parse(
      localStorage.getItem("structure-chapitres") || JSON.stringify(defaultChapitres)
    );

    // 2. Trouver les chapitres du tome correspondant
    const chapitresDuTome = tomeId ? (structure[tomeId] ?? []) : [];

    // 3. Vérifier si le chapitre existe
    const existe = chapitresDuTome.includes(fragment.chapitre);

    // 4. Si non → l'ajouter
    if (!existe && tomeId && fragment.chapitre) {
      structure[tomeId] = [...chapitresDuTome, fragment.chapitre];
      localStorage.setItem("structure-chapitres", JSON.stringify(structure));
    }

    const updated = fragments.map((f) =>
      f.id === id ? { ...f, manuscrit: true, tomeId: tomeId ?? f.tomeId } : f
    );
    setFragments(updated);
    localStorage.setItem("fragments", JSON.stringify(updated));
  }

  function retirerDuManuscrit(id: number) {
    const updated = fragments.map((f) =>
      f.id === id ? { ...f, manuscrit: false } : f
    );
    setFragments(updated);
    localStorage.setItem("fragments", JSON.stringify(updated));
  }

  function ajouterTag(id: number, tag: string) {
    const t = tag.trim().toLowerCase();
    if (!t) return;
    const updated = fragments.map((f) =>
      f.id === id && !(f.tags ?? []).includes(t)
        ? { ...f, tags: [...(f.tags ?? []), t] }
        : f
    );
    setFragments(updated);
    localStorage.setItem("fragments", JSON.stringify(updated));
    setTagInput("");
  }

  function supprimerTag(id: number, tag: string) {
    const updated = fragments.map((f) =>
      f.id === id ? { ...f, tags: (f.tags ?? []).filter((t: string) => t !== tag) } : f
    );
    setFragments(updated);
    localStorage.setItem("fragments", JSON.stringify(updated));
  }

  async function detecerFaiblesses(id: number, texte: string) {
    setFaiblesseStates((prev) => ({ ...prev, [id]: { loading: true, result: null, error: null, ouvert: true } }));
    try {
      const res = await fetch("/api/faiblesses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ texte }),
      });
      const data = await res.json();
      if (!res.ok) {
        setFaiblesseStates((prev) => ({ ...prev, [id]: { loading: false, result: null, error: data.error ?? "Erreur inconnue.", ouvert: true } }));
        return;
      }
      setFaiblesseStates((prev) => ({ ...prev, [id]: { loading: false, result: data.result, error: null, ouvert: true } }));
    } catch {
      setFaiblesseStates((prev) => ({ ...prev, [id]: { loading: false, result: null, error: "Impossible de contacter le serveur.", ouvert: true } }));
    }
  }

  function toggleFaiblesse(id: number) {
    setFaiblesseStates((prev) => prev[id] ? { ...prev, [id]: { ...prev[id], ouvert: !prev[id].ouvert } } : prev);
  }

  async function copierPrompt(id: number, texte: string, type: "correction" | "renforcement") {
    const prompt = type === "correction"
      ? `Corrige ce passage en respectant ces règles :\n\n- corps avant idée\n- concret avant abstraction\n- aucune sur-explication\n- aucune psychologie explicite\n- pas de phrases décoratives\n- tension implicite constante\n\nCorrige uniquement les parties faibles.\n\nDonne 2 versions maximum.\n\nTexte :\n${texte}`
      : `Renforce ce passage :\n\n- plus de concret\n- plus de sensation\n- moins d'explication\n- tension plus forte\n- pas de phrases inutiles\n\nDonne 1 version améliorée.\n\nTexte :\n${texte}`;

    const cle = `${id}-${type}`;
    try {
      await navigator.clipboard.writeText(prompt);
      setCopieStates((prev) => ({ ...prev, [cle]: true }));
      setTimeout(() => setCopieStates((prev) => ({ ...prev, [cle]: false })), 1500);
    } catch {
      // clipboard non disponible (contexte non-sécurisé)
    }
  }

  async function exporterWord() {
    const children: any[] = [
      new Paragraph({ text: "L'Héritage des Silences", heading: HeadingLevel.TITLE }),
      new Paragraph({ text: "" }),
    ];
    TOMES.forEach(tome => {
      const fragsduTome = fragments.filter(f => f.tomeId === tome.id);
      if (fragsduTome.length === 0) return;
      children.push(new Paragraph({ text: tome.titre, heading: HeadingLevel.HEADING_1 }));
      tome.chapitres.forEach(chapitre => {
        const fragsDuChapitre = fragsduTome.filter(f => f.chapitre === chapitre);
        if (fragsDuChapitre.length === 0) return;
        children.push(new Paragraph({ text: chapitre, heading: HeadingLevel.HEADING_2 }));
        fragsDuChapitre.forEach(f => {
          children.push(new Paragraph({ children: [new TextRun({ text: f.texte, size: 24 })], spacing: { after: 200 } }));
          children.push(new Paragraph({ text: "" }));
        });
      });
    });
    const doc = new Document({ sections: [{ children }] });
    const blob = await Packer.toBlob(doc);
    saveAs(blob, "heritage-des-silences.docx");
  }

  function exporterJSON() {
    const blob = new Blob([JSON.stringify(fragments, null, 2)], { type: "application/json" });
    saveAs(blob, "heritage-fragments.json");
  }

  function importerJSON(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const data = JSON.parse(ev.target?.result as string);
        setFragments(data);
        localStorage.setItem("fragments", JSON.stringify(data));
        alert("Fragments restaurés avec succès !");
      } catch {
        alert("Erreur — fichier JSON invalide.");
      }
    };
    reader.readAsText(file);
  }

  return (
    <main style={{ maxWidth: 800, margin: "0 auto", padding: "32px 24px" }}>

      {/* ── Header ───────────────────────────────────────────────────────── */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20 }}>
        <div>
          <h1 style={{ fontSize: 24, fontStyle: "italic", color: "var(--primary)" }}>L'Héritage des Silences</h1>
          <p style={{ fontSize: 12, color: "var(--text-muted)" }}>
            Coffre — {fragmentsFiltres.length}/{fragments.length} fragment{fragments.length > 1 ? "s" : ""}
            {recherche && <span style={{ color: "var(--primary)" }}> · "{recherche}"</span>}
            {nonIntegresCount > 0 && (
              <button
                onClick={() => setFiltreManuscrit(filtreManuscrit === "coffre" ? "all" : "coffre")}
                className={`tag-pill${filtreManuscrit === "coffre" ? " tag-pill-active" : ""}`}
                style={{ marginLeft: 8 }}
              >
                {nonIntegresCount} non intégré{nonIntegresCount > 1 ? "s" : ""}
              </button>
            )}
          </p>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 8, alignItems: "flex-end" }}>
          <nav style={{ display: "flex", gap: 14, flexWrap: "wrap", justifyContent: "flex-end" }}>
            <Link href="/" style={{ fontSize: 12, color: "var(--primary)" }}>← Atelier</Link>
            <Link href="/structure" style={{ fontSize: 12, color: "var(--primary)" }}>Structure →</Link>
            <Link href="/tableau" style={{ fontSize: 12, color: "var(--primary)" }}>Tableau →</Link>
            <Link href="/chronologie" style={{ fontSize: 12, color: "var(--primary)" }}>Chronologie →</Link>
            <Link href="/repetitions" style={{ fontSize: 12, color: "var(--primary)" }}>Répétitions →</Link>
            <Link href="/lecture" style={{ fontSize: 12, color: "var(--primary)" }}>Lecture →</Link>
            <Link href="/audit" style={{ fontSize: 12, color: "var(--primary)" }}>Audit →</Link>
            <Link href="/missions" style={{ fontSize: 12, color: "var(--primary)" }}>Missions →</Link>
          </nav>
          <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
            <button onClick={exporterWord} className="btn-sm">Word</button>
            <button onClick={exporterJSON} className="soft-button" style={{ fontSize: 12 }}>JSON</button>
            <label className="soft-button" style={{ fontSize: 12 }}>
              Restaurer
              <input type="file" accept=".json" onChange={importerJSON} style={{ display: "none" }} />
            </label>
          </div>
        </div>
      </div>
      <div style={{ borderTop: "1px solid var(--border-soft)", marginBottom: 20 }} />

      {/* ── Recherche ────────────────────────────────────────────────────── */}
      <input
        type="text"
        className="search-input"
        value={recherche}
        onChange={(e) => setRecherche(e.target.value)}
        placeholder="Chercher un mot, un lieu, un personnage, une note..."
      />

      {/* ── Filtres ──────────────────────────────────────────────────────── */}
      <div style={{ marginBottom: 20, display: "flex", flexDirection: "column", gap: 8 }}>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center" }}>
          <select
            className="filter-select"
            value={filtreTome ?? ""}
            onChange={(e) => { setFiltreTome(e.target.value ? Number(e.target.value) : null); setFiltreChapitre(""); }}
          >
            <option value="">Tous les tomes</option>
            {TOMES.map((t) => <option key={t.id} value={t.id}>{t.titre}</option>)}
          </select>

          <select
            className="filter-select"
            value={filtreChapitre}
            onChange={(e) => setFiltreChapitre(e.target.value)}
            disabled={!filtreTome}
          >
            <option value="">Tous les chapitres</option>
            {chapitresDisponibles.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>

          <div className="toggle-group">
            {(["all", "manuscrit", "coffre"] as const).map((v) => (
              <button
                key={v}
                onClick={() => setFiltreManuscrit(v)}
                className={`toggle-btn${filtreManuscrit === v ? " toggle-btn-active" : ""}`}
              >
                {v === "all" ? "Tous" : v === "manuscrit" ? "Manuscrit" : "Non intégrés"}
              </button>
            ))}
          </div>

          {filtresActifs && (
            <button onClick={reinitialiserFiltres} className="soft-button" style={{ fontSize: 11, color: "#c00" }}>
              × Réinitialiser
            </button>
          )}
        </div>

        {tousLesTags.length > 0 && (
          <div className="tags-row" style={{ marginBottom: 0 }}>
            <span className="label-meta" style={{ marginBottom: 0 }}>Tags :</span>
            {tousLesTags.map((t) => (
              <button
                key={t}
                onClick={() => setFiltreTag(filtreTag === t ? "" : t)}
                className={`tag-pill${filtreTag === t ? " tag-pill-active" : ""}`}
              >
                {t}
              </button>
            ))}
          </div>
        )}
      </div>

      {fragmentsFiltres.length === 0 && (
        <p style={{ color: "var(--text-muted)", fontStyle: "italic" }}>Aucun fragment trouvé.</p>
      )}

      {/* ── Cartes ───────────────────────────────────────────────────────── */}
      {fragmentsFiltres.map((f) => (
        <div key={f.id} className="chapter-card" style={{ padding: 20, marginBottom: 16 }}>

          {/* En-tête */}
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 10, flexWrap: "wrap", gap: 8 }}>
            <div>
              <span style={{ fontSize: 11, background: "#f9f6f0", color: "var(--primary)", padding: "3px 8px", borderRadius: 20, marginRight: 8 }}>{f.tome}</span>
              <span style={{ fontSize: 11, color: "var(--text-muted)" }}>{f.chapitre} · {f.date}</span>
            </div>
            <div style={{ display: "flex", gap: 12 }}>
              <button onClick={() => setDetailId(f.id)} className="soft-button" style={{ fontSize: 11 }}>Détail</button>
              <button onClick={() => setEditing({ id: f.id, texte: f.texte })} className="soft-button" style={{ fontSize: 11, color: "var(--primary)" }}>Modifier</button>
              {(() => {
                const fs = faiblesseStates[f.id];
                return (
                  <button
                    onClick={() => fs?.result || fs?.error ? toggleFaiblesse(f.id) : detecerFaiblesses(f.id, f.texte)}
                    disabled={fs?.loading}
                    className="soft-button"
                    style={{ fontSize: 11, color: "#b89060", opacity: fs?.loading ? 0.5 : 1 }}
                  >
                    {fs?.loading ? "Analyse…" : fs?.result || fs?.error ? (fs.ouvert ? "Masquer" : "Faiblesses") : "Faiblesses →"}
                  </button>
                );
              })()}
              {(f.versions ?? []).length > 0 && (
                <button
                  onClick={() => setAvantApresId(avantApresId === f.id ? null : f.id)}
                  className="soft-button"
                  style={{ fontSize: 11, color: avantApresId === f.id ? "var(--primary)" : "var(--text-muted)" }}
                >
                  Avant / Après
                </button>
              )}
              <button onClick={() => supprimer(f.id)} className="soft-button" style={{ fontSize: 11, color: "#c00" }}>Supprimer</button>
            </div>
          </div>

          {/* Texte / mode édition */}
          {editing !== null && editing.id === f.id ? (
            <div style={{ marginBottom: 12 }}>
              <textarea
                className="textarea-atelier"
                value={editing.texte}
                onChange={(e) => setEditing({ ...editing, texte: e.target.value })}
              />
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 8 }}>
                <div style={{ display: "flex", gap: 8 }}>
                  <button onClick={enregistrerModification} className="btn-primary">Enregistrer</button>
                  <button onClick={() => setEditing(null)} className="btn-ghost">Annuler</button>
                </div>
                <span className="word-count">
                  {editing.texte.trim() ? editing.texte.trim().split(/\s+/).length : 0} mot{editing.texte.trim().split(/\s+/).length > 1 ? "s" : ""}
                </span>
              </div>
            </div>
          ) : (
            <p className="fragment-text">{f.texte}</p>
          )}

          {/* Panneau avant / après */}
          {avantApresId === f.id && (f.versions ?? []).length > 0 && (() => {
            const versions = f.versions as { date: string; texte: string }[];
            const idxDefaut = versions.length - 1;
            const idx = versionSelectee[f.id] ?? idxDefaut;
            const versionChoisie = versions[idx];
            return (
              <div className="avant-apres-panel">

                {/* En-tête */}
                <div className="avant-apres-header">
                  <p style={{ fontSize: 13, fontStyle: "italic", color: "var(--text-soft)", margin: 0 }}>
                    Transformation du texte
                  </p>
                  {versions.length > 1 && (
                    <select
                      className="filter-select"
                      value={idx}
                      onChange={(e) => setVersionSelectee((prev) => ({ ...prev, [f.id]: Number(e.target.value) }))}
                    >
                      {versions.map((v, i) => (
                        <option key={i} value={i}>
                          Version du {v.date}{i === idxDefaut ? " (dernière)" : ""}
                        </option>
                      ))}
                    </select>
                  )}
                  {versions.length === 1 && (
                    <span style={{ fontSize: 11, color: "var(--text-muted)" }}>Version du {versionChoisie.date}</span>
                  )}
                </div>

                {/* Colonnes */}
                <div className="avant-apres-grid">

                  {/* Avant */}
                  <div className="avant-apres-col avant-apres-avant">
                    <p className="label-meta" style={{ marginBottom: 0 }}>Avant</p>
                    <p className="fragment-text" style={{ marginBottom: 0, color: "var(--text-muted)" }}>
                      {versionChoisie.texte}
                    </p>
                  </div>

                  {/* Après */}
                  <div className="avant-apres-col avant-apres-apres avant-apres-apres-strong">
                    <p className="label-meta" style={{ marginBottom: 0, color: "var(--primary)", letterSpacing: 2 }}>Après</p>
                    <p className="fragment-text" style={{ marginBottom: 0, fontWeight: 500 }}>
                      {f.texte}
                    </p>
                  </div>

                </div>
              </div>
            );
          })()}

          {/* Panneau faiblesses */}
          {(() => {
            const fs = faiblesseStates[f.id];
            if (!fs || fs.loading || !fs.ouvert || (!fs.result && !fs.error)) return null;
            const VERDICT_COLOR: Record<string, string> = { faible: "#b04040", moyen: "#b89060", fort: "#5a8f6a" };
            return (
              <div className="faiblesse-panel">
                {fs.error && <p style={{ fontSize: 13, color: "#b04040", fontStyle: "italic" }}>{fs.error}</p>}
                {fs.result && (() => {
                  const r = fs.result;
                  return (
                    <>
                      {/* Verdict */}
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <span style={{
                          fontSize: 10,
                          fontWeight: 700,
                          textTransform: "uppercase",
                          letterSpacing: 1.5,
                          padding: "2px 8px",
                          borderRadius: 20,
                          color: VERDICT_COLOR[r.verdict_global] ?? "#8B7355",
                          border: `1px solid ${VERDICT_COLOR[r.verdict_global] ?? "#8B7355"}66`,
                        }}>
                          {r.verdict_global}
                        </span>
                        {r.faiblesses.length === 0 && (
                          <span style={{ fontSize: 12, color: "#5a8f6a" }}>Aucune faiblesse détectée.</span>
                        )}
                      </div>

                      {/* Priorité */}
                      {r.priorite && r.faiblesses.length > 0 && (
                        <div className="faiblesse-priorite">
                          <span className="label-meta" style={{ marginBottom: 4, display: "block" }}>Priorité</span>
                          {r.priorite}
                        </div>
                      )}

                      {/* Liste des faiblesses */}
                      {r.faiblesses.length > 0 && (
                        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                          {r.faiblesses.map((fw, i) => (
                            <div key={i} className="faiblesse-item">
                              <p className="faiblesse-extrait">« {fw.extrait} »</p>
                              <span className="label-meta" style={{ marginBottom: 0, color: "#c6a96b" }}>{fw.type}</span>
                              <p style={{ fontSize: 12, color: "var(--text-soft)", lineHeight: 1.6 }}>{fw.probleme}</p>
                              <p className="faiblesse-action-strong">→ {fw.action}</p>
                            </div>
                          ))}
                        </div>
                      )}
                    </>
                  );
                })()}
              </div>
            );
          })()}

          {/* Métadonnées */}
          <div className="card-meta">

            {/* Note */}
            <textarea
              className="textarea-atelier"
              defaultValue={f.note || ""}
              onBlur={(e) => sauvegarderNote(f.id, e.target.value)}
              placeholder="Note personnelle sur ce fragment..."
              style={{ minHeight: 60, fontSize: 13, marginBottom: 0 }}
            />

            {/* Tags */}
            <div className="tags-row" style={{ marginBottom: 0 }}>
              {(f.tags ?? []).map((tag: string) => (
                <span key={tag} className="tag-pill">
                  {tag}
                  <button onClick={() => supprimerTag(f.id, tag)} className="soft-button" style={{ fontSize: 13, lineHeight: 1, padding: 0, color: "var(--text-muted)" }}>×</button>
                </span>
              ))}
              {tagEditingId === f.id ? (
                <>
                  <input
                    autoFocus
                    className="tag-input"
                    value={tagInput}
                    onChange={(e) => setTagInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") { ajouterTag(f.id, tagInput); }
                      if (e.key === "Escape") { setTagEditingId(null); setTagInput(""); }
                    }}
                    placeholder="tag…"
                  />
                  {TAGS_SUGGERES.filter((t) => !(f.tags ?? []).includes(t)).map((t) => (
                    <button key={t} onClick={() => ajouterTag(f.id, t)} className="tag-add-btn">{t}</button>
                  ))}
                  <button onClick={() => { setTagEditingId(null); setTagInput(""); }} className="soft-button" style={{ fontSize: 12 }}>✕</button>
                </>
              ) : (
                <button onClick={() => { setTagEditingId(f.id); setTagInput(""); }} className="tag-add-btn">
                  + tag
                </button>
              )}
            </div>

            {/* Chronologie */}
            <div className="chrono-row" style={{ marginBottom: 0 }}>
              <label className="chrono-label">
                Âge
                <input
                  type="number"
                  className="chrono-input"
                  key={`age-${f.id}`}
                  defaultValue={f.age ?? ""}
                  onBlur={(e) => sauvegarderChamp(f.id, "age", e.target.value)}
                  min={1} max={99}
                  placeholder="—"
                  style={{ width: 52, textAlign: "center" }}
                />
              </label>
              <label className="chrono-label">
                Période
                <input
                  type="text"
                  className="chrono-input"
                  key={`periode-${f.id}`}
                  defaultValue={f.periode ?? ""}
                  onBlur={(e) => sauvegarderChamp(f.id, "periode", e.target.value)}
                  placeholder="enfance, mariage…"
                  style={{ width: 140 }}
                />
              </label>
              <label className="chrono-label">
                Année approx.
                <input
                  type="number"
                  className="chrono-input"
                  key={`annee-${f.id}`}
                  defaultValue={f.anneeApprox ?? ""}
                  onBlur={(e) => sauvegarderChamp(f.id, "anneeApprox", e.target.value)}
                  min={1950} max={2030}
                  placeholder="—"
                  style={{ width: 68, textAlign: "center" }}
                />
              </label>
            </div>

            {/* Copier pour IA */}
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <span className="label-meta" style={{ marginBottom: 0 }}>Copier pour IA</span>
              <div style={{ display: "flex", gap: 8 }}>
                <button
                  onClick={() => copierPrompt(f.id, f.texte, "correction")}
                  className="btn-outline"
                >
                  {copieStates[`${f.id}-correction`] ? "✓ Copié" : "Correction"}
                </button>
                <button
                  onClick={() => copierPrompt(f.id, f.texte, "renforcement")}
                  className="btn-outline"
                >
                  {copieStates[`${f.id}-renforcement`] ? "✓ Copié" : "Renforcement"}
                </button>
              </div>
            </div>

            {/* Souvenir original */}
            {f.source && (
              <details>
                <summary className="soft-button" style={{ fontSize: 12 }}>Souvenir original</summary>
                <p className="text-muted" style={{ marginTop: 8 }}>{f.source}</p>
              </details>
            )}

          </div>

          {/* Barre d'actions */}
          <div className="action-bar">
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
              <span className="label-meta" style={{ marginBottom: 0 }}>Déplacer vers :</span>
              <select
                className="filter-select"
                defaultValue=""
                onChange={(e) => {
                  const [tome, chapitre] = e.target.value.split("||");
                  if (tome && chapitre) deplacer(f.id, tome, chapitre);
                }}
              >
                <option value="" disabled>Choisir un chapitre...</option>
                {TOMES.map(t => (
                  <optgroup key={t.id} label={t.titre}>
                    {t.chapitres.map(c => (
                      <option key={c} value={`${t.titre}||${c}`}>{c}</option>
                    ))}
                  </optgroup>
                ))}
              </select>
            </div>
            {f.manuscrit ? (
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <span style={{ fontSize: 11, color: "#6a9e7a" }}>✓ Dans le manuscrit</span>
                <button onClick={() => retirerDuManuscrit(f.id)} className="soft-button" style={{ fontSize: 11, textDecoration: "underline" }}>
                  Retirer
                </button>
              </div>
            ) : (
              <button onClick={() => envoyerAuManuscrit(f.id)} className="btn-primary">
                Envoyer au manuscrit →
              </button>
            )}
          </div>
        </div>
      ))}

      {/* ── Modal détail ─────────────────────────────────────────────────── */}
      {detailId !== null && (() => {
        const fd = fragments.find((f) => f.id === detailId);
        if (!fd) return null;
        return (
          <div className="modal-overlay" onClick={() => setDetailId(null)}>
            <div className="modal-box" onClick={(e) => e.stopPropagation()}>
              <button
                className="soft-button"
                onClick={() => setDetailId(null)}
                style={{ position: "absolute", top: 16, right: 16, fontSize: 20, lineHeight: 1 }}
              >×</button>

              {/* En-tête */}
              <div className="modal-section">
                <span style={{ fontSize: 11, background: "#f9f6f0", color: "var(--primary)", padding: "3px 10px", borderRadius: 20, marginRight: 8 }}>{fd.tome}</span>
                <span style={{ fontSize: 12, color: "var(--text-muted)" }}>{fd.chapitre} · {fd.date}</span>
                {fd.manuscrit && <span style={{ marginLeft: 8, fontSize: 11, color: "#6a9e7a" }}>✓ Manuscrit</span>}
              </div>

              {/* Fragment narratif */}
              {fd.texte && (
                <div className="modal-section">
                  <p className="label-meta">Fragment narratif</p>
                  <p className="fragment-text" style={{ marginBottom: 0 }}>{fd.texte}</p>
                </div>
              )}

              {/* Souvenir brut */}
              {fd.source && (
                <div className="modal-section">
                  <div className="chapter-card" style={{ background: "#fffdf8" }}>
                    <p className="label-meta">Souvenir brut</p>
                    <p className="text-muted">{fd.source}</p>
                  </div>
                </div>
              )}

              {/* Violations */}
              {(fd.violations ?? []).length > 0 && (
                <div className="modal-section error-alert">
                  <p className="label-meta" style={{ color: "#b04040" }}>Violations du protocole</p>
                  {fd.violations.map((v: string, i: number) => (
                    <p key={i} style={{ fontSize: 13, marginTop: i > 0 ? 4 : 0 }}>• {v}</p>
                  ))}
                </div>
              )}

              {/* Chronologie + tags */}
              <div className="modal-section" style={{ display: "flex", flexWrap: "wrap", gap: 24 }}>
                <div>
                  <p className="label-meta">Chronologie</p>
                  <div style={{ display: "flex", gap: 16, flexWrap: "wrap", fontSize: 13, color: "#555" }}>
                    {fd.age != null && <span>Âge : <strong>{fd.age}</strong></span>}
                    {fd.periode && <span>Période : <strong>{fd.periode}</strong></span>}
                    {fd.anneeApprox != null && <span>Année ≈ <strong>{fd.anneeApprox}</strong></span>}
                    {fd.age == null && !fd.periode && fd.anneeApprox == null && <span style={{ color: "#ccc", fontStyle: "italic" }}>—</span>}
                  </div>
                </div>
                {(fd.tags ?? []).length > 0 && (
                  <div>
                    <p className="label-meta">Tags</p>
                    <div className="tags-row" style={{ marginBottom: 0 }}>
                      {fd.tags.map((t: string) => (
                        <span key={t} className="tag-pill">{t}</span>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Note personnelle */}
              {fd.note && (
                <div className="modal-section">
                  <p className="label-meta">Note personnelle</p>
                  <p className="text-muted">{fd.note}</p>
                </div>
              )}

              {/* Historique des versions */}
              {(fd.versions ?? []).length > 0 && (
                <div className="modal-section">
                  <p className="label-meta">Historique — {fd.versions.length} version{fd.versions.length > 1 ? "s" : ""} antérieure{fd.versions.length > 1 ? "s" : ""}</p>
                  <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                    {[...fd.versions].reverse().map((v: { date: string; texte: string }, i: number) => (
                      <div key={i} className="chapter-card">
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 6 }}>
                          <span style={{ fontSize: 11, color: "var(--text-muted)" }}>{v.date}</span>
                          <button
                            onClick={() => { restaurerVersion(fd.id, v.texte); setDetailId(null); }}
                            className="btn-outline"
                          >
                            Restaurer
                          </button>
                        </div>
                        <p style={{ fontSize: 13, color: "var(--text-soft)", lineHeight: 1.7, whiteSpace: "pre-wrap", maxHeight: 80, overflow: "hidden", WebkitMaskImage: "linear-gradient(to bottom, black 60%, transparent 100%)" }}>{v.texte}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        );
      })()}
    </main>
  );
}