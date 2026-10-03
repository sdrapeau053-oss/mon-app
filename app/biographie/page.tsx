"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { BackLink } from "@/components/ui/back-link";
import {
  type ProjetNarratif,
  type Tome,
  chargerProjet,
  sauvegarderProjet,
  creerProjetVide,
  ajouterTome,
  ajouterChapitre,
  supprimerChapitre,
  supprimerTome,
  calculerProgression,
  calculerStatsScore,
} from "@/app/lib/biographie";
import {
  PARCOURS_ECRITURE_TOME_1,
  PARCOURS_STRUCTURE_TOME_1,
  lireVueTome1Biographie,
  peutAjouterChapitreDansTomeBiographie,
  titreDesigneTome1,
  tomesBiographieAffiches,
  type VueTome1Biographie,
} from "@/lib/biographie/tome1-vue";

// LIVRE-V1 (STD-005 LIVRE-V1-D1) — le Tome 1 est présenté en consultation
// depuis `chapitres-tome-1`, sa seule source de vérité ; il s'édite par les
// parcours protégés existants, jamais depuis cette page.
function lireStockageNavigateur(): Storage | null {
  try { return window.localStorage; }
  catch { return null; }
}

export default function BiographiePage() {
  const [projet, setProjet] = useState<ProjetNarratif | null>(null);
  const [vueTome1, setVueTome1] = useState<VueTome1Biographie | null>(null);
  const [erreurTitreTome, setErreurTitreTome] = useState("");
  const [tomesOuverts, setTomesOuverts] = useState<Set<string>>(new Set(["tome-1"]));
  const [nouveauTitreTome, setNouveauTitreTome] = useState("");
  const [ajoutTomeOuvert, setAjoutTomeOuvert] = useState(false);
  const [ajoutChapitreId, setAjoutChapitreId] = useState<string | null>(null);
  const [nouveauTitreChapitre, setNouveauTitreChapitre] = useState("");
  const [titreEditable, setTitreEditable] = useState(false);

  useEffect(() => {
    const p = chargerProjet();
    setProjet(p);
    setTomesOuverts(new Set(p.tomes.map(t => t.id)));
    setVueTome1(lireVueTome1Biographie(lireStockageNavigateur()));
  }, []);

  function maj(p: ProjetNarratif) {
    setProjet(p);
    sauvegarderProjet(p);
  }

  if (!projet || !vueTome1) return null;

  const prog = calculerProgression(projet);
  const chapitresTome1 = vueTome1.chapitres.length;
  const tomesAffiches = tomesBiographieAffiches(projet.tomes);

  function toggleTome(id: string) {
    setTomesOuverts(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  function ajouterNouveauTome() {
    if (!projet || !nouveauTitreTome.trim()) return;
    if (titreDesigneTome1(nouveauTitreTome)) {
      setErreurTitreTome("Le Tome 1 existe déjà : il s'écrit dans « Écrire maintenant » ou « Structure du Tome 1 ».");
      return;
    }
    maj(ajouterTome(projet, nouveauTitreTome.trim()));
    setNouveauTitreTome("");
    setErreurTitreTome("");
    setAjoutTomeOuvert(false);
  }

  function ajouterNouveauChapitre(tomeId: string) {
    if (!projet || !nouveauTitreChapitre.trim()) return;
    const tome = projet.tomes.find(t => t.id === tomeId);
    if (!tome || !peutAjouterChapitreDansTomeBiographie(tome)) return;
    const updated = ajouterChapitre(projet, tomeId, nouveauTitreChapitre.trim());
    maj(updated);
    setNouveauTitreChapitre("");
    setAjoutChapitreId(null);
  }

  const COULEURS_TOME = ["#8b5cf6", "#3b82f6", "#10b981", "#f59e0b"];

  return (
    <main style={{ maxWidth: 800, margin: "0 auto", padding: "32px 24px" }}>

      {/* Header */}
      <BackLink label="Système" />
      <div style={{ display: "flex", flexWrap: "wrap", gap: 16, justifyContent: "space-between", alignItems: "flex-start", marginTop: 16, marginBottom: 20 }}>
        <div>
          {titreEditable ? (
            <input
              autoFocus
              className="search-input"
              value={projet.titre}
              onChange={e => maj({ ...projet, titre: e.target.value })}
              onBlur={() => setTitreEditable(false)}
              onKeyDown={e => e.key === "Enter" && setTitreEditable(false)}
              style={{ fontSize: 22, fontStyle: "italic", fontWeight: 600, color: "var(--primary)", marginBottom: 0, width: 320 }}
            />
          ) : (
            <h1
              onClick={() => setTitreEditable(true)}
              style={{ fontSize: 24, fontStyle: "italic", color: "var(--primary)", cursor: "pointer" }}
              title="Cliquer pour renommer"
            >
              {projet.titre}
            </h1>
          )}
          <p style={{ fontSize: 12, color: "var(--text-muted)" }}>
            {vueTome1.etat !== "illisible" && chapitresTome1 === 0 && prog.total === 0
              ? "Aucun chapitre pour l'instant"
              : [
                  vueTome1.etat === "illisible" && "Tome I : données illisibles",
                  chapitresTome1 > 0 &&`${chapitresTome1} chapitre${chapitresTome1 > 1 ? "s" : ""} écrit${chapitresTome1 > 1 ? "s" : ""} au Tome I`,
                  prog.total > 0 && `${prog.total} chapitre${prog.total > 1 ? "s" : ""} Biographie · ${prog.analyses} analysé${prog.analyses > 1 ? "s" : ""}`,
                ].filter(Boolean).join(" · ")}
          </p>
        </div>
        <div style={{ maxWidth: 320, textAlign: "right" }}>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8, justifyContent: "flex-end" }}>
            <Link
              className="btn-ghost"
              href="/biographie/strategie"
              style={{ display: "inline-block", fontSize: 12, textDecoration: "none" }}
            >
              Stratégie de consolidation
            </Link>
            <Link
              className="btn-ghost"
              href="/biographie/inventaire"
              style={{ display: "inline-block", fontSize: 12, textDecoration: "none" }}
            >
              Inventaire manuscrit
            </Link>
            <Link
              className="btn-ghost"
              href="/biographie/migration-audit"
              style={{ display: "inline-block", fontSize: 12, textDecoration: "none" }}
            >
              Audit migration
            </Link>
          </div>
          <p style={{ color: "var(--text-muted)", fontSize: 11, lineHeight: 1.5, margin: "7px 0 0" }}>
            Vérifier la cohérence des données historiques avant toute migration du manuscrit.
          </p>
        </div>
      </div>

      <div style={{ borderTop: "1px solid var(--border-soft)", marginBottom: 24 }} />

      {/* Barre de progression */}
      {prog.total > 0 && (
        <div className="chapter-card" style={{ padding: "14px 20px", marginBottom: 24, display: "flex", alignItems: "center", gap: 16 }}>
          <div style={{ flex: 1 }}>
            <p style={{ fontSize: 11, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: 1, marginBottom: 6 }}>
              Progression narrative
            </p>
            <div style={{ height: 6, background: "var(--bg-main)", borderRadius: 4, overflow: "hidden" }}>
              <div style={{
                height: "100%",
                width: `${prog.pourcentage}%`,
                background: "var(--primary)",
                borderRadius: 4,
                transition: "width 0.4s ease",
              }} />
            </div>
          </div>
          <span style={{ fontSize: 22, fontWeight: 700, color: "var(--primary)", letterSpacing: -1 }}>
            {prog.pourcentage}%
          </span>
        </div>
      )}

      {/* Tomes */}
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <Tome1Consultation vue={vueTome1} couleur={COULEURS_TOME[0]} />
        {tomesAffiches.map((tome, idx) => (
          <TomeSection
            key={tome.id}
            tome={tome}
            couleur={COULEURS_TOME[(idx + 1) % COULEURS_TOME.length]}
            ouvert={tomesOuverts.has(tome.id)}
            onToggle={() => toggleTome(tome.id)}
            stats={calculerStatsScore(tome)}
            onSupprimerTome={() => {
              if (window.confirm(`Supprimer "${tome.titre}" et tous ses chapitres ?`)) {
                maj(supprimerTome(projet, tome.id));
              }
            }}
            onSupprimerChapitre={chapId => maj(supprimerChapitre(projet, tome.id, chapId))}
            peutAjouterChapitre={peutAjouterChapitreDansTomeBiographie(tome)}
            ajoutOuvert={ajoutChapitreId === tome.id}
            nouveauTitre={nouveauTitreChapitre}
            onOuvrirAjout={() => { setAjoutChapitreId(tome.id); setNouveauTitreChapitre(""); }}
            onTitreChange={setNouveauTitreChapitre}
            onAjouter={() => ajouterNouveauChapitre(tome.id)}
            onAnnulerAjout={() => setAjoutChapitreId(null)}
          />
        ))}
      </div>

      {/* Ajouter un tome */}
      <div style={{ marginTop: 24 }}>
        {ajoutTomeOuvert ? (
          <>
          <div className="chapter-card" style={{ padding: 18, display: "flex", gap: 10, alignItems: "center" }}>
            <input
              autoFocus
              className="search-input"
              value={nouveauTitreTome}
              onChange={e => { setNouveauTitreTome(e.target.value); setErreurTitreTome(""); }}
              onKeyDown={e => { if (e.key === "Enter") ajouterNouveauTome(); if (e.key === "Escape") setAjoutTomeOuvert(false); }}
              placeholder="Ex : Tome 2 — La construction"
              style={{ flex: 1, marginBottom: 0 }}
            />
            <button onClick={ajouterNouveauTome} className="btn-primary" style={{ fontSize: 12 }}>Ajouter</button>
            <button onClick={() => setAjoutTomeOuvert(false)} className="btn-ghost" style={{ fontSize: 12 }}>Annuler</button>
          </div>
          {erreurTitreTome && (
            <p style={{ fontSize: 12, color: "var(--text-muted)", margin: "8px 0 0" }}>{erreurTitreTome}</p>
          )}
          </>
        ) : (
          <button
            onClick={() => setAjoutTomeOuvert(true)}
            className="btn-ghost"
            style={{ fontSize: 13, width: "100%", textAlign: "center", padding: "10px 0" }}
          >
            + Ajouter un tome
          </button>
        )}
      </div>

    </main>
  );
}

function scoreColor(s: number): string {
  if (s >= 75) return "#10b981";
  if (s >= 55) return "#f59e0b";
  if (s >= 35) return "#f97316";
  return "#ef4444";
}

function TomeSection({
  tome,
  couleur,
  ouvert,
  onToggle,
  stats,
  onSupprimerTome,
  onSupprimerChapitre,
  peutAjouterChapitre,
  ajoutOuvert,
  nouveauTitre,
  onOuvrirAjout,
  onTitreChange,
  onAjouter,
  onAnnulerAjout,
}: {
  tome: Tome;
  couleur: string;
  ouvert: boolean;
  onToggle: () => void;
  stats: { meilleurScore: number; plusFaible: number; moyenne: number } | null;
  onSupprimerTome: () => void;
  onSupprimerChapitre: (id: string) => void;
  peutAjouterChapitre: boolean;
  ajoutOuvert: boolean;
  nouveauTitre: string;
  onOuvrirAjout: () => void;
  onTitreChange: (v: string) => void;
  onAjouter: () => void;
  onAnnulerAjout: () => void;
}) {
  const analyses = tome.chapitres.filter(c => c.analyseNarrative !== null).length;

  return (
    <div className="chapter-card" style={{ overflow: "hidden" }}>
      {/* En-tête du tome */}
      <div
        onClick={onToggle}
        style={{
          padding: "16px 20px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          cursor: "pointer",
          borderLeft: `3px solid ${couleur}`,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <span style={{ fontSize: 11, color: couleur, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1 }}>
            {ouvert ? "▼" : "▶"}
          </span>
          <span style={{ fontSize: 15, fontWeight: 600, color: "var(--text-main)" }}>{tome.titre}</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ fontSize: 11, color: "var(--text-muted)" }}>
              {tome.chapitres.length} chap.
              {analyses > 0 && ` · ${analyses} analysé${analyses > 1 ? "s" : ""}`}
            </span>
            {stats && (
              <span style={{ fontSize: 10, color: scoreColor(stats.moyenne), fontWeight: 600, letterSpacing: 0.5 }}>
                moy. {stats.moyenne}
              </span>
            )}
          </div>
          <button
            onClick={e => { e.stopPropagation(); onSupprimerTome(); }}
            className="soft-button"
            style={{ fontSize: 11, color: "var(--text-muted)", padding: "2px 6px" }}
          >
            ✕
          </button>
        </div>
      </div>

      {/* Chapitres */}
      {ouvert && (
        <div style={{ padding: "8px 20px 16px", borderTop: "1px solid var(--border-soft)" }}>
          {tome.chapitres.length === 0 && (
            <p style={{ fontSize: 12, color: "var(--text-muted)", fontStyle: "italic", padding: "8px 0" }}>
              Aucun chapitre. Commence à écrire.
            </p>
          )}

          {tome.chapitres.map(chapitre => {
            const a = chapitre.analyseNarrative;
            return (
              <div
                key={chapitre.id}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  padding: "8px 0",
                  borderBottom: "1px solid var(--border-soft)",
                }}
              >
                <Link
                  href={`/biographie/${tome.id}/${chapitre.id}`}
                  style={{ textDecoration: "none", flex: 1 }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <span style={{
                      width: 8, height: 8, borderRadius: "50%", flexShrink: 0,
                      background: a ? couleur : "var(--border-soft)",
                      display: "inline-block",
                    }} />
                    <span style={{
                      fontSize: 13,
                      color: chapitre.contenuBrut.trim() ? "var(--text-main)" : "var(--text-muted)",
                      fontStyle: chapitre.contenuBrut.trim() ? "normal" : "italic",
                    }}>
                      {chapitre.titre}
                    </span>
                    {a && (
                      <span style={{
                        fontSize: 10, color: couleur, border: `1px solid ${couleur}`,
                        borderRadius: 4, padding: "1px 5px", lineHeight: 1.4,
                      }}>
                        {a.theme}
                      </span>
                    )}
                    {chapitre.score && (
                      <span style={{
                        fontSize: 10, fontWeight: 700,
                        color: scoreColor(chapitre.score.scoreGlobal),
                        minWidth: 24, textAlign: "right",
                      }}>
                        {chapitre.score.scoreGlobal}
                      </span>
                    )}
                  </div>
                </Link>
                <button
                  onClick={() => onSupprimerChapitre(chapitre.id)}
                  className="soft-button"
                  style={{ fontSize: 11, color: "var(--text-muted)", marginLeft: 8 }}
                >
                  ✕
                </button>
              </div>
            );
          })}

          {/* Ajouter un chapitre — jamais pour un tome qui désigne le Tome 1 (LIVRE-V1-D1) */}
          <div style={{ marginTop: 12 }}>
            {!peutAjouterChapitre ? (
              <p style={{ fontSize: 12, color: "var(--text-muted)", margin: 0 }}>
                Le Tome 1 s&apos;écrit dans{" "}
                <Link href={PARCOURS_ECRITURE_TOME_1}>Écrire maintenant</Link> ou{" "}
                <Link href={PARCOURS_STRUCTURE_TOME_1}>Structure du Tome 1</Link>.
              </p>
            ) : ajoutOuvert ? (
              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <input
                  autoFocus
                  className="search-input"
                  value={nouveauTitre}
                  onChange={e => onTitreChange(e.target.value)}
                  onKeyDown={e => { if (e.key === "Enter") onAjouter(); if (e.key === "Escape") onAnnulerAjout(); }}
                  placeholder="Titre du chapitre"
                  style={{ flex: 1, marginBottom: 0, fontSize: 12 }}
                />
                <button onClick={onAjouter} className="btn-primary" style={{ fontSize: 11 }}>Ajouter</button>
                <button onClick={onAnnulerAjout} className="btn-ghost" style={{ fontSize: 11 }}>Annuler</button>
              </div>
            ) : (
              <button onClick={onOuvrirAjout} className="btn-ghost" style={{ fontSize: 12 }}>
                + Nouveau chapitre
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// LIVRE-V1-D1 — consultation du Tome 1 existant : aucune écriture, aucune
// action de création ; l'édition passe par les parcours protégés.
function Tome1Consultation({ vue, couleur }: { vue: VueTome1Biographie; couleur: string }) {
  const [ouvert, setOuvert] = useState(true);
  const n = vue.chapitres.length;

  return (
    <div className="chapter-card" style={{ overflow: "hidden" }}>
      <div
        onClick={() => setOuvert(o => !o)}
        style={{
          padding: "16px 20px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          cursor: "pointer",
          borderLeft: `3px solid ${couleur}`,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <span style={{ fontSize: 11, color: couleur, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1 }}>
            {ouvert ? "▼" : "▶"}
          </span>
          <span style={{ fontSize: 15, fontWeight: 600, color: "var(--text-main)" }}>{vue.titre}</span>
        </div>
        <span style={{ fontSize: 11, color: "var(--text-muted)" }}>
          {vue.etat === "illisible"
            ? "données illisibles"
            : `${n} chap. écrit${n > 1 ? "s" : ""} · ${vue.totalMots} mots`}
        </span>
      </div>

      {ouvert && (
        <div style={{ padding: "8px 20px 16px", borderTop: "1px solid var(--border-soft)" }}>
          {vue.etat === "illisible" && (
            <p style={{ fontSize: 12, color: "var(--text-muted)", padding: "8px 0", margin: 0 }}>
              Les chapitres du Tome 1 sont présents mais illisibles ici. Rien n&apos;a été modifié ; n&apos;écris pas
              ailleurs avant d&apos;avoir vérifié l&apos;Audit migration.
            </p>
          )}
          {vue.etat !== "illisible" && n === 0 && (
            <p style={{ fontSize: 12, color: "var(--text-muted)", fontStyle: "italic", padding: "8px 0", margin: 0 }}>
              Aucun chapitre écrit au Tome 1.
            </p>
          )}

          {vue.chapitres.map(chapitre => (
            <Link
              key={chapitre.id}
              href={chapitre.lienEdition}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                padding: "8px 0",
                borderBottom: "1px solid var(--border-soft)",
                textDecoration: "none",
              }}
            >
              <span style={{ fontSize: 11, color: "var(--text-muted)", minWidth: 22 }}>{chapitre.numero}</span>
              <span style={{ fontSize: 13, color: "var(--text-main)", flex: 1 }}>{chapitre.titre}</span>
              <span style={{ fontSize: 10, color: couleur, border: `1px solid ${couleur}`, borderRadius: 4, padding: "1px 5px", lineHeight: 1.4 }}>
                {chapitre.verrouille ? (chapitre.statut === "scellé" ? "scellé" : "gelé") : chapitre.statutEditorial}
              </span>
              <span style={{ fontSize: 11, color: "var(--text-muted)", minWidth: 64, textAlign: "right" }}>
                {chapitre.mots} mots
              </span>
            </Link>
          ))}

          <p style={{ fontSize: 12, color: "var(--text-muted)", margin: "12px 0 0" }}>
            Consultation seule. Écrire :{" "}
            <Link href={PARCOURS_ECRITURE_TOME_1}>Écrire maintenant</Link> ·{" "}
            <Link href={PARCOURS_STRUCTURE_TOME_1}>Structure du Tome 1</Link>
          </p>
        </div>
      )}
    </div>
  );
}
