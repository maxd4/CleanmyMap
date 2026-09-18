import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";
import { LEGACY_EXCEPTION_CEILINGS } from "../../scripts/checks/complexity-policy.mjs";

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
      // Le dépôt utilise exclusivement l'App Router ; il n'existe donc pas
      // de répertoire pages à contrôler par cette règle historique.
      "@next/next/no-html-link-for-pages": "off",
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
    // Ces plafonds remplacent les anciens `off` par la mesure ratifiée ; le
    // checker de complexité conserve en parallèle le ratchet par fonction.
    files: ["src/lib/auth/api-authorization-contract.ts"],
    rules: {
      "max-lines": [
        "warn",
        { max: LEGACY_EXCEPTION_CEILINGS.apiAuthorizationContractLines, skipBlankLines: true, skipComments: true },
      ],
    },
  },
  {
    files: ["src/lib/route/route-calibration.ts"],
    rules: {
      "max-lines": [
        "warn",
        { max: LEGACY_EXCEPTION_CEILINGS.routeCalibrationLines, skipBlankLines: true, skipComments: true },
      ],
    },
  },
  {
    files: ["src/lib/actions/action-update-persistence.ts"],
    rules: {
      complexity: ["warn", LEGACY_EXCEPTION_CEILINGS.actionUpdatePersistenceComplexity],
    },
  },
  {
    files: ["src/lib/route/route-calibration.test.ts"],
    rules: {
      "max-lines-per-function": [
        "warn",
        { max: LEGACY_EXCEPTION_CEILINGS.routeCalibrationTestFunctionLines, skipBlankLines: true, skipComments: true },
      ],
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
