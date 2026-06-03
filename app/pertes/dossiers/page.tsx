"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  StatusChip,
  SystemGrid,
  SystemPageShell,
  SystemPanel,
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

interface PerteTimelineEvent {
  id: string;
  date?: string;
  titre: string;
  type: string;
  intensite?: number;
  note?: string;
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
  timeline?: PerteTimelineEvent[];
  journal?: PerteJournalEntry[];
  memoireVivante?: PerteMemoireVivante;
  prochaineEtape?: string;
  dateCreation: string;
}

type SortOption = "recent" | "ancien" | "intensite-haute" | "intensite-basse";
type AnalyseTab = "globale" | "tendances" | "regroupements" | "signaux";

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

const cardStyle = {
  background: "rgba(255,250,238,0.03)",
  border: "1px solid rgba(201,168,92,0.14)",
  borderRadius: 10,
  display: "grid",
  gap: 8,
  padding: 10,
} as const;

const STOP_WORDS_FR = new Set([
  "le","la","les","de","du","des","un","une","et","en","à","au","aux",
  "je","tu","il","elle","nous","vous","ils","elles","que","qui","ce","se",
  "sa","son","ses","ma","mon","mes","ta","ton","tes","dans","sur","par",
  "pour","avec","pas","ne","plus","est","sont","était","a","ont","été",
  "j","c","l","d","m","n","s","y","qu","me","te","lui","leur","leurs",
  "aussi","mais","car","donc","or","ni","si","ça","cela","tout","très",
  "bien","même","encore","comme","quand","alors","puis","dont","où",
]);

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
  const [analyseTab, setAnalyseTab] = useState<AnalyseTab>("globale");

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

    return { intensiteMoyenne, plusIntense, totalJournal, totalMemoire, totalPertesAssociees, typesSorted };
  }, [dossiers]);

  const tendances = useMemo(() => {
    if (dossiers.length === 0) return null;

    const pertesSecCounts: Record<string, number> = {};
    for (const d of dossiers) {
      for (const p of (Array.isArray(d.pertesSecondaires) ? d.pertesSecondaires : [])) {
        pertesSecCounts[p] = (pertesSecCounts[p] || 0) + 1;
      }
    }
    const pertesSecTop = Object.entries(pertesSecCounts).sort((a, b) => b[1] - a[1]).slice(0, 5);

    const pertesAssoCounts: Record<string, number> = {};
    for (const d of dossiers) {
      const seen = new Set<string>();
      for (const p of (Array.isArray(d.pertesAssociees) ? d.pertesAssociees : [])) {
        const key = p.toLocaleLowerCase("fr-CA").trim();
        if (key && !seen.has(key)) {
          pertesAssoCounts[key] = (pertesAssoCounts[key] || 0) + 1;
          seen.add(key);
        }
      }
    }
    const pertesAssoTop = Object.entries(pertesAssoCounts)
      .filter(([, count]) => count >= 2)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);

    const wordCounts: Record<string, number> = {};
    for (const d of dossiers) {
      for (const entry of (Array.isArray(d.journal) ? d.journal : [])) {
        const words = entry.texte
          .toLocaleLowerCase("fr-CA")
          .replace(/[^a-zàâäéèêëîïôùûüçœæ\s]/g, " ")
          .split(/\s+/)
          .filter((w) => w.length > 3 && !STOP_WORDS_FR.has(w));
        for (const w of words) {
          wordCounts[w] = (wordCounts[w] || 0) + 1;
        }
      }
    }
    const wordsTop = Object.entries(wordCounts).sort((a, b) => b[1] - a[1]).slice(0, 5);

    const typeIntensiteMap: Record<string, number[]> = {};
    for (const d of dossiers) {
      if (typeof d.intensiteActuelle === "number" && Number.isFinite(d.intensiteActuelle)) {
        if (!typeIntensiteMap[d.typePerte]) typeIntensiteMap[d.typePerte] = [];
        typeIntensiteMap[d.typePerte].push(Number(d.intensiteActuelle));
      }
    }
    const typeIntensite = Object.entries(typeIntensiteMap)
      .map(([type, values]) => ({
        count: values.length,
        moyenne: Math.round((values.reduce((s, v) => s + v, 0) / values.length) * 10) / 10,
        type,
      }))
      .sort((a, b) => b.moyenne - a.moyenne)
      .slice(0, 5);

    const moisCounts: Record<string, number> = {};
    for (const d of dossiers) {
      try {
        const parsed = new Date(d.dateCreation);
        if (!Number.isFinite(parsed.getTime())) continue;
        const key = parsed.toLocaleDateString("fr-CA", { month: "long", year: "numeric" });
        moisCounts[key] = (moisCounts[key] || 0) + 1;
      } catch {
        // date invalide, on ignore
      }
    }
    const moisSorted = Object.entries(moisCounts).sort((a, b) => b[1] - a[1]).slice(0, 6);

    return { moisSorted, pertesAssoTop, pertesSecTop, typeIntensite, wordsTop };
  }, [dossiers]);

  const regroupements = useMemo(() => {
    if (dossiers.length < 2) return null;

    const parTypeMap: Record<string, PerteDossier[]> = {};
    for (const d of dossiers) {
      if (!parTypeMap[d.typePerte]) parTypeMap[d.typePerte] = [];
      parTypeMap[d.typePerte].push(d);
    }
    const groupesParType = Object.entries(parTypeMap)
      .filter(([, list]) => list.length >= 2)
      .sort((a, b) => b[1].length - a[1].length);

    const buckets: { label: string; min: number; max: number; items: PerteDossier[] }[] = [
      { label: "Forte (7–10)", max: 10, min: 7, items: [] },
      { label: "Modérée (4–6)", max: 6, min: 4, items: [] },
      { label: "Douce (1–3)", max: 3, min: 1, items: [] },
    ];
    for (const d of dossiers) {
      if (typeof d.intensiteActuelle !== "number" || !Number.isFinite(d.intensiteActuelle)) continue;
      const v = Number(d.intensiteActuelle);
      for (const bucket of buckets) {
        if (v >= bucket.min && v <= bucket.max) { bucket.items.push(d); break; }
      }
    }
    const groupesParIntensite = buckets.filter((b) => b.items.length >= 2);

    const pertesSecMap: Record<string, PerteDossier[]> = {};
    for (const d of dossiers) {
      for (const p of (Array.isArray(d.pertesSecondaires) ? d.pertesSecondaires : [])) {
        if (!pertesSecMap[p]) pertesSecMap[p] = [];
        pertesSecMap[p].push(d);
      }
    }
    const pertesSecCommunes = Object.entries(pertesSecMap)
      .filter(([, list]) => list.length >= 2)
      .sort((a, b) => b[1].length - a[1].length)
      .slice(0, 5);

    const pertesAssoMap: Record<string, PerteDossier[]> = {};
    for (const d of dossiers) {
      for (const p of (Array.isArray(d.pertesAssociees) ? d.pertesAssociees : [])) {
        const key = p.toLocaleLowerCase("fr-CA").trim();
        if (!key) continue;
        if (!pertesAssoMap[key]) pertesAssoMap[key] = [];
        if (!pertesAssoMap[key].some((x) => x.id === d.id)) pertesAssoMap[key].push(d);
      }
    }
    const pertesAssoCommunes = Object.entries(pertesAssoMap)
      .filter(([, list]) => list.length >= 2)
      .sort((a, b) => b[1].length - a[1].length)
      .slice(0, 5);

    return { groupesParIntensite, groupesParType, pertesAssoCommunes, pertesSecCommunes };
  }, [dossiers]);

  const signaux = useMemo(() => {
    if (dossiers.length === 0) return null;

    function memoireCount(d: PerteDossier) {
      const m = d.memoireVivante;
      if (!m) return 0;
      return (
        (Array.isArray(m.souvenirs) ? m.souvenirs.length : 0) +
        (Array.isArray(m.phrases) ? m.phrases.length : 0) +
        (Array.isArray(m.lieux) ? m.lieux.length : 0) +
        (Array.isArray(m.objets) ? m.objets.length : 0) +
        (Array.isArray(m.ceQuiReste) ? m.ceQuiReste.length : 0)
      );
    }
    function docCount(d: PerteDossier) {
      return (
        (Array.isArray(d.pertesAssociees) ? d.pertesAssociees.length : 0) +
        (Array.isArray(d.timeline) ? d.timeline.length : 0) +
        (Array.isArray(d.journal) ? d.journal.length : 0) +
        memoireCount(d)
      );
    }

    const hauteIntensiteSansAssociees = dossiers.filter(
      (d) =>
        typeof d.intensiteActuelle === "number" &&
        Number(d.intensiteActuelle) >= 7 &&
        (!Array.isArray(d.pertesAssociees) || d.pertesAssociees.length === 0),
    );
    const journalSansMemoire = dossiers.filter(
      (d) => Array.isArray(d.journal) && d.journal.length > 0 && memoireCount(d) === 0,
    );
    const memoireSansProchaineEtape = dossiers.filter(
      (d) => memoireCount(d) > 0 && !d.prochaineEtape?.trim(),
    );
    const sanstimeline = dossiers.filter(
      (d) => !Array.isArray(d.timeline) || d.timeline.length === 0,
    );
    const peuDocumentes = dossiers.filter((d) => docCount(d) === 0);
    const substantielsForteIntensite = dossiers.filter(
      (d) =>
        typeof d.intensiteActuelle === "number" &&
        Number(d.intensiteActuelle) >= 7 &&
        docCount(d) >= 3,
    );

    return {
      hauteIntensiteSansAssociees,
      journalSansMemoire,
      memoireSansProchaineEtape,
      peuDocumentes,
      sanstimeline,
      substantielsForteIntensite,
    };
  }, [dossiers]);

  const filteredDossiers = useMemo(() => {
    const normalizedSearch = searchQuery.toLocaleLowerCase("fr-CA").trim();
    return dossiers
      .filter((dossier) => {
        const matchesType = typeFilter === "Tous les types" || dossier.typePerte === typeFilter;
        const searchable = [dossier.titre, dossier.typePerte, dossier.personneOuSituation || "", dossier.notes || ""]
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

  const hasAnalyse = transversale !== null || tendances !== null || regroupements !== null || signaux !== null;

  const analyseTabs: { key: AnalyseTab; label: string; enabled: boolean }[] = [
    { key: "globale", label: "Vue globale", enabled: transversale !== null },
    { key: "tendances", label: "Tendances", enabled: tendances !== null },
    { key: "regroupements", label: "Regroupements", enabled: regroupements !== null },
    { key: "signaux", label: "Signaux", enabled: signaux !== null },
  ];

  return (
    <main className="internal-page">
      <SystemPageShell maxWidth={1180} padding="24px 18px 56px">
        <header className="internal-header" style={{ marginBottom: 18 }}>
          <BackLink href="/pertes" label="Retour aux pertes" />
          <div style={{ alignItems: "end", display: "flex", flexWrap: "wrap", gap: 14, justifyContent: "space-between" }}>
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
            <p className="label-meta" style={{ margin: "0 0 6px" }}>État initial</p>
            <p style={{ color: "var(--text-main)", fontFamily: "var(--font-serif)", fontSize: 20, fontWeight: 400, margin: "0 0 10px" }}>
              Aucune perte enregistrée pour le moment.
            </p>
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
            {/* ── ANALYSE TRANSVERSALE — onglets ───────────────────── */}
            {hasAnalyse ? (
              <SystemPanel ariaLabel="Analyse transversale" compact>

                {/* Barre d'onglets */}
                <div
                  style={{
                    borderBottom: "1px solid rgba(201,168,92,0.14)",
                    display: "flex",
                    gap: 0,
                    marginBottom: 14,
                    overflowX: "auto",
                  }}
                >
                  {analyseTabs.map(({ key, label, enabled }) => (
                    <button
                      disabled={!enabled}
                      key={key}
                      onClick={() => setAnalyseTab(key)}
                      style={{
                        background: "none",
                        border: "none",
                        borderBottom: analyseTab === key ? "2px solid var(--accent-gold)" : "2px solid transparent",
                        color: !enabled
                          ? "var(--text-muted)"
                          : analyseTab === key
                          ? "var(--accent-gold)"
                          : "var(--text-soft)",
                        cursor: enabled ? "pointer" : "default",
                        fontSize: 12.5,
                        fontWeight: analyseTab === key ? 600 : 400,
                        letterSpacing: "0.03em",
                        marginBottom: -1,
                        opacity: enabled ? 1 : 0.4,
                        padding: "7px 14px",
                        whiteSpace: "nowrap",
                      }}
                      type="button"
                    >
                      {label}
                    </button>
                  ))}
                </div>

                {/* ── Vue globale ── */}
                {analyseTab === "globale" && transversale ? (
                  <>
                    <SystemGrid gap={8} min={160}>
                      {[
                        { label: "Dossiers", value: String(dossiers.length), sub: `perte${dossiers.length > 1 ? "s" : ""} enregistrée${dossiers.length > 1 ? "s" : ""}` },
                        { label: "Intensité moyenne", value: transversale.intensiteMoyenne !== null ? `${transversale.intensiteMoyenne}/10` : "—", sub: "sur les dossiers évalués" },
                        { label: "Pertes associées", value: String(transversale.totalPertesAssociees), sub: "au total" },
                        { label: "Entrées journal", value: String(transversale.totalJournal), sub: `entrée${transversale.totalJournal > 1 ? "s" : ""}` },
                        { label: "Éléments mémoire", value: String(transversale.totalMemoire), sub: `élément${transversale.totalMemoire > 1 ? "s" : ""}` },
                      ].map((stat) => (
                        <article key={stat.label} style={cardStyle}>
                          <p className="label-meta" style={{ margin: 0 }}>{stat.label}</p>
                          <strong style={{ color: "var(--accent-gold)", fontFamily: "var(--font-serif)", fontSize: 26, fontWeight: 400 }}>
                            {stat.value}
                          </strong>
                          <p style={{ color: "var(--text-muted)", fontSize: 11, margin: 0 }}>{stat.sub}</p>
                        </article>
                      ))}
                      {transversale.plusIntense ? (
                        <article style={{ ...cardStyle, background: "rgba(201,168,92,0.07)", border: "1px solid rgba(201,168,92,0.22)" }}>
                          <p className="label-meta" style={{ margin: 0 }}>Le plus intense</p>
                          <strong style={{ color: "var(--text-main)", fontFamily: "var(--font-serif)", fontSize: 16, fontWeight: 400, lineHeight: 1.2 }}>
                            {transversale.plusIntense.titre}
                          </strong>
                          <p style={{ color: "var(--text-muted)", fontSize: 11, margin: 0 }}>
                            Intensité {transversale.plusIntense.intensiteActuelle}/10
                          </p>
                        </article>
                      ) : null}
                    </SystemGrid>
                    {transversale.typesSorted.length > 0 ? (
                      <div style={{ marginTop: 10 }}>
                        <p className="label-meta" style={{ margin: "0 0 6px" }}>Types les plus fréquents</p>
                        <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                          {transversale.typesSorted.map(([type, count]) => (
                            <span
                              key={type}
                              style={{
                                background: "rgba(201,168,92,0.10)",
                                border: "1px solid rgba(201,168,92,0.24)",
                                borderRadius: 999,
                                color: "var(--text-soft)",
                                fontSize: 12,
                                padding: "4px 10px",
                              }}
                            >
                              {type} <span style={{ color: "var(--accent-gold)", fontWeight: 600 }}>×{count}</span>
                            </span>
                          ))}
                        </div>
                      </div>
                    ) : null}
                  </>
                ) : null}

                {/* ── Tendances ── */}
                {analyseTab === "tendances" && tendances ? (
                  <SystemGrid gap={10} min={260}>

                    <article style={cardStyle}>
                      <p className="label-meta" style={{ margin: 0 }}>Pertes secondaires fréquentes</p>
                      {tendances.pertesSecTop.length > 0 ? (
                        <ol style={{ color: "var(--text-soft)", fontSize: 12.5, lineHeight: 1.6, margin: 0, paddingLeft: 16 }}>
                          {tendances.pertesSecTop.map(([label, count]) => (
                            <li key={label}>
                              {label}<span style={{ color: "var(--accent-gold)", fontWeight: 600, marginLeft: 5 }}>×{count}</span>
                            </li>
                          ))}
                        </ol>
                      ) : (
                        <p style={{ color: "var(--text-muted)", fontSize: 12, margin: 0 }}>Pas assez de données.</p>
                      )}
                    </article>

                    <article style={cardStyle}>
                      <p className="label-meta" style={{ margin: 0 }}>Pertes associées récurrentes</p>
                      <p style={{ color: "var(--text-muted)", fontSize: 11, margin: 0 }}>Présentes dans 2 dossiers ou plus</p>
                      {tendances.pertesAssoTop.length > 0 ? (
                        <ol style={{ color: "var(--text-soft)", fontSize: 12.5, lineHeight: 1.6, margin: 0, paddingLeft: 16 }}>
                          {tendances.pertesAssoTop.map(([label, count]) => (
                            <li key={label}>
                              {label}<span style={{ color: "var(--accent-gold)", fontWeight: 600, marginLeft: 5 }}>×{count}</span>
                            </li>
                          ))}
                        </ol>
                      ) : (
                        <p style={{ color: "var(--text-muted)", fontSize: 12, margin: 0 }}>Aucune perte associée ne revient dans plusieurs dossiers.</p>
                      )}
                    </article>

                    <article style={cardStyle}>
                      <p className="label-meta" style={{ margin: 0 }}>Mots fréquents dans le journal</p>
                      {tendances.wordsTop.length > 0 ? (
                        <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                          {tendances.wordsTop.map(([word, count]) => (
                            <span
                              key={word}
                              style={{
                                background: "rgba(201,168,92,0.09)",
                                border: "1px solid rgba(201,168,92,0.20)",
                                borderRadius: 999,
                                color: "var(--text-soft)",
                                fontSize: 12,
                                padding: "4px 9px",
                              }}
                            >
                              {word}<span style={{ color: "var(--accent-gold)", fontWeight: 600, marginLeft: 4 }}>×{count}</span>
                            </span>
                          ))}
                        </div>
                      ) : (
                        <p style={{ color: "var(--text-muted)", fontSize: 12, margin: 0 }}>Pas assez d'entrées journal.</p>
                      )}
                    </article>

                    <article style={cardStyle}>
                      <p className="label-meta" style={{ margin: 0 }}>Intensité moyenne par type</p>
                      {tendances.typeIntensite.length > 0 ? (
                        <div style={{ display: "grid", gap: 7 }}>
                          {tendances.typeIntensite.map(({ type, moyenne, count }) => (
                            <div key={type} style={{ display: "grid", gap: 2 }}>
                              <div style={{ alignItems: "center", display: "flex", gap: 6, justifyContent: "space-between" }}>
                                <span style={{ color: "var(--text-soft)", fontSize: 12, lineHeight: 1.3 }}>{type}</span>
                                <span style={{ color: "var(--accent-gold)", flexShrink: 0, fontSize: 12, fontWeight: 600 }}>
                                  {moyenne}/10
                                  <span style={{ color: "var(--text-muted)", fontWeight: 400, marginLeft: 3 }}>({count})</span>
                                </span>
                              </div>
                              <div style={{ background: "rgba(255,255,255,.06)", borderRadius: 999, height: 3, overflow: "hidden" }}>
                                <div style={{ background: "var(--accent-gold)", height: "100%", opacity: 0.7, width: `${Math.min(10, moyenne) * 10}%` }} />
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p style={{ color: "var(--text-muted)", fontSize: 12, margin: 0 }}>Pas assez de dossiers évalués.</p>
                      )}
                    </article>

                    <article style={cardStyle}>
                      <p className="label-meta" style={{ margin: 0 }}>Dossiers créés par mois</p>
                      {tendances.moisSorted.length > 0 ? (
                        <div style={{ display: "grid", gap: 6 }}>
                          {tendances.moisSorted.map(([mois, count]) => (
                            <div key={mois} style={{ alignItems: "center", display: "flex", gap: 8 }}>
                              <span style={{ color: "var(--text-soft)", fontSize: 12, minWidth: 130 }}>{mois}</span>
                              <div style={{ background: "rgba(255,255,255,.06)", borderRadius: 999, flex: 1, height: 4, overflow: "hidden" }}>
                                <div style={{ background: "var(--accent-gold)", height: "100%", opacity: 0.65, width: `${(count / dossiers.length) * 100}%` }} />
                              </div>
                              <span style={{ color: "var(--accent-gold)", flexShrink: 0, fontSize: 12, fontWeight: 600 }}>{count}</span>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p style={{ color: "var(--text-muted)", fontSize: 12, margin: 0 }}>Pas assez de données.</p>
                      )}
                    </article>

                  </SystemGrid>
                ) : null}

                {/* ── Regroupements ── */}
                {analyseTab === "regroupements" && regroupements ? (
                  <SystemGrid gap={10} min={260}>

                    <article style={cardStyle}>
                      <p className="label-meta" style={{ margin: 0 }}>Groupes par type de perte</p>
                      {regroupements.groupesParType.length > 0 ? (
                        <div style={{ display: "grid", gap: 8 }}>
                          {regroupements.groupesParType.map(([type, list]) => (
                            <div key={type} style={{ borderTop: "1px solid rgba(201,168,92,0.10)", paddingTop: 6 }}>
                              <div style={{ alignItems: "center", display: "flex", gap: 6, justifyContent: "space-between", marginBottom: 5 }}>
                                <span style={{ color: "var(--text-soft)", fontSize: 12.5, fontWeight: 500 }}>{type}</span>
                                <span style={{ background: "rgba(201,168,92,0.15)", borderRadius: 999, color: "var(--accent-gold)", fontSize: 10.5, fontWeight: 600, padding: "2px 7px" }}>
                                  {list.length} dossier{list.length > 1 ? "s" : ""}
                                </span>
                              </div>
                              <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
                                {list.map((d) => (
                                  <span key={d.id} style={{ background: "rgba(255,250,238,0.04)", border: "1px solid rgba(201,168,92,0.18)", borderRadius: 7, color: "var(--text-soft)", fontSize: 11.5, padding: "3px 8px" }}>
                                    {d.titre}
                                    {typeof d.intensiteActuelle === "number" ? (
                                      <span style={{ color: "var(--text-muted)", marginLeft: 4 }}>{d.intensiteActuelle}/10</span>
                                    ) : null}
                                  </span>
                                ))}
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p style={{ color: "var(--text-muted)", fontSize: 12, margin: 0 }}>Aucun type partagé entre plusieurs dossiers.</p>
                      )}
                    </article>

                    <article style={cardStyle}>
                      <p className="label-meta" style={{ margin: 0 }}>Groupes par intensité</p>
                      {regroupements.groupesParIntensite.length > 0 ? (
                        <div style={{ display: "grid", gap: 8 }}>
                          {regroupements.groupesParIntensite.map((bucket) => (
                            <div key={bucket.label} style={{ borderTop: "1px solid rgba(201,168,92,0.10)", paddingTop: 6 }}>
                              <div style={{ alignItems: "center", display: "flex", gap: 6, justifyContent: "space-between", marginBottom: 5 }}>
                                <span style={{ color: "var(--text-soft)", fontSize: 12.5, fontWeight: 500 }}>{bucket.label}</span>
                                <span style={{ background: "rgba(201,168,92,0.15)", borderRadius: 999, color: "var(--accent-gold)", fontSize: 10.5, fontWeight: 600, padding: "2px 7px" }}>
                                  {bucket.items.length} dossier{bucket.items.length > 1 ? "s" : ""}
                                </span>
                              </div>
                              <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
                                {bucket.items.map((d) => (
                                  <span key={d.id} style={{ background: "rgba(255,250,238,0.04)", border: "1px solid rgba(201,168,92,0.18)", borderRadius: 7, color: "var(--text-soft)", fontSize: 11.5, padding: "3px 8px" }}>
                                    {d.titre}
                                  </span>
                                ))}
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p style={{ color: "var(--text-muted)", fontSize: 12, margin: 0 }}>Pas assez de dossiers évalués pour former des groupes.</p>
                      )}
                    </article>

                    <article style={cardStyle}>
                      <p className="label-meta" style={{ margin: 0 }}>Pertes secondaires communes</p>
                      {regroupements.pertesSecCommunes.length > 0 ? (
                        <div style={{ display: "grid", gap: 8 }}>
                          {regroupements.pertesSecCommunes.map(([label, list]) => (
                            <div key={label} style={{ borderTop: "1px solid rgba(201,168,92,0.10)", paddingTop: 6 }}>
                              <div style={{ alignItems: "center", display: "flex", gap: 6, justifyContent: "space-between", marginBottom: 5 }}>
                                <span style={{ color: "var(--text-soft)", fontSize: 12.5, fontWeight: 500 }}>{label}</span>
                                <span style={{ background: "rgba(201,168,92,0.15)", borderRadius: 999, color: "var(--accent-gold)", fontSize: 10.5, fontWeight: 600, padding: "2px 7px" }}>
                                  {list.length} dossier{list.length > 1 ? "s" : ""}
                                </span>
                              </div>
                              <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
                                {list.map((d) => (
                                  <span key={d.id} style={{ background: "rgba(255,250,238,0.04)", border: "1px solid rgba(201,168,92,0.18)", borderRadius: 7, color: "var(--text-soft)", fontSize: 11.5, padding: "3px 8px" }}>
                                    {d.titre}
                                  </span>
                                ))}
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p style={{ color: "var(--text-muted)", fontSize: 12, margin: 0 }}>Aucune perte secondaire partagée entre plusieurs dossiers.</p>
                      )}
                    </article>

                    <article style={cardStyle}>
                      <p className="label-meta" style={{ margin: 0 }}>Pertes associées similaires</p>
                      {regroupements.pertesAssoCommunes.length > 0 ? (
                        <div style={{ display: "grid", gap: 8 }}>
                          {regroupements.pertesAssoCommunes.map(([label, list]) => (
                            <div key={label} style={{ borderTop: "1px solid rgba(201,168,92,0.10)", paddingTop: 6 }}>
                              <div style={{ alignItems: "center", display: "flex", gap: 6, justifyContent: "space-between", marginBottom: 5 }}>
                                <span style={{ color: "var(--text-soft)", fontSize: 12.5, fontWeight: 500, textTransform: "capitalize" }}>{label}</span>
                                <span style={{ background: "rgba(201,168,92,0.15)", borderRadius: 999, color: "var(--accent-gold)", fontSize: 10.5, fontWeight: 600, padding: "2px 7px" }}>
                                  {list.length} dossier{list.length > 1 ? "s" : ""}
                                </span>
                              </div>
                              <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
                                {list.map((d) => (
                                  <span key={d.id} style={{ background: "rgba(255,250,238,0.04)", border: "1px solid rgba(201,168,92,0.18)", borderRadius: 7, color: "var(--text-soft)", fontSize: 11.5, padding: "3px 8px" }}>
                                    {d.titre}
                                  </span>
                                ))}
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p style={{ color: "var(--text-muted)", fontSize: 12, margin: 0 }}>Aucune perte associée identique dans plusieurs dossiers.</p>
                      )}
                    </article>

                  </SystemGrid>
                ) : null}

                {/* ── Signaux ── */}
                {analyseTab === "signaux" && signaux ? (
                  <SystemGrid gap={10} min={260}>

                    {[
                      {
                        key: "haute",
                        label: "Haute intensité sans pertes nommées",
                        count: signaux.hauteIntensiteSansAssociees.length,
                        accent: signaux.hauteIntensiteSansAssociees.length > 0,
                        items: signaux.hauteIntensiteSansAssociees,
                        renderItem: (d: PerteDossier) => (
                          <Link key={d.id} href={`/pertes/dossiers/${d.id}`} style={{ color: "var(--text-soft)", fontSize: 12.5, lineHeight: 1.4, textDecoration: "none" }}>
                            → {d.titre}<span style={{ color: "var(--text-muted)", marginLeft: 5 }}>Intensité {d.intensiteActuelle}/10</span>
                          </Link>
                        ),
                        empty: "Aucun dossier dans ce cas.",
                      },
                      {
                        key: "journal",
                        label: "Journal actif, mémoire vivante vide",
                        count: signaux.journalSansMemoire.length,
                        accent: false,
                        items: signaux.journalSansMemoire,
                        renderItem: (d: PerteDossier) => (
                          <Link key={d.id} href={`/pertes/dossiers/${d.id}`} style={{ color: "var(--text-soft)", fontSize: 12.5, lineHeight: 1.4, textDecoration: "none" }}>
                            → {d.titre}<span style={{ color: "var(--text-muted)", marginLeft: 5 }}>{d.journal?.length} entrée{(d.journal?.length ?? 0) > 1 ? "s" : ""}</span>
                          </Link>
                        ),
                        empty: "Aucun dossier dans ce cas.",
                      },
                      {
                        key: "memoire",
                        label: "Mémoire active, étape manquante",
                        count: signaux.memoireSansProchaineEtape.length,
                        accent: false,
                        items: signaux.memoireSansProchaineEtape,
                        renderItem: (d: PerteDossier) => (
                          <Link key={d.id} href={`/pertes/dossiers/${d.id}`} style={{ color: "var(--text-soft)", fontSize: 12.5, lineHeight: 1.4, textDecoration: "none" }}>
                            → {d.titre}
                          </Link>
                        ),
                        empty: "Aucun dossier dans ce cas.",
                      },
                      {
                        key: "timeline",
                        label: "Sans timeline",
                        count: signaux.sanstimeline.length,
                        accent: false,
                        items: signaux.sanstimeline.slice(0, 6),
                        renderItem: (d: PerteDossier) => (
                          <Link key={d.id} href={`/pertes/dossiers/${d.id}`} style={{ color: "var(--text-soft)", fontSize: 12.5, lineHeight: 1.4, textDecoration: "none" }}>
                            → {d.titre}
                          </Link>
                        ),
                        empty: "Tous les dossiers ont une timeline.",
                      },
                      {
                        key: "peu",
                        label: "Très peu documentés",
                        count: signaux.peuDocumentes.length,
                        accent: false,
                        sub: "Aucune perte associée, timeline, journal ni mémoire",
                        items: signaux.peuDocumentes,
                        renderItem: (d: PerteDossier) => (
                          <Link key={d.id} href={`/pertes/dossiers/${d.id}`} style={{ color: "var(--text-soft)", fontSize: 12.5, lineHeight: 1.4, textDecoration: "none" }}>
                            → {d.titre}
                          </Link>
                        ),
                        empty: "Aucun dossier dans ce cas.",
                      },
                      {
                        key: "substantiel",
                        label: "Substantiels à forte intensité",
                        count: signaux.substantielsForteIntensite.length,
                        accent: signaux.substantielsForteIntensite.length > 0,
                        sub: "3+ éléments documentés et intensité ≥ 7/10",
                        items: signaux.substantielsForteIntensite,
                        renderItem: (d: PerteDossier) => (
                          <Link key={d.id} href={`/pertes/dossiers/${d.id}`} style={{ color: "var(--text-soft)", fontSize: 12.5, lineHeight: 1.4, textDecoration: "none" }}>
                            → {d.titre}<span style={{ color: "var(--text-muted)", marginLeft: 5 }}>Intensité {d.intensiteActuelle}/10</span>
                          </Link>
                        ),
                        empty: "Aucun dossier dans ce cas.",
                      },
                    ].map((signal) => (
                      <article
                        key={signal.key}
                        style={{
                          ...cardStyle,
                          background: signal.accent ? "rgba(201,168,92,0.07)" : cardStyle.background,
                          border: signal.accent ? "1px solid rgba(201,168,92,0.28)" : cardStyle.border,
                        }}
                      >
                        <div style={{ alignItems: "center", display: "flex", gap: 6, justifyContent: "space-between" }}>
                          <p className="label-meta" style={{ margin: 0 }}>{signal.label}</p>
                          <span style={{ background: "rgba(201,168,92,0.18)", borderRadius: 999, color: "var(--accent-gold)", fontSize: 10.5, fontWeight: 700, padding: "2px 7px" }}>
                            {signal.count}
                          </span>
                        </div>
                        {"sub" in signal && signal.sub ? (
                          <p style={{ color: "var(--text-muted)", fontSize: 11, lineHeight: 1.4, margin: 0 }}>{signal.sub}</p>
                        ) : null}
                        {signal.items.length > 0 ? (
                          <div style={{ display: "grid", gap: 4 }}>
                            {signal.items.map((d) => signal.renderItem(d))}
                          </div>
                        ) : (
                          <p style={{ color: "var(--text-muted)", fontSize: 12, margin: 0 }}>{signal.empty}</p>
                        )}
                      </article>
                    ))}

                  </SystemGrid>
                ) : null}

              </SystemPanel>
            ) : null}

            {/* ── FILTRES ──────────────────────────────────────────── */}
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
                      <option key={option} value={option}>{option}</option>
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

            {/* ── LISTE DES DOSSIERS ───────────────────────────────── */}
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
                    style={{ display: "grid", gap: 10, marginBottom: 0, padding: 16 }}
                  >
                    <div style={{ alignItems: "start", display: "flex", gap: 8, justifyContent: "space-between" }}>
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
                        <div style={{ flexShrink: 0, textAlign: "right" }}>
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
