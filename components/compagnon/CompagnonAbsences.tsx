"use client";

import { useState } from "react";
import Link from "next/link";
import { SystemPanel, SystemSectionHeader } from "@/components/system-ui";
import type { CompagnonData } from "./CompagnonLayout";

const STATUT_ICON: Record<string, string> = {
  "non-traite": "⚠",
  "a-integrer": "○",
  "integre": "✓",
  "archive": "—",
};

const STATUT_LABEL: Record<string, string> = {
  "non-traite": "non traité",
  "a-integrer": "à intégrer",
  "integre": "intégré",
  "archive": "archivé",
};

const IMPACT_MAP: Record<string, string> = {
  élevé: "#b8caa8",
  moyen: "#d6b25e",
  faible: "#9c8d73",
};

export function CompagnonAbsences({ data }: { data: CompagnonData }) {
  const { orphelins, diagnostic, snapshot, actions } = data;
  const [showAll, setShowAll] = useState(false);

  const orphelinsVis = showAll ? orphelins : orphelins.slice(0, 6);

  // Conseiller narratif : fusionne absences + actions diagnostics
  const conseils = [
    diagnostic.evaluation360.respiration !== "présente" && {
      label: "Ajouter des moments de respiration",
      detail: `Respiration : ${diagnostic.evaluation360.respiration} — risque de fatigue lecteur`,
      certitude: "élevée" as const,
      impact: "élevé" as const,
    },
    diagnostic.motifsAbsents.length > 0 && {
      label: `Motifs absents à considérer : ${diagnostic.motifsAbsents.slice(0, 3).join(", ")}`,
      detail: "Ces thèmes sont absents du texte analysé — déséquilibre potentiel",
      certitude: "moyenne" as const,
      impact: "moyen" as const,
    },
    snapshot.motifs.some((m) => m.evolution === "absent" && ["lumière", "eau", "fuite"].includes(m.motif)) && {
      label: "Introduire un motif de refuge",
      detail: "lumière, eau ou fuite — aucun présent dans le texte analysé",
      certitude: "faible" as const,
      impact: "moyen" as const,
    },
    orphelins.length > 5 && {
      label: `${orphelins.length} mémoires sans chapitre assigné`,
      detail: "Matière narrative non mobilisée — potentiel non exploité",
      certitude: "élevée" as const,
      impact: "élevé" as const,
    },
  ].filter(Boolean);

  return (
    <div style={{ display: "grid", gap: 16 }}>

      {/* Souvenirs orphelins */}
      <SystemPanel ariaLabel="Souvenirs orphelins">
        <SystemSectionHeader title="Souvenirs orphelins" />

        {orphelins.length === 0 ? (
          <p className="editorial-body" style={{ margin: 0 }}>
            Toutes les mémoires actives ont un chapitre assigné. ✓
          </p>
        ) : (
          <>
            <p className="editorial-body" style={{ fontSize: 13, margin: "0 0 12px" }}>
              {orphelins.length} mémoire{orphelins.length > 1 ? "s" : ""} sans chapitre assigné — triées par intensité.
            </p>
            <div style={{ display: "grid", gap: 8 }}>
              {orphelinsVis.map((o) => (
                <div
                  key={o.id}
                  style={{
                    alignItems: "baseline",
                    borderBottom: "1px solid rgba(214,178,94,0.08)",
                    display: "flex",
                    gap: 10,
                    justifyContent: "space-between",
                    paddingBottom: 8,
                  }}
                >
                  <div style={{ alignItems: "baseline", display: "flex", gap: 8, minWidth: 0 }}>
                    <span style={{
                      color: o.statut === "non-traite" ? "#d6b25e" : "#9c8d73",
                      flexShrink: 0,
                      fontSize: 13,
                    }}>
                      {STATUT_ICON[o.statut] || "○"}
                    </span>
                    <span style={{
                      color: "#f1e7d5",
                      fontSize: 14,
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}>
                      {o.titre}
                    </span>
                  </div>
                  <span className="editorial-body" style={{ flexShrink: 0, fontSize: 12 }}>
                    intensité {o.intensite || "n/r"} · {STATUT_LABEL[o.statut] || o.statut}
                  </span>
                </div>
              ))}
            </div>

            {orphelins.length > 6 && (
              <button
                className="internal-button"
                onClick={() => setShowAll((v) => !v)}
                style={{ fontSize: 12, marginTop: 10 }}
                type="button"
              >
                {showAll ? "Réduire ▲" : `Voir les ${orphelins.length - 6} autres ▾`}
              </button>
            )}

            <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
              <Link className="internal-button" href="/memoires" style={{ fontSize: 12 }}>
                Gérer les mémoires →
              </Link>
            </div>
          </>
        )}
      </SystemPanel>

      {/* Conseiller narratif */}
      <SystemPanel ariaLabel="Conseiller narratif">
        <SystemSectionHeader title="Ce qui manque au livre pour devenir plus fort" />

        {conseils.length === 0 ? (
          <p className="editorial-body" style={{ margin: 0 }}>
            Aucun signal majeur à ce stade. Continuer l'écriture pour affiner les recommandations.
          </p>
        ) : (
          <div style={{ display: "grid", gap: 12 }}>
            {conseils.map((c) => {
              if (!c) return null;
              return (
                <div
                  key={c.label}
                  style={{
                    borderLeft: `3px solid ${IMPACT_MAP[c.impact]}`,
                    paddingLeft: 12,
                  }}
                >
                  <p style={{ color: "#f1e7d5", fontSize: 14, fontWeight: 600, margin: "0 0 3px" }}>
                    {c.label}
                  </p>
                  <p className="editorial-body" style={{ fontSize: 12, margin: "0 0 4px" }}>
                    {c.detail}
                  </p>
                  <span style={{ color: "#9c8d73", fontSize: 11, letterSpacing: "0.1em", textTransform: "uppercase" }}>
                    Impact {c.impact} · Certitude {c.certitude}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </SystemPanel>

      {/* Actions prioritaires rappel */}
      {actions.length > 0 && (
        <SystemPanel ariaLabel="Rappel actions" compact>
          <SystemSectionHeader title="Prochain meilleur mouvement" />
          <p style={{ color: "#f1e7d5", fontSize: 14, fontWeight: 600, margin: "0 0 6px" }}>
            → {actions[0].label}
          </p>
          <p className="editorial-body" style={{ fontSize: 12, margin: 0 }}>
            {actions[0].pourquoi[0]}
          </p>
        </SystemPanel>
      )}

    </div>
  );
}
