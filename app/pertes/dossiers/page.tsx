"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  StatusChip,
  SystemGrid,
  SystemPageShell,
  SystemPanel,
  SystemSectionHeader,
} from "@/components/system-ui";
import { BackLink } from "@/components/ui/back-link";

interface PerteMemoireVivante {
  souvenirs: string[];
  phrases: string[];
  lieux: string[];
  objets: string[];
  ceQuiReste: string[];
}

interface PerteJournalEntry {
  id: string;
  date: string;
  emotion: string;
  intensite: number;
  declencheur?: string;
  texte: string;
}

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
  journal?: PerteJournalEntry[];
  memoireVivante?: PerteMemoireVivante;
  dateCreation: string;
}

type SortOption = "recent" | "ancien" | "intensite-haute" | "intensite-basse";

const STORAGE_KEY = "pertes-humaines-dossiers";

const typePerteOptions = [
  "Tous les types",
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

const dashboardButtonStyle = {
  alignItems: "center",
  borderRadius: 999,
  display: "inline-flex",
  fontSize: 12.5,
  justifyContent: "center",
  lineHeight: 1,
  minHeight: 36,
  padding: "8px 13px",
  textAlign: "center",
  whiteSpace: "nowrap",
} as const;

const dashboardFieldStyle = { display: "grid", gap: 4 } as const;
const dashboardControlStyle = {
  boxSizing: "border-box",
  fontSize: 13,
  minHeight: 36,
  padding: "6px 10px",
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

function formatDateFr(date?: string) {
  if (!date) return "";

  try {
    const parsed = new Date(date);
    if (!Number.isFinite(parsed.getTime())) return date;
    return parsed.toLocaleDateString("fr-CA", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  } catch {
    return date;
  }
}

function sortTimestamp(date: string) {
  const timestamp = new Date(date).getTime();
  return Number.isFinite(timestamp) ? timestamp : 0;
}

function getIntensite(dossier: PerteDossier) {
  return Number.isFinite(dossier.intensiteActuelle) ? Number(dossier.intensiteActuelle) : 0;
}

export default function PertesDossiersPage() {
  const [dossiers, setDossiers] = useState<PerteDossier[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState("Tous les types");
  const [sortOption, setSortOption] = useState<SortOption>("recent");

  useEffect(() => {
    setDossiers(readDossiers());
  }, []);

  const transversale = useMemo(() => {
    if (dossiers.length === 0) return null;

    const withIntensite = dossiers.filter(
      (d) => typeof d.intensiteActuelle === "number" && Number.isFinite(d.intensiteActuelle),
    );
    const intensiteMoyenne =
      withIntensite.length > 0
        ? Math.round((withIntensite.reduce((sum, d) => sum + Number(d.intensiteActuelle), 0) / withIntensite.length) * 10) / 10
        : null;

    const plusIntense =
      withIntensite.length > 0
        ? withIntensite.reduce((max, d) => (Number(d.intensiteActuelle) > Number(max.intensiteActuelle) ? d : max))
        : null;

    const typeCounts: Record<string, number> = {};
    for (const d of dossiers) {
      typeCounts[d.typePerte] = (typeCounts[d.typePerte] || 0) + 1;
    }
    const typesSorted = Object.entries(typeCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3);

    const totalPertesAssociees = dossiers.reduce(
      (sum, d) => sum + (Array.isArray(d.pertesAssociees) ? d.pertesAssociees.length : 0),
      0,
    );

    const totalJournal = dossiers.reduce(
      (sum, d) => sum + (Array.isArray(d.journal) ? d.journal.length : 0),
      0,
    );

    const totalMemoire = dossiers.reduce((sum, d) => {
      if (!d.memoireVivante) return sum;
      const m = d.memoireVivante;
      return (
        sum +
        (Array.isArray(m.souvenirs) ? m.souvenirs.length : 0) +
        (Array.isArray(m.phrases) ? m.phrases.length : 0) +
        (Array.isArray(m.lieux) ? m.lieux.length : 0) +
        (Array.isArray(m.objets) ? m.objets.length : 0) +
        (Array.isArray(m.ceQuiReste) ? m.ceQuiReste.length : 0)
      );
    }, 0);

    return {
      intensiteMoyenne,
      plusIntense,
      totalJournal,
      totalMemoire,
      totalPertesAssociees,
      typesSorted,
    };
  }, [dossiers]);

  const filteredDossiers = useMemo(() => {
    const normalizedSearch = searchQuery.toLocaleLowerCase("fr-CA").trim();

    return dossiers
      .filter((dossier) => {
        const matchesType = typeFilter === "Tous les types" || dossier.typePerte === typeFilter;
        const searchable = [
          dossier.titre,
          dossier.typePerte,
          dossier.personneOuSituation || "",
          dossier.notes || "",
        ]
          .join(" ")
          .toLocaleLowerCase("fr-CA");
        const matchesSearch = !normalizedSearch || searchable.includes(normalizedSearch);
        return matchesType && matchesSearch;
      })
      .sort((first, second) => {
        if (sortOption === "ancien") return sortTimestamp(first.dateCreation) - sortTimestamp(second.dateCreation);
        if (sortOption === "intensite-haute") return getIntensite(second) - getIntensite(first);
        if (sortOption === "intensite-basse") return getIntensite(first) - getIntensite(second);
        return sortTimestamp(second.dateCreation) - sortTimestamp(first.dateCreation);
      });
  }, [dossiers, searchQuery, sortOption, typeFilter]);

  function deleteDossier(id: string) {
    const confirmed = window.confirm("Supprimer cette perte ?");
    if (!confirmed) return;

    const nextDossiers = dossiers.filter((dossier) => dossier.id !== id);
    setDossiers(nextDossiers);
    writeDossiers(nextDossiers);
  }

  return (
    <main className="internal-page">
      <SystemPageShell maxWidth={1180} padding="24px 18px 56px">
        <header className="internal-header" style={{ marginBottom: 18 }}>
          <BackLink href="/pertes" label="Retour aux pertes" />
          <div style={{ alignItems: "end", display: "flex", gap: 14, justifyContent: "space-between", flexWrap: "wrap" }}>
            <div>
              <p className="internal-kicker">Pertes humaines</p>
              <h1 className="internal-title" style={{ fontStyle: "italic", marginBottom: 0 }}>
                Mes pertes
              </h1>
              <p className="internal-subtitle" style={{ marginTop: 8, maxWidth: 660 }}>
                Voir, retrouver et organiser les pertes enregistrées.
              </p>
            </div>
            <Link
              className="internal-button-primary"
              href="/pertes/cartographie"
              style={dashboardButtonStyle}
            >
              + Nouvelle cartographie
            </Link>
          </div>
        </header>

        {dossiers.length === 0 ? (
          <SystemPanel ariaLabel="Aucune perte enregistrée" compact>
            <SystemSectionHeader
              eyebrow="État initial"
              title="Aucune perte enregistrée pour le moment."
            />
            <p className="editorial-body" style={{ margin: "0 0 14px", maxWidth: 560 }}>
              Commencez par créer une première cartographie.
            </p>
            <Link
              className="internal-button-primary"
              href="/pertes/cartographie"
              style={dashboardButtonStyle}
            >
              Commencer une cartographie
            </Link>
          </SystemPanel>
        ) : (
          <>
            {transversale ? (
              <SystemPanel ariaLabel="Vue transversale des dossiers" compact>
                <SystemSectionHeader eyebrow="Lecture globale" title="Vue transversale" />
                <SystemGrid gap={12} min={200}>
                  <article
                    style={{
                      background: "rgba(255,250,238,0.03)",
                      border: "1px solid rgba(201,168,92,0.14)",
                      borderRadius: 12,
                      display: "grid",
                      gap: 5,
                      padding: 14,
                    }}
                  >
                    <p className="label-meta" style={{ margin: 0 }}>Dossiers</p>
                    <strong style={{ color: "var(--accent-gold)", fontFamily: "var(--font-serif)", fontSize: 30, fontWeight: 400 }}>
                      {dossiers.length}
                    </strong>
                    <p style={{ color: "var(--text-muted)", fontSize: 12, margin: 0 }}>
                      perte{dossiers.length > 1 ? "s" : ""} enregistrée{dossiers.length > 1 ? "s" : ""}
                    </p>
                  </article>

                  <article
                    style={{
                      background: "rgba(255,250,238,0.03)",
                      border: "1px solid rgba(201,168,92,0.14)",
                      borderRadius: 12,
                      display: "grid",
                      gap: 5,
                      padding: 14,
                    }}
                  >
                    <p className="label-meta" style={{ margin: 0 }}>Intensité moyenne</p>
                    <strong style={{ color: "var(--accent-gold)", fontFamily: "var(--font-serif)", fontSize: 30, fontWeight: 400 }}>
                      {transversale.intensiteMoyenne !== null ? `${transversale.intensiteMoyenne}/10` : "—"}
                    </strong>
                    <p style={{ color: "var(--text-muted)", fontSize: 12, margin: 0 }}>
                      sur les dossiers évalués
                    </p>
                  </article>

                  <article
                    style={{
                      background: "rgba(255,250,238,0.03)",
                      border: "1px solid rgba(201,168,92,0.14)",
                      borderRadius: 12,
                      display: "grid",
                      gap: 5,
                      padding: 14,
                    }}
                  >
                    <p className="label-meta" style={{ margin: 0 }}>Pertes associées</p>
                    <strong style={{ color: "var(--accent-gold)", fontFamily: "var(--font-serif)", fontSize: 30, fontWeight: 400 }}>
                      {transversale.totalPertesAssociees}
                    </strong>
                    <p style={{ color: "var(--text-muted)", fontSize: 12, margin: 0 }}>
                      au total dans tous les dossiers
                    </p>
                  </article>

                  <article
                    style={{
                      background: "rgba(255,250,238,0.03)",
                      border: "1px solid rgba(201,168,92,0.14)",
                      borderRadius: 12,
                      display: "grid",
                      gap: 5,
                      padding: 14,
                    }}
                  >
                    <p className="label-meta" style={{ margin: 0 }}>Entrées journal</p>
                    <strong style={{ color: "var(--accent-gold)", fontFamily: "var(--font-serif)", fontSize: 30, fontWeight: 400 }}>
                      {transversale.totalJournal}
                    </strong>
                    <p style={{ color: "var(--text-muted)", fontSize: 12, margin: 0 }}>
                      entrée{transversale.totalJournal > 1 ? "s" : ""} au total
                    </p>
                  </article>

                  <article
                    style={{
                      background: "rgba(255,250,238,0.03)",
                      border: "1px solid rgba(201,168,92,0.14)",
                      borderRadius: 12,
                      display: "grid",
                      gap: 5,
                      padding: 14,
                    }}
                  >
                    <p className="label-meta" style={{ margin: 0 }}>Éléments mémoire</p>
                    <strong style={{ color: "var(--accent-gold)", fontFamily: "var(--font-serif)", fontSize: 30, fontWeight: 400 }}>
                      {transversale.totalMemoire}
                    </strong>
                    <p style={{ color: "var(--text-muted)", fontSize: 12, margin: 0 }}>
                      élément{transversale.totalMemoire > 1 ? "s" : ""} de mémoire vivante
                    </p>
                  </article>

                  {transversale.plusIntense ? (
                    <article
                      style={{
                        background: "rgba(201,168,92,0.07)",
                        border: "1px solid rgba(201,168,92,0.22)",
                        borderRadius: 12,
                        display: "grid",
                        gap: 5,
                        padding: 14,
                      }}
                    >
                      <p className="label-meta" style={{ margin: 0 }}>Dossier le plus intense</p>
                      <strong style={{ color: "var(--text-main)", fontFamily: "var(--font-serif)", fontSize: 18, fontWeight: 400, lineHeight: 1.2 }}>
                        {transversale.plusIntense.titre}
                      </strong>
                      <p style={{ color: "var(--text-muted)", fontSize: 12, margin: 0 }}>
                        Intensité {transversale.plusIntense.intensiteActuelle}/10
                      </p>
                    </article>
                  ) : null}
                </SystemGrid>

                {transversale.typesSorted.length > 0 ? (
                  <div style={{ marginTop: 14 }}>
                    <p className="label-meta" style={{ margin: "0 0 8px" }}>Types les plus fréquents</p>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                      {transversale.typesSorted.map(([type, count]) => (
                        <span
                          key={type}
                          style={{
                            background: "rgba(201,168,92,0.10)",
                            border: "1px solid rgba(201,168,92,0.24)",
                            borderRadius: 999,
                            color: "var(--text-soft)",
                            fontSize: 12.5,
                            padding: "6px 12px",
                          }}
                        >
                          {type} <span style={{ color: "var(--accent-gold)", fontWeight: 600 }}>×{count}</span>
                        </span>
                      ))}
                    </div>
                  </div>
                ) : null}
              </SystemPanel>
            ) : null}

            <SystemPanel ariaLabel="Filtres des pertes" compact>
              <SystemGrid gap={10} min={240}>
                <label style={dashboardFieldStyle}>
                  <span className="label-meta">Recherche</span>
                  <input
                    className="internal-control"
                    onChange={(event) => setSearchQuery(event.target.value)}
                    placeholder="Rechercher une perte..."
                    style={dashboardControlStyle}
                    value={searchQuery}
                  />
                </label>
                <label style={dashboardFieldStyle}>
                  <span className="label-meta">Type de perte</span>
                  <select
                    className="internal-control"
                    onChange={(event) => setTypeFilter(event.target.value)}
                    style={dashboardControlStyle}
                    value={typeFilter}
                  >
                    {typePerteOptions.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                </label>
                <label style={dashboardFieldStyle}>
                  <span className="label-meta">Tri</span>
                  <select
                    className="internal-control"
                    onChange={(event) => setSortOption(event.target.value as SortOption)}
                    style={dashboardControlStyle}
                    value={sortOption}
                  >
                    <option value="recent">Plus récent</option>
                    <option value="ancien">Plus ancien</option>
                    <option value="intensite-haute">Intensité élevée</option>
                    <option value="intensite-basse">Intensité faible</option>
                  </select>
                </label>
              </SystemGrid>
              <p className="label-meta" style={{ margin: "10px 0 0" }}>
                {filteredDossiers.length} résultat{filteredDossiers.length > 1 ? "s" : ""} affiché{filteredDossiers.length > 1 ? "s" : ""}
              </p>
            </SystemPanel>

            {filteredDossiers.length === 0 ? (
              <SystemPanel ariaLabel="Aucun résultat" compact>
                <p className="editorial-body" style={{ margin: 0 }}>
                  Aucune perte ne correspond aux filtres actifs.
                </p>
              </SystemPanel>
            ) : (
              <SystemGrid gap={12} min={300}>
                {filteredDossiers.map((dossier) => (
                  <article
                    className="chapter-card"
                    key={dossier.id}
                    style={{
                      display: "grid",
                      gap: 10,
                      marginBottom: 0,
                      padding: 16,
                    }}
                  >
                    <div style={{ display: "flex", gap: 8, justifyContent: "space-between", alignItems: "start" }}>
                      <div style={{ display: "grid", gap: 5, minWidth: 0 }}>
                        <h2
                          style={{
                            color: "var(--text-main)",
                            fontFamily: "var(--font-serif)",
                            fontSize: 21,
                            fontWeight: 400,
                            lineHeight: 1.15,
                            margin: 0,
                          }}
                        >
                          {dossier.titre}
                        </h2>
                        <StatusChip tone="neutral">{dossier.typePerte}</StatusChip>
                      </div>
                      {typeof dossier.intensiteActuelle === "number" ? (
                        <div style={{ textAlign: "right", flexShrink: 0 }}>
                          <p className="label-meta" style={{ margin: "0 0 2px" }}>Intensité</p>
                          <strong style={{ color: "var(--accent-gold)", fontFamily: "var(--font-serif)", fontSize: 24 }}>
                            {dossier.intensiteActuelle}/10
                          </strong>
                        </div>
                      ) : null}
                    </div>

                    <div style={{ display: "grid", gap: 5 }}>
                      {dossier.personneOuSituation ? (
                        <p style={{ color: "var(--text-soft)", fontSize: 13, lineHeight: 1.55, margin: 0 }}>
                          Personne ou situation : {dossier.personneOuSituation}
                        </p>
                      ) : null}
                      {dossier.dateDebut ? (
                        <p style={{ color: "var(--text-soft)", fontSize: 13, lineHeight: 1.55, margin: 0 }}>
                          Date ou période : {dossier.dateDebut}
                        </p>
                      ) : null}
                      <p style={{ color: "var(--text-muted)", fontSize: 12, lineHeight: 1.55, margin: 0 }}>
                        Pertes secondaires : {dossier.pertesSecondaires?.length || 0}
                      </p>
                      <p style={{ color: "var(--text-muted)", fontSize: 12, lineHeight: 1.55, margin: 0 }}>
                        Créée le : {formatDateFr(dossier.dateCreation)}
                      </p>
                    </div>

                    <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 2 }}>
                      <Link
                        className="internal-button-primary"
                        href={`/pertes/dossiers/${dossier.id}`}
                        style={dashboardButtonStyle}
                      >
                        Voir
                      </Link>
                      <button
                        className="internal-button"
                        disabled
                        style={{ ...dashboardButtonStyle, opacity: 0.55 }}
                        type="button"
                      >
                        Modifier · Bientôt disponible
                      </button>
                      <button
                        className="internal-button"
                        onClick={() => deleteDossier(dossier.id)}
                        style={dashboardButtonStyle}
                        type="button"
                      >
                        Supprimer
                      </button>
                    </div>
                  </article>
                ))}
              </SystemGrid>
            )}
          </>
        )}
      </SystemPageShell>
    </main>
  );
}
