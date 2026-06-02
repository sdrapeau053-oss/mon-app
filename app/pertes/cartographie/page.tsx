"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  SystemGrid,
  SystemPageShell,
  SystemPanel,
  SystemSectionHeader,
} from "@/components/system-ui";
import { BackLink } from "@/components/ui/back-link";

interface PerteDossier {
  id: string;
  titre: string;
  typePerte: string;
  personneOuSituation?: string;
  dateDebut?: string;
  intensiteActuelle?: number;
  notes?: string;
  pertesSecondaires?: string[];
  pertesAssociees?: string[];
  timeline?: PerteTimelineEvent[];
  journal?: PerteJournalEntry[];
  memoireVivante?: PerteMemoireVivante;
  dateCreation: string;
}

interface PerteTimelineEvent {
  id: string;
  date?: string;
  titre: string;
  type: string;
  intensite?: number;
  note?: string;
}

interface PerteJournalEntry {
  id: string;
  date: string;
  emotion: string;
  intensite: number;
  declencheur?: string;
  texte: string;
}

interface PerteMemoireVivante {
  souvenirs: string[];
  phrases: string[];
  lieux: string[];
  objets: string[];
  ceQuiReste: string[];
}

type FormErrors = {
  titre?: string;
  typePerte?: string;
};

const STORAGE_KEY = "pertes-humaines-dossiers";

const typePerteOptions = [
  "Personne décédée",
  "Personne encore vivante mais changée",
  "Relation",
  "Santé",
  "Sécurité",
  "Enfance",
  "Futur imaginé",
  "Famille",
  "Identité",
  "Croyance ou vérité",
  "Plusieurs pertes en même temps",
  "Autre",
];

const pertesSecondairesOptions = [
  "Deuil du futur",
  "Deuil relationnel",
  "Deuil identitaire",
  "Deuil moral",
  "Deuil ambigu",
  "Deuil anticipé",
  "Deuil cumulatif",
  "Deuil traumatique",
  "Deuil de sécurité",
  "Deuil de l'enfance",
];

const dashboardButtonStyle = {
  alignItems: "center",
  borderRadius: 999,
  display: "inline-flex",
  fontSize: 12.5,
  justifyContent: "center",
  lineHeight: 1,
  minHeight: 38,
  padding: "9px 15px",
  textAlign: "center",
  whiteSpace: "nowrap",
} as const;

const dashboardFieldStyle = { display: "grid", gap: 4 } as const;
const dashboardControlStyle = {
  boxSizing: "border-box",
  fontSize: 13,
  minHeight: 38,
  padding: "7px 10px",
  width: "100%",
} as const;

function isPerteDossier(value: unknown): value is PerteDossier {
  if (!value || typeof value !== "object") return false;
  const item = value as Partial<PerteDossier>;
  return (
    typeof item.id === "string" &&
    typeof item.titre === "string" &&
    typeof item.typePerte === "string" &&
    typeof item.dateCreation === "string"
  );
}

function readDossiers(): PerteDossier[] {
  if (typeof window === "undefined") return [];

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.filter(isPerteDossier) : [];
  } catch {
    return [];
  }
}

function writeDossiers(dossiers: PerteDossier[]) {
  if (typeof window === "undefined") return;

  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(dossiers));
  } catch {
    return;
  }
}

function createPerteId() {
  return `perte-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export default function PertesCartographiePage() {
  const router = useRouter();
  const [titre, setTitre] = useState("");
  const [typePerte, setTypePerte] = useState("");
  const [personneOuSituation, setPersonneOuSituation] = useState("");
  const [dateDebut, setDateDebut] = useState("");
  const [intensiteActuelle, setIntensiteActuelle] = useState(5);
  const [notes, setNotes] = useState("");
  const [pertesSecondaires, setPertesSecondaires] = useState<string[]>([]);
  const [errors, setErrors] = useState<FormErrors>({});
  const [toast, setToast] = useState("");

  function togglePerteSecondaire(value: string) {
    setPertesSecondaires((current) =>
      current.includes(value)
        ? current.filter((item) => item !== value)
        : [...current, value],
    );
  }

  function createCartographie() {
    const nextErrors: FormErrors = {};
    if (titre.trim() === "") nextErrors.titre = "Veuillez nommer cette perte.";
    if (typePerte.trim() === "") nextErrors.typePerte = "Veuillez choisir un type de perte.";
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    const nouveauDossier: PerteDossier = {
      id: createPerteId(),
      titre: titre.trim(),
      typePerte,
      personneOuSituation: personneOuSituation.trim() || undefined,
      dateDebut: dateDebut.trim() || undefined,
      intensiteActuelle,
      notes: notes.trim() || undefined,
      pertesSecondaires,
      pertesAssociees: [],
      timeline: [],
      journal: [],
      memoireVivante: {
        souvenirs: [],
        phrases: [],
        lieux: [],
        objets: [],
        ceQuiReste: [],
      },
      dateCreation: new Date().toISOString(),
    };

    const dossiers = readDossiers();
    writeDossiers([nouveauDossier, ...dossiers]);
    setToast("Cartographie créée.");
    window.setTimeout(() => router.push("/pertes/dossiers"), 650);
  }

  return (
    <main className="internal-page">
      <SystemPageShell maxWidth={1040} padding="24px 18px 56px">
        <header className="internal-header" style={{ marginBottom: 18 }}>
          <BackLink href="/pertes" label="Retour aux pertes" />
          <p className="internal-kicker">Pertes humaines</p>
          <h1 className="internal-title" style={{ fontStyle: "italic" }}>
            Cartographie d&apos;une perte
          </h1>
          <p className="internal-subtitle" style={{ maxWidth: 680 }}>
            Commencez par nommer ce que vous avez perdu.
          </p>
        </header>

        <SystemPanel ariaLabel="Formulaire de cartographie" compact>
          <SystemSectionHeader
            eyebrow="Point de départ"
            title="Qu'avez-vous perdu ?"
          />

          <div style={{ display: "grid", gap: 14 }}>
            <label style={dashboardFieldStyle}>
              <span className="label-meta">Titre de la perte *</span>
              <input
                className="internal-control"
                onChange={(event) => {
                  setTitre(event.target.value);
                  setErrors((current) => ({ ...current, titre: undefined }));
                }}
                placeholder="Exemple : Perte progressive de ma mère"
                style={dashboardControlStyle}
                value={titre}
              />
              {errors.titre ? <span style={{ color: "#d79a8f", fontSize: 12 }}>{errors.titre}</span> : null}
            </label>

            <SystemGrid gap={12} min={260}>
              <label style={dashboardFieldStyle}>
                <span className="label-meta">Type de perte *</span>
                <select
                  className="internal-control"
                  onChange={(event) => {
                    setTypePerte(event.target.value);
                    setErrors((current) => ({ ...current, typePerte: undefined }));
                  }}
                  style={dashboardControlStyle}
                  value={typePerte}
                >
                  <option value="">Choisir un type</option>
                  {typePerteOptions.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
                {errors.typePerte ? <span style={{ color: "#d79a8f", fontSize: 12 }}>{errors.typePerte}</span> : null}
              </label>

              <label style={dashboardFieldStyle}>
                <span className="label-meta">Personne ou situation concernée</span>
                <input
                  className="internal-control"
                  onChange={(event) => setPersonneOuSituation(event.target.value)}
                  placeholder="Exemple : Ma mère, ma sœur, mon frère, mon ancienne vie..."
                  style={dashboardControlStyle}
                  value={personneOuSituation}
                />
              </label>
            </SystemGrid>

            <SystemGrid gap={12} min={260}>
              <label style={dashboardFieldStyle}>
                <span className="label-meta">Date ou période</span>
                <input
                  className="internal-control"
                  onChange={(event) => setDateDebut(event.target.value)}
                  placeholder="Exemple : 2004, depuis 2022, printemps 2026..."
                  style={dashboardControlStyle}
                  value={dateDebut}
                />
              </label>

              <label style={dashboardFieldStyle}>
                <span className="label-meta">Intensité actuelle : {intensiteActuelle}/10</span>
                <input
                  max={10}
                  min={1}
                  onChange={(event) => setIntensiteActuelle(Number(event.target.value))}
                  style={{ accentColor: "var(--accent-gold)", width: "100%" }}
                  type="range"
                  value={intensiteActuelle}
                />
              </label>
            </SystemGrid>

            <label style={dashboardFieldStyle}>
              <span className="label-meta">Notes libres</span>
              <textarea
                className="internal-control"
                onChange={(event) => setNotes(event.target.value)}
                placeholder="Écrivez ce que vous savez pour l'instant. Il n'est pas nécessaire que ce soit clair."
                rows={6}
                style={{ ...dashboardControlStyle, lineHeight: 1.6, minHeight: 150, resize: "vertical" }}
                value={notes}
              />
            </label>
          </div>
        </SystemPanel>

        <SystemPanel ariaLabel="Pertes secondaires possibles" compact>
          <SystemSectionHeader
            eyebrow="Couches possibles"
            title="Pertes secondaires possibles"
          />
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {pertesSecondairesOptions.map((option) => {
              const checked = pertesSecondaires.includes(option);
              return (
                <button
                  key={option}
                  onClick={() => togglePerteSecondaire(option)}
                  style={{
                    border: checked ? "1px solid rgba(201,168,92,0.62)" : "1px solid rgba(201,168,92,0.18)",
                    borderRadius: 999,
                    background: checked ? "rgba(201,168,92,0.18)" : "rgba(255,250,238,0.03)",
                    color: checked ? "var(--text-main)" : "var(--text-soft)",
                    cursor: "pointer",
                    fontSize: 12,
                    padding: "7px 11px",
                  }}
                  type="button"
                >
                  {option}
                </button>
              );
            })}
          </div>
        </SystemPanel>

        <div style={{ display: "flex", flexWrap: "wrap", gap: 10, justifyContent: "flex-end" }}>
          <button
            className="internal-button-primary"
            onClick={createCartographie}
            style={dashboardButtonStyle}
            type="button"
          >
            Créer la cartographie
          </button>
        </div>
      </SystemPageShell>

      {toast ? (
        <div
          style={{
            background: "rgba(21,18,14,.96)",
            border: "1px solid rgba(201,168,92,.36)",
            borderRadius: 999,
            bottom: 20,
            color: "var(--accent-gold)",
            fontSize: 13,
            left: "50%",
            padding: "10px 14px",
            position: "fixed",
            transform: "translateX(-50%)",
            zIndex: 90,
          }}
        >
          {toast}
        </div>
      ) : null}
    </main>
  );
}
