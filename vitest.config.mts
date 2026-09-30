import { fileURLToPath } from "node:url";

import { defineConfig } from "vitest/config";

// Infrastructure de test — Phase 0 d'IMP-001 (domaine Relation, SR-D-001 Décision 6).
// Portée volontairement minimale : aucun test n'est encore écrit à ce stade,
// aucune dépendance DOM (jsdom, testing-library) n'est ajoutée tant qu'un test
// ne l'exige pas explicitement (les tests obligatoires prévus par SR-D-001
// portent sur des règles métier et des types, pas sur du rendu de composants).
export default defineConfig({
  resolve: {
    // Reproduit l'alias "@/*" -> "./*" déjà défini par tsconfig.json
    // (compilerOptions.paths), pour que les tests d'un fichier de app/ qui
    // importe via "@/lib/..." (frontière publique du module, SR-D-001
    // Décision 1 Règle 1) résolvent de la même façon sous Vitest que sous
    // Next.js. Phase 8bis.3 : premier test à importer "@/lib/autre-rive"
    // depuis app/, cet alias n'était pas encore nécessaire avant.
    alias: {
      "@": fileURLToPath(new URL(".", import.meta.url)),
    },
  },
  test: {
    environment: "node",
    include: ["**/*.test.ts", "**/*.test.tsx"],
    exclude: ["node_modules", ".next", "coverage"],
    // Permet à `npm test` de réussir en Phase 0, avant l'ajout des premiers
    // tests en Phase 1 : la Phase 0 met en place l'infrastructure uniquement.
    passWithNoTests: true,
  },
});
