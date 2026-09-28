import { readFile, stat } from "node:fs/promises";
import { stripTypeScriptTypes } from "node:module";
import { dirname, resolve as pathResolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const REPO_ROOT = pathResolve(dirname(fileURLToPath(import.meta.url)), "../..");
const WEB_SRC = pathResolve(REPO_ROOT, "apps/web/src");
const EXTENSIONS = [".ts", ".tsx", ".js", ".mjs"];

async function existingFile(pathname) {
  try {
    return (await stat(pathname)).isFile() ? pathname : null;
  } catch {
    return null;
  }
}

async function resolveFile(pathname) {
  if (EXTENSIONS.some((extension) => pathname.endsWith(extension))) return existingFile(pathname);
  const direct = await existingFile(pathname);
  if (direct) return direct;
  for (const extension of EXTENSIONS) {
    const candidate = await existingFile(`${pathname}${extension}`);
    if (candidate) return candidate;
    const indexCandidate = await existingFile(`${pathname}/index${extension}`);
    if (indexCandidate) return indexCandidate;
  }
  return null;
}

export async function resolve(specifier, context, nextResolve) {
  if (specifier === "next/cache") {
    return {
      url: "data:text/javascript,export%20const%20unstable_cache%20%3D%20(fn)%20%3D%3E%20fn%3B",
      shortCircuit: true,
    };
  }
  if (specifier.startsWith("@/")) {
    const pathname = await resolveFile(pathResolve(WEB_SRC, specifier.slice(2)));
    if (pathname) return { url: pathToFileURL(pathname).href, shortCircuit: true };
  }

  if (specifier.startsWith(".") && context.parentURL?.startsWith("file:")) {
    const parentPath = fileURLToPath(context.parentURL);
    const pathname = await resolveFile(pathResolve(dirname(parentPath), specifier));
    if (pathname) return { url: pathToFileURL(pathname).href, shortCircuit: true };
  }

  try {
    return await nextResolve(specifier, context);
  } catch (error) {
    if (typeof specifier === "string" && !specifier.startsWith(".") && !specifier.startsWith("/")) {
      return nextResolve(`${specifier}.js`, context);
    }
    throw error;
  }
}

export async function load(url, context, nextLoad) {
  if (url.endsWith("/node_modules/next/package.json")) {
    const json = await readFile(fileURLToPath(url), "utf8");
    return {
      format: "module",
      source: `export default ${json};`,
      shortCircuit: true,
    };
  }
  if (url.endsWith(".ts") || url.endsWith(".tsx")) {
    return {
      format: "module",
      source: stripTypeScriptTypes(await readFile(fileURLToPath(url), "utf8"), { mode: "strip" }),
      shortCircuit: true,
    };
  }
  return nextLoad(url, context);
}
