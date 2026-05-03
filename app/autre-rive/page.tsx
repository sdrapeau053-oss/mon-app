import Link from "next/link";

const hubCards = [
  {
    title: "Comprendre",
    subtitle: "Coller une conversation et obtenir une première lecture claire.",
    href: "/analyze",
  },
  {
    title: "Décider",
    subtitle: "Clarifier si tu dois rester, ralentir ou te retirer.",
    href: "/module/decision",
  },
  {
    title: "Se protéger",
    subtitle: "Avancer sans répéter ton passé ni te fermer trop vite.",
    href: "/module/safety",
  },
  {
    title: "Analyse candidat",
    subtitle: "Évaluer une nouvelle personne avec plus de calme et de lucidité.",
    href: "/candidate",
  },
  {
    title: "Historique patterns",
    subtitle: "Voir ce qui revient souvent dans tes lectures relationnelles.",
    href: "/patterns",
  },
  {
    title: "Modules",
    subtitle: "Accéder au module Comprendre approfondi.",
    href: "/module/understand",
  },
];

export default function AutreRiveHubPage() {
  return (
    <main className="min-h-screen bg-[#14110f] px-4 py-5 text-[#f7efe4]">
      <div className="mx-auto flex min-h-[calc(100vh-40px)] w-full max-w-4xl flex-col">
        <header className="mb-8 flex items-center justify-between gap-4">
          <div>
            <p className="mb-2 text-[11px] font-bold uppercase tracking-[0.24em] text-[#c6a96b]">
              Hub relationnel
            </p>
            <h1 className="text-3xl font-semibold tracking-[-0.04em]">L’autre rive</h1>
          </div>
          <Link
            className="rounded-full border border-[#4a4038] bg-[#211c18] px-4 py-2 text-sm font-semibold text-[#f7efe4]"
            href="/"
          >
            Retour
          </Link>
        </header>

        <section className="mb-7 rounded-[28px] border border-[#3d342e] bg-[#1b1613] p-6 shadow-2xl shadow-black/20">
          <p className="mb-3 text-[11px] font-bold uppercase tracking-[0.22em] text-[#c6a96b]">
            Point d’entrée
          </p>
          <h2 className="mb-4 max-w-2xl text-4xl font-semibold leading-tight tracking-[-0.05em]">
            Un module séparé pour accéder aux outils de clarté relationnelle déjà existants.
          </h2>
          <p className="max-w-2xl text-sm leading-7 text-[#c8b898]">
            Cette page ne recrée aucune logique. Elle sert seulement de hub visuel vers les routes
            déjà présentes dans l’application.
          </p>
        </section>

        <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3" aria-label="Sections L’autre rive">
          {hubCards.map((card) => (
            <Link
              className="block rounded-[24px] border border-[#3d342e] bg-[#211c18] p-5 transition-all hover:border-[#c6a96b] hover:bg-[#251f1a]"
              href={card.href}
              key={card.title}
            >
              <h2 className="mb-2 text-xl font-semibold tracking-[-0.03em]">{card.title}</h2>
              <p className="text-sm leading-6 text-[#c8b898]">{card.subtitle}</p>
            </Link>
          ))}
        </section>
      </div>
    </main>
  );
}
