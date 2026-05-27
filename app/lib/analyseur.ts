import { type ModeKey } from "@/app/lib/modes";
import { type TypeProjetKey, type GrilleConfig, calculerPrix, formaterPrix } from "@/app/lib/grille-prix";
import { chargerLang, type Lang } from "@/app/lib/freelance-lang";

export type ServiceKey = "ghostwriting" | "revision" | "traduction";

export interface AnalyseDemande {
  // ── Niveau 1 : Certain
  client?: string;
  deadline?: string;
  urgence: "haute" | "normale" | "basse";
  nombreVersions: number;
  longueurMots?: number;
  elementsClient: string[];
  service: ServiceKey;
  approcheRecommandee: string;
  lecture: string;
  reponseClient: string;

  // ── Niveau 2 : Déduit
  typeProjetKey?: TypeProjetKey;
  typeId?: string;
  typeProjetLabel?: string;
  longueurKey?: "court" | "moyen" | "long" | "tres_long";
  objectif?: string;
  style?: string;
  canal?: string;
  modeRecommande: ModeKey;
  complexite: "simple" | "standard" | "complexe";

  // ── Niveau 3 : Manquants
  manquants: string[];

  // ── Calcul
  prixFinal: number;
  acompte: number;
  tempsEstime: string;
  detailPrix: string[];

  // ── Checklist
  checklist: string[];

  // ── Livrables
  deliverables: string[];
}

// ── Détection ─────────────────────────────────────────────────────────────────

function detecterService(texte: string): ServiceKey {
  const low = texte.toLowerCase();
  if (/\b(?:traduire|traduction|translation|translate|en\s+anglais|en\s+français|version\s+anglaise|version\s+française)\b/.test(low)) return "traduction";
  if (
    /\b(?:corriger|corriges?|réviser|révision|retravailler|reformuler|relire|fluidité|fautes?)\b/.test(low) ||
    /\b(?:améliorer\s+(?:le|votre|mon|ce|cet?|cette)?\s*(?:texte|email|mail|message|article|contenu|page|rédaction))\b/.test(low) ||
    /j['']ai\s+déjà\s+un\s+texte/.test(low) ||
    /pas\s+(?:assez\s+)?(?:clair|professionnel)/.test(low)
  ) return "revision";
  return "ghostwriting";
}

const FAUX_NOMS = new Set([
  "je", "j", "tu", "nous", "vous", "il", "elle", "on", "ils", "elles",
  "mon", "ma", "mes", "votre", "notre", "leur", "leurs",
  "bonjour", "hello", "bonsoir", "salut", "merci", "cordialement",
  "je vous", "je te", "nous vous",
]);

function validerNomCapture(nom: string): string | undefined {
  if (!nom) return undefined;
  const premierMot = nom.trim().split(/\s+/)[0].toLowerCase();
  if (FAUX_NOMS.has(premierMot)) return undefined;
  if (!/^[A-ZÀÂÄÉÈÊËÎÏÔÙÛÜŒ]/.test(nom.trim())) return undefined;
  return nom.trim();
}

function detecterClient(t: string): string | undefined {
  const salut = t.match(/\b(?:bonjour|hello|bonsoir|salut)[,\s]+([A-Za-zÀ-ÿ][a-zA-Zàâäéèêëîïôùûüœ\-]+(?:\s+[A-Za-zÀ-ÿ][a-zA-Zàâäéèêëîïôùûüœ\-]+)?)/i);
  if (salut) {
    const nom = validerNomCapture(salut[1]);
    if (nom) return nom;
  }
  const sign = t.match(/(?:cordialement|bien à vous|cdlt|bonne journée)[,\s\n]+([A-Za-zÀ-ÿ][a-zA-Zàâäéèêëîïôùûüœ\-]+(?:\s+[A-Za-zÀ-ÿ][a-zA-Zàâäéèêëîïôùûüœ\-]+)?)/i);
  if (sign) {
    const nom = validerNomCapture(sign[1]);
    if (nom) return nom;
  }
  return undefined;
}

function detecterDate(t: string): string | undefined {
  const dateNum = t.match(/(?:le\s+|avant\s+(?:le\s+)?|pour\s+(?:le\s+)?)(\d{1,2}[\/\-]\d{1,2}(?:[\/\-]\d{2,4})?)/i);
  if (dateNum) return dateNum[1];
  const dateLitt = t.match(/(?:le\s+|avant\s+(?:le\s+)?|pour\s+(?:le\s+)?)(\d{1,2}\s+(?:janvier|février|mars|avril|mai|juin|juillet|août|septembre|octobre|novembre|décembre)(?:\s+\d{4})?)/i);
  if (dateLitt) return dateLitt[1];
  const relat = t.match(/\b(demain|après[- ]demain|(?:cette\s+)?semaine prochaine|(?:ce\s+)?vendredi|(?:ce\s+)?lundi|(?:ce\s+)?mardi|(?:ce\s+)?mercredi|(?:ce\s+)?jeudi)\b/i);
  if (relat) return relat[1];
  const jours = t.match(/\b(?:sous|dans)\s+(\d+)\s+(jours?|semaines?)\b/i);
  if (jours) return `sous ${jours[1]} ${jours[2]}`;
  return undefined;
}

function detecterUrgence(t: string, deadline: string | undefined): "haute" | "normale" | "basse" {
  const low = t.toLowerCase();
  if (/\b(?:urgent|urgente|urgence|asap|dès que possible|le plus tôt possible|rapidement|immédiatement|très vite)\b/.test(low)) return "haute";
  if (/\b(?:pas pressé|pas urgent|quand vous pouvez|sans urgence|à votre convenance|tranquillement)\b/.test(low)) return "basse";
  if (deadline && /\b(aujourd'hui|demain|ce soir)\b/i.test(deadline)) return "haute";
  if (deadline && /\b(cette semaine|semaine|vendredi|samedi)\b/i.test(deadline)) return "haute";
  return "normale";
}

const TYPES_PROJET: { key: TypeProjetKey; label: string; mots: string[] }[] = [
  { key: "page_vente",    label: "Page de vente",  mots: ["page de vente","page vente","landing page","page de conversion","sales page"] },
  { key: "fiche_produit", label: "Fiche produit",  mots: ["fiche produit","description produit","fiche article","fiche de produit"] },
  { key: "newsletter",    label: "Newsletter",     mots: ["newsletter","infolettre","lettre d'information"] },
  { key: "brochure",      label: "Brochure",       mots: ["brochure","plaquette","flyer","dépliant","livret","dossier de présentation"] },
  { key: "site_web",      label: "Site web",       mots: ["site web","site internet","page d'accueil","page accueil","homepage","à propos"] },
  { key: "article",       label: "Article / Blog", mots: ["article","billet de blog","blog","post","contenu seo","texte web"] },
  { key: "email",         label: "Email",          mots: ["email","e-mail","mail","courriel","emailing","séquence email"] },
];

function detecterTypeProjet(t: string): { key: TypeProjetKey; label: string } | undefined {
  const low = t.toLowerCase();
  for (const type of TYPES_PROJET) {
    if (type.mots.some(m => low.includes(m))) return { key: type.key, label: type.label };
  }
  return undefined;
}

function detecterLongueur(t: string): { key: "court" | "moyen" | "long" | "tres_long"; mots?: number } | undefined {
  const nb = t.match(/(\d+)\s*mots?/i);
  if (nb) {
    const n = parseInt(nb[1]);
    if (n < 300)  return { key: "court",     mots: n };
    if (n < 800)  return { key: "moyen",     mots: n };
    if (n < 1500) return { key: "long",      mots: n };
    return             { key: "tres_long", mots: n };
  }
  const pages = t.match(/(\d+)\s*pages?/i);
  if (pages) {
    const n = parseInt(pages[1]);
    if (n === 1) return { key: "moyen" };
    if (n <= 2)  return { key: "long" };
    return          { key: "tres_long" };
  }
  const low = t.toLowerCase();
  if (/\b(?:quelques lignes|très court|bref|succinct)\b/.test(low)) return { key: "court" };
  if (/\b(?:long|complet|détaillé|approfondi|développé)\b/.test(low)) return { key: "long" };
  return undefined;
}

function detecterStyle(t: string): string | undefined {
  const patterns: [RegExp, string][] = [
    [/\b(?:sobre|épuré|minimaliste|élégant|raffiné|luxe|haut de gamme|premium)\b/i, "sobre / élégant"],
    [/\b(?:dynamique|percutant|accrocheur|impactant|énergique|punch)\b/i,           "dynamique / percutant"],
    [/\b(?:professionnel|sérieux|formel|institutionnel|corporate)\b/i,               "professionnel / sérieux"],
    [/\b(?:friendly|chaleureux|humain|accessible|bienveillant|sympa)\b/i,            "chaleureux / accessible"],
    [/\b(?:technique|expert|précis|rigoureux)\b/i,                                   "technique / expert"],
    [/\b(?:créatif|original|décalé|audacieux|innovant)\b/i,                          "créatif / original"],
  ];
  for (const [re, label] of patterns) {
    if (re.test(t)) return label;
  }
  return undefined;
}

function detecterCanal(t: string): string | undefined {
  const canaux: [RegExp, string][] = [
    [/\blinkedin\b/i,                          "LinkedIn"],
    [/\binstagram\b/i,                         "Instagram"],
    [/\bfacebook\b/i,                          "Facebook"],
    [/\b(?:twitter|x\.com)\b/i,               "Twitter / X"],
    [/\bsite\s+(?:web|internet)\b/i,           "Site web"],
    [/\b(?:catalogue|plaquette|print)\b/i,     "Print"],
    [/\b(?:mailing|emailing|campagne email)\b/i, "Emailing"],
  ];
  for (const [re, label] of canaux) {
    if (re.test(t)) return label;
  }
  return undefined;
}

function detecterVersions(t: string): number {
  const v  = t.match(/(\d+)\s*versions?\b/i);
  if (v) return Math.min(parseInt(v[1]), 10);
  const ar = t.match(/(\d+)\s*allers?[-\s]retours?\b/i);
  if (ar) return Math.min(parseInt(ar[1]), 10);
  if (/\baller[-\s]retour\b/i.test(t)) return 2;
  return 1;
}

function detecterElements(t: string): string[] {
  const elements: string[] = [];
  const patterns = [
    /je\s+(?:vous\s+)?(?:fournis|fournirai|peux\s+fournir)\s+([^.!?\n]{5,60})/gi,
    /j['']\s*ai\s+(?:déjà\s+)?(?:le|la|les|un|une|des)?\s*([^.!?\n]{5,50}(?:logo|photos?|textes?|images?|contenu|brief|éléments?|visuels?))/gi,
    /(?:vous\s+aurez|vous\s+trouverez|je\s+joins?)\s+([^.!?\n]{5,60})/gi,
  ];
  for (const re of patterns) {
    let m;
    while ((m = re.exec(t)) !== null) {
      const el = m[1].trim();
      if (el.length > 4) elements.push(el);
    }
  }
  return [...new Set(elements)].slice(0, 5);
}

function detecterObjectif(t: string, typeKey?: TypeProjetKey): string | undefined {
  const match = t.match(/(?:pour\s+|afin\s+de\s+|l['']objectif\s+est\s+de\s+|l['']idée\s+est\s+de\s+|je\s+(?:souhaite|veux|voudrais|cherche\s+à)\s+)([^.!?\n]{10,80})/i);
  if (match) return match[1].trim();
  const defaults: Partial<Record<TypeProjetKey, string>> = {
    page_vente:    "Convertir les visiteurs en clients",
    email:         "Engager et contacter des prospects ou clients",
    article:       "Informer et positionner sur un sujet",
    fiche_produit: "Présenter et vendre un produit",
    newsletter:    "Fidéliser et engager une audience",
    brochure:      "Présenter l'offre et convaincre",
    site_web:      "Présenter l'activité et attirer des clients",
  };
  return typeKey ? defaults[typeKey] : undefined;
}

function recommanderMode(typeKey: TypeProjetKey | undefined, style: string | undefined): ModeKey {
  if (style?.includes("dynamique") || style?.includes("percutant")) return "persuasif";
  if (style?.includes("sobre") || style?.includes("élégant"))       return "editorial";
  if (style?.includes("technique") || style?.includes("expert"))    return "informatif";
  switch (typeKey) {
    case "page_vente":    return "persuasif";
    case "email":         return "persuasif";
    case "article":       return "editorial";
    case "fiche_produit": return "informatif";
    case "newsletter":    return "editorial";
    case "brochure":      return "publicitaire";
    case "site_web":      return "narratif";
    default:              return "informatif";
  }
}

function estimerComplexite(
  typeKey: TypeProjetKey | undefined,
  longueurKey: "court" | "moyen" | "long" | "tres_long" | undefined,
  nombreVersions: number,
  style: string | undefined,
  elementsClient: string[]
): "simple" | "standard" | "complexe" {
  const scoreType: Partial<Record<TypeProjetKey, number>> = {
    fiche_produit: 0,
    email:         0,
    newsletter:    1,
    article:       1,
    brochure:      2,
    page_vente:    2,
    site_web:      3,
  };
  let score = scoreType[typeKey ?? "autre"] ?? 1;
  if (longueurKey === "long")      score += 1;
  if (longueurKey === "tres_long") score += 2;
  if (style)                       score += 1;
  if (elementsClient.length >= 2)  score += 1;
  if (nombreVersions >= 3)         score += 1;
  if (score <= 1) return "simple";
  if (score <= 3) return "standard";
  return "complexe";
}

export const CHECKLISTS_SERVICE: Record<ServiceKey, { fr: string[]; en: string[] }> = {
  revision: {
    fr: [
      "Lire et analyser le texte existant",
      "Identifier les points flous ou inefficaces",
      "Clarifier la promesse principale",
      "Simplifier et restructurer le contenu",
      "Réécrire les sections clés",
      "Optimiser le ton et la lisibilité",
    ],
    en: [
      "Read and analyze the existing text",
      "Identify unclear or weak sections",
      "Clarify the main message",
      "Simplify and restructure the content",
      "Rewrite key sections",
      "Optimize tone and readability",
    ],
  },
  traduction: {
    fr: ["Comprendre le texte source", "Traduire fidèlement", "Adapter le ton et le style", "Relire la version finale"],
    en: ["Understand the source text", "Translate accurately", "Adapt tone and style", "Review the final version"],
  },
  ghostwriting: {
    fr: [
      "Clarifier les objectifs du projet",
      "Définir la structure du contenu",
      "Rédiger les sections",
      "Optimiser la fluidité et l'impact",
      "Valider la cohérence globale",
    ],
    en: [
      "Clarify project objectives",
      "Define content structure",
      "Write each section",
      "Optimize flow and impact",
      "Validate overall coherence",
    ],
  },
};

export function lectureService(service: ServiceKey, lang: Lang): string {
  if (lang === "en") {
    if (service === "revision")   return "Editing-focused project";
    if (service === "traduction") return "Translation requiring adaptation";
    return "Content creation project";
  }
  if (service === "revision")   return "Projet de révision éditoriale";
  if (service === "traduction") return "Projet de traduction avec adaptation";
  return "Projet de création de contenu";
}

export function recommanderApproche(service: ServiceKey, lang: string): string {
  if (lang === "en") {
    if (service === "revision")   return "Revision, clarification and text optimization";
    if (service === "traduction") return "Adapted and fluent translation";
    return "Structured and persuasive content creation";
  }
  if (service === "revision")   return "Révision, clarification et optimisation du texte existant";
  if (service === "traduction") return "Traduction adaptée et fluide";
  return "Création de contenu structuré et persuasif";
}

function genererChecklist(typeKey: TypeProjetKey | undefined, manquants: string[], service: ServiceKey): string[] {
  if (service === "revision" || service === "traduction") {
    const items = [...CHECKLISTS_SERVICE[service].fr];
    if (manquants.length > 0) items.unshift("Confirmer les informations manquantes avec le client");
    return items;
  }
  const bases: Partial<Record<TypeProjetKey, string[]>> = {
    page_vente:    ["Définir la promesse principale", "Identifier les objections clés", "Structurer : accroche → bénéfices → preuves → CTA", "Rédiger le texte", "Relire et optimiser les CTA"],
    email:         ["Définir l'objet de l'email", "Rédiger l'accroche", "Corps du message", "Appel à l'action", "Relire"],
    article:       ["Définir le plan détaillé", "Rédiger l'introduction", "Développer les sections", "Rédiger la conclusion", "Relire et optimiser la lisibilité"],
    fiche_produit: ["Lister les bénéfices clés", "Rédiger la description principale", "Ajouter les caractéristiques", "Relire le CTA"],
    newsletter:    ["Définir le sujet principal", "Rédiger l'intro", "Corps + liens", "Objet de l'email", "Relire l'ensemble"],
    brochure:      ["Définir l'architecture des sections", "Rédiger les accroches", "Corps de texte par section", "Relire la cohérence globale"],
    site_web:      ["Définir l'architecture des pages", "Rédiger chaque section", "Valider le fil narratif", "Relire tous les CTA"],
  };
  const checklist = [...(typeKey ? (bases[typeKey] ?? CHECKLISTS_SERVICE.ghostwriting.fr) : CHECKLISTS_SERVICE.ghostwriting.fr)];
  if (manquants.length > 0) checklist.unshift("Confirmer les informations manquantes avec le client");
  return checklist;
}

function genererLivrables(typeKey: TypeProjetKey | undefined, service: ServiceKey): string[] {
  if (service === "revision") {
    return ["Texte corrigé", "Texte optimisé", "Version finale prête à publier"];
  }
  if (service === "traduction") {
    return ["Version source annotée", "Version traduite", "Version finale adaptée"];
  }
  const mapping: Partial<Record<TypeProjetKey, string[]>> = {
    page_vente:    ["Structure de la page de vente", "Texte complet optimisé", "Version finale avec CTA"],
    email:         ["Email principal rédigé", "Objet testé A/B", "Version finale"],
    article:       ["Plan détaillé validé", "Article complet", "Version SEO-optimisée"],
    fiche_produit: ["Description principale", "Caractéristiques et bénéfices", "Version finale"],
    newsletter:    ["Email principal", "Objet optimisé", "Version finale"],
    brochure:      ["Structure et titres", "Textes sections", "Version finale"],
    site_web:      ["Textes de chaque page", "Fil narratif global", "Version finale"],
  };
  return (typeKey ? mapping[typeKey] : undefined) ?? ["Première version rédigée", "Révisions intégrées", "Version finale livrée"];
}

function detecterManquants(
  client: string | undefined,
  deadline: string | undefined,
  typeKey: TypeProjetKey | undefined,
  longueurKey: string | undefined,
  canal: string | undefined
): string[] {
  const m: string[] = [];
  if (!client)    m.push("Nom du client");
  if (!deadline)  m.push("Date de remise");
  if (!typeKey)   m.push("Type de projet exact");
  if (!longueurKey) m.push("Longueur souhaitée");
  if (!canal)     m.push("Canal / plateforme de diffusion");
  return m;
}

// ── Réponse client ───────────────────────────────────────────────────────────

export function genererReponseClient(
  analyse: Pick<AnalyseDemande, "service" | "typeProjetLabel" | "prixFinal" | "tempsEstime" | "longueurKey" | "objectif">,
  lang: Lang
): string {
  const { service, typeProjetLabel, prixFinal, tempsEstime, longueurKey, objectif } = analyse;
  const prix = formaterPrix(prixFinal);

  if (lang === "en") {
    if (service === "revision") {
      return [
        "Hello,",
        "",
        "Thank you for your message — I understand you're looking to improve your text so it becomes clearer, more professional, and more effective.",
        "",
        "From what you described, the main issue is not just writing, but refining and structuring your message so it communicates your value more clearly.",
        "",
        "Here's how I would approach your project:",
        "",
        "→ First, I review your existing text to identify unclear, redundant, or weak sections",
        "→ Then, I restructure it to improve flow and readability",
        "→ Finally, I rewrite key parts to make your message more precise, professional, and impactful",
        "",
        "This way, you keep your voice while significantly improving clarity and credibility.",
        "",
        `→ Price: ${prix}`,
        `→ Timeline: ${tempsEstime}`,
        "",
        "If you'd like, feel free to send your draft — I can start with a first optimized version.",
        "",
        "Best,",
        "[Name]",
      ].join("\n");
    }

    if (service === "traduction") {
      const type = typeProjetLabel ?? "your content";
      return [
        "Hello,",
        "",
        `Thank you for your message — I understand you need a professional translation of your ${type.toLowerCase()}.`,
        "",
        "Here's how I would approach this:",
        "",
        "→ First, I carefully read the source text to capture the tone and intent",
        "→ Then, I translate it while preserving your voice and style",
        "→ Finally, I review the translated version for fluency and accuracy",
        "",
        `→ Price: ${prix}`,
        `→ Timeline: ${tempsEstime}`,
        "",
        "Let me know when you're ready to get started.",
        "",
        "Best,",
        "[Name]",
      ].join("\n");
    }

    // Ghostwriting EN
    const type = typeProjetLabel ?? "project";
    const longueur = longueurKey ? ` (${longueurKey.replace("tres_long", "very long").replace("_", " ")})` : "";
    const obj = objectif ? ` that ${objectif.toLowerCase()}` : " that converts and engages";
    return [
      "Hello,",
      "",
      `Thank you for your message — I understand you need a ${type.toLowerCase()}${longueur}${obj}.`,
      "",
      "Here's how I would structure this project:",
      "",
      "→ First, we clarify your objectives, audience, and key messages",
      "→ Then, I write a structured first draft that's clear, persuasive, and on-brand",
      "→ Finally, we refine it together until you're fully satisfied",
      "",
      "The final result will be ready to publish, in your tone, built to drive results.",
      "",
      `→ Price: ${prix}`,
      `→ Timeline: ${tempsEstime}`,
      "",
      "Let me know if you'd like to move forward — I can start as soon as you share your brief.",
      "",
      "Best,",
      "[Name]",
    ].join("\n");
  }

  // French
  if (service === "revision") {
    return [
      "Bonjour,",
      "",
      "Merci pour votre message — je comprends que vous souhaitez améliorer votre texte pour le rendre plus clair, plus professionnel et plus efficace.",
      "",
      "D'après ce que vous décrivez, l'enjeu n'est pas seulement de corriger, mais de clarifier et structurer votre message pour qu'il communique votre valeur avec plus de force.",
      "",
      "Voici comment j'aborderais votre projet :",
      "",
      "→ En premier lieu, j'analyse votre texte existant pour identifier les zones floues, redondantes ou peu efficaces",
      "→ Ensuite, je restructure et reformule pour améliorer la fluidité et la lisibilité",
      "→ Enfin, je réécris les passages clés pour rendre votre message précis, professionnel et percutant",
      "",
      "Vous conservez votre voix, en gagnant significativement en clarté et en crédibilité.",
      "",
      `→ Tarif : ${prix}`,
      `→ Délai estimé : ${tempsEstime}`,
      "",
      "Si cela vous convient, n'hésitez pas à m'envoyer votre texte — je peux démarrer avec une première version optimisée.",
      "",
      "Au plaisir,",
      "[Nom]",
    ].join("\n");
  }

  if (service === "traduction") {
    const type = typeProjetLabel ?? "votre contenu";
    return [
      "Bonjour,",
      "",
      `Merci pour votre message — je comprends que vous avez besoin d'une traduction professionnelle de votre ${type.toLowerCase()}.`,
      "",
      "Voici comment j'aborderais ce projet :",
      "",
      "→ Je lis attentivement le texte source pour en saisir le ton et l'intention",
      "→ Je le traduis en préservant votre voix et votre style",
      "→ Je relis la version traduite pour garantir fluidité et fidélité au sens",
      "",
      `→ Tarif : ${prix}`,
      `→ Délai estimé : ${tempsEstime}`,
      "",
      "N'hésitez pas à me transmettre votre document — je peux démarrer rapidement.",
      "",
      "Au plaisir,",
      "[Nom]",
    ].join("\n");
  }

  // Ghostwriting FR
  const type = typeProjetLabel ?? "votre projet";
  const longueur = longueurKey ? ` (${longueurKey.replace("tres_long", "très long").replace(/_/g, " ")})` : "";
  const obj = objectif ? ` afin de ${objectif.toLowerCase()}` : "";
  return [
    "Bonjour,",
    "",
    `Merci pour votre message — votre projet consiste à créer ${type.toLowerCase() === "votre projet" ? "un contenu" : `un ${type.toLowerCase()}`}${longueur}${obj}.`,
    "",
    "Voici comment j'aborderais ce projet :",
    "",
    "→ D'abord, on définit ensemble la structure, le ton et les messages clés",
    "→ Ensuite, je rédige un premier jet structuré, clair et percutant",
    "→ Enfin, on affine et optimise ensemble jusqu'à la version finale",
    "",
    "Résultat : un contenu prêt à publier, dans votre ton, pensé pour générer des résultats.",
    "",
    `→ Tarif : ${prix}`,
    `→ Délai estimé : ${tempsEstime}`,
    "",
    "Si tout cela vous convient, faites-moi part de vos éléments — je peux démarrer rapidement.",
    "",
    "Au plaisir,",
    "[Nom]",
  ].join("\n");
}

// ── Correction locale ─────────────────────────────────────────────────────────

export type TonRevision = "neutre" | "professionnel" | "marketing" | "narratif";
export type NiveauTransformation = "safe" | "standard";
export type ModeQualite = "off" | "soft";

function nettoyer(t: string): string {
  return t
    .replace(/\s{2,}/g, " ")
    .replace(/ ([.,!?;:])/g, "$1")
    .replace(/^([,;]\s*)/, "")
    .replace(/(^|[.!?]\s+)([a-zàâäéèêëîïôùûüœ])/g, (_, p1, p2) => p1 + p2.toUpperCase())
    .trim();
}

export function lisserStyle(texte: string): string {
  let t = texte;
  t = t.replace(/[ \t]+/g, " ");
  t = t.replace(/\.{3}/g, "…");
  t = t.replace(/\s*—\s*/g, " — ");
  t = t.replace(/(\w)'(\w)/g, "$1’$2");
  t = t.replace(/!{2,}/g, "!");
  t = t.replace(/\?{2,}/g, "?");
  t = t.replace(/ ([.,!?;:])/g, "$1");
  t = t.replace(/([.,!?;:])([^\s\n"»\d\)\]'’])/g, "$1 $2");
  t = t.replace(/(^|[.!?]\s+)([a-zàâäéèêëîïôùûüœ])/g, (_, p1, p2) => p1 + p2.toUpperCase());
  return t.trim();
}

// ── Qualité éditoriale ────────────────────────────────────────────────────────

const STOP_QUALITE = new Set([
  "être", "avoir", "faire", "aller", "avec", "pour", "dans", "cette",
  "votre", "notre", "leurs", "mais", "donc", "comme", "plus", "aussi",
  "très", "bien", "même", "tout", "tous", "toute", "autre", "après",
  "avant", "depuis", "pendant", "selon", "entre", "quand", "alors",
]);

function analyserQualitePhrase(phrase: string): {
  lourde: boolean;
  tropLongue: boolean;
  repetitive: boolean;
} {
  const mots = phrase.trim().split(/\s+/).filter(Boolean);

  const lourde =
    /\bprésente\b/i.test(phrase) ||
    /\bdans le cadre de\b/i.test(phrase) ||
    /\ben termes de\b/i.test(phrase) ||
    /\bil convient de\b/i.test(phrase) ||
    (/\bplusieurs\b/i.test(phrase) &&
      /\b(avantages|inconvénients|aspects|éléments|points|bénéfices)\b/i.test(phrase));

  const tropLongue = mots.length > 18;

  const freq: Record<string, number> = {};
  for (const m of mots) {
    const w = m.toLowerCase().replace(/[^a-zàâäéèêëîïôùûüœ]/g, "");
    if (w.length > 4 && !STOP_QUALITE.has(w)) freq[w] = (freq[w] ?? 0) + 1;
  }
  const repetitive = Object.values(freq).some(c => c >= 2);

  return { lourde, tropLongue, repetitive };
}

// Synonymes genre-cohérents pour éviter les accords incorrects
const SYNONYMES_LOCAUX: Record<string, string> = {
  "projet":        "travail",
  "projets":       "travaux",
  "client":        "destinataire",
  "clients":       "destinataires",
  "texte":         "document",
  "textes":        "documents",
  "résultat":      "bilan",
  "résultats":     "bilans",
  "document":      "texte",
  "documents":     "textes",
  "service":       "travail",
  "point":         "élément",
  "points":        "éléments",
  "version":       "variante",
  "versions":      "variantes",
  "qualité":       "rigueur",
  "offre":         "prestation",
  "offres":        "prestations",
};

// Soft : uniquement les transformations sans risque de perte de sens
function ameliorerPhraseSoft(
  phrase: string,
  analyse: { lourde: boolean; tropLongue: boolean }
): string {
  let t = phrase;

  if (analyse.lourde) {
    // "présente des/les/plusieurs [noun]" → "a des/les/plusieurs [noun]"
    t = t.replace(/\bprésente\s+(des|les|plusieurs|de\s+\w+)/gi, "a $1");
    // Jargon lourd résiduel non traité par le ton courant
    t = t.replace(/\bdans le cadre de\b/gi, "pour");
    t = t.replace(/\ben termes de\b/gi, "en");
    t = t.replace(/\bil convient de\b/gi, "il faut");
    // NE PAS toucher : adjectifs, noms principaux, termes métier
  }

  if (analyse.tropLongue) {
    // Couper sur connecteur de coordination si les deux parties sont assez longues
    const m = t.match(/^(.{40,}?),\s+((?:et|mais|car|donc|ainsi|cependant|néanmoins|puis)\s+.{30,})$/i);
    if (m) {
      const avant = m[1].trim();
      const apres = m[2].trim();
      if (compterMots(avant) >= 6 && compterMots(apres) >= 6) {
        t = avant + ". " + apres.charAt(0).toUpperCase() + apres.slice(1);
      }
    }
  }

  return t;
}

// Complet : transformations plus agressives — non utilisé par défaut, réservé usage futur
function ameliorerPhraseComplet(
  phrase: string,
  analyse: { lourde: boolean; tropLongue: boolean; repetitive: boolean }
): string {
  let t = ameliorerPhraseSoft(phrase, analyse);

  if (analyse.lourde) {
    t = t.replace(
      /\b(avantages|aspects|bénéfices|points|résultats)\s+(notables|importants|significatifs|pertinents|clés|principaux)\b/gi,
      "$1"
    );
  }

  if (analyse.repetitive) {
    const tokens = t.split(/(\s+)/);
    const freq: Record<string, number> = {};
    let remplacé = false;

    for (let i = 0; i < tokens.length && !remplacé; i++) {
      const token = tokens[i];
      if (/^\s+$/.test(token)) continue;
      const w = token.toLowerCase().replace(/[^a-zàâäéèêëîïôùûüœ]/g, "");
      if (w.length <= 4 || STOP_QUALITE.has(w) || !SYNONYMES_LOCAUX[w]) continue;

      freq[w] = (freq[w] ?? 0) + 1;
      if (freq[w] === 2) {
        const syn = SYNONYMES_LOCAUX[w];
        const ponct = token.match(/[.,!?;:]*$/)?.[0] ?? "";
        const base  = token.slice(0, token.length - ponct.length);
        const majuscule = /^[A-ZÀÂÄÉÈÊËÎÏÔÙÛÜŒ]/.test(base);
        tokens[i] = (majuscule ? syn.charAt(0).toUpperCase() + syn.slice(1) : syn) + ponct;
        t = tokens.join("");
        remplacé = true;
      }
    }
  }

  return t;
}

// ── Helpers par phrase ────────────────────────────────────────────────────────

function splitEnPhrases(texte: string): string[] {
  // Découpe sur ponctuation forte suivie d'espace, en gardant le délimiteur
  const segments = texte.match(/[^.!?\n]+[.!?]*\n?/g);
  return segments ?? [texte];
}

function compterMots(phrase: string): number {
  return phrase.trim().split(/\s+/).filter(Boolean).length;
}

function estEmotionnelle(phrase: string): boolean {
  // Phrases où le sentiment est le contenu — ne pas toucher
  return /\b(j['']aime|j['']adore|je déteste|je suis (désolé|content|heureux|triste|ravi|fier|frustré)|j['']espère|je regrette|j['']ai (peur|honte|hâte)|j['']apprécie|je souffre|je crains|je me sens)\b/i.test(phrase);
}

function transformerPhrase(phrase: string, ton: TonRevision, niveau: NiveauTransformation, modeQualite: ModeQualite): string {
  let t = phrase;
  const n = compterMots(t);

  if (ton === "professionnel") {
    // Safe : introducteurs parasites en début de phrase (≥ 5 mots pour éviter les faux positifs)
    if (n >= 5) {
      t = t.replace(/^\s*en fait,?\s*/i, "");
      t = t.replace(/^\s*franchement,?\s*/i, "");
      t = t.replace(/^\s*honnêtement,?\s*/i, "");
    }
    // Safe : normaliser les exclamations répétées
    t = t.replace(/!+([^\w]|$)/g, ".$1");

    // Standard seulement : suppressions → protéger les phrases courtes ou émotionnelles
    if (niveau === "standard" && n >= 10 && !estEmotionnelle(t)) {
      t = t.replace(/\bje pense qu[e']?\s*/gi, "");
      t = t.replace(/\bil me semble qu[e']?\s*/gi, "");
      t = t.replace(/\bje crois qu[e']?\s*/gi, "");
      t = t.replace(/\bj['']ai l['']impression qu[e']?\s*/gi, "");
      t = t.replace(/\bon dirait qu[e']?\s*/gi, "");
      t = t.replace(/\bvraiment très\b/gi, "très");
      t = t.replace(/\bvraiment\b/gi, "particulièrement");
      t = t.replace(/\bassez\s+(\w)/gi, "$1");
      t = t.replace(/\bun peu\s+(\w)/gi, "$1");
      t = t.replace(/\bplutôt\s+(\w)/gi, "$1");
    }
  }

  if (ton === "marketing") {
    // Safe : reformulations impersonnelles → "vous" — même sens, toujours applicable
    t = t.replace(/\bil est possible de\b/gi, "vous pouvez");
    t = t.replace(/\bil vous est possible de\b/gi, "vous pouvez");
    t = t.replace(/\bcela vous permet de\b/gi, "vous permet de");
    t = t.replace(/\bcela permet de\b/gi, "vous permet de");
    t = t.replace(/\bon peut\b/gi, "vous pouvez");
    t = t.replace(/\bon pourrait\b/gi, "vous pourriez");
    t = t.replace(/\bon doit\b/gi, "vous devez");
    t = t.replace(/\bon pourra\b/gi, "vous pourrez");

    // Standard seulement : suppressions → protéger les phrases courtes ou émotionnelles
    if (niveau === "standard" && n >= 10 && !estEmotionnelle(t)) {
      t = t.replace(/\bpeut-être que?\s*/gi, "");
      t = t.replace(/\bprobablement\b/gi, "");
      t = t.replace(/\bsans doute\b/gi, "");
      t = t.replace(/\bje pense qu[e']?\s*/gi, "");
    }
  }

  if (ton === "narratif") {
    // Toutes substitutions : équivalents naturels, applicable à toutes les phrases
    t = t.replace(/\bdans le cadre de\b/gi, "pour");
    t = t.replace(/\bau niveau de\b/gi, "en");
    t = t.replace(/\ben termes de\b/gi, "en");
    t = t.replace(/\bsuite à\b/gi, "après");
    t = t.replace(/\beu égard à\b/gi, "face à");
    t = t.replace(/\bvis-à-vis de\b/gi, "envers");
    t = t.replace(/\bau sein de\b/gi, "dans");
    t = t.replace(/\bde façon à\b/gi, "pour");
    t = t.replace(/\bde manière à\b/gi, "pour");
    t = t.replace(/\bafin de\b/gi, "pour");
    t = t.replace(/\ben vue de\b/gi, "pour");
    t = t.replace(/\bpar rapport à\b/gi, "face à");
    t = t.replace(/\bà travers\b/gi, "par");
    t = t.replace(/\bil convient de\b/gi, "il faut");
    t = t.replace(/\bil s['']agit de\b/gi, "c'est");
  }

  // Couche qualité éditoriale — standard + soft seulement, phrases assez longues et non émotionnelles
  if (niveau === "standard" && modeQualite === "soft" && n >= 8 && !estEmotionnelle(t)) {
    const qual = analyserQualitePhrase(t);
    if (qual.lourde || qual.tropLongue) {
      t = ameliorerPhraseSoft(t, qual);
    }
  }

  return t;
}

function appliquerTon(texte: string, ton: TonRevision, niveauTransformation: NiveauTransformation = "safe", modeQualite: ModeQualite = "soft"): string {
  if (ton === "neutre") return texte;

  // Conserver la structure en paragraphes
  const paragraphes = texte.split(/(\n{2,})/);

  const resultat = paragraphes.map(segment => {
    if (/^\n{2,}$/.test(segment)) return segment;

    const phrases = splitEnPhrases(segment);
    return phrases.map(p => transformerPhrase(p, ton, niveauTransformation, modeQualite)).join("");
  }).join("");

  return nettoyer(resultat);
}

export function genererCorrection(
  texte: string,
  niveau: "léger" | "standard" | "approfondi",
  ton: TonRevision = "neutre",
  niveauTransformation: NiveauTransformation = "safe",
  modeQualite: ModeQualite = "soft"
): {
  texteCorrige: string;
  suggestions: string[];
  versionFinale: string;
} {
  let corrige = texte;

  // Normalisation espaces
  corrige = corrige.replace(/[ \t]+/g, " ");
  corrige = corrige.replace(/\n{3,}/g, "\n\n");

  // Espacement ponctuation
  corrige = corrige.replace(/ ([.,!?;:])/g, "$1");
  corrige = corrige.replace(/([.,!?;:])([^\s\n"»\d\)\]’])/g, "$1 $2");

  // Mots doublés consécutifs
  corrige = corrige.replace(/\b(\w+)\s+\1\b/gi, "$1");

  // Capitaliser début de phrase
  corrige = corrige.replace(/(^|[.!?]\s+)([a-zàâäéèêëîïôùûüœ])/g, (_, p1, p2) => p1 + p2.toUpperCase());

  if (niveau === "standard" || niveau === "approfondi") {
    corrige = corrige.replace(/\.\.\./g, "…");
    corrige = corrige.replace(/\s*—\s*/g, " — ");
    corrige = corrige.replace(/(\w)’(\w)/g, "$1’$2");
  }

  // Suggestions
  const suggestions: string[] = [];
  const phrases = texte.split(/(?<=[.!?])\s+/).filter(p => p.trim());

  const longues = phrases.filter(p => p.trim().split(/\s+/).length > 30);
  if (longues.length > 0)
    suggestions.push(`${longues.length} phrase${longues.length > 1 ? "s longues" : " longue"} (> 30 mots) — envisager de les scinder.`);

  const mots = texte.toLowerCase().replace(/[.,!?;:«»"’’]/g, "").split(/\s+/);
  const freq: Record<string, number> = {};
  for (const m of mots) { if (m.length > 4) freq[m] = (freq[m] ?? 0) + 1; }
  Object.entries(freq)
    .filter(([, c]) => c >= 4)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 3)
    .forEach(([mot, count]) => suggestions.push(`"${mot}" apparaît ${count} fois — envisager des synonymes.`));

  if (niveau === "approfondi") {
    const passifMatch = texte.match(/\b(est|sont|était|étaient)\s+\w+[eé]s?\b/g);
    if (passifMatch && passifMatch.length >= 2)
      suggestions.push(`${passifMatch.length} constructions passives — préférer la voix active.`);

    const tresLongues = phrases.filter(p => p.trim().split(/\s+/).length > 50);
    if (tresLongues.length > 0)
      suggestions.push(`${tresLongues.length} phrase${tresLongues.length > 1 ? "s" : ""} très longue${tresLongues.length > 1 ? "s" : ""} (> 50 mots) — réécriture recommandée.`);
  }

  if (suggestions.length === 0)
    suggestions.push("Texte globalement bien structuré. Révision mineure appliquée.");

  // Version finale : nettoyage final + adaptation ton
  let versionFinale = corrige;
  versionFinale = versionFinale.split("\n").map(l => l.trim()).join("\n");
  versionFinale = versionFinale.replace(/\n{3,}/g, "\n\n").trim();
  versionFinale = appliquerTon(versionFinale, ton, niveauTransformation, modeQualite);
  // Dernière passe de capitalisation après suppression de mots
  versionFinale = versionFinale.replace(/(^|[.!?]\s+)([a-zàâäéèêëîïôùûüœ])/g, (_, p1, p2) => p1 + p2.toUpperCase());

  return { texteCorrige: corrige.trim(), suggestions, versionFinale };
}

// ── Génération 3 niveaux ──────────────────────────────────────────────────────

export function genererCorrectionTexte(
  texte: string,
  niveau: "léger" | "standard" | "approfondi"
): {
  versionCorrigee: string;
  versionOptimisee: string;
  versionFinale: string;
} {
  // ── Étape 1 : Correction — fautes, espaces, typographie ──
  let corrigee = texte;
  corrigee = corrigee.replace(/[ \t]+/g, " ");
  corrigee = corrigee.replace(/\n{3,}/g, "\n\n");
  corrigee = corrigee.replace(/ ([.,!?;:])/g, "$1");
  corrigee = corrigee.replace(/([.,!?;:])([^\s\n"»\d\)\]''])/g, "$1 $2");
  corrigee = corrigee.replace(/\b(\w+)\s+\1\b/gi, "$1");
  corrigee = corrigee.replace(/(^|[.!?]\s+)([a-zàâäéèêëîïôùûüœ])/g, (_, p1, p2) => p1 + p2.toUpperCase());
  if (niveau !== "léger") {
    corrigee = corrigee.replace(/\.\.\./g, "…");
    corrigee = corrigee.replace(/\s*—\s*/g, " — ");
    corrigee = corrigee.replace(/(\w)'(\w)/g, "$1'$2");
  }

  // ── Étape 2 : Optimisation — clarté, jargon, longueur ──
  let optimisee = corrigee;
  // Introducteurs parasites en début de phrase
  optimisee = optimisee.replace(/(?:^|(?<=[.!?]\s+))(?:en fait|franchement|honnêtement|bon|bref|enfin),?\s+/gim, "");
  // Jargon lourd
  optimisee = optimisee
    .replace(/\bdans le cadre de\b/gi, "pour")
    .replace(/\ben termes de\b/gi, "en")
    .replace(/\bil convient de\b/gi, "il faut")
    .replace(/\bau niveau de\b/gi, "en")
    .replace(/\bau sein de\b/gi, "dans")
    .replace(/\bà travers\b/gi, "par")
    .replace(/\bpar rapport à\b/gi, "face à")
    .replace(/\bafin de\b/gi, "pour")
    .replace(/\ben vue de\b/gi, "pour")
    .replace(/\bde façon à\b/gi, "pour")
    .replace(/\bde manière à\b/gi, "pour")
    .replace(/\bprésente\s+(des|les|plusieurs)/gi, "a $1");
  // Couper les phrases trop longues sur connecteur de coordination
  optimisee = optimisee
    .split(/(?<=[.!?])\s+/)
    .map(phrase => {
      if (compterMots(phrase) <= 22) return phrase;
      const m = phrase.match(/^(.{50,}?),\s+((?:et|mais|car|donc|ainsi|cependant|néanmoins|puis)\s+.{30,})$/i);
      if (m && compterMots(m[1]) >= 8 && compterMots(m[2]) >= 8) {
        return m[1].trim() + ". " + m[2].trim().charAt(0).toUpperCase() + m[2].trim().slice(1);
      }
      return phrase;
    })
    .join(" ");
  if (niveau === "approfondi") {
    optimisee = optimisee
      .replace(/\bje pense qu[e']?\s*/gi, "")
      .replace(/\bil me semble qu[e']?\s*/gi, "")
      .replace(/\bje crois qu[e']?\s*/gi, "")
      .replace(/\bon dirait qu[e']?\s*/gi, "");
  }
  optimisee = optimisee
    .replace(/(^|[.!?]\s+)([a-zàâäéèêëîïôùûüœ])/g, (_, p1, p2) => p1 + p2.toUpperCase())
    .replace(/\s{2,}/g, " ")
    .trim();

  // ── Étape 3 : Version finale — professionnelle, prête à envoyer ──
  const niveauTransfo: NiveauTransformation = niveau === "léger" ? "safe" : "standard";
  let finale = appliquerTon(optimisee, "professionnel", niveauTransfo, "soft");
  finale = finale
    .replace(/!+([^\w\n]|$)/g, ".$1")
    .replace(/(^|[.!?]\s+)([a-zàâäéèêëîïôùûüœ])/g, (_, p1, p2) => p1 + p2.toUpperCase())
    .trim();

  return {
    versionCorrigee: corrigee.trim(),
    versionOptimisee: optimisee,
    versionFinale: finale,
  };
}

// ── Livraison client ──────────────────────────────────────────────────────────

export function genererMessageLivraison(finalText: string, lang: Lang): { court: string; complet: string } {
  if (lang === "fr") {
    return {
      complet: `Bonjour,\n\nVoici la version révisée et optimisée de votre texte.\n\nJ'ai travaillé sur :\n- la clarté du message\n- la structure\n- la fluidité globale\n\nVous trouverez ci-dessous la version finale prête à être utilisée.\n\n---\n\n${finalText}\n\n---\n\nN'hésitez pas à me dire si vous souhaitez des ajustements.`,
      court: `Voici une version optimisée de votre texte. Dites-moi si vous souhaitez des ajustements.\n\n${finalText}`,
    };
  }
  return {
    complet: `Hello,\n\nHere is the revised and optimized version of your text.\n\nI worked on:\n- message clarity\n- structure\n- overall flow\n\nYou'll find the final version ready to use below.\n\n---\n\n${finalText}\n\n---\n\nFeel free to let me know if you'd like any adjustments.`,
    court: `Here is an optimized version of your text. Let me know if you'd like any adjustments.\n\n${finalText}`,
  };
}

// ── Export principal ──────────────────────────────────────────────────────────

export function analyserDemande(texte: string, config?: GrilleConfig): AnalyseDemande {
  const client         = detecterClient(texte);
  const deadline       = detecterDate(texte);
  const urgence        = detecterUrgence(texte, deadline);
  const nombreVersions = detecterVersions(texte);
  const typeResult     = detecterTypeProjet(texte);
  const longueurResult = detecterLongueur(texte);
  const style          = detecterStyle(texte);
  const canal          = detecterCanal(texte);
  const elementsClient = detecterElements(texte);
  const objectif       = detecterObjectif(texte, typeResult?.key);
  const modeRecommande = recommanderMode(typeResult?.key, style);
  const complexite     = estimerComplexite(typeResult?.key, longueurResult?.key, nombreVersions, style, elementsClient);
  const typeId         = typeResult?.key;
  const service        = detecterService(texte);
  const manquants      = detecterManquants(client, deadline, typeResult?.key, longueurResult?.key, canal);
  const checklist      = genererChecklist(typeResult?.key, manquants, service);
  const calcul         = calculerPrix(typeId, longueurResult?.key, urgence, complexite, nombreVersions, config);
  const lang                = chargerLang();
  const approcheRecommandee = recommanderApproche(service, lang);
  const lecture             = lectureService(service, lang);
  const reponseClient       = genererReponseClient(
    { service, typeProjetLabel: typeResult?.label, prixFinal: calcul.prixFinal, tempsEstime: calcul.tempsEstime, longueurKey: longueurResult?.key, objectif },
    lang
  );
  const deliverables = genererLivrables(typeResult?.key, service);

  return {
    client,
    deadline,
    urgence,
    nombreVersions,
    longueurMots: longueurResult?.mots,
    elementsClient,
    service,
    approcheRecommandee,
    lecture,
    reponseClient,
    typeProjetKey: typeResult?.key,
    typeId,
    typeProjetLabel: typeResult?.label,
    longueurKey: longueurResult?.key,
    objectif,
    style,
    canal,
    modeRecommande,
    complexite,
    manquants,
    prixFinal: calcul.prixFinal,
    acompte: calcul.acompte,
    tempsEstime: calcul.tempsEstime,
    detailPrix: calcul.detail,
    checklist,
    deliverables,
  };
}
