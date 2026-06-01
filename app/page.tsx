"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import EditorialIcon, { type EditorialIconName } from "@/components/ui/editorial-icon";
import { useLanguage } from "@/lib/LanguageContext";
import { type AppLanguage, t } from "@/lib/i18n";

type PortalSpace = {
  accent: string;
  buttonTextColor: string;
  entryHref: string;
  entryLabelKey: string;
  icon: EditorialIconName;
  shortDescriptionKey: string;
  titleKey: string;
};

const portalSpaces: PortalSpace[] = [
  {
    titleKey: "home.writing.title",
    shortDescriptionKey: "home.writing.short",
    entryHref: "/manuscrit",
    entryLabelKey: "home.writing.open",
    icon: "book",
    accent: "#C9A84C",
    buttonTextColor: "#1A1A16",
  },
  {
    titleKey: "home.life.title",
    shortDescriptionKey: "home.life.short",
    entryHref: "/life-operating-system",
    entryLabelKey: "home.life.open",
    icon: "sun",
    accent: "#6B8F71",
    buttonTextColor: "#1A1A16",
  },
  {
    titleKey: "home.work.title",
    shortDescriptionKey: "home.work.short",
    entryHref: "/freelance",
    entryLabelKey: "home.work.open",
    icon: "star",
    accent: "#4A6B8A",
    buttonTextColor: "#E8E0D0",
  },
];

type ContinuityLine = {
  labelKey: string;
  value: string;
};

type ResumeSoftlyState = {
  href: string;
  lines: string[];
};

type OrientationAction = {
  href: string;
  label: string;
  subtext: string;
};

const orientationActions: OrientationAction[] = [
  {
    label: "Écrire un chapitre",
    subtext: "écrire, reprendre, copier un chapitre",
    href: "/manuscrit",
  },
  {
    label: "Corriger un chapitre",
    subtext: "voir les erreurs, améliorer, analyser",
    href: "/audit",
  },
  {
    label: "Voir ma chronologie",
    subtext: "replacer les souvenirs dans l’ordre",
    href: "/chronologie",
  },
  {
    label: "Comprendre ma voix",
    subtext: "rythme, motifs, cohérence",
    href: "/style-dna",
  },
  {
    label: "Travailler / client",
    subtext: "réponses, missions, demandes",
    href: "/freelance",
  },
  {
    label: "Apprendre STRATE",
    subtext: "étapes, où cliquer, comment utiliser l’application",
    href: "/guide-strate",
  },
];

function safeParse(value: string | null): unknown {
  if (!value) return null;
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

function todayStorageDate() {
  return new Date().toLocaleDateString("fr-CA");
}

function storageDateOffset(daysAgo: number) {
  const date = new Date();
  date.setDate(date.getDate() - daysAgo);
  return date.toLocaleDateString("fr-CA");
}

function getStringField(record: Record<string, unknown>, fields: string[]) {
  for (const field of fields) {
    const value = record[field];
    if (typeof value === "string" && value.trim()) return value.trim();
  }

  return "";
}

function getNestedString(record: Record<string, unknown>, paths: string[][]) {
  for (const path of paths) {
    let current: unknown = record;

    for (const segment of path) {
      if (!isRecord(current)) {
        current = null;
        break;
      }
      current = current[segment];
    }

    if (typeof current === "string" && current.trim()) return current.trim();
  }

  return "";
}

function readRecentStorageRecord(prefix: "daily-system" | "life-operating-system") {
  for (const daysAgo of [0, 1]) {
    const date = storageDateOffset(daysAgo);
    const value = safeParse(localStorage.getItem(`${prefix}-${date}`));
    if (isRecord(value)) return { date, daysAgo, value };
  }

  return null;
}

function formatManuscriptTarget(value: unknown, lang: AppLanguage) {
  if (typeof value !== "string" || !value.trim()) return "";
  const chapter = value.match(/chapitre-(\d+)/i)?.[1];
  if (chapter) return lang === "en" ? `chapter ${chapter}` : `chapitre ${chapter}`;
  return value;
}

function formatResumeChapter(value: unknown) {
  const chapter = formatManuscriptTarget(value, "fr");
  if (!chapter) return "";
  return chapter.startsWith("chapitre ") ? `Dernier chapitre actif : ${chapter}` : `Dernier fil manuscrit : ${chapter}`;
}

function isLowEnergy(value: unknown) {
  if (typeof value === "number") return value > 0 && value <= 4;
  if (typeof value !== "string") return false;
  return /basse|fatigue|fatiguée|fatiguee|épuisée|epuisee|difficile|faible/i.test(value);
}

function isHighOverload(value: unknown) {
  if (typeof value === "number") return value >= 7;
  if (typeof value !== "string") return false;
  return /surcharge|lourde|lourd|haute|importante|difficile/i.test(value);
}

function readResumeState(): ResumeSoftlyState | null {
  if (typeof window === "undefined") return null;

  const systemState = safeParse(localStorage.getItem("system-state"));
  const lifeRecord = readRecentStorageRecord("life-operating-system");
  const dailyRecord = readRecentStorageRecord("daily-system");
  const lines: string[] = [];
  let overloadDetected = false;
  let chapterAvailable = false;
  let lastModuleHref = "";

  if (isRecord(systemState)) {
    const chapterLine = formatResumeChapter(systemState.manuscrit);
    if (chapterLine) {
      lines.push(chapterLine);
      chapterAvailable = true;
    }

    const systemEnergy = getStringField(systemState, ["energie", "energy"]);
    if (isLowEnergy(systemEnergy)) {
      lines.push("Énergie basse récemment");
    }

    const moduleValue = getStringField(systemState, [
      "dernierModule",
      "lastModule",
      "moduleImportant",
      "lastImportantModule",
      "moduleActif",
    ]);
    const moduleRoutes: Record<string, string> = {
      business: "/freelance",
      centre: "/centre-de-controle",
      daily: "/daily-system",
      freelance: "/freelance",
      "life os": "/life-operating-system",
      life: "/life-operating-system",
      manuscrit: "/manuscrit",
      mémoire: "/memoires",
      memoire: "/memoires",
      mémoires: "/memoires",
      memoires: "/memoires",
    };
    const normalizedModule = moduleValue.toLowerCase();
    lastModuleHref = moduleValue.startsWith("/") ? moduleValue : moduleRoutes[normalizedModule] || "";
    if (moduleValue) {
      lines.push(`Dernier module important : ${moduleValue.replace(/^\//, "")}`);
    }
  }

  if (lifeRecord) {
    const state = isRecord(lifeRecord.value.state) ? lifeRecord.value.state : lifeRecord.value;
    if (isHighOverload(state.surcharge)) {
      lines.push("Surcharge importante récemment");
      overloadDetected = true;
    } else if (isLowEnergy(state.energie)) {
      lines.push("Énergie basse récemment");
    }

    const usefulAction = getNestedString(lifeRecord.value, [
      ["journal", "tomorrowTask"],
      ["journal", "lifeForward"],
      ["journal", "whatIDidToday"],
    ]);
    if (usefulAction) lines.push(`Dernière action utile : ${usefulAction}`);
  }

  if (dailyRecord && Array.isArray(dailyRecord.value.tasks)) {
    const tasks = dailyRecord.value.tasks.filter(isRecord);
    const done = tasks.filter((task) => task.done === true).length;
    if (tasks.length) {
      const label = dailyRecord.daysAgo === 1 ? "Hier" : "Aujourd’hui";
      const essential = done === 1 ? "tâche essentielle complétée" : "tâches essentielles complétées";
      lines.push(`${label} : ${done} ${essential}`);
    }
  }

  const uniqueLines = Array.from(new Set(lines)).slice(0, 4);
  if (!uniqueLines.length) return null;

  const href = overloadDetected
    ? "/life-operating-system"
    : lastModuleHref || (chapterAvailable ? "/manuscrit" : "/centre-de-controle");

  return { href, lines: uniqueLines };
}

function readLastLifeEntry() {
  const lifeData = safeParse(localStorage.getItem("life-operating-system"));
  if (!isRecord(lifeData) || !Array.isArray(lifeData.entries)) return null;

  return lifeData.entries
    .filter(isRecord)
    .sort((a, b) => {
      const aDate = typeof a.updatedAt === "string" ? new Date(a.updatedAt).getTime() : 0;
      const bDate = typeof b.updatedAt === "string" ? new Date(b.updatedAt).getTime() : 0;
      return bDate - aDate;
    })[0] ?? null;
}

function readLastDailyJournal() {
  const journalKeys: string[] = [];
  for (let index = 0; index < localStorage.length; index += 1) {
    const key = localStorage.key(index);
    if (key?.startsWith("life-operating-system-")) journalKeys.push(key);
  }

  return journalKeys
    .sort()
    .reverse()
    .map((key) => safeParse(localStorage.getItem(key)))
    .find(isRecord) ?? null;
}

function readDailyProgress(lang: AppLanguage) {
  const daily = safeParse(localStorage.getItem(`daily-system-${todayStorageDate()}`));
  if (!isRecord(daily) || !Array.isArray(daily.tasks)) return "";

  const tasks = daily.tasks.filter(isRecord);
  if (!tasks.length) return "";

  const done = tasks.filter((task) => task.done === true).length;
  return lang === "en" ? `${done}/${tasks.length} tasks` : `${done}/${tasks.length} tâches`;
}

function readContinuityLines(lang: AppLanguage): ContinuityLine[] {
  if (typeof window === "undefined") return [];

  const lines: ContinuityLine[] = [];
  const systemState = safeParse(localStorage.getItem("system-state"));
  const chapterWorked = isRecord(systemState) ? formatManuscriptTarget(systemState.manuscrit, lang) : "";
  const lifeEntry = readLastLifeEntry();
  const lifeJournal = readLastDailyJournal();
  const dailyProgress = readDailyProgress(lang);

  if (chapterWorked) {
    lines.push({ labelKey: "home.continuity.chapter", value: chapterWorked });
  }

  if (isRecord(lifeEntry) && isRecord(lifeEntry.state)) {
    const energy = Number(lifeEntry.state.energie);
    const clarity = Number(lifeEntry.state.clarte);
    const parts = [
      Number.isFinite(energy) ? `${lang === "en" ? "energy" : "énergie"} ${energy}/10` : "",
      Number.isFinite(clarity) ? `${lang === "en" ? "clarity" : "clarté"} ${clarity}/10` : "",
    ].filter(Boolean);
    if (parts.length) lines.push({ labelKey: "home.continuity.state", value: parts.join(" · ") });
  }

  if (isRecord(lifeEntry) && lifeEntry.touchedWriting === true) {
    lines.push({
      labelKey: "home.continuity.lastAction",
      value: lang === "en" ? "writing progress marked" : "progression d’écriture notée",
    });
  } else if (isRecord(lifeJournal) && isRecord(lifeJournal.journal) && typeof lifeJournal.journal.tomorrowTask === "string" && lifeJournal.journal.tomorrowTask.trim()) {
    lines.push({ labelKey: "home.continuity.lastAction", value: lifeJournal.journal.tomorrowTask.trim() });
  }

  if (dailyProgress) {
    lines.push({ labelKey: "home.continuity.daily", value: dailyProgress });
  }

  if (chapterWorked) {
    lines.push({
      labelKey: "home.continuity.next",
      value: lang === "en" ? `return to ${chapterWorked}` : `reprendre ${chapterWorked}`,
    });
  } else if (isRecord(lifeJournal) && isRecord(lifeJournal.journal) && typeof lifeJournal.journal.tomorrowTask === "string" && lifeJournal.journal.tomorrowTask.trim()) {
    lines.push({ labelKey: "home.continuity.next", value: lifeJournal.journal.tomorrowTask.trim() });
  }

  return lines.slice(0, 5);
}

export default function HomePage() {
  const { lang } = useLanguage();
  const [continuityLines, setContinuityLines] = useState<ContinuityLine[]>([]);
  const [continuityLoaded, setContinuityLoaded] = useState(false);
  const [resumeSoftly, setResumeSoftly] = useState<ResumeSoftlyState | null>(null);

  useEffect(() => {
    setContinuityLines(readContinuityLines(lang));
    setResumeSoftly(readResumeState());
    setContinuityLoaded(true);
  }, [lang]);

  return (
    <main className="h-[calc(100vh-46px)] overflow-y-auto bg-[#1A1A16] text-[#E8E0D0] lg:overflow-hidden">
      <style>
        {`
          @media (min-width: 1024px) {
            .home-portal-card {
              height: 240px !important;
              max-height: 240px !important;
              padding: 24px !important;
            }

            .home-portal-card-icon {
              height: 32px !important;
              width: 32px !important;
            }

            .home-portal-card-copy {
              margin-top: 12px !important;
            }

            .home-portal-card-description {
              white-space: normal !important;
              overflow: visible !important;
              text-overflow: clip !important;
              line-height: 1.4 !important;
              font-size: 13px !important;
              min-height: 36px;
            }

            .home-portal-card-button {
              margin-top: auto !important;
              padding: 10px 20px !important;
              font-size: 13px !important;
            }
          }
        `}
      </style>
      <div className="pointer-events-none fixed inset-0 bg-[linear-gradient(180deg,rgba(232,224,208,0.012),transparent_38%,rgba(26,26,22,0.18))]" />

      <div className="relative mx-auto flex min-h-[calc(100vh-46px)] w-full max-w-6xl flex-col px-4 py-5 sm:px-6 lg:h-[calc(100vh-46px)] lg:min-h-0 lg:py-0">
        <header className="mx-auto text-center">
          <h1 className="mt-5 font-serif text-[26px] font-normal uppercase leading-none tracking-[0.36em] text-[#C9A84C] lg:mt-7 lg:text-[36px]">
            {t("home.kicker", lang)}
          </h1>
          <p className="mt-1.5 text-center text-[11px] font-light leading-tight text-[#9A9080] lg:text-[13px]">
            {t("home.title", lang)}
          </p>
        </header>

        {resumeSoftly && (
          <section
            aria-label="Reprendre doucement"
            className="mx-auto mt-3 w-full max-w-3xl rounded-xl border border-[#C9A84C]/15 bg-[#1E1E1A]/95 px-3 py-2.5 lg:max-w-5xl"
          >
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                <p className="font-serif text-[11px] font-normal uppercase tracking-[0.13em] text-[#C9A84C]">
                  Reprendre doucement
                </p>
                <div className="mt-1 grid gap-0.5 text-[10.5px] leading-4 text-[#AFA491]">
                  {resumeSoftly.lines.map((line) => (
                    <p className="truncate" key={line}>{line}</p>
                  ))}
                </div>
              </div>
              <Link
                className="inline-flex w-fit rounded-full border border-[#C9A84C]/35 px-3 py-1 text-[11px] font-semibold leading-none text-[#E8E0D0] transition hover:border-[#C9A84C]/65 hover:text-[#C9A84C] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#C9A84C]"
                href={resumeSoftly.href}
              >
                Reprendre
              </Link>
            </div>
          </section>
        )}

        <section
          aria-label="Que veux-tu faire ?"
          className="mx-auto mt-3 w-full max-w-3xl rounded-xl border border-[#C9A84C]/12 bg-[#1E1E1A]/85 px-3 py-2.5 lg:max-w-5xl"
        >
          <div className="flex flex-col gap-2">
            <div className="flex flex-col gap-1 sm:flex-row sm:items-baseline sm:justify-between">
              <p className="font-serif text-[11px] font-normal uppercase tracking-[0.13em] text-[#C9A84C]">
                Que veux-tu faire ?
              </p>
              <p className="text-[10.5px] leading-4 text-[#AFA491]">
                Choisis l’entrée la plus simple pour ton besoin.
              </p>
            </div>

            <div className="grid gap-1.5 sm:grid-cols-2 lg:grid-cols-3">
              {orientationActions.map((action) => (
                <Link
                  className="rounded-lg border border-[#C9A84C]/12 bg-[#171713] px-3 py-2 transition hover:border-[#C9A84C]/38 hover:bg-[#211f18] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#C9A84C]"
                  href={action.href}
                  key={action.href}
                >
                  <span className="block text-[11.5px] font-semibold leading-tight text-[#E8E0D0]">{action.label}</span>
                  <span className="mt-1 block text-[10px] leading-3.5 text-[#9A9080]">{action.subtext}</span>
                </Link>
              ))}
            </div>
          </div>
        </section>

        <section
          aria-label={t("home.continuity.title", lang)}
          className="mx-auto mt-3 w-full max-w-3xl rounded-xl border border-[#2A2A24]/70 bg-[#1E1E1A]/90 px-3 py-2 lg:max-w-5xl"
        >
          <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between">
            <p className="font-serif text-[10px] font-normal uppercase tracking-[0.12em] text-[#B99A45]">
              {t("home.continuity.title", lang)}
            </p>
            <div className="grid gap-0.5 text-[10px] leading-3.5 text-[#9A9080] sm:min-w-[420px]">
              {continuityLoaded && continuityLines.length > 0 ? (
                continuityLines.map((line) => (
                  <p className="truncate" key={`${line.labelKey}-${line.value}`}>
                    <span className="text-[#E8E0D0]">{t(line.labelKey, lang)} :</span> {line.value}
                  </p>
                ))
              ) : (
                <p>{t("home.continuity.empty", lang)}</p>
              )}
            </div>
          </div>
        </section>

        <section className="mt-3 grid w-full grid-cols-1 gap-3 sm:grid-cols-3">
          {portalSpaces.map((space) => (
            <article
              className="home-portal-card group flex h-[148px] max-h-[148px] flex-col rounded-2xl border-0 border-l-2 bg-[#1E1E1A] p-4 transition duration-500 hover:-translate-y-0.5 hover:bg-[#22221d] sm:h-[152px] sm:max-h-[152px]"
              key={space.titleKey}
              style={{ borderLeftColor: space.accent }}
            >
              <div
                className="home-portal-card-icon flex h-5 w-5 items-center justify-center"
                style={{ color: space.accent }}
              >
                <EditorialIcon color={space.accent} name={space.icon} size={18} />
              </div>

              <div className="home-portal-card-copy mt-3.5 min-w-0">
                <h2 className="truncate font-serif text-[15px] font-medium leading-tight text-[#E8E0D0] lg:text-[20px]">{t(space.titleKey, lang)}</h2>
                <p className="home-portal-card-description mt-1 truncate text-[10.5px] leading-tight text-[#9A9080]">{t(space.shortDescriptionKey, lang)}</p>
              </div>

              <Link
                className="home-portal-card-button mt-auto inline-flex w-fit rounded-[20px] border px-3.5 py-1 text-[11.5px] font-semibold leading-none transition hover:-translate-y-px focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#C9A84C]"
                href={space.entryHref}
                style={{
                  background: space.accent,
                  borderColor: space.accent,
                  color: space.buttonTextColor,
                }}
              >
                {t(space.entryLabelKey, lang)}
              </Link>
            </article>
          ))}
        </section>
      </div>
    </main>
  );
}
