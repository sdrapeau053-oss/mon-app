// Phase 8bis.3b — Correction de l'absence de score IA.
//
// Extrait de page.tsx (Phase 8bis.3) pour rendre parseScore/parseAnalyseIA
// directement testables sans importer un fichier de page Next.js dans les
// tests (voir vitest.config.mts : ce dépôt évite volontairement toute
// dépendance DOM/rendu de composant dans ses tests). Aucune logique
// analytique nouvelle : ce fichier ne fait que parser le texte déjà produit
// par le prompt IA existant, inchangé.
//
// Comportement avant Phase 8bis.3b : un tag "..._SCORE" absent ou non
// interprétable produisait la valeur arbitraire 50, indiscernable d'un
// score réellement évalué à 50 par l'IA — ce qui pouvait faire créer un
// ScoreAssessment fabriqué (SR-D-001, Décision 3 : aucune valeur ne doit
// être inventée). Comportement après : absence ou valeur non interprétable
// produisent explicitement `null`, jamais une valeur numérique devinée.

export interface AnalyseIA {
  faits: string;
  interpretations: string;
  inconnues: string;
  clarte: string;
  clarteScore: number | null;
  reciprocite: string;
  reciprociteScore: number | null;
  securite: string;
  securiteScore: number | null;
  anglesMorts: string;
  verdict: string;
}

function parseSection(text: string, tag: string): string {
  const open = "[" + tag + "]";
  const close = "[/" + tag + "]";
  const i1 = text.indexOf(open);
  const i2 = text.indexOf(close);
  if (i1 >= 0 && i2 > i1) return text.slice(i1 + open.length, i2).trim();
  return "";
}

// Score réellement présent et interprétable (entier) -> valeur clampée sur
// l'échelle canonique 0-100 (Décision 2), inchangé par rapport à avant.
// Tag absent, contenu vide, ou contenu non interprétable comme un entier ->
// `null` explicite (jamais 0, jamais 50, jamais une valeur devinée).
export function parseScore(text: string, tag: string): number | null {
  const raw = parseSection(text, tag + "_SCORE");
  const n = parseInt(raw, 10);
  return Number.isFinite(n) ? Math.max(0, Math.min(100, n)) : null;
}

export function parseAnalyseIA(text: string): AnalyseIA {
  return {
    faits: parseSection(text, "FAITS"),
    interpretations: parseSection(text, "INTERPRETATIONS"),
    inconnues: parseSection(text, "INCONNUES"),
    clarte: parseSection(text, "CLARTE"),
    clarteScore: parseScore(text, "CLARTE"),
    reciprocite: parseSection(text, "RECIPROCITE"),
    reciprociteScore: parseScore(text, "RECIPROCITE"),
    securite: parseSection(text, "SECURITE"),
    securiteScore: parseScore(text, "SECURITE"),
    anglesMorts: parseSection(text, "ANGLES"),
    verdict: parseSection(text, "VERDICT"),
  };
}
