"use client";

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import {
  StateTile,
  StatusChip,
  SystemGrid,
  SystemPageShell,
  SystemPanel,
  SystemSectionHeader,
} from "@/components/system-ui";
import { BackLink } from "@/components/ui/back-link";
import {
  ALIGNERR_CRITERIA,
  APPLICATION_STATUSES,
  LINKEDIN_SKILLS,
  SYLVIE_PROFILE_STRENGTHS,
  createDefaultSkillState,
  createEmptyApplication,
  getAiApplicationNextAction,
  readAiApplicationsStore,
  saveAiApplicationsStore,
  type AiApplication,
  type AiApplicationsStore,
  type ApplicationStatus,
  type LinkedinSkillState,
} from "@/lib/freelance-ai-applications";

const MATCH_MATRIX = [
  {
    criterion: "Correction linguistique",
    level: "fort",
    strength: "Révision de textes, ghostwriting, projet littéraire, français langue maternelle.",
  },
  {
    criterion: "Évaluation de réponses IA",
    level: "moyen",
    strength: "Utilisation quotidienne de ChatGPT, expérience avec Claude, pensée critique.",
  },
  {
    criterion: "Annotation de données",
    level: "à renforcer",
    strength: "Documentation rigoureuse, observation clinique, classification d’informations à pratiquer.",
  },
  {
    criterion: "Vérification factuelle",
    level: "moyen",
    strength: "Recherche, validation, rigueur documentaire issue du milieu de santé.",
  },
  {
    criterion: "Communication écrite",
    level: "fort",
    strength: "Rédaction longue forme, ghostwriting, réécriture, analyse narrative.",
  },
  {
    criterion: "Autonomie",
    level: "fort",
    strength: "Travail autonome, développement de projets IA personnels, projet de livre majeur.",
  },
  {
    criterion: "Nuances humaines du langage",
    level: "fort",
    strength: "Sensibilité aux nuances humaines du langage, bilinguisme, révision narrative.",
  },
];

const TEST_PREP = [
  "test de français",
  "test d’anglais",
  "correction de texte",
  "comparaison de réponses IA",
  "vérification factuelle",
  "détection de biais",
  "résumé de texte",
  "annotation de données",
  "classification",
];

const QUALITY_GRID = [
  "exactitude",
  "clarté",
  "consigne respectée",
  "absence de faute",
  "ton adapté",
  "logique",
  "source fiable si nécessaire",
];

const CV_BLOCKS = [
  {
    title: "Titre recommandé",
    text: "Bilingual Writer | AI Content Evaluator | French Language Specialist",
  },
  {
    title: "Résumé professionnel",
    text:
      "Rédactrice bilingue français/anglais fonctionnel, spécialisée en révision, ghostwriting, analyse narrative et évaluation de contenu. Expérience longue en milieu de santé, avec rigueur documentaire, pensée critique, autonomie et utilisation quotidienne d’outils IA.",
  },
  {
    title: "Compétences clés",
    text: "Writing, Editing, Proofreading, AI Content Evaluation, Prompt Evaluation, Fact Checking, French, English, Documentation, Critical Thinking.",
  },
  {
    title: "Projets IA/personnels",
    text: "Développement de projets personnels avec ChatGPT et Claude, structuration d’un projet de livre majeur, analyse de cohérence narrative et linguistique.",
  },
  {
    title: "Portfolio",
    text: "Textes longs, réécriture, extraits éditoriaux, exemples de correction, réponses client et projets narratifs.",
  },
];

const MESSAGE_TEMPLATES = [
  {
    title: "Message LinkedIn court",
    text:
      "Bonjour, je souhaite postuler pour le rôle lié à l’évaluation de contenu IA. Mon profil combine rédaction, révision linguistique, pensée critique, bilinguisme français/anglais et utilisation quotidienne d’outils IA. Je serais heureuse de contribuer à l’amélioration de réponses en français avec rigueur et nuance.",
  },
  {
    title: "Lettre courte",
    text:
      "Je vous propose un profil solide pour un rôle d’AI Content Evaluator / French Language Specialist : français langue maternelle, expérience en rédaction et révision, sens de l’analyse, rigueur documentaire et aisance avec les outils IA. Mon parcours en santé m’a aussi appris l’attention aux détails, la précision et la fiabilité.",
  },
  {
    title: "Réponse à formulaire",
    text:
      "Mon expérience pertinente repose sur la rédaction longue forme, la révision de textes, le ghostwriting, l’analyse narrative, la documentation rigoureuse et l’utilisation quotidienne de ChatGPT et Claude. Je peux évaluer la qualité, la clarté, la cohérence et la nuance de contenus en français.",
  },
  {
    title: "Message de suivi",
    text:
      "Bonjour, je me permets de faire un suivi concernant ma candidature. Je demeure très intéressée par le rôle et disponible pour compléter un test linguistique, une évaluation de réponses IA ou une étape de validation.",
  },
];

function levelTone(level: string) {
  if (level === "fort") return "success" as const;
  if (level === "moyen") return "warning" as const;
  return "neutral" as const;
}

function compactFieldStyle() {
  return { display: "grid", gap: 2 } as const;
}

const compactControlStyle = {
  fontSize: 12,
  minHeight: 26,
  padding: "3px 8px",
} as const;

const compactSmallControlStyle = {
  ...compactControlStyle,
  fontSize: 12,
} as const;

const compactTextareaStyle = {
  fontSize: 12,
  minHeight: 54,
  padding: "4px 8px",
} as const;

const compactSaveButtonStyle = {
  alignSelf: "end",
  fontSize: 11.5,
  minHeight: 25,
  padding: "3px 9px",
} as const;

const compactLabelStyle = {
  fontSize: 10.5,
} as const;

const compactCopyButtonStyle = {
  flex: "1 1 0",
  fontSize: 11.5,
  justifyContent: "center",
  minHeight: 27,
  minWidth: 0,
  padding: "3px 8px",
  textAlign: "center",
} as const;

function createDefaultDraft() {
  return { ...createEmptyApplication(), language: "Français" };
}

function ReferenceAccordion({ children, title }: { children: ReactNode; title: string }) {
  const [open, setOpen] = useState(false);

  return (
    <details
      onToggle={(event) => setOpen(event.currentTarget.open)}
      style={{
        background: "rgba(255,255,255,0.035)",
        border: "1px solid rgba(218, 184, 111, 0.22)",
        borderRadius: 16,
        overflow: "hidden",
      }}
    >
      <summary
        style={{
          alignItems: "center",
          color: "var(--text-main)",
          cursor: "pointer",
          display: "flex",
          fontFamily: "var(--font-serif)",
          fontSize: "1rem",
          fontWeight: 650,
          justifyContent: "space-between",
          listStyle: "none",
          padding: "6px 10px",
        }}
      >
        <span>{title}</span>
        <span aria-hidden="true" style={{ color: "var(--accent-gold)", fontSize: 13 }}>{open ? "▼" : "▶"}</span>
      </summary>
      <div style={{ borderTop: "1px solid rgba(218, 184, 111, 0.14)", padding: 10 }}>{children}</div>
    </details>
  );
}

export default function FreelanceCandidatureIaPage() {
  const [store, setStore] = useState<AiApplicationsStore>({
    applications: [],
    skills: createDefaultSkillState(),
  });
  const [draft, setDraft] = useState<AiApplication>(createDefaultDraft);
  const [copied, setCopied] = useState<"cv" | "letter" | "response" | "">("");
  const [copyError, setCopyError] = useState<"cv" | "letter" | "response" | "">("");
  const copyTimeoutRef = useRef<number | null>(null);
  const nextAction = useMemo(() => getAiApplicationNextAction(store), [store]);
  const globalMatchScore = useMemo(() => {
    const total = MATCH_MATRIX.reduce((sum, item) => {
      if (item.level === "fort") return sum + 100;
      if (item.level === "moyen") return sum + 70;
      return sum + 45;
    }, 0);
    return Math.round(total / MATCH_MATRIX.length);
  }, []);
  const strongestMatches = useMemo(() => MATCH_MATRIX.filter((item) => item.level === "fort").slice(0, 4), []);
  const weakerMatches = useMemo(() => MATCH_MATRIX.filter((item) => item.level !== "fort").slice(0, 3), []);
  const cvText = useMemo(() => CV_BLOCKS.map((block) => `${block.title}\n${block.text}`).join("\n\n"), []);
  const coverLetterText = MESSAGE_TEMPLATES.find((template) => template.title.includes("Lettre"))?.text || MESSAGE_TEMPLATES[1].text;
  const formResponseText = MESSAGE_TEMPLATES.find((template) => template.title.includes("formulaire"))?.text || MESSAGE_TEMPLATES[2].text;

  useEffect(() => {
    const loaded = readAiApplicationsStore();
    setStore(loaded);
  }, []);

  function persist(next: AiApplicationsStore) {
    setStore(next);
    saveAiApplicationsStore(next);
  }

  function updateDraft(key: keyof AiApplication, value: string) {
    setDraft((current) => ({ ...current, [key]: value }));
  }

  function saveApplication() {
    const normalized = {
      ...draft,
      id: draft.id || `application-${Date.now()}`,
      language: draft.language || "Français",
      nextAction: draft.nextAction || "adapter CV",
    };
    const exists = store.applications.some((application) => application.id === normalized.id);
    const applications = exists
      ? store.applications.map((application) => (application.id === normalized.id ? normalized : application))
      : [normalized, ...store.applications];

    persist({ ...store, applications });
    setDraft(createDefaultDraft());
  }

  function editApplication(application: AiApplication) {
    setDraft(application);
  }

  function deleteApplication(id: string) {
    persist({ ...store, applications: store.applications.filter((application) => application.id !== id) });
  }

  function toggleSkill(skill: string, key: keyof LinkedinSkillState) {
    persist({
      ...store,
      skills: {
        ...store.skills,
        [skill]: {
          ...(store.skills[skill] || { present: false, priority: false, toAdd: false }),
          [key]: !(store.skills[skill]?.[key]),
        },
      },
    });
  }

  async function copyText(kind: "cv" | "letter" | "response", text: string) {
    setCopied(kind);
    setCopyError("");
    if (copyTimeoutRef.current) {
      window.clearTimeout(copyTimeoutRef.current);
    }

    try {
      await navigator.clipboard?.writeText(text);
    } catch {
      setCopied("");
      setCopyError(kind);
    } finally {
      copyTimeoutRef.current = window.setTimeout(() => {
        setCopied("");
        setCopyError("");
        copyTimeoutRef.current = null;
      }, 2000);
    }
  }

  return (
    <main className="internal-page">
      <SystemPageShell maxWidth={1120}>
        <header className="internal-header">
          <BackLink label="Business" href="/freelance" />
          <p className="internal-kicker">Freelance</p>
          <h1 className="internal-title">Candidature IA / Alignerr</h1>
          <p className="internal-subtitle">
            Offre d’emploi, profil, CV ciblé, messages, préparation aux tests et suivi au même endroit.
          </p>
        </header>

        <SystemPanel ariaLabel="Tableau de bord candidature" compact>
          <div style={{ alignItems: "start", display: "flex", flexWrap: "wrap", gap: 18 }}>
            <section style={{ flex: "1 1 300px", minWidth: 0 }}>
              <SystemSectionHeader eyebrow="Offre ciblée" title="Candidature du jour" />
              <div style={{ display: "grid", gap: 5 }}>
                <SystemGrid gap={6} min={145}>
                  <label style={compactFieldStyle()}>
                    <span className="label-meta" style={compactLabelStyle}>Entreprise</span>
                    <input className="internal-control" placeholder="Ex. Alignerr" style={compactControlStyle} value={draft.company} onChange={(event) => updateDraft("company", event.target.value)} />
                  </label>
                  <label style={compactFieldStyle()}>
                    <span className="label-meta" style={compactLabelStyle}>Titre du poste</span>
                    <input className="internal-control" placeholder="Ex. AI Content Evaluator" style={compactControlStyle} value={draft.title} onChange={(event) => updateDraft("title", event.target.value)} />
                  </label>
                </SystemGrid>
                <label style={compactFieldStyle()}>
                  <span className="label-meta" style={compactLabelStyle}>Lien LinkedIn</span>
                  <input className="internal-control" placeholder="Lien de l’offre ou du profil" style={compactControlStyle} value={draft.linkedinUrl} onChange={(event) => updateDraft("linkedinUrl", event.target.value)} />
                </label>
                <div style={{ display: "grid", gap: 6, gridTemplateColumns: "repeat(3, minmax(0, 1fr))" }}>
                  <label style={compactFieldStyle()}>
                    <span className="label-meta" style={compactLabelStyle}>Langue demandée</span>
                    <input className="internal-control" style={compactControlStyle} value={draft.language || "Français"} onChange={(event) => updateDraft("language", event.target.value)} />
                  </label>
                  <label style={compactFieldStyle()}>
                    <span className="label-meta" style={compactLabelStyle}>Date</span>
                    <input className="internal-control" style={compactSmallControlStyle} value={draft.date} onChange={(event) => updateDraft("date", event.target.value)} />
                  </label>
                  <label style={compactFieldStyle()}>
                    <span className="label-meta" style={compactLabelStyle}>Statut</span>
                    <select className="internal-control" style={compactSmallControlStyle} value={draft.status} onChange={(event) => updateDraft("status", event.target.value as ApplicationStatus)}>
                      {APPLICATION_STATUSES.map((status) => (
                        <option key={status}>{status}</option>
                      ))}
                    </select>
                  </label>
                </div>
                <button className="internal-button-primary" style={compactSaveButtonStyle} type="button" onClick={saveApplication}>
                  Enregistrer
                </button>
                <div style={{ display: "grid", gap: 5, marginTop: 0 }}>
                  <ReferenceAccordion title="Description du poste">
                    <textarea className="internal-control" placeholder="Collez ici la description complète du poste..." rows={2} style={compactTextareaStyle} value={draft.description} onChange={(event) => updateDraft("description", event.target.value)} />
                  </ReferenceAccordion>
                  <ReferenceAccordion title="Compétences exigées">
                    <textarea className="internal-control" placeholder="Listez les compétences demandées..." rows={2} style={compactTextareaStyle} value={draft.requiredSkills} onChange={(event) => updateDraft("requiredSkills", event.target.value)} />
                  </ReferenceAccordion>
                  <ReferenceAccordion title="Prochaine action et notes">
                    <SystemGrid gap={6} min={145}>
                      <label style={compactFieldStyle()}>
                        <span className="label-meta" style={compactLabelStyle}>Prochaine action</span>
                        <input className="internal-control" placeholder="Ex. Adapter CV et lettre" style={compactControlStyle} value={draft.nextAction} onChange={(event) => updateDraft("nextAction", event.target.value)} />
                      </label>
                      <label style={compactFieldStyle()}>
                        <span className="label-meta" style={compactLabelStyle}>Note</span>
                        <input className="internal-control" placeholder="Note interne" style={compactControlStyle} value={draft.note} onChange={(event) => updateDraft("note", event.target.value)} />
                      </label>
                    </SystemGrid>
                  </ReferenceAccordion>
                </div>
              </div>
            </section>

            <section style={{ flex: "2 1 520px", minWidth: 0 }}>
              <SystemSectionHeader eyebrow="Match offre / profil" title="Résumé de correspondance" />
              <div style={{ alignItems: "stretch", display: "flex", flexWrap: "wrap", gap: 12, marginBottom: 10 }}>
                <div
                  style={{
                    borderRight: "1px solid rgba(218, 184, 111, 0.18)",
                    color: "var(--accent-gold)",
                    flex: "0 1 132px",
                    fontFamily: "var(--font-serif)",
                    fontSize: "clamp(1.3rem, 4.2vw, 2.1rem)",
                    fontWeight: 700,
                    lineHeight: 0.95,
                    paddingRight: 10,
                  }}
                >
                  <span className="label-meta" style={{ color: "var(--text-muted)", display: "block", fontFamily: "var(--font-sans)", fontSize: 11, marginBottom: 6 }}>
                    Score global
                  </span>
                  {globalMatchScore}%
                  <span className="label-meta" style={{ color: "var(--text-muted)", display: "block", fontFamily: "var(--font-sans)", fontSize: 11, marginTop: 5 }}>
                    4 forces · 3 à renforcer
                  </span>
                </div>
                <div className="chapter-card" style={{ flex: "0 1 270px", marginBottom: 0, minWidth: 0, padding: "8px 10px" }}>
                  <p className="editorial-title" style={{ fontSize: ".95rem", margin: "0 0 4px" }}>
                    Action du jour
                  </p>
                  <p className="editorial-body" style={{ fontSize: 12.5, margin: 0 }}>→ {nextAction}</p>
                </div>
              </div>

              <div style={{ alignItems: "center", display: "flex", gap: 8, marginTop: 10, width: "100%" }}>
                <button className="internal-button-primary" style={compactCopyButtonStyle} type="button" onClick={() => copyText("cv", cvText)}>
                  {copyError === "cv" ? "Erreur" : copied === "cv" ? "✓ Copié" : "CV Alignerr"}
                </button>
                <button className="internal-button" style={compactCopyButtonStyle} type="button" onClick={() => copyText("letter", coverLetterText)}>
                  {copyError === "letter" ? "Erreur" : copied === "letter" ? "✓ Copié" : "Lettre Alignerr"}
                </button>
                <button className="internal-button" style={compactCopyButtonStyle} type="button" onClick={() => copyText("response", formResponseText)}>
                  {copyError === "response" ? "Erreur" : copied === "response" ? "✓ Copié" : "Réponse formulaire"}
                </button>
              </div>

              <div style={{ display: "grid", gap: 10, gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 230px), 1fr))", marginTop: 12 }}>
                <article className="chapter-card" style={{ marginBottom: 0, padding: "5px 7px" }}>
                  <h2 style={{ color: "var(--text-main)", fontSize: 12, letterSpacing: ".04em", margin: "0 0 3px", textTransform: "uppercase" }}>Forces</h2>
                  <ul className="editorial-body" style={{ display: "grid", fontSize: 11.5, gap: 1, margin: 0, paddingLeft: 15 }}>
                    {strongestMatches.map((item) => (
                      <li key={item.criterion}>✅ {item.criterion}</li>
                    ))}
                  </ul>
                </article>
                <article className="chapter-card" style={{ marginBottom: 0, padding: "5px 7px" }}>
                  <h2 style={{ color: "var(--text-main)", fontSize: 12, letterSpacing: ".04em", margin: "0 0 3px", textTransform: "uppercase" }}>À renforcer</h2>
                  <ul className="editorial-body" style={{ display: "grid", fontSize: 11.5, gap: 1, margin: 0, paddingLeft: 15 }}>
                    {weakerMatches.map((item) => (
                      <li key={item.criterion}>⚠ {item.criterion}</li>
                    ))}
                  </ul>
                </article>
              </div>
            </section>
          </div>
        </SystemPanel>

        <SystemPanel ariaLabel="Suivi des candidatures" compact>
          <SystemSectionHeader title="Suivi des candidatures" />
          {store.applications.length ? (
            <div style={{ display: "grid", gap: 7 }}>
              {store.applications.map((application) => (
                <article className="chapter-card" key={application.id} style={{ marginBottom: 0, padding: "8px 10px" }}>
                  <div style={{ alignItems: "center", display: "flex", flexWrap: "wrap", gap: 8, justifyContent: "space-between" }}>
                    <div style={{ minWidth: 0 }}>
                      <p className="label-meta" style={{ margin: "0 0 2px" }}>{application.company || "Entreprise"}</p>
                      <h2 style={{ color: "var(--text-main)", fontSize: 14, margin: "0 0 3px" }}>{application.title || "Poste"}</h2>
                      <p className="editorial-body" style={{ fontSize: 12, margin: 0 }}>{application.status} • {application.date || "date n/r"}</p>
                    </div>
                    <StatusChip>{application.status}</StatusChip>
                  </div>
                  <p className="editorial-body" style={{ fontSize: 12.5, margin: "6px 0 0" }}>
                    Action : {application.nextAction || "attendre réponse"}{application.note ? ` · ${application.note}` : ""}
                  </p>
                  <div style={{ alignItems: "center", display: "flex", flexWrap: "wrap", gap: 8, marginTop: 7 }}>
                    <button className="internal-button" style={{ fontSize: 11.5, minHeight: 28, padding: "4px 8px" }} type="button" onClick={() => editApplication(application)}>✏ Modifier</button>
                    <button className="internal-button" style={{ fontSize: 11.5, minHeight: 28, padding: "4px 8px" }} type="button" onClick={() => deleteApplication(application.id)}>🗑 Supprimer</button>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <p className="editorial-body" style={{ margin: 0 }}>Aucune candidature enregistrée pour l’instant.</p>
          )}
        </SystemPanel>

        <section style={{ display: "grid", gap: 14, marginTop: 28 }}>
          <ReferenceAccordion title="Analyse détaillée du match">
            <SystemGrid gap={10} min={190}>
              {MATCH_MATRIX.map((item) => (
                <article className="chapter-card" key={item.criterion} style={{ marginBottom: 0, padding: "9px 10px" }}>
                  <div style={{ alignItems: "center", display: "flex", gap: 8, justifyContent: "space-between" }}>
                    <h2 style={{ color: "var(--text-main)", fontSize: 13.5, margin: 0 }}>{item.criterion}</h2>
                    <StatusChip tone={levelTone(item.level)}>{item.level}</StatusChip>
                  </div>
                  <p className="editorial-body" style={{ fontSize: 12.5, margin: "6px 0 0" }}>{item.strength}</p>
                </article>
              ))}
            </SystemGrid>
          </ReferenceAccordion>

          <ReferenceAccordion title="Profil de Sylvie">
            <div style={{ display: "flex", flexWrap: "wrap", gap: 7 }}>
              {SYLVIE_PROFILE_STRENGTHS.map((strength) => (
                <StatusChip key={strength} tone="success">{strength}</StatusChip>
              ))}
            </div>
          </ReferenceAccordion>

          <ReferenceAccordion title="Critères Alignerr préchargés">
            <p className="editorial-body" style={{ margin: "0 0 12px" }}>{ALIGNERR_CRITERIA.mission}</p>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 7 }}>
              {[...ALIGNERR_CRITERIA.competencies, ...ALIGNERR_CRITERIA.sought].map((item) => (
                <StatusChip key={item}>{item}</StatusChip>
              ))}
            </div>
          </ReferenceAccordion>

          <ReferenceAccordion title="Compétences LinkedIn à afficher">
            <SystemGrid gap={8} min={230}>
              {LINKEDIN_SKILLS.map((skill) => {
                const state = store.skills[skill] || { present: false, priority: false, toAdd: false };
                return (
                  <article className="chapter-card" key={skill} style={{ marginBottom: 0, padding: 10 }}>
                    <p style={{ color: "var(--text-main)", fontSize: 14, fontWeight: 650, margin: "0 0 8px" }}>{skill}</p>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                      {(["present", "toAdd", "priority"] as const).map((key) => (
                        <button
                          className={state[key] ? "internal-button-primary" : "internal-button"}
                          key={key}
                          onClick={() => toggleSkill(skill, key)}
                          style={{ fontSize: 11, minHeight: 28, padding: "5px 8px" }}
                          type="button"
                        >
                          {key === "present" ? "présent" : key === "toAdd" ? "à ajouter" : "prioritaire"}
                        </button>
                      ))}
                    </div>
                  </article>
                );
              })}
            </SystemGrid>
          </ReferenceAccordion>

          <ReferenceAccordion title="CV ciblé">
            <SystemGrid gap={10} min={260}>
              {CV_BLOCKS.map((block) => (
                <StateTile key={block.title} label={block.title} value={block.text} />
              ))}
            </SystemGrid>
          </ReferenceAccordion>

          <ReferenceAccordion title="Messages de candidature">
            <SystemGrid gap={10} min={260}>
              {MESSAGE_TEMPLATES.map((template) => (
                <StateTile key={template.title} label={template.title} value={template.text} />
              ))}
            </SystemGrid>
          </ReferenceAccordion>

          <ReferenceAccordion title="Préparation aux tests">
            <ul className="editorial-body" style={{ display: "grid", gap: 7, margin: 0, paddingLeft: 18 }}>
              {TEST_PREP.map((item) => <li key={item}>{item}</li>)}
            </ul>
          </ReferenceAccordion>

          <ReferenceAccordion title="Avant d’envoyer une réponse">
            <ul className="editorial-body" style={{ display: "grid", gap: 7, margin: 0, paddingLeft: 18 }}>
              {QUALITY_GRID.map((item) => <li key={item}>{item}</li>)}
            </ul>
          </ReferenceAccordion>
        </section>
      </SystemPageShell>
    </main>
  );
}
