#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";
import { scanVercelSurface } from "./vercel-audit-core.mjs";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const defaultOutputPath = path.join(
  repoRoot,
  "documentation",
  "development",
  "vercel-surface-report.md",
);

const scanRoots = [
  path.join(repoRoot, "apps", "web", "src"),
  path.join(repoRoot, "apps", "web", "scripts"),
];

const ignoredDirs = new Set([".git", "node_modules", ".next", "dist", "build", "coverage"]);
const fileExtensions = new Set([".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs"]);

const args = process.argv.slice(2);
const outputFlagIndex = args.indexOf("--output");
const outputPath =
  outputFlagIndex >= 0 && args[outputFlagIndex + 1]
    ? path.resolve(repoRoot, args[outputFlagIndex + 1])
    : defaultOutputPath;
const printToStdout = args.includes("--stdout");

function toRepoRelative(filePath) {
  return path.relative(repoRoot, filePath).split(path.sep).join("/");
}

function walk(dir, output) {
  if (!fs.existsSync(dir)) {
    return;
  }

  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (ignoredDirs.has(entry.name)) {
        continue;
      }
      walk(fullPath, output);
      continue;
    }

    if (!entry.isFile()) {
      continue;
    }

    if (/\.(test|spec)\./.test(entry.name)) {
      continue;
    }

    if (!fileExtensions.has(path.extname(entry.name))) {
      continue;
    }

    output.push(fullPath);
  }
}

function collectFiles() {
  const files = [];
  for (const root of scanRoots) {
    walk(root, files);
  }
  return files;
}

function uniq(values) {
  return Array.from(new Set(values)).sort((left, right) => left.localeCompare(right));
}

function riskLabel(score) {
  if (score >= 3) return "élevé";
  if (score >= 2) return "moyen";
  return "faible";
}

function table(headers, rows) {
  const separator = headers.map(() => "---");
  const lines = [
    `| ${headers.join(" | ")} |`,
    `| ${separator.join(" | ")} |`,
    ...rows.map((row) => `| ${row.join(" | ")} |`),
  ];
  return lines.join("\n");
}

function bulletList(items, indent = "") {
  return items.map((item) => `${indent}- ${item}`).join("\n");
}

function readFile(filePath) {
  return fs.readFileSync(filePath, "utf8");
}

function annotate(files, definitions) {
  return files
    .map((filePath) => {
      const content = readFile(filePath);
      const signals = definitions
        .filter((definition) => definition.patterns.some((pattern) => pattern.test(content)))
        .map((definition) => definition.label);

      if (signals.length === 0) {
        return null;
      }

      return {
        path: toRepoRelative(filePath),
        signals: uniq(signals),
      };
    })
    .filter(Boolean)
    .sort((left, right) => left.path.localeCompare(right.path));
}

function buildCategorySummary({
  label,
  files,
  invocations,
  edgeRequests,
  originTransfer,
  rationale,
}) {
  return {
    label,
    count: files.length,
    invocations: riskLabel(invocations),
    edgeRequests: riskLabel(edgeRequests),
    originTransfer: riskLabel(originTransfer),
    rationale,
    files,
  };
}

const surface = scanVercelSurface();
const allFiles = collectFiles();

const apiRouteDefinitions = [
  { label: "force-dynamic", patterns: [/export const dynamic\s*=\s*["']force-dynamic["']/] },
  { label: "revalidate=0", patterns: [/export const revalidate\s*=\s*0\b/] },
  { label: "no-store", patterns: [/no-store/] },
  { label: "auth", patterns: [/\bauth\s*\(/] },
  { label: "headers", patterns: [/\bheaders\s*\(/] },
  { label: "cookies", patterns: [/\bcookies\s*\(/] },
  { label: "edge-runtime", patterns: [/export const runtime\s*=\s*["']edge["']/] },
  { label: "external-fetch", patterns: [/fetch\s*\([\s\S]*https?:\/\//] },
];

const providerDefinitions = {
  clerk: [
    { label: "Clerk server", patterns: [/@clerk\/nextjs\/server/] },
    { label: "Clerk client", patterns: [/@clerk\/nextjs(?!\/server)/] },
    { label: "Clerk middleware", patterns: [/\bclerkMiddleware\b/] },
    { label: "Clerk provider", patterns: [/\bClerkProvider\b/] },
    { label: "Clerk gate", patterns: [/\bClerkRequiredGate\b/] },
    { label: "Clerk auth", patterns: [/\bauth\s*\(/] },
    { label: "Clerk hook", patterns: [/\buseAuth\b/] },
  ],
  supabase: [
    { label: "Supabase client", patterns: [/@supabase\/supabase-js/] },
    { label: "Server client", patterns: [/\bgetSupabaseServerClient\b/] },
    { label: "Clerk RLS client", patterns: [/\bgetSupabaseClerkRlsClient\b/] },
    { label: "Admin client", patterns: [/\bgetSupabaseAdminClient\b/] },
    { label: "Supabase mirror", patterns: [/\bupsertSupabaseMirror\b/, /\bdeleteSupabaseMirror\b/] },
  ],
  posthog: [
    { label: "PostHog browser", patterns: [/posthog-js/] },
    { label: "PostHog node", patterns: [/posthog-node/] },
    { label: "Client init", patterns: [/\binitPostHogClient\b/] },
    { label: "Server client", patterns: [/\bgetPostHogServerClient\b/] },
    { label: "Server tracking", patterns: [/\btrackServerEvent\b/] },
    { label: "Provider", patterns: [/\bPostHogProvider\b/] },
  ],
  sentry: [
    { label: "Sentry SDK", patterns: [/@sentry\/nextjs/] },
    { label: "Capture exception", patterns: [/\bcaptureException\b/] },
    { label: "Sentry enabled", patterns: [/\bisSentryEnabled\b/] },
    { label: "Sentry config", patterns: [/\bgetSentryDsn\b/, /\bgetSentryRelease\b/] },
    { label: "Source maps upload", patterns: [/upload-sentry-sourcemaps\.mjs/] },
  ],
  leaflet: [
    { label: "Leaflet", patterns: [/\bleaflet\b/] },
    { label: "React Leaflet", patterns: [/\breact-leaflet\b/] },
    { label: "Leaflet Draw", patterns: [/\bleaflet-draw\b/] },
    { label: "Leaflet cluster", patterns: [/\breact-leaflet-cluster\b/] },
  ],
};

const apiRouteFiles = surface.apiRoutes.map((relPath) => path.join(repoRoot, relPath));
const apiRoutesAnnotated = apiRouteFiles
  .map((filePath) => {
    const content = readFile(filePath);
    const signals = apiRouteDefinitions
      .filter((definition) => definition.patterns.some((pattern) => pattern.test(content)))
      .map((definition) => definition.label);
    return {
      path: toRepoRelative(filePath),
      signals: uniq(signals),
    };
  })
  .sort((left, right) => left.path.localeCompare(right.path));

const dynamicPagesAnnotated = surface.dynamicPages.map((entry) => ({
  path: entry.path,
  signals: uniq(entry.signals),
}));

const middlewareFiles = uniq(
  ["apps/web/src/proxy.ts", "apps/web/src/middleware.ts"]
    .map((relPath) => path.join(repoRoot, relPath))
    .filter((filePath) => fs.existsSync(filePath))
    .map(toRepoRelative),
);

const clerkUsages = annotate(allFiles, providerDefinitions.clerk);
const supabaseUsages = annotate(allFiles, providerDefinitions.supabase);
const posthogUsages = annotate(allFiles, providerDefinitions.posthog);
const sentryUsages = annotate(allFiles, providerDefinitions.sentry);
const leafletUsages = annotate(allFiles, providerDefinitions.leaflet);

const summaryRows = [
  ["API routes", String(surface.apiRoutes.length), "élevé", "faible", surface.noStoreRoutes.length > 0 || surface.externalFetches.length > 0 ? "moyen" : "faible"],
  ["Pages dynamiques", String(surface.dynamicPages.length), surface.dynamicPages.length > 1 ? "moyen" : "faible", surface.dynamicPages.some((page) => page.signals.includes("runtime-headers")) ? "moyen" : "faible", surface.dynamicPages.some((page) => page.signals.includes("force-dynamic")) ? "moyen" : "faible"],
  ["Middleware / proxy", String(middlewareFiles.length), middlewareFiles.length > 0 ? "élevé" : "faible", middlewareFiles.length > 0 ? "élevé" : "faible", "faible"],
  ["Clerk", String(clerkUsages.length), clerkUsages.length > 5 ? "élevé" : "moyen", middlewareFiles.length > 0 ? "moyen" : "faible", "faible"],
  ["Supabase", String(supabaseUsages.length), supabaseUsages.length > 8 ? "élevé" : "moyen", "faible", supabaseUsages.length > 0 ? "moyen" : "faible"],
  ["PostHog", String(posthogUsages.length), posthogUsages.length > 0 ? "moyen" : "faible", "faible", posthogUsages.length > 0 ? "moyen" : "faible"],
  ["Sentry", String(sentryUsages.length), "faible", "faible", sentryUsages.length > 0 ? "faible" : "faible"],
  ["Leaflet", String(leafletUsages.length), "faible", "faible", leafletUsages.length > 0 ? "élevé" : "faible"],
];

const categorySummaries = [
  buildCategorySummary({
    label: "Routes API",
    files: surface.apiRoutes,
    invocations: 3,
    edgeRequests: 1,
    originTransfer: surface.noStoreRoutes.length > 0 || surface.externalFetches.length > 0 ? 2 : 1,
    rationale:
      "Chaque route API peut déclencher une invocation Vercel. Les exports, les routes auth et les endpoints no-store augmentent surtout la fréquence d'appels et le coût d'origine.",
  }),
  buildCategorySummary({
    label: "Pages dynamiques",
    files: surface.dynamicPages.map((entry) => entry.path),
    invocations: surface.dynamicPages.some((entry) => entry.signals.includes("force-dynamic")) ? 2 : 1,
    edgeRequests: surface.dynamicPages.some((entry) => entry.signals.includes("runtime-headers")) ? 2 : 1,
    originTransfer: surface.dynamicPages.some((entry) => entry.signals.includes("force-dynamic")) ? 2 : 1,
    rationale:
      "Les pages dynamiques font remonter les recalculs côté serveur ; elles deviennent sensibles quand elles chargent des métriques temps réel ou des données protégées.",
  }),
  buildCategorySummary({
    label: "Middleware / proxy",
    files: middlewareFiles,
    invocations: 3,
    edgeRequests: 3,
    originTransfer: 1,
    rationale:
      "Le proxy Next agit sur toutes les requêtes correspondantes. Le rate limit et la protection Clerk y font monter directement les Edge Requests.",
  }),
  buildCategorySummary({
    label: "Clerk",
    files: clerkUsages.map((entry) => entry.path),
    invocations: 3,
    edgeRequests: middlewareFiles.length > 0 ? 2 : 1,
    originTransfer: 1,
    rationale:
      "Clerk se trouve à la frontière auth. Les usages serveur et middleware augmentent les invocations et ajoutent du travail sur les requêtes protégées.",
  }),
  buildCategorySummary({
    label: "Supabase",
    files: supabaseUsages.map((entry) => entry.path),
    invocations: 3,
    edgeRequests: 1,
    originTransfer: 2,
    rationale:
      "Supabase concentre les lectures serveur, les exports et les clients RLS. Le risque principal reste l'effet cumulé des requêtes et des exports de données.",
  }),
  buildCategorySummary({
    label: "PostHog",
    files: posthogUsages.map((entry) => entry.path),
    invocations: 2,
    edgeRequests: 1,
    originTransfer: 2,
    rationale:
      "PostHog ajoute du JavaScript client et des appels analytics. Le coût monte surtout via le bundle et les captures répétées.",
  }),
  buildCategorySummary({
    label: "Sentry",
    files: sentryUsages.map((entry) => entry.path),
    invocations: 1,
    edgeRequests: 1,
    originTransfer: 1,
    rationale:
      "Sentry reste surtout un coût de diagnostic et de build, avec peu d'impact runtime direct dans le code métier.",
  }),
  buildCategorySummary({
    label: "Leaflet",
    files: leafletUsages.map((entry) => entry.path),
    invocations: 1,
    edgeRequests: 1,
    originTransfer: 3,
    rationale:
      "Leaflet et react-leaflet gonflent le bundle client. Le coût principal est le transfert d'origine et le temps de chargement des cartes.",
  }),
];

function sectionHeading(title) {
  return `## ${title}`;
}

function renderAnnotatedList(entries) {
  return bulletList(entries.map((entry) => `\`${entry.path}\`${entry.signals.length > 0 ? ` — ${entry.signals.join(", ")}` : ""}`));
}

function renderPaths(entries) {
  return bulletList(entries.map((entry) => `\`${entry}\``));
}

const lines = [];

lines.push("# Rapport automatique de surface Vercel");
lines.push("");
lines.push(
  "Ce rapport est généré à partir de l'arbre courant du dépôt. Il sert à visualiser les surfaces qui influencent le coût Vercel et à prioriser la revue avant merge.",
);
lines.push("");
lines.push(sectionHeading("Résumé"));
lines.push("");
lines.push(table(
  ["Surface", "Entrées", "Invocations", "Edge Requests", "Origin Transfer"],
  summaryRows,
));
lines.push("");
lines.push(sectionHeading("Lecture du risque"));
lines.push("");
lines.push(
  "- `Invocations` mesure le volume potentiel de fonctions serveurs, pages dynamiques et routes API.",
);
lines.push(
  "- `Edge Requests` monte quand le proxy/middleware ou les protections auth interceptent davantage de requêtes.",
);
lines.push(
  "- `Origin Transfer` monte avec les bundles lourds, les exports, les pages qui chargent beaucoup de données et les composants cartographiques.",
);
lines.push("");

lines.push(sectionHeading("Routes API"));
lines.push("");
lines.push(
  `Risque estimé: Invocations **${categorySummaries[0].invocations}** / Edge Requests **${categorySummaries[0].edgeRequests}** / Origin Transfer **${categorySummaries[0].originTransfer}**.`,
);
lines.push("");
lines.push(categorySummaries[0].rationale);
lines.push("");
lines.push("### Inventaire");
lines.push("");
lines.push(renderAnnotatedList(apiRoutesAnnotated));
lines.push("");

lines.push(sectionHeading("Pages dynamiques"));
lines.push("");
lines.push(
  `Risque estimé: Invocations **${categorySummaries[1].invocations}** / Edge Requests **${categorySummaries[1].edgeRequests}** / Origin Transfer **${categorySummaries[1].originTransfer}**.`,
);
lines.push("");
lines.push(categorySummaries[1].rationale);
lines.push("");
lines.push("### Pages détectées");
lines.push("");
lines.push(renderAnnotatedList(dynamicPagesAnnotated));
lines.push("");

lines.push(sectionHeading("Middleware / proxy"));
lines.push("");
lines.push(
  "Dans ce repo, l'entrée middleware côté Next est `apps/web/src/proxy.ts`.",
);
lines.push("");
lines.push(
  `Risque estimé: Invocations **${categorySummaries[2].invocations}** / Edge Requests **${categorySummaries[2].edgeRequests}** / Origin Transfer **${categorySummaries[2].originTransfer}**.`,
);
lines.push("");
lines.push(categorySummaries[2].rationale);
lines.push("");
lines.push("### Fichiers");
lines.push("");
lines.push(renderPaths(middlewareFiles));
lines.push("");

const providerSections = [
  ["Usages Clerk", clerkUsages, categorySummaries[3]],
  ["Usages Supabase", supabaseUsages, categorySummaries[4]],
  ["Usages PostHog", posthogUsages, categorySummaries[5]],
  ["Usages Sentry", sentryUsages, categorySummaries[6]],
  ["Usages Leaflet", leafletUsages, categorySummaries[7]],
];

for (const [title, entries, summary] of providerSections) {
  lines.push(sectionHeading(title));
  lines.push("");
  lines.push(
    `Risque estimé: Invocations **${summary.invocations}** / Edge Requests **${summary.edgeRequests}** / Origin Transfer **${summary.originTransfer}**.`,
  );
  lines.push("");
  lines.push(summary.rationale);
  lines.push("");
  lines.push("### Fichiers");
  lines.push("");
  lines.push(renderAnnotatedList(entries));
  lines.push("");
}

lines.push(sectionHeading("Lecture prioritaire"));
lines.push("");
lines.push(
  "- `proxy.ts` reste la surface la plus sensible pour `Edge Requests`.",
);
lines.push(
  "- Les routes d'export et les pages cache-bypassées dominent le risque `Invocations`.",
);
lines.push(
  "- Les composants Leaflet et PostHog sont les premiers contributeurs au `Origin Transfer` côté client.",
);

const report = `${lines.join("\n")}\n`;

fs.mkdirSync(path.dirname(outputPath), { recursive: true });
fs.writeFileSync(outputPath, report, "utf8");

if (printToStdout) {
  process.stdout.write(report);
} else {
  console.log(`Rapport Vercel généré: ${toRepoRelative(outputPath)}`);
  console.log(`Routes API: ${surface.apiRoutes.length}`);
  console.log(`Pages dynamiques: ${surface.dynamicPages.length}`);
  console.log(`Fichiers Clerk: ${clerkUsages.length}`);
  console.log(`Fichiers Supabase: ${supabaseUsages.length}`);
  console.log(`Fichiers PostHog: ${posthogUsages.length}`);
  console.log(`Fichiers Sentry: ${sentryUsages.length}`);
  console.log(`Fichiers Leaflet: ${leafletUsages.length}`);
}
