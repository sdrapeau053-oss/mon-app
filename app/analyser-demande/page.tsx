"use client";

import React, { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { analyserDemande, type AnalyseDemande, type ServiceKey, type TonRevision, type NiveauTransformation, type ModeQualite, recommanderApproche, lectureService, genererReponseClient, genererCorrection, genererCorrectionTexte, genererMessageLivraison, CHECKLISTS_SERVICE } from "@/app/lib/analyseur";
import {
  formaterPrix,
  calculerPrix,
  chargerConfig,
  sauvegarderConfig,
  creerConfigDefaut,
  type GrilleConfig,
} from "@/app/lib/grille-prix";
import { MODES } from "@/app/lib/modes";
import { LangToggle } from "@/app/components/LangToggle";
import { FL, type Lang, chargerLang, sauvegarderLang } from "@/app/lib/freelance-lang";

const URGENCE_COLOR: Record<string, string> = { haute: "#a03020", normale: "var(--text-soft)", basse: "var(--text-muted)" };
const COMPLEXITE_COLOR: Record<string, string> = { simple: "#5a8f6a", standard: "var(--accent)", complexe: "#a03020" };
const CHAMPS_PRIX = new Set(["typeId", "longueurKey", "urgence", "complexite", "nombreVersions"]);
type ChampEditable = "client" | "deadline" | "typeId" | "longueurKey" | "urgence" | "complexite" | "nombreVersions" | "objectif" | "style";
const CHAMPS_EDITABLES: ChampEditable[] = ["client", "deadline", "typeId", "longueurKey", "urgence", "complexite", "nombreVersions", "objectif", "style"];

export default function AnalyserDemandePage() {
  const router = useRouter();
  const [texte, setTexte] = useState("");
  const [analyse, setAnalyse] = useState<AnalyseDemande | null>(null);
  const [config, setConfig] = useState<GrilleConfig>(() => chargerConfig());
  const [analyseInitiale, setAnalyseInitiale] = useState<AnalyseDemande | null>(null);
  const [panneauOuvert, setPanneauOuvert] = useState(false);
  const [detailsOuverts, setDetailsOuverts] = useState(false);
  const [detailPrixOuvert, setDetailPrixOuvert] = useState(false);
  const [validationRecente, setValidationRecente] = useState(false);
  const [lang, setLang] = useState<Lang>("fr");
  const [reponseCopie, setReponseCopie] = useState(false);
  const [texteRevision, setTexteRevision] = useState("");
  const [niveauRevision, setNiveauRevision] = useState<"léger" | "standard" | "approfondi">("standard");
  const [tonRevision, setTonRevision] = useState<TonRevision>("neutre");
  const [niveauTransformation, setNiveauTransformation] = useState<NiveauTransformation>("safe");
  const [modeQualite, setModeQualite] = useState<ModeQualite>("soft");
  const [correctionResult, setCorrectionResult] = useState<{ texteCorrige: string; suggestions: string[]; versionFinale: string } | null>(null);
  const [versionFinaleCopie, setVersionFinaleCopie] = useState(false);
  const [correctionCopie, setCorrectionCopie] = useState(false);
  const [modeExecution, setModeExecution] = useState<"auto" | "manual">("auto");
  const [textResults, setTextResults] = useState<{ correction: string; optimisation: string; final: string }>({ correction: "", optimisation: "", final: "" });
  const [activeOutputMode, setActiveOutputMode] = useState<"correction" | "optimisation" | "final" | "compare">("correction");
  const [copiesGeneration, setCopiesGeneration] = useState<Partial<Record<string, boolean>>>({});
  const [vueMessageComplet, setVueMessageComplet] = useState(true);
  const [livraisonCopie, setLivraisonCopie] = useState(false);
  const typeFieldRef = useRef<HTMLDivElement>(null);

  useEffect(() => { setLang(chargerLang()); }, []);

  function handleLangChange(l: Lang) {
    setLang(l);
    sauvegarderLang(l);
    if (analyse) {
      const service = analyse.service;
      const translatedChecklist = CHECKLISTS_SERVICE[service][l];
      setAnalyse({
        ...analyse,
        approcheRecommandee: recommanderApproche(service, l),
        lecture: lectureService(service, l),
        reponseClient: genererReponseClient(analyse, l),
        checklist: translatedChecklist.length > 0 ? translatedChecklist : analyse.checklist,
      });
    }
  }

  const t = FL[lang];
  const aModifications = analyse != null && CHAMPS_EDITABLES.some(c => estModifie(c));

  function validerAnalyse() {
    if (!analyse) return;
    setAnalyseInitiale({ ...analyse });
    setValidationRecente(true);
    setTimeout(() => setValidationRecente(false), 2200);
  }

  function analyser() {
    if (!texte.trim()) return;
    const result = analyserDemande(texte, config);
    setAnalyse(result);
    setAnalyseInitiale(result);
    setDetailsOuverts(false);
  }

  function estModifie(champ: ChampEditable): boolean {
    if (!analyseInitiale || !analyse) return false;
    return String(analyse[champ] ?? "") !== String(analyseInitiale[champ] ?? "");
  }

  function recalculer(cfg: GrilleConfig) {
    if (!texte.trim()) return;
    setAnalyse(analyserDemande(texte, cfg));
  }

  function mettreAJourConfig(cfg: GrilleConfig) {
    setConfig(cfg);
    if (analyse && texte.trim()) recalculer(cfg);
  }

  function majAnalyse(champ: ChampEditable, valeur: string | number | undefined) {
    if (!analyse) return;
    const updated: AnalyseDemande = { ...analyse };

    switch (champ) {
      case "client":
      case "deadline":
      case "objectif":
      case "style":
        updated[champ] = (valeur as string | undefined) || undefined;
        break;
      case "typeId": {
        const id = String(valeur ?? "autre");
        const type = config.types.find(tp => tp.id === id);
        updated.typeId = id;
        updated.typeProjetLabel = type?.label;
        break;
      }
      case "longueurKey": {
        const valides = ["court", "moyen", "long", "tres_long"] as const;
        updated.longueurKey = valides.includes(valeur as typeof valides[number]) ? valeur as typeof valides[number] : "moyen";
        break;
      }
      case "urgence": {
        const valides = ["haute", "normale", "basse"] as const;
        updated.urgence = valides.includes(valeur as typeof valides[number]) ? valeur as typeof valides[number] : "normale";
        break;
      }
      case "complexite": {
        const valides = ["simple", "standard", "complexe"] as const;
        updated.complexite = valides.includes(valeur as typeof valides[number]) ? valeur as typeof valides[number] : "standard";
        break;
      }
      case "nombreVersions":
        updated.nombreVersions = Math.max(1, parseInt(String(valeur)) || 1);
        break;
    }

    if (CHAMPS_PRIX.has(champ)) {
      const calcul = calculerPrix(
        updated.typeId,
        updated.longueurKey,
        updated.urgence,
        updated.complexite,
        updated.nombreVersions,
        config
      );
      updated.prixFinal   = calcul.prixFinal;
      updated.acompte     = calcul.acompte;
      updated.tempsEstime = calcul.tempsEstime;
      updated.detailPrix  = calcul.detail;
    }

    setAnalyse(updated);
  }

  function genererIdType(label: string, existants: string[]): string {
    const base = label
      .toLowerCase()
      .normalize("NFD").replace(/[̀-ͯ]/g, "")
      .replace(/[^a-z0-9]+/g, "_")
      .replace(/^_|_$/g, "") || "type";
    if (!existants.includes(base)) return base;
    let n = 2;
    while (existants.includes(`${base}_${n}`)) n++;
    return `${base}_${n}`;
  }

  function modifierType(index: number, champ: "label" | "base", valeur: string | number) {
    const valeurNormalisee = champ === "base" ? Math.max(0, parseFloat(String(valeur)) || 0) : valeur;
    const types = config.types.map((tp, i) => {
      if (i !== index) return tp;
      const updated = { ...tp, [champ]: valeurNormalisee };
      if (champ === "label" && tp.id !== "autre") {
        const autresIds = config.types.filter((_, j) => j !== index).map(tp2 => tp2.id);
        updated.id = genererIdType(String(valeur), autresIds);
      }
      return updated;
    });
    mettreAJourConfig({ ...config, types });
  }

  function ajouterType() {
    const ids = config.types.map(tp => tp.id);
    const id = genererIdType(lang === "fr" ? "Nouveau type" : "New type", ids);
    mettreAJourConfig({ ...config, types: [...config.types, { id, label: lang === "fr" ? "Nouveau type" : "New type", base: 100 }] });
  }

  function supprimerType(index: number) {
    if (config.types[index]?.id === "autre") return;
    mettreAJourConfig({ ...config, types: config.types.filter((_, i) => i !== index) });
  }

  function modifierCoeff(section: "longueur" | "complexite" | "urgence", cle: string, valeur: number) {
    const v = Math.max(0.01, valeur || 0.01);
    mettreAJourConfig({ ...config, [section]: { ...config[section], [cle]: v } });
  }

  function genererTextes(typeId: string | undefined, service: ServiceKey): { titre: string; statut: string }[] {
    if (service === "revision") return [
      { titre: "Texte corrigé",   statut: "à faire" },
      { titre: "Suggestions",     statut: "à faire" },
      { titre: "Version finale",  statut: "à faire" },
    ];
    if (service === "traduction") return [
      { titre: "Version source",   statut: "à faire" },
      { titre: "Version traduite", statut: "à faire" },
    ];
    const mapping: Record<string, { titre: string; statut: string }[]> = {
      page_vente:    [{ titre: "Page de vente",    statut: "à faire" }],
      site_web:      [{ titre: "Page d'accueil",   statut: "à faire" }, { titre: "Sections du site", statut: "à faire" }],
      email:         [{ titre: "Email principal",  statut: "à faire" }],
      article:       [{ titre: "Article",          statut: "à faire" }],
      newsletter:    [{ titre: "Newsletter",        statut: "à faire" }],
      fiche_produit: [{ titre: "Fiche produit",    statut: "à faire" }],
      brochure:      [{ titre: "Brochure",         statut: "à faire" }],
    };
    return mapping[typeId ?? ""] ?? [
      { titre: "Structure",  statut: "à faire" },
      { titre: "Version 1",  statut: "à faire" },
      { titre: "Révisions",  statut: "à faire" },
    ];
  }

  function creerMission() {
    if (!analyse) return;
    const nom = [analyse.typeProjetLabel, analyse.client].filter(Boolean).join(" — ") || "Nouvelle mission";
    const mission = {
      id: Date.now(),
      nom,
      client: analyse.client,
      objectif: analyse.objectif ?? "",
      mode: analyse.modeRecommande,
      brief: texte.trim(),
      date: new Date().toLocaleDateString("fr-CA"),
      textes: genererTextes(analyse.typeId, analyse.service),
    };
    const missions = JSON.parse(localStorage.getItem("missions") || "[]");
    missions.unshift(mission);
    localStorage.setItem("missions", JSON.stringify(missions));
    router.push(`/missions/${mission.id}`);
  }

  return (
    <main style={{ maxWidth: 800, margin: "0 auto", padding: "32px 24px" }}>

      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20 }}>
        <div>
          <h1 style={{ fontSize: 24, fontStyle: "italic", color: "var(--primary)" }}>{t.analyserDemande}</h1>
          <p style={{ fontSize: 12, color: "var(--text-muted)" }}>{t.collerMessage}</p>
        </div>
        <nav style={{ display: "flex", gap: 14, flexWrap: "wrap", justifyContent: "flex-end", alignItems: "center" }}>
          <LangToggle lang={lang} onChange={handleLangChange} />
          <Link href="/" style={{ fontSize: 12, color: "var(--primary)" }}>{t.accueil}</Link>
          <Link href="/missions" style={{ fontSize: 12, color: "var(--primary)" }}>{t.voirMissions}</Link>
        </nav>
      </div>
      <div style={{ borderTop: "1px solid var(--border-soft)", marginBottom: 24 }} />

      {/* Zone de saisie */}
      <p className="label-meta" style={{ marginBottom: 8 }}>{t.messageClient}</p>
      <textarea
        className="textarea-atelier"
        value={texte}
        onChange={(e) => { setTexte(e.target.value); setAnalyse(null); }}
        placeholder={t.placeholderMessage}
        style={{ minHeight: 200 }}
      />
      <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 10, marginBottom: 36 }}>
        <button onClick={analyser} className="btn-primary" disabled={!texte.trim()}>
          {t.analyserBtn}
        </button>
      </div>

      {/* Panneau de configuration */}
      <div style={{ marginBottom: 32 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
          <p className="label-meta">{t.configurerTarifs}</p>
          <button onClick={() => setPanneauOuvert(v => !v)} className="btn-ghost" style={{ fontSize: 11 }}>
            {panneauOuvert ? t.fermerPanel : t.modifierPanel}
          </button>
        </div>

        {panneauOuvert && (
          <div className="chapter-card" style={{ padding: 22, display: "flex", flexDirection: "column", gap: 24 }}>

            <div>
              <p className="label-meta" style={{ marginBottom: 12 }}>{t.typesProjet}</p>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {config.types.map((type, i) => (
                  <div key={type.id} style={{ display: "flex", gap: 8, alignItems: "center" }}>
                    <input type="text" className="search-input" value={type.label}
                      onChange={(e) => modifierType(i, "label", e.target.value)}
                      style={{ flex: 2, marginBottom: 0, fontSize: 13 }} />
                    <input type="number" className="search-input" value={type.base} min={0}
                      onChange={(e) => modifierType(i, "base", parseFloat(e.target.value) || 0)}
                      style={{ width: 90, marginBottom: 0, fontSize: 13 }} />
                    <span style={{ fontSize: 12, color: "var(--text-muted)", flexShrink: 0 }}>$</span>
                    <button onClick={() => supprimerType(i)} className="soft-button"
                      disabled={type.id === "autre"}
                      style={{ fontSize: 11, color: type.id === "autre" ? "var(--text-muted)" : "#c00", flexShrink: 0 }}>
                      ✕
                    </button>
                  </div>
                ))}
              </div>
              <button onClick={ajouterType} className="btn-ghost" style={{ fontSize: 11, marginTop: 10 }}>
                {t.ajouterType}
              </button>
            </div>

            <div>
              <p className="label-meta" style={{ marginBottom: 12 }}>{t.coefficients}</p>
              <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                <CoeffSection titre={t.longueurSection}
                  champs={[
                    { cle: "court",     label: lang === "fr" ? "Court"     : "Short" },
                    { cle: "moyen",     label: lang === "fr" ? "Moyen"     : "Medium" },
                    { cle: "long",      label: lang === "fr" ? "Long"      : "Long" },
                    { cle: "tres_long", label: lang === "fr" ? "Très long" : "Very long" },
                  ]}
                  valeurs={config.longueur as Record<string, number>}
                  onChange={(cle, val) => modifierCoeff("longueur", cle, val)} />
                <CoeffSection titre={t.complexiteSection}
                  champs={[
                    { cle: "simple",   label: t.simple },
                    { cle: "standard", label: t.standard },
                    { cle: "complexe", label: t.complexe },
                  ]}
                  valeurs={config.complexite as Record<string, number>}
                  onChange={(cle, val) => modifierCoeff("complexite", cle, val)} />
                <CoeffSection titre={t.urgenceSection}
                  champs={[
                    { cle: "haute",   label: lang === "fr" ? "Haute"   : "High" },
                    { cle: "normale", label: lang === "fr" ? "Normale" : "Normal" },
                    { cle: "basse",   label: lang === "fr" ? "Basse"   : "Low" },
                  ]}
                  valeurs={config.urgence as Record<string, number>}
                  onChange={(cle, val) => modifierCoeff("urgence", cle, val)} />
              </div>
            </div>

            <div>
              <p className="label-meta" style={{ marginBottom: 12 }}>{t.autres}</p>
              <div style={{ display: "flex", gap: 24, flexWrap: "wrap" }}>
                <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                  <span style={{ fontSize: 11, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: 1 }}>{t.versionSuppl}</span>
                  <input type="number" className="search-input" value={config.versionSuppl} min={0}
                    onChange={(e) => mettreAJourConfig({ ...config, versionSuppl: Math.max(0, parseFloat(e.target.value) || 0) })}
                    style={{ width: 100, marginBottom: 0, fontSize: 13 }} />
                </label>
                <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                  <span style={{ fontSize: 11, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: 1 }}>{t.acompteConfig}</span>
                  <input type="number" className="search-input" value={config.acompte} min={0} max={1} step={0.05}
                    onChange={(e) => mettreAJourConfig({ ...config, acompte: Math.min(1, Math.max(0, parseFloat(e.target.value) || 0)) })}
                    style={{ width: 100, marginBottom: 0, fontSize: 13 }} />
                </label>
              </div>
            </div>

            <div style={{ display: "flex", gap: 8, paddingTop: 4, borderTop: "1px solid var(--border-soft)" }}>
              <button onClick={() => sauvegarderConfig(config)} className="btn-primary" style={{ fontSize: 12 }}>{t.enregistrer}</button>
              <button onClick={() => mettreAJourConfig(creerConfigDefaut())} className="btn-ghost" style={{ fontSize: 12 }}>{t.reinitialiser}</button>
            </div>

          </div>
        )}
      </div>

      {/* Fiche d'analyse */}
      {analyse && (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>

          {/* ── Résumé action ── */}
          <div className="chapter-card" style={{ padding: "22px 24px", borderLeft: "3px solid var(--primary)" }}>

            <div style={{ marginBottom: 16, display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
              <span style={{
                fontSize: 10,
                textTransform: "uppercase",
                letterSpacing: 1.2,
                color: validationRecente ? "#5a8f6a" : aModifications ? "var(--primary)" : "var(--text-muted)",
                fontWeight: (validationRecente || aModifications) ? 600 : 400,
                transition: "color 0.3s",
              }}>
                {validationRecente ? t.analyseValideeFeedback : aModifications ? t.modificationsEnCours : t.analyseInitiale}
              </span>
              {analyse.manquants.length > 0 && (
                <span style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: 1.2, color: "#a03020" }}>
                  ⚠ {analyse.manquants.length} {analyse.manquants.length > 1 ? t.infoPluriel : t.infoSingulier}
                </span>
              )}
            </div>

            <div style={{ marginBottom: 12 }}>
              <button
                onClick={() => setDetailPrixOuvert(v => !v)}
                style={{ background: "none", border: "none", padding: 0, cursor: "pointer", textAlign: "left" }}
                title={lang === "fr" ? "Voir le détail du calcul" : "View price breakdown"}
              >
                <p className="label-meta" style={{ marginBottom: 4 }}>
                  {t.prixTotal} {detailPrixOuvert ? "▲" : "▼"}
                </p>
                <p style={{ fontSize: 38, fontWeight: 700, color: "var(--primary)", letterSpacing: -1, lineHeight: 1 }}>
                  {formaterPrix(analyse.prixFinal)}
                </p>
              </button>
            </div>

            <div style={{ display: "flex", gap: 28, flexWrap: "wrap", alignItems: "flex-end", marginBottom: 10 }}>
              <button
                onClick={() => typeFieldRef.current?.scrollIntoView({ behavior: "smooth", block: "center" })}
                style={{ background: "none", border: "none", padding: 0, cursor: "pointer", textAlign: "left" }}
                title={lang === "fr" ? "Modifier le type" : "Edit type"}
              >
                <p className="label-meta" style={{ marginBottom: 2 }}>{t.typeBtn}</p>
                <p style={{ fontSize: 15, fontWeight: 600, color: "var(--text-main)" }}>
                  {analyse.typeProjetLabel ?? "—"}
                </p>
              </button>
              <div>
                <p className="label-meta" style={{ marginBottom: 2 }}>{t.serviceLabel}</p>
                <span style={{
                  fontSize: 12,
                  fontWeight: 600,
                  color: "#fff",
                  background: getServiceColor(analyse.service),
                  borderRadius: 10,
                  padding: "2px 10px",
                  display: "inline-block",
                }}>
                  {analyse.service === "revision"   ? t.serviceRevisionAvancee
                  : analyse.service === "traduction" ? t.serviceTraduction
                  : t.serviceGhostwriting}
                </span>
              </div>
              <div>
                <p className="label-meta" style={{ marginBottom: 2 }}>{t.approcheLabel}</p>
                <p style={{ fontSize: 14, color: "var(--text-soft)", fontStyle: "italic" }}>
                  {analyse.approcheRecommandee}
                </p>
              </div>
              <div>
                <p className="label-meta" style={{ marginBottom: 2 }}>{t.lectureLabel}</p>
                <p style={{ fontSize: 13, color: "var(--text-muted)" }}>
                  {analyse.lecture}
                </p>
              </div>
              <div>
                <p className="label-meta" style={{ marginBottom: 2 }}>{t.tempsEstime}</p>
                <p style={{ fontSize: 15, color: "var(--text-soft)" }}>{analyse.tempsEstime}</p>
              </div>
            </div>

            <p style={{ fontSize: 13, color: "var(--text-muted)", marginBottom: 16 }}>
              {t.acompteLabel} ({Math.round(config.acompte * 100)} %) — {formaterPrix(analyse.acompte)}
            </p>

            {detailPrixOuvert && (
              <div style={{ marginBottom: 16, paddingTop: 10, borderTop: "1px solid var(--border-soft)" }}>
                {analyse.detailPrix.map((ligne, i) => (
                  <p key={i} style={{ fontSize: 12, color: "var(--text-soft)", lineHeight: 2 }}>→ {ligne}</p>
                ))}
              </div>
            )}

            <div style={{ display: "flex", gap: 12, alignItems: "center", paddingTop: 12, borderTop: "1px solid var(--border-soft)" }}>
              <BoutonCTA onClick={creerMission}>{t.creerMission}</BoutonCTA>
              <div style={{ width: 1, height: 28, background: "var(--border-soft)" }} />
              {(aModifications || validationRecente) ? (
                <button
                  onClick={validerAnalyse}
                  className="btn-ghost"
                  style={{ fontSize: 13, color: validationRecente ? "#5a8f6a" : undefined }}
                  disabled={validationRecente}
                >
                  {validationRecente ? t.analyseValideeBtn : t.validerAnalyse}
                </button>
              ) : (
                <span style={{ fontSize: 12, color: "var(--text-muted)", fontStyle: "italic" }}>{t.aucuneModification}</span>
              )}
            </div>

          </div>

          {/* ── Informations détectées ── */}
          <div className="chapter-card" style={{ padding: 22 }}>
            <p className="label-meta" style={{ color: "var(--primary)", marginBottom: 16 }}>
              {t.informationsDetectees}
              {(["client","deadline","typeId","longueurKey","urgence","nombreVersions"] as ChampEditable[]).some(c => estModifie(c)) && (
                <span style={{ marginLeft: 8, fontSize: 9, color: "var(--primary)" }}>● {lang === "fr" ? "modifié" : "modified"}</span>
              )}
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>

              <RowInput
                label={t.client}
                value={analyse.client ?? ""}
                onChange={(v) => majAnalyse("client", v || undefined)}
                placeholder={t.placeholderClient}
                modifie={estModifie("client")}
              />

              <div ref={typeFieldRef}>
                <RowSelect
                  label={t.typeDeProjet}
                  value={config.types.some(tp => tp.id === analyse.typeId) ? (analyse.typeId ?? "autre") : "autre"}
                  options={config.types.map(tp => ({ value: tp.id, label: tp.label }))}
                  onChange={(v) => majAnalyse("typeId", v)}
                  modifie={estModifie("typeId")}
                  bold
                />
              </div>

              <RowInput
                label={t.deadline}
                value={analyse.deadline ?? ""}
                onChange={(v) => majAnalyse("deadline", v || undefined)}
                placeholder={t.placeholderDeadline}
                modifie={estModifie("deadline")}
              />

              <RowSelect
                label={t.urgence}
                value={analyse.urgence}
                options={[
                  { value: "haute",   label: t.haute },
                  { value: "normale", label: t.normale },
                  { value: "basse",   label: t.basse },
                ]}
                onChange={(v) => majAnalyse("urgence", v)}
                valueColor={URGENCE_COLOR[analyse.urgence]}
                modifie={estModifie("urgence")}
              />

              <RowSelect
                label={t.longueur}
                value={analyse.longueurKey ?? "moyen"}
                options={[
                  { value: "court",     label: t.court },
                  { value: "moyen",     label: t.moyen },
                  { value: "long",      label: t.long },
                  { value: "tres_long", label: t.tresLong },
                ]}
                onChange={(v) => majAnalyse("longueurKey", v)}
                modifie={estModifie("longueurKey")}
              />

              <RowNumber
                label={t.versions}
                value={analyse.nombreVersions}
                min={1}
                max={10}
                onChange={(v) => majAnalyse("nombreVersions", v)}
                modifie={estModifie("nombreVersions")}
              />

              {analyse.elementsClient.length > 0 && (
                <Row label={t.elementsClient} value={analyse.elementsClient.join(" · ")} muted />
              )}

            </div>
          </div>

          {/* ── Informations déduites ── */}
          <div className="chapter-card" style={{ padding: 22 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <p className="label-meta" style={{ color: "var(--accent)" }}>
                {t.informationsDeduites}
                {(["complexite","objectif","style"] as ChampEditable[]).some(c => estModifie(c)) && (
                  <span style={{ marginLeft: 8, fontSize: 9, color: "var(--primary)" }}>● {lang === "fr" ? "modifié" : "modified"}</span>
                )}
              </p>
              <button
                onClick={() => setDetailsOuverts(v => !v)}
                className="soft-button"
                style={{ fontSize: 11, color: "var(--text-muted)" }}
              >
                {detailsOuverts ? t.reduire : t.details}
              </button>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>

              <RowSelect
                label={t.complexite}
                value={analyse.complexite}
                options={[
                  { value: "simple",   label: t.simple },
                  { value: "standard", label: t.standard },
                  { value: "complexe", label: t.complexe },
                ]}
                onChange={(v) => majAnalyse("complexite", v)}
                valueColor={COMPLEXITE_COLOR[analyse.complexite]}
                modifie={estModifie("complexite")}
              />

              <Row label={t.mode} value={MODES[analyse.modeRecommande]} muted />

              {detailsOuverts && (
                <>
                  <RowInput
                    label={t.objectif}
                    value={analyse.objectif ?? ""}
                    onChange={(v) => majAnalyse("objectif", v || undefined)}
                    placeholder={t.placeholderObjectif}
                    modifie={estModifie("objectif")}
                  />

                  <RowInput
                    label={t.style}
                    value={analyse.style ?? ""}
                    onChange={(v) => majAnalyse("style", v || undefined)}
                    placeholder={t.placeholderStyle}
                    modifie={estModifie("style")}
                  />

                  {analyse.canal && <Row label={t.canal} value={analyse.canal} muted />}
                </>
              )}

              {!detailsOuverts && (analyse.objectif || analyse.style) && (
                <p style={{ fontSize: 11, color: "var(--text-muted)", fontStyle: "italic" }}>
                  {[analyse.objectif, analyse.style].filter(Boolean).join(" · ")}
                </p>
              )}

            </div>
          </div>

          {/* ── Manquants ── */}
          {analyse.manquants.length > 0 && (
            <div className="chapter-card" style={{ padding: 22, borderLeft: "3px solid #d08070" }}>
              <p className="label-meta" style={{ color: "#a03020", marginBottom: 12 }}>
                {t.aConfirmer}
              </p>
              <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                {analyse.manquants.map((m, i) => (
                  <p key={i} style={{ fontSize: 13, color: "var(--text-soft)", lineHeight: 1.7 }}>· {m}</p>
                ))}
              </div>
            </div>
          )}

          {/* ── Checklist ── */}
          <div className="chapter-card" style={{ padding: 22 }}>
            <p className="label-meta" style={{ marginBottom: 12 }}>{t.checklist}</p>
            <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
              {analyse.checklist.map((item, i) => (
                <p key={i} style={{ fontSize: 13, color: "var(--text-main)", lineHeight: 1.8 }}>☐ {item}</p>
              ))}
            </div>
          </div>

          {/* ── Livrables ── */}
          {analyse.deliverables.length > 0 && (
            <div className="chapter-card" style={{ padding: 22, borderLeft: "3px solid #10b981" }}>
              <p className="label-meta" style={{ color: "#10b981", marginBottom: 12 }}>{t.livrables}</p>
              <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                {analyse.deliverables.map((item, i) => (
                  <p key={i} style={{ fontSize: 13, color: "var(--text-main)", lineHeight: 1.8 }}>✓ {item}</p>
                ))}
              </div>
            </div>
          )}

          {/* ── Réponse client ── */}
          <div className="chapter-card" style={{ padding: 22, borderLeft: "3px solid #10b981" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
              <p className="label-meta" style={{ color: "#10b981" }}>{t.reponsePrete}</p>
              <button
                onClick={async () => {
                  try {
                    await navigator.clipboard.writeText(analyse.reponseClient);
                    setReponseCopie(true);
                    setTimeout(() => setReponseCopie(false), 1800);
                  } catch { /* ignore */ }
                }}
                className="btn-outline"
                style={{ fontSize: 11 }}
              >
                {reponseCopie ? t.reponseCopie : t.copierReponse}
              </button>
            </div>
            <pre style={{
              fontSize: 13,
              color: "var(--text-soft)",
              lineHeight: 1.8,
              whiteSpace: "pre-wrap",
              fontFamily: "Georgia, serif",
              margin: 0,
            }}>
              {analyse.reponseClient}
            </pre>
          </div>

          {/* ── Mode Révision ── */}
          {analyse.service === "revision" && (
            <div className="chapter-card" style={{ padding: 22, borderLeft: "3px solid #3b82f6" }}>

              {/* Header + toggle Auto / Avancé */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 }}>
                <div>
                  <p className="label-meta" style={{ color: "#3b82f6", marginBottom: 2 }}>{t.revisionTitle}</p>
                  {modeExecution === "auto" && (
                    <p style={{ fontSize: 10, color: "var(--text-muted)", letterSpacing: 0.3 }}>
                      {lang === "fr" ? "Niveau standard · ton professionnel · appliqués automatiquement" : "Standard level · professional tone · applied automatically"}
                    </p>
                  )}
                </div>
                <div className="toggle-group" style={{ width: "fit-content", flexShrink: 0 }}>
                  {(["auto", "manual"] as const).map(m => (
                    <button
                      key={m}
                      onClick={() => setModeExecution(m)}
                      className={`toggle-btn${modeExecution === m ? " toggle-btn-active" : ""}`}
                      style={{ fontSize: 11 }}
                    >
                      {m === "auto"
                        ? (lang === "fr" ? "Auto ✦" : "Auto ✦")
                        : (lang === "fr" ? "Avancé" : "Advanced")}
                    </button>
                  ))}
                </div>
              </div>

              {/* ── Zone de texte commune ── */}
              <div style={{ marginBottom: 16 }}>
                <p className="label-meta" style={{ marginBottom: 6 }}>{t.texteACorreger}</p>
                <textarea
                  className="textarea-atelier"
                  value={texteRevision}
                  onChange={(e) => { setTexteRevision(e.target.value); setCorrectionResult(null); setTextResults({ correction: "", optimisation: "", final: "" }); }}
                  placeholder={lang === "fr" ? "Coller le texte à améliorer ici…" : "Paste the text to improve here…"}
                  style={{ minHeight: 160 }}
                />
              </div>

              {/* ── Mode Auto ── */}
              {modeExecution === "auto" && (
                <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>

                  {/* Un seul bouton, aucun contrôle */}
                  <div>
                    <button
                      onClick={() => {
                        if (!texteRevision.trim()) return;
                        const r = genererCorrectionTexte(texteRevision, "standard");
                        setTextResults({ correction: r.versionCorrigee, optimisation: r.versionOptimisee, final: r.versionFinale });
                        setActiveOutputMode("correction");
                      }}
                      className="btn-primary"
                      disabled={!texteRevision.trim()}
                      style={{ width: "100%", padding: "12px 0", fontSize: 14 }}
                    >
                      {lang === "fr" ? "Générer amélioration du texte →" : "Generate text improvement →"}
                    </button>
                  </div>

                  {/* Résultats — persistent, tabs + compare */}
                  {textResults.correction !== "" && (() => {
                    const MODES_CONFIG = [
                      { key: "correction"  as const, label: lang === "fr" ? "Corrigé"  : "Corrected",  couleur: "#3b82f6", description: lang === "fr" ? "Fautes et typographie" : "Typos and punctuation" },
                      { key: "optimisation"as const, label: lang === "fr" ? "Optimisé" : "Optimized",  couleur: "#8b5cf6", description: lang === "fr" ? "Clarté et structure"  : "Clarity and structure" },
                      { key: "final"       as const, label: lang === "fr" ? "Final"    : "Final",       couleur: "#10b981", description: lang === "fr" ? "Prêt à envoyer"       : "Ready to send",        highlight: true },
                    ] as const;

                    return (
                      <div style={{ paddingTop: 16, borderTop: "1px solid var(--border-soft)" }}>

                        {/* Sélecteur de mode */}
                        <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 14, flexWrap: "wrap" }}>
                          {MODES_CONFIG.map(({ key, label, couleur }) => (
                            <button
                              key={key}
                              onClick={() => setActiveOutputMode(key)}
                              style={{
                                fontSize: 12, fontWeight: activeOutputMode === key ? 700 : 400,
                                padding: "5px 14px", borderRadius: 6, cursor: "pointer",
                                border: `1px solid ${activeOutputMode === key ? couleur : "var(--border-soft)"}`,
                                background: activeOutputMode === key ? `${couleur}15` : "transparent",
                                color: activeOutputMode === key ? couleur : "var(--text-muted)",
                                transition: "all 0.15s",
                              }}
                            >
                              {label}
                            </button>
                          ))}
                          <div style={{ flex: 1 }} />
                          <button
                            onClick={() => setActiveOutputMode("compare")}
                            style={{
                              fontSize: 11, padding: "5px 12px", borderRadius: 6, cursor: "pointer",
                              border: `1px solid ${activeOutputMode === "compare" ? "var(--primary)" : "var(--border-soft)"}`,
                              background: activeOutputMode === "compare" ? "rgba(var(--primary-rgb),0.08)" : "transparent",
                              color: activeOutputMode === "compare" ? "var(--primary)" : "var(--text-muted)",
                            }}
                          >
                            {lang === "fr" ? "≡ Vue comparée" : "≡ Compare all"}
                          </button>
                        </div>

                        {/* Vue mode unique */}
                        {activeOutputMode !== "compare" && (() => {
                          const cfg = MODES_CONFIG.find(m => m.key === activeOutputMode)!;
                          return (
                            <TexteResultat
                              label={cfg.label}
                              description={cfg.description}
                              texte={textResults[activeOutputMode as "correction" | "optimisation" | "final"]}
                              couleur={cfg.couleur}
                              copie={!!copiesGeneration[activeOutputMode]}
                              onCopier={async () => {
                                const texte = textResults[activeOutputMode as "correction" | "optimisation" | "final"];
                                try { await navigator.clipboard.writeText(texte); } catch { /* ignore */ }
                                setCopiesGeneration(p => ({ ...p, [activeOutputMode]: true }));
                                setTimeout(() => setCopiesGeneration(p => ({ ...p, [activeOutputMode]: false })), 1800);
                              }}
                              highlight={"highlight" in cfg && cfg.highlight}
                            />
                          );
                        })()}

                        {/* Vue comparée */}
                        {activeOutputMode === "compare" && (
                          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                            {MODES_CONFIG.map(cfg => (
                              <TexteResultat
                                key={cfg.key}
                                label={cfg.label}
                                description={cfg.description}
                                texte={textResults[cfg.key]}
                                couleur={cfg.couleur}
                                copie={!!copiesGeneration[cfg.key]}
                                onCopier={async () => {
                                  try { await navigator.clipboard.writeText(textResults[cfg.key]); } catch { /* ignore */ }
                                  setCopiesGeneration(p => ({ ...p, [cfg.key]: true }));
                                  setTimeout(() => setCopiesGeneration(p => ({ ...p, [cfg.key]: false })), 1800);
                                }}
                                highlight={"highlight" in cfg && cfg.highlight}
                              />
                            ))}
                          </div>
                        )}

                      </div>
                    );
                  })()}

                </div>
              )}

              {/* ── Mode Avancé ── */}
              {modeExecution === "manual" && (
                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  <div style={{ display: "flex", gap: 20, flexWrap: "wrap", alignItems: "flex-end" }}>
                    <div>
                      <p className="label-meta" style={{ marginBottom: 6 }}>{t.niveauCorrection}</p>
                      <div className="toggle-group" style={{ width: "fit-content" }}>
                        {(["léger", "standard", "approfondi"] as const).map(n => (
                          <button key={n} onClick={() => setNiveauRevision(n)}
                            className={`toggle-btn${niveauRevision === n ? " toggle-btn-active" : ""}`}>
                            {n === "léger" ? t.niveauLeger : n === "approfondi" ? t.niveauApprofondi : t.standard}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div>
                      <p className="label-meta" style={{ marginBottom: 6 }}>{t.tonLabel}</p>
                      <div className="toggle-group" style={{ width: "fit-content" }}>
                        {(["neutre", "professionnel", "marketing", "narratif"] as const).map(ton => (
                          <button key={ton} onClick={() => setTonRevision(ton)}
                            className={`toggle-btn${tonRevision === ton ? " toggle-btn-active" : ""}`}>
                            {ton === "neutre" ? t.tonNeutre : ton === "professionnel" ? t.tonProfessionnel
                              : ton === "marketing" ? t.tonMarketing : t.tonNarratif}
                          </button>
                        ))}
                      </div>
                    </div>
                    {tonRevision !== "neutre" && (
                      <div>
                        <p className="label-meta" style={{ marginBottom: 6 }}>{t.niveauTransformationLabel}</p>
                        <div className="toggle-group" style={{ width: "fit-content" }}>
                          {(["safe", "standard"] as const).map(n => (
                            <button key={n} onClick={() => setNiveauTransformation(n)}
                              className={`toggle-btn${niveauTransformation === n ? " toggle-btn-active" : ""}`}>
                              {n === "safe" ? t.niveauTransformationSafe : t.niveauTransformationStandard}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                    {niveauTransformation === "standard" && tonRevision !== "neutre" && (
                      <div>
                        <p className="label-meta" style={{ marginBottom: 6 }}>{t.modeQualiteLabel}</p>
                        <div className="toggle-group" style={{ width: "fit-content" }}>
                          {(["off", "soft"] as const).map(m => (
                            <button key={m} onClick={() => setModeQualite(m)}
                              className={`toggle-btn${modeQualite === m ? " toggle-btn-active" : ""}`}>
                              {m === "off" ? t.modeQualiteOff : t.modeQualiteSoft}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                    <button
                      onClick={() => { if (texteRevision.trim()) setCorrectionResult(genererCorrection(texteRevision, niveauRevision, tonRevision, niveauTransformation, modeQualite)); }}
                      className="btn-primary" disabled={!texteRevision.trim()}
                    >
                      {t.genererCorrectionBtn}
                    </button>
                  </div>

                  {correctionResult && (
                    <div style={{ marginTop: 8, display: "flex", flexDirection: "column", gap: 12, paddingTop: 16, borderTop: "1px solid var(--border-soft)" }}>
                      <div>
                        <p className="label-meta" style={{ marginBottom: 8 }}>{t.texteOriginal}</p>
                        <pre style={{ fontSize: 13, color: "var(--text-muted)", lineHeight: 1.8, whiteSpace: "pre-wrap", fontFamily: "Georgia, serif", background: "var(--bg-main)", padding: "12px 16px", borderRadius: 6, margin: 0 }}>
                          {texteRevision}
                        </pre>
                      </div>
                      <div>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                          <p className="label-meta">{t.texteCorrigeLabel}</p>
                          <button onClick={async () => { try { await navigator.clipboard.writeText(correctionResult.texteCorrige); setCorrectionCopie(true); setTimeout(() => setCorrectionCopie(false), 1800); } catch { /* ignore */ } }} className="btn-outline" style={{ fontSize: 11 }}>
                            {correctionCopie ? t.correctionCopie : t.copierCorrection}
                          </button>
                        </div>
                        <pre style={{ fontSize: 13, color: "var(--text-main)", lineHeight: 1.8, whiteSpace: "pre-wrap", fontFamily: "Georgia, serif", background: "rgba(59,130,246,0.04)", padding: "12px 16px", borderRadius: 6, border: "1px solid rgba(59,130,246,0.15)", margin: 0 }}>
                          {correctionResult.texteCorrige}
                        </pre>
                      </div>
                      <div>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                          <p className="label-meta">{t.versionFinaleLabel}</p>
                          <button onClick={async () => { try { await navigator.clipboard.writeText(correctionResult.versionFinale); setVersionFinaleCopie(true); setTimeout(() => setVersionFinaleCopie(false), 1800); } catch { /* ignore */ } }} className="btn-primary" style={{ fontSize: 11, padding: "4px 12px" }}>
                            {versionFinaleCopie ? t.versionFinaleCopie : t.copierVersionFinale}
                          </button>
                        </div>
                        <pre style={{ fontSize: 13, color: "var(--text-main)", lineHeight: 1.9, whiteSpace: "pre-wrap", fontFamily: "Georgia, serif", background: "rgba(16,185,129,0.04)", padding: "14px 18px", borderRadius: 6, border: "1px solid rgba(16,185,129,0.2)", margin: 0 }}>
                          {correctionResult.versionFinale}
                        </pre>
                      </div>
                      {correctionResult.suggestions.length > 0 && (
                        <div>
                          <p className="label-meta" style={{ marginBottom: 8 }}>{t.suggestionsLabel}</p>
                          {correctionResult.suggestions.map((s, i) => (
                            <p key={i} style={{ fontSize: 12, color: "var(--text-soft)", lineHeight: 1.9 }}>→ {s}</p>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* ── Message de livraison ── */}
              {(() => {
                const texteFinale = textResults.final || correctionResult?.versionFinale || "";
                if (!texteFinale) return null;
                const livraison = genererMessageLivraison(texteFinale, lang);
                const contenu = vueMessageComplet ? livraison.complet : livraison.court;
                return (
                  <div style={{ marginTop: 20, paddingTop: 20, borderTop: "1px solid var(--border-soft)" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                      <p className="label-meta" style={{ color: "#10b981" }}>{t.livraisonTitle}</p>
                      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                        <div className="toggle-group" style={{ width: "fit-content" }}>
                          {([true, false] as const).map(complet => (
                            <button key={String(complet)} onClick={() => setVueMessageComplet(complet)}
                              className={`toggle-btn${vueMessageComplet === complet ? " toggle-btn-active" : ""}`}
                              style={{ fontSize: 11 }}>
                              {complet ? t.livraisonComplet : t.livraisonCourt}
                            </button>
                          ))}
                        </div>
                        <button
                          onClick={async () => { try { await navigator.clipboard.writeText(contenu); setLivraisonCopie(true); setTimeout(() => setLivraisonCopie(false), 1800); } catch { /* ignore */ } }}
                          className="btn-primary" style={{ fontSize: 11, padding: "4px 12px" }}>
                          {livraisonCopie ? t.livraisonCopiee : t.copierLivraison}
                        </button>
                      </div>
                    </div>
                    <pre style={{ fontSize: 13, color: "var(--text-main)", lineHeight: 1.9, whiteSpace: "pre-wrap", fontFamily: "Georgia, serif", background: "rgba(16,185,129,0.04)", padding: "16px 20px", borderRadius: 6, border: "1px solid rgba(16,185,129,0.2)", margin: 0 }}>
                      {contenu}
                    </pre>
                  </div>
                );
              })()}

            </div>
          )}

        </div>
      )}
    </main>
  );
}

function getServiceColor(service: ServiceKey): string {
  if (service === "revision")   return "#3b82f6";
  if (service === "traduction") return "#10b981";
  return "#8b5cf6";
}

// ── Composants helpers ────────────────────────────────────────────────────────

function CoeffSection({ titre, champs, valeurs, onChange }: {
  titre: string;
  champs: { cle: string; label: string }[];
  valeurs: Record<string, number>;
  onChange: (cle: string, val: number) => void;
}) {
  return (
    <div>
      <p style={{ fontSize: 11, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: 1, marginBottom: 6 }}>{titre}</p>
      <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
        {champs.map(({ cle, label }) => (
          <label key={cle} style={{ display: "flex", flexDirection: "column", gap: 3 }}>
            <span style={{ fontSize: 11, color: "var(--text-soft)" }}>{label}</span>
            <input type="number" className="search-input" value={valeurs[cle] ?? ""} min={0} step={0.05}
              onChange={(e) => onChange(cle, parseFloat(e.target.value) || 0)}
              style={{ width: 72, marginBottom: 0, fontSize: 13 }} />
          </label>
        ))}
      </div>
    </div>
  );
}

const ROW_LABEL_STYLE: React.CSSProperties = {
  fontSize: 10,
  color: "var(--text-muted)",
  textTransform: "uppercase",
  letterSpacing: 1.2,
  minWidth: 130,
  flexShrink: 0,
};

function RowWrap({ children, hover = true }: { children: React.ReactNode; hover?: boolean }) {
  const [hovered, setHovered] = React.useState(false);
  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        borderRadius: 6,
        margin: "0 -8px",
        padding: "4px 8px",
        background: hover && hovered ? "rgba(0,0,0,0.025)" : "transparent",
        transition: "background 0.1s",
      }}
    >
      {children}
    </div>
  );
}

function Dot() {
  return <span style={{ fontSize: 7, color: "var(--primary)", verticalAlign: "middle", marginLeft: 5 }} title="Modifié">●</span>;
}

function Row({ label, value, valueColor, muted }: { label: string; value: string; valueColor?: string; muted?: boolean }) {
  return (
    <RowWrap hover={false}>
      <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
        <span style={{ ...ROW_LABEL_STYLE, paddingTop: 3 }}>{label}</span>
        <span style={{ fontSize: muted ? 12 : 14, color: valueColor ?? (muted ? "var(--text-muted)" : "var(--text-main)"), lineHeight: 1.5 }}>
          {value}
        </span>
      </div>
    </RowWrap>
  );
}

function RowInput({ label, value, onChange, placeholder, modifie }: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  modifie?: boolean;
}) {
  return (
    <RowWrap>
      <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
        <span style={ROW_LABEL_STYLE}>{label}{modifie && <Dot />}</span>
        <input
          type="text"
          className="search-input"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          style={{ flex: 1, marginBottom: 0, fontSize: 13 }}
        />
      </div>
    </RowWrap>
  );
}

function RowSelect({ label, value, options, onChange, valueColor, modifie, bold }: {
  label: string;
  value: string;
  options: { value: string; label: string }[];
  onChange: (v: string) => void;
  valueColor?: string;
  modifie?: boolean;
  bold?: boolean;
}) {
  return (
    <RowWrap>
      <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
        <span style={ROW_LABEL_STYLE}>{label}{modifie && <Dot />}</span>
        <select
          className="filter-select"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          style={{ fontSize: bold ? 14 : 13, fontWeight: bold ? 600 : 400, color: valueColor, padding: "4px 8px" }}
        >
          {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
      </div>
    </RowWrap>
  );
}

function RowNumber({ label, value, min, max, onChange, modifie }: {
  label: string;
  value: number;
  min: number;
  max: number;
  onChange: (v: number) => void;
  modifie?: boolean;
}) {
  return (
    <RowWrap>
      <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
        <span style={ROW_LABEL_STYLE}>{label}{modifie && <Dot />}</span>
        <input
          type="number"
          className="search-input"
          value={value}
          min={min}
          max={max}
          onChange={(e) => onChange(Math.min(max, Math.max(min, parseInt(e.target.value) || min)))}
          style={{ width: 72, marginBottom: 0, fontSize: 13 }}
        />
      </div>
    </RowWrap>
  );
}

function TexteResultat({
  label,
  description,
  texte,
  couleur,
  copie,
  onCopier,
  highlight,
}: {
  label: string;
  description: string;
  texte: string;
  couleur: string;
  copie: boolean;
  onCopier: () => void;
  highlight?: boolean;
}) {
  return (
    <div style={{
      borderRadius: 8,
      border: `1px solid ${couleur}30`,
      overflow: "hidden",
      background: highlight ? `${couleur}06` : "transparent",
    }}>
      <div style={{
        display: "flex", justifyContent: "space-between", alignItems: "center",
        padding: "10px 16px", borderBottom: `1px solid ${couleur}20`,
        background: `${couleur}08`,
      }}>
        <div>
          <span style={{ fontSize: 12, fontWeight: 700, color: couleur, letterSpacing: 0.3 }}>{label}</span>
          <span style={{ fontSize: 10, color: "var(--text-muted)", marginLeft: 8 }}>{description}</span>
        </div>
        <button
          onClick={onCopier}
          className={highlight ? "btn-primary" : "btn-outline"}
          style={{ fontSize: 11, padding: "3px 10px" }}
        >
          {copie ? "✓ Copié" : "Copier"}
        </button>
      </div>
      <pre style={{
        fontSize: 13,
        color: "var(--text-main)",
        lineHeight: 1.85,
        whiteSpace: "pre-wrap",
        fontFamily: "Georgia, serif",
        margin: 0,
        padding: "14px 16px",
      }}>
        {texte}
      </pre>
    </div>
  );
}

function BoutonCTA({ onClick, children }: { onClick: () => void; children: React.ReactNode }) {
  const [actif, setActif] = useState(false);
  return (
    <button
      onClick={onClick}
      className="btn-primary"
      onMouseDown={() => setActif(true)}
      onMouseUp={() => setActif(false)}
      onMouseLeave={() => setActif(false)}
      style={{
        fontSize: 14,
        padding: "10px 24px",
        transition: "transform 0.08s, opacity 0.08s",
        transform: actif ? "scale(0.96)" : "scale(1)",
        opacity: actif ? 0.9 : 1,
      }}
    >
      {children}
    </button>
  );
}
