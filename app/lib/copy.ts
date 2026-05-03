import type { Lang, ModuleType } from "@/app/lib/types";

export const copy = {
  fr: {
    nav: {
      home: "Accueil",
      analyze: "Analyser",
      candidate: "Candidat",
      patterns: "Patterns",
      profile: "Profil",
    },
    home: {
      title: "Tu n’es pas confuse. Tu manques d’une lecture claire.",
      subtitle:
        "Colle vos messages. L’autre rive t’aide à distinguer les faits, tes peurs, les signaux réels et la bonne décision.",
      primary: "Analyser une conversation",
      secondary: "Analyser un nouveau candidat",
    },
    input: {
      title: "Qu’est-ce qui te fait douter ?",
      placeholder: "Colle votre conversation ici…",
      helper: "Pas besoin de tout comprendre. On commence par les faits.",
      options: ["Relation actuelle", "Début de relation", "Situation floue", "Après une mauvaise expérience"],
      cta: "Voir clair",
    },
    result: {
      title: "Lecture froide",
      punchline: "S’il était clair, tu ne serais pas ici.",
      cta: "Aller plus loin",
      labels: {
        signal: "Signal",
        intent: "Intention",
        risk: "Risque",
        userPattern: "Ton mécanisme",
        action: "Action",
        confidence: "Confiance",
      },
    },
    deeper: {
      title: "De quoi as-tu vraiment besoin maintenant ?",
      recommended: "Module recommandé",
      cards: {
        understand: ["Comprendre", "Voir ce qui se joue entre vous."],
        decision: ["Décider", "Clarifier si tu dois rester ou te retirer."],
        safety: ["Te protéger", "Avancer sans répéter ton passé."],
      },
    },
    modules: {
      understand: {
        title: "Ce qui se passe vraiment",
        sections: ["TOI", "LUI", "DYNAMIQUE", "VÉRITÉ", "ACTION"],
      },
      decision: {
        title: "Ce que cette relation te coûte",
        sections: ["SI TU RESTES", "SI TU PARS", "VERDICT", "ACTION"],
      },
      safety: {
        title: "Est-ce lui… ou ta peur ?",
        sections: ["CE QUE TU VIS", "RISQUE", "VÉRITÉ", "ACTION"],
      },
    },
    candidate: {
      title: "Est-ce un bon candidat pour toi ?",
      fields: [
        "Ce que tu recherches",
        "Ce que tu ne tolères plus",
        "Tes blessures relationnelles",
        "Ton pattern habituel",
        "Premiers échanges avec la personne",
      ],
      cta: "Analyser ce candidat",
      labels: {
        compatibility: "Compatibilité",
        emotionalRisk: "Risque émotionnel",
        triggeredPattern: "Pattern activé",
        verdict: "Verdict",
        action: "Action",
      },
    },
    patterns: {
      title: "Ce que tu répètes sans t’en rendre compte",
      empty: "Aucune analyse enregistrée pour le moment.",
      cards: ["Incohérence détectée", "Suralyse fréquente", "Besoin de sécurité élevé", "Red flag récurrent"],
      punchline: "Ce n’est pas l’amour qui te fait souffrir. C’est le pattern que tu répètes.",
    },
    profile: {
      title: "Profil relationnel",
      subtitle: "Optionnel, mais utile pour rendre les lectures plus précises.",
      save: "Sauvegarder le profil",
      fields: {
        values: "Top 2 valeurs relationnelles",
        relationshipGoal: "Objectif relationnel",
        pastPatterns: "Patterns passés",
        triggers: "Déclencheurs principaux",
        nonNegotiables: "Non négociables",
      },
    },
    disclaimer:
      "L’autre rive est un outil d’aide à la réflexion. Il ne remplace pas un avis psychologique, médical, juridique ou professionnel. En cas de danger, de violence, de menace ou de détresse importante, contacte une ressource professionnelle ou les services d’urgence.",
  },
  en: {
    nav: {
      home: "Home",
      analyze: "Analyze",
      candidate: "Candidate",
      patterns: "Patterns",
      profile: "Profile",
    },
    home: {
      title: "You’re not confused. You need a clearer read.",
      subtitle:
        "Paste your messages. L’autre rive helps you separate facts, fear, real signals, and the next right step.",
      primary: "Analyze a conversation",
      secondary: "Analyze a new candidate",
    },
    input: {
      title: "What is making you doubt?",
      placeholder: "Paste your conversation here…",
      helper: "You do not need to understand everything. Start with the facts.",
      options: ["Current relationship", "Early dating", "Unclear situation", "After a bad experience"],
      cta: "Get clarity",
    },
    result: {
      title: "Cold Read",
      punchline: "If it were clear, you would not be here.",
      cta: "Go deeper",
      labels: {
        signal: "Signal",
        intent: "Intent",
        risk: "Risk",
        userPattern: "Your pattern",
        action: "Action",
        confidence: "Confidence",
      },
    },
    deeper: {
      title: "What do you actually need right now?",
      recommended: "Recommended module",
      cards: {
        understand: ["Understand", "See what is really happening between you."],
        decision: ["Decide", "Clarify whether to stay or step back."],
        safety: ["Protect yourself", "Move forward without repeating your past."],
      },
    },
    modules: {
      understand: {
        title: "What is really happening",
        sections: ["YOU", "PARTNER", "DYNAMIC", "TRUTH", "ACTION"],
      },
      decision: {
        title: "What this relationship is costing you",
        sections: ["IF YOU STAY", "IF YOU LEAVE", "VERDICT", "ACTION"],
      },
      safety: {
        title: "Is it him… or your fear?",
        sections: ["WHAT YOU FEEL", "RISK", "TRUTH", "ACTION"],
      },
    },
    candidate: {
      title: "Is this a good candidate for you?",
      fields: [
        "What you are looking for",
        "What you no longer tolerate",
        "Your relationship wounds",
        "Your usual pattern",
        "First messages with this person",
      ],
      cta: "Analyze this candidate",
      labels: {
        compatibility: "Compatibility",
        emotionalRisk: "Emotional risk",
        triggeredPattern: "Triggered pattern",
        verdict: "Verdict",
        action: "Action",
      },
    },
    patterns: {
      title: "What you repeat without realizing it",
      empty: "No saved analysis yet.",
      cards: ["Inconsistency detected", "Frequent overanalysis", "High need for safety", "Recurring red flag"],
      punchline: "It is not love that hurts you. It is the pattern you keep repeating.",
    },
    profile: {
      title: "Relationship profile",
      subtitle: "Optional, but useful for more precise reads.",
      save: "Save profile",
      fields: {
        values: "Top 2 relationship values",
        relationshipGoal: "Relationship goal",
        pastPatterns: "Past patterns",
        triggers: "Main triggers",
        nonNegotiables: "Non-negotiables",
      },
    },
    disclaimer:
      "L’autre rive is a reflection tool. It does not replace psychological, medical, legal, or professional advice. If you are in danger, experiencing violence, threats, or severe distress, contact professional support or emergency services.",
  },
} as const;

export function modulePath(type: ModuleType) {
  return `/module/${type}`;
}

export function getCopy(lang: Lang) {
  return copy[lang];
}
