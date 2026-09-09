// Frontière publique du module autre-rive (domaine Relation).
//
// Conforme à SR-D-001 — Décision 1, Règle 1 : « Chaque module expose son API
// publique à travers un point d'entrée unique : lib/<module>/index.ts ».
// Un autre module (ou un fichier de app/) ne doit jamais importer directement
// un fichier interne (types.ts, storage.ts, parsers.ts, import-builder.ts,
// import-orchestrator.ts) : il doit toujours passer par "@/lib/autre-rive".
//
// Cette règle est appliquée automatiquement par ESLint (no-restricted-imports,
// voir eslint.config.mjs) depuis la Phase 1 du plan IMP-001.
//
// Phase 1 d'IMP-001 : ce fichier ne fait que déclarer la frontière du module
// autour de l'API déjà existante. Aucun type ni aucune fonction métier n'est
// ajouté, renommé ou modifié ici.

export * from "./types";
export * from "./storage";
export * from "./import-orchestrator";
export * from "./legacy-adapter";
export * from "./participant-identity";
export * from "./assessment";
export * from "./rapport-analyse";
export * from "./critical-safety";
export * from "./needs";
