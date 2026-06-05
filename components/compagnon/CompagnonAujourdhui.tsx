"use client";

import Link from "next/link";
import { SystemPanel, SystemSectionHeader } from "@/components/system-ui";
import type { CompagnonData } from "./CompagnonLayout";

const IMPACT_COLOR: Record<string, string> = {
  élevé: "#b8caa8",
  moyen: "#d6b25e",
  faible: "#9c8d73",
};

const CERTITUDE_LABEL: Record<string, string> = {
  élevée: "Certitude élevée",
  moyenne: "Certitude moyenne",
  faible: "Certitude faible",
};

function ImpactDots({ impact }: { impact: "faible" | "moyen" | "élevé" }) {
  const filled = impact === "élevé" ? 4 : impact === "moyen" ? 3 : 2;
  return (
    <span style={{ display: "inline-flex", gap: 3 }}>
      {[1, 2, 3, 4].map((i) => (
        <span
          key={i}
          style={{
            background: i <= filled ? IMPACT_COLOR[impact] : "rgba(255,255,255,0.1)",
            borderRadius: "50%",
            display: "inline-block",
            height: 7,
            width: 7,
          }}
        />
      ))}
    </span>
  );
}

export function CompagnonAujourdhui({ data }: { data: CompagnonData }) {
  const { actions, diagnostic } = data;
  const top = actions[0];

  return (
    <div style={{ display: "grid", gap: 16 }}>

      {/* Prochain meilleur mouvement */}
      {top && (
        <SystemPanel ariaLabel="Prochain meilleur mouvement">
          <SystemSectionHeader eyebrow="Prochain meilleur mouvement" title={top.label} />
          <ul
            className="editorial-body"
            style={{ display: "grid", gap: 6, margin: "0 0 14px", paddingLeft: 18 }}
          >
            {top.pourquoi.map((p) => <li key={p}>{p}</li>)}
          </ul>
          <div style={{ alignItems: "center", display: "flex", flexWrap: "wrap", gap: 10 }}>
            <span style={{ alignItems: "center", display: "flex", gap: 6 }}>
              <ImpactDots impact={top.impact} />
              <span style={{ color: IMPACT_COLOR[top.impact], fontSize: 12 }}>
                Impact {top.impact}
              </span>
            </span>
            <span style={{ color: "#9c8d73", fontSize: 11, letterSpacing: "0.1em", textTransform: "uppercase" }}>
              {CERTITUDE_LABEL[top.certitude]}
            </span>
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 14 }}>
            <Link className="internal-button-primary" href="/mission-manuscrit">
              Aller au Cockpit
            </Link>
            <Link className="internal-button" href="/memoires">
              Voir les mémoires
            </Link>
          </div>
        </SystemPanel>
      )}

      {/* Top 5 actions */}
      <SystemPanel ariaLabel="Top 5 actions narrativement rentables">
        <SystemSectionHeader title="Top 5 actions narrativement rentables" />
        {actions.length > 0 ? (
          <div style={{ display: "grid", gap: 10 }}>
            {actions.map((action, i) => (
              <div
                key={action.label}
                style={{
                  alignItems: "flex-start",
                  borderBottom: i < actions.length - 1 ? "1px solid rgba(214,178,94,0.08)" : "none",
                  display: "flex",
                  gap: 14,
                  paddingBottom: i < actions.length - 1 ? 10 : 0,
                }}
              >
                <span
                  style={{
                    color: "#d6b25e",
                    flexShrink: 0,
                    fontSize: 13,
                    fontWeight: 700,
                    minWidth: 18,
                    paddingTop: 1,
                  }}
                >
                  {i + 1}.
                </span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ color: "#f1e7d5", fontSize: 14, fontWeight: 600, margin: "0 0 4px" }}>
                    {action.label}
                  </p>
                  <p className="editorial-body" style={{ fontSize: 12, margin: 0 }}>
                    {action.pourquoi[0]}
                  </p>
                </div>
                <div style={{ alignItems: "flex-end", display: "flex", flexDirection: "column", flexShrink: 0, gap: 3 }}>
                  <ImpactDots impact={action.impact} />
                  <span style={{ color: "#9c8d73", fontSize: 10, letterSpacing: "0.1em", textTransform: "uppercase" }}>
                    {action.certitude}
                  </span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="editorial-body" style={{ margin: 0 }}>
            Aucune action calculée pour l'instant. Ajouter du contenu au Tome 1 pour activer les recommandations.
          </p>
        )}
      </SystemPanel>

      {/* Alerte principale */}
      {diagnostic.signaux.filter((s) => s.tone === "warning").length > 0 && (
        <SystemPanel ariaLabel="Alerte principale" compact>
          <SystemSectionHeader title="Alerte éditoriale principale" />
          <p style={{ color: "#d6b25e", fontSize: 14, margin: 0 }}>
            ⚠ {diagnostic.signaux.find((s) => s.tone === "warning")?.message}
          </p>
          <p className="editorial-body" style={{ fontSize: 12, margin: "6px 0 0" }}>
            Saturation : {diagnostic.courbeTension} · Risque lecteur : {diagnostic.risqueLecteur}
          </p>
        </SystemPanel>
      )}

    </div>
  );
}
