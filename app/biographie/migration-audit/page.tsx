"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  createBiographieMigrationAudit,
  createBiographieMigrationDecisionReport,
  type BiographieMigrationAuditReport,
  type BiographieMigrationDecision,
} from "@/lib/biographie/migration-audit";

const panelClass = "rounded-[14px] border border-[#d6b25e]/10 bg-[#15120f]/76 p-4";

function confidenceClass(confidence: "élevée" | "moyenne" | "faible") {
  if (confidence === "élevée") return "border-emerald-400/25 bg-emerald-400/10 text-emerald-200";
  if (confidence === "moyenne") return "border-[#d6b25e]/25 bg-[#d6b25e]/10 text-[#e8ce8b]";
  return "border-white/10 bg-white/5 text-[#a99b84]";
}

function severityClass(severity: "critique" | "élevée" | "moyenne" | "faible") {
  if (severity === "critique") return "border-red-400/35 bg-red-400/10";
  if (severity === "élevée") return "border-orange-400/25 bg-orange-400/10";
  if (severity === "moyenne") return "border-[#d6b25e]/25 bg-[#d6b25e]/8";
  return "border-white/10 bg-white/[0.03]";
}

function decisionClass(decision: BiographieMigrationDecision) {
  if (decision === "MIGRATION_SAFE") return "border-emerald-400/25 bg-emerald-400/10 text-emerald-200";
  if (decision === "PARTIAL_ONLY") return "border-[#d6b25e]/25 bg-[#d6b25e]/10 text-[#e8ce8b]";
  return "border-red-400/35 bg-red-400/10 text-red-200";
}

function Metric({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-[10px] border border-[#d6b25e]/10 bg-black/15 px-3 py-2">
      <p className="m-0 text-[10px] uppercase tracking-[0.14em] text-[#8f816c]">{label}</p>
      <p className="mt-1 text-lg font-semibold text-[#f5efe3]">{value}</p>
    </div>
  );
}

export default function BiographieMigrationAuditPage() {
  const [report, setReport] = useState<BiographieMigrationAuditReport | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [copySuccess, setCopySuccess] = useState(false);

  useEffect(() => {
    setReport(createBiographieMigrationAudit());
    setIsLoading(false);
  }, []);

  async function copyBackup() {
    if (!report?.backupPayload) return;
    try {
      await navigator.clipboard.writeText(report.backupPayload);
      setCopySuccess(true);
      window.setTimeout(() => setCopySuccess(false), 2000);
    } catch {
      setCopySuccess(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#0d0c0a] px-4 py-6 text-[#f5efe3] sm:px-6">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-4">
        <header className="border-b border-[#d6b25e]/10 pb-4">
          <Link className="text-xs text-[#d6b25e] transition hover:text-[#f5efe3]" href="/biographie">
            ← Biographie
          </Link>
          <h1 className="mt-3 text-2xl font-semibold tracking-tight sm:text-3xl">Audit migration biographie</h1>
          <p className="mt-1 text-sm text-[#a99b84]">Lecture seule — aucune donnée n&apos;est modifiée</p>
        </header>

        {isLoading ? (
          <section className={panelClass}>
            <p className="text-sm text-[#a99b84]">Lecture des données historiques…</p>
          </section>
        ) : report ? (
          <>
            {(() => {
              const decision = createBiographieMigrationDecisionReport(report);
              return (
                <section className={panelClass}>
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="text-[10px] uppercase tracking-[0.16em] text-[#d6b25e]">Décision avant migration</p>
                      <h2 className="mt-1 text-lg font-semibold">Verdict éditorial et technique</h2>
                    </div>
                    <span className={`rounded-full border px-3 py-1 text-xs font-medium ${decisionClass(decision.decision)}`}>
                      {decision.decision}
                    </span>
                  </div>
                  <p className="mt-3 text-sm leading-6 text-[#e7dcc9]">{decision.recommendedNextAction}</p>
                  <div className="mt-4 grid gap-3 lg:grid-cols-2">
                    <article className="rounded-[10px] border border-emerald-400/15 bg-emerald-400/[0.05] p-3">
                      <h3 className="text-sm font-medium text-emerald-200">Éléments migrables</h3>
                      <ul className="mt-2 space-y-1 text-xs text-[#d8d2c6]">
                        {decision.canMigrate.length ? (
                          decision.canMigrate.map((item) => <li key={item}>— {item}</li>)
                        ) : (
                          <li>Aucun élément migrable sans vérification supplémentaire.</li>
                        )}
                      </ul>
                    </article>
                    <article className="rounded-[10px] border border-[#d6b25e]/15 bg-[#d6b25e]/[0.05] p-3">
                      <h3 className="text-sm font-medium text-[#f0d89f]">Validation humaine requise</h3>
                      <ul className="mt-2 space-y-1 text-xs text-[#d8d2c6]">
                        {decision.requiresHumanValidation.length ? (
                          decision.requiresHumanValidation.map((item) => <li key={item}>— {item}</li>)
                        ) : (
                          <li>Aucun cas ambigu détecté.</li>
                        )}
                      </ul>
                    </article>
                    <article className="rounded-[10px] border border-red-400/15 bg-red-400/[0.05] p-3">
                      <h3 className="text-sm font-medium text-red-200">Éléments bloqués</h3>
                      <ul className="mt-2 space-y-1 text-xs text-[#d8d2c6]">
                        {decision.blockedItems.length ? (
                          decision.blockedItems.map((item) => <li key={item}>— {item}</li>)
                        ) : (
                          <li>Aucun blocage détecté.</li>
                        )}
                      </ul>
                    </article>
                    <article className="rounded-[10px] border border-white/10 bg-black/15 p-3">
                      <h3 className="text-sm font-medium text-[#f5efe3]">Raisons du verdict</h3>
                      <ul className="mt-2 space-y-1 text-xs text-[#d8d2c6]">
                        {decision.reasons.map((item) => <li key={item}>— {item}</li>)}
                      </ul>
                    </article>
                  </div>
                </section>
              );
            })()}

            <section className={panelClass}>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-[10px] uppercase tracking-[0.16em] text-[#d6b25e]">Résumé global</p>
                  <h2 className="mt-1 text-lg font-semibold">État de préparation</h2>
                </div>
                <span
                  className={`rounded-full border px-3 py-1 text-xs font-medium ${
                    report.summary.readyForMigration
                      ? "border-emerald-400/25 bg-emerald-400/10 text-emerald-200"
                      : "border-[#d6b25e]/25 bg-[#d6b25e]/10 text-[#e8ce8b]"
                  }`}
                >
                  {report.summary.readyForMigration ? "Prêt pour migration" : "Migration non prête"}
                </span>
              </div>
              <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
                <Metric label="readyForMigration" value={report.summary.readyForMigration ? "Oui" : "Non"} />
                <Metric label="Tomes" value={report.summary.nombreTomesHistoriques} />
                <Metric label="Chapitres" value={report.summary.nombreChapitresHistoriques} />
                <Metric label="Vides" value={report.summary.nombreChapitresVides} />
                <Metric label="Conflits" value={report.summary.nombreConflits} />
                <Metric label="Correspondances" value={report.summary.nombreCorrespondancesProbables} />
              </div>
            </section>

            <section className={panelClass}>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h2 className="text-lg font-semibold">Validation</h2>
                <span className="text-xs text-[#a99b84]">
                  validation.isValid : {report.validation.valid ? "true" : "false"}
                </span>
              </div>
              <div className="mt-3 space-y-2">
                {report.validation.errors.map((error) => (
                  <p className="rounded-[9px] border border-red-400/25 bg-red-400/10 px-3 py-2 text-sm text-red-200" key={error}>
                    {error}
                  </p>
                ))}
                {report.validation.warnings.map((warning) => (
                  <p className="rounded-[9px] border border-[#d6b25e]/20 bg-[#d6b25e]/8 px-3 py-2 text-sm text-[#e8ce8b]" key={warning}>
                    {warning}
                  </p>
                ))}
                {!report.validation.errors.length && !report.validation.warnings.length ? (
                  <p className="text-sm text-emerald-200">Aucune erreur ou alerte de structure.</p>
                ) : null}
              </div>
            </section>

            <section className={panelClass}>
              <h2 className="text-lg font-semibold">Inventaire</h2>
              <div className="mt-3 space-y-3">
                {report.inventory.tomes.map((tome, tomeIndex) => (
                  <article className="rounded-[11px] border border-[#d6b25e]/10 bg-black/15 p-3" key={`${tome.tomeId}-${tomeIndex}`}>
                    <div className="flex flex-wrap items-baseline justify-between gap-2">
                      <div>
                        <h3 className="font-medium">{tome.tomeTitre || "Tome sans titre"}</h3>
                        <p className="mt-0.5 text-xs text-[#8f816c]">{tome.tomeId || "ID absent"}</p>
                      </div>
                      <span className="text-xs text-[#a99b84]">{tome.chapitres.length} chapitre(s)</span>
                    </div>
                    <div className="mt-3 grid gap-2 lg:grid-cols-2">
                      {tome.chapitres.map((chapitre, chapitreIndex) => (
                        <div className="rounded-[9px] border border-white/[0.06] px-3 py-2" key={`${chapitre.chapitreId}-${chapitreIndex}`}>
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <p className="text-sm font-medium">{chapitre.chapitreTitre || "Chapitre sans titre"}</p>
                              <p className="text-[11px] text-[#8f816c]">{chapitre.chapitreId || "ID absent"}</p>
                            </div>
                            {chapitre.isEmpty ? (
                              <span className="rounded-full border border-red-400/25 bg-red-400/10 px-2 py-0.5 text-[10px] text-red-200">Vide</span>
                            ) : null}
                          </div>
                          <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-[#a99b84]">
                            <span>Texte brut : {chapitre.texteBrutLength}</span>
                            <span>Version rédigée : {chapitre.versionRedigeeLength}</span>
                            <span>Score : {chapitre.scoreGlobal ?? "—"}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </article>
                ))}
                {!report.inventory.tomes.length ? <p className="text-sm text-[#a99b84]">Aucun tome historique lisible.</p> : null}
              </div>
            </section>

            <section className={panelClass}>
              <h2 className="text-lg font-semibold">Correspondances</h2>
              <div className="mt-3 grid gap-2 md:grid-cols-2">
                {report.comparison.matches.map((match) => (
                  <article className="rounded-[10px] border border-[#d6b25e]/10 bg-black/15 p-3" key={`${match.historicalChapitreId}-${match.canonicalChapitreId}`}>
                    <p className="text-sm">{match.historicalTitle || match.historicalChapitreId}</p>
                    <p className="my-1 text-[#d6b25e]">↓</p>
                    <p className="text-sm font-medium">{match.canonicalTitle}</p>
                    <span className={`mt-2 inline-block rounded-full border px-2 py-0.5 text-[10px] ${confidenceClass(match.confidence)}`}>
                      Confiance {match.confidence}
                    </span>
                    <ul className="mt-2 space-y-1 text-xs text-[#a99b84]">
                      {match.reasons.map((reason) => <li key={reason}>— {reason}</li>)}
                    </ul>
                  </article>
                ))}
                {!report.comparison.matches.length ? <p className="text-sm text-[#a99b84]">Aucune correspondance trouvée.</p> : null}
              </div>
            </section>

            <section className={panelClass}>
              <h2 className="text-lg font-semibold">Conflits</h2>
              <div className="mt-3 space-y-2">
                {report.comparison.conflicts.map((conflict, index) => (
                  <article className={`rounded-[10px] border p-3 ${severityClass(conflict.severity)}`} key={`${conflict.type}-${index}`}>
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="text-sm font-medium capitalize">{conflict.severity}</p>
                      <span className="text-[10px] uppercase tracking-[0.12em] text-[#a99b84]">{conflict.type}</span>
                    </div>
                    <p className="mt-2 text-sm text-[#e7dcc9]">{conflict.message}</p>
                    <p className="mt-2 text-xs text-[#a99b84]">IDs : {conflict.affectedIds.join(" · ")}</p>
                  </article>
                ))}
                {!report.comparison.conflicts.length ? <p className="text-sm text-emerald-200">Aucun conflit détecté.</p> : null}
              </div>
            </section>

            <section className={panelClass}>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="text-lg font-semibold">Backup</h2>
                  <p className="mt-1 text-sm text-[#a99b84]">Taille du payload : {report.backupPayload.length} caractères</p>
                </div>
                <button
                  className="rounded-[9px] border border-[#d6b25e]/25 px-3 py-2 text-xs text-[#d6b25e] transition hover:border-[#d6b25e]/50 hover:text-[#f5efe3] disabled:opacity-40"
                  disabled={!report.backupPayload}
                  onClick={copyBackup}
                  type="button"
                >
                  {copySuccess ? "Backup copié" : "Copier le backup JSON"}
                </button>
              </div>
            </section>

            <section className={`${panelClass} border-[#d6b25e]/20`}>
              <p className="text-[10px] uppercase tracking-[0.16em] text-[#d6b25e]">Verdict final</p>
              <p className="mt-2 text-sm leading-6 text-[#e7dcc9]">
                {report.summary.readyForMigration
                  ? "Les données historiques semblent suffisamment cohérentes pour préparer une migration contrôlée."
                  : "La migration ne doit pas être lancée tant que les conflits et validations ci-dessus ne sont pas résolus."}
              </p>
            </section>
          </>
        ) : (
          <section className={panelClass}>
            <p className="text-sm text-red-200">Le rapport de migration n&apos;a pas pu être produit.</p>
          </section>
        )}
      </div>
    </main>
  );
}
