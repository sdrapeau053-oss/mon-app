export type StrateRoute = {
  label: string
  href: string
  description?: string
}

export type StrateUnivers = {
  id: string
  label: string
  icon: string
  color: string
  routes: StrateRoute[]
}

export const STRATE_UNIVERS: StrateUnivers[] = [
  {
    id: 'centre',
    label: 'Centre',
    icon: '⬡',
    color: '#888780',
    routes: [
      { label: 'Accueil', href: '/', description: 'Page principale' },
      { label: 'Dashboard', href: '/dashboard', description: 'Vue globale' },
      { label: 'Centre intelligent', href: '/centre-intelligent', description: 'Hub central' },
      { label: 'Centre de contrôle', href: '/centre-de-controle', description: 'Contrôle général' },
      { label: 'Guide STRATE', href: '/guide-strate', description: 'Documentation interne' },
      { label: 'Sauvegarde', href: '/backup', description: 'Gestion des sauvegardes' },
      { label: 'Profil', href: '/profile', description: 'Mon profil' },
      { label: 'Connexion', href: '/login', description: 'Page de connexion' },
      { label: 'Roadmap', href: '/roadmap', description: 'Vision et objectifs' },
      { label: 'Retour utilisation', href: '/retour-utilisation', description: "Bilan d'usage" },
      { label: 'Consolidation UX', href: '/consolidation-ux', description: 'Amélioration continue' },
    ],
  },
  {
    id: 'manuscrit',
    label: 'Manuscrit',
    icon: '✦',
    color: '#534AB7',
    routes: [
      { label: 'Quartier Général', href: '/heritage-des-silences', description: "Point d'entrée central du livre" },
      { label: 'Manuscrit', href: '/manuscrit', description: 'Vue principale du manuscrit' },
      { label: 'Mon livre', href: '/mon-livre', description: 'Gestion du livre' },
      { label: 'Biographie', href: '/biographie', description: 'Vue des 4 tomes' },
      { label: 'Écrire maintenant', href: '/ecrire-maintenant', description: "Session d'écriture immédiate" },
      { label: 'Atelier', href: '/atelier', description: 'Espace de travail' },
      { label: 'Mission manuscrit', href: '/mission-manuscrit', description: 'Objectifs du manuscrit' },
      { label: 'Structure tome 1', href: '/structure-tome-1', description: 'Architecture du tome 1' },
      { label: 'Paramètres livre', href: '/parametres-livre', description: 'Configuration du livre' },
      { label: 'Pipeline éditorial', href: '/pipeline-editorial', description: 'Flux de production' },
      { label: 'Tableau auteur', href: '/tableau-auteur', description: 'Dashboard autrice' },
      { label: 'Chronologie', href: '/chronologie', description: 'Ligne du temps narrative' },
      { label: 'Timeline', href: '/timeline', description: 'Timeline visuelle' },
      { label: 'Scènes', href: '/scenes', description: 'Gestion des scènes' },
      { label: 'Fragments', href: '/fragments', description: 'Fragments narratifs' },
      { label: 'Mémoires', href: '/memoires', description: 'Archive des mémoires' },
      { label: 'Motifs', href: '/motifs', description: 'Motifs narratifs récurrents' },
      { label: 'Silence', href: '/silence', description: 'Espaces de silence narratif' },
      { label: 'Style DNA', href: '/style-dna', description: 'Empreinte stylistique' },
      { label: 'Lecture', href: '/lecture', description: 'Mode lecture' },
      { label: 'Structure', href: '/structure', description: 'Architecture narrative' },
      { label: 'Synthèses', href: '/syntheses', description: 'Synthèses de chapitres' },
    ],
  },
  {
    id: 'audits',
    label: 'Audits',
    icon: '◈',
    color: '#0F6E56',
    routes: [
      { label: 'Audit', href: '/audit', description: 'Audit général' },
      { label: 'Audit linguistique', href: '/audit-linguistique', description: 'Analyse de la langue' },
      { label: 'Audit répétitions', href: '/audit-repetitions', description: 'Détection des répétitions' },
      { label: 'Audit anti-IA', href: '/audit-anti-ia', description: 'Détecter le style artificiel' },
      { label: 'Audit sur-explication', href: '/audit-sur-explication', description: 'Repérer les longueurs' },
      { label: 'Audit vibration', href: '/audit-vibration', description: 'Qualité vibratoire du texte' },
      { label: 'Audit voix', href: '/audit-voix', description: 'Cohérence de la voix' },
      { label: 'Contrôle éditorial', href: '/controle-editorial', description: 'Validation finale' },
      { label: 'Répétitions', href: '/repetitions', description: 'Visualiser les répétitions' },
      { label: 'Détecteur voix', href: '/detecteur-voix', description: 'Identifier la voix narrative' },
      { label: 'Vue double', href: '/vue-double', description: 'Comparaison de versions' },
      { label: 'Analyze', href: '/analyze', description: 'Analyse rapide' },
      { label: 'Analyser demande', href: '/analyser-demande', description: 'Décoder une demande' },
      { label: 'Résultat', href: '/result', description: "Résultats d'analyse" },
    ],
  },
  {
    id: 'vie',
    label: 'Vie',
    icon: '◎',
    color: '#185FA5',
    routes: [
      { label: 'Life OS', href: '/life-operating-system', description: 'Système de vie complet' },
      { label: 'Vie & Régulation', href: '/vie-regulation', description: 'Espace de régulation' },
      { label: 'Régulation émotionnelle', href: '/regulation-emotionnelle', description: 'Outils émotionnels' },
      { label: 'Clarté mentale', href: '/clarte-mentale', description: 'Espace de clarté' },
      { label: 'Espace intérieur', href: '/espace-interieur', description: 'Intériorité' },
      { label: "Avant d'agir", href: '/avant-agir', description: "Pause avant l'action" },
      { label: 'Après-coup', href: '/apres-coup', description: 'Retour réflexif' },
      { label: 'Daily system', href: '/daily-system', description: 'Routine quotidienne' },
      { label: 'Routines maison', href: '/routines-maison', description: 'Organisation domestique' },
      { label: 'Tâches ménagères', href: '/taches-menageres', description: 'Suivi des tâches' },
      { label: 'Plan crise familial', href: '/plan-crise-familial', description: 'Protocole de crise' },
      { label: 'Famille', href: '/famille', description: 'Espace famille' },
      { label: 'Malika', href: '/malika', description: 'Espace Malika' },
      { label: 'Urgence Malika', href: '/urgence-malika', description: "Protocole d'urgence" },
      { label: 'Aide-mémoire', href: '/aide-memoire', description: 'Notes essentielles' },
    ],
  },
  {
    id: 'relationnel',
    label: 'Relationnel',
    icon: '⟳',
    color: '#993C1D',
    routes: [
      { label: "L'Autre Rive", href: '/autre-rive', description: 'Hub relationnel' },
      { label: 'Dossiers relationnels', href: '/autre-rive/dossiers', description: 'Tous les dossiers' },
      { label: 'Analyse conversation', href: '/autre-rive/analyse-conversation', description: 'Importer et analyser' },
      { label: 'Dynamiques relationnelles', href: '/dynamiques-relationnelles', description: "Vue d'ensemble" },
      { label: 'Patterns', href: '/patterns', description: 'Schémas récurrents' },
      { label: 'Identité & Schémas', href: '/identite-schemas', description: 'Identité relationnelle' },
    ],
  },
  {
    id: 'pertes',
    label: 'Pertes',
    icon: '∿',
    color: '#3C3489',
    routes: [
      { label: 'Pertes humaines', href: '/pertes', description: "Vue d'ensemble" },
      { label: 'Cartographie des pertes', href: '/pertes/cartographie', description: 'Carte visuelle' },
      { label: 'Dossiers de perte', href: '/pertes/dossiers', description: 'Tous les dossiers' },
    ],
  },
  {
    id: 'business',
    label: 'Business',
    icon: '◇',
    color: '#3B6D11',
    routes: [
      { label: 'Business dashboard', href: '/business-dashboard', description: 'Vue globale' },
      { label: 'Freelance', href: '/freelance', description: 'Espace freelance' },
      { label: 'Candidature IA', href: '/freelance-candidature-ia', description: 'Candidatures assistées' },
      { label: 'Candidate', href: '/candidate', description: 'Postuler' },
      { label: 'Missions', href: '/missions', description: 'Toutes les missions' },
    ],
  },
  {
    id: 'outils',
    label: 'Outils IA',
    icon: '⚙',
    color: '#854F0B',
    routes: [
      { label: 'Agent', href: '/agent', description: 'Agent IA principal' },
      { label: 'Deeper', href: '/deeper', description: 'Exploration approfondie' },
      { label: 'Communauté', href: '/communaute', description: 'Espace communautaire' },
      { label: 'Export PDF', href: '/export-pdf', description: 'Générer des exports' },
    ],
  },
]

export const TOUTES_LES_ROUTES = STRATE_UNIVERS.flatMap(u =>
  u.routes.map(r => ({ ...r, univers: u.label }))
)
