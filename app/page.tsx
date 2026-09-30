'use client'

import Link from 'next/link'
import { STRATE_UNIVERS } from '@/lib/strateRoutes'

export default function HomePage() {
  return (
    <div className="min-h-full bg-[#0e0e0e] px-4 py-4 text-[#f2f2f2] font-mono sm:px-5 sm:py-5">
      <div className="mx-auto flex min-h-full max-w-6xl flex-col">
        <div className="mb-5">
          <h1 className="mb-1 text-[clamp(1.65rem,2.6vw,2rem)] font-light uppercase tracking-[0.24em]">STRATE</h1>
          <p className="text-[11px] tracking-[0.22em] text-[#c8c8c8] sm:text-xs">Système central personnel</p>
        </div>

        <div className="mb-px grid grid-cols-1 gap-px bg-[#2a2a2a] sm:grid-cols-2 lg:grid-cols-4">
          {STRATE_UNIVERS.map(univers => (
            <Link
              key={univers.id}
              href={univers.routes[0]?.href ?? '/'}
              className="group flex items-center justify-between bg-[#111111] px-3 py-2.5 transition-colors hover:bg-[#1a1a1a] sm:px-3.5 sm:py-3"
            >
              <div>
                <div className="text-[12px] uppercase tracking-[0.16em] text-[#e8e4dc] transition-colors group-hover:text-white sm:text-[13px]">
                  {univers.label}
                </div>
                <div className="mt-0.5 text-[11px] text-[#aaa]">{univers.routes.length} modules</div>
              </div>
              <span className="text-base opacity-90 sm:text-lg" style={{ color: univers.color }}>{univers.icon}</span>
            </Link>
          ))}
        </div>

        <div className="mt-px">
          <Link
            href="/carte-strate"
            className="group flex w-full items-center justify-between border border-[#333] bg-[#111111] px-4 py-2.5 transition-colors hover:bg-[#1a1a1a]"
          >
            <span className="text-[12px] uppercase tracking-[0.18em] text-[#e8e4dc] transition-colors group-hover:text-white sm:text-sm">
              Carte complète
            </span>
            <span className="text-[12px] text-[#c8c8c8] transition-colors group-hover:text-white sm:text-sm">
              {STRATE_UNIVERS.reduce((acc, u) => acc + u.routes.length, 0)} modules →
            </span>
          </Link>
        </div>

        <div className="mt-4">
          <p className="mb-2 text-[11px] uppercase tracking-[0.18em] text-[#c8c8c8] sm:text-xs">Accès rapide</p>
          <div className="flex flex-wrap gap-1.5">
            {[
              { label: 'Dashboard', href: '/dashboard' },
              { label: 'Écrire maintenant', href: '/ecrire-maintenant' },
              { label: "L'Autre Rive", href: '/autre-rive' },
              { label: 'Régulation', href: '/regulation-emotionnelle' },
              { label: 'Biographie', href: '/biographie' },
              { label: 'Freelance', href: '/freelance' },
              { label: 'Agent IA', href: '/agent' },
            ].map(lien => (
              <Link
                key={lien.href}
                href={lien.href}
                className="border border-[#333] px-3 py-1 text-[11px] text-[#e8e4dc] transition-colors hover:border-[#666] hover:text-white"
              >
                {lien.label}
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
