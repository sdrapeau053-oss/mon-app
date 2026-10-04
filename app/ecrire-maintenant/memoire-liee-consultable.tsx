import type { MemoireNarrative } from "@/lib/memoire-narrative";

// LIVRE V1 — consultation en lecture seule d'une mémoire liée.
// `<details>` natif : ouvrir ou refermer ne déclenche aucun rendu React,
// aucun état, aucune écriture ; le brouillon de l'éditeur n'est pas touché.
// Le texte affiché est exactement `memoire.texte`, tel qu'enregistré.
export function MemoireLieeConsultable({ memoire }: { memoire: MemoireNarrative }) {
  const texteVide = memoire.texte.trim() === "";

  return (
    <details
      style={{
        background: "rgba(255, 250, 238, 0.035)",
        border: "1px solid rgba(201, 168, 92, 0.12)",
        borderRadius: 10,
        minWidth: 0,
        padding: "10px 12px",
      }}
    >
      <summary style={{ cursor: "pointer" }} title="Relire cette mémoire">
        <span style={{ color: "#f1e7d5", fontSize: 14, fontWeight: 650 }}>{memoire.titre}</span>
        <span className="editorial-body" style={{ display: "block", fontSize: 12.5, margin: "5px 0 0" }}>
          {memoire.ageApprox || memoire.periode} · intensité {memoire.intensite || "n/r"} · {memoire.statut}
        </span>
      </summary>

      <div style={{ borderTop: "1px solid rgba(201, 168, 92, 0.12)", marginTop: 10, paddingTop: 10 }}>
        {texteVide ? (
          <p className="editorial-body" style={{ fontSize: 13, fontStyle: "italic", margin: 0 }}>
            Aucun texte enregistré pour cette mémoire.
          </p>
        ) : (
          <p data-memoire-texte="" style={{ color: "#f1e7d5", fontSize: 14, lineHeight: 1.6, margin: 0, whiteSpace: "pre-wrap" }}>
            {memoire.texte}
          </p>
        )}
        {memoire.motifs && memoire.motifs.length > 0 && (
          <p className="editorial-body" style={{ fontSize: 12, margin: "8px 0 0" }}>
            Motifs : {memoire.motifs.join(", ")}
          </p>
        )}
        {memoire.personnesLiees && memoire.personnesLiees.length > 0 && (
          <p className="editorial-body" style={{ fontSize: 12, margin: "4px 0 0" }}>
            Personnes : {memoire.personnesLiees.join(", ")}
          </p>
        )}
      </div>
    </details>
  );
}
