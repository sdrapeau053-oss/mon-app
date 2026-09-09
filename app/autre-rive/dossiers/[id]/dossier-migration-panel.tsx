"use client";

import { useMemo, useState } from "react";
import { SystemPanel } from "@/components/system-ui";
import {
  addOrUpdateRelationDossier,
  adaptLegacyRelationDossierPartially,
  finalizeLegacyMigration,
  generateStableParticipantIds,
  type LegacyRelationDossierRecord,
  type RelationStatus,
  type RelationType,
} from "@/lib/autre-rive";

import type { LegacyDossierDetailData as LegacyRelationDossier } from "./dossier-data";

// Phase 4bis d'IMP-001 (SR-D-001, Décision 4) — confirmation minimale
// d'identité, seule façon de finaliser un dossier legacy en RelationDossier
// canonique. N'est PAS une entité métier Personne, PAS un carnet de
// contacts : les libellés saisis ici ne servent qu'à générer des
// identifiants locaux au dossier (voir lib/autre-rive/participant-identity)
// et ne sont persistés nulle part au-delà de ces identifiants.

const RELATION_TYPE_OPTIONS: { label: string; value: RelationType }[] = [
  { label: "Romantique", value: "romantic" },
  { label: "Familiale", value: "family" },
  { label: "Amicale", value: "friendship" },
  { label: "Professionnelle", value: "professional" },
  { label: "Autre", value: "other" },
];

const RELATION_STATUS_OPTIONS: { label: string; value: RelationStatus }[] = [
  { label: "Active", value: "active" },
  { label: "En pause", value: "paused" },
  { label: "Terminée", value: "ended" },
];

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
  minHeight: 36,
  padding: "7px 12px",
  textAlign: "center",
  whiteSpace: "nowrap",
} as const;

function relationTypeLabel(value: RelationType): string {
  return RELATION_TYPE_OPTIONS.find((option) => option.value === value)?.label ?? value;
}

function relationStatusLabel(value: RelationStatus): string {
  return RELATION_STATUS_OPTIONS.find((option) => option.value === value)?.label ?? value;
}

export function DossierMigrationPanel({
  legacyDossier,
  onMigrated,
}: {
  legacyDossier: LegacyRelationDossier;
  onMigrated: () => void;
}) {
  const [participantNames, setParticipantNames] = useState<string[]>([]);
  const [nameDraft, setNameDraft] = useState("");
  const [primaryIndex, setPrimaryIndex] = useState<number | null>(null);
  const [relationType, setRelationType] = useState<RelationType | "">("");
  const [status, setStatus] = useState<RelationStatus | "">("");
  const [error, setError] = useState("");

  // Identifiants déterministes : recalculés à chaque rendu à partir des
  // mêmes libellés dans le même ordre, donc strictement stables tant que la
  // liste de participants n'est pas modifiée par l'utilisatrice elle-même.
  const participantIds = useMemo(() => generateStableParticipantIds(participantNames), [participantNames]);

  const canConfirm =
    participantNames.length > 0 && primaryIndex !== null && relationType !== "" && status !== "";

  function addParticipant() {
    const trimmed = nameDraft.trim();
    if (!trimmed) return;

    setParticipantNames((current) => [...current, trimmed]);
    setNameDraft("");
    setError("");
  }

  function removeParticipant(index: number) {
    setParticipantNames((current) => current.filter((_, itemIndex) => itemIndex !== index));
    setPrimaryIndex((current) => {
      if (current === null || current === index) return null;
      return current > index ? current - 1 : current;
    });
  }

  function handleConfirm() {
    // Contrôles explicites (et non une relecture de `canConfirm`) : les
    // deux expressions mélangées dans une même condition perturbent la
    // narrowing de TypeScript sur relationType/status et produisent de faux
    // positifs de type. Ce sont volontairement les mêmes règles que
    // `canConfirm`, réécrites indépendamment.
    if (participantNames.length === 0 || primaryIndex === null || relationType === "" || status === "") {
      return;
    }

    try {
      // LegacyRelationDossierRecord traite chaque champ comme `unknown` et
      // les revalide au moment de la lecture (voir legacy-adapter.ts) : ce
      // dossier local, déjà chargé et affiché à l'écran, est une source de
      // confiance équivalente à ce que lirait directement le stockage.
      const adaptation = adaptLegacyRelationDossierPartially(legacyDossier as unknown as LegacyRelationDossierRecord);
      const finalDossier = finalizeLegacyMigration(adaptation, {
        relationType,
        status,
        participantIds,
        primaryUserParticipantId: participantIds[primaryIndex],
      });

      const saved = addOrUpdateRelationDossier(finalDossier);
      if (!saved) {
        setError("La sauvegarde a échoué. Réessayez.");
        return;
      }

      setError("");
      onMigrated();
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "Une erreur est survenue pendant la migration.");
    }
  }

  return (
    <SystemPanel ariaLabel="Confirmer ce dossier" compact>
      <div style={{ display: "grid", gap: 12 }}>
        <div style={{ display: "grid", gap: 4 }}>
          <h2 style={{ color: "var(--text-main)", fontFamily: "var(--font-serif)", fontSize: 17, margin: 0 }}>
            Confirmer ce dossier
          </h2>
          <p className="editorial-body" style={{ margin: 0 }}>
            Ce dossier utilise encore l&apos;ancienne structure. Confirmez les informations
            ci-dessous pour le finaliser — rien n&apos;est choisi automatiquement à votre place.
          </p>
        </div>

        <div style={fieldStyle}>
          <span className="label-meta">Personnes impliquées</span>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            <input
              className="internal-control"
              onChange={(event) => setNameDraft(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  addParticipant();
                }
              }}
              placeholder="Ex. Julie"
              style={{ ...controlStyle, flex: "1 1 200px" }}
              value={nameDraft}
            />
            <button className="internal-button" onClick={addParticipant} style={buttonStyle} type="button">
              Ajouter
            </button>
          </div>

          {participantNames.length > 0 ? (
            <div style={{ display: "grid", gap: 6, marginTop: 4 }}>
              {participantNames.map((name, index) => (
                <div
                  key={`${name}-${index}`}
                  style={{
                    alignItems: "center",
                    background: "rgba(255,250,238,.035)",
                    border: "1px solid rgba(201,168,92,.16)",
                    borderRadius: 8,
                    display: "flex",
                    gap: 8,
                    justifyContent: "space-between",
                    padding: "6px 8px",
                  }}
                >
                  <label style={{ alignItems: "center", display: "flex", gap: 6, minWidth: 0 }}>
                    <input
                      checked={primaryIndex === index}
                      name="primary-participant"
                      onChange={() => setPrimaryIndex(index)}
                      type="radio"
                    />
                    <span style={{ color: "var(--text-main)", fontSize: 13, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {name}
                    </span>
                    <span className="label-meta" style={{ margin: 0 }}>· c&apos;est moi</span>
                  </label>
                  <button
                    aria-label={`Retirer ${name}`}
                    className="internal-button"
                    onClick={() => removeParticipant(index)}
                    style={{ ...buttonStyle, minHeight: 26, padding: "3px 8px" }}
                    type="button"
                  >
                    Retirer
                  </button>
                </div>
              ))}
            </div>
          ) : null}
        </div>

        <div style={fieldStyle}>
          <span className="label-meta">Type de relation</span>
          <select
            className="internal-control"
            onChange={(event) => setRelationType(event.target.value as RelationType | "")}
            style={controlStyle}
            value={relationType}
          >
            <option value="">Choisir un type</option>
            {RELATION_TYPE_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        <div style={fieldStyle}>
          <span className="label-meta">Statut</span>
          <select
            className="internal-control"
            onChange={(event) => setStatus(event.target.value as RelationStatus | "")}
            style={controlStyle}
            value={status}
          >
            <option value="">Choisir un statut</option>
            {RELATION_STATUS_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        {participantNames.length > 0 ? (
          <div
            style={{
              background: "rgba(255,250,238,.035)",
              border: "1px solid rgba(201,168,92,.22)",
              borderRadius: 8,
              display: "grid",
              gap: 4,
              padding: "8px 10px",
            }}
          >
            <span className="label-meta" style={{ margin: 0 }}>Avant de confirmer</span>
            <p className="editorial-body" style={{ margin: 0 }}>
              Personnes : {participantNames.join(", ")}.{" "}
              {primaryIndex !== null ? `Vous êtes : ${participantNames[primaryIndex]}.` : "Vous n'avez pas encore désigné qui vous êtes."}
            </p>
            <p className="editorial-body" style={{ margin: 0 }}>
              Type : {relationType ? relationTypeLabel(relationType) : "non choisi"} · Statut :{" "}
              {status ? relationStatusLabel(status) : "non choisi"}
            </p>
          </div>
        ) : null}

        {error ? <p style={{ color: "#d79a8f", fontSize: 12.5, margin: 0 }}>{error}</p> : null}

        <div>
          <button
            className="internal-button-primary"
            disabled={!canConfirm}
            onClick={handleConfirm}
            style={{ ...buttonStyle, opacity: canConfirm ? 1 : 0.5 }}
            type="button"
          >
            Confirmer et migrer
          </button>
        </div>
      </div>
    </SystemPanel>
  );
}
