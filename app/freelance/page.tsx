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

const FL_SPRINT = "strate_fl_sprint";
const FL_PROSPECTS = "strate_fl_prospects";
const STORAGE_KEY = "freelance-ghostwriting-last-input";
const defaultSprint: SprintActif = { objectif: 500, dateDebut: new Date().toISOString().split("T")[0], revenusEncaisses: 0, revenusAttente: 0, prospectsContactes: 0, clientsObtenus: 0 };
const defaultState: GhostwritingState = { clientText: "", objectifs: [], tons: [], longueurs: [] };
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

function SprintPanel({ sprint, onUpdate }: { sprint: SprintActif; onUpdate: (s: SprintActif) => void }) {
  const kpis = calculerKPIs(sprint);
  const [editing, setEditing] = useState(false);
  const [ef, setEf] = useState<SprintActif>(sprint);
  useEffect(() => { setEf(sprint); }, [sprint]);
  const pct = Math.min(100, kpis.prob);
  return (
    <SystemPanel ariaLabel="Sprint" compact>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
        <p className="label-meta" style={{ margin: 0, fontSize: 12 }}>Sprint · {kpis.joursRestants}j</p>
        <button className="soft-button" type="button" onClick={() => setEditing(editing ? false : true)} style={{ fontSize: 11, padding: "2px 8px" }}>
          {editing ? "Fermer" : "Modifier"}
        </button>
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
        <p className="label-meta" style={{ margin: 0, fontSize: 12 }}>CRM — {prospects.length} prospect{prospects.length > 1 ? "s" : ""}</p>
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
  const qa = analyserProjet(form.clientText);

  useEffect(() => { setForm(lireSauvegarde()); }, []);
  useEffect(() => { localStorage.setItem(STORAGE_KEY, JSON.stringify(form)); }, [form]);
  useEffect(() => {
    setSprint(lireLS(FL_SPRINT, defaultSprint));
    setProspects(lireLS<Prospect[]>(FL_PROSPECTS, []));
  }, []);
  useEffect(() => { ecrireLS(FL_SPRINT, sprint); }, [sprint]);
  useEffect(() => { ecrireLS(FL_PROSPECTS, prospects); }, [prospects]);

  function toggleOpt(group: OptionGroup, value: string) {
    setForm((c) => ({ ...c, [group]: c[group].includes(value) ? c[group].filter((i) => i !== value) : [value] }));
  }

  async function handleGenerate() {
    const txt = form.clientText.trim();
    if (txt === "") { setGenerationError("Colle un texte avant de generer."); return; }
    setCopied(false); setGenerationError(""); setIsGenerating(true);
    try {
      const resp = await fetch("/api/agent", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: "Tu es un expert en ghostwriting narratif.\n\nMessage client :\n" + txt + "\n\nObjectif : " + (form.objectifs[0] || "clarifier") + "\nTon : " + (form.tons[0] || "professionnel") + "\nLongueur : " + (form.longueurs[0] || "moyen") + "\n\nGenere un texte humain et fluide." }),
      });
      const data = await resp.json();
      if (resp.ok) { setResult(data.result || "Erreur generation"); }
      else { setGenerationError(data.error || "Erreur generation"); }
    } catch (err) { setGenerationError(err instanceof Error ? err.message : "Erreur"); }
    setIsGenerating(false);
  }

  async function copier(text: string, setter: (v: boolean) => void) {
    await navigator.clipboard.writeText(text);
    setter(true);
    setTimeout(() => setter(false), 1400);
  }

  return (
    <main className="internal-page">
      <SystemPageShell maxWidth={680}>
        <header className="internal-header">
          <BackLink label="Systeme" />
          <p className="internal-kicker">MVP service</p>
          <h1 className="internal-title" style={{ fontStyle: "italic" }}>Ghostwriting</h1>
        </header>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <SprintPanel sprint={sprint} onUpdate={setSprint} />
          <CRMPanel prospects={prospects} onUpdate={setProspects} />
        </div>

        <SystemPanel ariaLabel="Analyse" compact>
          <div style={{ display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap" }}>
            <span className="label-meta" style={{ margin: 0 }}>Complexite : <strong>{qa.complexite}</strong></span>
            <span className="label-meta" style={{ margin: 0 }}>Prix : <strong>{qa.prix}</strong></span>
            <button className="btn-ghost" type="button" onClick={() => { setClientResponse("Voici ce que je te propose :\nUn texte narratif base sur ton histoire.\n\nDelai : 3 jours\nPrix : " + qa.prix); setCrCopied(false); }} style={{ marginLeft: "auto", padding: "4px 12px", fontSize: 13 }}>Reponse client</button>
          </div>
          {clientResponse !== "" ? (
            <div style={{ marginTop: 10, padding: "10px 12px", background: "rgba(201,168,92,0.06)", borderRadius: 8 }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                <span style={{ fontSize: 12, color: "var(--text-muted)" }}>Reponse client</span>
                <button className="soft-button" type="button" onClick={() => copier(clientResponse, setCrCopied)} style={{ fontSize: 11 }}>{crCopied ? "Copie" : "Copier"}</button>
              </div>
              <p style={{ fontSize: 13, color: "var(--text-soft)", lineHeight: 1.6, margin: 0, whiteSpace: "pre-wrap" }}>{clientResponse}</p>
            </div>
          ) : null}
        </SystemPanel>

        <SystemPanel ariaLabel="Texte du client" compact>
          <label className="label-meta" htmlFor="client-text">Texte du client</label>
          <textarea className="textarea-atelier" id="client-text" value={form.clientText}
            onChange={(e) => setForm((c) => ({ ...c, clientText: e.target.value }))}
            placeholder="Colle ici le texte ou l idee du client..."
            style={{ fontSize: 14, minHeight: 100 }}
          />
        </SystemPanel>

        <SystemPanel ariaLabel="Options" compact>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {(["objectifs", "tons", "longueurs"] as OptionGroup[]).map((group) => (
              <div key={group}>
                <p className="label-meta" style={{ marginBottom: 5, fontSize: 11 }}>
                  {group === "objectifs" ? "Objectif" : group === "tons" ? "Ton" : "Longueur"}
                </p>
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                  {options[group].map((value) => {
                    const on = form[group].includes(value);
                    return (
                      <button key={value} type="button" onClick={() => toggleOpt(group, value)}
                        style={{ padding: "5px 12px", fontSize: 12, borderRadius: 99, cursor: "pointer", background: on ? "rgba(201,168,92,0.25)" : "rgba(201,168,92,0.06)", border: on ? "1px solid rgba(201,168,92,0.6)" : "1px solid rgba(201,168,92,0.18)", color: on ? "var(--text-main)" : "var(--text-soft)", fontWeight: on ? 600 : 400 }}>
                        {value}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </SystemPanel>

        <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
          <button className="btn-primary" type="button" onClick={handleGenerate} disabled={isGenerating} style={{ flex: 1 }}>
            {isGenerating ? "Generation..." : "Generer"}
          </button>
          {result !== "" ? <button className="btn-ghost" type="button" onClick={handleGenerate} disabled={isGenerating}>Regenerer</button> : null}
        </div>

        {generationError !== "" || result !== "" ? (
          <SystemPanel ariaLabel="Resultat" compact style={{ marginTop: 10 }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
              <p className="label-meta" style={{ margin: 0 }}>Resultat</p>
              {result !== "" ? <button className="soft-button" type="button" onClick={() => copier(result, setCopied)} style={{ fontSize: 11 }}>{copied ? "Copie" : "Copier"}</button> : null}
            </div>
            {generationError !== ""
              ? <p style={{ color: "#9f3a38", fontSize: 13, lineHeight: 1.6, margin: 0 }}>{generationError}</p>
              : <p style={{ color: "var(--text-soft)", fontSize: 13, lineHeight: 1.7, margin: 0, whiteSpace: "pre-wrap" }}>{result}</p>
            }
          </SystemPanel>
        ) : null}
      </SystemPageShell>
    </main>
  );
}
