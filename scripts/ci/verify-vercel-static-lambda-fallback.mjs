import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const DEFAULT_ROUTE = "/actions/map";

function readJson(filePath) {
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf8"));
  } catch (error) {
    throw new Error(`Unable to read JSON file ${filePath}: ${error.message}`);
  }
}

function hasOwn(value, key) {
  return value !== null && typeof value === "object" && Object.hasOwn(value, key);
}

function findBuildErrors(value, matches = []) {
  if (Array.isArray(value)) {
    for (const item of value) {
      findBuildErrors(item, matches);
    }
    return matches;
  }

  if (value === null || typeof value !== "object") {
    return matches;
  }

  if (
    value.error &&
    value.error.code === "NEXT_MISSING_LAMBDA" &&
    typeof value.error.message === "string"
  ) {
    matches.push(value.error.message);
  }

  for (const child of Object.values(value)) {
    findBuildErrors(child, matches);
  }

  return matches;
}

export function verifyVercelStaticLambdaFallback({
  projectRoot = process.cwd(),
  route = DEFAULT_ROUTE,
  buildStartedAt,
} = {}) {
  const appRoot = path.join(projectRoot, "apps", "web");
  const nextRoot = path.join(appRoot, ".next");
  const prerenderManifest = readJson(path.join(nextRoot, "prerender-manifest.json"));
  const routesManifest = readJson(path.join(nextRoot, "routes-manifest.json"));
  const appPathRoutesManifest = readJson(
    path.join(nextRoot, "app-path-routes-manifest.json"),
  );
  const requiredServerFiles = readJson(
    path.join(nextRoot, "required-server-files.json"),
  );
  const routeEntry = prerenderManifest.routes?.[route];

  if (!routeEntry) {
    throw new Error(`Expected prerender manifest entry for ${route}`);
  }
  if (routeEntry.routeType !== "page" || routeEntry.response !== "complete") {
    throw new Error(`${route} is not a complete App Router page prerender`);
  }
  if (routeEntry.compute !== "static") {
    throw new Error(`${route} is not classified as static`);
  }
  if (
    hasOwn(routeEntry, "renderingMode") &&
    routeEntry.renderingMode !== "STATIC"
  ) {
    throw new Error(`${route} has a non-static renderingMode`);
  }
  if (routeEntry.experimentalPPR === true) {
    throw new Error(`${route} is marked as experimental PPR`);
  }
  if (hasOwn(routesManifest, "ppr")) {
    throw new Error("routes-manifest.ppr is present; PPR fallback is not allowed");
  }
  if (routesManifest.ppr?.chain?.headers) {
    throw new Error("routes-manifest.ppr.chain.headers is present; PPR fallback is not allowed");
  }
  if (
    !Array.isArray(routesManifest.staticRoutes) ||
    !routesManifest.staticRoutes.some((entry) => entry.page === route)
  ) {
    throw new Error(`${route} is not listed in routes-manifest.staticRoutes`);
  }
  if (appPathRoutesManifest["/(app)/actions/map/page"] !== route) {
    throw new Error("The App Router page mapping for /actions/map is missing");
  }
  if (requiredServerFiles.config?.cacheComponents !== false) {
    throw new Error("cacheComponents is not explicitly disabled");
  }
  if (requiredServerFiles.config?.experimental?.ppr !== false) {
    throw new Error("experimental.ppr is not explicitly disabled");
  }

  const requiredFiles = [
    path.join(nextRoot, "server/app/(app)/actions/map/page.js"),
    path.join(nextRoot, "server/app/actions/map.html"),
  ];
  for (const filePath of requiredFiles) {
    if (!fs.existsSync(filePath)) {
      throw new Error(`Expected generated static artifact is missing: ${filePath}`);
    }
  }

  const buildsPath = path.join(projectRoot, ".vercel/output/builds.json");
  if (!fs.existsSync(buildsPath)) {
    throw new Error(`Vercel build evidence is missing: ${buildsPath}`);
  }
  if (buildStartedAt !== undefined) {
    const modifiedAt = fs.statSync(buildsPath).mtimeMs;
    if (modifiedAt + 2000 < Number(buildStartedAt)) {
      throw new Error("Vercel build evidence predates the current Vercel build");
    }
  }

  const matchingErrors = findBuildErrors(readJson(buildsPath)).filter(
    (message) => message === `Unable to find lambda for route: ${route}`,
  );
  if (matchingErrors.length === 0) {
    throw new Error(
      `Vercel build evidence does not contain NEXT_MISSING_LAMBDA for ${route}`,
    );
  }

  return {
    route,
    classification: "STATIC",
    initialRevalidateSeconds: routeEntry.initialRevalidateSeconds,
    ppr: false,
    errorCode: "NEXT_MISSING_LAMBDA",
  };
}

function parseArguments(argv) {
  const options = { route: DEFAULT_ROUTE };
  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (argument === "--route") {
      options.route = argv[++index];
    } else if (argument === "--build-started-at") {
      options.buildStartedAt = argv[++index];
    } else {
      throw new Error(`Unknown argument: ${argument}`);
    }
  }
  return options;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  try {
    const result = verifyVercelStaticLambdaFallback(parseArguments(process.argv.slice(2)));
    console.log(
      `Accepted Vercel fallback evidence: ${result.route}=${result.classification}, ` +
        `revalidate=${result.initialRevalidateSeconds}, ppr=${result.ppr}, ` +
        `error=${result.errorCode}`,
    );
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
