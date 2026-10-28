import crypto from "node:crypto";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const QUALITY_INDEX_SCHEMA_VERSION = 7;
export const QUALITY_INDEX_AUDITS = Object.freeze(["dead-code", "duplication", "top-heavy", "complexity", "cycles", "maintainability", "type-safety", "hotspots", "testability", "coverage"]);
export const QUALITY_GATE_INDEX_AUDITS = Object.freeze(["dead-code", "duplication", "top-heavy", "complexity", "cycles"]);
export const QUALITY_INDEX_PREFIX = "quality-index";
export const QUALITY_ARCHITECTURE_DOMAIN_PREFIX = "architecture:";

export const REPOSITORY_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
export const SHA_PATTERN = /^[0-9a-f]{40}$/i;
export const RUN_ID_PATTERN = /^[A-Za-z0-9_-]+$/;
const QUALITY_STATUS_STATES = new Set(["PRESENT", "NONE", "NOT_MEASURED", "SKIPPED_BY_POLICY", "NOT_APPLICABLE", "OUT_OF_INSTRUMENTATION"]);

export function normalizePath(value) {
  return String(value ?? "").replaceAll("\\", "/").replace(/^\.\//, "");
}

export function compareLexical(left, right) {
  return left < right ? -1 : left > right ? 1 : 0;
}

export function stableId(scope, value) {
  return crypto.createHash("sha256").update(`${scope}:${JSON.stringify(value)}`).digest("hex").slice(0, 24);
}

export function state(value, detail = "", items = []) {
  if (!QUALITY_STATUS_STATES.has(value)) throw new Error(`État quality inconnu: ${value}`);
  return { state: value, detail, items };
}
