"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

type NavItem = {
  href: string;
  label: string;
  priority?: "primary" | "secondary";
};

type NavGroup = {
  items: NavItem[];
  label: string;
};

const navGroups: NavGroup[] = [
  {
    label: "Centre",
    items: [
      { href: "/", label: "Accueil", priority: "secondary" },
      { href: "/centre-de-controle", label: "Centre", priority: "primary" },
      { href: "/centre-intelligent", label: "Aujourd’hui", priority: "primary" },
      { href: "/ecrire-maintenant", label: "Écrire", priority: "primary" },
      { href: "/tableau-auteur", label: "Tableau Auteur", priority: "primary" },
      { href: "/audit-repetitions", label: "Audit Répétitions", priority: "secondary" },
      { href: "/roadmap", label: "Roadmap", priority: "secondary" },
      { href: "/consolidation-ux", label: "Consolidation UX", priority: "secondary" },
      { href: "/timeline", label: "Timeline", priority: "secondary" },
      { href: "/guide-strate", label: "Guide", priority: "secondary" },
      { href: "/retour-utilisation", label: "Retour", priority: "secondary" },
    ],
  },
  {
    label: "Vie",
    items: [
      { href: "/daily-system", label: "Daily System", priority: "primary" },
      { href: "/life-operating-system", label: "Life OS", priority: "primary" },
      { href: "/routines-maison", label: "Routines", priority: "secondary" },
      { href: "/taches-menageres", label: "Tâches ménagères", priority: "secondary" },
      { href: "/malika", label: "Malika", priority: "secondary" },
      { href: "/urgence-malika", label: "Urgence", priority: "secondary" },
      { href: "/aide-memoire", label: "Aide mémoire", priority: "secondary" },
    ],
  },
  {
    label: "Manuscrit",
    items: [
      { href: "/manuscrit", label: "Manuscrit", priority: "primary" },
      { href: "/mission-manuscrit", label: "Mission", priority: "primary" },
      { href: "/fragments", label: "Fragments", priority: "secondary" },
      { href: "/memoires", label: "Mémoires", priority: "primary" },
      { href: "/structure", label: "Structure", priority: "primary" },
      { href: "/pipeline-editorial", label: "Pipeline", priority: "primary" },
      { href: "/lecture", label: "Lecture", priority: "secondary" },
      { href: "/chronologie", label: "Chronologie", priority: "secondary" },
      { href: "/audit", label: "Audit", priority: "primary" },
      { href: "/audit-voix", label: "Voix", priority: "secondary" },
      { href: "/audit-linguistique", label: "Langue", priority: "secondary" },
      { href: "/audit-anti-ia", label: "Anti-IA", priority: "secondary" },
      { href: "/audit-sur-explication", label: "Sur-explication", priority: "secondary" },
      { href: "/backup", label: "Backup", priority: "secondary" },
    ],
  },
  {
    label: "Business",
    items: [
      { href: "/business-dashboard", label: "Tableau de bord Business", priority: "primary" },
      { href: "/freelance", label: "Freelance", priority: "primary" },
      { href: "/freelance-candidature-ia", label: "Candidature IA", priority: "primary" },
      { href: "/analyser-demande", label: "Business", priority: "secondary" },
      { href: "/missions", label: "Contenu", priority: "secondary" },
    ],
  },
  {
    label: "Coffre",
    items: [
      { href: "/autre-rive", label: "L’Autre Rive", priority: "primary" },
      { href: "/backup", label: "Sauvegardes", priority: "secondary" },
      { href: "/memoires", label: "Mémoire brute", priority: "secondary" },
    ],
  },
];

function isActive(pathname: string, href: string) {
  return href === "/" ? pathname === "/" : pathname.startsWith(href);
}

function getItemKey(group: NavGroup, item: NavItem) {
  return `${group.label}-${item.label}-${item.href}`;
}

function getActiveItemKey(pathname: string) {
  const preferredMatches = [
    { group: "Centre", href: "/centre-de-controle", label: "Centre" },
    { group: "Manuscrit", href: "/memoires", label: "Mémoires" },
    { group: "Coffre", href: "/backup", label: "Sauvegardes" },
  ];

  const preferredMatch = preferredMatches.find((match) => isActive(pathname, match.href));

  if (preferredMatch) {
    return `${preferredMatch.group}-${preferredMatch.label}-${preferredMatch.href}`;
  }

  for (const group of navGroups) {
    const activeItem = group.items.find((item) => isActive(pathname, item.href));

    if (activeItem) {
      return getItemKey(group, activeItem);
    }
  }

  return null;
}

export default function GlobalNavigation() {
  const pathname = usePathname();
  const [openGroup, setOpenGroup] = useState<string | null>(null);
  const activeItemKey = getActiveItemKey(pathname);

  useEffect(() => {
    setOpenGroup(null);
  }, [pathname]);

  return (
    <nav className="sticky top-0 z-40 border-b border-[#d6b25e]/12 bg-[#090807]/90 px-2 py-1.5 backdrop-blur sm:py-2">
      <div className="mx-auto flex max-w-7xl flex-nowrap items-start gap-1.5 overflow-x-auto pb-1 sm:flex-wrap sm:justify-center sm:overflow-visible sm:pb-0">
        {navGroups.map((group) => {
          const groupActive = Boolean(activeItemKey?.startsWith(`${group.label}-`));

          return (
            <details
              className={`group/nav flex-none rounded-2xl border transition ${
                groupActive
                  ? "border-[#C9A84C]/38 bg-[#15120e]/88"
                  : "border-[#d6b25e]/10 bg-[#11100d]/58 hover:border-[#d6b25e]/20"
              }`}
              key={group.label}
              onToggle={(event) => {
                const isOpen = event.currentTarget.open;
                setOpenGroup((currentGroup) => {
                  if (isOpen) {
                    return group.label;
                  }

                  return currentGroup === group.label ? null : currentGroup;
                });
              }}
              open={openGroup === group.label}
            >
              <summary className="flex cursor-pointer list-none items-center justify-between gap-2 px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.18em] text-[#b8ad99] outline-none transition hover:text-[#f1e7d5] sm:py-2 [&::-webkit-details-marker]:hidden">
                <span>{group.label}</span>
                <span className="text-[12px] leading-none text-[#C9A84C]/70 transition group-open/nav:rotate-45">+</span>
              </summary>

              <div className="hidden w-[min(82vw,320px)] grid-cols-2 gap-1.5 px-2 pb-2 group-open/nav:grid sm:w-auto sm:min-w-[190px] sm:grid-cols-1 lg:min-w-[210px]">
                {group.items.map((item) => {
                  const itemKey = getItemKey(group, item);
                  const active = activeItemKey === itemKey;
                  const priorityClass =
                    item.priority === "primary"
                      ? "text-[11px] text-[#d9c9ad]"
                      : "text-[10.5px] text-[#a89a83]";

                  return (
                    <Link
                      className={`rounded-full border px-2.5 py-1.5 text-center font-semibold leading-none transition sm:text-left ${priorityClass} ${
                        active
                          ? "border-[#C9A84C]/70 bg-[#C9A84C] !text-[#15110d]"
                          : "border-[#d6b25e]/12 bg-[#1a1712]/50 hover:border-[#d6b25e]/30 hover:bg-[#211d16]/72 hover:text-[#f1e7d5]"
                      }`}
                      href={item.href}
                      key={itemKey}
                      onClick={() => setOpenGroup(null)}
                    >
                      {item.label}
                    </Link>
                  );
                })}
              </div>
            </details>
          );
        })}
      </div>
    </nav>
  );
}
