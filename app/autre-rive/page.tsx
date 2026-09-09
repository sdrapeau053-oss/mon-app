"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { SystemPageShell, SystemPanel } from "@/components/system-ui";
import { BackLink } from "@/components/ui/back-link";
import {
  readImportedConversations,
  readImportValidations,
  readLegacyRapportsAnalyse,
  readPartiallyAdaptedLegacyRelationDossiers,
  readRelationDossiers,
  type ConversationImportée,
} from "@/lib/autre-rive";

// Phase 4 d'IMP-001 : vue d'affichage minimale, alimentée soit par un
// RelationDossier déjà migré (canonique), soit par l'adaptation partielle
// d'un dossier encore legacy (voir readDashboardDossiers ci-dessous). Ni l'un
// ni l'autre n'est écrit par cet écran, qui reste strictement en lecture.
type DashboardDossierView = { dateCreation: string; derniereInteraction?: string; id: string; nom: string };
type DashboardSnapshot = { conversations: ConversationImportée[]; dossiers: DashboardDossierView[]; rapportsCount: number; validationsCount: number };
type NavigationItem = { href: string; label: string };
type PrimaryAction = { cta: string; description: string; href: string; label: string };

const navigationItems: NavigationItem[] = [
  { href: "/autre-rive", label: "Tableau de bord" },
  { href: "/autre-rive/dossiers", label: "Relations" },
  { href: "/autre-rive/import", label: "Preuves" },
  { href: "/autre-rive/analyse-conversation", label: "Analyses" },
  { href: "/autre-rive/imports", label: "Rapports" },
];

const pillButtonStyle = {
  alignItems: "center", border: "1px solid rgba(201,168,92,.2)", borderRadius: 999, color: "#d7cab0",
  display: "inline-flex", fontSize: 11.5, fontWeight: 650, gap: 6, justifyContent: "center",
  lineHeight: 1, minHeight: 32, padding: "7px 11px", whiteSpace: "nowrap",
} as const;

const softCardStyle = {
  background: "rgba(255,250,238,.035)", border: "1px solid rgba(201,168,92,.12)",
  borderRadius: 10, padding: "10px 11px",
} as const;

// Fusionne les dossiers déjà migrés (canoniques) et les dossiers encore
// legacy (via l'adaptation partielle, lecture seule, Phase 3) pour un
// affichage complet du tableau de bord sans attendre que chaque dossier
// soit individuellement migré. Un dossier déjà migré n'apparaît qu'une
// fois : sa version canonique prévaut sur sa version legacy.
function readDashboardDossiers(): DashboardDossierView[] {
  const canonicalDossiers = readRelationDossiers();
  const canonicalIds = new Set(canonicalDossiers.map((dossier) => dossier.id));

  const canonicalViews: DashboardDossierView[] = canonicalDossiers.map((dossier) => ({
    id: dossier.id,
    nom: dossier.name,
    dateCreation: dossier.createdAt,
    derniereInteraction: dossier.updatedAt,
  }));

  const legacyViews: DashboardDossierView[] = readPartiallyAdaptedLegacyRelationDossiers()
    .filter((adaptation) => !canonicalIds.has(adaptation.sourceId))
    .map((adaptation) => ({
      id: adaptation.canonicalFields.id,
      nom: adaptation.canonicalFields.name,
      dateCreation: adaptation.canonicalFields.createdAt,
      derniereInteraction: adaptation.canonicalFields.updatedAt,
    }));

  return [...canonicalViews, ...legacyViews];
}

function formatRelative(value: string): string {
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return "Date inconnue";
  const diff = Math.floor((Date.now() - date.getTime()) / 86_400_000);
  if (diff <= 0) return "Aujourd'hui";
  if (diff === 1) return "Hier";
  if (diff < 7) return `Il y a ${diff} jours`;
  return new Intl.DateTimeFormat("fr-CA", { day: "numeric", month: "short" }).format(date);
}

function buildPrimaryAction(snapshot: DashboardSnapshot): PrimaryAction {
  const pendingValidation = snapshot.conversations.filter((conversation) => conversation.statut === "en_validation" || conversation.nombreMessagesRouge > 0).length;
  const analysable = snapshot.conversations.filter((conversation) => conversation.prêtPourAnalyse).length;
  if (snapshot.dossiers.length === 0) return {
    cta: "Créer un dossier relation", description: "Le système est vide. Commencez par ouvrir un dossier relationnel.",
    href: "/autre-rive/dossiers", label: "Créer un nouveau dossier",
  };
  if (snapshot.conversations.length === 0) return {
    cta: "Importer une conversation", description: "Aucune preuve n'est encore déposée. L'étape utile maintenant est d'ajouter une première conversation.",
    href: "/autre-rive/import", label: "Preuves attendues",
  };
  if (pendingValidation > 0) return {
    cta: "Vérifier maintenant", description: "Des preuves attendent une validation avant de pouvoir alimenter une lecture fiable.",
    href: "/autre-rive/imports", label: "Validation requise",
  };
  if (analysable > 0 && snapshot.rapportsCount === 0) return {
    cta: "Lancer l'analyse", description: "Des preuves sont prêtes. Vous pouvez passer à l'analyse sans ajouter d'étape intermédiaire.",
    href: "/autre-rive/analyse-conversation", label: "Analyse prête",
  };
  return {
    cta: "Ouvrir un dossier", description: "Le meilleur prochain geste est de reprendre le dossier déjà avancé.",
    href: "/autre-rive/dossiers", label: "Continuer le travail",
  };
}

function EmptyCard({ text }: { text: string }) {
  return (
    <div style={softCardStyle}>
      <p style={{ color: "var(--text-main)", fontSize: 13, lineHeight: 1.45, margin: 0 }}>{text}</p>
    </div>
  );
}

export default function AutreRivePage() {
  const [snapshot, setSnapshot] = useState<DashboardSnapshot>({ conversations: [], dossiers: [], rapportsCount: 0, validationsCount: 0 });

  useEffect(() => {
    const conversations = readImportedConversations().sort(
      (first, second) => new Date(second.dateImport).getTime() - new Date(first.dateImport).getTime(),
    );
    setSnapshot({
      conversations,
      dossiers: readDashboardDossiers(),
      rapportsCount: readLegacyRapportsAnalyse().length,
      validationsCount: readImportValidations().length,
    });
  }, []);

  const pendingValidation = useMemo(
    () => snapshot.conversations.filter((conversation) => conversation.statut === "en_validation" || conversation.nombreMessagesRouge > 0).length,
    [snapshot.conversations],
  );
  const analysedCount = useMemo(
    () => snapshot.conversations.filter((conversation) => conversation.statut === "analysé").length,
    [snapshot.conversations],
  );
  const analysisInProgressCount = useMemo(
    () => snapshot.conversations.filter((conversation) => conversation.prêtPourAnalyse && conversation.statut !== "analysé").length,
    [snapshot.conversations],
  );
  const primaryAction = useMemo(() => buildPrimaryAction(snapshot), [snapshot]);
  const recentDossiers = useMemo(
    () => [...snapshot.dossiers]
      .sort((a, b) => new Date(b.derniereInteraction || b.dateCreation).getTime() - new Date(a.derniereInteraction || a.dateCreation).getTime())
      .slice(0, 3),
    [snapshot.dossiers],
  );

  const alerts = useMemo(() => {
    const items: string[] = [];
    if (snapshot.dossiers.length === 0) items.push("Aucun dossier n'est encore ouvert.");
    if (snapshot.dossiers.length > 0 && snapshot.conversations.length === 0) items.push("Des dossiers existent, mais aucune preuve n'a encore été déposée.");
    if (pendingValidation > 0) items.push(`${pendingValidation} conversation(s) attendent une validation humaine.`);
    if (snapshot.conversations.length > 0 && analysedCount === 0) items.push("Des preuves sont présentes, mais aucune analyse n'a encore abouti.");
    if (snapshot.validationsCount > snapshot.rapportsCount && snapshot.validationsCount > 0) items.push("Des validations sont enregistrées sans rapport correspondant.");
    return items;
  }, [analysedCount, pendingValidation, snapshot.conversations.length, snapshot.dossiers.length, snapshot.rapportsCount, snapshot.validationsCount]);

  const visibleAlerts = alerts.slice(0, 3);
  const hiddenAlertsCount = Math.max(0, alerts.length - visibleAlerts.length);

  const counters = [
    { label: "Dossiers", value: String(snapshot.dossiers.length) },
    { label: "Analyses", value: String(analysisInProgressCount) },
    { label: "Rapports", value: String(snapshot.rapportsCount) },
    { label: "Preuves", value: String(snapshot.conversations.length) },
    { label: "Alertes", value: String(alerts.length) },
  ];

  return (
    <main className="internal-page">
      <SystemPageShell maxWidth={980} padding="8px 14px 12px">
        <header className="internal-header" style={{ marginBottom: 6, paddingBottom: 3 }}>
          <BackLink href="/centre-de-controle" label="Centre" />
          <p className="internal-kicker" style={{ margin: "2px 0 0" }}>Analyse des relations</p>
          <h1 className="internal-title" style={{ fontSize: "clamp(1.44rem, 2.7vw, 2rem)", lineHeight: 0.98, margin: "2px 0 0" }}>
            L&apos;Autre Rive
          </h1>
          <p className="internal-subtitle" style={{ fontSize: "0.8rem", lineHeight: 1.3, marginTop: 5, maxWidth: 430 }}>
            Comprendre une relation. Analyser les preuves. Décider avec clarté.
          </p>
        </header>

        <nav aria-label="Navigation principale L'Autre Rive" style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 8 }}>
          {navigationItems.map((item) => (
            <Link className="internal-button" href={item.href} key={item.label} style={{ ...pillButtonStyle, fontSize: 10.75, minHeight: 29, padding: "6px 10px" }}>
              {item.label}
            </Link>
          ))}
        </nav>

        <SystemPanel
          ariaLabel="Action principale"
          compact
          style={{
            background: "linear-gradient(135deg, rgba(201,168,92,.12), rgba(255,250,238,.035))",
            borderColor: "rgba(201,168,92,.34)",
            marginBottom: 8,
            padding: "10px 12px",
          }}
        >
          <div className="grid gap-2 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
            <div style={{ display: "grid", gap: 5 }}>
              <p className="internal-kicker" style={{ margin: 0 }}>À faire maintenant</p>
              <h2 style={{ color: "var(--text-main)", fontFamily: "var(--font-serif)", fontSize: 17, lineHeight: 1.04, margin: 0 }}>
                {primaryAction.label}
              </h2>
              <p className="editorial-body" style={{ fontSize: 12.4, lineHeight: 1.32, margin: 0 }}>
                {primaryAction.description}
              </p>
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              <Link className="internal-button-primary" href={primaryAction.href} style={{ ...pillButtonStyle, minHeight: 29, padding: "6px 10px" }}>
                {primaryAction.cta}
              </Link>
            </div>
          </div>
        </SystemPanel>

        <SystemPanel ariaLabel="Compteurs" compact style={{ marginBottom: 8, padding: "10px 12px" }}>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
            {counters.map((item) => (
              <div
                key={item.label}
                style={{
                  alignItems: "center",
                  background: "rgba(255,250,238,.035)",
                  border: "1px solid rgba(201,168,92,.12)",
                  borderRadius: 8,
                  display: "flex",
                  justifyContent: "space-between",
                  padding: "7px 8px",
                }}
              >
                <span className="label-meta" style={{ margin: 0 }}>{item.label}</span>
                <strong style={{ color: "var(--text-main)", fontSize: 13, fontWeight: 700, lineHeight: 1 }}>{item.value}</strong>
              </div>
            ))}
          </div>
        </SystemPanel>

        <div className="grid gap-2 lg:grid-cols-2" style={{ marginBottom: 8 }}>
          <SystemPanel ariaLabel="Activité récente" compact style={{ marginBottom: 0, padding: "10px 12px" }}>
            <div style={{ display: "grid", gap: 5 }}>
              <p className="internal-kicker" style={{ margin: 0 }}>Activité récente</p>
              <div style={{ display: "grid", gap: 5 }}>
                {recentDossiers.length > 0 ? recentDossiers.map((dossier) => (
                  <Link
                    className="chapter-card"
                    href={`/autre-rive/dossiers/${dossier.id}`}
                    key={dossier.id}
                    style={{
                      alignItems: "center",
                      background: "rgba(255,250,238,.035)",
                      border: "1px solid rgba(201,168,92,.12)",
                      borderRadius: 8,
                      color: "inherit",
                      display: "flex",
                      gap: 8,
                      justifyContent: "space-between",
                      padding: "7px 8px",
                      textDecoration: "none",
                    }}
                  >
                    <span style={{ color: "var(--text-main)", fontSize: 12.6, fontWeight: 600, lineHeight: 1.25, minWidth: 0 }}>
                      {dossier.nom}
                    </span>
                    <span className="label-meta" style={{ flex: "0 0 auto", margin: 0 }}>
                      {formatRelative(dossier.derniereInteraction || dossier.dateCreation)}
                    </span>
                  </Link>
                )) : <EmptyCard text="Aucun dossier récent pour le moment." />}
              </div>
            </div>
          </SystemPanel>

          <SystemPanel ariaLabel="Accès rapide" compact style={{ marginBottom: 0, padding: "10px 12px" }}>
            <div style={{ display: "grid", gap: 5 }}>
              <p className="internal-kicker" style={{ margin: 0 }}>Accès rapide</p>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                <Link className="internal-button" href="/autre-rive/dossiers" style={{ ...pillButtonStyle, minHeight: 29, padding: "6px 10px" }}>
                  Ouvrir un dossier
                </Link>
                <Link className="internal-button" href="/autre-rive/import" style={{ ...pillButtonStyle, minHeight: 29, padding: "6px 10px" }}>
                  Importer une conversation
                </Link>
                <Link className="internal-button" href="/autre-rive/imports" style={{ ...pillButtonStyle, minHeight: 29, padding: "6px 10px" }}>
                  Voir les rapports
                </Link>
              </div>
            </div>
          </SystemPanel>
        </div>

        <SystemPanel ariaLabel="Clarté immédiate" compact style={{ marginBottom: 0, padding: "10px 12px" }}>
          <div style={{ display: "grid", gap: 5 }}>
            <p className="internal-kicker" style={{ margin: 0 }}>Clarté immédiate</p>
            <div style={{ display: "grid", gap: 5 }}>
              {visibleAlerts.length > 0 ? visibleAlerts.map((alert) => (
                <div
                  key={alert}
                  style={{
                    background: "rgba(255,250,238,.035)",
                    border: "1px solid rgba(201,168,92,.12)",
                    borderRadius: 8,
                    padding: "7px 8px",
                  }}
                >
                  <p style={{ color: "var(--text-main)", fontSize: 12.35, lineHeight: 1.32, margin: 0 }}>{alert}</p>
                </div>
              )) : <EmptyCard text="Aucun élément bloquant détecté pour le moment." />}
              {hiddenAlertsCount > 0 ? (
                <p className="label-meta" style={{ margin: "1px 2px 0" }}>
                  + {hiddenAlertsCount} autre{hiddenAlertsCount > 1 ? "s" : ""} alerte{hiddenAlertsCount > 1 ? "s" : ""}
                </p>
              ) : null}
            </div>
          </div>
        </SystemPanel>
      </SystemPageShell>
    </main>
  );
}
