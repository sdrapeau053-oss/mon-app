 "use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";

const modules = [
  {
    title: "Écrire",
    description: "Travailler les souvenirs, les fragments et le manuscrit.",
    short: "Souvenirs",
    href: "/atelier",
    icon: "✍",
    accent: "#d6b25e",
    hover: "hover:border-[#d6b25e]/40 hover:bg-[#d6b25e]/10",
  },
  {
    title: "Tome 1",
    description: "Voir la structure, les blocs, les chapitres et la tension narrative.",
    short: "Structure",
    href: "/structure-tome-1",
    icon: "▱",
    accent: "#c89454",
    hover: "hover:border-[#6f86a8]/45 hover:bg-[#6f86a8]/12",
  },
  {
    title: "Manuscrit",
    description: "Lire le livre comme un objet imprimé, avec pages et marges éditoriales.",
    short: "Lecture",
    href: "/manuscrit",
    icon: "□",
    accent: "#d6b25e",
    hover: "hover:border-[#f5efe3]/45 hover:bg-[#f5efe3]/10",
  },
  {
    title: "Scènes",
    description: "Suivre les scènes, leur intensité et leur fonction narrative.",
    short: "Architecture",
    href: "/scenes",
    icon: "▦",
    accent: "#b8a8c8",
    hover: "hover:border-[#b8a8c8]/45 hover:bg-[#b8a8c8]/12",
  },
  {
    title: "Détecteur de voix",
    description: "Repérer les traces IA, la perte de corps et les formulations trop lisses.",
    short: "Justesse",
    href: "/detecteur-voix",
    icon: "◎",
    accent: "#c9a84c",
    hover: "hover:border-[#b8a4d9]/45 hover:bg-[#b8a4d9]/12",
  },
  {
    title: "Daily System",
    description: "Revenir au corps, aux priorités et à l’énergie du jour.",
    short: "Aujourd’hui",
    href: "/daily-system",
    icon: "☉",
    accent: "#d6b25e",
    hover: "hover:border-[#e5c86f]/45 hover:bg-[#e5c86f]/12",
  },
  {
    title: "L’autre rive",
    description: "Lire une situation relationnelle avec clarté.",
    short: "Clarté",
    href: "/autre-rive",
    icon: "〰",
    accent: "#b8a06a",
    hover: "hover:border-[#7fb0c8]/45 hover:bg-[#7fb0c8]/12",
  },
  {
    title: "Freelance",
    description: "Analyser une demande client, estimer un prix, répondre.",
    short: "Clients",
    href: "/freelance",
    icon: "✦",
    accent: "#d6b25e",
    hover: "hover:border-[#9caf88]/45 hover:bg-[#9caf88]/12",
  },
  {
    title: "Maison",
    description: "Organisation familiale, tâches et cadre quotidien.",
    short: "Cadre",
    href: "/taches-menageres",
    icon: "⌂",
    accent: "#aa8f55",
    hover: "hover:border-[#c98768]/45 hover:bg-[#c98768]/12",
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
    <main className="min-h-screen bg-[#0f0d0a] pb-14 text-[#f5efe3]">
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_top_left,rgba(214,178,94,0.08),transparent_30%)]" />

      <div className="relative mx-auto flex min-h-screen w-full max-w-6xl flex-col px-4 py-3 sm:px-5">
        <header className="flex items-start justify-between gap-5 border-b border-[rgba(214,178,94,0.14)] pb-3">
          <div>
            <p className="text-sm font-semibold tracking-[0.08em] text-[#d6b25e]">✦ Mon Système</p>
            <p className="mt-1 text-xs text-[#b8aa91]">Espace personnel de Sylvie</p>
          </div>
          <div className="rounded-full border border-[rgba(214,178,94,0.18)] bg-[#15120e] px-3 py-1 text-[11px] font-medium text-[#c7ad6d]">
            Aujourd’hui
          </div>
        </header>

        <section className="mt-3 overflow-hidden rounded-xl border border-[rgba(214,178,94,0.12)] bg-[#f5efe3] px-4 py-2.5 text-[#1b1712]">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="mb-1 text-[9px] font-bold uppercase tracking-[0.18em] text-[#9a7b35]">
              Cockpit privé
              </p>
              <h1 className="text-lg font-semibold leading-none tracking-[-0.03em] sm:text-xl">
                Bonjour, Sylvie
              </h1>
            </div>
            <p className="max-w-sm text-[11px] leading-4 text-[#6f6049]">
              Choisis l’espace utile maintenant.
            </p>
          </div>
        </section>

        <section className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
          {modules.map((module) => (
            <Link
              className={`group flex aspect-square flex-col items-center justify-center rounded-xl border bg-[#0e0e0e] p-3 text-center transition-all duration-200 ease-out hover:-translate-y-0.5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#d6b25e] ${module.hover} ${
                module.title === "Écrire"
                  ? "border-yellow-500/28"
                  : "border-yellow-500/10"
              }`}
              href={module.href}
              key={module.title}
            >
              <div
                className="mb-3 flex h-9 w-9 items-center justify-center rounded-xl border text-base transition-colors duration-200 group-hover:bg-[#0f0d0a]/25"
                style={{
                  borderColor: "rgba(214,178,94,0.16)",
                  color: module.accent,
                  background: "rgba(214,178,94,0.04)",
                }}
              >
                {module.icon}
              </div>
              <h2 className="max-w-full truncate text-sm font-semibold tracking-[-0.015em] text-[#f5efe3]">
                {module.title}
              </h2>
              <p className="mt-1 text-[10px] leading-4 text-[#9f927d]">{module.short}</p>
            </Link>
          ))}
        </section>

        <section className="mt-3 grid gap-2 lg:grid-cols-[1fr_0.34fr]">
          <div className="rounded-xl border border-[rgba(214,178,94,0.14)] bg-[#15120e] p-2.5">
            <p className="text-[9px] font-bold uppercase tracking-[0.16em] text-[#c7ad6d]">
              État du système
            </p>
            <div className="mt-2 grid gap-1.5 sm:grid-cols-3">
              {dynamicSystemState.map((item) => (
                <Link
                  className="group rounded-lg border border-[rgba(214,178,94,0.12)] bg-[#0f0d0a]/70 px-2.5 py-2 transition-all duration-200 ease-out hover:border-yellow-500/30 hover:bg-[#14110d]"
                  href={item.href}
                  key={item.label}
                >
                  <p className="text-[10px] text-[#8d806b]">{item.label}</p>
                  <p className="mt-0.5 truncate text-[12px] font-semibold leading-4 text-[#f5efe3]">{item.value}</p>
                  <p className="mt-1 line-clamp-1 text-[9px] font-semibold text-[#c7ad6d]">
                    {item.action}
                    <span className="ml-1 transition group-hover:translate-x-1">→</span>
                  </p>
                </Link>
              ))}
            </div>
          </div>

          <div className="rounded-xl border border-dashed border-[rgba(214,178,94,0.16)] bg-[#12100d] p-2.5">
            <p className="text-[9px] font-bold uppercase tracking-[0.16em] text-[#c7ad6d]">
              Ressources Québec
            </p>
            <p className="mt-1 line-clamp-1 text-[11px] leading-4 text-[#9f927d]">
              Espace à connecter pour regrouper les liens, contacts et repères utiles.
            </p>
            <span className="mt-1.5 inline-flex rounded-full border border-[rgba(214,178,94,0.16)] px-2 py-0.5 text-[10px] text-[#9f927d]">
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
