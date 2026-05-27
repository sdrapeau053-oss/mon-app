"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { BackLink } from "@/components/ui/back-link";
import {
  CompactMetric,
  SystemDividerBlock,
  SystemGrid,
  SystemPageShell,
  SystemPanel,
  SystemSectionHeader,
} from "@/components/system-ui";

export type ModuleField = {
  key: string;
  label: string;
  placeholder: string;
  type?: "text" | "textarea" | "select";
  options?: string[];
};

export type ModuleEntry = {
  id: number;
  date: string;
  values: Record<string, string>;
};

export type SystemModuleConfig = {
  title: string;
  subtitle: string;
  storageKey: string;
  fields: ModuleField[];
  analysisTitle?: string;
  safetyNote?: string;
  analyze?: (entry: ModuleEntry) => string[];
};

type ProspectId = "blog" | "agence";

type Prospect = {
  id: ProspectId;
  title: string;
  status: string;
  description: string;
};

const freelanceProspects: Prospect[] = [
  {
    id: "blog",
    title: "Blog d'entreprise locale",
    status: "Contact initial par email",
    description: "Prospect local à qualifier pour une mission de contenu, révision ou stratégie éditoriale.",
  },
  {
    id: "agence",
    title: "Agence de contenu web",
    status: "Soumission portfolio envoyée",
    description: "Partenaire potentiel pour missions récurrentes de rédaction, optimisation ou révision.",
  },
];

function emptyValues(fields: ModuleField[]) {
  return fields.reduce<Record<string, string>>((acc, field) => {
    acc[field.key] = "";
    return acc;
  }, {});
}

function chargerEntrees(storageKey: string): ModuleEntry[] {
  try {
    const saved = localStorage.getItem(storageKey);
    return saved ? JSON.parse(saved) : [];
  } catch {
    return [];
  }
}

function sauvegarderEntrees(storageKey: string, entries: ModuleEntry[]) {
  localStorage.setItem(storageKey, JSON.stringify(entries));
}

function analyseGenerique(entry: ModuleEntry): string[] {
  const valeurs = Object.values(entry.values).filter((value) => value.trim());

  if (valeurs.length === 0) {
    return ["Entrée vide : ajoute au moins une information pour rendre le suivi utile."];
  }

  return [
    "Entrée sauvegardée dans l’historique.",
    "Relis-la plus tard pour repérer ce qui se répète, ce qui évolue et ce qui demande une action concrète.",
  ];
}

export function SystemModulePage({ config }: { config: SystemModuleConfig }) {
  const [entries, setEntries] = useState<ModuleEntry[]>([]);
  const [values, setValues] = useState<Record<string, string>>(() => emptyValues(config.fields));
  const [selectedProspectId, setSelectedProspectId] = useState<ProspectId | null>(null);
  const [prospectNotes, setProspectNotes] = useState<Record<ProspectId, string>>({
    blog: "",
    agence: "",
  });
  const prospectDetailRef = useRef<HTMLDivElement>(null);
  const isFreelanceModule = config.storageKey === "system-freelance";

  useEffect(() => {
    setEntries(chargerEntrees(config.storageKey));
  }, [config.storageKey]);

  useEffect(() => {
    if (!isFreelanceModule) return;

    try {
      const saved = localStorage.getItem("system-freelance-prospect-notes");
      if (saved) {
        setProspectNotes((current) => ({ ...current, ...JSON.parse(saved) }));
      }
    } catch {
      setProspectNotes({ blog: "", agence: "" });
    }
  }, [isFreelanceModule]);

  const totalEntries = entries.length;
  const latestEntry = entries[0];
  const completedFields = useMemo(
    () => Object.values(values).filter((value) => value.trim()).length,
    [values],
  );

  function updateValue(key: string, value: string) {
    setValues((current) => ({ ...current, [key]: value }));
  }

  function addEntry() {
    const entry: ModuleEntry = {
      id: Date.now(),
      date: new Date().toLocaleString("fr-CA"),
      values,
    };
    const updated = [entry, ...entries];

    setEntries(updated);
    sauvegarderEntrees(config.storageKey, updated);
    setValues(emptyValues(config.fields));
  }

  function openProspect(id: ProspectId) {
    console.log("Ouverture prospect :", id);
    setSelectedProspectId(id);

    setTimeout(() => {
      prospectDetailRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 0);
  }

  function updateProspectNote(id: ProspectId, note: string) {
    const updated = { ...prospectNotes, [id]: note };
    setProspectNotes(updated);
    localStorage.setItem("system-freelance-prospect-notes", JSON.stringify(updated));
  }

  return (
    <SystemPageShell maxWidth={980}>
      <header style={{ marginBottom: 28 }}>
        <BackLink label="Système" />
        <h1 style={{ fontSize: 28, fontStyle: "italic", color: "var(--primary)", margin: "8px 0 6px" }}>
          {config.title}
        </h1>
        <p style={{ fontSize: 13, color: "var(--text-muted)", lineHeight: 1.7, maxWidth: 700 }}>
          {config.subtitle}
        </p>
      </header>

      {config.safetyNote && (
        <section className="error-alert" style={{ marginBottom: 20, color: "var(--text-soft)", borderLeftColor: "var(--primary)" }}>
          {config.safetyNote}
        </section>
      )}

      {isFreelanceModule && (
        <SystemPanel ariaLabel="Pipeline prospects">
          <SystemSectionHeader eyebrow="Pipeline prospects" title="Prospects" />
          <SystemGrid gap={12} min={220}>
            {freelanceProspects.map((prospect) => (
              <button
                className="chapter-card interactive"
                key={prospect.id}
                type="button"
                onClick={() => openProspect(prospect.id)}
                style={{
                  borderColor: selectedProspectId === prospect.id ? "var(--primary)" : "var(--border-soft)",
                  cursor: "pointer",
                  marginBottom: 0,
                  textAlign: "left",
                  width: "100%",
                }}
              >
                <p className="label-meta">{prospect.status}</p>
                <h2 style={{ color: "var(--text-main)", fontSize: 17, margin: "0 0 8px" }}>
                  {prospect.title}
                </h2>
                <p style={{ color: "var(--text-soft)", fontSize: 13, lineHeight: 1.7, margin: 0 }}>
                  {prospect.description}
                </p>
              </button>
            ))}
          </SystemGrid>

          <div id="prospect-detail" ref={prospectDetailRef} style={{ marginTop: 18 }}>
            {selectedProspectId ? (
              <ProspectDetail
                note={prospectNotes[selectedProspectId]}
                prospect={freelanceProspects.find((prospect) => prospect.id === selectedProspectId)!}
                onNoteChange={(note) => updateProspectNote(selectedProspectId, note)}
              />
            ) : (
              <article className="placement-cell">
                <p style={{ color: "var(--text-muted)", fontSize: 13, lineHeight: 1.7, margin: 0 }}>
                  Clique sur un prospect pour ouvrir sa fiche client et ajouter des notes.
                </p>
              </article>
            )}
          </div>
        </SystemPanel>
      )}

      <SystemPanel ariaLabel="Nouvelle entrée">
        <SystemSectionHeader eyebrow="Nouvelle entrée" title="Ajouter un suivi" />
        <SystemGrid gap={12} min={240}>
          {config.fields.map((field) => (
            <FieldControl
              field={field}
              key={field.key}
              value={values[field.key] || ""}
              onChange={(value) => updateValue(field.key, value)}
            />
          ))}
        </SystemGrid>

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 16, marginTop: 16 }}>
          <span className="word-count">
            {completedFields} champ{completedFields > 1 ? "s" : ""} rempli{completedFields > 1 ? "s" : ""}
          </span>
          <button className="btn-primary" type="button" onClick={addEntry}>
            Ajouter
          </button>
        </div>
      </SystemPanel>

      <SystemPanel ariaLabel="Vue rapide">
        <SystemSectionHeader eyebrow="Vue rapide" title="Suivi local" />
        <SystemGrid gap={12} min={180}>
          <CompactMetric label="Entrées" value={String(totalEntries)} />
          <CompactMetric label="Dernière mise à jour" value={latestEntry?.date || "Aucune"} />
          <CompactMetric label="Sauvegarde" value="locale" />
        </SystemGrid>
      </SystemPanel>

      <SystemPanel ariaLabel="Historique">
        <SystemSectionHeader eyebrow="Historique" title="Entrées enregistrées" />
        {entries.length === 0 ? (
          <article className="chapter-card">
            <p style={{ color: "var(--text-muted)", fontSize: 13 }}>Aucune entrée enregistrée.</p>
          </article>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {entries.map((entry) => {
              const analyse = (config.analyze || analyseGenerique)(entry);

              return (
                <article className="chapter-card" key={entry.id} style={{ padding: "18px 20px" }}>
                  <p className="label-meta">{entry.date}</p>
                  {config.fields.map((field) => (
                    <InfoLine field={field} key={field.key} value={entry.values[field.key] || ""} />
                  ))}

                  <SystemDividerBlock>
                    <p className="label-meta">{config.analysisTitle || "Analyse simple"}</p>
                    <ul style={{ margin: 0, paddingLeft: 18, color: "var(--text-soft)", fontSize: 13, lineHeight: 1.8 }}>
                      {analyse.map((item) => (
                        <li key={item}>{item}</li>
                      ))}
                    </ul>
                  </SystemDividerBlock>
                </article>
              );
            })}
          </div>
        )}
      </SystemPanel>
    </SystemPageShell>
  );
}

function ProspectDetail({
  note,
  prospect,
  onNoteChange,
}: {
  note: string;
  prospect: Prospect;
  onNoteChange: (note: string) => void;
}) {
  return (
    <article className="chapter-card" style={{ padding: "20px 22px" }}>
      <p className="label-meta">Fiche prospect</p>
      <h3 style={{ color: "var(--primary)", fontSize: 20, fontStyle: "italic", margin: "0 0 8px" }}>
        {prospect.title}
      </h3>
      <p style={{ color: "var(--text-soft)", fontSize: 13, lineHeight: 1.7, margin: "0 0 14px" }}>
        {prospect.status}
      </p>
      <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        <span className="label-meta">Notes</span>
        <textarea
          className="textarea-atelier"
          onChange={(event) => onNoteChange(event.target.value)}
          placeholder="Notes..."
          style={{ minHeight: 120 }}
          value={note}
        />
      </label>
    </article>
  );
}

function FieldControl({
  field,
  value,
  onChange,
}: {
  field: ModuleField;
  value: string;
  onChange: (value: string) => void;
}) {
  if (field.type === "select") {
    return (
      <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        <span className="label-meta">{field.label}</span>
        <select className="filter-select" value={value} onChange={(event) => onChange(event.target.value)}>
          <option value="">Choisir</option>
          {(field.options || []).map((option) => (
            <option key={option} value={option}>{option}</option>
          ))}
        </select>
      </label>
    );
  }

  if (field.type === "text") {
    return (
      <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        <span className="label-meta">{field.label}</span>
        <input
          className="search-input"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder={field.placeholder}
        />
      </label>
    );
  }

  return (
    <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <span className="label-meta">{field.label}</span>
      <textarea
        className="textarea-atelier"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={field.placeholder}
        style={{ minHeight: 112 }}
      />
    </label>
  );
}

function InfoLine({ field, value }: { field: ModuleField; value: string }) {
  if (!value.trim()) return null;

  return (
    <p style={{ color: "var(--text-soft)", fontSize: 13, lineHeight: 1.7, margin: "7px 0 0", whiteSpace: "pre-wrap" }}>
      <strong style={{ color: "var(--text-main)" }}>{field.label} :</strong> {value}
    </p>
  );
}
