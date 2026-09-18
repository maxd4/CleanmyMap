import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    files: ["**/*.ts", "**/*.tsx"],
    rules: {
      "max-lines": [
        "warn",
        { max: 1800, skipBlankLines: true, skipComments: true },
      ],
      "@typescript-eslint/no-explicit-any": "warn",
      "react/display-name": "off",
      "react/no-unescaped-entities": "warn",
      "react-hooks/purity": "warn",
      "react-hooks/set-state-in-effect": "warn",
    },
  },
  {
    files: ["src/app/**/*.tsx", "src/components/**/*.tsx"],
    rules: {
      "react/jsx-max-depth": ["warn", { max: 10 }],
    },
  },
  {
    files: [
      "src/lib/**/*.ts",
      "src/hooks/**/*.ts",
      "src/config/**/*.ts",
      "src/data/**/*.ts",
      "src/types/**/*.ts",
    ],
    rules: {
      "max-lines": [
        "warn",
        {
          // Domain modules and report builders in src/lib are intentionally
          // denser than UI code; keep the warning for truly large files only.
          max: 750,
          skipBlankLines: true,
          skipComments: true,
        },
      ],
      "max-lines-per-function": [
        "warn",
        {
          max: 450,
          skipBlankLines: true,
          skipComments: true,
        },
      ],
      complexity: ["warn", 55],
    },
  },
  {
    // Ces modules portent chacun un contrat cohésif déjà audité. Leur taille
    // est un signal de revue, pas une erreur de lint à corriger par découpage
    // artificiel dans ce lot de stabilisation CI.
    files: [
      "src/lib/auth/api-authorization-contract.ts",
      "src/lib/route/route-calibration.ts",
    ],
    rules: {
      "max-lines": "off",
    },
  },
  {
    files: ["src/lib/actions/action-update-persistence.ts"],
    rules: {
      complexity: "off",
    },
  },
  {
    files: ["src/lib/route/route-calibration.test.ts"],
    rules: {
      "max-lines-per-function": "off",
    },
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "eslint.config.mjs",
    "next.config.ts",
    "next-env.d.ts",
  ]),
]);

export default eslintConfig;
