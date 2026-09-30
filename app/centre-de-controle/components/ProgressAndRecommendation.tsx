"use client";

import { StateTile, SystemGrid, SystemPanel, SystemSectionHeader } from "@/components/system-ui";

type ProgressItem = {
  detail: string;
  label: string;
  value: string;
};

type IndicatorItem = {
  label: string;
  value: string;
};

type ProgressAndRecommendationProps = {
  indicators: IndicatorItem[];
  primaryRecommendation: string;
  secondaryRecommendations: string[];
  visibleProgress: ProgressItem[];
};

export function ProgressAndRecommendation({
  indicators,
  primaryRecommendation,
  secondaryRecommendations,
  visibleProgress,
}: ProgressAndRecommendationProps) {
  return (
    <>
      <SystemGrid gap={7} min={310}>
        <SystemPanel compact style={{ marginBottom: 0, padding: 8 }}>
          <SystemSectionHeader title="Progression" />
          <div style={{ display: "grid", gap: 5 }}>
            {visibleProgress.map((item) => (
              <ProgressLine detail={item.detail} key={item.label} label={item.label} value={item.value} />
            ))}
          </div>
        </SystemPanel>

        <SystemPanel compact style={{ marginBottom: 0, padding: 8 }}>
          <SystemSectionHeader title="État global" />
          <SystemGrid gap={6} min={140}>
            {indicators.map((item) => (
              <StateTile key={item.label} label={item.label} value={item.value} />
            ))}
          </SystemGrid>
        </SystemPanel>
      </SystemGrid>

      <SystemPanel compact style={{ marginBottom: 0, marginTop: 7, padding: "7px 9px" }}>
        <SystemGrid gap={7} min={260}>
          <div>
            <p className="editorial-label" style={{ margin: "0 0 3px" }}>
              Recommandation
            </p>
            <h2 className="editorial-title" style={{ fontSize: "0.95rem", margin: 0 }}>
              Que faire maintenant ?
            </h2>
            <p style={{ color: "#f1e7d5", fontSize: 13, fontWeight: 650, margin: "5px 0 0" }}>
              → {primaryRecommendation}
            </p>
          </div>
          <ul
            style={{
              alignItems: "center",
              color: "#f1e7d5",
              display: "grid",
              gap: 4,
              gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
              listStyle: "none",
              margin: 0,
              padding: 0,
            }}
          >
            {secondaryRecommendations.map((action) => (
              <li
                key={action}
                style={{
                  background: "rgba(20, 19, 17, 0.64)",
                  border: "1px solid rgba(201, 168, 92, 0.13)",
                  borderRadius: 9,
                  fontSize: 12.5,
                  fontWeight: 500,
                  lineHeight: 1.2,
                  minHeight: 27,
                  padding: "6px 8px",
                }}
              >
                → {action}
              </li>
            ))}
          </ul>
        </SystemGrid>
      </SystemPanel>
    </>
  );
}

function ProgressLine({ detail, label, value }: ProgressItem) {
  return (
    <article
      style={{
        borderBottom: "1px solid rgba(201, 168, 92, 0.1)",
        display: "grid",
        gap: 1,
        paddingBottom: 5,
      }}
    >
      <div style={{ alignItems: "baseline", display: "flex", gap: 12, justifyContent: "space-between" }}>
        <span style={{ color: "#c9bea9", fontSize: 12.5 }}>{label}</span>
        <strong style={{ color: "#f1e7d5", fontSize: 13.5, fontWeight: 560, textAlign: "right" }}>{value}</strong>
      </div>
      <span style={{ color: "#9a9080", fontSize: 10.5, lineHeight: 1.2 }}>{detail}</span>
    </article>
  );
}
