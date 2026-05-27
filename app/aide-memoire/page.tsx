import { BackLink } from "@/components/ui/back-link";
import {
  StateTile,
  SystemGrid,
  SystemPageShell,
  SystemPanel,
  SystemSectionHeader,
} from "@/components/system-ui";

type MemoBlock = {
  title: string;
  steps: string[];
};

const decisions = [
  { need: "Si je suis perdue", action: "ouvrir Life OS" },
  { need: "Si je veux écrire", action: "Structure → Manuscrit" },
  { need: "Si je veux corriger", action: "Pipeline → Audit" },
  { need: "Si j’ai un souvenir", action: "Mémoires" },
  { need: "Si je dois travailler", action: "Daily System / Freelance" },
  { need: "Si je suis saturée", action: "Life OS → Corps" },
];

const memoBlocks: MemoBlock[] = [
  {
    title: "Je veux écrire un chapitre",
    steps: [
      "aller dans Structure",
      "ouvrir le chapitre",
      "lire fonction / danger / mémoires liées",
      "aller dans Manuscrit",
      "écrire le brouillon",
      "revenir dans Audit",
      "corriger",
      "sauvegarder",
    ],
  },
  {
    title: "Je veux corriger un chapitre",
    steps: [
      "ouvrir Pipeline",
      "lancer les audits",
      "lire les notes éditoriales",
      "corriger dans Manuscrit",
      "refaire audit",
      "ne sceller qu’à la fin",
    ],
  },
  {
    title: "Je veux importer des souvenirs",
    steps: [
      "aller dans Mémoires",
      "importer bloc par bloc",
      "vérifier période / statut / chapitre probable",
      "ne jamais écrire directement dans les chapitres",
    ],
  },
  {
    title: "Je veux utiliser Vie & Régulation",
    steps: [
      "ouvrir Life OS",
      "faire Mode rapide",
      "lire Synthèse du jour",
      "faire micro-action",
      "utiliser Corps si surcharge",
    ],
  },
  {
    title: "Je veux savoir quoi faire aujourd’hui",
    steps: [
      "ouvrir Daily System",
      "choisir Ancrage simple ou Journée structurée",
      "faire seulement 3 priorités max",
      "utiliser mode journée difficile si besoin",
    ],
  },
  {
    title: "Je veux développer mon activité",
    steps: [
      "ouvrir Freelance",
      "choisir une action simple",
      "publier une idée centrale",
      "recycler vers Instagram / Facebook / Substack / YouTube / TikTok",
    ],
  },
];

export default function AideMemoirePage() {
  return (
    <main className="internal-page">
      <SystemPageShell maxWidth={980}>
        <header className="internal-header">
          <BackLink label="Système" />
          <p className="internal-kicker">Repères d’usage</p>
          <h1 className="internal-title">Aide-mémoire STRATE</h1>
          <p className="internal-subtitle">Que faire maintenant, selon ton besoin.</p>
        </header>

        <SystemPanel ariaLabel="Que faire maintenant ?">
          <SystemSectionHeader title="Que faire maintenant ?" />
          <SystemGrid gap={10} min={220}>
            {decisions.map((decision) => (
              <StateTile key={decision.need} label={decision.need} value={`→ ${decision.action}`} />
            ))}
          </SystemGrid>
        </SystemPanel>

        <SystemGrid gap={14} min={270}>
          {memoBlocks.map((block) => (
            <SystemPanel ariaLabel={block.title} compact key={block.title}>
              <h2
                className="editorial-title"
                style={{
                  fontSize: "1.02rem",
                  margin: "0 0 12px",
                }}
              >
                {block.title}
              </h2>
              <ol
                style={{
                  color: "#c9bea9",
                  display: "grid",
                  fontSize: "0.9rem",
                  gap: 8,
                  lineHeight: 1.5,
                  margin: 0,
                  paddingLeft: 20,
                }}
              >
                {block.steps.map((step) => (
                  <li key={step}>{step}</li>
                ))}
              </ol>
            </SystemPanel>
          ))}
        </SystemGrid>

        <div style={{ marginTop: 18, opacity: 0.72 }}>
          <SystemPanel ariaLabel="Option future IA">
            <SystemSectionHeader eyebrow="Option future IA" title="Guide IA bientôt disponible" />
            <p className="editorial-body" style={{ margin: 0 }}>
              Plus tard, STRATE pourra te guider selon ta question et ton état du jour.
            </p>
          </SystemPanel>
        </div>
      </SystemPageShell>
    </main>
  );
}
