"use client";

import { useState } from "react";

import { SystemPanel } from "@/components/system-ui";
import type { NeedStatement, RelationDossier } from "@/lib/autre-rive";

import { formatDate } from "./dossier-data";
import {
  addExpressedNeedToDossier,
  confirmObservedNeedInDossier,
  correctNeedInDossier,
  rejectNeedInDossier,
} from "./needs-sync";

// Phase 9D — Intégration produit du cycle de vie des besoins (SR-D-001,
// Décision 4 §1, Décision 6 item Besoins). Composant contrôlé, même
// discipline que CriticalSafetyPanel (9A), AssessmentDisagreementPanel (9B)
// et CurrentAssessmentPanel (9C) : le dossier canonique est lu UNE SEULE
// fois par le parent (dossier-screen.tsx) et transmis en prop — jamais relu
// localement par un effet propre à ce panneau. Après toute action, ce
// composant appelle onChange() pour demander au parent de relire le dossier
// canonique — même choix qu'en 9A/9C plutôt qu'une propagation directe du
// dossier retourné par needs-sync.ts, pour garder un chemin de mise à jour
// unique et déjà vérifié immédiat (Phase 9C) à travers tous les panneaux de
// cet écran.
//
// N'affiche jamais aucune création ou confirmation automatique : aucun
// besoin n'est jamais ajouté, confirmé, corrigé ou rejeté par un effet ou au
// rendu — uniquement par un geste explicite (bouton) sur un texte que
// l'utilisatrice a elle-même saisi ou édité.
//
// Aucune donnée legacy (notes, journal, red/green flags) n'est lue ni
// transformée ici : ce panneau n'affiche et ne fait évoluer que
// dossier.needs, exclusivement.

const fieldStyle = { display: "grid", gap: 4 } as const;
const controlStyle = { boxSizing: "border-box", fontSize: 13, minHeight: 36, padding: "6px 10px", width: "100%" } as const;
const buttonStyle = {
  alignItems: "center",
  borderRadius: 999,
  display: "inline-flex",
  fontSize: 12.5,
  gap: 6,
  justifyContent: "center",
  lineHeight: 1,
  minHeight: 26,
  padding: "3px 8px",
  textAlign: "center",
  whiteSpace: "nowrap",
} as const;

function formatOriginLabel(origin: NeedStatement["origin"]): string {
  if (origin === "expressed") return "Exprimé";
  if (origin === "observed") return "Observé";
  if (origin === "user_confirmed") return "Confirmé par vous";
  return origin;
}

function formatStatusLabel(status: NeedStatement["status"]): string {
  if (status === "active") return "Actif";
  if (status === "inactive") return "Inactif";
  if (status === "evolving") return "Évolutif";
  if (status === "contradicted") return "Contredit";
  return status;
}

export function NeedsPanel({
  dossier,
  onChange,
}: {
  dossier: RelationDossier | null;
  onChange: () => void;
}) {
  const [newLabel, setNewLabel] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [editingNeedId, setEditingNeedId] = useState<string | null>(null);
  const [editLabel, setEditLabel] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [error, setError] = useState("");

  if (!dossier) {
    return (
      <SystemPanel ariaLabel="Besoins" compact>
        <p className="editorial-body" style={{ margin: 0 }}>
          Besoins disponibles une fois ce dossier confirmé.
        </p>
      </SystemPanel>
    );
  }

  // Capturé après la garde ci-dessus, même raison que dans les panneaux
  // précédents (9A, 9C) : TypeScript ne propage pas le rétrécissement dans
  // les fermetures ci-dessous.
  const activeDossierId = dossier.id;

  function handleAdd() {
    setError("");
    try {
      addExpressedNeedToDossier(activeDossierId, newLabel, newDescription || undefined);
      setNewLabel("");
      setNewDescription("");
      onChange();
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "Une erreur est survenue.");
    }
  }

  function handleConfirm(needId: string) {
    setError("");
    confirmObservedNeedInDossier(activeDossierId, needId);
    onChange();
  }

  function startEditing(need: NeedStatement) {
    setError("");
    setEditingNeedId(need.id);
    setEditLabel(need.label);
    setEditDescription(need.description || "");
  }

  function cancelEditing() {
    setEditingNeedId(null);
    setEditLabel("");
    setEditDescription("");
  }

  function handleSubmitCorrection(needId: string) {
    setError("");
    try {
      correctNeedInDossier(activeDossierId, needId, {
        label: editLabel,
        description: editDescription || undefined,
      });
      cancelEditing();
      onChange();
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "Une erreur est survenue.");
    }
  }

  function handleReject(needId: string) {
    setError("");
    rejectNeedInDossier(activeDossierId, needId);
    onChange();
  }

  // Un besoin est "historique" (non actionnable) dès qu'un autre besoin le
  // supersède — indépendamment de son propre statut, jamais modifié
  // rétroactivement (SR-D-001, Décision 4 §1).
  const supersededIds = new Set(
    dossier.needs.filter((need) => need.supersedesNeedId).map((need) => need.supersedesNeedId as string),
  );
  const needsById = new Map(dossier.needs.map((need) => [need.id, need]));
  const sortedNeeds = [...dossier.needs].sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  return (
    <SystemPanel ariaLabel="Besoins" compact>
      <div style={{ display: "grid", gap: 14 }}>
        <div style={{ display: "grid", gap: 4 }}>
          <h3 style={{ color: "var(--text-main)", fontFamily: "var(--font-serif)", fontSize: 15, margin: 0 }}>
            Besoins
          </h3>
          <p className="editorial-body" style={{ margin: 0 }}>
            Ajoutez un besoin dans vos propres mots. Un besoin observé ne devient confirmé que si vous le confirmez
            explicitement.
          </p>
        </div>

        {sortedNeeds.length === 0 ? (
          <p className="label-meta" style={{ margin: 0 }}>Aucun besoin historisé pour ce dossier.</p>
        ) : (
          <div style={{ display: "grid", gap: 6 }}>
            {sortedNeeds.map((need) => {
              const isHead = !supersededIds.has(need.id);
              const previous = need.supersedesNeedId ? needsById.get(need.supersedesNeedId) : undefined;
              const isEditing = editingNeedId === need.id;

              return (
                <div
                  key={need.id}
                  style={{
                    background: "rgba(255,250,238,.035)",
                    border: "1px solid rgba(201,168,92,.16)",
                    borderRadius: 8,
                    display: "grid",
                    gap: 6,
                    opacity: isHead ? 1 : 0.6,
                    padding: "8px 10px",
                  }}
                >
                  <div style={{ alignItems: "center", display: "flex", flexWrap: "wrap", gap: 8, justifyContent: "space-between" }}>
                    <span className="label-meta" style={{ margin: 0 }}>
                      {formatOriginLabel(need.origin)} · {formatStatusLabel(need.status)} · {formatDate(need.createdAt)}
                      {!isHead ? " · historique" : ""}
                    </span>
                  </div>

                  {isEditing ? (
                    <div style={{ display: "grid", gap: 6 }}>
                      <label style={fieldStyle}>
                        <span className="label-meta">Texte du besoin</span>
                        <input onChange={(e) => setEditLabel(e.target.value)} style={controlStyle} value={editLabel} />
                      </label>
                      <label style={fieldStyle}>
                        <span className="label-meta">Détail (optionnel)</span>
                        <textarea onChange={(e) => setEditDescription(e.target.value)} rows={2} style={controlStyle} value={editDescription} />
                      </label>
                      <div style={{ display: "flex", gap: 8 }}>
                        <button className="internal-button-primary" onClick={() => handleSubmitCorrection(need.id)} style={buttonStyle} type="button">
                          Enregistrer la correction
                        </button>
                        <button className="internal-button" onClick={cancelEditing} style={buttonStyle} type="button">
                          Annuler
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <p className="editorial-body" style={{ margin: 0 }}>{need.label}</p>
                      {need.description ? (
                        <p className="editorial-body" style={{ margin: 0 }}>{need.description}</p>
                      ) : null}
                      {previous ? (
                        <p className="label-meta" style={{ margin: 0 }}>Remplace : « {previous.label} »</p>
                      ) : null}

                      {isHead && need.status !== "inactive" ? (
                        <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                          {need.origin === "observed" ? (
                            <button className="internal-button" onClick={() => handleConfirm(need.id)} style={buttonStyle} type="button">
                              Confirmer
                            </button>
                          ) : null}
                          <button className="internal-button" onClick={() => startEditing(need)} style={buttonStyle} type="button">
                            Corriger
                          </button>
                          <button className="internal-button" onClick={() => handleReject(need.id)} style={buttonStyle} type="button">
                            Rejeter
                          </button>
                        </div>
                      ) : null}
                    </>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {error ? <p style={{ color: "#d79a8f", fontSize: 12.5, margin: 0 }}>{error}</p> : null}

        <div style={{ display: "grid", gap: 6 }}>
          <label style={fieldStyle}>
            <span className="label-meta">Nouveau besoin exprimé</span>
            <input
              onChange={(e) => setNewLabel(e.target.value)}
              placeholder="Écrivez ce dont vous avez besoin, dans vos mots."
              style={controlStyle}
              value={newLabel}
            />
          </label>
          <label style={fieldStyle}>
            <span className="label-meta">Détail (optionnel)</span>
            <textarea
              onChange={(e) => setNewDescription(e.target.value)}
              rows={2}
              style={controlStyle}
              value={newDescription}
            />
          </label>
          <div>
            <button
              className="internal-button-primary"
              disabled={!newLabel.trim()}
              onClick={handleAdd}
              style={{ ...buttonStyle, opacity: newLabel.trim() ? 1 : 0.5 }}
              type="button"
            >
              Ajouter un besoin exprimé
            </button>
          </div>
        </div>
      </div>
    </SystemPanel>
  );
}
