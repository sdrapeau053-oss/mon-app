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

const STORAGE_KEY = "pertes-humaines-dossiers";

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
  texte: string;
}

interface OrientationDossier {
  id: string;
  titre: string;
  typePerte: string;
  intensiteActuelle?: number;
  pertesAssociees?: string[];
  timeline?: { id: string }[];
  journal?: PerteJournalEntry[];
  memoireVivante?: PerteMemoireVivante;
  prochaineEtape?: string;
  dateCreation: string;
}

function isOrientationDossier(value: unknown): value is OrientationDossier {
  if (!value || typeof value !== "object") return false;
  const item = value as Partial<OrientationDossier>;
  return (
    typeof item.id === "string" &&
    typeof item.titre === "string" &&
    typeof item.typePerte === "string" &&
    typeof item.dateCreation === "string"
  );
}

function readOrientationDossiers(): OrientationDossier[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.filter(isOrientationDossier) : [];
  } catch {
    return [];
  }
}

function memoireTotal(d: OrientationDossier) {
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

function docTotal(d: OrientationDossier) {
  return (
    (Array.isArray(d.pertesAssociees) ? d.pertesAssociees.length : 0) +
    (Array.isArray(d.timeline) ? d.timeline.length : 0) +
    (Array.isArray(d.journal) ? d.journal.length : 0) +
    memoireTotal(d)
  );
}

function formatDateFrShort(date?: string) {
  if (!date) return "";
  try {
    const parsed = new Date(date);
    if (!Number.isFinite(parsed.getTime())) return "";
    return parsed.toLocaleDateString("fr-CA", { day: "numeric", month: "long", year: "numeric" });
  } catch {
    return "";
  }
}

type ExplorationCard = {
  title: string;
  text: string;
};

const explorationCards: ExplorationCard[] = [
  {
    title: "Deuil d'une personne décédée",
    text: "Quand une personne, un animal ou un être aimé n'est plus là.",
  },
  {
    title: "Deuil d'une personne encore vivante",
    text: "Quand quelqu'un est physiquement présent, mais profondément changé.",
  },
  {
    title: "Deuil du futur",
    text: "Quand un avenir imaginé ne pourra plus exister comme prévu.",
  },
  {
    title: "Deuil relationnel",
    text: "Quand le lien est rompu, transformé ou devenu impossible.",
  },
  {
    title: "Deuil identitaire",
    text: "Quand une perte change la manière dont vous vous reconnaissez.",
  },
  {
    title: "Deuil cumulatif",
    text: "Quand plusieurs pertes se superposent avant d'avoir pu être traversées.",
  },
];

const btnStyle = {
  alignItems: "center",
  borderRadius: 999,
  display: "inline-flex",
  fontSize: 12.5,
  justifyContent: "center",
  lineHeight: 1,
  minHeight: 32,
  padding: "7px 13px",
  textAlign: "center",
  whiteSpace: "nowrap",
} as const;

// kept for backward compat inside recommandation
const actionButtonStyle = btnStyle;

export default function PertesPage() {
  const [dossiers, setDossiers] = useState<OrientationDossier[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    setDossiers(readOrientationDossiers());
    setLoaded(true);
  }, []);

  const orientation = useMemo(() => {
    if (!loaded || dossiers.length === 0) return null;

    // Dossier le plus intense
    const withIntensite = dossiers.filter(
      (d) => typeof d.intensiteActuelle === "number" && Number.isFinite(d.intensiteActuelle),
    );
    const plusIntense =
      withIntensite.length > 0
        ? withIntensite.reduce((max, d) =>
            Number(d.intensiteActuelle) > Number(max.intensiteActuelle) ? d : max,
          )
        : null;

    // Dossiers incomplets (moins de 2 éléments documentés)
    const incomplets = dossiers.filter((d) => docTotal(d) < 2);

    // Dossiers sans prochaine étape
    const sansProchaineEtape = dossiers.filter((d) => !d.prochaineEtape?.trim());

    // Dernière activité — journal le plus récent, puis dateCreation
    let derniereActivite: string | null = null;
    let derniereActiviteLabel = "";
    for (const d of dossiers) {
      if (Array.isArray(d.journal) && d.journal.length > 0) {
        const sorted = [...d.journal].sort(
          (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
        );
        const candidate = sorted[0].date;
        if (!derniereActivite || candidate > derniereActivite) {
          derniereActivite = candidate;
          derniereActiviteLabel = `Entrée journal dans « ${d.titre} »`;
        }
      }
    }
    if (!derniereActivite) {
      const sorted = [...dossiers].sort(
        (a, b) => new Date(b.dateCreation).getTime() - new Date(a.dateCreation).getTime(),
      );
      if (sorted[0]) {
        derniereActivite = sorted[0].dateCreation;
        derniereActiviteLabel = `Dossier créé : « ${sorted[0].titre} »`;
      }
    }

    return {
      derniereActivite,
      derniereActiviteLabel,
      incomplets,
      plusIntense,
      sansProchaineEtape,
      total: dossiers.length,
    };
  }, [dossiers, loaded]);

  const recommandation = useMemo(() => {
    if (!loaded) return null;

    if (dossiers.length === 0) {
      return {
        cta: "/pertes/cartographie",
        ctaLabel: "Commencer une cartographie",
        etape: "Commencer un dossier",
        texte: "Vous n’avez pas encore de dossier. Commencez par nommer ce que vous traversez : donnez-lui un titre, un type, une date ou période.",
        tone: "warning" as const,
      };
    }

    const incomplets = dossiers.filter((d) => docTotal(d) < 2);
    if (incomplets.length > 0) {
      return {
        cta: `/pertes/dossiers/${incomplets[0].id}`,
        ctaLabel: `Enrichir « ${incomplets[0].titre} »`,
        etape: "Enrichir une perte",
        texte: `${incomplets.length > 1 ? `${incomplets.length} dossiers sont encore peu documentés.` : "Un dossier est encore peu documenté."} Ajoutez des pertes associées, des événements ou une entrée journal.`,
        tone: "neutral" as const,
      };
    }

    const intense = dossiers.find(
      (d) => typeof d.intensiteActuelle === "number" && Number(d.intensiteActuelle) >= 7,
    );
    if (intense) {
      return {
        cta: `/pertes/dossiers/${intense.id}`,
        ctaLabel: `Voir les signaux de « ${intense.titre} »`,
        etape: "Lire et comprendre",
        texte: `Le dossier « ${intense.titre} » porte une intensité élevée (${intense.intensiteActuelle}/10). Consultez ses signaux, priorités et ancrages.`,
        tone: "warning" as const,
      };
    }

    if (dossiers.length >= 2) {
      return {
        cta: "/pertes/dossiers",
        ctaLabel: "Voir les tendances",
        etape: "Voir les tendances entre dossiers",
        texte: `Vous avez ${dossiers.length} dossiers. La vue transversale peut faire apparaître des motifs, des regroupements et des signaux communs.`,
        tone: "neutral" as const,
      };
    }

    return {
      cta: "/pertes/dossiers",
      ctaLabel: "Ouvrir mes dossiers",
      etape: "Relire et comprendre",
      texte: "Votre dossier est documenté. Prenez le temps de relire la timeline, le journal et les ancrages pour mieux comprendre ce que vous traversez.",
      tone: "neutral" as const,
    };
  }, [dossiers, loaded]);

  return (
    <main className="internal-page">
      <SystemPageShell maxWidth={1040} padding="18px 18px 44px">

        {/* ── SECTION 1 : Hero compact ─────────────────────────── */}
        <header style={{ marginBottom: 14 }}>
          <BackLink href="/" label="Retour à STRATE" />
          <div style={{ alignItems: "flex-end", display: "flex", flexWrap: "wrap", gap: 12, justifyContent: "space-between", marginTop: 8 }}>
            <div>
              <p className="internal-kicker" style={{ marginBottom: 2 }}>Cartographie intérieure</p>
              <h1 className="internal-title" style={{ fontStyle: "italic", marginBottom: 4 }}>Pertes humaines</h1>
              <p style={{ color: "var(--text-soft)", fontSize: 13, lineHeight: 1.5, margin: 0 }}>
                Comprendre ce que vous traversez, même quand la perte n&apos;a pas de nom.
              </p>
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 7 }}>
              <Link className="internal-button-primary" href="/pertes/cartographie" style={btnStyle}>
                + Nouvelle cartographie
              </Link>
              <Link className="internal-button" href="/pertes/dossiers" style={btnStyle}>
                Voir mes pertes
              </Link>
            </div>
          </div>
        </header>

        {/* ── SECTION 2 : Barre d'état compacte ───────────────── */}
        {orientation ? (
          <div
            style={{
              background: "rgba(255,250,238,0.03)",
              border: "1px solid rgba(201,168,92,0.14)",
              borderRadius: 10,
              display: "flex",
              flexWrap: "wrap",
              gap: 0,
              marginBottom: 12,
              overflow: "hidden",
            }}
          >
            {[
              { label: "Dossiers", value: String(orientation.total), accent: false },
              { label: "Incomplets", value: String(orientation.incomplets.length), accent: orientation.incomplets.length > 0 },
              { label: "Sans étape", value: String(orientation.sansProchaineEtape.length), accent: orientation.sansProchaineEtape.length > 0 },
            ].map((stat, i) => (
              <div
                key={stat.label}
                style={{
                  borderLeft: i > 0 ? "1px solid rgba(201,168,92,0.12)" : undefined,
                  display: "grid",
                  gap: 1,
                  padding: "10px 16px",
                }}
              >
                <span style={{ color: "var(--text-muted)", fontSize: 11, letterSpacing: "0.04em", textTransform: "uppercase" }}>{stat.label}</span>
                <span style={{ color: stat.accent ? "var(--accent-gold)" : "var(--text-soft)", fontFamily: "var(--font-serif)", fontSize: 22, fontWeight: 400 }}>
                  {stat.value}
                </span>
              </div>
            ))}
            {orientation.plusIntense ? (
              <Link
                href={`/pertes/dossiers/${orientation.plusIntense.id}`}
                style={{
                  borderLeft: "1px solid rgba(201,168,92,0.12)",
                  color: "var(--text-main)",
                  display: "grid",
                  flex: 1,
                  gap: 1,
                  minWidth: 140,
                  padding: "10px 16px",
                  textDecoration: "none",
                }}
              >
                <span style={{ color: "var(--text-muted)", fontSize: 11, letterSpacing: "0.04em", textTransform: "uppercase" }}>Plus intense</span>
                <span style={{ color: "var(--accent-gold)", fontSize: 13, lineHeight: 1.3 }}>
                  {orientation.plusIntense.titre}
                  <span style={{ color: "var(--text-muted)", marginLeft: 6 }}>{orientation.plusIntense.intensiteActuelle}/10</span>
                </span>
              </Link>
            ) : null}
            {orientation.derniereActivite ? (
              <div
                style={{
                  borderLeft: "1px solid rgba(201,168,92,0.12)",
                  display: "grid",
                  flex: 1,
                  gap: 1,
                  minWidth: 160,
                  padding: "10px 16px",
                }}
              >
                <span style={{ color: "var(--text-muted)", fontSize: 11, letterSpacing: "0.04em", textTransform: "uppercase" }}>Dernière activité</span>
                <span style={{ color: "var(--text-soft)", fontSize: 12, lineHeight: 1.4 }}>
                  {orientation.derniereActiviteLabel}
                  {formatDateFrShort(orientation.derniereActivite) ? (
                    <span style={{ color: "var(--text-muted)", display: "block", fontSize: 11 }}>
                      {formatDateFrShort(orientation.derniereActivite)}
                    </span>
                  ) : null}
                </span>
              </div>
            ) : null}
          </div>
        ) : loaded && dossiers.length === 0 ? (
          <div
            style={{
              alignItems: "center",
              background: "rgba(201,168,92,0.06)",
              border: "1px solid rgba(201,168,92,0.20)",
              borderRadius: 10,
              display: "flex",
              flexWrap: "wrap",
              gap: 12,
              justifyContent: "space-between",
              marginBottom: 12,
              padding: "12px 16px",
            }}
          >
            <p style={{ color: "var(--text-soft)", fontSize: 13, margin: 0 }}>
              Aucun dossier pour le moment. Créez votre première cartographie.
            </p>
            <Link className="internal-button-primary" href="/pertes/cartographie" style={btnStyle}>
              Commencer
            </Link>
          </div>
        ) : null}

        {/* ── SECTION 3 : Action recommandée (1 ligne compacte) ── */}
        {recommandation ? (
          <div
            style={{
              alignItems: "center",
              background: recommandation.tone === "warning" ? "rgba(201,168,92,0.08)" : "rgba(255,250,238,0.03)",
              border: `1px solid ${recommandation.tone === "warning" ? "rgba(201,168,92,0.26)" : "rgba(201,168,92,0.14)"}`,
              borderRadius: 10,
              display: "flex",
              flexWrap: "wrap",
              gap: 10,
              justifyContent: "space-between",
              marginBottom: 14,
              padding: "10px 14px",
            }}
          >
            <div style={{ alignItems: "center", display: "flex", flexWrap: "wrap", gap: 8, flex: 1, minWidth: 0 }}>
              <StatusChip tone={recommandation.tone}>{recommandation.etape}</StatusChip>
              <span style={{ color: "var(--text-soft)", fontSize: 13, lineHeight: 1.4 }}>
                {recommandation.texte}
              </span>
            </div>
            <Link
              className={recommandation.tone === "warning" ? "internal-button-primary" : "internal-button"}
              href={recommandation.cta}
              style={{ ...btnStyle, flexShrink: 0 }}
            >
              {recommandation.ctaLabel}
            </Link>
          </div>
        ) : null}

        {/* ── SECTION 4 : Orientation — 4 étapes compactes ────── */}
        <section style={{ marginBottom: 16 }}>
          <p className="label-meta" style={{ margin: "0 0 8px" }}>Orientation</p>
          <div style={{ border: "1px solid rgba(201,168,92,0.12)", borderRadius: 10, overflow: "hidden" }}>
            {[
              { cta: "/pertes/cartographie", ctaLabel: "Créer", desc: "Nommez la perte, choisissez un type, situez l'intensité.", etape: "1", titre: "Commencer un dossier" },
              { cta: "/pertes/dossiers", ctaLabel: "Enrichir", desc: "Ajoutez pertes associées, timeline, journal et mémoire.", etape: "2", titre: "Enrichir une perte" },
              { cta: "/pertes/dossiers", ctaLabel: "Relire", desc: "Utilisez Récapitulatif, Priorités et Ancrages pour comprendre.", etape: "3", titre: "Relire et comprendre" },
              { cta: "/pertes/dossiers", ctaLabel: "Analyser", desc: "Explorez tendances, regroupements et signaux entre dossiers.", etape: "4", titre: "Voir les tendances" },
            ].map((bloc, i) => (
              <div
                key={bloc.etape}
                style={{
                  alignItems: "center",
                  borderTop: i > 0 ? "1px solid rgba(201,168,92,0.10)" : undefined,
                  display: "flex",
                  gap: 12,
                  padding: "9px 14px",
                }}
              >
                <span
                  style={{
                    background: "rgba(201,168,92,0.14)",
                    borderRadius: 999,
                    color: "var(--accent-gold)",
                    flexShrink: 0,
                    fontSize: 10.5,
                    fontWeight: 700,
                    padding: "2px 7px",
                  }}
                >
                  {bloc.etape}
                </span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <span style={{ color: "var(--text-main)", fontSize: 13, fontWeight: 500 }}>{bloc.titre}</span>
                  <span style={{ color: "var(--text-muted)", fontSize: 12, marginLeft: 8 }}>{bloc.desc}</span>
                </div>
                <Link
                  className="internal-button"
                  href={bloc.cta}
                  style={{ ...btnStyle, flexShrink: 0, fontSize: 12, minHeight: 28, padding: "5px 11px" }}
                >
                  {bloc.ctaLabel}
                </Link>
              </div>
            ))}
          </div>
        </section>

        {/* ── SECTION 5 : Repères — grille compacte ───────────── */}
        <section style={{ marginBottom: 16 }}>
          <p className="label-meta" style={{ margin: "0 0 8px" }}>Ce module aide à explorer</p>
          <SystemGrid gap={8} min={200}>
            {explorationCards.map((card) => (
              <article
                key={card.title}
                style={{
                  background: "rgba(255,250,238,0.025)",
                  border: "1px solid rgba(201,168,92,0.11)",
                  borderRadius: 9,
                  display: "grid",
                  gap: 4,
                  padding: "10px 12px",
                }}
              >
                <h2 style={{ color: "var(--text-main)", fontSize: 13, fontWeight: 500, lineHeight: 1.3, margin: 0 }}>
                  {card.title}
                </h2>
                <p style={{ color: "var(--text-muted)", fontSize: 12, lineHeight: 1.5, margin: 0 }}>
                  {card.text}
                </p>
              </article>
            ))}
          </SystemGrid>
        </section>

        {/* ── SECTION 6 : Question + disclaimer ───────────────── */}
        <div
          style={{
            borderTop: "1px solid rgba(201,168,92,0.12)",
            display: "grid",
            gap: 6,
            paddingTop: 12,
          }}
        >
          <p style={{ color: "var(--text-soft)", fontSize: 13, fontStyle: "italic", margin: 0 }}>
            Qu&apos;avez-vous réellement perdu ? Le point de départ n&apos;est pas toujours la personne —
            parfois c&apos;est une sécurité, un rôle, un futur ou une version de soi.
          </p>
          <p style={{ color: "var(--text-muted)", fontSize: 11, lineHeight: 1.6, margin: 0 }}>
            Cet outil ne remplace pas un accompagnement professionnel. Il aide à organiser et comprendre votre vécu.
          </p>
        </div>

      </SystemPageShell>
    </main>
  );
}
