import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Frontière de module — SR-D-001, Décision 1, Règle 3 (IMP-001, Phase 1).
  // Le module autre-rive (domaine Relation) n'expose son API que via
  // "@/lib/autre-rive" (lib/autre-rive/index.ts). Tout import ciblant un
  // fichier interne (types.ts, storage.ts, parsers.ts, import-builder.ts,
  // import-orchestrator.ts) échoue au lint.
  {
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: ["@/lib/autre-rive/*"],
              message:
                'Le module autre-rive expose son API publique uniquement via "@/lib/autre-rive" (SR-D-001, Décision 1, Règle 1). Importez depuis "@/lib/autre-rive" plutôt que depuis un fichier interne du module.',
            },
          ],
        },
      ],
    },
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
]);

export default eslintConfig;
