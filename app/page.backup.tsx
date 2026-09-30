'use client'

import Link from 'next/link'
import { STRATE_UNIVERS } from '@/lib/strateRoutes'

export default function HomePage() {
  return (
    <div className="min-h-screen bg-[#0e0e0e] text-[#e8e4dc] px-6 py-12 font-mono">
      <div className="max-w-3xl mx-auto">

        <div className="mb-14">
          <h1 className="text-3xl font-light tracking-[0.3em] uppercase mb-2">STRATE</h1>
          <p className="text-[#444] text-sm tracking-widest">Système central personnel</p>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-px bg-[#1a1a1a] mb-px">
          {STRATE_UNIVERS.map(univers => (
            <Link
              key={univers.id}
              href={univers.routes[0]?.href ?? '/'}
              className="bg-[#0e0e0e] px-4 py-5 hover:bg-[#141414] transition-colors group flex flex-col gap-2"
            >
              <span className="text-xl" style={{ color: univers.color }}>{univers.icon}</span>
              <div>
                <div className="text-xs tracking-widest uppercase text-[#888] group-hover:text-[#ccc] transition-colors">
                  {univers.label}
                </div>
                <div className="text-[#2a2a2a] text-xs mt-0.5">{univers.routes.length} modules</div>
              </div>
            </Link>
          ))}
        </div>

        <div className="mt-px">
          <Link
            href="/carte-strate"
            className="flex items-center justify-between w-full bg-[#0e0e0e] border border-[#1a1a1a] px-5 py-4 hover:bg-[#161616] transition-colors group"
          >
            <span className="text-[#444] text-sm tracking-widest uppercase group-hover:text-[#888] transition-colors">
              Carte complète
            </span>
            <span className="text-[#2a2a2a] text-sm group-hover:text-[#555] transition-colors">
              {STRATE_UNIVERS.reduce((acc, u) => acc + u.routes.length, 0)} modules →
            </span>
          </Link>
        </div>

        <div className="mt-8">
          <p className="text-[#2a2a2a] text-xs tracking-widest uppercase mb-3">Accès rapide</p>
          <div className="flex flex-wrap gap-2">
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
                className="text-xs text-[#444] border border-[#1e1e1e] px-3 py-1.5 hover:border-[#333] hover:text-[#888] transition-colors"
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
