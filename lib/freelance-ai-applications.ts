export const FREELANCE_AI_APPLICATIONS_KEY = "freelance-ai-applications";

export const APPLICATION_STATUSES = [
  "À analyser",
  "CV à adapter",
  "Message à rédiger",
  "Envoyé",
  "Suivi à faire",
  "Refusé",
  "Accepté",
] as const;

export type ApplicationStatus = (typeof APPLICATION_STATUSES)[number];

export type AiApplication = {
  company: string;
  date: string;
  description: string;
  id: string;
  language: string;
  linkedinUrl: string;
  nextAction: string;
  note: string;
  requiredSkills: string;
  status: ApplicationStatus;
  title: string;
};

export type LinkedinSkillState = {
  present: boolean;
  priority: boolean;
  toAdd: boolean;
};

export type AiApplicationsStore = {
  applications: AiApplication[];
  skills: Record<string, LinkedinSkillState>;
};

export const ALIGNERR_CRITERIA = {
  mission:
    "Former, évaluer et améliorer les modèles d’intelligence artificielle en fournissant des réponses humaines de haute qualité.",
  competencies: [
    "rédaction de contenu",
    "correction linguistique",
    "évaluation de réponses IA",
    "annotation de données",
    "vérification factuelle",
    "comparaison de résultats",
    "amélioration de prompts",
    "classification d’informations",
    "contrôle qualité linguistique",
    "entraînement des modèles IA",
  ],
  sought: [
    "excellente maîtrise de la langue",
    "pensée critique",
    "attention aux détails",
    "recherche et validation",
    "communication écrite",
    "autonomie",
    "confort avec l’IA",
  ],
};

export const SYLVIE_PROFILE_STRENGTHS = [
  "français langue maternelle",
  "anglais fonctionnel",
  "bilinguisme français/anglais",
  "ghostwriting",
  "réécriture",
  "révision de textes",
  "analyse narrative",
  "rédaction longue forme",
  "projet de livre majeur",
  "17+ années en milieu de santé",
  "observation clinique",
  "pensée critique",
  "documentation rigoureuse",
  "travail autonome",
  "utilisation quotidienne de ChatGPT",
  "expérience avec Claude",
  "développement de projets IA personnels",
  "sensibilité aux nuances humaines du langage",
];

export const LINKEDIN_SKILLS = [
  "Writing",
  "Content Writing",
  "Creative Writing",
  "Professional Writing",
  "Editing",
  "Copy Editing",
  "Proofreading",
  "Storytelling",
  "Ghostwriting",
  "Copywriting",
  "Research",
  "Fact Checking",
  "Critical Thinking",
  "Communication",
  "Prompt Engineering",
  "AI Content Evaluation",
  "AI Training",
  "Quality Assurance",
  "Data Annotation",
  "Language Quality Assurance",
  "French",
  "English",
  "Bilingual Communication",
  "Translation",
  "Analytical Thinking",
  "Problem Solving",
  "Attention to Detail",
  "Documentation",
  "Information Analysis",
];

export const emptyApplication: AiApplication = {
  company: "",
  date: "",
  description: "",
  id: "",
  language: "",
  linkedinUrl: "",
  nextAction: "",
  note: "",
  requiredSkills: "",
  status: "À analyser",
  title: "",
};

export function createEmptyApplication(): AiApplication {
  return {
    ...emptyApplication,
    date: new Date().toLocaleDateString("fr-CA"),
    id: `application-${Date.now()}`,
  };
}

export function createDefaultSkillState(): Record<string, LinkedinSkillState> {
  return LINKEDIN_SKILLS.reduce<Record<string, LinkedinSkillState>>((acc, skill) => {
    acc[skill] = { present: false, priority: false, toAdd: false };
    return acc;
  }, {});
}

function normalizeStatus(value: unknown): ApplicationStatus {
  return APPLICATION_STATUSES.includes(value as ApplicationStatus) ? (value as ApplicationStatus) : "À analyser";
}

function normalizeApplication(value: unknown): AiApplication | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const item = value as Partial<AiApplication>;
  if (typeof item.id !== "string") return null;

  return {
    company: typeof item.company === "string" ? item.company : "",
    date: typeof item.date === "string" ? item.date : "",
    description: typeof item.description === "string" ? item.description : "",
    id: item.id,
    language: typeof item.language === "string" ? item.language : "",
    linkedinUrl: typeof item.linkedinUrl === "string" ? item.linkedinUrl : "",
    nextAction: typeof item.nextAction === "string" ? item.nextAction : "",
    note: typeof item.note === "string" ? item.note : "",
    requiredSkills: typeof item.requiredSkills === "string" ? item.requiredSkills : "",
    status: normalizeStatus(item.status),
    title: typeof item.title === "string" ? item.title : "",
  };
}

function canUseStorage() {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

export function readAiApplicationsStore(): AiApplicationsStore {
  const fallback = { applications: [], skills: createDefaultSkillState() };
  if (!canUseStorage()) return fallback;

  try {
    const raw = localStorage.getItem(FREELANCE_AI_APPLICATIONS_KEY);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw);
    const rawApplications: unknown[] = Array.isArray(parsed?.applications) ? parsed.applications : Array.isArray(parsed) ? parsed : [];
    const rawSkills = parsed?.skills && typeof parsed.skills === "object" ? parsed.skills : {};

    return {
      applications: rawApplications.map(normalizeApplication).filter((item): item is AiApplication => Boolean(item)),
      skills: {
        ...fallback.skills,
        ...rawSkills,
      },
    };
  } catch {
    return fallback;
  }
}

export function saveAiApplicationsStore(store: AiApplicationsStore) {
  if (!canUseStorage()) return;
  localStorage.setItem(FREELANCE_AI_APPLICATIONS_KEY, JSON.stringify(store));
}

export function getAiApplicationNextAction(store = readAiApplicationsStore()) {
  const pending = store.applications.find((application) => !["Refusé", "Accepté"].includes(application.status));
  const prioritySkills = Object.entries(store.skills).filter(([, value]) => value.priority && !value.present);

  if (prioritySkills.length > 0) return `Ajouter ${Math.min(prioritySkills.length, 5)} compétences LinkedIn`;
  if (!pending) return "Adapter ton profil LinkedIn pour Alignerr";
  if (pending.nextAction.trim()) return pending.nextAction.trim();
  if (pending.status === "À analyser") return `Analyser l’offre ${pending.title || pending.company || "ciblée"}`;
  if (pending.status === "CV à adapter") return "Préparer le CV AI Trainer";
  if (pending.status === "Message à rédiger") return "Rédiger le message de candidature";
  if (pending.status === "Envoyé" || pending.status === "Suivi à faire") return "Préparer le suivi de candidature";
  return "Adapter ton profil LinkedIn pour Alignerr";
}

export function getAiApplicationsStats(store = readAiApplicationsStore()) {
  const active = store.applications.filter((application) => !["Refusé", "Accepté"].includes(application.status));
  const statusCounts = store.applications.reduce<Record<string, number>>((acc, application) => {
    acc[application.status] = (acc[application.status] || 0) + 1;
    return acc;
  }, {});
  const mainStatus = active[0]?.status || store.applications[0]?.status || "Aucune candidature";

  return {
    count: store.applications.length,
    mainStatus,
    nextAction: getAiApplicationNextAction(store),
    statusCounts,
  };
}
