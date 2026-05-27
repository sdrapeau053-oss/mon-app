"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { MODES, type ModeKey } from "@/app/lib/modes";
import { LangToggle } from "@/app/components/LangToggle";
import { FL, type Lang, chargerLang, sauvegarderLang, afficherStatut } from "@/app/lib/freelance-lang";
import {
  StatusChip,
  SystemActionRow,
  SystemDividerBlock,
  SystemGrid,
  SystemPageShell,
  SystemPanel,
  SystemSectionHeader,
} from "@/components/system-ui";

interface TexteAProduite {
  titre: string;
  statut: string;
}

interface Mission {
  id: number;
  nom: string;
  client?: string;
  objectif: string;
  mode: ModeKey;
  brief?: string;
  date: string;
  textes?: TexteAProduite[];
}

interface TexteMission {
  id: number;
  missionId: number;
  titre?: string;
  texte: string;
  type: "brut" | "travail";
  date: string;
}

export default function MissionDetail() {
  const params = useParams();
  const missionId = Number(params.id);

  const [mission, setMission] = useState<Mission | null>(null);
  const [textes, setTextes] = useState<TexteMission[]>([]);
  const [editingMission, setEditingMission] = useState(false);
  const [editFields, setEditFields] = useState<Partial<Mission>>({});
  const [lang, setLang] = useState<Lang>("fr");

  const [ajoutOuvert, setAjoutOuvert] = useState(false);
  const [nouveauTitre, setNouveauTitre] = useState("");
  const [nouveauTexte, setNouveauTexte] = useState("");
  const [nouveauType, setNouveauType] = useState<"brut" | "travail">("travail");

  const [editingTexteId, setEditingTexteId] = useState<number | null>(null);
  const [editingTexteContenu, setEditingTexteContenu] = useState("");

  const [copieStates, setCopieStates] = useState<Record<number, boolean>>({});

  useEffect(() => {
    const missions: Mission[] = JSON.parse(localStorage.getItem("missions") || "[]");
    const found = missions.find((m) => m.id === missionId) ?? null;
    setMission(found);
    if (found) setEditFields(found);

    const tous: TexteMission[] = JSON.parse(localStorage.getItem("textes-missions") || "[]");
    setTextes(tous.filter((t) => t.missionId === missionId));

    setLang(chargerLang());
  }, [missionId]);

  function handleLangChange(l: Lang) {
    setLang(l);
    sauvegarderLang(l);
  }

  const t = FL[lang];

  function sauvegarderTextes(updated: TexteMission[]) {
    setTextes(updated);
    const tous: TexteMission[] = JSON.parse(localStorage.getItem("textes-missions") || "[]");
    const autresMissions = tous.filter((t) => t.missionId !== missionId);
    localStorage.setItem("textes-missions", JSON.stringify([...autresMissions, ...updated]));
  }

  function sauvegarderMission(updated: Mission) {
    setMission(updated);
    const missions: Mission[] = JSON.parse(localStorage.getItem("missions") || "[]");
    localStorage.setItem("missions", JSON.stringify(missions.map((m) => m.id === missionId ? updated : m)));
  }

  function changerStatut(index: number) {
    if (!mission?.textes) return;
    const cycle = ["à faire", "en cours", "terminé"];
    const textesMaj = mission.textes.map((t, i) => {
      if (i !== index) return t;
      const pos = cycle.indexOf(t.statut);
      return { ...t, statut: cycle[(pos + 1) % cycle.length] };
    });
    sauvegarderMission({ ...mission, textes: textesMaj });
  }

  function ajouterTexte() {
    if (!nouveauTexte.trim()) return;
    const texte: TexteMission = {
      id: Date.now(),
      missionId,
      titre: nouveauTitre.trim() || undefined,
      texte: nouveauTexte.trim(),
      type: nouveauType,
      date: new Date().toLocaleDateString("fr-CA"),
    };
    sauvegarderTextes([texte, ...textes]);
    setNouveauTitre(""); setNouveauTexte(""); setNouveauType("travail");
    setAjoutOuvert(false);
  }

  function supprimerTexte(texteId: number) {
    sauvegarderTextes(textes.filter((tx) => tx.id !== texteId));
  }

  function enregistrerEditionTexte(texteId: number) {
    sauvegarderTextes(textes.map((tx) => tx.id === texteId ? { ...tx, texte: editingTexteContenu } : tx));
    setEditingTexteId(null);
  }

  function toggleType(texteId: number) {
    sauvegarderTextes(textes.map((tx) =>
      tx.id === texteId ? { ...tx, type: tx.type === "brut" ? "travail" : "brut" } : tx
    ));
  }

  function enregistrerMission() {
    if (!mission || !editFields.nom?.trim() || !editFields.objectif?.trim()) return;
    sauvegarderMission({ ...mission, ...editFields });
    setEditingMission(false);
  }

  function annulerEditionMission() {
    setEditingMission(false);
    if (mission) setEditFields(mission);
  }

  async function copierPrompt(tx: TexteMission) {
    if (!mission) return;
    const lignes = [
      `${t.objetPrompt} : ${mission.objectif}`,
      `${t.modePrompt} : ${MODES[mission.mode]}`,
    ];
    if (mission.brief) lignes.push(`\n${t.contextClient} :\n${mission.brief}`);
    lignes.push(`\n${tx.type === "brut" ? t.textesBrut : t.textesTravail} :\n${tx.texte}`);
    try {
      await navigator.clipboard.writeText(lignes.join("\n"));
      setCopieStates((prev) => ({ ...prev, [tx.id]: true }));
      setTimeout(() => setCopieStates((prev) => ({ ...prev, [tx.id]: false })), 1500);
    } catch { /* clipboard non disponible */ }
  }

  if (!mission) {
    return (
      <main className="internal-page">
        <SystemPageShell maxWidth={800}>
          <SystemPanel ariaLabel={t.missionIntrouvable}>
            <p style={{ color: "var(--text-muted)", fontStyle: "italic", marginBottom: 16 }}>{t.missionIntrouvable}</p>
            <Link href="/missions" style={{ fontSize: 13, color: "var(--primary)" }}>{t.retourMissions}</Link>
          </SystemPanel>
        </SystemPageShell>
      </main>
    );
  }

  return (
    <main className="internal-page">
      <SystemPageShell maxWidth={800}>

      {/* Header */}
      <header className="internal-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 16 }}>
        <div>
          <Link href="/missions" style={{ fontSize: 12, color: "var(--text-muted)" }}>{t.retourMissions}</Link>
          <h1 className="internal-title" style={{ fontStyle: "italic", marginTop: 4 }}>
            {mission.nom}
          </h1>
          {mission.client && (
            <p className="internal-subtitle" style={{ marginTop: 2 }}>{mission.client}</p>
          )}
        </div>
        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          <LangToggle lang={lang} onChange={handleLangChange} />
          <button
            onClick={() => editingMission ? annulerEditionMission() : setEditingMission(true)}
            className="soft-button"
            style={{ fontSize: 12 }}
          >
            {editingMission ? t.annuler : t.modifier}
          </button>
        </div>
      </header>

      {/* Fiche mission — édition */}
      {editingMission ? (
        <SystemPanel ariaLabel={t.modifier} compact>
          <SystemSectionHeader eyebrow="Mission" title={t.modifier} />
          <SystemGrid gap={12} min={240}>
            <div>
              <p className="label-meta" style={{ marginBottom: 4 }}>{t.nom}</p>
              <input
                type="text"
                className="search-input"
                value={editFields.nom ?? ""}
                onChange={(e) => setEditFields((p) => ({ ...p, nom: e.target.value }))}
                style={{ marginBottom: 0 }}
              />
            </div>
            <div>
              <p className="label-meta" style={{ marginBottom: 4 }}>{t.client}</p>
              <input
                type="text"
                className="search-input"
                value={editFields.client ?? ""}
                onChange={(e) => setEditFields((p) => ({ ...p, client: e.target.value }))}
                style={{ marginBottom: 0 }}
              />
            </div>
            <div>
              <p className="label-meta" style={{ marginBottom: 4 }}>{t.objectif}</p>
              <input
                type="text"
                className="search-input"
                value={editFields.objectif ?? ""}
                onChange={(e) => setEditFields((p) => ({ ...p, objectif: e.target.value }))}
                style={{ marginBottom: 0 }}
              />
            </div>
            <div>
              <p className="label-meta" style={{ marginBottom: 4 }}>{t.modeEcriture}</p>
              <select
                className="filter-select"
                value={editFields.mode ?? "narratif"}
                onChange={(e) => setEditFields((p) => ({ ...p, mode: e.target.value as ModeKey }))}
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
                value={editFields.brief ?? ""}
                onChange={(e) => setEditFields((p) => ({ ...p, brief: e.target.value }))}
                style={{ minHeight: 100 }}
              />
            </div>
          </SystemGrid>
          <SystemActionRow>
            <button
              onClick={enregistrerMission}
              className="btn-primary"
              disabled={!editFields.nom?.trim() || !editFields.objectif?.trim()}
            >
              {t.enregistrer}
            </button>
            <button onClick={annulerEditionMission} className="btn-ghost">{t.annuler}</button>
          </SystemActionRow>
        </SystemPanel>
      ) : (
        <SystemPanel ariaLabel={mission.nom} compact>
          <SystemGrid gap={14} min={220}>
            <div style={{ flex: 1, minWidth: 200 }}>
              <p className="label-meta">{t.objectif}</p>
              <p style={{ fontSize: 14, color: "var(--text-main)", lineHeight: 1.7 }}>{mission.objectif}</p>
            </div>
            <div>
              <p className="label-meta">{t.mode}</p>
              <StatusChip tone="warning">{MODES[mission.mode]}</StatusChip>
            </div>
          </SystemGrid>
          {mission.brief && (
            <SystemDividerBlock>
              <p className="label-meta">{t.briefClient}</p>
              <p className="text-muted" style={{ whiteSpace: "pre-wrap" }}>{mission.brief}</p>
            </SystemDividerBlock>
          )}
        </SystemPanel>
      )}

      {/* Textes à produire */}
      {mission.textes && mission.textes.length > 0 && (
        <SystemPanel ariaLabel={t.textesAProduire} compact>
          <SystemSectionHeader
            eyebrow="Mission"
            title={`${t.textesAProduire} — ${mission.textes.length} ${lang === "fr"
              ? `texte${mission.textes.length > 1 ? "s" : ""}`
              : `text${mission.textes.length !== 1 ? "s" : ""}`
            }`}
          />
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {mission.textes.map((tx, i) => {
              const couleur =
                tx.statut === "terminé"  ? "#5a8f6a" :
                tx.statut === "en cours" ? "var(--primary)" :
                "var(--text-muted)";
              return (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <span style={{ fontSize: 13, color: "var(--text-main)" }}>· {tx.titre}</span>
                  <button
                    onClick={() => changerStatut(i)}
                    title="Cliquer pour changer le statut"
                    style={{
                      fontSize: 10,
                      textTransform: "uppercase",
                      letterSpacing: 1,
                      color: couleur,
                      background: "var(--bg-main)",
                      padding: "2px 8px",
                      borderRadius: 10,
                      border: `1px solid ${couleur}`,
                      cursor: "pointer",
                    }}
                  >
                    {afficherStatut(tx.statut, lang)}
                  </button>
                </div>
              );
            })}
          </div>
        </SystemPanel>
      )}

      {/* Section textes */}
      <SystemSectionHeader
        eyebrow="Textes"
        title={`${t.textesSectionLabel} — ${textes.length}`}
        actions={!ajoutOuvert && (
          <button onClick={() => setAjoutOuvert(true)} className="btn-outline">
            {t.ajouterTexte}
          </button>
        )}
      />

      {/* Formulaire ajout texte */}
      {ajoutOuvert && (
        <SystemPanel ariaLabel={t.nouveauTexte} compact>
          <SystemSectionHeader eyebrow="Texte" title={t.nouveauTexte} />
          <SystemGrid gap={12} min={240}>
            <div>
              <p className="label-meta" style={{ marginBottom: 4 }}>{t.titreField}</p>
              <input
                type="text"
                className="search-input"
                value={nouveauTitre}
                onChange={(e) => setNouveauTitre(e.target.value)}
                placeholder={t.placeholderTitre}
                style={{ marginBottom: 0 }}
              />
            </div>
            <div>
              <p className="label-meta" style={{ marginBottom: 4 }}>{t.typeField}</p>
              <div className="toggle-group" style={{ width: "fit-content" }}>
                {(["brut", "travail"] as const).map((v) => (
                  <button
                    key={v}
                    onClick={() => setNouveauType(v)}
                    className={`toggle-btn${nouveauType === v ? " toggle-btn-active" : ""}`}
                  >
                    {v === "brut" ? t.brutClient : t.enTravail}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <p className="label-meta" style={{ marginBottom: 4 }}>{t.texteField}</p>
              <textarea
                className="textarea-atelier"
                value={nouveauTexte}
                onChange={(e) => setNouveauTexte(e.target.value)}
                placeholder={t.placeholderTexte}
                style={{ minHeight: 140 }}
              />
            </div>
          </SystemGrid>
          <SystemActionRow>
            <button onClick={ajouterTexte} className="btn-primary" disabled={!nouveauTexte.trim()}>
              {t.ajouter}
            </button>
            <button
              onClick={() => { setAjoutOuvert(false); setNouveauTitre(""); setNouveauTexte(""); setNouveauType("travail"); }}
              className="btn-ghost"
            >
              {t.annuler}
            </button>
          </SystemActionRow>
        </SystemPanel>
      )}

      {textes.length === 0 && !ajoutOuvert && (
        <SystemPanel ariaLabel={t.textesSectionLabel} compact>
          <p style={{ color: "var(--text-muted)", fontStyle: "italic", fontSize: 13, margin: 0 }}>{t.aucunTexte}</p>
        </SystemPanel>
      )}

      {/* Cartes textes */}
      {textes.map((tx) => (
        <SystemPanel key={tx.id} ariaLabel={tx.titre || t.textesSectionLabel} compact>

          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
            <div>
              {tx.titre && (
                <p style={{ fontSize: 14, fontWeight: 600, color: "var(--text-main)", marginBottom: 4 }}>{tx.titre}</p>
              )}
              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <button
                  onClick={() => toggleType(tx.id)}
                  className="tag-pill"
                  style={{ fontSize: 10 }}
                >
                  {tx.type === "brut" ? t.brutClient : t.enTravail}
                </button>
                <span style={{ fontSize: 11, color: "var(--text-muted)" }}>{tx.date}</span>
              </div>
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <button
                onClick={() => { setEditingTexteId(tx.id); setEditingTexteContenu(tx.texte); }}
                className="soft-button"
                style={{ fontSize: 11, color: "var(--primary)" }}
              >
                {t.modifier}
              </button>
              <button
                onClick={() => supprimerTexte(tx.id)}
                className="soft-button"
                style={{ fontSize: 11, color: "#c00" }}
              >
                {t.supprimer}
              </button>
            </div>
          </div>

          {editingTexteId === tx.id ? (
            <div>
              <textarea
                className="textarea-atelier"
                value={editingTexteContenu}
                onChange={(e) => setEditingTexteContenu(e.target.value)}
              />
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, marginTop: 8, flexWrap: "wrap" }}>
                <SystemActionRow>
                  <button onClick={() => enregistrerEditionTexte(tx.id)} className="btn-primary">{t.enregistrer}</button>
                  <button onClick={() => setEditingTexteId(null)} className="btn-ghost">{t.annuler}</button>
                </SystemActionRow>
                <span className="word-count">
                  {editingTexteContenu.trim() ? editingTexteContenu.trim().split(/\s+/).length : 0} {lang === "fr" ? "mot" : "word"}{editingTexteContenu.trim().split(/\s+/).length !== 1 ? "s" : ""}
                </span>
              </div>
            </div>
          ) : (
            <p className="fragment-text">{tx.texte}</p>
          )}

          {editingTexteId !== tx.id && (
            <div className="card-meta">
              <span className="label-meta" style={{ marginBottom: 0 }}>{t.copierIA}</span>
              <button onClick={() => copierPrompt(tx)} className="btn-outline">
                {copieStates[tx.id] ? t.copie : t.genererPrompt}
              </button>
            </div>
          )}
        </SystemPanel>
      ))}
      </SystemPageShell>
    </main>
  );
}
