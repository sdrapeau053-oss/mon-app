import type { ModuleEntry, SystemModuleConfig } from "@/app/components/SystemModulePage";

function valeur(entry: ModuleEntry, key: string): string {
  return entry.values[key]?.toLowerCase() || "";
}

function analyseTravail(entry: ModuleEntry): string[] {
  const statut = valeur(entry, "statut");
  const urgence = valeur(entry, "urgence");
  const revenu = valeur(entry, "revenu");
  const analyse = ["Vérifie la prochaine action concrète et le livrable attendu."];

  if (urgence.includes("urgent") || urgence.includes("élev")) {
    analyse.push("Priorité haute : clarifier le périmètre avant d’accepter plus de charge.");
  }

  if (revenu && Number(revenu) === 0) {
    analyse.push("Revenu non confirmé : transformer cette entrée en tâche de cadrage ou de relance.");
  }

  if (statut.includes("à faire")) {
    analyse.push("Action ouverte : bloque un moment précis pour avancer.");
  }

  return analyse;
}

function analyseInterieure(entry: ModuleEntry): string[] {
  const intensite = Number(entry.values.intensite || 0);
  const emotion = valeur(entry, "emotion");
  const action = valeur(entry, "action");
  const analyse = ["Observe ce qui est factuel avant de décider quoi faire."];

  if (intensite >= 7) {
    analyse.push("Intensité élevée : ralentir avant d’agir ou de répondre.");
  }

  if (emotion.includes("colère") || emotion.includes("peur")) {
    analyse.push("Émotion activante : cherche le besoin associé avant l’action.");
  }

  if (action.includes("envoyer") || action.includes("appeler")) {
    analyse.push("Action relationnelle : vérifier le risque de réaction impulsive.");
  }

  return analyse;
}

function analyseMaison(entry: ModuleEntry): string[] {
  const statut = valeur(entry, "statut");
  const responsable = valeur(entry, "responsable");
  const analyse = ["Rendre visible la responsabilité et la prochaine étape."];

  if (!responsable) {
    analyse.push("Responsable non défini : risque que la tâche reste floue.");
  }

  if (statut.includes("reporté")) {
    analyse.push("Tâche reportée : décider si elle doit être planifiée, déléguée ou retirée.");
  }

  return analyse;
}

function analyseCrise(entry: ModuleEntry): string[] {
  const gravite = valeur(entry, "gravite");
  const risque = valeur(entry, "risque");
  const action = valeur(entry, "action");
  const analyse = [
    "Priorité : sécurité, limite claire, retour au calme, puis suivi après l’événement.",
    "Éviter toute violence, humiliation, menace ou punition excessive.",
  ];

  if (gravite.includes("critique") || gravite.includes("élevé")) {
    analyse.push("Niveau élevé : réduire les stimulations, assurer la sécurité et demander du soutien si nécessaire.");
  }

  if (risque) {
    analyse.push("Risque identifié : agir uniquement sur ce qui protège maintenant.");
  }

  if (!action) {
    analyse.push("Action immédiate manquante : choisir une action simple, calme et réalisable.");
  }

  return analyse;
}

export const systemModuleConfigs: Record<string, SystemModuleConfig> = {
  freelance: {
    title: "Freelance",
    subtitle: "Suivre les demandes clients, les missions, les revenus et les tâches business.",
    storageKey: "system-freelance",
    analysisTitle: "Lecture business",
    analyze: analyseTravail,
    fields: [
      { key: "demande", label: "Demande client", placeholder: "Décris la demande, le contexte ou le message reçu." },
      { key: "mission", label: "Mission", placeholder: "Type de mission, livrable, périmètre." },
      { key: "revenu", label: "Revenus", placeholder: "Montant prévu ou encaissé.", type: "text" },
      { key: "urgence", label: "Urgence", placeholder: "Faible, moyenne, élevée, urgent.", type: "text" },
      { key: "statut", label: "Tâches business", placeholder: "À faire, en cours, relance, terminé." },
    ],
  },
  monLivre: {
    title: "Mon livre",
    subtitle: "Organiser les fragments, chapitres, analyses et décisions de structure du manuscrit.",
    storageKey: "system-mon-livre",
    analysisTitle: "Lecture manuscrit",
    fields: [
      { key: "fragment", label: "Fragment", placeholder: "Fragment, scène ou note de manuscrit." },
      { key: "chapitre", label: "Chapitre", placeholder: "Chapitre ou emplacement pressenti.", type: "text" },
      { key: "analyse", label: "Analyse", placeholder: "Ce que ce fragment révèle ou travaille." },
      { key: "structure", label: "Structure", placeholder: "Déplacement, coupe, ordre, continuité." },
    ],
  },
  dynamiquesRelationnelles: {
    title: "Dynamiques relationnelles",
    subtitle: "Distinguer les faits, les interprétations et les boucles relationnelles qui se répètent.",
    storageKey: "system-dynamiques-relationnelles",
    analysisTitle: "Lecture relationnelle",
    analyze: analyseInterieure,
    fields: [
      { key: "personne", label: "Personne concernée", placeholder: "Nom ou relation.", type: "text" },
      { key: "faits", label: "Faits", placeholder: "Ce qui s’est réellement passé, observable." },
      { key: "interpretations", label: "Interprétations", placeholder: "Ce que tu as compris, supposé ou projeté." },
      { key: "declencheurs", label: "Déclencheurs relationnels", placeholder: "Ce qui a activé la réaction." },
      { key: "boucles", label: "Répétitions / boucles", placeholder: "Ce qui ressemble à une dynamique déjà connue." },
    ],
  },
  clarteMentale: {
    title: "Clarté mentale",
    subtitle: "Séparer ce que tu sais, ce que tu supposes, ce que tu interprètes et ce qui est factuel.",
    storageKey: "system-clarte-mentale",
    analysisTitle: "Clarification",
    analyze: analyseInterieure,
    fields: [
      { key: "sais", label: "Ce que je sais", placeholder: "Faits confirmés." },
      { key: "suppose", label: "Ce que je suppose", placeholder: "Hypothèses non vérifiées." },
      { key: "interprete", label: "Ce que j’interprète", placeholder: "Sens que tu donnes à la situation." },
      { key: "factuel", label: "Ce qui est factuel", placeholder: "Éléments observables." },
      { key: "realite", label: "Réalité probable", placeholder: "Version la plus sobre et probable." },
    ],
  },
  avantAgir: {
    title: "Avant d’agir",
    subtitle: "Créer un espace entre l’impulsion, l’émotion et l’action.",
    storageKey: "system-avant-agir",
    analysisTitle: "Décision avant action",
    analyze: analyseInterieure,
    fields: [
      { key: "action", label: "Ce que je veux faire", placeholder: "Action envisagée." },
      { key: "emotion", label: "Émotion qui pousse l’action", placeholder: "Colère, peur, peine, urgence..." },
      { key: "intensite", label: "Intensité", placeholder: "0 à 10", type: "text" },
      { key: "risque", label: "Risque si j’agis maintenant", placeholder: "Ce que cela pourrait provoquer." },
      { key: "alternative", label: "Alternative plus alignée", placeholder: "Action plus calme, claire ou juste." },
    ],
  },
  apresCoup: {
    title: "Après coup",
    subtitle: "Relire une action après l’événement pour apprendre sans se juger.",
    storageKey: "system-apres-coup",
    analysisTitle: "Apprentissage",
    fields: [
      { key: "fait", label: "Ce que j’ai fait", placeholder: "Action posée." },
      { key: "produit", label: "Ce que ça a produit", placeholder: "Effets observés." },
      { key: "apprends", label: "Ce que j’apprends", placeholder: "Compréhension ou pattern." },
      { key: "autrement", label: "Ce que je ferais autrement", placeholder: "Ajustement futur." },
    ],
  },
  regulationEmotionnelle: {
    title: "Régulation émotionnelle",
    subtitle: "Identifier l’intensité, l’émotion dominante, le besoin et l’action de régulation immédiate.",
    storageKey: "system-regulation-emotionnelle",
    analysisTitle: "Régulation",
    analyze: analyseInterieure,
    fields: [
      { key: "intensite", label: "Intensité actuelle", placeholder: "0 à 10", type: "text" },
      { key: "emotion", label: "Émotion dominante", placeholder: "Émotion principale." },
      { key: "besoin", label: "Besoin associé", placeholder: "Repos, clarté, sécurité, réparation..." },
      { key: "action", label: "Action de régulation immédiate", placeholder: "Respirer, marcher, attendre, demander du soutien..." },
    ],
  },
  identiteSchemas: {
    title: "Identité / schémas profonds",
    subtitle: "Suivre les croyances centrales, blessures activées, peurs et mécanismes de protection.",
    storageKey: "system-identite-schemas",
    analysisTitle: "Schéma repéré",
    analyze: analyseInterieure,
    fields: [
      { key: "croyances", label: "Croyances centrales", placeholder: "Je suis..., je ne suis pas..., je dois..." },
      { key: "blessures", label: "Blessures activées", placeholder: "Rejet, abandon, humiliation, injustice..." },
      { key: "peurs", label: "Peurs dominantes", placeholder: "Ce qui semble menacé." },
      { key: "protections", label: "Mécanismes de protection", placeholder: "Retrait, contrôle, hyperanalyse, attaque, fuite..." },
      { key: "evolution", label: "Évolution dans le temps", placeholder: "Ce qui change ou se répète." },
    ],
  },
  syntheses: {
    title: "Synthèses",
    subtitle: "Créer une synthèse de la semaine ou du mois à partir de ce qui se répète et évolue.",
    storageKey: "system-syntheses",
    analysisTitle: "Synthèse active",
    fields: [
      { key: "periode", label: "Période", placeholder: "Semaine, mois, période précise.", type: "text" },
      { key: "repete", label: "Ce qui se répète", placeholder: "Patterns observés." },
      { key: "evolue", label: "Ce qui évolue", placeholder: "Changements, progrès, déplacements." },
      { key: "travailler", label: "Ce qui doit être travaillé", placeholder: "Priorité intérieure ou concrète." },
    ],
  },
  famille: {
    title: "Famille",
    subtitle: "Garder une vue d’ensemble familiale avec priorités, responsabilités et notes importantes.",
    storageKey: "system-famille",
    analysisTitle: "Organisation familiale",
    analyze: analyseMaison,
    fields: [
      { key: "priorites", label: "Priorités", placeholder: "Ce qui compte maintenant." },
      { key: "responsable", label: "Responsabilités", placeholder: "Qui porte quoi ?", type: "text" },
      { key: "notes", label: "Notes importantes", placeholder: "Informations à ne pas oublier." },
      { key: "statut", label: "Statut", placeholder: "À faire, en cours, fait, reporté.", type: "text" },
    ],
  },
  tachesMenageres: {
    title: "Tâches ménagères",
    subtitle: "Suivre les tâches, fréquences, responsables et statuts sans surcharge mentale.",
    storageKey: "system-taches-menageres",
    analysisTitle: "Suivi maison",
    analyze: analyseMaison,
    fields: [
      { key: "tache", label: "Tâche", placeholder: "Nom de la tâche.", type: "text" },
      { key: "frequence", label: "Fréquence", placeholder: "Quotidien, hebdo, mensuel...", type: "text" },
      { key: "responsable", label: "Personne responsable", placeholder: "Qui s’en occupe ?", type: "text" },
      { key: "statut", label: "Statut", placeholder: "À faire / fait / reporté", type: "select", options: ["À faire", "Fait", "Reporté"] },
      { key: "rappel", label: "Rappel visuel", placeholder: "Indice ou rappel à afficher." },
    ],
  },
  routinesMaison: {
    title: "Routines maison",
    subtitle: "Structurer le matin, le soir, les repas, le lavage, le ménage et l’organisation générale.",
    storageKey: "system-routines-maison",
    analysisTitle: "Routine",
    analyze: analyseMaison,
    fields: [
      { key: "moment", label: "Moment", placeholder: "Matin, soir, repas, lavage...", type: "text" },
      { key: "routine", label: "Routine", placeholder: "Étapes de la routine." },
      { key: "responsable", label: "Responsable", placeholder: "Personne concernée.", type: "text" },
      { key: "statut", label: "Statut", placeholder: "Stable, à ajuster, reporté.", type: "text" },
    ],
  },
  malika: {
    title: "Malika",
    subtitle: "Suivi spécifique des situations, comportements, déclencheurs, limites et solutions essayées.",
    storageKey: "system-malika",
    analysisTitle: "Suivi éducatif",
    analyze: analyseMaison,
    fields: [
      { key: "situation", label: "Situation problématique", placeholder: "Ce qui s’est passé." },
      { key: "comportement", label: "Comportements observés", placeholder: "Comportements précis, sans jugement." },
      { key: "declencheurs", label: "Déclencheurs", placeholder: "Ce qui semble avoir déclenché la situation." },
      { key: "solutions", label: "Solutions essayées", placeholder: "Ce qui a été tenté." },
      { key: "limites", label: "Punitions / limites", placeholder: "Limites posées, conséquences logiques, réparations." },
      { key: "fonctionne", label: "Ce qui fonctionne / ne fonctionne pas", placeholder: "Observations utiles." },
      { key: "notes", label: "Notes importantes", placeholder: "À retenir pour la prochaine fois." },
    ],
  },
  urgenceMalika: {
    title: "Urgence Malika",
    subtitle: "Gérer une situation urgente avec sécurité, limites claires, conséquence logique et retour au calme.",
    storageKey: "system-urgence-malika",
    analysisTitle: "Plan immédiat",
    analyze: analyseCrise,
    safetyNote:
      "Ce module privilégie la sécurité, les conséquences logiques, les limites claires, la réparation et le retour au calme. Il ne doit jamais encourager la violence, l’humiliation ou les punitions excessives.",
    fields: [
      { key: "gravite", label: "Niveau de gravité", placeholder: "Faible / moyen / élevé / critique", type: "select", options: ["Faible", "Moyen", "Élevé", "Critique"] },
      { key: "probleme", label: "Problème actuel", placeholder: "Décris le problème maintenant." },
      { key: "comportement", label: "Comportement observé", placeholder: "Ce qui est observable." },
      { key: "risque", label: "Risque immédiat", placeholder: "Sécurité, escalade, blessure, fuite..." },
      { key: "action", label: "Action à faire maintenant", placeholder: "Action calme, simple et sécurisante." },
      { key: "consequence", label: "Conséquence logique", placeholder: "Conséquence proportionnée et reliée au comportement." },
      { key: "limite", label: "Limite à poser", placeholder: "Phrase courte, claire, non humiliante." },
      { key: "solution", label: "Solution proposée", placeholder: "Option de retour au calme ou réparation." },
      { key: "suivi", label: "Suivi après crise", placeholder: "Ce qu’il faudra reprendre plus tard." },
    ],
  },
  planCriseFamilial: {
    title: "Plan de crise familial",
    subtitle: "Préparer quoi faire, quoi éviter, qui contacter et comment revenir au calme.",
    storageKey: "system-plan-crise-familial",
    analysisTitle: "Plan de crise",
    analyze: analyseCrise,
    safetyNote:
      "Priorité absolue : sécurité, désescalade, soutien, retour au calme. Éviter les menaces, les humiliations et les réactions impulsives.",
    fields: [
      { key: "contacts", label: "Qui contacter", placeholder: "Personnes ressources, numéros, soutien." },
      { key: "premier", label: "Quoi faire en premier", placeholder: "Première action concrète." },
      { key: "eviter", label: "Quoi éviter", placeholder: "Gestes, paroles ou réactions qui aggravent." },
      { key: "phrasesUtiles", label: "Phrases à utiliser", placeholder: "Phrases courtes et calmes." },
      { key: "phrasesEviter", label: "Phrases à éviter", placeholder: "Phrases qui humilient, menacent ou escaladent." },
      { key: "calme", label: "Retour au calme", placeholder: "Étapes de désescalade." },
      { key: "suivi", label: "Suivi après l’événement", placeholder: "Réparation, discussion, ajustement." },
    ],
  },
};
