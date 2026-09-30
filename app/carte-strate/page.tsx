'use client'

import { useState } from 'react'
import Link from 'next/link'
import { STRATE_UNIVERS, StrateUnivers } from '@/lib/strateRoutes'

export default function CarteStrate() {
  const [recherche, setRecherche] = useState('')
  const [ouvert, setOuvert] = useState<string | null>(null)

  const filtre = recherche.trim().toLowerCase()

  const universFiltres = filtre
    ? STRATE_UNIVERS.map(u => ({
        ...u,
        routes: u.routes.filter(
          r =>
            r.label.toLowerCase().includes(filtre) ||
            r.description?.toLowerCase().includes(filtre) ||
            r.href.toLowerCase().includes(filtre)
        ),
      })).filter(u => u.routes.length > 0)
    : STRATE_UNIVERS

  return (
    <div className="min-h-screen bg-[#0e0e0e] text-[#e8e4dc] px-6 py-10 font-mono">
      <div className="max-w-4xl mx-auto">
        <div className="mb-10">
          <div className="flex items-center gap-3 mb-2">
            <Link href="/" className="text-[#666] hover:text-[#e8e4dc] text-sm transition-colors">
              ← Accueil
            </Link>
          </div>
          <h1 className="text-2xl font-light tracking-widest uppercase text-[#e8e4dc] mb-1">
            Carte STRATE
          </h1>
          <p className="text-[#666] text-sm">
            {STRATE_UNIVERS.reduce((acc, u) => acc + u.routes.length, 0)} modules ·{' '}
            {STRATE_UNIVERS.length} univers
          </p>
        </div>

        <div className="mb-8">
          <input
            type="text"
            placeholder="Chercher un module..."
            value={recherche}
            onChange={e => setRecherche(e.target.value)}
            className="w-full bg-[#1a1a1a] border border-[#2a2a2a] text-[#e8e4dc] px-4 py-3 text-sm outline-none focus:border-[#444] transition-colors placeholder-[#444] rounded-sm"
          />
        </div>

        {universFiltres.length === 0 ? (
          <p className="text-[#444] text-sm">Aucun module trouvé.</p>
        ) : (
          <div className="space-y-1">
            {universFiltres.map(univers => (
              <UniversSection
                key={univers.id}
                univers={univers}
                ouvert={ouvert === univers.id || filtre.length > 0}
                onToggle={() => setOuvert(prev => (prev === univers.id ? null : univers.id))}
              />
            ))}
          </div>
        )}

        <div className="mt-12 pt-6 border-t border-[#1a1a1a] text-[#333] text-xs">
          STRATE · {new Date().getFullYear()}
        </div>
      </div>
    </div>
  )
}

function UniversSection({
  univers,
  ouvert,
  onToggle,
}: {
  univers: StrateUnivers
  ouvert: boolean
  onToggle: () => void
}) {
  return (
    <div className="border border-[#1e1e1e] rounded-sm overflow-hidden">
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between px-5 py-4 hover:bg-[#161616] transition-colors text-left"
      >
        <div className="flex items-center gap-3">
          <span className="text-lg" style={{ color: univers.color }}>{univers.icon}</span>
          <span className="text-sm tracking-widest uppercase font-light text-[#e8e4dc]">{univers.label}</span>
          <span className="text-[#333] text-xs">{univers.routes.length} modules</span>
        </div>
        <span className="text-[#333] text-xs">{ouvert ? '−' : '+'}</span>
      </button>

      {ouvert && (
        <div className="border-t border-[#1a1a1a]">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-px bg-[#1a1a1a]">
            {univers.routes.map(route => (
              <Link
                key={route.href}
                href={route.href}
                className="bg-[#0e0e0e] px-4 py-3 hover:bg-[#161616] transition-colors group"
              >
                <div className="text-sm mb-0.5 group-hover:text-white transition-colors" style={{ color: univers.color + 'cc' }}>
                  {route.label}
                </div>
                {route.description && (
                  <div className="text-[#333] text-xs group-hover:text-[#555] transition-colors">
                    {route.description}
                  </div>
                )}
                <div className="text-[#2a2a2a] text-xs mt-1 group-hover:text-[#444] transition-colors font-mono">
                  {route.href}
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
