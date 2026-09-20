import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";
import fs from "node:fs";

const heavyFilesBaseline = JSON.parse(
  fs.readFileSync(new URL("../../scripts/checks/heavy-files-baseline.json", import.meta.url), "utf8"),
);
const heavyFileMaxLines = (sourcePath) => {
  const path = `apps/web/${sourcePath}`;
  const entry = [...heavyFilesBaseline.allowed, ...heavyFilesBaseline.review]
    .find((candidate) => candidate.path === path);
  if (!entry) throw new Error(`Missing top-heavy ceiling for ${path}`);
  return entry.maxLines;
};

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
