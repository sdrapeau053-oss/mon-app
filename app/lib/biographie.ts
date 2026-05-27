// ── Types ─────────────────────────────────────────────────────────────────────

export interface ScoreEcriture {
  scoreGlobal: number;
  concret: number;
  precision: number;
  intensite: number;
  variation: number;
}

export interface VersionScore {
  date: string;
  scoreGlobal: number;
}

export interface ProjetNarratif {
  id: string;
  titre: string;
  tomes: Tome[];
  themes: string[];
  arcs: ArcNarratif[];
  objectifScore: number;
}

export interface ArcNarratif {
  id: string;
  titre: string;
  description: string;
}

export interface Tome {
  id: string;
  titre: string;
  chapitres: Chapitre[];
}

export interface Chapitre {
  id: string;
  titre: string;
  contenuBrut: string;
  analyseNarrative: AnalyseNarrative | null;
  structure: StructureNarrative | null;
  versionRedigee: string;
  score: ScoreEcriture | null;
  historique: VersionScore[];
}

export interface AnalyseNarrative {
  theme: string;
  conflit: string;
  transformation: string;
  emotionDominante: string;
  niveauIntensite: number;
}

export interface StructureNarrative {
  situationInitiale: string;
  elementDeclencheur: string;
  tension: string;
  bascule: string;
  resolution: string;
}

export type StyleNarratif = "livre" | "cinema" | "conference";
export type ModeAuteur = "guide" | "assistant";

export interface FormatsExtraits {
  pitchSerie: string;
  scriptScene: string;
  postInstagram: string;
  scriptTikTok: string;
  threadTwitter: string;
  articleSubstack: string;
}

// ── Analyse narrative ──────────────────────────────────────────────────────────

export function analyserNarration(texte: string): AnalyseNarrative {
  const low = texte.toLowerCase();

  const THEMES: { key: string; mots: string[] }[] = [
    { key: "famille",        mots: ["famille", "père", "mère", "parents", "frère", "sœur", "enfance", "foyer", "maison"] },
    { key: "identité",       mots: ["qui je suis", "identité", "me définir", "comprendre qui", "appartenir", "exister"] },
    { key: "travail",        mots: ["travail", "carrière", "entreprise", "emploi", "mission", "réussite", "échec professionnel"] },
    { key: "amour",          mots: ["amour", "relation", "couple", "rupture", "rencontre", "sentiment", "séparation", "aimer"] },
    { key: "perte",          mots: ["perte", "deuil", "disparition", "mort", "absence", "manque", "plus là", "perdu"] },
    { key: "transformation", mots: ["changement", "transformation", "devenir", "évoluer", "grandir", "tout a changé"] },
    { key: "liberté",        mots: ["liberté", "quitter", "partir", "choisir", "indépendance", "m'affranchir", "décision"] },
    { key: "résilience",     mots: ["surmonter", "résister", "tenir bon", "malgré tout", "continuer", "rebondir", "debout"] },
  ];

  let theme = "expérience personnelle";
  let maxTheme = 0;
  for (const t of THEMES) {
    const score = t.mots.filter(m => low.includes(m)).length;
    if (score > maxTheme) { maxTheme = score; theme = t.key; }
  }

  const CONFLIT_MOTS = ["problème", "difficulté", "obstacle", "conflit", "tension", "peur", "doute",
    "crise", "rupture", "échec", "impossible", "refus", "interdit", "incompris", "seul", "abandon",
    "rejeté", "contre", "lutte", "impasse"];
  const conflitScore = CONFLIT_MOTS.filter(m => low.includes(m)).length;
  const conflit = conflitScore >= 3 ? "conflit fort identifié"
    : conflitScore >= 1 ? "tension implicite détectée"
    : "absence de conflit apparent";

  const TRANSF_MOTS = ["j'ai compris", "j'ai réalisé", "depuis ce jour", "tout a changé", "je suis devenu",
    "j'ai décidé", "c'est là que", "à partir de là", "je ne serais plus jamais", "à ce moment-là", "j'ai su que"];
  const transfScore = TRANSF_MOTS.filter(m => low.includes(m)).length;
  const transformation = transfScore >= 2 ? "bascule narrative forte"
    : transfScore >= 1 ? "moment de bascule identifié"
    : "évolution progressive sans rupture";

  const EMOTIONS: { label: string; mots: string[] }[] = [
    { label: "peur",      mots: ["peur", "angoisse", "terreur", "inquiétude", "crainte", "trembler", "effrayé"] },
    { label: "joie",      mots: ["joie", "bonheur", "heureux", "heureuse", "fierté", "satisfaction", "légèreté", "rire"] },
    { label: "colère",    mots: ["colère", "rage", "frustration", "injustice", "révolte", "furieux", "furie", "fureur"] },
    { label: "tristesse", mots: ["tristesse", "larmes", "chagrin", "mélancolie", "nostalgie", "pleurer", "déchiré"] },
    { label: "honte",     mots: ["honte", "gêne", "embarras", "humiliation", "indigne", "pitié"] },
    { label: "espoir",    mots: ["espoir", "rêve", "aspiration", "désir", "croire en", "possible", "lumière"] },
    { label: "solitude",  mots: ["seul", "isolé", "incompris", "personne ne", "silence", "vide", "abandonné"] },
  ];

  let emotionDominante = "ambivalence";
  let maxEmotion = 0;
  for (const e of EMOTIONS) {
    const score = e.mots.filter(m => low.includes(m)).length;
    if (score > maxEmotion) { maxEmotion = score; emotionDominante = e.label; }
  }

  const INTENSITE_MOTS = ["jamais", "toujours", "absolument", "complètement", "violent", "bouleversant",
    "soudain", "brutal", "déchirant", "inoubliable", "incroyable", "terrifiant", "magnifique", "immense", "profond"];
  const intensiteScore = INTENSITE_MOTS.filter(m => low.includes(m)).length;
  const niveauIntensite = Math.min(5, Math.max(1, 1 + Math.round(intensiteScore * 1.2)));

  return { theme, conflit, transformation, emotionDominante, niveauIntensite };
}

// ── Structure narrative ────────────────────────────────────────────────────────

export function structurerChapitre(texte: string): StructureNarrative {
  const phrases = texte
    .split(/(?<=[.!?])\s+/)
    .map(p => p.trim())
    .filter(p => p.length > 15);

  const n = phrases.length;

  if (n === 0) {
    return { situationInitiale: "", elementDeclencheur: "", tension: "", bascule: "", resolution: "" };
  }

  const situationInitiale = phrases
    .slice(0, Math.max(1, Math.ceil(n * 0.2)))
    .join(" ");

  const DECLENCHEUR_MOTS = ["soudain", "un jour", "c'est alors", "tout a commencé", "ce jour-là",
    "je me souviens de", "il s'est passé", "c'est ce matin-là", "c'est cette nuit"];
  let elementDeclencheur = "";
  for (const p of phrases) {
    if (DECLENCHEUR_MOTS.some(m => p.toLowerCase().includes(m))) {
      elementDeclencheur = p;
      break;
    }
  }
  if (!elementDeclencheur && n > 2) {
    elementDeclencheur = phrases[Math.ceil(n * 0.25)] ?? "";
  }

  const tension = phrases
    .slice(Math.ceil(n * 0.3), Math.ceil(n * 0.6))
    .join(" ");

  const BASCULE_MOTS = ["j'ai compris", "j'ai réalisé", "c'est là que", "depuis ce jour",
    "à ce moment", "tout a changé", "je ne pouvais plus", "j'ai su", "j'ai décidé", "c'est ce jour-là"];
  let bascule = "";
  for (const p of phrases) {
    if (BASCULE_MOTS.some(m => p.toLowerCase().includes(m))) {
      bascule = p;
      break;
    }
  }
  if (!bascule && n > 3) {
    bascule = phrases[Math.ceil(n * 0.7)] ?? "";
  }

  const resolution = phrases
    .slice(Math.max(0, Math.ceil(n * 0.8)))
    .join(" ");

  return { situationInitiale, elementDeclencheur, tension, bascule, resolution };
}

// ── Questions de guidage ───────────────────────────────────────────────────────

export function genererQuestions(analyse: AnalyseNarrative): string[] {
  const base = [
    "Qu'est-ce que tu ressentais réellement à ce moment-là ?",
    "Qu'est-ce que tu ne comprenais pas encore ?",
    "Qu'est-ce qui a changé après cet épisode ?",
  ];

  const parEmotion: Record<string, string[]> = {
    peur: [
      "De quoi avais-tu vraiment peur, au fond ?",
      "Cette peur t'avait-elle déjà visité avant ?",
    ],
    honte: [
      "À qui as-tu eu le plus de mal à raconter ça ?",
      "Que t'es-tu dit à toi-même ce soir-là ?",
    ],
    joie: [
      "Qu'est-ce qui rendait ce moment si rare ?",
      "Qui aurais-tu voulu avoir à tes côtés ?",
    ],
    colère: [
      "Contre quoi était vraiment dirigée cette colère ?",
      "Qu'est-ce que tu n'as pas dit à ce moment-là ?",
    ],
    tristesse: [
      "Qu'as-tu perdu ce jour-là, concrètement ?",
      "Comment ton corps portait-il cette tristesse ?",
    ],
    solitude: [
      "Était-ce la première fois que tu te sentais aussi seul(e) ?",
      "Qu'est-ce que tu aurais eu besoin d'entendre ?",
    ],
    espoir: [
      "D'où venait cet espoir ? Qu'est-ce qui l'alimentait ?",
      "Qu'est-ce qui aurait pu l'éteindre ?",
    ],
    ambivalence: [
      "Si tu devais nommer une seule émotion de ce moment, laquelle ce serait ?",
    ],
  };

  const questions = [...base, ...(parEmotion[analyse.emotionDominante] ?? [])];

  if (analyse.transformation.includes("bascule")) {
    questions.push("Quelle version de toi a disparu ce jour-là ?");
    questions.push("Qu'est-ce qui serait différent aujourd'hui si ce moment n'avait pas eu lieu ?");
  }

  if (analyse.niveauIntensite >= 4) {
    questions.push("Où dans ton corps as-tu senti ça ?");
    questions.push("Quelle odeur, quel son, quelle lumière associes-tu à ce souvenir ?");
  }

  return [...new Set(questions)].slice(0, 6);
}

// ── Réécriture narrative ───────────────────────────────────────────────────────

export function genererVersionNarrative(texte: string, style: StyleNarratif): string {
  if (!texte.trim()) return "";

  const phrases = texte
    .split(/(?<=[.!?])\s+/)
    .map(p => p.trim())
    .filter(p => p.length > 5);

  if (phrases.length === 0) return texte;

  const premiere = phrases[0];
  const derniere = phrases[phrases.length - 1];
  const corps = phrases.slice(1, -1).join(" ");

  if (style === "livre") {
    const intro = /^(je|j')/i.test(premiere)
      ? premiere
      : `Je me souviens de ce moment avec une précision troublante. ${premiere}`;
    return [
      intro,
      "",
      corps || premiere,
      "",
      `Aujourd'hui encore, je pense à ${derniere.replace(/[.!?]$/, "").toLowerCase()}…`,
    ].filter(Boolean).join("\n\n");
  }

  if (style === "cinema") {
    return [
      `EXT./INT. — [LIEU] — [ÉPOQUE]`,
      "",
      `VOIX OFF : "${premiere}"`,
      "",
      corps || texte,
      "",
      `— ${derniere}`,
    ].filter(Boolean).join("\n");
  }

  if (style === "conference") {
    return [
      `"${derniere}"`,
      "",
      "Il y a quelque chose que je dois vous raconter.",
      "",
      texte,
      "",
      `Ce que j'ai appris de tout ça : ${derniere.replace(/[.!?]$/, "").toLowerCase()}.`,
    ].filter(Boolean).join("\n\n");
  }

  return texte;
}

// ── Extraction multi-format ────────────────────────────────────────────────────

export function extraireFormats(texte: string): FormatsExtraits {
  const phrases = texte
    .split(/(?<=[.!?])\s+/)
    .map(p => p.trim())
    .filter(p => p.length > 5);

  const premiere = phrases[0] ?? texte.slice(0, 80);
  const derniere = phrases[phrases.length - 1] ?? premiere;
  const extrait = texte.slice(0, 180).trim();

  const pitchSerie = [
    "PITCH SÉRIE — 4 épisodes",
    "",
    `Épisode 1 — L'avant : ${premiere}`,
    `Épisode 2 — La chute : [développer la tension centrale]`,
    `Épisode 3 — La bascule : [le moment qui change tout]`,
    `Épisode 4 — L'après : ${derniere}`,
  ].join("\n");

  const scriptScene = [
    "EXT./INT. — [LIEU] — [PÉRIODE]",
    "",
    "VOIX OFF",
    `"${premiere}"`,
    "",
    "[Description visuelle — décor, lumière, corps]",
    "",
    corps(phrases),
    "",
    `— ${derniere}`,
  ].join("\n");

  const postInstagram = [
    premiere,
    "",
    extrait + (texte.length > 180 ? "…" : ""),
    "",
    ".",
    ".",
    ".",
    "#autobiographie #histoirevraie #transformation #mémoire #écriture",
  ].join("\n");

  const scriptTikTok = [
    `[0–3s]   Hook : "${premiere}"`,
    `[3–15s]  ${texte.slice(0, 140).trim()}…`,
    `[15–22s] [Bascule — silence ou geste fort]`,
    `[22–30s] Message clé : "${derniere}"`,
  ].join("\n");

  const threadTwitter = phrases
    .slice(0, Math.min(5, phrases.length))
    .map((p, i) => `${i + 1}/ ${p}`)
    .join("\n\n")
    + (phrases.length > 5 ? "\n\n🧵 (suite)" : "");

  const articleSubstack = [
    `# ${premiere.replace(/[.!?]$/, "")}`,
    "",
    texte,
    "",
    "---",
    "",
    "*Si ce texte vous a touché, partagez-le. Chaque histoire vraie mérite d'être entendue.*",
  ].join("\n");

  return { pitchSerie, scriptScene, postInstagram, scriptTikTok, threadTwitter, articleSubstack };
}

function corps(phrases: string[]): string {
  return phrases.slice(1, -1).join(" ");
}

// ── Feedback éditorial ────────────────────────────────────────────────────────

const STOP_STYLE = new Set([
  "être", "avoir", "faire", "avec", "pour", "dans", "cette",
  "mais", "donc", "aussi", "très", "bien", "même", "tout",
  "quand", "alors", "plus", "comme", "leur", "leurs",
]);

const SIGNAUX_VAGUE: RegExp[] = [
  /\bc'était (difficile|bien|beau|dur|triste|long|court|grand|petit|étrange)\b/i,
  /\bj'étais (triste|heureux|heureuse|content|contente|stressé|fatigué|perdu)\b/i,
  /\bje me sentais (bien|mal|triste|heureux|seul|bizarre|strange)\b/i,
  /\bquelque chose (de|d')\b/i,
  /\bc'est (compliqué|difficile|long|dur|bizarre)\b/i,
  /\bbeaucoup de (choses|gens|problèmes|fois)\b/i,
  /\bune sorte de\b/i,
  /\bj'ai ressenti (quelque chose|une émotion|beaucoup)\b/i,
  /\bdes choses\b/i,
];

const SIGNAUX_FORTE: RegExp[] = [
  /\b[A-ZÀÂÄÉÈÊËÎÏÔÙÛÜŒ][a-zàâäéèêëîïôùûüœ]{2,}\b/,  // nom propre
  /\b\d{1,4}\b/,                                          // nombre concret
  /\b(odeur|bruit|lumière|couleur|voix|silence|chaleur|froid|sueur|larme|souffle)\b/i,
  /\bj'ai (dit|demandé|crié|murmuré|répondu|compris|vu|entendu|touché|senti)\b/i,
  /\bil|elle (a dit|a répondu|a crié|a pleuré|a souri|a regardé|a touché)\b/i,
  /["«»]/,
];

export function analyserStyleAuteur(texte: string): {
  phrasesFaibles: string[];
  phrasesFortes: string[];
  suggestions: string[];
} {
  const phrases = texte
    .split(/(?<=[.!?])\s+/)
    .map(p => p.trim())
    .filter(p => p.length > 12);

  const phrasesFaibles: string[] = [];
  const phrasesFortes: string[] = [];

  for (const phrase of phrases) {
    if (SIGNAUX_VAGUE.some(re => re.test(phrase))) {
      phrasesFaibles.push(phrase);
    } else if (SIGNAUX_FORTE.filter(re => re.test(phrase)).length >= 2) {
      phrasesFortes.push(phrase);
    }
  }

  const suggestions: string[] = [];

  if (phrasesFaibles.length >= 2) {
    suggestions.push("Certaines phrases restent génériques — ancre-les dans un détail concret.");
  }
  if (phrasesFortes.length === 0 && phrases.length >= 3) {
    suggestions.push("Ajoute au moins un détail sensoriel : odeur, lumière, son, texture.");
  }
  if (phrasesFortes.length >= 3) {
    suggestions.push("Bonne densité concrète. Continue dans cette direction.");
  }

  const mots = texte.toLowerCase().replace(/[^a-zàâäéèêëîïôùûüœ\s]/g, "").split(/\s+/);
  const freq: Record<string, number> = {};
  for (const m of mots) {
    if (m.length > 4 && !STOP_STYLE.has(m)) freq[m] = (freq[m] ?? 0) + 1;
  }
  const repetitions = Object.entries(freq)
    .filter(([, c]) => c >= 3)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 2)
    .map(([mot]) => mot);
  if (repetitions.length > 0) {
    suggestions.push(`"${repetitions.join('", "')}" revient fréquemment — varie les formulations.`);
  }

  if (suggestions.length === 0) {
    suggestions.push("Le texte a une bonne tension. Aucune faiblesse stylistique majeure détectée.");
  }

  return {
    phrasesFaibles: phrasesFaibles.slice(0, 4),
    phrasesFortes: phrasesFortes.slice(0, 4),
    suggestions,
  };
}

// ── Questions profondes ────────────────────────────────────────────────────────

export function genererQuestionsProfondes(analyse: AnalyseNarrative): string[] {
  const base = [
    "Qu'est-ce que tu évites de dire ici ?",
    "Quelle est la vérité que tu n'as pas encore écrite ?",
    "Si tu devais être totalement honnête, que dirais-tu ?",
    "À qui as-tu peur de montrer ce texte, et pourquoi ?",
    "Quelle partie de cette histoire protèges-tu encore ?",
  ];

  const parIntensité = analyse.niveauIntensite >= 3
    ? "Qu'est-ce qui rend ce souvenir si difficile à mettre en mots ?"
    : "Pourquoi ce moment mérite-t-il d'être raconté ?";

  const parTransformation = analyse.transformation.includes("bascule")
    ? "Qui n'a pas encore compris que tu as changé ce jour-là ?"
    : "Comment es-tu encore, aujourd'hui, la même personne qu'à ce moment-là ?";

  return [...base, parIntensité, parTransformation].slice(0, 6);
}

// ── Guidance scène ─────────────────────────────────────────────────────────────

export function genererGuidanceScene(): {
  lieu: string[];
  moment: string[];
  action: string[];
  dialogue: string[];
} {
  return {
    lieu: [
      "Où étiez-vous exactement ? Nomme le lieu.",
      "Grand ou petit espace ? Chaud ou froid ? Clos ou ouvert ?",
      "Qu'est-ce que tu voyais si tu regardais à ta droite ?",
    ],
    moment: [
      "Quelle heure était-il ? Quel jour, quelle saison ?",
      "Quelle lumière y avait-il — naturelle, artificielle, faible, forte ?",
      "Y avait-il un bruit de fond ? Lequel ?",
    ],
    action: [
      "Que faisais-tu de tes mains à ce moment-là ?",
      "Quel geste as-tu fait ? Ou t'es-tu retenu(e) de faire ?",
      "Où étaient les autres personnes dans la pièce ?",
    ],
    dialogue: [
      "Si quelqu'un avait parlé, qu'aurait-il dit exactement ?",
      "Qu'aurais-tu voulu dire, et que n'as-tu pas dit ?",
      "Quelle phrase de ce moment reste encore dans ta mémoire ?",
    ],
  };
}

// ── Persistance ───────────────────────────────────────────────────────────────

const CLE_PROJET = "biographie-projet";

export function chargerProjet(): ProjetNarratif {
  try {
    const stored = localStorage.getItem(CLE_PROJET);
    if (stored) return normaliserProjet(JSON.parse(stored) as ProjetNarratif);
  } catch { /* ignore */ }
  return creerProjetVide();
}

function normaliserProjet(p: ProjetNarratif): ProjetNarratif {
  return {
    ...p,
    objectifScore: p.objectifScore ?? 80,
    tomes: p.tomes.map(t => ({
      ...t,
      chapitres: t.chapitres.map(c => ({
        ...c,
        score: c.score ?? null,
        historique: c.historique ?? [],
      })),
    })),
  };
}

export function sauvegarderProjet(projet: ProjetNarratif): void {
  try { localStorage.setItem(CLE_PROJET, JSON.stringify(projet)); }
  catch { /* ignore */ }
}

export function creerProjetVide(): ProjetNarratif {
  return {
    id: `proj-${Date.now()}`,
    titre: "Mon autobiographie",
    tomes: [
      { id: "tome-1", titre: "Tome 1 — Les origines", chapitres: [] },
    ],
    themes: [],
    arcs: [],
    objectifScore: 80,
  };
}

export function ajouterTome(projet: ProjetNarratif, titre: string): ProjetNarratif {
  return {
    ...projet,
    tomes: [...projet.tomes, {
      id: `tome-${Date.now()}`,
      titre,
      chapitres: [],
    }],
  };
}

export function ajouterChapitre(projet: ProjetNarratif, tomeId: string, titre: string): ProjetNarratif {
  return {
    ...projet,
    tomes: projet.tomes.map(t =>
      t.id !== tomeId ? t : {
        ...t,
        chapitres: [...t.chapitres, {
          id: `chap-${Date.now()}`,
          titre,
          contenuBrut: "",
          analyseNarrative: null,
          structure: null,
          versionRedigee: "",
          score: null,
          historique: [],
        }],
      }
    ),
  };
}

export function mettreAJourChapitre(
  projet: ProjetNarratif,
  tomeId: string,
  chapitreId: string,
  updates: Partial<Chapitre>
): ProjetNarratif {
  return {
    ...projet,
    tomes: projet.tomes.map(t =>
      t.id !== tomeId ? t : {
        ...t,
        chapitres: t.chapitres.map(c =>
          c.id !== chapitreId ? c : { ...c, ...updates }
        ),
      }
    ),
  };
}

export function supprimerChapitre(projet: ProjetNarratif, tomeId: string, chapitreId: string): ProjetNarratif {
  return {
    ...projet,
    tomes: projet.tomes.map(t =>
      t.id !== tomeId ? t : { ...t, chapitres: t.chapitres.filter(c => c.id !== chapitreId) }
    ),
  };
}

export function supprimerTome(projet: ProjetNarratif, tomeId: string): ProjetNarratif {
  return { ...projet, tomes: projet.tomes.filter(t => t.id !== tomeId) };
}

// ── Évaluation qualité ────────────────────────────────────────────────────────

const INTENSITE_SCORING = [
  "jamais", "toujours", "absolument", "complètement", "violent", "bouleversant",
  "soudain", "brutal", "déchirant", "inoubliable", "terrifiant", "magnifique", "immense", "profond",
];

const TRANSF_SCORING = [
  "j'ai compris", "j'ai réalisé", "depuis ce jour", "tout a changé", "je suis devenu",
  "j'ai décidé", "c'est là que", "à partir de là", "je ne serais plus jamais", "j'ai su que",
];

export function evaluerQualiteTexte(texte: string): ScoreEcriture {
  const phrases = texte
    .split(/(?<=[.!?])\s+/)
    .map(p => p.trim())
    .filter(p => p.length > 10);

  const n = phrases.length;
  if (n === 0) return { scoreGlobal: 0, concret: 0, precision: 0, intensite: 0, variation: 0 };

  const nFortes = phrases.filter(p => SIGNAUX_FORTE.filter(re => re.test(p)).length >= 2).length;
  const concret = Math.min(100, Math.round((nFortes / n) * 160));

  const nVagues = phrases.filter(p => SIGNAUX_VAGUE.some(re => re.test(p))).length;
  const precision = Math.max(0, Math.round(100 - (nVagues / n) * 150));

  const low = texte.toLowerCase();
  const intensiteCount = INTENSITE_SCORING.filter(m => low.includes(m)).length;
  const transfCount = TRANSF_SCORING.filter(m => low.includes(m)).length;
  const intensite = Math.min(100, Math.round((intensiteCount * 10 + transfCount * 18)));

  const longueurs = phrases.map(p => p.split(/\s+/).filter(Boolean).length);
  const moy = longueurs.reduce((a, b) => a + b, 0) / longueurs.length;
  const ecart = Math.sqrt(longueurs.reduce((acc, l) => acc + (l - moy) ** 2, 0) / longueurs.length);
  const mots = low.replace(/[^a-zàâäéèêëîïôùûüœ\s]/g, "").split(/\s+/).filter(m => m.length > 3);
  const richesse = mots.length > 0 ? new Set(mots).size / mots.length : 0;
  const variation = Math.min(100, Math.round(ecart * 7 + richesse * 65));

  const scoreGlobal = Math.round(concret * 0.30 + precision * 0.25 + intensite * 0.20 + variation * 0.25);

  return { scoreGlobal, concret, precision, intensite, variation };
}

export function prioritéAmélioration(score: ScoreEcriture): string {
  const scores: [number, string][] = [
    [score.concret,   "Ancre chaque souvenir dans un détail concret : un nom, une date, une sensation physique."],
    [score.precision, "Remplace les formulations vagues (\"c'était difficile\") par des faits précis et observables."],
    [score.intensite, "Renforce l'intensité : marque les moments de bascule, nomme les émotions avec précision."],
    [score.variation, "Varie la longueur de tes phrases et enrichis ton vocabulaire pour éviter les répétitions."],
  ];
  const [, conseil] = scores.reduce((min, cur) => cur[0] < min[0] ? cur : min, scores[0]);
  return conseil;
}

export function calculerStatsScore(tome: Tome): { meilleurScore: number; plusFaible: number; moyenne: number } | null {
  const scores = tome.chapitres
    .filter(c => c.score !== null)
    .map(c => c.score!.scoreGlobal);
  if (scores.length === 0) return null;
  return {
    meilleurScore: Math.max(...scores),
    plusFaible: Math.min(...scores),
    moyenne: Math.round(scores.reduce((a, b) => a + b, 0) / scores.length),
  };
}

export function mettreAJourObjectif(projet: ProjetNarratif, objectif: number): ProjetNarratif {
  return { ...projet, objectifScore: Math.max(0, Math.min(100, objectif)) };
}

// ── Progression ───────────────────────────────────────────────────────────────

export function calculerProgression(projet: ProjetNarratif): {
  total: number;
  analyses: number;
  pourcentage: number;
} {
  const total    = projet.tomes.reduce((acc, t) => acc + t.chapitres.length, 0);
  const analyses = projet.tomes.reduce((acc, t) => acc + t.chapitres.filter(c => c.analyseNarrative !== null).length, 0);
  return { total, analyses, pourcentage: total === 0 ? 0 : Math.round((analyses / total) * 100) };
}
