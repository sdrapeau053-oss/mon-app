"use client";

import { useEffect, useState } from "react";
import { BackLink } from "@/components/ui/back-link";
import {
  CompactMetric,
  SystemGrid,
  SystemPageShell,
  SystemPanel,
} from "@/components/system-ui";

// ── Types ────────────────────────────────────────────────────────────────────

type StatutProspect = "a_contacter" | "contacte" | "en_discussion" | "devis_envoye" | "gagne" | "perdu";
type SourceProspect = "linkedin" | "facebook" | "reference" | "site_web" | "autre";
type PotentielProspect = "faible" | "moyen" | "élevé";
type NiveauInteret = "froid" | "tiède" | "chaud";
type Prospect = {
  id: string;
  nom: string;
  canal: string;
  offre: string;
  statut: StatutProspect;
  montant: number;
  dateContact: string;
  encaisse: boolean;
  // Champs enrichis Phase 2
  email?: string;
  telephone?: string;
  linkedin?: string;
  source?: SourceProspect;
  type_projet?: string;
  potentiel?: PotentielProspect;
  niveau_interet?: NiveauInteret;
  notes?: string;
  date_prochaine_relance?: string;
  valeur_estimee?: number;
  date_dernier_contact?: string;
  prochaine_action?: string;
};
type SprintActif = { objectif: number; dateDebut: string; revenusEncaisses: number; revenusAttente: number; prospectsContactes: number; clientsObtenus: number; };
type OptionGroup = "objectifs" | "tons" | "longueurs";
type GhostwritingState = { clientText: string; objectifs: string[]; tons: string[]; longueurs: string[]; };
type CalcState = { offre: string; prix: number; taux: number; objectif: number; jours: number; };
type Mode500State = { objectif: number; jours: number; competences: string; tempsParJour: string; contexte: string; };
type PlanHistorique = { id: string; date: string; resume: string; contenu: string; };
type Offre = { id: string; nom: string; prix: number; description: string; canal: string; ventes: number; actif: boolean; };
type Tache = { id: string; texte: string; done: boolean; date: string; };
type MainTab = "cockpit" | "crm" | "offres" | "outils";

// ── Clés localStorage ────────────────────────────────────────────────────────

const FL_SPRINT = "strate_fl_sprint";
const FL_PROSPECTS = "strate_fl_prospects";
const FL_CALC = "strate_fl_calc";
const FL_MODE500 = "strate_fl_mode500";
const FL_HISTORY = "freelance-mode-500-history";
const FL_OFFERS = "strate_fl_offers";
const FL_TACHES = "strate_fl_taches";
const STORAGE_KEY = "freelance-ghostwriting-last-input";

// ── Defaults ─────────────────────────────────────────────────────────────────

const defaultSprint: SprintActif = { objectif: 500, dateDebut: new Date().toISOString().split("T")[0], revenusEncaisses: 0, revenusAttente: 0, prospectsContactes: 0, clientsObtenus: 0 };
const defaultState: GhostwritingState = { clientText: "", objectifs: [], tons: [], longueurs: [] };
const defaultCalc: CalcState = { offre: "", prix: 150, taux: 10, objectif: 500, jours: 5 };
const defaultMode500: Mode500State = { objectif: 500, jours: 5, competences: "", tempsParJour: "", contexte: "" };
const defaultOffre: Omit<Offre, "id"> = { nom: "", prix: 0, description: "", canal: "", ventes: 0, actif: true };

const options = {
  objectifs: ["raconter une histoire personnelle", "clarifier un message", "ecrire un texte emotionnel"],
  tons: ["intime", "professionnel", "litteraire"],
  longueurs: ["court", "moyen", "long"],
};

const STATUTS = [
  { value: "a_contacter" as StatutProspect, label: "À contacter", color: "#888780" },
  { value: "contacte" as StatutProspect, label: "Contacté", color: "#3B8BD4" },
  { value: "en_discussion" as StatutProspect, label: "En discussion", color: "#BA7517" },
  { value: "devis_envoye" as StatutProspect, label: "Devis envoyé", color: "#7F77DD" },
  { value: "gagne" as StatutProspect, label: "Gagné", color: "#1D9E75" },
  { value: "perdu" as StatutProspect, label: "Perdu", color: "#D85A30" },
];

const SECTION_MAP = [
  { tag: "ANALYSE", titre: "Analyse", couleur: "#3B8BD4" },
  { tag: "OFFRES", titre: "Top 3 offres", couleur: "#BA7517" },
  { tag: "MATHS", titre: "Mathématiques", couleur: "#7F77DD" },
  { tag: "PLAN", titre: "Plan J1 à J5", couleur: "#1D9E75" },
  { tag: "SCRIPTS", titre: "Scripts", couleur: "#888780" },
];

// ── Styles partagés ──────────────────────────────────────────────────────────

const inputStyle = {
  background: "var(--bg-main)",
  border: "1px solid rgba(201,168,92,0.3)",
  borderRadius: 6,
  color: "var(--text-main)",
  fontSize: 13,
  padding: "5px 8px",
  width: "100%",
} as const;

const btnSmall = {
  background: "transparent",
  border: "1px solid rgba(201,168,92,0.3)",
  borderRadius: 6,
  color: "var(--text-soft)",
  cursor: "pointer",
  fontSize: 11,
  padding: "2px 8px",
} as const;

// ── Helpers ──────────────────────────────────────────────────────────────────

function lireLS<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = localStorage.getItem(key);
    if (raw === null) return fallback;
    const parsed = JSON.parse(raw);
    if (Array.isArray(fallback)) return parsed as T;
    return { ...(fallback as object), ...parsed } as T;
  } catch { return fallback; }
}

function ecrireLS<T>(key: string, value: T): void {
  if (typeof window === "undefined") return;
  try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* ok */ }
}

function genId(): string { return "p_" + Date.now() + "_" + Math.random().toString(36).slice(2, 7); }

function calculerKPIs(s: SprintActif) {
  const taux = s.prospectsContactes > 0 ? Math.round((s.clientsObtenus / s.prospectsContactes) * 100) : 0;
  const total = s.revenusEncaisses + s.revenusAttente;
  const prob = s.objectif > 0 ? Math.min(100, Math.round((total / s.objectif) * 100)) : 0;
  const manque = Math.max(0, s.objectif - total);
  const joursEcoules = Math.floor((Date.now() - new Date(s.dateDebut).getTime()) / 86400000);
  const joursRestants = Math.max(0, 5 - joursEcoules);
  return { taux, prob, manque, joursRestants };
}

function calculerResultats(c: CalcState) {
  if (c.prix <= 0 || c.taux <= 0 || c.jours <= 0) return null;
  const ventes = Math.ceil(c.objectif / c.prix);
  const prospects = Math.ceil(ventes / (c.taux / 100));
  const parJour = Math.ceil(prospects / c.jours);
  const faisable = parJour <= 20;
  let justification = "";
  if (faisable && parJour <= 5) justification = "Très réaliste. Moins de 5 messages par jour.";
  else if (faisable && parJour <= 10) justification = "Réaliste. Environ " + parJour + " messages par jour.";
  else if (faisable) justification = "Exigeant mais possible. " + parJour + " contacts par jour.";
  else justification = "Irréaliste à ce taux. Augmente le prix ou le taux de conversion.";
  return { ventes, prospects, parJour, faisable, justification };
}

function analyserProjet(t: string) {
  const n = t.trim().length;
  if (n > 700) return { complexite: "Élevée", prix: "400$" };
  if (n > 240) return { complexite: "Moyenne", prix: "250$" };
  return { complexite: "Simple", prix: "150$" };
}

function lireSauvegarde(): GhostwritingState {
  if (typeof window === "undefined") return defaultState;
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? { ...defaultState, ...JSON.parse(saved) } : defaultState;
  } catch { return defaultState; }
}

function parseSections(text: string) {
  const results: { tag: string; titre: string; couleur: string; contenu: string }[] = [];
  for (const s of SECTION_MAP) {
    const open = "[" + s.tag + "]";
    const close = "[/" + s.tag + "]";
    const i1 = text.indexOf(open);
    const i2 = text.indexOf(close);
    if (i1 >= 0 && i2 > i1) {
      results.push({ tag: s.tag, titre: s.titre, couleur: s.couleur, contenu: text.slice(i1 + open.length, i2).trim() });
    }
  }
  if (results.length === 0 && text.trim().length > 0) {
    results.push({ tag: "RAW", titre: "Résultat", couleur: "#888780", contenu: text.trim() });
  }
  return results;
}

function formaterDate(iso: string): string {
  try {
    const d = new Date(iso);
    const mois = ["jan", "fév", "mar", "avr", "mai", "jun", "jul", "aoû", "sep", "oct", "nov", "déc"];
    return d.getDate() + " " + mois[d.getMonth()] + " " + d.getFullYear() + " " + String(d.getHours()).padStart(2, "0") + "h" + String(d.getMinutes()).padStart(2, "0");
  } catch { return iso; }
}

function calculerPrevision(prospects: Prospect[]): number {
  return prospects.reduce((total, p) => {
    if (p.statut === "devis_envoye") return total + p.montant;
    if (p.statut === "en_discussion") return total + Math.round(p.montant * 0.4);
    return total;
  }, 0);
}

function relancesProspects(prospects: Prospect[]) {
  return prospects
    .filter((p) => p.statut !== "gagne" && p.statut !== "perdu")
    .map((p) => ({ ...p, jours: Math.floor((Date.now() - new Date(p.dateContact).getTime()) / 86400000) }))
    .filter((p) => Number.isFinite(p.jours) && p.jours > 3)
    .sort((a, b) => b.jours - a.jours);
}

// ── Sous-composants ──────────────────────────────────────────────────────────

function TachesDuJourPanel({ taches, nouvelleTache, onNouvelleTache, onUpdate }: {
  taches: Tache[];
  nouvelleTache: string;
  onNouvelleTache: (v: string) => void;
  onUpdate: (t: Tache[]) => void;
}) {
  const today = new Date().toISOString().split("T")[0];
  const tachesDuJour = taches.filter((t) => t.date === today);

  function ajouterTache() {
    const texte = nouvelleTache.trim();
    if (texte === "") return;
    onUpdate([{ id: genId(), texte, done: false, date: today }, ...taches]);
    onNouvelleTache("");
  }

  return (
    <div style={{ border: "1px solid rgba(201,168,92,0.12)", borderRadius: 8, padding: "7px 8px" }}>
      <p className="label-meta" style={{ fontSize: 10, margin: "0 0 5px" }}>Tâches du jour</p>
      <div style={{ display: "flex", gap: 6, marginBottom: tachesDuJour.length > 0 ? 6 : 0 }}>
        <input
          type="text"
          placeholder="Ajouter une tâche"
          value={nouvelleTache}
          onChange={(e) => onNouvelleTache(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") ajouterTache(); }}
          style={{ flex: 1, minWidth: 0, padding: "4px 7px", fontSize: 12, borderRadius: 6, border: "1px solid rgba(201,168,92,0.25)", background: "var(--bg-main)", color: "var(--text-main)" }}
        />
        <button className="soft-button" type="button" onClick={ajouterTache} style={{ fontSize: 11, padding: "2px 8px" }}>+</button>
      </div>
      {tachesDuJour.length > 0 ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 4, maxHeight: 96, overflowY: "auto" }}>
          {tachesDuJour.map((t) => (
            <div key={t.id} style={{ alignItems: "center", display: "flex", gap: 6 }}>
              <input type="checkbox" checked={t.done} onChange={() => onUpdate(taches.map((item) => item.id === t.id ? { ...item, done: !item.done } : item))} />
              <span style={{ color: t.done ? "var(--text-muted)" : "var(--text-soft)", flex: 1, fontSize: 12, minWidth: 0, overflow: "hidden", textDecoration: t.done ? "line-through" : "none", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{t.texte}</span>
              <button type="button" onClick={() => onUpdate(taches.filter((item) => item.id !== t.id))} style={{ background: "transparent", border: 0, color: "var(--text-muted)", cursor: "pointer", fontSize: 12, padding: 0 }}>×</button>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function SprintEditPanel({ sprint, onUpdate, onClose }: { sprint: SprintActif; onUpdate: (s: SprintActif) => void; onClose: () => void }) {
  const [ef, setEf] = useState<SprintActif>(sprint);
  useEffect(() => { setEf(sprint); }, [sprint]);

  return (
    <div style={{ marginTop: 10, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
      {([
        { key: "objectif" as keyof SprintActif, label: "Objectif $" },
        { key: "revenusEncaisses" as keyof SprintActif, label: "Encaissé $" },
        { key: "revenusAttente" as keyof SprintActif, label: "En attente $" },
        { key: "prospectsContactes" as keyof SprintActif, label: "Prospects" },
        { key: "clientsObtenus" as keyof SprintActif, label: "Clients" },
      ]).map(({ key, label }) => (
        <div key={key}>
          <p className="label-meta" style={{ fontSize: 10, marginBottom: 2 }}>{label}</p>
          <input
            type="number"
            min={0}
            value={ef[key] as number}
            onChange={(e) => setEf((f) => ({ ...f, [key]: Number(e.target.value) }))}
            style={inputStyle}
          />
        </div>
      ))}
      <div style={{ gridColumn: "1 / -1", display: "flex", gap: 6 }}>
        <button className="btn-primary" type="button" onClick={() => { onUpdate(ef); onClose(); }} style={{ flex: 1, padding: "6px", fontSize: 12 }}>Sauvegarder</button>
        <button type="button" onClick={onClose} style={{ ...btnSmall, padding: "6px 12px" }}>Annuler</button>
      </div>
    </div>
  );
}

const SOURCES: { value: SourceProspect; label: string }[] = [
  { value: "linkedin", label: "LinkedIn" },
  { value: "facebook", label: "Facebook" },
  { value: "reference", label: "Référence" },
  { value: "site_web", label: "Site web" },
  { value: "autre", label: "Autre" },
];

const POTENTIELS: { value: PotentielProspect; label: string; color: string }[] = [
  { value: "faible", label: "Faible", color: "#888780" },
  { value: "moyen", label: "Moyen", color: "#BA7517" },
  { value: "élevé", label: "Élevé", color: "#1D9E75" },
];

const NIVEAUX_INTERET: { value: NiveauInteret; label: string; color: string }[] = [
  { value: "froid", label: "Froid", color: "#3B8BD4" },
  { value: "tiède", label: "Tiède", color: "#BA7517" },
  { value: "chaud", label: "Chaud", color: "#D85A30" },
];

function FicheProspect({ p, onUpdate, onClose }: {
  p: Prospect;
  onUpdate: (updated: Prospect) => void;
  onClose: () => void;
}) {
  const [ef, setEf] = useState<Prospect>(p);
  useEffect(() => { setEf(p); }, [p]);

  function f(key: keyof Prospect, value: string | number | boolean | undefined) {
    setEf((prev) => ({ ...prev, [key]: value }));
  }

  function sauvegarder() {
    onUpdate({ ...ef, date_dernier_contact: new Date().toISOString().split("T")[0] });
    onClose();
  }

  return (
    <div style={{ background: "rgba(201,168,92,0.04)", border: "1px solid rgba(201,168,92,0.16)", borderRadius: 8, marginTop: 4, padding: "10px 12px" }}>
      {/* Ligne 1 : Contact */}
      <p className="label-meta" style={{ fontSize: 10, margin: "0 0 6px", textTransform: "uppercase", letterSpacing: "0.08em" }}>Contact</p>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6, marginBottom: 8 }}>
        <div>
          <p className="label-meta" style={{ fontSize: 10, marginBottom: 2 }}>Nom *</p>
          <input type="text" value={ef.nom} onChange={(e) => f("nom", e.target.value)} style={inputStyle} />
        </div>
        <div>
          <p className="label-meta" style={{ fontSize: 10, marginBottom: 2 }}>Email</p>
          <input type="email" value={ef.email || ""} onChange={(e) => f("email", e.target.value)} placeholder="exemple@mail.com" style={inputStyle} />
        </div>
        <div>
          <p className="label-meta" style={{ fontSize: 10, marginBottom: 2 }}>Téléphone</p>
          <input type="text" value={ef.telephone || ""} onChange={(e) => f("telephone", e.target.value)} placeholder="514 000-0000" style={inputStyle} />
        </div>
        <div>
          <p className="label-meta" style={{ fontSize: 10, marginBottom: 2 }}>LinkedIn</p>
          <input type="text" value={ef.linkedin || ""} onChange={(e) => f("linkedin", e.target.value)} placeholder="linkedin.com/in/..." style={inputStyle} />
        </div>
      </div>

      {/* Ligne 2 : Projet */}
      <p className="label-meta" style={{ fontSize: 10, margin: "0 0 6px", textTransform: "uppercase", letterSpacing: "0.08em" }}>Projet</p>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6, marginBottom: 8 }}>
        <div>
          <p className="label-meta" style={{ fontSize: 10, marginBottom: 2 }}>Offre / service</p>
          <input type="text" value={ef.offre} onChange={(e) => f("offre", e.target.value)} placeholder="Révision, biographie…" style={inputStyle} />
        </div>
        <div>
          <p className="label-meta" style={{ fontSize: 10, marginBottom: 2 }}>Type de projet</p>
          <input type="text" value={ef.type_projet || ""} onChange={(e) => f("type_projet", e.target.value)} placeholder="Court / long / urgent…" style={inputStyle} />
        </div>
        <div>
          <p className="label-meta" style={{ fontSize: 10, marginBottom: 2 }}>Montant ($)</p>
          <input type="number" min={0} value={ef.montant} onChange={(e) => f("montant", Number(e.target.value))} style={inputStyle} />
        </div>
        <div>
          <p className="label-meta" style={{ fontSize: 10, marginBottom: 2 }}>Valeur estimée ($)</p>
          <input type="number" min={0} value={ef.valeur_estimee || 0} onChange={(e) => f("valeur_estimee", Number(e.target.value))} style={inputStyle} />
        </div>
      </div>

      {/* Ligne 3 : Qualification */}
      <p className="label-meta" style={{ fontSize: 10, margin: "0 0 6px", textTransform: "uppercase", letterSpacing: "0.08em" }}>Qualification</p>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 6, marginBottom: 8 }}>
        <div>
          <p className="label-meta" style={{ fontSize: 10, marginBottom: 2 }}>Statut</p>
          <select value={ef.statut} onChange={(e) => f("statut", e.target.value as StatutProspect)} style={inputStyle}>
            {STATUTS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
          </select>
        </div>
        <div>
          <p className="label-meta" style={{ fontSize: 10, marginBottom: 2 }}>Potentiel</p>
          <select value={ef.potentiel || ""} onChange={(e) => f("potentiel", e.target.value as PotentielProspect || undefined)} style={inputStyle}>
            <option value="">—</option>
            {POTENTIELS.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
          </select>
        </div>
        <div>
          <p className="label-meta" style={{ fontSize: 10, marginBottom: 2 }}>Intérêt</p>
          <select value={ef.niveau_interet || ""} onChange={(e) => f("niveau_interet", e.target.value as NiveauInteret || undefined)} style={inputStyle}>
            <option value="">—</option>
            {NIVEAUX_INTERET.map((n) => <option key={n.value} value={n.value}>{n.label}</option>)}
          </select>
        </div>
        <div>
          <p className="label-meta" style={{ fontSize: 10, marginBottom: 2 }}>Source</p>
          <select value={ef.source || ""} onChange={(e) => f("source", e.target.value as SourceProspect || undefined)} style={inputStyle}>
            <option value="">—</option>
            {SOURCES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
          </select>
        </div>
        <div>
          <p className="label-meta" style={{ fontSize: 10, marginBottom: 2 }}>Canal</p>
          <input type="text" value={ef.canal} onChange={(e) => f("canal", e.target.value)} placeholder="LinkedIn, Facebook…" style={inputStyle} />
        </div>
        <div>
          <p className="label-meta" style={{ fontSize: 10, marginBottom: 2 }}>Prochaine relance</p>
          <input type="date" value={ef.date_prochaine_relance || ""} onChange={(e) => f("date_prochaine_relance", e.target.value)} style={inputStyle} />
        </div>
      </div>

      {/* Prochaine action + Notes */}
      <div style={{ display: "grid", gap: 6, marginBottom: 8 }}>
        <div>
          <p className="label-meta" style={{ fontSize: 10, marginBottom: 2 }}>Prochaine action</p>
          <input type="text" value={ef.prochaine_action || ""} onChange={(e) => f("prochaine_action", e.target.value)} placeholder="ex: Envoyer devis, Relancer par email…" style={inputStyle} />
        </div>
        <div>
          <p className="label-meta" style={{ fontSize: 10, marginBottom: 2 }}>Notes</p>
          <textarea value={ef.notes || ""} onChange={(e) => f("notes", e.target.value)} placeholder="Contexte, besoins particuliers, historique…" style={{ ...inputStyle, minHeight: 52, resize: "vertical" }} />
        </div>
      </div>

      <div style={{ display: "flex", gap: 6 }}>
        <button className="btn-primary" type="button" onClick={sauvegarder} style={{ flex: 1, fontSize: 12, padding: "5px" }}>Sauvegarder</button>
        <button type="button" onClick={onClose} style={{ ...btnSmall, padding: "5px 12px" }}>Annuler</button>
      </div>
    </div>
  );
}

function CRMPanel({ prospects, onUpdate }: { prospects: Prospect[]; onUpdate: (p: Prospect[]) => void }) {
  const [ajoutOpen, setAjoutOpen] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [nv, setNv] = useState<Partial<Prospect>>({ statut: "a_contacter", montant: 0 });

  function ajouter() {
    if (nv.nom === undefined || nv.nom.trim() === "") return;
    const today = new Date().toISOString().split("T")[0];
    onUpdate([{
      id: genId(),
      nom: nv.nom,
      canal: nv.canal || "",
      offre: nv.offre || "",
      statut: nv.statut || "a_contacter",
      montant: nv.montant || 0,
      dateContact: today,
      date_dernier_contact: today,
      encaisse: false,
    }, ...prospects]);
    setNv({ statut: "a_contacter", montant: 0 });
    setAjoutOpen(false);
  }

  // Tri : actifs en tête, puis par date de contact desc
  const prospectsTries = [...prospects].sort((a, b) => {
    const actifA = a.statut !== "gagne" && a.statut !== "perdu" ? 0 : 1;
    const actifB = b.statut !== "gagne" && b.statut !== "perdu" ? 0 : 1;
    if (actifA !== actifB) return actifA - actifB;
    return new Date(b.dateContact).getTime() - new Date(a.dateContact).getTime();
  });

  const actifs = prospects.filter((p) => p.statut !== "gagne" && p.statut !== "perdu").length;

  return (
    <div>
      <div style={{ alignItems: "center", display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
        <p className="label-meta" style={{ margin: 0 }}>
          {prospects.length} prospect{prospects.length > 1 ? "s" : ""} · {actifs} actif{actifs > 1 ? "s" : ""}
        </p>
        <button style={btnSmall} type="button" onClick={() => setAjoutOpen(!ajoutOpen)}>{ajoutOpen ? "Annuler" : "+ Ajouter"}</button>
      </div>

      {ajoutOpen ? (
        <div style={{ background: "rgba(201,168,92,0.05)", border: "1px solid rgba(201,168,92,0.18)", borderRadius: 8, display: "grid", gap: 6, marginBottom: 10, padding: "10px 12px" }}>
          <p className="label-meta" style={{ fontSize: 10, margin: 0 }}>Nouveau prospect</p>
          {[
            { k: "nom", ph: "Nom *", t: "text" },
            { k: "offre", ph: "Offre / service", t: "text" },
            { k: "canal", ph: "Canal (LinkedIn, Facebook…)", t: "text" },
            { k: "montant", ph: "Montant $", t: "number" },
          ].map(({ k, ph, t }) => (
            <input
              key={k}
              type={t}
              placeholder={ph}
              value={t === "number" ? (nv[k as keyof Prospect] as number) || 0 : (nv[k as keyof Prospect] as string) || ""}
              onChange={(e) => setNv((prev) => ({ ...prev, [k]: t === "number" ? Number(e.target.value) : e.target.value }))}
              style={inputStyle}
            />
          ))}
          <select value={nv.statut} onChange={(e) => setNv((prev) => ({ ...prev, statut: e.target.value as StatutProspect }))} style={inputStyle}>
            {STATUTS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
          </select>
          <button className="btn-primary" type="button" onClick={ajouter} style={{ padding: "5px", fontSize: 12 }}>Ajouter le prospect</button>
        </div>
      ) : null}

      {prospectsTries.length > 0 ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          {prospectsTries.map((p) => {
            const st = STATUTS.find((s) => s.value === p.statut);
            const pot = POTENTIELS.find((x) => x.value === p.potentiel);
            const interet = NIVEAUX_INTERET.find((x) => x.value === p.niveau_interet);
            const isExpanded = expandedId === p.id;
            const estActif = p.statut !== "gagne" && p.statut !== "perdu";

            return (
              <div key={p.id}>
                {/* Ligne compacte */}
                <div
                  style={{
                    alignItems: "center",
                    background: isExpanded ? "rgba(201,168,92,0.07)" : estActif ? "rgba(255,250,238,0.03)" : "rgba(255,255,255,0.01)",
                    border: "1px solid " + (isExpanded ? "rgba(201,168,92,0.22)" : estActif ? "rgba(201,168,92,0.10)" : "rgba(201,168,92,0.05)"),
                    borderRadius: isExpanded ? "7px 7px 0 0" : 7,
                    cursor: "pointer",
                    display: "flex",
                    gap: 8,
                    justifyContent: "space-between",
                    opacity: estActif ? 1 : 0.65,
                    padding: "6px 8px",
                    transition: "background 0.15s",
                  }}
                  onClick={() => setExpandedId(isExpanded ? null : p.id)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") setExpandedId(isExpanded ? null : p.id); }}
                  aria-expanded={isExpanded}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 7, minWidth: 0, flex: 1 }}>
                    <span style={{ color: "var(--text-muted)", fontSize: 10, flexShrink: 0 }}>{isExpanded ? "▾" : "▸"}</span>
                    <span style={{ fontSize: 13, fontWeight: 600, color: "var(--text-main)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{p.nom}</span>
                    {p.montant > 0 ? <span style={{ fontSize: 11, color: "var(--text-muted)", flexShrink: 0 }}>{p.montant} $</span> : null}
                    {pot ? <span style={{ fontSize: 10, padding: "1px 5px", borderRadius: 99, background: pot.color + "22", color: pot.color, flexShrink: 0 }}>{pot.label}</span> : null}
                    {interet ? <span style={{ fontSize: 10, padding: "1px 5px", borderRadius: 99, background: interet.color + "22", color: interet.color, flexShrink: 0 }}>{interet.label}</span> : null}
                    {p.prochaine_action !== undefined && p.prochaine_action !== "" ? (
                      <span style={{ fontSize: 10, color: "var(--text-muted)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 140 }}>→ {p.prochaine_action}</span>
                    ) : null}
                  </div>
                  <div style={{ display: "flex", gap: 4, flexShrink: 0 }} onClick={(e) => e.stopPropagation()}>
                    <span style={{ fontSize: 10, padding: "1px 6px", borderRadius: 99, background: (st ? st.color : "#888") + "22", color: st ? st.color : "#888", alignSelf: "center" }}>
                      {st ? st.label : p.statut}
                    </span>
                    <select
                      value={p.statut}
                      onChange={(e) => onUpdate(prospects.map((pr) => pr.id === p.id ? { ...pr, statut: e.target.value as StatutProspect, date_dernier_contact: new Date().toISOString().split("T")[0] } : pr))}
                      style={{ fontSize: 10, padding: "2px 4px", borderRadius: 4, border: "1px solid rgba(201,168,92,0.3)", background: "var(--bg-main)", color: "var(--text-main)" }}
                    >
                      {STATUTS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
                    </select>
                    <button
                      type="button"
                      onClick={() => { onUpdate(prospects.filter((pr) => pr.id !== p.id)); if (expandedId === p.id) setExpandedId(null); }}
                      style={{ fontSize: 10, padding: "2px 5px", borderRadius: 4, border: "1px solid rgba(201,168,92,0.2)", background: "transparent", color: "var(--text-muted)", cursor: "pointer" }}
                    >×</button>
                  </div>
                </div>

                {/* Accordéon fiche détail */}
                {isExpanded ? (
                  <div style={{ border: "1px solid rgba(201,168,92,0.18)", borderTop: "none", borderRadius: "0 0 7px 7px", overflow: "hidden" }}>
                    <FicheProspect
                      p={p}
                      onUpdate={(updated) => onUpdate(prospects.map((pr) => pr.id === p.id ? updated : pr))}
                      onClose={() => setExpandedId(null)}
                    />
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      ) : (
        <p style={{ color: "var(--text-muted)", fontSize: 12, margin: 0 }}>Aucun prospect. Commence à en ajouter.</p>
      )}
    </div>
  );
}

function BibliothequeOffresPanel({ offres, onUpdate }: { offres: Offre[]; onUpdate: (o: Offre[]) => void }) {
  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState<Omit<Offre, "id">>(defaultOffre);

  const totalRevenu = offres.reduce((acc, o) => acc + o.prix * o.ventes, 0);
  const totalVentes = offres.reduce((acc, o) => acc + o.ventes, 0);
  const actives = offres.filter((o) => o.actif).length;

  function ouvrirAjout() { setEditId(null); setForm(defaultOffre); setOpen(true); }
  function ouvrirEdition(o: Offre) { setEditId(o.id); setForm({ nom: o.nom, prix: o.prix, description: o.description, canal: o.canal, ventes: o.ventes, actif: o.actif }); setOpen(true); }

  function sauvegarder() {
    if (form.nom.trim() === "") return;
    if (editId !== null) {
      onUpdate(offres.map((o) => o.id === editId ? { ...o, ...form } : o));
    } else {
      onUpdate([{ id: genId(), ...form }, ...offres]);
    }
    setOpen(false); setEditId(null); setForm(defaultOffre);
  }

  return (
    <div>
      <div style={{ alignItems: "center", display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
        <p className="label-meta" style={{ margin: 0 }}>
          {offres.length} offre{offres.length > 1 ? "s" : ""} · {actives} active{actives > 1 ? "s" : ""}
        </p>
        <button style={btnSmall} type="button" onClick={ouvrirAjout}>+ Ajouter</button>
      </div>

      {offres.length > 0 ? (
        <SystemGrid gap={6} min={100}>
          <CompactMetric label="Revenu total" value={totalRevenu + " $"} />
          <CompactMetric label="Ventes" value={String(totalVentes)} />
          <CompactMetric label="Actives" value={String(actives)} />
        </SystemGrid>
      ) : null}

      {open ? (
        <div style={{ background: "rgba(201,168,92,0.06)", border: "1px solid rgba(201,168,92,0.18)", borderRadius: 8, display: "grid", gap: 8, marginTop: 10, padding: "12px" }}>
          <p className="label-meta" style={{ margin: 0 }}>{editId !== null ? "Modifier l'offre" : "Nouvelle offre"}</p>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
            <div style={{ gridColumn: "1 / -1" }}>
              <p className="label-meta" style={{ fontSize: 10, marginBottom: 3 }}>Nom *</p>
              <input type="text" placeholder="ex: Révision de CV" value={form.nom} onChange={(e) => setForm((f) => ({ ...f, nom: e.target.value }))} style={inputStyle} />
            </div>
            <div>
              <p className="label-meta" style={{ fontSize: 10, marginBottom: 3 }}>Prix ($)</p>
              <input type="number" min={0} value={form.prix} onChange={(e) => setForm((f) => ({ ...f, prix: Number(e.target.value) }))} style={inputStyle} />
            </div>
            <div>
              <p className="label-meta" style={{ fontSize: 10, marginBottom: 3 }}>Ventes réalisées</p>
              <input type="number" min={0} value={form.ventes} onChange={(e) => setForm((f) => ({ ...f, ventes: Number(e.target.value) }))} style={inputStyle} />
            </div>
            <div style={{ gridColumn: "1 / -1" }}>
              <p className="label-meta" style={{ fontSize: 10, marginBottom: 3 }}>Canal principal</p>
              <input type="text" placeholder="Facebook, réseau, LinkedIn…" value={form.canal} onChange={(e) => setForm((f) => ({ ...f, canal: e.target.value }))} style={inputStyle} />
            </div>
            <div style={{ gridColumn: "1 / -1" }}>
              <p className="label-meta" style={{ fontSize: 10, marginBottom: 3 }}>Description</p>
              <textarea placeholder="Ce que tu livres, le délai, pour qui…" value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} style={{ ...inputStyle, minHeight: 56, resize: "vertical" }} />
            </div>
            <div style={{ gridColumn: "1 / -1", alignItems: "center", display: "flex", gap: 8 }}>
              <input type="checkbox" id="actif-check" checked={form.actif} onChange={(e) => setForm((f) => ({ ...f, actif: e.target.checked }))} />
              <label htmlFor="actif-check" style={{ fontSize: 12, color: "var(--text-soft)", cursor: "pointer" }}>Offre active</label>
            </div>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button className="btn-primary" type="button" onClick={sauvegarder} style={{ flex: 1, padding: "6px", fontSize: 12 }}>Sauvegarder</button>
            <button type="button" onClick={() => { setOpen(false); setEditId(null); setForm(defaultOffre); }} style={{ ...btnSmall, padding: "6px 12px" }}>Annuler</button>
          </div>
        </div>
      ) : null}

      {offres.length > 0 ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 6, marginTop: 10 }}>
          {offres.map((o) => (
            <div
              key={o.id}
              style={{
                background: o.actif ? "rgba(255,250,238,0.04)" : "rgba(255,255,255,0.01)",
                border: "1px solid " + (o.actif ? "rgba(201,168,92,0.18)" : "rgba(201,168,92,0.07)"),
                borderRadius: 8,
                opacity: o.actif ? 1 : 0.6,
                padding: "9px 11px",
              }}
            >
              <div style={{ alignItems: "flex-start", display: "flex", gap: 8, justifyContent: "space-between", marginBottom: 6 }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ alignItems: "center", display: "flex", flexWrap: "wrap", gap: 7 }}>
                    <span style={{ color: "var(--text-main)", fontSize: 13, fontWeight: 600 }}>{o.nom}</span>
                    <span style={{ color: "var(--text-soft)", fontSize: 12 }}>{o.prix} $</span>
                    {o.canal !== "" ? <span style={{ color: "var(--text-muted)", fontSize: 11 }}>{o.canal}</span> : null}
                    <span style={{ background: o.actif ? "rgba(29,158,117,0.15)" : "rgba(136,135,128,0.15)", border: "1px solid " + (o.actif ? "rgba(29,158,117,0.3)" : "rgba(136,135,128,0.3)"), borderRadius: 99, color: o.actif ? "#1D9E75" : "#888780", fontSize: 10, padding: "1px 7px" }}>
                      {o.actif ? "Active" : "Inactive"}
                    </span>
                  </div>
                  {o.description !== "" ? <p style={{ color: "var(--text-muted)", fontSize: 11, lineHeight: 1.5, margin: "3px 0 0" }}>{o.description}</p> : null}
                </div>
                <div style={{ display: "flex", flexShrink: 0, gap: 4 }}>
                  <button type="button" onClick={() => ouvrirEdition(o)} style={btnSmall}>Modifier</button>
                  <button type="button" onClick={() => onUpdate(offres.map((x) => x.id === o.id ? { ...x, actif: !x.actif } : x))} style={btnSmall}>{o.actif ? "Désactiver" : "Activer"}</button>
                  <button type="button" onClick={() => onUpdate(offres.filter((x) => x.id !== o.id))} style={{ ...btnSmall, border: "1px solid rgba(216,90,48,0.3)", color: "#D85A30" }}>×</button>
                </div>
              </div>
              <div style={{ alignItems: "center", display: "flex", gap: 8 }}>
                <SystemGrid gap={6} min={90}>
                  <CompactMetric label="Ventes" value={String(o.ventes)} />
                  <CompactMetric label="Revenu" value={(o.prix * o.ventes) + " $"} />
                  <CompactMetric label="Prix unit." value={o.prix + " $"} />
                </SystemGrid>
                <button type="button" onClick={() => onUpdate(offres.map((x) => x.id === o.id ? { ...x, ventes: x.ventes + 1 } : x))} style={{ background: "rgba(29,158,117,0.08)", border: "1px solid rgba(29,158,117,0.4)", borderRadius: 6, color: "#1D9E75", cursor: "pointer", flexShrink: 0, fontSize: 11, padding: "3px 9px" }}>+1 vente</button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p style={{ color: "var(--text-muted)", fontSize: 12, margin: "10px 0 0" }}>Aucune offre. Ajoute ta première offre pour suivre tes ventes.</p>
      )}
    </div>
  );
}

function CalculateurPanel({ calc, onUpdate }: { calc: CalcState; onUpdate: (c: CalcState) => void }) {
  const res = calculerResultats(calc);
  return (
    <div>
      <p className="label-meta" style={{ margin: "0 0 8px" }}>Calculateur de faisabilité</p>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 10 }}>
        <div style={{ gridColumn: "1 / -1" }}>
          <p className="label-meta" style={{ fontSize: 10, marginBottom: 3 }}>Nom de l'offre</p>
          <input type="text" placeholder="ex: Révision de CV" value={calc.offre} onChange={(e) => onUpdate({ ...calc, offre: e.target.value })} style={inputStyle} />
        </div>
        {([
          { key: "prix" as keyof CalcState, label: "Prix par vente ($)", min: 1 },
          { key: "taux" as keyof CalcState, label: "Taux conversion (%)", min: 1 },
          { key: "objectif" as keyof CalcState, label: "Objectif ($)", min: 1 },
          { key: "jours" as keyof CalcState, label: "Jours disponibles", min: 1 },
        ]).map(({ key, label, min }) => (
          <div key={key}>
            <p className="label-meta" style={{ fontSize: 10, marginBottom: 3 }}>{label}</p>
            <input type="number" min={min} value={calc[key] as number} onChange={(e) => onUpdate({ ...calc, [key]: Math.max(min, Number(e.target.value)) })} style={inputStyle} />
          </div>
        ))}
      </div>
      {res !== null ? (
        <div style={{ borderTop: "1px solid rgba(201,168,92,0.15)", paddingTop: 10 }}>
          <SystemGrid gap={6} min={90}>
            <CompactMetric label="Ventes requises" value={String(res.ventes)} />
            <CompactMetric label="Prospects" value={String(res.prospects)} />
            <CompactMetric label="Par jour" value={res.parJour + " / j"} />
          </SystemGrid>
          <div style={{ background: res.faisable ? "rgba(29,158,117,0.1)" : "rgba(216,90,48,0.1)", border: "1px solid " + (res.faisable ? "rgba(29,158,117,0.3)" : "rgba(216,90,48,0.3)"), borderRadius: 8, marginTop: 8, padding: "8px 12px" }}>
            <span style={{ color: res.faisable ? "#1D9E75" : "#D85A30", fontSize: 13, fontWeight: 700 }}>{res.faisable ? "OUI — Faisable" : "NON — Irréaliste"}</span>
            <p style={{ color: "var(--text-soft)", fontSize: 12, margin: "3px 0 0" }}>{res.justification}</p>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function Mode500Panel({ mode500, onUpdate }: { mode500: Mode500State; onUpdate: (m: Mode500State) => void }) {
  const [loading, setLoading] = useState(false);
  const [erreur, setErreur] = useState("");
  const [resultat, setResultat] = useState("");
  const [historique, setHistorique] = useState<PlanHistorique[]>([]);
  const [copiedId, setCopiedId] = useState("");
  const [confirmerEffacement, setConfirmerEffacement] = useState(false);

  useEffect(() => { setHistorique(lireLS<PlanHistorique[]>(FL_HISTORY, [])); }, []);

  function sauvegarderDansHistorique(contenu: string) {
    const resume = mode500.competences.slice(0, 60) + (mode500.competences.length > 60 ? "…" : "") + " — " + mode500.objectif + " $ / " + mode500.jours + "j";
    const entree: PlanHistorique = { id: genId(), date: new Date().toISOString(), resume, contenu };
    const updated = [entree, ...historique].slice(0, 5);
    setHistorique(updated);
    ecrireLS(FL_HISTORY, updated);
  }

  function supprimerEntree(id: string) {
    const updated = historique.filter((h) => h.id !== id);
    setHistorique(updated);
    ecrireLS(FL_HISTORY, updated);
  }

  function effacerTout() {
    setHistorique([]);
    ecrireLS(FL_HISTORY, []);
    setConfirmerEffacement(false);
  }

  async function copierTexte(texte: string, id: string) {
    await navigator.clipboard.writeText(texte);
    setCopiedId(id);
    setTimeout(() => setCopiedId(""), 1400);
  }

  async function generer() {
    if (mode500.competences.trim() === "") { setErreur("Indique au moins une compétence."); return; }
    setLoading(true); setErreur(""); setResultat("");
    const prompt = "Tu es un consultant en revenus freelance pour le marché québécois francophone 2026. Mode vérité brutale uniquement.\n\nPROFIL:\n- Objectif: " + mode500.objectif + " $ en " + mode500.jours + " jours\n- Compétences: " + mode500.competences + "\n- Temps disponible: " + (mode500.tempsParJour || "non précisé") + " par jour\n- Contexte: " + (mode500.contexte || "aucun contexte additionnel") + "\n\nRéponds EXACTEMENT dans ce format avec ces balises:\n\n[ANALYSE]\nObjectif: " + mode500.objectif + " $ en " + mode500.jours + " jours\nDifficulté: (faible/moyenne/élevée)\nFaisabilité: (0-100%)\nRaison principale: (1 phrase brutale et honnête)\n[/ANALYSE]\n\n[OFFRES]\nOFFRE 1: (nom)\nPrix recommandé: (montant $)\nDifficulté de vente: (faible/moyenne/élevée)\nVitesse de vente: (rapide/moyenne/lente)\nScore: (0-100)/100\nJustification: (1 phrase)\n\nOFFRE 2: (nom)\nPrix recommandé: (montant $)\nDifficulté de vente: (faible/moyenne/élevée)\nVitesse de vente: (rapide/moyenne/lente)\nScore: (0-100)/100\nJustification: (1 phrase)\n\nOFFRE 3: (nom)\nPrix recommandé: (montant $)\nDifficulté de vente: (faible/moyenne/élevée)\nVitesse de vente: (rapide/moyenne/lente)\nScore: (0-100)/100\nJustification: (1 phrase)\n[/OFFRES]\n\n[MATHS]\nOffre retenue: (nom)\nPrix: (montant $)\nVentes nécessaires: (nombre)\nProspects nécessaires: (nombre)\nProspects par jour: (nombre)\nRevenu projeté si 10% conversion: (montant $)\nRevenu projeté si 15% conversion: (montant $)\n[/MATHS]\n\n[PLAN]\nJ1: (3 actions concrètes avec canaux précis)\nJ2: (3 actions concrètes)\nJ3: (3 actions concrètes)\nJ4: (3 actions concrètes)\nJ5: (3 actions concrètes)\n[/PLAN]\n\n[SCRIPTS]\nPREMIER CONTACT:\n(message prêt à envoyer, ton humain, max 5 lignes)\n\nRELANCE:\n(message de suivi si pas de réponse après 48h)\n\nFERMETURE:\n(message de conversion quand prospect est intéressé)\n[/SCRIPTS]";
    try {
      const resp = await fetch("/api/agent", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ message: prompt }) });
      const data = await resp.json();
      if (resp.ok) {
        const contenu = data.result || "";
        setResultat(contenu);
        if (contenu.trim().length > 0) { sauvegarderDansHistorique(contenu); }
      } else { setErreur(data.error || "Erreur API"); }
    } catch (e) { setErreur(e instanceof Error ? e.message : "Erreur réseau"); }
    setLoading(false);
  }

  const sections = parseSections(resultat);

  return (
    <div>
      <p className="label-meta" style={{ margin: "0 0 8px" }}>
        Mode 500 $ en 5 jours — {historique.length} plan{historique.length > 1 ? "s" : ""} sauvegardé{historique.length > 1 ? "s" : ""}
      </p>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 10 }}>
        <div>
          <p className="label-meta" style={{ fontSize: 10, marginBottom: 3 }}>Objectif ($)</p>
          <input type="number" min={1} value={mode500.objectif} onChange={(e) => onUpdate({ ...mode500, objectif: Number(e.target.value) })} style={inputStyle} />
        </div>
        <div>
          <p className="label-meta" style={{ fontSize: 10, marginBottom: 3 }}>Jours disponibles</p>
          <input type="number" min={1} max={30} value={mode500.jours} onChange={(e) => onUpdate({ ...mode500, jours: Number(e.target.value) })} style={inputStyle} />
        </div>
        <div style={{ gridColumn: "1 / -1" }}>
          <p className="label-meta" style={{ fontSize: 10, marginBottom: 3 }}>Compétences disponibles *</p>
          <input type="text" placeholder="ex: rédaction, révision, lettres formelles…" value={mode500.competences} onChange={(e) => onUpdate({ ...mode500, competences: e.target.value })} style={inputStyle} />
        </div>
        <div style={{ gridColumn: "1 / -1" }}>
          <p className="label-meta" style={{ fontSize: 10, marginBottom: 3 }}>Temps disponible par jour</p>
          <input type="text" placeholder="ex: 4h le matin, 2h le soir" value={mode500.tempsParJour} onChange={(e) => onUpdate({ ...mode500, tempsParJour: e.target.value })} style={inputStyle} />
        </div>
        <div style={{ gridColumn: "1 / -1" }}>
          <p className="label-meta" style={{ fontSize: 10, marginBottom: 3 }}>Contexte libre (optionnel)</p>
          <textarea placeholder="ex: zéro client actif, réseau dormant…" value={mode500.contexte} onChange={(e) => onUpdate({ ...mode500, contexte: e.target.value })} style={{ ...inputStyle, minHeight: 60, resize: "vertical" }} />
        </div>
      </div>
      <button className="btn-primary" type="button" onClick={generer} disabled={loading} style={{ width: "100%", padding: "8px", fontSize: 13 }}>
        {loading ? "Génération en cours…" : "Générer mon plan"}
      </button>
      {loading ? (
        <div style={{ background: "rgba(201,168,92,0.06)", borderRadius: 8, marginTop: 10, padding: "10px", textAlign: "center" }}>
          <p style={{ color: "var(--text-muted)", fontSize: 12, margin: 0 }}>Analyse en cours… (15 à 30 secondes)</p>
        </div>
      ) : null}
      {erreur !== "" ? (
        <div style={{ background: "rgba(216,90,48,0.08)", border: "1px solid rgba(216,90,48,0.3)", borderRadius: 8, marginTop: 10, padding: "8px 12px" }}>
          <p style={{ color: "#D85A30", fontSize: 12, margin: 0 }}>{erreur}</p>
        </div>
      ) : null}
      {sections.length > 0 ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 12 }}>
          {sections.map((sec) => (
            <div key={sec.tag} style={{ border: "1px solid " + sec.couleur + "33", borderRadius: 8, overflow: "hidden" }}>
              <div style={{ background: sec.couleur + "18", borderBottom: "1px solid " + sec.couleur + "22", padding: "6px 10px" }}>
                <p style={{ color: sec.couleur, fontSize: 12, fontWeight: 600, margin: 0 }}>{sec.titre}</p>
              </div>
              <div style={{ padding: "8px 10px" }}>
                <p style={{ color: "var(--text-soft)", fontSize: 12, lineHeight: 1.7, margin: 0, whiteSpace: "pre-wrap" }}>{sec.contenu}</p>
              </div>
            </div>
          ))}
        </div>
      ) : null}
      {historique.length > 0 ? (
        <div style={{ borderTop: "1px solid rgba(201,168,92,0.15)", marginTop: 14, paddingTop: 12 }}>
          <div style={{ alignItems: "center", display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
            <p className="label-meta" style={{ margin: 0 }}>Historique ({historique.length})</p>
            {confirmerEffacement ? (
              <div style={{ display: "flex", gap: 5 }}>
                <button type="button" onClick={effacerTout} style={{ background: "rgba(216,90,48,0.1)", border: "1px solid rgba(216,90,48,0.5)", borderRadius: 4, color: "#D85A30", cursor: "pointer", fontSize: 11, padding: "2px 8px" }}>Confirmer</button>
                <button type="button" onClick={() => setConfirmerEffacement(false)} style={btnSmall}>Annuler</button>
              </div>
            ) : (
              <button type="button" onClick={() => setConfirmerEffacement(true)} style={btnSmall}>Effacer tout</button>
            )}
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {historique.map((h) => (
              <div key={h.id} style={{ background: "rgba(255,250,238,0.03)", border: "1px solid rgba(201,168,92,0.12)", borderRadius: 7, padding: "8px 10px" }}>
                <div style={{ alignItems: "flex-start", display: "flex", gap: 8, justifyContent: "space-between" }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ color: "var(--text-main)", fontSize: 12, fontWeight: 600, margin: "0 0 2px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{h.resume}</p>
                    <p style={{ color: "var(--text-muted)", fontSize: 11, margin: 0 }}>{formaterDate(h.date)}</p>
                  </div>
                  <div style={{ display: "flex", flexShrink: 0, gap: 4 }}>
                    <button type="button" onClick={() => setResultat(h.contenu)} style={{ background: "rgba(29,158,117,0.08)", border: "1px solid rgba(29,158,117,0.4)", borderRadius: 4, color: "#1D9E75", cursor: "pointer", fontSize: 11, padding: "2px 7px" }}>Recharger</button>
                    <button type="button" onClick={() => copierTexte(h.contenu, h.id)} style={btnSmall}>{copiedId === h.id ? "Copié" : "Copier"}</button>
                    <button type="button" onClick={() => supprimerEntree(h.id)} style={{ ...btnSmall, border: "1px solid rgba(216,90,48,0.3)", color: "#D85A30" }}>×</button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}

// ── Page principale ──────────────────────────────────────────────────────────

export default function FreelancePage() {
  const [activeTab, setActiveTab] = useState<MainTab>("cockpit");
  const [form, setForm] = useState<GhostwritingState>(defaultState);
  const [result, setResult] = useState("");
  const [clientResponse, setClientResponse] = useState("");
  const [generationError, setGenerationError] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [copied, setCopied] = useState(false);
  const [crCopied, setCrCopied] = useState(false);
  const [sprint, setSprint] = useState<SprintActif>(defaultSprint);
  const [sprintEdit, setSprintEdit] = useState(false);
  const [prospects, setProspects] = useState<Prospect[]>([]);
  const [calc, setCalc] = useState<CalcState>(defaultCalc);
  const [mode500, setMode500] = useState<Mode500State>(defaultMode500);
  const [offres, setOffres] = useState<Offre[]>([]);
  const [taches, setTaches] = useState<Tache[]>([]);
  const [nouvelleTache, setNouvelleTache] = useState("");

  const qa = analyserProjet(form.clientText);

  // Chargement initial
  useEffect(() => { setForm(lireSauvegarde()); }, []);
  useEffect(() => {
    setSprint(lireLS(FL_SPRINT, defaultSprint));
    setProspects(lireLS<Prospect[]>(FL_PROSPECTS, []));
    setCalc(lireLS(FL_CALC, defaultCalc));
    setMode500(lireLS(FL_MODE500, defaultMode500));
    setOffres(lireLS<Offre[]>(FL_OFFERS, []));
    setTaches(lireLS<Tache[]>(FL_TACHES, []));
  }, []);

  // Persistance automatique
  useEffect(() => { localStorage.setItem(STORAGE_KEY, JSON.stringify(form)); }, [form]);
  useEffect(() => { ecrireLS(FL_SPRINT, sprint); }, [sprint]);
  useEffect(() => { ecrireLS(FL_PROSPECTS, prospects); }, [prospects]);
  useEffect(() => { ecrireLS(FL_CALC, calc); }, [calc]);
  useEffect(() => { ecrireLS(FL_MODE500, mode500); }, [mode500]);
  useEffect(() => { ecrireLS(FL_OFFERS, offres); }, [offres]);
  useEffect(() => { ecrireLS(FL_TACHES, taches); }, [taches]);

  function toggleOpt(group: OptionGroup, value: string) {
    setForm((c) => ({ ...c, [group]: c[group].includes(value) ? c[group].filter((i) => i !== value) : [value] }));
  }

  async function handleGenerate() {
    const txt = form.clientText.trim();
    if (txt === "") { setGenerationError("Colle un texte avant de générer."); return; }
    setCopied(false); setGenerationError(""); setIsGenerating(true);
    try {
      const resp = await fetch("/api/agent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: "Tu es un expert en ghostwriting narratif.\n\nMessage client :\n" + txt + "\n\nObjectif : " + (form.objectifs[0] || "clarifier") + "\nTon : " + (form.tons[0] || "professionnel") + "\nLongueur : " + (form.longueurs[0] || "moyen") + "\n\nGénère un texte humain et fluide.",
        }),
      });
      const data = await resp.json();
      if (resp.ok) { setResult(data.result || ""); }
      else { setGenerationError(data.error || "Erreur génération"); }
    } catch (err) { setGenerationError(err instanceof Error ? err.message : "Erreur"); }
    setIsGenerating(false);
  }

  async function copier(text: string, setter: (v: boolean) => void) {
    await navigator.clipboard.writeText(text);
    setter(true);
    setTimeout(() => setter(false), 1400);
  }

  // KPIs calculés
  const kpis = calculerKPIs(sprint);
  const prevision = calculerPrevision(prospects);
  const relances = relancesProspects(prospects);
  const totalRevenu = sprint.revenusEncaisses + sprint.revenusAttente;
  const pct = Math.min(100, sprint.objectif > 0 ? Math.round((totalRevenu / sprint.objectif) * 100) : 0);

  // Centre d'actions — priorités calculées depuis les données existantes
  const actionsUrgentes: { label: string; detail: string; urgence: "haute" | "normale" }[] = [];
  if (relances.length > 0) {
    actionsUrgentes.push({
      label: `Relancer ${relances[0].nom}`,
      detail: `J+${relances[0].jours} sans réponse · ${relances[0].montant > 0 ? relances[0].montant + " $" : relances[0].offre || "pas de montant"}`,
      urgence: relances[0].jours >= 7 ? "haute" : "normale",
    });
    if (relances.length > 1) {
      actionsUrgentes.push({
        label: `${relances.length - 1} autre${relances.length > 2 ? "s" : ""} relance${relances.length > 2 ? "s" : ""} en attente`,
        detail: relances.slice(1).map((p) => p.nom).join(", "),
        urgence: "normale",
      });
    }
  }
  const prospectsChauds = prospects.filter((p) => p.statut === "devis_envoye" || p.statut === "en_discussion");
  if (prospectsChauds.length > 0) {
    actionsUrgentes.push({
      label: `${prospectsChauds.length} prospect${prospectsChauds.length > 1 ? "s" : ""} chaud${prospectsChauds.length > 1 ? "s" : ""}`,
      detail: prospectsChauds.map((p) => p.nom + (p.montant > 0 ? " (" + p.montant + " $)" : "")).join(", "),
      urgence: "normale",
    });
  }
  if (kpis.manque > 0 && sprint.prospectsContactes === 0) {
    actionsUrgentes.push({
      label: "Commencer à prospecter",
      detail: "Aucun prospect contacté — il manque " + kpis.manque + " $ pour atteindre l'objectif",
      urgence: "haute",
    });
  }
  const today = new Date().toISOString().split("T")[0];
  const tachesDuJour = taches.filter((t) => t.date === today && !t.done);
  if (tachesDuJour.length > 0) {
    actionsUrgentes.push({
      label: `${tachesDuJour.length} tâche${tachesDuJour.length > 1 ? "s" : ""} du jour en attente`,
      detail: tachesDuJour.slice(0, 3).map((t) => t.texte).join(" · "),
      urgence: "normale",
    });
  }

  // Navigation tabs
  const tabs: { key: MainTab; label: string; badge?: number }[] = [
    { key: "cockpit", label: "Cockpit" },
    { key: "crm", label: "CRM", badge: prospects.filter((p) => p.statut !== "gagne" && p.statut !== "perdu").length || undefined },
    { key: "offres", label: "Offres" },
    { key: "outils", label: "Outils IA" },
  ];

  return (
    <main className="internal-page">
      <SystemPageShell maxWidth={1200} padding="18px 18px 44px">

        {/* ── HEADER ── */}
        <header style={{ marginBottom: 12 }}>
          <BackLink label="Système" />
          <div style={{ alignItems: "flex-end", display: "flex", flexWrap: "wrap", gap: 10, justifyContent: "space-between", marginTop: 6 }}>
            <div>
              <p className="internal-kicker" style={{ marginBottom: 2 }}>Module opérationnel</p>
              <h1 className="internal-title" style={{ fontStyle: "italic", marginBottom: 0 }}>Freelance</h1>
            </div>
            {/* KPIs mini dans le header */}
            <div style={{ alignItems: "baseline", display: "flex", flexWrap: "wrap", gap: 18 }}>
              {[
                { label: "Objectif", value: sprint.objectif + " $", accent: false },
                { label: "Encaissé", value: sprint.revenusEncaisses + " $", accent: sprint.revenusEncaisses > 0 },
                { label: "Manque", value: kpis.manque + " $", accent: kpis.manque === 0 },
                { label: "Prévision", value: prevision + " $", accent: prevision > 0 },
              ].map((k) => (
                <div key={k.label} style={{ textAlign: "right" }}>
                  <p style={{ color: "var(--text-muted)", fontSize: 10, letterSpacing: "0.08em", margin: "0 0 1px", textTransform: "uppercase" }}>{k.label}</p>
                  <strong style={{ color: k.accent ? "#1D9E75" : "var(--text-soft)", fontFamily: "var(--font-serif)", fontSize: 19, lineHeight: 1 }}>{k.value}</strong>
                </div>
              ))}
            </div>
          </div>

          {/* Barre de progression objectif */}
          <div style={{ marginTop: 8 }}>
            <div style={{ background: "rgba(201,168,92,0.12)", borderRadius: 2, height: 3, overflow: "hidden" }}>
              <div style={{ background: pct >= 100 ? "#1D9E75" : "rgba(201,168,92,0.7)", borderRadius: 2, height: "100%", transition: "width 0.4s", width: pct + "%" }} />
            </div>
            <p style={{ color: "var(--text-muted)", fontSize: 10, margin: "3px 0 0" }}>{pct}% de l'objectif · {kpis.joursRestants}j restants</p>
          </div>
        </header>

        {/* ── NAVIGATION ONGLETS ── */}
        <div
          style={{
            borderBottom: "1px solid rgba(201,168,92,0.14)",
            display: "flex",
            gap: 0,
            marginBottom: 14,
            overflowX: "auto",
          }}
        >
          {tabs.map(({ key, label, badge }) => (
            <button
              key={key}
              onClick={() => setActiveTab(key)}
              style={{
                alignItems: "center",
                background: "none",
                border: "none",
                borderBottom: activeTab === key ? "2px solid var(--accent-gold)" : "2px solid transparent",
                color: activeTab === key ? "var(--accent-gold)" : "var(--text-soft)",
                cursor: "pointer",
                display: "flex",
                fontSize: 12.5,
                fontWeight: activeTab === key ? 600 : 400,
                gap: 6,
                letterSpacing: "0.03em",
                marginBottom: -1,
                padding: "7px 14px",
                whiteSpace: "nowrap",
              }}
              type="button"
            >
              {label}
              {badge !== undefined && badge > 0 ? (
                <span style={{ background: "rgba(201,168,92,0.2)", borderRadius: 99, color: "var(--accent-gold)", fontSize: 10, fontWeight: 700, padding: "1px 6px" }}>
                  {badge}
                </span>
              ) : null}
            </button>
          ))}
        </div>

        {/* ── COCKPIT ── */}
        {activeTab === "cockpit" ? (
          <>
            {/* KPIs détaillés */}
            <SystemPanel ariaLabel="KPIs sprint" compact>
              <div style={{ alignItems: "center", display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                <p className="label-meta" style={{ margin: 0 }}>Sprint actif · {kpis.joursRestants}j restants</p>
                <button style={btnSmall} type="button" onClick={() => setSprintEdit(!sprintEdit)}>
                  {sprintEdit ? "Fermer" : "Modifier"}
                </button>
              </div>
              <SystemGrid gap={6} min={90}>
                <CompactMetric label="Objectif" value={sprint.objectif + " $"} />
                <CompactMetric label="Encaissé" value={sprint.revenusEncaisses + " $"} />
                <CompactMetric label="En attente" value={sprint.revenusAttente + " $"} />
                <CompactMetric label="Manque" value={kpis.manque + " $"} />
                <CompactMetric label="Prospects" value={String(sprint.prospectsContactes)} />
                <CompactMetric label="Taux conv." value={kpis.taux + " %"} />
                <CompactMetric label="Clients" value={String(sprint.clientsObtenus)} />
                <CompactMetric label="Prévision" value={prevision + " $"} />
              </SystemGrid>
              {sprintEdit ? (
                <SprintEditPanel sprint={sprint} onUpdate={setSprint} onClose={() => setSprintEdit(false)} />
              ) : null}
            </SystemPanel>

            {/* Centre d'actions */}
            <SystemPanel ariaLabel="Centre d'actions" compact>
              <p className="label-meta" style={{ margin: "0 0 8px" }}>Centre d'actions — que faire maintenant ?</p>
              {actionsUrgentes.length > 0 ? (
                <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                  {actionsUrgentes.map((action, i) => (
                    <div
                      key={i}
                      style={{
                        alignItems: "center",
                        background: action.urgence === "haute" ? "rgba(201,168,92,0.08)" : "rgba(255,250,238,0.02)",
                        border: `1px solid ${action.urgence === "haute" ? "rgba(201,168,92,0.28)" : "rgba(201,168,92,0.10)"}`,
                        borderRadius: 7,
                        display: "flex",
                        gap: 10,
                        padding: "7px 10px",
                      }}
                    >
                      <span style={{ color: action.urgence === "haute" ? "var(--accent-gold)" : "var(--text-muted)", flexShrink: 0, fontSize: 11 }}>
                        {action.urgence === "haute" ? "⚡" : "→"}
                      </span>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <span style={{ color: "var(--text-main)", fontSize: 12.5, fontWeight: 500 }}>{action.label}</span>
                        {action.detail !== "" ? (
                          <span style={{ color: "var(--text-muted)", fontSize: 11, marginLeft: 7 }}>{action.detail}</span>
                        ) : null}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{ background: "rgba(29,158,117,0.08)", border: "1px solid rgba(29,158,117,0.25)", borderRadius: 8, padding: "10px 12px" }}>
                  <p style={{ color: "#1D9E75", fontSize: 13, margin: 0 }}>✓ Aucune action urgente — tu es à jour.</p>
                </div>
              )}
            </SystemPanel>

            {/* Relances + Tâches côte à côte */}
            <SystemGrid gap={10} min={300}>
              <SystemPanel ariaLabel="Relances" compact>
                <p className="label-meta" style={{ margin: "0 0 7px" }}>Relances automatiques</p>
                {relances.length > 0 ? (
                  <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                    {relances.slice(0, 6).map((p) => {
                      const st = STATUTS.find((s) => s.value === p.statut);
                      return (
                        <div key={p.id} style={{ alignItems: "center", background: "rgba(186,117,23,0.08)", border: "1px solid rgba(186,117,23,0.25)", borderRadius: 7, display: "flex", gap: 8, justifyContent: "space-between", padding: "5px 9px" }}>
                          <div style={{ minWidth: 0 }}>
                            <span style={{ color: "var(--text-main)", fontSize: 12.5, fontWeight: 500 }}>{p.nom}</span>
                            <span style={{ color: "var(--text-muted)", fontSize: 11, marginLeft: 6 }}>J+{p.jours}</span>
                            {p.montant > 0 ? <span style={{ color: "var(--text-muted)", fontSize: 11, marginLeft: 5 }}>{p.montant} $</span> : null}
                          </div>
                          <span style={{ background: (st ? st.color : "#888") + "22", borderRadius: 99, color: st ? st.color : "#888", flexShrink: 0, fontSize: 10, padding: "1px 7px" }}>
                            {st ? st.label : p.statut}
                          </span>
                        </div>
                      );
                    })}
                    {relances.length > 6 ? (
                      <p style={{ color: "var(--text-muted)", fontSize: 11, margin: 0 }}>+ {relances.length - 6} autre{relances.length - 6 > 1 ? "s" : ""} relance{relances.length - 6 > 1 ? "s" : ""}</p>
                    ) : null}
                  </div>
                ) : (
                  <p style={{ color: "var(--text-muted)", fontSize: 12, margin: 0 }}>Aucune relance due.</p>
                )}
              </SystemPanel>
              <SystemPanel ariaLabel="Tâches" compact>
                <TachesDuJourPanel
                  taches={taches}
                  nouvelleTache={nouvelleTache}
                  onNouvelleTache={setNouvelleTache}
                  onUpdate={setTaches}
                />
              </SystemPanel>
            </SystemGrid>
          </>
        ) : null}

        {/* ── CRM ── */}
        {activeTab === "crm" ? (
          <SystemPanel ariaLabel="CRM Prospects" compact>
            <CRMPanel prospects={prospects} onUpdate={setProspects} />
          </SystemPanel>
        ) : null}

        {/* ── OFFRES ── */}
        {activeTab === "offres" ? (
          <SystemGrid gap={12} min={380}>
            <SystemPanel ariaLabel="Bibliothèque d'offres" compact>
              <BibliothequeOffresPanel offres={offres} onUpdate={setOffres} />
            </SystemPanel>
            <SystemPanel ariaLabel="Calculateur" compact>
              <CalculateurPanel calc={calc} onUpdate={setCalc} />
            </SystemPanel>
          </SystemGrid>
        ) : null}

        {/* ── OUTILS IA ── */}
        {activeTab === "outils" ? (
          <>
            {/* Générateur ghostwriting */}
            <SystemPanel ariaLabel="Générateur ghostwriting" compact>
              <p className="label-meta" style={{ margin: "0 0 8px" }}>
                Générateur client — Complexité : <strong>{qa.complexite}</strong> · Prix suggéré : <strong>{qa.prix}</strong>
              </p>
              <div style={{ alignItems: "center", display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 7 }}>
                <button
                  className="btn-ghost"
                  type="button"
                  onClick={() => { setClientResponse("Voici ce que je te propose :\nUn texte narratif basé sur ton histoire.\n\nDélai : 3 jours\nPrix : " + qa.prix); setCrCopied(false); }}
                  style={{ fontSize: 12, marginLeft: "auto", padding: "4px 12px" }}
                >
                  Réponse client
                </button>
              </div>
              {clientResponse !== "" ? (
                <div style={{ background: "rgba(201,168,92,0.06)", borderRadius: 8, marginBottom: 8, padding: "7px 9px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                    <span style={{ color: "var(--text-muted)", fontSize: 11 }}>Réponse client</span>
                    <button className="soft-button" type="button" onClick={() => copier(clientResponse, setCrCopied)} style={{ fontSize: 11 }}>{crCopied ? "Copié" : "Copier"}</button>
                  </div>
                  <p style={{ color: "var(--text-soft)", fontSize: 12, lineHeight: 1.6, margin: 0, whiteSpace: "pre-wrap" }}>{clientResponse}</p>
                </div>
              ) : null}
              <label className="label-meta" htmlFor="client-text">Texte du client</label>
              <textarea
                className="textarea-atelier"
                id="client-text"
                value={form.clientText}
                onChange={(e) => setForm((c) => ({ ...c, clientText: e.target.value }))}
                placeholder="Colle ici le texte ou l'idée du client…"
                style={{ fontSize: 13, marginBottom: 8, minHeight: 72 }}
              />
              <div style={{ display: "grid", gap: 6, gridTemplateColumns: "repeat(3, 1fr)", marginBottom: 8 }}>
                {(["objectifs", "tons", "longueurs"] as OptionGroup[]).map((group) => (
                  <div key={group}>
                    <p className="label-meta" style={{ fontSize: 10, marginBottom: 4 }}>
                      {group === "objectifs" ? "Objectif" : group === "tons" ? "Ton" : "Longueur"}
                    </p>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
                      {options[group].map((value) => {
                        const on = form[group].includes(value);
                        return (
                          <button
                            key={value}
                            type="button"
                            onClick={() => toggleOpt(group, value)}
                            style={{ background: on ? "rgba(201,168,92,0.25)" : "rgba(201,168,92,0.06)", border: on ? "1px solid rgba(201,168,92,0.6)" : "1px solid rgba(201,168,92,0.18)", borderRadius: 99, color: on ? "var(--text-main)" : "var(--text-soft)", cursor: "pointer", fontSize: 10.5, fontWeight: on ? 600 : 400, padding: "3px 8px" }}
                          >
                            {value}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <button className="btn-primary" type="button" onClick={handleGenerate} disabled={isGenerating} style={{ flex: 1 }}>
                  {isGenerating ? "Génération…" : "Générer"}
                </button>
                {result !== "" ? <button className="btn-ghost" type="button" onClick={handleGenerate} disabled={isGenerating}>Régénérer</button> : null}
              </div>
              {generationError !== "" || result !== "" ? (
                <div style={{ background: "rgba(255,250,238,0.03)", border: "1px solid rgba(201,168,92,0.12)", borderRadius: 8, marginTop: 8, padding: "8px 10px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}>
                    <p className="label-meta" style={{ margin: 0 }}>Résultat</p>
                    {result !== "" ? <button className="soft-button" type="button" onClick={() => copier(result, setCopied)} style={{ fontSize: 11 }}>{copied ? "Copié" : "Copier"}</button> : null}
                  </div>
                  {generationError !== ""
                    ? <p style={{ color: "#9f3a38", fontSize: 13, lineHeight: 1.6, margin: 0 }}>{generationError}</p>
                    : <p style={{ color: "var(--text-soft)", fontSize: 13, lineHeight: 1.7, margin: 0, whiteSpace: "pre-wrap" }}>{result}</p>
                  }
                </div>
              ) : null}
            </SystemPanel>

            {/* Mode 500 */}
            <SystemPanel ariaLabel="Mode 500" compact>
              <Mode500Panel mode500={mode500} onUpdate={setMode500} />
            </SystemPanel>
          </>
        ) : null}

      </SystemPageShell>
    </main>
  );
}
