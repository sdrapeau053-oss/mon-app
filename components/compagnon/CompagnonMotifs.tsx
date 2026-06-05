"use client";

import { useState } from "react";
import { SystemPanel, SystemSectionHeader } from "@/components/system-ui";
import type { MotifStats } from "@/lib/livre-companion";
import type { CompagnonData } from "./CompagnonLayout";

function evolutionBadge(evolution: MotifStats["evolution"]) {
  const map = {
    croissant: { bg: "rgba(52,211,153,0.12)", color: "#6ee7b7", label: "↗ croissant" },
    décroissant: { bg: "rgba(245,158,11,0.12)", color: "#fcd34d", label: "↘ décroissant" },
    stable: { bg: "rgba(214,178,94,0.1)", color: "#d6b25e", label: "→ stable" },
    absent: { bg: "rgba(239,68,68,0.12)", color: "#fca5a5", label: "✕ absent" },
  };
  const s = map[evolution];
  return (
    <span style={{
      background: s.bg,
      borderRadius: 20,
      color: s.color,
      fontSize: 11,
      fontWeight: 600,
      padding: "2px 10px",
    }}>
      {s.label}
    </span>
  );
}

function MotifRow({ motif }: { motif: MotifStats }) {
  const [open, setOpen] = useState(false);
  return (
    <div style={{ borderBottom: "1px solid rgba(214,178,94,0.08)" }}>
      <button
        onClick={() => setOpen((v) => !v)}
        style={{
          alignItems: "center",
          background: "none",
          border: "none",
          cursor: "pointer",
          display: "flex",
          gap: 12,
          justifyContent: "space-between",
          padding: "10px 0",
          textAlign: "left",
          width: "100%",
        }}
        type="button"
      >
        <div style={{ alignItems: "center", display: "flex", gap: 10, minWidth: 0 }}>
          <span style={{ color: "#f1e7d5", fontSize: 14, fontWeight: 600, textTransform: "capitalize" }}>
            {motif.motif}
          </span>
          {evolutionBadge(motif.evolution)}
          {motif.alert && (
            <span style={{ color: "#fcd34d", fontSize: 12 }}>⚠</span>
          )}
        </div>
        <div style={{ alignItems: "center", display: "flex", flexShrink: 0, gap: 14 }}>
          <div style={{ display: "grid", gap: 2, textAlign: "right" }}>
            <span style={{ color: "#d6b25e", fontSize: 15, fontWeight: 700 }}>
              {motif.chapters.length}
            </span>
            <span style={{ color: "#9c8d73", fontSize: 10, letterSpacing: "0.1em", textTransform: "uppercase" }}>
              ch.
            </span>
          </div>
          <div style={{ display: "grid", gap: 2, textAlign: "right" }}>
            <span style={{ color: motif.longestGap >= 8 ? "#fca5a5" : "#9c8d73", fontSize: 13, fontWeight: motif.longestGap >= 8 ? 700 : 400 }}>
              {motif.longestGap}
            </span>
            <span style={{ color: "#9c8d73", fontSize: 10, letterSpacing: "0.1em", textTransform: "uppercase" }}>
              gap
            </span>
          </div>
          <span style={{ color: "#9c8d73", fontSize: 12 }}>{open ? "▲" : "▼"}</span>
        </div>
      </button>

      {open && (
        <div style={{ paddingBottom: 12 }}>
          {motif.chapters.length > 0 ? (
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 8 }}>
              {motif.chapters.map((ch) => (
                <span
                  key={`${ch.tomeId}-${ch.title}`}
                  style={{
                    background: "rgba(214,178,94,0.08)",
                    border: "1px solid rgba(214,178,94,0.15)",
                    borderRadius: 20,
                    color: "#d7cab0",
                    fontSize: 12,
                    padding: "3px 10px",
                  }}
                >
                  T{ch.tomeId} · {ch.title} ({ch.count})
                </span>
              ))}
            </div>
          ) : (
            <p className="editorial-body" style={{ fontSize: 12, margin: "0 0 8px" }}>
              Absent de tout le texte analysé.
            </p>
          )}
          {motif.lastAppearance && (
            <p className="editorial-body" style={{ fontSize: 12, margin: 0 }}>
              Dernière apparition : {motif.lastAppearance}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

export function CompagnonMotifs({ data }: { data: CompagnonData }) {
  const { snapshot } = data;
  const [activeFilter, setActiveFilter] = useState<"tous" | "actifs" | "alertes">("tous");

  const filtered = snapshot.motifs.filter((m) => {
    if (activeFilter === "actifs") return m.appearances > 0;
    if (activeFilter === "alertes") return m.alert || m.evolution === "absent";
    return true;
  });

  const actifs = snapshot.motifs.filter((m) => m.appearances > 0).length;
  const alertes = snapshot.motifs.filter((m) => m.alert || m.evolution === "absent").length;

  const totalApparitions = snapshot.motifs.reduce((s, m) => s + m.appearances, 0);

  return (
    <div style={{ display: "grid", gap: 16 }}>

      {/* Vue d'ensemble motifs */}
      <SystemPanel ariaLabel="Motifs dans le livre">
        <SystemSectionHeader title="Motifs dans le livre" />

        {/* Filtre */}
        <div style={{ display: "flex", gap: 6, marginBottom: 14 }}>
          {(["tous", "actifs", "alertes"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setActiveFilter(f)}
              style={{
                background: activeFilter === f ? "rgba(214,178,94,0.14)" : "none",
                border: `1px solid ${activeFilter === f ? "rgba(214,178,94,0.35)" : "rgba(214,178,94,0.12)"}`,
                borderRadius: 20,
                color: activeFilter === f ? "#f1e7d5" : "#9c8d73",
                cursor: "pointer",
                fontSize: 12,
                padding: "4px 12px",
              }}
              type="button"
            >
              {f === "tous" ? `Tous (${snapshot.motifs.length})` : f === "actifs" ? `Actifs (${actifs})` : `Alertes (${alertes})`}
            </button>
          ))}
        </div>

        {snapshot.chapters.length === 0 ? (
          <p className="editorial-body" style={{ margin: 0 }}>
            Aucun chapitre écrit détecté. Les motifs apparaîtront dès qu'un texte sera présent.
          </p>
        ) : (
          <div>
            {filtered.map((motif) => (
              <MotifRow key={motif.motif} motif={motif} />
            ))}
          </div>
        )}
      </SystemPanel>

      {/* Fils narratifs cassés */}
      {snapshot.motifs.some((m) => m.longestGap >= 6 && m.appearances > 0) && (
        <SystemPanel ariaLabel="Fils narratifs interrompus" compact>
          <SystemSectionHeader title="Fils narratifs interrompus" />
          <div style={{ display: "grid", gap: 8 }}>
            {snapshot.motifs
              .filter((m) => m.longestGap >= 6 && m.appearances > 0)
              .sort((a, b) => b.longestGap - a.longestGap)
              .slice(0, 5)
              .map((m) => (
                <div
                  key={m.motif}
                  style={{
                    alignItems: "center",
                    display: "flex",
                    gap: 12,
                    justifyContent: "space-between",
                  }}
                >
                  <div>
                    <span style={{ color: "#f1e7d5", fontSize: 14, fontWeight: 600, textTransform: "capitalize" }}>
                      {m.motif}
                    </span>
                    {m.lastAppearance && (
                      <span className="editorial-body" style={{ fontSize: 12, marginLeft: 8 }}>
                        — {m.lastAppearance}
                      </span>
                    )}
                  </div>
                  <span style={{ color: m.longestGap >= 10 ? "#fca5a5" : "#fcd34d", flexShrink: 0, fontSize: 13, fontWeight: 700 }}>
                    {m.longestGap} ch. d'absence
                  </span>
                </div>
              ))}
          </div>
          <p className="editorial-body" style={{ fontSize: 11, margin: "10px 0 0" }}>
            Certitude : Élevée (calcul sur texte écrit). Un fil est interrompu à partir de 6 chapitres d'absence.
          </p>
        </SystemPanel>
      )}

      {/* Poids total */}
      {totalApparitions > 0 && (
        <SystemPanel ariaLabel="Résumé" compact>
          <p className="editorial-body" style={{ fontSize: 13, margin: 0 }}>
            {snapshot.chapters.length} chapitres analysés · {totalApparitions} occurrences de motifs ·{" "}
            {actifs} motifs actifs sur {snapshot.motifs.length} suivis
          </p>
        </SystemPanel>
      )}

    </div>
  );
}
