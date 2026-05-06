"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { lireFragments, type Fragment } from "@/lib/fragments";

// ── Analyse textuelle ─────────────────────────────────────────────────────────

const STOPWORDS = new Set([
  "le","la","les","un","une","des","de","du","d","l","j","m","t","s","n","c","qu",
  "et","en","à","au","aux","je","tu","il","elle","nous","vous","ils","elles",
  "mon","ma","mes","ton","ta","tes","son","sa","ses","ce","cette","ces",
  "que","qui","quand","où","si","mais","ou","donc","or","ni","car","dont",
  "est","était","sont","étaient","être","avoir","fait","faire","avait","avais","été",
  "sur","sous","dans","par","pour","avec","sans","pas","ne","se","me","te",
  "lui","y","on","tout","plus","très","bien","aussi","comme","alors",
  "après","avant","entre","vers","chez","même","encore","toujours","jamais",
  "rien","peu","trop","leur","leurs","cet","cela","ça","a","ai","as","ont",
  "non","oui","moi","toi","soi","quoi","quel","quelle","quels","quelles",
  "puis","déjà","lors","puis","ceux","celles","autre","autres","chaque","cette",
]);

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .normalize("NFD").replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z\s]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length >= 4 && !STOPWORDS.has(w));
}

function jaccard(a: Set<string>, b: Set<string>): number {
  let inter = 0;
  for (const x of a) if (b.has(x)) inter++;
  const union = a.size + b.size - inter;
  return union === 0 ? 0 : inter / union;
}

// ── Composants ────────────────────────────────────────────────────────────────

function BarreFreq({ valeur, max, rouge }: { valeur: number; max: number; rouge: boolean }) {
  return (
    <div style={{ flex: 1, background: "#f0ebe3", borderRadius: 4, height: 8, overflow: "hidden" }}>
      <div style={{
        width: `${(valeur / max) * 100}%`, height: "100%", borderRadius: 4,
        background: rouge ? "#c0392b" : "#8B7355",
        transition: "width 0.3s",
      }} />
    </div>
  );
}

export default function Repetitions() {
  const [fragments, setFragments] = useState<Fragment[]>([]);
  const [seuil, setSeuil] = useState(0.22);
  const [pairOuverte, setPairOuverte] = useState<string | null>(null);

  useEffect(() => {
    setFragments(lireFragments());
  }, []);

  const n = fragments.length;

  // ── 1. Fréquence lexicale ─────────────────────────────────────────────────
  const wordFrags = new Map<string, Set<Fragment["id"]>>();
  fragments.forEach((f) => {
    if (!f.texte) return;
    for (const w of new Set(tokenize(f.texte))) {
      if (!wordFrags.has(w)) wordFrags.set(w, new Set());
      wordFrags.get(w)!.add(f.id);
    }
  });
  const seuilMots = Math.max(2, Math.round(n * 0.15));
  const motsCles = [...wordFrags.entries()]
    .filter(([, ids]) => ids.size >= seuilMots)
    .sort((a, b) => b[1].size - a[1].size)
    .slice(0, 30);
  const maxMot = motsCles[0]?.[1].size ?? 1;

  // ── 2. Tags récurrents ───────────────────────────────────────────────────
  const tagCount = new Map<string, number>();
  fragments.forEach((f) => {
    for (const t of f.tags ?? []) tagCount.set(t, (tagCount.get(t) ?? 0) + 1);
  });
  const tagsTriés = [...tagCount.entries()]
    .filter(([, c]) => c >= 2)
    .sort((a, b) => b[1] - a[1]);
  const maxTag = tagsTriés[0]?.[1] ?? 1;

  // ── 3. Paires similaires ─────────────────────────────────────────────────
  const tokenisés = fragments
    .filter((f) => f.texte && tokenize(f.texte).length >= 8)
    .map((f) => ({ f, tokens: new Set(tokenize(f.texte)) }));

  const paires: { f1: Fragment; f2: Fragment; score: number; communs: string[] }[] = [];
  for (let i = 0; i < tokenisés.length; i++) {
    for (let j = i + 1; j < tokenisés.length; j++) {
      const score = jaccard(tokenisés[i].tokens, tokenisés[j].tokens);
      if (score >= seuil) {
        const communs = [...tokenisés[i].tokens]
          .filter((w) => tokenisés[j].tokens.has(w))
          .sort();
        paires.push({ f1: tokenisés[i].f, f2: tokenisés[j].f, score, communs });
      }
    }
  }
  paires.sort((a, b) => b.score - a.score);

  // ── 4. Mots-vedettes par tome ────────────────────────────────────────────
  const motsTome = new Map<string, Map<string, number>>();
  fragments.forEach((f) => {
    if (!f.texte || !f.tome) return;
    const tome = f.tome.replace(/\s*—.*/, "").trim();
    if (!motsTome.has(tome)) motsTome.set(tome, new Map());
    const map = motsTome.get(tome)!;
    for (const w of tokenize(f.texte)) map.set(w, (map.get(w) ?? 0) + 1);
  });
  const vedettes = [...motsTome.entries()].map(([tome, wmap]) => ({
    tome,
    mots: [...wmap.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8),
  })).filter((t) => t.mots.length > 0);

  return (
    <main style={{ maxWidth: 800, margin: "0 auto", padding: 24 }}>

      {/* Nav */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 20 }}>
        <div>
          <h1 style={{ fontSize: 22, fontStyle: "italic", color: "#8B7355" }}>L'Héritage des Silences</h1>
          <p style={{ fontSize: 12, color: "#999" }}>
            Répétitions — {n} fragment{n !== 1 ? "s" : ""} analysé{n !== 1 ? "s" : ""}
          </p>
        </div>
        <div style={{ display: "flex", gap: 16, flexWrap: "wrap", justifyContent: "flex-end" }}>
          <Link href="/" style={{ fontSize: 12, color: "#8B7355" }}>← Atelier</Link>
          <Link href="/fragments" style={{ fontSize: 12, color: "#8B7355" }}>Coffre →</Link>
          <Link href="/tableau" style={{ fontSize: 12, color: "#8B7355" }}>Tableau →</Link>
          <Link href="/chronologie" style={{ fontSize: 12, color: "#8B7355" }}>Chronologie →</Link>
        </div>
      </div>

      {n === 0 && (
        <p style={{ color: "#999", fontStyle: "italic" }}>Aucun fragment dans le coffre.</p>
      )}

      {n > 0 && <>

        {/* ── Section 1 : Répétitions lexicales ─────────────────────────────── */}
        <section style={{ marginBottom: 40 }}>
          <h2 style={{ fontSize: 15, fontWeight: 600, color: "#333", marginBottom: 4 }}>Répétitions lexicales</h2>
          <p style={{ fontSize: 12, color: "#999", marginBottom: 16 }}>
            Mots présents dans au moins {seuilMots} fragments
            {n > 0 && ` (${Math.round(seuilMots / n * 100)}% du coffre)`}
            {" "}— les barres rouges dépassent 40 %.
          </p>
          {motsCles.length === 0 ? (
            <p style={{ color: "#bbb", fontStyle: "italic", fontSize: 13 }}>
              Aucune répétition significative détectée.
            </p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
              {motsCles.map(([mot, ids]) => (
                <div key={mot} style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <span style={{ width: 130, fontSize: 13, color: "#444", flexShrink: 0 }}>{mot}</span>
                  <BarreFreq valeur={ids.size} max={maxMot} rouge={ids.size / n >= 0.4} />
                  <span style={{ width: 90, fontSize: 11, color: "#aaa", flexShrink: 0, textAlign: "right" }}>
                    {ids.size} / {n} ({Math.round(ids.size / n * 100)} %)
                  </span>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* ── Section 2 : Motifs (tags) récurrents ─────────────────────────── */}
        {tagsTriés.length > 0 && (
          <section style={{ marginBottom: 40 }}>
            <h2 style={{ fontSize: 15, fontWeight: 600, color: "#333", marginBottom: 4 }}>Motifs récurrents</h2>
            <p style={{ fontSize: 12, color: "#999", marginBottom: 16 }}>
              Tags présents dans plusieurs fragments — la longueur de la barre est relative au tag le plus fréquent.
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
              {tagsTriés.map(([tag, count]) => (
                <div key={tag} style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <span style={{ width: 130, fontSize: 13, color: "#8B7355", flexShrink: 0 }}>{tag}</span>
                  <BarreFreq valeur={count} max={maxTag} rouge={count / n >= 0.4} />
                  <span style={{ width: 90, fontSize: 11, color: "#aaa", flexShrink: 0, textAlign: "right" }}>
                    {count} / {n} ({Math.round(count / n * 100)} %)
                  </span>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* ── Section 3 : Mots-vedettes par tome ──────────────────────────── */}
        {vedettes.length > 1 && (
          <section style={{ marginBottom: 40 }}>
            <h2 style={{ fontSize: 15, fontWeight: 600, color: "#333", marginBottom: 4 }}>Mots-vedettes par tome</h2>
            <p style={{ fontSize: 12, color: "#999", marginBottom: 16 }}>
              Les 8 mots les plus fréquents dans chaque tome — utile pour repérer les obsessions propres à chaque période.
            </p>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: 12 }}>
              {vedettes.map(({ tome, mots }) => (
                <div key={tome} className="panel" style={{ padding: 14 }}>
                  <p style={{ fontSize: 11, fontWeight: 600, color: "#8B7355", textTransform: "uppercase", letterSpacing: 1, marginBottom: 10 }}>{tome}</p>
                  <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                    {mots.map(([mot, cnt], i) => (
                      <div key={mot} style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <span style={{ fontSize: 12, color: i === 0 ? "#333" : "#888" }}>{mot}</span>
                        <span style={{ fontSize: 11, color: "#ccc" }}>×{cnt}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* ── Section 4 : Paires similaires ────────────────────────────────── */}
        <section>
          <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", flexWrap: "wrap", gap: 8, marginBottom: 4 }}>
            <h2 style={{ fontSize: 15, fontWeight: 600, color: "#333" }}>Scènes potentiellement similaires</h2>
            <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, color: "#888" }}>
              Seuil de similarité
              <input
                type="range" min={10} max={50} step={5}
                value={Math.round(seuil * 100)}
                onChange={(e) => { setSeuil(Number(e.target.value) / 100); setPairOuverte(null); }}
                style={{ width: 80 }}
              />
              <span style={{ width: 30, fontSize: 12, color: "#555", textAlign: "right" }}>
                {Math.round(seuil * 100)} %
              </span>
            </label>
          </div>
          <p style={{ fontSize: 12, color: "#999", marginBottom: 16 }}>
            {paires.length === 0
              ? "Aucune paire similaire à ce seuil — baisse le curseur pour assouplir la détection."
              : `${paires.length} paire${paires.length > 1 ? "s" : ""} avec plus de ${Math.round(seuil * 100)} % de vocabulaire en commun.`}
          </p>

          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {paires.slice(0, 25).map(({ f1, f2, score, communs }) => {
              const key = `${f1.id}-${f2.id}`;
              const ouvert = pairOuverte === key;
              const rouge = score >= 0.35;
              return (
                <div key={key} className="panel" style={{ padding: 0, overflow: "hidden" }}>
                  {/* En-tête cliquable */}
                  <div
                    onClick={() => setPairOuverte(ouvert ? null : key)}
                    style={{ display: "flex", alignItems: "center", gap: 14, padding: "14px 16px", cursor: "pointer" }}
                  >
                    {/* Score */}
                    <div style={{
                      width: 44, height: 44, borderRadius: "50%", flexShrink: 0,
                      background: rouge ? "#c0392b" : "#8B7355",
                      display: "flex", alignItems: "center", justifyContent: "center",
                    }}>
                      <span style={{ fontSize: 12, color: "white", fontWeight: 700 }}>{Math.round(score * 100)} %</span>
                    </div>
                    {/* Infos */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontSize: 12, color: "#555", marginBottom: 3 }}>
                        <span style={{ color: "#8B7355", fontWeight: 600 }}>{f1.chapitre || f1.tome}</span>
                        <span style={{ color: "#ccc", margin: "0 6px" }}>↔</span>
                        <span style={{ color: "#8B7355", fontWeight: 600 }}>{f2.chapitre || f2.tome}</span>
                      </p>
                      <p style={{ fontSize: 11, color: "#bbb" }}>
                        Mots en commun : {communs.slice(0, 7).join(", ")}
                        {communs.length > 7 && <span> +{communs.length - 7} autres</span>}
                      </p>
                    </div>
                    <span style={{ fontSize: 11, color: "#ccc", flexShrink: 0 }}>{ouvert ? "▲" : "▼"}</span>
                  </div>

                  {/* Contenu déplié */}
                  {ouvert && (
                    <div style={{ borderTop: "1px solid #f0ebe3", padding: "14px 16px", display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                      {[f1, f2].map((f) => (
                        <div key={f.id} style={{ background: "#fffdf8", border: "1px solid #f0e8dc", borderRadius: 8, padding: 14 }}>
                          <p style={{ fontSize: 10, color: "#bbb", textTransform: "uppercase", letterSpacing: 1, marginBottom: 8 }}>
                            {f.chapitre || f.tome} · {f.date}
                          </p>
                          <p style={{ fontSize: 13, color: "#555", lineHeight: 1.75 }}>
                            {f.texte?.slice(0, 300)}{(f.texte?.length ?? 0) > 300 ? "…" : ""}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
            {paires.length > 25 && (
              <p style={{ fontSize: 12, color: "#bbb", textAlign: "center", fontStyle: "italic", paddingTop: 4 }}>
                {paires.length - 25} paires supplémentaires — monte le seuil pour affiner.
              </p>
            )}
          </div>
        </section>

      </>}
    </main>
  );
}
