#!/usr/bin/env node

import { readFileSync } from "node:fs";
import { resolve } from "node:path";

export function auditDevcontainer(content, nvmrc = "24") {
  const issues = [];
  let config;
  try {
    config = JSON.parse(content);
  } catch (error) {
    issues.push(`devcontainer.json is not valid JSON: ${error instanceof Error ? error.message : String(error)}`);
    return issues;
  }

  const serialized = JSON.stringify(config).toLowerCase();
  for (const forbidden of ["streamlit", "app.py", "8501", "cmm_dev_auth_bypass", "clerk_secret_key", "supabase_service_role_key"]) {
    if (serialized.includes(forbidden)) issues.push(`obsolete or privileged devcontainer value is present: ${forbidden}`);
  }
  if (typeof config.image !== "string" || !config.image.includes("javascript-node")) {
    issues.push("devcontainer must use the JavaScript/Node base image");
  }
  if (typeof config.image !== "string" || !new RegExp(`-${nvmrc}-`).test(config.image)) {
    issues.push(`devcontainer Node image must align with apps/web/.nvmrc major ${nvmrc}`);
  }
  if (config.postCreateCommand !== "npm ci") {
    issues.push("devcontainer must install dependencies with npm ci");
  }
  if (JSON.stringify(config.forwardPorts) !== "[3000]") {
    issues.push("devcontainer must forward only port 3000");
  }
  if (config.portsAttributes?.["3000"]?.visibility !== "private") {
    issues.push("devcontainer port 3000 must remain private");
  }
  return issues;
}

function main() {
  const content = readFileSync(resolve(".devcontainer/devcontainer.json"), "utf8");
  const nvmrc = readFileSync(resolve("apps/web/.nvmrc"), "utf8").trim().replace(/^v/, "").split(".")[0];
  const issues = auditDevcontainer(content, nvmrc);
  if (issues.length > 0) {
    console.error(`[devcontainer-contract] ${issues.length} issue(s) found:`);
    for (const issue of issues) console.error(`- ${issue}`);
    process.exitCode = 1;
    return;
  }
  console.log(`[devcontainer-contract] OK: Node ${nvmrc}, npm ci, private port 3000.`);
}

if (process.argv[1]?.endsWith("check-devcontainer.mjs")) main();
