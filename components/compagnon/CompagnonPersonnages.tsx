"use client";

import { useState } from "react";
import { SystemPanel, SystemSectionHeader } from "@/components/system-ui";
import type { CompagnonData } from "./CompagnonLayout";

function AbsenceBadge({ gap }: { gap: number }) {
  const color = gap >= 15 ? "#fca5a5" : gap >= 8 ? "#fcd34d" : "#9c8d73";
  const label = gap >= 15 ? "critique" : gap >= 8 ? "long" : "modéré";
  return (
    <span style={{ color, fontSize: 12, fontWeight: gap >= 8 ? 700 : 400 }}>
      {gap} ch. d'absence ({label})
    </span>
  );
}

function PresenceBar({
  chapitresPresents,
  totalChapitres,
}: {
  chapitresPresents: { numero: number; titre: string }[];
  totalChapitres: number;
}) {
  const max = Math.max(totalChapitres, 30);
  const positions = chapitresPresents.map((c) => c.numero);

  return (
    <div
      style={{
        background: "rgba(255,255,255,0.06)",
        borderRadius: 3,
        height: 8,
        overflow: "hidden",
        position: "relative",
        width: "100%",
      }}
    >
      {positions.map((pos) => (
        <div
          key={pos}
          style={{
            background: "#d6b25e",
            bottom: 0,
            position: "absolute",
            top: 0,
            width: "3px",
            left: `${Math.min(((pos - 1) / max) * 100, 99)}%`,
          }}
        />
      ))}
    </div>
  );
}

export function CompagnonPersonnages({ data }: { data: CompagnonData }) {
  const { personnages, tome1Chapters, memoires } = data;
  const [openNom, setOpenNom] = useState<string | null>(null);

  const totalChapitres = tome1Chapters.length;

  // Lier les mémoires aux personnages
  function getMemoiresForPersonnage(nom: string) {
    return memoires
      .filter((m) => (m.personnesLiees || []).some((p) => p.toLowerCase().includes(nom.toLowerCase())))
      .slice(0, 4);
  }

  return (
    <div style={{ display: "grid", gap: 16 }}>

      <SystemPanel ariaLabel="Présence des personnages">
        <SystemSectionHeader title="Présence des personnages" />

        {personnages.length === 0 ? (
          <p className="editorial-body" style={{ margin: 0 }}>
            Aucun personnage détecté dans le texte. Les personnages sont détectés automatiquement depuis les mémoires et les noms connus.
          </p>
        ) : (
          <div style={{ display: "grid", gap: 14 }}>
            {personnages.map((p) => (
              <div key={p.nom}>
                <button
                  onClick={() => setOpenNom(openNom === p.nom ? null : p.nom)}
                  style={{
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    display: "grid",
                    gap: 8,
                    padding: "0 0 8px",
                    textAlign: "left",
                    width: "100%",
                  }}
                  type="button"
                >
                  {/* Nom + badge */}
                  <div style={{ alignItems: "center", display: "flex", gap: 10, justifyContent: "space-between" }}>
                    <span style={{ color: "#f1e7d5", fontSize: 15, fontWeight: 600, textTransform: "capitalize" }}>
                      {p.nom}
                    </span>
                    <div style={{ alignItems: "center", display: "flex", flexShrink: 0, gap: 12 }}>
                      <span style={{ color: "#9c8d73", fontSize: 12 }}>
                        {p.chapitresPresents.length} ch.
                      </span>
                      {p.absenceMaximale > 0 && <AbsenceBadge gap={p.absenceMaximale} />}
                      <span style={{ color: "#9c8d73", fontSize: 11 }}>
                        {openNom === p.nom ? "▲" : "▼"}
                      </span>
                    </div>
                  </div>

                  {/* Barre de présence */}
                  <PresenceBar
                    chapitresPresents={p.chapitresPresents}
                    totalChapitres={totalChapitres}
                  />

                  {/* Chapitres en chips */}
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
                    {p.chapitresPresents.map((c) => (
                      <span
                        key={c.numero}
                        style={{
                          background: "rgba(214,178,94,0.08)",
                          border: "1px solid rgba(214,178,94,0.14)",
                          borderRadius: 20,
                          color: "#d7cab0",
                          fontSize: 11,
                          padding: "2px 8px",
                        }}
                      >
                        Ch. {c.numero}
                      </span>
                    ))}
                  </div>
                </button>

                {/* Détail dépliable */}
                {openNom === p.nom && (
                  <div
                    style={{
                      borderLeft: "2px solid rgba(214,178,94,0.18)",
                      marginBottom: 6,
                      paddingLeft: 14,
                    }}
                  >
                    {(() => {
                      const memoiresLiees = getMemoiresForPersonnage(p.nom);
                      return memoiresLiees.length > 0 ? (
                        <>
                          <p className="editorial-label" style={{ marginBottom: 8 }}>
                            Mémoires liées
                          </p>
                          {memoiresLiees.map((m) => (
                            <div
                              key={m.id}
                              style={{
                                borderBottom: "1px solid rgba(214,178,94,0.06)",
                                marginBottom: 6,
                                paddingBottom: 6,
                              }}
                            >
                              <p style={{ color: "#f1e7d5", fontSize: 13, fontWeight: 600, margin: "0 0 2px" }}>
                                {m.titre}
                              </p>
                              <p className="editorial-body" style={{ fontSize: 12, margin: 0 }}>
                                {m.periode} · intensité {m.intensite || "n/r"} · {m.statut}
                              </p>
                            </div>
                          ))}
                        </>
                      ) : (
                        <p className="editorial-body" style={{ fontSize: 12, margin: 0 }}>
                          Aucune mémoire explicitement liée à ce personnage.
                        </p>
                      );
                    })()}

                    {p.absenceMaximale >= 8 && (
                      <p style={{ color: "#fcd34d", fontSize: 12, margin: "8px 0 0" }}>
                        ⚠ Absence de {p.absenceMaximale} chapitres consécutifs — à vérifier intentionnellement.
                      </p>
                    )}

                    <p className="editorial-body" style={{ fontSize: 11, margin: "8px 0 0" }}>
                      Certitude : Moyenne — détection automatique dans le texte écrit.
                    </p>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        <p className="editorial-body" style={{ fontSize: 11, margin: "14px 0 0" }}>
          Détection automatique depuis les mémoires ({memoires.length} mémoires) et les noms connus.
          Certitude : Moyenne. Compléter les champs "Personnes liées" dans les mémoires pour améliorer la précision.
        </p>
      </SystemPanel>

    </div>
  );
}
