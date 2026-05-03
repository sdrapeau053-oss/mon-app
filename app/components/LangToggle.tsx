"use client";

import { type Lang } from "@/app/lib/freelance-lang";

export function LangToggle({ lang, onChange }: { lang: Lang; onChange: (l: Lang) => void }) {
  return (
    <div style={{ display: "flex", gap: 2 }}>
      {(["fr", "en"] as Lang[]).map(l => (
        <button
          key={l}
          onClick={() => onChange(l)}
          style={{
            fontSize: 11,
            padding: "3px 8px",
            borderRadius: 4,
            border: "1px solid var(--border-soft)",
            background: lang === l ? "var(--primary)" : "transparent",
            color: lang === l ? "#fff" : "var(--text-muted)",
            cursor: "pointer",
            fontWeight: lang === l ? 600 : 400,
            textTransform: "uppercase",
            letterSpacing: 0.5,
          }}
        >
          {l}
        </button>
      ))}
    </div>
  );
}
