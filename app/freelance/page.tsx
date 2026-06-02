"use client";

import { useEffect, useState } from "react";
import { BackLink } from "@/components/ui/back-link";
import {
  CompactMetric,
  SystemGrid,
  SystemPageShell,
  SystemPanel,
} from "@/components/system-ui";

type StatutProspect = "a_contacter" | "contacte" | "en_discussion" | "devis_envoye" | "gagne" | "perdu";
type Prospect = { id: string; nom: string; canal: string; offre: string; statut: StatutProspect; montant: number; dateContact: string; encaisse: boolean; };
type SprintActif = { objectif: number; dateDebut: string; revenusEncaisses: number; revenusAttente: number; prospectsContactes: number; clientsObtenus: number; };
type OptionGroup = "objectifs" | "tons" | "longueurs";
type GhostwritingState = { clientText: string; objectifs: string[]; tons: string[]; longueurs: string[]; };
type CalcState = { offre: string; prix: number; taux: number; objectif: number; jours: number; };
type Mode500State = { objectif: number; jours: number; competences: string; tempsParJour: string; contexte: string; };
type PlanHistorique = { id: string; date: string; resume: string; contenu: string; };
type Offre = { id: string; nom: string; prix: number; description: string; canal: string; ventes: number; actif: boolean; };
type Tache = { id: string; texte: string; done: boolean; date: string; };

const FL_SPRINT = "strate_fl_sprint";
const FL_PROSPECTS = "strate_fl_prospects";
const FL_CALC = "strate_fl_calc";
const FL_MODE500 = "strate_fl_mode500";
const FL_HISTORY = "freelance-mode-500-history";
const FL_OFFERS = "strate_fl_offers";
const FL_TACHES = "strate_fl_taches";
const STORAGE_KEY = "freelance-ghostwriting-last-input";

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
  { value: "a_contacter" as StatutProspect, label: "A contacter", color: "#888780" },
  { value: "contacte" as StatutProspect, label: "Contacte", color: "#3B8BD4" },
  { value: "en_discussion" as StatutProspect, label: "En discussion", color: "#BA7517" },
  { value: "devis_envoye" as StatutProspect, label: "Devis envoye", color: "#7F77DD" },
  { value: "gagne" as StatutProspect, label: "Gagne", color: "#1D9E75" },
  { value: "perdu" as StatutProspect, label: "Perdu", color: "#D85A30" },
];
const SECTION_MAP = [
  { tag: "ANALYSE", titre: "Analyse", couleur: "#3B8BD4" },
  { tag: "OFFRES", titre: "Top 3 offres", couleur: "#BA7517" },
  { tag: "MATHS", titre: "Mathematiques", couleur: "#7F77DD" },
  { tag: "PLAN", titre: "Plan J1 a J5", couleur: "#1D9E75" },
  { tag: "SCRIPTS", titre: "Scripts", couleur: "#888780" },
];

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
  if (faisable && parJour <= 5) justification = "Tres realiste. Moins de 5 messages par jour.";
  else if (faisable && parJour <= 10) justification = "Realiste. Environ " + parJour + " messages par jour.";
  else if (faisable) justification = "Exigeant mais possible. " + parJour + " contacts par jour.";
  else justification = "Irrealiste a ce taux. Augmente le prix ou le taux de conversion.";
  return { ventes, prospects, parJour, faisable, justification };
}
function genId(): string { return "p_" + Date.now() + "_" + Math.random().toString(36).slice(2, 7); }
function analyserProjet(t: string) {
  const n = t.trim().length;
  if (n > 700) return { complexite: "Elevee", prix: "400$" };
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
    results.push({ tag: "RAW", titre: "Resultat", couleur: "#888780", contenu: text.trim() });
  }
  return results;
}
function formaterDate(iso: string): string {
  try {
    const d = new Date(iso);
    const mois = ["jan", "fev", "mar", "avr", "mai", "jun", "jul", "aou", "sep", "oct", "nov", "dec"];
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
    .filter((p) => Number.isFinite(p.jours) && p.jours > 3);
}

function TachesDuJourPanel({ taches, nouvelleTache, onNouvelleTache, onUpdate }: { taches: Tache[]; nouvelleTache: string; onNouvelleTache: (v: string) => void; onUpdate: (t: Tache[]) => void }) {
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
      <p className="label-meta" style={{ fontSize: 10, margin: "0 0 5px" }}>Taches du jour</p>
      <div style={{ display: "flex", gap: 6, marginBottom: tachesDuJour.length > 0 ? 6 : 0 }}>
        <input type="text" placeholder="Ajouter une tache" value={nouvelleTache}
          onChange={(e) => onNouvelleTache(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") ajouterTache(); }}
          style={{ flex: 1, minWidth: 0, padding: "4px 7px", fontSize: 12, borderRadius: 6, border: "1px solid rgba(201,168,92,0.25)", background: "var(--bg-main)", color: "var(--text-main)" }}
        />
        <button className="soft-button" type="button" onClick={ajouterTache} style={{ fontSize: 11, padding: "2px 8px" }}>+</button>
      </div>
      {tachesDuJour.length > 0 ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 4, maxHeight: 86, overflow: "auto" }}>
          {tachesDuJour.map((t) => (
            <div key={t.id} style={{ alignItems: "center", display: "flex", gap: 6 }}>
              <input type="checkbox" checked={t.done} onChange={() => onUpdate(taches.map((item) => item.id === t.id ? { ...item, done: !item.done } : item))} />
              <span style={{ color: t.done ? "var(--text-muted)" : "var(--text-soft)", flex: 1, fontSize: 12, minWidth: 0, overflow: "hidden", textDecoration: t.done ? "line-through" : "none", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{t.texte}</span>
              <button type="button" onClick={() => onUpdate(taches.filter((item) => item.id !== t.id))} style={{ background: "transparent", border: "0", color: "var(--text-muted)", cursor: "pointer", fontSize: 12, padding: 0 }}>x</button>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function SprintPanel({ sprint, onUpdate }: { sprint: SprintActif; onUpdate: (s: SprintActif) => void }) {
  const kpis = calculerKPIs(sprint);
  const [editing, setEditing] = useState(false);
  const [ef, setEf] = useState<SprintActif>(sprint);
  useEffect(() => { setEf(sprint); }, [sprint]);
  const pct = Math.min(100, kpis.prob);
  return (
    <SystemPanel ariaLabel="Sprint" compact>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
        <p className="label-meta" style={{ margin: 0, fontSize: 12 }}>Objectif rapide · {kpis.joursRestants}j</p>
        <button className="soft-button" type="button" onClick={() => setEditing(editing ? false : true)} style={{ fontSize: 11, padding: "2px 8px" }}>{editing ? "Fermer" : "Modifier"}</button>
      </div>
      <SystemGrid gap={8} min={90}>
        <CompactMetric label="Encaisse" value={sprint.revenusEncaisses + " $"} />
        <CompactMetric label="Attente" value={sprint.revenusAttente + " $"} />
        <CompactMetric label="Prospects" value={String(sprint.prospectsContactes)} />
        <CompactMetric label="Taux" value={kpis.taux + " %"} />
      </SystemGrid>
      <div style={{ marginTop: 8 }}>
        <div style={{ height: 4, background: "rgba(201,168,92,0.12)", borderRadius: 2, overflow: "hidden" }}>
          <div style={{ height: "100%", width: pct + "%", background: pct >= 100 ? "#1D9E75" : "rgba(201,168,92,0.7)", borderRadius: 2, transition: "width 0.3s" }} />
        </div>
        <p style={{ fontSize: 11, color: "var(--text-muted)", margin: "3px 0 0" }}>{sprint.objectif} $ obj · manque {kpis.manque} $</p>
      </div>
      {editing ? (
        <div style={{ marginTop: 10, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
          {([
            { key: "objectif" as keyof SprintActif, label: "Objectif $" },
            { key: "revenusEncaisses" as keyof SprintActif, label: "Encaisse $" },
            { key: "revenusAttente" as keyof SprintActif, label: "Attente $" },
            { key: "prospectsContactes" as keyof SprintActif, label: "Prospects" },
            { key: "clientsObtenus" as keyof SprintActif, label: "Clients" },
          ]).map(({ key, label }) => (
            <div key={key}>
              <p className="label-meta" style={{ fontSize: 10, marginBottom: 2 }}>{label}</p>
              <input type="number" min={0} value={ef[key] as number}
                onChange={(e) => setEf((f) => ({ ...f, [key]: Number(e.target.value) }))}
                style={{ width: "100%", padding: "4px 6px", fontSize: 13, borderRadius: 6, border: "1px solid rgba(201,168,92,0.3)", background: "var(--bg-main)", color: "var(--text-main)" }}
              />
            </div>
          ))}
          <div style={{ gridColumn: "1 / -1" }}>
            <button className="btn-primary" type="button" onClick={() => { onUpdate(ef); setEditing(false); }} style={{ width: "100%", padding: "6px" }}>Sauvegarder</button>
          </div>
        </div>
      ) : null}
    </SystemPanel>
  );
}

function CRMPanel({ prospects, onUpdate }: { prospects: Prospect[]; onUpdate: (p: Prospect[]) => void }) {
  const [open, setOpen] = useState(false);
  const [nv, setNv] = useState<Partial<Prospect>>({ statut: "a_contacter", montant: 0 });
  function ajouter() {
    if (nv.nom === undefined || nv.nom.trim() === "") return;
    onUpdate([{ id: genId(), nom: nv.nom, canal: nv.canal || "", offre: nv.offre || "", statut: nv.statut || "a_contacter", montant: nv.montant || 0, dateContact: new Date().toISOString().split("T")[0], encaisse: false }, ...prospects]);
    setNv({ statut: "a_contacter", montant: 0 });
    setOpen(false);
  }
  return (
    <SystemPanel ariaLabel="CRM" compact>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: open || prospects.length > 0 ? 8 : 0 }}>
        <p className="label-meta" style={{ margin: 0, fontSize: 12 }}>Prospects — {prospects.length} prospect{prospects.length > 1 ? "s" : ""}</p>
        <button className="soft-button" type="button" onClick={() => setOpen(open ? false : true)} style={{ fontSize: 11, padding: "2px 8px" }}>{open ? "Annuler" : "+ Ajouter"}</button>
      </div>
      {open ? (
        <div style={{ display: "grid", gap: 6, marginBottom: 8 }}>
          {[{ k: "nom", ph: "Nom *", t: "text" }, { k: "offre", ph: "Offre", t: "text" }, { k: "canal", ph: "Canal", t: "text" }, { k: "montant", ph: "Montant $", t: "number" }].map(({ k, ph, t }) => (
            <input key={k} type={t} placeholder={ph}
              value={t === "number" ? (nv[k as keyof Prospect] as number) || 0 : (nv[k as keyof Prospect] as string) || ""}
              onChange={(e) => setNv((prev) => ({ ...prev, [k]: t === "number" ? Number(e.target.value) : e.target.value }))}
              style={{ padding: "5px 8px", fontSize: 12, borderRadius: 6, border: "1px solid rgba(201,168,92,0.3)", background: "var(--bg-main)", color: "var(--text-main)", width: "100%" }}
            />
          ))}
          <button className="btn-primary" type="button" onClick={ajouter} style={{ padding: "5px", fontSize: 12 }}>Ajouter</button>
        </div>
      ) : null}
      {prospects.length > 0 ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
          {prospects.map((p) => {
            const st = STATUTS.find((s) => s.value === p.statut);
            return (
              <div key={p.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "5px 8px", background: "rgba(255,250,238,0.03)", border: "1px solid rgba(201,168,92,0.1)", borderRadius: 7 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ fontSize: 13, fontWeight: 600, color: "var(--text-main)" }}>{p.nom}</span>
                  {p.montant > 0 ? <span style={{ fontSize: 11, color: "var(--text-muted)" }}>{p.montant} $</span> : null}
                  <span style={{ fontSize: 10, padding: "1px 6px", borderRadius: 99, background: (st ? st.color : "#888") + "22", color: st ? st.color : "#888" }}>{st ? st.label : p.statut}</span>
                </div>
                <div style={{ display: "flex", gap: 4 }}>
                  <select value={p.statut} onChange={(e) => onUpdate(prospects.map((pr) => pr.id === p.id ? { ...pr, statut: e.target.value as StatutProspect } : pr))}
                    style={{ fontSize: 10, padding: "2px 4px", borderRadius: 4, border: "1px solid rgba(201,168,92,0.3)", background: "var(--bg-main)", color: "var(--text-main)" }}>
                    {STATUTS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
                  </select>
                  <button type="button" onClick={() => onUpdate(prospects.filter((pr) => pr.id !== p.id))} style={{ fontSize: 10, padding: "2px 5px", borderRadius: 4, border: "1px solid rgba(201,168,92,0.2)", background: "transparent", color: "var(--text-muted)", cursor: "pointer" }}>x</button>
                </div>
              </div>
            );
          })}
        </div>
      ) : null}
    </SystemPanel>
  );
}

function BibliothequeOffresPanel({ offres, onUpdate }: { offres: Offre[]; onUpdate: (o: Offre[]) => void }) {
  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState<Omit<Offre, "id">>(defaultOffre);

  const totalRevenu = offres.reduce((acc, o) => acc + o.prix * o.ventes, 0);
  const totalVentes = offres.reduce((acc, o) => acc + o.ventes, 0);
  const actives = offres.filter((o) => o.actif).length;

  function ouvrirAjout() {
    setEditId(null);
    setForm(defaultOffre);
    setOpen(true);
  }

  function ouvrirEdition(o: Offre) {
    setEditId(o.id);
    setForm({ nom: o.nom, prix: o.prix, description: o.description, canal: o.canal, ventes: o.ventes, actif: o.actif });
    setOpen(true);
  }

  function sauvegarder() {
    if (form.nom.trim() === "") return;
    if (editId !== null) {
      onUpdate(offres.map((o) => o.id === editId ? { ...o, ...form } : o));
    } else {
      onUpdate([{ id: genId(), ...form }, ...offres]);
    }
    setOpen(false);
    setEditId(null);
    setForm(defaultOffre);
  }

  function supprimer(id: string) {
    onUpdate(offres.filter((o) => o.id !== id));
  }

  function toggleActif(id: string) {
    onUpdate(offres.map((o) => o.id === id ? { ...o, actif: !o.actif } : o));
  }

  function incrementerVentes(id: string) {
    onUpdate(offres.map((o) => o.id === id ? { ...o, ventes: o.ventes + 1 } : o));
  }

  return (
    <SystemPanel ariaLabel="Bibliotheque offres" compact>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: offres.length > 0 ? 10 : 0 }}>
        <div>
          <p className="label-meta" style={{ margin: 0, fontSize: 12 }}>Offres</p>
          <p style={{ fontSize: 11, color: "var(--text-muted)", margin: "2px 0 0" }}>{offres.length} offre{offres.length > 1 ? "s" : ""} · {actives} active{actives > 1 ? "s" : ""}</p>
        </div>
        <button className="soft-button" type="button" onClick={ouvrirAjout} style={{ fontSize: 11, padding: "2px 8px" }}>+ Ajouter</button>
      </div>

      {offres.length > 0 ? (
        <SystemGrid gap={8} min={110}>
          <CompactMetric label="Revenu total" value={totalRevenu + " $"} />
          <CompactMetric label="Ventes totales" value={String(totalVentes)} />
          <CompactMetric label="Offres actives" value={String(actives)} />
        </SystemGrid>
      ) : null}

      {open ? (
        <div style={{ marginTop: 12, padding: "12px", background: "rgba(201,168,92,0.06)", borderRadius: 8, border: "1px solid rgba(201,168,92,0.18)" }}>
          <p className="label-meta" style={{ margin: "0 0 10px", fontSize: 12 }}>{editId !== null ? "Modifier l offre" : "Nouvelle offre"}</p>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 8 }}>
            <div style={{ gridColumn: "1 / -1" }}>
              <p className="label-meta" style={{ fontSize: 10, marginBottom: 3 }}>Nom *</p>
              <input type="text" placeholder="ex: Revision de CV" value={form.nom}
                onChange={(e) => setForm((f) => ({ ...f, nom: e.target.value }))}
                style={{ width: "100%", padding: "5px 8px", fontSize: 13, borderRadius: 6, border: "1px solid rgba(201,168,92,0.3)", background: "var(--bg-main)", color: "var(--text-main)" }}
              />
            </div>
            <div>
              <p className="label-meta" style={{ fontSize: 10, marginBottom: 3 }}>Prix ($)</p>
              <input type="number" min={0} value={form.prix}
                onChange={(e) => setForm((f) => ({ ...f, prix: Number(e.target.value) }))}
                style={{ width: "100%", padding: "5px 8px", fontSize: 13, borderRadius: 6, border: "1px solid rgba(201,168,92,0.3)", background: "var(--bg-main)", color: "var(--text-main)" }}
              />
            </div>
            <div>
              <p className="label-meta" style={{ fontSize: 10, marginBottom: 3 }}>Ventes realisees</p>
              <input type="number" min={0} value={form.ventes}
                onChange={(e) => setForm((f) => ({ ...f, ventes: Number(e.target.value) }))}
                style={{ width: "100%", padding: "5px 8px", fontSize: 13, borderRadius: 6, border: "1px solid rgba(201,168,92,0.3)", background: "var(--bg-main)", color: "var(--text-main)" }}
              />
            </div>
            <div style={{ gridColumn: "1 / -1" }}>
              <p className="label-meta" style={{ fontSize: 10, marginBottom: 3 }}>Canal principal</p>
              <input type="text" placeholder="ex: Facebook, reseau, LinkedIn" value={form.canal}
                onChange={(e) => setForm((f) => ({ ...f, canal: e.target.value }))}
                style={{ width: "100%", padding: "5px 8px", fontSize: 13, borderRadius: 6, border: "1px solid rgba(201,168,92,0.3)", background: "var(--bg-main)", color: "var(--text-main)" }}
              />
            </div>
            <div style={{ gridColumn: "1 / -1" }}>
              <p className="label-meta" style={{ fontSize: 10, marginBottom: 3 }}>Description (optionnel)</p>
              <textarea placeholder="Ce que tu livres, le delai, pour qui..." value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                style={{ width: "100%", padding: "5px 8px", fontSize: 12, borderRadius: 6, border: "1px solid rgba(201,168,92,0.3)", background: "var(--bg-main)", color: "var(--text-main)", minHeight: 60, resize: "vertical" }}
              />
            </div>
            <div style={{ gridColumn: "1 / -1", display: "flex", alignItems: "center", gap: 8 }}>
              <input type="checkbox" id="actif-check" checked={form.actif} onChange={(e) => setForm((f) => ({ ...f, actif: e.target.checked }))} />
              <label htmlFor="actif-check" style={{ fontSize: 12, color: "var(--text-soft)", cursor: "pointer" }}>Offre active</label>
            </div>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button className="btn-primary" type="button" onClick={sauvegarder} style={{ flex: 1, padding: "6px", fontSize: 13 }}>Sauvegarder</button>
            <button className="btn-ghost" type="button" onClick={() => { setOpen(false); setEditId(null); setForm(defaultOffre); }} style={{ padding: "6px 14px", fontSize: 13 }}>Annuler</button>
          </div>
        </div>
      ) : null}

      {offres.length > 0 ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 12 }}>
          {offres.map((o) => (
            <div key={o.id} style={{ padding: "10px 12px", background: o.actif ? "rgba(255,250,238,0.04)" : "rgba(255,255,255,0.01)", border: "1px solid " + (o.actif ? "rgba(201,168,92,0.18)" : "rgba(201,168,92,0.07)"), borderRadius: 8, opacity: o.actif ? 1 : 0.6 }}>
              <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 8, marginBottom: 8 }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                    <span style={{ fontSize: 14, fontWeight: 600, color: "var(--text-main)" }}>{o.nom}</span>
                    <span style={{ fontSize: 12, fontWeight: 500, color: "var(--text-soft)" }}>{o.prix} $</span>
                    {o.canal !== "" ? <span style={{ fontSize: 11, color: "var(--text-muted)" }}>{o.canal}</span> : null}
                    <span style={{ fontSize: 10, padding: "1px 7px", borderRadius: 99, background: o.actif ? "rgba(29,158,117,0.15)" : "rgba(136,135,128,0.15)", color: o.actif ? "#1D9E75" : "#888780", border: "1px solid " + (o.actif ? "rgba(29,158,117,0.3)" : "rgba(136,135,128,0.3)") }}>
                      {o.actif ? "Active" : "Inactive"}
                    </span>
                  </div>
                  {o.description !== "" ? <p style={{ fontSize: 11, color: "var(--text-muted)", margin: "4px 0 0", lineHeight: 1.5 }}>{o.description}</p> : null}
                </div>
                <div style={{ display: "flex", gap: 4, flexShrink: 0 }}>
                  <button type="button" onClick={() => ouvrirEdition(o)} style={{ fontSize: 10, padding: "2px 7px", borderRadius: 4, border: "1px solid rgba(201,168,92,0.3)", background: "transparent", color: "var(--text-soft)", cursor: "pointer" }}>Modifier</button>
                  <button type="button" onClick={() => toggleActif(o.id)} style={{ fontSize: 10, padding: "2px 7px", borderRadius: 4, border: "1px solid rgba(201,168,92,0.2)", background: "transparent", color: "var(--text-muted)", cursor: "pointer" }}>{o.actif ? "Desactiver" : "Activer"}</button>
                  <button type="button" onClick={() => supprimer(o.id)} style={{ fontSize: 10, padding: "2px 6px", borderRadius: 4, border: "1px solid rgba(216,90,48,0.3)", background: "transparent", color: "#D85A30", cursor: "pointer" }}>x</button>
                </div>
              </div>
              <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                <SystemGrid gap={8} min={100}>
                  <CompactMetric label="Ventes" value={String(o.ventes)} />
                  <CompactMetric label="Revenu genere" value={(o.prix * o.ventes) + " $"} />
                  <CompactMetric label="Prix unitaire" value={o.prix + " $"} />
                </SystemGrid>
                <button type="button" onClick={() => incrementerVentes(o.id)} title="Ajouter une vente" style={{ fontSize: 11, padding: "4px 10px", borderRadius: 6, border: "1px solid rgba(29,158,117,0.4)", background: "rgba(29,158,117,0.08)", color: "#1D9E75", cursor: "pointer", flexShrink: 0 }}>+1 vente</button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p style={{ fontSize: 13, color: "var(--text-muted)", margin: "10px 0 0" }}>Aucune offre encore. Ajoute ta premiere offre pour suivre tes ventes.</p>
      )}
    </SystemPanel>
  );
}

function CalculateurPanel({ calc, onUpdate }: { calc: CalcState; onUpdate: (c: CalcState) => void }) {
  const res = calculerResultats(calc);
  return (
    <SystemPanel ariaLabel="Calculateur" compact>
      <p className="label-meta" style={{ margin: "0 0 10px" }}>Faisabilite</p>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 12 }}>
        <div style={{ gridColumn: "1 / -1" }}>
          <p className="label-meta" style={{ fontSize: 10, marginBottom: 3 }}>Nom de l offre</p>
          <input type="text" placeholder="ex: Revision de CV" value={calc.offre}
            onChange={(e) => onUpdate({ ...calc, offre: e.target.value })}
            style={{ width: "100%", padding: "5px 8px", fontSize: 13, borderRadius: 6, border: "1px solid rgba(201,168,92,0.3)", background: "var(--bg-main)", color: "var(--text-main)" }}
          />
        </div>
        {([
          { key: "prix" as keyof CalcState, label: "Prix par vente ($)", min: 1 },
          { key: "taux" as keyof CalcState, label: "Taux conversion (%)", min: 1 },
          { key: "objectif" as keyof CalcState, label: "Objectif ($)", min: 1 },
          { key: "jours" as keyof CalcState, label: "Jours disponibles", min: 1 },
        ]).map(({ key, label, min }) => (
          <div key={key}>
            <p className="label-meta" style={{ fontSize: 10, marginBottom: 3 }}>{label}</p>
            <input type="number" min={min} value={calc[key] as number}
              onChange={(e) => onUpdate({ ...calc, [key]: Math.max(min, Number(e.target.value)) })}
              style={{ width: "100%", padding: "5px 8px", fontSize: 13, borderRadius: 6, border: "1px solid rgba(201,168,92,0.3)", background: "var(--bg-main)", color: "var(--text-main)" }}
            />
          </div>
        ))}
      </div>
      {res !== null ? (
        <div style={{ borderTop: "1px solid rgba(201,168,92,0.15)", paddingTop: 12 }}>
          <SystemGrid gap={8} min={110}>
            <CompactMetric label="Ventes requises" value={String(res.ventes)} />
            <CompactMetric label="Prospects" value={String(res.prospects)} />
            <CompactMetric label="Par jour" value={res.parJour + " / j"} />
          </SystemGrid>
          <div style={{ marginTop: 10, padding: "10px 12px", borderRadius: 8, background: res.faisable ? "rgba(29,158,117,0.1)" : "rgba(216,90,48,0.1)", border: "1px solid " + (res.faisable ? "rgba(29,158,117,0.3)" : "rgba(216,90,48,0.3)") }}>
            <span style={{ fontSize: 14, fontWeight: 700, color: res.faisable ? "#1D9E75" : "#D85A30" }}>{res.faisable ? "OUI — Faisable" : "NON — Irrealiste"}</span>
            <p style={{ fontSize: 12, color: "var(--text-soft)", margin: "4px 0 0" }}>{res.justification}</p>
          </div>
        </div>
      ) : null}
    </SystemPanel>
  );
}

function Mode500Panel({ mode500, onUpdate }: { mode500: Mode500State; onUpdate: (m: Mode500State) => void }) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [erreur, setErreur] = useState("");
  const [resultat, setResultat] = useState("");
  const [historique, setHistorique] = useState<PlanHistorique[]>([]);
  const [copiedId, setCopiedId] = useState("");
  const [confirmerEffacement, setConfirmerEffacement] = useState(false);

  useEffect(() => { setHistorique(lireLS<PlanHistorique[]>(FL_HISTORY, [])); }, []);

  function sauvegarderDansHistorique(contenu: string) {
    const resume = mode500.competences.slice(0, 60) + (mode500.competences.length > 60 ? "..." : "") + " — " + mode500.objectif + " $ / " + mode500.jours + "j";
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
    if (mode500.competences.trim() === "") { setErreur("Indique au moins une competence."); return; }
    setLoading(true); setErreur(""); setResultat("");
    const prompt = "Tu es un consultant en revenus freelance pour le marche quebecois francophone 2026. Mode verite brutale uniquement.\n\nPROFIL:\n- Objectif: " + mode500.objectif + " $ en " + mode500.jours + " jours\n- Competences: " + mode500.competences + "\n- Temps disponible: " + (mode500.tempsParJour || "non precise") + " par jour\n- Contexte: " + (mode500.contexte || "aucun contexte additionnel") + "\n\nReponds EXACTEMENT dans ce format avec ces balises:\n\n[ANALYSE]\nObjectif: " + mode500.objectif + " $ en " + mode500.jours + " jours\nDifficulte: (faible/moyenne/elevee)\nFaisabilite: (0-100%)\nRaison principale: (1 phrase brutale et honnete)\n[/ANALYSE]\n\n[OFFRES]\nOFFRE 1: (nom)\nPrix recommande: (montant $)\nDifficulte de vente: (faible/moyenne/elevee)\nVitesse de vente: (rapide/moyenne/lente)\nScore: (0-100)/100\nJustification: (1 phrase)\n\nOFFRE 2: (nom)\nPrix recommande: (montant $)\nDifficulte de vente: (faible/moyenne/elevee)\nVitesse de vente: (rapide/moyenne/lente)\nScore: (0-100)/100\nJustification: (1 phrase)\n\nOFFRE 3: (nom)\nPrix recommande: (montant $)\nDifficulte de vente: (faible/moyenne/elevee)\nVitesse de vente: (rapide/moyenne/lente)\nScore: (0-100)/100\nJustification: (1 phrase)\n[/OFFRES]\n\n[MATHS]\nOffre retenue: (nom)\nPrix: (montant $)\nVentes necessaires: (nombre)\nProspects necessaires: (nombre)\nProspects par jour: (nombre)\nRevenu projete si 10% conversion: (montant $)\nRevenu projete si 15% conversion: (montant $)\n[/MATHS]\n\n[PLAN]\nJ1: (3 actions concretes avec canaux precis)\nJ2: (3 actions concretes)\nJ3: (3 actions concretes)\nJ4: (3 actions concretes)\nJ5: (3 actions concretes)\n[/PLAN]\n\n[SCRIPTS]\nPREMIER CONTACT:\n(message pret a envoyer, ton humain, max 5 lignes)\n\nRELANCE:\n(message de suivi si pas de reponse apres 48h)\n\nFERMETURE:\n(message de conversion quand prospect est interesse)\n[/SCRIPTS]";
    try {
      const resp = await fetch("/api/agent", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ message: prompt }) });
      const data = await resp.json();
      if (resp.ok) {
        const contenu = data.result || "";
        setResultat(contenu);
        if (contenu.trim().length > 0) { sauvegarderDansHistorique(contenu); }
      } else { setErreur(data.error || "Erreur API"); }
    } catch (e) { setErreur(e instanceof Error ? e.message : "Erreur reseau"); }
    setLoading(false);
  }

  const sections = parseSections(resultat);

  return (
    <SystemPanel ariaLabel="Mode 500" compact>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div>
          <p className="label-meta" style={{ margin: 0, fontSize: 12 }}>Mode 500 $ en 5 jours</p>
          <p style={{ fontSize: 11, color: "var(--text-muted)", margin: "2px 0 0" }}>Plan complet genere par IA · {historique.length} plan{historique.length > 1 ? "s" : ""} sauvegarde{historique.length > 1 ? "s" : ""}</p>
        </div>
        <button className="soft-button" type="button" onClick={() => setOpen(open ? false : true)} style={{ fontSize: 11, padding: "2px 10px" }}>{open ? "Reduire" : "Ouvrir"}</button>
      </div>

      {open ? (
        <div style={{ marginTop: 14 }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 10 }}>
            <div>
              <p className="label-meta" style={{ fontSize: 10, marginBottom: 3 }}>Objectif ($)</p>
              <input type="number" min={1} value={mode500.objectif} onChange={(e) => onUpdate({ ...mode500, objectif: Number(e.target.value) })} style={{ width: "100%", padding: "5px 8px", fontSize: 13, borderRadius: 6, border: "1px solid rgba(201,168,92,0.3)", background: "var(--bg-main)", color: "var(--text-main)" }} />
            </div>
            <div>
              <p className="label-meta" style={{ fontSize: 10, marginBottom: 3 }}>Jours disponibles</p>
              <input type="number" min={1} max={30} value={mode500.jours} onChange={(e) => onUpdate({ ...mode500, jours: Number(e.target.value) })} style={{ width: "100%", padding: "5px 8px", fontSize: 13, borderRadius: 6, border: "1px solid rgba(201,168,92,0.3)", background: "var(--bg-main)", color: "var(--text-main)" }} />
            </div>
            <div style={{ gridColumn: "1 / -1" }}>
              <p className="label-meta" style={{ fontSize: 10, marginBottom: 3 }}>Competences disponibles *</p>
              <input type="text" placeholder="ex: redaction, revision, lettres formelles..." value={mode500.competences} onChange={(e) => onUpdate({ ...mode500, competences: e.target.value })} style={{ width: "100%", padding: "5px 8px", fontSize: 13, borderRadius: 6, border: "1px solid rgba(201,168,92,0.3)", background: "var(--bg-main)", color: "var(--text-main)" }} />
            </div>
            <div style={{ gridColumn: "1 / -1" }}>
              <p className="label-meta" style={{ fontSize: 10, marginBottom: 3 }}>Temps disponible par jour</p>
              <input type="text" placeholder="ex: 4h le matin, 2h le soir" value={mode500.tempsParJour} onChange={(e) => onUpdate({ ...mode500, tempsParJour: e.target.value })} style={{ width: "100%", padding: "5px 8px", fontSize: 13, borderRadius: 6, border: "1px solid rgba(201,168,92,0.3)", background: "var(--bg-main)", color: "var(--text-main)" }} />
            </div>
            <div style={{ gridColumn: "1 / -1" }}>
              <p className="label-meta" style={{ fontSize: 10, marginBottom: 3 }}>Contexte libre (optionnel)</p>
              <textarea placeholder="ex: zero client actif, reseau dormant, a Drummondville..." value={mode500.contexte} onChange={(e) => onUpdate({ ...mode500, contexte: e.target.value })} style={{ width: "100%", padding: "5px 8px", fontSize: 13, borderRadius: 6, border: "1px solid rgba(201,168,92,0.3)", background: "var(--bg-main)", color: "var(--text-main)", minHeight: 70, resize: "vertical" }} />
            </div>
          </div>
          <button className="btn-primary" type="button" onClick={generer} disabled={loading} style={{ width: "100%", padding: "8px", fontSize: 14 }}>{loading ? "Generation en cours..." : "Generer mon plan"}</button>
          {loading ? <div style={{ marginTop: 12, padding: "12px", background: "rgba(201,168,92,0.06)", borderRadius: 8, textAlign: "center" }}><p style={{ fontSize: 13, color: "var(--text-muted)", margin: 0 }}>Analyse en cours... (15 a 30 secondes)</p></div> : null}
          {erreur !== "" ? <div style={{ marginTop: 12, padding: "10px 12px", background: "rgba(216,90,48,0.08)", border: "1px solid rgba(216,90,48,0.3)", borderRadius: 8 }}><p style={{ fontSize: 13, color: "#D85A30", margin: 0 }}>{erreur}</p></div> : null}
          {sections.length > 0 ? (
            <div style={{ marginTop: 14, display: "flex", flexDirection: "column", gap: 10 }}>
              {sections.map((sec) => (
                <div key={sec.tag} style={{ borderRadius: 8, border: "1px solid " + sec.couleur + "33", overflow: "hidden" }}>
                  <div style={{ padding: "8px 12px", background: sec.couleur + "18", borderBottom: "1px solid " + sec.couleur + "22" }}><p style={{ fontSize: 12, fontWeight: 600, color: sec.couleur, margin: 0 }}>{sec.titre}</p></div>
                  <div style={{ padding: "10px 12px" }}><p style={{ fontSize: 13, color: "var(--text-soft)", lineHeight: 1.7, margin: 0, whiteSpace: "pre-wrap" }}>{sec.contenu}</p></div>
                </div>
              ))}
            </div>
          ) : null}
          {historique.length > 0 ? (
            <div style={{ marginTop: 18, borderTop: "1px solid rgba(201,168,92,0.15)", paddingTop: 14 }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
                <p className="label-meta" style={{ margin: 0, fontSize: 12 }}>Historique des plans ({historique.length})</p>
                {confirmerEffacement ? (
                  <div style={{ display: "flex", gap: 6 }}>
                    <button type="button" onClick={effacerTout} style={{ fontSize: 11, padding: "2px 8px", borderRadius: 4, border: "1px solid rgba(216,90,48,0.5)", background: "rgba(216,90,48,0.1)", color: "#D85A30", cursor: "pointer" }}>Confirmer</button>
                    <button type="button" onClick={() => setConfirmerEffacement(false)} style={{ fontSize: 11, padding: "2px 8px", borderRadius: 4, border: "1px solid rgba(201,168,92,0.2)", background: "transparent", color: "var(--text-muted)", cursor: "pointer" }}>Annuler</button>
                  </div>
                ) : (
                  <button type="button" onClick={() => setConfirmerEffacement(true)} style={{ fontSize: 11, padding: "2px 8px", borderRadius: 4, border: "1px solid rgba(201,168,92,0.2)", background: "transparent", color: "var(--text-muted)", cursor: "pointer" }}>Effacer tout</button>
                )}
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {historique.map((h) => (
                  <div key={h.id} style={{ padding: "10px 12px", background: "rgba(255,250,238,0.03)", border: "1px solid rgba(201,168,92,0.12)", borderRadius: 8 }}>
                    <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 8 }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ fontSize: 12, fontWeight: 600, color: "var(--text-main)", margin: "0 0 2px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{h.resume}</p>
                        <p style={{ fontSize: 11, color: "var(--text-muted)", margin: 0 }}>{formaterDate(h.date)}</p>
                      </div>
                      <div style={{ display: "flex", gap: 4, flexShrink: 0 }}>
                        <button type="button" onClick={() => setResultat(h.contenu)} style={{ fontSize: 11, padding: "2px 7px", borderRadius: 4, border: "1px solid rgba(29,158,117,0.4)", background: "rgba(29,158,117,0.08)", color: "#1D9E75", cursor: "pointer" }}>Recharger</button>
                        <button type="button" onClick={() => copierTexte(h.contenu, h.id)} style={{ fontSize: 11, padding: "2px 7px", borderRadius: 4, border: "1px solid rgba(201,168,92,0.3)", background: "transparent", color: "var(--text-soft)", cursor: "pointer" }}>{copiedId === h.id ? "Copie" : "Copier"}</button>
                        <button type="button" onClick={() => supprimerEntree(h.id)} style={{ fontSize: 11, padding: "2px 6px", borderRadius: 4, border: "1px solid rgba(216,90,48,0.3)", background: "transparent", color: "#D85A30", cursor: "pointer" }}>x</button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : null}
        </div>
      ) : null}
    </SystemPanel>
  );
}

export default function FreelancePage() {
  const [form, setForm] = useState<GhostwritingState>(defaultState);
  const [result, setResult] = useState("");
  const [clientResponse, setClientResponse] = useState("");
  const [generationError, setGenerationError] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [copied, setCopied] = useState(false);
  const [crCopied, setCrCopied] = useState(false);
  const [sprint, setSprint] = useState<SprintActif>(defaultSprint);
  const [prospects, setProspects] = useState<Prospect[]>([]);
  const [calc, setCalc] = useState<CalcState>(defaultCalc);
  const [mode500, setMode500] = useState<Mode500State>(defaultMode500);
  const [offres, setOffres] = useState<Offre[]>([]);
  const [taches, setTaches] = useState<Tache[]>([]);
  const [nouvelleTache, setNouvelleTache] = useState("");
  const qa = analyserProjet(form.clientText);

  useEffect(() => { setForm(lireSauvegarde()); }, []);
  useEffect(() => { localStorage.setItem(STORAGE_KEY, JSON.stringify(form)); }, [form]);
  useEffect(() => {
    setSprint(lireLS(FL_SPRINT, defaultSprint));
    setProspects(lireLS<Prospect[]>(FL_PROSPECTS, []));
    setCalc(lireLS(FL_CALC, defaultCalc));
    setMode500(lireLS(FL_MODE500, defaultMode500));
    setOffres(lireLS<Offre[]>(FL_OFFERS, []));
    setTaches(lireLS<Tache[]>(FL_TACHES, []));
  }, []);
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
    if (txt === "") { setGenerationError("Colle un texte avant de generer."); return; }
    setCopied(false); setGenerationError(""); setIsGenerating(true);
    try {
      const resp = await fetch("/api/agent", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ message: "Tu es un expert en ghostwriting narratif.\n\nMessage client :\n" + txt + "\n\nObjectif : " + (form.objectifs[0] || "clarifier") + "\nTon : " + (form.tons[0] || "professionnel") + "\nLongueur : " + (form.longueurs[0] || "moyen") + "\n\nGenere un texte humain et fluide." }) });
      const data = await resp.json();
      if (resp.ok) { setResult(data.result || ""); }
      else { setGenerationError(data.error || "Erreur generation"); }
    } catch (err) { setGenerationError(err instanceof Error ? err.message : "Erreur"); }
    setIsGenerating(false);
  }

  async function copier(text: string, setter: (v: boolean) => void) {
    await navigator.clipboard.writeText(text);
    setter(true);
    setTimeout(() => setter(false), 1400);
  }

  const kpis = calculerKPIs(sprint);
  const prevision = calculerPrevision(prospects);
  const relances = relancesProspects(prospects);

  return (
    <main className="internal-page freelance-saas">
      <style>
        {`
          .freelance-saas .panel {
            margin-bottom: 6px;
          }

          .fl-label {
            color: rgba(201,168,92,0.75);
            font-size: 9.5px;
            font-weight: 500;
            letter-spacing: 0.1em;
            margin: 0 0 4px;
            text-transform: uppercase;
          }

          .fl-command-row,
          .fl-pipeline-grid,
          .fl-options-row {
            display: grid;
            gap: 6px;
          }

          .fl-command-row {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }

          .fl-stack {
            display: flex;
            flex-direction: column;
            gap: 6px;
            min-width: 0;
          }

          .fl-pipeline-grid .panel {
            background: rgba(255,250,238,0.025) !important;
            border-color: rgba(201,168,92,0.12) !important;
            margin-bottom: 0 !important;
            padding: 8px !important;
          }

          .fl-generator-panel textarea {
            min-height: 76px !important;
          }

          @media (min-width: 860px) {
            .fl-command-row {
              grid-template-columns: repeat(8, minmax(0, 1fr));
            }

            .fl-pipeline-grid {
              grid-template-columns: repeat(3, minmax(0, 1fr));
            }

            .fl-options-row {
              grid-template-columns: repeat(3, minmax(0, 1fr));
            }
          }
        `}
      </style>

      <SystemPageShell maxWidth={1400}>
        <header className="internal-header" style={{ marginBottom: 8 }}>
          <BackLink label="Systeme" />
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 10 }}>
            <div>
              <p className="internal-kicker" style={{ marginBottom: 2 }}>MVP service</p>
              <h1 className="internal-title" style={{ fontSize: 26, fontStyle: "italic", marginBottom: 0 }}>Ghostwriting</h1>
            </div>
            <div style={{ display: "flex", gap: 20, alignItems: "baseline", flexWrap: "wrap" }}>
              <div style={{ textAlign: "right" }}>
                <p style={{ fontSize: 10, color: "var(--text-muted)", margin: "0 0 2px", textTransform: "uppercase", letterSpacing: "0.08em" }}>Objectif</p>
                <strong style={{ color: "var(--accent-gold)", fontFamily: "var(--font-serif)", fontSize: 22, lineHeight: 1 }}>{sprint.objectif} $</strong>
              </div>
              <div style={{ textAlign: "right" }}>
                <p style={{ fontSize: 10, color: "var(--text-muted)", margin: "0 0 2px", textTransform: "uppercase", letterSpacing: "0.08em" }}>Jours</p>
                <strong style={{ color: "var(--text-main)", fontFamily: "var(--font-serif)", fontSize: 22, lineHeight: 1 }}>{kpis.joursRestants}</strong>
              </div>
              <div style={{ textAlign: "right" }}>
                <p style={{ fontSize: 10, color: "var(--text-muted)", margin: "0 0 2px", textTransform: "uppercase", letterSpacing: "0.08em" }}>Manque</p>
                <strong style={{ color: kpis.manque === 0 ? "#1D9E75" : "var(--text-soft)", fontFamily: "var(--font-serif)", fontSize: 22, lineHeight: 1 }}>{kpis.manque} $</strong>
              </div>
            </div>
          </div>
        </header>

        <section style={{ marginBottom: 8 }}>
          <p className="fl-label">Command Center</p>
          <SystemPanel ariaLabel="Command Center" compact style={{ padding: "8px 10px" }}>
            <div className="fl-command-row">
              <CompactMetric label="Objectif" value={sprint.objectif + " $"} />
              <CompactMetric label="Encaisse" value={sprint.revenusEncaisses + " $"} />
              <CompactMetric label="Attente" value={sprint.revenusAttente + " $"} />
              <CompactMetric label="Manque" value={kpis.manque + " $"} />
              <CompactMetric label="Prospects" value={String(sprint.prospectsContactes)} />
              <CompactMetric label="Taux" value={kpis.taux + " %"} />
              <CompactMetric label="Jours restants" value={String(kpis.joursRestants)} />
              <CompactMetric label="Prevision" value={prevision + " $"} />
            </div>
            <div style={{ display: "grid", gap: 6, marginTop: 6 }}>
              <TachesDuJourPanel taches={taches} nouvelleTache={nouvelleTache} onNouvelleTache={setNouvelleTache} onUpdate={setTaches} />
              <div style={{ border: "1px solid rgba(201,168,92,0.12)", borderRadius: 8, padding: "7px 8px" }}>
                <p className="label-meta" style={{ fontSize: 10, margin: "0 0 5px" }}>Relances automatiques</p>
                {relances.length > 0 ? (
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
                    {relances.map((p) => (
                      <span key={p.id} style={{ background: "rgba(186,117,23,0.14)", border: "1px solid rgba(186,117,23,0.35)", borderRadius: 99, color: "#BA7517", fontSize: 11, padding: "2px 7px" }}>
                        ⚠ Relance J+{p.jours} · {p.nom}
                      </span>
                    ))}
                  </div>
                ) : (
                  <p style={{ color: "var(--text-muted)", fontSize: 12, margin: 0 }}>Aucune relance due.</p>
                )}
              </div>
            </div>
          </SystemPanel>
        </section>

        <SystemPanel ariaLabel="Pipeline" compact style={{ marginBottom: 8, padding: "9px 10px" }}>
          <p className="fl-label">Pipeline</p>
          <div className="fl-pipeline-grid">
            <section>
              <p className="fl-label">Prospects</p>
              <CRMPanel prospects={prospects} onUpdate={setProspects} />
            </section>
            <section>
              <p className="fl-label">Offres</p>
              <BibliothequeOffresPanel offres={offres} onUpdate={setOffres} />
            </section>
            <section>
              <p className="fl-label">Calculateur</p>
              <CalculateurPanel calc={calc} onUpdate={setCalc} />
            </section>
          </div>
        </SystemPanel>

        <section style={{ marginBottom: 8 }}>
          <p className="fl-label">Generateur client</p>
          <SystemPanel ariaLabel="Generateur client" compact style={{ padding: "9px 10px" }}>
            <div className="fl-generator-panel">
            <div style={{ alignItems: "center", display: "flex", flexWrap: "wrap", gap: 10, marginBottom: 6 }}>
              <span className="label-meta" style={{ margin: 0 }}>Complexite : <strong>{qa.complexite}</strong></span>
              <span className="label-meta" style={{ margin: 0 }}>Prix suggere : <strong>{qa.prix}</strong></span>
              <button className="btn-ghost" type="button" onClick={() => { setClientResponse("Voici ce que je te propose :\nUn texte narratif base sur ton histoire.\n\nDelai : 3 jours\nPrix : " + qa.prix); setCrCopied(false); }} style={{ marginLeft: "auto", padding: "4px 12px", fontSize: 12 }}>Reponse client</button>
            </div>
            {clientResponse !== "" ? (
              <div style={{ background: "rgba(201,168,92,0.06)", borderRadius: 8, marginBottom: 6, padding: "7px 9px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                  <span style={{ fontSize: 11, color: "var(--text-muted)" }}>Reponse client</span>
                  <button className="soft-button" type="button" onClick={() => copier(clientResponse, setCrCopied)} style={{ fontSize: 11 }}>{crCopied ? "Copie" : "Copier"}</button>
                </div>
                <p style={{ fontSize: 12, color: "var(--text-soft)", lineHeight: 1.6, margin: 0, whiteSpace: "pre-wrap" }}>{clientResponse}</p>
              </div>
            ) : null}
            <label className="label-meta" htmlFor="client-text">Texte du client</label>
            <textarea className="textarea-atelier" id="client-text" value={form.clientText}
              onChange={(e) => setForm((c) => ({ ...c, clientText: e.target.value }))}
              placeholder="Colle ici le texte ou l idee du client..."
              style={{ fontSize: 13, marginBottom: 8, minHeight: 76 }}
            />
            <div className="fl-options-row" style={{ marginBottom: 8 }}>
              {(["objectifs", "tons", "longueurs"] as OptionGroup[]).map((group) => (
                <div key={group}>
                    <p className="label-meta" style={{ marginBottom: 4, fontSize: 10.5 }}>
                    {group === "objectifs" ? "Objectif" : group === "tons" ? "Ton" : "Longueur"}
                  </p>
                  <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                    {options[group].map((value) => {
                      const on = form[group].includes(value);
                      return (
                        <button key={value} type="button" onClick={() => toggleOpt(group, value)}
                          style={{ padding: "4px 9px", fontSize: 10.5, borderRadius: 99, cursor: "pointer", background: on ? "rgba(201,168,92,0.25)" : "rgba(201,168,92,0.06)", border: on ? "1px solid rgba(201,168,92,0.6)" : "1px solid rgba(201,168,92,0.18)", color: on ? "var(--text-main)" : "var(--text-soft)", fontWeight: on ? 600 : 400 }}>
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
                {isGenerating ? "Generation..." : "Generer"}
              </button>
              {result !== "" ? <button className="btn-ghost" type="button" onClick={handleGenerate} disabled={isGenerating}>Regenerer</button> : null}
            </div>
            {generationError !== "" || result !== "" ? (
              <div style={{ background: "rgba(255,250,238,0.03)", border: "1px solid rgba(201,168,92,0.12)", borderRadius: 8, marginTop: 8, padding: "8px 10px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                  <p className="label-meta" style={{ margin: 0 }}>Resultat</p>
                  {result !== "" ? <button className="soft-button" type="button" onClick={() => copier(result, setCopied)} style={{ fontSize: 11 }}>{copied ? "Copie" : "Copier"}</button> : null}
                </div>
                {generationError !== ""
                  ? <p style={{ color: "#9f3a38", fontSize: 13, lineHeight: 1.6, margin: 0 }}>{generationError}</p>
                  : <p style={{ color: "var(--text-soft)", fontSize: 13, lineHeight: 1.7, margin: 0, whiteSpace: "pre-wrap" }}>{result}</p>
                }
              </div>
            ) : null}
            </div>
          </SystemPanel>
        </section>

        <section>
          <p className="fl-label">Mode 500 $</p>
          <Mode500Panel mode500={mode500} onUpdate={setMode500} />
        </section>
      </SystemPageShell>
    </main>
  );
}
