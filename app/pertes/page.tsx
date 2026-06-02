"use client";

import Link from "next/link";
import {
  SystemGrid,
  SystemPageShell,
  SystemPanel,
  SystemSectionHeader,
} from "@/components/system-ui";
import { BackLink } from "@/components/ui/back-link";

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
