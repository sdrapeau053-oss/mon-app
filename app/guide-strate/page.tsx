import Link from "next/link";
import {
  SystemGrid,
  SystemPageShell,
  SystemPanel,
  SystemSectionHeader,
} from "@/components/system-ui";
import { BackLink } from "@/components/ui/back-link";

const guideSections = [
  {
    buttons: [{ href: "/ecrire-maintenant", label: "Ouvrir Écrire maintenant" }],
    title: "Je veux écrire mon manuscrit",
    steps: [
      "Lire le chapitre actif.",
      "Consulter les mémoires liées.",
      "Cliquer Focus si nécessaire.",
      "Écrire.",
      "Fermer l’application : la continuité sauvegarde automatiquement la reprise.",
    ],
  },
  {
    buttons: [{ href: "/centre-intelligent", label: "Ouvrir Aujourd’hui" }],
    title: "Je veux savoir quoi faire aujourd’hui",
    steps: [
      "Lire l’action proposée.",
      "Lire pourquoi cette action est recommandée.",
      "Cliquer Commencer.",
      "Ne pas chercher dans les autres modules.",
    ],
  },
  {
    buttons: [{ href: "/ecrire-maintenant", label: "Reprendre maintenant" }],
    title: "Je veux reprendre où j’étais",
    steps: [
      "Lire le panneau de continuité.",
      "Cliquer Reprendre.",
      "Continuer l’écriture.",
    ],
  },
  {
    buttons: [{ href: "/roadmap", label: "Ouvrir Roadmap" }],
    title: "Je veux voir l’état du projet",
    steps: [
      "Vérifier les blocs terminés.",
      "Vérifier les blocs en cours.",
      "Vérifier les priorités.",
      "Consulter les notes.",
    ],
  },
  {
    buttons: [
      { href: "/fragments", label: "Ouvrir Fragments" },
      { href: "/chronologie", label: "Ouvrir Chronologie" },
    ],
    title: "Je veux travailler mes souvenirs",
    steps: [
      "Lire les fragments.",
      "Vérifier les souvenirs disponibles.",
      "Relier au manuscrit si nécessaire.",
      "Ajouter du contenu si besoin.",
    ],
  },
  {
    buttons: [{ href: "/structure-tome-1", label: "Ouvrir Structure Tome 1" }],
    title: "Je veux comprendre la structure du livre",
    steps: [
      "Vérifier la progression.",
      "Observer la courbe émotionnelle.",
      "Vérifier les alertes.",
      "Identifier les zones à renforcer.",
    ],
  },
  {
    buttons: [{ href: "/style-dna", label: "Ouvrir Style DNA" }],
    title: "Je veux analyser mon style",
    steps: [
      "Lire les statistiques.",
      "Observer les écarts.",
      "Vérifier la cohérence globale.",
      "Corriger seulement si nécessaire.",
    ],
  },
  {
    buttons: [
      { href: "/controle-editorial", label: "Contrôle éditorial" },
      { href: "/silence", label: "Silence narratif" },
      { href: "/motifs", label: "Motifs" },
    ],
    title: "Je veux vérifier la qualité éditoriale",
    steps: [
      "Lire les alertes importantes.",
      "Ignorer les détails mineurs.",
      "Corriger uniquement ce qui améliore réellement le texte.",
    ],
  },
  {
    buttons: [
      { href: "/daily-system", label: "Daily System" },
      { href: "/life-operating-system", label: "Life OS" },
    ],
    title: "Je veux organiser ma journée",
    steps: [
      "Vérifier les priorités.",
      "Vérifier l’énergie.",
      "Utiliser Journée difficile si nécessaire.",
      "Faire seulement l’essentiel.",
    ],
  },
  {
    buttons: [{ href: "/centre-intelligent", label: "Retour à Aujourd’hui" }],
    title: "Je suis perdue",
    steps: [
      "Ne pas parcourir toute l’application.",
      "Lire l’action recommandée.",
      "Cliquer Commencer.",
      "Faire uniquement cette action.",
      "Si tu ne sais pas quoi faire, retourne toujours à Aujourd’hui.",
    ],
  },
];

const mapLines = [
  "CENTRE",
  "├── Aujourd’hui",
  "├── Centre de contrôle",
  "├── Guide",
  "├── Roadmap",
  "",
  "MANUSCRIT",
  "├── Écrire maintenant",
  "├── Manuscrit",
  "├── Mission manuscrit",
  "├── Structure Tome 1",
  "├── Fragments",
  "├── Chronologie",
  "",
  "ANALYSE",
  "├── Style DNA",
  "├── Contrôle éditorial",
  "├── Silence narratif",
  "├── Motifs",
  "",
  "VIE",
  "├── Daily System",
  "├── Life Operating System",
  "├── Timeline",
  "",
  "BUSINESS",
  "",
  "COFFRE",
];

export default function GuideStratePage() {
  return (
    <main className="internal-page">
      <SystemPageShell maxWidth={1060}>
        <header className="internal-header">
          <BackLink label="Centre" href="/centre-de-controle" />
          <p className="internal-kicker">Guide</p>
          <h1 className="internal-title">Guide STRATE</h1>
          <p className="internal-subtitle">
            Choisir le bon module selon ce que tu veux faire, sans repasser par tout le menu.
          </p>
        </header>

        <SystemPanel compact>
          <SystemSectionHeader eyebrow="Commencer" title="Que veux-tu faire ?" />
          <p className="editorial-body" style={{ margin: 0 }}>
            Le guide ne décrit pas tout STRATE. Il indique la bonne porte d’entrée selon ton besoin du moment.
          </p>
        </SystemPanel>

        <SystemGrid gap={12} min={280}>
          {guideSections.map((section) => (
            <SystemPanel ariaLabel={section.title} compact key={section.title} style={{ marginBottom: 0 }}>
              <SystemSectionHeader title={section.title} />
              <ol className="editorial-body" style={{ display: "grid", gap: 7, margin: 0, paddingLeft: 18 }}>
                {section.steps.map((step) => (
                  <li key={step}>{step}</li>
                ))}
              </ol>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 12 }}>
                {section.buttons.map((button) => (
                  <Link className="internal-button-primary" href={button.href} key={button.href}>
                    {button.label}
                  </Link>
                ))}
              </div>
            </SystemPanel>
          ))}
        </SystemGrid>

        <SystemPanel compact style={{ marginTop: 14 }}>
          <SystemSectionHeader eyebrow="Carte rapide" title="Architecture de STRATE" />
          <pre
            style={{
              color: "var(--text-soft)",
              fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
              fontSize: 12.5,
              lineHeight: 1.55,
              margin: 0,
              overflowX: "auto",
              whiteSpace: "pre-wrap",
            }}
          >
            {mapLines.join("\n")}
          </pre>
        </SystemPanel>
      </SystemPageShell>
    </main>
  );
}
