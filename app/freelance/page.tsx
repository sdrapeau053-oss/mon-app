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
  projet_en_cours?: string;
};
type SprintActif = { objectif: number; dateDebut: string; revenusEncaisses: number; revenusAttente: number; prospectsContactes: number; clientsObtenus: number; };
type OptionGroup = "objectifs" | "tons" | "longueurs";
type GhostwritingState = { clientText: string; objectifs: string[]; tons: string[]; longueurs: string[]; };
type CalcState = { offre: string; prix: number; taux: number; objectif: number; jours: number; };
type Mode500State = { objectif: number; jours: number; competences: string; tempsParJour: string; contexte: string; };
type PlanHistorique = { id: string; date: string; resume: string; contenu: string; };
type Offre = { id: string; nom: string; prix: number; description: string; canal: string; ventes: number; actif: boolean; };
type Tache = { id: string; texte: string; done: boolean; date: string; };
type StatutProposition = "brouillon" | "envoyee" | "acceptee" | "refusee" | "expiree";
type Proposition = {
  id: string;
  prospectId: string;
  nomClient: string;
  offre: string;
  montant: number;
  dateCreation: string;
  dateEnvoi?: string;
  dateExpiration?: string;
  statut: StatutProposition;
  notes?: string;
  version: number;
};
type CategorieRevenu = "ghostwriting" | "revision" | "biographie" | "seo" | "contenu_web" | "autre";
type Revenu = {
  id: string;
  projetId?: string;
  nomClient: string;
  description: string;
  montant: number;
  date: string;
  mois: string;           // "YYYY-MM" — calculé à la création
  categorie: CategorieRevenu;
};
type RevenuSousTab = "historique" | "par_client" | "par_categorie";
type CockpitSousTab = "vue" | "stats" | "objectifs";
type Objectifs = {
  objectifMensuelCA: number;
  objectifClientsMois: number;
  objectifContactsSemaine: number;
  objectifContactsMois: number;
};
type StatutProjet = "en_cours" | "en_pause" | "livre" | "facture" | "archive";
type Projet = {
  id: string;
  nom: string;
  clientId: string;
  nomClient: string;
  propositionId?: string;
  offre: string;
  montant: number;
  statut: StatutProjet;
  dateDebut: string;
  dateLivraison?: string;
  dateFacture?: string;
  description?: string;
  notes?: string;
  livrable?: string;
};
type MainTab = "cockpit" | "crm" | "pipeline" | "projets" | "revenus" | "offres" | "outils";
type OutilsSousTab = "ghostwriting" | "mode500" | "messages";
type CanalMessage = "linkedin" | "email" | "facebook" | "autre";
type TypeMessage = "premier_contact" | "relance" | "suivi_devis" | "remerciement" | "client_recurrent" | "autre";
type MessageTemplate = {
  id: string;
  titre: string;
  canal: CanalMessage;
  type: TypeMessage;
  contenu: string;
  dateCreation: string;
  derniereModification: string;
};

// ── Clés localStorage ────────────────────────────────────────────────────────

const FL_SPRINT = "strate_fl_sprint";
const FL_PROSPECTS = "strate_fl_prospects";
const FL_CALC = "strate_fl_calc";
const FL_MODE500 = "strate_fl_mode500";
const FL_HISTORY = "freelance-mode-500-history";
const FL_OFFERS = "strate_fl_offers";
const FL_TACHES = "strate_fl_taches";
const FL_PROPOSITIONS = "freelance-propositions";
const FL_PROJETS = "freelance-projets";
const FL_REVENUS = "freelance-revenus";
const FL_OBJECTIFS = "strate_fl_objectifs";
const FL_MESSAGES = "strate_fl_messages";
const STORAGE_KEY = "freelance-ghostwriting-last-input";

// ── Defaults ─────────────────────────────────────────────────────────────────

const defaultSprint: SprintActif = { objectif: 500, dateDebut: new Date().toISOString().split("T")[0], revenusEncaisses: 0, revenusAttente: 0, prospectsContactes: 0, clientsObtenus: 0 };
const defaultState: GhostwritingState = { clientText: "", objectifs: [], tons: [], longueurs: [] };
const defaultCalc: CalcState = { offre: "", prix: 150, taux: 10, objectif: 500, jours: 5 };
const defaultMode500: Mode500State = { objectif: 500, jours: 5, competences: "", tempsParJour: "", contexte: "" };
const defaultOffre: Omit<Offre, "id"> = { nom: "", prix: 0, description: "", canal: "", ventes: 0, actif: true };
const defaultObjectifs: Objectifs = { objectifMensuelCA: 0, objectifClientsMois: 2, objectifContactsSemaine: 5, objectifContactsMois: 20 };

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
    const valeur = p.valeur_estimee || p.montant || 0;
    if (p.statut === "devis_envoye") return total + valeur;
    if (p.statut === "en_discussion") return total + Math.round(valeur * 0.4);
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
        { key: "objectif" as keyof SprintActif, label: "Objectif sprint ($)" },
        { key: "revenusAttente" as keyof SprintActif, label: "En attente ($) — non encore reçu" },
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
    // CP1: ne PAS écraser date_dernier_contact automatiquement
    // L'utilisateur doit cliquer "Marquer comme contacté" pour mettre à jour cette date
    onUpdate(ef);
    onClose();
  }

  function marquerContacte() {
    const today = new Date().toISOString().split("T")[0];
    setEf((prev) => ({ ...prev, date_dernier_contact: today }));
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
        <div style={{ gridColumn: "1 / -1" }}>
          <p className="label-meta" style={{ fontSize: 10, marginBottom: 2 }}>Projet en cours (si client gagné)</p>
          <input type="text" value={ef.projet_en_cours || ""} onChange={(e) => f("projet_en_cours", e.target.value)} placeholder="ex: Biographie chapitre 3, révision manuscrit…" style={inputStyle} />
        </div>
        <div>
          <p className="label-meta" style={{ fontSize: 10, marginBottom: 2 }}>Valeur estimée ($)</p>
          <input type="number" min={0} value={ef.valeur_estimee ?? ef.montant ?? 0} onChange={(e) => f("valeur_estimee", Number(e.target.value))} style={inputStyle} />
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

      {/* CP1 — Dernier contact explicite */}
      <div style={{ alignItems: "center", display: "flex", gap: 8, marginBottom: 8 }}>
        <button
          type="button"
          onClick={marquerContacte}
          style={{ background: "rgba(29,158,117,0.08)", border: "1px solid rgba(29,158,117,0.30)", borderRadius: 5, color: "#1D9E75", cursor: "pointer", fontSize: 11, padding: "3px 10px" }}
        >
          ✓ Marquer comme contacté aujourd'hui
        </button>
        {ef.date_dernier_contact ? (
          <span style={{ color: "var(--text-muted)", fontSize: 10 }}>Dernier contact : {ef.date_dernier_contact}</span>
        ) : null}
      </div>
      <div style={{ display: "flex", gap: 6 }}>
        <button className="btn-primary" type="button" onClick={sauvegarder} style={{ flex: 1, fontSize: 12, padding: "5px" }}>Sauvegarder</button>
        <button type="button" onClick={onClose} style={{ ...btnSmall, padding: "5px 12px" }}>Annuler</button>
      </div>
    </div>
  );
}

type CrmSousTab = "prospects" | "clients" | "propositions";

function ClientsPanel({ clients, onUpdate }: { clients: Prospect[]; onUpdate: (updated: Prospect) => void }) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const nonEncaisses = clients.filter((c) => !c.encaisse);
  const encaisses = clients.filter((c) => c.encaisse);
  const totalNonEncaisse = nonEncaisses.reduce((acc, c) => acc + (c.valeur_estimee || c.montant || 0), 0);
  const totalEncaisse = encaisses.reduce((acc, c) => acc + (c.valeur_estimee || c.montant || 0), 0);

  if (clients.length === 0) {
    return (
      <div style={{ padding: "16px 0" }}>
        <p style={{ color: "var(--text-muted)", fontSize: 12, margin: 0, textAlign: "center" }}>
          Aucun client encore. Marque un prospect comme "Gagné" dans le CRM pour le voir apparaître ici.
        </p>
      </div>
    );
  }

  return (
    <div>
      {/* Résumé compact */}
      <div style={{ display: "flex", gap: 12, marginBottom: 10, flexWrap: "wrap" }}>
        <div style={{ background: "rgba(29,158,117,0.08)", border: "1px solid rgba(29,158,117,0.20)", borderRadius: 7, padding: "6px 12px" }}>
          <p style={{ color: "var(--text-muted)", fontSize: 10, margin: "0 0 1px", textTransform: "uppercase", letterSpacing: "0.07em" }}>À encaisser</p>
          <strong style={{ color: "#1D9E75", fontSize: 16 }}>{totalNonEncaisse > 0 ? totalNonEncaisse + " $" : nonEncaisses.length + " client" + (nonEncaisses.length > 1 ? "s" : "")}</strong>
        </div>
        {totalEncaisse > 0 ? (
          <div style={{ background: "rgba(255,250,238,0.03)", border: "1px solid rgba(201,168,92,0.12)", borderRadius: 7, padding: "6px 12px" }}>
            <p style={{ color: "var(--text-muted)", fontSize: 10, margin: "0 0 1px", textTransform: "uppercase", letterSpacing: "0.07em" }}>Encaissé</p>
            <strong style={{ color: "var(--text-soft)", fontSize: 16 }}>{totalEncaisse} $</strong>
          </div>
        ) : null}
      </div>

      {/* Liste clients */}
      <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
        {clients
          .sort((a, b) => Number(a.encaisse) - Number(b.encaisse))
          .map((c) => {
            const valeur = c.valeur_estimee || c.montant || 0;
            const isExpanded = expandedId === c.id;

            return (
              <div key={c.id}>
                {/* Ligne compacte */}
                <div
                  style={{
                    alignItems: "center",
                    background: c.encaisse ? "rgba(255,255,255,0.01)" : "rgba(29,158,117,0.05)",
                    border: "1px solid " + (c.encaisse ? "rgba(201,168,92,0.08)" : "rgba(29,158,117,0.20)"),
                    borderRadius: isExpanded ? "7px 7px 0 0" : 7,
                    cursor: "pointer",
                    display: "flex",
                    gap: 8,
                    justifyContent: "space-between",
                    opacity: c.encaisse ? 0.7 : 1,
                    padding: "6px 9px",
                  }}
                  onClick={() => setExpandedId(isExpanded ? null : c.id)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") setExpandedId(isExpanded ? null : c.id); }}
                  aria-expanded={isExpanded}
                >
                  <div style={{ alignItems: "center", display: "flex", gap: 8, flex: 1, minWidth: 0 }}>
                    <span style={{ color: "var(--text-muted)", fontSize: 10, flexShrink: 0 }}>{isExpanded ? "▾" : "▸"}</span>
                    <span style={{ color: "var(--text-main)", fontSize: 13, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{c.nom}</span>
                    {valeur > 0 ? <span style={{ color: "#1D9E75", fontSize: 12, fontWeight: 600, flexShrink: 0 }}>{valeur} $</span> : null}
                    {c.projet_en_cours !== undefined && c.projet_en_cours !== "" ? (
                      <span style={{ color: "var(--text-muted)", fontSize: 11, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{c.projet_en_cours}</span>
                    ) : null}
                  </div>
                  <div style={{ alignItems: "center", display: "flex", gap: 6, flexShrink: 0 }} onClick={(e) => e.stopPropagation()}>
                    <span style={{ fontSize: 10, color: c.encaisse ? "var(--text-muted)" : "#1D9E75" }}>
                      {c.encaisse ? "Encaissé" : "À encaisser"}
                    </span>
                    <button
                      type="button"
                      onClick={() => onUpdate({ ...c, encaisse: !c.encaisse })}
                      style={{
                        background: c.encaisse ? "transparent" : "rgba(29,158,117,0.12)",
                        border: "1px solid " + (c.encaisse ? "rgba(201,168,92,0.20)" : "rgba(29,158,117,0.40)"),
                        borderRadius: 5,
                        color: c.encaisse ? "var(--text-muted)" : "#1D9E75",
                        cursor: "pointer",
                        fontSize: 10,
                        padding: "2px 8px",
                      }}
                    >
                      {c.encaisse ? "Annuler" : "✓ Encaisser"}
                    </button>
                  </div>
                </div>

                {/* Accordéon détails client */}
                {isExpanded ? (
                  <div style={{ border: "1px solid rgba(201,168,92,0.15)", borderTop: "none", borderRadius: "0 0 7px 7px", padding: "8px 10px" }}>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6, marginBottom: 6 }}>
                      <div>
                        <p className="label-meta" style={{ fontSize: 10, marginBottom: 2 }}>Projet en cours</p>
                        <input
                          type="text"
                          value={c.projet_en_cours || ""}
                          onChange={(e) => onUpdate({ ...c, projet_en_cours: e.target.value })}
                          placeholder="ex: Manuscrit chapitre 3…"
                          style={inputStyle}
                        />
                      </div>
                      <div>
                        <p className="label-meta" style={{ fontSize: 10, marginBottom: 2 }}>Valeur ($)</p>
                        <input
                          type="number"
                          min={0}
                          value={c.valeur_estimee || c.montant || 0}
                          onChange={(e) => onUpdate({ ...c, valeur_estimee: Number(e.target.value) })}
                          style={inputStyle}
                        />
                      </div>
                      <div style={{ gridColumn: "1 / -1" }}>
                        <p className="label-meta" style={{ fontSize: 10, marginBottom: 2 }}>Notes</p>
                        <textarea
                          value={c.notes || ""}
                          onChange={(e) => onUpdate({ ...c, notes: e.target.value })}
                          placeholder="Historique, besoins, contexte…"
                          style={{ ...inputStyle, minHeight: 48, resize: "vertical" }}
                        />
                      </div>
                    </div>
                    {c.email !== undefined && c.email !== "" ? <p style={{ color: "var(--text-muted)", fontSize: 11, margin: "0 0 2px" }}>✉ {c.email}</p> : null}
                    {c.telephone !== undefined && c.telephone !== "" ? <p style={{ color: "var(--text-muted)", fontSize: 11, margin: "0 0 2px" }}>📞 {c.telephone}</p> : null}
                    {c.linkedin !== undefined && c.linkedin !== "" ? <p style={{ color: "var(--text-muted)", fontSize: 11, margin: 0 }}>🔗 {c.linkedin}</p> : null}
                  </div>
                ) : null}
              </div>
            );
          })}
      </div>
    </div>
  );
}

const STATUTS_PROP: { value: StatutProposition; label: string; color: string }[] = [
  { value: "brouillon",  label: "Brouillon",  color: "#888780" },
  { value: "envoyee",    label: "Envoyée",    color: "#3B8BD4" },
  { value: "acceptee",   label: "Acceptée",   color: "#1D9E75" },
  { value: "refusee",    label: "Refusée",    color: "#D85A30" },
  { value: "expiree",    label: "Expirée",    color: "#BA7517" },
];

const GROUPES_PROP: { key: StatutProposition[]; label: string }[] = [
  { key: ["brouillon"],          label: "Brouillons" },
  { key: ["envoyee"],            label: "Envoyées" },
  { key: ["acceptee"],           label: "Acceptées" },
  { key: ["refusee", "expiree"], label: "Refusées / Expirées" },
];

const defaultProp: Omit<Proposition, "id" | "dateCreation"> = {
  prospectId: "",
  nomClient: "",
  offre: "",
  montant: 0,
  statut: "brouillon",
  version: 1,
};

function PropositionsPanel({ propositions, prospects, onUpdate }: {
  propositions: Proposition[];
  prospects: Prospect[];
  onUpdate: (p: Proposition[]) => void;
}) {
  const [ajoutOpen, setAjoutOpen] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [form, setForm] = useState<Omit<Proposition, "id" | "dateCreation">>(defaultProp);

  const today = new Date().toISOString().split("T")[0];

  // Liste combinée prospects + clients pour l'autocomplétion
  const tousLeNoms = prospects.map((p) => ({ id: p.id, nom: p.nom }));

  function ajouter() {
    if (form.nomClient.trim() === "" || form.offre.trim() === "") return;
    const prospect = prospects.find((p) => p.nom.toLowerCase() === form.nomClient.toLowerCase());
    const nouvelle: Proposition = {
      id: genId(),
      dateCreation: today,
      ...form,
      prospectId: prospect ? prospect.id : "",
      version: form.version < 1 ? 1 : form.version,
    };
    onUpdate([nouvelle, ...propositions]);
    setForm(defaultProp);
    setAjoutOpen(false);
  }

  function modifier(id: string, champs: Partial<Proposition>) {
    onUpdate(propositions.map((p) => p.id === id ? { ...p, ...champs } : p));
  }

  function supprimer(id: string) {
    onUpdate(propositions.filter((p) => p.id !== id));
    if (expandedId === id) setExpandedId(null);
  }

  // KPIs globaux
  const montantAccepte = propositions.filter((p) => p.statut === "acceptee").reduce((acc, p) => acc + p.montant, 0);
  const montantEnAttente = propositions.filter((p) => p.statut === "envoyee").reduce((acc, p) => acc + p.montant, 0);

  return (
    <div>
      {/* KPIs compacts */}
      {propositions.length > 0 ? (
        <div style={{ display: "flex", gap: 8, marginBottom: 10, flexWrap: "wrap" }}>
          {montantAccepte > 0 ? (
            <div style={{ background: "rgba(29,158,117,0.08)", border: "1px solid rgba(29,158,117,0.20)", borderRadius: 7, padding: "5px 10px" }}>
              <p style={{ color: "var(--text-muted)", fontSize: 10, margin: "0 0 1px", textTransform: "uppercase" }}>Accepté</p>
              <strong style={{ color: "#1D9E75", fontSize: 15 }}>{montantAccepte} $</strong>
            </div>
          ) : null}
          {montantEnAttente > 0 ? (
            <div style={{ background: "rgba(59,139,212,0.08)", border: "1px solid rgba(59,139,212,0.20)", borderRadius: 7, padding: "5px 10px" }}>
              <p style={{ color: "var(--text-muted)", fontSize: 10, margin: "0 0 1px", textTransform: "uppercase" }}>En attente</p>
              <strong style={{ color: "#3B8BD4", fontSize: 15 }}>{montantEnAttente} $</strong>
            </div>
          ) : null}
          <div style={{ background: "rgba(255,250,238,0.03)", border: "1px solid rgba(201,168,92,0.12)", borderRadius: 7, padding: "5px 10px" }}>
            <p style={{ color: "var(--text-muted)", fontSize: 10, margin: "0 0 1px", textTransform: "uppercase" }}>Total</p>
            <strong style={{ color: "var(--text-soft)", fontSize: 15 }}>{propositions.length}</strong>
          </div>
        </div>
      ) : null}

      {/* Bouton ajout */}
      <div style={{ alignItems: "center", display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
        <p className="label-meta" style={{ margin: 0 }}>
          {propositions.length === 0 ? "Aucune proposition" : propositions.length + " proposition" + (propositions.length > 1 ? "s" : "")}
        </p>
        <button type="button" style={btnSmall} onClick={() => setAjoutOpen(!ajoutOpen)}>
          {ajoutOpen ? "Annuler" : "+ Nouvelle"}
        </button>
      </div>

      {/* Formulaire ajout */}
      {ajoutOpen ? (
        <div style={{ background: "rgba(201,168,92,0.05)", border: "1px solid rgba(201,168,92,0.18)", borderRadius: 8, display: "grid", gap: 6, marginBottom: 10, padding: "10px 12px" }}>
          <p className="label-meta" style={{ fontSize: 10, margin: 0 }}>Nouvelle proposition</p>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
            <div style={{ gridColumn: "1 / -1" }}>
              <p className="label-meta" style={{ fontSize: 10, marginBottom: 2 }}>Client / Prospect *</p>
              <input
                type="text"
                list="noms-prospects"
                placeholder="Nom du client…"
                value={form.nomClient}
                onChange={(e) => {
                  const val = e.target.value;
                  const match = prospects.find((p) => p.nom.toLowerCase() === val.toLowerCase());
                  setForm((f) => ({ ...f, nomClient: val, prospectId: match ? match.id : "" }));
                }}
                style={inputStyle}
              />
              <datalist id="noms-prospects">
                {tousLeNoms.map((n) => <option key={n.id} value={n.nom} />)}
              </datalist>
            </div>
            <div style={{ gridColumn: "1 / -1" }}>
              <p className="label-meta" style={{ fontSize: 10, marginBottom: 2 }}>Offre / service *</p>
              <input type="text" placeholder="ex: Révision manuscrit, biographie…" value={form.offre} onChange={(e) => setForm((f) => ({ ...f, offre: e.target.value }))} style={inputStyle} />
            </div>
            <div>
              <p className="label-meta" style={{ fontSize: 10, marginBottom: 2 }}>Montant ($)</p>
              <input type="number" min={0} value={form.montant} onChange={(e) => setForm((f) => ({ ...f, montant: Number(e.target.value) }))} style={inputStyle} />
            </div>
            <div>
              <p className="label-meta" style={{ fontSize: 10, marginBottom: 2 }}>Version</p>
              <input type="number" min={1} max={99} value={form.version} onChange={(e) => setForm((f) => ({ ...f, version: Math.max(1, Number(e.target.value)) }))} style={inputStyle} />
            </div>
            <div>
              <p className="label-meta" style={{ fontSize: 10, marginBottom: 2 }}>Date d'envoi</p>
              <input type="date" value={form.dateEnvoi || ""} onChange={(e) => setForm((f) => ({ ...f, dateEnvoi: e.target.value, statut: e.target.value ? "envoyee" : f.statut }))} style={inputStyle} />
            </div>
            <div>
              <p className="label-meta" style={{ fontSize: 10, marginBottom: 2 }}>Date d'expiration</p>
              <input type="date" value={form.dateExpiration || ""} onChange={(e) => setForm((f) => ({ ...f, dateExpiration: e.target.value }))} style={inputStyle} />
            </div>
            <div style={{ gridColumn: "1 / -1" }}>
              <p className="label-meta" style={{ fontSize: 10, marginBottom: 2 }}>Statut</p>
              <select value={form.statut} onChange={(e) => setForm((f) => ({ ...f, statut: e.target.value as StatutProposition }))} style={inputStyle}>
                {STATUTS_PROP.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
              </select>
            </div>
            <div style={{ gridColumn: "1 / -1" }}>
              <p className="label-meta" style={{ fontSize: 10, marginBottom: 2 }}>Notes</p>
              <textarea placeholder="Contexte, conditions, remarques…" value={form.notes || ""} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} style={{ ...inputStyle, minHeight: 48, resize: "vertical" }} />
            </div>
          </div>
          <button className="btn-primary" type="button" onClick={ajouter} style={{ fontSize: 12, padding: "5px" }}>
            Créer la proposition
          </button>
        </div>
      ) : null}

      {/* Liste groupée par statut */}
      {propositions.length > 0 ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {GROUPES_PROP.map((groupe) => {
            const items = propositions.filter((p) => groupe.key.includes(p.statut))
              .sort((a, b) => b.montant - a.montant);
            if (items.length === 0) return null;

            return (
              <div key={groupe.label}>
                <p className="label-meta" style={{ fontSize: 10, marginBottom: 5, textTransform: "uppercase", letterSpacing: "0.08em" }}>
                  {groupe.label} <span style={{ color: "var(--text-muted)" }}>({items.length})</span>
                </p>
                <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                  {items.map((prop) => {
                    const st = STATUTS_PROP.find((s) => s.value === prop.statut);
                    const isExpanded = expandedId === prop.id;
                    const expire = prop.dateExpiration !== undefined && prop.dateExpiration !== "" && prop.dateExpiration < today;

                    return (
                      <div key={prop.id}>
                        {/* Ligne compacte */}
                        <div
                          style={{
                            alignItems: "center",
                            background: prop.statut === "acceptee" ? "rgba(29,158,117,0.05)" : "rgba(255,250,238,0.02)",
                            border: "1px solid " + (prop.statut === "acceptee" ? "rgba(29,158,117,0.18)" : expire ? "rgba(186,117,23,0.25)" : "rgba(201,168,92,0.10)"),
                            borderRadius: isExpanded ? "7px 7px 0 0" : 7,
                            cursor: "pointer",
                            display: "flex",
                            gap: 8,
                            justifyContent: "space-between",
                            padding: "6px 9px",
                          }}
                          onClick={() => setExpandedId(isExpanded ? null : prop.id)}
                          role="button"
                          tabIndex={0}
                          onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") setExpandedId(isExpanded ? null : prop.id); }}
                          aria-expanded={isExpanded}
                        >
                          <div style={{ alignItems: "center", display: "flex", gap: 8, flex: 1, minWidth: 0 }}>
                            <span style={{ color: "var(--text-muted)", fontSize: 10, flexShrink: 0 }}>{isExpanded ? "▾" : "▸"}</span>
                            <span style={{ color: "var(--text-main)", fontSize: 12.5, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{prop.nomClient}</span>
                            <span style={{ color: "var(--text-soft)", fontSize: 12, flexShrink: 0 }}>{prop.offre}</span>
                            {prop.montant > 0 ? <span style={{ color: prop.statut === "acceptee" ? "#1D9E75" : "var(--text-muted)", fontSize: 12, fontWeight: 600, flexShrink: 0 }}>{prop.montant} $</span> : null}
                            <span style={{ fontSize: 9, color: "var(--text-muted)", flexShrink: 0 }}>V{prop.version}</span>
                          </div>
                          <div style={{ alignItems: "center", display: "flex", gap: 5, flexShrink: 0 }} onClick={(e) => e.stopPropagation()}>
                            {expire ? <span style={{ color: "#BA7517", fontSize: 10 }}>Expirée</span> : null}
                            <span style={{ background: (st?.color ?? "#888") + "22", borderRadius: 99, color: st?.color ?? "#888", fontSize: 10, padding: "1px 6px" }}>
                              {st?.label ?? prop.statut}
                            </span>
                            <select
                              value={prop.statut}
                              onChange={(e) => modifier(prop.id, { statut: e.target.value as StatutProposition })}
                              style={{ fontSize: 10, padding: "2px 4px", borderRadius: 4, border: "1px solid rgba(201,168,92,0.3)", background: "var(--bg-main)", color: "var(--text-main)" }}
                            >
                              {STATUTS_PROP.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
                            </select>
                            <button type="button" onClick={() => supprimer(prop.id)} style={{ fontSize: 10, padding: "2px 5px", borderRadius: 4, border: "1px solid rgba(201,168,92,0.2)", background: "transparent", color: "var(--text-muted)", cursor: "pointer" }}>×</button>
                          </div>
                        </div>

                        {/* Accordéon détail */}
                        {isExpanded ? (
                          <div style={{ border: "1px solid rgba(201,168,92,0.15)", borderTop: "none", borderRadius: "0 0 7px 7px", padding: "8px 10px" }}>
                            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6, marginBottom: 6 }}>
                              <div>
                                <p className="label-meta" style={{ fontSize: 10, marginBottom: 2 }}>Client / Prospect</p>
                                <input type="text" list="noms-prospects-edit" value={prop.nomClient} onChange={(e) => modifier(prop.id, { nomClient: e.target.value })} style={inputStyle} />
                                <datalist id="noms-prospects-edit">
                                  {tousLeNoms.map((n) => <option key={n.id} value={n.nom} />)}
                                </datalist>
                              </div>
                              <div>
                                <p className="label-meta" style={{ fontSize: 10, marginBottom: 2 }}>Offre / service</p>
                                <input type="text" value={prop.offre} onChange={(e) => modifier(prop.id, { offre: e.target.value })} style={inputStyle} />
                              </div>
                              <div>
                                <p className="label-meta" style={{ fontSize: 10, marginBottom: 2 }}>Montant ($)</p>
                                <input type="number" min={0} value={prop.montant} onChange={(e) => modifier(prop.id, { montant: Number(e.target.value) })} style={inputStyle} />
                              </div>
                              <div>
                                <p className="label-meta" style={{ fontSize: 10, marginBottom: 2 }}>Version</p>
                                <input type="number" min={1} value={prop.version} onChange={(e) => modifier(prop.id, { version: Math.max(1, Number(e.target.value)) })} style={inputStyle} />
                              </div>
                              <div>
                                <p className="label-meta" style={{ fontSize: 10, marginBottom: 2 }}>Date d'envoi</p>
                                <input type="date" value={prop.dateEnvoi || ""} onChange={(e) => modifier(prop.id, { dateEnvoi: e.target.value })} style={inputStyle} />
                              </div>
                              <div>
                                <p className="label-meta" style={{ fontSize: 10, marginBottom: 2 }}>Date d'expiration</p>
                                <input type="date" value={prop.dateExpiration || ""} onChange={(e) => modifier(prop.id, { dateExpiration: e.target.value })} style={inputStyle} />
                              </div>
                              <div style={{ gridColumn: "1 / -1" }}>
                                <p className="label-meta" style={{ fontSize: 10, marginBottom: 2 }}>Notes</p>
                                <textarea value={prop.notes || ""} onChange={(e) => modifier(prop.id, { notes: e.target.value })} placeholder="Conditions, contexte, remarques…" style={{ ...inputStyle, minHeight: 48, resize: "vertical" }} />
                              </div>
                            </div>
                            <p style={{ color: "var(--text-muted)", fontSize: 10, margin: 0 }}>
                              Créée le {prop.dateCreation}
                              {prop.dateEnvoi !== undefined && prop.dateEnvoi !== "" ? " · Envoyée le " + prop.dateEnvoi : ""}
                            </p>
                          </div>
                        ) : null}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <p style={{ color: "var(--text-muted)", fontSize: 12, margin: "8px 0 0" }}>
          Aucune proposition. Crée ta première proposition pour suivre tes devis.
        </p>
      )}
    </div>
  );
}

function CRMPanel({ prospects, onUpdate, propositions, onUpdatePropositions }: {
  prospects: Prospect[];
  onUpdate: (p: Prospect[]) => void;
  propositions: Proposition[];
  onUpdatePropositions: (p: Proposition[]) => void;
}) {
  const [sousTab, setSousTab] = useState<CrmSousTab>("prospects");
  const [ajoutOpen, setAjoutOpen] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [nv, setNv] = useState<Partial<Prospect>>({ statut: "a_contacter", montant: 0 });

  const clients = prospects.filter((p) => p.statut === "gagne");
  const prospectsActifs = prospects.filter((p) => p.statut !== "gagne");

  function ajouter() {
    if (nv.nom === undefined || nv.nom.trim() === "") return;
    const today = new Date().toISOString().split("T")[0];
    onUpdate([{
      id: genId(),
      nom: nv.nom,
      canal: nv.canal || "",
      offre: nv.offre || "",
      statut: nv.statut || "a_contacter",
      montant: 0,
      valeur_estimee: (nv.valeur_estimee as number | undefined) || 0,
      dateContact: today,
      date_dernier_contact: today,
      encaisse: false,
    }, ...prospects]);
    setNv({ statut: "a_contacter", montant: 0 });
    setAjoutOpen(false);
  }

  // Tri : actifs en tête, puis par date de contact desc
  const prospectsTries = [...prospectsActifs].sort((a, b) => {
    const actifA = a.statut !== "gagne" && a.statut !== "perdu" ? 0 : 1;
    const actifB = b.statut !== "gagne" && b.statut !== "perdu" ? 0 : 1;
    if (actifA !== actifB) return actifA - actifB;
    return new Date(b.dateContact).getTime() - new Date(a.dateContact).getTime();
  });

  return (
    <div>
      {/* Sous-onglets Prospects / Clients */}
      <div style={{ borderBottom: "1px solid rgba(201,168,92,0.12)", display: "flex", gap: 0, marginBottom: 10 }}>
        {([
          { key: "prospects" as CrmSousTab, label: "Prospects", count: prospectsActifs.filter((p) => p.statut !== "perdu").length },
          { key: "clients" as CrmSousTab, label: "Clients", count: clients.length },
          { key: "propositions" as CrmSousTab, label: "Propositions", count: propositions.filter((p) => p.statut === "brouillon" || p.statut === "envoyee").length },
        ]).map(({ key, label, count }) => (
          <button
            key={key}
            type="button"
            onClick={() => { setSousTab(key); setAjoutOpen(false); setExpandedId(null); }}
            style={{
              background: "none",
              border: "none",
              borderBottom: sousTab === key ? "2px solid rgba(201,168,92,0.7)" : "2px solid transparent",
              color: sousTab === key ? "var(--text-main)" : "var(--text-muted)",
              cursor: "pointer",
              fontSize: 12,
              fontWeight: sousTab === key ? 600 : 400,
              marginBottom: -1,
              padding: "4px 12px 6px",
            }}
          >
            {label}
            {count > 0 ? (
              <span style={{ background: "rgba(201,168,92,0.15)", borderRadius: 99, color: "var(--text-muted)", fontSize: 10, marginLeft: 5, padding: "1px 5px" }}>
                {count}
              </span>
            ) : null}
          </button>
        ))}
      </div>

      {/* Vue Clients */}
      {sousTab === "clients" ? (
        <ClientsPanel
          clients={clients}
          onUpdate={(updated) => onUpdate(prospects.map((p) => p.id === updated.id ? updated : p))}
        />
      ) : null}

      {/* Vue Propositions */}
      {sousTab === "propositions" ? (
        <PropositionsPanel
          propositions={propositions}
          prospects={prospects}
          onUpdate={onUpdatePropositions}
        />
      ) : null}

      {/* Vue Prospects */}
      {sousTab === "prospects" ? <>
      <div style={{ alignItems: "center", display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
        <p className="label-meta" style={{ margin: 0 }}>
          {prospectsActifs.filter((p) => p.statut !== "perdu").length} actif{prospectsActifs.filter((p) => p.statut !== "perdu").length > 1 ? "s" : ""}{prospectsActifs.filter((p) => p.statut === "perdu").length > 0 ? " · " + prospectsActifs.filter((p) => p.statut === "perdu").length + " perdu" + (prospectsActifs.filter((p) => p.statut === "perdu").length > 1 ? "s" : "") : ""}
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
            { k: "valeur_estimee", ph: "Valeur estimée ($)", t: "number" },
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
                    {(p.valeur_estimee || p.montant) > 0 ? <span style={{ fontSize: 11, color: "var(--text-muted)", flexShrink: 0 }}>{p.valeur_estimee || p.montant} $</span> : null}
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
      </> : null}
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

// ── Revenus ──────────────────────────────────────────────────────────────────

const CATEGORIES_REVENU: { value: CategorieRevenu; label: string }[] = [
  { value: "ghostwriting",  label: "Ghostwriting" },
  { value: "revision",      label: "Révision / correction" },
  { value: "biographie",    label: "Biographie" },
  { value: "seo",           label: "SEO / web" },
  { value: "contenu_web",   label: "Contenu web" },
  { value: "autre",         label: "Autre" },
];

function moisLabel(mois: string): string {
  const [an, m] = mois.split("-");
  const noms = ["Jan","Fév","Mar","Avr","Mai","Jun","Jul","Aoû","Sep","Oct","Nov","Déc"];
  return (noms[parseInt(m, 10) - 1] ?? m) + " " + an;
}

function RevenusPanel({ revenus, projets, onUpdate }: {
  revenus: Revenu[];
  projets: Projet[];
  onUpdate: (r: Revenu[]) => void;
}) {
  const [ajoutOpen, setAjoutOpen] = useState(false);
  const [sousTab, setSousTab] = useState<RevenuSousTab>("historique");
  const [form, setForm] = useState<Omit<Revenu, "id" | "mois">>({
    nomClient: "",
    description: "",
    montant: 0,
    date: new Date().toISOString().split("T")[0],
    categorie: "ghostwriting",
  });

  const moisActuel = new Date().toISOString().slice(0, 7); // "YYYY-MM"
  const anneeActuelle = moisActuel.slice(0, 4);

  function ajouter() {
    if (form.nomClient.trim() === "" || form.montant <= 0) return;
    const mois = form.date.slice(0, 7);
    onUpdate([{ id: genId(), mois, ...form }, ...revenus]);
    setForm((f) => ({ ...f, nomClient: "", description: "", montant: 0, projetId: undefined }));
    setAjoutOpen(false);
  }

  function supprimer(id: string) {
    onUpdate(revenus.filter((r) => r.id !== id));
  }

  // KPIs globaux
  const revenusMoisActuel = revenus.filter((r) => r.mois === moisActuel);
  const totalMois = revenusMoisActuel.reduce((acc, r) => acc + r.montant, 0);
  const totalAnnee = revenus.filter((r) => r.mois.startsWith(anneeActuelle)).reduce((acc, r) => acc + r.montant, 0);
  const nbMoisAvecRevenus = new Set(revenus.map((r) => r.mois)).size;

  // Regroupement par mois (historique)
  const parMois = revenus.reduce<Record<string, Revenu[]>>((acc, r) => {
    if (!acc[r.mois]) acc[r.mois] = [];
    acc[r.mois].push(r);
    return acc;
  }, {});
  const moisTries = Object.keys(parMois).sort((a, b) => b.localeCompare(a));

  // Regroupement par client
  const parClient = revenus.reduce<Record<string, { total: number; nb: number }>>((acc, r) => {
    if (!acc[r.nomClient]) acc[r.nomClient] = { total: 0, nb: 0 };
    acc[r.nomClient].total += r.montant;
    acc[r.nomClient].nb += 1;
    return acc;
  }, {});
  const clientsTries = Object.entries(parClient).sort((a, b) => b[1].total - a[1].total);

  // Regroupement par catégorie
  const parCat = revenus.reduce<Record<string, number>>((acc, r) => {
    acc[r.categorie] = (acc[r.categorie] ?? 0) + r.montant;
    return acc;
  }, {});
  const catTriees = Object.entries(parCat).sort((a, b) => b[1] - a[1]);
  const totalCat = Object.values(parCat).reduce((a, b) => a + b, 0);

  return (
    <div>
      {/* KPIs compacts */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 10 }}>
        <div style={{ background: "rgba(29,158,117,0.08)", border: "1px solid rgba(29,158,117,0.20)", borderRadius: 7, padding: "5px 12px" }}>
          <p style={{ color: "var(--text-muted)", fontSize: 10, margin: "0 0 1px", textTransform: "uppercase" }}>Ce mois</p>
          <strong style={{ color: "#1D9E75", fontSize: 16 }}>{totalMois > 0 ? totalMois + " $" : "0 $"}</strong>
        </div>
        <div style={{ background: "rgba(59,139,212,0.08)", border: "1px solid rgba(59,139,212,0.20)", borderRadius: 7, padding: "5px 12px" }}>
          <p style={{ color: "var(--text-muted)", fontSize: 10, margin: "0 0 1px", textTransform: "uppercase" }}>{anneeActuelle}</p>
          <strong style={{ color: "#3B8BD4", fontSize: 16 }}>{totalAnnee > 0 ? totalAnnee + " $" : "0 $"}</strong>
        </div>
        {nbMoisAvecRevenus > 1 ? (
          <div style={{ background: "rgba(255,250,238,0.03)", border: "1px solid rgba(201,168,92,0.12)", borderRadius: 7, padding: "5px 12px" }}>
            <p style={{ color: "var(--text-muted)", fontSize: 10, margin: "0 0 1px", textTransform: "uppercase" }}>Moy. mensuelle</p>
            <strong style={{ color: "var(--text-soft)", fontSize: 16 }}>{Math.round(totalAnnee / nbMoisAvecRevenus)} $</strong>
          </div>
        ) : null}
      </div>

      {/* En-tête + ajout */}
      <div style={{ alignItems: "center", display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
        <p className="label-meta" style={{ margin: 0 }}>
          {revenus.length === 0 ? "Aucun revenu enregistré" : revenus.length + " encaissement" + (revenus.length > 1 ? "s" : "")}
        </p>
        <button type="button" style={btnSmall} onClick={() => setAjoutOpen(!ajoutOpen)}>
          {ajoutOpen ? "Annuler" : "+ Ajouter"}
        </button>
      </div>

      {/* Formulaire ajout */}
      {ajoutOpen ? (
        <div style={{ background: "rgba(201,168,92,0.05)", border: "1px solid rgba(201,168,92,0.18)", borderRadius: 8, display: "grid", gap: 6, marginBottom: 10, padding: "10px 12px" }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
            <div>
              <p className="label-meta" style={{ fontSize: 10, marginBottom: 2 }}>Client *</p>
              <input type="text" placeholder="Nom du client" value={form.nomClient} onChange={(e) => setForm((f) => ({ ...f, nomClient: e.target.value }))} style={inputStyle} />
            </div>
            <div>
              <p className="label-meta" style={{ fontSize: 10, marginBottom: 2 }}>Montant ($) *</p>
              <input type="number" min={1} value={form.montant || ""} onChange={(e) => setForm((f) => ({ ...f, montant: Number(e.target.value) }))} style={inputStyle} />
            </div>
            <div style={{ gridColumn: "1 / -1" }}>
              <p className="label-meta" style={{ fontSize: 10, marginBottom: 2 }}>Description</p>
              <input type="text" placeholder="ex: Révision chapitre 1-3, Ghostwriting page LinkedIn…" value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} style={inputStyle} />
            </div>
            <div>
              <p className="label-meta" style={{ fontSize: 10, marginBottom: 2 }}>Date d'encaissement</p>
              <input type="date" value={form.date} onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))} style={inputStyle} />
            </div>
            <div>
              <p className="label-meta" style={{ fontSize: 10, marginBottom: 2 }}>Catégorie</p>
              <select value={form.categorie} onChange={(e) => setForm((f) => ({ ...f, categorie: e.target.value as CategorieRevenu }))} style={inputStyle}>
                {CATEGORIES_REVENU.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
              </select>
            </div>
            {projets.filter((p) => p.statut === "facture" || p.statut === "livre").length > 0 ? (
              <div style={{ gridColumn: "1 / -1" }}>
                <p className="label-meta" style={{ fontSize: 10, marginBottom: 2 }}>Projet lié (optionnel)</p>
                <select value={form.projetId || ""} onChange={(e) => setForm((f) => ({ ...f, projetId: e.target.value || undefined }))} style={inputStyle}>
                  <option value="">— Aucun —</option>
                  {projets.filter((p) => p.statut === "facture" || p.statut === "livre").map((p) => (
                    <option key={p.id} value={p.id}>{p.nomClient} · {p.nom} · {p.montant} $</option>
                  ))}
                </select>
              </div>
            ) : null}
          </div>
          <button className="btn-primary" type="button" onClick={ajouter} style={{ fontSize: 12, padding: "5px" }}>Enregistrer</button>
        </div>
      ) : null}

      {/* Sous-onglets de lecture */}
      {revenus.length > 0 ? (
        <>
          <div style={{ borderBottom: "1px solid rgba(201,168,92,0.12)", display: "flex", marginBottom: 10 }}>
            {([
              { key: "historique" as RevenuSousTab, label: "Historique" },
              { key: "par_client" as RevenuSousTab, label: "Par client" },
              { key: "par_categorie" as RevenuSousTab, label: "Par catégorie" },
            ]).map(({ key, label }) => (
              <button
                key={key}
                type="button"
                onClick={() => setSousTab(key)}
                style={{
                  background: "none",
                  border: "none",
                  borderBottom: sousTab === key ? "2px solid rgba(201,168,92,0.7)" : "2px solid transparent",
                  color: sousTab === key ? "var(--text-main)" : "var(--text-muted)",
                  cursor: "pointer",
                  fontSize: 12,
                  fontWeight: sousTab === key ? 600 : 400,
                  marginBottom: -1,
                  padding: "4px 12px 6px",
                }}
              >
                {label}
              </button>
            ))}
          </div>

          {/* Vue Historique — par mois */}
          {sousTab === "historique" ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {moisTries.map((mois) => {
                const items = parMois[mois].sort((a, b) => b.date.localeCompare(a.date));
                const totalM = items.reduce((acc, r) => acc + r.montant, 0);
                return (
                  <div key={mois}>
                    <div style={{ alignItems: "baseline", display: "flex", gap: 8, marginBottom: 5 }}>
                      <p className="label-meta" style={{ fontSize: 10, letterSpacing: "0.08em", margin: 0, textTransform: "uppercase" }}>{moisLabel(mois)}</p>
                      <strong style={{ color: mois === moisActuel ? "#1D9E75" : "var(--text-soft)", fontSize: 13 }}>{totalM} $</strong>
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
                      {items.map((r) => {
                        const cat = CATEGORIES_REVENU.find((c) => c.value === r.categorie);
                        return (
                          <div key={r.id} style={{ alignItems: "center", background: "rgba(255,250,238,0.02)", border: "1px solid rgba(201,168,92,0.09)", borderRadius: 6, display: "flex", gap: 8, justifyContent: "space-between", padding: "5px 8px" }}>
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <span style={{ color: "var(--text-main)", fontSize: 12, fontWeight: 600 }}>{r.nomClient}</span>
                              {r.description !== "" ? <span style={{ color: "var(--text-muted)", fontSize: 11, marginLeft: 6, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{r.description}</span> : null}
                              <span style={{ background: "rgba(201,168,92,0.10)", borderRadius: 99, color: "var(--text-muted)", fontSize: 9, marginLeft: 6, padding: "1px 5px" }}>{cat?.label ?? r.categorie}</span>
                            </div>
                            <div style={{ alignItems: "center", display: "flex", flexShrink: 0, gap: 8 }}>
                              <strong style={{ color: "#1D9E75", fontSize: 12 }}>{r.montant} $</strong>
                              <span style={{ color: "var(--text-muted)", fontSize: 10 }}>{r.date}</span>
                              <button type="button" onClick={() => supprimer(r.id)} style={{ background: "transparent", border: "1px solid rgba(201,168,92,0.15)", borderRadius: 4, color: "var(--text-muted)", cursor: "pointer", fontSize: 10, padding: "1px 5px" }}>×</button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : null}

          {/* Vue Par client */}
          {sousTab === "par_client" ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              {clientsTries.map(([nom, data]) => (
                <div key={nom} style={{ alignItems: "center", background: "rgba(255,250,238,0.02)", border: "1px solid rgba(201,168,92,0.09)", borderRadius: 7, display: "flex", gap: 10, justifyContent: "space-between", padding: "7px 10px" }}>
                  <div>
                    <span style={{ color: "var(--text-main)", fontSize: 13, fontWeight: 600 }}>{nom}</span>
                    <span style={{ color: "var(--text-muted)", fontSize: 11, marginLeft: 7 }}>{data.nb} encaissement{data.nb > 1 ? "s" : ""}</span>
                  </div>
                  <strong style={{ color: "#1D9E75", fontSize: 14 }}>{data.total} $</strong>
                </div>
              ))}
            </div>
          ) : null}

          {/* Vue Par catégorie */}
          {sousTab === "par_categorie" ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              {catTriees.map(([cat, total]) => {
                const label = CATEGORIES_REVENU.find((c) => c.value === cat)?.label ?? cat;
                const pct = totalCat > 0 ? Math.round((total / totalCat) * 100) : 0;
                return (
                  <div key={cat} style={{ background: "rgba(255,250,238,0.02)", border: "1px solid rgba(201,168,92,0.09)", borderRadius: 7, padding: "7px 10px" }}>
                    <div style={{ alignItems: "center", display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                      <span style={{ color: "var(--text-soft)", fontSize: 12, fontWeight: 500 }}>{label}</span>
                      <div style={{ alignItems: "baseline", display: "flex", gap: 8 }}>
                        <span style={{ color: "var(--text-muted)", fontSize: 11 }}>{pct}%</span>
                        <strong style={{ color: "#1D9E75", fontSize: 13 }}>{total} $</strong>
                      </div>
                    </div>
                    <div style={{ background: "rgba(201,168,92,0.10)", borderRadius: 2, height: 3, overflow: "hidden" }}>
                      <div style={{ background: "#1D9E75", borderRadius: 2, height: "100%", width: pct + "%" }} />
                    </div>
                  </div>
                );
              })}
            </div>
          ) : null}
        </>
      ) : (
        <p style={{ color: "var(--text-muted)", fontSize: 12, margin: "8px 0 0" }}>
          Aucun revenu enregistré. Ajoute ton premier encaissement.
        </p>
      )}
    </div>
  );
}

// ── Projets ──────────────────────────────────────────────────────────────────

const STATUTS_PROJET: { value: StatutProjet; label: string; color: string }[] = [
  { value: "en_cours",  label: "En cours",  color: "#3B8BD4" },
  { value: "en_pause",  label: "En pause",  color: "#BA7517" },
  { value: "livre",     label: "Livré",     color: "#7F77DD" },
  { value: "facture",   label: "Facturé",   color: "#1D9E75" },
  { value: "archive",   label: "Archivé",   color: "#888780" },
];

const GROUPES_PROJET: { key: StatutProjet[]; label: string; archivé?: boolean }[] = [
  { key: ["en_cours"],          label: "En cours" },
  { key: ["en_pause"],          label: "En pause" },
  { key: ["livre"],             label: "Livrés" },
  { key: ["facture"],           label: "Facturés" },
  { key: ["archive"],           label: "Archivés", archivé: true },
];

const defaultProjet: Omit<Projet, "id" | "dateDebut"> = {
  nom: "",
  clientId: "",
  nomClient: "",
  offre: "",
  montant: 0,
  statut: "en_cours",
};

function ProjetsPanel({ projets, clients, propositions, onUpdate }: {
  projets: Projet[];
  clients: Prospect[];         // statut === "gagne"
  propositions: Proposition[];
  onUpdate: (p: Projet[]) => void;
}) {
  const [ajoutOpen, setAjoutOpen] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [afficherArchives, setAfficherArchives] = useState(false);
  const [form, setForm] = useState<Omit<Projet, "id" | "dateDebut">>(defaultProjet);

  const today = new Date().toISOString().split("T")[0];

  // Propositions acceptées disponibles pour lien
  const propsAcceptees = propositions.filter((p) => p.statut === "acceptee");

  function ajouter() {
    if (form.nomClient.trim() === "" || form.nom.trim() === "") return;
    const client = clients.find((c) => c.nom.toLowerCase() === form.nomClient.toLowerCase());
    onUpdate([{
      id: genId(),
      dateDebut: today,
      ...form,
      clientId: client ? client.id : "",
    }, ...projets]);
    setForm(defaultProjet);
    setAjoutOpen(false);
  }

  function modifier(id: string, champs: Partial<Projet>) {
    onUpdate(projets.map((p) => p.id === id ? { ...p, ...champs } : p));
  }

  function supprimer(id: string) {
    onUpdate(projets.filter((p) => p.id !== id));
    if (expandedId === id) setExpandedId(null);
  }

  // KPIs
  const enCours = projets.filter((p) => p.statut === "en_cours");
  const montantEnCours = enCours.reduce((acc, p) => acc + p.montant, 0);
  const montantFacture = projets.filter((p) => p.statut === "facture").reduce((acc, p) => acc + p.montant, 0);
  const enRetard = enCours.filter((p) => p.dateLivraison !== undefined && p.dateLivraison !== "" && p.dateLivraison < today);

  const projetsVisibles = afficherArchives ? projets : projets.filter((p) => p.statut !== "archive");

  return (
    <div>
      {/* KPIs compacts */}
      {projets.length > 0 ? (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 10 }}>
          {enCours.length > 0 ? (
            <div style={{ background: "rgba(59,139,212,0.08)", border: "1px solid rgba(59,139,212,0.20)", borderRadius: 7, padding: "5px 10px" }}>
              <p style={{ color: "var(--text-muted)", fontSize: 10, margin: "0 0 1px", textTransform: "uppercase" }}>En cours</p>
              <strong style={{ color: "#3B8BD4", fontSize: 15 }}>{enCours.length}{montantEnCours > 0 ? " · " + montantEnCours + " $" : ""}</strong>
            </div>
          ) : null}
          {montantFacture > 0 ? (
            <div style={{ background: "rgba(29,158,117,0.08)", border: "1px solid rgba(29,158,117,0.20)", borderRadius: 7, padding: "5px 10px" }}>
              <p style={{ color: "var(--text-muted)", fontSize: 10, margin: "0 0 1px", textTransform: "uppercase" }}>Facturé</p>
              <strong style={{ color: "#1D9E75", fontSize: 15 }}>{montantFacture} $</strong>
            </div>
          ) : null}
          {enRetard.length > 0 ? (
            <div style={{ background: "rgba(216,90,48,0.08)", border: "1px solid rgba(216,90,48,0.25)", borderRadius: 7, padding: "5px 10px" }}>
              <p style={{ color: "var(--text-muted)", fontSize: 10, margin: "0 0 1px", textTransform: "uppercase" }}>En retard</p>
              <strong style={{ color: "#D85A30", fontSize: 15 }}>{enRetard.length}</strong>
            </div>
          ) : null}
        </div>
      ) : null}

      {/* En-tête + bouton ajout */}
      <div style={{ alignItems: "center", display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
        <p className="label-meta" style={{ margin: 0 }}>
          {projets.length === 0 ? "Aucun projet" : projetsVisibles.filter((p) => p.statut !== "archive").length + " projet" + (projetsVisibles.filter((p) => p.statut !== "archive").length > 1 ? "s" : "") + " actifs"}
        </p>
        <div style={{ display: "flex", gap: 6 }}>
          {projets.filter((p) => p.statut === "archive").length > 0 ? (
            <button type="button" style={btnSmall} onClick={() => setAfficherArchives(!afficherArchives)}>
              {afficherArchives ? "Masquer archivés" : "Voir archivés"}
            </button>
          ) : null}
          <button type="button" style={btnSmall} onClick={() => setAjoutOpen(!ajoutOpen)}>
            {ajoutOpen ? "Annuler" : "+ Nouveau"}
          </button>
        </div>
      </div>

      {/* Formulaire ajout */}
      {ajoutOpen ? (
        <div style={{ background: "rgba(201,168,92,0.05)", border: "1px solid rgba(201,168,92,0.18)", borderRadius: 8, display: "grid", gap: 6, marginBottom: 10, padding: "10px 12px" }}>
          <p className="label-meta" style={{ fontSize: 10, margin: 0 }}>Nouveau projet</p>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
            <div style={{ gridColumn: "1 / -1" }}>
              <p className="label-meta" style={{ fontSize: 10, marginBottom: 2 }}>Nom du projet *</p>
              <input type="text" placeholder="ex: Biographie Chapitre 1-3, Révision manuscrit…" value={form.nom} onChange={(e) => setForm((f) => ({ ...f, nom: e.target.value }))} style={inputStyle} />
            </div>
            <div>
              <p className="label-meta" style={{ fontSize: 10, marginBottom: 2 }}>Client *</p>
              <input
                type="text"
                list="clients-projets"
                placeholder="Nom du client gagné…"
                value={form.nomClient}
                onChange={(e) => {
                  const val = e.target.value;
                  const match = clients.find((c) => c.nom.toLowerCase() === val.toLowerCase());
                  setForm((f) => ({ ...f, nomClient: val, clientId: match ? match.id : "" }));
                }}
                style={inputStyle}
              />
              <datalist id="clients-projets">
                {clients.map((c) => <option key={c.id} value={c.nom} />)}
              </datalist>
            </div>
            <div>
              <p className="label-meta" style={{ fontSize: 10, marginBottom: 2 }}>Offre / type</p>
              <input type="text" placeholder="Révision, biographie…" value={form.offre} onChange={(e) => setForm((f) => ({ ...f, offre: e.target.value }))} style={inputStyle} />
            </div>
            <div>
              <p className="label-meta" style={{ fontSize: 10, marginBottom: 2 }}>Montant ($)</p>
              <input type="number" min={0} value={form.montant} onChange={(e) => setForm((f) => ({ ...f, montant: Number(e.target.value) }))} style={inputStyle} />
            </div>
            <div>
              <p className="label-meta" style={{ fontSize: 10, marginBottom: 2 }}>Date de livraison</p>
              <input type="date" value={form.dateLivraison || ""} onChange={(e) => setForm((f) => ({ ...f, dateLivraison: e.target.value }))} style={inputStyle} />
            </div>
            {propsAcceptees.length > 0 ? (
              <div>
                <p className="label-meta" style={{ fontSize: 10, marginBottom: 2 }}>Proposition liée</p>
                <select value={form.propositionId || ""} onChange={(e) => setForm((f) => ({ ...f, propositionId: e.target.value || undefined }))} style={inputStyle}>
                  <option value="">— Aucune —</option>
                  {propsAcceptees.map((p) => <option key={p.id} value={p.id}>{p.nomClient} · {p.offre} · {p.montant} $</option>)}
                </select>
              </div>
            ) : null}
            <div style={{ gridColumn: "1 / -1" }}>
              <p className="label-meta" style={{ fontSize: 10, marginBottom: 2 }}>Livrable attendu</p>
              <input type="text" placeholder="ex: 3 chapitres révisés, manuscrit complet…" value={form.livrable || ""} onChange={(e) => setForm((f) => ({ ...f, livrable: e.target.value }))} style={inputStyle} />
            </div>
            <div style={{ gridColumn: "1 / -1" }}>
              <p className="label-meta" style={{ fontSize: 10, marginBottom: 2 }}>Notes</p>
              <textarea placeholder="Contexte, attentes client, contraintes…" value={form.notes || ""} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} style={{ ...inputStyle, minHeight: 44, resize: "vertical" }} />
            </div>
          </div>
          <button className="btn-primary" type="button" onClick={ajouter} style={{ fontSize: 12, padding: "5px" }}>Créer le projet</button>
        </div>
      ) : null}

      {/* Liste groupée */}
      {projetsVisibles.length > 0 ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {GROUPES_PROJET.filter((g) => !g.archivé || afficherArchives).map((groupe) => {
            const items = projetsVisibles.filter((p) => groupe.key.includes(p.statut))
              .sort((a, b) => (a.dateLivraison ?? "9999") < (b.dateLivraison ?? "9999") ? -1 : 1);
            if (items.length === 0) return null;

            return (
              <div key={groupe.label}>
                <p className="label-meta" style={{ fontSize: 10, letterSpacing: "0.08em", margin: "0 0 5px", textTransform: "uppercase" }}>
                  {groupe.label} <span style={{ color: "var(--text-muted)" }}>({items.length})</span>
                </p>
                <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                  {items.map((projet) => {
                    const st = STATUTS_PROJET.find((s) => s.value === projet.statut);
                    const isExpanded = expandedId === projet.id;
                    const retard = projet.dateLivraison !== undefined && projet.dateLivraison !== "" && projet.dateLivraison < today && projet.statut === "en_cours";
                    const propLiee = projet.propositionId !== undefined ? propositions.find((p) => p.id === projet.propositionId) : undefined;

                    return (
                      <div key={projet.id}>
                        {/* Ligne compacte */}
                        <div
                          style={{
                            alignItems: "center",
                            background: retard ? "rgba(216,90,48,0.05)" : projet.statut === "en_cours" ? "rgba(59,139,212,0.04)" : "rgba(255,250,238,0.02)",
                            border: "1px solid " + (retard ? "rgba(216,90,48,0.25)" : projet.statut === "en_cours" ? "rgba(59,139,212,0.15)" : "rgba(201,168,92,0.09)"),
                            borderRadius: isExpanded ? "7px 7px 0 0" : 7,
                            cursor: "pointer",
                            display: "flex",
                            gap: 8,
                            justifyContent: "space-between",
                            padding: "6px 9px",
                          }}
                          onClick={() => setExpandedId(isExpanded ? null : projet.id)}
                          role="button"
                          tabIndex={0}
                          onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") setExpandedId(isExpanded ? null : projet.id); }}
                          aria-expanded={isExpanded}
                        >
                          <div style={{ alignItems: "center", display: "flex", flex: 1, gap: 7, minWidth: 0 }}>
                            <span style={{ color: "var(--text-muted)", flexShrink: 0, fontSize: 10 }}>{isExpanded ? "▾" : "▸"}</span>
                            <span style={{ color: retard ? "#D85A30" : "var(--text-main)", fontSize: 12.5, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{projet.nom}</span>
                            <span style={{ color: "var(--text-muted)", flexShrink: 0, fontSize: 11 }}>{projet.nomClient}</span>
                            {projet.montant > 0 ? <span style={{ color: projet.statut === "facture" ? "#1D9E75" : "var(--text-soft)", flexShrink: 0, fontSize: 11, fontWeight: 600 }}>{projet.montant} $</span> : null}
                            {projet.dateLivraison !== undefined && projet.dateLivraison !== "" ? (
                              <span style={{ color: retard ? "#D85A30" : "var(--text-muted)", flexShrink: 0, fontSize: 10 }}>
                                {retard ? "⚠ " : ""}Livraison {projet.dateLivraison}
                              </span>
                            ) : null}
                            {projet.livrable !== undefined && projet.livrable !== "" ? (
                              <span style={{ color: "var(--text-muted)", fontSize: 10, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>→ {projet.livrable}</span>
                            ) : null}
                          </div>
                          <div style={{ alignItems: "center", display: "flex", flexShrink: 0, gap: 5 }} onClick={(e) => e.stopPropagation()}>
                            <span style={{ background: (st?.color ?? "#888") + "22", borderRadius: 99, color: st?.color ?? "#888", fontSize: 10, padding: "1px 6px" }}>
                              {st?.label ?? projet.statut}
                            </span>
                            <select
                              value={projet.statut}
                              onChange={(e) => modifier(projet.id, { statut: e.target.value as StatutProjet })}
                              style={{ background: "var(--bg-main)", border: "1px solid rgba(201,168,92,0.3)", borderRadius: 4, color: "var(--text-main)", fontSize: 10, padding: "2px 4px" }}
                            >
                              {STATUTS_PROJET.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
                            </select>
                            <button type="button" onClick={() => supprimer(projet.id)} style={{ background: "transparent", border: "1px solid rgba(201,168,92,0.2)", borderRadius: 4, color: "var(--text-muted)", cursor: "pointer", fontSize: 10, padding: "2px 5px" }}>×</button>
                          </div>
                        </div>

                        {/* Accordéon détail */}
                        {isExpanded ? (
                          <div style={{ border: "1px solid rgba(201,168,92,0.15)", borderTop: "none", borderRadius: "0 0 7px 7px", padding: "8px 10px" }}>
                            <div style={{ display: "grid", gap: 6, gridTemplateColumns: "1fr 1fr", marginBottom: 6 }}>
                              <div>
                                <p className="label-meta" style={{ fontSize: 10, marginBottom: 2 }}>Nom du projet</p>
                                <input type="text" value={projet.nom} onChange={(e) => modifier(projet.id, { nom: e.target.value })} style={inputStyle} />
                              </div>
                              <div>
                                <p className="label-meta" style={{ fontSize: 10, marginBottom: 2 }}>Client</p>
                                <input type="text" list="clients-projets-edit" value={projet.nomClient} onChange={(e) => modifier(projet.id, { nomClient: e.target.value })} style={inputStyle} />
                                <datalist id="clients-projets-edit">
                                  {clients.map((c) => <option key={c.id} value={c.nom} />)}
                                </datalist>
                              </div>
                              <div>
                                <p className="label-meta" style={{ fontSize: 10, marginBottom: 2 }}>Offre / type</p>
                                <input type="text" value={projet.offre} onChange={(e) => modifier(projet.id, { offre: e.target.value })} style={inputStyle} />
                              </div>
                              <div>
                                <p className="label-meta" style={{ fontSize: 10, marginBottom: 2 }}>Montant ($)</p>
                                <input type="number" min={0} value={projet.montant} onChange={(e) => modifier(projet.id, { montant: Number(e.target.value) })} style={inputStyle} />
                              </div>
                              <div>
                                <p className="label-meta" style={{ fontSize: 10, marginBottom: 2 }}>Date de livraison</p>
                                <input type="date" value={projet.dateLivraison || ""} onChange={(e) => modifier(projet.id, { dateLivraison: e.target.value })} style={inputStyle} />
                              </div>
                              <div>
                                <p className="label-meta" style={{ fontSize: 10, marginBottom: 2 }}>Date de facturation</p>
                                <input type="date" value={projet.dateFacture || ""} onChange={(e) => modifier(projet.id, { dateFacture: e.target.value })} style={inputStyle} />
                              </div>
                              <div style={{ gridColumn: "1 / -1" }}>
                                <p className="label-meta" style={{ fontSize: 10, marginBottom: 2 }}>Livrable attendu</p>
                                <input type="text" value={projet.livrable || ""} onChange={(e) => modifier(projet.id, { livrable: e.target.value })} style={inputStyle} />
                              </div>
                              <div style={{ gridColumn: "1 / -1" }}>
                                <p className="label-meta" style={{ fontSize: 10, marginBottom: 2 }}>Notes</p>
                                <textarea value={projet.notes || ""} onChange={(e) => modifier(projet.id, { notes: e.target.value })} style={{ ...inputStyle, minHeight: 48, resize: "vertical" }} />
                              </div>
                            </div>
                            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                              <p style={{ color: "var(--text-muted)", fontSize: 10, margin: 0 }}>Débuté le {projet.dateDebut}</p>
                              {propLiee !== undefined ? (
                                <p style={{ color: "var(--text-muted)", fontSize: 10, margin: 0 }}>· Proposition : {propLiee.offre} {propLiee.montant > 0 ? "— " + propLiee.montant + " $" : ""}</p>
                              ) : null}
                            </div>
                          </div>
                        ) : null}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <p style={{ color: "var(--text-muted)", fontSize: 12, margin: "8px 0 0" }}>
          Aucun projet. Crée un projet depuis un client gagné.
        </p>
      )}
    </div>
  );
}

// ── Pipeline commercial ──────────────────────────────────────────────────────

const PIPELINE_COLONNES: { statut: StatutProspect; label: string; color: string }[] = [
  { statut: "a_contacter", label: "À contacter", color: "#888780" },
  { statut: "contacte", label: "Contacté", color: "#3B8BD4" },
  { statut: "en_discussion", label: "En discussion", color: "#BA7517" },
  { statut: "devis_envoye", label: "Devis envoyé", color: "#7F77DD" },
  { statut: "gagne", label: "Gagné", color: "#1D9E75" },
];

function PipelinePanel({ prospects, today, onUpdate }: { prospects: Prospect[]; today: string; onUpdate: (p: Prospect[]) => void }) {
  const [afficherPerdus, setAfficherPerdus] = useState(false);

  const liste = afficherPerdus ? prospects : prospects.filter((p) => p.statut !== "perdu");
  const perdus = prospects.filter((p) => p.statut === "perdu");

  // Score de tri interne : chaud+élevé en tête
  function score(p: Prospect) {
    const interet = p.niveau_interet === "chaud" ? 2 : p.niveau_interet === "tiède" ? 1 : 0;
    const pot = p.potentiel === "élevé" ? 2 : p.potentiel === "moyen" ? 1 : 0;
    return interet + pot;
  }

  return (
    <div>
      {/* En-tête pipeline */}
      <div style={{ alignItems: "center", display: "flex", justifyContent: "space-between", marginBottom: 10 }}>
        <p className="label-meta" style={{ margin: 0 }}>
          {liste.filter((p) => p.statut !== "perdu").length} prospect{liste.filter((p) => p.statut !== "perdu").length > 1 ? "s" : ""} actifs
          {perdus.length > 0 ? (
            <span style={{ color: "var(--text-muted)", fontSize: 11, marginLeft: 8 }}>
              · {perdus.length} perdu{perdus.length > 1 ? "s" : ""}
            </span>
          ) : null}
        </p>
        {perdus.length > 0 ? (
          <button type="button" onClick={() => setAfficherPerdus(!afficherPerdus)} style={{ ...btnSmall }}>
            {afficherPerdus ? "Masquer perdus" : "Afficher perdus"}
          </button>
        ) : null}
      </div>

      {/* Grille colonnes */}
      <div style={{ display: "flex", gap: 8, overflowX: "auto", paddingBottom: 6 }}>
        {PIPELINE_COLONNES.filter((col) => afficherPerdus || col.statut !== "perdu").map((col) => {
          const cartes = liste
            .filter((p) => p.statut === col.statut)
            .sort((a, b) => score(b) - score(a));
          const totalVal = cartes.reduce((acc, p) => acc + (p.valeur_estimee || p.montant || 0), 0);

          return (
            <div
              key={col.statut}
              style={{
                background: "rgba(255,250,238,0.02)",
                border: "1px solid rgba(201,168,92,0.10)",
                borderRadius: 8,
                display: "flex",
                flexDirection: "column",
                flexShrink: 0,
                gap: 6,
                minWidth: 170,
                padding: "8px 8px 10px",
                width: "calc(20% - 7px)",
              }}
            >
              {/* En-tête colonne */}
              <div style={{ alignItems: "center", display: "flex", gap: 6, marginBottom: 2 }}>
                <span style={{ background: col.color + "22", borderRadius: 99, color: col.color, fontSize: 10, fontWeight: 700, padding: "1px 7px" }}>
                  {col.label}
                </span>
                <span style={{ color: "var(--text-muted)", fontSize: 10, marginLeft: "auto" }}>
                  {cartes.length}
                </span>
              </div>
              {totalVal > 0 ? (
                <p style={{ color: col.color, fontSize: 11, fontWeight: 600, margin: "0 0 2px" }}>{totalVal} $</p>
              ) : null}

              {/* Cartes */}
              {cartes.length > 0 ? (
                cartes.map((p) => {
                  const retardRelance = p.date_prochaine_relance !== undefined && p.date_prochaine_relance !== ""
                    ? Math.floor((new Date(today).getTime() - new Date(p.date_prochaine_relance).getTime()) / 86400000)
                    : null;
                  const valeur = p.valeur_estimee || p.montant || 0;
                  const pot = POTENTIELS.find((x) => x.value === p.potentiel);
                  const interet = NIVEAUX_INTERET.find((x) => x.value === p.niveau_interet);

                  return (
                    <div
                      key={p.id}
                      style={{
                        background: "rgba(255,250,238,0.03)",
                        border: "1px solid rgba(201,168,92,0.12)",
                        borderRadius: 6,
                        padding: "7px 8px",
                      }}
                    >
                      <p style={{ color: "var(--text-main)", fontSize: 12, fontWeight: 600, margin: "0 0 3px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {p.nom}
                      </p>
                      {valeur > 0 ? (
                        <p style={{ color: "#1D9E75", fontSize: 11, fontWeight: 600, margin: "0 0 3px" }}>{valeur} $</p>
                      ) : null}
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 3, marginBottom: 3 }}>
                        {pot ? <span style={{ background: pot.color + "20", borderRadius: 99, color: pot.color, fontSize: 9, padding: "1px 5px" }}>{pot.label}</span> : null}
                        {interet ? <span style={{ background: interet.color + "20", borderRadius: 99, color: interet.color, fontSize: 9, padding: "1px 5px" }}>{interet.label}</span> : null}
                      </div>
                      {p.offre !== "" ? (
                        <p style={{ color: "var(--text-muted)", fontSize: 10, margin: "0 0 2px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{p.offre}</p>
                      ) : null}
                      {p.prochaine_action !== undefined && p.prochaine_action !== "" ? (
                        <p style={{ color: "var(--text-soft)", fontSize: 10, lineHeight: 1.3, margin: "2px 0 0", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          → {p.prochaine_action}
                        </p>
                      ) : null}
                      {retardRelance !== null && retardRelance >= 0 ? (
                        <p style={{ color: retardRelance >= 3 ? "#D85A30" : "#BA7517", fontSize: 10, margin: "3px 0 0" }}>
                          {retardRelance === 0 ? "Relance aujourd'hui" : "Relance J+" + retardRelance}
                        </p>
                      ) : null}
                      {/* CP5 — Select statut inline */}
                      <select
                        value={p.statut}
                        onClick={(e) => e.stopPropagation()}
                        onChange={(e) => onUpdate(prospects.map((pr) => pr.id === p.id ? { ...pr, statut: e.target.value as StatutProspect } : pr))}
                        style={{ background: "var(--bg-main)", border: "1px solid rgba(201,168,92,0.20)", borderRadius: 4, color: "var(--text-muted)", fontSize: 10, marginTop: 5, padding: "2px 3px", width: "100%" }}
                      >
                        {STATUTS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
                      </select>
                    </div>
                  );
                })
              ) : (
                <p style={{ color: "var(--text-muted)", fontSize: 11, margin: "4px 0 0" }}>—</p>
              )}
            </div>
          );
        })}

        {/* Colonne Perdus si visible */}
        {afficherPerdus ? (() => {
          const col = { statut: "perdu" as StatutProspect, label: "Perdu", color: "#D85A30" };
          const cartes = liste.filter((p) => p.statut === col.statut);
          return (
            <div
              style={{
                background: "rgba(216,90,48,0.02)",
                border: "1px solid rgba(216,90,48,0.10)",
                borderRadius: 8,
                display: "flex",
                flexDirection: "column",
                flexShrink: 0,
                gap: 6,
                minWidth: 170,
                opacity: 0.7,
                padding: "8px 8px 10px",
                width: "calc(20% - 7px)",
              }}
            >
              <div style={{ alignItems: "center", display: "flex", gap: 6, marginBottom: 2 }}>
                <span style={{ background: col.color + "22", borderRadius: 99, color: col.color, fontSize: 10, fontWeight: 700, padding: "1px 7px" }}>{col.label}</span>
                <span style={{ color: "var(--text-muted)", fontSize: 10, marginLeft: "auto" }}>{cartes.length}</span>
              </div>
              {cartes.map((p) => (
                <div key={p.id} style={{ background: "rgba(255,250,238,0.02)", border: "1px solid rgba(201,168,92,0.08)", borderRadius: 6, padding: "6px 8px" }}>
                  <p style={{ color: "var(--text-muted)", fontSize: 12, fontWeight: 600, margin: "0 0 2px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{p.nom}</p>
                  {p.offre !== "" ? <p style={{ color: "var(--text-muted)", fontSize: 10, margin: 0 }}>{p.offre}</p> : null}
                </div>
              ))}
              {cartes.length === 0 ? <p style={{ color: "var(--text-muted)", fontSize: 11, margin: "4px 0 0" }}>—</p> : null}
            </div>
          );
        })() : null}
      </div>

      {/* Totaux globaux */}
      {prospects.length > 0 ? (() => {
        const totalActifs = prospects.filter((p) => p.statut !== "perdu" && p.statut !== "gagne").reduce((acc, p) => acc + (p.valeur_estimee || p.montant || 0), 0);
        const totalGagne = prospects.filter((p) => p.statut === "gagne").reduce((acc, p) => acc + (p.valeur_estimee || p.montant || 0), 0);
        return (
          <div style={{ borderTop: "1px solid rgba(201,168,92,0.12)", display: "flex", gap: 18, marginTop: 10, paddingTop: 8 }}>
            {totalActifs > 0 ? <p style={{ color: "var(--text-soft)", fontSize: 12, margin: 0 }}>Pipeline actif : <strong style={{ color: "#BA7517" }}>{totalActifs} $</strong></p> : null}
            {totalGagne > 0 ? <p style={{ color: "var(--text-soft)", fontSize: 12, margin: 0 }}>Gagné : <strong style={{ color: "#1D9E75" }}>{totalGagne} $</strong></p> : null}
          </div>
        );
      })() : null}
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
  const [outilsSousTab, setOutilsSousTab] = useState<OutilsSousTab>("ghostwriting");
  const [cockpitSousTab, setCockpitSousTab] = useState<CockpitSousTab>("vue");
  const [objectifs, setObjectifs] = useState<Objectifs>(defaultObjectifs);
  const [objectifsEdit, setObjectifsEdit] = useState(false);
  const [messages, setMessages] = useState<MessageTemplate[]>([]);
  const [msgFiltreCanal, setMsgFiltreCanal] = useState<CanalMessage | "tous">("tous");
  const [msgFiltreType, setMsgFiltreType] = useState<TypeMessage | "tous">("tous");
  const [msgEditId, setMsgEditId] = useState<string | null>(null);
  const [msgForm, setMsgForm] = useState<Omit<MessageTemplate, "id" | "dateCreation" | "derniereModification">>({ titre: "", canal: "linkedin", type: "premier_contact", contenu: "" });
  const [msgAjout, setMsgAjout] = useState(false);
  const [msgCopied, setMsgCopied] = useState<string | null>(null);
  const [recherche, setRecherche] = useState("");
  const [prospects, setProspects] = useState<Prospect[]>([]);
  const [calc, setCalc] = useState<CalcState>(defaultCalc);
  const [mode500, setMode500] = useState<Mode500State>(defaultMode500);
  const [offres, setOffres] = useState<Offre[]>([]);
  const [propositions, setPropositions] = useState<Proposition[]>([]);
  const [projets, setProjets] = useState<Projet[]>([]);
  const [revenus, setRevenus] = useState<Revenu[]>([]);
  const [taches, setTaches] = useState<Tache[]>([]);
  const [nouvelleTache, setNouvelleTache] = useState("");

  const qa = analyserProjet(form.clientText);

  // Chargement initial
  useEffect(() => { setForm(lireSauvegarde()); }, []);
  useEffect(() => {
    setSprint(lireLS(FL_SPRINT, defaultSprint));
    // CP3 — Migration : valeur_estimee ← montant si valeur_estimee absente ou nulle
    const rawProspects = lireLS<Prospect[]>(FL_PROSPECTS, []);
    setProspects(rawProspects.map((p) =>
      (p.valeur_estimee === undefined || p.valeur_estimee === 0) && p.montant > 0
        ? { ...p, valeur_estimee: p.montant }
        : p
    ));
    setCalc(lireLS(FL_CALC, defaultCalc));
    setMode500(lireLS(FL_MODE500, defaultMode500));
    setOffres(lireLS<Offre[]>(FL_OFFERS, []));
    setPropositions(lireLS<Proposition[]>(FL_PROPOSITIONS, []));
    setProjets(lireLS<Projet[]>(FL_PROJETS, []));
    setRevenus(lireLS<Revenu[]>(FL_REVENUS, []));
    // CP8 — Purge tâches terminées de plus de 14 jours
    const rawTaches = lireLS<Tache[]>(FL_TACHES, []);
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - 14);
    const cutoffStr = cutoff.toISOString().split("T")[0];
    setTaches(rawTaches.filter((t) => !t.done || t.date >= cutoffStr));
    setObjectifs(lireLS<Objectifs>(FL_OBJECTIFS, defaultObjectifs));
    setMessages(lireLS<MessageTemplate[]>(FL_MESSAGES, []));
  }, []);

  // Persistance automatique
  useEffect(() => { localStorage.setItem(STORAGE_KEY, JSON.stringify(form)); }, [form]);
  useEffect(() => { ecrireLS(FL_SPRINT, sprint); }, [sprint]);
  useEffect(() => { ecrireLS(FL_PROSPECTS, prospects); }, [prospects]);
  useEffect(() => { ecrireLS(FL_CALC, calc); }, [calc]);
  useEffect(() => { ecrireLS(FL_MODE500, mode500); }, [mode500]);
  useEffect(() => { ecrireLS(FL_OFFERS, offres); }, [offres]);
  useEffect(() => { ecrireLS(FL_PROPOSITIONS, propositions); }, [propositions]);
  useEffect(() => { ecrireLS(FL_PROJETS, projets); }, [projets]);
  useEffect(() => { ecrireLS(FL_REVENUS, revenus); }, [revenus]);
  useEffect(() => { ecrireLS(FL_TACHES, taches); }, [taches]);
  useEffect(() => { ecrireLS(FL_OBJECTIFS, objectifs); }, [objectifs]);
  useEffect(() => { ecrireLS(FL_MESSAGES, messages); }, [messages]);

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
  // CP2 — Source de vérité unique : freelance-revenus pour les encaissements réels
  const moisEnCours = new Date().toISOString().slice(0, 7);
  const revenusMoisActuelReel = revenus
    .filter((r) => r.mois === moisEnCours)
    .reduce((acc, r) => acc + r.montant, 0);
  const totalRevenu = revenusMoisActuelReel + sprint.revenusAttente;
  const manqueReel = Math.max(0, sprint.objectif - totalRevenu);
  const pct = Math.min(100, sprint.objectif > 0 ? Math.round((totalRevenu / sprint.objectif) * 100) : 0);

  // ── Centre d'actions Phase 3 — logique explicite depuis les champs CRM ─────
  const today = new Date().toISOString().split("T")[0];

  type ActionItem = { label: string; detail: string; urgence: "critique" | "haute" | "normale"; valeur?: number };
  const actionsUrgentes: ActionItem[] = [];

  const actifs = prospects.filter((p) => p.statut !== "gagne" && p.statut !== "perdu");
  const clientsGagnes = prospects.filter((p) => p.statut === "gagne");
  const clientsNonEncaisses = clientsGagnes.filter((c) => !c.encaisse);

  // NIVEAU 1 — Relances explicites dépassées (date_prochaine_relance <= aujourd'hui)
  const relancesExplicites = actifs
    .filter((p) => p.date_prochaine_relance !== undefined && p.date_prochaine_relance !== "" && p.date_prochaine_relance <= today)
    .sort((a, b) => {
      // Tri : chaud > tiède > froid, puis élevé > moyen > faible, puis date asc
      const scoreInteret = (n?: NiveauInteret) => n === "chaud" ? 2 : n === "tiède" ? 1 : 0;
      const scorePot = (n?: PotentielProspect) => n === "élevé" ? 2 : n === "moyen" ? 1 : 0;
      const diff = (scoreInteret(b.niveau_interet) + scorePot(b.potentiel)) - (scoreInteret(a.niveau_interet) + scorePot(a.potentiel));
      if (diff !== 0) return diff;
      return (a.date_prochaine_relance ?? "").localeCompare(b.date_prochaine_relance ?? "");
    });

  for (const p of relancesExplicites) {
    const retard = Math.floor((new Date(today).getTime() - new Date(p.date_prochaine_relance!).getTime()) / 86400000);
    const valeur = p.valeur_estimee || p.montant || 0;
    const details: string[] = [];
    if (p.prochaine_action !== undefined && p.prochaine_action !== "") details.push(p.prochaine_action);
    if (valeur > 0) details.push(valeur + " $");
    if (p.niveau_interet !== undefined) details.push(p.niveau_interet);
    actionsUrgentes.push({
      label: "Relancer " + p.nom,
      detail: (retard === 0 ? "Aujourd'hui" : "J+" + retard + " de retard") + (details.length > 0 ? " · " + details.join(" · ") : ""),
      urgence: retard >= 3 ? "critique" : retard >= 1 ? "haute" : "normale",
      valeur,
    });
  }

  // NIVEAU 2 — Prospects chauds sans date de relance planifiée (opportunités en suspens)
  const chaudsSansPlan = actifs.filter(
    (p) => (p.niveau_interet === "chaud" || p.statut === "devis_envoye")
      && (p.date_prochaine_relance === undefined || p.date_prochaine_relance === "")
  );
  if (chaudsSansPlan.length > 0) {
    const valeurTotale = chaudsSansPlan.reduce((acc, p) => acc + (p.valeur_estimee || p.montant || 0), 0);
    actionsUrgentes.push({
      label: chaudsSansPlan.length === 1
        ? "Planifier relance : " + chaudsSansPlan[0].nom
        : chaudsSansPlan.length + " prospects chauds sans relance planifiée",
      detail: chaudsSansPlan.map((p) => p.nom).join(", ") + (valeurTotale > 0 ? " · " + valeurTotale + " $ potentiel" : ""),
      urgence: "haute",
      valeur: valeurTotale,
    });
  }

  // NIVEAU 3 — Prospects à potentiel élevé jamais contactés ou statut initial
  const potentielEleve = actifs.filter(
    (p) => p.potentiel === "élevé" && (p.statut === "a_contacter" || p.statut === "contacte")
  );
  if (potentielEleve.length > 0) {
    actionsUrgentes.push({
      label: potentielEleve.length === 1
        ? "Avancer avec " + potentielEleve[0].nom + " (potentiel élevé)"
        : potentielEleve.length + " prospects à potentiel élevé peu avancés",
      detail: potentielEleve.map((p) => p.nom + (p.offre !== "" ? " — " + p.offre : "")).join(", "),
      urgence: "normale",
    });
  }

  // NIVEAU 4 — Objectif sprint non commencé
  if (kpis.manque > 0 && actifs.length === 0) {
    actionsUrgentes.push({
      label: "Commencer à prospecter",
      detail: "Aucun prospect actif — il manque " + kpis.manque + " $ pour atteindre l'objectif sprint",
      urgence: "haute",
    });
  }

  // NIVEAU 5 — Tâches du jour non complétées
  const tachesDuJour = taches.filter((t) => t.date === today && !t.done);
  if (tachesDuJour.length > 0) {
    actionsUrgentes.push({
      label: tachesDuJour.length + " tâche" + (tachesDuJour.length > 1 ? "s" : "") + " du jour en attente",
      detail: tachesDuJour.slice(0, 3).map((t) => t.texte).join(" · "),
      urgence: "normale",
    });
  }

  // Navigation tabs
  const tabs: { key: MainTab; label: string; badge?: number }[] = [
    { key: "cockpit", label: "Cockpit" },
    { key: "crm", label: "CRM", badge: actifs.filter((p) => p.statut !== "gagne").length || undefined },
    { key: "pipeline", label: "Pipeline" },
    { key: "projets", label: "Projets", badge: projets.filter((p) => p.statut === "en_cours").length || undefined },
    { key: "revenus", label: "Revenus" },
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
                { label: "Obj. sprint", value: sprint.objectif + " $", accent: false },
                { label: "Encaissé", value: revenusMoisActuelReel + " $", accent: revenusMoisActuelReel > 0 },
                { label: "Manque", value: manqueReel + " $", accent: manqueReel === 0 },
                { label: "Prévision", value: prevision + " $", accent: prevision > 0 },
                { label: "Clients", value: clientsNonEncaisses.length > 0 ? clientsNonEncaisses.length + " à encaisser" : clientsGagnes.length + " total", accent: clientsNonEncaisses.length > 0 },
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

        {/* ── RECHERCHE GLOBALE ── */}
        {(() => {
          const q = recherche.trim().toLowerCase();
          const actif = q.length >= 2;

          type ResultatRecherche = { id: string; label: string; sous: string; onglet: MainTab; sousOnglet?: string };

          const resultats: { categorie: string; items: ResultatRecherche[] }[] = actif ? (() => {
            function match(...champs: (string | undefined | null)[]): boolean {
              return champs.some((c) => c && c.toLowerCase().includes(q));
            }

            const resProspects: ResultatRecherche[] = prospects
              .filter((p) => match(p.nom, p.offre, p.canal, p.notes, p.email, p.type_projet, p.prochaine_action))
              .slice(0, 5)
              .map((p) => ({
                id: p.id,
                label: p.nom,
                sous: p.offre + (p.canal ? " · " + p.canal : "") + " — " + (STATUTS.find((s) => s.value === p.statut)?.label ?? p.statut),
                onglet: "crm" as MainTab,
              }));

            const resProjets: ResultatRecherche[] = projets
              .filter((p) => match(p.nom, p.nomClient, p.offre, p.description, p.notes, p.livrable))
              .slice(0, 5)
              .map((p) => ({
                id: p.id,
                label: p.nom,
                sous: p.nomClient + " · " + p.offre,
                onglet: "projets" as MainTab,
              }));

            const resPropositions: ResultatRecherche[] = propositions
              .filter((p) => match(p.nomClient, p.offre, p.notes))
              .slice(0, 5)
              .map((p) => ({
                id: p.id,
                label: p.nomClient,
                sous: p.offre + " · " + p.montant + " $",
                onglet: "crm" as MainTab,
              }));

            const resRevenus: ResultatRecherche[] = revenus
              .filter((r) => match(r.nomClient, r.description))
              .slice(0, 5)
              .map((r) => ({
                id: r.id,
                label: r.nomClient,
                sous: r.description + " · " + r.montant + " $",
                onglet: "revenus" as MainTab,
              }));

            const resMessages: ResultatRecherche[] = messages
              .filter((m) => match(m.titre, m.contenu, m.canal, m.type))
              .slice(0, 5)
              .map((m) => ({
                id: m.id,
                label: m.titre,
                sous: m.canal + " · " + m.type.replace(/_/g, " "),
                onglet: "outils" as MainTab,
              }));

            return [
              { categorie: "Prospects / Clients", items: resProspects },
              { categorie: "Projets", items: resProjets },
              { categorie: "Propositions", items: resPropositions },
              { categorie: "Revenus", items: resRevenus },
              { categorie: "Messages", items: resMessages },
            ].filter((g) => g.items.length > 0);
          })() : [];

          const totalResultats = resultats.reduce((acc, g) => acc + g.items.length, 0);

          return (
            <div style={{ marginBottom: 10 }}>
              {/* Champ de recherche */}
              <div style={{ alignItems: "center", display: "flex", gap: 6 }}>
                <div style={{ alignItems: "center", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(201,168,92,0.18)", borderRadius: 7, display: "flex", flex: 1, gap: 6, padding: "5px 10px" }}>
                  <span style={{ color: "var(--text-muted)", fontSize: 13 }}>🔍</span>
                  <input
                    type="text"
                    placeholder="Rechercher prospects, projets, revenus, messages…"
                    value={recherche}
                    onChange={(e) => setRecherche(e.target.value)}
                    style={{ background: "none", border: "none", color: "var(--text-main)", flex: 1, fontSize: 12, outline: "none" }}
                  />
                  {recherche.length > 0 && (
                    <button type="button" onClick={() => setRecherche("")} style={{ background: "none", border: "none", color: "var(--text-muted)", cursor: "pointer", fontSize: 14, lineHeight: 1, padding: 0 }}>✕</button>
                  )}
                </div>
              </div>

              {/* Résultats */}
              {actif && (
                <div style={{ background: "rgba(18,18,18,0.97)", border: "1px solid rgba(201,168,92,0.15)", borderRadius: 8, marginTop: 4, padding: "8px 10px" }}>
                  {totalResultats === 0 ? (
                    <p style={{ color: "var(--text-muted)", fontSize: 12, margin: 0 }}>Aucun résultat pour « {q} »</p>
                  ) : (
                    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                      {resultats.map((groupe) => (
                        <div key={groupe.categorie}>
                          <p style={{ color: "var(--text-muted)", fontSize: 10, fontWeight: 700, letterSpacing: "0.08em", margin: "0 0 4px", textTransform: "uppercase" }}>{groupe.categorie}</p>
                          <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                            {groupe.items.map((item) => (
                              <button
                                key={item.id}
                                type="button"
                                onClick={() => { setActiveTab(item.onglet); setRecherche(""); }}
                                style={{ alignItems: "flex-start", background: "rgba(201,168,92,0.05)", border: "1px solid rgba(201,168,92,0.08)", borderRadius: 6, cursor: "pointer", display: "flex", flexDirection: "column", padding: "5px 8px", textAlign: "left", width: "100%" }}
                              >
                                <span style={{ color: "var(--text-main)", fontSize: 12, fontWeight: 500 }}>{item.label}</span>
                                <span style={{ color: "var(--text-muted)", fontSize: 10 }}>{item.sous}</span>
                              </button>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })()}

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
            {/* Sous-onglets Cockpit */}
            <div style={{ borderBottom: "1px solid rgba(201,168,92,0.12)", display: "flex", marginBottom: 10 }}>
              {([
                { key: "vue" as CockpitSousTab, label: "Vue d'ensemble" },
                { key: "stats" as CockpitSousTab, label: "Statistiques" },
                { key: "objectifs" as CockpitSousTab, label: "Objectifs" },
              ]).map(({ key, label }) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setCockpitSousTab(key)}
                  style={{
                    background: "none",
                    border: "none",
                    borderBottom: cockpitSousTab === key ? "2px solid rgba(201,168,92,0.7)" : "2px solid transparent",
                    color: cockpitSousTab === key ? "var(--text-main)" : "var(--text-muted)",
                    cursor: "pointer",
                    fontSize: 12,
                    fontWeight: cockpitSousTab === key ? 600 : 400,
                    marginBottom: -1,
                    padding: "4px 14px 6px",
                  }}
                >
                  {label}
                </button>
              ))}
            </div>

            {/* ── VUE D'ENSEMBLE ── */}
            {cockpitSousTab === "vue" ? <>

            {/* KPIs détaillés */}
            <SystemPanel ariaLabel="KPIs sprint" compact>
              <div style={{ alignItems: "center", display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                <p className="label-meta" style={{ margin: 0 }}>Sprint actif · {kpis.joursRestants}j restants</p>
                <div style={{ display: "flex", gap: 5 }}>
                  <button
                    style={btnSmall}
                    type="button"
                    title="Réinitialiser le sprint (remet à zéro la date et les compteurs)"
                    onClick={() => setSprint((s) => ({ ...s, dateDebut: today, prospectsContactes: 0, clientsObtenus: 0, revenusAttente: 0 }))}
                  >↺ Reset</button>
                  <button style={btnSmall} type="button" onClick={() => setSprintEdit(!sprintEdit)}>
                    {sprintEdit ? "Fermer" : "Modifier"}
                  </button>
                </div>
              </div>
              <SystemGrid gap={6} min={90}>
                <CompactMetric label="Objectif sprint" value={sprint.objectif + " $"} />
                <CompactMetric label="Encaissé (mois)" value={revenusMoisActuelReel + " $"} />
                <CompactMetric label="En attente" value={sprint.revenusAttente + " $"} />
                <CompactMetric label="Manque" value={manqueReel + " $"} />
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
              <div style={{ alignItems: "center", display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                <p className="label-meta" style={{ margin: 0 }}>Que faire maintenant ?</p>
                {actionsUrgentes.length > 0 ? (
                  <span style={{ fontSize: 10, color: "var(--text-muted)" }}>
                    {actionsUrgentes.filter((a) => a.urgence === "critique").length > 0
                      ? actionsUrgentes.filter((a) => a.urgence === "critique").length + " critique" + (actionsUrgentes.filter((a) => a.urgence === "critique").length > 1 ? "s" : "")
                      : actionsUrgentes.length + " action" + (actionsUrgentes.length > 1 ? "s" : "")}
                  </span>
                ) : null}
              </div>
              {actionsUrgentes.length > 0 ? (
                <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                  {actionsUrgentes.map((action, i) => {
                    const isCritique = action.urgence === "critique";
                    const isHaute = action.urgence === "haute";
                    return (
                      <div
                        key={i}
                        style={{
                          alignItems: "flex-start",
                          background: isCritique ? "rgba(216,90,48,0.07)" : isHaute ? "rgba(201,168,92,0.07)" : "rgba(255,250,238,0.02)",
                          border: "1px solid " + (isCritique ? "rgba(216,90,48,0.30)" : isHaute ? "rgba(201,168,92,0.25)" : "rgba(201,168,92,0.09)"),
                          borderRadius: 7,
                          display: "flex",
                          gap: 9,
                          padding: "6px 9px",
                        }}
                      >
                        <span style={{ color: isCritique ? "#D85A30" : isHaute ? "var(--accent-gold)" : "var(--text-muted)", flexShrink: 0, fontSize: 11, marginTop: 1 }}>
                          {isCritique ? "🔴" : isHaute ? "⚡" : "→"}
                        </span>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ alignItems: "center", display: "flex", flexWrap: "wrap", gap: 6 }}>
                            <span style={{ color: isCritique ? "#D85A30" : "var(--text-main)", fontSize: 12.5, fontWeight: isCritique || isHaute ? 600 : 500 }}>{action.label}</span>
                            {action.valeur !== undefined && action.valeur > 0 ? (
                              <span style={{ background: "rgba(29,158,117,0.12)", border: "1px solid rgba(29,158,117,0.25)", borderRadius: 99, color: "#1D9E75", fontSize: 10, fontWeight: 600, padding: "1px 6px" }}>
                                {action.valeur} $
                              </span>
                            ) : null}
                          </div>
                          {action.detail !== "" ? (
                            <p style={{ color: "var(--text-muted)", fontSize: 11, lineHeight: 1.4, margin: "2px 0 0" }}>{action.detail}</p>
                          ) : null}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div style={{ background: "rgba(29,158,117,0.08)", border: "1px solid rgba(29,158,117,0.25)", borderRadius: 8, padding: "10px 12px" }}>
                  <p style={{ color: "#1D9E75", fontSize: 13, margin: 0 }}>✓ Aucune action due — tu es à jour.</p>
                </div>
              )}
            </SystemPanel>

            {/* Relances + Tâches côte à côte */}
            <SystemGrid gap={10} min={300}>
              <SystemPanel ariaLabel="Relances" compact>
                {(() => {
                  // Logique alignée avec le Centre d'actions : date_prochaine_relance
                  // Fallback sur dateContact+3j uniquement si aucun prospect n'a de date planifiée
                  const avecDate = actifs.filter((p) => p.date_prochaine_relance !== undefined && p.date_prochaine_relance !== "");
                  const useExplicite = avecDate.length > 0;

                  const listeRelances = useExplicite
                    ? actifs
                        .filter((p) => p.date_prochaine_relance !== undefined && p.date_prochaine_relance !== "")
                        .map((p) => {
                          const retard = Math.floor((new Date(today).getTime() - new Date(p.date_prochaine_relance!).getTime()) / 86400000);
                          return { ...p, retard };
                        })
                        .sort((a, b) => b.retard - a.retard)
                    : relances.map((p) => ({ ...p, retard: p.jours }));

                  const label = useExplicite ? "Relances planifiées" : "Relances — J+3 sans réponse";

                  return (
                    <>
                      <p className="label-meta" style={{ margin: "0 0 7px" }}>{label}</p>
                      {listeRelances.length > 0 ? (
                        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                          {listeRelances.slice(0, 6).map((p) => {
                            const st = STATUTS.find((s) => s.value === p.statut);
                            const enRetard = p.retard > 0;
                            const critique = p.retard >= 3;
                            return (
                              <div
                                key={p.id}
                                style={{
                                  alignItems: "center",
                                  background: critique ? "rgba(216,90,48,0.06)" : enRetard ? "rgba(186,117,23,0.07)" : "rgba(255,250,238,0.03)",
                                  border: "1px solid " + (critique ? "rgba(216,90,48,0.25)" : enRetard ? "rgba(186,117,23,0.22)" : "rgba(201,168,92,0.12)"),
                                  borderRadius: 7,
                                  display: "flex",
                                  gap: 8,
                                  justifyContent: "space-between",
                                  padding: "5px 9px",
                                }}
                              >
                                <div style={{ flex: 1, minWidth: 0 }}>
                                  <span style={{ color: critique ? "#D85A30" : "var(--text-main)", fontSize: 12.5, fontWeight: 500 }}>{p.nom}</span>
                                  <span style={{ color: "var(--text-muted)", fontSize: 11, marginLeft: 6 }}>
                                    {p.retard === 0 ? "Aujourd'hui" : p.retard > 0 ? "J+" + p.retard : "Dans " + Math.abs(p.retard) + "j"}
                                  </span>
                                  {(p.valeur_estimee || p.montant) > 0 ? (
                                    <span style={{ color: "var(--text-muted)", fontSize: 11, marginLeft: 5 }}>
                                      {p.valeur_estimee || p.montant} $
                                    </span>
                                  ) : null}
                                  {p.prochaine_action !== undefined && p.prochaine_action !== "" ? (
                                    <p style={{ color: "var(--text-muted)", fontSize: 10, lineHeight: 1.3, margin: "2px 0 0", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                                      → {p.prochaine_action}
                                    </p>
                                  ) : null}
                                </div>
                                <span style={{ background: (st ? st.color : "#888") + "22", borderRadius: 99, color: st ? st.color : "#888", flexShrink: 0, fontSize: 10, padding: "1px 7px" }}>
                                  {st ? st.label : p.statut}
                                </span>
                              </div>
                            );
                          })}
                          {listeRelances.length > 6 ? (
                            <p style={{ color: "var(--text-muted)", fontSize: 11, margin: 0 }}>
                              + {listeRelances.length - 6} autre{listeRelances.length - 6 > 1 ? "s" : ""}
                            </p>
                          ) : null}
                        </div>
                      ) : (
                        <p style={{ color: "var(--text-muted)", fontSize: 12, margin: 0 }}>
                          {useExplicite ? "Aucune relance planifiée." : "Aucune relance due."}
                        </p>
                      )}
                    </>
                  );
                })()}
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

            </> : null}

            {/* ── STATISTIQUES ── */}
            {cockpitSousTab === "stats" ? (() => {
              // Tous les calculs croisés — aucune nouvelle clé, aucune duplication
              const totalPropositions = propositions.length;
              const propsAcceptees = propositions.filter((p) => p.statut === "acceptee").length;
              const tauxProp = totalPropositions > 0 ? Math.round((propsAcceptees / totalPropositions) * 100) : null;

              const clientsGagnesStats = prospects.filter((p) => p.statut === "gagne");
              const delaisConversion = clientsGagnesStats
                .map((p) => {
                  const dc = new Date(p.date_dernier_contact || p.dateContact);
                  const d0 = new Date(p.dateContact);
                  return Math.floor((dc.getTime() - d0.getTime()) / 86400000);
                })
                .filter((d) => d > 0);
              const delaiMoyen = delaisConversion.length > 0
                ? Math.round(delaisConversion.reduce((a, b) => a + b, 0) / delaisConversion.length)
                : null;

              const valeurMoyenneProjet = projets.length > 0
                ? Math.round(projets.reduce((acc, p) => acc + p.montant, 0) / projets.length)
                : null;

              const valeurMoyenneClient = clientsGagnesStats.length > 0
                ? Math.round(clientsGagnesStats.reduce((acc, c) => acc + (c.valeur_estimee || c.montant || 0), 0) / clientsGagnesStats.length)
                : null;

              const projetsEnRetard = projets.filter((p) => {
                return p.statut === "en_cours" && p.dateLivraison !== undefined && p.dateLivraison !== "" && p.dateLivraison < today;
              }).length;

              // Mois le plus productif
              const parMoisRev = revenus.reduce<Record<string, number>>((acc, r) => {
                acc[r.mois] = (acc[r.mois] ?? 0) + r.montant;
                return acc;
              }, {});
              const moisTopEntry = Object.entries(parMoisRev).sort((a, b) => b[1] - a[1])[0];
              const moisTop = moisTopEntry ? { mois: moisTopEntry[0], montant: moisTopEntry[1] } : null;

              // Client le plus rentable
              const parClientRev = revenus.reduce<Record<string, number>>((acc, r) => {
                acc[r.nomClient] = (acc[r.nomClient] ?? 0) + r.montant;
                return acc;
              }, {});
              const clientTopEntry = Object.entries(parClientRev).sort((a, b) => b[1] - a[1])[0];
              const clientTop = clientTopEntry ? { nom: clientTopEntry[0], montant: clientTopEntry[1] } : null;

              // Catégorie la plus rentable
              const parCatRev = revenus.reduce<Record<string, number>>((acc, r) => {
                acc[r.categorie] = (acc[r.categorie] ?? 0) + r.montant;
                return acc;
              }, {});
              const catTopEntry = Object.entries(parCatRev).sort((a, b) => b[1] - a[1])[0];
              const catTop = catTopEntry
                ? { label: CATEGORIES_REVENU.find((c) => c.value === catTopEntry[0])?.label ?? catTopEntry[0], montant: catTopEntry[1] }
                : null;

              // Pipeline potentiel vs revenus encaissés
              const pipelinePotentiel = actifs.reduce((acc, p) => acc + (p.valeur_estimee || p.montant || 0), 0);
              const totalEncaisse = revenus.reduce((acc, r) => acc + r.montant, 0);

              type StatRow = { label: string; value: string; sub?: string; accent?: boolean };
              const rows: StatRow[] = [];

              if (tauxProp !== null) rows.push({ label: "Taux propositions acceptées", value: tauxProp + "%", sub: propsAcceptees + " / " + totalPropositions, accent: tauxProp >= 50 });
              if (delaiMoyen !== null) rows.push({ label: "Délai moyen prospect → client", value: delaiMoyen + "j", sub: "basé sur " + delaisConversion.length + " client" + (delaisConversion.length > 1 ? "s" : "") });
              if (valeurMoyenneProjet !== null) rows.push({ label: "Valeur moyenne / projet", value: valeurMoyenneProjet + " $", sub: projets.length + " projet" + (projets.length > 1 ? "s" : "") });
              if (valeurMoyenneClient !== null) rows.push({ label: "Valeur moyenne / client", value: valeurMoyenneClient + " $", sub: clientsGagnesStats.length + " client" + (clientsGagnesStats.length > 1 ? "s" : "") });
              if (projetsEnRetard > 0) rows.push({ label: "Projets en retard", value: String(projetsEnRetard), accent: false, sub: "date de livraison dépassée" });
              if (moisTop !== null) rows.push({ label: "Mois le plus productif", value: moisTop.montant + " $", sub: moisLabel(moisTop.mois), accent: true });
              if (clientTop !== null) rows.push({ label: "Client le plus rentable", value: clientTop.montant + " $", sub: clientTop.nom, accent: true });
              if (catTop !== null) rows.push({ label: "Catégorie principale", value: catTop.montant + " $", sub: catTop.label, accent: true });
              if (pipelinePotentiel > 0) rows.push({ label: "Pipeline potentiel", value: pipelinePotentiel + " $", sub: actifs.length + " prospect" + (actifs.length > 1 ? "s" : "") + " actifs" });
              if (totalEncaisse > 0) rows.push({ label: "Total encaissé (historique)", value: totalEncaisse + " $", sub: revenus.length + " encaissement" + (revenus.length > 1 ? "s" : ""), accent: true });

              return (
                <SystemPanel ariaLabel="Statistiques" compact>
                  {rows.length > 0 ? (
                    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                      {rows.map((row, i) => (
                        <div
                          key={i}
                          style={{
                            alignItems: "center",
                            background: "rgba(255,250,238,0.02)",
                            border: "1px solid rgba(201,168,92,0.09)",
                            borderRadius: 7,
                            display: "flex",
                            justifyContent: "space-between",
                            padding: "6px 10px",
                          }}
                        >
                          <div style={{ minWidth: 0 }}>
                            <p style={{ color: "var(--text-soft)", fontSize: 12, margin: 0 }}>{row.label}</p>
                            {row.sub !== undefined ? <p style={{ color: "var(--text-muted)", fontSize: 10, margin: "1px 0 0" }}>{row.sub}</p> : null}
                          </div>
                          <strong style={{ color: row.accent === false ? "#D85A30" : row.accent ? "#1D9E75" : "var(--text-main)", flexShrink: 0, fontSize: 14, marginLeft: 12 }}>
                            {row.value}
                          </strong>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p style={{ color: "var(--text-muted)", fontSize: 12, margin: 0 }}>
                      Pas encore assez de données. Ajoute des prospects, propositions, projets et revenus pour voir les statistiques.
                    </p>
                  )}
                </SystemPanel>
              );
            })() : null}

            {/* ── OBJECTIFS ── */}
            {cockpitSousTab === "objectifs" ? (() => {
              const moisActuel = today.slice(0, 7);

              // Revenus réels du mois en cours
              const revenusMoisActuel = revenus
                .filter((r) => r.mois === moisActuel)
                .reduce((acc, r) => acc + r.montant, 0);

              // Clients gagnés ce mois
              const clientsMoisActuel = prospects.filter(
                (p) => p.statut === "gagne" && (p.date_dernier_contact || p.dateContact).slice(0, 7) === moisActuel
              ).length;

              // Contacts ce mois (prospects contactés ce mois)
              const contactsMoisActuel = prospects.filter(
                (p) => p.dateContact.slice(0, 7) === moisActuel
              ).length;

              // Contacts cette semaine (lundi → dimanche)
              const todayDate = new Date(today);
              const jourSemaine = todayDate.getDay() === 0 ? 6 : todayDate.getDay() - 1; // lundi = 0
              const lundiStr = new Date(todayDate.getTime() - jourSemaine * 86400000).toISOString().split("T")[0];
              const contactsSemaine = prospects.filter((p) => p.dateContact >= lundiStr && p.dateContact <= today).length;

              // Progression CA
              const caObjectif = objectifs.objectifMensuelCA;
              const caPct = caObjectif > 0 ? Math.min(100, Math.round((revenusMoisActuel / caObjectif) * 100)) : null;
              const caRestant = caObjectif > 0 ? Math.max(0, caObjectif - revenusMoisActuel) : null;

              type ObjRow = { label: string; realise: number; objectif: number; unit: string; };
              const lignes: ObjRow[] = [
                { label: "Contacts / semaine", realise: contactsSemaine, objectif: objectifs.objectifContactsSemaine, unit: "" },
                { label: "Contacts / mois", realise: contactsMoisActuel, objectif: objectifs.objectifContactsMois, unit: "" },
                { label: "Nouveaux clients / mois", realise: clientsMoisActuel, objectif: objectifs.objectifClientsMois, unit: "" },
              ];

              return (
                <SystemPanel ariaLabel="Objectifs" compact>
                  {/* Objectif CA */}
                  <div style={{ marginBottom: 12 }}>
                    <div style={{ alignItems: "center", display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                      <span style={{ color: "var(--text-soft)", fontSize: 12 }}>CA mensuel cible</span>
                      <div style={{ alignItems: "center", display: "flex", gap: 8 }}>
                        {caPct !== null && (
                          <span style={{ color: caPct >= 100 ? "#1D9E75" : "var(--text-muted)", fontSize: 11 }}>
                            {revenusMoisActuel} $ / {caObjectif} $ — {caPct}%
                          </span>
                        )}
                        {caObjectif === 0 && (
                          <span style={{ color: "var(--text-muted)", fontSize: 11 }}>Non défini</span>
                        )}
                        <button
                          type="button"
                          onClick={() => setObjectifsEdit((v) => !v)}
                          style={{ background: "none", border: "1px solid rgba(201,168,92,0.25)", borderRadius: 5, color: "var(--text-muted)", cursor: "pointer", fontSize: 11, padding: "2px 8px" }}
                        >
                          {objectifsEdit ? "Fermer" : "Modifier"}
                        </button>
                      </div>
                    </div>
                    {caPct !== null && (
                      <div style={{ background: "rgba(255,255,255,0.05)", borderRadius: 4, height: 8, overflow: "hidden", width: "100%" }}>
                        <div style={{ background: caPct >= 100 ? "#1D9E75" : "rgba(201,168,92,0.6)", borderRadius: 4, height: "100%", transition: "width 0.3s", width: caPct + "%" }} />
                      </div>
                    )}
                    {caRestant !== null && caRestant > 0 && (
                      <p style={{ color: "var(--text-muted)", fontSize: 10, margin: "3px 0 0" }}>
                        Encore {caRestant} $ à encaisser ce mois
                      </p>
                    )}
                    {caObjectif > 0 && revenusMoisActuel >= caObjectif && (
                      <p style={{ color: "#1D9E75", fontSize: 10, margin: "3px 0 0" }}>✓ Objectif atteint ce mois</p>
                    )}
                  </div>

                  {/* Formulaire d'édition */}
                  {objectifsEdit && (
                    <div style={{ background: "rgba(201,168,92,0.04)", border: "1px solid rgba(201,168,92,0.12)", borderRadius: 8, marginBottom: 12, padding: "10px 12px" }}>
                      <p style={{ color: "var(--text-soft)", fontSize: 12, fontWeight: 600, margin: "0 0 8px" }}>Modifier les objectifs</p>
                      <div style={{ display: "grid", gap: 8, gridTemplateColumns: "1fr 1fr" }}>
                        {(
                          [
                            { field: "objectifMensuelCA" as keyof Objectifs, label: "CA mensuel ($)" },
                            { field: "objectifClientsMois" as keyof Objectifs, label: "Clients / mois" },
                            { field: "objectifContactsSemaine" as keyof Objectifs, label: "Contacts / semaine" },
                            { field: "objectifContactsMois" as keyof Objectifs, label: "Contacts / mois" },
                          ] as { field: keyof Objectifs; label: string }[]
                        ).map(({ field, label }) => (
                          <label key={field} style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                            <span style={{ color: "var(--text-muted)", fontSize: 10 }}>{label}</span>
                            <input
                              type="number"
                              min={0}
                              value={objectifs[field]}
                              onChange={(e) => setObjectifs((o) => ({ ...o, [field]: Number(e.target.value) }))}
                              style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(201,168,92,0.2)", borderRadius: 5, color: "var(--text-main)", fontSize: 13, padding: "4px 8px", width: "100%" }}
                            />
                          </label>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Lignes contacts / clients */}
                  <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                    {lignes.map((l) => {
                      const pct = l.objectif > 0 ? Math.min(100, Math.round((l.realise / l.objectif) * 100)) : null;
                      const ok = l.objectif > 0 && l.realise >= l.objectif;
                      return (
                        <div
                          key={l.label}
                          style={{
                            background: "rgba(255,250,238,0.02)",
                            border: "1px solid rgba(201,168,92,0.09)",
                            borderRadius: 7,
                            padding: "6px 10px",
                          }}
                        >
                          <div style={{ alignItems: "center", display: "flex", justifyContent: "space-between", marginBottom: 3 }}>
                            <span style={{ color: "var(--text-soft)", fontSize: 12 }}>{l.label}</span>
                            <span style={{ color: ok ? "#1D9E75" : "var(--text-main)", fontSize: 13, fontWeight: 600 }}>
                              {l.realise}{l.objectif > 0 ? " / " + l.objectif : ""}
                              {ok ? " ✓" : ""}
                            </span>
                          </div>
                          {pct !== null && (
                            <div style={{ background: "rgba(255,255,255,0.05)", borderRadius: 3, height: 5, overflow: "hidden" }}>
                              <div style={{ background: ok ? "#1D9E75" : "rgba(201,168,92,0.5)", borderRadius: 3, height: "100%", width: pct + "%" }} />
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </SystemPanel>
              );
            })() : null}
          </>
        ) : null}

        {/* ── CRM ── */}
        {activeTab === "crm" ? (
          <SystemPanel ariaLabel="CRM Prospects" compact>
            <CRMPanel prospects={prospects} onUpdate={setProspects} propositions={propositions} onUpdatePropositions={setPropositions} />
          </SystemPanel>
        ) : null}

        {/* ── PIPELINE ── */}
        {activeTab === "pipeline" ? (
          <SystemPanel ariaLabel="Pipeline commercial" compact>
            <PipelinePanel prospects={prospects} today={today} onUpdate={setProspects} />
          </SystemPanel>
        ) : null}

        {/* ── PROJETS ── */}
        {activeTab === "projets" ? (
          <SystemPanel ariaLabel="Projets" compact>
            <ProjetsPanel
              projets={projets}
              clients={clientsGagnes}
              propositions={propositions}
              onUpdate={setProjets}
            />
          </SystemPanel>
        ) : null}

        {/* ── REVENUS ── */}
        {activeTab === "revenus" ? (
          <SystemPanel ariaLabel="Revenus" compact>
            <RevenusPanel revenus={revenus} projets={projets} onUpdate={setRevenus} />
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
            {/* Sous-onglets Outils IA */}
            <div style={{ borderBottom: "1px solid rgba(201,168,92,0.12)", display: "flex", marginBottom: 10 }}>
              {([
                { key: "ghostwriting" as OutilsSousTab, label: "Ghostwriting" },
                { key: "mode500" as OutilsSousTab, label: "Mode 500" },
                { key: "messages" as OutilsSousTab, label: "Messages" },
              ]).map(({ key, label }) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setOutilsSousTab(key)}
                  style={{
                    background: "none",
                    border: "none",
                    borderBottom: outilsSousTab === key ? "2px solid rgba(201,168,92,0.7)" : "2px solid transparent",
                    color: outilsSousTab === key ? "var(--text-main)" : "var(--text-muted)",
                    cursor: "pointer",
                    fontSize: 12,
                    fontWeight: outilsSousTab === key ? 600 : 400,
                    marginBottom: -1,
                    padding: "4px 14px 6px",
                  }}
                >
                  {label}
                </button>
              ))}
            </div>

            {/* Générateur ghostwriting */}
            {outilsSousTab === "ghostwriting" ? <SystemPanel ariaLabel="Générateur ghostwriting" compact>
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
            </SystemPanel> : null}

            {/* Mode 500 */}
            {outilsSousTab === "mode500" ? <SystemPanel ariaLabel="Mode 500" compact>
              <Mode500Panel mode500={mode500} onUpdate={setMode500} />
            </SystemPanel> : null}

            {/* ── MESSAGES ── */}
            {outilsSousTab === "messages" ? (() => {
              const CANAUX: { value: CanalMessage; label: string }[] = [
                { value: "linkedin", label: "LinkedIn" },
                { value: "email", label: "Email" },
                { value: "facebook", label: "Facebook" },
                { value: "autre", label: "Autre" },
              ];
              const TYPES: { value: TypeMessage; label: string }[] = [
                { value: "premier_contact", label: "Premier contact" },
                { value: "relance", label: "Relance" },
                { value: "suivi_devis", label: "Suivi devis" },
                { value: "remerciement", label: "Remerciement" },
                { value: "client_recurrent", label: "Client récurrent" },
                { value: "autre", label: "Autre" },
              ];

              const msgFiltre = messages.filter((m) => {
                if (msgFiltreCanal !== "tous" && m.canal !== msgFiltreCanal) return false;
                if (msgFiltreType !== "tous" && m.type !== msgFiltreType) return false;
                return true;
              });

              const inputS: React.CSSProperties = { background: "rgba(255,255,255,0.05)", border: "1px solid rgba(201,168,92,0.2)", borderRadius: 5, color: "var(--text-main)", fontSize: 12, padding: "4px 8px", width: "100%" };
              const selectS: React.CSSProperties = { ...inputS, cursor: "pointer" };

              function sauvegarderMsg() {
                if (msgForm.titre.trim() === "" || msgForm.contenu.trim() === "") return;
                const now = today;
                if (msgEditId !== null) {
                  setMessages((prev) => prev.map((m) => m.id === msgEditId ? { ...m, ...msgForm, derniereModification: now } : m));
                  setMsgEditId(null);
                } else {
                  setMessages((prev) => [{ id: genId(), dateCreation: now, derniereModification: now, ...msgForm }, ...prev]);
                  setMsgAjout(false);
                }
                setMsgForm({ titre: "", canal: "linkedin", type: "premier_contact", contenu: "" });
              }

              function ouvrirEdit(m: MessageTemplate) {
                setMsgEditId(m.id);
                setMsgAjout(false);
                setMsgForm({ titre: m.titre, canal: m.canal, type: m.type, contenu: m.contenu });
              }

              function annuler() {
                setMsgEditId(null);
                setMsgAjout(false);
                setMsgForm({ titre: "", canal: "linkedin", type: "premier_contact", contenu: "" });
              }

              const formulaireVisible = msgAjout || msgEditId !== null;

              return (
                <SystemPanel ariaLabel="Bibliothèque de messages" compact>
                  {/* En-tête : filtres + bouton ajout */}
                  <div style={{ alignItems: "center", display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 10 }}>
                    <select value={msgFiltreCanal} onChange={(e) => setMsgFiltreCanal(e.target.value as CanalMessage | "tous")} style={{ ...selectS, width: "auto" }}>
                      <option value="tous">Tous les canaux</option>
                      {CANAUX.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
                    </select>
                    <select value={msgFiltreType} onChange={(e) => setMsgFiltreType(e.target.value as TypeMessage | "tous")} style={{ ...selectS, width: "auto" }}>
                      <option value="tous">Tous les types</option>
                      {TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
                    </select>
                    <button
                      type="button"
                      onClick={() => { setMsgAjout((v) => !v); setMsgEditId(null); setMsgForm({ titre: "", canal: "linkedin", type: "premier_contact", contenu: "" }); }}
                      style={{ background: formulaireVisible && msgEditId === null ? "rgba(201,168,92,0.15)" : "rgba(201,168,92,0.08)", border: "1px solid rgba(201,168,92,0.3)", borderRadius: 6, color: "var(--text-soft)", cursor: "pointer", fontSize: 12, marginLeft: "auto", padding: "4px 12px" }}
                    >
                      {msgAjout ? "Annuler" : "+ Nouveau"}
                    </button>
                  </div>

                  {/* Formulaire ajout / édition */}
                  {formulaireVisible && (
                    <div style={{ background: "rgba(201,168,92,0.04)", border: "1px solid rgba(201,168,92,0.15)", borderRadius: 8, marginBottom: 10, padding: "10px 12px" }}>
                      <p style={{ color: "var(--text-soft)", fontSize: 12, fontWeight: 600, margin: "0 0 8px" }}>
                        {msgEditId !== null ? "Modifier le modèle" : "Nouveau modèle"}
                      </p>
                      <div style={{ display: "grid", gap: 6, gridTemplateColumns: "1fr 1fr" }}>
                        <label style={{ gridColumn: "1 / -1" }}>
                          <span style={{ color: "var(--text-muted)", display: "block", fontSize: 10, marginBottom: 2 }}>Titre *</span>
                          <input type="text" placeholder="ex: Premier contact LinkedIn ghostwriting" value={msgForm.titre} onChange={(e) => setMsgForm((f) => ({ ...f, titre: e.target.value }))} style={inputS} />
                        </label>
                        <label>
                          <span style={{ color: "var(--text-muted)", display: "block", fontSize: 10, marginBottom: 2 }}>Canal</span>
                          <select value={msgForm.canal} onChange={(e) => setMsgForm((f) => ({ ...f, canal: e.target.value as CanalMessage }))} style={selectS}>
                            {CANAUX.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
                          </select>
                        </label>
                        <label>
                          <span style={{ color: "var(--text-muted)", display: "block", fontSize: 10, marginBottom: 2 }}>Type</span>
                          <select value={msgForm.type} onChange={(e) => setMsgForm((f) => ({ ...f, type: e.target.value as TypeMessage }))} style={selectS}>
                            {TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
                          </select>
                        </label>
                        <label style={{ gridColumn: "1 / -1" }}>
                          <span style={{ color: "var(--text-muted)", display: "block", fontSize: 10, marginBottom: 2 }}>Contenu *</span>
                          <textarea
                            placeholder="Rédige ton modèle ici. Tu peux utiliser des espaces réservés comme [NOM], [OFFRE], [LIEN]…"
                            value={msgForm.contenu}
                            onChange={(e) => setMsgForm((f) => ({ ...f, contenu: e.target.value }))}
                            style={{ ...inputS, minHeight: 100, resize: "vertical" }}
                          />
                        </label>
                      </div>
                      <div style={{ display: "flex", gap: 6, justifyContent: "flex-end", marginTop: 8 }}>
                        <button type="button" onClick={annuler} style={{ background: "none", border: "1px solid rgba(201,168,92,0.2)", borderRadius: 5, color: "var(--text-muted)", cursor: "pointer", fontSize: 12, padding: "4px 12px" }}>Annuler</button>
                        <button type="button" onClick={sauvegarderMsg} style={{ background: "rgba(201,168,92,0.15)", border: "1px solid rgba(201,168,92,0.35)", borderRadius: 5, color: "var(--text-main)", cursor: "pointer", fontSize: 12, fontWeight: 600, padding: "4px 14px" }}>
                          {msgEditId !== null ? "Enregistrer" : "Ajouter"}
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Liste des templates */}
                  {msgFiltre.length === 0 ? (
                    <p style={{ color: "var(--text-muted)", fontSize: 12, margin: 0 }}>
                      {messages.length === 0 ? "Aucun modèle. Clique sur « + Nouveau » pour créer ton premier message." : "Aucun résultat pour ces filtres."}
                    </p>
                  ) : (
                    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                      {msgFiltre.map((m) => {
                        const canalLabel = CANAUX.find((c) => c.value === m.canal)?.label ?? m.canal;
                        const typeLabel = TYPES.find((t) => t.value === m.type)?.label ?? m.type;
                        const enEdition = msgEditId === m.id;
                        return (
                          <div
                            key={m.id}
                            style={{
                              background: enEdition ? "rgba(201,168,92,0.05)" : "rgba(255,250,238,0.02)",
                              border: "1px solid rgba(201,168,92,0.12)",
                              borderRadius: 8,
                              padding: "8px 10px",
                            }}
                          >
                            {/* En-tête template */}
                            <div style={{ alignItems: "flex-start", display: "flex", justifyContent: "space-between" }}>
                              <div style={{ minWidth: 0 }}>
                                <p style={{ color: "var(--text-main)", fontSize: 13, fontWeight: 600, margin: 0 }}>{m.titre}</p>
                                <p style={{ color: "var(--text-muted)", fontSize: 10, margin: "2px 0 0" }}>
                                  {canalLabel} · {typeLabel}
                                </p>
                              </div>
                              <div style={{ alignItems: "center", display: "flex", flexShrink: 0, gap: 4, marginLeft: 8 }}>
                                <button
                                  type="button"
                                  onClick={() => {
                                    navigator.clipboard.writeText(m.contenu).catch(() => {});
                                    setMsgCopied(m.id);
                                    setTimeout(() => setMsgCopied(null), 1500);
                                  }}
                                  style={{ background: "rgba(29,158,117,0.1)", border: "1px solid rgba(29,158,117,0.25)", borderRadius: 5, color: "#1D9E75", cursor: "pointer", fontSize: 11, padding: "2px 8px" }}
                                >
                                  {msgCopied === m.id ? "Copié ✓" : "Copier"}
                                </button>
                                <button
                                  type="button"
                                  onClick={() => enEdition ? annuler() : ouvrirEdit(m)}
                                  style={{ background: "none", border: "1px solid rgba(201,168,92,0.2)", borderRadius: 5, color: "var(--text-muted)", cursor: "pointer", fontSize: 11, padding: "2px 8px" }}
                                >
                                  {enEdition ? "✕" : "Éditer"}
                                </button>
                                <button
                                  type="button"
                                  onClick={() => { if (confirm("Supprimer ce modèle ?")) setMessages((prev) => prev.filter((x) => x.id !== m.id)); }}
                                  style={{ background: "none", border: "1px solid rgba(216,90,48,0.2)", borderRadius: 5, color: "#D85A30", cursor: "pointer", fontSize: 11, padding: "2px 8px" }}
                                >
                                  ✕
                                </button>
                              </div>
                            </div>
                            {/* Aperçu contenu */}
                            {!enEdition && (
                              <p style={{ color: "var(--text-soft)", fontSize: 11, lineHeight: 1.5, margin: "6px 0 0", whiteSpace: "pre-wrap" }}>
                                {m.contenu.length > 200 ? m.contenu.slice(0, 200) + "…" : m.contenu}
                              </p>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </SystemPanel>
              );
            })() : null}
          </>
        ) : null}

      </SystemPageShell>
    </main>
  );
}
