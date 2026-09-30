"use client";

import { SystemPanel } from "@/components/system-ui";
import type { CentreQuickSettings } from "@/lib/system-orchestrator";

type QuickSettingKey = keyof Omit<CentreQuickSettings, "updatedAt">;

type QuickSettingsPanelProps = {
  onToggle: () => void;
  onUpdate: (key: QuickSettingKey, value: string) => void;
  quickOpen: boolean;
  quickSettings: CentreQuickSettings;
};

export function QuickSettingsPanel({
  onToggle,
  onUpdate,
  quickOpen,
  quickSettings,
}: QuickSettingsPanelProps) {
  return (
    <SystemPanel compact style={{ marginBottom: 7, padding: 7 }}>
      <button
        className="soft-button"
        onClick={onToggle}
        style={{
          alignItems: "center",
          display: "flex",
          fontSize: 12,
          justifyContent: "space-between",
          padding: 0,
          textAlign: "left",
          width: "100%",
        }}
        type="button"
      >
        <span>
          <span className="editorial-label">Réglage rapide du jour</span>
          <span style={{ color: "#d9cdb8", display: "block", fontSize: 12, marginTop: 3 }}>
            Modifier rapidement la journée
          </span>
        </span>
        <span aria-hidden="true" style={{ color: "#c9a84c", fontSize: 14 }}>
          {quickOpen ? "−" : "+"}
        </span>
      </button>

      {quickOpen && (
        <div
          style={{
            display: "grid",
            gap: 6,
            gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
            marginTop: 8,
          }}
        >
          <QuickInput label="Priorité du jour" value={quickSettings.priorite} onChange={(value) => onUpdate("priorite", value)} />
          <QuickInput label="Énergie du jour" value={quickSettings.energie} onChange={(value) => onUpdate("energie", value)} />
          <QuickInput label="Action critique" value={quickSettings.actionCritique} onChange={(value) => onUpdate("actionCritique", value)} />
          <QuickInput label="Note rapide" value={quickSettings.noteRapide} onChange={(value) => onUpdate("noteRapide", value)} />
          <QuickInput label="Prochaine action" value={quickSettings.prochaineAction} onChange={(value) => onUpdate("prochaineAction", value)} />
        </div>
      )}
    </SystemPanel>
  );
}

function QuickInput({
  label,
  onChange,
  value,
}: {
  label: string;
  onChange: (value: string) => void;
  value: string;
}) {
  return (
    <label style={{ display: "grid", gap: 4 }}>
      <span className="word-count" style={{ margin: 0 }}>
        {label}
      </span>
      <input
        className="internal-control"
        onChange={(event) => onChange(event.target.value)}
        placeholder="Optionnel"
        style={{
          fontFamily: "inherit",
          fontSize: 12,
          minHeight: 30,
          padding: "6px 8px",
          width: "100%",
        }}
        value={value}
      />
    </label>
  );
}
