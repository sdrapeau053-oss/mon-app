"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";

type Frequence = "quotidien" | "hebdo" | "mensuel";
type TypeTache = "sol" | "cuisine" | "salle de bain" | "animaux" | "general";
type StatutTache = "non-fait" | "fait" | "reporte";

type TacheMenagere = {
  id: string;
  nom: string;
  zone: string;
  frequence: Frequence;
  type: TypeTache;
};

type TachesMenageresData = {
  personnes: string[];
  statuts: Record<string, StatutTache>;
};

type Assignment = {
  personne: string;
  taches: TacheMenagere[];
};

const STORAGE_KEY = "taches-menageres-data";

const personnesParDefaut = ["Sylvie", "Personne 2", "Personne 3"];

const tachesMenageres: TacheMenagere[] = [
  {
    id: "quotidien-aspirateur-zones-animaux",
    nom: "Aspirateur zones animaux",
    zone: "Zones animaux",
    frequence: "quotidien",
    type: "animaux",
  },
  {
    id: "quotidien-nettoyer-accidents-animaux",
    nom: "Nettoyer accidents animaux",
    zone: "Maison",
    frequence: "quotidien",
    type: "animaux",
  },
  {
    id: "quotidien-vaisselle",
    nom: "Vaisselle",
    zone: "Cuisine",
    frequence: "quotidien",
    type: "cuisine",
  },
  {
    id: "quotidien-surfaces-cuisine",
    nom: "Surfaces cuisine",
    zone: "Cuisine",
    frequence: "quotidien",
    type: "cuisine",
  },
  {
    id: "quotidien-nourrir-animaux",
    nom: "Nourrir animaux",
    zone: "Chats + chiens",
    frequence: "quotidien",
    type: "animaux",
  },
  {
    id: "quotidien-eau-animaux",
    nom: "Eau animaux",
    zone: "Chats + chiens",
    frequence: "quotidien",
    type: "animaux",
  },
  {
    id: "quotidien-verifier-litiere",
    nom: "Vérifier litière",
    zone: "Chats",
    frequence: "quotidien",
    type: "animaux",
  },
  {
    id: "hebdo-serpilliere",
    nom: "Serpillière",
    zone: "Sols",
    frequence: "hebdo",
    type: "sol",
  },
  {
    id: "hebdo-salle-de-bain-complete",
    nom: "Salle de bain complète",
    zone: "Salle de bain",
    frequence: "hebdo",
    type: "salle de bain",
  },
  {
    id: "hebdo-changer-draps",
    nom: "Changer draps",
    zone: "Chambres",
    frequence: "hebdo",
    type: "general",
  },
  {
    id: "hebdo-nettoyer-canape-poils",
    nom: "Nettoyer canapé (poils)",
    zone: "Salon",
    frequence: "hebdo",
    type: "animaux",
  },
  {
    id: "hebdo-escaliers",
    nom: "Escaliers",
    zone: "Escaliers",
    frequence: "hebdo",
    type: "sol",
  },
  {
    id: "mensuel-armoires-cuisine",
    nom: "Armoires cuisine",
    zone: "Cuisine",
    frequence: "mensuel",
    type: "cuisine",
  },
  {
    id: "mensuel-frigo-complet",
    nom: "Frigo complet",
    zone: "Cuisine",
    frequence: "mensuel",
    type: "cuisine",
  },
  {
    id: "mensuel-four",
    nom: "Four",
    zone: "Cuisine",
    frequence: "mensuel",
    type: "cuisine",
  },
  {
    id: "mensuel-murs",
    nom: "Murs",
    zone: "Maison",
    frequence: "mensuel",
    type: "general",
  },
  {
    id: "mensuel-plinthes",
    nom: "Plinthes",
    zone: "Maison",
    frequence: "mensuel",
    type: "general",
  },
];

function chargerDonnees(): TachesMenageresData {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);

    if (!saved) {
      return { personnes: personnesParDefaut, statuts: {} };
    }

    const parsed = JSON.parse(saved);

    return {
      personnes: Array.isArray(parsed.personnes) && parsed.personnes.length > 0
        ? parsed.personnes
        : personnesParDefaut,
      statuts: parsed.statuts || {},
    };
  } catch {
    return { personnes: personnesParDefaut, statuts: {} };
  }
}

function sauvegarderDonnees(data: TachesMenageresData) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

function getWeekIndex(date = new Date()): number {
  const firstDay = new Date(date.getFullYear(), 0, 1);
  const elapsedDays = Math.floor((date.getTime() - firstDay.getTime()) / 86400000);

  return Math.floor((elapsedDays + firstDay.getDay()) / 7);
}

function getAssignments(semaine: number, personnes: string[]): Assignment[] {
  const personnesActives = personnes.map((personne) => personne.trim()).filter(Boolean);

  if (personnesActives.length === 0) {
    return [];
  }

  const assignments = personnesActives.map((personne) => ({
    personne,
    taches: [] as TacheMenagere[],
  }));

  tachesMenageres.forEach((tache, index) => {
    const personneIndex = (index + semaine) % personnesActives.length;
    assignments[personneIndex].taches.push(tache);
  });

  return assignments;
}

function getStatusKey(semaine: number, tacheId: string) {
  return `week-${semaine}-${tacheId}`;
}

function getStatutLabel(statut: StatutTache) {
  if (statut === "fait") return "fait";
  if (statut === "reporte") return "reporté";
  return "non fait";
}

function getStatutCouleur(statut: StatutTache) {
  if (statut === "fait") return "#6f8f6a";
  if (statut === "reporte") return "#b08a48";
  return "#b56b5f";
}

export default function TachesMenageresPage() {
  const semaineActuelle = useMemo(() => getWeekIndex(), []);
  const [personnes, setPersonnes] = useState<string[]>(personnesParDefaut);
  const [statuts, setStatuts] = useState<Record<string, StatutTache>>({});
  const [nouvellePersonne, setNouvellePersonne] = useState("");

  useEffect(() => {
    const saved = chargerDonnees();
    setPersonnes(saved.personnes);
    setStatuts(saved.statuts);
  }, []);

  useEffect(() => {
    sauvegarderDonnees({ personnes, statuts });
  }, [personnes, statuts]);

  const assignments = useMemo(
    () => getAssignments(semaineActuelle, personnes),
    [semaineActuelle, personnes],
  );

  const totalTaches = tachesMenageres.length;
  const totalFaites = tachesMenageres.filter(
    (tache) => statuts[getStatusKey(semaineActuelle, tache.id)] === "fait",
  ).length;
  const totalRestantes = tachesMenageres.filter(
    (tache) => statuts[getStatusKey(semaineActuelle, tache.id)] !== "fait",
  ).length;

  function changerPersonne(index: number, valeur: string) {
    setPersonnes((current) => current.map((personne, i) => (i === index ? valeur : personne)));
  }

  function ajouterPersonne() {
    const nom = nouvellePersonne.trim();

    if (!nom) return;

    setPersonnes((current) => [...current, nom]);
    setNouvellePersonne("");
  }

  function supprimerPersonne(index: number) {
    setPersonnes((current) => {
      if (current.length <= 1) return current;
      return current.filter((_, i) => i !== index);
    });
  }

  function setStatutTache(tacheId: string, statut: StatutTache) {
    const key = getStatusKey(semaineActuelle, tacheId);
    setStatuts((current) => ({
      ...current,
      [key]: statut,
    }));
  }

  function toggleFait(tacheId: string, checked: boolean) {
    setStatutTache(tacheId, checked ? "fait" : "non-fait");
  }

  return (
    <main style={{ maxWidth: 1180, margin: "0 auto", padding: "32px 24px 56px" }}>
      <header style={{ marginBottom: 28 }}>
        <Link href="/" style={{ fontSize: 11, color: "var(--text-muted)" }}>← Tableau de bord</Link>
        <h1 style={{ fontSize: 28, fontStyle: "italic", color: "var(--primary)", margin: "8px 0 6px" }}>
          Tâches ménagères
        </h1>
        <p style={{ fontSize: 13, color: "var(--text-muted)", lineHeight: 1.7, maxWidth: 760 }}>
          Rotation hebdomadaire automatique, suivi par personne et logique animaux pour les chats et chiens.
          Les statuts sont sauvegardés localement avec la clé <strong>{STORAGE_KEY}</strong>.
        </p>
      </header>

      <section className="panel" style={{ marginBottom: 22 }}>
        <p className="label-meta">Semaine actuelle</p>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12 }}>
          <Metric label="Index semaine" value={String(semaineActuelle)} />
          <Metric label="Tâches complétées" value={`${totalFaites} / ${totalTaches}`} />
          <Metric label="Tâches restantes" value={String(totalRestantes)} />
          <Metric label="Progression globale" value={`${Math.round((totalFaites / totalTaches) * 100)} %`} />
        </div>
      </section>

      <section className="panel" style={{ marginBottom: 22 }}>
        <p className="label-meta">Liste des personnes</p>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 12 }}>
          {personnes.map((personne, index) => (
            <div key={`${personne}-${index}`} style={{ display: "flex", gap: 8 }}>
              <input
                className="search-input"
                value={personne}
                onChange={(event) => changerPersonne(index, event.target.value)}
                placeholder={`Personne ${index + 1}`}
                style={{ marginBottom: 0 }}
              />
              <button
                className="btn-ghost"
                type="button"
                onClick={() => supprimerPersonne(index)}
                disabled={personnes.length <= 1}
              >
                Retirer
              </button>
            </div>
          ))}
        </div>
        <div style={{ display: "flex", gap: 10, marginTop: 12 }}>
          <input
            className="search-input"
            value={nouvellePersonne}
            onChange={(event) => setNouvellePersonne(event.target.value)}
            placeholder="Ajouter une personne"
            style={{ marginBottom: 0 }}
          />
          <button className="btn-primary" type="button" onClick={ajouterPersonne}>
            Ajouter
          </button>
        </div>
      </section>

      <section className="panel">
        <p className="label-meta">Tableau de rotation</p>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 780 }}>
            <thead>
              <tr>
                <TableHeader>Personne</TableHeader>
                <TableHeader>Tâches assignées</TableHeader>
                <TableHeader>Statut</TableHeader>
              </tr>
            </thead>
            <tbody>
              {assignments.map((assignment) => {
                const tachesFaites = assignment.taches.filter(
                  (tache) => statuts[getStatusKey(semaineActuelle, tache.id)] === "fait",
                ).length;
                const tachesRestantes = assignment.taches.length - tachesFaites;
                const pourcentage = assignment.taches.length
                  ? Math.round((tachesFaites / assignment.taches.length) * 100)
                  : 0;

                return (
                  <tr key={assignment.personne} style={{ borderTop: "1px solid var(--border-soft)" }}>
                    <td style={{ padding: "16px 12px", verticalAlign: "top", width: 180 }}>
                      <strong style={{ color: "var(--text-main)" }}>{assignment.personne}</strong>
                      <p style={{ color: "var(--text-muted)", fontSize: 12, marginTop: 8 }}>
                        {pourcentage} % fait<br />
                        {tachesRestantes} restante{tachesRestantes > 1 ? "s" : ""}
                      </p>
                    </td>
                    <td style={{ padding: "16px 12px", verticalAlign: "top" }}>
                      <div style={{ display: "grid", gap: 10 }}>
                        {assignment.taches.map((tache) => {
                          const key = getStatusKey(semaineActuelle, tache.id);
                          const statut = statuts[key] || "non-fait";

                          return (
                            <article
                              className="chapter-card"
                              key={tache.id}
                              style={{
                                marginBottom: 0,
                                borderColor: statut === "non-fait" ? "rgba(181, 107, 95, 0.55)" : "var(--border-soft)",
                                background: statut === "non-fait" ? "#fff5f2" : "var(--bg-panel)",
                              }}
                            >
                              <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
                                <div>
                                  <h3 style={{ fontSize: 15, margin: "0 0 6px", color: "var(--text-main)" }}>
                                    {tache.nom}
                                  </h3>
                                  <p style={{ color: "var(--text-muted)", fontSize: 12, lineHeight: 1.6 }}>
                                    {tache.zone} · {tache.frequence} · {tache.type}
                                  </p>
                                </div>
                                <span
                                  style={{
                                    alignSelf: "flex-start",
                                    color: getStatutCouleur(statut),
                                    fontSize: 12,
                                    fontWeight: 700,
                                  }}
                                >
                                  {getStatutLabel(statut)}
                                </span>
                              </div>

                              <div style={{ display: "flex", gap: 12, alignItems: "center", marginTop: 12, flexWrap: "wrap" }}>
                                <label style={{ display: "flex", alignItems: "center", gap: 8, color: "var(--text-soft)", fontSize: 13 }}>
                                  <input
                                    type="checkbox"
                                    checked={statut === "fait"}
                                    onChange={(event) => toggleFait(tache.id, event.target.checked)}
                                  />
                                  Fait
                                </label>
                                <button
                                  className="btn-sm"
                                  type="button"
                                  onClick={() => setStatutTache(tache.id, "reporte")}
                                >
                                  Marquer reporté
                                </button>
                                {statut !== "non-fait" && (
                                  <button
                                    className="btn-ghost"
                                    type="button"
                                    onClick={() => setStatutTache(tache.id, "non-fait")}
                                  >
                                    Remettre non fait
                                  </button>
                                )}
                              </div>
                            </article>
                          );
                        })}
                      </div>
                    </td>
                    <td style={{ padding: "16px 12px", verticalAlign: "top", width: 170 }}>
                      <p style={{ color: "var(--text-main)", fontWeight: 600 }}>{pourcentage} %</p>
                      <p style={{ color: "var(--text-muted)", fontSize: 12, lineHeight: 1.7 }}>
                        {tachesFaites} faite{tachesFaites > 1 ? "s" : ""}<br />
                        {tachesRestantes} non faite{tachesRestantes > 1 ? "s" : ""}
                      </p>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="placement-cell">
      <p className="label-meta" style={{ marginBottom: 4 }}>{label}</p>
      <p style={{ color: "var(--text-main)", fontWeight: 700, fontSize: 16 }}>{value}</p>
    </div>
  );
}

function TableHeader({ children }: { children: React.ReactNode }) {
  return (
    <th style={{
      padding: "10px 12px",
      textAlign: "left",
      color: "var(--text-muted)",
      fontSize: 11,
      letterSpacing: 1.2,
      textTransform: "uppercase",
    }}>
      {children}
    </th>
  );
}
