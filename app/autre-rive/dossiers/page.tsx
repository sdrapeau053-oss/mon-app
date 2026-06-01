"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  SystemGrid,
  SystemPageShell,
  SystemPanel,
} from "@/components/system-ui";
import { BackLink } from "@/components/ui/back-link";

interface RelationDossier {
  id: string;
  nom: string;
  statut: string;
  dateCreation: string;
  typeRelation?: string;
  derniereInteraction?: string;
  notes?: string;
  tags?: string[];
  energieEmotionnelle?: number;
  niveauClarte?: number;
  niveauReciprocite?: number;
  niveauSecurite?: number;
}

type DossierDraft = {
  id?: string;
  nom: string;
  typeRelation: string;
  notes: string;
  statut: string;
};

type DossierErrors = {
  nom?: string;
  statut?: string;
};

type DossierSort = "date" | "nom" | "completion";

const STORAGE_KEY = "autre-rive-dossiers";

const statutOptions = ["Rencontre", "Dating", "Relation", "Rupture", "Famille", "Coparentalité", "Autre"];
const typeRelationOptions = ["Romantique", "Familiale", "Amicale", "Professionnelle", "Coparentalite", "Autre"];

const emptyDraft: DossierDraft = {
  nom: "",
  typeRelation: "",
  notes: "",
  statut: "",
};

const dashboardButtonStyle = {
  alignItems: "center",
  borderRadius: 999,
  display: "flex",
  fontSize: 12.5,
  justifyContent: "center",
  lineHeight: 1,
  minHeight: 36,
  padding: "7px 11px",
  textAlign: "center",
  whiteSpace: "nowrap",
} as const;

const compactDossierButtonStyle = {
  ...dashboardButtonStyle,
  border: "1px solid rgba(201,168,92,.28)",
  fontSize: 11.5,
  minHeight: 30,
  padding: "5px 9px",
} as const;

const compactActionButtonStyle = {
  ...compactDossierButtonStyle,
  minHeight: 28,
  padding: "4px 8px",
} as const;

const compactIndicatorBadgeStyle = {
  alignItems: "center",
  border: "1px solid rgba(201,168,92,.22)",
  borderRadius: 999,
  display: "inline-flex",
  flex: "0 1 auto",
  fontSize: 10.5,
  lineHeight: 1,
  minHeight: 20,
  overflow: "hidden",
  padding: "4px 6px",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
} as const;

const compactStatusBadgeStyle = {
  border: "1px solid rgba(201, 168, 92, 0.16)",
  borderRadius: 999,
  color: "var(--text-soft)",
  flex: "0 0 auto",
  fontSize: 10.5,
  lineHeight: 1.1,
  padding: "4px 7px",
} as const;

const dashboardFieldStyle = {
  display: "grid",
  gap: 4,
} as const;

const dashboardControlStyle = {
  boxSizing: "border-box",
  fontSize: 13,
  minHeight: 36,
  padding: "6px 10px",
  width: "100%",
} as const;

const compactControlStyle = {
  ...dashboardControlStyle,
  fontSize: 12.5,
  minHeight: 30,
  padding: "4px 8px",
} as const;

function todayDate() {
  return new Date().toISOString().slice(0, 10);
}

function formatDisplayDate(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return "";

  const isoDate = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  const date = isoDate
    ? new Date(Date.UTC(Number(isoDate[1]), Number(isoDate[2]) - 1, Number(isoDate[3])))
    : new Date(trimmed);

  if (!Number.isFinite(date.getTime())) return trimmed;

  return new Intl.DateTimeFormat("fr-CA", {
    day: "numeric",
    month: "long",
    timeZone: "UTC",
    year: "numeric",
  }).format(date);
}

function createId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }

  return `relation-${Date.now()}`;
}

function isRelationDossier(value: unknown): value is RelationDossier {
  if (!value || typeof value !== "object") return false;
  const item = value as Partial<RelationDossier>;
  return typeof item.id === "string" && typeof item.nom === "string" && typeof item.statut === "string" && typeof item.dateCreation === "string";
}

function readDossiers(): RelationDossier[] {
  if (typeof window === "undefined") return [];

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    const data: unknown = raw ? JSON.parse(raw) : [];
    return Array.isArray(data) ? data.filter(isRelationDossier) : [];
  } catch {
    return [];
  }
}

function saveDossiers(dossiers: RelationDossier[]) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(dossiers));
  } catch {
    return;
  }
}

function updateStoredDossiers(updater: (current: RelationDossier[]) => RelationDossier[]) {
  const current = readDossiers();
  const next = updater(current);
  saveDossiers(next);
  return next;
}

function calculateCompletion(dossier: RelationDossier) {
  let score = 0;
  if (dossier.nom.trim()) score += 20;
  if (dossier.statut.trim()) score += 20;
  if (dossier.notes?.trim()) score += 20;
  if (dossier.tags?.length) score += 20;
  if (dossier.derniereInteraction?.trim()) score += 20;
  return score;
}

function completionColor(score: number) {
  if (score <= 40) return "#b56b5f";
  if (score <= 70) return "var(--accent-gold)";
  return "#9fbd99";
}

export default function RelationDossiersPage() {
  const [dossiers, setDossiers] = useState<RelationDossier[]>([]);
  const [draft, setDraft] = useState<DossierDraft>(emptyDraft);
  const [formOpen, setFormOpen] = useState(false);
  const [errors, setErrors] = useState<DossierErrors>({});
  const [deleteTarget, setDeleteTarget] = useState<RelationDossier | null>(null);
  const [statusFilter, setStatusFilter] = useState("Tous");
  const [sortBy, setSortBy] = useState<DossierSort>("date");
  const [successMessage, setSuccessMessage] = useState("");

  useEffect(() => {
    setDossiers(readDossiers());
  }, []);

  useEffect(() => {
    const page = document.querySelector<HTMLElement>(".dossiers-page-tight");
    const wrapper = page?.parentElement;
    if (!wrapper?.classList.contains("app-page-motion")) return;

    const previousMinHeight = wrapper.style.minHeight;
    const previousHeight = wrapper.style.height;
    const previousFlex = wrapper.style.flex;
    const previousFlexGrow = wrapper.style.flexGrow;
    const previousDisplay = wrapper.style.display;
    const previousPaddingBottom = wrapper.style.paddingBottom;
    const previousMarginBottom = wrapper.style.marginBottom;

    wrapper.style.minHeight = "auto";
    wrapper.style.height = "auto";
    wrapper.style.flex = "0 0 auto";
    wrapper.style.flexGrow = "0";
    wrapper.style.display = "flow-root";
    wrapper.style.paddingBottom = "0";
    wrapper.style.marginBottom = "0";

    return () => {
      wrapper.style.minHeight = previousMinHeight;
      wrapper.style.height = previousHeight;
      wrapper.style.flex = previousFlex;
      wrapper.style.flexGrow = previousFlexGrow;
      wrapper.style.display = previousDisplay;
      wrapper.style.paddingBottom = previousPaddingBottom;
      wrapper.style.marginBottom = previousMarginBottom;
    };
  }, []);

  function persist(updater: (current: RelationDossier[]) => RelationDossier[]) {
    const next = updateStoredDossiers(updater);
    setDossiers(next);
  }

  function openCreateForm() {
    setDraft(emptyDraft);
    setErrors({});
    setFormOpen(true);
  }

  function openEditForm(dossier: RelationDossier) {
    setDraft({
      id: dossier.id,
      nom: dossier.nom,
      typeRelation: dossier.typeRelation || "",
      notes: dossier.notes || "",
      statut: dossier.statut,
    });
    setErrors({});
    setFormOpen(true);
  }

  function closeForm() {
    setDraft(emptyDraft);
    setErrors({});
    setFormOpen(false);
  }

  function submitDossier() {
    const nom = draft.nom.trim();
    const statut = draft.statut.trim();
    const nextErrors: DossierErrors = {};

    if (!nom) nextErrors.nom = "Veuillez entrer un nom";
    if (!statut) nextErrors.statut = "Veuillez choisir un statut";

    if (nextErrors.nom || nextErrors.statut) {
      setErrors(nextErrors);
      return;
    }

    if (draft.id) {
      persist((current) =>
        current.map((dossier) =>
          dossier.id === draft.id
            ? {
                ...dossier,
                nom,
                notes: draft.notes.trim(),
                statut,
                typeRelation: draft.typeRelation.trim() || undefined,
              }
            : dossier,
        ),
      );
    } else {
      const dossier: RelationDossier = {
        id: createId(),
        nom,
        statut,
        dateCreation: todayDate(),
        typeRelation: draft.typeRelation.trim() || undefined,
        notes: draft.notes.trim(),
      };

      persist((current) => [dossier, ...current]);
      setSuccessMessage("Dossier créé avec succès.");
      window.setTimeout(() => setSuccessMessage(""), 2000);
    }

    closeForm();
  }

  function confirmDelete() {
    if (!deleteTarget) return;
    persist((current) => current.filter((dossier) => dossier.id !== deleteTarget.id));
    setDeleteTarget(null);
  }

  function updateDerniereInteraction(id: string, value: string) {
    persist((current) =>
      current.map((dossier) =>
        dossier.id === id
          ? {
              ...dossier,
              derniereInteraction: value,
            }
          : dossier,
      ),
    );
  }

  const displayedDossiers = useMemo(() => {
    const filtered = statusFilter === "Tous" ? dossiers : dossiers.filter((dossier) => dossier.statut === statusFilter);

    return [...filtered].sort((first, second) => {
      if (sortBy === "nom") return first.nom.localeCompare(second.nom, "fr");
      if (sortBy === "completion") return calculateCompletion(second) - calculateCompletion(first);
      return second.dateCreation.localeCompare(first.dateCreation);
    });
  }, [dossiers, sortBy, statusFilter]);

  return (
    <main className="internal-page dossiers-page-tight" style={{ display: "flow-root", flex: "0 0 auto", flexGrow: 0, height: "fit-content", marginBottom: 0, minHeight: 0, paddingBottom: 0 }}>
      <style>
        {`
          .app-page-motion:has(.dossiers-page-tight) {
            display: flow-root !important;
            flex: 0 0 auto !important;
            flex-grow: 0 !important;
            height: auto !important;
            margin-bottom: 0 !important;
            max-height: fit-content !important;
            min-height: auto;
            padding-bottom: 0 !important;
          }

          .dossiers-page-tight {
            display: flow-root !important;
            flex: 0 0 auto !important;
            flex-grow: 0 !important;
            height: fit-content !important;
            margin-bottom: 0 !important;
            max-height: fit-content !important;
            min-height: 0 !important;
            padding-bottom: 0 !important;
          }

          .dossiers-page-tight > main {
            margin-bottom: 0 !important;
            padding-bottom: 16px !important;
          }
        `}
      </style>
      <SystemPageShell maxWidth={1180} padding="0 20px 16px">
        <header className="internal-header" style={{ marginBottom: 2, paddingBottom: 2 }}>
          <div style={{ lineHeight: 1, marginBottom: 0 }}>
            <BackLink className="leading-none" href="/autre-rive" label="L’Autre Rive" />
          </div>
          <p className="internal-kicker" style={{ lineHeight: 1, margin: 0 }}>Dossier relationnel central</p>
          <h1 className="internal-title" style={{ fontSize: "clamp(1.16rem, 1.85vw, 1.58rem)", lineHeight: 0.94 }}>
            Dossiers relationnels
          </h1>
          <p className="internal-subtitle" style={{ fontSize: "0.74rem", lineHeight: 1.05, marginTop: 0 }}>Toutes vos relations au même endroit.</p>
        </header>

        <SystemPanel ariaLabel="Créer un dossier" compact style={{ marginBottom: 5, padding: "6px 10px" }}>
          <div style={{ alignItems: "center", display: "flex", flexWrap: "wrap", gap: 8, justifyContent: "space-between", minHeight: 32 }}>
            <h2 style={{ color: "var(--text-main)", fontSize: 16, lineHeight: 1.05, margin: 0 }}>
              Dossier central
            </h2>
            <button className="internal-button-primary" onClick={openCreateForm} style={compactActionButtonStyle} type="button">
              + Nouveau dossier
            </button>
          </div>

          {formOpen ? (
            <div style={{ display: "grid", gap: 10, marginTop: 8 }}>
              <p className="editorial-body" style={{ margin: 0 }}>
                Donnez un nom à cette relation et choisissez un statut pour commencer.
                Vous pourrez enrichir ce dossier ensuite.
              </p>
              <SystemGrid gap={10} min={220}>
                <label style={dashboardFieldStyle}>
                  <span className="label-meta">Nom</span>
                  <input
                    className="internal-control"
                    onChange={(event) => {
                      setDraft((current) => ({ ...current, nom: event.target.value }));
                      setErrors((current) => ({ ...current, nom: undefined }));
                    }}
                    placeholder="Ex. David"
                    style={dashboardControlStyle}
                    value={draft.nom}
                  />
                  {errors.nom ? <span style={{ color: "#d79a8f", fontSize: 12 }}>{errors.nom}</span> : null}
                </label>
                <label style={dashboardFieldStyle}>
                  <span className="label-meta">Type de relation</span>
                  <select
                    className="internal-control"
                    onChange={(event) => setDraft((current) => ({ ...current, typeRelation: event.target.value }))}
                    style={dashboardControlStyle}
                    value={draft.typeRelation}
                  >
                    <option value="">Choisir un type</option>
                    {typeRelationOptions.map((option) => (
                      <option key={option} value={option}>{option}</option>
                    ))}
                  </select>
                </label>
                <label style={dashboardFieldStyle}>
                  <span className="label-meta">Statut</span>
                  <select
                    className="internal-control"
                    onChange={(event) => {
                      setDraft((current) => ({ ...current, statut: event.target.value }));
                      setErrors((current) => ({ ...current, statut: undefined }));
                    }}
                    style={dashboardControlStyle}
                    value={draft.statut}
                  >
                    <option value="">Choisir un statut</option>
                    {statutOptions.map((option) => (
                      <option key={option} value={option}>{option}</option>
                    ))}
                  </select>
                  {errors.statut ? <span style={{ color: "#d79a8f", fontSize: 12 }}>{errors.statut}</span> : null}
                </label>
              </SystemGrid>
              <label style={dashboardFieldStyle}>
                <span className="label-meta">Notes libres</span>
                <textarea
                  className="internal-control"
                  onChange={(event) => setDraft((current) => ({ ...current, notes: event.target.value }))}
                  placeholder="Notes optionnelles..."
                  rows={3}
                  style={{ ...dashboardControlStyle, minHeight: 76 }}
                  value={draft.notes}
                />
              </label>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                <button className="internal-button-primary" onClick={submitDossier} style={dashboardButtonStyle} type="button">
                  {draft.id ? "Enregistrer" : "Créer"}
                </button>
                <button className="internal-button" onClick={closeForm} style={dashboardButtonStyle} type="button">
                  Annuler
                </button>
              </div>
            </div>
          ) : !dossiers.length ? (
            <div
              style={{
                border: "1px solid rgba(201,168,92,.22)",
                borderRadius: 18,
                background: "linear-gradient(135deg, rgba(201,168,92,.12), rgba(255,250,238,.025))",
                display: "grid",
                gap: 12,
                justifyItems: "center",
                padding: "26px 18px",
                textAlign: "center",
              }}
            >
              <h2 style={{ color: "var(--accent-gold)", fontFamily: "var(--font-serif)", fontSize: 24, margin: 0 }}>
                Commencez par créer un dossier relationnel
              </h2>
              <p className="editorial-body" style={{ margin: 0, maxWidth: 560 }}>
                Chaque dossier représente une relation importante dans votre vie.
                Il centralise vos observations, vos ressentis et vos analyses.
                Plus vous le remplissez, plus L&apos;Autre Rive peut vous aider.
              </p>
              <button className="internal-button-primary" onClick={openCreateForm} style={dashboardButtonStyle} type="button">
                + Créer mon premier dossier
              </button>
            </div>
          ) : null}
        </SystemPanel>

        {dossiers.length ? (
          <SystemPanel ariaLabel="Contrôles des dossiers" compact style={{ marginBottom: 6, padding: "7px 10px" }}>
            <SystemGrid gap={8} min={220}>
              <label style={dashboardFieldStyle}>
                <span className="label-meta">Filtre par statut</span>
                <select className="internal-control" onChange={(event) => setStatusFilter(event.target.value)} style={compactControlStyle} value={statusFilter}>
                  <option value="Tous">Tous</option>
                  {statutOptions.map((option) => (
                    <option key={option} value={option}>{option}</option>
                  ))}
                </select>
              </label>
              <label style={dashboardFieldStyle}>
                <span className="label-meta">Tri par</span>
                <select className="internal-control" onChange={(event) => setSortBy(event.target.value as DossierSort)} style={compactControlStyle} value={sortBy}>
                  <option value="date">Date de création</option>
                  <option value="nom">Nom</option>
                  <option value="completion">Complétion</option>
                </select>
              </label>
            </SystemGrid>
          </SystemPanel>
        ) : null}

        {dossiers.length ? (
          <div
            style={{
              display: "grid",
              gap: 8,
              gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
              marginBottom: 0,
              paddingBottom: 0,
            }}
          >
            {displayedDossiers.map((dossier) => {
              const completion = calculateCompletion(dossier);
              const derniereInteraction = dossier.derniereInteraction?.trim()
                ? formatDisplayDate(dossier.derniereInteraction)
                : "Aucune interaction";
              const indicatorBadges = [
                ["Clarté", dossier.niveauClarte],
                ["Réciprocité", dossier.niveauReciprocite],
                ["Sécurité", dossier.niveauSecurite],
              ] as const;

              return (
              <article className="chapter-card" key={dossier.id} style={{ display: "grid", gap: 6, marginBottom: 0, padding: "9px 10px 7px" }}>
                <div style={{ alignItems: "center", display: "flex", gap: 8, justifyContent: "space-between", minWidth: 0 }}>
                  <h2
                    style={{
                      color: "var(--text-main)",
                      fontFamily: "var(--font-serif)",
                      fontSize: 18,
                      lineHeight: 1.1,
                      margin: 0,
                      minWidth: 0,
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {dossier.nom}
                  </h2>
                  <span style={compactStatusBadgeStyle}>{dossier.statut}</span>
                </div>

                <p className="label-meta" style={{ lineHeight: 1.25, margin: 0 }}>
                  Créé le {formatDisplayDate(dossier.dateCreation)} · Dernière interaction : {derniereInteraction}
                </p>

                {dossier.typeRelation?.trim() ? (
                  <p className="label-meta" style={{ lineHeight: 1.2, margin: 0 }}>
                    Type : {dossier.typeRelation}
                  </p>
                ) : null}

                <div style={{ alignItems: "center", display: "grid", gap: 7, gridTemplateColumns: "minmax(0, 1fr) 34px" }}>
                  <div style={{ background: "rgba(255,255,255,.06)", borderRadius: 999, height: 4, maxWidth: "78%", overflow: "hidden", width: "100%" }}>
                    <div style={{ background: completionColor(completion), height: "100%", width: `${completion}%` }} />
                  </div>
                  <span
                    className="label-meta"
                    style={{ alignItems: "center", display: "inline-flex", fontSize: 10.5, justifyContent: "flex-end", lineHeight: 1, margin: 0, textAlign: "right", whiteSpace: "nowrap" }}
                  >
                    {completion}%
                  </span>
                </div>

                <div style={{ display: "flex", gap: 5, overflow: "hidden", whiteSpace: "nowrap" }}>
                  {indicatorBadges.map(([label, value]) => (
                    <span
                      className="label-meta"
                      key={label}
                      style={compactIndicatorBadgeStyle}
                    >
                      {label} {typeof value === "number" ? `· ${value}/10` : "—"}
                    </span>
                  ))}
                </div>

                <div style={{ alignItems: "center", display: "flex", gap: 6, marginTop: -1 }}>
                  <Link className="internal-button-primary" href={`/autre-rive/dossiers/${dossier.id}`} style={compactDossierButtonStyle}>
                    Voir
                  </Link>
                  <button className="internal-button" onClick={() => openEditForm(dossier)} style={compactDossierButtonStyle} type="button">
                    Modifier
                  </button>
                  <button className="internal-button" onClick={() => setDeleteTarget(dossier)} style={compactDossierButtonStyle} type="button">
                    Supprimer
                  </button>
                </div>
              </article>
            );
            })}
          </div>
        ) : null}

        {successMessage ? (
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
            {successMessage}
          </div>
        ) : null}

        {deleteTarget ? (
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Confirmation de suppression"
            style={{
              alignItems: "center",
              background: "rgba(0,0,0,.62)",
              display: "flex",
              inset: 0,
              justifyContent: "center",
              padding: 20,
              position: "fixed",
              zIndex: 80,
            }}
          >
            <div className="panel" style={{ maxWidth: 360, width: "100%" }}>
              <h2 style={{ color: "var(--text-main)", fontFamily: "var(--font-serif)", fontSize: 20, margin: "0 0 8px" }}>
                Supprimer ce dossier ?
              </h2>
              <p className="editorial-body" style={{ margin: "0 0 14px" }}>{deleteTarget.nom}</p>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                <button className="internal-button-primary" onClick={confirmDelete} style={dashboardButtonStyle} type="button">
                  Confirmer
                </button>
                <button className="internal-button" onClick={() => setDeleteTarget(null)} style={dashboardButtonStyle} type="button">
                  Annuler
                </button>
              </div>
            </div>
          </div>
        ) : null}
      </SystemPageShell>
    </main>
  );
}
