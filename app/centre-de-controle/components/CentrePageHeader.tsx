"use client";

import { BackLink } from "@/components/ui/back-link";

export function CentrePageHeader() {
  return (
    <header
      className="internal-header"
      style={{
        borderBottom: "1px solid rgba(201,168,92,0.14)",
        marginBottom: 6,
        paddingBottom: 6,
      }}
    >
      <div style={{ alignItems: "center", display: "flex", flexWrap: "wrap", gap: 12 }}>
        <BackLink label="Système" />
        <span
          style={{
            color: "#a99b84",
            fontSize: 9,
            letterSpacing: "0.18em",
            textTransform: "uppercase",
          }}
        >
          Centre de contrôle
        </span>
      </div>
    </header>
  );
}
