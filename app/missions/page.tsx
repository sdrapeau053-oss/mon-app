"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { MODES, type ModeKey } from "@/app/lib/modes";
import { LangToggle } from "@/app/components/LangToggle";
import { FL, type Lang, chargerLang, sauvegarderLang } from "@/app/lib/freelance-lang";
import {
  StatusChip,
  SystemActionRow,
  SystemDividerBlock,
  SystemGrid,
  SystemPageShell,
  SystemPanel,
  SystemSectionHeader,
} from "@/components/system-ui";

interface Mission {
  id: number;
  nom: string;
  client?: string;
  objectif: string;
  mode: ModeKey;
  brief?: string;
  date: string;
}

export default function Missions() {
  const [missions, setMissions] = useState<Mission[]>([]);
  const [formOuvert, setFormOuvert] = useState(false);
  const [nom, setNom] = useState("");
  const [client, setClient] = useState("");
  const [objectif, setObjectif] = useState("");
  const [mode, setMode] = useState<ModeKey>("narratif");
  const [brief, setBrief] = useState("");
  const [lang, setLang] = useState<Lang>("fr");

  useEffect(() => {
    setMissions(JSON.parse(localStorage.getItem("missions") || "[]"));
    setLang(chargerLang());
  }, []);

  function handleLangChange(l: Lang) {
    setLang(l);
    sauvegarderLang(l);
  }

  const t = FL[lang];

  function sauvegarder(updated: Mission[]) {
    setMissions(updated);
    localStorage.setItem("missions", JSON.stringify(updated));
  }

  function creerMission() {
    if (!nom.trim() || !objectif.trim()) return;
    const nouvelle: Mission = {
      id: Date.now(),
      nom: nom.trim(),
      client: client.trim() || undefined,
      objectif: objectif.trim(),
      mode,
      brief: brief.trim() || undefined,
      date: new Date().toLocaleDateString("fr-CA"),
    };
    sauvegarder([nouvelle, ...missions]);
    setNom(""); setClient(""); setObjectif(""); setMode("narratif"); setBrief("");
    setFormOuvert(false);
  }

  function supprimerMission(id: number) {
    sauvegarder(missions.filter((m) => m.id !== id));
    const textes = JSON.parse(localStorage.getItem("textes-missions") || "[]");
    localStorage.setItem("textes-missions", JSON.stringify(textes.filter((t: { missionId: number }) => t.missionId !== id)));
  }

  function annulerForm() {
    setFormOuvert(false);
    setNom(""); setClient(""); setObjectif(""); setMode("narratif"); setBrief("");
  }

  return (
    <main className="internal-page">
      <SystemPageShell maxWidth={800}>

      {/* Header */}
      <header className="internal-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 16 }}>
        <div>
          <p className="internal-kicker">Business</p>
          <h1 className="internal-title" style={{ fontStyle: "italic" }}>{t.missions}</h1>
          <p className="internal-subtitle">
            {missions.length} mission{missions.length > 1 ? "s" : ""}
          </p>
        </div>
        <nav style={{ display: "flex", gap: 14, flexWrap: "wrap", justifyContent: "flex-end", alignItems: "center" }}>
          <LangToggle lang={lang} onChange={handleLangChange} />
          <Link href="/" style={{ fontSize: 12, color: "var(--primary)" }}>{t.accueil}</Link>
          <Link href="/analyser-demande" style={{ fontSize: 12, color: "var(--primary)" }}>{t.voirAnalyser}</Link>
          <Link href="/fragments" style={{ fontSize: 12, color: "var(--primary)" }}>{t.voirFragments}</Link>
        </nav>
      </header>

      {/* Bouton créer */}
      {!formOuvert && (
        <SystemActionRow>
          <button onClick={() => setFormOuvert(true)} className="btn-primary" style={{ maxWidth: 260, width: "100%" }}>
            {t.nouvelleMission}
          </button>
        </SystemActionRow>
      )}

      {/* Formulaire création */}
      {formOuvert && (
        <SystemPanel ariaLabel={t.nouvelleMission.replace("+ ", "")} compact>
          <SystemSectionHeader eyebrow="Mission" title={t.nouvelleMission.replace("+ ", "")} />

          <SystemGrid gap={12} min={240}>
            <div>
              <p className="label-meta" style={{ marginBottom: 4 }}>{t.nom} *</p>
              <input
                type="text"
                className="search-input"
                value={nom}
                onChange={(e) => setNom(e.target.value)}
                placeholder={t.placeholderNomMission}
                style={{ marginBottom: 0 }}
              />
            </div>

            <div>
              <p className="label-meta" style={{ marginBottom: 4 }}>{t.client}</p>
              <input
                type="text"
                className="search-input"
                value={client}
                onChange={(e) => setClient(e.target.value)}
                placeholder={t.placeholderClientMission}
                style={{ marginBottom: 0 }}
              />
            </div>

            <div>
              <p className="label-meta" style={{ marginBottom: 4 }}>{t.objectif} *</p>
              <input
                type="text"
                className="search-input"
                value={objectif}
                onChange={(e) => setObjectif(e.target.value)}
                placeholder={t.placeholderObjectifMission}
                style={{ marginBottom: 0 }}
              />
            </div>

            <div>
              <p className="label-meta" style={{ marginBottom: 4 }}>{t.modeEcriture}</p>
              <select
                className="filter-select"
                value={mode}
                onChange={(e) => setMode(e.target.value as ModeKey)}
                style={{ fontSize: 13, padding: "7px 10px" }}
              >
                {(Object.entries(MODES) as [ModeKey, string][]).map(([k, v]) => (
                  <option key={k} value={k}>{v}</option>
                ))}
              </select>
            </div>

            <div>
              <p className="label-meta" style={{ marginBottom: 4 }}>{t.briefClient}</p>
              <textarea
                className="textarea-atelier"
                value={brief}
                onChange={(e) => setBrief(e.target.value)}
                placeholder={t.collerMessage}
                style={{ minHeight: 100 }}
              />
            </div>
          </SystemGrid>

          <SystemActionRow>
            <button
              onClick={creerMission}
              className="btn-primary"
              disabled={!nom.trim() || !objectif.trim()}
            >
              {t.creerMissionBtn}
            </button>
            <button onClick={annulerForm} className="btn-ghost">{t.annuler}</button>
          </SystemActionRow>
        </SystemPanel>
      )}

      {/* Liste des missions */}
      {missions.length === 0 && !formOuvert && (
        <SystemPanel ariaLabel="Missions">
          <SystemSectionHeader eyebrow="Missions" title={lang === "fr" ? "Aucune mission active" : "No active mission" } />
          <p style={{ color: "var(--text-muted)", fontStyle: "italic", margin: 0 }}>{t.aucuneMission}</p>
        </SystemPanel>
      )}

      {missions.map((m) => (
        <SystemPanel ariaLabel={m.nom} compact key={m.id}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
            <div>
              <p style={{ fontSize: 16, fontWeight: 600, color: "var(--text-main)", marginBottom: 2 }}>
                {m.nom}
                {m.client && <span style={{ fontSize: 12, fontWeight: 400, color: "var(--text-muted)", marginLeft: 10 }}>{m.client}</span>}
              </p>
              <p style={{ fontSize: 11, color: "var(--text-muted)" }}>{m.date}</p>
            </div>
            <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
              <Link href={`/missions/${m.id}`} className="btn-outline" style={{ fontSize: 11 }}>{t.ouvrir}</Link>
              <button
                onClick={() => supprimerMission(m.id)}
                className="soft-button"
                style={{ fontSize: 11, color: "#c00" }}
              >
                {t.supprimer}
              </button>
            </div>
          </div>

          <SystemDividerBlock>
            <p style={{ fontSize: 13, color: "var(--text-soft)", margin: 0, lineHeight: 1.7 }}>
            {m.objectif}
            </p>

            <div style={{ marginTop: 10, display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
              <StatusChip tone="warning">{MODES[m.mode]}</StatusChip>
            {m.brief && (
              <span style={{ fontSize: 11, color: "var(--text-muted)" }}>{t.briefFourni}</span>
            )}
            </div>
          </SystemDividerBlock>
        </SystemPanel>
      ))}
      </SystemPageShell>
    </main>
  );
}
