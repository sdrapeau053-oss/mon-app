"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  createBiographieMigrationAudit,
  createBiographieMigrationDecisionReport,
  readBiographieProjetRaw,
} from "@/lib/biographie/migration-audit";
import { lireFragments } from "@/lib/fragments";
import { lireMemoiresNarratives } from "@/lib/memoire-narrative";
import { lireTomes } from "@/lib/manuscript-structure";
import {
  CHAPITRES_MANUSCRIT_STORAGE_KEY,
  CONTENU_CHAPITRE_PREFIX,
  lireChapitresCanoniques,
  lireChapitresStructureParTome,
  lireContenuChapitre,
} from "@/lib/manuscript-chapters";
import { TITRE_TOME_1, compterMotsChapitreTome1, lireChapitresTome1DepuisStorage } from "@/lib/tome1-chapters";

type Confidence = "ÉLEVÉ" | "MOYEN" | "FAIBLE";
type RecommendedStatus = "CANONIQUE" | "À FUSIONNER" | "À ARCHIVER" | "À VALIDER" | "À IGNORER";
type RiskLevel = "FAIBLE" | "MOYEN" | "ÉLEVÉ";
type FinalChoice = "oui" | "non" | "à valider manuellement" | "partielle";

type SourceStrategy = {
  name: string;
  type: string;
  provenance: string;
  itemCount: number;
  wordCount: number;
  confidence: Confidence;
  recommendedStatus: RecommendedStatus;
  justification: string;
};

type RiskItem = {
  title: string;
  level: RiskLevel;
  description: string;
};

type PlanStep = {
  number: number;
  title: string;
  action: string;
  data: string;
  risk: RiskLevel;
  humanValidation: boolean;
};

type StrategyReport = {
  phaseChainComplete: boolean;
  phaseMessage: string;
  detectedKeys: string[];
  sources: SourceStrategy[];
  risks: RiskItem[];
  plan: PlanStep[];
  canonicalSource: {
    name: string;
    justification: string;
    confidence: Confidence;
    conditions: string[];
  } | null;
  verdict: {
    migrationRecommended: FinalChoice;
    consolidationRecommended: FinalChoice;
    sourceRecommended: string;
    globalRisk: RiskLevel;
    nextPhase: string;
  };
};

const panelClass = "rounded-[14px] border border-[#d6b25e]/10 bg-[#15120f]/76 p-4";

function countWords(text: string) {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

function confidenceFromFlags(accessible: boolean, structured: boolean, coherent: boolean): Confidence {
  if (accessible && structured && coherent) return "ÉLEVÉ";
  if (accessible && (structured || coherent)) return "MOYEN";
  return "FAIBLE";
}

function riskClass(level: RiskLevel) {
  if (level === "ÉLEVÉ") return "border-red-400/30 bg-red-400/10 text-red-200";
  if (level === "MOYEN") return "border-[#d6b25e]/25 bg-[#d6b25e]/10 text-[#e8ce8b]";
  return "border-emerald-400/25 bg-emerald-400/10 text-emerald-200";
}

function statusClass(status: RecommendedStatus) {
  if (status === "CANONIQUE") return "border-emerald-400/25 bg-emerald-400/10 text-emerald-200";
  if (status === "À FUSIONNER") return "border-sky-400/25 bg-sky-400/10 text-sky-200";
  if (status === "À VALIDER") return "border-[#d6b25e]/25 bg-[#d6b25e]/10 text-[#e8ce8b]";
  if (status === "À ARCHIVER") return "border-white/10 bg-white/5 text-[#cdbda0]";
  return "border-white/10 bg-black/20 text-[#8f816c]";
}

function readLocalStorageKeys() {
  if (typeof window === "undefined") return [];
  const keys: string[] = [];
  for (let index = 0; index < localStorage.length; index += 1) {
    const key = localStorage.key(index);
    if (key) keys.push(key);
  }
  return keys.sort((a, b) => a.localeCompare(b));
}

function readLegacyEntries() {
  if (typeof window === "undefined") return [];
  const entries: Array<{ key: string; text: string; tomeId: number; title: string; wordCount: number }> = [];
  for (let index = 0; index < localStorage.length; index += 1) {
    const key = localStorage.key(index);
    if (!key || !key.startsWith("ecriture_")) continue;
    const match = key.match(/^ecriture_(\d+)_(.+)$/);
    if (!match) continue;
    const text = (localStorage.getItem(key) || "").trim();
    entries.push({
      key,
      text,
      tomeId: Number(match[1]),
      title: decodeURIComponent(match[2]),
      wordCount: countWords(text),
    });
  }
  return entries;
}

function buildStrategyReport(): StrategyReport {
  const keys = readLocalStorageKeys();
  const migrationAudit = createBiographieMigrationAudit();
  const migrationDecision = createBiographieMigrationDecisionReport(migrationAudit);
  const rawBiographie = readBiographieProjetRaw();
  const tome1 = lireChapitresTome1DepuisStorage();
  const fragments = lireFragments();
  const memoires = lireMemoiresNarratives();
  const structureTomes = lireTomes();
  // LIVRE-P1A — lecture du manuscrit via les primitives Manuscrit (Tomes 2–4 canoniques).
  const structureChapitres = lireChapitresStructureParTome();
  const chapitresCanoniques = lireChapitresCanoniques();
  const canoniqueWordCount = chapitresCanoniques.reduce((sum, chapter) => sum + countWords(lireContenuChapitre(chapter.id)), 0);
  const legacyEntries = readLegacyEntries();

  const persistedPhaseKeys = keys.filter((key) => key.startsWith("biographie-") && key !== "biographie-projet");
  const phaseChainComplete = persistedPhaseKeys.length > 0;
  const phaseMessage = phaseChainComplete
    ? `Des résultats intermédiaires persistés ont été détectés : ${persistedPhaseKeys.join(", ")}.`
    : "Les résultats des phases 1A à 1D ne sont pas persistés : ils sont recalculés à la volée depuis les sources brutes et les pages diagnostic.";

  const structuredChapterCount = Object.values(structureChapitres).reduce((sum, chapters) => sum + chapters.length, 0);
  const tome1WordCount = tome1.reduce((sum, chapter) => sum + compterMotsChapitreTome1(chapter), 0);
  const fragmentsWordCount = fragments.reduce((sum, fragment) => sum + countWords(fragment.texte || ""), 0);
  const memoiresWordCount = memoires.reduce((sum, memoire) => sum + countWords(memoire.texte || ""), 0);
  const legacyWordCount = legacyEntries.reduce((sum, entry) => sum + entry.wordCount, 0);
  const biographieWordCount = migrationAudit.inventory.chapitres.reduce((sum, chapter) => {
    const text = chapter.versionRedigee.trim() || chapter.texteBrut.trim();
    return sum + countWords(text);
  }, 0);

  const orphanFragments = fragments.filter((fragment) => !fragment.manuscrit);
  const fragmentsWithoutChapter = fragments.filter((fragment) => !String(fragment.chapitre || "").trim());
  const memoiresWithoutLink = memoires.filter((memoire) => !memoire.tomeProbable || !memoire.chapitreProbable);
  const conflictingChapters = migrationAudit.comparison.conflicts.filter((conflict) => conflict.type === "contenu_divergent");
  const duplicateOrAmbiguous = migrationAudit.comparison.conflicts.filter((conflict) =>
    conflict.type === "titre_duplique" || conflict.type === "correspondance_ambigue",
  );
  const emptyCanonicalChapters = tome1.filter((chapter) => compterMotsChapitreTome1(chapter) === 0);

  const sources: SourceStrategy[] = [
    {
      name: "chapitres-tome-1",
      type: "localStorage",
      provenance: "/manuscrit, /structure-tome-1, lib/tome1-chapters.ts",
      itemCount: tome1.length,
      wordCount: tome1WordCount,
      confidence: confidenceFromFlags(true, true, true),
      recommendedStatus: "CANONIQUE",
      justification: "Source structurée, active dans l’interface du manuscrit et déjà alignée sur le Tome I canonique.",
    },
    {
      name: "fragments",
      type: "localStorage",
      provenance: "/fragments, /chronologie, /manuscrit",
      itemCount: fragments.length,
      wordCount: fragmentsWordCount,
      confidence: confidenceFromFlags(true, true, fragmentsWithoutChapter.length === 0),
      recommendedStatus: orphanFragments.length > 0 ? "À FUSIONNER" : "À ARCHIVER",
      justification: orphanFragments.length > 0
        ? "Le coffre contient du matériau utile qui n’est pas encore absorbé par le manuscrit canonique."
        : "Les fragments restent utiles comme archive de travail mais ne doivent pas remplacer la source canonique.",
    },
    {
      name: "memoires-narratives",
      type: "localStorage",
      provenance: "/memoires, /heritage-des-silences",
      itemCount: memoires.length,
      wordCount: memoiresWordCount,
      confidence: confidenceFromFlags(true, true, memoiresWithoutLink.length === 0),
      recommendedStatus: memoiresWordCount > 0 ? "À FUSIONNER" : "À IGNORER",
      justification: memoiresWordCount > 0
        ? "Les mémoires structurées enrichissent les chapitres mais restent secondaires tant qu’elles ne sont pas intégrées."
        : "Aucun contenu narratif exploitable détecté.",
    },
    {
      name: "biographie-projet",
      type: "localStorage",
      provenance: "/biographie, app/lib/biographie.ts",
      itemCount: migrationAudit.inventory.chapitres.length,
      wordCount: biographieWordCount,
      confidence: confidenceFromFlags(Boolean(rawBiographie), true, conflictingChapters.length === 0),
      recommendedStatus: biographieWordCount > 0 ? "À VALIDER" : "À IGNORER",
      justification: biographieWordCount > 0
        ? "Source historique lisible mais non canonique, avec correspondances et divergences à vérifier avant toute reprise."
        : "Projet presque vide ou trop pauvre pour piloter le manuscrit actif.",
    },
    {
      name: "ecriture_*",
      type: "localStorage",
      provenance: "composants legacy de structure et d’édition",
      itemCount: legacyEntries.filter((entry) => entry.wordCount > 0).length,
      wordCount: legacyWordCount,
      confidence: confidenceFromFlags(legacyEntries.length > 0, false, false),
      recommendedStatus: legacyWordCount > 0 ? "À VALIDER" : "À IGNORER",
      justification: legacyWordCount > 0
        ? "Des textes existent encore hors du canon structuré et doivent être relus avant consolidation."
        : "Aucun texte libre legacy détecté.",
    },
    {
      name: `${CHAPITRES_MANUSCRIT_STORAGE_KEY} + ${CONTENU_CHAPITRE_PREFIX}*`,
      type: "localStorage",
      provenance: "/structure, /vue-double, lib/manuscript-chapters.ts (LIVRE-P1A)",
      itemCount: chapitresCanoniques.length,
      wordCount: canoniqueWordCount,
      confidence: confidenceFromFlags(true, true, true),
      recommendedStatus: "CANONIQUE",
      justification: "Structure et textes des Tomes 2–4 à identité stable (LIVRE-P1A) ; les clés ecriture_* d'origine sont conservées sans être modifiées.",
    },
    {
      name: "structure-tomes + structure-chapitres",
      type: "localStorage",
      provenance: "/structure, composants legacy",
      itemCount: structureTomes.length + structuredChapterCount,
      wordCount: 0,
      confidence: confidenceFromFlags(true, true, true),
      recommendedStatus: "À ARCHIVER",
      justification: "La structure reste précieuse comme ossature, mais ce n’est pas une source textuelle canonique.",
    },
  ];

  const risks: RiskItem[] = [
    {
      title: "Doublons potentiels",
      level: duplicateOrAmbiguous.length > 0 ? "MOYEN" : "FAIBLE",
      description: duplicateOrAmbiguous.length > 0
        ? `${duplicateOrAmbiguous.length} conflit(s) de titres dupliqués ou de correspondances ambiguës détectés.`
        : "Aucun doublon structurel net détecté.",
    },
    {
      title: "Contenus contradictoires",
      level: conflictingChapters.length > 0 ? "ÉLEVÉ" : "FAIBLE",
      description: conflictingChapters.length > 0
        ? `${conflictingChapters.length} divergence(s) de contenu entre historique et canon actuel.`
        : "Aucune divergence textuelle critique détectée entre historique et canon.",
    },
    {
      title: "Fragments non reliés",
      level: orphanFragments.length >= 10 ? "ÉLEVÉ" : orphanFragments.length > 0 ? "MOYEN" : "FAIBLE",
      description: `${orphanFragments.length} fragment(s) restent hors manuscrit ou sans intégration explicite.`,
    },
    {
      title: "Chapitres incomplets",
      level: emptyCanonicalChapters.length >= 8 ? "ÉLEVÉ" : emptyCanonicalChapters.length > 0 ? "MOYEN" : "FAIBLE",
      description: `${emptyCanonicalChapters.length} chapitre(s) canoniques du Tome I sont encore vides.`,
    },
    {
      title: "Données orphelines",
      level: memoiresWithoutLink.length > 0 || migrationAudit.comparison.orphanHistoricalChapterIds.length > 0 ? "MOYEN" : "FAIBLE",
      description: `${memoiresWithoutLink.length} mémoire(s) sans liaison et ${migrationAudit.comparison.orphanHistoricalChapterIds.length} chapitre(s) historiques orphelins.`,
    },
    {
      title: "Risque de perte",
      level: legacyWordCount > 0 || biographieWordCount > 0 ? "ÉLEVÉ" : "MOYEN",
      description: legacyWordCount > 0 || biographieWordCount > 0
        ? "Du contenu utile existe encore dans des sources secondaires ; une consolidation brutale pourrait l’écraser."
        : "Le risque principal vient de l’absence de résultats intermédiaires persistés.",
    },
  ];

  const plan: PlanStep[] = [
    {
      number: 1,
      title: "Geler la photographie des sources",
      action: "Exporter et documenter toutes les sources actives avant toute consolidation : canon, historique, fragments, mémoires et textes legacy.",
      data: "chapitres-tome-1, biographie-projet, fragments, memoires-narratives, ecriture_*",
      risk: "FAIBLE",
      humanValidation: false,
    },
    {
      number: 2,
      title: "Adopter une cible canonique unique",
      action: "Désigner chapitres-tome-1 comme destination canonique du manuscrit actif, sans encore y écrire automatiquement.",
      data: "chapitres-tome-1, structure du Tome I",
      risk: "MOYEN",
      humanValidation: true,
    },
    {
      number: 3,
      title: "Raccrocher les contenus secondaires",
      action: "Associer chaque fragment, mémoire et texte legacy à un chapitre précis ou le classer explicitement comme archive non intégrée.",
      data: "fragments, memoires-narratives, ecriture_*, biographie-projet",
      risk: "ÉLEVÉ",
      humanValidation: true,
    },
    {
      number: 4,
      title: "Traiter les divergences éditoriales",
      action: "Comparer les contenus contradictoires chapitre par chapitre avant toute fusion, surtout les conflits signalés par l’audit.",
      data: "biographie-projet vs chapitres-tome-1",
      risk: "ÉLEVÉ",
      humanValidation: true,
    },
    {
      number: 5,
      title: "Archiver les sources secondaires",
      action: "Une fois les contenus consolidés et validés, conserver les sources secondaires comme archives de preuve, sans les laisser piloter le manuscrit actif.",
      data: "biographie-projet, fragments, memoires-narratives, ecriture_*",
      risk: "MOYEN",
      humanValidation: true,
    },
  ];

  const canonicalSource = {
    name: "chapitres-tome-1",
    justification: "C’est déjà la source structurée utilisée par /manuscrit et la plus sûre pour devenir le manuscrit canonique opérationnel.",
    confidence: "MOYEN" as Confidence,
    conditions: [
      "Conserver un backup complet de toutes les sources secondaires avant toute écriture.",
      "Valider manuellement les divergences de contenu issues de biographie-projet.",
      "Rattacher les fragments, mémoires et textes legacy utiles à un chapitre canonique.",
    ],
  };

  const globalRisk: RiskLevel = risks.some((risk) => risk.level === "ÉLEVÉ")
    ? "ÉLEVÉ"
    : risks.some((risk) => risk.level === "MOYEN")
      ? "MOYEN"
      : "FAIBLE";

  return {
    phaseChainComplete,
    phaseMessage,
    detectedKeys: keys,
    sources,
    risks,
    plan,
    canonicalSource,
    verdict: {
      migrationRecommended:
        migrationDecision.decision === "MIGRATION_SAFE"
          ? "oui"
          : migrationDecision.decision === "PARTIAL_ONLY"
            ? "à valider manuellement"
            : "non",
      consolidationRecommended: globalRisk === "ÉLEVÉ" ? "partielle" : "oui",
      sourceRecommended: canonicalSource.name,
      globalRisk,
      nextPhase: "Prévisualisation contrôlée du mapping chapitre par chapitre avant toute écriture canonique.",
    },
  };
}

function Metric({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-[10px] border border-[#d6b25e]/10 bg-black/15 px-3 py-2">
      <p className="m-0 text-[10px] uppercase tracking-[0.14em] text-[#8f816c]">{label}</p>
      <p className="mt-1 text-lg font-semibold text-[#f5efe3]">{value}</p>
    </div>
  );
}

export default function BiographieStrategiePage() {
  const [report, setReport] = useState<StrategyReport | null>(null);

  useEffect(() => {
    setReport(buildStrategyReport());
  }, []);

  return (
    <main className="min-h-screen bg-[#0d0c0a] px-4 py-6 text-[#f5efe3] sm:px-6">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-4">
        <header className="border-b border-[#d6b25e]/10 pb-4">
          <Link className="text-xs text-[#d6b25e] transition hover:text-[#f5efe3]" href="/biographie">
            ← Biographie
          </Link>
          <h1 className="mt-3 text-2xl font-semibold tracking-tight sm:text-3xl">Stratégie de consolidation</h1>
          <p className="mt-1 text-sm text-[#a99b84]">Lecture seule — cette page recommande une stratégie sans rien migrer.</p>
        </header>

        {!report ? (
          <section className={panelClass}>
            <p className="text-sm text-[#a99b84]">Analyse des sources manuscrites…</p>
          </section>
        ) : (
          <>
            <section className={panelClass}>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-[10px] uppercase tracking-[0.16em] text-[#d6b25e]">Chaîne des phases</p>
                  <h2 className="mt-1 text-lg font-semibold">Accessibilité des résultats 1A à 1D</h2>
                </div>
                <span className={`rounded-full border px-3 py-1 text-xs font-medium ${report.phaseChainComplete ? statusClass("CANONIQUE") : statusClass("À VALIDER")}`}>
                  complète : {report.phaseChainComplete ? "oui" : "non"}
                </span>
              </div>
              <p className="mt-3 text-sm leading-6 text-[#e7dcc9]">{report.phaseMessage}</p>
              <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
                <Metric label="Clés détectées" value={report.detectedKeys.length} />
                <Metric label="Sources analysées" value={report.sources.length} />
                <Metric label="Risques" value={report.risks.length} />
                <Metric label="Plan" value={report.plan.length} />
              </div>
            </section>

            <section className={panelClass}>
              <h2 className="text-lg font-semibold">Sources analysées</h2>
              <div className="mt-3 space-y-3">
                {report.sources.map((source) => (
                  <article className="rounded-[10px] border border-white/[0.06] bg-black/15 p-3" key={source.name}>
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <p className="text-sm font-medium">{source.name}</p>
                        <p className="mt-0.5 text-[11px] text-[#8f816c]">{source.type} · {source.provenance}</p>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <span className={`rounded-full border px-2 py-0.5 text-[10px] ${statusClass(source.recommendedStatus)}`}>{source.recommendedStatus}</span>
                        <span className={`rounded-full border px-2 py-0.5 text-[10px] ${riskClass(source.confidence === "ÉLEVÉ" ? "FAIBLE" : source.confidence === "MOYEN" ? "MOYEN" : "ÉLEVÉ")}`}>
                          confiance {source.confidence.toLowerCase()}
                        </span>
                      </div>
                    </div>
                    <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-[#a99b84]">
                      <span>{source.itemCount} élément(s)</span>
                      <span>{source.wordCount} mots estimés</span>
                    </div>
                    <p className="mt-2 text-sm leading-6 text-[#d8d2c6]">{source.justification}</p>
                  </article>
                ))}
              </div>
            </section>

            <section className={panelClass}>
              <h2 className="text-lg font-semibold">Analyse des risques</h2>
              <div className="mt-3 grid gap-3 lg:grid-cols-2">
                {report.risks.map((risk) => (
                  <article className={`rounded-[10px] border p-3 ${riskClass(risk.level)}`} key={risk.title}>
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="text-sm font-medium">{risk.title}</p>
                      <span className="text-[10px] uppercase tracking-[0.12em]">{risk.level}</span>
                    </div>
                    <p className="mt-2 text-sm leading-6 text-[#e7dcc9]">{risk.description}</p>
                  </article>
                ))}
              </div>
            </section>

            <section className={panelClass}>
              <h2 className="text-lg font-semibold">Plan de consolidation</h2>
              <div className="mt-3 space-y-3">
                {report.plan.map((step) => (
                  <article className="rounded-[10px] border border-white/[0.06] bg-black/15 p-3" key={step.number}>
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="text-sm font-medium">{step.number}. {step.title}</p>
                      <span className={`rounded-full border px-2 py-0.5 text-[10px] ${riskClass(step.risk)}`}>{step.risk}</span>
                    </div>
                    <p className="mt-2 text-sm leading-6 text-[#d8d2c6]">{step.action}</p>
                    <p className="mt-2 text-xs text-[#a99b84]">Données concernées : {step.data}</p>
                    <p className="mt-1 text-xs text-[#a99b84]">Validation humaine requise : {step.humanValidation ? "oui" : "non"}</p>
                  </article>
                ))}
              </div>
            </section>

            <section className={panelClass}>
              <p className="text-[10px] uppercase tracking-[0.16em] text-[#d6b25e]">Source canonique officielle recommandée</p>
              <h2 className="mt-1 text-lg font-semibold">{report.canonicalSource ? report.canonicalSource.name : "INDÉTERMINÉE — validation requise"}</h2>
              <p className="mt-3 text-sm leading-6 text-[#e7dcc9]">{report.canonicalSource?.justification || "Aucune source suffisamment fiable n’a pu être recommandée automatiquement."}</p>
              {report.canonicalSource ? (
                <>
                  <p className="mt-2 text-xs text-[#a99b84]">Niveau de confiance : {report.canonicalSource.confidence.toLowerCase()}</p>
                  <ul className="mt-3 space-y-1 text-xs text-[#d8d2c6]">
                    {report.canonicalSource.conditions.map((condition) => <li key={condition}>— {condition}</li>)}
                  </ul>
                </>
              ) : null}
            </section>

            <section className={`${panelClass} border-[#d6b25e]/20`}>
              <p className="text-[10px] uppercase tracking-[0.16em] text-[#d6b25e]">Verdict final</p>
              <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
                <Metric label="Migration" value={report.verdict.migrationRecommended} />
                <Metric label="Consolidation" value={report.verdict.consolidationRecommended} />
                <Metric label="Source" value={report.verdict.sourceRecommended} />
                <Metric label="Risque global" value={report.verdict.globalRisk} />
                <Metric label="Chaîne 1A-1D" value={report.phaseChainComplete ? "oui" : "non"} />
              </div>
              <p className="mt-3 text-sm leading-6 text-[#e7dcc9]">Prochaine phase recommandée : {report.verdict.nextPhase}</p>
            </section>
          </>
        )}
      </div>
    </main>
  );
}
