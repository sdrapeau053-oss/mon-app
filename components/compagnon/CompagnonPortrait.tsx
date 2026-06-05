"use client";

import { useState } from "react";
import Link from "next/link";
import { SystemPanel, SystemSectionHeader } from "@/components/system-ui";
import { compterMotsChapitreTome1, getChapitresTome1Ecrits } from "@/lib/tome1-chapters";
import type { CompagnonData } from "./CompagnonLayout";

const WEEKLY_GOAL_KEY = "auteur-objectif-semaine";

function readGoal() {
  try { return localStorage.getItem(WEEKLY_GOAL_KEY) || ""; } catch { return ""; }
}

function saveGoal(value: string) {
  try { localStorage.setItem(WEEKLY_GOAL_KEY, value.trim()); } catch { /* silent */ }
}

function BarItem({ label, value, max, color = "#d6b25e" }: { label: string; value: number; max: number; color?: string }) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0;
  return (
    <div style={{ display: "grid", gap: 4 }}>
      <div style={{ alignItems: "center", display: "flex", justifyContent: "space-between" }}>
        <span style={{ color: "#d7cab0", fontSize: 13 }}>{label}</span>
        <span style={{ color: "#9c8d73", fontSize: 12 }}>{pct}%</span>
      </div>
      <div style={{ background: "rgba(255,255,255,0.07)", borderRadius: 3, height: 5, overflow: "hidden" }}>
        <div style={{ background: color, borderRadius: 3, height: "100%", transition: "width 0.4s", width: `${pct}%` }} />
      </div>
    </div>
  );
}

export function CompagnonPortrait({ data }: { data: CompagnonData }) {
  const { diagnostic, profil, snapshot, tome1Chapters } = data;
  const [goal, setGoal] = useState(() => readGoal());
  const [saved, setSaved] = useState(false);

  const chapitresEcrits = getChapitresTome1Ecrits(tome1Chapters).length;
  const totalMots = tome1Chapters.reduce((s, ch) => s + compterMotsChapitreTome1(ch), 0);
  const totalChapitres = tome1Chapters.length;
  const pctProgression = totalChapitres > 0 ? Math.round((chapitresEcrits / totalChapitres) * 100) : 0;

  // Zones fortes = chapitres scellés ou haute intensité
  const zonesFortes = tome1Chapters
    .filter((ch) => ch.statut === "scellé" || ch.statut === "gele" || (ch.intensite || 0) >= 9)
    .slice(0, 3)
    .map((ch) => ch.titre)
    .join(", ");

  // Zones fragiles = séquences lourdes
  const zonesFragiles = diagnostic.sequencesTropLourdes.slice(0, 2).join(", ") ||
    diagnostic.chapitresRedondants[0] || "—";

  // Poids relatif motifs (top 5)
  const totalApparitions = snapshot.motifs.reduce((s, m) => s + m.appearances, 0);
  const motifsAvecPoids = [...snapshot.motifs]
    .filter((m) => m.appearances > 0)
    .sort((a, b) => b.appearances - a.appearances)
    .slice(0, 5);

  function handleSave() {
    saveGoal(goal);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  return (
    <div style={{ display: "grid", gap: 16 }}>

      {/* Mon livre en ce moment */}
      <SystemPanel ariaLabel="Mon livre en ce moment">
        <SystemSectionHeader title="Mon livre en ce moment" />

        <div style={{ marginBottom: 16 }}>
          <div style={{ alignItems: "center", display: "flex", gap: 14, marginBottom: 8 }}>
            <div style={{ background: "rgba(255,255,255,0.07)", borderRadius: 3, flex: 1, height: 6, overflow: "hidden" }}>
              <div style={{ background: "rgba(214,178,94,0.65)", borderRadius: 3, height: "100%", transition: "width 0.4s", width: `${pctProgression}%` }} />
            </div>
            <span style={{ color: "#d7cab0", flexShrink: 0, fontSize: 13 }}>
              {chapitresEcrits}/{totalChapitres} ch. · {totalMots.toLocaleString("fr-CA")} mots
            </span>
          </div>
        </div>

        <div style={{ display: "grid", gap: 8, gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))" }}>
          <div style={{ background: "rgba(255,255,255,0.03)", borderRadius: 10, padding: "10px 14px" }}>
            <p style={{ color: "#9c8d73", fontSize: 10, letterSpacing: "0.16em", margin: "0 0 4px", textTransform: "uppercase" }}>Tension</p>
            <p style={{ color: "#f1e7d5", fontSize: 15, fontWeight: 600, margin: 0 }}>{diagnostic.courbeTension}</p>
          </div>
          <div style={{ background: "rgba(255,255,255,0.03)", borderRadius: 10, padding: "10px 14px" }}>
            <p style={{ color: "#9c8d73", fontSize: 10, letterSpacing: "0.16em", margin: "0 0 4px", textTransform: "uppercase" }}>Densité émotionnelle</p>
            <p style={{ color: "#f1e7d5", fontSize: 15, fontWeight: 600, margin: 0 }}>{diagnostic.equilibreEmotionnel}</p>
          </div>
          <div style={{ background: "rgba(255,255,255,0.03)", borderRadius: 10, padding: "10px 14px" }}>
            <p style={{ color: "#9c8d73", fontSize: 10, letterSpacing: "0.16em", margin: "0 0 4px", textTransform: "uppercase" }}>Risque lecteur</p>
            <p style={{ color: "#f1e7d5", fontSize: 15, fontWeight: 600, margin: 0 }}>{diagnostic.risqueLecteur}</p>
          </div>
          <div style={{ background: "rgba(255,255,255,0.03)", borderRadius: 10, padding: "10px 14px" }}>
            <p style={{ color: "#9c8d73", fontSize: 10, letterSpacing: "0.16em", margin: "0 0 4px", textTransform: "uppercase" }}>Progression</p>
            <p style={{ color: "#f1e7d5", fontSize: 15, fontWeight: 600, margin: 0 }}>{diagnostic.progressionNarrative}</p>
          </div>
        </div>

        <div style={{ display: "grid", gap: 10, gridTemplateColumns: "1fr 1fr", marginTop: 14 }}>
          <div>
            <p className="editorial-label" style={{ marginBottom: 4 }}>Zones fortes</p>
            <p className="editorial-body" style={{ fontSize: 13, margin: 0 }}>{zonesFortes || "À construire"}</p>
          </div>
          <div>
            <p className="editorial-label" style={{ marginBottom: 4 }}>Zones fragiles</p>
            <p className="editorial-body" style={{ fontSize: 13, margin: 0 }}>{zonesFragiles}</p>
          </div>
        </div>
      </SystemPanel>

      {/* Poids relatif des motifs */}
      {motifsAvecPoids.length > 0 && (
        <SystemPanel ariaLabel="Poids relatif des motifs">
          <SystemSectionHeader title="Poids relatif des motifs" />
          <div style={{ display: "grid", gap: 10 }}>
            {motifsAvecPoids.map((m) => (
              <BarItem
                key={m.motif}
                label={m.motif}
                value={m.appearances}
                max={totalApparitions}
              />
            ))}
          </div>
          {diagnostic.motifsAbsents.length > 0 && (
            <p className="editorial-body" style={{ fontSize: 12, margin: "12px 0 0" }}>
              Absents du livre : {diagnostic.motifsAbsents.join(" · ")}
            </p>
          )}
        </SystemPanel>
      )}

      {/* Signature créative */}
      <SystemPanel ariaLabel="Signature créative" compact>
        <SystemSectionHeader title="Signature créative de l'autrice" />
        <div style={{ display: "grid", gap: 12, gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))" }}>
          <div>
            <p className="editorial-label" style={{ marginBottom: 6 }}>Dominant</p>
            <p style={{ color: "#d6b25e", fontSize: 16, fontWeight: 700, margin: 0, textTransform: "capitalize" }}>
              {profil.dominant}
            </p>
          </div>
          <div>
            <p className="editorial-label" style={{ marginBottom: 6 }}>Fréquents</p>
            <p className="editorial-body" style={{ fontSize: 12, margin: 0 }}>
              {profil.frequent.join(" · ") || "—"}
            </p>
          </div>
          <div>
            <p className="editorial-label" style={{ marginBottom: 6 }}>Rares / absents</p>
            <p className="editorial-body" style={{ fontSize: 12, margin: 0 }}>
              {profil.rare.join(" · ") || "—"}
            </p>
          </div>
        </div>
        <p className="editorial-body" style={{ fontSize: 11, margin: "10px 0 0" }}>
          Certitude : Moyenne — basée sur le texte écrit uniquement.
        </p>
      </SystemPanel>

      {/* Objectif de la semaine */}
      <SystemPanel ariaLabel="Objectif de la semaine" compact>
        <SystemSectionHeader title="Objectif de la semaine" />
        <label style={{ display: "grid", gap: 7 }}>
          <span className="label-meta">Objectif actuel</span>
          <input
            className="internal-control"
            onChange={(e) => { setSaved(false); setGoal(e.target.value); }}
            placeholder="Terminer Chapitre 7"
            value={goal}
          />
        </label>
        <div style={{ alignItems: "center", display: "flex", gap: 10, marginTop: 10 }}>
          <button className="internal-button-primary" onClick={handleSave} type="button">
            Enregistrer
          </button>
          {saved && <span style={{ color: "#b8caa8", fontSize: 12 }}>✓ Enregistré</span>}
        </div>
      </SystemPanel>

      {/* Navigation */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8, paddingBottom: 8 }}>
        <Link className="internal-button" href="/manuscrit">Manuscrit</Link>
        <Link className="internal-button" href="/structure-tome-1">Structure</Link>
        <Link className="internal-button" href="/motifs">Carte des motifs</Link>
      </div>

    </div>
  );
}
