// ── Types ─────────────────────────────────────────────────────────────────────

export interface TruthModeResult {
  zonesFloues:    string[];
  evitements:     string[];
  sujetsFlous:    { mot: string; count: number }[];
  phrasesLongues: string[];
  repetitions:    { mot: string; count: number }[];
  emotionFaible:  boolean;
  concretFaible:  boolean;
  positionFaible: boolean;
  scores: {
    clarte:     number;
    emotion:    number;
    concret:    number;
    repetition: number;
    global:     number;
  };
}

export const TRUTH_VIDE: TruthModeResult = {
  zonesFloues: [], evitements: [], sujetsFlous: [], phrasesLongues: [], repetitions: [],
  emotionFaible: false, concretFaible: false, positionFaible: false,
  scores: { clarte: 10, emotion: 10, concret: 10, repetition: 10, global: 10 },
};

// ── Listes de détection ───────────────────────────────────────────────────────

const ZONES_FLOUES = [
  "un peu", "beaucoup", "c'était compliqué", "je pense",
  "peut-être", "quelque chose", "des trucs", "ça",
];

const EVITEMENTS = [
  "je crois que", "j'ai l'impression que", "comme si", "on dirait que",
];

const SUJETS_FLOUS = ["ils", "on", "ça", "quelqu'un"];

const MOTS_EMOTION = [
  "triste", "peur", "colère", "honte", "joie", "solitude",
  "douleur", "rage", "culpabilité", "vide",
];

const MOTS_CONCRET = [
  "voir", "vu", "entendre", "entendu", "sentir", "odeur", "bruit",
  "couleur", "froid", "chaud", "voix", "main", "corps", "visage", "regard",
];

const MOTS_POSITION = [
  "je veux", "je voulais", "je refuse", "je refusais",
  "je déteste", "j'ai décidé", "je savais", "je ne voulais pas",
];

const STOPWORDS = new Set([
  "le","la","les","un","une","de","du","des","et","à","a","au","aux",
  "je","tu","il","elle","on","nous","vous","ils","elles",
  "ce","cet","cette","ces","dans","en","sur","pour","par","avec",
  "que","qui","quoi","dont","où","ne","pas","plus","se","sa","son","ses",
  "mon","ma","mes","ton","ta","tes","leur","leurs","y","lui",
  "c","d","j","l","m","n","s","t","qu","m","n",
]);

// ── Helpers ───────────────────────────────────────────────────────────────────

function compterOccurrences(texte: string, mot: string): number {
  const escaped = mot.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const re = new RegExp(`(?<![a-zàâäéèêëîïôùûüœ])${escaped}(?![a-zàâäéèêëîïôùûüœ])`, "gi");
  return (texte.match(re) ?? []).length;
}

function contient(texte: string, expression: string): boolean {
  return compterOccurrences(texte, expression) > 0;
}

function clamp(val: number, min: number, max: number) {
  return Math.min(max, Math.max(min, val));
}

// ── Fonction principale ───────────────────────────────────────────────────────

export function analyserTruthMode(texte: string): TruthModeResult {
  if (!texte.trim()) return TRUTH_VIDE;

  // 1. Zones floues — présentes dans le texte, sans doublons
  const zonesFloues = ZONES_FLOUES.filter(z => contient(texte, z));

  // 2. Évitements
  const evitements = EVITEMENTS.filter(e => contient(texte, e));

  // 3. Sujets flous — seulement ceux avec au moins 2 occurrences
  const sujetsFlous = SUJETS_FLOUS
    .map(mot => ({ mot, count: compterOccurrences(texte, mot) }))
    .filter(s => s.count >= 2)
    .sort((a, b) => b.count - a.count);

  // 4. Émotion
  const nbEmotion = MOTS_EMOTION.filter(m => contient(texte, m)).length;
  const emotionFaible = nbEmotion === 0;

  // 5. Concret
  const nbConcret = MOTS_CONCRET.filter(m => contient(texte, m)).length;
  const concretFaible = nbConcret < 2;

  // 6. Position personnelle
  const nbPosition = MOTS_POSITION.filter(m => contient(texte, m)).length;
  const positionFaible = nbPosition === 0;

  // 7. Répétitions — top 5 mots non-stopwords avec count >= 2
  const mots = texte
    .toLowerCase()
    .normalize("NFD").replace(/[̀-ͯ]/g, "")   // retire accents pour le tokenizing
    .replace(/[.,!?;:«»"''""\-()\[\]]/g, " ")
    .split(/\s+/)
    .filter(m => m.length > 2 && !STOPWORDS.has(m));

  const freq: Record<string, number> = {};
  for (const m of mots) freq[m] = (freq[m] ?? 0) + 1;

  const repetitions = Object.entries(freq)
    .filter(([, c]) => c >= 2)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5)
    .map(([mot, count]) => ({ mot, count }));

  // 8. Phrases longues (> 25 mots)
  const phrases = texte
    .split(/(?<=[.!?])\s+/)
    .map(p => p.trim())
    .filter(p => p.split(/\s+/).length > 25)
    .slice(0, 5);

  const phrasesLongues = phrases;

  // 9. Scores
  const clarte = clamp(
    10
    - clamp(zonesFloues.length, 0, 3)
    - clamp(sujetsFlous.length, 0, 2)
    - clamp(phrasesLongues.length, 0, 5),
    1, 10
  );
  const emotion    = emotionFaible ? 4 : clamp(10 - Math.max(0, 3 - nbEmotion), 6, 10);
  const concret    = concretFaible ? (nbConcret === 0 ? 2 : 5) : clamp(8 + Math.min(nbConcret - 2, 2), 8, 10);
  const repetition = clamp(10 - repetitions.filter(r => r.count >= 3).length * 2, 2, 10);
  const global     = Math.round((clarte + emotion + concret + repetition) / 4);

  return {
    zonesFloues, evitements, sujetsFlous, phrasesLongues,
    repetitions, emotionFaible, concretFaible, positionFaible,
    scores: { clarte, emotion, concret, repetition, global },
  };
}
