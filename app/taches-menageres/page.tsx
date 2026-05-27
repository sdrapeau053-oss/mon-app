"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  CompactMetric,
  StateTile,
  StatusChip,
  SystemActionRow,
  SystemDividerBlock,
  SystemGrid,
  SystemInlineField,
  SystemPageShell,
  SystemPanel,
  SystemSectionHeader,
  SystemTable,
  SystemTableCell,
  SystemTableHeader,
  SystemTaskCard,
} from "@/components/system-ui";
import {
  emptyCentreQuickSettings,
  readCentreQuickSettings,
  readStoredOrchestratorState,
  type CentreQuickSettings,
  type SystemOrchestratorState,
} from "@/lib/system-orchestrator";

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

function compactValue(value: string, fallback = "Non renseigné") {
  return value.trim() || fallback;
}

export default function TachesMenageresPage() {
  const semaineActuelle = useMemo(() => getWeekIndex(), []);
  const [personnes, setPersonnes] = useState<string[]>(personnesParDefaut);
  const [statuts, setStatuts] = useState<Record<string, StatutTache>>({});
  const [nouvellePersonne, setNouvellePersonne] = useState("");
  const [systemState, setSystemState] = useState<SystemOrchestratorState | null>(null);
  const [quickSettings, setQuickSettings] = useState<CentreQuickSettings>(emptyCentreQuickSettings);

  useEffect(() => {
    const saved = chargerDonnees();
    setPersonnes(saved.personnes);
    setStatuts(saved.statuts);
    setSystemState(readStoredOrchestratorState());
    setQuickSettings(readCentreQuickSettings());
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
  const energy = compactValue(quickSettings.energie, systemState?.energie || "");
  const surcharge = systemState?.surcharge || "Basse";
  const priority = compactValue(quickSettings.priorite, systemState?.focusPriority || "");
  const nextAction = quickSettings.prochaineAction.trim();
  const shouldShowEssentialTasks = Boolean(systemState?.journeeDifficile) || surcharge === "Haute";

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
    <SystemPageShell>
      <header style={{ marginBottom: 28 }}>
        <Link href="/" style={{ fontSize: 11, color: "var(--text-muted)" }}>← Tableau de bord</Link>
        <h1 style={{ fontSize: 28, fontStyle: "italic", color: "var(--primary)", margin: "8px 0 6px" }}>
          Tâches ménagères
        </h1>
        <p style={{ fontSize: 13, color: "var(--text-muted)", lineHeight: 1.7, maxWidth: 760 }}>
          Rotation hebdomadaire automatique, suivi par personne et logique animaux pour les chats et chiens.
          Les statuts sont sauvegardés sur cet appareil.
        </p>
      </header>

      <SystemPanel ariaLabel="État du jour" compact>
        <SystemSectionHeader
          actions={(
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            <StatusChip tone={systemState?.modeFocus ? "warning" : "neutral"}>
              Focus {systemState?.modeFocus ? "actif" : "calme"}
            </StatusChip>
            <StatusChip tone={systemState?.journeeDifficile ? "warning" : "neutral"}>
              Journée {systemState?.journeeDifficile ? "difficile" : "standard"}
            </StatusChip>
          </div>
          )}
          eyebrow="Pilotage local"
          title="État du jour"
        />

        <div
          style={{
            display: "grid",
            gap: 8,
            gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
          }}
        >
          <StateTile label="Énergie" value={energy} />
          <StateTile label="Surcharge" value={surcharge} />
          <StateTile label="Priorité" value={priority} />
          {nextAction && <StateTile label="Prochaine action" value={nextAction} />}
        </div>

        {shouldShowEssentialTasks && (
          <SystemDividerBlock>
            <p className="label-meta" style={{ margin: "0 0 7px" }}>
              Tâches essentielles seulement
            </p>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 7 }}>
              <StatusChip>1 tâche courte</StatusChip>
              <StatusChip>1 tâche reportable</StatusChip>
              <StatusChip>Le reste peut attendre.</StatusChip>
            </div>
          </SystemDividerBlock>
        )}
      </SystemPanel>

      <SystemPanel>
        <p className="label-meta">Semaine actuelle</p>
        <SystemGrid>
          <CompactMetric label="Index semaine" value={String(semaineActuelle)} />
          <CompactMetric label="Tâches complétées" value={`${totalFaites} / ${totalTaches}`} />
          <CompactMetric label="Tâches restantes" value={String(totalRestantes)} />
          <CompactMetric label="Progression globale" value={`${Math.round((totalFaites / totalTaches) * 100)} %`} />
        </SystemGrid>
      </SystemPanel>

      <SystemPanel>
        <p className="label-meta">Liste des personnes</p>
        <SystemGrid min={220}>
          {personnes.map((personne, index) => (
            <SystemInlineField
              action={(
                <button
                  className="btn-ghost"
                  type="button"
                  onClick={() => supprimerPersonne(index)}
                  disabled={personnes.length <= 1}
                >
                  Retirer
                </button>
              )}
              key={`${personne}-${index}`}
            >
              <input
                className="search-input"
                value={personne}
                onChange={(event) => changerPersonne(index, event.target.value)}
                placeholder={`Personne ${index + 1}`}
                style={{ marginBottom: 0 }}
              />
            </SystemInlineField>
          ))}
        </SystemGrid>
        <SystemInlineField
          action={(
            <button className="btn-primary" type="button" onClick={ajouterPersonne}>
              Ajouter
            </button>
          )}
          offsetTop
        >
          <input
            className="search-input"
            value={nouvellePersonne}
            onChange={(event) => setNouvellePersonne(event.target.value)}
            placeholder="Ajouter une personne"
            style={{ marginBottom: 0 }}
          />
        </SystemInlineField>
      </SystemPanel>

      <SystemPanel>
        <p className="label-meta">Tableau de rotation</p>
        <SystemTable>
          <thead>
            <tr>
              <SystemTableHeader>Personne</SystemTableHeader>
              <SystemTableHeader>Tâches assignées</SystemTableHeader>
              <SystemTableHeader>Statut</SystemTableHeader>
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
                  <SystemTableCell width={180}>
                    <strong style={{ color: "var(--text-main)" }}>{assignment.personne}</strong>
                    <p style={{ color: "var(--text-muted)", fontSize: 12, marginTop: 8 }}>
                      {pourcentage} % fait<br />
                      {tachesRestantes} restante{tachesRestantes > 1 ? "s" : ""}
                    </p>
                  </SystemTableCell>
                  <SystemTableCell>
                    <div style={{ display: "grid", gap: 10 }}>
                      {assignment.taches.map((tache) => {
                        const key = getStatusKey(semaineActuelle, tache.id);
                        const statut = statuts[key] || "non-fait";

                        return (
                          <SystemTaskCard
                            key={tache.id}
                            meta={`${tache.zone} · ${tache.frequence} · ${tache.type}`}
                            statusColor={getStatutCouleur(statut)}
                            statusLabel={getStatutLabel(statut)}
                            title={tache.nom}
                            urgent={statut === "non-fait"}
                          >
                            <SystemActionRow>
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
                            </SystemActionRow>
                          </SystemTaskCard>
                        );
                      })}
                    </div>
                  </SystemTableCell>
                  <SystemTableCell width={170}>
                    <p style={{ color: "var(--text-main)", fontWeight: 600 }}>{pourcentage} %</p>
                    <p style={{ color: "var(--text-muted)", fontSize: 12, lineHeight: 1.7 }}>
                      {tachesFaites} faite{tachesFaites > 1 ? "s" : ""}<br />
                      {tachesRestantes} non faite{tachesRestantes > 1 ? "s" : ""}
                    </p>
                  </SystemTableCell>
                </tr>
              );
            })}
          </tbody>
        </SystemTable>
      </SystemPanel>
    </SystemPageShell>
  );
}
