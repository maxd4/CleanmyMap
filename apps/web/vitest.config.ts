import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
    },
  },
  test: {
    globals: true,
    include: ["src/**/*.test.ts", "src/**/*.test.tsx"],
    coverage: {
      provider: "v8",
      reporter: ["text-summary", "json-summary"],
      reportsDirectory: "./coverage",
      include: ["src/**/*.{js,jsx,ts,tsx}"],
      exclude: [
        "src/**/*.test.{js,jsx,ts,tsx}",
        "src/**/__tests__/**",
        "src/**/*.d.ts",
        "src/**/generated/**",
        "src/app/**/{page,layout,loading,error,global-error,not-found,robots,sitemap,template,default}.{js,jsx,ts,tsx}",
        "src/components/actions/action-declaration/types.ts",
        "src/components/actions/map-feed/map-feed.types.ts",
        "src/components/reports/admin-workflow/types.ts",
        "src/components/sections/rubriques/community/types.ts",
        "src/lib/actions/unified-source/types.ts",
        "src/lib/community/engagement.types.ts",
        "src/lib/community/engagement/types.ts",
        "src/lib/environmental-impact-estimator/types.ts",
        "src/lib/events/types.ts",
        "src/lib/gamification/types.ts",
        "src/lib/pilotage/overview.types.ts",
        "src/lib/reports/report-model/types.ts",
        "src/lib/sections-registry/types.ts",
        "src/lib/ui/page-families/types.ts",
        "src/lib/waste/types.ts",
      ],
    },
  },
});
