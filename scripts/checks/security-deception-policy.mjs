import { existsSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

export const DECEPTION_POLICY_SCHEMA_VERSION = 1;
export const DECEPTION_REGISTRY_PATH = "scripts/checks/security-deception-registry.json";

const CONTROL_KINDS = new Set(["HONEYTOKEN", "DECOY", "CANARY"]);
const FULL_COMMIT_SHA_RE = /^[0-9a-f]{40}$/i;

function isNonEmptyString(value) {
  return typeof value === "string" && value.trim().length > 0;
}

function isRepositoryRelativePath(value) {
  if (!isNonEmptyString(value) || path.isAbsolute(value)) {
    return false;
  }

  return !value.split(/[\\/]/u).includes("..");
}

function requireString(errors, value, field) {
  if (!isNonEmptyString(value)) {
    errors.push(`${field} must be a non-empty string`);
  }
}

function requirePath(errors, value, field) {
  if (!isRepositoryRelativePath(value)) {
    errors.push(`${field} must be a repository-relative path`);
  }
}

function requireStringArray(errors, value, field, { fileExists }) {
  if (!Array.isArray(value) || value.length === 0) {
    errors.push(`${field} must contain at least one test path`);
    return;
  }

  value.forEach((testPath, index) => {
    const itemField = `${field}[${index}]`;
    requirePath(errors, testPath, itemField);
    if (isRepositoryRelativePath(testPath) && !fileExists(testPath)) {
      errors.push(`${itemField} does not exist`);
    }
  });
}

export function validateSecurityDeceptionRegistry(
  registry,
  { fileExists = (candidate) => existsSync(path.resolve(candidate)), readText = (candidate) => readFileSync(candidate, "utf8") } = {},
) {
  const errors = [];

  if (!registry || typeof registry !== "object" || Array.isArray(registry)) {
    return ["registry must be an object"];
  }

  if (registry.schemaVersion !== DECEPTION_POLICY_SCHEMA_VERSION) {
    errors.push(`schemaVersion must be ${DECEPTION_POLICY_SCHEMA_VERSION}`);
  }

  if (!Array.isArray(registry.controls)) {
    errors.push("controls must be an array");
    return errors;
  }

  const ids = new Set();
  registry.controls.forEach((control, index) => {
    const prefix = `controls[${index}]`;

    if (!control || typeof control !== "object" || Array.isArray(control)) {
      errors.push(`${prefix} must be an object`);
      return;
    }

    requireString(errors, control.id, `${prefix}.id`);
    if (isNonEmptyString(control.id)) {
      if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/u.test(control.id)) {
        errors.push(`${prefix}.id must be kebab-case`);
      }
      if (ids.has(control.id)) {
        errors.push(`${prefix}.id is duplicated`);
      }
      ids.add(control.id);
    }

    if (!CONTROL_KINDS.has(control.kind)) {
      errors.push(`${prefix}.kind must be HONEYTOKEN, DECOY or CANARY`);
    }

    requireString(errors, control.objective, `${prefix}.objective`);
    requireString(errors, control.owner, `${prefix}.owner`);

    if (!control.entrypoint || typeof control.entrypoint !== "object") {
      errors.push(`${prefix}.entrypoint must define a path and marker`);
    } else {
      requirePath(errors, control.entrypoint.path, `${prefix}.entrypoint.path`);
      requireString(errors, control.entrypoint.marker, `${prefix}.entrypoint.marker`);
      if (isRepositoryRelativePath(control.entrypoint.path)) {
        if (!fileExists(control.entrypoint.path)) {
          errors.push(`${prefix}.entrypoint.path does not exist`);
        } else if (isNonEmptyString(control.entrypoint.marker)) {
          let entrypointSource;
          try {
            entrypointSource = readText(control.entrypoint.path);
          } catch {
            errors.push(`${prefix}.entrypoint.path cannot be read`);
          }
          if (typeof entrypointSource === "string" && !entrypointSource.includes(control.entrypoint.marker)) {
            errors.push(`${prefix}.entrypoint.marker is not present in the entrypoint`);
          }
        }
      }
    }

    if (control.privilege !== "none") {
      errors.push(`${prefix}.privilege must be exactly none`);
    }
    if (control.realSecrets !== false) {
      errors.push(`${prefix}.realSecrets must be false`);
    }
    if (control.businessEffect !== "none") {
      errors.push(`${prefix}.businessEffect must be exactly none`);
    }

    if (!control.monitoring || typeof control.monitoring !== "object") {
      errors.push(`${prefix}.monitoring must define an exploitable observation and alert`);
    } else {
      requireString(errors, control.monitoring.mechanism, `${prefix}.monitoring.mechanism`);
      requireString(errors, control.monitoring.alert, `${prefix}.monitoring.alert`);
    }

    if (!control.tests || typeof control.tests !== "object") {
      errors.push(`${prefix}.tests must define positive and negative tests`);
    } else {
      requireStringArray(errors, control.tests.positive, `${prefix}.tests.positive`, { fileExists });
      requireStringArray(errors, control.tests.negative, `${prefix}.tests.negative`, { fileExists });
    }

    if (!control.documentation || typeof control.documentation !== "object") {
      errors.push(`${prefix}.documentation.current must point to CURRENT security documentation`);
    } else {
      requirePath(errors, control.documentation.current, `${prefix}.documentation.current`);
      if (isRepositoryRelativePath(control.documentation.current)) {
        if (!control.documentation.current.startsWith("documentation/security/")) {
          errors.push(`${prefix}.documentation.current must be under documentation/security/`);
        } else if (!fileExists(control.documentation.current)) {
          errors.push(`${prefix}.documentation.current does not exist`);
        }
      }
    }

    if (!control.approval || typeof control.approval !== "object") {
      errors.push(`${prefix}.approval must identify an explicit security decision and review`);
    } else {
      requirePath(errors, control.approval.securityDecision, `${prefix}.approval.securityDecision`);
      if (isRepositoryRelativePath(control.approval.securityDecision)) {
        if (!control.approval.securityDecision.startsWith("documentation/security/")) {
          errors.push(`${prefix}.approval.securityDecision must be under documentation/security/`);
        } else if (!fileExists(control.approval.securityDecision)) {
          errors.push(`${prefix}.approval.securityDecision does not exist`);
        }
      }
      if (!FULL_COMMIT_SHA_RE.test(control.approval.reviewedRef ?? "")) {
        errors.push(`${prefix}.approval.reviewedRef must be a full commit SHA`);
      }
    }
  });

  return errors;
}

function loadRegistry() {
  const registryPath = path.resolve(DECEPTION_REGISTRY_PATH);
  return JSON.parse(readFileSync(registryPath, "utf8"));
}

function main() {
  let registry;
  try {
    registry = loadRegistry();
  } catch (error) {
    console.error(`[security-deception] unable to load ${DECEPTION_REGISTRY_PATH}: ${error.message}`);
    process.exitCode = 1;
    return;
  }

  const repositoryRoot = process.cwd();
  const errors = validateSecurityDeceptionRegistry(registry, {
    fileExists: (candidate) => existsSync(path.resolve(repositoryRoot, candidate)),
    readText: (candidate) => readFileSync(path.resolve(repositoryRoot, candidate), "utf8"),
  });

  if (errors.length > 0) {
    console.error(`[security-deception] invalid registry (${errors.length} error(s))`);
    errors.forEach((error) => console.error(`- ${error}`));
    process.exitCode = 1;
    return;
  }

  console.log(`[security-deception] OK: ${registry.controls.length} cyber-deception control(s) registered.`);
  console.log("[security-deception] Application anti-spam honeypots remain ordinary form-abuse protections.");
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main();
}
