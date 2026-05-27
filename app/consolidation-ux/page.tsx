import Link from "next/link";
import {
  StateTile,
  SystemGrid,
  SystemPageShell,
  SystemPanel,
  SystemSectionHeader,
} from "@/components/system-ui";
import { BackLink } from "@/components/ui/back-link";
import {
  ADVANCED_UX_PAGES,
  ESSENTIAL_UX_PAGES,
  ORPHAN_UX_PAGES,
  UX_FLOWS,
  UX_OPPORTUNITIES,
  UX_OVERLAPS,
  getUxConsolidationStats,
} from "@/lib/consolidation-ux";

function RouteButton({ href, label = "Ouvrir" }: { href: string; label?: string }) {
  return (
    <Link className="internal-button" href={href}>
      {label}
    </Link>
  );
}

export default function ConsolidationUxPage() {
  const stats = getUxConsolidationStats();

  return (
    <main className="internal-page">
      <SystemPageShell maxWidth={1120}>
        <header className="internal-header">
          <BackLink label="Centre" href="/centre-de-controle" />
          <p className="internal-kicker">Audit interne</p>
          <h1 className="internal-title">Consolidation UX</h1>
          <p className="internal-subtitle">
            Lire l’architecture de STRATE, repérer les chevauchements et préparer les simplifications sans supprimer ni fusionner maintenant.
          </p>
        </header>

        <SystemPanel ariaLabel="Vue globale">
          <SystemSectionHeader eyebrow="Vue globale" title="Carte de charge UX" />
          <SystemGrid gap={10} min={160}>
            <StateTile label="Routes totales" value={String(stats.totalRoutes)} />
            <StateTile label="Centre" value={String(stats.byPole.Centre)} />
            <StateTile label="Manuscrit" value={String(stats.byPole.Manuscrit)} />
            <StateTile label="Analyse" value={String(stats.byPole.Analyse)} />
            <StateTile label="Vie" value={String(stats.byPole.Vie)} />
            <StateTile label="Business" value={String(stats.byPole.Business)} />
            <StateTile label="Coffre" value={String(stats.byPole.Coffre)} />
          </SystemGrid>
        </SystemPanel>

        <SystemPanel ariaLabel="Pages essentielles">
          <SystemSectionHeader title="Pages essentielles" />
          <SystemGrid gap={10} min={260}>
            {ESSENTIAL_UX_PAGES.map((page) => (
              <article
                key={page.href}
                style={{
                  background: "rgba(255, 250, 238, 0.035)",
                  border: "1px solid rgba(201, 168, 92, 0.12)",
                  borderRadius: 10,
                  display: "grid",
                  gap: 8,
                  padding: "12px",
                }}
              >
                <div>
                  <h2 style={{ color: "var(--text-main)", fontSize: 15, margin: "0 0 4px" }}>{page.name}</h2>
                  <p className="editorial-body" style={{ fontSize: 12.5, margin: 0 }}>{page.href}</p>
                </div>
                <p className="editorial-body" style={{ margin: 0 }}>{page.role}</p>
                <RouteButton href={page.href} />
              </article>
            ))}
          </SystemGrid>
        </SystemPanel>

        <SystemPanel ariaLabel="Pages avancées">
          <SystemSectionHeader title="Pages avancées" />
          <SystemGrid gap={10} min={260}>
            {ADVANCED_UX_PAGES.map((page) => (
              <article
                key={page.href}
                style={{
                  background: "rgba(255, 250, 238, 0.03)",
                  border: "1px solid rgba(201, 168, 92, 0.1)",
                  borderRadius: 10,
                  display: "grid",
                  gap: 8,
                  padding: "12px",
                }}
              >
                <div>
                  <h2 style={{ color: "var(--text-main)", fontSize: 15, margin: "0 0 4px" }}>{page.name}</h2>
                  <p className="editorial-body" style={{ fontSize: 12.5, margin: 0 }}>{page.href}</p>
                </div>
                <p className="editorial-body" style={{ margin: 0 }}>{page.usage}</p>
                <RouteButton href={page.href} />
              </article>
            ))}
          </SystemGrid>
        </SystemPanel>

        <SystemPanel ariaLabel="Pages orphelines">
          <SystemSectionHeader title="Pages orphelines" />
          <div style={{ display: "grid", gap: 10 }}>
            {ORPHAN_UX_PAGES.map((page) => (
              <article
                key={page.route}
                style={{
                  background: "rgba(255, 250, 238, 0.03)",
                  border: "1px solid rgba(201, 168, 92, 0.1)",
                  borderRadius: 10,
                  display: "grid",
                  gap: 7,
                  padding: "12px",
                }}
              >
                <h2 style={{ color: "var(--text-main)", fontSize: 15, margin: 0 }}>{page.name}</h2>
                <p className="editorial-body" style={{ margin: 0 }}>{page.route}</p>
                <p className="editorial-body" style={{ margin: 0 }}><strong style={{ color: "#f1e7d5" }}>Pourquoi :</strong> {page.reason}</p>
                <p className="editorial-body" style={{ margin: 0 }}><strong style={{ color: "#f1e7d5" }}>Suggestion :</strong> {page.suggestion}</p>
              </article>
            ))}
          </div>
        </SystemPanel>

        <SystemPanel ariaLabel="Parcours recommandés">
          <SystemSectionHeader title="Parcours recommandés" />
          <SystemGrid gap={10} min={230}>
            {UX_FLOWS.map((flow) => (
              <article
                key={flow.name}
                style={{
                  background: "rgba(255, 250, 238, 0.035)",
                  border: "1px solid rgba(201, 168, 92, 0.12)",
                  borderRadius: 10,
                  padding: "12px",
                }}
              >
                <h2 style={{ color: "var(--text-main)", fontSize: 15, margin: "0 0 8px" }}>{flow.name}</h2>
                <p className="editorial-body" style={{ lineHeight: 1.8, margin: 0 }}>
                  {flow.steps.join(" ↓ ")}
                </p>
              </article>
            ))}
          </SystemGrid>
        </SystemPanel>

        <SystemPanel ariaLabel="Chevauchements">
          <SystemSectionHeader title="Chevauchements" />
          <div style={{ display: "grid", gap: 10 }}>
            {UX_OVERLAPS.map((group, index) => (
              <article
                key={group.description}
                style={{
                  background: "rgba(255, 250, 238, 0.03)",
                  border: "1px solid rgba(201, 168, 92, 0.1)",
                  borderRadius: 10,
                  display: "grid",
                  gap: 7,
                  padding: "12px",
                }}
              >
                <h2 style={{ color: "var(--text-main)", fontSize: 15, margin: 0 }}>Groupe {String.fromCharCode(65 + index)}</h2>
                <p className="editorial-body" style={{ margin: 0 }}>{group.pages.join(" · ")}</p>
                <p className="editorial-body" style={{ margin: 0 }}><strong style={{ color: "#f1e7d5" }}>Description :</strong> {group.description}</p>
                <p className="editorial-body" style={{ margin: 0 }}><strong style={{ color: "#f1e7d5" }}>Risque :</strong> {group.risk}</p>
                <p className="editorial-body" style={{ margin: 0 }}><strong style={{ color: "#f1e7d5" }}>Recommandation :</strong> {group.recommendation}</p>
              </article>
            ))}
          </div>
        </SystemPanel>

        <SystemPanel ariaLabel="Opportunités de simplification" compact>
          <SystemSectionHeader title="Opportunités de simplification" />
          <ul className="editorial-body" style={{ display: "grid", gap: 8, margin: 0, paddingLeft: 18 }}>
            {UX_OPPORTUNITIES.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </SystemPanel>
      </SystemPageShell>
    </main>
  );
}
