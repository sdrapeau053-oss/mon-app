import type { CSSProperties, ReactNode } from "react";

type StatusChipProps = {
  children: ReactNode;
  tone?: "neutral" | "warning" | "danger" | "success";
};

const chipTones: Record<NonNullable<StatusChipProps["tone"]>, CSSProperties> = {
  danger: {
    borderColor: "rgba(181, 107, 95, 0.3)",
    color: "#d79a8f",
  },
  neutral: {
    borderColor: "rgba(201, 168, 92, 0.16)",
    color: "var(--text-soft)",
  },
  success: {
    borderColor: "rgba(111, 143, 106, 0.3)",
    color: "#9fbd99",
  },
  warning: {
    borderColor: "rgba(201, 168, 92, 0.28)",
    color: "#d7bd79",
  },
};

export function StatusChip({ children, tone = "neutral" }: StatusChipProps) {
  return (
    <span
      style={{
        border: "1px solid",
        borderRadius: 999,
        fontSize: 12,
        lineHeight: 1.15,
        padding: "5px 9px",
        ...chipTones[tone],
      }}
    >
      {children}
    </span>
  );
}

export function StateTile({ label, value }: { label: string; value: string }) {
  return (
    <div
      style={{
        background: "rgba(255, 250, 238, 0.035)",
        border: "1px solid rgba(201, 168, 92, 0.12)",
        borderRadius: 10,
        padding: "9px 10px",
      }}
    >
      <p className="label-meta" style={{ letterSpacing: "0.14em", margin: "0 0 4px" }}>
        {label}
      </p>
      <p style={{ color: "var(--text-main)", fontSize: 14, lineHeight: 1.25, margin: 0 }}>{value}</p>
    </div>
  );
}

export function CompactMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="placement-cell">
      <p className="label-meta" style={{ marginBottom: 4 }}>
        {label}
      </p>
      <p style={{ color: "var(--text-main)", fontSize: 16, fontWeight: 700 }}>{value}</p>
    </div>
  );
}

export function SystemPageShell({
  as = "main",
  children,
  maxWidth = 1180,
  padding = "32px 24px 56px",
}: {
  as?: "main" | "section";
  children: ReactNode;
  maxWidth?: number;
  padding?: string;
}) {
  const Component = as;

  return <Component style={{ boxSizing: "border-box", margin: "0 auto", maxWidth, padding, width: "100%" }}>{children}</Component>;
}

export function SystemPanel({
  ariaLabel,
  children,
  compact = false,
  style,
}: {
  ariaLabel?: string;
  children: ReactNode;
  compact?: boolean;
  style?: CSSProperties;
}) {
  return (
    <section
      aria-label={ariaLabel}
      className="panel"
      style={{
        marginBottom: 22,
        ...(compact ? { padding: 14 } : {}),
        ...style,
      }}
    >
      {children}
    </section>
  );
}

export function SystemGrid({
  children,
  gap = 12,
  min = 180,
}: {
  children: ReactNode;
  gap?: number;
  min?: number;
}) {
  return (
    <div style={{ display: "grid", gap, gridTemplateColumns: `repeat(auto-fit, minmax(${min}px, 1fr))` }}>
      {children}
    </div>
  );
}

export function SystemSectionHeader({
  actions,
  eyebrow,
  title,
}: {
  actions?: ReactNode;
  eyebrow?: string;
  title: string;
}) {
  return (
    <div
      style={{
        display: "grid",
        gap: 10,
        marginBottom: 10,
      }}
    >
      <div>
        {eyebrow && (
          <p className="label-meta" style={{ margin: "0 0 4px" }}>
            {eyebrow}
          </p>
        )}
        <h2 style={{ color: "var(--text-main)", fontSize: 17, margin: 0 }}>{title}</h2>
      </div>
      {actions && (
        <div
          style={{
            alignItems: "center",
            display: "flex",
            flexWrap: "wrap",
            gap: 6,
            maxWidth: "100%",
          }}
        >
          {actions}
        </div>
      )}
    </div>
  );
}

export function SystemDividerBlock({ children }: { children: ReactNode }) {
  return (
    <div
      style={{
        borderTop: "1px solid rgba(201, 168, 92, 0.12)",
        marginTop: 12,
        paddingTop: 10,
      }}
    >
      {children}
    </div>
  );
}

export function SystemTable({ children, minWidth = 780 }: { children: ReactNode; minWidth?: number }) {
  return (
    <div style={{ overflowX: "auto" }}>
      <table style={{ borderCollapse: "collapse", minWidth, width: "100%" }}>{children}</table>
    </div>
  );
}

export function SystemTableHeader({ children }: { children: ReactNode }) {
  return (
    <th
      style={{
        color: "var(--text-muted)",
        fontSize: 11,
        letterSpacing: 1.2,
        padding: "10px 12px",
        textAlign: "left",
        textTransform: "uppercase",
      }}
    >
      {children}
    </th>
  );
}

export function SystemTableCell({
  children,
  width,
}: {
  children: ReactNode;
  width?: number;
}) {
  return <td style={{ padding: "16px 12px", verticalAlign: "top", width }}>{children}</td>;
}

export function SystemInlineField({
  action,
  children,
  offsetTop = false,
}: {
  action?: ReactNode;
  children: ReactNode;
  offsetTop?: boolean;
}) {
  return (
    <div style={{ alignItems: "center", display: "flex", gap: 8, marginTop: offsetTop ? 12 : 0 }}>
      <div style={{ flex: 1, minWidth: 0 }}>{children}</div>
      {action}
    </div>
  );
}

export function SystemActionRow({ children }: { children: ReactNode }) {
  return (
    <div style={{ alignItems: "center", display: "flex", flexWrap: "wrap", gap: 12, marginTop: 12 }}>
      {children}
    </div>
  );
}

export function SystemTaskCard({
  children,
  meta,
  statusColor,
  statusLabel,
  title,
  urgent = false,
}: {
  children?: ReactNode;
  meta: string;
  statusColor: string;
  statusLabel: string;
  title: string;
  urgent?: boolean;
}) {
  return (
    <article
      className="chapter-card"
      style={{
        background: urgent ? "#fff5f2" : "var(--bg-panel)",
        borderColor: urgent ? "rgba(181, 107, 95, 0.55)" : "var(--border-soft)",
        marginBottom: 0,
      }}
    >
      <div style={{ display: "flex", flexWrap: "wrap", gap: 12, justifyContent: "space-between" }}>
        <div>
          <h3 style={{ color: "var(--text-main)", fontSize: 15, margin: "0 0 6px" }}>{title}</h3>
          <p style={{ color: "var(--text-muted)", fontSize: 12, lineHeight: 1.6 }}>{meta}</p>
        </div>
        <span
          style={{
            alignSelf: "flex-start",
            color: statusColor,
            fontSize: 12,
            fontWeight: 700,
          }}
        >
          {statusLabel}
        </span>
      </div>
      {children}
    </article>
  );
}
