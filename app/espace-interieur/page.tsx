"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";

type EntreeInterieure = {
  id: number;
  date: string;
  personne: string;
  situation: string;
  declencheur: string;
  emotions: string;
  intensite: string;
  pensees: string;
  reaction: string;
};

type PatternsInterieurs = {
  nombreTotalEntrees: number;
  intensiteMoyenne: string;
  emotionDominante: string;
  mecanismeDominant: string;
};

const STORAGE_KEY = "espace-interieur-entries";

const entreeVide: Omit<EntreeInterieure, "id" | "date"> = {
  personne: "",
  situation: "",
  declencheur: "",
  emotions: "",
  intensite: "",
  pensees: "",
  reaction: "",
};

function chargerEntrees(): EntreeInterieure[] {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? JSON.parse(saved) : [];
  } catch {
    return [];
  }
}

function sauvegarderEntrees(entrees: EntreeInterieure[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(entrees));
}

function analyserEntree(entry: EntreeInterieure): string {
  let analyse = "";
  const intensite = Number(entry.intensite);
  const pensees = entry.pensees?.toLowerCase() || "";
  const reaction = entry.reaction?.toLowerCase() || "";
  const emotions = entry.emotions?.toLowerCase() || "";

  // 1. Activation
  if (intensite >= 7) {
    analyse += "Activation émotionnelle forte → réaction influencée par une blessure.\n\n";
  }

  // 2. Croyances profondes
  if (pensees.includes("je ne suis pas") || pensees.includes("je suis")) {
    analyse += "Croyance identitaire activée → possible atteinte à l’estime de soi.\n";
  }

  if (pensees.includes("pas assez") || pensees.includes("pas une bonne")) {
    analyse += "Schéma d’insuffisance / dévalorisation.\n";
  }

  // 3. Mécanismes de défense
  if (reaction.includes("silence") || reaction.includes("rien") || reaction.includes("évité")) {
    analyse += "Mécanisme : inhibition / retrait émotionnel.\n";
  }

  if (reaction.includes("comprendre") || reaction.includes("analyser")) {
    analyse += "Mécanisme : hyperanalyse pour reprendre le contrôle.\n";
  }

  if (reaction.includes("écrire") || reaction.includes("message")) {
    analyse += "Recherche de réparation externe (besoin de réponse / validation).\n";
  }

  // 4. Lecture relationnelle
  analyse += "\nLecture possible :\n";

  if (emotions.includes("peine") || emotions.includes("tristesse")) {
    analyse += "Besoin affectif non comblé (reconnaissance, affection).\n";
  }

  if (emotions.includes("confusion")) {
    analyse += "Manque de clarté → insécurité relationnelle.\n";
  }

  // 5. Peurs sous-jacentes
  if (intensite >= 7) {
    analyse += "Peur possible activée : rejet, abandon ou ne pas être assez.\n";
  }

  // 6. Question thérapeutique
  analyse += "\n→ Question clé :\n";
  analyse += "Qu’est-ce que cette situation est venue toucher en toi (besoin, peur, image de toi) ?";

  return analyse;
}

function detecterMecanisme(entry: EntreeInterieure): string {
  const reaction = entry.reaction.toLowerCase();
  const pensees = entry.pensees.toLowerCase();

  if (reaction.includes("rien") || reaction.includes("évité")) {
    return "évitement émotionnel";
  }

  if (reaction.includes("analyser") || reaction.includes("comprendre")) {
    return "hyperanalyse";
  }

  if (reaction.includes("écrire") || reaction.includes("message")) {
    return "recherche de clarification externe";
  }

  if (pensees.includes("toujours") || pensees.includes("jamais")) {
    return "pensée en absolu";
  }

  if (pensees.includes("c'est de ma faute") || pensees.includes("c’est de ma faute")) {
    return "auto-responsabilisation";
  }

  return "non identifié";
}

function valeurDominante(compteur: Record<string, number>, fallback: string): string {
  const valeurs = Object.keys(compteur);

  if (valeurs.length === 0) {
    return fallback;
  }

  return valeurs.reduce((a, b) => (compteur[a] > compteur[b] ? a : b));
}

function calculerPatterns(entrees: EntreeInterieure[]): PatternsInterieurs | null {
  if (entrees.length === 0) {
    return null;
  }

  const emotionsMap: Record<string, number> = {};
  const mecanismesMap: Record<string, number> = {};
  const total = entrees.reduce((sum, entry) => sum + Number(entry.intensite || 0), 0);

  entrees.forEach((entry) => {
    entry.emotions
      .toLowerCase()
      .split(",")
      .map((mot) => mot.trim())
      .filter(Boolean)
      .forEach((emotion) => {
        emotionsMap[emotion] = (emotionsMap[emotion] || 0) + 1;
      });

    const mecanisme = detecterMecanisme(entry);
    mecanismesMap[mecanisme] = (mecanismesMap[mecanisme] || 0) + 1;
  });

  return {
    nombreTotalEntrees: entrees.length,
    intensiteMoyenne: (total / entrees.length).toFixed(1),
    emotionDominante: valeurDominante(emotionsMap, "non renseignée"),
    mecanismeDominant: valeurDominante(mecanismesMap, "non identifié"),
  };
}

export default function EspaceInterieurPage() {
  const [entrees, setEntrees] = useState<EntreeInterieure[]>([]);
  const [form, setForm] = useState(entreeVide);

  useEffect(() => {
    setEntrees(chargerEntrees());
  }, []);

  const patterns = useMemo(() => calculerPatterns(entrees), [entrees]);

  function mettreAJour(champ: keyof typeof entreeVide, valeur: string) {
    setForm((current) => ({
      ...current,
      [champ]: valeur,
    }));
  }

  function ajouterEntree() {
    const nouvelleEntree: EntreeInterieure = {
      id: Date.now(),
      date: new Date().toLocaleString("fr-CA"),
      ...form,
    };
    const updated = [nouvelleEntree, ...entrees];

    setEntrees(updated);
    sauvegarderEntrees(updated);
    setForm(entreeVide);
  }

  return (
    <main style={{ maxWidth: 980, margin: "0 auto", padding: "32px 24px 56px" }}>
      <header style={{ marginBottom: 28 }}>
        <Link href="/" style={{ fontSize: 11, color: "var(--text-muted)" }}>← Accueil</Link>
        <h1 style={{ fontSize: 28, fontStyle: "italic", color: "var(--primary)", margin: "8px 0 6px" }}>
          Espace intérieur
        </h1>
        <p style={{ fontSize: 13, color: "var(--text-muted)", lineHeight: 1.7, maxWidth: 660 }}>
          Un espace de travail sur soi pour observer les déclencheurs, les ressentis, les pensées automatiques
          et les réactions. L’autre rive reste un espace d’archives ; ici, tu analyses les mouvements intérieurs.
        </p>
      </header>

      <section className="panel" style={{ marginBottom: 22 }}>
        <p className="label-meta">Nouvelle entrée</p>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 12 }}>
          <input
            className="search-input"
            id="ei-personne"
            value={form.personne}
            onChange={(event) => mettreAJour("personne", event.target.value)}
            placeholder="Personne concernée"
          />
          <input
            className="search-input"
            id="ei-intensite"
            type="number"
            min="0"
            max="10"
            value={form.intensite}
            onChange={(event) => mettreAJour("intensite", event.target.value)}
            placeholder="Intensité (0-10)"
          />
        </div>

        <textarea
          className="textarea-atelier"
          id="ei-situation"
          value={form.situation}
          onChange={(event) => mettreAJour("situation", event.target.value)}
          placeholder="Situation"
          style={{ minHeight: 90, marginBottom: 12 }}
        />
        <textarea
          className="textarea-atelier"
          id="ei-declencheur"
          value={form.declencheur}
          onChange={(event) => mettreAJour("declencheur", event.target.value)}
          placeholder="Déclencheur"
          style={{ minHeight: 90, marginBottom: 12 }}
        />
        <textarea
          className="textarea-atelier"
          id="ei-emotions"
          value={form.emotions}
          onChange={(event) => mettreAJour("emotions", event.target.value)}
          placeholder="Ressenti / émotions (séparées par des virgules)"
          style={{ minHeight: 90, marginBottom: 12 }}
        />
        <textarea
          className="textarea-atelier"
          id="ei-pensees"
          value={form.pensees}
          onChange={(event) => mettreAJour("pensees", event.target.value)}
          placeholder="Pensées automatiques"
          style={{ minHeight: 90, marginBottom: 12 }}
        />
        <textarea
          className="textarea-atelier"
          id="ei-reaction"
          value={form.reaction}
          onChange={(event) => mettreAJour("reaction", event.target.value)}
          placeholder="Réaction"
          style={{ minHeight: 90 }}
        />

        <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 14 }}>
          <button className="btn-primary" type="button" onClick={ajouterEntree}>
            Ajouter
          </button>
        </div>
      </section>

      <section className="panel" style={{ marginBottom: 22 }}>
        <p className="label-meta">Patterns</p>
        {patterns ? (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))", gap: 12 }}>
            <PatternCard label="Nombre total d’entrées" value={String(patterns.nombreTotalEntrees)} />
            <PatternCard label="Intensité moyenne" value={patterns.intensiteMoyenne} />
            <PatternCard label="Émotion dominante" value={patterns.emotionDominante} />
            <PatternCard label="Mécanisme dominant" value={patterns.mecanismeDominant} />
          </div>
        ) : (
          <p style={{ color: "var(--text-muted)", fontSize: 13 }}>Aucune donnée pour le moment.</p>
        )}
      </section>

      <section>
        <p className="label-meta">Historique</p>
        {entrees.length === 0 ? (
          <div className="chapter-card">
            <p style={{ color: "var(--text-muted)", fontSize: 13 }}>Aucune entrée enregistrée.</p>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {entrees.map((entry) => (
              <article className="chapter-card" key={entry.id} style={{ padding: "18px 20px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 14, flexWrap: "wrap" }}>
                  <div>
                    <p className="label-meta">{entry.date}</p>
                    <h2 style={{ fontSize: 17, margin: "0 0 8px", color: "var(--text-main)" }}>
                      {entry.personne || "Entrée d’auto-observation"}
                    </h2>
                  </div>
                  <span style={{ color: "var(--primary)", fontSize: 13, fontWeight: 600 }}>
                    Intensité : {entry.intensite || "non renseignée"}
                  </span>
                </div>

                <InfoLine label="Situation" value={entry.situation} />
                <InfoLine label="Déclencheur" value={entry.declencheur} />
                <InfoLine label="Ressenti" value={entry.emotions} />
                <InfoLine label="Pensées automatiques" value={entry.pensees} />
                <InfoLine label="Réaction" value={entry.reaction} />

                <div style={{ marginTop: 14, paddingTop: 14, borderTop: "1px solid var(--border-soft)" }}>
                  <p className="label-meta">Analyse psychologique simple</p>
                  <p style={{ color: "var(--text-soft)", fontSize: 13, lineHeight: 1.8, whiteSpace: "pre-wrap" }}>
                    {analyserEntree(entry)}
                  </p>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}

function PatternCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="placement-cell">
      <p className="label-meta" style={{ marginBottom: 4 }}>{label}</p>
      <p style={{ fontSize: 16, fontWeight: 600, color: "var(--text-main)" }}>{value}</p>
    </div>
  );
}

function InfoLine({ label, value }: { label: string; value: string }) {
  if (!value.trim()) {
    return null;
  }

  return (
    <p style={{ color: "var(--text-soft)", fontSize: 13, lineHeight: 1.7, margin: "7px 0 0" }}>
      <strong style={{ color: "var(--text-main)" }}>{label} :</strong> {value}
    </p>
  );
}
