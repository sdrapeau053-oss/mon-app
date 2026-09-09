import type { ReactNode } from "react";

import { SystemPanel, SystemSectionHeader } from "@/components/system-ui";

type DossierBlockProps = {
  children: ReactNode;
  eyebrow: string;
  id: string;
  isOpen: boolean;
  onToggle: () => void;
  summary: string;
  title: string;
};

export function DossierBlock({
  children,
  eyebrow,
  id,
  isOpen,
  onToggle,
  summary,
  title,
}: DossierBlockProps) {
  return (
    <section id={id} style={{ scrollMarginTop: 24 }}>
      <SystemPanel ariaLabel={title} compact>
        <button
          onClick={onToggle}
          style={{
            alignItems: "center",
            background: "transparent",
            border: "none",
            color: "inherit",
            cursor: "pointer",
            display: "grid",
            gap: 8,
            padding: 0,
            textAlign: "left",
            width: "100%",
          }}
          type="button"
        >
          <div style={{ alignItems: "center", display: "flex", gap: 12, justifyContent: "space-between" }}>
            <SystemSectionHeader eyebrow={eyebrow} title={title} />
            <span className="label-meta" style={{ margin: 0 }}>
              {isOpen ? "Réduire" : "Ouvrir"}
            </span>
          </div>
          <p className="editorial-body" style={{ margin: 0, opacity: 0.88 }}>
            {summary}
          </p>
        </button>

        {isOpen ? <div style={{ display: "grid", gap: 14, marginTop: 14 }}>{children}</div> : null}
      </SystemPanel>
    </section>
  );
}
