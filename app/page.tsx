 "use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";

const modules = [
  {
    title: "Écrire",
    description: "Travailler les souvenirs, les fragments et le manuscrit.",
    href: "/atelier",
    icon: "✍",
    accent: "#d6b25e",
  },
  {
    title: "Tome 1",
    description: "Voir la structure, les blocs, les chapitres et la tension narrative.",
    href: "/structure-tome-1",
    icon: "◇",
    accent: "#c89454",
  },
  {
    title: "Daily System",
    description: "Revenir au corps, aux priorités et à l’énergie du jour.",
    href: "/daily-system",
    icon: "☉",
    accent: "#d6b25e",
  },
  {
    title: "L’autre rive",
    description: "Lire une situation relationnelle avec clarté.",
    href: "/autre-rive",
    icon: "〰",
    accent: "#b8a06a",
  },
  {
    title: "Freelance",
    description: "Analyser une demande client, estimer un prix, répondre.",
    href: "/freelance",
    icon: "✦",
    accent: "#d6b25e",
  },
  {
    title: "Maison",
    description: "Organisation familiale, tâches et cadre quotidien.",
    href: "/taches-menageres",
    icon: "⌂",
    accent: "#aa8f55",
  },
];

type SystemState = {
  manuscrit: string;
  energie: string;
  priorite: string;
};

const SYSTEM_STATE_KEY = "system-state";

const defaultSystemState: SystemState = {
  manuscrit: "chapitre-5",
  energie: "fatigue",
  priorite: "ecrire",
};

function readSystemState(): SystemState {
  if (typeof window === "undefined") return defaultSystemState;

  try {
    const saved = localStorage.getItem(SYSTEM_STATE_KEY);
    return saved ? { ...defaultSystemState, ...JSON.parse(saved) } : defaultSystemState;
  } catch {
    return defaultSystemState;
  }
}

function formatManuscrit(value: string) {
  const chapter = value.match(/chapitre-(\d+)/i)?.[1];
  return chapter ? `Continuer chapitre ${chapter}` : "Continuer le manuscrit";
}

function formatEnergie(value: string) {
  const labels: Record<string, string> = {
    fatigue: "Fatigue",
    haute: "Haute",
    neutre: "Neutre",
  };

  return labels[value] || "À définir";
}

function formatPriorite(value: string) {
  const labels: Record<string, string> = {
    ecrire: "Écrire",
    freelance: "Freelance",
    repos: "Repos",
  };

  return labels[value] || "Choisir une action";
}

function priorityHref(value: string) {
  if (value === "freelance") return "/freelance";
  if (value === "repos") return "/daily-system";
  return "/atelier";
}

const mobileNav = [
  { label: "Accueil", href: "/" },
  { label: "Écrire", href: "/atelier" },
  { label: "Tome 1", href: "/structure-tome-1" },
  { label: "Système", href: "/daily-system" },
];

export default function HomePage() {
  const [systemState, setSystemState] = useState<SystemState>(defaultSystemState);

  useEffect(() => {
    const savedState = readSystemState();
    setSystemState(savedState);
    localStorage.setItem(SYSTEM_STATE_KEY, JSON.stringify(savedState));
  }, []);

  const dynamicSystemState = useMemo(
    () => [
      {
        action: formatManuscrit(systemState.manuscrit),
        href: "/structure-tome-1",
        label: "Manuscrit",
        value: formatManuscrit(systemState.manuscrit),
      },
      {
        action: systemState.energie ? "Ouvrir Daily System" : "Définir dans Daily System",
        href: "/daily-system",
        label: "Énergie",
        value: formatEnergie(systemState.energie),
      },
      {
        action: systemState.priorite ? `Aller vers ${formatPriorite(systemState.priorite)}` : "Choisir une action",
        href: priorityHref(systemState.priorite),
        label: "Priorité",
        value: formatPriorite(systemState.priorite),
      },
    ],
    [systemState],
  );

  return (
    <main className="min-h-screen bg-[#0f0d0a] pb-24 text-[#f5efe3]">
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_top_left,rgba(214,178,94,0.16),transparent_34%),radial-gradient(circle_at_80%_10%,rgba(245,239,227,0.08),transparent_28%)]" />

      <div className="relative mx-auto flex min-h-screen w-full max-w-7xl flex-col px-4 py-5 sm:px-6 lg:px-8">
        <header className="flex items-start justify-between gap-5 border-b border-[rgba(214,178,94,0.18)] pb-5">
          <div>
            <p className="text-sm font-semibold tracking-[0.08em] text-[#d6b25e]">✦ Mon Système</p>
            <p className="mt-1 text-xs text-[#b8aa91]">Espace personnel de Sylvie</p>
          </div>
          <div className="rounded-full border border-[rgba(214,178,94,0.28)] bg-[#1b1712]/80 px-4 py-2 text-xs font-medium text-[#d6b25e] shadow-[0_18px_50px_rgba(0,0,0,0.25)]">
            Aujourd’hui
          </div>
        </header>

        <section className="mt-7 overflow-hidden rounded-[28px] border border-[rgba(214,178,94,0.25)] bg-[#f5efe3] p-6 text-[#1b1712] shadow-[0_28px_90px_rgba(0,0,0,0.28)] sm:p-8 lg:p-10">
          <div className="max-w-3xl">
            <p className="mb-3 text-[11px] font-bold uppercase tracking-[0.22em] text-[#9a7b35]">
              Cockpit privé
            </p>
            <h1 className="text-4xl font-semibold leading-[0.96] tracking-[-0.05em] sm:text-5xl lg:text-6xl">
              Bonjour, Sylvie
            </h1>
            <p className="mt-5 max-w-2xl text-base leading-7 text-[#6f6049] sm:text-lg">
              Choisis l’espace dont tu as besoin aujourd’hui.
            </p>
          </div>
        </section>

        <section className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {modules.map((module) => (
            <Link
              className={`group flex min-h-[190px] flex-col justify-between rounded-2xl border bg-[#0e0e0e] p-6 transition-all duration-300 ease-out hover:-translate-y-1 hover:border-yellow-500/60 hover:shadow-2xl focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#d6b25e] ${
                module.title === "Écrire"
                  ? "border-yellow-500/80 shadow-[0_0_25px_rgba(212,175,55,0.15)]"
                  : "border-yellow-500/20 shadow-[0_20px_60px_rgba(0,0,0,0.22)]"
              }`}
              href={module.href}
              key={module.title}
            >
              <div>
                <div
                  className="mb-5 flex h-11 w-11 items-center justify-center rounded-2xl border text-xl"
                  style={{
                    borderColor: "rgba(214,178,94,0.28)",
                    color: module.accent,
                    background: "rgba(214,178,94,0.08)",
                  }}
                >
                  {module.icon}
                </div>
                <h2 className="text-xl font-semibold tracking-[-0.03em] text-[#f5efe3]">
                  {module.title}
                </h2>
                <p className="mt-3 text-sm leading-6 text-[#b8aa91]">{module.description}</p>
              </div>
              <span className="mt-6 inline-flex items-center text-sm font-semibold text-[#d6b25e]">
                Ouvrir
                <span className="ml-2 transition group-hover:translate-x-1">→</span>
              </span>
            </Link>
          ))}
        </section>

        <section className="mt-6 grid gap-4 lg:grid-cols-[1fr_0.72fr]">
          <div className="rounded-[24px] border border-[rgba(214,178,94,0.22)] bg-[#1b1712] p-5 shadow-[0_20px_60px_rgba(0,0,0,0.18)]">
            <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-[#d6b25e]">
              État du système
            </p>
            <div className="mt-4 grid gap-3 sm:grid-cols-3">
              {dynamicSystemState.map((item) => (
                <Link
                  className="group rounded-2xl border border-[rgba(214,178,94,0.18)] bg-[#0f0d0a]/70 p-4 transition-all duration-300 ease-out hover:-translate-y-1 hover:border-yellow-500/60 hover:shadow-[0_18px_44px_rgba(214,178,94,0.08)]"
                  href={item.href}
                  key={item.label}
                >
                  <p className="text-xs text-[#8d806b]">{item.label}</p>
                  <p className="mt-2 text-sm font-semibold leading-5 text-[#f5efe3]">{item.value}</p>
                  <p className="mt-3 text-[11px] font-semibold text-[#d6b25e]">
                    {item.action}
                    <span className="ml-1 transition group-hover:translate-x-1">→</span>
                  </p>
                </Link>
              ))}
            </div>
          </div>

          <div className="rounded-[24px] border border-dashed border-[rgba(214,178,94,0.26)] bg-[#15120e] p-5">
            <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-[#d6b25e]">
              Ressources Québec
            </p>
            <p className="mt-3 text-sm leading-6 text-[#b8aa91]">
              Espace à connecter pour regrouper les liens, contacts et repères utiles.
            </p>
            <span className="mt-5 inline-flex rounded-full border border-[rgba(214,178,94,0.25)] px-4 py-2 text-xs text-[#b8aa91]">
              Module à venir
            </span>
          </div>
        </section>
      </div>

      <nav className="fixed inset-x-3 bottom-3 z-20 rounded-[24px] border border-[rgba(214,178,94,0.28)] bg-[#1b1712]/95 p-2 shadow-[0_20px_70px_rgba(0,0,0,0.42)] backdrop-blur md:hidden">
        <div className="grid grid-cols-4 gap-1">
          {mobileNav.map((item) => (
            <Link
              className="rounded-2xl px-2 py-3 text-center text-[11px] font-semibold text-[#b8aa91] transition hover:bg-[rgba(214,178,94,0.12)] hover:text-[#f5efe3] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#d6b25e]"
              href={item.href}
              key={item.label}
            >
              {item.label}
            </Link>
          ))}
        </div>
      </nav>
    </main>
  );
}
