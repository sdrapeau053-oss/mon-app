"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  StatusChip,
  SystemGrid,
  SystemPageShell,
  SystemPanel,
  SystemSectionHeader,
} from "@/components/system-ui";
import { BackLink } from "@/components/ui/back-link";

const STORAGE_KEY = "strate-roadmap-master";

type RoadmapStatus = "a-faire" | "en-cours" | "termine" | "abandonne";

type RoadmapItem = {
  createdAt: string;
  description: string;
  id: string;
  notes: string;
  priority: 1 | 2 | 3 | 4 | 5;
  status: RoadmapStatus;
  title: string;
};

const statusLabels: Record<RoadmapStatus, string> = {
  "a-faire": "À faire",
  "abandonne": "Abandonné",
  "en-cours": "En cours",
  termine: "Terminé",
};

const statusOrder: RoadmapStatus[] = ["en-cours", "a-faire", "termine", "abandonne"];

const defaultItems: RoadmapItem[] = [
  {
    createdAt: "2026-05-22",
    description: "Créer /roadmap comme source de vérité unique du projet avec statuts, notes et historique.",
    id: "bloc-0-roadmap-maitre",
    notes: "Phase A — essentiel. ✓ Terminé.",
    priority: 5,
    status: "termine",
    title: "BLOC 0 — Roadmap Maître",
  },
  {
    createdAt: "2026-05-22",
    description: "Centre décisionnel quotidien qui ne présente qu’une seule décision prioritaire.",
    id: "bloc-1-centre-intelligent",
    notes: "Phase A — essentiel. ✓ Terminé.",
    priority: 5,
    status: "termine",
    title: "BLOC 1 — Centre Intelligent",
  },
  {
    createdAt: "2026-05-22",
    description: "Fusionner le flux d’écriture dans /ecrire-maintenant : chapitre, mémoires, texte, audit rapide.",
    id: "bloc-2-ecrire-maintenant",
    notes: "Phase A — essentiel. ✓ Terminé.",
    priority: 5,
    status: "termine",
    title: "BLOC 2 — Écrire Maintenant",
  },
  {
    createdAt: "2026-05-22",
    description: "Reprendre exactement au même endroit : chapitre, section, paragraphe, scroll, date.",
    id: "bloc-3-continuite-manuscrit",
    notes: "Phase A — essentiel. ✓ Terminé.",
    priority: 5,
    status: "termine",
    title: "BLOC 3 — Continuité Manuscrit",
  },
  {
    createdAt: "2026-05-22",
    description: "Créer /guide-strate comme guide intégré pour savoir où aller selon le besoin.",
    id: "bloc-4-guide-utilisation-integre",
    notes: "Phase A — essentiel. ✓ Terminé.",
    priority: 5,
    status: "termine",
    title: "BLOC 4 — Guide d’utilisation intégré",
  },
  {
    createdAt: "2026-05-22",
    description: "Simplifier l’UX : doublons, pages similaires, modules inutiles, clics inutiles.",
    id: "bloc-5-consolidation-ux",
    notes: "Consolidation UX — audit sans suppression.",
    priority: 5,
    status: "en-cours",
    title: "BLOC 5 — Consolidation UX",
  },
  {
    createdAt: "2026-05-22",
    description: "Créer /tableau-auteur comme vue exécutive du manuscrit.",
    id: "bloc-6-tableau-auteur",
    notes: "Phase C — pilotage.",
    priority: 4,
    status: "a-faire",
    title: "BLOC 6 — Tableau Auteur",
  },
  {
    createdAt: "2026-05-22",
    description: "Ajouter un score global du tome dans Structure Tome 1.",
    id: "bloc-7-score-global-tome",
    notes: "Phase D — analyse avancée.",
    priority: 3,
    status: "a-faire",
    title: "BLOC 7 — Score Global du Tome",
  },
  {
    createdAt: "2026-05-22",
    description: "Détecter mots, expressions, débuts, fins et structures répétées.",
    id: "bloc-8-audit-anti-repetition-avance",
    notes: "Phase D — analyse avancée.",
    priority: 3,
    status: "a-faire",
    title: "BLOC 8 — Audit Anti-répétition Avancé",
  },
  {
    createdAt: "2026-05-22",
    description: "Créer /carte-strate pour visualiser l’architecture complète de l’application.",
    id: "bloc-9-carte-strate",
    notes: "Phase D — orientation.",
    priority: 3,
    status: "a-faire",
    title: "BLOC 9 — Carte STRATE",
  },
  {
    createdAt: "2026-05-22",
    description: "Créer /usage pour mesurer pages ouvertes, fréquence, dernière utilisation et pages jamais utilisées.",
    id: "bloc-10-observatoire-usage",
    notes: "Phase B — développer selon les faits.",
    priority: 4,
    status: "a-faire",
    title: "BLOC 10 — Observatoire d’Usage",
  },
  {
    createdAt: "2026-05-22",
    description: "Détecter routes inutilisées, composants orphelins, données obsolètes et anciennes sauvegardes.",
    id: "bloc-11-menage-automatique",
    notes: "Phase D — rapport seulement.",
    priority: 3,
    status: "a-faire",
    title: "BLOC 11 — Ménage Automatique",
  },
  {
    createdAt: "2026-05-22",
    description: "Créer un mode d’écriture profonde qui masque statistiques, audits et panneaux latéraux.",
    id: "bloc-12-mode-focus-absolu",
    notes: "Phase C — écriture profonde.",
    priority: 4,
    status: "a-faire",
    title: "BLOC 12 — Mode Focus Absolu",
  },
  {
    createdAt: "2026-05-22",
    description: "Créer un résumé hebdomadaire : écriture, chapitres, souvenirs, business, progression.",
    id: "bloc-13-rapport-hebdomadaire",
    notes: "Phase C — pilotage.",
    priority: 3,
    status: "a-faire",
    title: "BLOC 13 — Rapport Hebdomadaire",
  },
  {
    createdAt: "2026-05-22",
    description: "Créer /decisions pour conserver les décisions produit, UX, architecture, manuscrit et business.",
    id: "bloc-14-coffre-decisions",
    notes: "Phase B — éviter les retours en arrière.",
    priority: 4,
    status: "a-faire",
    title: "BLOC 14 — Coffre des Décisions",
  },
];

const emptyDraft = {
  description: "",
  notes: "",
  priority: 3 as RoadmapItem["priority"],
  title: "",
};

function readRoadmap(): RoadmapItem[] {
  if (typeof window === "undefined") return defaultItems;

  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
    if (!Array.isArray(parsed) || parsed.length === 0) return defaultItems;
    const byId = new Map([...defaultItems, ...parsed].map((item: RoadmapItem) => [item.id, item]));
    const merged = Array.from(byId.values()).map((item) => {
      if (item.id === "bloc-0-roadmap-maitre") {
        return { ...item, notes: "Phase A — essentiel. ✓ Terminé.", status: "termine" as RoadmapStatus };
      }
      if (item.id === "bloc-1-centre-intelligent") {
        return { ...item, notes: "Phase A — essentiel. ✓ Terminé.", status: "termine" as RoadmapStatus };
      }
      if (item.id === "bloc-2-ecrire-maintenant") {
        return { ...item, notes: "Phase A — essentiel. Prochain bloc à développer.", status: "en-cours" as RoadmapStatus };
      }
      if (item.id.startsWith("bloc-")) return { ...item, status: "a-faire" as RoadmapStatus };
      return item;
    });
    saveRoadmap(merged);
    return merged;
  } catch {
    return defaultItems;
  }
}

function saveRoadmap(items: RoadmapItem[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
}

function stars(priority: number) {
  return "★★★★★".slice(0, priority) + "☆☆☆☆☆".slice(0, 5 - priority);
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 70);
}

export default function RoadmapPage() {
  const [items, setItems] = useState<RoadmapItem[]>(defaultItems);
  const [draft, setDraft] = useState(emptyDraft);
  const [message, setMessage] = useState("");

  useEffect(() => {
    setItems(readRoadmap());
  }, []);

  const grouped = useMemo(
    () =>
      statusOrder.map((status) => ({
        items: items.filter((item) => item.status === status).sort((a, b) => b.priority - a.priority),
        status,
      })),
    [items],
  );

  function updateItems(updater: (current: RoadmapItem[]) => RoadmapItem[]) {
    setItems((current) => {
      const next = updater(current);
      saveRoadmap(next);
      return next;
    });
    setMessage("Roadmap mise à jour.");
  }

  function updateItem(id: string, patch: Partial<RoadmapItem>) {
    updateItems((current) => current.map((item) => (item.id === id ? { ...item, ...patch } : item)));
  }

  function addItem() {
    if (!draft.title.trim() || !draft.description.trim()) {
      setMessage("Ajoute un titre et une description.");
      return;
    }

    const item: RoadmapItem = {
      createdAt: new Date().toLocaleDateString("fr-CA"),
      description: draft.description.trim(),
      id: `${slugify(draft.title)}-${Date.now()}`,
      notes: draft.notes.trim(),
      priority: draft.priority,
      status: "a-faire",
      title: draft.title.trim(),
    };

    updateItems((current) => [item, ...current]);
    setDraft(emptyDraft);
  }

  return (
    <main className="internal-page">
      <SystemPageShell maxWidth={1180}>
        <header className="internal-header">
          <BackLink label="Centre" href="/centre-de-controle" />
          <p className="internal-kicker">Source de vérité projet</p>
          <h1 className="internal-title">Roadmap Maître STRATE</h1>
          <p className="internal-subtitle">
            Le registre local des blocs à faire, en cours, terminés ou abandonnés. Une seule feuille de route, sans dépendance externe.
          </p>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 10 }}>
            <Link className="internal-button" href="/guide-strate">
              Besoin d’aide ?
            </Link>
          </div>
        </header>

        <SystemPanel ariaLabel="Ajouter un bloc" compact>
          <SystemSectionHeader
            eyebrow="BLOC 0"
            title="Enregistrer un nouveau bloc"
            actions={message ? <StatusChip tone="success">{message}</StatusChip> : null}
          />
          <SystemGrid gap={10} min={220}>
            <label style={{ display: "grid", gap: 6 }}>
              <span className="label-meta">Titre</span>
              <input
                className="internal-control"
                onChange={(event) => setDraft((current) => ({ ...current, title: event.target.value }))}
                placeholder="BLOC 15 — Exemple"
                value={draft.title}
              />
            </label>
            <label style={{ display: "grid", gap: 6 }}>
              <span className="label-meta">Priorité</span>
              <select
                className="internal-control"
                onChange={(event) => setDraft((current) => ({ ...current, priority: Number(event.target.value) as RoadmapItem["priority"] }))}
                value={draft.priority}
              >
                {[5, 4, 3, 2, 1].map((priority) => (
                  <option key={priority} value={priority}>
                    {stars(priority)}
                  </option>
                ))}
              </select>
            </label>
          </SystemGrid>
          <SystemGrid gap={10} min={260}>
            <label style={{ display: "grid", gap: 6, marginTop: 10 }}>
              <span className="label-meta">Description</span>
              <textarea
                className="internal-control"
                onChange={(event) => setDraft((current) => ({ ...current, description: event.target.value }))}
                placeholder="Objectif, bénéfice, périmètre."
                rows={3}
                value={draft.description}
              />
            </label>
            <label style={{ display: "grid", gap: 6, marginTop: 10 }}>
              <span className="label-meta">Notes</span>
              <textarea
                className="internal-control"
                onChange={(event) => setDraft((current) => ({ ...current, notes: event.target.value }))}
                placeholder="Phase, contrainte, décision."
                rows={3}
                value={draft.notes}
              />
            </label>
          </SystemGrid>
          <button className="internal-button-primary" onClick={addItem} style={{ marginTop: 12 }} type="button">
            Enregistrer le bloc
          </button>
        </SystemPanel>

        <SystemGrid gap={14} min={250}>
          {grouped.map((group) => (
            <SystemPanel ariaLabel={statusLabels[group.status]} compact key={group.status}>
              <SystemSectionHeader title={`${statusLabels[group.status]} · ${group.items.length}`} />
              <div style={{ display: "grid", gap: 10 }}>
                {group.items.length === 0 ? (
                  <p className="editorial-body" style={{ margin: 0 }}>Aucun bloc ici.</p>
                ) : (
                  group.items.map((item) => (
                    <article
                      key={item.id}
                      style={{
                        background: "rgba(255, 250, 238, 0.035)",
                        border: "1px solid rgba(201, 168, 92, 0.12)",
                        borderRadius: 10,
                        display: "grid",
                        gap: 8,
                        padding: "10px 12px",
                      }}
                    >
                      <div>
                        <h2 style={{ color: "var(--text-main)", fontSize: 15, lineHeight: 1.25, margin: "0 0 5px" }}>{item.title}</h2>
                        <p className="editorial-body" style={{ fontSize: 12.5, margin: 0 }}>{item.description}</p>
                      </div>
                      <div style={{ alignItems: "center", display: "flex", flexWrap: "wrap", gap: 6 }}>
                        <StatusChip tone={item.priority >= 5 ? "warning" : "neutral"}>{stars(item.priority)}</StatusChip>
                        <StatusChip>{item.createdAt}</StatusChip>
                      </div>
                      <label style={{ display: "grid", gap: 5 }}>
                        <span className="label-meta">Statut</span>
                        <select
                          className="internal-control"
                          onChange={(event) => updateItem(item.id, { status: event.target.value as RoadmapStatus })}
                          value={item.status}
                        >
                          {statusOrder.map((status) => (
                            <option key={status} value={status}>
                              {statusLabels[status]}
                            </option>
                          ))}
                        </select>
                      </label>
                      <label style={{ display: "grid", gap: 5 }}>
                        <span className="label-meta">Notes</span>
                        <textarea
                          className="internal-control"
                          onBlur={(event) => updateItem(item.id, { notes: event.target.value })}
                          defaultValue={item.notes}
                          rows={3}
                        />
                      </label>
                    </article>
                  ))
                )}
              </div>
            </SystemPanel>
          ))}
        </SystemGrid>
      </SystemPageShell>
    </main>
  );
}
