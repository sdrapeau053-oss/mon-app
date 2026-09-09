"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import { StatusChip, SystemGrid, SystemPageShell, SystemPanel } from "@/components/system-ui";
import { BackLink } from "@/components/ui/back-link";
import {
  readCanonicalRapportsByDossier,
  readImportedConversations,
  readImportValidations,
  readLegacyRapportsAnalyse,
  readRelationDossierById,
  type ConversationImportée,
  type LegacyRapportAnalyse,
  type RapportAnalyse,
  type RelationDossier,
} from "@/lib/autre-rive";

import { DossierBlock } from "./dossier-block";
import { DossierMigrationPanel } from "./dossier-migration-panel";
import { syncManualScoreToCanonicalDossier } from "./manual-score-sync";
import { CriticalSafetyPanel } from "./critical-safety-panel";
import { AssessmentDisagreementPanel } from "./assessment-disagreement-panel";
import { CurrentAssessmentPanel } from "./current-assessment-panel";
import { NeedsPanel } from "./needs-panel";
import { RapportAnalysePanel } from "./rapport-analyse-panel";
import { LegacyScoreValidationPanel } from "./legacy-score-validation-panel";
import {
  createEntityId,
  emotionOptions,
  formatDate,
  formatPeriod,
  formatRelativeDate,
  getAnalyses,
  getClarityLabel,
  getComparisonInsight,
  getConversations,
  getCurrentDynamic,
  getDecisionOptions,
  getDecisionRecommendation,
  getDecisions,
  getJournal,
  getLatestAnalysisSnapshot,
  getProofStats,
  getRecommendedActions,
  getRiskLabel,
  getTimelineItems,
  intentionOptions,
  isLegacyDossierDetailData,
  readLegacyDossierDetails,
  saveLegacyDossierDetails,
  situationOptions,
  summarizeText,
  type AnalyseConversation,
  type Decision,
  type EntreeJournal,
  type LegacyDossierDetailData,
  type RelatedSnapshot,
  type RelationConversation,
  type SectionKey,
} from "./dossier-data";

type ProofDraft = { content: string; dateConversation: string; source: string; title: string };
type JournalDraft = { emotion: string; event: string; intensity: number; trigger: string };
type DecisionDraft = { intention: string; option: string; situation: string };
type IndicatorKey = "niveauClarte" | "niveauReciprocite" | "niveauSecurite" | "energieEmotionnelle";

const buttonStyle = {
  alignItems: "center",
  borderRadius: 999,
  display: "inline-flex",
  fontSize: 12.5,
  gap: 6,
  justifyContent: "center",
  lineHeight: 1,
  minHeight: 36,
  padding: "7px 12px",
  textAlign: "center",
  whiteSpace: "nowrap",
} as const;

const fieldStyle = { display: "grid", gap: 4 } as const;
const controlStyle = { boxSizing: "border-box", fontSize: 13, minHeight: 36, padding: "6px 10px", width: "100%" } as const;

function emptyRelatedSnapshot(): RelatedSnapshot {
  return { importedConversations: [], rapports: [], validations: [] };
}

function readRelatedSnapshot(dossierId: string): RelatedSnapshot {
  return {
    importedConversations: readImportedConversations()
      .filter((item) => item.dossierId === dossierId)
      .sort((a, b) => (b.dateModification || b.dateImport).localeCompare(a.dateModification || a.dateImport)),
    rapports: readLegacyRapportsAnalyse()
      .filter((item) => item.dossierId === dossierId)
      .sort((a, b) => b.dateAnalyse.localeCompare(a.dateAnalyse)),
    validations: readImportValidations().filter((item) =>
      readImportedConversations().some((conversation) => conversation.dossierId === dossierId && conversation.id === item.conversationId),
    ),
  };
}

function getRouteId(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] || "" : value || "";
}

export function RelationDossierScreen() {
  const params = useParams<{ id?: string | string[] }>();
  const dossierId = getRouteId(params.id);

  const [dossier, setDossier] = useState<LegacyDossierDetailData | null>(null);
  // Phase 4 d'IMP-001 : indicateur purement informatif — ce dossier a-t-il
  // déjà une version canonique (SR-D-001, Décision 4) ? Aucun formulaire de
  // confirmation n'est branché ici (voir readRelationDossierById ci-dessous,
  // lecture seule) : cette partie reste explicitement reportée tant que le
  // produit n'a pas d'interface d'identification des participants.
  const [canonicalDossier, setCanonicalDossier] = useState<RelationDossier | null>(null);
  // Phase 9E : rapports d'analyse canoniques, stockage distinct du dossier
  // (autre-rive-rapports-analyse) — jamais dans canonicalDossier lui-même.
  const [canonicalRapports, setCanonicalRapports] = useState<RapportAnalyse[]>([]);
  const [related, setRelated] = useState<RelatedSnapshot>(emptyRelatedSnapshot);
  const [loaded, setLoaded] = useState(false);
  const [notesDraft, setNotesDraft] = useState("");
  const [tagDraft, setTagDraft] = useState("");
  const [proofDraft, setProofDraft] = useState<ProofDraft>({ content: "", dateConversation: "", source: "Messenger", title: "" });
  const [journalDraft, setJournalDraft] = useState<JournalDraft>({ emotion: "", event: "", intensity: 5, trigger: "" });
  const [decisionDraft, setDecisionDraft] = useState<DecisionDraft>({ intention: "", option: "", situation: "" });
  const [feedback, setFeedback] = useState("");
  const [openSections, setOpenSections] = useState<Record<SectionKey, boolean>>({
    analyse: false,
    chronologie: false,
    indicateurs: false,
    preuves: true,
    rapports: false,
  });

  useEffect(() => {
    const found = readLegacyDossierDetails().find((item) => isLegacyDossierDetailData(item) && item.id === dossierId) || null;
    setDossier(found);
    setNotesDraft(found?.notes || "");
    setRelated(found ? readRelatedSnapshot(found.id) : emptyRelatedSnapshot());
    setCanonicalDossier(dossierId ? readRelationDossierById(dossierId) : null);
    setCanonicalRapports(dossierId ? readCanonicalRapportsByDossier(dossierId) : []);
    setLoaded(true);
  }, [dossierId]);

  const refreshRelated = (id: string) => setRelated(readRelatedSnapshot(id));
  const refreshCanonicalDossier = () => setCanonicalDossier(dossierId ? readRelationDossierById(dossierId) : null);
  const refreshCanonicalRapports = () => setCanonicalRapports(dossierId ? readCanonicalRapportsByDossier(dossierId) : []);

  const updateDossier = (updater: (current: LegacyDossierDetailData) => LegacyDossierDetailData) => {
    const next = readLegacyDossierDetails().map((item) => (item.id === dossierId ? updater(item) : item));
    saveLegacyDossierDetails(next);
    const current = next.find((item) => item.id === dossierId) || null;
    setDossier(current);
    if (current) refreshRelated(current.id);
  };

  const conversations = useMemo(() => (dossier ? getConversations(dossier) : []), [dossier]);
  const analyses = useMemo(() => (dossier ? getAnalyses(dossier) : []), [dossier]);
  const decisions = useMemo(() => (dossier ? getDecisions(dossier) : []), [dossier]);
  const journalEntries = useMemo(() => (dossier ? getJournal(dossier) : []), [dossier]);
  const proofStats = useMemo(() => (dossier ? getProofStats(dossier, related) : null), [dossier, related]);
  const timeline = useMemo(() => (dossier ? getTimelineItems(dossier, related) : []), [dossier, related]);
  const clarityLabel = useMemo(() => (dossier ? getClarityLabel(dossier, related.rapports) : "Clarté à construire"), [dossier, related.rapports]);
  const riskLabel = useMemo(() => (dossier ? getRiskLabel(dossier, related.rapports) : "Vigilance à préciser"), [dossier, related.rapports]);
  const currentDynamic = useMemo(() => (dossier ? getCurrentDynamic(dossier, related.rapports, journalEntries) : "Dossier en observation"), [dossier, journalEntries, related.rapports]);
  const latestAnalysis = useMemo(() => (dossier ? getLatestAnalysisSnapshot(dossier, related.rapports) : null), [dossier, related.rapports]);
  const recommendedActions = useMemo(() => (dossier ? getRecommendedActions(dossier, related) : []), [dossier, related]);
  const decisionOptions = useMemo(() => getDecisionOptions(decisionDraft.intention), [decisionDraft.intention]);

  const summaryText = useMemo(() => {
    if (!dossier) return "";
    return dossier.notes?.trim()
      ? summarizeText(dossier.notes, 260)
      : "Résumé à enrichir. Ajoutez quelques lignes nettes pour rendre la relation immédiatement lisible.";
  }, [dossier]);

  const timelineSummary = timeline.length
    ? `${timeline.length} repère(s) · dernière activité ${formatRelativeDate(timeline[0]?.date)}`
    : "Aucun repère chronologique pour le moment.";
  const proofSummary = proofStats
    ? `${proofStats.total} preuve(s) · ${proofStats.importedCount} import(s) · ${proofStats.validationPending} à reprendre`
    : "Aucune preuve encore associée.";
  const analysisSummary = latestAnalysis
    ? `${latestAnalysis.label} · ${formatRelativeDate(latestAnalysis.date)}`
    : "Aucune analyse disponible.";
  const indicatorsSummary = [
    typeof dossier?.niveauClarte === "number" ? `Clarté ${dossier.niveauClarte}/10` : "Clarté à renseigner",
    typeof dossier?.niveauSecurite === "number" ? `Sécurité ${dossier.niveauSecurite}/10` : "Sécurité à renseigner",
  ].join(" · ");
  const reportsSummary = `${related.rapports.length} rapport(s) · ${decisions.length} décision(s) documentée(s)`;
  const comparisonInsight = useMemo(() => getComparisonInsight(timeline), [timeline]);
  const indicatorControls: Array<{ key: IndicatorKey; label: string; value: number }> = [
    { key: "niveauClarte", label: "Clarté", value: dossier?.niveauClarte || 5 },
    { key: "niveauReciprocite", label: "Réciprocité", value: dossier?.niveauReciprocite || 5 },
    { key: "niveauSecurite", label: "Sécurité", value: dossier?.niveauSecurite || 5 },
    { key: "energieEmotionnelle", label: "Énergie", value: dossier?.energieEmotionnelle || 5 },
  ];

  const openSection = (section: SectionKey) => {
    setOpenSections((current) => ({ ...current, [section]: true }));
    window.setTimeout(() => document.getElementById(section)?.scrollIntoView({ behavior: "smooth", block: "start" }), 40);
  };

  const showFeedback = (message: string) => {
    setFeedback(message);
    window.setTimeout(() => setFeedback(""), 1800);
  };

  const saveNotes = () => {
    if (!dossier) return;
    updateDossier((current) => ({ ...current, notes: notesDraft.trim() }));
    showFeedback("Résumé enregistré.");
  };

  const addTag = () => {
    if (!dossier) return;
    const tag = tagDraft.trim();
    if (!tag || dossier.tags?.includes(tag)) return;
    updateDossier((current) => ({ ...current, tags: [...(current.tags || []), tag] }));
    setTagDraft("");
    showFeedback("Tag ajouté.");
  };

  const saveManualProof = () => {
    if (!dossier || proofDraft.content.trim().length < 20) return;
    const conversation: RelationConversation = {
      contenu: proofDraft.content.trim(),
      dateConversation: proofDraft.dateConversation || undefined,
      dateCreation: new Date().toISOString(),
      id: createEntityId("conv"),
      source: proofDraft.source,
      titre: proofDraft.title.trim() || undefined,
    };
    updateDossier((current) => ({ ...current, conversations: [conversation, ...getConversations(current)] }));
    setProofDraft({ content: "", dateConversation: "", source: "Messenger", title: "" });
    showFeedback("Preuve ajoutée.");
  };

  const saveJournalEntry = () => {
    if (!dossier || journalDraft.event.trim().length < 10 || !journalDraft.emotion) return;
    const entry: EntreeJournal = {
      date: new Date().toISOString(),
      declencheur: journalDraft.trigger.trim() || undefined,
      emotion: journalDraft.emotion,
      evenement: journalDraft.event.trim(),
      id: createEntityId("journal"),
      intensite: journalDraft.intensity,
    };
    updateDossier((current) => ({ ...current, journal: [entry, ...getJournal(current)] }));
    setJournalDraft({ emotion: "", event: "", intensity: 5, trigger: "" });
    showFeedback("Événement ajouté.");
  };

  const saveDecision = () => {
    if (!dossier || !decisionDraft.situation || !decisionDraft.intention || !decisionDraft.option) return;
    const decision: Decision = {
      date: new Date().toISOString(),
      id: createEntityId("decision"),
      intention: decisionDraft.intention,
      optionChoisie: decisionDraft.option,
      recommandation: getDecisionRecommendation(dossier),
      situation: decisionDraft.situation,
    };
    updateDossier((current) => ({ ...current, decisions: [decision, ...getDecisions(current)] }));
    setDecisionDraft({ intention: "", option: "", situation: "" });
    showFeedback("Décision enregistrée.");
  };

  if (loaded && !dossier) {
    return (
      <main className="internal-page">
        <SystemPageShell maxWidth={900}>
          <SystemPanel ariaLabel="Dossier introuvable" compact>
            <BackLink href="/autre-rive/dossiers" label="Dossiers" />
            <h1 className="internal-title" style={{ marginTop: 10 }}>Dossier introuvable</h1>
            <p className="internal-subtitle">Ce dossier n'est pas disponible localement.</p>
          </SystemPanel>
        </SystemPageShell>
      </main>
    );
  }

  if (!dossier) {
    return (
      <main className="internal-page">
        <SystemPageShell maxWidth={900}>
          <SystemPanel ariaLabel="Chargement du dossier" compact>
            <p className="editorial-body" style={{ margin: 0 }}>Chargement du dossier...</p>
          </SystemPanel>
        </SystemPageShell>
      </main>
    );
  }

  return (
    <main className="internal-page">
      <SystemPageShell maxWidth={1180}>
        <header className="internal-header">
          <BackLink href="/autre-rive/dossiers" label="Dossiers" />
          <p className="internal-kicker">L'Autre Rive</p>
          <h1 className="internal-title">{dossier.nom}</h1>
          <p className="internal-subtitle">Fiche d'analyse relationnelle claire, lisible et prête pour la suite.</p>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {!canonicalDossier ? (
              <StatusChip tone="warning">À confirmer</StatusChip>
            ) : null}
            <StatusChip tone="warning">{dossier.statut}</StatusChip>
            <StatusChip>{dossier.typeRelation || "Type à préciser"}</StatusChip>
            <StatusChip>{formatPeriod(dossier.dateCreation, dossier.derniereInteraction)}</StatusChip>
            <StatusChip>{clarityLabel}</StatusChip>
            <StatusChip tone={riskLabel === "Vigilance faible" ? "success" : "warning"}>{riskLabel}</StatusChip>
          </div>
        </header>

        {feedback ? (
          <SystemPanel ariaLabel="Confirmation" compact>
            <p className="editorial-body" style={{ color: "var(--accent-gold)", margin: 0 }}>{feedback}</p>
          </SystemPanel>
        ) : null}

        {!canonicalDossier ? (
          <DossierMigrationPanel
            legacyDossier={dossier}
            onMigrated={() => {
              refreshCanonicalDossier();
              setFeedback("Dossier confirmé et migré vers la structure canonique.");
            }}
          />
        ) : null}

        <SystemPanel ariaLabel="Résumé du dossier" compact>
          <div style={{ display: "grid", gap: 14 }}>
            <div style={{ alignItems: "start", display: "flex", flexWrap: "wrap", gap: 12, justifyContent: "space-between" }}>
              <div style={{ display: "grid", gap: 6 }}>
                <p className="label-meta" style={{ margin: 0 }}>Résumé</p>
                <h2 style={{ color: "var(--text-main)", fontFamily: "var(--font-serif)", fontSize: 30, margin: 0 }}>
                  {dossier.nom}
                </h2>
                <p className="editorial-body" style={{ margin: 0 }}>{summaryText}</p>
              </div>
              <div style={{ display: "grid", gap: 8, minWidth: 240 }}>
                <article className="chapter-card" style={{ display: "grid", gap: 4, marginBottom: 0, padding: 12 }}>
                  <span className="label-meta">Dernière analyse</span>
                  <strong style={{ color: "var(--text-main)", fontFamily: "var(--font-serif)", fontSize: 18 }}>{latestAnalysis?.label || "Aucune"}</strong>
                  <span className="editorial-body" style={{ margin: 0 }}>{latestAnalysis ? latestAnalysis.detail : "Lancer une première lecture dès que les preuves sont prêtes."}</span>
                </article>
              </div>
            </div>

            <SystemGrid gap={10} min={220}>
              {[
                ["Personne / pseudonyme", dossier.nom],
                ["Type de relation", dossier.typeRelation || "À préciser"],
                ["Période", formatPeriod(dossier.dateCreation, dossier.derniereInteraction)],
                ["Dernière activité", formatRelativeDate(dossier.derniereInteraction || latestAnalysis?.date || timeline[0]?.date)],
                ["Dynamique principale", currentDynamic],
                ["Preuves disponibles", proofStats ? `${proofStats.total} élément(s)` : "0 élément"],
              ].map(([label, value]) => (
                <article className="chapter-card" key={label} style={{ display: "grid", gap: 4, marginBottom: 0, padding: 12 }}>
                  <span className="label-meta">{label}</span>
                  <strong style={{ color: "var(--text-main)", fontSize: 15 }}>{value}</strong>
                </article>
              ))}
            </SystemGrid>

            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              <button className="internal-button-primary" onClick={() => openSection("preuves")} style={buttonStyle} type="button">Ajouter une preuve</button>
              <Link className="internal-button" href={`/autre-rive/analyse-conversation?dossier=${encodeURIComponent(dossier.id)}`} style={buttonStyle}>Lancer une analyse</Link>
              <button className="internal-button" onClick={() => openSection("rapports")} style={buttonStyle} type="button">Voir les rapports</button>
              <button className="internal-button" onClick={() => openSection("chronologie")} style={buttonStyle} type="button">Comparer deux périodes</button>
              <button className="internal-button" onClick={() => openSection("indicateurs")} style={buttonStyle} type="button">Modifier le résumé</button>
              <button className="internal-button" onClick={() => openSection("chronologie")} style={buttonStyle} type="button">Consulter l'historique</button>
            </div>

            <div style={{ display: "grid", gap: 8 }}>
              <p className="label-meta" style={{ margin: 0 }}>Prochaines actions recommandées</p>
              {recommendedActions.length ? recommendedActions.map((action) => (
                <div key={action.id} style={{ alignItems: "center", display: "grid", gap: 8, gridTemplateColumns: "minmax(0,1fr) auto" }}>
                  <p className="editorial-body" style={{ margin: 0 }}>{action.description}</p>
                  {action.href ? (
                    <Link className="internal-button" href={action.href} style={buttonStyle}>{action.label}</Link>
                  ) : (
                    <button className="internal-button" onClick={() => action.target && openSection(action.target)} style={buttonStyle} type="button">{action.label}</button>
                  )}
                </div>
              )) : <p className="editorial-body" style={{ margin: 0 }}>Le dossier est suffisamment structuré pour continuer sereinement.</p>}
            </div>
          </div>
        </SystemPanel>

        <DossierBlock eyebrow="Bloc 2" id="chronologie" isOpen={openSections.chronologie} onToggle={() => setOpenSections((c) => ({ ...c, chronologie: !c.chronologie }))} summary={timelineSummary} title="Chronologie">
          <article className="chapter-card" style={{ display: "grid", gap: 8, marginBottom: 0, padding: 12 }}>
            <span className="label-meta">Comparaison de périodes</span>
            <p className="editorial-body" style={{ margin: 0 }}>{timeline.length ? timelineSummary : "Pas encore assez d'éléments."}</p>
            <p className="editorial-body" style={{ margin: 0 }}>{timeline.length ? summarizeText(timelineSummary.replace("repère(s)", "repères"), 120) : "Documentez quelques moments-clés pour faire apparaître un rythme."}</p>
          </article>
          <div style={{ display: "grid", gap: 10 }}>
            {timeline.slice(0, 8).map((item) => (
              <article className="chapter-card" key={`${item.label}-${item.date}-${item.detail}`} style={{ display: "grid", gap: 4, marginBottom: 0, padding: 12 }}>
                <div style={{ alignItems: "center", display: "flex", gap: 8, justifyContent: "space-between" }}>
                  <strong style={{ color: "var(--text-main)" }}>{item.label}</strong>
                  <StatusChip tone={item.tone}>{formatRelativeDate(item.date)}</StatusChip>
                </div>
                <p className="editorial-body" style={{ margin: 0 }}>{item.detail}</p>
              </article>
            ))}
          </div>
          <SystemGrid gap={10} min={220}>
            <label style={fieldStyle}><span className="label-meta">Événement majeur</span><textarea onChange={(e) => setJournalDraft((c) => ({ ...c, event: e.target.value }))} rows={3} style={controlStyle} value={journalDraft.event} /></label>
            <label style={fieldStyle}><span className="label-meta">Déclencheur</span><input onChange={(e) => setJournalDraft((c) => ({ ...c, trigger: e.target.value }))} style={controlStyle} value={journalDraft.trigger} /></label>
            <label style={fieldStyle}><span className="label-meta">Émotion</span><select onChange={(e) => setJournalDraft((c) => ({ ...c, emotion: e.target.value }))} style={controlStyle} value={journalDraft.emotion}><option value="">Choisir</option>{emotionOptions.map((emotion) => <option key={emotion} value={emotion}>{emotion}</option>)}</select></label>
            <label style={fieldStyle}><span className="label-meta">Intensité</span><input max={10} min={1} onChange={(e) => setJournalDraft((c) => ({ ...c, intensity: Number(e.target.value) }))} style={controlStyle} type="range" value={journalDraft.intensity} /></label>
          </SystemGrid>
          <button className="internal-button-primary" onClick={saveJournalEntry} style={buttonStyle} type="button">Ajouter à la chronologie</button>
        </DossierBlock>

        <DossierBlock eyebrow="Bloc 3" id="preuves" isOpen={openSections.preuves} onToggle={() => setOpenSections((c) => ({ ...c, preuves: !c.preuves }))} summary={proofSummary} title="Preuves">
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            <Link className="internal-button-primary" href="/autre-rive/import" style={buttonStyle}>Importer une conversation</Link>
            <Link className="internal-button" href="/autre-rive/imports" style={buttonStyle}>Voir les imports</Link>
          </div>
          <SystemGrid gap={10} min={220}>
            <label style={fieldStyle}><span className="label-meta">Titre de la preuve</span><input onChange={(e) => setProofDraft((c) => ({ ...c, title: e.target.value }))} style={controlStyle} value={proofDraft.title} /></label>
            <label style={fieldStyle}><span className="label-meta">Source</span><input onChange={(e) => setProofDraft((c) => ({ ...c, source: e.target.value }))} style={controlStyle} value={proofDraft.source} /></label>
            <label style={fieldStyle}><span className="label-meta">Date de la preuve</span><input onChange={(e) => setProofDraft((c) => ({ ...c, dateConversation: e.target.value }))} style={controlStyle} type="date" value={proofDraft.dateConversation} /></label>
            <label style={{ ...fieldStyle, gridColumn: "1 / -1" }}><span className="label-meta">Preuve manuelle</span><textarea onChange={(e) => setProofDraft((c) => ({ ...c, content: e.target.value }))} rows={5} style={controlStyle} value={proofDraft.content} /></label>
          </SystemGrid>
          <button className="internal-button-primary" onClick={saveManualProof} style={buttonStyle} type="button">Ajouter une preuve</button>
          <SystemGrid gap={10} min={280}>
            {related.importedConversations.slice(0, 3).map((item: ConversationImportée) => (
              <article className="chapter-card" key={item.id} style={{ display: "grid", gap: 5, marginBottom: 0, padding: 12 }}>
                <strong style={{ color: "var(--text-main)" }}>{item.nomFichier}</strong>
                <p className="label-meta" style={{ margin: 0 }}>{item.nombreMessages} message(s) · {item.statut}</p>
                <Link className="internal-button" href={`/autre-rive/imports/${item.id}`} style={buttonStyle}>Ouvrir</Link>
              </article>
            ))}
            {conversations.slice(0, 3).map((item) => (
              <article className="chapter-card" key={item.id} style={{ display: "grid", gap: 5, marginBottom: 0, padding: 12 }}>
                <strong style={{ color: "var(--text-main)" }}>{item.titre || "Preuve locale"}</strong>
                <p className="editorial-body" style={{ margin: 0 }}>{summarizeText(item.contenu, 120)}</p>
                <span className="label-meta">{formatDate(item.dateConversation || item.dateCreation)}</span>
              </article>
            ))}
          </SystemGrid>
        </DossierBlock>

        <DossierBlock eyebrow="Bloc 4" id="analyse" isOpen={openSections.analyse} onToggle={() => setOpenSections((c) => ({ ...c, analyse: !c.analyse }))} summary={analysisSummary} title="Analyse actuelle">
          <article className="chapter-card" style={{ display: "grid", gap: 8, marginBottom: 0, padding: 12 }}>
            <div style={{ alignItems: "center", display: "flex", flexWrap: "wrap", gap: 8, justifyContent: "space-between" }}>
              <strong style={{ color: "var(--text-main)" }}>{latestAnalysis?.label || "Aucune analyse"}</strong>
              {latestAnalysis ? <StatusChip tone={latestAnalysis.tone}>{formatDate(latestAnalysis.date)}</StatusChip> : null}
            </div>
            <p className="editorial-body" style={{ margin: 0 }}>{latestAnalysis?.detail || "Ajoutez des preuves ou lancez une première analyse pour faire émerger la dynamique."}</p>
            <Link className="internal-button-primary" href={`/autre-rive/analyse-conversation?dossier=${encodeURIComponent(dossier.id)}`} style={buttonStyle}>Lancer une analyse</Link>
          </article>
          <SystemGrid gap={10} min={280}>
            {analyses.slice(0, 3).map((analysis: AnalyseConversation) => (
              <article className="chapter-card" key={analysis.id} style={{ display: "grid", gap: 5, marginBottom: 0, padding: 12 }}>
                <strong style={{ color: "var(--text-main)" }}>{analysis.tonalite}</strong>
                <p className="label-meta" style={{ margin: 0 }}>Tension {analysis.niveauTension.toLowerCase()} · {formatDate(analysis.date)}</p>
                <p className="editorial-body" style={{ margin: 0 }}>{summarizeText(analysis.observations.join(" "), 130)}</p>
              </article>
            ))}
            {related.rapports.slice(0, 2).map((rapport: LegacyRapportAnalyse) => (
              <article className="chapter-card" key={rapport.id} style={{ display: "grid", gap: 5, marginBottom: 0, padding: 12 }}>
                <strong style={{ color: "var(--text-main)" }}>Rapport · {rapport.niveauAnalyse}</strong>
                <p className="label-meta" style={{ margin: 0 }}>Certitude {rapport.certitudeGlobale} · {formatDate(rapport.dateAnalyse)}</p>
                <p className="editorial-body" style={{ margin: 0 }}>{summarizeText(rapport.résumé, 130)}</p>
              </article>
            ))}
          </SystemGrid>
        </DossierBlock>

        <DossierBlock eyebrow="Bloc 5" id="indicateurs" isOpen={openSections.indicateurs} onToggle={() => setOpenSections((c) => ({ ...c, indicateurs: !c.indicateurs }))} summary={indicatorsSummary} title="Indicateurs">
          <label style={{ ...fieldStyle }}><span className="label-meta">Résumé court</span><textarea onChange={(e) => setNotesDraft(e.target.value)} rows={4} style={controlStyle} value={notesDraft} /></label>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            <input onChange={(e) => setTagDraft(e.target.value)} placeholder="Ajouter un tag" style={{ ...controlStyle, maxWidth: 220 }} value={tagDraft} />
            <button className="internal-button" onClick={addTag} style={buttonStyle} type="button">Ajouter</button>
            <button className="internal-button-primary" onClick={saveNotes} style={buttonStyle} type="button">Enregistrer le résumé</button>
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {(dossier.tags || []).map((tag) => (
              <button className="internal-button" key={tag} onClick={() => updateDossier((current) => ({ ...current, tags: (current.tags || []).filter((item) => item !== tag) }))} style={buttonStyle} type="button">{tag} ×</button>
            ))}
          </div>
          <SystemGrid gap={10} min={220}>
            {indicatorControls.map(({ key, label, value }) => (
              <label key={key} style={fieldStyle}>
                <span className="label-meta">{label}</span>
                <input
                  max={10}
                  min={1}
                  onChange={(e) => {
                    const rawValue = Number(e.target.value);
                    updateDossier((current) => ({ ...current, [key]: rawValue }));
                    // Phase 8bis.5 — Conformité finale SR-D-001 (Décisions 2 et 3) :
                    // en plus de l'écriture legacy plate ci-dessus (inchangée),
                    // synchronise cette saisie manuelle vers le modèle canonique
                    // d'évaluations lorsque c'est possible. Effet de bord ignoré
                    // volontairement (même précédent que syncAiScoresToCanonicalDossier
                    // dans analyse-conversation/page.tsx) : aucune nouvelle UI n'est
                    // requise par cette sous-phase, et l'écriture legacy reste la
                    // seule source de vérité pour l'affichage de cet écran.
                    syncManualScoreToCanonicalDossier(dossierId, key, rawValue);
                  }}
                  style={controlStyle}
                  type="range"
                  value={Number(value)}
                />
              </label>
            ))}
          </SystemGrid>

          <CriticalSafetyPanel dossier={canonicalDossier} onChange={refreshCanonicalDossier} />

          <AssessmentDisagreementPanel dossier={canonicalDossier} />

          <CurrentAssessmentPanel dossier={canonicalDossier} onChange={refreshCanonicalDossier} />

          <NeedsPanel dossier={canonicalDossier} onChange={refreshCanonicalDossier} />

          <RapportAnalysePanel dossier={canonicalDossier} rapports={canonicalRapports} onChange={refreshCanonicalRapports} />

          <LegacyScoreValidationPanel dossier={canonicalDossier} onChange={refreshCanonicalDossier} />
        </DossierBlock>

        <DossierBlock eyebrow="Bloc 6" id="rapports" isOpen={openSections.rapports} onToggle={() => setOpenSections((c) => ({ ...c, rapports: !c.rapports }))} summary={reportsSummary} title="Rapports">
          <article className="chapter-card" style={{ display: "grid", gap: 6, marginBottom: 0, padding: 12 }}>
            <strong style={{ color: "var(--text-main)" }}>Comparer deux périodes</strong>
            <p className="editorial-body" style={{ margin: 0 }}>{comparisonInsight}</p>
          </article>
          <SystemGrid gap={10} min={280}>
            {related.rapports.slice(0, 3).map((rapport: LegacyRapportAnalyse) => (
              <article className="chapter-card" key={rapport.id} style={{ display: "grid", gap: 5, marginBottom: 0, padding: 12 }}>
                <strong style={{ color: "var(--text-main)" }}>{rapport.niveauAnalyse}</strong>
                <p className="label-meta" style={{ margin: 0 }}>Certitude {rapport.certitudeGlobale} · {formatDate(rapport.dateAnalyse)}</p>
                <p className="editorial-body" style={{ margin: 0 }}>{summarizeText(rapport.résumé, 150)}</p>
              </article>
            ))}
            {decisions.slice(0, 3).map((decision: Decision) => (
              <article className="chapter-card" key={decision.id} style={{ display: "grid", gap: 5, marginBottom: 0, padding: 12 }}>
                <strong style={{ color: "var(--text-main)" }}>{decision.intention}</strong>
                <p className="label-meta" style={{ margin: 0 }}>{formatDate(decision.date)}</p>
                <p className="editorial-body" style={{ margin: 0 }}>{decision.optionChoisie}</p>
              </article>
            ))}
          </SystemGrid>
          <SystemGrid gap={10} min={220}>
            <label style={fieldStyle}><span className="label-meta">Situation</span><select onChange={(e) => setDecisionDraft((c) => ({ ...c, option: "", situation: e.target.value }))} style={controlStyle} value={decisionDraft.situation}><option value="">Choisir</option>{situationOptions.map((item) => <option key={item} value={item}>{item}</option>)}</select></label>
            <label style={fieldStyle}><span className="label-meta">Intention</span><select onChange={(e) => setDecisionDraft((c) => ({ ...c, intention: e.target.value, option: "" }))} style={controlStyle} value={decisionDraft.intention}><option value="">Choisir</option>{intentionOptions.map((item) => <option key={item} value={item}>{item}</option>)}</select></label>
            <label style={fieldStyle}><span className="label-meta">Option choisie</span><select onChange={(e) => setDecisionDraft((c) => ({ ...c, option: e.target.value }))} style={controlStyle} value={decisionDraft.option}><option value="">Choisir</option>{decisionOptions.map((item) => <option key={item} value={item}>{item}</option>)}</select></label>
          </SystemGrid>
          <button className="internal-button-primary" onClick={saveDecision} style={buttonStyle} type="button">Enregistrer une action</button>
        </DossierBlock>
      </SystemPageShell>
    </main>
  );
}
