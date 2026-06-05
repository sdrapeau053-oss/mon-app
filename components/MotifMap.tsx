"use client";

import Link from "next/link";
import { FormEvent, useEffect, useMemo, useState } from "react";
import {
  StatusChip,
  SystemActionRow,
  SystemGrid,
  SystemPageShell,
  SystemPanel,
  SystemSectionHeader,
} from "@/components/system-ui";
import {
  CENTRAL_MOTIFS,
  MANUAL_VARIANTS,
  analyzeMotifs,
  buildChapterSources,
  type MotifEvolution,
  type MotifSnapshot,
  type MotifStats,
} from "@/lib/livre-companion";

// ── Helpers visuels ───────────────────────────────────────────────

function intensityTone(intensity: "faible" | "moyenne" | "forte") {
  if (intensity === "forte") return "border-red-300/35 bg-red-400/10 text-red-100";
  if (intensity === "moyenne") return "border-amber-300/35 bg-amber-400/10 text-amber-100";
  return "border-emerald-300/35 bg-emerald-400/10 text-emerald-100";
}

function evolutionTone(evolution: MotifEvolution) {
  if (evolution === "croissant") return "border-emerald-300/35 bg-emerald-400/10 text-emerald-100";
  if (evolution === "décroissant") return "border-amber-300/35 bg-amber-400/10 text-amber-100";
  if (evolution === "absent") return "border-red-300/35 bg-red-400/10 text-red-100";
  return "border-[#d6b25e]/20 bg-[#0f0d0a]/70 text-[#d8cbb5]";
}

function MetricCard({ label, value, detail }: { label: string; value: string | number; detail?: string }) {
  return (
    <article className="internal-card min-h-[104px]">
      <p className="editorial-label">{label}</p>
      <p className="mt-3 text-3xl font-semibold text-[#f1e7d5]">{value}</p>
      {detail ? <p className="mt-2 text-xs leading-5 text-[#a99b84]">{detail}</p> : null}
    </article>
  );
}

function MotifCard({ motif }: { motif: MotifStats }) {
  return (
    <article className="internal-card">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="editorial-label">Motif</p>
          <h2 className="mt-2 text-xl font-semibold capitalize text-[#f1e7d5]">{motif.motif}</h2>
          <p className="mt-1 text-xs text-[#a99b84]">Variantes : {motif.variants.join(", ")}</p>
        </div>
        <span className={`w-fit rounded-full border px-2.5 py-1 text-[11px] font-semibold ${evolutionTone(motif.evolution)}`}>
          {motif.evolution}
        </span>
      </div>

      <div className="mt-4 grid gap-2 sm:grid-cols-3">
        {(["Apparitions", "Chapitres", "Silence max"] as const).map((label, i) => (
          <div className="rounded-xl border border-[#d6b25e]/12 bg-[#0f0d0a]/60 px-3 py-2" key={label}>
            <p className="text-[10px] uppercase tracking-[0.16em] text-[#a99b84]">{label}</p>
            <p className="mt-1 text-lg font-semibold text-[#f1e7d5]">
              {i === 0 ? motif.appearances : i === 1 ? motif.chapters.length : motif.longestGap}
            </p>
          </div>
        ))}
      </div>

      {(motif.alert || motif.evolution === "absent") && (
        <p className="mt-3 rounded-xl border border-amber-300/35 bg-amber-400/10 px-3 py-2 text-sm text-amber-100">
          {motif.evolution === "absent"
            ? "Motif central absent des chapitres analysés."
            : "Motif absent pendant plus de 8 chapitres consécutifs."}
        </p>
      )}

      <div className="mt-4">
        <p className="editorial-label">Distribution par tome</p>
        <div className="mt-2 flex flex-wrap gap-2">
          {[1, 2, 3, 4].map((tomeId) => (
            <StatusChip key={tomeId}>Tome {tomeId} · {motif.distributionByTome[tomeId] || 0}</StatusChip>
          ))}
        </div>
      </div>

      <div className="mt-4">
        <p className="editorial-label">Dernière apparition</p>
        <p className="mt-1 text-sm text-[#d8cbb5]">{motif.lastAppearance || "non détectée"}</p>
      </div>

      <div className="mt-4">
        <p className="editorial-label">Chronologie</p>
        <div className="mt-3 grid gap-2">
          {motif.chapters.length ? (
            motif.chapters.map((ch, i) => (
              <div className="grid grid-cols-[28px_1fr_auto] items-center gap-3" key={`${motif.motif}-${ch.tomeId}-${ch.title}`}>
                <div className="flex h-full flex-col items-center">
                  <span className="flex h-6 w-6 items-center justify-center rounded-full border border-[#d6b25e]/24 bg-[#0f0d0a] text-[10px] font-semibold text-[#d6b25e]">
                    {i + 1}
                  </span>
                  {i < motif.chapters.length - 1 && <span className="mt-1 h-6 w-px bg-[#d6b25e]/18" />}
                </div>
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-[#f1e7d5]">Tome {ch.tomeId} · {ch.title}</p>
                  <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-[#0f0d0a]">
                    <div className="h-full rounded-full bg-[#d6b25e]" style={{ width: `${Math.min(100, Math.max(12, ch.count * 14))}%` }} />
                  </div>
                </div>
                <span className={`rounded-full border px-2 py-1 text-[10px] font-bold ${intensityTone(ch.intensity)}`}>{ch.intensity}</span>
              </div>
            ))
          ) : (
            <p className="rounded-xl border border-[#d6b25e]/12 bg-[#0f0d0a]/45 px-3 py-2 text-sm text-[#a99b84]">
              Aucune apparition détectée.
            </p>
          )}
        </div>
      </div>
    </article>
  );
}

// ── Composant principal ───────────────────────────────────────────

export default function MotifMap() {
  const [customMotif, setCustomMotif] = useState("");
  const [customMotifs, setCustomMotifs] = useState<string[]>([]);
  const [snapshot, setSnapshot] = useState<MotifSnapshot | null>(null);

  const allMotifs = useMemo(
    () => Array.from(new Set([...CENTRAL_MOTIFS, ...customMotifs].map((m) => m.trim()).filter(Boolean))),
    [customMotifs],
  );

  useEffect(() => {
    const refresh = () => {
      const { chapters, invalidKeys } = buildChapterSources();
      setSnapshot({ chapters, invalidKeys, motifs: analyzeMotifs(chapters, allMotifs) });
    };
    refresh();
    window.addEventListener("storage", refresh);
    return () => window.removeEventListener("storage", refresh);
  }, [allMotifs]);

  const activeMotifs = snapshot?.motifs.filter((m) => m.appearances > 0).length ?? 0;
  const alertMotifs = snapshot?.motifs.filter((m) => m.alert || m.evolution === "absent").length ?? 0;

  function addCustomMotif(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const next = customMotif.trim().toLowerCase();
    if (!next || allMotifs.includes(next)) return;
    setCustomMotifs((c) => [...c, next]);
    setCustomMotif("");
  }

  if (!snapshot) {
    return (
      <main className="internal-page">
        <SystemPageShell maxWidth={1100} padding="22px 16px 44px">
          <SystemPanel compact><p className="editorial-body">Lecture des motifs...</p></SystemPanel>
        </SystemPageShell>
      </main>
    );
  }

  return (
    <main className="internal-page">
      <SystemPageShell maxWidth={1180} padding="22px 16px 44px">
        <header className="internal-header" style={{ display: "flex", flexWrap: "wrap", gap: 14, justifyContent: "space-between" }}>
          <div style={{ minWidth: 0 }}>
            <p className="internal-kicker">Carte des motifs</p>
            <h1 className="internal-title">Motifs trans-tomes</h1>
            <p className="internal-subtitle">Suivi local des symboles narratifs sur les chapitres écrits.</p>
          </div>
          <SystemActionRow>
            <Link className="soft-button" href="/" style={{ textDecoration: "none" }}>Accueil</Link>
            <Link className="soft-button" href="/style-dna" style={{ textDecoration: "none" }}>Style DNA</Link>
          </SystemActionRow>
        </header>

        {snapshot.invalidKeys.length > 0 && (
          <SystemPanel compact style={{ borderColor: "rgba(181, 107, 95, 0.35)", color: "#d79a8f" }}>
            Données JSON invalides : {snapshot.invalidKeys.join(", ")}
          </SystemPanel>
        )}

        <SystemGrid min={190} gap={12}>
          <MetricCard label="Vue globale" value={`${activeMotifs} actifs`} detail={`${alertMotifs} en alerte`} />
          <MetricCard label="Chapitres lus" value={snapshot.chapters.length} detail="Chapitres non vides." />
          <MetricCard label="Motifs suivis" value={snapshot.motifs.length} />
          <MetricCard label="Alertes" value={alertMotifs} detail="Absents ou disparus > 8 ch." />
        </SystemGrid>

        <SystemPanel ariaLabel="Ajouter un motif" style={{ marginTop: 16 }}>
          <form className="flex flex-col gap-3 sm:flex-row sm:items-end" onSubmit={addCustomMotif}>
            <label className="flex-1">
              <span className="editorial-label">Ajouter un motif personnalisé</span>
              <input className="internal-control mt-2 w-full px-3 py-2 text-sm" onChange={(e) => setCustomMotif(e.target.value)} placeholder="ex. fenêtre" type="text" value={customMotif} />
            </label>
            <button className="internal-button-primary w-fit" type="submit">Ajouter</button>
          </form>
        </SystemPanel>

        {snapshot.chapters.length === 0 ? (
          <SystemPanel>
            <SystemSectionHeader eyebrow="État" title="Aucun chapitre écrit détecté" />
            <p className="editorial-body mt-3">La carte apparaîtra dès qu'un texte sera présent dans les structures locales.</p>
          </SystemPanel>
        ) : (
          <section className="grid gap-3 lg:grid-cols-2">
            {snapshot.motifs.map((motif) => <MotifCard key={motif.motif} motif={motif} />)}
          </section>
        )}
      </SystemPageShell>
    </main>
  );
}
