#!/usr/bin/env node

import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

function argument(name) {
  const prefix = `--${name}=`;
  return process.argv.find((entry) => entry.startsWith(prefix))?.slice(prefix.length);
}

export function setSupabaseSectionEnabled(configText, section, enabled) {
  const escapedSection = section.replaceAll(".", "\\.");
  const headerPattern = new RegExp(`^\\[${escapedSection}\\]$`, "gm");
  const headers = [...String(configText).matchAll(headerPattern)];
  if (headers.length !== 1) throw new Error(`canonical Supabase config must contain exactly one [${section}] section`);

  const header = headers[0];
  const sectionStart = header.index + header[0].length;
  const nextHeader = /^\[/gm;
  nextHeader.lastIndex = sectionStart;
  const next = nextHeader.exec(String(configText));
  const sectionEnd = next ? next.index : String(configText).length;
  const body = String(configText).slice(sectionStart, sectionEnd);
  const enabledPattern = /^[ \t]*enabled[ \t]*=[ \t]*(true|false)[ \t]*\r?$/gm;
  const enabledLines = [...body.matchAll(enabledPattern)];
  if (enabledLines.length !== 1) throw new Error(`canonical Supabase config must contain exactly one enabled flag in [${section}]`);
  if (enabledLines[0][1] === String(enabled)) return String(configText);

  const updatedBody = body.replace(enabledPattern, `enabled = ${enabled}`);
  return `${String(configText).slice(0, sectionStart)}${updatedBody}${String(configText).slice(sectionEnd)}`;
}

export function disableSupabaseMigrationsAndSeed(configText) {
  return setSupabaseSectionEnabled(
    setSupabaseSectionEnabled(configText, "db.migrations", false),
    "db.seed",
    false,
  );
}

async function main() {
  const sourceConfig = argument("source-config");
  const targetConfig = argument("target-config");
  if (!sourceConfig || !targetConfig) {
    console.error("Usage: node supabase-config.mjs --source-config=PATH --target-config=PATH");
    process.exitCode = 2;
    return;
  }
  const config = disableSupabaseMigrationsAndSeed(await readFile(sourceConfig, "utf8"));
  await mkdir(dirname(targetConfig), { recursive: true });
  await writeFile(targetConfig, config, "utf8");
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch(() => {
    console.error("Unable to prepare an isolated Supabase bootstrap configuration.");
    process.exitCode = 1;
  });
}
