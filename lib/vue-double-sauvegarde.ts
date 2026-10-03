// LIVRE-P1B — état de sauvegarde affiché par `/vue-double` et protection du
// texte non persisté au changement de chapitre.
//
// Gouvernance : STD-005 LIVRE-P1B-D2 (« Échec de l'archivage », « Échec de
// lecture de l'historique », « Changement de chapitre avec modifications non
// persistées »). Logique pure, sans React ni stockage : aucune persistance,
// aucun brouillon.

import { HistoriqueChapitreError } from "@/lib/manuscript-chapters-history";

// Issue d'une tentative de sauvegarde, traduite pour l'affichage.
export type IssueSauvegarde = { erreur: string | null; historiqueIndisponible: boolean };

export type EtatSauvegarde = {
  sauvegarde: boolean;
  erreur: string | null;
  historiqueIndisponible: boolean;
};

export const ETAT_SAUVEGARDE_INITIAL: EtatSauvegarde = { sauvegarde: true, erreur: null, historiqueIndisponible: false };

export function issueDepuisErreur(error: unknown): IssueSauvegarde {
  const quota = Boolean(error && typeof error === "object" && "estQuota" in error && (error as { estQuota?: boolean }).estQuota);
  if (quota) return { erreur: "stockage plein", historiqueIndisponible: false };
  if (error instanceof HistoriqueChapitreError) return { erreur: "historique indisponible", historiqueIndisponible: true };
  return { erreur: error instanceof Error ? error.message : "erreur inconnue", historiqueIndisponible: false };
}

// Exécute une sauvegarde et la traduit : un refus (exception) n'est jamais une
// réussite ; un repli READ-FAILURE est une réussite signalée.
export async function executerSauvegarde(
  sauvegarder: () => Promise<{ historiqueIndisponible: boolean }>,
): Promise<IssueSauvegarde> {
  try {
    const { historiqueIndisponible } = await sauvegarder();
    return { erreur: null, historiqueIndisponible };
  } catch (error) {
    return issueDepuisErreur(error);
  }
}

// Frappe : le texte n'est plus confirmé persisté ; un échec affiché reste affiché.
export function etatApresSaisie(etat: EtatSauvegarde): EtatSauvegarde {
  return { ...etat, sauvegarde: false };
}

// Un échec reste toujours visible ; une réussite n'est prise en compte que
// pour la frappe la plus récente.
export function etatApresIssue(etat: EtatSauvegarde, issue: IssueSauvegarde, estDerniereSaisie: boolean): EtatSauvegarde {
  if (issue.erreur) return { ...etat, sauvegarde: false, erreur: issue.erreur };
  if (!estDerniereSaisie) return etat;
  return { sauvegarde: true, erreur: null, historiqueIndisponible: issue.historiqueIndisponible };
}

export type TonSauvegarde = "erreur" | "avertissement" | "ok" | "en-cours";

export function libelleSauvegarde(etat: EtatSauvegarde): { texte: string; ton: TonSauvegarde } {
  if (etat.erreur) return { texte: `Non sauvegardé — ${etat.erreur}`, ton: "erreur" };
  if (!etat.sauvegarde) return { texte: "…", ton: "en-cours" };
  if (etat.historiqueIndisponible) return { texte: "Sauvegardé — historique indisponible", ton: "avertissement" };
  return { texte: "Sauvegardé", ton: "ok" };
}

// ─── Changement de chapitre (D2, option B) ──────────────────────────────────

// Après l'issue des sauvegardes en attente : confirmation requise si le texte
// courant n'est pas confirmé persisté (échec non résolu).
export function confirmationRequiseAvantChangement(etat: EtatSauvegarde): boolean {
  return etat.erreur !== null || !etat.sauvegarde;
}

export function messageConfirmationAbandon(titreChapitre: string, erreur: string | null): string {
  const cause = erreur ? ` (${erreur})` : "";
  return (
    `Les modifications du chapitre « ${titreChapitre} » ne sont pas sauvegardées${cause}.\n\n` +
    "Changer de chapitre abandonnera ces modifications non sauvegardées. Continuer ?"
  );
}

export type ResultatChangementChapitre = "change" | "annule";

// 1. termine (exécute et attend) toute sauvegarde programmée ou en cours ;
// 2. si le texte courant n'est pas confirmé persisté, demande une confirmation
//    explicite ; un refus laisse tout en place (aucun chargement) ;
// 3. sinon, ou sur confirmation explicite, change de chapitre.
export async function changerChapitreAvecProtection(deps: {
  terminerSauvegardes: () => Promise<void>;
  lireEtat: () => EtatSauvegarde;
  titreChapitreActuel: string;
  confirmer: (message: string) => boolean;
  changer: () => void;
}): Promise<ResultatChangementChapitre> {
  await deps.terminerSauvegardes();
  const etat = deps.lireEtat();
  if (confirmationRequiseAvantChangement(etat) && !deps.confirmer(messageConfirmationAbandon(deps.titreChapitreActuel, etat.erreur))) {
    return "annule";
  }
  deps.changer();
  return "change";
}
