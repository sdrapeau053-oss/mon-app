export type UxPole = "Analyse" | "Business" | "Centre" | "Coffre" | "Manuscrit" | "Vie";

export type UxRoute = {
  href: string;
  name: string;
  pole: UxPole;
  role: string;
};

export const UX_ROUTES: UxRoute[] = [
  { href: "/", name: "Accueil", pole: "Centre", role: "Entrée générale" },
  { href: "/centre-intelligent", name: "Aujourd’hui", pole: "Centre", role: "Décision du jour" },
  { href: "/centre-de-controle", name: "Centre de contrôle", pole: "Centre", role: "Vue cockpit" },
  { href: "/ecrire-maintenant", name: "Écrire maintenant", pole: "Centre", role: "Entrée d’écriture" },
  { href: "/mission-manuscrit", name: "Mission manuscrit", pole: "Centre", role: "Choix du chapitre actif" },
  { href: "/guide-strate", name: "Guide", pole: "Centre", role: "Orientation" },
  { href: "/roadmap", name: "Roadmap", pole: "Centre", role: "Pilotage projet" },
  { href: "/timeline", name: "Timeline", pole: "Vie", role: "Journée par moments" },
  { href: "/retour-utilisation", name: "Retour d’utilisation", pole: "Centre", role: "Journal de friction" },
  { href: "/daily-system", name: "Daily System", pole: "Vie", role: "Organisation du jour" },
  { href: "/life-operating-system", name: "Life OS", pole: "Vie", role: "Régulation fonctionnelle" },
  { href: "/routines-maison", name: "Routines maison", pole: "Vie", role: "Routines domestiques" },
  { href: "/taches-menageres", name: "Tâches ménagères", pole: "Vie", role: "Suivi maison" },
  { href: "/malika", name: "Malika", pole: "Vie", role: "Suivi familial" },
  { href: "/urgence-malika", name: "Urgence Malika", pole: "Vie", role: "Priorité familiale" },
  { href: "/plan-crise-familial", name: "Plan crise familial", pole: "Vie", role: "Protocole de crise" },
  { href: "/aide-memoire", name: "Aide-mémoire", pole: "Vie", role: "Repères pratiques" },
  { href: "/manuscrit", name: "Manuscrit", pole: "Manuscrit", role: "Lecture/édition historique" },
  { href: "/structure", name: "Structure", pole: "Manuscrit", role: "Structure générale" },
  { href: "/structure-tome-1", name: "Structure Tome 1", pole: "Manuscrit", role: "Plan directeur" },
  { href: "/fragments", name: "Fragments", pole: "Manuscrit", role: "Fragments narratifs" },
  { href: "/memoires", name: "Mémoires", pole: "Manuscrit", role: "Mémoires narratives" },
  { href: "/chronologie", name: "Chronologie", pole: "Manuscrit", role: "Ordre temporel" },
  { href: "/lecture", name: "Lecture", pole: "Manuscrit", role: "Lecture du tome" },
  { href: "/pipeline-editorial", name: "Pipeline", pole: "Manuscrit", role: "Flux éditorial" },
  { href: "/backup", name: "Backup", pole: "Coffre", role: "Sauvegardes" },
  { href: "/export-pdf", name: "Export PDF", pole: "Coffre", role: "Prévisualisation export" },
  { href: "/style-dna", name: "Style DNA", pole: "Analyse", role: "Analyse stylistique" },
  { href: "/controle-editorial", name: "Contrôle éditorial", pole: "Analyse", role: "Qualité éditoriale" },
  { href: "/silence", name: "Silence narratif", pole: "Analyse", role: "Analyse du silence" },
  { href: "/motifs", name: "Motifs", pole: "Analyse", role: "Motifs narratifs" },
  { href: "/audit", name: "Audit", pole: "Analyse", role: "Audit général" },
  { href: "/audit-voix", name: "Audit voix", pole: "Analyse", role: "Voix narrative" },
  { href: "/audit-linguistique", name: "Audit linguistique", pole: "Analyse", role: "Langue" },
  { href: "/audit-anti-ia", name: "Audit anti-IA", pole: "Analyse", role: "Naturalité" },
  { href: "/audit-sur-explication", name: "Sur-explication", pole: "Analyse", role: "Densité explicative" },
  { href: "/audit-vibration", name: "Vibration", pole: "Analyse", role: "Résonance" },
  { href: "/detecteur-voix", name: "Détecteur voix", pole: "Analyse", role: "Analyse isolée" },
  { href: "/repetitions", name: "Répétitions", pole: "Analyse", role: "Détection répétitions" },
  { href: "/tableau", name: "Tableau", pole: "Analyse", role: "Synthèse manuscrit" },
  { href: "/freelance", name: "Freelance", pole: "Business", role: "Réponses client" },
  { href: "/analyser-demande", name: "Analyser demande", pole: "Business", role: "Clarifier une demande" },
  { href: "/missions", name: "Missions", pole: "Business", role: "Suivi missions" },
  { href: "/missions/[id]", name: "Mission détail", pole: "Business", role: "Détail mission" },
  { href: "/autre-rive", name: "Archives", pole: "Coffre", role: "Archives" },
  { href: "/biographie", name: "Biographie", pole: "Coffre", role: "Ancien accès livre" },
  { href: "/scenes", name: "Scènes", pole: "Manuscrit", role: "Scènes narratives" },
  { href: "/patterns", name: "Patterns", pole: "Analyse", role: "Patterns" },
  { href: "/parametres-livre", name: "Paramètres livre", pole: "Coffre", role: "Configuration livre" },
  { href: "/famille", name: "Famille", pole: "Vie", role: "Module personnel" },
  { href: "/avant-agir", name: "Avant agir", pole: "Vie", role: "Module personnel" },
  { href: "/apres-coup", name: "Après coup", pole: "Vie", role: "Module personnel" },
  { href: "/clarte-mentale", name: "Clarté mentale", pole: "Vie", role: "Module personnel" },
  { href: "/regulation-emotionnelle", name: "Régulation émotionnelle", pole: "Vie", role: "Module personnel" },
  { href: "/dynamiques-relationnelles", name: "Dynamiques relationnelles", pole: "Vie", role: "Module personnel" },
  { href: "/identite-schemas", name: "Identité & schémas", pole: "Vie", role: "Module personnel" },
  { href: "/syntheses", name: "Synthèses", pole: "Vie", role: "Module personnel" },
  { href: "/mon-livre", name: "Mon livre", pole: "Manuscrit", role: "Module livre" },
  { href: "/vie-regulation", name: "Vie & régulation", pole: "Vie", role: "Ancien accès vie" },
];

export const ESSENTIAL_UX_PAGES = [
  { href: "/centre-intelligent", name: "Aujourd’hui", role: "Proposer une seule action prioritaire." },
  { href: "/centre-de-controle", name: "Centre de contrôle", role: "Voir l’état global sans chercher." },
  { href: "/ecrire-maintenant", name: "Écrire maintenant", role: "Écrire avec chapitre, mémoires et continuité au même endroit." },
  { href: "/mission-manuscrit", name: "Mission manuscrit", role: "Comprendre pourquoi ce chapitre est recommandé." },
  { href: "/roadmap", name: "Roadmap", role: "Piloter les blocs du projet." },
  { href: "/guide-strate", name: "Guide", role: "Savoir où aller selon le besoin." },
];

export const ADVANCED_UX_PAGES = [
  { href: "/manuscrit", name: "Manuscrit", usage: "Lecture ou édition avancée du livre." },
  { href: "/structure-tome-1", name: "Structure Tome 1", usage: "Comprendre la courbe, les blocs et les alertes." },
  { href: "/style-dna", name: "Style DNA", usage: "Analyser les tendances stylistiques." },
  { href: "/controle-editorial", name: "Contrôle éditorial", usage: "Lire les signaux de qualité éditoriale." },
  { href: "/silence", name: "Silence", usage: "Vérifier le silence narratif." },
  { href: "/motifs", name: "Motifs", usage: "Observer les motifs dominants et absents." },
  { href: "/chronologie", name: "Chronologie", usage: "Replacer les fragments dans le temps." },
  { href: "/fragments", name: "Fragments", usage: "Travailler la matière narrative brute." },
];

export const ORPHAN_UX_PAGES = [
  {
    name: "Biographie",
    reason: "Ancien accès livre moins relié au flux actuel Écrire maintenant.",
    route: "/biographie",
    suggestion: "Conserver pour l’instant, mais le réserver à l’archive ou à une fusion future.",
  },
  {
    name: "Vie & régulation",
    reason: "Semble recouvrir une partie de Life OS.",
    route: "/vie-regulation",
    suggestion: "Clarifier son rôle avant toute nouvelle évolution.",
  },
  {
    name: "Patterns",
    reason: "Analyse isolée proche de Motifs et Style DNA.",
    route: "/patterns",
    suggestion: "Mieux relier aux pages Analyse ou envisager une fusion future.",
  },
  {
    name: "Scènes",
    reason: "Utile au manuscrit, mais moins visible dans les parcours principaux.",
    route: "/scenes",
    suggestion: "Relier depuis Écrire maintenant ou Structure si l’usage se confirme.",
  },
];

export const UX_FLOWS = [
  { name: "Écrire", steps: ["Aujourd’hui", "Écrire maintenant", "Continuité manuscrit"] },
  { name: "Planifier", steps: ["Roadmap", "Aujourd’hui", "Action du jour"] },
  { name: "Analyser", steps: ["Structure Tome 1", "Style DNA", "Contrôle éditorial"] },
  { name: "Retrouver un souvenir", steps: ["Fragments", "Chronologie", "Écrire maintenant"] },
];

export const UX_OVERLAPS = [
  {
    description: "Trois entrées liées à l’écriture peuvent sembler équivalentes.",
    pages: ["Manuscrit", "Mission Manuscrit", "Écrire Maintenant"],
    recommendation: "Faire d’Écrire maintenant l’entrée principale et réserver les deux autres aux usages avancés.",
    risk: "L’utilisatrice peut hésiter entre écrire, choisir une mission ou ouvrir l’ancien manuscrit.",
  },
  {
    description: "Plusieurs analyses éditoriales se croisent.",
    pages: ["Style DNA", "Contrôle éditorial", "Silence", "Motifs"],
    recommendation: "Conserver, mais les présenter comme outils avancés dans le Guide.",
    risk: "L’analyse peut remplacer l’écriture si ces pages deviennent trop centrales.",
  },
  {
    description: "Les pages Centre ont des rôles proches.",
    pages: ["Centre intelligent", "Centre de contrôle", "Guide"],
    recommendation: "Mettre Aujourd’hui au centre, utiliser le Centre comme cockpit, le Guide comme orientation.",
    risk: "Le pôle Centre peut redevenir un menu au lieu d’un système de décision.",
  },
];

export const UX_OPPORTUNITIES = [
  "Mettre Aujourd’hui au centre du système.",
  "Faire d’Écrire maintenant l’entrée principale manuscrit.",
  "Réserver les audits aux usages avancés.",
  "Limiter les nouveaux modules.",
  "Réduire les clics inutiles.",
  "Améliorer les liens transversaux entre souvenirs, chronologie et écriture.",
];

export function getUxConsolidationStats() {
  const byPole = UX_ROUTES.reduce<Record<UxPole, number>>(
    (acc, route) => {
      acc[route.pole] += 1;
      return acc;
    },
    { Analyse: 0, Business: 0, Centre: 0, Coffre: 0, Manuscrit: 0, Vie: 0 },
  );

  return {
    advanced: ADVANCED_UX_PAGES.length,
    byPole,
    essential: ESSENTIAL_UX_PAGES.length,
    overlaps: UX_OVERLAPS.length,
    totalRoutes: UX_ROUTES.length,
  };
}
