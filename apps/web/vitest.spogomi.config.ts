import { defineConfig } from "vitest/config";
import path from "node:path";

const spogomiCodeGlobs = [
  "src/lib/spogomi/**/*.{js,jsx,ts,tsx}",
  "src/app/api/spogomi/**/*.{js,jsx,ts,tsx}",
  "src/app/api/gamification/spogomi/**/*.{js,jsx,ts,tsx}",
  "src/components/spogomi/**/*.{js,jsx,ts,tsx}",
  "src/components/gamification/profile-spogomi-summary.{js,jsx,ts,tsx}",
  "src/components/sections/rubriques/gamification/gamification-spogomi-collection.{js,jsx,ts,tsx}",
  "src/components/sections/rubriques/gamification/gamification-spogomi-collection.model.{js,jsx,ts,tsx}",
  "src/app/(app)/spogomi/**/*.{js,jsx,ts,tsx}",
  "src/app/(app)/dashboard/spogomi/**/*.{js,jsx,ts,tsx}",
];

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
    },
  },
  test: {
    globals: true,
    include: [
      "src/lib/spogomi/**/*.test.ts",
      "src/app/api/spogomi/**/*.test.ts",
      "src/app/api/gamification/spogomi/**/*.test.ts",
      "src/components/spogomi/**/*.test.{ts,tsx}",
      "src/components/gamification/profile-spogomi-summary*.test.{ts,tsx}",
      "src/components/sections/rubriques/gamification/gamification-spogomi-collection*.test.{ts,tsx}",
      "src/app/(app)/spogomi/**/*.test.{ts,tsx}",
      "src/app/(app)/dashboard/spogomi/**/*.test.{ts,tsx}",
    ],
    coverage: {
      provider: "v8",
      reporter: ["text-summary", "json-summary", "lcovonly"],
      reportsDirectory: "./coverage/spogomi-web",
      include: spogomiCodeGlobs,
      exclude: [
        "src/**/*.test.{js,jsx,ts,tsx}",
        "src/**/__tests__/**",
        "src/**/*.d.ts",
        "src/**/generated/**",
      ],
    },
  },
});
