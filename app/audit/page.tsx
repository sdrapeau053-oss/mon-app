"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

// ── Constantes lexicales ──────────────────────────────────────────────────

const STOP_WORDS = new Set([
  "le","la","les","de","du","des","un","une","et","en","au","aux","à","par",
  "sur","sous","dans","avec","pour","sans","mais","ou","donc","or","ni","car",
  "que","qui","quoi","dont","où","si","ne","pas","plus","très","bien","aussi",
  "même","tout","tous","toute","toutes","cette","cet","ces","son","sa","ses",
  "mon","ma","mes","ton","ta","tes","leur","leurs","nous","vous","ils","elles",
  "je","tu","il","elle","on","me","te","se","lui","y","en","ça","ce","comme",
  "alors","après","avant","encore","déjà","jamais","toujours","souvent","peu",
  "trop","très","tant","moins","plus","quand","puis","donc","ainsi","enfin",
  "fois","moment","chose","façon","sorte","type","genre","quelque","quelques",
  "autre","autres","même","rien","tout","ici","là","voilà","voici","être","avoir",
  "faire","dire","aller","voir","venir","pouvoir","vouloir","falloir","savoir",
  "était","avait","fait","dit","allait","venait","pouvait","voulait","savait",
  "une","deux","trois","quatre","cinq","six","sept","huit","neuf","dix",
  "entre","vers","chez","contre","depuis","jusqu","lors","quant","afin",
]);

const MOTS_SENSORIELS = new Set([
  "froid","chaud","lumière","ombre","odeur","voix","bruit","silence","main",
  "sol","mur","fenêtre","table","lit","porte","escalier","nuit","pluie",
  "fumée","sang","lait","pain","eau","pierre","bois","tissu","peau","dents",
  "regard","souffle","chaleur","noirceur","blancheur","humide","sec","lourd",
  "léger","rugueux","lisse","aigu","grave","doux","dur","frais","brûlant",
  "poussière","sueur","larme","feu","cendre","neige","vent","cri","sifflement",
]);

const MOTS_ABSTRAITS = new Set([
  "sentiment","émotion","relation","situation","problème","violence","souffrance",
  "mémoire","identité","histoire","traumatisme","résilience","anxiété","tristesse",
  "bonheur","amour","haine","peur","joie","douleur","trauma","conscience",
  "pensée","réflexion","compréhension","psychologie","comportement","attitude",
]);

const MOTS_CORPORELS = new Set([
  "corps","main","pied","genou","ventre","dos","bras","tête","yeux","bouche",
  "gorge","poitrine","jambe","nuque","épaule","coude","poignet","cheville","front",
]);

const FORMULES_INTERDITES = [
  "je comprenais que","je réalisais que","cela signifiait","je me sentais",
  "j'étais traumatisée","j'étais traumatisé","je savais que quelque chose",
  "c'était violent","c'était toxique","cela m'a marquée","cela m'a marqué",
  "mon corps se souvenait","je me souviens que","j'avais compris que",
  "je réalise maintenant","je sais maintenant","avec le recul",
];

const RACINES_EXPLICATIVES = [
  "expliqu","compren","comprend","réalis","signifi","analys","démontr",
  "prouve","montre que","indique que","révèle que",
];

// ── Types ────────────────────────────────────────────────────────────────

type Niveau = "fort" | "moyen" | "faible";

type Finding = {
  niveau: Niveau;
  texte: string;
  reference?: string;
};

type AuditResult = {
  lexical: Finding[];
  structurel: Finding[];
  voix: Finding[];
  tension: Finding[];
  directives: Finding[];
};

type Fragment = {
  id: number;
  texte: string;
  tome: string;
  tomeId: number;
  chapitre: string;
  manuscrit: boolean;
};

type Tome = { id: number; titre: string };

// ── Helpers ──────────────────────────────────────────────────────────────

function tokeniser(texte: string): string[] {
  return texte.toLowerCase()
    .replace(/['']/g, " ")
    .replace(/[^a-zàâäéèêëîïôùûüçœæ\s]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length >= 5 && !STOP_WORDS.has(w));
}

function tokeniserTout(texte: string): string[] {
  return texte.toLowerCase()
    .replace(/['']/g, " ")
    .replace(/[^a-zàâäéèêëîïôùûüçœæ\s]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 0);
}

function premiersMots(texte: string, n = 6): string {
  return texte.trim().split(/\s+/).slice(0, n).join(" ").toLowerCase();
}

function derniersMots(texte: string, n = 6): string {
  const mots = texte.trim().split(/\s+/);
  return mots.slice(Math.max(0, mots.length - n)).join(" ").toLowerCase();
}

function ecartType(valeurs: number[]): number {
  if (valeurs.length < 2) return 0;
  const moy = valeurs.reduce((a, b) => a + b, 0) / valeurs.length;
  const variance = valeurs.reduce((a, b) => a + (b - moy) ** 2, 0) / valeurs.length;
  return Math.sqrt(variance);
}

function niveauBadge(n: Niveau): string {
  return n === "fort" ? "FORT" : n === "moyen" ? "MOYEN" : "FAIBLE";
}

function refLabel(tomes: Tome[], tomeId: number, chapitre?: string): string {
  const t = tomes.find((t) => t.id === tomeId);
  const tStr = t ? t.titre : `Tome ${tomeId}`;
  return chapitre ? `${tStr} › ${chapitre}` : tStr;
}

// ── Audit ────────────────────────────────────────────────────────────────

function lancerAudit(
  fragments: Fragment[],
  tomes: Tome[],
  chapitresParTome: Record<number, string[]>
): AuditResult {
  const lexical: Finding[] = [];
  const structurel: Finding[] = [];
  const voix: Finding[] = [];
  const tension: Finding[] = [];
  const directives: Finding[] = [];

  // ── Section 1 : répétitions lexicales ──────────────────────────────────

  const freqMots: Record<string, { count: number; chapitres: Set<string> }> = {};
  const freqBigrammes: Record<string, { count: number; chapitres: Set<string> }> = {};

  for (const f of fragments) {
    const ref = refLabel(tomes, f.tomeId, f.chapitre);
    const mots = tokeniser(f.texte);
    for (const m of mots) {
      if (!freqMots[m]) freqMots[m] = { count: 0, chapitres: new Set() };
      freqMots[m].count++;
      freqMots[m].chapitres.add(ref);
    }
    for (let i = 0; i < mots.length - 1; i++) {
      const bi = `${mots[i]} ${mots[i + 1]}`;
      if (!freqBigrammes[bi]) freqBigrammes[bi] = { count: 0, chapitres: new Set() };
      freqBigrammes[bi].count++;
      freqBigrammes[bi].chapitres.add(ref);
    }
  }

  Object.entries(freqMots)
    .filter(([, v]) => v.count >= 4)
    .sort((a, b) => b[1].count - a[1].count)
    .slice(0, 15)
    .forEach(([mot, v]) => {
      lexical.push({
        niveau: v.count >= 7 ? "fort" : "moyen",
        texte: `"${mot}" — ${v.count} occurrences`,
        reference: [...v.chapitres].slice(0, 3).join(", "),
      });
    });

  Object.entries(freqBigrammes)
    .filter(([, v]) => v.count >= 3)
    .sort((a, b) => b[1].count - a[1].count)
    .slice(0, 8)
    .forEach(([bi, v]) => {
      lexical.push({
        niveau: v.count >= 5 ? "fort" : "moyen",
        texte: `Expression récurrente : "${bi}" — ${v.count} fois`,
        reference: [...v.chapitres].slice(0, 3).join(", "),
      });
    });

  // ── Section 2 : répétitions structurelles ──────────────────────────────

  // Amorces similaires
  const amorces: Record<string, Fragment[]> = {};
  for (const f of fragments) {
    const debut = premiersMots(f.texte, 3);
    if (!amorces[debut]) amorces[debut] = [];
    amorces[debut].push(f);
  }
  Object.entries(amorces)
    .filter(([, frags]) => frags.length >= 2)
    .forEach(([debut, frags]) => {
      structurel.push({
        niveau: frags.length >= 3 ? "fort" : "moyen",
        texte: `${frags.length} fragments commencent par "${debut}…"`,
        reference: [...new Set(frags.map((f) => refLabel(tomes, f.tomeId, f.chapitre)))].join(", "),
      });
    });

  // Fins similaires
  const fins: Record<string, Fragment[]> = {};
  for (const f of fragments) {
    const fin = derniersMots(f.texte, 3);
    if (!fins[fin]) fins[fin] = [];
    fins[fin].push(f);
  }
  Object.entries(fins)
    .filter(([, frags]) => frags.length >= 2)
    .forEach(([fin, frags]) => {
      structurel.push({
        niveau: "moyen",
        texte: `${frags.length} fragments se terminent par "…${fin}"`,
        reference: [...new Set(frags.map((f) => refLabel(tomes, f.tomeId, f.chapitre)))].join(", "),
      });
    });

  // Homogénéité de longueur par chapitre
  for (const tome of tomes) {
    for (const chapitre of (chapitresParTome[tome.id] ?? [])) {
      const frags = fragments.filter((f) => f.tomeId === tome.id && f.chapitre === chapitre);
      if (frags.length < 3) continue;
      const longueurs = frags.map((f) => f.texte.split(/\s+/).length);
      const moy = longueurs.reduce((a, b) => a + b, 0) / longueurs.length;
      const et = ecartType(longueurs);
      if (et / moy < 0.15) {
        structurel.push({
          niveau: "moyen",
          texte: `Variation rythmique insuffisante — tous les fragments ont une longueur similaire (±${Math.round(et / moy * 100)}%)`,
          reference: refLabel(tomes, tome.id, chapitre),
        });
      }
    }
  }

  // ── Section 3 : cohérence de voix ──────────────────────────────────────

  // Couche 1 : formules interdites
  for (const f of fragments) {
    const texteMin = f.texte.toLowerCase();
    for (const formule of FORMULES_INTERDITES) {
      if (texteMin.includes(formule)) {
        voix.push({
          niveau: "fort",
          texte: `Formule interdite détectée : "${formule}"`,
          reference: refLabel(tomes, f.tomeId, f.chapitre),
        });
      }
    }
  }

  // Couche 2 : verbes explicatifs par chapitre
  for (const tome of tomes) {
    for (const chapitre of (chapitresParTome[tome.id] ?? [])) {
      const frags = fragments.filter((f) => f.tomeId === tome.id && f.chapitre === chapitre);
      if (frags.length === 0) continue;
      const texteJoint = frags.map((f) => f.texte).join(" ").toLowerCase();
      let count = 0;
      for (const racine of RACINES_EXPLICATIVES) {
        const re = new RegExp(racine, "g");
        count += (texteJoint.match(re) ?? []).length;
      }
      if (count > 2) {
        voix.push({
          niveau: count > 4 ? "fort" : "moyen",
          texte: `${count} occurrences de verbes ou formules explicatifs`,
          reference: refLabel(tomes, tome.id, chapitre),
        });
      }
    }
  }

  // Couche 3 : ratio d'abstraction par chapitre
  for (const tome of tomes) {
    for (const chapitre of (chapitresParTome[tome.id] ?? [])) {
      const frags = fragments.filter((f) => f.tomeId === tome.id && f.chapitre === chapitre);
      if (frags.length === 0) continue;
      const tousLesMots = tokeniserTout(frags.map((f) => f.texte).join(" "));
      if (tousLesMots.length === 0) continue;
      const abstraits = tousLesMots.filter((m) => MOTS_ABSTRAITS.has(m)).length;
      const ratio = abstraits / tousLesMots.length;
      if (ratio > 0.015) {
        voix.push({
          niveau: ratio > 0.03 ? "fort" : "moyen",
          texte: `Ratio d'abstraction élevé — ${(ratio * 100).toFixed(1)}% de mots abstraits`,
          reference: refLabel(tomes, tome.id, chapitre),
        });
      }
    }
  }

  // ── Section 4 : tension narrative ──────────────────────────────────────

  // Chapitres insuffisants
  for (const tome of tomes) {
    for (const chapitre of (chapitresParTome[tome.id] ?? [])) {
      const frags = fragments.filter((f) => f.tomeId === tome.id && f.chapitre === chapitre);
      if (frags.length === 1) {
        tension.push({
          niveau: "moyen",
          texte: "Un seul fragment — chapitre insuffisamment développé",
          reference: refLabel(tomes, tome.id, chapitre),
        });
      }
    }
  }

  // Densité sensorielle par chapitre
  for (const tome of tomes) {
    for (const chapitre of (chapitresParTome[tome.id] ?? [])) {
      const frags = fragments.filter((f) => f.tomeId === tome.id && f.chapitre === chapitre);
      if (frags.length === 0) continue;
      const tousLesMots = tokeniserTout(frags.map((f) => f.texte).join(" "));
      if (tousLesMots.length < 50) continue;
      const sensoriels = tousLesMots.filter((m) => MOTS_SENSORIELS.has(m)).length;
      const ratio = sensoriels / tousLesMots.length;
      if (ratio < 0.005) {
        tension.push({
          niveau: ratio === 0 ? "fort" : "moyen",
          texte: `Densité sensorielle très faible — ${(ratio * 100).toFixed(2)}%`,
          reference: refLabel(tomes, tome.id, chapitre),
        });
      }
    }
  }

  // Contraste entre tomes
  const densitesTomes = tomes.map((tome) => {
    const frags = fragments.filter((f) => f.tomeId === tome.id);
    const tousLesMots = tokeniserTout(frags.map((f) => f.texte).join(" "));
    if (tousLesMots.length === 0) return null;
    return tousLesMots.filter((m) => MOTS_SENSORIELS.has(m)).length / tousLesMots.length;
  }).filter((d): d is number => d !== null);

  if (densitesTomes.length >= 2) {
    const et = ecartType(densitesTomes);
    const moy = densitesTomes.reduce((a, b) => a + b, 0) / densitesTomes.length;
    if (moy > 0 && et / moy < 0.2) {
      tension.push({
        niveau: "faible",
        texte: "Contraste sensoriel faible entre les tomes — densité trop homogène",
        reference: "Ensemble du manuscrit",
      });
    }
  }

  // ── Section 5 : respect des directives ─────────────────────────────────

  // Phrases trop longues
  for (const f of fragments) {
    const phrases = f.texte.split(/[.!?]+/).filter((p) => p.trim().length > 0);
    for (const phrase of phrases) {
      const nbMots = phrase.trim().split(/\s+/).length;
      if (nbMots > 50) {
        directives.push({
          niveau: nbMots > 70 ? "fort" : "moyen",
          texte: `Phrase de ${nbMots} mots — sur-explication probable`,
          reference: refLabel(tomes, f.tomeId, f.chapitre),
        });
        break;
      }
    }
  }

  // Absence de mots corporels par chapitre
  for (const tome of tomes) {
    for (const chapitre of (chapitresParTome[tome.id] ?? [])) {
      const frags = fragments.filter((f) => f.tomeId === tome.id && f.chapitre === chapitre);
      if (frags.length < 2) continue;
      const tousLesMots = tokeniserTout(frags.map((f) => f.texte).join(" "));
      const corporels = tousLesMots.filter((m) => MOTS_CORPORELS.has(m)).length;
      if (corporels === 0) {
        directives.push({
          niveau: "moyen",
          texte: "Aucun mot corporel détecté — texte potentiellement désincorporé",
          reference: refLabel(tomes, tome.id, chapitre),
        });
      }
    }
  }

  // Similarité entre fragments d'un même chapitre
  for (const tome of tomes) {
    for (const chapitre of (chapitresParTome[tome.id] ?? [])) {
      const frags = fragments.filter((f) => f.tomeId === tome.id && f.chapitre === chapitre);
      if (frags.length < 2) continue;
      for (let i = 0; i < frags.length - 1; i++) {
        const motsA = new Set(tokeniser(frags[i].texte));
        const motsB = new Set(tokeniser(frags[i + 1].texte));
        const communs = [...motsA].filter((m) => motsB.has(m)).length;
        const union = new Set([...motsA, ...motsB]).size;
        if (union > 0 && communs / union > 0.4) {
          directives.push({
            niveau: "fort",
            texte: `Fragments ${i + 1} et ${i + 2} trop similaires lexicalement (${Math.round(communs / union * 100)}% de mots communs)`,
            reference: refLabel(tomes, tome.id, chapitre),
          });
        }
      }
    }
  }

  return { lexical, structurel, voix, tension, directives };
}

// ── Génération du prompt audit littéraire ────────────────────────────────

function genererPromptAudit(
  fragments: Fragment[],
  tomes: Tome[],
  chapitresParTome: Record<number, string[]>
): string {
  const intro = `Tu es directeur littéraire pour un projet autobiographique exigeant.

Analyse ce manuscrit comme une œuvre littéraire, pas comme un texte explicatif.

Tu dois privilégier dans ton analyse :
- le non-dit
- le corps
- la perception
- la tension implicite

---

RÈGLES D'ÉCRITURE À RESPECTER DANS L'ANALYSE

Le manuscrit doit obéir à ces principes :
- corps avant idée
- atmosphère avant événement
- montrer sans expliquer
- aucune pédagogie
- aucune sur-explication
- aucune analyse psychologique explicite
- aucune phrase décorative
- tension implicite constante
- une loi implicite par chapitre
- aucune répétition de fonction narrative

Toute déviation de ces règles est une faiblesse.

---

TU DOIS DÉTECTER :

1. Répétitions de fonction narrative
Scènes qui jouent le même rôle dans la structure.
Cite les chapitres concernés.

2. Répétitions émotionnelles
Mêmes effets produits sur le lecteur, répétés.
Cite les passages.

3. Faiblesses de tension
Passages plats, trop explicatifs, inutiles ou sans ancrage sensoriel.
Cite des extraits précis.

4. Dérives de voix
Perte de sobriété, glissement vers l'analyse, l'abstraction ou la psychologie.
Cite des extraits précis.

5. Problèmes de structure globale
Déséquilibres entre tomes, manque de progression, chapitres sans loi implicite.

6. Ce qui doit être coupé sans discussion
Liste directe, sans justification longue.
Ce qui affaiblit le manuscrit et doit disparaître.

---

NIVEAUX D'ALERTE OBLIGATOIRES

Pour chaque observation, indique le niveau :

CRITIQUE — nuit fortement au manuscrit
IMPORTANT — affaiblit la qualité
MINEUR — amélioration possible

Chaque observation doit commencer par son niveau entre crochets.
Exemple : [CRITIQUE] Le fragment X répète la fonction narrative du chapitre Y.

---

RÈGLES DE RÉPONSE :

- aucune complaisance
- aucune généralité
- chaque observation citée avec un extrait ou une référence précise
- dire ce qui doit être coupé
- dire ce qui doit être renforcé
- répondre section par section

---

MANUSCRIT :`;

  const corps = tomes.map((tome) => {
    const chapitres = chapitresParTome[tome.id] ?? [];
    const fragsduTome = fragments.filter((f) => f.tomeId === tome.id);
    if (fragsduTome.length === 0) return null;

    const chapitresStr = chapitres.map((chapitre) => {
      const frags = fragsduTome.filter((f) => f.chapitre === chapitre);
      if (frags.length === 0) return null;
      const textes = frags.map((f) => f.texte).join("\n\n*\n\n");
      return `── ${chapitre} ──\n\n${textes}`;
    }).filter(Boolean).join("\n\n");

    return `═══ ${tome.titre} ═══\n\n${chapitresStr}`;
  }).filter(Boolean).join("\n\n\n");

  return `${intro}\n\n${corps}`;
}

// ── Composant ────────────────────────────────────────────────────────────

const NIVEAU_COLOR: Record<Niveau, string> = {
  fort: "#b04040",
  moyen: "#b89060",
  faible: "#7a9a7a",
};

function SectionAudit({ titre, findings }: { titre: string; findings: Finding[] }) {
  const [ouvert, setOuvert] = useState(true);
  return (
    <div style={{ marginBottom: 24 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: ouvert ? 12 : 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <p style={{ fontSize: 13, fontWeight: 600, color: "var(--text-main)", margin: 0 }}>{titre}</p>
          <span style={{
            fontSize: 10,
            fontWeight: 700,
            padding: "2px 8px",
            borderRadius: 20,
            background: findings.length === 0 ? "#f0f5f0" : "#fdf0f0",
            color: findings.length === 0 ? "#5a8f6a" : "#b04040",
            border: `1px solid ${findings.length === 0 ? "#c0dcc0" : "#e8c0c0"}`,
          }}>
            {findings.length === 0 ? "✓ rien détecté" : `${findings.length} signal${findings.length > 1 ? "s" : ""}`}
          </span>
        </div>
        <button className="decision-toggle" onClick={() => setOuvert(!ouvert)}>
          {ouvert ? "▾" : "▸"}
        </button>
      </div>

      {ouvert && findings.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {findings.map((f, i) => (
            <div key={i} style={{
              padding: "10px 14px",
              background: "#fdfcf9",
              border: `1px solid var(--border-soft)`,
              borderLeft: `3px solid ${NIVEAU_COLOR[f.niveau]}`,
              borderRadius: "0 6px 6px 0",
            }}>
              <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginBottom: 4 }}>
                <span style={{
                  fontSize: 9,
                  fontWeight: 700,
                  letterSpacing: 1.5,
                  textTransform: "uppercase",
                  color: NIVEAU_COLOR[f.niveau],
                }}>
                  {niveauBadge(f.niveau)}
                </span>
                {f.reference && (
                  <span style={{ fontSize: 11, color: "#aaa" }}>{f.reference}</span>
                )}
              </div>
              <p style={{ fontSize: 13, color: "var(--text-main)", lineHeight: 1.6, margin: 0 }}>{f.texte}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function Audit() {
  const [fragments, setFragments] = useState<Fragment[]>([]);
  const [tomes, setTomes] = useState<Tome[]>([]);
  const [chapitresParTome, setChapitresParTome] = useState<Record<number, string[]>>({});
  const [auditResult, setAuditResult] = useState<AuditResult | null>(null);
  const [prompt, setPrompt] = useState<string | null>(null);
  const [copie, setCopie] = useState(false);
  const [apercu, setApercu] = useState(false);

  useEffect(() => {
    const saved = JSON.parse(localStorage.getItem("fragments") || "[]");
    setFragments(saved.filter((f: any) => f.manuscrit));
    const savedTomes = localStorage.getItem("structure-tomes");
    setTomes(savedTomes ? JSON.parse(savedTomes) : [
      { id: 1, titre: "Tome 1 — Enfance" },
      { id: 2, titre: "Tome 2 — Adolescence" },
      { id: 3, titre: "Tome 3 — Mariage violent" },
      { id: 4, titre: "Tome 4 — Procès" },
    ]);
    const savedChapitres = localStorage.getItem("structure-chapitres");
    setChapitresParTome(savedChapitres ? JSON.parse(savedChapitres) : {});
  }, []);

  function lancerAuditClient() {
    setAuditResult(lancerAudit(fragments, tomes, chapitresParTome));
  }

  function lancerAuditLitteraire() {
    const p = genererPromptAudit(fragments, tomes, chapitresParTome);
    setPrompt(p);
  }

  async function copierPromptAudit() {
    if (!prompt) return;
    try {
      await navigator.clipboard.writeText(prompt);
      setCopie(true);
      setTimeout(() => setCopie(false), 1500);
    } catch {}
  }

  const totalMots = fragments.reduce((acc, f) => acc + (f.texte?.trim().split(/\s+/).length ?? 0), 0);
  const totalSignaux = auditResult
    ? auditResult.lexical.length + auditResult.structurel.length + auditResult.voix.length + auditResult.tension.length + auditResult.directives.length
    : 0;
  const promptMots = prompt ? prompt.split(/\s+/).length : 0;
  const promptNote = promptMots > 20000
    ? "Manuscrit long — préférer Claude (200k tokens)"
    : "Compatible ChatGPT-4 et Claude";

  return (
    <main style={{ maxWidth: 800, margin: "0 auto", padding: "32px 24px" }}>

      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20 }}>
        <div>
          <h1 style={{ fontSize: 22, fontStyle: "italic", color: "var(--primary)" }}>Audit du manuscrit</h1>
          <p style={{ fontSize: 12, color: "#999" }}>
            {fragments.length} fragment{fragments.length > 1 ? "s" : ""} · {totalMots.toLocaleString("fr-CA")} mots
          </p>
        </div>
        <nav style={{ display: "flex", gap: 14, flexWrap: "wrap", justifyContent: "flex-end" }}>
          <Link href="/" style={{ fontSize: 12, color: "var(--primary)" }}>← Atelier</Link>
          <Link href="/fragments" style={{ fontSize: 12, color: "var(--primary)" }}>Coffre →</Link>
          <Link href="/structure" style={{ fontSize: 12, color: "var(--primary)" }}>Structure →</Link>
          <Link href="/lecture" style={{ fontSize: 12, color: "var(--primary)" }}>Lecture →</Link>
        </nav>
      </div>
      <div style={{ borderTop: "1px solid var(--border-soft)", marginBottom: 28 }} />

      {fragments.length === 0 && (
        <p style={{ color: "#bbb", fontStyle: "italic" }}>Aucun fragment dans le manuscrit.</p>
      )}

      {fragments.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 40 }}>

          {/* ── Audit technique ────────────────────────────────────────── */}
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <div>
                <p style={{ fontSize: 15, fontWeight: 600, color: "var(--text-main)", marginBottom: 2 }}>Audit technique</p>
                <p style={{ fontSize: 12, color: "#999" }}>Répétitions, voix, tension, directives — analyse locale</p>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                {auditResult && (
                  <span style={{ fontSize: 11, color: totalSignaux > 0 ? "#b04040" : "#5a8f6a" }}>
                    {totalSignaux} signal{totalSignaux > 1 ? "s" : ""}
                  </span>
                )}
                <button onClick={lancerAuditClient} className="btn-primary" style={{ fontSize: 13, padding: "8px 20px" }}>
                  {auditResult ? "Relancer" : "Lancer l'audit"}
                </button>
              </div>
            </div>

            {auditResult && (
              <div className="panel">
                <SectionAudit titre="1. Répétitions lexicales" findings={auditResult.lexical} />
                <SectionAudit titre="2. Répétitions structurelles" findings={auditResult.structurel} />
                <SectionAudit titre="3. Cohérence de voix" findings={auditResult.voix} />
                <SectionAudit titre="4. Tension narrative" findings={auditResult.tension} />
                <SectionAudit titre="5. Respect des directives" findings={auditResult.directives} />
              </div>
            )}
          </div>

          {/* ── Audit littéraire IA ────────────────────────────────────── */}
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <div>
                <p style={{ fontSize: 15, fontWeight: 600, color: "var(--text-main)", marginBottom: 2 }}>Audit littéraire (IA)</p>
                <p style={{ fontSize: 12, color: "#999" }}>Génère un prompt à coller dans Claude ou ChatGPT</p>
              </div>
              <button onClick={lancerAuditLitteraire} className="btn-primary" style={{ fontSize: 13, padding: "8px 20px" }}>
                {prompt ? "Régénérer" : "Générer le prompt"}
              </button>
            </div>

            {prompt && (
              <div className="panel" style={{ display: "flex", flexDirection: "column", gap: 14 }}>

                {/* Méta */}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontSize: 12, color: "#888" }}>
                    ~{promptMots.toLocaleString("fr-CA")} mots · {promptNote}
                  </span>
                  <div style={{ display: "flex", gap: 8 }}>
                    <button
                      onClick={() => setApercu(!apercu)}
                      className="btn-ghost"
                      style={{ fontSize: 12, padding: "5px 14px" }}
                    >
                      {apercu ? "Masquer" : "Aperçu"}
                    </button>
                    <button
                      onClick={copierPromptAudit}
                      className="btn-primary"
                      style={{ fontSize: 12, padding: "5px 18px" }}
                    >
                      {copie ? "✓ Copié" : "Copier le prompt"}
                    </button>
                  </div>
                </div>

                {/* Aperçu scrollable */}
                {apercu && (
                  <pre style={{
                    fontSize: 11,
                    lineHeight: 1.7,
                    color: "#666",
                    background: "#fdfcf9",
                    border: "1px solid var(--border-soft)",
                    borderRadius: 6,
                    padding: "14px 16px",
                    maxHeight: 320,
                    overflow: "auto",
                    whiteSpace: "pre-wrap",
                    fontFamily: "Georgia, serif",
                    margin: 0,
                  }}>
                    {prompt}
                  </pre>
                )}

              </div>
            )}
          </div>

        </div>
      )}
    </main>
  );
}
