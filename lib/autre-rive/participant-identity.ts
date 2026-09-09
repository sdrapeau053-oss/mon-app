// Phase 4bis d'IMP-001 (SR-D-001, Décision 4) — génération d'identifiants de
// participants pour la confirmation minimale d'identité d'un dossier.
//
// Ceci n'est PAS une entité métier Personne, PAS un carnet de contacts, PAS
// un registre global de participants. Les identifiants produits n'ont de
// sens que dans le contexte du dossier où ils sont générés, à partir des
// libellés saisis par l'utilisatrice au moment de la confirmation. Aucune
// donnée n'est persistée par ce module ; il ne fait que calculer des chaînes.
//
// Fonction pure et déterministe : les mêmes libellés, dans le même ordre,
// produisent toujours les mêmes identifiants — aucune valeur aléatoire ni
// horodatage n'entre dans leur calcul, pour qu'une réouverture du même
// formulaire avec les mêmes libellés ne génère jamais de nouveaux ids.

function slugifyParticipantLabel(label: string): string {
  const normalized = label
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  return normalized || "participant";
}

// Génère un identifiant stable par libellé, dans l'ordre fourni. Deux
// libellés qui se réduiraient au même identifiant de base au sein du même
// dossier (ex. deux personnes appelées "Julie") reçoivent un suffixe
// numérique pour rester distincts, sans jamais réutiliser un identifiant
// déjà attribué dans le même appel.
export function generateStableParticipantIds(labels: string[]): string[] {
  const occurrences = new Map<string, number>();

  return labels.map((label) => {
    const base = slugifyParticipantLabel(label);
    const occurrence = (occurrences.get(base) ?? 0) + 1;
    occurrences.set(base, occurrence);
    return occurrence === 1 ? base : `${base}-${occurrence}`;
  });
}
