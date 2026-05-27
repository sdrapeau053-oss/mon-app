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

interface PipelineCard {
  label: string;
  count: number;
  trend: "up" | "down" | "stable";
}

interface RevenueData {
  objectif: number;
  confirme: number;
  potentiel: number;
}

interface WeeklyScore {
  candidatures: number;
  prospects: number;
  reponses: number;
  contrats: number;
}

interface PriorityActions {
  freelance: string;
  prospection: string;
  candidature: string;
}

interface RecentActivity {
  id: string;
  date: string;
  type: "candidature" | "prospect" | "client" | "revenu" | "note";
  text: string;
}

interface BusinessDashboardData {
  pipeline: PipelineCard[];
  revenue: RevenueData;
  weekly: WeeklyScore;
  actions: PriorityActions;
  activities: RecentActivity[];
}

const STORAGE_KEY = "business-dashboard";
const ACTIONS_STORAGE_KEY = "business-actions";
const AI_APPLICATIONS_STORAGE_KEY = "freelance-ai-applications";

const defaultData: BusinessDashboardData = {
  pipeline: [
    { label: "Prospects actifs", count: 0, trend: "stable" },
    { label: "Candidatures envoyées", count: 0, trend: "stable" },
    { label: "Réponses reçues", count: 0, trend: "stable" },
    { label: "Entretiens", count: 0, trend: "stable" },
    { label: "Contrats obtenus", count: 0, trend: "stable" },
  ],
  revenue: {
    objectif: 2000,
    confirme: 0,
    potentiel: 0,
  },
  weekly: {
    candidatures: 0,
    prospects: 0,
    reponses: 0,
    contrats: 0,
  },
  actions: {
    freelance: "Faire une action client",
    prospection: "Contacter un prospect",
    candidature: "Envoyer ou suivre une candidature",
  },
  activities: [],
};

const activityTypes: RecentActivity["type"][] = ["candidature", "prospect", "client", "revenu", "note"];

const quickLinks = [
  { href: "/freelance-candidature-ia", label: "Candidature IA", exists: true },
  { href: "/freelance", label: "Freelance", exists: true },
  { href: "/linkedin", label: "LinkedIn", exists: false },
  { href: "/centre-de-controle", label: "Centre de contrôle", exists: true },
  { href: "/daily-system", label: "Daily System", exists: true },
];

const dashboardButtonStyle = {
  alignItems: "center",
  borderRadius: 999,
  display: "flex",
  fontSize: 12.5,
  justifyContent: "center",
  lineHeight: 1,
  minHeight: 36,
  padding: "7px 11px",
  textAlign: "center",
  whiteSpace: "nowrap",
} as const;

const quickAccessButtonStyle = {
  ...dashboardButtonStyle,
  fontSize: 11.5,
  minHeight: 32,
  padding: "5px 8px",
} as const;

const dashboardFieldStyle = {
  display: "grid",
  gap: 4,
} as const;

const dashboardControlStyle = {
  alignItems: "center",
  boxSizing: "border-box",
  display: "flex",
  fontSize: 13,
  height: 36,
  lineHeight: 1.1,
  padding: "6px 10px",
  width: "100%",
} as const;

const compactNumberStyle = {
  ...dashboardControlStyle,
  fontSize: 15,
  fontWeight: 700,
  maxWidth: 76,
  padding: "4px 8px",
} as const;

const compactSelectStyle = {
  ...dashboardControlStyle,
  fontSize: 11.5,
  height: 28,
  padding: "3px 6px",
  width: 82,
} as const;

function cloneDefaultData(): BusinessDashboardData {
  return {
    ...defaultData,
    actions: { ...defaultData.actions },
    activities: [],
    pipeline: defaultData.pipeline.map((item) => ({ ...item })),
    revenue: { ...defaultData.revenue },
    weekly: { ...defaultData.weekly },
  };
}

function normalizeNumber(value: unknown, fallback = 0) {
  const numberValue = Number(value);
  return Number.isFinite(numberValue) ? numberValue : fallback;
}

function normalizeDashboardData(value: unknown): BusinessDashboardData {
  if (!value || typeof value !== "object") return cloneDefaultData();

  const source = value as Partial<BusinessDashboardData>;
  const fallback = cloneDefaultData();

  return {
    pipeline: fallback.pipeline.map((item, index) => {
      const incoming = Array.isArray(source.pipeline) ? source.pipeline[index] : null;
      const trend = incoming?.trend === "up" || incoming?.trend === "down" || incoming?.trend === "stable" ? incoming.trend : item.trend;

      return {
        label: item.label,
        count: normalizeNumber(incoming?.count, item.count),
        trend,
      };
    }),
    revenue: {
      objectif: normalizeNumber(source.revenue?.objectif, fallback.revenue.objectif),
      confirme: normalizeNumber(source.revenue?.confirme, fallback.revenue.confirme),
      potentiel: normalizeNumber(source.revenue?.potentiel, fallback.revenue.potentiel),
    },
    weekly: {
      candidatures: normalizeNumber(source.weekly?.candidatures, fallback.weekly.candidatures),
      prospects: normalizeNumber(source.weekly?.prospects, fallback.weekly.prospects),
      reponses: normalizeNumber(source.weekly?.reponses, fallback.weekly.reponses),
      contrats: normalizeNumber(source.weekly?.contrats, fallback.weekly.contrats),
    },
    actions: {
      freelance: source.actions?.freelance || fallback.actions.freelance,
      prospection: source.actions?.prospection || fallback.actions.prospection,
      candidature: source.actions?.candidature || fallback.actions.candidature,
    },
    activities: Array.isArray(source.activities)
      ? source.activities
          .filter((activity): activity is RecentActivity => {
            return Boolean(
              activity &&
                typeof activity.id === "string" &&
                typeof activity.date === "string" &&
                typeof activity.text === "string" &&
                activityTypes.includes(activity.type),
            );
          })
          .slice(0, 50)
      : [],
  };
}

function readDashboardData(): BusinessDashboardData {
  if (typeof window === "undefined") return cloneDefaultData();

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return cloneDefaultData();
    return normalizeDashboardData(JSON.parse(raw));
  } catch {
    return cloneDefaultData();
  }
}

function readPriorityActions(): PriorityActions {
  if (typeof window === "undefined") return { ...defaultData.actions };

  try {
    const raw = window.localStorage.getItem(ACTIONS_STORAGE_KEY);
    if (!raw) return { ...defaultData.actions };
    const parsed = JSON.parse(raw) as Partial<PriorityActions>;

    return {
      freelance: parsed.freelance || defaultData.actions.freelance,
      prospection: parsed.prospection || defaultData.actions.prospection,
      candidature: parsed.candidature || defaultData.actions.candidature,
    };
  } catch {
    return { ...defaultData.actions };
  }
}

function readAiApplicationsCount() {
  if (typeof window === "undefined") return 0;

  try {
    const raw = window.localStorage.getItem(AI_APPLICATIONS_STORAGE_KEY);
    if (!raw) return 0;
    const parsed: unknown = JSON.parse(raw);

    if (Array.isArray(parsed)) return parsed.length;

    if (parsed && typeof parsed === "object") {
      const maybeApplications = (parsed as { applications?: unknown }).applications;
      return Array.isArray(maybeApplications) ? maybeApplications.length : 0;
    }

    return 0;
  } catch {
    return 0;
  }
}

function trendSymbol(trend: PipelineCard["trend"]) {
  if (trend === "up") return "↑";
  if (trend === "down") return "↓";
  return "—";
}

function trendTone(trend: PipelineCard["trend"]) {
  if (trend === "up") return "success" as const;
  if (trend === "down") return "warning" as const;
  return "neutral" as const;
}

function todayDate() {
  return new Date().toISOString().slice(0, 10);
}

export default function BusinessDashboardPage() {
  const [data, setData] = useState<BusinessDashboardData>(cloneDefaultData);
  const [activityType, setActivityType] = useState<RecentActivity["type"]>("note");
  const [activityText, setActivityText] = useState("");
  const [aiApplicationsCount, setAiApplicationsCount] = useState(0);

  useEffect(() => {
    const loaded = readDashboardData();
    setData({ ...loaded, actions: readPriorityActions() });
    setAiApplicationsCount(readAiApplicationsCount());
  }, []);

  function persist(next: BusinessDashboardData) {
    setData(next);
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  }

  function updatePipeline(index: number, field: "count" | "trend", value: string) {
    const nextPipeline = data.pipeline.map((item, itemIndex) => {
      if (itemIndex !== index) return item;
      return {
        ...item,
        [field]: field === "count" ? normalizeNumber(value) : value,
      };
    });
    persist({ ...data, pipeline: nextPipeline });
  }

  function updateRevenue(field: keyof RevenueData, value: string) {
    persist({ ...data, revenue: { ...data.revenue, [field]: normalizeNumber(value) } });
  }

  function updateWeekly(field: keyof WeeklyScore, value: string) {
    persist({ ...data, weekly: { ...data.weekly, [field]: normalizeNumber(value) } });
  }

  function updateAction(field: keyof PriorityActions, value: string) {
    const actions = { ...data.actions, [field]: value };
    setData({ ...data, actions });
    window.localStorage.setItem(ACTIONS_STORAGE_KEY, JSON.stringify(actions));
  }

  function addActivity() {
    const trimmed = activityText.trim();
    if (!trimmed) return;

    const activity: RecentActivity = {
      id: `business-activity-${Date.now()}`,
      date: todayDate(),
      type: activityType,
      text: trimmed,
    };

    persist({ ...data, activities: [activity, ...data.activities].slice(0, 50) });
    setActivityText("");
  }

  const ecartRestant = Math.max(data.revenue.objectif - data.revenue.confirme, 0);
  const progress = data.revenue.objectif > 0 ? Math.min((data.revenue.confirme / data.revenue.objectif) * 100, 100) : 0;
  const activityPreview = useMemo(() => data.activities.slice(0, 12), [data.activities]);
  const pipelineForDisplay = data.pipeline.map((item) =>
    item.label === "Candidatures envoyées" ? { ...item, count: aiApplicationsCount } : item,
  );

  return (
    <main className="internal-page">
      <SystemPageShell maxWidth={1180}>
        <header className="internal-header">
          <BackLink href="/centre-de-controle" label="Centre" />
          <p className="internal-kicker">Business</p>
          <h1 className="internal-title">Tableau de bord Business</h1>
          <p className="internal-subtitle">
            Cockpit manuel pour suivre pipeline, revenus, actions prioritaires et activité freelance.
          </p>
        </header>

        <SystemPanel ariaLabel="Actions prioritaires" compact>
          <SystemSectionHeader eyebrow="Aujourd’hui" title="Actions prioritaires" />
          <SystemGrid gap={8} min={240}>
            <label style={dashboardFieldStyle}>
              <span className="label-meta">1 action freelance</span>
              <input className="internal-control" style={dashboardControlStyle} value={data.actions.freelance} onChange={(event) => updateAction("freelance", event.target.value)} />
            </label>
            <label style={dashboardFieldStyle}>
              <span className="label-meta">1 action prospection</span>
              <input className="internal-control" style={dashboardControlStyle} value={data.actions.prospection} onChange={(event) => updateAction("prospection", event.target.value)} />
            </label>
            <label style={dashboardFieldStyle}>
              <span className="label-meta">1 action candidature</span>
              <input className="internal-control" style={dashboardControlStyle} value={data.actions.candidature} onChange={(event) => updateAction("candidature", event.target.value)} />
            </label>
          </SystemGrid>
        </SystemPanel>

        <SystemPanel ariaLabel="Revenue tracker" compact>
          <SystemSectionHeader eyebrow="Revenus" title="Objectif mensuel" />
          <SystemGrid gap={8} min={160}>
            <label style={dashboardFieldStyle}>
              <span className="label-meta">Objectif mensuel</span>
              <input className="internal-control" min={0} style={dashboardControlStyle} type="number" value={data.revenue.objectif} onChange={(event) => updateRevenue("objectif", event.target.value)} />
            </label>
            <label style={dashboardFieldStyle}>
              <span className="label-meta">Revenus confirmés</span>
              <input className="internal-control" min={0} style={dashboardControlStyle} type="number" value={data.revenue.confirme} onChange={(event) => updateRevenue("confirme", event.target.value)} />
            </label>
            <label style={dashboardFieldStyle}>
              <span className="label-meta">Revenus potentiels</span>
              <input className="internal-control" min={0} style={dashboardControlStyle} type="number" value={data.revenue.potentiel} onChange={(event) => updateRevenue("potentiel", event.target.value)} />
            </label>
          </SystemGrid>
          <div style={{ display: "grid", gap: 8, marginTop: 12 }}>
            <div style={{ alignItems: "center", display: "flex", justifyContent: "space-between" }}>
              <p className="editorial-body" style={{ margin: 0 }}>Écart restant</p>
              <strong style={{ color: "var(--accent-gold)" }}>{ecartRestant.toLocaleString("fr-CA")} $</strong>
            </div>
            <div style={{ background: "rgba(255,255,255,0.06)", borderRadius: 999, height: 8, overflow: "hidden" }}>
              <div style={{ background: "var(--accent-gold)", borderRadius: 999, height: "100%", width: `${progress}%` }} />
            </div>
          </div>
        </SystemPanel>

        <SystemPanel ariaLabel="Pipeline overview" compact>
          <SystemSectionHeader eyebrow="Pipeline" title="Vue d’ensemble" />
          <div style={{ display: "grid", gap: 7, gridTemplateColumns: "repeat(auto-fit, minmax(146px, 1fr))" }}>
            {pipelineForDisplay.map((item, index) => {
              const automaticApplications = item.label === "Candidatures envoyées";

              return (
                <article className="chapter-card" key={item.label} style={{ marginBottom: 0, padding: "6px 8px" }}>
                  <div style={{ alignItems: "center", display: "flex", gap: 6, justifyContent: "space-between" }}>
                    <div style={{ minWidth: 0 }}>
                      <p className="label-meta" style={{ fontSize: 10, lineHeight: 1.1, margin: "0 0 3px" }}>{item.label}</p>
                      {automaticApplications ? (
                        <p style={{ color: "var(--text-main)", fontSize: 20, fontWeight: 750, lineHeight: 1, margin: 0 }}>{item.count}</p>
                      ) : (
                        <input
                          className="internal-control"
                          min={0}
                          onChange={(event) => updatePipeline(index, "count", event.target.value)}
                          style={compactNumberStyle}
                          type="number"
                          value={item.count}
                        />
                      )}
                    </div>
                    <label style={{ alignItems: "end", display: "grid", gap: 3 }}>
                      <StatusChip tone={trendTone(item.trend)}>{trendSymbol(item.trend)}</StatusChip>
                      <select
                        className="internal-control"
                        onChange={(event) => updatePipeline(index, "trend", event.target.value)}
                        style={compactSelectStyle}
                        value={item.trend}
                      >
                        <option value="stable">stable</option>
                        <option value="up">up</option>
                        <option value="down">down</option>
                      </select>
                    </label>
                  </div>
                </article>
              );
            })}
          </div>
        </SystemPanel>

        <SystemPanel ariaLabel="Weekly scoreboard" compact>
          <SystemSectionHeader eyebrow="Semaine" title="Scoreboard" />
          <SystemGrid gap={8} min={150}>
            {([
              ["candidatures", "Candidatures envoyées"],
              ["prospects", "Nouveaux prospects"],
              ["reponses", "Réponses reçues"],
              ["contrats", "Contrats obtenus"],
            ] as const).map(([field, label]) => (
              <label key={field} style={dashboardFieldStyle}>
                <span className="label-meta">{label}</span>
                <input className="internal-control" min={0} style={dashboardControlStyle} type="number" value={data.weekly[field]} onChange={(event) => updateWeekly(field, event.target.value)} />
              </label>
            ))}
          </SystemGrid>
        </SystemPanel>

        <SystemPanel ariaLabel="Activité récente" compact>
          <SystemSectionHeader eyebrow="Timeline" title="Activité récente" />
          <div style={{ display: "grid", gap: 7 }}>
            <div style={{ alignItems: "end", display: "flex", flexWrap: "wrap", gap: 8 }}>
              <label style={{ ...dashboardFieldStyle, flex: "0 1 150px" }}>
                <span className="label-meta">Type</span>
                <select className="internal-control" style={dashboardControlStyle} value={activityType} onChange={(event) => setActivityType(event.target.value as RecentActivity["type"])}>
                  {activityTypes.map((type) => <option key={type} value={type}>{type}</option>)}
                </select>
              </label>
              <label style={{ ...dashboardFieldStyle, flex: "1 1 260px" }}>
                <span className="label-meta">Activité</span>
                <input className="internal-control" placeholder="Ajouter une note d’activité..." style={dashboardControlStyle} value={activityText} onChange={(event) => setActivityText(event.target.value)} />
              </label>
              <button className="internal-button-primary" onClick={addActivity} style={{ ...dashboardButtonStyle, alignSelf: "end", flex: "0 1 112px", height: 36 }} type="button">
                Ajouter
              </button>
            </div>
            {activityPreview.length ? (
              <div style={{ display: "grid", gap: 6 }}>
                {activityPreview.map((activity) => (
                  <article className="chapter-card" key={activity.id} style={{ marginBottom: 0, padding: "7px 9px" }}>
                    <div style={{ alignItems: "center", display: "flex", flexWrap: "wrap", gap: 8 }}>
                      <StatusChip>{activity.type}</StatusChip>
                      <span className="label-meta">{activity.date}</span>
                    </div>
                    <p className="editorial-body" style={{ margin: "6px 0 0" }}>{activity.text}</p>
                  </article>
                ))}
              </div>
            ) : (
              <p className="editorial-body" style={{ margin: 0 }}>Aucune activité récente pour l’instant.</p>
            )}
          </div>
        </SystemPanel>

        <SystemPanel ariaLabel="Accès rapides" compact>
          <SystemSectionHeader eyebrow="Accès rapides" title="Modules utiles" />
          <SystemGrid gap={7} min={130}>
            {quickLinks.map((link) => (
              <Link
                className={link.exists ? "internal-button-primary" : "internal-button"}
                href={link.href}
                key={link.href}
                style={{
                  ...quickAccessButtonStyle,
                  opacity: link.exists ? 1 : 0.62,
                }}
              >
                {link.label}
              </Link>
            ))}
          </SystemGrid>
        </SystemPanel>
      </SystemPageShell>
    </main>
  );
}
