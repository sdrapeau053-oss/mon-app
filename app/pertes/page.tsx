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

const actionButtonStyle = {
  alignItems: "center",
  borderRadius: 999,
  display: "inline-flex",
  fontSize: 13,
  justifyContent: "center",
  lineHeight: 1,
  minHeight: 38,
  padding: "9px 15px",
  textAlign: "center",
  whiteSpace: "nowrap",
} as const;

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
      <SystemPageShell maxWidth={1120} padding="24px 18px 56px">
        <header className="internal-header" style={{ marginBottom: 18 }}>
          <BackLink href="/" label="Retour à STRATE" />
          <p className="internal-kicker">Cartographie intérieure</p>
          <h1 className="internal-title" style={{ fontStyle: "italic" }}>
            Pertes humaines
          </h1>
          <p className="internal-subtitle" style={{ maxWidth: 760 }}>
            Comprendre ce que vous traversez, même quand la perte n&apos;a pas de nom.
          </p>
        </header>

        <SystemPanel ariaLabel="Introduction pertes humaines" compact>
          <div style={{ display: "grid", gap: 18 }}>
            <div style={{ display: "grid", gap: 10, maxWidth: 760 }}>
              <p className="editorial-body" style={{ margin: 0 }}>
                Certaines pertes ne ressemblent pas à un décès.
              </p>
              <p className="editorial-body" style={{ margin: 0 }}>
                Certaines personnes sont encore vivantes, mais quelque chose a déjà disparu.
              </p>
              <p className="editorial-body" style={{ margin: 0 }}>
                Parfois, ce n&apos;est pas une seule perte : c&apos;est une accumulation.
              </p>
            </div>

            <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
              <Link
                className="internal-button-primary"
                href="/pertes/cartographie"
                style={actionButtonStyle}
              >
                Commencer une cartographie
              </Link>
              <Link
                className="internal-button"
                href="/pertes/dossiers"
                style={actionButtonStyle}
              >
                Voir mes pertes
              </Link>
            </div>
          </div>
        </SystemPanel>

        {orientation ? (
          <SystemPanel ariaLabel="Centre d'orientation" compact style={{ marginTop: 18 }}>
            <SystemSectionHeader eyebrow="État actuel" title="Centre d'orientation" />
            <div style={{ display: "grid", gap: 14 }}>

              {/* Compteurs rapides */}
              <SystemGrid gap={10} min={160}>
                <article
                  style={{
                    background: "rgba(255,250,238,0.03)",
                    border: "1px solid rgba(201,168,92,0.14)",
                    borderRadius: 12,
                    display: "grid",
                    gap: 4,
                    padding: 14,
                  }}
                >
                  <p className="label-meta" style={{ margin: 0 }}>Dossiers</p>
                  <strong style={{ color: "var(--accent-gold)", fontFamily: "var(--font-serif)", fontSize: 28, fontWeight: 400 }}>
                    {orientation.total}
                  </strong>
                  <p style={{ color: "var(--text-muted)", fontSize: 12, margin: 0 }}>
                    perte{orientation.total > 1 ? "s" : ""} enregistrée{orientation.total > 1 ? "s" : ""}
                  </p>
                </article>

                <article
                  style={{
                    background: "rgba(255,250,238,0.03)",
                    border: "1px solid rgba(201,168,92,0.14)",
                    borderRadius: 12,
                    display: "grid",
                    gap: 4,
                    padding: 14,
                  }}
                >
                  <p className="label-meta" style={{ margin: 0 }}>Incomplets</p>
                  <strong style={{ color: orientation.incomplets.length > 0 ? "var(--accent-gold)" : "var(--text-muted)", fontFamily: "var(--font-serif)", fontSize: 28, fontWeight: 400 }}>
                    {orientation.incomplets.length}
                  </strong>
                  <p style={{ color: "var(--text-muted)", fontSize: 12, margin: 0 }}>
                    dossier{orientation.incomplets.length > 1 ? "s" : ""} peu documenté{orientation.incomplets.length > 1 ? "s" : ""}
                  </p>
                </article>

                <article
                  style={{
                    background: "rgba(255,250,238,0.03)",
                    border: "1px solid rgba(201,168,92,0.14)",
                    borderRadius: 12,
                    display: "grid",
                    gap: 4,
                    padding: 14,
                  }}
                >
                  <p className="label-meta" style={{ margin: 0 }}>Sans étape</p>
                  <strong style={{ color: orientation.sansProchaineEtape.length > 0 ? "var(--accent-gold)" : "var(--text-muted)", fontFamily: "var(--font-serif)", fontSize: 28, fontWeight: 400 }}>
                    {orientation.sansProchaineEtape.length}
                  </strong>
                  <p style={{ color: "var(--text-muted)", fontSize: 12, margin: 0 }}>
                    sans prochaine étape définie
                  </p>
                </article>

                {orientation.plusIntense ? (
                  <article
                    style={{
                      background: "rgba(201,168,92,0.07)",
                      border: "1px solid rgba(201,168,92,0.24)",
                      borderRadius: 12,
                      display: "grid",
                      gap: 4,
                      padding: 14,
                    }}
                  >
                    <p className="label-meta" style={{ margin: 0 }}>Le plus intense</p>
                    <strong style={{ color: "var(--text-main)", fontFamily: "var(--font-serif)", fontSize: 16, fontWeight: 400, lineHeight: 1.25 }}>
                      {orientation.plusIntense.titre}
                    </strong>
                    <p style={{ color: "var(--text-muted)", fontSize: 12, margin: 0 }}>
                      Intensité {orientation.plusIntense.intensiteActuelle}/10
                    </p>
                  </article>
                ) : null}
              </SystemGrid>

              {/* Dernière activité */}
              {orientation.derniereActivite ? (
                <div
                  style={{
                    background: "rgba(255,250,238,0.025)",
                    border: "1px solid rgba(201,168,92,0.10)",
                    borderRadius: 10,
                    display: "grid",
                    gap: 3,
                    padding: "10px 14px",
                  }}
                >
                  <p className="label-meta" style={{ margin: 0 }}>Dernière activité</p>
                  <p style={{ color: "var(--text-soft)", fontSize: 13, lineHeight: 1.5, margin: 0 }}>
                    {orientation.derniereActiviteLabel}
                    {formatDateFrShort(orientation.derniereActivite) ? (
                      <span style={{ color: "var(--text-muted)", marginLeft: 6 }}>
                        · {formatDateFrShort(orientation.derniereActivite)}
                      </span>
                    ) : null}
                  </p>
                </div>
              ) : null}

              {/* Cartes d'action */}
              <div>
                <p className="label-meta" style={{ margin: "0 0 10px" }}>Actions disponibles</p>
                <SystemGrid gap={10} min={200}>
                  <Link
                    href="/pertes/cartographie"
                    style={{
                      background: "rgba(201,168,92,0.10)",
                      border: "1px solid rgba(201,168,92,0.28)",
                      borderRadius: 12,
                      color: "var(--text-main)",
                      display: "grid",
                      gap: 5,
                      padding: 14,
                      textDecoration: "none",
                    }}
                  >
                    <StatusChip tone="warning">Créer</StatusChip>
                    <p style={{ color: "var(--text-soft)", fontSize: 13, lineHeight: 1.5, margin: 0 }}>
                      Démarrer une nouvelle cartographie de perte.
                    </p>
                  </Link>

                  {orientation.incomplets.length > 0 ? (
                    <Link
                      href={`/pertes/dossiers/${orientation.incomplets[0].id}`}
                      style={{
                        background: "rgba(255,250,238,0.03)",
                        border: "1px solid rgba(201,168,92,0.18)",
                        borderRadius: 12,
                        color: "var(--text-main)",
                        display: "grid",
                        gap: 5,
                        padding: 14,
                        textDecoration: "none",
                      }}
                    >
                      <StatusChip tone="neutral">Continuer</StatusChip>
                      <p style={{ color: "var(--text-soft)", fontSize: 13, lineHeight: 1.5, margin: 0 }}>
                        Reprendre « {orientation.incomplets[0].titre} », encore peu documenté.
                      </p>
                    </Link>
                  ) : null}

                  <Link
                    href="/pertes/dossiers"
                    style={{
                      background: "rgba(255,250,238,0.03)",
                      border: "1px solid rgba(201,168,92,0.18)",
                      borderRadius: 12,
                      color: "var(--text-main)",
                      display: "grid",
                      gap: 5,
                      padding: 14,
                      textDecoration: "none",
                    }}
                  >
                    <StatusChip tone="neutral">Explorer</StatusChip>
                    <p style={{ color: "var(--text-soft)", fontSize: 13, lineHeight: 1.5, margin: 0 }}>
                      Voir tous les dossiers, tendances et regroupements.
                    </p>
                  </Link>

                  {orientation.plusIntense ? (
                    <Link
                      href={`/pertes/dossiers/${orientation.plusIntense.id}`}
                      style={{
                        background: "rgba(255,250,238,0.03)",
                        border: "1px solid rgba(201,168,92,0.18)",
                        borderRadius: 12,
                        color: "var(--text-main)",
                        display: "grid",
                        gap: 5,
                        padding: 14,
                        textDecoration: "none",
                      }}
                    >
                      <StatusChip tone="warning">Signaux</StatusChip>
                      <p style={{ color: "var(--text-soft)", fontSize: 13, lineHeight: 1.5, margin: 0 }}>
                        Ouvrir le dossier le plus intense : « {orientation.plusIntense.titre} ».
                      </p>
                    </Link>
                  ) : null}
                </SystemGrid>
              </div>

            </div>
          </SystemPanel>
        ) : loaded && dossiers.length === 0 ? (
          <SystemPanel ariaLabel="Aucun dossier — orientation" compact style={{ marginTop: 18 }}>
            <SystemSectionHeader eyebrow="Premier pas" title="Par où commencer ?" />
            <p className="editorial-body" style={{ margin: "0 0 14px", maxWidth: 620 }}>
              Vous n&apos;avez pas encore de dossier. Créez une première cartographie pour nommer ce que vous traversez.
            </p>
            <Link className="internal-button-primary" href="/pertes/cartographie" style={actionButtonStyle}>
              Commencer une cartographie
            </Link>
          </SystemPanel>
        ) : null}

        <section style={{ marginTop: 18 }}>
          <SystemSectionHeader eyebrow="Mode d'emploi" title="Guide d'utilisation" />

          {/* Recommandation contextuelle */}
          {recommandation ? (
            <div
              style={{
                background: recommandation.tone === "warning"
                  ? "rgba(201,168,92,0.09)"
                  : "rgba(255,250,238,0.03)",
                border: `1px solid ${recommandation.tone === "warning" ? "rgba(201,168,92,0.30)" : "rgba(201,168,92,0.16)"}`,
                borderRadius: 12,
                display: "grid",
                gap: 10,
                marginBottom: 14,
                padding: 16,
              }}
            >
              <div style={{ alignItems: "center", display: "flex", flexWrap: "wrap", gap: 8, justifyContent: "space-between" }}>
                <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  <StatusChip tone={recommandation.tone}>Recommandé maintenant</StatusChip>
                  <span style={{ color: "var(--text-soft)", fontSize: 13 }}>{recommandation.etape}</span>
                </div>
              </div>
              <p className="editorial-body" style={{ margin: 0, maxWidth: 680 }}>
                {recommandation.texte}
              </p>
              <Link
                className={recommandation.tone === "warning" ? "internal-button-primary" : "internal-button"}
                href={recommandation.cta}
                style={actionButtonStyle}
              >
                {recommandation.ctaLabel}
              </Link>
            </div>
          ) : null}

          {/* 4 blocs permanents */}
          <SystemGrid gap={12} min={250}>
            {[
              {
                cta: "/pertes/cartographie",
                ctaLabel: "Créer un dossier",
                description: "Choisissez un type de perte, nommez ce qui a disparu, situez l'intensité. C'est le point de départ.",
                etape: "1",
                titre: "Commencer un dossier",
              },
              {
                cta: "/pertes/dossiers",
                ctaLabel: "Voir mes dossiers",
                description: "Ajoutez des pertes associées, une timeline, des entrées journal et des éléments de mémoire vivante pour enrichir votre dossier.",
                etape: "2",
                titre: "Enrichir une perte",
              },
              {
                cta: "/pertes/dossiers",
                ctaLabel: "Ouvrir un dossier",
                description: "Utilisez les onglets Récapitulatif, Priorités et Ancrages pour relire votre dossier et mieux comprendre ce que vous traversez.",
                etape: "3",
                titre: "Relire et comprendre",
              },
              {
                cta: "/pertes/dossiers",
                ctaLabel: "Voir les tendances",
                description: "Avec plusieurs dossiers, explorez les tendances récurrentes, les regroupements et les signaux transversaux.",
                etape: "4",
                titre: "Voir les tendances entre dossiers",
              },
            ].map((bloc) => (
              <article
                className="chapter-card"
                key={bloc.etape}
                style={{ display: "grid", gap: 8, marginBottom: 0, padding: 16 }}
              >
                <div style={{ alignItems: "center", display: "flex", gap: 8 }}>
                  <span
                    style={{
                      background: "rgba(201,168,92,0.18)",
                      borderRadius: 999,
                      color: "var(--accent-gold)",
                      fontSize: 11,
                      fontWeight: 700,
                      minWidth: 22,
                      padding: "3px 8px",
                      textAlign: "center",
                    }}
                  >
                    {bloc.etape}
                  </span>
                  <h2
                    style={{
                      color: "var(--text-main)",
                      fontFamily: "var(--font-serif)",
                      fontSize: 18,
                      fontWeight: 400,
                      lineHeight: 1.2,
                      margin: 0,
                    }}
                  >
                    {bloc.titre}
                  </h2>
                </div>
                <p style={{ color: "var(--text-soft)", fontSize: 13, lineHeight: 1.6, margin: 0 }}>
                  {bloc.description}
                </p>
                <Link
                  className="internal-button"
                  href={bloc.cta}
                  style={{ ...actionButtonStyle, justifySelf: "start", marginTop: 4 }}
                >
                  {bloc.ctaLabel}
                </Link>
              </article>
            ))}
          </SystemGrid>
        </section>

        <section style={{ marginTop: 18 }}>
          <SystemSectionHeader
            eyebrow="Repères"
            title="Ce module aide à explorer"
          />
          <SystemGrid gap={12} min={270}>
            {explorationCards.map((card) => (
              <article
                className="chapter-card"
                key={card.title}
                style={{
                  display: "grid",
                  gap: 8,
                  marginBottom: 0,
                  minHeight: 118,
                  padding: 16,
                }}
              >
                <h2
                  style={{
                    color: "var(--text-main)",
                    fontFamily: "var(--font-serif)",
                    fontSize: 19,
                    fontWeight: 400,
                    lineHeight: 1.18,
                    margin: 0,
                  }}
                >
                  {card.title}
                </h2>
                <p
                  style={{
                    color: "var(--text-soft)",
                    fontSize: 13,
                    lineHeight: 1.6,
                    margin: 0,
                  }}
                >
                  {card.text}
                </p>
              </article>
            ))}
          </SystemGrid>
        </section>

        <SystemPanel ariaLabel="Question centrale" compact style={{ marginTop: 18 }}>
          <SystemSectionHeader
            eyebrow="Question centrale"
            title="Qu'avez-vous réellement perdu ?"
          />
          <p className="editorial-body" style={{ margin: 0, maxWidth: 760 }}>
            Le point de départ n&apos;est pas toujours la personne. Parfois, on perd aussi
            une sécurité, un rôle, une époque, un avenir ou une version de soi.
          </p>
        </SystemPanel>

        <p
          style={{
            borderTop: "1px solid rgba(201,168,92,0.14)",
            color: "var(--text-muted)",
            fontSize: 12,
            lineHeight: 1.7,
            margin: "22px 0 0",
            paddingTop: 14,
          }}
        >
          Cet outil ne remplace pas un accompagnement professionnel. Il aide à
          organiser et comprendre votre vécu.
        </p>
      </SystemPageShell>
    </main>
  );
}
